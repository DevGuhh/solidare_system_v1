// =====================================================
// API DE QR CODES
// =====================================================

import { API_URL } from "../config.js";

// =====================================================
// OBTER TOKEN
// =====================================================

function obterToken() {
  return localStorage.getItem("token") || sessionStorage.getItem("token");
}

// =====================================================
// OBTER HEADERS
// =====================================================

function obterHeaders() {
  const token = obterToken();

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token || ""}`,
  };
}

// =====================================================
// VALIDAR ID
// =====================================================

function validarId(id) {
  const idNumerico = Number(id);

  if (!Number.isInteger(idNumerico) || idNumerico <= 0) {
    throw new Error("ID inválido.");
  }

  return idNumerico;
}

// =====================================================
// LISTAR QR CODES
// =====================================================

export async function listarQRCodes() {
  return fetch(`${API_URL}/qrcodes`, {
    method: "GET",
    headers: obterHeaders(),
    cache: "no-store",
  });
}

// =====================================================
// CRIAR QR CODE
// =====================================================

export async function criarQRCode(beneficiarioId) {
  const id = validarId(beneficiarioId);

  return fetch(`${API_URL}/qrcodes`, {
    method: "POST",
    headers: obterHeaders(),
    body: JSON.stringify({
      beneficiarioId: id,
    }),
  });
}

// =====================================================
// BUSCAR QR CODE
// =====================================================

export async function buscarQRCode(codigo) {
  const codigoNormalizado = String(codigo ?? "").trim();

  if (!codigoNormalizado) {
    throw new Error("Código do QR Code é obrigatório.");
  }

  return fetch(`${API_URL}/qrcodes/${encodeURIComponent(codigoNormalizado)}`, {
    method: "GET",
    headers: obterHeaders(),
    cache: "no-store",
  });
}

// =====================================================
// VALIDAR QR CODE
// =====================================================

export async function validarQRCode(codigo) {
  const codigoNormalizado = String(codigo ?? "").trim();

  if (!codigoNormalizado) {
    throw new Error("Código do QR Code é obrigatório.");
  }

  return fetch(
    `${API_URL}/qrcodes/${encodeURIComponent(codigoNormalizado)}/validar`,
    {
      method: "GET",
      headers: obterHeaders(),
      cache: "no-store",
    },
  );
}

// =====================================================
// CONFIRMAR ENTREGA DE CESTA PELO QR CODE
// =====================================================

export async function confirmarEntregaQRCode(codigo) {
  const codigoNormalizado = String(codigo ?? "").trim().toUpperCase();

  if (!codigoNormalizado) {
    throw new Error("Código do QR Code é obrigatório.");
  }

  return fetch(
    `${API_URL}/qrcodes/${encodeURIComponent(codigoNormalizado)}/confirmar-entrega`,
    {
      method: "POST",
      headers: obterHeaders(),
      body: JSON.stringify({}),
    },
  );
}

// =====================================================
// DESATIVAR QR CODE
// =====================================================

export async function desativarQRCode(id) {
  const idValidado = validarId(id);

  return fetch(`${API_URL}/qrcodes/${idValidado}`, {
    method: "PATCH",
    headers: obterHeaders(),
  });
}

// =====================================================
// OBTER IMAGEM DO QR CODE
// =====================================================

export async function obterImagemQRCode(codigo) {
  const codigoNormalizado = String(codigo ?? "").trim();

  if (!codigoNormalizado) {
    throw new Error("Código do QR Code é obrigatório.");
  }

  const token = obterToken();

  return fetch(
    `${API_URL}/qrcodes/${encodeURIComponent(codigoNormalizado)}/imagem`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token || ""}`,
      },
      cache: "no-store",
    },
  );
}
