import {
    listarBeneficiariosRelatorio,
    listarInstituicoesRelatorio,
    listarDoacoesRelatorio,
    listarSaldosRelatorio,
    obterSaldoInstituicaoRelatorio,
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
let usuarioRelatorio = null;

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

function obterUsuarioRelatorio() {
    try {
        return JSON.parse(
            sessionStorage.getItem("usuarioLogado") || "null"
        );
    } catch {
        return null;
    }
}

function perfilAtual() {
    return String(usuarioRelatorio?.role || "")
        .trim()
        .toUpperCase();
}

function usuarioInstituicao() {
    return perfilAtual() === "INSTITUICAO";
}


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
        AMBOS: 0,
        OUTROS: 0
    };

    filtrados.forEach((beneficiario) => {
        if (beneficios[beneficiario.tipoBeneficio] !== undefined) {
            beneficios[beneficiario.tipoBeneficio] += 1;
        }
    });

    const total = Object.values(beneficios)
        .reduce((soma, quantidade) => soma + quantidade, 0);

    $("perfilCestaResumo").textContent =
        `${formatarNumero(beneficios.CESTA)} • ${pct(beneficios.CESTA, total)}%`;

    $("perfilGranelResumo").textContent =
        `${formatarNumero(beneficios.GRANEL)} • ${pct(beneficios.GRANEL, total)}%`;

    $("perfilAmbosResumo").textContent =
        `${formatarNumero(beneficios.AMBOS)} • ${pct(beneficios.AMBOS, total)}%`;

    $("perfilTotalResumo").textContent =
        `${formatarNumero(total)} beneficiários`;

    criarGrafico("graficoRelatorioBeneficios", {
        type: "doughnut",
        data: {
            labels: ["Cesta", "Granel", "Ambos", "Outros"],
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
            cutout: "64%",
            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        boxWidth: 12,
                        padding: 14
                    }
                },
                tooltip: {
                    callbacks: {
                        label(context) {
                            const quantidade = num(context.raw);
                            const percentual = pct(quantidade, total);

                            return `${context.label}: ${formatarNumero(quantidade)} (${percentual}%)`;
                        }
                    }
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
    const filtros = filtrosAtuais();

    const instituicaoId = usuarioInstituicao()
        ? String(usuarioRelatorio.instituicaoId)
        : filtros.instituicaoId;

    const doacoesBase = dados.doacoes.filter((doacao) => {
        return (
            !instituicaoId ||
            String(doacao.instituicaoId) === instituicaoId
        );
    });

    const datasDisponiveis = doacoesBase
        .map((doacao) =>
            dataValida(doacao.dataDoacao || doacao.criadoEm)
        )
        .filter(Boolean)
        .sort((a, b) => a - b);

    let inicio = filtros.inicio
        ? new Date(`${filtros.inicio}T00:00:00`)
        : null;

    let fim = filtros.fim
        ? new Date(`${filtros.fim}T23:59:59`)
        : null;

    if (!inicio && datasDisponiveis.length) {
        inicio = new Date(datasDisponiveis[0]);
    }

    if (!fim && datasDisponiveis.length) {
        fim = new Date(
            datasDisponiveis[datasDisponiveis.length - 1]
        );
    }

    if (!inicio && !fim) {
        const anoAtual = new Date().getFullYear();

        inicio = new Date(anoAtual, 0, 1);
        fim = new Date(
            anoAtual,
            11,
            31,
            23,
            59,
            59
        );
    } else if (!inicio) {
        inicio = new Date(fim.getFullYear(), 0, 1);
    } else if (!fim) {
        fim = new Date(
            inicio.getFullYear(),
            11,
            31,
            23,
            59,
            59
        );
    }

    const anoInicial = inicio.getFullYear();
    const anoFinal = fim.getFullYear();
    const titulo = $("tituloGraficoEvolucao");

    /*
     * Quando o período está dentro de um único ano,
     * apresenta janeiro a dezembro daquele ano.
     */
    if (anoInicial === anoFinal) {
        const meses = Array.from(
            { length: 12 },
            (_, indice) => {
                const data = new Date(
                    anoInicial,
                    indice,
                    1
                );

                return {
                    key:
                        `${anoInicial}-${String(
                            indice + 1
                        ).padStart(2, "0")}`,
                    label: data
                        .toLocaleDateString(
                            "pt-BR",
                            { month: "short" }
                        )
                        .replace(".", "")
                };
            }
        );

        const acumulado = Object.fromEntries(
            meses.map((mes) => [
                mes.key,
                {
                    quantidade: 0,
                    itens: 0
                }
            ])
        );

        doacoesBase.forEach((doacao) => {
            const data = dataValida(
                doacao.dataDoacao || doacao.criadoEm
            );

            if (
                !data ||
                data < inicio ||
                data > fim ||
                data.getFullYear() !== anoInicial
            ) {
                return;
            }

            const chave =
                `${anoInicial}-${String(
                    data.getMonth() + 1
                ).padStart(2, "0")}`;

            acumulado[chave].quantidade += 1;
            acumulado[chave].itens +=
                num(doacao.quantidade);
        });

        if (titulo) {
            titulo.textContent =
                `Doações no ano de ${anoInicial}`;
        }

        criarGrafico("graficoEvolucaoDoacoes", {
            type: "line",
            data: {
                labels: meses.map(
                    (mes) => mes.label
                ),
                datasets: [
                    {
                        label: "Doações",
                        data: meses.map(
                            (mes) =>
                                acumulado[mes.key]
                                    .quantidade
                        ),
                        tension: 0.32,
                        fill: false
                    },
                    {
                        label: "Itens distribuídos",
                        data: meses.map(
                            (mes) =>
                                acumulado[mes.key]
                                    .itens
                        ),
                        tension: 0.32,
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
                plugins: {
                    legend: {
                        position: "bottom"
                    }
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

        return;
    }

    /*
     * Quando o filtro atravessa mais de um ano,
     * o gráfico compara os totais anuais.
     */
    const anos = [];

    for (
        let ano = anoInicial;
        ano <= anoFinal;
        ano += 1
    ) {
        anos.push(ano);
    }

    const acumuladoAnual = Object.fromEntries(
        anos.map((ano) => [
            ano,
            {
                quantidade: 0,
                itens: 0
            }
        ])
    );

    doacoesBase.forEach((doacao) => {
        const data = dataValida(
            doacao.dataDoacao || doacao.criadoEm
        );

        if (
            !data ||
            data < inicio ||
            data > fim
        ) {
            return;
        }

        const ano = data.getFullYear();

        if (!acumuladoAnual[ano]) {
            return;
        }

        acumuladoAnual[ano].quantidade += 1;
        acumuladoAnual[ano].itens +=
            num(doacao.quantidade);
    });

    if (titulo) {
        titulo.textContent =
            `Doações de ${anoInicial} a ${anoFinal}`;
    }

    criarGrafico("graficoEvolucaoDoacoes", {
        type: "bar",
        data: {
            labels: anos.map(String),
            datasets: [
                {
                    label: "Doações",
                    data: anos.map(
                        (ano) =>
                            acumuladoAnual[ano]
                                .quantidade
                    ),
                    borderWidth: 1
                },
                {
                    label: "Itens distribuídos",
                    data: anos.map(
                        (ano) =>
                            acumuladoAnual[ano]
                                .itens
                    ),
                    borderWidth: 1
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
            plugins: {
                legend: {
                    position: "bottom"
                }
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
    const campo = $("campoFiltroInstituicao");

    if (!select) return;

    if (usuarioInstituicao()) {
        const instituicao = dados.instituicoes[0];
        const nome = instituicao?.nome || "Sua instituição";

        select.innerHTML =
            `<option value="${usuarioRelatorio.instituicaoId}">${nome}</option>`;

        select.value = String(usuarioRelatorio.instituicaoId);
        select.disabled = true;

        if (campo) {
            campo.classList.add(
                "filtro-instituicao-bloqueado"
            );
        }

        return;
    }

    select.disabled = false;
    select.innerHTML =
        '<option value="">Todas as instituições</option>';

    dados.instituicoes.forEach((instituicao) => {
        const option = document.createElement("option");

        option.value = instituicao.id;
        option.textContent = instituicao.nome;

        select.appendChild(option);
    });
}

function aplicarMascaraData(valor) {
    const numeros = String(valor || "")
        .replace(/\D/g, "")
        .slice(0, 8);

    if (numeros.length <= 2) {
        return numeros;
    }

    if (numeros.length <= 4) {
        return `${numeros.slice(0, 2)}/${numeros.slice(2)}`;
    }

    return (
        `${numeros.slice(0, 2)}/` +
        `${numeros.slice(2, 4)}/` +
        numeros.slice(4, 8)
    );
}

function converterDataFiltroParaIso(valor) {
    const texto = String(valor || "").trim();

    if (!texto) {
        return "";
    }

    const partes = texto.split("/");

    if (
        partes.length !== 3 ||
        partes[0].length !== 2 ||
        partes[1].length !== 2 ||
        partes[2].length !== 4
    ) {
        return null;
    }

    const dia = Number(partes[0]);
    const mes = Number(partes[1]);
    const ano = Number(partes[2]);

    if (
        !Number.isInteger(dia) ||
        !Number.isInteger(mes) ||
        !Number.isInteger(ano) ||
        ano < 1 ||
        mes < 1 ||
        mes > 12 ||
        dia < 1 ||
        dia > 31
    ) {
        return null;
    }

    const data = new Date(ano, mes - 1, dia);

    if (
        data.getFullYear() !== ano ||
        data.getMonth() !== mes - 1 ||
        data.getDate() !== dia
    ) {
        return null;
    }

    return (
        `${String(ano).padStart(4, "0")}-` +
        `${String(mes).padStart(2, "0")}-` +
        `${String(dia).padStart(2, "0")}`
    );
}

function configurarCamposDataRelatorio(signal) {
    [
        $("filtroDataInicial"),
        $("filtroDataFinal")
    ].forEach((campo) => {
        if (!campo) return;

        campo.addEventListener(
            "input",
            (event) => {
                event.target.value =
                    aplicarMascaraData(event.target.value);
            },
            { signal }
        );

        campo.addEventListener(
            "paste",
            () => {
                window.setTimeout(() => {
                    campo.value =
                        aplicarMascaraData(campo.value);
                }, 0);
            },
            { signal }
        );
    });
}

function filtrosAtuais() {
    return {
        inicio: converterDataFiltroParaIso(
            $("filtroDataInicial").value
        ),
        fim: converterDataFiltroParaIso(
            $("filtroDataFinal").value
        ),
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
        $("filtroDataInicial").value &&
        filtros.inicio === null
    ) {
        mostrarAviso(
            "Informe a data inicial no formato dd/mm/aaaa."
        );
        return;
    }

    if (
        $("filtroDataFinal").value &&
        filtros.fim === null
    ) {
        mostrarAviso(
            "Informe a data final no formato dd/mm/aaaa."
        );
        return;
    }

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
    $("filtroInstituicao").value =
        usuarioInstituicao()
            ? String(usuarioRelatorio.instituicaoId)
            : "";
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

    const instituicoesAtivas = usuarioInstituicao()
        ? 1
        : dados.instituicoes.filter(
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
        usuarioInstituicao()
            ? 1
            : (
                filtroInstituicaoAtivo
                    ? instituicoesFiltradas.size
                    : dados.instituicoes.length
            )
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
// AJUSTES POR PERFIL
// =====================================================

function configurarVisaoPorPerfil() {
    const instituicao = usuarioInstituicao();

    const kpiPendencias = $("kpiDocumentosPendentes");
    const painelRanking = $("painelRankingInstituicoes");

    if (kpiPendencias) {
        kpiPendencias.hidden = instituicao;
    }

    if (painelRanking) {
        painelRanking.hidden = instituicao;
    }

    const heroTexto =
        document.querySelector(".relatorios-hero p");

    if (heroTexto && instituicao) {
        heroTexto.textContent =
            "Visão exclusiva dos beneficiários, entregas e estoque da sua instituição.";
    }
}

// =====================================================
// CARREGAMENTO DE DADOS
// =====================================================

async function carregarDados() {
    mostrarLoading("Carregando relatório...");

    try {
        if (usuarioInstituicao()) {
            const instituicaoId =
                Number(usuarioRelatorio?.instituicaoId);

            if (
                !Number.isInteger(instituicaoId) ||
                instituicaoId <= 0
            ) {
                throw new Error(
                    "Usuário de instituição sem instituição vinculada."
                );
            }

            /*
             * Segurança:
             * - /beneficiarios já é filtrado no backend por req.user.instituicaoId.
             * - /doacoes também é filtrado no backend.
             * - /saldo-cestas/:id valida se o id pertence ao usuário.
             *
             * A instituição não chama endpoints administrativos
             * de listagem geral.
             */
            const respostas = await Promise.all([
                listarBeneficiariosRelatorio(),
                listarDoacoesRelatorio(),
                obterSaldoInstituicaoRelatorio(instituicaoId)
            ]);

            const payloads = await Promise.all(
                respostas.map(
                    (resposta) => jsonSeguro(resposta)
                )
            );

            const indiceErro = respostas.findIndex(
                (resposta) => !resposta.ok
            );

            if (indiceErro >= 0) {
                throw new Error(
                    payloads[indiceErro]?.error ||
                    payloads[indiceErro]?.message ||
                    "Não foi possível carregar os dados da instituição."
                );
            }

            dados.beneficiarios = Array.isArray(payloads[0])
                ? payloads[0]
                : [];

            dados.doacoes = Array.isArray(payloads[1])
                ? payloads[1]
                : [];

            const nomeInstituicao =
                dados.beneficiarios[0]?.instituicao?.nome ||
                dados.doacoes[0]?.instituicao?.nome ||
                "Sua instituição";

            dados.instituicoes = [
                {
                    id: instituicaoId,
                    nome: nomeInstituicao,
                    ativa: true
                }
            ];

            const saldo = payloads[2] || {
                instituicaoId,
                saldoAtual: 0
            };

            dados.saldos = [
                {
                    ...saldo,
                    instituicao: {
                        id: instituicaoId,
                        nome: nomeInstituicao
                    }
                }
            ];

            dados.pendentes = [];
        } else {
            const respostas = await Promise.all([
                listarBeneficiariosRelatorio(),
                listarInstituicoesRelatorio(),
                listarDoacoesRelatorio(),
                listarSaldosRelatorio(),
                listarComprovantesPendentesRelatorio()
            ]);

            const payloads = await Promise.all(
                respostas.map(
                    (resposta) => jsonSeguro(resposta)
                )
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
        }

        filtrados = [...dados.beneficiarios];

        preencherInstituicoes();
        atualizarTudo();

        $("dataAtualizacaoRelatorio").textContent =
            new Date().toLocaleString("pt-BR", {
                dateStyle: "short",
                timeStyle: "short"
            });
    } catch (erro) {
        console.error(
            "Erro ao carregar relatórios:",
            erro
        );

        mostrarErro(
            erro.message ||
            "Erro ao carregar relatórios."
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

    configurarCamposDataRelatorio(signal);

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
    usuarioRelatorio = obterUsuarioRelatorio();

    destruirGraficos();
    configurarVisaoPorPerfil();
    configurarEventos();

    await carregarDados();
}
