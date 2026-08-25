import { API_URL } from "../config.js";

function obterToken() {
    return localStorage.getItem("token") || sessionStorage.getItem("token");
}

function headersAutenticacao() {
    return {
        Authorization: `Bearer ${obterToken() || ""}`,
    };
}

export function enviarComprovanteAPI({ arquivo, tipoDoc }) {
    const formData = new FormData();
    formData.append("arquivo", arquivo);
    formData.append("tipo_doc", tipoDoc);

    return fetch(`${API_URL}/api/comprovantes`, {
        method: "POST",
        headers: headersAutenticacao(),
        body: formData,
    });
}

export function listarComprovantesPendentesAPI() {
    return fetch(`${API_URL}/api/comprovantes/pendentes`, {
        headers: headersAutenticacao(),
        cache: "no-store",
    });
}

export function vincularComprovanteAPI(id, instituicaoId) {
    return fetch(`${API_URL}/api/comprovantes/${id}/vincular`, {
        method: "PATCH",
        headers: {
            ...headersAutenticacao(),
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            instituicaoId: Number(instituicaoId),
        }),
    });
}

const API_PRODUCAO = "https://solidare-system-v1.onrender.com";

export function montarUrlArquivoComprovante(arquivoUrl) {
    if (!arquivoUrl) return "#";

    if (/^https?:\/\//i.test(arquivoUrl)) {
        return arquivoUrl;
    }

    return `${API_URL}${arquivoUrl.startsWith("/") ? "" : "/"}${arquivoUrl}`;
}

export function montarUrlsArquivoComprovante(arquivoUrl) {
    const principal = montarUrlArquivoComprovante(arquivoUrl);

    if (
        !arquivoUrl ||
        /^https?:\/\//i.test(arquivoUrl) ||
        API_URL === API_PRODUCAO
    ) {
        return [principal];
    }

    const caminho =
        `${arquivoUrl.startsWith("/") ? "" : "/"}${arquivoUrl}`;

    const producao = `${API_PRODUCAO}${caminho}`;

    return [...new Set([principal, producao])];
}

export async function resolverUrlArquivoComprovante(arquivoUrl) {
    const candidatos = montarUrlsArquivoComprovante(arquivoUrl);

    for (const url of candidatos) {
        try {
            const resposta = await fetch(url, {
                method: "HEAD",
                cache: "no-store",
            });

            if (resposta.ok) {
                return url;
            }
        } catch {
            // Tenta o próximo endereço.
        }
    }

    return candidatos[0] || "#";
}
