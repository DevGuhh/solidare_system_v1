import { apiClient } from "../api.js";

function validar(response, mensagemPadrao) {
  if (!response?.ok) {
    throw new Error(
      response?.data?.error ||
      response?.data?.message ||
      mensagemPadrao,
    );
  }
  return response.data;
}

export async function listarChamadosSuporte(limite = 50) {
  const response = await apiClient.get(
    `/suporte/chamados?limite=${encodeURIComponent(limite)}`,
  );
  return validar(
    response,
    "Não foi possível carregar os chamados.",
  );
}

export async function criarChamadoSuporte(dados) {
  const response = await apiClient.post(
    "/suporte/chamados",
    dados,
  );
  return validar(
    response,
    "Não foi possível abrir o chamado.",
  );
}

export async function detalharChamadoSuporte(id) {
  const response = await apiClient.get(
    `/suporte/chamados/${encodeURIComponent(id)}`,
  );
  return validar(
    response,
    "Não foi possível carregar o chamado.",
  );
}

export async function responderChamadoSuporte(id, mensagem) {
  const response = await apiClient.post(
    `/suporte/chamados/${encodeURIComponent(id)}/mensagens`,
    { mensagem },
  );
  return validar(
    response,
    "Não foi possível enviar a resposta.",
  );
}

export async function alterarStatusChamadoSuporte(id, status) {
  const response = await apiClient.patch(
    `/suporte/chamados/${encodeURIComponent(id)}/status`,
    { status },
  );
  return validar(
    response,
    "Não foi possível atualizar o status.",
  );
}
