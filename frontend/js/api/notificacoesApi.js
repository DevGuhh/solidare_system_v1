import { apiClient } from "../api.js";

export async function listarNotificacoes(limite = 10) {
  const response = await apiClient.get(
    "/notificacoes?limite=" + encodeURIComponent(limite),
  );

  if (!response?.ok) {
    throw new Error(
      response?.data?.error || "Não foi possível carregar as notificações.",
    );
  }

  return response.data?.dados || [];
}

export async function enviarNotificacao(dados = {}) {
  const response = await apiClient.post("/notificacoes", dados);

  if (!response?.ok) {
    throw new Error(
      response?.data?.error || "Não foi possível enviar a mensagem no momento.",
    );
  }

  return response.data;
}

export async function marcarComoLida(id) {
  const response = await apiClient.patch(
    `/notificacoes/${encodeURIComponent(id)}/lida`,
  );

  if (!response?.ok) {
    throw new Error(
      response?.data?.error || "Não foi possível marcar a notificação como lida.",
    );
  }

  return response.data?.dados ?? null;
}
