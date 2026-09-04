// =====================================================
// NORMALIZAR LISTA RECEBIDA DA API
// =====================================================

export function normalizarListaDoacoes(
    dados
) {

    if (Array.isArray(dados)) {
        return dados;
    }

    if (
        Array.isArray(
            dados?.doacoes
        )
    ) {
        return dados.doacoes;
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
            dados?.data?.doacoes
        )
    ) {
        return dados.data.doacoes;
    }

    console.warn(
        "Formato inesperado da lista de doações:",
        dados
    );

    return [];

}


// =====================================================
// NORMALIZAR TEXTO
// =====================================================

function normalizarTexto(
    valor
) {

    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

}


// =====================================================
// OBTER VALOR PARA ORDENAÇÃO
// =====================================================

function obterValorOrdenacao(
    doacao,
    campo
) {

    switch (campo) {

        case "id":

            return Number(
                doacao?.id
            ) || 0;


        case "quantidade":

            return Number(
                doacao?.quantidade
            ) || 0;


        case "dataDoacao": {

            const data =
                new Date(
                    doacao?.dataDoacao
                );

            return Number.isNaN(
                data.getTime()
            )
                ? 0
                : data.getTime();

        }


        case "beneficiario":

            return normalizarTexto(
                doacao
                    ?.beneficiario
                    ?.nomeCompleto
            );


        case "instituicao":

            return normalizarTexto(
                doacao
                    ?.instituicao
                    ?.nome
            );


        case "codigo":

        case "tipo":

        case "origem":

            return normalizarTexto(
                doacao?.[campo]
            );


        default:

            return normalizarTexto(
                doacao?.[campo]
            );

    }

}


// =====================================================
// ORDENAR DOAÇÕES
// =====================================================

export function ordenarDoacoes(

    lista,

    campoOrdenacao,

    direcaoOrdenacao

) {

    if (!Array.isArray(lista)) {
        return [];
    }

    const listaOrdenada =
        [...lista];

    listaOrdenada.sort(
        (doacaoA, doacaoB) => {

            const valorA =
                obterValorOrdenacao(
                    doacaoA,
                    campoOrdenacao
                );

            const valorB =
                obterValorOrdenacao(
                    doacaoB,
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
                "desc"
                    ? comparacao * -1
                    : comparacao;

        }
    );

    return listaOrdenada;

}


// =====================================================
// ATUALIZAR CONTADORES
// =====================================================

export function atualizarContadoresDoacoes(

    elementos,

    lista

) {

    const historico =
        Array.isArray(lista)
            ? lista
            : [];

    const doacoes = historico.filter(
        (doacao) => !doacao?.deletedAt && !doacao?.canceladaEm
    );

    const total =
        historico.length;

    const totalCesta =
        doacoes.filter(
            (doacao) =>
                doacao?.tipo === "CESTA"
        ).length;

    const totalGranel =
        doacoes.filter(
            (doacao) =>
                doacao?.tipo === "GRANEL"
        ).length;

    const totalAmbos =
        doacoes.filter(
            (doacao) =>
                doacao?.tipo === "AMBOS"
        ).length;


    if (elementos.contadorTodas) {

        elementos.contadorTodas.textContent =
            String(total);

    }


    if (elementos.contadorCesta) {

        elementos.contadorCesta.textContent =
            String(totalCesta);

    }


    if (elementos.contadorGranel) {

        elementos.contadorGranel.textContent =
            String(totalGranel);

    }


    if (elementos.contadorAmbos) {

        elementos.contadorAmbos.textContent =
            String(totalAmbos);

    }

}


// =====================================================
// ATUALIZAR FILTROS VISUAIS
// =====================================================

export function atualizarBotoesFiltroDoacoes(

    elementos,

    estado

) {

    elementos.filtros.forEach(
        (botao) => {

            const filtro =
                botao.dataset
                    .filtroDoacao;

            const selecionado =
                filtro ===
                estado.filtroAtual;

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
// ATUALIZAR BOTÃO LIMPAR PESQUISA
// =====================================================

export function atualizarBotaoLimparPesquisaDoacoes(
    elementos
) {

    const possuiPesquisa =
        elementos.pesquisa.value
            .trim()
            .length > 0;

    elementos.btnLimparPesquisa.hidden =
        !possuiPesquisa;

}


// =====================================================
// ATUALIZAR TEXTO DE RESULTADOS
// =====================================================

export function atualizarTextoResultadoDoacoes(

    elementos,

    quantidade

) {

    const texto =
        quantidade === 1
            ? "doação"
            : "doações";

    elementos.resultadoFiltro.textContent =
        `Exibindo ${quantidade} ${texto}`;

}


// =====================================================
// ATUALIZAR ORDENAÇÃO VISUAL
// =====================================================

export function atualizarBotoesOrdenacaoDoacoes(

    elementos,

    estado

) {

    elementos.botoesOrdenacao.forEach(
        (botao) => {

            const campo =
                botao.dataset
                    .ordenarDoacao;

            const ativo =
                campo ===
                estado.campoOrdenacao;

            botao.classList.toggle(
                "ordenacao-ativa",
                ativo
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

            if (!ativo) {

                icone.classList.add(
                    "fa-sort"
                );

                botao.removeAttribute(
                    "aria-sort"
                );

                return;

            }

            botao.dataset.direcao =
                estado.direcaoOrdenacao;

            if (
                estado.direcaoOrdenacao ===
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
// CALCULAR TOTAL DE PÁGINAS
// =====================================================

export function calcularTotalPaginasDoacoes(

    quantidadeRegistros,

    itensPorPagina

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
// RENDERIZAR NÚMEROS DA PAGINAÇÃO
// =====================================================

function renderizarNumerosPaginacaoDoacoes(

    elementos,

    estado,

    totalPaginas

) {

    elementos.numerosPaginacao.innerHTML =
        "";

    let inicio =
        Math.max(
            1,
            estado.paginaAtual - 2
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

        botao.dataset.paginaDoacao =
            String(numero);

        botao.setAttribute(
            "aria-label",
            `Ir para a página ${numero}`
        );

        if (
            numero ===
            estado.paginaAtual
        ) {

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
// ATUALIZAR PAGINAÇÃO
// =====================================================

export function atualizarPaginacaoDoacoes(

    elementos,

    estado,

    quantidadeRegistros

) {

    const totalPaginas =
        calcularTotalPaginasDoacoes(
            quantidadeRegistros,
            estado.itensPorPagina
        );

    if (
        estado.paginaAtual >
        totalPaginas
    ) {

        estado.paginaAtual =
            totalPaginas;

    }

    const inicio =
        quantidadeRegistros === 0
            ? 0
            : (
                (
                    estado.paginaAtual -
                    1
                ) *
                estado.itensPorPagina
            ) + 1;

    const fim =
        quantidadeRegistros === 0
            ? 0
            : Math.min(
                estado.paginaAtual *
                estado.itensPorPagina,
                quantidadeRegistros
            );


    elementos.intervaloPaginacao.textContent =
        `${inicio}–${fim} de ${quantidadeRegistros}`;


    elementos.btnPrimeiraPagina.disabled =
        estado.paginaAtual <= 1;

    elementos.btnPaginaAnterior.disabled =
        estado.paginaAtual <= 1;

    elementos.btnProximaPagina.disabled =
        estado.paginaAtual >=
        totalPaginas;

    elementos.btnUltimaPagina.disabled =
        estado.paginaAtual >=
        totalPaginas;


    renderizarNumerosPaginacaoDoacoes(
        elementos,
        estado,
        totalPaginas
    );

}