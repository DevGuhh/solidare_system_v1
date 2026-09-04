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
    alterarStatusBeneficiarioAPI,
    buscarCarteirinhaBeneficiarioAPI,
    obterFotoBeneficiarioAPI,
    salvarFotoBeneficiarioAPI
} from "../api/beneficiariosApi.js";

import { criarQRCode, obterImagemQRCode } from "../api/qrcodeApi.js";

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
let fotoCadastroBeneficiarioBase64 = null;
let streamCameraCadastroBeneficiario = null;
let etapaCadastroBeneficiarioAtual = 1;

let cameraCarteirinhaStream = null;

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

    carregarFotosDaTabela();

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
// FOTO NO CADASTRO DO BENEFICIÁRIO
// =====================================================
function encerrarCameraCadastroBeneficiario() {
    if (streamCameraCadastroBeneficiario) {
        streamCameraCadastroBeneficiario.getTracks().forEach(track => track.stop());
        streamCameraCadastroBeneficiario = null;
    }
    const video = document.getElementById("videoFotoCadastroBeneficiario");
    if (video) video.srcObject = null;
    const area = document.getElementById("areaCameraCadastroBeneficiario");
    if (area) area.hidden = true;
}
function limparFotoCadastroBeneficiario() {
    encerrarCameraCadastroBeneficiario(); fotoCadastroBeneficiarioBase64 = null;
    const img=document.getElementById("previewFotoCadastroBeneficiario"), ph=document.getElementById("placeholderFotoCadastroBeneficiario"), rm=document.getElementById("btnRemoverFotoCadastroBeneficiario"), input=document.getElementById("arquivoFotoCadastroBeneficiario");
    if(img){img.hidden=true;img.removeAttribute("src");} if(ph)ph.hidden=false; if(rm)rm.hidden=true; if(input)input.value="";
}
function atualizarPreviewFotoCadastro(foto) {
    fotoCadastroBeneficiarioBase64=foto; const img=document.getElementById("previewFotoCadastroBeneficiario"),ph=document.getElementById("placeholderFotoCadastroBeneficiario"),rm=document.getElementById("btnRemoverFotoCadastroBeneficiario");
    if(img){img.src=foto;img.hidden=false;} if(ph)ph.hidden=true; if(rm)rm.hidden=false;
}

async function carregarFotoAtualNoFormulario(id) {
    const img = document.getElementById("previewFotoCadastroBeneficiario");
    const ph = document.getElementById("placeholderFotoCadastroBeneficiario");
    const rm = document.getElementById("btnRemoverFotoCadastroBeneficiario");

    // Foto atual não conta como alteração. Só envia ao backend se o usuário
    // tirar/selecionar uma nova foto.
    fotoCadastroBeneficiarioBase64 = null;

    if (rm) rm.hidden = true;

    try {
        const resposta = await obterFotoBeneficiarioAPI(Number(id));

        if (!resposta.ok) {
            if (img) {
                img.hidden = true;
                img.removeAttribute("src");
            }
            if (ph) ph.hidden = false;
            return;
        }

        const blob = await resposta.blob();
        const url = URL.createObjectURL(blob);

        if (img) {
            img.src = url;
            img.hidden = false;
            img.onload = () => URL.revokeObjectURL(url);
        }

        if (ph) ph.hidden = true;
    } catch (erro) {
        console.warn("Não foi possível carregar a foto atual no formulário.", erro);
        if (img) {
            img.hidden = true;
            img.removeAttribute("src");
        }
        if (ph) ph.hidden = false;
    }
}
function garantirAreaFotoCadastroBeneficiario() {
    if (!elementos.formulario || document.getElementById("fotoCadastroBeneficiario")) return;
    const grupoNome=campos.nomeCompleto?.closest(".form-group")||campos.nomeCompleto?.parentElement; if(!grupoNome?.parentElement)return;
    const area=document.createElement("div"); area.id="fotoCadastroBeneficiario"; area.className="foto-cadastro-beneficiario";
    area.innerHTML=`<div class="foto-cadastro-titulo"><strong>Foto do beneficiário</strong><span>Opcional. Tire pela câmera ou selecione uma imagem.</span></div><div class="foto-cadastro-conteudo"><div class="foto-cadastro-preview"><div id="placeholderFotoCadastroBeneficiario" class="foto-cadastro-placeholder"><i class="fa-solid fa-user"></i></div><img id="previewFotoCadastroBeneficiario" alt="Prévia" hidden></div><div class="foto-cadastro-botoes"><button type="button" class="btn-foto-cadastro" id="btnAbrirCameraCadastroBeneficiario"><i class="fa-solid fa-camera"></i> Abrir câmera</button><button type="button" class="btn-foto-cadastro" id="btnSelecionarFotoCadastroBeneficiario"><i class="fa-solid fa-upload"></i> Selecionar arquivo</button><button type="button" class="btn-foto-cadastro" id="btnRemoverFotoCadastroBeneficiario" hidden>Remover foto</button><input id="arquivoFotoCadastroBeneficiario" type="file" accept="image/jpeg,image/png,image/webp" hidden></div></div><div id="areaCameraCadastroBeneficiario" class="foto-cadastro-camera" hidden><video id="videoFotoCadastroBeneficiario" autoplay playsinline muted></video><div class="foto-cadastro-camera-acoes"><button type="button" class="btn-foto-cadastro btn-capturar" id="btnCapturarFotoCadastroBeneficiario"><i class="fa-solid fa-camera"></i> Capturar foto</button><button type="button" class="btn-foto-cadastro" id="btnCancelarCameraCadastroBeneficiario">Cancelar</button></div></div>`;
    grupoNome.parentElement.insertBefore(area,grupoNome);
    document.getElementById("btnAbrirCameraCadastroBeneficiario")?.addEventListener("click",async()=>{try{if(!navigator.mediaDevices?.getUserMedia)throw new Error("Este navegador não permite acesso à câmera.");encerrarCameraCadastroBeneficiario();const box=document.getElementById("areaCameraCadastroBeneficiario"),video=document.getElementById("videoFotoCadastroBeneficiario");box.hidden=false;streamCameraCadastroBeneficiario=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user",width:{ideal:720},height:{ideal:720}},audio:false});video.srcObject=streamCameraCadastroBeneficiario;await video.play();}catch(e){encerrarCameraCadastroBeneficiario();mostrarErro(e.message||"Não foi possível abrir a câmera.");}});
    document.getElementById("btnCancelarCameraCadastroBeneficiario")?.addEventListener("click",encerrarCameraCadastroBeneficiario);
    document.getElementById("btnCapturarFotoCadastroBeneficiario")?.addEventListener("click",()=>{const v=document.getElementById("videoFotoCadastroBeneficiario");if(!v?.videoWidth)return mostrarErro("A câmera ainda não está pronta.");const lado=Math.min(v.videoWidth,v.videoHeight),c=document.createElement("canvas");c.width=720;c.height=720;c.getContext("2d").drawImage(v,(v.videoWidth-lado)/2,(v.videoHeight-lado)/2,lado,lado,0,0,720,720);atualizarPreviewFotoCadastro(c.toDataURL("image/jpeg",.82));encerrarCameraCadastroBeneficiario();});
    document.getElementById("btnSelecionarFotoCadastroBeneficiario")?.addEventListener("click",()=>document.getElementById("arquivoFotoCadastroBeneficiario")?.click());
    document.getElementById("arquivoFotoCadastroBeneficiario")?.addEventListener("change",e=>{const f=e.target.files?.[0];if(!f)return;if(!f.type.startsWith("image/")||f.size>3*1024*1024)return mostrarErro("Selecione uma imagem de até 3 MB.");const r=new FileReader();r.onload=()=>atualizarPreviewFotoCadastro(String(r.result));r.readAsDataURL(f);});
    document.getElementById("btnRemoverFotoCadastroBeneficiario")?.addEventListener("click",limparFotoCadastroBeneficiario);
}
async function carregarFotosDaTabela() {
    await Promise.all([...document.querySelectorAll("[data-foto-beneficiario-id]")].map(async avatar=>{try{const r=await obterFotoBeneficiarioAPI(Number(avatar.dataset.fotoBeneficiarioId));if(!r.ok)return;const url=URL.createObjectURL(await r.blob()),img=document.createElement("img");img.src=url;img.className="beneficiario-avatar-foto";img.alt="";img.onload=()=>URL.revokeObjectURL(url);avatar.replaceChildren(img);}catch{}}));
}


// =====================================================
// MODAL EM 3 ETAPAS
// =====================================================

function prepararModalBeneficiarioEmEtapas() {
    const formulario = elementos.formulario;
    if (!formulario) return;

    const body = formulario.querySelector(".modal-beneficiario-body");
    const footer = formulario.querySelector(".modal-beneficiario-actions");
    if (!body || !footer) return;

    const secoes = Array.from(body.querySelectorAll(":scope > .form-section"));

    // Estrutura atual:
    // 0 Dados pessoais
    // 1 Endereço
    // 2 Contato
    // 3 Benefício
    // 4 Informações complementares
    secoes.forEach((secao, indice) => {
        if (indice === 0 || indice === 2) {
            secao.dataset.etapaCadastro = "1";
        } else if (indice === 1) {
            secao.dataset.etapaCadastro = "2";
        } else {
            secao.dataset.etapaCadastro = "3";
        }
    });

    if (!formulario.querySelector(".beneficiario-etapas")) {
        const etapas = document.createElement("div");
        etapas.className = "beneficiario-etapas";
        etapas.innerHTML = `
            <button type="button" class="beneficiario-etapa" data-ir-etapa="1">
                <span class="beneficiario-etapa-numero">1</span>
                <span class="beneficiario-etapa-texto">
                    <strong>Dados pessoais</strong>
                    <small>Identificação e contato</small>
                </span>
            </button>

            <span class="beneficiario-etapa-linha" aria-hidden="true"></span>

            <button type="button" class="beneficiario-etapa" data-ir-etapa="2">
                <span class="beneficiario-etapa-numero">2</span>
                <span class="beneficiario-etapa-texto">
                    <strong>Endereço</strong>
                    <small>Localização do beneficiário</small>
                </span>
            </button>

            <span class="beneficiario-etapa-linha" aria-hidden="true"></span>

            <button type="button" class="beneficiario-etapa" data-ir-etapa="3">
                <span class="beneficiario-etapa-numero">3</span>
                <span class="beneficiario-etapa-texto">
                    <strong>Benefício</strong>
                    <small>Benefício e observações</small>
                </span>
            </button>
        `;
        formulario.insertBefore(etapas, body);
    }

    let btnAnterior = footer.querySelector("#btnEtapaAnteriorBeneficiario");
    if (!btnAnterior) {
        btnAnterior = document.createElement("button");
        btnAnterior.type = "button";
        btnAnterior.id = "btnEtapaAnteriorBeneficiario";
        btnAnterior.className = "btn btn-secondary btn-etapa-anterior";
        btnAnterior.innerHTML = `<i class="fa-solid fa-arrow-left" aria-hidden="true"></i> Anterior`;

        const cancelar = footer.querySelector("#btnCancelarBeneficiario");
        if (cancelar?.nextSibling) {
            footer.insertBefore(btnAnterior, cancelar.nextSibling);
        } else {
            footer.appendChild(btnAnterior);
        }
    }

    let btnProximo = footer.querySelector("#btnEtapaProximaBeneficiario");
    if (!btnProximo) {
        btnProximo = document.createElement("button");
        btnProximo.type = "button";
        btnProximo.id = "btnEtapaProximaBeneficiario";
        btnProximo.className = "btn btn-primary btn-etapa-proxima";
        btnProximo.innerHTML = `Próximo <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>`;

        const submit = footer.querySelector('button[type="submit"]');
        footer.insertBefore(btnProximo, submit);
    }

    if (!formulario.dataset.etapasConfiguradas) {
        formulario.dataset.etapasConfiguradas = "true";

        formulario.querySelector("#btnEtapaAnteriorBeneficiario")
            ?.addEventListener("click", () => {
                mostrarEtapaCadastroBeneficiario(etapaCadastroBeneficiarioAtual - 1);
            });

        formulario.querySelector("#btnEtapaProximaBeneficiario")
            ?.addEventListener("click", () => {
                if (!validarEtapaCadastroBeneficiario(etapaCadastroBeneficiarioAtual)) {
                    return;
                }

                mostrarEtapaCadastroBeneficiario(etapaCadastroBeneficiarioAtual + 1);
            });

        formulario.querySelectorAll("[data-ir-etapa]").forEach((botao) => {
            botao.addEventListener("click", () => {
                const destino = Number(botao.dataset.irEtapa);

                // Pode voltar livremente. Para avançar pelo cabeçalho,
                // valida a etapa atual antes.
                if (
                    destino > etapaCadastroBeneficiarioAtual &&
                    !validarEtapaCadastroBeneficiario(etapaCadastroBeneficiarioAtual)
                ) {
                    return;
                }

                mostrarEtapaCadastroBeneficiario(destino);
            });
        });
    }

    mostrarEtapaCadastroBeneficiario(1);
}

function validarEtapaCadastroBeneficiario(etapa) {
    const formulario = elementos.formulario;
    if (!formulario) return true;

    const secoes = formulario.querySelectorAll(
        `[data-etapa-cadastro="${etapa}"]`
    );

    for (const secao of secoes) {
        const camposEtapa = secao.querySelectorAll("input, select, textarea");

        for (const campo of camposEtapa) {
            if (
                campo.disabled ||
                campo.type === "hidden" ||
                campo.offsetParent === null
            ) {
                continue;
            }

            if (!campo.checkValidity()) {
                campo.reportValidity();
                campo.focus();
                return false;
            }
        }
    }

    return true;
}

function mostrarEtapaCadastroBeneficiario(etapa) {
    const formulario = elementos.formulario;
    if (!formulario) return;

    const etapaValidada = Math.min(3, Math.max(1, Number(etapa) || 1));
    etapaCadastroBeneficiarioAtual = etapaValidada;

    formulario.querySelectorAll("[data-etapa-cadastro]").forEach((secao) => {
        secao.hidden =
            Number(secao.dataset.etapaCadastro) !== etapaValidada;
    });

    formulario.querySelectorAll(".beneficiario-etapa").forEach((botao) => {
        const numero = Number(botao.dataset.irEtapa);
        botao.classList.toggle("ativo", numero === etapaValidada);
        botao.classList.toggle("concluido", numero < etapaValidada);
        botao.setAttribute(
            "aria-current",
            numero === etapaValidada ? "step" : "false"
        );
    });

    const linhas = formulario.querySelectorAll(".beneficiario-etapa-linha");
    linhas.forEach((linha, indice) => {
        linha.classList.toggle("concluida", indice + 1 < etapaValidada);
    });

    const btnAnterior =
        formulario.querySelector("#btnEtapaAnteriorBeneficiario");

    const btnProximo =
        formulario.querySelector("#btnEtapaProximaBeneficiario");

    const btnSalvar =
        formulario.querySelector('button[type="submit"]');

    if (btnAnterior) {
        btnAnterior.hidden = etapaValidada === 1;
    }

    if (btnProximo) {
        btnProximo.hidden = etapaValidada === 3;
    }

    if (btnSalvar) {
        btnSalvar.hidden = etapaValidada !== 3;
    }

    const body = formulario.querySelector(".modal-beneficiario-body");
    if (body) {
        body.scrollTop = 0;
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

    garantirAreaFotoCadastroBeneficiario();
    limparFotoCadastroBeneficiario();
    const areaFotoCadastro = document.getElementById("fotoCadastroBeneficiario");
    if (areaFotoCadastro) areaFotoCadastro.hidden = false;

    prepararModalBeneficiarioEmEtapas();
    mostrarEtapaCadastroBeneficiario(1);

    // No cadastro, CPF e data de nascimento permanecem editáveis.
    campos.cpf.disabled = false;
    campos.dataNascimento.disabled = false;

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

    limparFotoCadastroBeneficiario();

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

    campos.cpf.disabled = false;
    campos.dataNascimento.disabled = false;

}


// =====================================================
// MONTAR DADOS DO FORMULÁRIO
// =====================================================

function montarDadosFormulario() {

    if (!validarDataNascimentoCampo(campos.dataNascimento)) {
        campos.dataNascimento.reportValidity();
        campos.dataNascimento.focus();

        throw new Error(
            "Informe uma data de nascimento válida."
        );
    }

    const dados = {

        nomeCompleto:
            campos.nomeCompleto.value
                .trim(),

        cpf:
            campos.cpf.value
                .replace(/\D/g, ""),

        dataNascimento:
            converterDataBrasileiraParaISO(
                campos.dataNascimento.value
            ),

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

    if (etapaCadastroBeneficiarioAtual !== 3) {
        if (validarEtapaCadastroBeneficiario(etapaCadastroBeneficiarioAtual)) {
            mostrarEtapaCadastroBeneficiario(etapaCadastroBeneficiarioAtual + 1);
        }
        return;
    }

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

        // Regras de edição por perfil:
        // ADMIN pode alterar CPF e data de nascimento.
        // INSTITUICAO mantém CPF bloqueado, mas pode alterar data de nascimento.
        if (
            editando &&
            usuarioLogado?.role === "INSTITUICAO"
        ) {
            delete dados.cpf;
        }

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

        if (fotoCadastroBeneficiarioBase64) {
            const idFoto = editando
                ? Number(beneficiarioEditandoId)
                : Number(resultado?.beneficiario?.id ?? resultado?.data?.id);

            if (!idFoto) {
                throw new Error(
                    editando
                        ? "Beneficiário atualizado, mas não foi possível identificar o ID para salvar a foto."
                        : "Beneficiário cadastrado, mas não foi possível identificar o ID para salvar a foto."
                );
            }

            const respostaFoto = await salvarFotoBeneficiarioAPI(
                idFoto,
                fotoCadastroBeneficiarioBase64
            );

            if (!respostaFoto.ok) {
                throw new Error(
                    editando
                        ? "Beneficiário atualizado, mas ocorreu erro ao salvar a foto."
                        : "Beneficiário cadastrado, mas ocorreu erro ao salvar a foto."
                );
            }
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

        garantirAreaFotoCadastroBeneficiario();
        encerrarCameraCadastroBeneficiario();
        const areaFotoCadastro = document.getElementById("fotoCadastroBeneficiario");
        if (areaFotoCadastro) areaFotoCadastro.hidden = false;
        await carregarFotoAtualNoFormulario(id);

        prepararModalBeneficiarioEmEtapas();
        mostrarEtapaCadastroBeneficiario(1);

        alterarTitulo(
            elementos.tituloModal,
            "Editar beneficiário"
        );


        campos.nomeCompleto.value =
            beneficiario.nomeCompleto ?? "";

        campos.cpf.value =
            formatarCPF(beneficiario.cpf ?? "");

        campos.dataNascimento.value =
            converterDataISOParaBrasileira(
                beneficiario.dataNascimento
            );

        // Permissões de edição:
        // ADMIN: CPF e data de nascimento editáveis.
        // INSTITUICAO: CPF bloqueado e data de nascimento editável.
        const usuarioEhAdmin = usuarioLogado?.role === "ADMIN";

        campos.cpf.disabled = !usuarioEhAdmin;
        campos.dataNascimento.disabled = false;

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
            beneficiario.tipoBeneficio ?? "";

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
// CARTEIRINHA DO BENEFICIÁRIO
// =====================================================

function mascararCPFCartao(cpf) {
    const numeros = String(cpf ?? "").replace(/\D/g, "");
    if (numeros.length !== 11) return "-";
    return `***.${numeros.slice(3, 6)}.${numeros.slice(6, 9)}-**`;
}

function rotuloBeneficioCarteirinha(tipo) {
    const rotulos = {
        CESTA: "Cesta básica",
        GRANEL: "Granel",
        AMBOS: "Cesta + granel"
    };
    return rotulos[String(tipo ?? "").toUpperCase()] || "Não informado";
}

function blobParaDataURL(blob) {
    return new Promise((resolve, reject) => {
        const leitor = new FileReader();
        leitor.onload = () => resolve(String(leitor.result || ""));
        leitor.onerror = () => reject(new Error("Não foi possível carregar a imagem."));
        leitor.readAsDataURL(blob);
    });
}

async function arquivoFotoPerfilParaBase64(arquivo) {
    if (!arquivo || !arquivo.type.startsWith("image/")) {
        throw new Error("Selecione uma imagem válida.");
    }

    const url = URL.createObjectURL(arquivo);
    try {
        const imagem = await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error("Não foi possível processar a foto."));
            img.src = url;
        });

        const tamanhoOrigem = Math.min(imagem.naturalWidth, imagem.naturalHeight);
        const origemX = Math.max(0, (imagem.naturalWidth - tamanhoOrigem) / 2);
        const origemY = Math.max(0, (imagem.naturalHeight - tamanhoOrigem) / 2);
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 640;
        const contexto = canvas.getContext("2d");
        contexto.drawImage(
            imagem,
            origemX,
            origemY,
            tamanhoOrigem,
            tamanhoOrigem,
            0,
            0,
            640,
            640
        );
        return canvas.toDataURL("image/jpeg", 0.82);
    } finally {
        URL.revokeObjectURL(url);
    }
}

function encerrarCameraCarteirinha(modal = document.getElementById("modalCarteirinhaBeneficiario")) {
    if (cameraCarteirinhaStream) {
        cameraCarteirinhaStream.getTracks().forEach((track) => track.stop());
        cameraCarteirinhaStream = null;
    }

    const video = modal?.querySelector("[data-camera-carteirinha-video]");
    const area = modal?.querySelector("[data-camera-carteirinha]");

    if (video) {
        video.pause();
        video.srcObject = null;
    }

    if (area) area.hidden = true;
}

async function abrirCameraCarteirinha(modal) {
    if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Este navegador não permite acesso direto à câmera.");
    }

    encerrarCameraCarteirinha(modal);

    const area = modal?.querySelector("[data-camera-carteirinha]");
    const video = modal?.querySelector("[data-camera-carteirinha-video]");

    if (!area || !video) {
        throw new Error("A área da câmera não foi encontrada.");
    }

    area.hidden = false;

    try {
        cameraCarteirinhaStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: { ideal: "user" },
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });
    } catch {
        cameraCarteirinhaStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
        });
    }

    video.srcObject = cameraCarteirinhaStream;
    await video.play();
}

function capturarFotoCarteirinha(modal) {
    const video = modal?.querySelector("[data-camera-carteirinha-video]");

    if (!video || !video.videoWidth || !video.videoHeight) {
        throw new Error("A câmera ainda não está pronta para capturar a foto.");
    }

    const lado = Math.min(video.videoWidth, video.videoHeight);
    const origemX = Math.max(0, (video.videoWidth - lado) / 2);
    const origemY = Math.max(0, (video.videoHeight - lado) / 2);
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 640;

    const contexto = canvas.getContext("2d");
    contexto.drawImage(
        video,
        origemX,
        origemY,
        lado,
        lado,
        0,
        0,
        640,
        640
    );

    return canvas.toDataURL("image/jpeg", 0.82);
}

async function salvarFotoCarteirinhaCapturada(id, fotoBase64, modal) {
    mostrarLoading();

    try {
        const respostaSalvar = await salvarFotoBeneficiarioAPI(id, fotoBase64);
        const retorno = await lerRespostaJson(respostaSalvar);

        if (!respostaSalvar.ok) {
            throw new Error(retorno.error || "Não foi possível salvar a foto.");
        }

        encerrarCameraCarteirinha(modal);
        mostrarSucesso("Foto cadastral atualizada com sucesso!");
        modal.hidden = true;
        document.body.style.overflow = "";
        await abrirCarteirinhaBeneficiario(id);
    } finally {
        esconderLoading();
    }
}

function garantirModalCarteirinha() {
    let modal = document.getElementById("modalCarteirinhaBeneficiario");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "modalCarteirinhaBeneficiario";
    modal.className = "carteirinha-modal-overlay";
    modal.hidden = true;
    document.body.appendChild(modal);
    return modal;
}

function imprimirCarteirinhaAtual() {
    const cartao = document.querySelector("#modalCarteirinhaBeneficiario .carteirinha-cartao");
    if (!cartao) return;

    const janela = window.open("", "_blank", "width=760,height=620");
    if (!janela) {
        mostrarErro("Permita pop-ups para imprimir a carteirinha.");
        return;
    }

    janela.document.write(`<!doctype html>
        <html lang="pt-BR"><head><meta charset="utf-8"><title>Carteirinha do beneficiário</title>
        <style>
          *{
            box-sizing:border-box;
            -webkit-print-color-adjust:exact !important;
            print-color-adjust:exact !important;
          }

          html,body{
            -webkit-print-color-adjust:exact !important;
            print-color-adjust:exact !important;
          }

          body{margin:0;padding:28px;font-family:Arial,sans-serif;background:#fff;display:flex;justify-content:center}

          .carteirinha-cartao{
            width:680px;
            min-height:390px;
            border-radius:24px;
            overflow:hidden;
            border:1px solid #dedede;
            box-shadow:none;
            background:#fff !important;
            color:#1f2937;
            -webkit-print-color-adjust:exact !important;
            print-color-adjust:exact !important;
          }

          .carteirinha-faixa{
            background:#980019 !important;
            background-color:#980019 !important;
            color:#fff !important;
            padding:18px 24px;
            display:flex;
            justify-content:space-between;
            align-items:center;
            -webkit-print-color-adjust:exact !important;
            print-color-adjust:exact !important;
          }

          .carteirinha-faixa strong,
          .carteirinha-faixa span{
            color:#fff !important;
          }
          .carteirinha-faixa strong{font-size:22px}.carteirinha-faixa span{font-size:12px;text-transform:uppercase;letter-spacing:1px}
          .carteirinha-corpo{display:grid;grid-template-columns:150px 1fr 170px;gap:22px;padding:24px;align-items:center}
          .carteirinha-foto{width:145px;height:175px;border-radius:18px;object-fit:cover;background:#f3f4f6;border:1px solid #e5e7eb}
          .carteirinha-foto-placeholder{width:145px;height:175px;border-radius:18px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:54px;color:#9ca3af}
          .carteirinha-dados h2{margin:0 0 14px;font-size:23px}.carteirinha-dados p{margin:7px 0;font-size:14px}.carteirinha-dados b{color:#980019}
          .carteirinha-qr{text-align:center}.carteirinha-qr img{width:155px;height:155px;object-fit:contain}.carteirinha-qr small{display:block;margin-top:4px;font-family:monospace;font-size:10px}
          .carteirinha-rodape{border-top:1px solid #eee;padding:10px 24px;text-align:center;font-size:11px;color:#6b7280}
          @media print{
            @page{margin:10mm}

            html,body,*{
              -webkit-print-color-adjust:exact !important;
              print-color-adjust:exact !important;
            }

            body{padding:0}

            .carteirinha-cartao{
              width:100%;
              page-break-inside:avoid;
              break-inside:avoid;
            }

            .carteirinha-faixa{
              background:#980019 !important;
              background-color:#980019 !important;
              color:#fff !important;
            }
          }
        </style></head><body>${cartao.outerHTML}<script>window.onload=()=>{window.print();};<\/script></body></html>`);
    janela.document.close();
}

async function abrirCarteirinhaBeneficiario(id) {
    mostrarLoading();

    try {
        const resposta = await buscarCarteirinhaBeneficiarioAPI(id);
        const dados = await lerRespostaJson(resposta);
        if (!resposta.ok) throw new Error(dados.error || "Não foi possível carregar a carteirinha.");

        let fotoDataURL = "";
        if (dados.possuiFoto) {
            const respostaFoto = await obterFotoBeneficiarioAPI(id);
            if (respostaFoto.ok) fotoDataURL = await blobParaDataURL(await respostaFoto.blob());
        }

        let qrDataURL = "";
        if (dados.qrCode?.codigo) {
            const respostaQR = await obterImagemQRCode(dados.qrCode.codigo);
            if (respostaQR.ok) qrDataURL = await blobParaDataURL(await respostaQR.blob());
        }

        const modal = garantirModalCarteirinha();
        const foto = fotoDataURL
            ? `<img class="carteirinha-foto" src="${fotoDataURL}" alt="Foto de ${escaparHtml(dados.nomeCompleto)}">`
            : `<div class="carteirinha-foto-placeholder"><i class="fa-solid fa-user"></i></div>`;
        const qr = qrDataURL
            ? `<img src="${qrDataURL}" alt="QR Code"><small>${escaparHtml(dados.qrCode.codigo)}</small>`
            : `<div class="carteirinha-sem-qr"><i class="fa-solid fa-qrcode"></i><span>QR Code não gerado</span></div>`;

        modal.innerHTML = `
          <div class="carteirinha-modal" role="dialog" aria-modal="true" aria-label="Carteirinha do beneficiário">
            <div class="carteirinha-modal-topo">
              <div><span>BENEFICIÁRIO</span><h2>Carteirinha</h2></div>
              <button type="button" data-fechar-carteirinha aria-label="Fechar"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="carteirinha-cartao">
              <div class="carteirinha-faixa"><strong>Instituto Solidare</strong><span>Carteirinha do beneficiário</span></div>
              <div class="carteirinha-corpo">
                <div>${foto}</div>
                <div class="carteirinha-dados">
                  <h2>${escaparHtml(dados.nomeCompleto || "Beneficiário")}</h2>
                  <p><b>CPF:</b> ${escaparHtml(mascararCPFCartao(dados.cpf))}</p>
                  <p><b>Instituição:</b> ${escaparHtml(dados.instituicao?.nome || "-")}</p>
                  <p><b>Benefício:</b> ${escaparHtml(rotuloBeneficioCarteirinha(dados.tipoBeneficio))}</p>
                  <p><b>Código:</b> #${Number(dados.id)}</p>
                  <p><b>Status:</b> ${dados.ativo ? "Ativo" : "Inativo"}</p>
                </div>
                <div class="carteirinha-qr">${qr}</div>
              </div>
              <div class="carteirinha-rodape">Apresente esta carteirinha para identificação e leitura do QR Code.</div>
            </div>
            ${!dados.qrCode ? `<div class="carteirinha-aviso"><i class="fa-solid fa-circle-exclamation"></i> Gere primeiro um QR Code ativo para este beneficiário.</div>` : ""}
            <div class="carteirinha-camera-area" data-camera-carteirinha hidden>
              <video class="carteirinha-camera-video" data-camera-carteirinha-video autoplay playsinline muted></video>
              <div class="carteirinha-camera-acoes">
                <button type="button" class="btn-carteirinha-capturar" data-capturar-foto-carteirinha><i class="fa-solid fa-camera-retro"></i> Capturar foto</button>
                <button type="button" class="btn-carteirinha-cancelar-camera" data-cancelar-camera-carteirinha>Cancelar</button>
              </div>
            </div>
            <div class="carteirinha-acoes-modal">
              <input type="file" accept="image/jpeg,image/png,image/webp" data-foto-carteirinha hidden>
              ${!dados.qrCode ? `<button type="button" class="btn-carteirinha-gerar-qr" data-gerar-qr-carteirinha><i class="fa-solid fa-qrcode"></i> Gerar QR Code</button>` : ""}
              <button type="button" class="btn-carteirinha-foto btn-carteirinha-camera" data-abrir-camera-carteirinha><i class="fa-solid fa-camera"></i> Abrir câmera</button>
              <button type="button" class="btn-carteirinha-foto" data-selecionar-foto-carteirinha><i class="fa-solid fa-image"></i> Selecionar arquivo</button>
              <button type="button" class="btn-carteirinha-imprimir" data-imprimir-carteirinha ${!dados.qrCode ? "disabled" : ""}><i class="fa-solid fa-print"></i> Imprimir carteirinha</button>
            </div>
          </div>`;

        modal.hidden = false;
        document.body.style.overflow = "hidden";

        modal.querySelector("[data-fechar-carteirinha]")?.addEventListener("click", () => {
            encerrarCameraCarteirinha(modal);
            modal.hidden = true;
            document.body.style.overflow = "";
        });
        modal.addEventListener("click", (event) => {
            if (event.target === modal) {
                encerrarCameraCarteirinha(modal);
                modal.hidden = true;
                document.body.style.overflow = "";
            }
        }, { once: true });
        modal.querySelector("[data-gerar-qr-carteirinha]")?.addEventListener("click", async (event) => {
            const botao = event.currentTarget;

            try {
                botao.disabled = true;
                mostrarLoading();

                const respostaCriar = await criarQRCode(Number(id));
                const retorno = await lerRespostaJson(respostaCriar);

                if (!respostaCriar.ok) {
                    throw new Error(
                        retorno.message ||
                        retorno.error ||
                        "Não foi possível gerar o QR Code."
                    );
                }

                mostrarSucesso("QR Code gerado com sucesso!");

                modal.hidden = true;
                document.body.style.overflow = "";

                // Reabre a carteirinha para exibir imediatamente
                // o QR Code recém-criado e liberar a impressão.
                await abrirCarteirinhaBeneficiario(id);
            } catch (erro) {
                console.error("Erro ao gerar QR Code pela carteirinha:", erro);
                mostrarErro(
                    erro.message ||
                    "Não foi possível gerar o QR Code."
                );
                botao.disabled = false;
            } finally {
                esconderLoading();
            }
        });

        modal.querySelector("[data-imprimir-carteirinha]")?.addEventListener("click", imprimirCarteirinhaAtual);

        modal.querySelector("[data-abrir-camera-carteirinha]")?.addEventListener("click", async () => {
            try {
                await abrirCameraCarteirinha(modal);
            } catch (erro) {
                console.error("Erro ao abrir câmera da carteirinha:", erro);
                mostrarErro((erro.message || "Não foi possível abrir a câmera.") + " Você ainda pode selecionar um arquivo.");
            }
        });

        modal.querySelector("[data-cancelar-camera-carteirinha]")?.addEventListener("click", () => {
            encerrarCameraCarteirinha(modal);
        });

        modal.querySelector("[data-capturar-foto-carteirinha]")?.addEventListener("click", async () => {
            try {
                const fotoBase64 = capturarFotoCarteirinha(modal);
                await salvarFotoCarteirinhaCapturada(id, fotoBase64, modal);
            } catch (erro) {
                console.error("Erro ao capturar foto da carteirinha:", erro);
                mostrarErro(erro.message || "Não foi possível capturar a foto.");
            }
        });

        modal.querySelector("[data-selecionar-foto-carteirinha]")?.addEventListener("click", () => {
            encerrarCameraCarteirinha(modal);
            modal.querySelector("[data-foto-carteirinha]")?.click();
        });

        modal.querySelector("[data-foto-carteirinha]")?.addEventListener("change", async (event) => {
            const arquivo = event.target.files?.[0];
            if (!arquivo) return;
            try {
                mostrarLoading();
                const fotoBase64 = await arquivoFotoPerfilParaBase64(arquivo);
                const respostaSalvar = await salvarFotoBeneficiarioAPI(id, fotoBase64);
                const retorno = await lerRespostaJson(respostaSalvar);
                if (!respostaSalvar.ok) throw new Error(retorno.error || "Não foi possível salvar a foto.");
                encerrarCameraCarteirinha(modal);
                mostrarSucesso("Foto cadastral atualizada com sucesso!");
                modal.hidden = true;
                document.body.style.overflow = "";
                await abrirCarteirinhaBeneficiario(id);
            } catch (erro) {
                mostrarErro(erro.message || "Erro ao atualizar a foto cadastral.");
            } finally {
                esconderLoading();
            }
        });
    } catch (erro) {
        console.error("Erro ao abrir carteirinha:", erro);
        mostrarErro(erro.message || "Não foi possível abrir a carteirinha.");
    } finally {
        esconderLoading();
    }
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
    
    const botaoCarteirinha =
        event.target.closest(
            ".btnCarteirinhaBeneficiario"
        );

    if (botaoCarteirinha) {

        abrirCarteirinhaBeneficiario(
            botaoCarteirinha.dataset.id
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
// DATA DE NASCIMENTO
// =====================================================

function aplicarMascaraDataNascimento(campo) {

    campo.addEventListener("input", () => {

        const numeros =
            campo.value
                .replace(/\D/g, "")
                .slice(0, 8);

        const partes = [];

        if (numeros.length > 0) {
            partes.push(numeros.slice(0, 2));
        }

        if (numeros.length > 2) {
            partes.push(numeros.slice(2, 4));
        }

        if (numeros.length > 4) {
            partes.push(numeros.slice(4, 8));
        }

        campo.value = partes.join("/");

        validarDataNascimentoCampo(campo);

    });

    campo.addEventListener("blur", () => {
        validarDataNascimentoCampo(campo);
    });

}

function converterDataBrasileiraParaISO(valor) {

    const correspondencia =
        String(valor ?? "")
            .trim()
            .match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

    if (!correspondencia) {
        return null;
    }

    const [, diaTexto, mesTexto, anoTexto] = correspondencia;

    const dia = Number(diaTexto);
    const mes = Number(mesTexto);
    const ano = Number(anoTexto);

    const data = new Date(
        Date.UTC(
            ano,
            mes - 1,
            dia
        )
    );

    if (
        data.getUTCFullYear() !== ano ||
        data.getUTCMonth() !== mes - 1 ||
        data.getUTCDate() !== dia
    ) {
        return null;
    }

    const hoje = new Date();

    const hojeUTC = new Date(
        Date.UTC(
            hoje.getFullYear(),
            hoje.getMonth(),
            hoje.getDate()
        )
    );

    if (data > hojeUTC) {
        return null;
    }

    return (
        `${anoTexto}-${mesTexto}-${diaTexto}`
    );

}

function converterDataISOParaBrasileira(valor) {

    const texto =
        String(valor ?? "")
            .substring(0, 10);

    const correspondencia =
        texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (!correspondencia) {
        return "";
    }

    const [, ano, mes, dia] = correspondencia;

    return `${dia}/${mes}/${ano}`;

}

function validarDataNascimentoCampo(campo) {

    if (!campo.value) {
        campo.setCustomValidity("");
        return true;
    }

    const dataISO =
        converterDataBrasileiraParaISO(
            campo.value
        );

    if (!dataISO) {
        campo.setCustomValidity(
            "Informe uma data válida no formato dd/mm/aaaa."
        );
        return false;
    }

    campo.setCustomValidity("");
    return true;

}


// =====================================================
// CONFIGURAR MÁSCARAS
// =====================================================

function configurarMascaras() {

    aplicarMascaraCPF(
        campos.cpf
    );

    aplicarMascaraDataNascimento(
        campos.dataNascimento
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