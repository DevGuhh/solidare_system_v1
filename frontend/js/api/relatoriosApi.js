import { API_URL } from "../config.js";

// =====================================================
// AUTENTICAÇÃO
// =====================================================

function obterToken() {
    return (
        localStorage.getItem("token") ||
        sessionStorage.getItem("token")
    );
}

function criarHeaders() {
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${obterToken() || ""}`
    };
}

// =====================================================
// REQUISIÇÃO BASE
// =====================================================

function get(caminho) {
    return fetch(`${API_URL}${caminho}`, {
        method: "GET",
        headers: criarHeaders(),
        cache: "no-store"
    });
}

// =====================================================
// ENDPOINTS DO RELATÓRIO
// =====================================================

export function listarBeneficiariosRelatorio() {
    return get("/beneficiarios");
}

export function listarInstituicoesRelatorio() {
    const parametros = new URLSearchParams({
        page: "1",
        limit: "100",
        sort: "nome:asc"
    });

    return get(`/instituicoes?${parametros}`);
}

export function listarDoacoesRelatorio() {
    return get("/doacoes");
}

export function listarSaldosRelatorio() {
    return get("/saldo-cestas");
}

export function obterSaldoInstituicaoRelatorio(instituicaoId) {
    return get(`/saldo-cestas/${Number(instituicaoId)}`);
}

export function listarComprovantesPendentesRelatorio() {
    return get("/api/comprovantes/pendentes");
}
