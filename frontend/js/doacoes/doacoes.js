// =====================================================
// IMPORTAÇÕES
// =====================================================

import {
    listarDoacoes
} from "../api/doacoesApi.js";

import {
    renderizarTabelaDoacoes
} from "./doacoesTabela.js";

import {
    filtrarDoacoes
} from "./doacoesPesquisa.js";

import {
    configurarEventosDoacoes
} from "./doacoesEventos.js";

import {
    carregarInstituicoesDoacao,
    carregarBeneficiariosDoacao,
    prepararNovaDoacao,
    prepararEdicaoDoacao
} from "./doacoesFormulario.js";

import {
    normalizarListaDoacoes,
    ordenarDoacoes,
    atualizarBotoesOrdenacaoDoacoes,
    atualizarContadoresDoacoes,
    atualizarBotoesFiltroDoacoes,
    atualizarBotaoLimparPesquisaDoacoes,
    atualizarTextoResultadoDoacoes,
    atualizarPaginacaoDoacoes
} from "./doacoesUtils.js";

import {
    mostrarErro
} from "../utils/toast.js";

import {
    mostrarLoading,
    esconderLoading
} from "../utils/loading.js";


// =====================================================
// CONFIGURAÇÕES
// =====================================================

//const API_URL = "http://localhost:3000";
import { API_URL } from "../config.js";

// =====================================================
// ESTADO DO MÓDULO
// =====================================================

export const estadoDoacoes = {

    // Usuário autenticado.
    usuarioLogado: null,

    // Lista completa recebida da API.
    lista: [],

    // Filtro atualmente selecionado.
    filtroAtual: "TODAS",

    // Página atual.
    paginaAtual: 1,

    // Registros exibidos por página.
    itensPorPagina: 10,

    // Campo utilizado na ordenação.
    campoOrdenacao: "dataDoacao",

    // Direção da ordenação.
    direcaoOrdenacao: "desc",

    // ID da doação em edição.
    doacaoEditandoId: null,

    // Temporizador da pesquisa.
    temporizadorPesquisa: null,

    // Controlador utilizado para remover eventos antigos.
    controladorEventos: null

};


// =====================================================
// ELEMENTOS DA TELA
// =====================================================

export const elementosDoacoes = {};


// =====================================================
// CAMPOS DO FORMULÁRIO
// =====================================================

export const camposDoacoes = {};


// =====================================================
// OBTER TOKEN
// =====================================================

function obterToken() {

    return (
        localStorage.getItem("token") ||
        sessionStorage.getItem("token")
    );

}


// =====================================================
// LER JSON COM SEGURANÇA
// =====================================================

async function lerRespostaJson(
    resposta
) {

    const texto =
        await resposta.text();

    if (!texto) {
        return {};
    }

    try {

        return JSON.parse(
            texto
        );

    } catch (erro) {

        console.error(
            "Resposta inválida recebida do servidor:",
            texto
        );

        throw new Error(
            "O servidor retornou uma resposta inválida."
        );

    }

}


// =====================================================
// CAPTURAR ELEMENTOS DA TELA
// =====================================================

function capturarElementosDoacoes() {

    Object.assign(
        elementosDoacoes,
        {

            // ==========================================
            // TABELA E MODAL DE FORMULÁRIO
            // ==========================================

            tabela:
                document.getElementById(
                    "tabelaDoacoes"
                ),

            modal:
                document.getElementById(
                    "modalDoacao"
                ),

            formulario:
                document.getElementById(
                    "formDoacao"
                ),

            tituloModal:
                document.getElementById(
                    "tituloModalDoacao"
                ),

            grupoInstituicao:
                document.getElementById(
                    "grupoInstituicaoDoacao"
                ),

            selectInstituicao:
                document.getElementById(
                    "instituicaoIdDoacao"
                ),


            // ==========================================
            // BOTÕES PRINCIPAIS
            // ==========================================

            btnNova:
                document.getElementById(
                    "btnNovaDoacao"
                ),

            btnFecharModal:
                document.getElementById(
                    "btnFecharModalDoacao"
                ),

            btnCancelar:
                document.getElementById(
                    "btnCancelarDoacao"
                ),


            // ==========================================
            // PESQUISA E FILTROS
            // ==========================================

            pesquisa:
                document.getElementById(
                    "pesquisaDoacao"
                ),

            btnLimparPesquisa:
                document.getElementById(
                    "btnLimparPesquisaDoacao"
                ),

            filtroDataInicio: document.getElementById("filtroDataInicioDoacoes"),
            filtroDataFim: document.getElementById("filtroDataFimDoacoes"),
            filtroInstituicao: document.getElementById("filtroInstituicaoDoacoes"),
            grupoFiltroInstituicao: document.getElementById("grupoFiltroInstituicaoDoacoes"),
            filtroOrigem: document.getElementById("filtroOrigemDoacoes"),
            filtroStatus: document.getElementById("filtroStatusDoacoes"),
            btnLimparFiltros: document.getElementById("btnLimparFiltrosDoacoes"),

            filtros:
                document.querySelectorAll(
                    "#conteudo [data-filtro-doacao]"
                ),

            botoesOrdenacao:
                document.querySelectorAll(
                    "#conteudo [data-ordenar-doacao]"
                ),


            // ==========================================
            // CONTADORES
            // ==========================================

            contadorTodas:
                document.getElementById(
                    "contadorTodasDoacoes"
                ),

            contadorCesta:
                document.getElementById(
                    "contadorDoacoesCesta"
                ),

            contadorGranel:
                document.getElementById(
                    "contadorDoacoesGranel"
                ),

            contadorAmbos:
                document.getElementById(
                    "contadorDoacoesAmbos"
                ),

            resultadoFiltro:
                document.getElementById(
                    "resultadoFiltroDoacoes"
                ),

            resumoEntregas: document.getElementById("resumoEntregasDoacoes"),
            resumoCestas: document.getElementById("resumoCestasDoacoes"),
            resumoBeneficiarios: document.getElementById("resumoBeneficiariosDoacoes"),
            resumoCanceladas: document.getElementById("resumoCanceladasDoacoes"),


            // ==========================================
            // PAGINAÇÃO
            // ==========================================

            quantidadePorPagina:
                document.getElementById(
                    "quantidadePorPaginaDoacoes"
                ),

            intervaloPaginacao:
                document.getElementById(
                    "intervaloPaginacaoDoacoes"
                ),

            numerosPaginacao:
                document.getElementById(
                    "numerosPaginacaoDoacoes"
                ),

            btnPrimeiraPagina:
                document.getElementById(
                    "btnPrimeiraPaginaDoacoes"
                ),

            btnPaginaAnterior:
                document.getElementById(
                    "btnPaginaAnteriorDoacoes"
                ),

            btnProximaPagina:
                document.getElementById(
                    "btnProximaPaginaDoacoes"
                ),

            btnUltimaPagina:
                document.getElementById(
                    "btnUltimaPaginaDoacoes"
                ),


            // ==========================================
            // MODAL DE DETALHES
            // ==========================================

            modalDetalhes:
                document.getElementById(
                    "modalDetalhesDoacao"
                ),

            btnFecharDetalhes:
                document.getElementById(
                    "btnFecharDetalhesDoacao"
                ),

            btnFecharDetalhesRodape:
                document.getElementById(
                    "btnFecharDetalhesDoacaoRodape"
                ),


            // ==========================================
            // CAMPOS DO MODAL DE DETALHES
            // ==========================================

            detalheId:
                document.getElementById(
                    "detalheDoacaoId"
                ),

            detalheCodigo:
                document.getElementById(
                    "detalheDoacaoCodigo"
                ),

            detalheBeneficiario:
                document.getElementById(
                    "detalheDoacaoBeneficiario"
                ),

            detalheInstituicao:
                document.getElementById(
                    "detalheDoacaoInstituicao"
                ),

            detalheTipo:
                document.getElementById(
                    "detalheDoacaoTipo"
                ),

            detalheTipoBadge:
                document.getElementById(
                    "detalheDoacaoTipoBadge"
                ),

            detalheQuantidade:
                document.getElementById(
                    "detalheDoacaoQuantidade"
                ),

            detalheData:
                document.getElementById(
                    "detalheDoacaoData"
                ),

            detalheUsuario:
                document.getElementById(
                    "detalheDoacaoUsuario"
                ),

            detalheComprovante:
                document.getElementById(
                    "detalheDoacaoComprovante"
                ),

            detalheObservacoes:
                document.getElementById(
                    "detalheDoacaoObservacoes"
                ),

            detalheStatus: document.getElementById("detalheDoacaoStatus"),
            detalheOrigem: document.getElementById("detalheDoacaoOrigem"),
            detalheComposicao: document.getElementById("detalheDoacaoComposicao"),
            detalheProximaEntrega: document.getElementById("detalheDoacaoProximaEntrega"),
            detalheSaldoAntes: document.getElementById("detalheDoacaoSaldoAntes"),
            detalheSaldoDepois: document.getElementById("detalheDoacaoSaldoDepois"),
            detalheRegraCalculo: document.getElementById("detalheDoacaoRegraCalculo"),
            detalheQuantidadeCalculada: document.getElementById("detalheDoacaoQuantidadeCalculada"),
            detalheDebitado: document.getElementById("detalheDoacaoDebitado"),
            detalheComprovanteEntrega: document.getElementById("detalheDoacaoComprovanteEntrega"),
            detalheHistorico: document.getElementById("detalheDoacaoHistorico"),
            detalheCancelamento: document.getElementById("detalheDoacaoCancelamento")

        }
    );


    Object.assign(
        camposDoacoes,
        {

            beneficiarioId:
                document.getElementById(
                    "beneficiarioIdDoacao"
                ),

            tipo:
                document.getElementById(
                    "tipoDoacao"
                ),

            quantidade:
                document.getElementById(
                    "quantidadeDoacao"
                ),

            observacoes:
                document.getElementById(
                    "observacoesDoacao"
                )

        }
    );

}


// =====================================================
// VALIDAR ELEMENTOS OBRIGATÓRIOS
// =====================================================

function validarElementosDoacoes() {

    const obrigatorios = [

        // Tabela e formulário.
        elementosDoacoes.tabela,
        elementosDoacoes.modal,
        elementosDoacoes.formulario,
        elementosDoacoes.tituloModal,
        elementosDoacoes.grupoInstituicao,
        elementosDoacoes.selectInstituicao,

        // Botões principais.
        elementosDoacoes.btnNova,
        elementosDoacoes.btnFecharModal,
        elementosDoacoes.btnCancelar,

        // Pesquisa.
        elementosDoacoes.pesquisa,
        elementosDoacoes.btnLimparPesquisa,
        elementosDoacoes.filtroDataInicio,
        elementosDoacoes.filtroDataFim,
        elementosDoacoes.filtroInstituicao,
        elementosDoacoes.filtroOrigem,
        elementosDoacoes.filtroStatus,
        elementosDoacoes.btnLimparFiltros,
        elementosDoacoes.resumoEntregas,
        elementosDoacoes.resumoCestas,
        elementosDoacoes.resumoBeneficiarios,
        elementosDoacoes.resumoCanceladas,

        // Contadores.
        elementosDoacoes.contadorTodas,
        elementosDoacoes.contadorCesta,
        elementosDoacoes.contadorGranel,
        elementosDoacoes.contadorAmbos,
        elementosDoacoes.resultadoFiltro,

        // Paginação.
        elementosDoacoes.quantidadePorPagina,
        elementosDoacoes.intervaloPaginacao,
        elementosDoacoes.numerosPaginacao,
        elementosDoacoes.btnPrimeiraPagina,
        elementosDoacoes.btnPaginaAnterior,
        elementosDoacoes.btnProximaPagina,
        elementosDoacoes.btnUltimaPagina,

        // Campos do formulário.
        camposDoacoes.beneficiarioId,
        camposDoacoes.tipo,
        camposDoacoes.quantidade,
        camposDoacoes.observacoes,

        // Modal de detalhes.
        elementosDoacoes.modalDetalhes,
        elementosDoacoes.btnFecharDetalhes,
        elementosDoacoes.btnFecharDetalhesRodape,

        // Dados do modal de detalhes.
        elementosDoacoes.detalheId,
        elementosDoacoes.detalheCodigo,
        elementosDoacoes.detalheBeneficiario,
        elementosDoacoes.detalheInstituicao,
        elementosDoacoes.detalheTipo,
        elementosDoacoes.detalheTipoBadge,
        elementosDoacoes.detalheQuantidade,
        elementosDoacoes.detalheData,
        elementosDoacoes.detalheUsuario,
        elementosDoacoes.detalheComprovante,
        elementosDoacoes.detalheObservacoes

    ];


    const possuiAusente =
        obrigatorios.some(
            (elemento) => !elemento
        );


    if (possuiAusente) {

        console.error(
            "Elementos capturados:",
            elementosDoacoes
        );

        console.error(
            "Campos capturados:",
            camposDoacoes
        );

        throw new Error(
            "A página de Doações não possui todos os elementos HTML necessários."
        );

    }

}


// =====================================================
// CARREGAR USUÁRIO LOGADO
// =====================================================

async function carregarUsuarioLogado() {

    const token =
        obterToken();


    if (!token) {

        throw new Error(
            "Token de autenticação não encontrado."
        );

    }


    const resposta =
        await fetch(
            `${API_URL}/auth/me`,
            {
                method: "GET",

                headers: {
                    Authorization:
                        `Bearer ${token}`
                },

                cache:
                    "no-store"
            }
        );


    const dados =
        await lerRespostaJson(
            resposta
        );


    if (!resposta.ok) {

        throw new Error(
            dados.error ||
            dados.erro ||
            dados.mensagem ||
            "Não foi possível identificar o usuário autenticado."
        );

    }


    estadoDoacoes.usuarioLogado =
        dados.usuario ||
        dados.data?.usuario ||
        null;


    if (!estadoDoacoes.usuarioLogado) {

        throw new Error(
            "O servidor não retornou os dados do usuário autenticado."
        );

    }


    return estadoDoacoes.usuarioLogado;

}


// =====================================================
// CONFIGURAR CAMPO DE INSTITUIÇÃO
// =====================================================

function configurarCampoInstituicao() {

    const usuarioAdmin =
        estadoDoacoes
            .usuarioLogado
            ?.role === "ADMIN";


    elementosDoacoes
        .grupoInstituicao
        .hidden =
            !usuarioAdmin;


    elementosDoacoes
        .selectInstituicao
        .required =
            usuarioAdmin;


    if (!usuarioAdmin) {

        elementosDoacoes
            .selectInstituicao
            .value =
                "";

    }

}


// =====================================================
// OBTER LISTA FILTRADA E ORDENADA
// =====================================================

export function obterDoacoesFiltradas() {

    let filtradas = filtrarDoacoes(
        estadoDoacoes.lista,
        elementosDoacoes.pesquisa.value,
        estadoDoacoes.filtroAtual
    );

    const inicio = elementosDoacoes.filtroDataInicio?.value || "";
    const fim = elementosDoacoes.filtroDataFim?.value || "";
    const instituicao = elementosDoacoes.filtroInstituicao?.value || "";
    const origem = elementosDoacoes.filtroOrigem?.value || "";
    const status = elementosDoacoes.filtroStatus?.value || "";

    filtradas = filtradas.filter((doacao) => {
        const cancelada = Boolean(doacao?.deletedAt || doacao?.canceladaEm);
        const data = doacao?.dataDoacao ? String(doacao.dataDoacao).slice(0, 10) : "";

        if (inicio && data && data < inicio) return false;
        if (fim && data && data > fim) return false;
        if (instituicao && String(doacao?.instituicao?.id ?? doacao?.instituicaoId ?? "") !== instituicao) return false;
        if (origem && String(doacao?.origem || "MANUAL") !== origem) return false;
        if (status === "CONCLUIDA" && cancelada) return false;
        if (status === "CANCELADA" && !cancelada) return false;
        return true;
    });

    return ordenarDoacoes(
        filtradas,
        estadoDoacoes.campoOrdenacao,
        estadoDoacoes.direcaoOrdenacao
    );
}

function atualizarResumoDoacoes(lista) {
    const itens = Array.isArray(lista) ? lista : [];
    const concluidas = itens.filter((d) => !d?.deletedAt && !d?.canceladaEm);
    const canceladas = itens.length - concluidas.length;
    const cestas = concluidas
        .filter((d) => ["CESTA", "AMBOS"].includes(String(d?.tipo || "")))
        .reduce((total, d) => total + (Number(d?.quantidade) || 0), 0);
    const beneficiarios = new Set(concluidas.map((d) => d?.beneficiario?.id).filter(Boolean)).size;

    elementosDoacoes.resumoEntregas.textContent = String(concluidas.length);
    elementosDoacoes.resumoCestas.textContent = String(cestas);
    elementosDoacoes.resumoBeneficiarios.textContent = String(beneficiarios);
    elementosDoacoes.resumoCanceladas.textContent = String(canceladas);
}

function preencherFiltroInstituicoes() {
    if (!elementosDoacoes.filtroInstituicao) return;
    const atual = elementosDoacoes.filtroInstituicao.value;
    const mapa = new Map();
    estadoDoacoes.lista.forEach((d) => {
        const id = d?.instituicao?.id ?? d?.instituicaoId;
        const nome = d?.instituicao?.nome;
        if (id && nome) mapa.set(String(id), nome);
    });
    elementosDoacoes.filtroInstituicao.innerHTML = '<option value="">Todas as instituições</option>' +
        [...mapa.entries()].sort((a,b)=>a[1].localeCompare(b[1], 'pt-BR')).map(([id,nome]) =>
            `<option value="${id}">${String(nome).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')}</option>`
        ).join('');
    if ([...mapa.keys()].includes(atual)) elementosDoacoes.filtroInstituicao.value = atual;

    const admin = estadoDoacoes.usuarioLogado?.role === "ADMIN";
    if (elementosDoacoes.grupoFiltroInstituicao) elementosDoacoes.grupoFiltroInstituicao.hidden = !admin;
}

function configurarFiltrosAvancados() {
    const controles = [
        elementosDoacoes.filtroDataInicio, elementosDoacoes.filtroDataFim,
        elementosDoacoes.filtroInstituicao, elementosDoacoes.filtroOrigem, elementosDoacoes.filtroStatus
    ].filter(Boolean);

    controles.forEach((controle) => controle.addEventListener("change", () => {
        estadoDoacoes.paginaAtual = 1;
        renderizarDoacoes();
    }, { signal: estadoDoacoes.controladorEventos?.signal }));

    elementosDoacoes.btnLimparFiltros?.addEventListener("click", () => {
        elementosDoacoes.filtroDataInicio.value = "";
        elementosDoacoes.filtroDataFim.value = "";
        elementosDoacoes.filtroInstituicao.value = "";
        elementosDoacoes.filtroOrigem.value = "";
        elementosDoacoes.filtroStatus.value = "";
        estadoDoacoes.filtroAtual = "TODAS";
        estadoDoacoes.paginaAtual = 1;
        atualizarBotoesFiltroDoacoes(elementosDoacoes, estadoDoacoes);
        renderizarDoacoes();
    }, { signal: estadoDoacoes.controladorEventos?.signal });
}

// =====================================================
// RENDERIZAR DOAÇÕES
// =====================================================

export function renderizarDoacoes() {

    const filtradas =
        obterDoacoesFiltradas();

    atualizarResumoDoacoes(filtradas);


    const totalPaginas =
        Math.max(
            1,
            Math.ceil(
                filtradas.length /
                estadoDoacoes.itensPorPagina
            )
        );


    if (
        estadoDoacoes.paginaAtual >
        totalPaginas
    ) {

        estadoDoacoes.paginaAtual =
            totalPaginas;

    }


    const inicio =
        (
            estadoDoacoes.paginaAtual -
            1
        ) *
        estadoDoacoes.itensPorPagina;


    const fim =
        inicio +
        estadoDoacoes.itensPorPagina;


    const pagina =
        filtradas.slice(
            inicio,
            fim
        );


    renderizarTabelaDoacoes(
        elementosDoacoes.tabela,
        pagina
    );


    atualizarTextoResultadoDoacoes(
        elementosDoacoes,
        filtradas.length
    );


    atualizarBotaoLimparPesquisaDoacoes(
        elementosDoacoes
    );


    atualizarPaginacaoDoacoes(
        elementosDoacoes,
        estadoDoacoes,
        filtradas.length
    );

}


// =====================================================
// CARREGAR DOAÇÕES
// =====================================================

export async function carregarDoacoes() {

    mostrarLoading();

    try {

        const resposta =
            await listarDoacoes();


        const dados =
            await lerRespostaJson(
                resposta
            );


        if (!resposta.ok) {

            throw new Error(
                dados.error ||
                dados.erro ||
                dados.mensagem ||
                "Erro ao carregar doações."
            );

        }


        estadoDoacoes.lista =
            normalizarListaDoacoes(
                dados
            );

        preencherFiltroInstituicoes();


        atualizarContadoresDoacoes(
            elementosDoacoes,
            estadoDoacoes.lista
        );


        atualizarBotoesFiltroDoacoes(
            elementosDoacoes,
            estadoDoacoes
        );


        atualizarBotoesOrdenacaoDoacoes(
            elementosDoacoes,
            estadoDoacoes
        );


        renderizarDoacoes();

    } catch (erro) {

        console.error(
            "Erro ao carregar doações:",
            erro
        );


        estadoDoacoes.lista =
            [];


        atualizarContadoresDoacoes(
            elementosDoacoes,
            estadoDoacoes.lista
        );


        renderizarDoacoes();


        mostrarErro(
            erro.message ||
            "Não foi possível carregar as doações."
        );

    } finally {

        esconderLoading();

    }

}


// =====================================================
// REINICIAR ESTADO
// =====================================================

function reiniciarEstadoDoacoes() {

    estadoDoacoes.usuarioLogado =
        null;

    estadoDoacoes.lista =
        [];

    estadoDoacoes.filtroAtual =
        "TODAS";

    estadoDoacoes.paginaAtual =
        1;

    estadoDoacoes.itensPorPagina =
        10;

    estadoDoacoes.campoOrdenacao =
        "dataDoacao";

    estadoDoacoes.direcaoOrdenacao =
        "desc";

    estadoDoacoes.doacaoEditandoId =
        null;

    estadoDoacoes.temporizadorPesquisa =
        null;

}


// =====================================================
// INICIALIZAR DOAÇÕES
// =====================================================

export async function inicializarDoacoes() {

    try {

        // ==============================================
        // REINICIAR ESTADO
        // ==============================================

        reiniciarEstadoDoacoes();


        // ==============================================
        // CAPTURAR E VALIDAR HTML
        // ==============================================

        capturarElementosDoacoes();

        validarElementosDoacoes();


        elementosDoacoes
            .quantidadePorPagina
            .value =
                String(
                    estadoDoacoes
                        .itensPorPagina
                );


        // ==============================================
        // CONFIGURAÇÕES VISUAIS INICIAIS
        // ==============================================

        atualizarBotoesFiltroDoacoes(
            elementosDoacoes,
            estadoDoacoes
        );


        atualizarBotoesOrdenacaoDoacoes(
            elementosDoacoes,
            estadoDoacoes
        );


        atualizarBotaoLimparPesquisaDoacoes(
            elementosDoacoes
        );


        atualizarContadoresDoacoes(
            elementosDoacoes,
            []
        );


        atualizarTextoResultadoDoacoes(
            elementosDoacoes,
            0
        );


        // ==============================================
        // IDENTIFICAR USUÁRIO
        // ==============================================

        await carregarUsuarioLogado();


        configurarCampoInstituicao();


        // ==============================================
        // CARREGAR INSTITUIÇÕES DO ADMIN
        // ==============================================

        if (
            estadoDoacoes
                .usuarioLogado
                ?.role === "ADMIN"
        ) {

            await carregarInstituicoesDoacao(
                elementosDoacoes
            );

        }


        // ==============================================
        // CONFIGURAR EVENTOS
        // ==============================================

        configurarEventosDoacoes({

            estado:
                estadoDoacoes,

            elementos:
                elementosDoacoes,

            campos:
                camposDoacoes,

            carregarDoacoes,

            renderizarDoacoes,

            obterDoacoesFiltradas,

            prepararNovaDoacao,

            prepararEdicaoDoacao

        });

        configurarFiltrosAvancados();


        // ==============================================
        // CARREGAR BENEFICIÁRIOS
        // ==============================================

        if (
            estadoDoacoes
                .usuarioLogado
                ?.role === "ADMIN"
        ) {

            camposDoacoes
                .beneficiarioId
                .innerHTML = `

                    <option value="">
                        Selecione primeiro uma instituição
                    </option>

                `;


            camposDoacoes
                .beneficiarioId
                .disabled =
                    true;

        } else {

            await carregarBeneficiariosDoacao(
                camposDoacoes
            );

        }


        // ==============================================
        // CARREGAR DOAÇÕES
        // ==============================================

        await carregarDoacoes();

    } catch (erro) {

        console.error(
            "Erro ao inicializar Doações:",
            erro
        );


        mostrarErro(
            erro.message ||
            "Não foi possível inicializar a tela de Doações."
        );

    }

}