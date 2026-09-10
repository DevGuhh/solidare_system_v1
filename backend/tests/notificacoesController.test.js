import test from "node:test";
import assert from "node:assert/strict";

import { normalizarNotificacao } from "../src/controllers/notificacoesController.js";

test("normaliza notificações para o formato esperado pelo dashboard", () => {
  const item = normalizarNotificacao({
    id: 7,
    instituicao: "Instituto Esperança",
    assunto: "Revisão de documentação",
    descricao: "Precisamos validar o último envio.",
    mensagem: "Precisamos validar o último envio.",
    lida: false,
    criadoEm: "2026-08-26T12:00:00.000Z",
  });

  assert.equal(item.id, 7);
  assert.equal(item.instituicao, "Instituto Esperança");
  assert.equal(item.assunto, "Revisão de documentação");
  assert.equal(item.descricao, "Precisamos validar o último envio.");
  assert.equal(item.lida, false);
  assert.ok(item.data);
});
