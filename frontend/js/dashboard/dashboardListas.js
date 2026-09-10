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
        new Date(
            valor
        );


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
// FORMATAR TIPO DA DOAÇÃO
// =====================================================

function formatarTipoDoacao(
    tipo
) {

    const tipos = {

        CESTA:
            "Cesta",

        OUTROS:
            "Outros"

    };


    return (
        tipos[
            String(
                tipo ??
                ""
            )
                .trim()
                .toUpperCase()
        ] ||
        "Não informado"
    );

}


// =====================================================
// OBTER CLASSE DO TIPO
// =====================================================

function obterClasseTipoDoacao(
    tipo
) {

    switch (
        String(
            tipo ??
            ""
        )
            .trim()
            .toUpperCase()
    ) {

        case "CESTA":

            return "cesta";



        default:

            return "neutro";

    }

}


// =====================================================
// ORDENAR POR DATA DECRESCENTE
// =====================================================

function ordenarMaisRecentes(

    lista,

    camposData

) {

    const dados =
        Array.isArray(
            lista
        )
            ? [...lista]
            : [];


    return dados.sort(
        (
            itemA,
            itemB
        ) => {

            const valorA =
                camposData
                    .map(
                        (campo) =>
                            itemA?.[campo]
                    )
                    .find(Boolean);


            const valorB =
                camposData
                    .map(
                        (campo) =>
                            itemB?.[campo]
                    )
                    .find(Boolean);


            const dataA =
                new Date(
                    valorA ||
                    0
                );


            const dataB =
                new Date(
                    valorB ||
                    0
                );


            return (
                dataB.getTime() -
                dataA.getTime()
            );

        }
    );

}


// =====================================================
// RENDERIZAR ESTADO VAZIO
// =====================================================

function renderizarVazio({

    elemento,

    mensagem

}) {

    if (!elemento) {
        return;
    }


    elemento.innerHTML = `

        <div class="dashboard-empty">

            <i
                class="fa-regular fa-folder-open"
                aria-hidden="true"
            ></i>

            <span>
                ${escaparHtml(mensagem)}
            </span>

        </div>

    `;

}


// =====================================================
// RENDERIZAR ÚLTIMOS BENEFICIÁRIOS
// =====================================================

export function renderizarUltimosBeneficiarios({

    elemento,

    beneficiarios,

    limite = 5

}) {

    if (!elemento) {
        return;
    }


    const lista =
        ordenarMaisRecentes(
            beneficiarios,
            [
                "criadoEm",
                "dataCadastro",
                "atualizadoEm"
            ]
        )
            .slice(
                0,
                limite
            );


    if (
        lista.length ===
        0
    ) {

        renderizarVazio({

            elemento,

            mensagem:
                "Nenhum beneficiário cadastrado."

        });


        return;

    }


    elemento.innerHTML =
        lista
            .map(
                (
                    beneficiario,
                    indice
                ) => {

                    const nome =
                        escaparHtml(
                            beneficiario
                                ?.nomeCompleto ||
                            "Nome não informado"
                        );


                    const instituicao =
                        escaparHtml(
                            beneficiario
                                ?.instituicao
                                ?.nome ||
                            "Instituição não informada"
                        );


                    const data =
                        formatarData(

                            beneficiario
                                ?.criadoEm ||

                            beneficiario
                                ?.dataCadastro ||

                            beneficiario
                                ?.atualizadoEm

                        );


                    return `

                        <div class="dashboard-recent-item">

                            <div class="dashboard-recent-icon">

                                <i
                                    class="fa-solid fa-user"
                                    aria-hidden="true"
                                ></i>

                            </div>


                            <div class="dashboard-recent-content">

                                <div class="dashboard-recent-main">

                                    <strong>
                                        ${nome}
                                    </strong>

                                    <span>
                                        ${instituicao}
                                    </span>

                                </div>


                                <div class="dashboard-recent-meta">

                                    <span>
                                        ${data}
                                    </span>

                                    <small>
                                        #${Number(beneficiario?.id) || indice + 1}
                                    </small>

                                </div>

                            </div>

                        </div>

                    `;

                }
            )
            .join("");

}


// =====================================================
// RENDERIZAR ÚLTIMAS DOAÇÕES
// =====================================================

export function renderizarUltimasDoacoes({

    elemento,

    doacoes,

    limite = 5

}) {

    if (!elemento) {
        return;
    }


    const lista =
        ordenarMaisRecentes(
            doacoes,
            [
                "dataDoacao",
                "criadoEm",
                "atualizadoEm"
            ]
        )
            .slice(
                0,
                limite
            );


    if (
        lista.length ===
        0
    ) {

        renderizarVazio({

            elemento,

            mensagem:
                "Nenhuma doação registrada."

        });


        return;

    }


    elemento.innerHTML =
        lista
            .map(
                (
                    doacao,
                    indice
                ) => {

                    const codigo =
                        escaparHtml(
                            doacao?.codigo ||
                            `Doação #${Number(doacao?.id) || indice + 1}`
                        );


                    const beneficiario =
                        escaparHtml(
                            doacao
                                ?.beneficiario
                                ?.nomeCompleto ||
                            "Beneficiário não informado"
                        );


                    const instituicao =
                        escaparHtml(
                            doacao
                                ?.instituicao
                                ?.nome ||
                            "Instituição não informada"
                        );


                    const tipo =
                        formatarTipoDoacao(
                            doacao?.tipo
                        );


                    const classeTipo =
                        obterClasseTipoDoacao(
                            doacao?.tipo
                        );


                    const quantidade =
                        Number(
                            doacao?.quantidade
                        ) || 0;


                    const data =
                        formatarData(
                            doacao
                                ?.dataDoacao ||
                            doacao
                                ?.criadoEm
                        );


                    const comprovante =
                        doacao?.comprovante === true ||
                        doacao?.comprovante === 1 ||
                        doacao?.comprovante === "1" ||
                        doacao?.comprovante === "true";


                    return `

                        <div class="dashboard-recent-item dashboard-recent-doacao">

                            <div class="dashboard-recent-icon">

                                <i
                                    class="fa-solid fa-hand-holding-heart"
                                    aria-hidden="true"
                                ></i>

                            </div>


                            <div class="dashboard-recent-content">

                                <div class="dashboard-recent-main">

                                    <div class="dashboard-recent-title-row">

                                        <strong>
                                            ${codigo}
                                        </strong>


                                        <span class="dashboard-doacao-tipo ${classeTipo}">
                                            ${escaparHtml(tipo)}
                                        </span>

                                    </div>


                                    <span>
                                        ${beneficiario}
                                    </span>


                                    <small>
                                        ${instituicao}
                                    </small>

                                </div>


                                <div class="dashboard-recent-meta">

                                    <span>
                                        ${data}
                                    </span>


                                    <small>
                                        ${quantidade}
                                        ${
                                            quantidade === 1
                                                ? "item"
                                                : "itens"
                                        }
                                    </small>


                                    <span
                                        class="dashboard-comprovante-status ${
                                            comprovante
                                                ? "confirmado"
                                                : "pendente"
                                        }"
                                    >

                                        <i
                                            class="${
                                                comprovante
                                                    ? "fa-solid fa-circle-check"
                                                    : "fa-regular fa-clock"
                                            }"
                                            aria-hidden="true"
                                        ></i>

                                        ${
                                            comprovante
                                                ? "Comprovado"
                                                : "Pendente"
                                        }

                                    </span>

                                </div>

                            </div>

                        </div>

                    `;

                }
            )
            .join("");

}