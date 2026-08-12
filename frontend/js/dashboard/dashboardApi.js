import { API_URL } from "../config.js";

function obterToken() {
    return localStorage.getItem("token") || sessionStorage.getItem("token");
}

function obterHeaders() {
    return {
        Authorization: `Bearer ${obterToken() || ""}`,
    };
}

async function lerJson(resposta) {
    const texto = await resposta.text();
    if (!texto) return {};
    try {
        return JSON.parse(texto);
    } catch {
        throw new Error("O servidor retornou uma resposta inválida.");
    }
}

async function get(caminho, mensagemErro) {
    const resposta = await fetch(`${API_URL}${caminho}`, {
        method: "GET",
        headers: obterHeaders(),
        cache: "no-store",
    });

    const dados = await lerJson(resposta);

    if (!resposta.ok) {
        throw new Error(
            dados?.error ||
            dados?.erro ||
            dados?.message ||
            dados?.mensagem ||
            mensagemErro
        );
    }

    return dados;
}

function normalizarLista(dados, propriedade) {
    if (Array.isArray(dados)) return dados;
    if (Array.isArray(dados?.[propriedade])) return dados[propriedade];
    if (Array.isArray(dados?.dados)) return dados.dados;
    if (Array.isArray(dados?.data)) return dados.data;
    if (Array.isArray(dados?.data?.[propriedade])) return dados.data[propriedade];
    return [];
}

export async function buscarUsuarioDashboard() {
    const dados = await get("/auth/me", "Erro ao carregar o usuário autenticado.");
    const usuario = dados?.usuario || dados?.data?.usuario || null;

    if (!usuario) {
        throw new Error("O servidor não retornou os dados do usuário.");
    }

    return usuario;
}

export async function buscarBeneficiariosDashboard() {
    return normalizarLista(
        await get("/beneficiarios", "Erro ao carregar beneficiários."),
        "beneficiarios"
    );
}

export async function buscarInstituicoesDashboard() {
    return normalizarLista(
        await get("/instituicoes", "Erro ao carregar instituições."),
        "instituicoes"
    );
}

export async function buscarDoacoesDashboard() {
    return normalizarLista(
        await get("/doacoes", "Erro ao carregar doações."),
        "doacoes"
    );
}

export async function buscarSaldosDashboard(usuario) {
    const role = String(usuario?.role || "").toUpperCase();

    if (role === "ADMIN") {
        return normalizarLista(
            await get("/saldo-cestas", "Erro ao carregar saldos de cestas."),
            "saldos"
        );
    }

    const instituicaoId = Number(usuario?.instituicaoId);

    if (!Number.isInteger(instituicaoId) || instituicaoId <= 0) {
        return [];
    }

    const saldo = await get(
        `/saldo-cestas/${instituicaoId}`,
        "Erro ao carregar o saldo de cestas."
    );

    return saldo ? [saldo] : [];
}
