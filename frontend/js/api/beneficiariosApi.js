// =====================================================
// API DE BENEFICIÁRIOS
// =====================================================

//const API_URL = "http://localhost:3000";

import { API_URL } from "../config.js";


// =====================================================
// OBTER TOKEN DE AUTENTICAÇÃO
// =====================================================

function obterToken() {

    /*
     * Quando "Lembrar meu acesso" está marcado,
     * o token fica no localStorage.
     *
     * Caso contrário, fica no sessionStorage.
     */
    return (
        localStorage.getItem("token") ||
        sessionStorage.getItem("token")
    );

}


// =====================================================
// OBTER HEADERS
// =====================================================

function obterHeaders() {

    const token =
        obterToken();

    if (!token) {

        console.warn(
            "Token de autenticação não encontrado."
        );

    }

    return {
        "Content-Type": "application/json",

        Authorization:
            `Bearer ${token || ""}`
    };

}


// =====================================================
// VERIFICAR ID
// =====================================================

function validarId(id) {

    const idNumerico =
        Number(id);

    if (
        !Number.isInteger(idNumerico) ||
        idNumerico <= 0
    ) {

        throw new Error(
            "ID do beneficiário inválido."
        );

    }

    return idNumerico;

}


// =====================================================
// LISTAR BENEFICIÁRIOS
// =====================================================

export async function listarBeneficiarios() {

    return await fetch(
        `${API_URL}/beneficiarios`,
        {
            method: "GET",

            headers:
                obterHeaders(),

            cache:
                "no-store"
        }
    );

}


// =====================================================
// BUSCAR BENEFICIÁRIO POR ID
// =====================================================

export async function buscarBeneficiario(id) {

    const idValidado =
        validarId(id);

    return await fetch(
        `${API_URL}/beneficiarios/${idValidado}`,
        {
            method: "GET",

            headers:
                obterHeaders(),

            cache:
                "no-store"
        }
    );

}


// =====================================================
// CADASTRAR BENEFICIÁRIO
// =====================================================

export async function cadastrarBeneficiarioAPI(
    dados
) {

    return await fetch(
        `${API_URL}/beneficiarios`,
        {
            method: "POST",

            headers:
                obterHeaders(),

            body:
                JSON.stringify(dados)
        }
    );

}


// =====================================================
// EDITAR BENEFICIÁRIO
// =====================================================

export async function editarBeneficiarioAPI(
    id,
    dados
) {

    const idValidado =
        validarId(id);

    return await fetch(
        `${API_URL}/beneficiarios/${idValidado}`,
        {
            method: "PUT",

            headers:
                obterHeaders(),

            body:
                JSON.stringify(dados)
        }
    );

}


// =====================================================
// ALTERAR STATUS DO BENEFICIÁRIO
// =====================================================

export async function alterarStatusBeneficiarioAPI(
    id,
    ativo
) {

    const idValidado =
        validarId(id);

    return await fetch(
        `${API_URL}/beneficiarios/${idValidado}`,
        {
            method: "PATCH",

            headers:
                obterHeaders(),

            body:
                JSON.stringify({
                    ativo: Boolean(ativo)
                })
        }
    );

}

// =====================================================
// LISTAR HISTÓRICO DO BENEFICIÁRIO
// =====================================================

export async function listarHistoricoBeneficiarioAPI(id) {

    const idValidado =
        validarId(id);

    return await fetch(
        `${API_URL}/beneficiarios/${idValidado}/historico`,
        {
            method: "GET",

            headers:
                obterHeaders(),

            cache:
                "no-store"
        }
    );

}

