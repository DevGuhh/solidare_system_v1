import {
    buscarSaldoCestasAPI,
    registrarEntradaSaldoCestasAPI,
    listarHistoricoSaldoCestasAPI
} from "../api/saldoCestasApi.js";

import { mostrarSucesso, mostrarErro } from "../utils/toast.js";

let instituicaoAtual = null;
let controlador = null;

function escaparHtml(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

async function lerJson(resposta) {
    const texto = await resposta.text();
    if (!texto) return {};

    try {
        return JSON.parse(texto);
    } catch {
        throw new Error("O servidor retornou uma resposta inválida.");
    }
}

function mensagemErro(dados, padrao) {
    if (Array.isArray(dados?.issues) && dados.issues.length) {
        return dados.issues.map((item) => item.message).join("\n");
    }

    return dados?.error || dados?.erro || dados?.mensagem || dados?.message || padrao;
}

function formatarData(valor) {
    if (!valor) return "-";
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return "-";

    return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short"
    }).format(data);
}

function configuracaoMovimentacao(tipo) {
    const valor = String(tipo || "").toUpperCase();

    if (valor === "ENTRADA") {
        return {
            rotulo: "Entrada",
            classe: "saldo-mov-entrada",
            icone: "fa-arrow-down"
        };
    }

    if (valor === "ESTORNO_DOACAO") {
        return {
            rotulo: "Estorno de doação",
            classe: "saldo-mov-estorno",
            icone: "fa-rotate-left"
        };
    }

    return {
        rotulo: "Saída por doação",
        classe: "saldo-mov-saida",
        icone: "fa-arrow-up"
    };
}

function obterElementos() {
    return {
        modal: document.getElementById("modalSaldoCestas"),
        nome: document.getElementById("nomeInstituicaoSaldoCestas"),
        saldo: document.getElementById("valorSaldoCestas"),
        atualizado: document.getElementById("atualizacaoSaldoCestas"),
        formulario: document.getElementById("formEntradaSaldoCestas"),
        quantidade: document.getElementById("quantidadeEntradaSaldoCestas"),
        observacao: document.getElementById("observacaoEntradaSaldoCestas"),
        lista: document.getElementById("historicoSaldoCestas"),
        filtro: document.getElementById("filtroHistoricoSaldoCestas"),
        btnFechar: document.getElementById("btnFecharSaldoCestas"),
        btnCancelar: document.getElementById("btnCancelarSaldoCestas"),
        btnAtualizar: document.getElementById("btnAtualizarSaldoCestas"),
        btnSalvar: document.getElementById("btnRegistrarEntradaSaldoCestas")
    };
}

function abrirModal() {
    const { modal } = obterElementos();
    if (!modal) return;

    modal.hidden = false;
    modal.removeAttribute("hidden");
    modal.setAttribute("aria-hidden", "false");
    modal.classList.add("ativo");
    document.body.classList.add("modal-aberto");
}

export function fecharSaldoInstituicao() {
    const { modal, formulario } = obterElementos();
    if (!modal) return;

    modal.classList.remove("ativo", "aberto", "show");
    modal.hidden = true;
    modal.setAttribute("hidden", "");
    modal.setAttribute("aria-hidden", "true");
    formulario?.reset();
    instituicaoAtual = null;
    document.body.classList.remove("modal-aberto");
}

function renderizarCarregando() {
    const { lista } = obterElementos();
    if (!lista) return;

    lista.innerHTML = `
        <div class="saldo-historico-estado">
            <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
            <span>Carregando movimentações...</span>
        </div>
    `;
}

function renderizarHistorico(dados) {
    const { lista } = obterElementos();
    if (!lista) return;

    const itens = Array.isArray(dados?.items) ? dados.items : [];

    if (!itens.length) {
        lista.innerHTML = `
            <div class="saldo-historico-estado">
                <i class="fa-solid fa-box-open" aria-hidden="true"></i>
                <strong>Nenhuma movimentação registrada</strong>
                <span>Entradas, doações e estornos aparecerão aqui.</span>
            </div>
        `;
        return;
    }

    lista.innerHTML = itens.map((item) => {
        const config = configuracaoMovimentacao(item?.tipo);
        const quantidade = Number(item?.quantidade) || 0;
        const anterior = Number(item?.saldoAnterior) || 0;
        const posterior = Number(item?.saldoPosterior) || 0;
        const observacao = item?.observacao
            ? `<p>${escaparHtml(item.observacao)}</p>`
            : "";
        const doacao = item?.doacaoId
            ? `<span class="saldo-mov-doacao">Doação #${escaparHtml(item.doacaoId)}</span>`
            : "";

        return `
            <article class="saldo-mov-item ${config.classe}">
                <div class="saldo-mov-icone" aria-hidden="true">
                    <i class="fa-solid ${config.icone}"></i>
                </div>

                <div class="saldo-mov-conteudo">
                    <div class="saldo-mov-topo">
                        <div>
                            <strong>${config.rotulo}</strong>
                            <span>${escaparHtml(formatarData(item?.criadoEm))}</span>
                        </div>
                        <span class="saldo-mov-quantidade">${quantidade} cesta${quantidade === 1 ? "" : "s"}</span>
                    </div>

                    <div class="saldo-mov-resumo">
                        <span>Saldo anterior <strong>${anterior}</strong></span>
                        <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
                        <span>Saldo posterior <strong>${posterior}</strong></span>
                    </div>

                    ${observacao}
                    ${doacao}
                </div>
            </article>
        `;
    }).join("");
}

async function carregarSaldo() {
    if (!instituicaoAtual?.id) return;

    const { saldo, atualizado } = obterElementos();

    const resposta = await buscarSaldoCestasAPI(instituicaoAtual.id);
    const dados = await lerJson(resposta);

    if (!resposta.ok) {
        throw new Error(mensagemErro(dados, "Não foi possível carregar o saldo de cestas."));
    }

    if (saldo) {
        saldo.textContent = String(Number(dados?.saldoAtual) || 0);
    }

    if (atualizado) {
        atualizado.textContent = dados?.atualizadoEm
            ? `Atualizado em ${formatarData(dados.atualizadoEm)}`
            : "Ainda não houve movimentação de saldo.";
    }
}

async function carregarHistorico() {
    if (!instituicaoAtual?.id) return;

    const { filtro } = obterElementos();
    renderizarCarregando();

    const resposta = await listarHistoricoSaldoCestasAPI(
        instituicaoAtual.id,
        {
            page: 1,
            pageSize: 50,
            tipo: filtro?.value || ""
        }
    );

    const dados = await lerJson(resposta);

    if (!resposta.ok) {
        throw new Error(mensagemErro(dados, "Não foi possível carregar o histórico de saldo."));
    }

    renderizarHistorico(dados);
}

async function atualizarModal() {
    try {
        await Promise.all([
            carregarSaldo(),
            carregarHistorico()
        ]);
    } catch (erro) {
        console.error("Erro ao carregar saldo de cestas:", erro);
        mostrarErro(erro.message || "Não foi possível carregar o saldo de cestas.");
    }
}

export async function abrirSaldoInstituicao(id, nome = "") {
    const instituicaoId = Number(id);

    if (!Number.isInteger(instituicaoId) || instituicaoId <= 0) {
        mostrarErro("Instituição inválida para consulta de saldo.");
        return;
    }

    instituicaoAtual = {
        id: instituicaoId,
        nome: nome || `Instituição #${instituicaoId}`
    };

    const { nome: elementoNome, saldo, atualizado } = obterElementos();
    if (elementoNome) elementoNome.textContent = instituicaoAtual.nome;
    if (saldo) saldo.textContent = "—";
    if (atualizado) atualizado.textContent = "Carregando saldo...";

    abrirModal();
    await atualizarModal();
}

async function registrarEntrada(event) {
    event.preventDefault();

    if (!instituicaoAtual?.id) {
        mostrarErro("Nenhuma instituição foi selecionada.");
        return;
    }

    const { quantidade, observacao, btnSalvar, formulario } = obterElementos();
    const valorQuantidade = Number(quantidade?.value);

    if (!Number.isInteger(valorQuantidade) || valorQuantidade <= 0) {
        mostrarErro("Informe uma quantidade inteira maior que zero.");
        quantidade?.focus();
        return;
    }

    if (btnSalvar) btnSalvar.disabled = true;

    try {
        const resposta = await registrarEntradaSaldoCestasAPI({
            instituicaoId: instituicaoAtual.id,
            quantidade: valorQuantidade,
            observacao: observacao?.value?.trim() || undefined
        });

        const dados = await lerJson(resposta);

        if (!resposta.ok) {
            throw new Error(mensagemErro(dados, "Não foi possível registrar a entrada de cestas."));
        }

        mostrarSucesso(`${valorQuantidade} cesta${valorQuantidade === 1 ? "" : "s"} adicionada${valorQuantidade === 1 ? "" : "s"} ao saldo.`);
        formulario?.reset();
        await atualizarModal();
        quantidade?.focus();
    } catch (erro) {
        console.error("Erro ao registrar entrada de saldo:", erro);
        mostrarErro(erro.message || "Não foi possível registrar a entrada de cestas.");
    } finally {
        if (btnSalvar) btnSalvar.disabled = false;
    }
}

export function configurarSaldoInstituicoes() {
    controlador?.abort();
    controlador = new AbortController();
    const op = { signal: controlador.signal };

    const {
        modal,
        formulario,
        filtro,
        btnFechar,
        btnCancelar,
        btnAtualizar
    } = obterElementos();

    if (!modal) return;

    modal.classList.remove("ativo", "aberto", "show");
    modal.hidden = true;
    modal.setAttribute("hidden", "");
    modal.setAttribute("aria-hidden", "true");

    formulario?.addEventListener("submit", registrarEntrada, op);
    filtro?.addEventListener("change", carregarHistorico, op);
    btnFechar?.addEventListener("click", fecharSaldoInstituicao, op);
    btnCancelar?.addEventListener("click", fecharSaldoInstituicao, op);
    btnAtualizar?.addEventListener("click", atualizarModal, op);

    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            fecharSaldoInstituicao();
        }
    }, op);

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && modal.hidden === false) {
            fecharSaldoInstituicao();
        }
    }, op);
}
