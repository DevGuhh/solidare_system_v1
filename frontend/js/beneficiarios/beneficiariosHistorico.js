import { listarHistoricoBeneficiarioAPI } from "../api/beneficiariosApi.js";
import { mostrarErro } from "../utils/toast.js";

/* =====================================================
   SEGURANÇA
===================================================== */

function escaparHtml(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

/* =====================================================
   DATA
===================================================== */

function lerData(valor) {
    if (!valor) return "-";

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
        return "-";
    }

    return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
    }).format(data);
}

/* =====================================================
   TIPO DO HISTÓRICO
===================================================== */

function normalizarTipo(tipo) {
    return String(tipo ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase();
}

function obterConfiguracaoTipo(tipo) {
    const valor = normalizarTipo(tipo);

    if (valor === "CADASTRO") {
        return {
            classe: "historico-cadastro",
            icone: "fa-user-plus",
            rotulo: "Cadastro",
        };
    }

    if (valor === "DOACAO") {
        return {
            classe: "historico-doacao",
            icone: "fa-hand-holding-heart",
            rotulo: "Doação",
        };
    }

    return {
        classe: "historico-atualizacao",
        icone: "fa-pen-to-square",
        rotulo: "Atualização",
    };
}

/* =====================================================
   RESPOSTA DA API
===================================================== */

async function lerRespostaJson(resposta) {
    const texto = await resposta.text();

    if (!texto) return [];

    try {
        return JSON.parse(texto);
    } catch {
        throw new Error(
            "O servidor retornou uma resposta inválida."
        );
    }
}

/* =====================================================
   ALTERAÇÕES
===================================================== */

function formatarValorAlteracao(alteracao, lado) {
    const campo = String(alteracao?.campo || "");
    const valorExibicao =
        lado === "de"
            ? alteracao?.deExibicao
            : alteracao?.paraExibicao;

    if (
        valorExibicao !== undefined &&
        valorExibicao !== null &&
        String(valorExibicao).trim() !== ""
    ) {
        return String(valorExibicao);
    }

    const valor =
        lado === "de"
            ? alteracao?.de
            : alteracao?.para;

    if (
        valor === null ||
        valor === undefined ||
        String(valor).trim() === ""
    ) {
        return campo === "instituicaoId"
            ? "Nenhuma"
            : "Não informado";
    }

    const texto = String(valor).trim();

    if (campo === "tipoBeneficio") {
        return {
            CESTA: "Cesta",
            GRANEL: "Granel",
            AMBOS: "Ambos",
            OUTROS: "Outros",
        }[texto.toUpperCase()] || texto;
    }

    if (campo === "instituicaoId") {
        return `Instituição #${texto}`;
    }

    return texto;
}

function renderizarAlteracoes(detalhes) {
    const alteracoes = detalhes?.alteracoes;

    if (
        !Array.isArray(alteracoes) ||
        alteracoes.length === 0
    ) {
        return "";
    }

    /*
     * Remove alterações técnicas de status.
     *
     * Exemplo que NÃO será mais exibido:
     *
     * Status
     * false → true
     *
     * O evento "Beneficiário ativado/inativado"
     * continua aparecendo normalmente.
     */
    const alteracoesVisiveis = alteracoes.filter(
        (alteracao) => {
            const campo = String(
                alteracao?.campo ||
                alteracao?.rotulo ||
                ""
            )
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .trim()
                .toLowerCase();

            return ![
                "ativo",
                "status",
                "situacao",
            ].includes(campo);
        }
    );

    /*
     * Se a única alteração era o status,
     * não cria a caixa de alterações.
     */
    if (alteracoesVisiveis.length === 0) {
        return "";
    }

    const itens = alteracoesVisiveis
        .map((alteracao) => {
            const rotulo = escaparHtml(
                alteracao?.rotulo ||
                alteracao?.campo ||
                "Campo"
            );

            const anterior = escaparHtml(
                formatarValorAlteracao(
                    alteracao,
                    "de"
                )
            );

            const atual = escaparHtml(
                formatarValorAlteracao(
                    alteracao,
                    "para"
                )
            );

            return `
                <li>
                    <strong>${rotulo}</strong>

                    <span>
                        ${anterior}
                    </span>

                    <i
                        class="fa-solid fa-arrow-right"
                        aria-hidden="true"
                    ></i>

                    <span>
                        ${atual}
                    </span>
                </li>
            `;
        })
        .join("");

    return `
        <ul class="historico-alteracoes">
            ${itens}
        </ul>
    `;
}

/* =====================================================
   RENDERIZAÇÃO DO HISTÓRICO
===================================================== */

function renderizarHistorico(lista) {
    const container = document.getElementById(
        "listaHistoricoBeneficiario"
    );

    if (!container) return;

    if (
        !Array.isArray(lista) ||
        lista.length === 0
    ) {
        container.innerHTML = `
            <div class="historico-vazio">

                <i
                    class="fa-solid fa-clock-rotate-left"
                    aria-hidden="true"
                ></i>

                <strong>
                    Nenhum histórico registrado
                </strong>

                <span>
                    As próximas alterações e doações
                    aparecerão aqui.
                </span>

            </div>
        `;

        return;
    }

    container.innerHTML = lista
        .map((evento) => {
            const config =
                obterConfiguracaoTipo(evento?.tipo);

            const descricao = escaparHtml(
                evento?.descricao ||
                "Evento registrado."
            );

            const usuario = escaparHtml(
                evento?.usuario?.nome ||
                "Sistema"
            );

            const data = escaparHtml(
                lerData(evento?.criadoEm)
            );

            return `
                <article
                    class="
                        historico-item
                        ${config.classe}
                    "
                >

                    <div
                        class="historico-marcador"
                        aria-hidden="true"
                    >
                        <i
                            class="
                                fa-solid
                                ${config.icone}
                            "
                        ></i>
                    </div>

                    <div class="historico-conteudo">

                        <div class="historico-item-topo">

                            <span class="historico-tipo">
                                ${config.rotulo}
                            </span>

                            <time>
                                ${data}
                            </time>

                        </div>

                        <p>
                            ${descricao}
                        </p>

                        ${renderizarAlteracoes(
                            evento?.detalhes
                        )}

                        <div class="historico-usuario">

                            <i
                                class="fa-solid fa-user"
                                aria-hidden="true"
                            ></i>

                            Registrado por ${usuario}

                        </div>

                    </div>

                </article>
            `;
        })
        .join("");
}

/* =====================================================
   FECHAR MODAL
===================================================== */

export function fecharHistoricoBeneficiario() {
    const modal = document.getElementById(
        "modalHistoricoBeneficiario"
    );

    if (!modal) return;

    modal.hidden = true;

    modal.classList.remove("ativo");

    modal.setAttribute(
        "aria-hidden",
        "true"
    );
}

/* =====================================================
   ABRIR HISTÓRICO
===================================================== */

export async function abrirHistoricoBeneficiario(
    id,
    nome = ""
) {
    const modal = document.getElementById(
        "modalHistoricoBeneficiario"
    );

    const tituloNome = document.getElementById(
        "nomeHistoricoBeneficiario"
    );

    const container = document.getElementById(
        "listaHistoricoBeneficiario"
    );

    if (!modal || !container) {
        mostrarErro(
            "Não foi possível abrir o histórico do beneficiário."
        );

        return;
    }

    if (tituloNome) {
        tituloNome.textContent =
            nome ||
            `Beneficiário #${id}`;
    }

    container.innerHTML = `
        <div class="historico-carregando">

            <i
                class="fa-solid fa-spinner fa-spin"
                aria-hidden="true"
            ></i>

            <span>
                Carregando histórico...
            </span>

        </div>
    `;

    modal.hidden = false;

    modal.classList.add("ativo");

    modal.setAttribute(
        "aria-hidden",
        "false"
    );

    try {
        const resposta =
            await listarHistoricoBeneficiarioAPI(id);

        const dados =
            await lerRespostaJson(resposta);

        if (!resposta.ok) {
            throw new Error(
                dados?.error ||
                dados?.erro ||
                dados?.mensagem ||
                "Não foi possível carregar o histórico."
            );
        }

        renderizarHistorico(dados);
    } catch (erro) {
        console.error(
            "Erro ao carregar histórico do beneficiário:",
            erro
        );

        container.innerHTML = `
            <div
                class="
                    historico-vazio
                    historico-erro
                "
            >

                <i
                    class="
                        fa-solid
                        fa-triangle-exclamation
                    "
                    aria-hidden="true"
                ></i>

                <strong>
                    Não foi possível carregar o histórico
                </strong>

                <span>
                    ${
                        escaparHtml(
                            erro.message ||
                            "Tente novamente."
                        )
                    }
                </span>

            </div>
        `;
    }
}

/* =====================================================
   CONFIGURAÇÃO DO MODAL
===================================================== */

export function configurarHistoricoBeneficiario() {
    const modal = document.getElementById(
        "modalHistoricoBeneficiario"
    );

    const btnFechar = document.getElementById(
        "btnFecharHistoricoBeneficiario"
    );

    if (!modal) return;

    btnFechar?.addEventListener(
        "click",
        fecharHistoricoBeneficiario
    );

    modal.addEventListener(
        "click",
        (event) => {
            if (event.target === modal) {
                fecharHistoricoBeneficiario();
            }
        }
    );
}