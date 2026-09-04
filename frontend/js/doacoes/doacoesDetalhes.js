import { buscarDoacao, buscarFotoComprovanteEntrega } from "../api/doacoesApi.js";
import { mostrarErro } from "../utils/toast.js";
import { mostrarLoading, esconderLoading } from "../utils/loading.js";

let urlFotoAtual = null;

async function lerRespostaJson(resposta) {
    const texto = await resposta.text();
    if (!texto) return {};
    try { return JSON.parse(texto); }
    catch {
        console.error("Resposta inválida recebida do servidor:", texto);
        throw new Error("O servidor retornou uma resposta inválida.");
    }
}

function escaparHtml(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatarData(valor, comHora = false) {
    if (!valor) return "-";
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return "-";
    return comHora
        ? data.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
        : data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function obterTextoTipo(tipo) {
    return ({ CESTA: "Cesta", GRANEL: "Granel", AMBOS: "Ambos", OUTROS: "Outros" })[tipo] || tipo || "-";
}

function obterClasseTipo(tipo) {
    return ({ CESTA: "badge-doacao-cesta", GRANEL: "badge-doacao-granel", AMBOS: "badge-doacao-ambos" })[tipo] || "badge-doacao-neutro";
}

function abrirModalDetalhes(elementos) {
    elementos.modalDetalhes.classList.add("ativo");
    elementos.modalDetalhes.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
}

export function fecharDetalhesDoacao(elementos) {
    if (!elementos?.modalDetalhes) return;
    elementos.modalDetalhes.classList.remove("ativo", "aberto", "show");
    elementos.modalDetalhes.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (urlFotoAtual) {
        URL.revokeObjectURL(urlFotoAtual);
        urlFotoAtual = null;
    }
}

function definirTexto(elemento, valor = "-") {
    if (elemento) elemento.textContent = valor;
}

function limparDetalhes(elementos) {
    ["detalheId", "detalheCodigo", "detalheBeneficiario", "detalheInstituicao", "detalheTipo",
     "detalheQuantidade", "detalheData", "detalheUsuario", "detalheComprovante", "detalheStatus",
     "detalheOrigem", "detalheComposicao", "detalheProximaEntrega", "detalheSaldoAntes",
     "detalheSaldoDepois", "detalheRegraCalculo", "detalheQuantidadeCalculada", "detalheDebitado"]
        .forEach((chave) => definirTexto(elementos[chave], "-"));

    definirTexto(elementos.detalheObservacoes, "Nenhuma observação informada.");
    if (elementos.detalheTipoBadge) { elementos.detalheTipoBadge.className = "detalhes-doacao-tipo"; elementos.detalheTipoBadge.textContent = "-"; }
    if (elementos.detalheCancelamento) { elementos.detalheCancelamento.hidden = true; elementos.detalheCancelamento.innerHTML = ""; }
    if (elementos.detalheComprovanteEntrega) elementos.detalheComprovanteEntrega.innerHTML = '<div class="comprovante-vazio"><i class="fa-regular fa-image"></i><span>Nenhuma foto disponível.</span></div>';
    if (elementos.detalheHistorico) elementos.detalheHistorico.innerHTML = "";
}

function montarProximaEntrega(doacao, cancelada) {
    if (cancelada || !doacao?.dataDoacao) return "Não aplicável";
    const data = new Date(doacao.dataDoacao);
    if (Number.isNaN(data.getTime())) return "-";
    return new Date(data.getFullYear(), data.getMonth() + 1, 1).toLocaleDateString("pt-BR");
}

function montarHistorico(elementos, doacao) {
    if (!elementos.detalheHistorico) return;
    const eventos = [];
    eventos.push({
        data: doacao?.dataDoacao || doacao?.criadoEm,
        titulo: doacao?.origem === "QR_CODE" ? "Entrega registrada via QR Code" : "Doação registrada manualmente",
        descricao: `${Number(doacao?.quantidade ?? 0)} ${Number(doacao?.quantidade ?? 0) === 1 ? "item/cesta registrado" : "itens/cestas registrados"}.`,
        usuario: doacao?.usuario?.nome,
        icone: "fa-hand-holding-heart",
    });

    for (const mov of (Array.isArray(doacao?.movimentacoesSaldo) ? doacao.movimentacoesSaldo : [])) {
        const estorno = mov?.tipo === "ESTORNO_DOACAO";
        eventos.push({
            data: mov?.criadoEm,
            titulo: estorno ? "Estorno realizado no estoque" : "Movimentação de estoque",
            descricao: `${estorno ? "+" : "-"}${Number(mov?.quantidade ?? 0)} cesta(s) • saldo ${Number(mov?.saldoAnterior ?? 0)} → ${Number(mov?.saldoPosterior ?? 0)}`,
            usuario: mov?.usuario?.nome,
            icone: estorno ? "fa-rotate-left" : "fa-boxes-stacked",
        });
    }

    if (doacao?.canceladaEm) {
        eventos.push({
            data: doacao.canceladaEm,
            titulo: "Doação cancelada",
            descricao: doacao?.motivoCancelamento || "Cancelamento registrado.",
            usuario: doacao?.canceladaPor?.nome,
            icone: "fa-ban",
        });
    }

    eventos.sort((a, b) => new Date(a.data || 0) - new Date(b.data || 0));
    elementos.detalheHistorico.innerHTML = eventos.map((evento) => `
        <article class="detalhe-historico-item">
            <div class="historico-icone"><i class="fa-solid ${evento.icone}"></i></div>
            <div class="historico-conteudo">
                <div class="historico-topo"><strong>${escaparHtml(evento.titulo)}</strong><time>${escaparHtml(formatarData(evento.data, true))}</time></div>
                <p>${escaparHtml(evento.descricao)}</p>
                ${evento.usuario ? `<span>Responsável: ${escaparHtml(evento.usuario)}</span>` : ""}
            </div>
        </article>`).join("");
}

async function montarComprovante(elementos, doacao) {
    if (!elementos.detalheComprovanteEntrega) return;
    const meta = doacao?.comprovanteEntrega;
    if (!meta) {
        elementos.detalheComprovanteEntrega.innerHTML = `
            <div class="comprovante-vazio"><i class="fa-regular fa-image"></i><div><strong>Foto não disponível</strong><span>${doacao?.origem === "QR_CODE" ? "O comprovante pode ter expirado ou sido removido." : "Doação manual sem foto de entrega."}</span></div></div>`;
        return;
    }

    elementos.detalheComprovanteEntrega.innerHTML = `
        <div class="comprovante-disponivel">
            <div><i class="fa-solid fa-circle-check"></i><strong>Foto registrada</strong><span>Registrada em ${escaparHtml(formatarData(meta.criadoEm, true))} • expira em ${escaparHtml(formatarData(meta.expiraEm))}</span></div>
            <button type="button" class="btn btn-secondary btn-ver-foto-comprovante"><i class="fa-solid fa-image"></i> Visualizar foto</button>
        </div>`;

    const botao = elementos.detalheComprovanteEntrega.querySelector(".btn-ver-foto-comprovante");
    botao?.addEventListener("click", async () => {
        botao.disabled = true;
        const htmlOriginal = botao.innerHTML;
        botao.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Carregando...';
        try {
            const resposta = await buscarFotoComprovanteEntrega(doacao.id);
            if (!resposta.ok) {
                const dados = await resposta.json().catch(() => ({}));
                throw new Error(dados.error || "Não foi possível carregar a foto.");
            }
            if (urlFotoAtual) URL.revokeObjectURL(urlFotoAtual);
            urlFotoAtual = URL.createObjectURL(await resposta.blob());
            elementos.detalheComprovanteEntrega.innerHTML = `
                <div class="comprovante-foto-wrap">
                    <img src="${urlFotoAtual}" alt="Comprovante fotográfico da entrega">
                    <div class="comprovante-foto-info"><span>Foto do comprovante da entrega</span><button type="button" class="btn btn-secondary btn-fechar-foto"><i class="fa-solid fa-chevron-up"></i> Recolher foto</button></div>
                </div>`;
            elementos.detalheComprovanteEntrega.querySelector(".btn-fechar-foto")?.addEventListener("click", () => montarComprovante(elementos, doacao));
        } catch (erro) {
            mostrarErro(erro.message || "Erro ao carregar a foto do comprovante.");
            botao.disabled = false;
            botao.innerHTML = htmlOriginal;
        }
    });
}

function preencherDetalhes(elementos, doacao) {
    const cancelada = Boolean(doacao?.deletedAt || doacao?.canceladaEm);
    const movimentacoes = Array.isArray(doacao?.movimentacoesSaldo) ? doacao.movimentacoesSaldo : [];
    const saida = movimentacoes.find((item) => item?.tipo === "SAIDA_DOACAO");
    const estorno = movimentacoes.find((item) => item?.tipo === "ESTORNO_DOACAO");
    const composicao = Number(doacao?.composicaoFamiliarSnapshot ?? doacao?.beneficiario?.composicaoFamiliar ?? 0);
    const qtd = Number(doacao?.quantidade ?? 0);

    definirTexto(elementos.detalheId, doacao?.id ? `#${doacao.id}` : "-");
    definirTexto(elementos.detalheCodigo, doacao?.codigo || "-");
    definirTexto(elementos.detalheBeneficiario, doacao?.beneficiario?.nomeCompleto || "-");
    definirTexto(elementos.detalheInstituicao, doacao?.instituicao?.nome || "-");
    definirTexto(elementos.detalheTipo, obterTextoTipo(doacao?.tipo));
    definirTexto(elementos.detalheQuantidade, qtd ? `${qtd} ${qtd === 1 ? "unidade" : "unidades"}` : "-");
    definirTexto(elementos.detalheData, formatarData(doacao?.dataDoacao, true));
    definirTexto(elementos.detalheUsuario, doacao?.usuario?.nome || "-");
    definirTexto(elementos.detalheComprovante, doacao?.comprovante ? "Comprovado" : "Pendente");
    definirTexto(elementos.detalheObservacoes, doacao?.observacoes?.trim() || "Nenhuma observação informada.");
    definirTexto(elementos.detalheStatus, cancelada ? "Cancelada" : "Concluída");
    definirTexto(elementos.detalheOrigem, doacao?.origem === "QR_CODE" ? "QR Code" : "Manual");
    definirTexto(elementos.detalheComposicao, composicao > 0 ? `${composicao} pessoa(s)` : "Não registrado");
    definirTexto(elementos.detalheRegraCalculo, doacao?.quantidadeCalculada ? "1 cesta a cada 3 pessoas" : "Quantidade informada manualmente");
    definirTexto(elementos.detalheQuantidadeCalculada, doacao?.quantidadeCalculada ? `${qtd} cesta(s)` : "Não se aplica");
    definirTexto(elementos.detalheProximaEntrega, montarProximaEntrega(doacao, cancelada));
    definirTexto(elementos.detalheSaldoAntes, saida ? `${saida.saldoAnterior} cesta(s)` : "Não aplicável");
    definirTexto(elementos.detalheDebitado, saida ? `-${saida.quantidade} cesta(s)` : "Não aplicável");
    definirTexto(elementos.detalheSaldoDepois, saida ? `${saida.saldoPosterior} cesta(s)` : "Não aplicável");

    if (elementos.detalheStatus) elementos.detalheStatus.className = `detalhe-status-badge ${cancelada ? "cancelada" : "concluida"}`;
    if (elementos.detalheTipoBadge) {
        elementos.detalheTipoBadge.className = `detalhes-doacao-tipo badge-doacao ${obterClasseTipo(doacao?.tipo)}`;
        elementos.detalheTipoBadge.textContent = obterTextoTipo(doacao?.tipo);
    }

    if (elementos.detalheCancelamento) {
        elementos.detalheCancelamento.hidden = !cancelada;
        elementos.detalheCancelamento.innerHTML = cancelada ? `
            <div class="form-section-header"><div class="form-section-icon cancelamento"><i class="fa-solid fa-ban"></i></div><div><h3>Cancelamento e estorno</h3><p>Dados de auditoria preservados para rastreabilidade.</p></div></div>
            <div class="detalhes-cancelamento-card">
                <div><span>Cancelada em</span><strong>${escaparHtml(formatarData(doacao?.canceladaEm, true))}</strong></div>
                <div><span>Cancelada por</span><strong>${escaparHtml(doacao?.canceladaPor?.nome || "-")}</strong></div>
                <div class="motivo"><span>Motivo</span><strong>${escaparHtml(doacao?.motivoCancelamento || "Não informado")}</strong></div>
                <div><span>Estorno realizado</span><strong>${estorno ? `+${Number(estorno.quantidade)} cesta(s)` : "Não aplicável"}</strong></div>
                <div><span>Saldo antes do estorno</span><strong>${estorno ? `${Number(estorno.saldoAnterior)} cesta(s)` : "-"}</strong></div>
                <div><span>Saldo após o estorno</span><strong>${estorno ? `${Number(estorno.saldoPosterior)} cesta(s)` : "-"}</strong></div>
            </div>` : "";
    }

    montarHistorico(elementos, doacao);
    montarComprovante(elementos, doacao);
}

export async function visualizarDetalhesDoacao({ id, elementos }) {
    const idNumerico = Number(id);
    if (!Number.isInteger(idNumerico) || idNumerico <= 0) { mostrarErro("ID da doação inválido."); return; }
    mostrarLoading();
    try {
        limparDetalhes(elementos);
        const resposta = await buscarDoacao(idNumerico);
        const doacao = await lerRespostaJson(resposta);
        if (!resposta.ok) throw new Error(doacao.error || doacao.erro || doacao.mensagem || "Erro ao carregar os detalhes da doação.");
        preencherDetalhes(elementos, doacao);
        abrirModalDetalhes(elementos);
    } catch (erro) {
        console.error("Erro ao visualizar detalhes da doação:", erro);
        mostrarErro(erro.message || "Não foi possível carregar os detalhes da doação.");
    } finally { esconderLoading(); }
}
