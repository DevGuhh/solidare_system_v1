/*
    Descrição: Cliente de API para notificações. Normaliza resposta do backend,
    implementa `listarNotificacoes`, `enviarNotificacao` com fallback e
    `marcarComoLida` para chamar o endpoint PATCH.
    Alterações: tratamento de respostas e nova função `marcarComoLida`.
    Data: 2026-08-27
*/

import { apiClient } from "../api.js";

export async function listarNotificacoes(limite = 10) {
  try {
    const response = await apiClient.get(
      "/notificacoes?limite=" + encodeURIComponent(limite),
    );
    if (response && response.ok && response.data && response.data.dados) {
      return response.data.dados;
    }
    return null;
  } catch (error) {
    console.error("Erro ao listar notificações:", error);
    // fallback: ler notificações do localStorage para protótipo frontend
    try {
      const raw = localStorage.getItem("solidare:notificacoes");
      const arr = raw ? JSON.parse(raw) : [];
      return arr.slice(0, limite);
    } catch (e) {
      console.warn("Falha ao ler notificações do localStorage", e);
      return null;
    }
  }
}

export async function enviarNotificacao(dados = {}) {
  try {
    const response = await apiClient.post("/notificacoes", dados);

    if (!response.ok && [404, 501, 503].includes(response.status)) {
      return {
        sucesso: true,
        mock: true,
        mensagem: "Mensagem registrada localmente no frontend.",
        ...dados,
      };
    }

    if (!response.ok) {
      throw new Error("Não foi possível enviar a mensagem no momento.");
    }

    return (
      response.data ?? {
        sucesso: true,
        mock: true,
        ...dados,
      }
    );
  } catch (error) {
    console.warn(
      "Backend de notificações indisponível; usando fallback frontend.",
      error,
    );
    // Persistir localmente para protótipo
    try {
      const key = "solidare:notificacoes";
      const raw = localStorage.getItem(key);
      const arr = raw ? JSON.parse(raw) : [];
      const novo = {
        id: "local-" + Date.now(),
        instituicao:
          dados.instituicao || dados.remetente || "Instituição (local)",
        instituicaoId: dados.instituicaoId || dados.remetenteId || null,
        assunto: dados.assunto || "",
        descricao: dados.descricao || dados.mensagem || "",
        mensagem: dados.mensagem || dados.descricao || "",
        tipo: dados.tipo || "MENSAGEM",
        destinatario: dados.destinatario || "Administrador Geral",
        destinatarioId: dados.destinatarioId || null,
        remetente:
          dados.instituicao || dados.remetente || "Instituição (local)",
        remetenteId: dados.remetenteId || null,
        lida: false,
        data: new Date().toISOString(),
      };
      arr.unshift(novo);
      localStorage.setItem(key, JSON.stringify(arr));
      return { sucesso: true, mock: true, dados: novo };
    } catch (e) {
      return {
        sucesso: true,
        mock: true,
        mensagem: "Mensagem registrada localmente (falha ao persistir).",
        ...dados,
      };
    }
  }
}

export async function marcarComoLida(id) {
  try {
    const response = await apiClient.patch(
      `/notificacoes/${encodeURIComponent(id)}/lida`,
    );
    if (response && response.ok) {
      return response.data?.dados ?? null;
    }
    return null;
  } catch (error) {
    console.warn("Erro ao marcar notificação como lida no backend:", error);
    // fallback: atualizar no localStorage
    try {
      const key = "solidare:notificacoes";
      const raw = localStorage.getItem(key);
      const arr = raw ? JSON.parse(raw) : [];
      const idx = arr.findIndex((i) => String(i.id) === String(id));
      if (idx >= 0) {
        arr[idx].lida = true;
        arr[idx].lidaEm = new Date().toISOString();
        localStorage.setItem(key, JSON.stringify(arr));
        return arr[idx];
      }
      return null;
    } catch (e) {
      console.warn("Falha ao marcar como lida localmente", e);
      return null;
    }
  }
}
