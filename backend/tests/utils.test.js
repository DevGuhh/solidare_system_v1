import test from "node:test";
import assert from "node:assert/strict";

import { gerarCodigoDoacao } from "../src/utils/generateCode.js";
import { createPassword } from "../src/utils/generatePassword.js";
import { calcularQuantidadeCestas } from "../src/utils/generateQtdCestas.js";
import { validarCNPJ } from "../src/utils/cnpj.js";
import {
  criptografarSenhaProvisoria,
  descriptografarSenhaProvisoria,
} from "../src/utils/provisionalPasswordCrypto.js";

test("gerarCodigoDoacao deve gerar código no formato correto", () => {
  const codigo = gerarCodigoDoacao();

  assert.match(codigo, /^DOA-\d{8}-[A-F0-9]{6}$/);
});

test("createPassword deve gerar senha com 10 caracteres", () => {
  const senha = createPassword();

  assert.equal(senha.length, 10);
});

test("calcularQuantidadeCestas deve calcular corretamente", () => {
  assert.equal(calcularQuantidadeCestas(1), 1);
  assert.equal(calcularQuantidadeCestas(3), 1);
  assert.equal(calcularQuantidadeCestas(4), 2);
  assert.equal(calcularQuantidadeCestas(6), 2);
  assert.equal(calcularQuantidadeCestas(7), 3);
});

test("validarCNPJ deve aceitar CNPJ válido", () => {
  assert.equal(validarCNPJ("11.222.333/0001-81"), true);
});

test("validarCNPJ deve rejeitar CNPJ inválido", () => {
  assert.equal(validarCNPJ("11.222.333/0001-82"), false);
  assert.equal(validarCNPJ("00.000.000/0000-00"), false);
  assert.equal(validarCNPJ("123"), false);
});

test("senha provisória deve ser criptografada e descriptografada", () => {
  process.env.PROVISIONAL_PASSWORD_ENCRYPTION_KEY =
    "chave-de-teste-segura-123456";

  const senhaOriginal = "SenhaTeste123";
  const criptografada = criptografarSenhaProvisoria(senhaOriginal);
  const descriptografada =
    descriptografarSenhaProvisoria(criptografada);

  assert.notEqual(criptografada, senhaOriginal);
  assert.equal(descriptografada, senhaOriginal);
});

test("criptografia deve gerar valores diferentes para a mesma senha", () => {
  process.env.PROVISIONAL_PASSWORD_ENCRYPTION_KEY =
    "chave-de-teste-segura-123456";

  const primeira = criptografarSenhaProvisoria("SenhaTeste123");
  const segunda = criptografarSenhaProvisoria("SenhaTeste123");

  assert.notEqual(primeira, segunda);

  assert.equal(
    descriptografarSenhaProvisoria(primeira),
    "SenhaTeste123",
  );

  assert.equal(
    descriptografarSenhaProvisoria(segunda),
    "SenhaTeste123",
  );
});