import { API_URL } from "../config.js";

function obterToken() {
    return localStorage.getItem("token") || sessionStorage.getItem("token");
}

function obterHeaders(comJson = true) {
    const headers = { Authorization: `Bearer ${obterToken() || ""}` };
    if (comJson) headers["Content-Type"] = "application/json";
    return headers;
}

export function listarInstituicoes(parametros = {}) {
    const query = new URLSearchParams();
    Object.entries(parametros).forEach(([chave, valor]) => {
        if (valor !== undefined && valor !== null && valor !== "") query.set(chave, String(valor));
    });
    const sufixo = query.toString() ? `?${query}` : "";
    // timeout wrapper to avoid infinite loading when backend não responde
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    return fetch(`${API_URL}/instituicoes${sufixo}`, { headers: obterHeaders(false), cache: "no-store", signal: controller.signal })
        .finally(() => clearTimeout(timeout));
}

export function buscarInstituicao(id) {
    return fetch(`${API_URL}/instituicoes/${id}`, { headers: obterHeaders(false), cache: "no-store" });
}

export function cadastrarInstituicaoAPI(dados) {
    return fetch(`${API_URL}/instituicoes`, { method: "POST", headers: obterHeaders(), body: JSON.stringify(dados) });
}

export function editarInstituicaoAPI(id, dados) {
    return fetch(`${API_URL}/instituicoes/${id}`, { method: "PUT", headers: obterHeaders(), body: JSON.stringify(dados) });
}

export function alterarStatusInstituicaoAPI(id, statusOk) {
    return fetch(`${API_URL}/instituicoes/${id}/status_ok`, { method: "PATCH", headers: obterHeaders(), body: JSON.stringify({ statusOk }) });
}

export function alterarSituacaoInstituicaoAPI(id, ativa) {
    return fetch(`${API_URL}/instituicoes/${id}`, { method: "PATCH", headers: obterHeaders(), body: JSON.stringify({ ativa: Boolean(ativa) }) });
}

// Mantido como alias para códigos antigos. O backend atual usa PATCH e soft status, não DELETE.
export function excluirInstituicaoAPI(id) {
    return alterarSituacaoInstituicaoAPI(id, false);
}

export function listarBeneficiariosDaInstituicao(id) {
    return fetch(`${API_URL}/instituicoes/${id}/beneficiarios`, { headers: obterHeaders(false), cache: "no-store" });
}
