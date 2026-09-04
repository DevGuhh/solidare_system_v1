// =====================================================
// ESCAPAR HTML
// =====================================================

function escaparHtml(
    valor
) {

    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


// =====================================================
// FORMATAR DATA
// =====================================================

function formatarData(
    valor
) {

    if (!valor) {
        return "-";
    }

    const data =
        new Date(valor);


    if (
        Number.isNaN(
            data.getTime()
        )
    ) {
        return "-";
    }


    return data.toLocaleDateString(
        "pt-BR",
        {

            day:
                "2-digit",

            month:
                "2-digit",

            year:
                "numeric"

        }
    );

}


// =====================================================
// VERIFICAR VALOR BOOLEANO
// =====================================================

function valorBooleano(
    valor
) {

    return (
        valor === true ||
        valor === 1 ||
        valor === "1" ||
        valor === "true"
    );

}


// =====================================================
// OBTER CLASSE DO TIPO
// =====================================================

function obterClasseTipo(
    tipo
) {

    switch (tipo) {

        case "CESTA":

            return "badge-doacao-cesta";


        case "GRANEL":

            return "badge-doacao-granel";


        case "AMBOS":

            return "badge-doacao-ambos";


        default:

            return "badge-doacao-neutro";

    }

}


// =====================================================
// OBTER TEXTO DO TIPO
// =====================================================

function obterTextoTipo(
    tipo
) {

    switch (tipo) {

        case "CESTA":

            return "Cesta";


        case "GRANEL":

            return "Granel";


        case "AMBOS":

            return "Ambos";


        default:

            return tipo || "-";

    }

}


// =====================================================
// RENDERIZAR BADGE DO TIPO
// =====================================================

function renderizarBadgeTipo(
    tipo
) {

    const classe =
        obterClasseTipo(
            tipo
        );


    const texto =
        escaparHtml(
            obterTextoTipo(
                tipo
            )
        );


    return `

        <span class="badge-doacao ${classe}">

            ${texto}

        </span>

    `;

}


// =====================================================
// RENDERIZAR ESTADO DO COMPROVANTE
// =====================================================

function renderizarStatusComprovante(
    comprovante
) {

    const possuiComprovante =
        valorBooleano(
            comprovante
        );


    if (possuiComprovante) {

        return `

            <span
                class="doacao-comprovante-status confirmado"
                title="Doação com comprovante"
            >

                <i
                    class="fa-solid fa-circle-check"
                    aria-hidden="true"
                ></i>

                Comprovado

            </span>

        `;

    }


    return `

        <span
            class="doacao-comprovante-status pendente"
            title="Doação sem comprovante"
        >

            <i
                class="fa-regular fa-circle-xmark"
                aria-hidden="true"
            ></i>

            Pendente

        </span>

    `;

}


// =====================================================
// RENDERIZAR ESTADO VAZIO
// =====================================================

function renderizarEstadoVazio(
    tabela
) {

    tabela.innerHTML = `

        <tr class="doacoes-linha-vazia">

            <td colspan="9">

                <div class="doacoes-empty">

                    <div
                        class="doacoes-empty-icon"
                        aria-hidden="true"
                    >

                        <i class="fa-solid fa-hand-holding-heart"></i>

                    </div>


                    <strong>

                        Nenhuma doação encontrada

                    </strong>


                    <span>

                        Cadastre uma nova doação ou altere os filtros da pesquisa.

                    </span>

                </div>

            </td>

        </tr>

    `;

}


// =====================================================
// RENDERIZAR TABELA DE DOAÇÕES
// =====================================================

export function renderizarTabelaDoacoes(

    tabela,

    doacoes

) {

    if (!tabela) {

        console.error(
            "A tabela de doações não foi encontrada."
        );

        return;

    }


    tabela.innerHTML =
        "";


    if (
        !Array.isArray(doacoes) ||
        doacoes.length === 0
    ) {

        renderizarEstadoVazio(
            tabela
        );

        return;

    }


    const linhas =
        doacoes
            .map(
                (doacao) => {

                    const id =
                        Number(
                            doacao?.id
                        ) || 0;


                    const codigo =
                        escaparHtml(
                            doacao?.codigo ||
                            "-"
                        );


                    const beneficiario =
                        escaparHtml(
                            doacao
                                ?.beneficiario
                                ?.nomeCompleto ||
                            "-"
                        );


                    const instituicao =
                        escaparHtml(
                            doacao
                                ?.instituicao
                                ?.nome ||
                            "-"
                        );


                    const quantidade =
                        Number(
                            doacao?.quantidade
                        ) || 0;


                    const data =
                        formatarData(
                            doacao?.dataDoacao
                        );

                    const cancelada = Boolean(doacao?.deletedAt || doacao?.canceladaEm);
                    const statusHtml = cancelada
                        ? '<span class="doacao-status cancelada"><i class="fa-solid fa-ban" aria-hidden="true"></i> Cancelada</span>'
                        : '<span class="doacao-status concluida"><i class="fa-solid fa-circle-check" aria-hidden="true"></i> Concluída</span>';
                    const origem = String(doacao?.origem || "MANUAL").toUpperCase();
                    const origemHtml = origem === "QR_CODE"
                        ? '<span class="doacao-origem qrcode"><i class="fa-solid fa-qrcode" aria-hidden="true"></i> QR Code</span>'
                        : '<span class="doacao-origem manual"><i class="fa-solid fa-hand" aria-hidden="true"></i> Manual</span>';


                    return `

                        <tr data-id-doacao="${id}" class="${cancelada ? 'doacao-linha-cancelada' : ''}">

                            <!-- =========================
                                 CÓDIGO E COMPROVANTE
                            ========================== -->

                            <td>

                                <div class="doacao-codigo-container">

                                    <strong class="doacao-codigo">

                                        ${codigo}

                                    </strong>


                                    ${renderizarStatusComprovante(
                                        doacao?.comprovante
                                    )}

                                </div>

                            </td>


                            <!-- =========================
                                 BENEFICIÁRIO
                            ========================== -->

                            <td>

                                <div class="doacao-pessoa">

                                    <div
                                        class="doacao-pessoa-avatar"
                                        aria-hidden="true"
                                    >

                                        <i class="fa-solid fa-user"></i>

                                    </div>


                                    <div class="doacao-pessoa-dados">

                                        <strong>

                                            ${beneficiario}

                                        </strong>


                                        <span>

                                            Beneficiário

                                        </span>

                                    </div>

                                </div>

                            </td>


                            <!-- =========================
                                 INSTITUIÇÃO
                            ========================== -->

                            <td>

                                <div class="doacao-instituicao">

                                    <i
                                        class="fa-solid fa-building"
                                        aria-hidden="true"
                                    ></i>


                                    <span>

                                        ${instituicao}

                                    </span>

                                </div>

                            </td>


                            <!-- =========================
                                 TIPO
                            ========================== -->

                            <td>

                                ${renderizarBadgeTipo(
                                    doacao?.tipo
                                )}

                            </td>


                            <!-- =========================
                                 QUANTIDADE
                            ========================== -->

                            <td>

                                <span class="doacao-quantidade">

                                    <i
                                        class="fa-solid fa-box"
                                        aria-hidden="true"
                                    ></i>


                                    ${quantidade}

                                </span>

                            </td>


                            <!-- ORIGEM -->
                            <td>${origemHtml}</td>


                            <!-- =========================
                                 DATA
                            ========================== -->

                            <td>

                                <span class="doacao-data">

                                    <i
                                        class="fa-regular fa-calendar"
                                        aria-hidden="true"
                                    ></i>


                                    ${data}

                                </span>

                            </td>


                            <!-- STATUS -->
                            <td>${statusHtml}</td>


                            <!-- =========================
                                 AÇÕES
                            ========================== -->

                            <td class="coluna-acoes">

                                <div class="doacoes-acoes-tabela">

                                    <!-- VISUALIZAR -->

                                    <button
                                        type="button"
                                        class="btn-acao-tabela btnVisualizarDoacao"
                                        data-id="${id}"
                                        title="Visualizar doação"
                                        aria-label="Visualizar a doação ${codigo}"
                                    >

                                        <i
                                            class="fa-solid fa-eye"
                                            aria-hidden="true"
                                        ></i>

                                    </button>


                                    <!--
                                        Doações concluídas são imutáveis.
                                        Correções devem ser feitas por cancelamento/estorno.
                                    -->

                                    <!-- CANCELAR -->

                                    ${cancelada ? "" : `<button
                                        type="button"
                                        class="btn-acao-tabela btnExcluirDoacao"
                                        data-id="${id}"
                                        title="Cancelar doação"
                                        aria-label="Cancelar a doação ${codigo}"
                                    >

                                        <i
                                            class="fa-solid fa-arrow-rotate-left"
                                            aria-hidden="true"
                                        ></i>

                                                                        </button>`}

                                </div>

                            </td>

                        </tr>

                    `;

                }
            )
            .join("");


    tabela.innerHTML =
        linhas;

}