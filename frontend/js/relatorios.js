import {
    listarBeneficiariosRelatorio,
    listarInstituicoesRelatorio,
    listarDoacoesRelatorio,
    listarSaldosRelatorio,
    listarComprovantesPendentesRelatorio
} from "./api/relatoriosApi.js";

import {
    renderizarTabelaRelatorios
} from "./relatorios/relatoriosTabela.js";

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

// =====================================================
// ESTADO DA PÁGINA
// =====================================================

let dados = {
    beneficiarios: [],
    instituicoes: [],
    doacoes: [],
    saldos: [],
    pendentes: []
};

let filtrados = [];
let paginaAtual = 1;
let porPagina = 10;
let graficos = {};
let abortador = null;

// =====================================================
// HELPERS
// =====================================================

const $ = (id) => document.getElementById(id);
const num = (valor) => Number(valor) || 0;

const pct = (valor, total) => {
    if (!total) return 0;
    return Math.round((valor / total) * 100);
};

const dataValida = (valor) => {
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? null : data;
};

const normalizar = (valor) =>
    String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

const formatarNumero = (valor) =>
    new Intl.NumberFormat("pt-BR").format(num(valor));

const formatarData = (valor) => {
    const data = dataValida(valor);
    return data ? data.toLocaleDateString("pt-BR") : "-";
};

async function jsonSeguro(resposta) {
    try {
        return await resposta.json();
    } catch {
        return null;
    }
}

// =====================================================
// GRÁFICOS
// =====================================================

function destruirGraficos() {
    Object.values(graficos).forEach((grafico) => {
        grafico?.destroy?.();
    });

    graficos = {};
}

function criarGrafico(id, configuracao) {
    if (!window.Chart) return;

    graficos[id]?.destroy?.();

    const canvas = $(id);
    if (!canvas) return;

    graficos[id] = new Chart(canvas, configuracao);
}

function atualizarGraficos() {
    atualizarGraficoBeneficios();
    atualizarGraficoInstituicoes();
    atualizarGraficoEstoque();
    atualizarGraficoEvolucaoDoacoes();
}

function atualizarGraficoBeneficios() {
    const beneficios = {
        CESTA: 0,
        GRANEL: 0,
        AMBOS: 0
    };

    filtrados.forEach((beneficiario) => {
        if (beneficios[beneficiario.tipoBeneficio] !== undefined) {
            beneficios[beneficiario.tipoBeneficio] += 1;
        }
    });

    criarGrafico("graficoRelatorioBeneficios", {
        type: "doughnut",
        data: {
            labels: ["Cesta", "Granel", "Ambos"],
            datasets: [
                {
                    data: Object.values(beneficios),
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "68%",
            plugins: {
                legend: {
                    position: "bottom"
                }
            }
        }
    });
}

function atualizarGraficoInstituicoes() {
    const porInstituicao = {};

    filtrados.forEach((beneficiario) => {
        const nome = beneficiario.instituicao?.nome || "Sem instituição";
        porInstituicao[nome] = (porInstituicao[nome] || 0) + 1;
    });

    const ranking = Object.entries(porInstituicao)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);

    criarGrafico("graficoRelatorioInstituicoes", {
        type: "bar",
        data: {
            labels: ranking.map(([nome]) => nome),
            datasets: [
                {
                    label: "Beneficiários",
                    data: ranking.map(([, quantidade]) => quantidade),
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: "y",
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

function atualizarGraficoEstoque() {
    const saldos = [...dados.saldos]
        .sort((a, b) => num(b.saldoAtual) - num(a.saldoAtual))
        .slice(0, 8);

    criarGrafico("graficoEstoqueInstituicoes", {
        type: "bar",
        data: {
            labels: saldos.map(
                (saldo) => saldo.instituicao?.nome || `#${saldo.instituicaoId}`
            ),
            datasets: [
                {
                    label: "Cestas",
                    data: saldos.map((saldo) => num(saldo.saldoAtual)),
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: "y",
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

function atualizarGraficoEvolucaoDoacoes() {
    const meses = [];
    const hoje = new Date();

    for (let i = 5; i >= 0; i -= 1) {
        const data = new Date(
            hoje.getFullYear(),
            hoje.getMonth() - i,
            1
        );

        meses.push({
            key: `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`,
            label: data.toLocaleDateString("pt-BR", {
                month: "short"
            })
        });
    }

    const acumulado = Object.fromEntries(
        meses.map((mes) => [mes.key, { quantidade: 0, itens: 0 }])
    );

    dados.doacoes.forEach((doacao) => {
        const data = dataValida(doacao.dataDoacao);
        if (!data) return;

        const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;

        if (!acumulado[chave]) return;

        acumulado[chave].quantidade += 1;
        acumulado[chave].itens += num(doacao.quantidade);
    });

    criarGrafico("graficoEvolucaoDoacoes", {
        type: "line",
        data: {
            labels: meses.map((mes) => mes.label),
            datasets: [
                {
                    label: "Doações",
                    data: meses.map((mes) => acumulado[mes.key].quantidade),
                    tension: 0.35,
                    fill: false
                },
                {
                    label: "Itens",
                    data: meses.map((mes) => acumulado[mes.key].itens),
                    tension: 0.35,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: "index",
                intersect: false
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

// =====================================================
// FILTROS
// =====================================================

function preencherInstituicoes() {
    const select = $("filtroInstituicao");
    if (!select) return;

    select.innerHTML = '<option value="">Todas as instituições</option>';

    dados.instituicoes.forEach((instituicao) => {
        const option = document.createElement("option");
        option.value = instituicao.id;
        option.textContent = instituicao.nome;
        select.appendChild(option);
    });
}

function filtrosAtuais() {
    return {
        inicio: $("filtroDataInicial").value,
        fim: $("filtroDataFinal").value,
        instituicaoId: $("filtroInstituicao").value,
        beneficio: $("filtroBeneficio").value,
        ativo: $("filtroAtivo").value,
        pesquisa: normalizar($("pesquisaRelatorio").value)
    };
}

function dentroPeriodo(valor, filtros) {
    if (!filtros.inicio && !filtros.fim) {
        return true;
    }

    const data = dataValida(valor);
    if (!data) return false;

    const dia = data.toISOString().slice(0, 10);

    return (
        (!filtros.inicio || dia >= filtros.inicio) &&
        (!filtros.fim || dia <= filtros.fim)
    );
}

function aplicarFiltros() {
    const filtros = filtrosAtuais();

    if (
        filtros.inicio &&
        filtros.fim &&
        filtros.inicio > filtros.fim
    ) {
        mostrarAviso(
            "A data inicial não pode ser maior que a data final."
        );
        return;
    }

    filtrados = dados.beneficiarios.filter((beneficiario) => {
        const texto = normalizar(
            `${beneficiario.nomeCompleto} ${beneficiario.cpf} ${beneficiario.instituicao?.nome || ""}`
        );

        return (
            dentroPeriodo(
                beneficiario.criadoEm || beneficiario.dataCadastro,
                filtros
            ) &&
            (
                !filtros.instituicaoId ||
                String(beneficiario.instituicaoId) === filtros.instituicaoId
            ) &&
            (
                !filtros.beneficio ||
                beneficiario.tipoBeneficio === filtros.beneficio
            ) &&
            (
                !filtros.ativo ||
                String(Boolean(beneficiario.ativo)) === filtros.ativo
            ) &&
            (!filtros.pesquisa || texto.includes(filtros.pesquisa))
        );
    });

    paginaAtual = 1;
    atualizarTudo();
}

function limparFiltros() {
    $("filtroDataInicial").value = "";
    $("filtroDataFinal").value = "";
    $("filtroInstituicao").value = "";
    $("filtroBeneficio").value = "";
    $("filtroAtivo").value = "";
    $("pesquisaRelatorio").value = "";

    filtrados = [...dados.beneficiarios];
    paginaAtual = 1;

    atualizarTudo();
}

function doacoesFiltradas() {
    const filtros = filtrosAtuais();

    return dados.doacoes.filter((doacao) => {
        return (
            dentroPeriodo(
                doacao.dataDoacao || doacao.criadoEm,
                filtros
            ) &&
            (
                !filtros.instituicaoId ||
                String(doacao.instituicaoId) === filtros.instituicaoId
            )
        );
    });
}

function atualizarDescricaoFiltros() {
    const filtros = filtrosAtuais();
    const partes = [];

    if (filtros.inicio || filtros.fim) {
        partes.push(
            `período ${filtros.inicio || "início"} até ${filtros.fim || "hoje"}`
        );
    }

    if (filtros.instituicaoId) {
        partes.push(
            $("filtroInstituicao").selectedOptions[0]?.textContent
        );
    }

    if (filtros.beneficio) {
        partes.push(`benefício ${filtros.beneficio.toLowerCase()}`);
    }

    if (filtros.ativo) {
        partes.push(
            filtros.ativo === "true" ? "ativos" : "inativos"
        );
    }

    $("descricaoFiltrosRelatorio").textContent = partes.length
        ? `Filtros aplicados: ${partes.join(" • ")}.`
        : "Exibindo todos os registros disponíveis.";
}

// =====================================================
// INDICADORES
// =====================================================

function atualizarKpis() {
    const total = filtrados.length;
    const ativos = filtrados.filter((beneficiario) => beneficiario.ativo).length;
    const inativos = total - ativos;

    const instituicoesFiltradas = new Set(
        filtrados
            .map((beneficiario) => beneficiario.instituicaoId)
            .filter(Boolean)
    );

    const instituicoesAtivas = dados.instituicoes.filter(
        (instituicao) => instituicao.ativa
    ).length;

    const doacoes = doacoesFiltradas();

    const itens = doacoes.reduce(
        (soma, doacao) => soma + num(doacao.quantidade),
        0
    );

    const saldoTotal = dados.saldos.reduce(
        (soma, saldo) => soma + num(saldo.saldoAtual),
        0
    );

    const instituicoesComEstoque = dados.saldos.filter(
        (saldo) => num(saldo.saldoAtual) > 0
    ).length;

    const pessoasAlcancadas = filtrados.reduce(
        (soma, beneficiario) =>
            soma + num(beneficiario.composicaoFamiliar || 1),
        0
    );

    const agora = new Date();
    const inicioMes = new Date(
        agora.getFullYear(),
        agora.getMonth(),
        1
    );

    const atendidosMes = new Set(
        dados.doacoes
            .filter((doacao) => {
                const data = dataValida(doacao.dataDoacao);
                return data && data >= inicioMes;
            })
            .map((doacao) => doacao.beneficiarioId)
    ).size;

    const baseAtivos = dados.beneficiarios.filter(
        (beneficiario) => beneficiario.ativo
    ).length;

    const filtroInstituicaoAtivo = filtrosAtuais().instituicaoId;

    $("totalRelatorioBeneficiarios").textContent = formatarNumero(total);
    $("resumoBeneficiariosAtivos").textContent = `${formatarNumero(ativos)} ativos`;

    $("totalRelatorioInstituicoes").textContent = formatarNumero(
        filtroInstituicaoAtivo
            ? instituicoesFiltradas.size
            : dados.instituicoes.length
    );

    $("resumoInstituicoesAtivas").textContent =
        `${formatarNumero(instituicoesAtivas)} ativas`;

    $("totalRelatorioDoacoes").textContent = formatarNumero(doacoes.length);
    $("totalItensDistribuidos").textContent =
        `${formatarNumero(itens)} itens distribuídos`;

    $("saldoTotalCestas").textContent = formatarNumero(saldoTotal);
    $("instituicoesComEstoque").textContent =
        `${formatarNumero(instituicoesComEstoque)} instituições com estoque`;

    $("taxaCoberturaMes").textContent =
        `${pct(atendidosMes, baseAtivos)}%`;

    $("totalDocumentosPendentes").textContent =
        formatarNumero(dados.pendentes.length);

    $("pessoasAlcancadas").textContent =
        formatarNumero(pessoasAlcancadas);

    $("totalRelatorioInativos").textContent = formatarNumero(inativos);
    $("percentualInativos").textContent =
        `${pct(inativos, total)}% do total`;
}

// =====================================================
// LISTAS OPERACIONAIS
// =====================================================

function atualizarListas() {
    atualizarResumoInstituicoes();
    atualizarUltimasDoacoes();
}

function atualizarResumoInstituicoes() {
    const container = $("listaResumoInstituicoes");
    if (!container) return;

    const linhas = dados.instituicoes
        .map((instituicao) => {
            const beneficiarios = dados.beneficiarios.filter(
                (beneficiario) =>
                    beneficiario.instituicaoId === instituicao.id
            ).length;

            const doacoes = dados.doacoes.filter(
                (doacao) => doacao.instituicaoId === instituicao.id
            ).length;

            const saldo = dados.saldos.find(
                (item) => item.instituicaoId === instituicao.id
            )?.saldoAtual || 0;

            return {
                instituicao,
                beneficiarios,
                doacoes,
                saldo
            };
        })
        .sort((a, b) => b.beneficiarios - a.beneficiarios)
        .slice(0, 6);

    if (!linhas.length) {
        container.innerHTML =
            '<div class="estado-resumo">Sem instituições para exibir.</div>';
        return;
    }

    container.innerHTML = linhas
        .map((item) => `
            <div class="linha-resumo-relatorio">
                <span class="linha-resumo-icone">
                    <i class="fa-solid fa-building"></i>
                </span>

                <div class="linha-resumo-info">
                    <strong>${item.instituicao.nome}</strong>
                    <small>
                        ${item.beneficiarios} beneficiários •
                        ${item.doacoes} doações
                    </small>
                </div>

                <div class="linha-resumo-valor">
                    <strong>${formatarNumero(item.saldo)}</strong>
                    <small>cestas</small>
                </div>
            </div>
        `)
        .join("");
}

function atualizarUltimasDoacoes() {
    const container = $("listaUltimasDoacoes");
    if (!container) return;

    const doacoes = [...dados.doacoes]
        .sort(
            (a, b) =>
                new Date(b.dataDoacao) - new Date(a.dataDoacao)
        )
        .slice(0, 6);

    if (!doacoes.length) {
        container.innerHTML =
            '<div class="estado-resumo">Nenhuma doação registrada.</div>';
        return;
    }

    container.innerHTML = doacoes
        .map((doacao) => `
            <div class="linha-resumo-relatorio">
                <span class="linha-resumo-icone">
                    <i class="fa-solid fa-hand-holding-heart"></i>
                </span>

                <div class="linha-resumo-info">
                    <strong>
                        ${doacao.beneficiario?.nomeCompleto || "Beneficiário"}
                    </strong>
                    <small>
                        ${doacao.instituicao?.nome || "Instituição"} •
                        ${formatarData(doacao.dataDoacao)}
                    </small>
                </div>

                <div class="linha-resumo-valor">
                    <strong>${formatarNumero(doacao.quantidade)}</strong>
                    <small>${doacao.tipo || "item"}</small>
                </div>
            </div>
        `)
        .join("");
}

// =====================================================
// TABELA E PAGINAÇÃO
// =====================================================

function atualizarTabela() {
    const total = filtrados.length;
    const totalPaginas = Math.max(
        1,
        Math.ceil(total / porPagina)
    );

    paginaAtual = Math.min(paginaAtual, totalPaginas);

    const inicio = (paginaAtual - 1) * porPagina;
    const fim = Math.min(inicio + porPagina, total);

    renderizarTabelaRelatorios(
        $("tabelaRelatorios"),
        filtrados.slice(inicio, fim)
    );

    $("quantidadeRegistrosRelatorio").textContent =
        `${formatarNumero(total)} registros encontrados`;

    $("intervaloPaginacaoRelatorio").textContent = total
        ? `${inicio + 1}–${fim} de ${total}`
        : "0–0 de 0";

    atualizarNumerosPaginacao(totalPaginas);
    atualizarBotoesPaginacao(totalPaginas);
}

function atualizarNumerosPaginacao(totalPaginas) {
    const container = $("numerosPaginacaoRelatorio");
    container.innerHTML = "";

    const inicio = Math.max(1, paginaAtual - 2);
    const fim = Math.min(totalPaginas, paginaAtual + 2);

    for (let pagina = inicio; pagina <= fim; pagina += 1) {
        const botao = document.createElement("button");

        botao.type = "button";
        botao.textContent = pagina;
        botao.className = pagina === paginaAtual ? "ativo" : "";

        botao.addEventListener("click", () => {
            paginaAtual = pagina;
            atualizarTabela();
        });

        container.appendChild(botao);
    }
}

function atualizarBotoesPaginacao(totalPaginas) {
    const primeiraPagina = paginaAtual === 1;
    const ultimaPagina = paginaAtual === totalPaginas;

    $("btnPrimeiraPaginaRelatorio").disabled = primeiraPagina;
    $("btnPaginaAnteriorRelatorio").disabled = primeiraPagina;
    $("btnProximaPaginaRelatorio").disabled = ultimaPagina;
    $("btnUltimaPaginaRelatorio").disabled = ultimaPagina;
}

// =====================================================
// ATUALIZAÇÃO GERAL DA TELA
// =====================================================

function atualizarTudo() {
    atualizarKpis();
    atualizarGraficos();
    atualizarListas();
    atualizarTabela();
    atualizarDescricaoFiltros();
}

// =====================================================
// CARREGAMENTO DE DADOS
// =====================================================

async function carregarDados() {
    mostrarLoading("Carregando relatório...");

    try {
        const respostas = await Promise.all([
            listarBeneficiariosRelatorio(),
            listarInstituicoesRelatorio(),
            listarDoacoesRelatorio(),
            listarSaldosRelatorio(),
            listarComprovantesPendentesRelatorio()
        ]);

        const payloads = await Promise.all(
            respostas.map((resposta) => jsonSeguro(resposta))
        );

        const indiceErro = respostas.findIndex(
            (resposta) => !resposta.ok
        );

        if (indiceErro >= 0) {
            throw new Error(
                payloads[indiceErro]?.error ||
                payloads[indiceErro]?.message ||
                "Não foi possível carregar os dados."
            );
        }

        dados.beneficiarios = Array.isArray(payloads[0])
            ? payloads[0]
            : [];

        dados.instituicoes = Array.isArray(payloads[1])
            ? payloads[1]
            : payloads[1]?.dados || [];

        dados.doacoes = Array.isArray(payloads[2])
            ? payloads[2]
            : [];

        dados.saldos = Array.isArray(payloads[3])
            ? payloads[3]
            : [];

        dados.pendentes = Array.isArray(payloads[4])
            ? payloads[4]
            : [];

        filtrados = [...dados.beneficiarios];

        preencherInstituicoes();
        atualizarTudo();

        $("dataAtualizacaoRelatorio").textContent =
            new Date().toLocaleString("pt-BR", {
                dateStyle: "short",
                timeStyle: "short"
            });
    } catch (erro) {
        console.error("Erro ao carregar relatórios:", erro);
        mostrarErro(
            erro.message || "Erro ao carregar relatórios."
        );
    } finally {
        esconderLoading();
    }
}

// =====================================================
// EVENTOS
// =====================================================

function configurarEventos() {
    abortador?.abort();
    abortador = new AbortController();

    const { signal } = abortador;

    $("btnAtualizarRelatorio").addEventListener(
        "click",
        carregarDados,
        { signal }
    );

    $("btnAplicarFiltrosRelatorio").addEventListener(
        "click",
        aplicarFiltros,
        { signal }
    );

    $("btnLimparFiltros").addEventListener(
        "click",
        limparFiltros,
        { signal }
    );

    $("pesquisaRelatorio").addEventListener(
        "input",
        () => {
            clearTimeout(window.__relatorioBusca);

            window.__relatorioBusca = setTimeout(
                aplicarFiltros,
                250
            );
        },
        { signal }
    );

    $("quantidadePorPaginaRelatorio").addEventListener(
        "change",
        (event) => {
            porPagina = num(event.target.value) || 10;
            paginaAtual = 1;
            atualizarTabela();
        },
        { signal }
    );

    $("btnPrimeiraPaginaRelatorio").addEventListener(
        "click",
        () => {
            paginaAtual = 1;
            atualizarTabela();
        },
        { signal }
    );

    $("btnPaginaAnteriorRelatorio").addEventListener(
        "click",
        () => {
            paginaAtual = Math.max(1, paginaAtual - 1);
            atualizarTabela();
        },
        { signal }
    );

    $("btnProximaPaginaRelatorio").addEventListener(
        "click",
        () => {
            paginaAtual += 1;
            atualizarTabela();
        },
        { signal }
    );

    $("btnUltimaPaginaRelatorio").addEventListener(
        "click",
        () => {
            paginaAtual = Math.max(
                1,
                Math.ceil(filtrados.length / porPagina)
            );
            atualizarTabela();
        },
        { signal }
    );

    $("btnCsv").addEventListener(
        "click",
        () => exportarRelatorioCSV(filtrados),
        { signal }
    );

    $("btnExcel").addEventListener(
        "click",
        () => exportarRelatorioExcel(filtrados),
        { signal }
    );

    $("btnPdf").addEventListener(
        "click",
        () => exportarRelatorioPDF(filtrados),
        { signal }
    );

    $("btnImprimirRelatorio").addEventListener(
        "click",
        () => window.print(),
        { signal }
    );
}

// =====================================================
// INICIALIZAÇÃO
// =====================================================

export async function inicializarRelatorios() {
    destruirGraficos();
    configurarEventos();
    await carregarDados();
}
