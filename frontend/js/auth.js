// ==========================================
// CONFIGURAÇÕES
// ==========================================

import { API_URL } from "./config.js";

const TOKEN_KEY = "token";
const EMAIL_LEMBRADO_KEY = "emailLembrado";


// ==========================================
// OBTER TOKEN
// ==========================================

export function obterToken() {

    return localStorage.getItem(TOKEN_KEY);

}


// ==========================================
// SALVAR TOKEN
// ==========================================

export function salvarToken(token) {

    if (!token) {
        return;
    }

    localStorage.setItem(
        TOKEN_KEY,
        token
    );

}


// ==========================================
// REMOVER TOKEN
// ==========================================

export function removerToken() {

    localStorage.removeItem(TOKEN_KEY);

    /*
     * Não removemos o e-mail lembrado.
     * Assim, a opção "Lembrar meu acesso"
     * continua funcionando após o logout.
     */
}


// ==========================================
// DECODIFICAR TOKEN JWT
// ==========================================

export function decodificarToken(token) {

    try {

        if (!token) {
            return null;
        }

        const partes = token.split(".");

        if (partes.length !== 3) {
            return null;
        }

        const payloadBase64 = partes[1]
            .replace(/-/g, "+")
            .replace(/_/g, "/");

        const payloadDecodificado = decodeURIComponent(

            atob(payloadBase64)

                .split("")

                .map((caractere) => {

                    return `%${(
                        "00" +
                        caractere.charCodeAt(0).toString(16)
                    ).slice(-2)}`;

                })

                .join("")

        );

        return JSON.parse(payloadDecodificado);

    } catch (erro) {

        console.error(
            "Não foi possível decodificar o token:",
            erro
        );

        return null;

    }

}


// ==========================================
// VERIFICAR SE TOKEN EXPIROU
// ==========================================

export function tokenExpirou(token) {

    const payload = decodificarToken(token);

    if (!payload) {
        return true;
    }

    /*
     * O campo exp do JWT é armazenado em segundos.
     * Date.now() retorna milissegundos.
     */
    if (!payload.exp) {
        return false;
    }

    const agoraEmSegundos =
        Math.floor(Date.now() / 1000);

    return payload.exp <= agoraEmSegundos;

}


// ==========================================
// REDIRECIONAR PARA O LOGIN
// ==========================================

export function redirecionarParaLogin() {

    /*
     * Este caminho considera que as páginas protegidas
     * estão dentro da pasta frontend/pages.
     */
    window.location.href = "../index.html";

}


// ==========================================
// EXIGIR AUTENTICAÇÃO
// ==========================================

export function exigirAutenticacao() {

    const token = obterToken();

    if (!token) {

        redirecionarParaLogin();

        return null;

    }

    if (tokenExpirou(token)) {

        removerToken();

        redirecionarParaLogin();

        return null;

    }

    return token;

}


// ==========================================
// OBTER DADOS DO USUÁRIO NO BACKEND
// ==========================================

export async function obterUsuarioAutenticado() {

    const token = exigirAutenticacao();

    if (!token) {
        return null;
    }

    try {

        const resposta = await fetch(
            `${API_URL}/auth/me`,
            {
                method: "GET",

                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        if (
            resposta.status === 401 ||
            resposta.status === 403
        ) {

            removerToken();

            redirecionarParaLogin();

            return null;

        }

        const tipoConteudo =
            resposta.headers.get("content-type");

        if (
            !tipoConteudo ||
            !tipoConteudo.includes("application/json")
        ) {

            throw new Error(
                "O servidor não retornou uma resposta válida."
            );

        }

        const dados = await resposta.json();

        if (!resposta.ok) {

            throw new Error(

                dados.error ||

                dados.message ||

                dados.mensagem ||

                "Não foi possível carregar o usuário autenticado."

            );

        }

        const usuario = dados.usuario || null;

        if (!usuario) {
            return null;
        }

        /*
        * Usuários com senha provisória só podem acessar
        * a página de alteração de senha.
        */
        if (usuario.senhaProvisoria) {

            const paginaAtual =
                window.location.pathname;

            const estaNaPaginaAlterarSenha =
                paginaAtual.endsWith(
                    "/alterarSenha.html"
                );

            if (!estaNaPaginaAlterarSenha) {

                window.location.replace(
                    new URL("./alterarSenha.html", window.location.href).href
                );

                return null;

            }

        }

        return usuario;

    } catch (erro) {

        console.error(
            "Erro ao carregar usuário autenticado:",
            erro
        );

        return null;

    }

}


// ==========================================
// REALIZAR LOGOUT
// ==========================================

export async function realizarLogout() {

    const token = obterToken();

    try {

        /*
         * Tenta avisar o backend sobre o logout.
         * Mesmo que essa chamada falhe, o token local
         * será removido no bloco finally.
         */
        if (token) {

            await fetch(
                `${API_URL}/auth/logout`,
                {
                    method: "POST",

                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

        }

    } catch (erro) {

        console.error(
            "Erro ao comunicar logout ao backend:",
            erro
        );

    } finally {

        removerToken();

        redirecionarParaLogin();

    }

}


// ==========================================
// E-MAIL LEMBRADO
// ==========================================

export function obterEmailLembrado() {

    return localStorage.getItem(
        EMAIL_LEMBRADO_KEY
    );

}

export function salvarEmailLembrado(email) {

    if (!email) {
        return;
    }

    localStorage.setItem(
        EMAIL_LEMBRADO_KEY,
        email
    );

}

export function removerEmailLembrado() {

    localStorage.removeItem(
        EMAIL_LEMBRADO_KEY
    );

}