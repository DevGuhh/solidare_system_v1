// =====================================================
// FEEDBACK CENTRAL SOLIDARE
// Substitui os antigos balões flutuantes
// =====================================================

const TEMPO_PADRAO = 2600;

const TIPOS_VALIDOS = [
    "sucesso",
    "erro",
    "aviso",
    "informacao"
];

let feedbackAtual = null;
let temporizadorAtual = null;


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
// CONFIGURAÇÃO POR TIPO
// =====================================================

function obterConfiguracao(tipo) {
    const configuracoes = {
        sucesso: {
            titulo: "Operação concluída",
            icone: "fa-solid fa-check",
        },

        erro: {
            titulo: "Não foi possível concluir",
            icone: "fa-solid fa-xmark",
        },

        aviso: {
            titulo: "Atenção",
            icone: "fa-solid fa-exclamation",
        },

        informacao: {
            titulo: "Informação",
            icone: "fa-solid fa-info",
        },
    };

    return configuracoes[tipo] || configuracoes.informacao;
}


// =====================================================
// REMOVER FEEDBACK ATUAL
// =====================================================

function removerFeedback({ imediato = false } = {}) {
    if (!feedbackAtual) {
        return;
    }

    if (temporizadorAtual) {
        clearTimeout(temporizadorAtual);
        temporizadorAtual = null;
    }

    const elemento = feedbackAtual;
    feedbackAtual = null;

    document.body.classList.remove(
        "feedback-solidare-bloqueado"
    );

    if (imediato) {
        elemento.remove();
        return;
    }

    elemento.classList.remove(
        "feedback-solidare-visivel"
    );

    elemento.classList.add(
        "feedback-solidare-saindo"
    );

    setTimeout(() => {
        elemento.remove();
    }, 220);
}


// =====================================================
// CRIAR FEEDBACK
// =====================================================

function criarFeedback({
    mensagem,
    tipo = "informacao",
    titulo,
    duracao = TEMPO_PADRAO,
} = {}) {
    if (!mensagem) {
        return null;
    }

    const tipoNormalizado =
        TIPOS_VALIDOS.includes(tipo)
            ? tipo
            : "informacao";

    const configuracao =
        obterConfiguracao(tipoNormalizado);

    const tituloFinal =
        titulo || configuracao.titulo;

    const duracaoFinal =
        Number.isFinite(Number(duracao))
            ? Math.max(0, Number(duracao))
            : TEMPO_PADRAO;

    /*
     * Apenas uma mensagem central por vez.
     * Evita empilhamento de balões/notificações.
     */
    removerFeedback({
        imediato: true,
    });

    const overlay =
        document.createElement("div");

    overlay.className =
        `feedback-solidare-overlay ${tipoNormalizado}`;

    overlay.setAttribute(
        "role",
        tipoNormalizado === "erro"
            ? "alert"
            : "status"
    );

    overlay.setAttribute(
        "aria-live",
        tipoNormalizado === "erro"
            ? "assertive"
            : "polite"
    );

    overlay.setAttribute(
        "aria-modal",
        "true"
    );

    overlay.innerHTML = `
        <div class="feedback-solidare-caixa">

            <div
                class="feedback-solidare-icone"
                aria-hidden="true"
            >
                <div class="feedback-solidare-anel"></div>

                <div class="feedback-solidare-simbolo">
                    <i class="${configuracao.icone}"></i>
                </div>
            </div>

            <h2 class="feedback-solidare-titulo">
                ${escaparHtml(tituloFinal)}
            </h2>

            <p class="feedback-solidare-mensagem">
                ${escaparHtml(mensagem)}
            </p>

            <div
                class="feedback-solidare-progresso"
                aria-hidden="true"
            >
                <span></span>
            </div>

        </div>
    `;

    document.body.appendChild(
        overlay
    );

    document.body.classList.add(
        "feedback-solidare-bloqueado"
    );

    feedbackAtual = overlay;

    const barra =
        overlay.querySelector(
            ".feedback-solidare-progresso span"
        );

    if (barra && duracaoFinal > 0) {
        barra.style.animationDuration =
            `${duracaoFinal}ms`;
    }

    requestAnimationFrame(() => {
        overlay.classList.add(
            "feedback-solidare-visivel"
        );
    });

    if (duracaoFinal > 0) {
        temporizadorAtual =
            setTimeout(() => {
                removerFeedback();
            }, duracaoFinal);
    }

    /*
     * Permite fechar com clique no fundo,
     * sem transformar o componente em um modal pesado.
     */
    overlay.addEventListener(
        "click",
        (evento) => {
            if (evento.target === overlay) {
                removerFeedback();
            }
        }
    );

    return overlay;
}


// =====================================================
// API PÚBLICA
// =====================================================

export const toast = {
    mostrar(opcoes = {}) {
        return criarFeedback(opcoes);
    },

    sucesso(mensagem, opcoes = {}) {
        return criarFeedback({
            ...opcoes,
            mensagem,
            tipo: "sucesso",
        });
    },

    erro(mensagem, opcoes = {}) {
        return criarFeedback({
            ...opcoes,
            mensagem,
            tipo: "erro",
        });
    },

    aviso(mensagem, opcoes = {}) {
        return criarFeedback({
            ...opcoes,
            mensagem,
            tipo: "aviso",
        });
    },

    informacao(mensagem, opcoes = {}) {
        return criarFeedback({
            ...opcoes,
            mensagem,
            tipo: "informacao",
        });
    },

    fechar() {
        removerFeedback();
    },
};

export default toast;
