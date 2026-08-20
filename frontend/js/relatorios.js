// =====================================================
// MÓDULO PRINCIPAL DE RELATÓRIOS
// =====================================================

import {
    listarBeneficiariosRelatorio,
    listarInstituicoesRelatorio
} from "./api/relatoriosApi.js";

import {
    renderizarTabelaRelatorios
} from "./relatorios/relatoriosTabela.js";

import {
    filtrarRelatorios
} from "./relatorios/relatoriosFiltros.js";

import {
    exportarRelatorioCSV,
    exportarRelatorioExcel,
    exportarRelatorioPDF
} from "./relatorios/relatoriosExportacao.js";

import {
    mostrarAviso,
    mostrarErro
} from "./utils/toast.js";

import {
    mostrarLoading,
    esconderLoading
} from "./utils/loading.js";

let listaBeneficiarios = [];
let listaFiltrada = [];
let listaOrdenada = [];

let paginaAtual = 1;
let quantidadePorPagina = 10;

let campoOrdenacao = "nomeCompleto";
let direcaoOrdenacao = "asc";

let graficoBeneficios = null;
let graficoInstituicoes = null;

let controladorEventos = null;
let elementos = {};

// =====================================================
// ELEMENTOS DA TELA
// =====================================================

function capturarElementos() {
    elementos = {
        tabela: document.getElementById("tabelaRelatorios"),

        totalBeneficiarios:
            document.getElementById("totalRelatorioBeneficiarios"),

        totalInstituicoes:
            document.getElementById("totalRelatorioInstituicoes"),

        totalAtivos:
            document.getElementById("totalRelatorioAtivos"),

        totalInativos:
            document.getElementById("totalRelatorioInativos"),

        quantidadeRegistros:
            document.getElementById("quantidadeRegistrosRelatorio"),

        filtroDataInicial:
            document.getElementById("filtroDataInicial"),

        filtroDataFinal:
            document.getElementById("filtroDataFinal"),

        filtroInstituicao:
            document.getElementById("filtroInstituicao"),

        filtroBeneficio:
            document.getElementById("filtroBeneficio"),

        filtroAtivo:
            document.getElementById("filtroAtivo"),

        pesquisa:
            document.getElementById("pesquisaRelatorio"),

        descricaoFiltros:
            document.getElementById("descricaoFiltrosRelatorio"),

        feedback:
            document.getElementById("feedbackRelatorios"),

        textoFeedback:
            document.getElementById("textoFeedbackRelatorios"),

        btnAtualizar:
            document.getElementById("btnAtualizarRelatorio"),

        btnAplicarFiltros:
            document.getElementById("btnAplicarFiltrosRelatorio"),

        btnLimparFiltros:
            document.getElementById("btnLimparFiltros"),

        btnPdf: document.getElementById("btnPdf"),
        btnExcel: document.getElementById("btnExcel"),
        btnCsv: document.getElementById("btnCsv"),

        btnImprimir:
            document.getElementById("btnImprimirRelatorio"),

        quantidadePorPagina:
            document.getElementById("quantidadePorPaginaRelatorio"),

        intervaloPaginacao:
            document.getElementById("intervaloPaginacaoRelatorio"),

        numerosPaginacao:
            document.getElementById("numerosPaginacaoRelatorio"),

        btnPrimeiraPagina:
            document.getElementById("btnPrimeiraPaginaRelatorio"),

        btnPaginaAnterior:
            document.getElementById("btnPaginaAnteriorRelatorio"),

        btnProximaPagina:
            document.getElementById("btnProximaPaginaRelatorio"),

        btnUltimaPagina:
            document.getElementById("btnUltimaPaginaRelatorio"),

        graficoBeneficios:
            document.getElementById("graficoRelatorioBeneficios"),

        graficoInstituicoes:
            document.getElementById("graficoRelatorioInstituicoes"),

        vazioGraficoBeneficios:
            document.getElementById("estadoVazioGraficoBeneficios"),

        vazioGraficoInstituicoes:
            document.getElementById("estadoVazioGraficoInstituicoes")
    };
}

function validarElementos() {
    const obrigatorios = [
        elementos.tabela,
        elementos.totalBeneficiarios,
        elementos.totalInstituicoes,
        elementos.filtroDataInicial,
        elementos.filtroDataFinal,
        elementos.filtroInstituicao,
        elementos.filtroBeneficio,
        elementos.filtroAtivo,
        elementos.btnLimparFiltros,
        elementos.btnPdf,
        elementos.btnExcel,
        elementos.btnCsv
    ];

    if (obrigatorios.some((elemento) => !elemento)) {
        throw new Error(
            "A página de Relatórios não possui todos os elementos obrigatórios."
        );
    }
}

// =====================================================
// UTILITÁRIOS
// =====================================================

function escaparHTML(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

/**
 * Lê JSON sem quebrar quando a resposta vier sem corpo.
 */
async function lerRespostaJSON(resposta) {
    const texto = await resposta.text();

    if (!texto) {
        return {};
    }

    try {
        return JSON.parse(texto);
    } catch {
        throw new Error("A API retornou uma resposta inválida.");
    }
}

/**
 * Extrai uma lista de diferentes formatos possíveis da API.
 *
 * Formatos aceitos:
 * [
 *   {...}
 * ]
 *
 * { data: [...] }
 * { beneficiarios: [...] }
 * { instituicoes: [...] }
 * { resultados: [...] }
 * { registros: [...] }
 */
function extrairLista(dados, propriedades = []) {
    if (Array.isArray(dados)) {
        return dados;
    }

    for (const propriedade of propriedades) {
        if (Array.isArray(dados?.[propriedade])) {
            return dados[propriedade];
        }
    }

    const propriedadesPadrao = [
        "dados",
        "data",
        "resultados",
        "registros",
        "items"
    ];

    for (const propriedade of propriedadesPadrao) {
        if (Array.isArray(dados?.[propriedade])) {
            return dados[propriedade];
        }
    }

    return [];
}

function obterMensagemErro(dados, mensagemPadrao) {
    return (
        dados?.message ||
        dados?.mensagem ||
        dados?.error ||
        dados?.erro ||
        dados?.issues?.[0]?.message ||
        mensagemPadrao
    );
}

function exibirFeedback(mensagem, tipo = "info") {
    if (!elementos.feedback || !elementos.textoFeedback) {
        return;
    }

    elementos.feedback.classList.remove(
        "mensagem-info",
        "mensagem-sucesso",
        "mensagem-aviso",
        "mensagem-erro"
    );

    elementos.feedback.classList.add(`mensagem-${tipo}`);
    elementos.textoFeedback.textContent = mensagem;
    elementos.feedback.hidden = false;

    window.setTimeout(() => {
        if (elementos.feedback) {
            elementos.feedback.hidden = true;
        }
    }, 4500);
}

// =====================================================
// FILTROS
// =====================================================

function obterFiltros() {
    return {
        dataInicial: elementos.filtroDataInicial.value,
        dataFinal: elementos.filtroDataFinal.value,
        instituicaoId: elementos.filtroInstituicao.value,
        tipoBeneficio: elementos.filtroBeneficio.value,
        ativo: elementos.filtroAtivo.value,
        pesquisa: elementos.pesquisa?.value ?? ""
    };
}

function validarPeriodo(filtros) {
    if (
        filtros.dataInicial &&
        filtros.dataFinal &&
        filtros.dataInicial > filtros.dataFinal
    ) {
        mostrarAviso(
            "A data inicial não pode ser maior que a data final."
        );

        return false;
    }

    return true;
}

// =====================================================
// ORDENAÇÃO
// =====================================================

function obterValorOrdenacao(beneficiario, campo) {
    if (campo === "instituicao") {
        return beneficiario.instituicao?.nome ?? "";
    }

    if (campo === "ativo") {
        return beneficiario.ativo ? 1 : 0;
    }

    return beneficiario[campo] ?? "";
}

function ordenarLista() {
    listaOrdenada = [...listaFiltrada].sort((a, b) => {
        const valorA = obterValorOrdenacao(a, campoOrdenacao);
        const valorB = obterValorOrdenacao(b, campoOrdenacao);

        let comparacao;

        if (
            typeof valorA === "number" &&
            typeof valorB === "number"
        ) {
            comparacao = valorA - valorB;
        } else {
            comparacao = String(valorA).localeCompare(
                String(valorB),
                "pt-BR",
                {
                    numeric: true,
                    sensitivity: "base"
                }
            );
        }

        return direcaoOrdenacao === "asc"
            ? comparacao
            : -comparacao;
    });
}

function atualizarIconesOrdenacao() {
    document
        .querySelectorAll("[data-ordenar-relatorio]")
        .forEach((cabecalho) => {
            const icone = cabecalho.querySelector("i");

            if (!icone) {
                return;
            }

            icone.className = "fa-solid fa-sort";

            if (
                cabecalho.dataset.ordenarRelatorio ===
                campoOrdenacao
            ) {
                icone.className =
                    direcaoOrdenacao === "asc"
                        ? "fa-solid fa-sort-up"
                        : "fa-solid fa-sort-down";
            }
        });
}

// =====================================================
// PAGINAÇÃO
// =====================================================

function obterTotalPaginas() {
    return Math.max(
        1,
        Math.ceil(
            listaOrdenada.length /
            quantidadePorPagina
        )
    );
}

function obterPaginaAtual() {
    const inicio =
        (paginaAtual - 1) *
        quantidadePorPagina;

    return listaOrdenada.slice(
        inicio,
        inicio + quantidadePorPagina
    );
}

function renderizarPagina() {
    renderizarTabelaRelatorios(
        elementos.tabela,
        obterPaginaAtual()
    );

    atualizarPaginacao();
}

function irParaPagina(pagina) {
    paginaAtual = Math.min(
        Math.max(pagina, 1),
        obterTotalPaginas()
    );

    renderizarPagina();
}

function criarBotaoPagina(numero) {
    const botao = document.createElement("button");

    botao.type = "button";
    botao.className = "btn-paginacao";
    botao.textContent = numero;

    if (numero === paginaAtual) {
        botao.classList.add("ativo");
        botao.setAttribute("aria-current", "page");
    }

    botao.addEventListener(
        "click",
        () => irParaPagina(numero),
        { signal: controladorEventos.signal }
    );

    return botao;
}

function atualizarPaginacao() {
    const total = listaOrdenada.length;
    const totalPaginas = obterTotalPaginas();

    if (paginaAtual > totalPaginas) {
        paginaAtual = totalPaginas;
    }

    const inicio =
        total === 0
            ? 0
            : (
                (paginaAtual - 1) *
                quantidadePorPagina
            ) + 1;

    const fim = Math.min(
        paginaAtual * quantidadePorPagina,
        total
    );

    if (elementos.intervaloPaginacao) {
        elementos.intervaloPaginacao.textContent =
            total === 0
                ? "Nenhum registro encontrado"
                : `Exibindo ${inicio}–${fim} de ${total} registros`;
    }

    if (elementos.btnPrimeiraPagina) {
        elementos.btnPrimeiraPagina.disabled =
            paginaAtual <= 1 || total === 0;
    }

    if (elementos.btnPaginaAnterior) {
        elementos.btnPaginaAnterior.disabled =
            paginaAtual <= 1 || total === 0;
    }

    if (elementos.btnProximaPagina) {
        elementos.btnProximaPagina.disabled =
            paginaAtual >= totalPaginas ||
            total === 0;
    }

    if (elementos.btnUltimaPagina) {
        elementos.btnUltimaPagina.disabled =
            paginaAtual >= totalPaginas ||
            total === 0;
    }

    if (elementos.numerosPaginacao) {
        elementos.numerosPaginacao.innerHTML = "";

        if (total === 0) {
            return;
        }

        const inicioPaginas =
            Math.max(1, paginaAtual - 2);

        const fimPaginas =
            Math.min(
                totalPaginas,
                paginaAtual + 2
            );

        for (
            let numero = inicioPaginas;
            numero <= fimPaginas;
            numero += 1
        ) {
            elementos.numerosPaginacao.appendChild(
                criarBotaoPagina(numero)
            );
        }
    }
}

// =====================================================
// RESUMO
// =====================================================

function atualizarResumo() {
    const instituicoes = new Set(
        listaFiltrada
            .map(
                (beneficiario) =>
                    beneficiario.instituicaoId ??
                    beneficiario.instituicao?.id
            )
            .filter(
                (id) =>
                    id !== null &&
                    id !== undefined
            )
    );

    const ativos = listaFiltrada.filter(
        (beneficiario) =>
            Boolean(beneficiario.ativo)
    ).length;

    elementos.totalBeneficiarios.textContent =
        listaFiltrada.length;

    elementos.totalInstituicoes.textContent =
        instituicoes.size;

    if (elementos.totalAtivos) {
        elementos.totalAtivos.textContent = ativos;
    }

    if (elementos.totalInativos) {
        elementos.totalInativos.textContent =
            listaFiltrada.length - ativos;
    }

    if (elementos.quantidadeRegistros) {
        elementos.quantidadeRegistros.textContent =
            listaFiltrada.length === 1
                ? "1 registro encontrado"
                : `${listaFiltrada.length} registros encontrados`;
    }
}

function atualizarDescricaoFiltros() {
    if (!elementos.descricaoFiltros) {
        return;
    }

    const filtros = obterFiltros();
    const ativos = [];

    if (filtros.dataInicial) ativos.push("data inicial");
    if (filtros.dataFinal) ativos.push("data final");
    if (filtros.instituicaoId) ativos.push("instituição");
    if (filtros.tipoBeneficio) ativos.push("benefício");
    if (filtros.ativo) ativos.push("situação");
    if (filtros.pesquisa.trim()) ativos.push("pesquisa");

    elementos.descricaoFiltros.textContent =
        ativos.length === 0
            ? "Exibindo todos os registros disponíveis."
            : `${ativos.length} filtro(s) ativo(s).`;
}

// =====================================================
// GRÁFICOS
// =====================================================

function destruirGraficos() {
    if (graficoBeneficios) {
        graficoBeneficios.destroy();
        graficoBeneficios = null;
    }

    if (graficoInstituicoes) {
        graficoInstituicoes.destroy();
        graficoInstituicoes = null;
    }
}

function renderizarGraficos() {
    destruirGraficos();

    if (!window.Chart) {
        console.warn("Chart.js não foi carregado.");
        return;
    }

    const possuiDados = listaFiltrada.length > 0;

    if (elementos.vazioGraficoBeneficios) {
        elementos.vazioGraficoBeneficios.hidden =
            possuiDados;
    }

    if (elementos.vazioGraficoInstituicoes) {
        elementos.vazioGraficoInstituicoes.hidden =
            possuiDados;
    }

    if (!possuiDados) {
        return;
    }

    const beneficios = {
        CESTA: 0,
        GRANEL: 0,
        AMBOS: 0
    };

    const instituicoes = {};

    listaFiltrada.forEach((beneficiario) => {
        if (
            Object.hasOwn(
                beneficios,
                beneficiario.tipoBeneficio
            )
        ) {
            beneficios[
                beneficiario.tipoBeneficio
            ] += 1;
        }

        const nomeInstituicao =
            beneficiario.instituicao?.nome ??
            "Não informada";

        instituicoes[nomeInstituicao] =
            (instituicoes[nomeInstituicao] ?? 0) + 1;
    });

    if (elementos.graficoBeneficios) {
        graficoBeneficios = new window.Chart(
            elementos.graficoBeneficios,
            {
                type: "doughnut",
                data: {
                    labels: [
                        "Cesta",
                        "Granel",
                        "Ambos"
                    ],
                    datasets: [{
                        data: [
                            beneficios.CESTA,
                            beneficios.GRANEL,
                            beneficios.AMBOS
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: "bottom"
                        }
                    }
                }
            }
        );
    }

    if (elementos.graficoInstituicoes) {
        const entradas = Object.entries(
            instituicoes
        ).sort((a, b) => b[1] - a[1]);

        graficoInstituicoes = new window.Chart(
            elementos.graficoInstituicoes,
            {
                type: "bar",
                data: {
                    labels: entradas.map(
                        ([nome]) => nome
                    ),
                    datasets: [{
                        label: "Beneficiários",
                        data: entradas.map(
                            ([, total]) => total
                        )
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                precision: 0
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            }
        );
    }
}

// =====================================================
// ATUALIZAÇÃO DA TELA
// =====================================================

function atualizarTela() {
    ordenarLista();
    atualizarResumo();
    atualizarDescricaoFiltros();
    atualizarIconesOrdenacao();
    renderizarPagina();
    renderizarGraficos();
}

function aplicarFiltros() {
    const filtros = obterFiltros();

    if (!validarPeriodo(filtros)) {
        return;
    }

    listaFiltrada =
        filtrarRelatorios(
            listaBeneficiarios,
            filtros
        );

    paginaAtual = 1;
    atualizarTela();
}

function limparFiltros() {
    elementos.filtroDataInicial.value = "";
    elementos.filtroDataFinal.value = "";
    elementos.filtroInstituicao.value = "";
    elementos.filtroBeneficio.value = "";
    elementos.filtroAtivo.value = "";

    if (elementos.pesquisa) {
        elementos.pesquisa.value = "";
    }

    listaFiltrada = [...listaBeneficiarios];
    paginaAtual = 1;

    atualizarTela();

    exibirFeedback(
        "Filtros removidos com sucesso.",
        "sucesso"
    );
}

// =====================================================
// CARREGAMENTO DOS DADOS
// =====================================================

async function carregarInstituicoesFiltro() {
    const resposta =
        await listarInstituicoesRelatorio();

    const dados = await lerRespostaJSON(resposta);

    if (!resposta.ok) {
        throw new Error(
            obterMensagemErro(
                dados,
                "Erro ao carregar instituições."
            )
        );
    }

    const instituicoes = extrairLista(
        dados,
        ["instituicoes"]
    );

    elementos.filtroInstituicao.innerHTML = "";

    const opcaoTodas =
        document.createElement("option");

    opcaoTodas.value = "";
    opcaoTodas.textContent =
        "Todas as instituições";

    elementos.filtroInstituicao.appendChild(
        opcaoTodas
    );

    instituicoes
        .filter(
            (instituicao) =>
                instituicao &&
                instituicao.id !== undefined &&
                instituicao.id !== null
        )
        .sort((a, b) =>
            String(a.nome ?? "").localeCompare(
                String(b.nome ?? ""),
                "pt-BR",
                { sensitivity: "base" }
            )
        )
        .forEach((instituicao) => {
            const option =
                document.createElement("option");

            option.value = String(instituicao.id);
            option.textContent =
                instituicao.nome ??
                `Instituição ${instituicao.id}`;

            elementos.filtroInstituicao.appendChild(
                option
            );
        });
}

async function carregarBeneficiarios() {
    const resposta =
        await listarBeneficiariosRelatorio();

    const dados = await lerRespostaJSON(resposta);

    if (!resposta.ok) {
        throw new Error(
            obterMensagemErro(
                dados,
                "Erro ao carregar beneficiários."
            )
        );
    }

    listaBeneficiarios = extrairLista(
        dados,
        ["beneficiarios"]
    );

    listaFiltrada = [...listaBeneficiarios];
    paginaAtual = 1;

    atualizarTela();
}

async function atualizarDados() {
    mostrarLoading();

    if (elementos.btnAtualizar) {
        elementos.btnAtualizar.disabled = true;
    }

    try {
        await Promise.all([
            carregarBeneficiarios(),
            carregarInstituicoesFiltro()
        ]);

        exibirFeedback(
            "Relatório atualizado com sucesso.",
            "sucesso"
        );
    } catch (erro) {
        console.error(
            "Erro ao atualizar relatórios:",
            erro
        );

        mostrarErro(erro.message);

        if (elementos.tabela) {
            elementos.tabela.innerHTML = `
                <tr>
                    <td colspan="6">
                        <div class="estado-tabela estado-tabela-erro">
                            <i class="fa-solid fa-triangle-exclamation"></i>

                            <strong>
                                Não foi possível carregar o relatório
                            </strong>

                            <span>
                                ${escaparHTML(erro.message)}
                            </span>
                        </div>
                    </td>
                </tr>
            `;
        }
    } finally {
        if (elementos.btnAtualizar) {
            elementos.btnAtualizar.disabled = false;
        }

        esconderLoading();
    }
}

// =====================================================
// EXPORTAÇÃO E IMPRESSÃO
// =====================================================

function imprimirRelatorio() {
    if (!listaFiltrada.length) {
        mostrarAviso(
            "Não existem dados para imprimir."
        );

        return;
    }

    window.print();
}

// =====================================================
// EVENTOS
// =====================================================

function configurarEventos() {
    if (controladorEventos) {
        controladorEventos.abort();
    }

    controladorEventos =
        new AbortController();

    const opcoes = {
        signal: controladorEventos.signal
    };

    const camposFiltro = [
        elementos.filtroDataInicial,
        elementos.filtroDataFinal,
        elementos.filtroInstituicao,
        elementos.filtroBeneficio,
        elementos.filtroAtivo
    ];

    camposFiltro.forEach((campo) => {
        campo.addEventListener(
            "change",
            aplicarFiltros,
            opcoes
        );
    });

    elementos.pesquisa?.addEventListener(
        "input",
        aplicarFiltros,
        opcoes
    );

    elementos.btnAplicarFiltros?.addEventListener(
        "click",
        aplicarFiltros,
        opcoes
    );

    elementos.btnLimparFiltros.addEventListener(
        "click",
        limparFiltros,
        opcoes
    );

    elementos.btnAtualizar?.addEventListener(
        "click",
        atualizarDados,
        opcoes
    );

    elementos.btnCsv.addEventListener(
        "click",
        () => exportarRelatorioCSV(listaFiltrada),
        opcoes
    );

    elementos.btnExcel.addEventListener(
        "click",
        () => exportarRelatorioExcel(listaFiltrada),
        opcoes
    );

    elementos.btnPdf.addEventListener(
        "click",
        () => exportarRelatorioPDF(listaFiltrada),
        opcoes
    );

    elementos.btnImprimir?.addEventListener(
        "click",
        imprimirRelatorio,
        opcoes
    );

    elementos.quantidadePorPagina?.addEventListener(
        "change",
        () => {
            quantidadePorPagina =
                Number(
                    elementos.quantidadePorPagina.value
                ) || 10;

            paginaAtual = 1;
            renderizarPagina();
        },
        opcoes
    );

    elementos.btnPrimeiraPagina?.addEventListener(
        "click",
        () => irParaPagina(1),
        opcoes
    );

    elementos.btnPaginaAnterior?.addEventListener(
        "click",
        () => irParaPagina(paginaAtual - 1),
        opcoes
    );

    elementos.btnProximaPagina?.addEventListener(
        "click",
        () => irParaPagina(paginaAtual + 1),
        opcoes
    );

    elementos.btnUltimaPagina?.addEventListener(
        "click",
        () => irParaPagina(obterTotalPaginas()),
        opcoes
    );

    document
        .querySelectorAll("[data-ordenar-relatorio]")
        .forEach((cabecalho) => {
            cabecalho.addEventListener(
                "click",
                () => {
                    const campo =
                        cabecalho.dataset
                            .ordenarRelatorio;

                    if (campoOrdenacao === campo) {
                        direcaoOrdenacao =
                            direcaoOrdenacao === "asc"
                                ? "desc"
                                : "asc";
                    } else {
                        campoOrdenacao = campo;
                        direcaoOrdenacao = "asc";
                    }

                    paginaAtual = 1;
                    atualizarTela();
                },
                opcoes
            );
        });
}

// =====================================================
// INICIALIZAÇÃO
// =====================================================

export async function inicializarRelatorios() {
    try {
        listaBeneficiarios = [];
        listaFiltrada = [];
        listaOrdenada = [];

        paginaAtual = 1;
        quantidadePorPagina = 10;

        campoOrdenacao = "nomeCompleto";
        direcaoOrdenacao = "asc";

        capturarElementos();
        validarElementos();
        configurarEventos();

        await atualizarDados();
    } catch (erro) {
        console.error(
            "Erro ao inicializar Relatórios:",
            erro
        );

        mostrarErro(
            erro.message ||
            "Não foi possível inicializar a tela de Relatórios."
        );
    }
}
