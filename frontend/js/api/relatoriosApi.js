// =====================================================
// API DOS RELATÓRIOS
// =====================================================

import { API_URL } from "../config.js";

/**
 * Monta os cabeçalhos padrão das requisições autenticadas.
 */
function obterHeaders() {
    const token =
        localStorage.getItem("token") ||
        sessionStorage.getItem("token");

    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token ?? ""}`
    };
}

/**
 * Lista os beneficiários utilizados na tela de relatórios.
 */
export function listarBeneficiariosRelatorio() {
    return fetch(`${API_URL}/beneficiarios`, {
        method: "GET",
        headers: obterHeaders()
    });
}

/**
 * Lista as instituições utilizadas no filtro de relatórios.
 */
export function listarInstituicoesRelatorio() {
    const parametros = new URLSearchParams({
        page: "1",
        limit: "100",
        sort: "nome:asc"
    });

    return fetch(`${API_URL}/instituicoes?${parametros.toString()}`, {
        method: "GET",
        headers: obterHeaders(),
        cache: "no-store"
    });
}
