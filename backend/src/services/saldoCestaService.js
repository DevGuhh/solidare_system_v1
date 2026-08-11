import { prisma } from "../config/db.js";

const TIPOS_QUE_AFETAM_SALDO = ["CESTA", "AMBOS"];

export function afetaSaldoCesta(tipoBeneficio) {
  return TIPOS_QUE_AFETAM_SALDO.includes(tipoBeneficio);
}

export class SaldoInsuficienteError extends Error {
  constructor(saldoAtual, quantidadeSolicitada) {
    super(`Saldo de cestas insuficiente: disponível ${saldoAtual}, solicitado ${quantidadeSolicitada}.`);
    this.name = "SaldoInsuficienteError";
    this.status = 422;
  }
}

export async function obterOuCriarSaldo(tx, instituicaoId) {
  return tx.saldoCesta.upsert({
    where: { instituicaoId },
    create: { instituicaoId, saldoAtual: 0 },
    update: {},
  });
}

export async function registrarEntrada({ instituicaoId, quantidade, usuarioId, observacao }) {
  return prisma.$transaction(async (tx) => {
    const saldo = await obterOuCriarSaldo(tx, instituicaoId);
    const saldoPosterior = saldo.saldoAtual + quantidade;

    await tx.saldoCesta.update({
      where: { instituicaoId },
      data: { saldoAtual: saldoPosterior },
    });

    return tx.movimentacaoSaldo.create({
      data: {
        saldoCestaId: saldo.id,
        tipo: "ENTRADA",
        quantidade,
        saldoAnterior: saldo.saldoAtual,
        saldoPosterior,
        usuarioId,
        observacao,
      },
    });
  });
}

export async function debitarSaldoParaDoacao(tx, { instituicaoId, quantidade, doacaoId, usuarioId, observacao }) {
  const saldo = await obterOuCriarSaldo(tx, instituicaoId);

  if (saldo.saldoAtual < quantidade) {
    throw new SaldoInsuficienteError(saldo.saldoAtual, quantidade);
  }

  const saldoPosterior = saldo.saldoAtual - quantidade;

  await tx.saldoCesta.update({
    where: { instituicaoId },
    data: { saldoAtual: saldoPosterior },
  });

  await tx.movimentacaoSaldo.create({
    data: {
      saldoCestaId: saldo.id,
      tipo: "SAIDA_DOACAO",
      quantidade,
      saldoAnterior: saldo.saldoAtual,
      saldoPosterior,
      doacaoId,
      usuarioId,
      observacao,
    },
  });
}

export async function devolverSaldoDeDoacao(tx, { instituicaoId, quantidade, doacaoId, usuarioId, observacao }) {
  const saldo = await obterOuCriarSaldo(tx, instituicaoId);
  const saldoPosterior = saldo.saldoAtual + quantidade;

  await tx.saldoCesta.update({
    where: { instituicaoId },
    data: { saldoAtual: saldoPosterior },
  });

  await tx.movimentacaoSaldo.create({
    data: {
      saldoCestaId: saldo.id,
      tipo: "ESTORNO_DOACAO",
      quantidade,
      saldoAnterior: saldo.saldoAtual,
      saldoPosterior,
      doacaoId,
      usuarioId,
      observacao,
    },
  });
}

// Cobre edição de doação: muda quantidade, tipo, e até instituição
// (quando o beneficiário é trocado para outra instituição).
export async function ajustarSaldoEdicaoDoacao(tx, {
  instituicaoAntiga, tipoAntigo, quantidadeAntiga,
  instituicaoNova, tipoNovo, quantidadeNova,
  doacaoId, usuarioId,
}) {
  const debitoAntigo = afetaSaldoCesta(tipoAntigo) ? quantidadeAntiga : 0;
  const debitoNovo = afetaSaldoCesta(tipoNovo) ? quantidadeNova : 0;

  if (instituicaoAntiga === instituicaoNova) {
    const delta = debitoNovo - debitoAntigo;
    if (delta === 0) return;

    if (delta > 0) {
      await debitarSaldoParaDoacao(tx, {
        instituicaoId: instituicaoNova,
        quantidade: delta,
        doacaoId,
        usuarioId,
        observacao: "Ajuste por edição de doação",
      });
    } else {
      await devolverSaldoDeDoacao(tx, {
        instituicaoId: instituicaoAntiga,
        quantidade: -delta,
        doacaoId,
        usuarioId,
        observacao: "Ajuste por edição de doação",
      });
    }
    return;
  }

  // Beneficiário mudou de instituição: devolve tudo na antiga, debita na nova
  if (debitoAntigo > 0) {
    await devolverSaldoDeDoacao(tx, {
      instituicaoId: instituicaoAntiga,
      quantidade: debitoAntigo,
      doacaoId,
      usuarioId,
      observacao: "Estorno por transferência de instituição na edição",
    });
  }
  if (debitoNovo > 0) {
    await debitarSaldoParaDoacao(tx, {
      instituicaoId: instituicaoNova,
      quantidade: debitoNovo,
      doacaoId,
      usuarioId,
      observacao: "Baixa por transferência de instituição na edição",
    });
  }
}

export async function obterSaldo(instituicaoId) {
  const saldo = await prisma.saldoCesta.findUnique({ where: { instituicaoId } });
  return saldo ?? { instituicaoId, saldoAtual: 0 };
}

export async function listarHistorico(instituicaoId, { page = 1, pageSize = 20, tipo } = {}) {
  const saldo = await prisma.saldoCesta.findUnique({ where: { instituicaoId } });
  if (!saldo) return { items: [], total: 0, page, pageSize };

  const where = { saldoCestaId: saldo.id, ...(tipo ? { tipo } : {}) };

  const [items, total] = await Promise.all([
    prisma.movimentacaoSaldo.findMany({
      where,
      orderBy: { criadoEm: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.movimentacaoSaldo.count({ where }),
  ]);

  return { items, total, page, pageSize };
}