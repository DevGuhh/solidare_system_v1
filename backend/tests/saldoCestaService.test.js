import test from "node:test";
import assert from "node:assert/strict";
import {
  debitarSaldoParaDoacao,
  devolverSaldoDeDoacao,
  SaldoInsuficienteError,
} from "../src/services/saldoCestaService.js";

function criarTx(saldoInicial) {
  let saldo = saldoInicial;
  const movimentos = [];

  return {
    get saldoAtual() {
      return saldo;
    },
    get movimentos() {
      return movimentos;
    },
    saldoCesta: {
      async upsert() {
        return { id: 1, instituicaoId: 10, saldoAtual: saldo };
      },
      async updateMany({ where, data }) {
        const minimo = where?.saldoAtual?.gte ?? -Infinity;
        if (saldo < minimo) return { count: 0 };
        saldo -= data.saldoAtual.decrement;
        return { count: 1 };
      },
      async update({ data }) {
        if (data.saldoAtual?.increment) saldo += data.saldoAtual.increment;
        return { saldoAtual: saldo };
      },
      async findUnique() {
        return { saldoAtual: saldo };
      },
    },
    movimentacaoSaldo: {
      async create({ data }) {
        movimentos.push(data);
        return data;
      },
    },
  };
}

test("débito de saldo é condicional e preserva snapshots", async () => {
  const tx = criarTx(5);

  await debitarSaldoParaDoacao(tx, {
    instituicaoId: 10,
    quantidade: 3,
    doacaoId: 99,
    usuarioId: 7,
  });

  assert.equal(tx.saldoAtual, 2);
  assert.equal(tx.movimentos.length, 1);
  assert.equal(tx.movimentos[0].saldoAnterior, 5);
  assert.equal(tx.movimentos[0].saldoPosterior, 2);
});

test("débito não permite saldo negativo", async () => {
  const tx = criarTx(2);

  await assert.rejects(
    debitarSaldoParaDoacao(tx, {
      instituicaoId: 10,
      quantidade: 3,
      doacaoId: 99,
      usuarioId: 7,
    }),
    SaldoInsuficienteError,
  );

  assert.equal(tx.saldoAtual, 2);
  assert.equal(tx.movimentos.length, 0);
});

test("estorno incrementa saldo sem sobrescrever o valor corrente", async () => {
  const tx = criarTx(2);

  await devolverSaldoDeDoacao(tx, {
    instituicaoId: 10,
    quantidade: 3,
    doacaoId: 99,
    usuarioId: 7,
  });

  assert.equal(tx.saldoAtual, 5);
  assert.equal(tx.movimentos[0].saldoAnterior, 2);
  assert.equal(tx.movimentos[0].saldoPosterior, 5);
});
