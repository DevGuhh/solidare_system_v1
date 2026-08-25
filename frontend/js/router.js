import {
    loading
} from "./components/loading.js";


// =====================================================
// CONFIGURAÇÕES
// =====================================================

const CHAVE_PAGINA_ATUAL =
    "paginaAtualDashboard";


// =====================================================
// CONFIGURAÇÕES VISUAIS DAS PÁGINAS
// =====================================================

const configuracoesPaginas = {

    "home.html": {
        titulo: "Dashboard",
        descricao: "Visão geral do sistema."
    },

    "beneficiarios.html": {
        titulo: "Beneficiários",
        descricao: "Gerencie os beneficiários cadastrados."
    },

    "instituicoes.html": {
        titulo: "Instituições Parceiras",
        descricao: "Gerencie as instituições parceiras."
    },

    "qrcode.html": {
        titulo: "QR Codes",
        descricao: "Gere e gerencie os códigos QR dos beneficiários."
    },

    "doacoes.html": {
        titulo: "Doações",
        descricao: "Registre e acompanhe as doações recebidas."
    },

    "relatorios.html": {
        titulo: "Relatórios",
        descricao: "Consulte indicadores e informações do sistema."
    },

    "comprovantes.html": {
        titulo: "Comprovantes",
        descricao: "Envie documentos e revise vinculações pendentes."
    }

};


// =====================================================
// INICIALIZADORES DAS PÁGINAS
// =====================================================

const inicializadoresPaginas = {

    // =================================================
    // DASHBOARD
    // =================================================

    "home.html": async () => {

        const modulo =
            await import(
                "./dashboard/dashboard.js"
            );

        if (
            typeof modulo.inicializarDashboard ===
            "function"
        ) {

            await modulo.inicializarDashboard();

        }

    },


    // =================================================
    // BENEFICIÁRIOS
    // =================================================

    "beneficiarios.html": async () => {

        const modulo =
            await import(
                "./beneficiarios/beneficiarios.js"
            );

        if (
            typeof modulo.inicializarBeneficiarios ===
            "function"
        ) {

            await modulo.inicializarBeneficiarios();

        }

    },


    // =================================================
    // QR CODES
    // =================================================

    "qrcode.html": async () => {

        try {

            const modulo =
                await import(
                    "./Qrcode/qrcode.js"
                );


            if (
                typeof modulo.inicializarQRCode ===
                "function"
            ) {

                await modulo.inicializarQRCode();

            } else {

                console.warn(
                    "A função inicializarQRCode não foi encontrada no módulo."
                );

            }

        } catch (erro) {

            console.error(
                "Erro ao inicializar o módulo de QR Codes:",
                erro
            );

            throw erro;

        }

    },


    // =================================================
    // DOAÇÕES
    // =================================================

    "doacoes.html": async () => {

        const modulo =
            await import(
                "./doacoes/doacoes.js"
            );

        if (
            typeof modulo.inicializarDoacoes ===
            "function"
        ) {

            await modulo.inicializarDoacoes();

        }

    },


    // =================================================
    // INSTITUIÇÕES
    // =================================================

    "instituicoes.html": async () => {

        try {

            const modulo =
                await import(
                    "./instituicoes.js"
                );

            if (
                typeof modulo.inicializarInstituicoes ===
                "function"
            ) {

                await modulo.inicializarInstituicoes();

            }

        } catch (erro) {

            console.warn(
                "A página de Instituições não possui um inicializador compatível.",
                erro
            );

        }

    },


    // =================================================
    // COMPROVANTES
    // =================================================

    "comprovantes.html": async () => {

        const modulo =
            await import(
                "./comprovantes.js"
            );

        if (
            typeof modulo.inicializarComprovantes ===
            "function"
        ) {

            await modulo.inicializarComprovantes();

        }

    },


    // =================================================
    // RELATÓRIOS
    // =================================================

    "relatorios.html": async () => {

        try {

            const modulo =
                await import(
                    "./relatorios.js"
                );

            if (
                typeof modulo.inicializarRelatorios ===
                "function"
            ) {

                await modulo.inicializarRelatorios();

            }

        } catch (erro) {

            console.warn(
                "A página de Relatórios não possui um inicializador compatível.",
                erro
            );

        }

    }

};


// =====================================================
// ATUALIZAR CABEÇALHO
// =====================================================

function atualizarCabecalho(
    pagina
) {

    const configuracao =
        configuracoesPaginas[pagina] ||
        {
            titulo:
                "Instituto Solidare",

            descricao:
                "Sistema de gestão."
        };


    const tituloPagina =
        document.getElementById(
            "tituloPagina"
        );


    const descricaoPagina =
        document.getElementById(
            "descricaoPagina"
        );


    const breadcrumbPagina =
        document.getElementById(
            "breadcrumbPagina"
        );


    if (tituloPagina) {

        tituloPagina.textContent =
            configuracao.titulo;

    }


    if (descricaoPagina) {

        descricaoPagina.textContent =
            configuracao.descricao;

    }


    if (breadcrumbPagina) {

        breadcrumbPagina.textContent =
            configuracao.titulo;

    }


    document.title =
        `${configuracao.titulo} | Instituto Solidare`;

}


// =====================================================
// EXECUTAR INICIALIZADOR DA PÁGINA
// =====================================================

async function executarInicializadorDaPagina(
    pagina
) {

    const inicializador =
        inicializadoresPaginas[pagina];


    if (!inicializador) {

        console.log(
            `A página ${pagina} não possui inicializador registrado.`
        );

        return;

    }


    try {

        await inicializador();

    } catch (erro) {

        console.error(
            `Erro ao inicializar a página ${pagina}:`,
            erro
        );

        throw erro;

    }

}


// =====================================================
// REMOVER SCRIPTS DO HTML CARREGADO
// =====================================================

function removerScriptsDoHtml(
    html
) {

    const template =
        document.createElement(
            "template"
        );


    template.innerHTML =
        html;


    const scripts =
        template.content.querySelectorAll(
            "script"
        );


    scripts.forEach(
        (script) => {

            script.remove();

        }
    );


    return template.innerHTML;

}


// =====================================================
// MARCAR ITEM ATIVO NO MENU
// =====================================================

function marcarMenuAtivo(
    linkSelecionado
) {

    const links =
        document.querySelectorAll(
            ".menu-link"
        );


    links.forEach(
        (link) => {

            link.classList.remove(
                "ativo"
            );

        }
    );


    if (linkSelecionado) {

        linkSelecionado.classList.add(
            "ativo"
        );

    }

}


// =====================================================
// LOCALIZAR LINK DA PÁGINA
// =====================================================

function encontrarLinkDaPagina(
    pagina
) {

    return document.querySelector(
        `.menu-link[data-pagina="${pagina}"]`
    );

}


// =====================================================
// ESCAPAR HTML
// =====================================================

function escaparHtml(
    valor
) {

    return String(
        valor ?? ""
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}


// =====================================================
// ANIMAR CONTEÚDO
// =====================================================

function animarConteudo(
    container
) {

    container.classList.remove(
        "pagina-entrando"
    );


    void container.offsetWidth;


    container.classList.add(
        "pagina-entrando"
    );

}


// =====================================================
// CONVERTER PÁGINA EM HASH
// =====================================================

function paginaParaHash(
    pagina
) {

    return pagina
        .replace(
            ".html",
            ""
        )
        .trim();

}


// =====================================================
// CONVERTER HASH EM PÁGINA
// =====================================================

function hashParaPagina() {

    const hash =
        window.location.hash
            .replace(
                "#",
                ""
            )
            .trim();


    if (!hash) {

        return null;

    }


    return `${hash}.html`;

}


// =====================================================
// VERIFICAR PERMISSÃO NO MENU
// =====================================================

function paginaPermitidaNoMenu(
    pagina
) {

    const link =
        encontrarLinkDaPagina(
            pagina
        );


    if (!link) {

        return false;

    }


    return !link.hidden;

}


// =====================================================
// ATUALIZAR URL
// =====================================================

function atualizarUrl(
    pagina,
    substituir = false
) {

    const hash =
        paginaParaHash(
            pagina
        );


    const novaUrl =
        `${window.location.pathname}${window.location.search}#${hash}`;


    if (substituir) {

        window.history.replaceState(
            {
                pagina
            },
            "",
            novaUrl
        );

        return;

    }


    window.history.pushState(
        {
            pagina
        },
        "",
        novaUrl
    );

}


// =====================================================
// CARREGAR PÁGINA
// =====================================================

async function carregarPagina(

    pagina,

    linkSelecionado = null,

    opcoes = {}

) {

    const conteudo =
        document.getElementById(
            "conteudo"
        );


    if (!conteudo) {

        console.error(
            "O elemento #conteudo não foi encontrado."
        );

        return false;

    }


    if (!pagina) {

        console.warn(
            "Nenhuma página foi informada ao router."
        );

        return false;

    }


    sessionStorage.setItem(
        CHAVE_PAGINA_ATUAL,
        pagina
    );


    const linkAtivo =
        linkSelecionado ||
        encontrarLinkDaPagina(
            pagina
        );


    marcarMenuAtivo(
        linkAtivo
    );


    atualizarCabecalho(
        pagina
    );


    loading.mostrarLocal(
        conteudo,
        {
            texto:
                "Carregando página..."
        }
    );


    try {

        const resposta =
            await fetch(
                pagina,
                {
                    cache:
                        "no-store"
                }
            );


        if (!resposta.ok) {

            throw new Error(
                `Não foi possível carregar a página. Código HTTP: ${resposta.status}.`
            );

        }


        const html =
            await resposta.text();


        const htmlSemScripts =
            removerScriptsDoHtml(
                html
            );


        conteudo.innerHTML =
            htmlSemScripts;


        animarConteudo(
            conteudo
        );


        // =============================================
        // INICIALIZAR PÁGINA
        // =============================================

        await executarInicializadorDaPagina(
            pagina
        );


        // =============================================
        // HISTÓRICO
        // =============================================

        if (
            !opcoes.ignorarHistorico
        ) {

            atualizarUrl(
                pagina,
                Boolean(
                    opcoes.substituirHistorico
                )
            );

        }


        return true;


    } catch (erro) {

        console.error(
            "Erro ao carregar página:",
            erro
        );


        conteudo.innerHTML = `

            <section class="erro-pagina">

                <i
                    class="fa-solid fa-circle-exclamation"
                    aria-hidden="true"
                ></i>

                <h2>
                    Não foi possível carregar a página
                </h2>

                <p>
                    ${escaparHtml(
                        erro.message
                    )}
                </p>

                <button
                    type="button"
                    class="botao-tentar-novamente"
                    data-tentar-novamente
                >

                    <i
                        class="fa-solid fa-rotate-right"
                    ></i>

                    Tentar novamente

                </button>

            </section>

        `;


        const botaoTentarNovamente =
            conteudo.querySelector(
                "[data-tentar-novamente]"
            );


        if (
            botaoTentarNovamente
        ) {

            botaoTentarNovamente.addEventListener(
                "click",
                () => {

                    carregarPagina(
                        pagina,
                        linkAtivo
                    );

                }
            );

        }


        return false;

    }

}


// =====================================================
// CONFIGURAR LINKS DO MENU
// =====================================================

function configurarMenu() {

    const links =
        document.querySelectorAll(
            ".menu-link[data-pagina]"
        );


    links.forEach(
        (link) => {

            link.addEventListener(
                "click",
                async (event) => {

                    event.preventDefault();


                    const pagina =
                        link.dataset.pagina;


                    if (!pagina) {

                        return;

                    }


                    await carregarPagina(
                        pagina,
                        link
                    );

                }
            );

        }
    );

}


// =====================================================
// CONFIGURAR BREADCRUMB
// =====================================================

function configurarBreadcrumb() {

    const breadcrumbInicio =
        document.getElementById(
            "breadcrumbInicio"
        );


    if (!breadcrumbInicio) {

        return;

    }


    breadcrumbInicio.addEventListener(
        "click",
        async () => {

            const linkDashboard =
                encontrarLinkDaPagina(
                    "home.html"
                );


            await carregarPagina(
                "home.html",
                linkDashboard
            );

        }
    );

}


// =====================================================
// CONFIGURAR HISTÓRICO
// =====================================================

function configurarHistorico() {

    window.addEventListener(
        "popstate",
        async (event) => {

            let pagina =
                event.state?.pagina ||
                hashParaPagina() ||
                "home.html";


            if (
                !paginaPermitidaNoMenu(
                    pagina
                )
            ) {

                pagina =
                    "home.html";

            }


            await carregarPagina(

                pagina,

                encontrarLinkDaPagina(
                    pagina
                ),

                {
                    ignorarHistorico:
                        true
                }

            );

        }
    );

}


// =====================================================
// INICIALIZAR ROUTER
// =====================================================

function inicializarRouter() {

    configurarMenu();

    configurarBreadcrumb();

    configurarHistorico();

}


// =====================================================
// OBTER PÁGINA ATUAL
// =====================================================

function obterPaginaAtual() {

    return (

        sessionStorage.getItem(
            CHAVE_PAGINA_ATUAL
        ) ||

        "home.html"

    );

}


// =====================================================
// DISPONIBILIZAR GLOBALMENTE
// =====================================================

window.carregarPagina =
    carregarPagina;


window.obterPaginaAtual =
    obterPaginaAtual;


// =====================================================
// INICIAR
// =====================================================

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        inicializarRouter
    );

} else {

    inicializarRouter();

}