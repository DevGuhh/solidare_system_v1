/*
    Descrição: Ajustes no cliente HTTP do frontend para suportar marcação de
    notificações via API. Adicionado método `patch` em `apiClient` para permitir
    chamadas PATCH ao backend e tratamento uniforme de respostas.
    Alterações: adicionar suporte PATCH; manter comportamento de logout em 401.
    Data: 2026-08-27
*/

import { API_URL } from "./config.js";

function getToken() {
    return localStorage.getItem("token") || sessionStorage.getItem("token");
}

async function api(endpoint, options = {}) {
    const token = getToken();

    const config = {
        ...options,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token || ""}`,
            ...options.headers
        }
    };

    try {
        const resposta = await fetch(API_URL + endpoint, config);

        if (resposta.status === 401) {
            localStorage.removeItem("token");
            sessionStorage.removeItem("token");
            window.location.href = "../index.html";
            return null;
        }

        return resposta;
    } catch (error) {
        // Falha de rede ou CORS — retornamos null para que os callers
        // tratem o caso sem exceptions não capturadas.
        console.warn('api() fetch falhou:', error);
        return null;
    }
}

export const apiClient = {
    async get(endpoint, options = {}) {
        const response = await api(endpoint, { ...options, method: "GET" });
        if (!response) {
            return { ok: false, status: 401, data: null, response: null };
        }

        const data = await response.clone().json().catch(() => null);
        return { ok: response.ok, status: response.status, data, response };
    },

    async post(endpoint, data, options = {}) {
        const response = await api(endpoint, {
            ...options,
            method: "POST",
            body: JSON.stringify(data ?? {})
        });

        if (!response) {
            return { ok: false, status: 401, data: null, response: null };
        }

        const payload = await response.clone().json().catch(() => null);
        return { ok: response.ok, status: response.status, data: payload, response };
    }
,

    async patch(endpoint, data = {}, options = {}) {
        const response = await api(endpoint, {
            ...options,
            method: "PATCH",
            body: JSON.stringify(data ?? {})
        });

        if (!response) {
            return { ok: false, status: 401, data: null, response: null };
        }

        const payload = await response.clone().json().catch(() => null);
        return { ok: response.ok, status: response.status, data: payload, response };
    }
};

export default apiClient;