import { API_URL } from "../config.js";

function obterToken() {
    return localStorage.getItem("token") || sessionStorage.getItem("token");
}

function obterHeaders(comJson = true) {
    const headers = {
        Authorization: `Bearer ${obterToken() || ""}`
    };

    if (comJson) {
        headers["Content-Type"] = "application/json";
    }

    return headers;
}

export function listarSaldosCestasAPI() {
    return fetch(`${API_URL}/saldo-cestas`, {
        method: "GET",
        headers: obterHeaders(false),
        cache: "no-store"
    });
}

export function buscarSaldoCestasAPI(instituicaoId) {
    return fetch(`${API_URL}/saldo-cestas/${instituicaoId}`, {
        method: "GET",
        headers: obterHeaders(false),
        cache: "no-store"
    });
}

export function buscarRecomendacaoCestasAPI(instituicaoId) {
    return fetch(`${API_URL}/saldo-cestas/${instituicaoId}/recomendacao`, {
        method: "GET",
        headers: obterHeaders(false),
        cache: "no-store"
    });
}

export function registrarEntradaSaldoCestasAPI(dados) {
    return fetch(`${API_URL}/saldo-cestas/entrada`, {
        method: "POST",
        headers: obterHeaders(true),
        body: JSON.stringify(dados)
    });
}

export function listarHistoricoSaldoCestasAPI(
    instituicaoId,
    { page = 1, pageSize = 20, tipo = "" } = {}
) {
    const query = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize)
    });

    if (tipo) {
        query.set("tipo", tipo);
    }

    return fetch(
        `${API_URL}/saldo-cestas/${instituicaoId}/historico?${query.toString()}`,
        {
            method: "GET",
            headers: obterHeaders(false),
            cache: "no-store"
        }
    );
}
