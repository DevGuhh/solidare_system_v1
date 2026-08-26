import {
    listarInstituicoes,
    buscarInstituicao,
    cadastrarInstituicaoAPI,
    editarInstituicaoAPI,
    alterarStatusInstituicaoAPI,
    alterarSituacaoInstituicaoAPI
} from "./api/instituicoesApi.js";

import {
    listarComprovantesInstituicaoAPI,
    abrirArquivoComprovanteAPI
} from "./api/comprovantesApi.js";

import { mostrarSucesso, mostrarErro } from "./utils/toast.js";
import { mostrarLoading, esconderLoading } from "./utils/loading.js";
import {
    abrirSaldoInstituicao,
    configurarSaldoInstituicoes
} from "./instituicoes/instituicoesSaldo.js";

const estado = {
    lista: [],
    filtrada: [],
    selecionadas: new Set(),
    filtro: "TODOS",
    pagina: 1,
    porPagina: 10,
    ordenarPor: "nome",
    direcao: "asc",
    editandoId: null,
    controlador: null
};

let el = {};
let campos = {};

function capturarElementos() {
    el = {
        btnNova: document.getElementById("btnNovaInstituicao"),
        btnAtualizar: document.getElementById("btnAtualizarInstituicoes"),
        pesquisa: document.getElementById("pesquisaInstituicao"),
        btnLimparPesquisa: document.getElementById("btnLimparPesquisaInstituicao"),
        contadorTodas: document.getElementById("contadorTodasInstituicoes"),
        contadorAtivas: document.getElementById("contadorInstituicoesAtivas"),
        contadorInativas: document.getElementById("contadorInstituicoesInativas"),
        contadorPendentes: document.getElementById("contadorInstituicoesPendentes"),
        resultado: document.getElementById("resultadoFiltroInstituicoes"),
        tabela: document.getElementById("tabelaInstituicoes"),
        selecionarTodas: document.getElementById("selecionarTodasInstituicoes"),
        quantidadePorPagina: document.getElementById("quantidadePorPaginaInstituicoes"),
        intervalo: document.getElementById("intervaloPaginacaoInstituicoes"),
        numeros: document.getElementById("numerosPaginacaoInstituicoes"),
        btnPrimeira: document.getElementById("btnPrimeiraPaginaInstituicoes"),
        btnAnterior: document.getElementById("btnPaginaAnteriorInstituicoes"),
        btnProxima: document.getElementById("btnProximaPaginaInstituicoes"),
        btnUltima: document.getElementById("btnUltimaPaginaInstituicoes"),
        barraSelecao: document.getElementById("barraSelecaoInstituicoes"),
        quantidadeSelecionadas: document.getElementById("quantidadeSelecionadasInstituicoes"),
        btnAtivarSelecionadas: document.getElementById("btnAtivarSelecionadasInstituicoes"),
        btnInativarSelecionadas: document.getElementById("btnInativarSelecionadasInstituicoes"),
        btnLimparSelecao: document.getElementById("btnLimparSelecaoInstituicoes"),
        modal: document.getElementById("modalInstituicao"),
        formulario: document.getElementById("formInstituicao"),
        tituloModal: document.getElementById("tituloModalInstituicao"),
        btnFecharModal: document.getElementById("btnFecharModalInstituicao"),
        btnCancelar: document.getElementById("btnCancelarInstituicao"),
        btnSalvar: document.getElementById("btnSalvarInstituicao"),
        textoBtnSalvar: document.getElementById("textoBtnSalvarInstituicao"),
        modalCredenciais: document.getElementById("modalCredenciaisInstituicao"),
        credencialEmail: document.getElementById("credencialEmailInstituicao"),
        credencialSenha: document.getElementById("credencialSenhaInstituicao"),
        btnFecharCredenciais: document.getElementById("btnFecharCredenciaisInstituicao"),
        btnCopiarCredenciais: document.getElementById("btnCopiarCredenciaisInstituicao"),
        modalConfirmacao: document.getElementById("modalConfirmacaoInstituicao"),
        tituloConfirmacao: document.getElementById("tituloConfirmacaoInstituicao"),
        mensagemConfirmacao: document.getElementById("mensagemConfirmacaoInstituicao"),
        btnCancelarConfirmacao: document.getElementById("btnCancelarConfirmacaoInstituicao"),
        btnConfirmarConfirmacao: document.getElementById("btnConfirmarConfirmacaoInstituicao")
    };

    campos = {
        id: document.getElementById("instituicaoId"),
        nome: document.getElementById("nome"),
        cnpj: document.getElementById("cnpj"),
        tipo: document.getElementById("tipo"),
        responsavel: document.getElementById("responsavel"),
        email: document.getElementById("email"),
        telefone: document.getElementById("telefone"),
        cep: document.getElementById("cep"),
        logradouro: document.getElementById("logradouro"),
        numero: document.getElementById("numero"),
        complemento: document.getElementById("complemento"),
        bairro: document.getElementById("bairro"),
        cidade: document.getElementById("cidade"),
        uf: document.getElementById("uf")
    };
}

function validarEstrutura() {
    const obrigatorios = [
        el.btnNova, el.btnAtualizar, el.pesquisa, el.tabela, el.modal, el.formulario,
        el.btnFecharModal, el.btnCancelar, el.btnSalvar, el.modalCredenciais,
        campos.nome, campos.cnpj, campos.tipo, campos.responsavel, campos.email, campos.telefone,
        campos.cep, campos.logradouro, campos.numero, campos.bairro, campos.cidade, campos.uf
    ];
    if (obrigatorios.some((item) => !item)) {
        throw new Error("A tela de Instituições está incompleta ou possui IDs incompatíveis.");
    }
}

function escapar(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function normalizar(valor) {
    return String(valor ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function iniciais(nome) {
    const partes = String(nome ?? "").trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return "IN";
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return `${partes[0][0]}${partes.at(-1)[0]}`.toUpperCase();
}

function formatarTelefone(valor) {
    const n = String(valor ?? "").replace(/\D/g, "");
    if (n.length === 11) return n.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    if (n.length === 10) return n.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
    return valor || "-";
}

function formatarCEP(valor) {
    const n = String(valor ?? "").replace(/\D/g, "");
    return n.length === 8 ? n.replace(/(\d{5})(\d{3})/, "$1-$2") : (valor || "-");
}

function formatarTipo(tipo) {
    return ({ ONG: "ONG", IGREJA: "Igreja", ASSOCIACAO: "Associação", OUTRO: "Outro" })[tipo] || tipo || "-";
}

function enderecoResumido(i) {
    const local = [i.cidade, i.uf].filter(Boolean).join("/ ").replace("/ ", "/");
    return local || "Não informado";
}

async function jsonSeguro(resposta) {
    const texto = await resposta.text();
    if (!texto) return {};
    try { return JSON.parse(texto); } catch { return {}; }
}

function mensagemErro(dados, padrao) {
    if (Array.isArray(dados?.issues) && dados.issues.length) {
        return dados.issues.map((i) => i.message).join("\n");
    }
    return dados?.error || dados?.erro || dados?.message || dados?.mensagem || padrao;
}

async function carregarTodasInstituicoes() {
    const primeira = await listarInstituicoes({ page: 1, limit: 100, sort: "nome:asc" });
    const dados = await jsonSeguro(primeira);
    if (!primeira.ok) throw new Error(mensagemErro(dados, "Não foi possível carregar as instituições."));

    const lista = Array.isArray(dados?.dados) ? [...dados.dados] : Array.isArray(dados) ? [...dados] : [];
    const totalPaginas = Number(dados?.paginacao?.totalPaginas) || 1;

    for (let pagina = 2; pagina <= totalPaginas; pagina += 1) {
        const resposta = await listarInstituicoes({ page: pagina, limit: 100, sort: "nome:asc" });
        const bloco = await jsonSeguro(resposta);
        if (!resposta.ok) throw new Error(mensagemErro(bloco, "Não foi possível concluir o carregamento das instituições."));
        if (Array.isArray(bloco?.dados)) lista.push(...bloco.dados);
    }
    return lista;
}

async function carregarInstituicoes() {
    el.btnAtualizar.disabled = true;
    mostrarLoading();
    try {
        estado.lista = await carregarTodasInstituicoes();
        estado.selecionadas.clear();
        estado.pagina = 1;
        atualizarContadores();
        aplicarFiltros();
    } catch (erro) {
        console.error("Erro ao carregar instituições:", erro);
        estado.lista = [];
        aplicarFiltros();
        mostrarErro(erro.message || "Não foi possível carregar as instituições.");
    } finally {
        esconderLoading();
        el.btnAtualizar.disabled = false;
    }
}

function atualizarContadores() {
    const lista = estado.lista;
    el.contadorTodas.textContent = String(lista.length);
    el.contadorAtivas.textContent = String(lista.filter((i) => i.ativa === true).length);
    el.contadorInativas.textContent = String(lista.filter((i) => i.ativa === false).length);
    el.contadorPendentes.textContent = String(lista.filter((i) => String(i.statusOk).toUpperCase() === "PENDENTE").length);
}

function atendeFiltro(i) {
    if (estado.filtro === "ATIVAS") return i.ativa === true;
    if (estado.filtro === "INATIVAS") return i.ativa === false;
    if (estado.filtro === "PENDENTES") return String(i.statusOk).toUpperCase() === "PENDENTE";
    return true;
}

function valorOrdenacao(i, campo) {
    if (campo === "ativa") return i.ativa ? 1 : 0;
    return normalizar(i?.[campo]);
}

function aplicarFiltros() {
    const termo = normalizar(el.pesquisa.value);
    estado.filtrada = estado.lista.filter((i) => {
        if (!atendeFiltro(i)) return false;
        if (!termo) return true;
        return normalizar([
            i.id, i.nome, i.tipo, i.responsavel, i.email, i.telefone,
            i.cep, i.logradouro, i.bairro, i.cidade, i.uf, i.statusOk,
            i.ativa ? "ativa" : "inativa"
        ].join(" ")).includes(termo);
    });

    const fator = estado.direcao === "desc" ? -1 : 1;
    estado.filtrada.sort((a, b) => {
        const va = valorOrdenacao(a, estado.ordenarPor);
        const vb = valorOrdenacao(b, estado.ordenarPor);
        if (typeof va === "number" && typeof vb === "number") return (va - vb) * fator;
        return String(va).localeCompare(String(vb), "pt-BR", { sensitivity: "base", numeric: true }) * fator;
    });

    const totalPaginas = obterTotalPaginas();
    if (estado.pagina > totalPaginas) estado.pagina = totalPaginas;
    if (estado.pagina < 1) estado.pagina = 1;

    atualizarResultado();
    renderizarTabela();
    renderizarPaginacao();
    atualizarBarraSelecao();
    atualizarOrdenacaoVisual();
}

function obterTotalPaginas() {
    return Math.max(1, Math.ceil(estado.filtrada.length / estado.porPagina));
}

function paginaAtual() {
    const inicio = (estado.pagina - 1) * estado.porPagina;
    return estado.filtrada.slice(inicio, inicio + estado.porPagina);
}

function atualizarResultado() {
    const q = estado.filtrada.length;
    el.resultado.textContent = `Exibindo ${q} ${q === 1 ? "instituição" : "instituições"}`;
    el.btnLimparPesquisa.hidden = !el.pesquisa.value;
}

function criarLinha(i) {
    const id = Number(i.id);
    const selecionada = estado.selecionadas.has(id);
    const ativa = i.ativa !== false;
    const statusOk = String(i.statusOk || "PENDENTE").toUpperCase();
    const endereco = [i.logradouro, i.numero, i.bairro].filter(Boolean).join(", ");

    return `
        <tr data-id="${id}">
            <td class="coluna-checkbox"><input type="checkbox" class="checkbox-instituicao" data-id="${id}" ${selecionada ? "checked" : ""} aria-label="Selecionar ${escapar(i.nome)}"></td>
            <td>
                <div class="instituicao-dado-centralizado instituicao-id">
                    <i class="fa-solid fa-hashtag"></i>
                    <strong>${id}</strong>
                </div>
            </td>
            <td>
                <div class="instituicao-celula">
                    <span class="instituicao-avatar">${escapar(iniciais(i.nome))}</span>
                    <span class="instituicao-principal">
                        <strong title="${escapar(i.nome)}">${escapar(i.nome)}</strong>
                    </span>
                </div>
            </td>
            <td>
                <div class="instituicao-dado-centralizado">
                    <i class="fa-solid fa-user-tie"></i>
                    <span>${escapar(i.responsavel || "-")}</span>
                </div>
            </td>
            <td>
                <div class="contato-celula contato-celula-centralizada">
                    <span class="instituicao-dado-com-icone">
                        <i class="fa-solid fa-envelope"></i>
                        <span>${escapar(i.email || "-")}</span>
                    </span>
                    <small class="contato-secundario instituicao-dado-com-icone">
                        <i class="fa-solid fa-phone"></i>
                        <span>${escapar(formatarTelefone(i.telefone))}</span>
                    </small>
                </div>
            </td>
            <td>
                <div class="localizacao-celula-centralizada">
                    <span class="instituicao-dado-com-icone">
                        <i class="fa-solid fa-location-dot"></i>
                        <strong>${escapar(enderecoResumido(i))}</strong>
                    </span>
                    ${i.bairro ? `<small class="contato-secundario">${escapar(i.bairro)}</small>` : ""}
                </div>
            </td>
            <td>
                <span class="beneficio-badge tipo-instituicao tipo-${String(i.tipo || "OUTRO").toLowerCase()}">
                    <i class="fa-solid fa-building"></i>
                    ${escapar(formatarTipo(i.tipo))}
                </span>
            </td>
            <td>
                <button type="button" class="status ${ativa ? "status-ativo" : "status-inativo"} btnStatusInstituicao" data-id="${id}" data-ativa="${ativa}" title="${ativa ? "Inativar instituição" : "Ativar instituição"}">
                    <i class="fa-solid ${ativa ? "fa-circle-check" : "fa-circle-pause"}"></i>${ativa ? "Ativa" : "Inativa"}
                </button>
            </td>
            <td>
                <button type="button" class="status-aprovacao btnAprovacaoInstituicao ${statusOk === "OK" ? "ok" : "pendente"}" data-id="${id}" data-status="${statusOk}" title="Alterar documentação">
                    <i class="fa-solid ${statusOk === "OK" ? "fa-circle-check" : "fa-clock"}"></i>${statusOk === "OK" ? "OK" : "Pendente"}
                </button>
            </td>
            <td class="coluna-acoes">
                <div class="acoes-instituicao">
                    <button type="button" class="btnSaldoInstituicao" data-id="${id}" data-nome="${escapar(i.nome)}" title="Saldo de cestas" aria-label="Consultar saldo de cestas"><i class="fa-solid fa-boxes-stacked"></i></button>
                    <button type="button" class="btnDocumentosInstituicao" data-id="${id}" data-nome="${escapar(i.nome)}" title="Documentações vinculadas" aria-label="Ver documentações vinculadas"><i class="fa-solid fa-folder-open"></i></button>
                    <button type="button" class="btnEditarInstituicao" data-id="${id}" title="Editar instituição" aria-label="Editar instituição"><i class="fa-solid fa-pen"></i></button>
                </div>
            </td>
        </tr>`;
}

function renderizarTabela() {
    const lista = paginaAtual();
    if (!lista.length) {
        el.tabela.innerHTML = `<tr class="instituicoes-vazio"><td colspan="10"><div class="instituicoes-empty-state"><div class="instituicoes-empty-icon"><i class="fa-solid fa-building-circle-xmark"></i></div><strong>Nenhuma instituição encontrada</strong><span>Não existem registros para os critérios informados.</span></div></td></tr>`;
        atualizarSelecionarTodas();
        return;
    }
    el.tabela.innerHTML = lista.map(criarLinha).join("");
    atualizarSelecionarTodas();
}

function renderizarPaginacao() {
    const total = estado.filtrada.length;
    const totalPaginas = obterTotalPaginas();
    const inicio = total ? (estado.pagina - 1) * estado.porPagina + 1 : 0;
    const fim = Math.min(estado.pagina * estado.porPagina, total);
    el.intervalo.textContent = `${inicio}–${fim} de ${total}`;

    el.btnPrimeira.disabled = estado.pagina <= 1;
    el.btnAnterior.disabled = estado.pagina <= 1;
    el.btnProxima.disabled = estado.pagina >= totalPaginas;
    el.btnUltima.disabled = estado.pagina >= totalPaginas;

    const min = Math.max(1, estado.pagina - 2);
    const max = Math.min(totalPaginas, min + 4);
    const botoes = [];
    for (let n = Math.max(1, max - 4); n <= max; n += 1) {
        botoes.push(`<button type="button" class="paginacao-botao ${n === estado.pagina ? "ativo" : ""}" data-pagina="${n}" ${n === estado.pagina ? 'aria-current="page"' : ""}>${n}</button>`);
    }
    el.numeros.innerHTML = botoes.join("");
}

function irPagina(pagina) {
    estado.pagina = Math.min(Math.max(1, Number(pagina) || 1), obterTotalPaginas());
    renderizarTabela();
    renderizarPaginacao();
}

function atualizarOrdenacaoVisual() {
    document.querySelectorAll(".instituicoes-ordenacao").forEach((btn) => {
        const icone = btn.querySelector("i");
        icone.className = "fa-solid fa-sort";
        if (btn.dataset.ordenarPor === estado.ordenarPor) {
            icone.className = `fa-solid ${estado.direcao === "asc" ? "fa-sort-up" : "fa-sort-down"}`;
        }
    });
}

function atualizarSelecionarTodas() {
    const ids = paginaAtual().map((i) => Number(i.id));
    const selecionadas = ids.filter((id) => estado.selecionadas.has(id)).length;
    el.selecionarTodas.checked = ids.length > 0 && selecionadas === ids.length;
    el.selecionarTodas.indeterminate = selecionadas > 0 && selecionadas < ids.length;
}

function atualizarBarraSelecao() {
    const q = estado.selecionadas.size;
    el.barraSelecao.hidden = q === 0;
    el.quantidadeSelecionadas.textContent = `${q} ${q === 1 ? "instituição selecionada" : "instituições selecionadas"}`;
    el.btnAtivarSelecionadas.disabled = q === 0;
    el.btnInativarSelecionadas.disabled = q === 0;
}

function selecionarPagina(marcar) {
    paginaAtual().forEach((i) => marcar ? estado.selecionadas.add(Number(i.id)) : estado.selecionadas.delete(Number(i.id)));
    renderizarTabela();
    atualizarBarraSelecao();
}

function abrirModal() {
    if (!el.modal) return;

    el.modal.hidden = false;
    el.modal.removeAttribute("hidden");
    el.modal.setAttribute("aria-hidden", "false");
    el.modal.classList.add("ativo");

    document.body.classList.add("modal-aberto");
}

function fecharModal() {
    if (!el.modal) return;

    el.modal.classList.remove("ativo", "aberto", "show");
    el.modal.hidden = true;
    el.modal.setAttribute("hidden", "");
    el.modal.setAttribute("aria-hidden", "true");

    if (el.modalCredenciais?.hidden !== false) {
        document.body.classList.remove("modal-aberto");
    }

    estado.editandoId = null;
    el.formulario?.reset();
}

function abrirCredenciais(credenciais) {
    el.credencialEmail.value = credenciais?.email || "";
    el.credencialSenha.value = credenciais?.senhaTemporaria || "";

    el.modalCredenciais.hidden = false;
    el.modalCredenciais.removeAttribute("hidden");
    el.modalCredenciais.setAttribute("aria-hidden", "false");
    el.modalCredenciais.classList.add("ativo");

    document.body.classList.add("modal-aberto");
}

function fecharCredenciais() {
    if (!el.modalCredenciais) return;

    el.modalCredenciais.classList.remove("ativo", "aberto", "show");
    el.modalCredenciais.hidden = true;
    el.modalCredenciais.setAttribute("hidden", "");
    el.modalCredenciais.setAttribute("aria-hidden", "true");

    if (el.modal?.hidden !== false) {
        document.body.classList.remove("modal-aberto");
    }
}

function novaInstituicao() {
    estado.editandoId = null;
    el.formulario.reset();
    campos.id.value = "";
    el.tituloModal.textContent = "Nova instituição";
    el.textoBtnSalvar.textContent = "Salvar instituição";
    abrirModal();
    campos.nome.focus();
}

function formatarDataDocumento(valor) {
    if (!valor) return "-";

    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return String(valor);

    return data.toLocaleString("pt-BR");
}

function formatarCnpjDocumento(valor) {
    const numeros = String(valor || "").replace(/\D/g, "");

    if (numeros.length !== 14) {
        return valor || "Não identificado";
    }

    return numeros.replace(
        /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
        "$1.$2.$3/$4-$5"
    );
}

function fecharDocumentosInstituicao() {
    const modal = document.getElementById("modalDocumentosInstituicao");
    if (!modal) return;

    modal.classList.remove("ativo", "aberto", "show");
    modal.hidden = true;
    modal.setAttribute("hidden", "");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-documentos-aberto");
}

function renderizarDocumentosInstituicao(documentos) {
    const lista = document.getElementById("listaDocumentosInstituicao");
    if (!lista) return;

    if (!Array.isArray(documentos) || documentos.length === 0) {
        lista.innerHTML = `
            <div class="documentos-instituicao-estado vazio">
                <i class="fa-regular fa-folder-open"></i>
                <strong>Nenhum documento vinculado</strong>
                <span>Esta instituição ainda não possui comprovantes vinculados.</span>
            </div>
        `;
        return;
    }

    lista.innerHTML = documentos.map((documento) => {
        const tipo = escapar(documento.tipoDoc || "Documento");
        const cnpj = escapar(formatarCnpjDocumento(documento.cnpjExtraido));
        const criadoEm = escapar(formatarDataDocumento(documento.criadoEm));

        return `
            <article class="documento-instituicao-card">
                <div class="documento-instituicao-icone">
                    <i class="fa-solid fa-file-invoice"></i>
                </div>

                <div class="documento-instituicao-info">
                    <div class="documento-instituicao-topo">
                        <div>
                            <span class="documento-instituicao-id">#${documento.id}</span>
                            <strong>${tipo}</strong>
                        </div>
                    </div>

                    <div class="documento-instituicao-meta">
                        <span>
                            <i class="fa-solid fa-building"></i>
                            CNPJ: ${cnpj}
                        </span>
                        <span>
                            <i class="fa-regular fa-calendar"></i>
                            ${criadoEm}
                        </span>
                    </div>
                </div>

                <div class="documento-instituicao-acoes">
                    <span class="documento-instituicao-status">
                        <i class="fa-solid fa-circle-check"></i>
                        Vinculado
                    </span>

                    <button
                        type="button"
                        class="btnAbrirDocumentoInstituicao"
                        data-documento-id="${documento.id}"
                        title="Abrir documento"
                    >
                        <i class="fa-solid fa-arrow-up-right-from-square"></i>
                        Abrir
                    </button>
                </div>
            </article>
        `;
    }).join("");
}

async function abrirArquivoDocumentoInstituicao(botao) {
    const id = Number(botao?.dataset?.documentoId);

    if (!Number.isInteger(id) || id <= 0) {
        mostrarErro("Documento inválido.");
        return;
    }

    const conteudoOriginal = botao.innerHTML;

    botao.disabled = true;
    botao.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Abrindo...
    `;

    try {
        const resposta = await abrirArquivoComprovanteAPI(id);

        if (!resposta.ok) {
            let dados = {};

            try {
                dados = await resposta.json();
            } catch {
                dados = {};
            }

            throw new Error(
                dados.message ||
                dados.error ||
                "Não foi possível abrir o documento."
            );
        }

        const blob = await resposta.blob();
        const urlTemporaria = URL.createObjectURL(blob);

        const novaJanela = window.open(
            urlTemporaria,
            "_blank",
            "noopener,noreferrer"
        );

        if (!novaJanela) {
            URL.revokeObjectURL(urlTemporaria);

            throw new Error(
                "O navegador bloqueou a abertura do documento."
            );
        }

        window.setTimeout(() => {
            URL.revokeObjectURL(urlTemporaria);
        }, 60_000);
    } catch (erro) {
        console.error("Erro ao abrir documento:", erro);
        mostrarErro(erro.message);
    } finally {
        botao.disabled = false;
        botao.innerHTML = conteudoOriginal;
    }
}

async function abrirDocumentosInstituicao(id, nome) {
    const modal = document.getElementById("modalDocumentosInstituicao");
    const lista = document.getElementById("listaDocumentosInstituicao");
    const nomeEl = document.getElementById("nomeInstituicaoDocumentos");

    if (!modal || !lista) {
        mostrarErro("Não foi possível abrir a área de documentações.");
        return;
    }

    if (nomeEl) {
        nomeEl.textContent = nome || "Instituição";
    }

    lista.innerHTML = `
        <div class="documentos-instituicao-estado">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <strong>Carregando documentos...</strong>
        </div>
    `;

    modal.hidden = false;
    modal.removeAttribute("hidden");
    modal.setAttribute("aria-hidden", "false");
    modal.classList.add("ativo");
    document.body.classList.add("modal-documentos-aberto");

    try {
        const resposta =
            await listarComprovantesInstituicaoAPI(Number(id));

        let dados = {};
        try {
            dados = await resposta.json();
        } catch {
            dados = {};
        }

        if (!resposta.ok) {
            throw new Error(
                dados.message ||
                dados.error ||
                "Não foi possível carregar os documentos."
            );
        }

        renderizarDocumentosInstituicao(dados);
    } catch (erro) {
        console.error(
            "Erro ao carregar documentações da instituição:",
            erro
        );

        lista.innerHTML = `
            <div class="documentos-instituicao-estado erro">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <strong>Não foi possível carregar os documentos</strong>
                <span>${escapar(erro.message)}</span>
            </div>
        `;
    }
}

async function editarInstituicao(id) {
    mostrarLoading();
    try {
        const resposta = await buscarInstituicao(id);
        const i = await jsonSeguro(resposta);
        if (!resposta.ok) throw new Error(mensagemErro(i, "Não foi possível carregar a instituição."));

        estado.editandoId = Number(id);
        campos.id.value = i.id || id;
        campos.nome.value = i.nome || "";
        campos.cnpj.value = i.cnpj || "";
        campos.tipo.value = i.tipo || "";
        campos.responsavel.value = i.responsavel || "";
        campos.email.value = i.email || "";
        campos.telefone.value = formatarTelefone(i.telefone || "");
        campos.cep.value = formatarCEP(i.cep || "");
        campos.logradouro.value = i.logradouro || "";
        campos.numero.value = i.numero || "";
        campos.complemento.value = i.complemento || "";
        campos.bairro.value = i.bairro || "";
        campos.cidade.value = i.cidade || "";
        campos.uf.value = i.uf || "";
        el.tituloModal.textContent = "Editar instituição";
        el.textoBtnSalvar.textContent = "Salvar alterações";
        abrirModal();
    } catch (erro) {
        mostrarErro(erro.message || "Não foi possível abrir a instituição.");
    } finally { esconderLoading(); }
}

function montarDados() {
    return {
        nome: campos.nome.value.trim(),
        cnpj: campos.cnpj.value.trim(),
        tipo: campos.tipo.value,
        responsavel: campos.responsavel.value.trim(),
        email: campos.email.value.trim().toLowerCase(),
        telefone: campos.telefone.value.trim(),
        cep: campos.cep.value.replace(/\D/g, ""),
        logradouro: campos.logradouro.value.trim(),
        numero: campos.numero.value.trim(),
        complemento: campos.complemento.value.trim(),
        bairro: campos.bairro.value.trim(),
        cidade: campos.cidade.value.trim(),
        uf: campos.uf.value
    };
}

async function salvar(event) {
    event.preventDefault();
    if (!el.formulario.reportValidity()) return;
    const dados = montarDados();
    el.btnSalvar.disabled = true;
    mostrarLoading();
    try {
        const editando = Number.isInteger(estado.editandoId);
        const resposta = editando
            ? await editarInstituicaoAPI(estado.editandoId, dados)
            : await cadastrarInstituicaoAPI(dados);
        const retorno = await jsonSeguro(resposta);
        if (!resposta.ok) throw new Error(mensagemErro(retorno, "Não foi possível salvar a instituição."));

        fecharModal();
        await carregarInstituicoes();
        mostrarSucesso(retorno.mensagem || (editando ? "Instituição atualizada com sucesso." : "Instituição cadastrada com sucesso."));
        if (!editando && retorno?.credenciais) abrirCredenciais(retorno.credenciais);
    } catch (erro) {
        mostrarErro(erro.message || "Não foi possível salvar a instituição.");
    } finally {
        esconderLoading();
        el.btnSalvar.disabled = false;
    }
}

let resolverConfirmacaoInstituicao = null;

function fecharConfirmacaoInstituicao(resultado = false) {
    if (!el.modalConfirmacao) return;

    el.modalConfirmacao.classList.remove("ativo", "aberto", "show");
    el.modalConfirmacao.hidden = true;
    el.modalConfirmacao.setAttribute("hidden", "");
    el.modalConfirmacao.setAttribute("aria-hidden", "true");

    if (el.modal?.hidden !== false || el.modalCredenciais?.hidden !== false) {
        if (el.modal?.hidden !== false && el.modalCredenciais?.hidden !== false) {
            document.body.classList.remove("modal-aberto");
        }
    }

    const resolver = resolverConfirmacaoInstituicao;
    resolverConfirmacaoInstituicao = null;
    if (resolver) resolver(Boolean(resultado));
}

function confirmarAcaoInstituicao({
    titulo = "Confirmar ação",
    mensagem = "Deseja continuar com esta alteração?",
    textoConfirmar = "Confirmar"
} = {}) {
    if (!el.modalConfirmacao) {
        return Promise.resolve(false);
    }

    if (resolverConfirmacaoInstituicao) {
        fecharConfirmacaoInstituicao(false);
    }

    el.tituloConfirmacao.textContent = titulo;
    el.mensagemConfirmacao.textContent = mensagem;

    const span = el.btnConfirmarConfirmacao?.querySelector("span");
    if (span) span.textContent = textoConfirmar;

    el.modalConfirmacao.hidden = false;
    el.modalConfirmacao.removeAttribute("hidden");
    el.modalConfirmacao.setAttribute("aria-hidden", "false");
    el.modalConfirmacao.classList.add("ativo");
    document.body.classList.add("modal-aberto");

    window.setTimeout(() => el.btnConfirmarConfirmacao?.focus(), 30);

    return new Promise((resolve) => {
        resolverConfirmacaoInstituicao = resolve;
    });
}

async function alterarSituacao(id, ativa, confirmar = true) {
    const i = estado.lista.find((item) => Number(item.id) === Number(id));
    const acao = ativa ? "ativar" : "inativar";
    if (confirmar) {
        const confirmado = await confirmarAcaoInstituicao({
            titulo: ativa ? "Ativar instituição" : "Inativar instituição",
            mensagem: `Deseja realmente ${acao} ${i?.nome || "esta instituição"}?`,
            textoConfirmar: ativa ? "Ativar" : "Inativar"
        });
        if (!confirmado) return;
    }

    const resposta = await alterarSituacaoInstituicaoAPI(id, ativa);
    const dados = await jsonSeguro(resposta);
    if (!resposta.ok) throw new Error(mensagemErro(dados, `Não foi possível ${acao} a instituição.`));
}

async function alternarSituacao(id, ativaAtual) {
    const instituicao =
        estado.lista.find(
            (item) =>
                Number(item.id) === Number(id)
        );

    const novaSituacao =
        !ativaAtual;

    const acao =
        novaSituacao
            ? "ativar"
            : "inativar";

    /*
     * A confirmação precisa aparecer ANTES do loading.
     * Caso contrário, o overlay de carregamento fica acima
     * do modal e impede o usuário de confirmar ou cancelar.
     */
    const confirmado =
        await confirmarAcaoInstituicao({
            titulo:
                novaSituacao
                    ? "Ativar instituição"
                    : "Inativar instituição",

            mensagem:
                `Deseja realmente ${acao} ${
                    instituicao?.nome ||
                    "esta instituição"
                }?`,

            textoConfirmar:
                novaSituacao
                    ? "Ativar"
                    : "Inativar"
        });

    if (!confirmado) {
        return;
    }

    mostrarLoading();

    try {
        /*
         * A confirmação já ocorreu acima, portanto passamos
         * false para impedir a abertura de um segundo modal.
         */
        await alterarSituacao(
            id,
            novaSituacao,
            false
        );

        await carregarInstituicoes();

        mostrarSucesso(
            novaSituacao
                ? "Instituição ativada com sucesso."
                : "Instituição inativada com sucesso."
        );

    } catch (erro) {
        console.error(
            "Erro ao alterar situação da instituição:",
            erro
        );

        mostrarErro(
            erro.message ||
            "Não foi possível alterar a situação da instituição."
        );

    } finally {
        esconderLoading();
    }
}

async function alternarAprovacao(id, atual) {
    const novo = atual === "OK" ? "PENDENTE" : "OK";
    const confirmado = await confirmarAcaoInstituicao({
        titulo: "Alterar documentação",
        mensagem: `Deseja alterar a documentação para ${novo === "OK" ? "OK" : "Pendente"}?`,
        textoConfirmar: "Confirmar"
    });
    if (!confirmado) return;
    mostrarLoading();
    try {
        const resposta = await alterarStatusInstituicaoAPI(id, novo);
        const dados = await jsonSeguro(resposta);
        if (!resposta.ok) throw new Error(mensagemErro(dados, "Não foi possível alterar a documentação."));
        await carregarInstituicoes();
        mostrarSucesso(dados.mensagem || "Aprovação atualizada com sucesso.");
    } catch (erro) { mostrarErro(erro.message); } finally { esconderLoading(); }
}

async function alterarSelecionadas(ativa) {
    const ids = [...estado.selecionadas];
    if (!ids.length) return;
    const confirmado = await confirmarAcaoInstituicao({
        titulo: ativa ? "Ativar instituições" : "Inativar instituições",
        mensagem: `Deseja ${ativa ? "ativar" : "inativar"} ${ids.length} instituição(ões) selecionada(s)?`,
        textoConfirmar: ativa ? "Ativar" : "Inativar"
    });
    if (!confirmado) return;
    mostrarLoading();
    try {
        for (const id of ids) await alterarSituacao(id, ativa, false);
        estado.selecionadas.clear();
        await carregarInstituicoes();
        mostrarSucesso(`Instituições ${ativa ? "ativadas" : "inativadas"} com sucesso.`);
    } catch (erro) { mostrarErro(erro.message); } finally { esconderLoading(); }
}

function mascaraTelefone(event) {
    let n = event.target.value.replace(/\D/g, "").slice(0, 11);
    if (n.length > 10) n = n.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
    else if (n.length > 6) n = n.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
    else if (n.length > 2) n = n.replace(/(\d{2})(\d+)/, "($1) $2");
    else if (n.length) n = n.replace(/(\d{0,2})/, "($1");
    event.target.value = n;
}

function mascaraCEP(event) {
    let n = event.target.value.replace(/\D/g, "").slice(0, 8);
    if (n.length > 5) n = n.replace(/(\d{5})(\d+)/, "$1-$2");
    event.target.value = n;
}

async function buscarCEP() {
    const cep = campos.cep.value.replace(/\D/g, "");
    if (cep.length !== 8) return;
    try {
        const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const dados = await resposta.json();
        if (!resposta.ok || dados.erro) return;
        campos.logradouro.value = dados.logradouro || campos.logradouro.value;
        campos.bairro.value = dados.bairro || campos.bairro.value;
        campos.cidade.value = dados.localidade || campos.cidade.value;
        campos.uf.value = dados.uf || campos.uf.value;
    } catch (erro) { console.warn("Não foi possível consultar o CEP:", erro); }
}

function configurarEventos() {
    estado.controlador?.abort();
    estado.controlador = new AbortController();
    const op = { signal: estado.controlador.signal };

    el.btnNova.addEventListener("click", novaInstituicao, op);
    el.btnAtualizar.addEventListener("click", carregarInstituicoes, op);
    el.pesquisa.addEventListener("input", () => { estado.pagina = 1; aplicarFiltros(); }, op);
    el.btnLimparPesquisa.addEventListener("click", () => { el.pesquisa.value = ""; estado.pagina = 1; aplicarFiltros(); el.pesquisa.focus(); }, op);

    document.querySelectorAll("[data-filtro-status]").forEach((btn) => btn.addEventListener("click", () => {
        estado.filtro = btn.dataset.filtroStatus;
        estado.pagina = 1;
        document.querySelectorAll("[data-filtro-status]").forEach((b) => { b.classList.toggle("ativo", b === btn); b.setAttribute("aria-pressed", b === btn ? "true" : "false"); });
        aplicarFiltros();
    }, op));

    document.querySelectorAll(".instituicoes-ordenacao").forEach((btn) => btn.addEventListener("click", () => {
        const campo = btn.dataset.ordenarPor;
        if (estado.ordenarPor === campo) estado.direcao = estado.direcao === "asc" ? "desc" : "asc";
        else { estado.ordenarPor = campo; estado.direcao = "asc"; }
        aplicarFiltros();
    }, op));

    el.quantidadePorPagina.addEventListener("change", () => { estado.porPagina = Number(el.quantidadePorPagina.value) || 10; estado.pagina = 1; aplicarFiltros(); }, op);
    el.btnPrimeira.addEventListener("click", () => irPagina(1), op);
    el.btnAnterior.addEventListener("click", () => irPagina(estado.pagina - 1), op);
    el.btnProxima.addEventListener("click", () => irPagina(estado.pagina + 1), op);
    el.btnUltima.addEventListener("click", () => irPagina(obterTotalPaginas()), op);
    el.numeros.addEventListener("click", (e) => { const b = e.target.closest("[data-pagina]"); if (b) irPagina(b.dataset.pagina); }, op);

    el.selecionarTodas.addEventListener("change", (e) => selecionarPagina(e.target.checked), op);
    el.btnLimparSelecao.addEventListener("click", () => { estado.selecionadas.clear(); renderizarTabela(); atualizarBarraSelecao(); }, op);
    el.btnAtivarSelecionadas.addEventListener("click", () => alterarSelecionadas(true), op);
    el.btnInativarSelecionadas.addEventListener("click", () => alterarSelecionadas(false), op);

    el.tabela.addEventListener("change", (e) => {
        const c = e.target.closest(".checkbox-instituicao");
        if (!c) return;
        const id = Number(c.dataset.id);
        c.checked ? estado.selecionadas.add(id) : estado.selecionadas.delete(id);
        atualizarSelecionarTodas(); atualizarBarraSelecao();
    }, op);

    el.tabela.addEventListener("click", (e) => {
        const saldo = e.target.closest(".btnSaldoInstituicao");
        if (saldo) return abrirSaldoInstituicao(saldo.dataset.id, saldo.dataset.nome);

        const documentos = e.target.closest(".btnDocumentosInstituicao");
        if (documentos) {
            return abrirDocumentosInstituicao(
                documentos.dataset.id,
                documentos.dataset.nome
            );
        }

        const editar = e.target.closest(".btnEditarInstituicao");
        if (editar) return editarInstituicao(editar.dataset.id);
        const status = e.target.closest(".btnStatusInstituicao, .btnAlternarInstituicao");
        if (status) return alternarSituacao(status.dataset.id, status.dataset.ativa === "true");
        const aprovacao = e.target.closest(".btnAprovacaoInstituicao");
        if (aprovacao) return alternarAprovacao(aprovacao.dataset.id, aprovacao.dataset.status);
    }, op);

    document
        .getElementById("btnFecharDocumentosInstituicao")
        ?.addEventListener("click", fecharDocumentosInstituicao, op);

    document
        .getElementById("modalDocumentosInstituicao")
        ?.addEventListener("click", (e) => {
            const botaoAbrir =
                e.target.closest(".btnAbrirDocumentoInstituicao");

            if (botaoAbrir) {
                abrirArquivoDocumentoInstituicao(botaoAbrir);
                return;
            }

            if (e.target.id === "modalDocumentosInstituicao") {
                fecharDocumentosInstituicao();
            }
        }, op);

    el.btnFecharModal.addEventListener("click", fecharModal, op);
    el.btnCancelar.addEventListener("click", fecharModal, op);
    el.formulario.addEventListener("submit", salvar, op);
    el.btnFecharCredenciais.addEventListener("click", fecharCredenciais, op);
    el.btnCancelarConfirmacao?.addEventListener("click", () => fecharConfirmacaoInstituicao(false), op);
    el.btnConfirmarConfirmacao?.addEventListener("click", () => fecharConfirmacaoInstituicao(true), op);
    el.modalConfirmacao?.addEventListener("click", (e) => {
        if (e.target === el.modalConfirmacao) fecharConfirmacaoInstituicao(false);
    }, op);
    el.modal.addEventListener("click", (e) => {
        if (e.target === el.modal) fecharModal();
    }, op);
    el.modalCredenciais.addEventListener("click", (e) => {
        if (e.target === el.modalCredenciais) fecharCredenciais();
    }, op);
    el.btnCopiarCredenciais.addEventListener("click", async () => {
        const texto = `E-mail: ${el.credencialEmail.value}\nSenha temporária: ${el.credencialSenha.value}`;
        try { await navigator.clipboard.writeText(texto); mostrarSucesso("Credenciais copiadas com sucesso."); }
        catch { mostrarErro("Não foi possível copiar as credenciais."); }
    }, op);

    campos.telefone.addEventListener("input", mascaraTelefone, op);
    campos.cep.addEventListener("input", mascaraCEP, op);
    campos.cep.addEventListener("blur", buscarCEP, op);
    document.addEventListener("keydown", (e) => {
        if (
            e.key === "Escape" &&
            document.getElementById("modalDocumentosInstituicao")?.hidden === false
        ) {
            fecharDocumentosInstituicao();
            return;
        }
        if (e.key !== "Escape") return;

        if (el.modalConfirmacao?.hidden === false) {
            fecharConfirmacaoInstituicao(false);
            return;
        }

        if (el.modalCredenciais?.hidden === false) {
            fecharCredenciais();
            return;
        }

        if (el.modal?.hidden === false) {
            fecharModal();
        }
    }, op);
}

export async function inicializarInstituicoes() {
    try {
        Object.assign(estado, {
            lista: [], filtrada: [], selecionadas: new Set(), filtro: "TODOS", pagina: 1,
            porPagina: 10, ordenarPor: "nome", direcao: "asc", editandoId: null
        });
        capturarElementos();
        validarEstrutura();

        // Garante que nenhum modal seja exibido ao entrar na tela.
        el.modal.classList.remove("ativo", "aberto", "show");
        el.modal.hidden = true;
        el.modal.setAttribute("hidden", "");
        el.modal.setAttribute("aria-hidden", "true");

        el.modalCredenciais.classList.remove("ativo", "aberto", "show");
        el.modalCredenciais.hidden = true;
        el.modalCredenciais.setAttribute("hidden", "");
        el.modalCredenciais.setAttribute("aria-hidden", "true");

        if (el.modalConfirmacao) {
            el.modalConfirmacao.classList.remove("ativo", "aberto", "show");
            el.modalConfirmacao.hidden = true;
            el.modalConfirmacao.setAttribute("hidden", "");
            el.modalConfirmacao.setAttribute("aria-hidden", "true");
        }

        document.body.classList.remove("modal-aberto");

        configurarEventos();
        configurarSaldoInstituicoes();
        atualizarBarraSelecao();
        await carregarInstituicoes();
    } catch (erro) {
        console.error("Erro ao inicializar Instituições:", erro);
        mostrarErro(erro.message || "Não foi possível inicializar a tela de Instituições.");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    initFormNotificacao();
});
