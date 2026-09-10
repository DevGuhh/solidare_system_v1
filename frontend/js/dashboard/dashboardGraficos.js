// =====================================================
// INSTÂNCIAS DOS GRÁFICOS
// =====================================================

let graficoBeneficiarios =
    null;

let graficoTiposDoacoes =
    null;


// =====================================================
// VERIFICAR CHART.JS
// =====================================================

function validarChart() {

    if (
        typeof Chart ===
        "undefined"
    ) {

        console.error(
            "A biblioteca Chart.js não foi carregada."
        );

        return false;

    }

    return true;

}


// =====================================================
// DESTRUIR GRÁFICO ANTERIOR
// =====================================================

function destruirGrafico(
    grafico
) {

    if (!grafico) {
        return;
    }

    grafico.destroy();

}


// =====================================================
// CRIAR GRADIENTE
// =====================================================

function criarGradiente({

    contexto,

    corInicial,

    corFinal,

    altura = 320

}) {

    const gradiente =
        contexto.createLinearGradient(
            0,
            0,
            0,
            altura
        );


    gradiente.addColorStop(
        0,
        corInicial
    );


    gradiente.addColorStop(
        1,
        corFinal
    );


    return gradiente;

}


// =====================================================
// RENDERIZAR GRÁFICO DE BENEFICIÁRIOS
// =====================================================

export function renderizarGraficoBeneficiarios({

    canvas,

    ativos,

    inativos

}) {

    if (!canvas) {
        return;
    }


    if (!validarChart()) {
        return;
    }


    destruirGrafico(
        graficoBeneficiarios
    );


    const contexto =
        canvas.getContext(
            "2d"
        );


    const gradienteAtivos =
        criarGradiente({

            contexto,

            corInicial:
                "rgba(25, 135, 84, 0.95)",

            corFinal:
                "rgba(25, 135, 84, 0.30)"

        });


    const gradienteInativos =
        criarGradiente({

            contexto,

            corInicial:
                "rgba(220, 53, 69, 0.95)",

            corFinal:
                "rgba(220, 53, 69, 0.30)"

        });


    graficoBeneficiarios =
        new Chart(
            canvas,
            {

                type:
                    "bar",

                data: {

                    labels: [

                        "Ativos",

                        "Inativos"

                    ],

                    datasets: [

                        {

                            label:
                                "Beneficiários",

                            data: [

                                Number(ativos) || 0,

                                Number(inativos) || 0

                            ],

                            backgroundColor: [

                                gradienteAtivos,

                                gradienteInativos

                            ],

                            borderColor: [

                                "#198754",

                                "#dc3545"

                            ],

                            borderWidth:
                                1,

                            borderRadius:
                                14,

                            borderSkipped:
                                false,

                            maxBarThickness:
                                110

                        }

                    ]

                },

                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false,

                    animation: {

                        duration:
                            1000,

                        easing:
                            "easeOutQuart"

                    },

                    interaction: {

                        mode:
                            "index",

                        intersect:
                            false

                    },

                    plugins: {

                        legend: {

                            display:
                                false

                        },

                        tooltip: {

                            backgroundColor:
                                "rgba(33, 37, 41, 0.95)",

                            titleColor:
                                "#ffffff",

                            bodyColor:
                                "#ffffff",

                            padding:
                                14,

                            cornerRadius:
                                10,

                            callbacks: {

                                title(
                                    contextoTooltip
                                ) {

                                    const rotulo =
                                        contextoTooltip[0]
                                            .label;


                                    return (
                                        rotulo ===
                                        "Ativos"
                                            ? "Beneficiários ativos"
                                            : "Beneficiários inativos"
                                    );

                                },

                                label(
                                    contextoTooltip
                                ) {

                                    return (
                                        ` Total: ${contextoTooltip.raw}`
                                    );

                                }

                            }

                        }

                    },

                    scales: {

                        x: {

                            grid: {

                                display:
                                    false

                            },

                            border: {

                                display:
                                    false

                            },

                            ticks: {

                                color:
                                    "#667085",

                                font: {

                                    size:
                                        13,

                                    weight:
                                        "600"

                                }

                            }

                        },

                        y: {

                            beginAtZero:
                                true,

                            grace:
                                "10%",

                            border: {

                                display:
                                    false

                            },

                            grid: {

                                color:
                                    "rgba(15, 23, 42, 0.06)"

                            },

                            ticks: {

                                precision:
                                    0,

                                color:
                                    "#98a2b3",

                                padding:
                                    8

                            }

                        }

                    }

                }

            }
        );

}


// =====================================================
// CONTAR DOAÇÕES POR TIPO
// =====================================================

function contarDoacoesPorTipo(
    doacoes
) {

    const totais = {

        CESTA:
            0,

        OUTROS:
            0

    };


    const lista =
        Array.isArray(
            doacoes
        )
            ? doacoes
            : [];


    lista.forEach(
        (doacao) => {

            const tipo =
                String(
                    doacao?.tipo ??
                    ""
                )
                    .trim()
                    .toUpperCase();


            if (
                Object.prototype
                    .hasOwnProperty
                    .call(
                        totais,
                        tipo
                    )
            ) {

                totais[tipo]++;

            }

        }
    );


    return totais;

}


// =====================================================
// RENDERIZAR GRÁFICO DE TIPOS DE DOAÇÃO
// =====================================================

export function renderizarGraficoTiposDoacoes({

    canvas,

    doacoes

}) {

    if (!canvas) {
        return;
    }


    if (!validarChart()) {
        return;
    }


    destruirGrafico(
        graficoTiposDoacoes
    );


    const totais =
        contarDoacoesPorTipo(
            doacoes
        );


    graficoTiposDoacoes =
        new Chart(
            canvas,
            {

                type:
                    "doughnut",

                data: {

                    labels: [

                        "Cesta",

                        "Outros"

                    ],

                    datasets: [

                        {

                            label:
                                "Doações",

                            data: [

                                totais.CESTA,

                                totais.OUTROS

                            ],

                            backgroundColor: [

                                "#d97706",

                                "#2563eb",

                                "#7c3aed"

                            ],

                            borderColor:
                                "#ffffff",

                            borderWidth:
                                5,

                            hoverOffset:
                                8

                        }

                    ]

                },

                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false,

                    cutout:
                        "68%",

                    animation: {

                        duration:
                            1000,

                        easing:
                            "easeOutQuart"

                    },

                    plugins: {

                        legend: {

                            position:
                                "bottom",

                            labels: {

                                usePointStyle:
                                    true,

                                pointStyle:
                                    "circle",

                                padding:
                                    18,

                                color:
                                    "#667085",

                                font: {

                                    size:
                                        12,

                                    weight:
                                        "600"

                                }

                            }

                        },

                        tooltip: {

                            backgroundColor:
                                "rgba(33, 37, 41, 0.95)",

                            titleColor:
                                "#ffffff",

                            bodyColor:
                                "#ffffff",

                            padding:
                                14,

                            cornerRadius:
                                10,

                            callbacks: {

                                label(
                                    contextoTooltip
                                ) {

                                    const valor =
                                        Number(
                                            contextoTooltip.raw
                                        ) || 0;


                                    const total =
                                        contextoTooltip
                                            .dataset
                                            .data
                                            .reduce(
                                                (
                                                    acumulador,
                                                    item
                                                ) =>
                                                    acumulador +
                                                    (
                                                        Number(item) ||
                                                        0
                                                    ),
                                                0
                                            );


                                    const percentual =
                                        total > 0
                                            ? Math.round(
                                                (
                                                    valor /
                                                    total
                                                ) *
                                                100
                                            )
                                            : 0;


                                    return (
                                        ` ${contextoTooltip.label}: ${valor} (${percentual}%)`
                                    );

                                }

                            }

                        }

                    }

                },

                plugins: [

                    {

                        id:
                            "textoCentralDoacoes",

                        afterDraw(
                            chart
                        ) {

                            const {
                                ctx,
                                chartArea
                            } =
                                chart;


                            if (!chartArea) {
                                return;
                            }


                            const total =
                                chart
                                    .data
                                    .datasets[0]
                                    .data
                                    .reduce(
                                        (
                                            acumulador,
                                            item
                                        ) =>
                                            acumulador +
                                            (
                                                Number(item) ||
                                                0
                                            ),
                                        0
                                    );


                            const centroX =
                                (
                                    chartArea.left +
                                    chartArea.right
                                ) /
                                2;


                            const centroY =
                                (
                                    chartArea.top +
                                    chartArea.bottom
                                ) /
                                2;


                            ctx.save();


                            ctx.textAlign =
                                "center";


                            ctx.textBaseline =
                                "middle";


                            ctx.fillStyle =
                                "#1f2937";


                            ctx.font =
                                "700 25px Arial";


                            ctx.fillText(
                                String(total),
                                centroX,
                                centroY - 8
                            );


                            ctx.fillStyle =
                                "#98a2b3";


                            ctx.font =
                                "600 11px Arial";


                            ctx.fillText(
                                total === 1
                                    ? "doação"
                                    : "doações",
                                centroX,
                                centroY + 16
                            );


                            ctx.restore();

                        }

                    }

                ]

            }
        );

}


// =====================================================
// DESTRUIR TODOS OS GRÁFICOS
// =====================================================

export function destruirGraficosDashboard() {

    destruirGrafico(
        graficoBeneficiarios
    );


    destruirGrafico(
        graficoTiposDoacoes
    );


    graficoBeneficiarios =
        null;


    graficoTiposDoacoes =
        null;

}