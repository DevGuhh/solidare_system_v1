// =====================================================
// IMPORTAÇÕES
// =====================================================

import {
    buscarCEP
} from "../utils/cep.js";

import {
    aplicarMascaraCPF,
    aplicarMascaraCEP,
    aplicarMascaraTelefone,
    formatarCPF,
    formatarCEP,
    formatarTelefone
} from "../utils/masks.js";

import {
    listarBeneficiarios,
    buscarBeneficiario,
    cadastrarBeneficiarioAPI,
    editarBeneficiarioAPI,
    alterarStatusBeneficiarioAPI
} from "../api/beneficiariosApi.js";

import {
    renderizarTabela
} from "./beneficiariosTabela.js";

import {
    abrirModal,
    fecharModal,
    limparFormulario,
    alterarTitulo
} from "./beneficiariosModal.js";

import {
    filtrarBeneficiarios
} from "./beneficiariosPesquisa.js";

import {
    mostrarSucesso,
    mostrarErro
} from "../utils/toast.js";

import {
    mostrarLoading,
    esconderLoading
} from "../utils/loading.js";

import {
    confirmarAcao
} from "../utils/confirm.js";

import {
    abrirHistoricoBeneficiario,
    fecharHistoricoBeneficiario,
    configurarHistoricoBeneficiario
} from "./beneficiariosHistorico.js";


// =====================================================
// CONFIGURAÇÕES
// =====================================================

//const API_URL = "http://localhost:3000";
import { API_URL } from "../config.js";


// =====================================================
// ESTADO DA TELA
// =====================================================

let usuarioLogado = null;

let beneficiarioEditandoId = null;

let listaBeneficiarios = [];

let filtroStatusAtual =
    "TODOS";

// IDs dos beneficiários selecionados.
let beneficiariosSelecionados =
    new Set();

// Página atualmente exibida.
let paginaAtual =
    1;

// Quantidade de registros exibidos por página.
let itensPorPagina =
    10;

// Campo atualmente utilizado na ordenação.
let campoOrdenacao =
    "nomeCompleto";

// Direção da ordenação:
// asc = crescente
// desc = decrescente
let direcaoOrdenacao =
    "asc";

// Temporizador utilizado para evitar que a pesquisa
// seja executada a cada tecla digitada.
let temporizadorPesquisa =
    null;

// Tempo de espera antes de executar a pesquisa.
const TEMPO_DEBOUNCE_PESQUISA =
    300;

let elementos = {};

let campos = {};

let controladorEventos = null;


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
// OBTER HEADERS
// =====================================================

function obterHeaders() {

    const token =
        obterToken();

    return {
        Authorization:
            `Bearer ${token || ""}`
    };

}


// =====================================================
// LER JSON COM SEGURANÇA
// =====================================================

async function lerRespostaJson(resposta) {

    const texto =
        await resposta.text();

    if (!texto) {
        return {};
    }

    try {

        return JSON.parse(texto);

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
// NORMALIZAR LISTA RECEBIDA DA API
// =====================================================

function normalizarListaBeneficiarios(dados) {

    if (Array.isArray(dados)) {
        return dados;
    }

    if (
        Array.isArray(
            dados?.beneficiarios
        )
    ) {
        return dados.beneficiarios;
    }

    if (
        Array.isArray(
            dados?.data
        )
    ) {
        return dados.data;
    }

    if (
        Array.isArray(
            dados?.data?.beneficiarios
        )
    ) {
        return dados.data.beneficiarios;
    }

    console.warn(
        "Formato inesperado da lista de beneficiários:",
        dados
    );

    return [];

}


// =====================================================
// VERIFICAR STATUS
// =====================================================

function beneficiarioEstaAtivo(
    beneficiario
) {

    return (
        beneficiario?.ativo === true ||
        beneficiario?.ativo === 1 ||
        beneficiario?.ativo === "true" ||
        beneficiario?.ativo === "1"
    );

}


// =====================================================
// ESCAPAR HTML
// =====================================================

function escaparHtml(valor) {

    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


// =====================================================
// CAPTURAR ELEMENTOS DA TELA
// =====================================================

function capturarElementosDaTela() {

    elementos = {

        tabela:
            document.getElementById(
                "tabelaBeneficiarios"
            ),

        modal:
            document.getElementById(
                "modalBeneficiario"
            ),

        formulario:
            document.getElementById(
                "formBeneficiario"
            ),

        tituloModal:
            document.getElementById(
                "tituloModalBeneficiario"
            ),

        grupoInstituicao:
            document.getElementById(
                "grupoInstituicao"
            ),

        selectInstituicao:
            document.getElementById(
                "instituicaoId"
            ),

        btnNovo:
            document.getElementById(
                "btnNovoBeneficiario"
            ),

        btnAtualizar:
            document.getElementById(
                "btnAtualizarBeneficiarios"
            ),

        btnFecharModal:
            document.getElementById(
                "btnFecharModal"
            ),

        btnCancelar:
            document.getElementById(
                "btnCancelarBeneficiario"
            ),

        pesquisa:
            document.getElementById(
                "pesquisaBeneficiario"
            ),

        btnLimparPesquisa:
            document.getElementById(
                "btnLimparPesquisaBeneficiario"
            ),

        filtrosStatus:
            document.querySelectorAll(
                "#conteudo [data-filtro-status]"
            ),

        contadorTodos:
            document.getElementById(
                "contadorTodosBeneficiarios"
            ),

        contadorAtivos:
            document.getElementById(
                "contadorAtivosBeneficiarios"
            ),

        contadorInativos:
            document.getElementById(
                "contadorInativosBeneficiarios"
            ),

        resultadoFiltro:
            document.getElementById(
                "resultadoFiltroBeneficiarios"
            ),

        quantidadePorPagina:
            document.getElementById(
                "quantidadePorPaginaBeneficiarios"
            ),

        intervaloPaginacao:
            document.getElementById(
                "intervaloPaginacaoBeneficiarios"
            ),

        numerosPaginacao:
            document.getElementById(
                "numerosPaginacaoBeneficiarios"
            ),

        btnPrimeiraPagina:
            document.getElementById(
                "btnPrimeiraPaginaBeneficiarios"
            ),

        btnPaginaAnterior:
            document.getElementById(
                "btnPaginaAnteriorBeneficiarios"
            ),

        btnProximaPagina:
            document.getElementById(
                "btnProximaPaginaBeneficiarios"
            ),

        btnUltimaPagina:
            document.getElementById(
                "btnUltimaPaginaBeneficiarios"
            ),
            
        botoesOrdenacao:
            document.querySelectorAll(
                "#conteudo [data-ordenar-por]"
            ),

        selecionarTodos:
            document.getElementById(
                "selecionarTodosBeneficiarios"
            ),

        barraSelecao:
            document.getElementById(
                "barraSelecaoBeneficiarios"
            ),

        quantidadeSelecionados:
            document.getElementById(
                "quantidadeSelecionadosBeneficiarios"
            ),

        btnLimparSelecao:
            document.getElementById(
                "btnLimparSelecaoBeneficiarios"
            ),

        btnAtivarSelecionados:
            document.getElementById(
                "btnAtivarSelecionadosBeneficiarios"
            ),

        btnInativarSelecionados:
            document.getElementById(
                "btnInativarSelecionadosBeneficiarios"
            )

    };


    campos = {

        nomeCompleto:
            document.getElementById(
                "nomeCompleto"
            ),

        cpf:
            document.getElementById(
                "cpf"
            ),

        dataNascimento:
            document.getElementById(
                "dataNascimento"
            ),

        cep:
            document.getElementById(
                "cep"
            ),

        logradouro:
            document.getElementById(
                "logradouro"
            ),

        numero:
            document.getElementById(
                "numero"
            ),

        complemento:
            document.getElementById(
                "complemento"
            ),

        regiao:
            document.getElementById(
                "regiao"
            ),

        cidade:
            document.getElementById(
                "cidade"
            ),

        uf:
            document.getElementById(
                "uf"
            ),

        telefonePrincipal:
            document.getElementById(
                "telefonePrincipal"
            ),

        telefoneSecundario:
            document.getElementById(
                "telefoneSecundario"
            ),

        email:
            document.getElementById(
                "email"
            ),

        composicaoFamiliar:
            document.getElementById(
                "composicaoFamiliar"
            ),

        tipoBeneficio:
            document.getElementById(
                "tipoBeneficio"
            ),

        situacaoSocioeconomica:
            document.getElementById(
                "situacaoSocioeconomica"
            ),

        observacoes:
            document.getElementById(
                "observacoes"
            )

    };

}


// =====================================================
// VALIDAR ELEMENTOS OBRIGATÓRIOS
// =====================================================

function validarElementosObrigatorios() {

    const elementosObrigatorios = [

        elementos.tabela,
        elementos.modal,
        elementos.formulario,
        elementos.tituloModal,
        elementos.grupoInstituicao,
        elementos.selectInstituicao,
        elementos.btnNovo,
        elementos.btnAtualizar,
        elementos.btnFecharModal,
        elementos.btnCancelar,
        elementos.pesquisa,
        elementos.btnLimparPesquisa,
        elementos.contadorTodos,
        elementos.contadorAtivos,
        elementos.contadorInativos,
        elementos.resultadoFiltro,
        elementos.quantidadePorPagina,
        elementos.intervaloPaginacao,
        elementos.numerosPaginacao,
        elementos.btnPrimeiraPagina,
        elementos.btnPaginaAnterior,
        elementos.btnProximaPagina,
        elementos.btnUltimaPagina,

        // ===========================
        // NOVOS ELEMENTOS
        // ===========================

        elementos.selecionarTodos,
        elementos.barraSelecao,
        elementos.quantidadeSelecionados,
        elementos.btnLimparSelecao,
        elementos.btnAtivarSelecionados,
        elementos.btnInativarSelecionados,

        // ===========================
        // CAMPOS DO FORMULÁRIO
        // ===========================

        campos.nomeCompleto,
        campos.cpf,
        campos.dataNascimento,
        campos.cep,
        campos.logradouro,
        campos.numero,
        campos.complemento,
        campos.regiao,
        campos.cidade,
        campos.uf,
        campos.telefonePrincipal,
        campos.telefoneSecundario,
        campos.email,
        campos.tipoBeneficio,
        campos.situacaoSocioeconomica,
        campos.observacoes

    ];

    const ausentes =
        elementosObrigatorios.filter(
            (elemento) => !elemento
        );

    if (ausentes.length > 0) {

        throw new Error(
            "A página de Beneficiários não possui todos os elementos HTML necessários."
        );

    }

}


// =====================================================
// CARREGAR USUÁRIO AUTENTICADO
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
                headers:
                    obterHeaders(),
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

    usuarioLogado =
        dados.usuario ||
        dados.data?.usuario ||
        null;

    if (!usuarioLogado) {

        throw new Error(
            "O servidor não retornou os dados do usuário."
        );

    }

    return usuarioLogado;

}


// =====================================================
// ATUALIZAR CONTADORES
// =====================================================

function atualizarContadoresFiltros() {

    const total =
        listaBeneficiarios.length;

    const totalAtivos =
        listaBeneficiarios.filter(
            beneficiarioEstaAtivo
        ).length;

    const totalInativos =
        total - totalAtivos;


    elementos.contadorTodos.textContent =
        String(total);

    elementos.contadorAtivos.textContent =
        String(totalAtivos);

    elementos.contadorInativos.textContent =
        String(totalInativos);

}


// =====================================================
// ATUALIZAR FILTRO VISUAL
// =====================================================

function atualizarBotoesFiltro() {

    elementos.filtrosStatus.forEach(
        (botao) => {

            const status =
                botao.dataset.filtroStatus;

            const selecionado =
                status ===
                filtroStatusAtual;

            botao.classList.toggle(
                "ativo",
                selecionado
            );

            botao.setAttribute(
                "aria-pressed",
                String(selecionado)
            );

        }
    );

}


// =====================================================
// ATUALIZAR BOTÃO DE LIMPAR
// =====================================================

function atualizarBotaoLimparPesquisa() {

    const possuiPesquisa =
        elementos.pesquisa.value
            .trim()
            .length > 0;

    elementos.btnLimparPesquisa.hidden =
        !possuiPesquisa;

}


// =====================================================
// ATUALIZAR RESULTADO
// =====================================================

function atualizarTextoResultado(
    quantidade
) {

    const texto =
        quantidade === 1
            ? "beneficiário"
            : "beneficiários";

    elementos.resultadoFiltro.textContent =
        `Exibindo ${quantidade} ${texto}`;

}

// =====================================================
// CALCULAR TOTAL DE PÁGINAS
// =====================================================

function calcularTotalPaginas(
    quantidadeRegistros
) {

    return Math.max(
        1,
        Math.ceil(
            quantidadeRegistros /
            itensPorPagina
        )
    );

}


// =====================================================
// GERAR BOTÕES NUMÉRICOS
// =====================================================

function renderizarNumerosPaginacao(
    totalPaginas
) {

    elementos.numerosPaginacao.innerHTML =
        "";

    /*
     * Exibe no máximo cinco números.
     *
     * Exemplo:
     * 1 2 3 4 5
     * 3 4 5 6 7
     */
    let inicio =
        Math.max(
            1,
            paginaAtual - 2
        );

    let fim =
        Math.min(
            totalPaginas,
            inicio + 4
        );

    inicio =
        Math.max(
            1,
            fim - 4
        );


    for (
        let numero = inicio;
        numero <= fim;
        numero++
    ) {

        const botao =
            document.createElement(
                "button"
            );

        botao.type =
            "button";

        botao.className =
            "paginacao-numero";

        botao.textContent =
            String(numero);

        botao.dataset.pagina =
            String(numero);

        botao.setAttribute(
            "aria-label",
            `Ir para a página ${numero}`
        );


        if (numero === paginaAtual) {

            botao.classList.add(
                "ativo"
            );

            botao.setAttribute(
                "aria-current",
                "page"
            );

        }


        elementos.numerosPaginacao
            .appendChild(botao);

    }

}


// =====================================================
// ATUALIZAR CONTROLES DA PAGINAÇÃO
// =====================================================

function atualizarPaginacao(
    quantidadeRegistros
) {

    const totalPaginas =
        calcularTotalPaginas(
            quantidadeRegistros
        );

    /*
     * Se a página atual deixar de existir
     * depois de excluir ou filtrar registros,
     * voltamos para a última página disponível.
     */
    if (paginaAtual > totalPaginas) {

        paginaAtual =
            totalPaginas;

    }


    const inicio =
        quantidadeRegistros === 0
            ? 0
            : (
                (paginaAtual - 1) *
                itensPorPagina
            ) + 1;

    const fim =
        quantidadeRegistros === 0
            ? 0
            : Math.min(
                paginaAtual *
                itensPorPagina,
                quantidadeRegistros
            );


    elementos.intervaloPaginacao.textContent =
        `${inicio}–${fim} de ${quantidadeRegistros}`;


    elementos.btnPrimeiraPagina.disabled =
        paginaAtual <= 1;

    elementos.btnPaginaAnterior.disabled =
        paginaAtual <= 1;

    elementos.btnProximaPagina.disabled =
        paginaAtual >= totalPaginas;

    elementos.btnUltimaPagina.disabled =
        paginaAtual >= totalPaginas;


    renderizarNumerosPaginacao(
        totalPaginas
    );

}


// =====================================================
// OBTER REGISTROS DA PÁGINA ATUAL
// =====================================================

function paginarBeneficiarios(
    lista
) {

    const indiceInicial =
        (paginaAtual - 1) *
        itensPorPagina;

    const indiceFinal =
        indiceInicial +
        itensPorPagina;

    return lista.slice(
        indiceInicial,
        indiceFinal
    );

}


// =====================================================
// TROCAR DE PÁGINA
// =====================================================

function irParaPagina(
    novaPagina
) {

    const resultadoFiltrado =
        obterBeneficiariosFiltrados();

    const totalPaginas =
        calcularTotalPaginas(
            resultadoFiltrado.length
        );

    const paginaValidada =
        Math.min(
            Math.max(
                Number(novaPagina) || 1,
                1
            ),
            totalPaginas
        );


    if (
        paginaValidada ===
        paginaAtual
    ) {
        return;
    }

    paginaAtual =
        paginaValidada;

    aplicarFiltrosBeneficiarios();

}


// =====================================================
// ALTERAR QUANTIDADE POR PÁGINA
// =====================================================

function alterarQuantidadePorPagina() {

    itensPorPagina =
        Number(
            elementos
                .quantidadePorPagina
                .value
        ) || 10;

    paginaAtual =
        1;

    aplicarFiltrosBeneficiarios();

}


// =====================================================
// TRATAR CLIQUE NOS NÚMEROS
// =====================================================

function tratarCliqueNumeroPaginacao(
    event
) {

    const botao =
        event.target.closest(
            "[data-pagina]"
        );

    if (!botao) {
        return;
    }

    irParaPagina(
        botao.dataset.pagina
    );

}

// =====================================================
// NORMALIZAR VALOR PARA ORDENAÇÃO
// =====================================================

function normalizarValorOrdenacao(
    valor
) {

    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

}


// =====================================================
// OBTER VALOR DA COLUNA
// =====================================================

function obterValorOrdenacao(
    beneficiario,
    campo
) {

    switch (campo) {

        case "id":

            return Number(
                beneficiario?.id
            ) || 0;


        case "instituicao":

            return normalizarValorOrdenacao(
                beneficiario
                    ?.instituicao
                    ?.nome
            );


        case "ativo":

            /*
             * Ativos recebem 1.
             * Inativos recebem 0.
             */
            return beneficiarioEstaAtivo(
                beneficiario
            )
                ? 1
                : 0;


        case "nomeCompleto":

        case "cpf":

        case "telefonePrincipal":

        case "tipoBeneficio":

            return normalizarValorOrdenacao(
                beneficiario?.[campo]
            );


        default:

            return normalizarValorOrdenacao(
                beneficiario?.[campo]
            );

    }

}


// =====================================================
// ORDENAR BENEFICIÁRIOS
// =====================================================

function ordenarBeneficiarios(
    lista
) {

    const listaOrdenada =
        [...lista];

    listaOrdenada.sort(
        (beneficiarioA, beneficiarioB) => {

            const valorA =
                obterValorOrdenacao(
                    beneficiarioA,
                    campoOrdenacao
                );

            const valorB =
                obterValorOrdenacao(
                    beneficiarioB,
                    campoOrdenacao
                );


            let comparacao =
                0;


            if (
                typeof valorA === "number" &&
                typeof valorB === "number"
            ) {

                comparacao =
                    valorA - valorB;

            } else {

                comparacao =
                    String(valorA)
                        .localeCompare(
                            String(valorB),
                            "pt-BR",
                            {
                                numeric: true,
                                sensitivity: "base"
                            }
                        );

            }


            return direcaoOrdenacao ===
                "asc"
                    ? comparacao
                    : comparacao * -1;

        }
    );

    return listaOrdenada;

}


// =====================================================
// ATUALIZAR CABEÇALHO DA ORDENAÇÃO
// =====================================================

function atualizarBotoesOrdenacao() {

    elementos.botoesOrdenacao.forEach(
        (botao) => {

            const campo =
                botao.dataset.ordenarPor;

            const estaAtivo =
                campo ===
                campoOrdenacao;


            botao.classList.toggle(
                "ordenacao-ativa",
                estaAtivo
            );


            botao.removeAttribute(
                "data-direcao"
            );


            const icone =
                botao.querySelector("i");


            if (!icone) {
                return;
            }


            icone.classList.remove(
                "fa-sort",
                "fa-sort-up",
                "fa-sort-down"
            );


            if (!estaAtivo) {

                icone.classList.add(
                    "fa-sort"
                );

                botao.removeAttribute(
                    "aria-sort"
                );

                return;

            }


            botao.dataset.direcao =
                direcaoOrdenacao;


            if (
                direcaoOrdenacao ===
                "asc"
            ) {

                icone.classList.add(
                    "fa-sort-up"
                );

                botao.setAttribute(
                    "aria-sort",
                    "ascending"
                );

            } else {

                icone.classList.add(
                    "fa-sort-down"
                );

                botao.setAttribute(
                    "aria-sort",
                    "descending"
                );

            }

        }
    );

}


// =====================================================
// SELECIONAR ORDENAÇÃO
// =====================================================

function selecionarOrdenacao(event) {

    const botao =
        event.currentTarget;

    const novoCampo =
        botao.dataset.ordenarPor;


    if (!novoCampo) {
        return;
    }


    /*
     * Ao clicar novamente na mesma coluna,
     * alternamos entre crescente e decrescente.
     */
    if (
        novoCampo ===
        campoOrdenacao
    ) {

        direcaoOrdenacao =
            direcaoOrdenacao === "asc"
                ? "desc"
                : "asc";

    } else {

        campoOrdenacao =
            novoCampo;

        direcaoOrdenacao =
            "asc";

    }


    paginaAtual =
        1;


    atualizarBotoesOrdenacao();

    aplicarFiltrosBeneficiarios();

}

// =====================================================
// OBTER BENEFICIÁRIOS FILTRADOS E ORDENADOS
// =====================================================

function obterBeneficiariosFiltrados() {

    const listaFiltrada =
        filtrarBeneficiarios(
            listaBeneficiarios,
            elementos.pesquisa.value,
            filtroStatusAtual
        );

    return ordenarBeneficiarios(
        listaFiltrada
    );

}

// =====================================================
// OBTER CHECKBOXES VISÍVEIS
// =====================================================

function obterCheckboxesVisiveis() {

    return Array.from(
        elementos.tabela.querySelectorAll(
            ".checkboxBeneficiario"
        )
    );

}


// =====================================================
// ATUALIZAR BARRA DE SELEÇÃO
// =====================================================

function atualizarBarraSelecao() {

    const quantidade =
        beneficiariosSelecionados.size;

    elementos.barraSelecao.hidden =
        quantidade === 0;

    const texto =
        quantidade === 1
            ? "beneficiário selecionado"
            : "beneficiários selecionados";

    elementos.quantidadeSelecionados.textContent =
        `${quantidade} ${texto}`;


    const possuiSelecionados =
        quantidade > 0;

    elementos.btnAtivarSelecionados.disabled =
        !possuiSelecionados;

    elementos.btnInativarSelecionados.disabled =
        !possuiSelecionados;

}


// =====================================================
// ATUALIZAR CHECKBOX PRINCIPAL
// =====================================================

function atualizarCheckboxSelecionarTodos() {

    const checkboxes =
        obterCheckboxesVisiveis();

    if (checkboxes.length === 0) {

        elementos.selecionarTodos.checked =
            false;

        elementos.selecionarTodos.indeterminate =
            false;

        return;

    }

    const quantidadeMarcados =
        checkboxes.filter(
            (checkbox) => checkbox.checked
        ).length;

    elementos.selecionarTodos.checked =
        quantidadeMarcados ===
        checkboxes.length;

    elementos.selecionarTodos.indeterminate =
        quantidadeMarcados > 0 &&
        quantidadeMarcados <
        checkboxes.length;

}


// =====================================================
// ALTERAR SELEÇÃO DE UMA LINHA
// =====================================================

function alterarSelecaoBeneficiario(
    checkbox
) {

    const id =
        Number(
            checkbox.dataset.id
        );

    if (!id) {
        return;
    }

    if (checkbox.checked) {

        beneficiariosSelecionados.add(
            id
        );

    } else {

        beneficiariosSelecionados.delete(
            id
        );

    }

    atualizarCheckboxSelecionarTodos();

    atualizarBarraSelecao();

}


// =====================================================
// SELECIONAR TODOS OS VISÍVEIS
// =====================================================

function selecionarTodosVisiveis() {

    const checkboxes =
        obterCheckboxesVisiveis();

    const deveSelecionar =
        elementos.selecionarTodos.checked;

    checkboxes.forEach(
        (checkbox) => {

            const id =
                Number(
                    checkbox.dataset.id
                );

            checkbox.checked =
                deveSelecionar;

            if (deveSelecionar) {

                beneficiariosSelecionados.add(
                    id
                );

            } else {

                beneficiariosSelecionados.delete(
                    id
                );

            }

        }
    );

    elementos.selecionarTodos.indeterminate =
        false;

    atualizarBarraSelecao();

}


// =====================================================
// LIMPAR SELEÇÃO
// =====================================================

function limparSelecaoBeneficiarios() {

    beneficiariosSelecionados.clear();

    obterCheckboxesVisiveis().forEach(
        (checkbox) => {

            checkbox.checked =
                false;

        }
    );

    elementos.selecionarTodos.checked =
        false;

    elementos.selecionarTodos.indeterminate =
        false;

    atualizarBarraSelecao();

    aplicarFiltrosBeneficiarios();

}

// =====================================================
// ALTERAR STATUS DOS SELECIONADOS
// =====================================================

async function alterarStatusSelecionados(
    ativo
) {

    if (
        beneficiariosSelecionados.size === 0
    ) {
        return;
    }

    const confirmou =
        await confirmarAcao(

            ativo
                ? "Deseja ativar todos os beneficiários selecionados?"
                : "Deseja inativar todos os beneficiários selecionados?"

        );

    if (!confirmou) {
        return;
    }

    mostrarLoading();

    try {

        for (const id of beneficiariosSelecionados) {

            const resposta =
                await alterarStatusBeneficiarioAPI(
                    id,
                    ativo
                );

            if (!resposta.ok) {

                const erro =
                    await lerRespostaJson(
                        resposta
                    );

                throw new Error(
                    erro.error ||
                    erro.mensagem ||
                    "Erro ao alterar o status."
                );

            }

        }

        mostrarSucesso(

            ativo
                ? "Beneficiários ativados com sucesso!"
                : "Beneficiários inativados com sucesso!"

        );

        beneficiariosSelecionados.clear();

        await carregarBeneficiarios();

    } catch (erro) {

        console.error(erro);

        mostrarErro(
            erro.message
        );

    } finally {

        esconderLoading();

    }

}

// =====================================================
// APLICAR PESQUISA, FILTRO E PAGINAÇÃO
// =====================================================

function aplicarFiltrosBeneficiarios() {

    const resultadoFiltrado =
        obterBeneficiariosFiltrados();

    const totalPaginas =
        calcularTotalPaginas(
            resultadoFiltrado.length
        );

    if (paginaAtual > totalPaginas) {

        paginaAtual =
            totalPaginas;

    }

    const resultadoPaginado =
        paginarBeneficiarios(
            resultadoFiltrado
        );


    renderizarTabela(
        elementos.tabela,
        resultadoPaginado,
        beneficiariosSelecionados
    );

    atualizarTextoResultado(
        resultadoFiltrado.length
    );

    atualizarBotaoLimparPesquisa();

    atualizarPaginacao(
        resultadoFiltrado.length
    );

    atualizarCheckboxSelecionarTodos();

    atualizarBarraSelecao();

}


// =====================================================
// CARREGAR BENEFICIÁRIOS
// =====================================================

async function carregarBeneficiarios() {

    mostrarLoading();

    try {

        const resposta =
            await listarBeneficiarios();

        const dados =
            await lerRespostaJson(
                resposta
            );

        if (!resposta.ok) {

            throw new Error(
                dados.error ||
                dados.erro ||
                dados.mensagem ||
                "Erro ao carregar beneficiários."
            );

        }

        listaBeneficiarios =
            normalizarListaBeneficiarios(
                dados
            );

        atualizarContadoresFiltros();

        atualizarBotoesFiltro();

        aplicarFiltrosBeneficiarios();

    } catch (erro) {

        console.error(
            "Erro ao carregar beneficiários:",
            erro
        );

        listaBeneficiarios = [];

        atualizarContadoresFiltros();

        aplicarFiltrosBeneficiarios();

        mostrarErro(
            erro.message ||
            "Não foi possível carregar os beneficiários."
        );

    } finally {

        esconderLoading();

    }

}


// =====================================================
// CARREGAR INSTITUIÇÕES NO SELECT
// =====================================================

async function carregarInstituicoesSelect() {

    try {

        const resposta =
            await fetch(
                `${API_URL}/instituicoes`,
                {
                    method: "GET",
                    headers:
                        obterHeaders(),
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
                "Erro ao carregar instituições."
            );

        }

        const instituicoes =
            Array.isArray(dados)
                ? dados
                : Array.isArray(dados?.dados)
                    ? dados.dados
                    : Array.isArray(dados?.instituicoes)
                        ? dados.instituicoes
                        : Array.isArray(dados?.data)
                            ? dados.data
                            : Array.isArray(dados?.data?.instituicoes)
                                ? dados.data.instituicoes
                                : [];

        elementos.selectInstituicao.innerHTML = `
            <option value="">
                Selecione uma instituição
            </option>
        `;

        instituicoes.forEach(
            (instituicao) => {

                elementos
                    .selectInstituicao
                    .insertAdjacentHTML(
                        "beforeend",
                        `
                            <option value="${Number(instituicao.id)}">
                                ${escaparHtml(instituicao.nome)}
                            </option>
                        `
                    );

            }
        );

        return true;

    } catch (erro) {

        console.error(
            "Erro ao carregar instituições:",
            erro
        );

        mostrarErro(
            erro.message ||
            "Não foi possível carregar as instituições."
        );

        return false;

    }

}


// =====================================================
// PREPARAR MODAL PARA CADASTRO
// =====================================================

async function abrirModalNovoBeneficiario() {

    beneficiarioEditandoId =
        null;

    alterarTitulo(
        elementos.tituloModal,
        "Novo beneficiário"
    );

    limparFormulario(
        elementos.formulario
    );

    if (
        usuarioLogado.role ===
        "ADMIN"
    ) {

        elementos.grupoInstituicao
            .style.display =
                "flex";

        elementos.selectInstituicao
            .required =
                true;

        const carregou =
            await carregarInstituicoesSelect();

        if (!carregou) {
            return;
        }

    } else {

        elementos.grupoInstituicao
            .style.display =
                "none";

        elementos.selectInstituicao
            .required =
                false;

    }

    abrirModal(
        elementos.modal
    );

    elementos.modal.setAttribute(
        "aria-hidden",
        "false"
    );

    setTimeout(
        () => {

            campos.nomeCompleto.focus();

        },
        50
    );

}


// =====================================================
// FECHAR MODAL
// =====================================================

function fecharModalBeneficiario() {

    fecharModal(
        elementos.modal
    );

    elementos.modal.setAttribute(
        "aria-hidden",
        "true"
    );

    limparFormulario(
        elementos.formulario
    );

    beneficiarioEditandoId =
        null;

}


// =====================================================
// MONTAR DADOS DO FORMULÁRIO
// =====================================================

function montarDadosFormulario() {

    const dados = {

        nomeCompleto:
            campos.nomeCompleto.value
                .trim(),

        cpf:
            campos.cpf.value
                .replace(/\D/g, ""),

        dataNascimento:
            campos.dataNascimento.value,

        logradouro:
            campos.logradouro.value
                .trim(),

        numero:
            campos.numero.value
                .trim(),

        complemento:
            campos.complemento.value
                .trim(),

        cep:
            campos.cep.value
                .replace(/\D/g, ""),

        regiao:
            campos.regiao.value
                .trim(),

        cidade:
            campos.cidade.value
                .trim(),

        uf:
            campos.uf.value
                .trim()
                .toUpperCase(),

        telefonePrincipal:
            campos.telefonePrincipal.value
                .replace(/\D/g, ""),

        telefoneSecundario:
            campos.telefoneSecundario.value
                .replace(/\D/g, ""),

        email:
            campos.email.value
                .trim(),

        composicaoFamiliar:
            Number(
                campos.composicaoFamiliar?.value
            ),

        tipoBeneficio:
            campos.tipoBeneficio.value,

        situacaoSocioeconomica:
            campos.situacaoSocioeconomica.value
                .trim(),

        observacoes:
            campos.observacoes.value
                .trim()

    };

    if (
        !Number.isInteger(
            dados.composicaoFamiliar
        ) ||
        dados.composicaoFamiliar < 1 ||
        dados.composicaoFamiliar > 50
    ) {

        throw new Error(
            "Informe uma composição familiar válida entre 1 e 50 pessoas."
        );

    }

    if (
        usuarioLogado.role ===
        "ADMIN"
    ) {

        const instituicaoId =
            Number(
                elementos.selectInstituicao.value
            );

        if (!instituicaoId) {

            throw new Error(
                "Selecione uma instituição."
            );

        }

        dados.instituicaoId =
            instituicaoId;

    }

    return dados;

}


// =====================================================
// SALVAR BENEFICIÁRIO
// =====================================================

async function salvarBeneficiario(event) {

    event.preventDefault();

    let dados;

    try {

        dados =
            montarDadosFormulario();

    } catch (erro) {

        mostrarErro(
            erro.message
        );

        return;

    }

    mostrarLoading();

    try {

        const editando =
            beneficiarioEditandoId !==
            null;

        const resposta =
            editando
                ? await editarBeneficiarioAPI(
                    beneficiarioEditandoId,
                    dados
                )
                : await cadastrarBeneficiarioAPI(
                    dados
                );

        const resultado =
            await lerRespostaJson(
                resposta
            );

        if (!resposta.ok) {

            throw new Error(
                resultado.issues?.[0]?.message ||
                resultado.error ||
                resultado.erro ||
                resultado.mensagem ||
                "Erro ao salvar beneficiário."
            );

        }

        mostrarSucesso(
            editando
                ? "Beneficiário atualizado com sucesso!"
                : "Beneficiário cadastrado com sucesso!"
        );

        fecharModalBeneficiario();

        await carregarBeneficiarios();

    } catch (erro) {

        console.error(
            "Erro ao salvar beneficiário:",
            erro
        );

        mostrarErro(
            erro.message ||
            "Não foi possível salvar o beneficiário."
        );

    } finally {

        esconderLoading();

    }

}


// =====================================================
// PREENCHER FORMULÁRIO PARA EDIÇÃO
// =====================================================

async function editarBeneficiario(id) {

    mostrarLoading();

    try {

        const resposta =
            await buscarBeneficiario(id);

        const beneficiario =
            await lerRespostaJson(
                resposta
            );

        if (!resposta.ok) {

            throw new Error(
                beneficiario.error ||
                beneficiario.erro ||
                beneficiario.mensagem ||
                "Erro ao buscar beneficiário."
            );

        }

        beneficiarioEditandoId =
            Number(id);

        alterarTitulo(
            elementos.tituloModal,
            "Editar beneficiário"
        );


        campos.nomeCompleto.value =
            beneficiario.nomeCompleto ?? "";

        campos.cpf.value =
            formatarCPF(beneficiario.cpf ?? "");

        campos.dataNascimento.value =
            beneficiario.dataNascimento
                ? beneficiario.dataNascimento
                    .substring(0, 10)
                : "";

        campos.cep.value =
            formatarCEP(beneficiario.cep ?? "");

        campos.logradouro.value =
            beneficiario.logradouro ?? "";

        campos.numero.value =
            beneficiario.numero ?? "";

        campos.complemento.value =
            beneficiario.complemento ?? "";

        campos.regiao.value =
            beneficiario.regiao ?? "";

        campos.cidade.value =
            beneficiario.cidade ?? "";

        campos.uf.value =
            beneficiario.uf ?? "";

        campos.telefonePrincipal.value =
            formatarTelefone(beneficiario.telefonePrincipal ?? "");

        campos.telefoneSecundario.value =
            formatarTelefone(beneficiario.telefoneSecundario ?? "");

        campos.email.value =
            beneficiario.email ?? "";

        if (campos.composicaoFamiliar) {

            campos.composicaoFamiliar.value =
                String(
                    beneficiario.composicaoFamiliar ??
                    1
                );

        }

        campos.tipoBeneficio.value =
            beneficiario.tipoBeneficio ??
            "CESTA";

        campos.situacaoSocioeconomica.value =
            beneficiario.situacaoSocioeconomica ??
            "";

        campos.observacoes.value =
            beneficiario.observacoes ?? "";


        if (
            usuarioLogado.role ===
            "ADMIN"
        ) {

            elementos.grupoInstituicao
                .style.display =
                    "flex";

            elementos.selectInstituicao
                .required =
                    true;

            const carregou =
                await carregarInstituicoesSelect();

            if (!carregou) {
                return;
            }

            elementos.selectInstituicao.value =
                String(
                    beneficiario.instituicaoId ??
                    ""
                );

        } else {

            elementos.grupoInstituicao
                .style.display =
                    "none";

            elementos.selectInstituicao
                .required =
                    false;

        }

        abrirModal(
            elementos.modal
        );

        elementos.modal.setAttribute(
            "aria-hidden",
            "false"
        );

    } catch (erro) {

        console.error(
            "Erro ao editar beneficiário:",
            erro
        );

        mostrarErro(
            erro.message ||
            "Não foi possível carregar o beneficiário."
        );

    } finally {

        esconderLoading();

    }

}


// =====================================================
// ALTERAR STATUS
// =====================================================

async function alterarStatusBeneficiario(
    botao
) {

    const id =
        Number(
            botao.dataset.id
        );

    const ativoAtual =
        botao.dataset.ativo ===
        "true";

    const novoStatus =
        !ativoAtual;

    mostrarLoading();

    try {

        const resposta =
            await alterarStatusBeneficiarioAPI(
                id,
                novoStatus
            );

        const resultado =
            await lerRespostaJson(
                resposta
            );

        if (!resposta.ok) {

            throw new Error(
                resultado.error ||
                resultado.erro ||
                resultado.mensagem ||
                "Erro ao atualizar status."
            );

        }

        mostrarSucesso(
            novoStatus
                ? "Beneficiário ativado com sucesso!"
                : "Beneficiário inativado com sucesso!"
        );

        beneficiariosSelecionados.clear();

        await carregarBeneficiarios();

    } catch (erro) {

        console.error(
            "Erro ao alterar status:",
            erro
        );

        mostrarErro(
            erro.message ||
            "Não foi possível atualizar o status."
        );

    } finally {

        esconderLoading();

    }

}


// =====================================================
// CONSULTAR CEP
// =====================================================

async function preencherEnderecoPorCEP() {

    const cep =
        campos.cep.value
            .replace(/\D/g, "");

    if (!cep) {
        return;
    }

    if (cep.length !== 8) {

        mostrarErro(
            "Informe um CEP válido com 8 números."
        );

        return;

    }

    try {

        const endereco =
            await buscarCEP(
                cep
            );

        if (!endereco) {
            return;
        }

        campos.logradouro.value =
            endereco.logradouro ?? "";

        campos.cidade.value =
            endereco.localidade ?? "";

        campos.uf.value =
            endereco.uf ?? "";

        if (
            endereco.bairro &&
            !campos.regiao.value
        ) {

            campos.regiao.value =
                endereco.bairro;

        }

        campos.numero.focus();

    } catch (erro) {

        mostrarErro(
            erro.message ||
            "Não foi possível consultar o CEP."
        );

    }

}

// =====================================================
// CANCELAR PESQUISA PENDENTE
// =====================================================

function cancelarPesquisaPendente() {

    if (!temporizadorPesquisa) {
        return;
    }

    clearTimeout(
        temporizadorPesquisa
    );

    temporizadorPesquisa =
        null;

}


// =====================================================
// PESQUISAR BENEFICIÁRIO COM DEBOUNCE
// =====================================================

function pesquisarBeneficiario() {

    cancelarPesquisaPendente();

    atualizarBotaoLimparPesquisa();

    temporizadorPesquisa =
        setTimeout(
            () => {

                paginaAtual =
                    1;

                aplicarFiltrosBeneficiarios();

                temporizadorPesquisa =
                    null;

            },
            TEMPO_DEBOUNCE_PESQUISA
        );

}


// =====================================================
// LIMPAR PESQUISA
// =====================================================

function limparPesquisaBeneficiario() {

    cancelarPesquisaPendente();

    elementos.pesquisa.value =
        "";

    paginaAtual =
        1;

    elementos.pesquisa.focus();

    aplicarFiltrosBeneficiarios();

}


// =====================================================
// SELECIONAR FILTRO
// =====================================================

function selecionarFiltroStatus(event) {

    const novoStatus =
        event.currentTarget
            .dataset
            .filtroStatus;

    if (
        ![
            "TODOS",
            "ATIVOS",
            "INATIVOS"
        ].includes(novoStatus)
    ) {
        return;
    }

    filtroStatusAtual =
        novoStatus;

    paginaAtual =
        1;

    atualizarBotoesFiltro();

    aplicarFiltrosBeneficiarios();

}


// =====================================================
// TRATAR CLIQUES DA TABELA
// =====================================================

function tratarCliqueDaTabela(event) {

    const checkboxBeneficiario =
        event.target.closest(
            ".checkboxBeneficiario"
        );

    if (checkboxBeneficiario) {

        alterarSelecaoBeneficiario(
            checkboxBeneficiario
        );

        return;

    }
    
    const botaoHistorico =
        event.target.closest(
            ".btnHistoricoBeneficiario"
        );

    if (botaoHistorico) {

        abrirHistoricoBeneficiario(
            botaoHistorico.dataset.id,
            botaoHistorico.dataset.nome || ""
        );

        return;

    }

    const botaoEditar =
        event.target.closest(
            ".btnEditar"
        );

    if (botaoEditar) {

        editarBeneficiario(
            botaoEditar.dataset.id
        );

        return;

    }



    const botaoStatus =
        event.target.closest(
            ".btnStatusBeneficiario"
        );

    if (botaoStatus) {

        alterarStatusBeneficiario(
            botaoStatus
        );

    }

}


// =====================================================
// FECHAR MODAL AO CLICAR NO FUNDO
// =====================================================
/*
function tratarCliqueForaModal(event) {

    if (
        event.target ===
        elementos.modal
    ) {

        fecharModalBeneficiario();

    }

}
*/

// =====================================================
// FECHAR COM ESC
// =====================================================

function tratarTeclaEscape(event) {

    if (event.key !== "Escape") {
        return;
    }

    fecharHistoricoBeneficiario();

    if (elementos.modal) {
        fecharModalBeneficiario();
    }

}


// =====================================================
// CONFIGURAR EVENTOS
// =====================================================

function configurarEventos() {

    if (controladorEventos) {

        controladorEventos.abort();

    }

    controladorEventos =
        new AbortController();

    const opcoes = {
        signal:
            controladorEventos.signal
    };


    elementos.btnAtualizar.addEventListener(
        "click",
        carregarBeneficiarios,
        opcoes
    );


    elementos.btnNovo.addEventListener(
        "click",
        abrirModalNovoBeneficiario,
        opcoes
    );


    elementos.btnFecharModal.addEventListener(
        "click",
        fecharModalBeneficiario,
        opcoes
    );


    elementos.btnCancelar.addEventListener(
        "click",
        fecharModalBeneficiario,
        opcoes
    );


    elementos.formulario.addEventListener(
        "submit",
        salvarBeneficiario,
        opcoes
    );


    campos.cep.addEventListener(
        "blur",
        preencherEnderecoPorCEP,
        opcoes
    );


    elementos.pesquisa.addEventListener(
        "input",
        pesquisarBeneficiario,
        opcoes
    );

    elementos.pesquisa.addEventListener(
        "keydown",
        (event) => {

            if (event.key !== "Enter") {
                return;
            }

            event.preventDefault();

            cancelarPesquisaPendente();

            paginaAtual =
                1;

            aplicarFiltrosBeneficiarios();

        },
        opcoes
    );


    elementos.btnLimparPesquisa.addEventListener(
        "click",
        limparPesquisaBeneficiario,
        opcoes
    );


    elementos.filtrosStatus.forEach(
        (botao) => {

            botao.addEventListener(
                "click",
                selecionarFiltroStatus,
                opcoes
            );

        }
    );

    elementos.quantidadePorPagina.addEventListener(
        "change",
        alterarQuantidadePorPagina,
        opcoes
    );


    elementos.btnPrimeiraPagina.addEventListener(
        "click",
        () => {

            irParaPagina(1);

        },
        opcoes
    );


    elementos.btnPaginaAnterior.addEventListener(
        "click",
        () => {

            irParaPagina(
                paginaAtual - 1
            );

        },
        opcoes
    );


    elementos.btnProximaPagina.addEventListener(
        "click",
        () => {

            irParaPagina(
                paginaAtual + 1
            );

        },
        opcoes
    );


    elementos.btnUltimaPagina.addEventListener(
        "click",
        () => {

            const resultadoFiltrado =
                obterBeneficiariosFiltrados();

            irParaPagina(
                calcularTotalPaginas(
                    resultadoFiltrado.length
                )
            );

        },
        opcoes
    );


    elementos.numerosPaginacao.addEventListener(
        "click",
        tratarCliqueNumeroPaginacao,
        opcoes
    );


    elementos.tabela.addEventListener(
        "click",
        tratarCliqueDaTabela,
        opcoes
    );

/*
    elementos.modal.addEventListener(
        "click",
        tratarCliqueForaModal,
        opcoes
    );
*/

    document.addEventListener(
        "keydown",
        tratarTeclaEscape,
        opcoes
    );

    elementos.botoesOrdenacao.forEach(
        (botao) => {

            botao.addEventListener(
                "click",
                selecionarOrdenacao,
                opcoes
            );

        }
    );

    elementos.selecionarTodos.addEventListener(
        "change",
        selecionarTodosVisiveis,
        opcoes
    );


    elementos.btnLimparSelecao.addEventListener(
        "click",
        limparSelecaoBeneficiarios,
        opcoes
    );

    elementos.btnAtivarSelecionados.addEventListener(
        "click",
        () => alterarStatusSelecionados(true),
        opcoes
    );

    elementos.btnInativarSelecionados.addEventListener(
        "click",
        () => alterarStatusSelecionados(false),
        opcoes
    );


}


// =====================================================
// CONFIGURAR MÁSCARAS
// =====================================================

function configurarMascaras() {

    aplicarMascaraCPF(
        campos.cpf
    );

    aplicarMascaraCEP(
        campos.cep
    );

    aplicarMascaraTelefone(
        campos.telefonePrincipal
    );

    aplicarMascaraTelefone(
        campos.telefoneSecundario
    );

}


// =====================================================
// INICIALIZAR TELA
// =====================================================

export async function inicializarBeneficiarios() {

    try {

        cancelarPesquisaPendente();

        usuarioLogado =
            null;

        beneficiarioEditandoId =
            null;

        listaBeneficiarios =
            [];

        filtroStatusAtual =
            "TODOS";

        paginaAtual =
            1;

        itensPorPagina =
            10;

        campoOrdenacao =
            "nomeCompleto";

        direcaoOrdenacao =
            "asc";

        beneficiariosSelecionados =
            new Set();

        capturarElementosDaTela();

        elementos.quantidadePorPagina.value =
            String(itensPorPagina);

        validarElementosObrigatorios();

        atualizarBarraSelecao();

        configurarEventos();

        configurarMascaras();

        configurarHistoricoBeneficiario();

        atualizarBotoesFiltro();

        atualizarBotoesOrdenacao();

        atualizarBotaoLimparPesquisa();

        atualizarContadoresFiltros();

        atualizarTextoResultado(0);


        await carregarUsuarioLogado();

        await carregarBeneficiarios();


    } catch (erro) {

        console.error(
            "Erro ao inicializar Beneficiários:",
            erro
        );

        mostrarErro(
            erro.message ||
            "Não foi possível inicializar a tela de Beneficiários."
        );

    }

}