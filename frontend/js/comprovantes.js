import { toast } from "./components/toast.js";
import { listarInstituicoes } from "./api/instituicoesApi.js";
import {
    enviarComprovanteAPI,
    listarComprovantesPendentesAPI,
    vincularComprovanteAPI,
    montarUrlArquivoComprovante,
} from "./api/comprovantesApi.js";

let usuarioAtual = null;
let instituicoesDisponiveis = [];
let controladorEventos = null;
let envioComprovanteEmAndamento = false;

function escaparHtml(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function obterUsuarioSessao() {
    try {
        return JSON.parse(sessionStorage.getItem("usuarioLogado") || "null");
    } catch {
        return null;
    }
}

async function lerJsonSeguro(resposta) {
    try {
        return await resposta.json();
    } catch {
        return {};
    }
}

function formatarData(valor) {
    if (!valor) return "-";

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
        return String(valor);
    }

    return data.toLocaleString("pt-BR");
}

function formatarCnpj(valor) {
    const numeros = String(valor ?? "").replace(/\D/g, "");

    if (numeros.length !== 14) {
        return valor || "Não identificado";
    }

    return numeros.replace(
        /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
        "$1.$2.$3/$4-$5"
    );
}

function obterExtensaoArquivo(url) {
    return String(url || "")
        .split("?")[0]
        .split(".")
        .pop()
        ?.toLowerCase();
}

function ehImagem(url) {
    return ["png", "jpg", "jpeg", "webp", "gif", "bmp"]
        .includes(obterExtensaoArquivo(url));
}

function badgeStatus(status) {
    const normalizado = String(status || "").toUpperCase();
    const classe =
        normalizado === "VINCULADO"
            ? "vinculado"
            : normalizado === "PENDENTE_REVISAO"
                ? "pendente"
                : "neutro";

    const texto =
        normalizado === "PENDENTE_REVISAO"
            ? "Pendente de revisão"
            : normalizado === "VINCULADO"
                ? "Vinculado"
                : normalizado || "Sem status";

    return `<span class="badge-comprovante ${classe}">${escaparHtml(texto)}</span>`;
}

function renderizarResultadoUpload(comprovante) {
    const container = document.getElementById("resultadoUploadComprovante");
    if (!container) return;

    const url = montarUrlArquivoComprovante(comprovante.arquivoUrl);

    container.className = "resultado-upload-preenchido";
    container.innerHTML = `
        <div class="resultado-upload-status">
            ${badgeStatus(comprovante.status)}
        </div>

        <dl class="resultado-upload-dados">
            <div>
                <dt>Tipo</dt>
                <dd>${escaparHtml(comprovante.tipoDoc || "-")}</dd>
            </div>

            <div>
                <dt>CNPJ extraído</dt>
                <dd>${escaparHtml(formatarCnpj(comprovante.cnpjExtraido))}</dd>
            </div>

            <div>
                <dt>Instituição ID</dt>
                <dd>${escaparHtml(comprovante.instituicaoId ?? "Não vinculada")}</dd>
            </div>

            <div>
                <dt>Processado em</dt>
                <dd>${escaparHtml(formatarData(comprovante.criadoEm))}</dd>
            </div>
        </dl>

        <a
            class="btn btn-secondary link-arquivo-processado"
            href="${escaparHtml(url)}"
            target="_blank"
            rel="noopener noreferrer"
        >
            <i class="fa-solid fa-arrow-up-right-from-square"></i>
            Abrir arquivo
        </a>
    `;
}

async function carregarInstituicoes() {
    const resposta = await listarInstituicoes({
        ativa: true,
        limit: 100,
        sort: "nome:asc",
    });

    const dados = await lerJsonSeguro(resposta);

    if (!resposta.ok) {
        throw new Error(
            dados.error ||
            dados.message ||
            "Não foi possível carregar as instituições."
        );
    }

    instituicoesDisponiveis =
        Array.isArray(dados)
            ? dados
            : Array.isArray(dados.dados)
                ? dados.dados
                : [];
}

function opcoesInstituicoes() {
    return [
        `<option value="">Selecione uma instituição</option>`,
        ...instituicoesDisponiveis.map((instituicao) => `
            <option value="${instituicao.id}">
                ${escaparHtml(instituicao.nome)}
            </option>
        `),
    ].join("");
}

function renderizarPreviewArquivo(comprovante) {
    const url = montarUrlArquivoComprovante(comprovante.arquivoUrl);
    const imagem = ehImagem(comprovante.arquivoUrl);

    return `
        <a
            class="preview-comprovante preview-arquivo-manual"
            href="${escaparHtml(url)}"
            target="_blank"
            rel="noopener noreferrer"
            title="${imagem ? "Abrir imagem" : "Abrir PDF"}"
        >
            <i class="fa-solid ${imagem ? "fa-file-image" : "fa-file-pdf"}"></i>
            <span>${imagem ? "Abrir imagem" : "Abrir PDF"}</span>
        </a>
    `;
}

function renderizarPendentes(pendentes) {
    const lista = document.getElementById("listaComprovantesPendentes");
    const total = document.getElementById("totalComprovantesPendentes");

    if (total) {
        total.textContent = String(pendentes.length);
    }

    if (!lista) return;

    if (!pendentes.length) {
        lista.innerHTML = `
            <div class="estado-comprovantes estado-comprovantes-sucesso">
                <i class="fa-solid fa-circle-check"></i>
                <strong>Nenhum comprovante aguardando revisão.</strong>
                <span>A fila está em dia.</span>
            </div>
        `;
        return;
    }

    lista.innerHTML = pendentes.map((comprovante) => `
        <article
            class="card-comprovante-pendente"
            data-comprovante-id="${comprovante.id}"
        >
            ${renderizarPreviewArquivo(comprovante)}

            <div class="dados-comprovante-pendente">
                <div class="linha-principal-comprovante">
                    <div>
                        <span class="codigo-comprovante">
                            #${comprovante.id}
                        </span>
                        <h3>
                            ${escaparHtml(comprovante.tipoDoc || "Documento")}
                        </h3>
                    </div>

                    ${badgeStatus(comprovante.status)}
                </div>

                <div class="metadados-comprovante">
                    <span>
                        <i class="fa-solid fa-building-circle-question"></i>
                        CNPJ: ${escaparHtml(formatarCnpj(comprovante.cnpjExtraido))}
                    </span>

                    <span>
                        <i class="fa-regular fa-clock"></i>
                        ${escaparHtml(formatarData(comprovante.criadoEm))}
                    </span>
                </div>

                <div class="vinculacao-manual-comprovante">
                    <label>
                        Vincular à instituição
                        <select data-select-instituicao>
                            ${opcoesInstituicoes()}
                        </select>
                    </label>

                    <button
                        type="button"
                        class="btn btn-primary"
                        data-vincular-comprovante="${comprovante.id}"
                    >
                        <i class="fa-solid fa-link"></i>
                        Vincular
                    </button>
                </div>
            </div>
        </article>
    `).join("");

}

async function carregarPendentes() {
    if (usuarioAtual?.role !== "ADMIN") return;

    const lista = document.getElementById("listaComprovantesPendentes");

    if (lista) {
        lista.innerHTML = `
            <div class="estado-comprovantes">
                <i class="fa-solid fa-spinner fa-spin"></i>
                <strong>Carregando fila...</strong>
            </div>
        `;
    }

    try {
        if (!instituicoesDisponiveis.length) {
            await carregarInstituicoes();
        }

        const resposta = await listarComprovantesPendentesAPI();
        const dados = await lerJsonSeguro(resposta);

        if (!resposta.ok) {
            throw new Error(
                dados.message ||
                dados.error ||
                "Não foi possível carregar os comprovantes pendentes."
            );
        }

        renderizarPendentes(Array.isArray(dados) ? dados : []);
    } catch (erro) {
        console.error("Erro ao carregar comprovantes pendentes:", erro);

        if (lista) {
            lista.innerHTML = `
                <div class="estado-comprovantes estado-comprovantes-erro">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <strong>Não foi possível carregar a fila.</strong>
                    <span>${escaparHtml(erro.message)}</span>
                </div>
            `;
        }
    }
}

async function enviarComprovante(event = null) {
    event?.preventDefault?.();

    if (envioComprovanteEmAndamento) {
        return;
    }

    const formulario =
        document.getElementById("formUploadComprovante");

    const inputArquivo = document.getElementById("arquivoComprovante");
    const inputTipo = document.getElementById("tipoDocComprovante");
    const botao = document.getElementById("btnEnviarComprovante");

    const arquivo = inputArquivo?.files?.[0];
    const tipoDoc = inputTipo?.value?.trim();

    if (!arquivo) {
        toast.aviso("Selecione um PDF ou imagem para enviar.");
        return;
    }

    if (!tipoDoc) {
        toast.aviso("Informe o tipo do documento.");
        inputTipo?.focus();
        return;
    }

    const htmlOriginal = botao?.innerHTML;

    if (botao) {
        botao.disabled = true;
        botao.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Processando OCR...
        `;
    }

    envioComprovanteEmAndamento = true;

    try {
        const resposta = await enviarComprovanteAPI({
            arquivo,
            tipoDoc,
        });

        const dados = await lerJsonSeguro(resposta);

        if (!resposta.ok) {
            throw new Error(
                dados.message ||
                dados.error ||
                "Não foi possível processar o comprovante."
            );
        }

        renderizarResultadoUpload(dados);

        if (dados.status === "VINCULADO") {
            toast.sucesso(
                "Comprovante enviado e vinculado automaticamente."
            );
        } else if (dados.ocrProcessado === false) {
            toast.aviso(
                "Arquivo enviado com sucesso. O OCR está indisponível e o documento foi encaminhado para revisão manual.",
                { duracao: 4200 }
            );
        } else {
            toast.aviso(
                "Arquivo enviado com sucesso e encaminhado para revisão manual.",
                { duracao: 3400 }
            );
        }

        formulario?.reset();

        const nomeArquivo = document.getElementById("nomeArquivoComprovante");
        if (nomeArquivo) {
            nomeArquivo.textContent = "Clique para selecionar um arquivo";
        }

        if (usuarioAtual?.role === "ADMIN") {
            await carregarPendentes();
        }
    } catch (erro) {
        console.error("Erro no upload do comprovante:", erro);
        toast.erro(erro.message);
    } finally {
        envioComprovanteEmAndamento = false;

        if (botao) {
            botao.disabled = false;
            botao.innerHTML = htmlOriginal;
        }
    }
}

async function vincularComprovante(botao) {
    const id = Number(botao.dataset.vincularComprovante);
    const card = botao.closest("[data-comprovante-id]");
    const select = card?.querySelector("[data-select-instituicao]");
    const instituicaoId = Number(select?.value);

    if (!instituicaoId) {
        toast.aviso("Selecione uma instituição para fazer a vinculação.");
        select?.focus();
        return;
    }

    const original = botao.innerHTML;
    botao.disabled = true;
    botao.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Vinculando...
    `;

    try {
        const resposta = await vincularComprovanteAPI(
            id,
            instituicaoId
        );

        const dados = await lerJsonSeguro(resposta);

        if (!resposta.ok) {
            throw new Error(
                dados.message ||
                dados.error ||
                "Não foi possível vincular o comprovante."
            );
        }

        toast.sucesso("Comprovante vinculado à instituição com sucesso.");
        await carregarPendentes();
    } catch (erro) {
        console.error("Erro ao vincular comprovante:", erro);
        toast.erro(erro.message);
        botao.disabled = false;
        botao.innerHTML = original;
    }
}

function configurarEventos() {
    controladorEventos?.abort();
    controladorEventos = new AbortController();
    const signal = controladorEventos.signal;

    const formularioUpload =
        document.getElementById("formUploadComprovante");

    // Segurança: Enter dentro do formulário nunca deve provocar
    // navegação/reload nativo.
    formularioUpload
        ?.addEventListener("submit", (event) => {
            event.preventDefault();
            enviarComprovante(event);
        }, { signal });

    document
        .getElementById("btnEnviarComprovante")
        ?.addEventListener("click", (event) => {
            event.preventDefault();
            enviarComprovante(event);
        }, { signal });

    document
        .getElementById("arquivoComprovante")
        ?.addEventListener("change", (event) => {
            const arquivo = event.target.files?.[0];
            const nome = document.getElementById("nomeArquivoComprovante");

            if (nome) {
                nome.textContent =
                    arquivo?.name ||
                    "Clique para selecionar um arquivo";
            }
        }, { signal });

    const listaPendentes =
        document.getElementById("listaComprovantesPendentes");

    listaPendentes
        ?.addEventListener("click", async (event) => {
            const botao = event.target.closest(
                "[data-vincular-comprovante]"
            );

            if (botao) {
                vincularComprovante(botao);
                return;
            }

            // Links de arquivo são abertos diretamente pelo navegador.
        }, { signal });
}

export async function inicializarComprovantes() {
    usuarioAtual = obterUsuarioSessao();

    const secaoAdmin =
        document.getElementById("secaoRevisaoComprovantes");

    if (secaoAdmin) {
        secaoAdmin.hidden = usuarioAtual?.role !== "ADMIN";
    }

    configurarEventos();

    if (usuarioAtual?.role === "ADMIN") {
        await carregarPendentes();
    }
}
