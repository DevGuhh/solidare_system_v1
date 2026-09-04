// =====================================================
// CONFIGURAÇÕES
// =====================================================

//const API_URL = "http://localhost:3000";
import { API_URL } from "../config.js";

// =====================================================
// OBTER TOKEN
// =====================================================

function obterToken() {

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

    return {

        "Content-Type":
            "application/json",

        Authorization:
            `Bearer ${token || ""}`

    };

}


// =====================================================
// LISTAR DOAÇÕES
// =====================================================

export async function listarDoacoes(
    instituicaoId = null
) {

    const parametros =
        new URLSearchParams();


    const idInstituicao =
        Number(
            instituicaoId
        );


    if (
        Number.isInteger(
            idInstituicao
        ) &&
        idInstituicao > 0
    ) {

        parametros.set(
            "instituicaoId",
            String(idInstituicao)
        );

    }


    const query =
        parametros.toString();


    const url =
        query
            ? `${API_URL}/doacoes?${query}`
            : `${API_URL}/doacoes`;


    return fetch(
        url,
        {

            method:
                "GET",

            headers:
                obterHeaders(),

            cache:
                "no-store"

        }
    );

}


// =====================================================
// BUSCAR DOAÇÃO POR ID
// =====================================================

export async function buscarDoacao(
    id
) {

    return fetch(
        `${API_URL}/doacoes/${id}`,
        {

            method:
                "GET",

            headers:
                obterHeaders(),

            cache:
                "no-store"

        }
    );

}


// =====================================================
// CADASTRAR DOAÇÃO
// =====================================================

export async function cadastrarDoacaoAPI(
    dados
) {

    return fetch(
        `${API_URL}/doacoes`,
        {

            method:
                "POST",

            headers:
                obterHeaders(),

            body:
                JSON.stringify(
                    dados
                )

        }
    );

}


// =====================================================
// EDITAR DOAÇÃO
// =====================================================

export async function editarDoacaoAPI(
    id,
    dados
) {

    return fetch(
        `${API_URL}/doacoes/${id}`,
        {

            method:
                "PUT",

            headers:
                obterHeaders(),

            body:
                JSON.stringify(
                    dados
                )

        }
    );

}


// =====================================================
// ALTERAR COMPROVANTE
// =====================================================

export async function alterarComprovanteDoacaoAPI(

    id,

    comprovante

) {

    return fetch(
        `${API_URL}/doacoes/${id}/comprovante`,
        {

            method:
                "PATCH",

            headers:
                obterHeaders(),

            body:
                JSON.stringify({

                    comprovante:
                        Boolean(
                            comprovante
                        )

                })

        }
    );

}


// =====================================================
// CANCELAR DOAÇÃO
// =====================================================

export async function excluirDoacaoAPI(
    id,
    motivo
) {

    return fetch(
        `${API_URL}/doacoes/${id}`,
        {

            method:
                "DELETE",

            headers:
                obterHeaders(),

            body:
                JSON.stringify({ motivo })

        }
    );

}

// =====================================================
// BUSCAR FOTO DO COMPROVANTE DE ENTREGA
// =====================================================

export async function buscarFotoComprovanteEntrega(id) {
    return fetch(
        `${API_URL}/doacoes/${id}/comprovante-entrega`,
        {
            method: "GET",
            headers: { Authorization: `Bearer ${obterToken() || ""}` },
            cache: "no-store"
        }
    );
}
