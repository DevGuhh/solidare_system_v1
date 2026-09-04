import { prisma } from "../config/db.js";
import { ZodError } from "zod";
import { registrarEntradaSaldoSchema } from "../validators/saldoCestaValidator.js";
import {
  registrarEntrada,
  obterSaldo,
  listarHistorico,
} from "../services/saldoCestaService.js";
import { calcularQuantidadeCestas } from "../utils/generateQtdCestas.js";

function idValido(id) {
  return Number.isInteger(id) && id > 0;
}

class SaldoCestaController {
  async registrarEntrada(req, res) {
    try {
      const data = registrarEntradaSaldoSchema.parse(req.body);

      const instituicao = await prisma.instituicaoParceira.findFirst({
        where: { id: data.instituicaoId, deletedAt: null },
        select: { id: true },
      });

      if (!instituicao) {
        return res.status(404).json({ error: "Instituição não encontrada." });
      }

      const movimentacao = await registrarEntrada({
        instituicaoId: data.instituicaoId,
        quantidade: data.quantidade,
        observacao: data.observacao,
        usuarioId: req.user.id,
      });

      return res.status(201).json(movimentacao);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: "Payload inválido.",
          issues: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        });
      }

      console.error("POST /saldo-cestas/entrada error:", error);
      return res.status(500).json({ error: "Erro interno ao registrar entrada de saldo." });
    }
  }

  async recomendacaoEnvio(req, res) {
    const instituicaoId = Number(req.params.instituicaoId);
    if (!idValido(instituicaoId)) return res.status(400).json({ error: "ID inválido." });

    try {
      const instituicao = await prisma.instituicaoParceira.findFirst({
        where: { id: instituicaoId, deletedAt: null },
        select: { id: true, nome: true, ativa: true },
      });
      if (!instituicao) return res.status(404).json({ error: "Instituição não encontrada." });

      const agora = new Date();
      const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
      const inicioProximoMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 1);

      const [beneficiarios, saldo] = await Promise.all([
        prisma.beneficiario.findMany({
          where: { instituicaoId, ativo: true, deletedAt: null, tipoBeneficio: { in: ["CESTA", "AMBOS"] } },
          select: {
            id: true,
            composicaoFamiliar: true,
            doacoes: {
              where: { deletedAt: null, dataDoacao: { gte: inicioMes, lt: inicioProximoMes } },
              select: { id: true },
              take: 1,
            },
          },
        }),
        prisma.saldoCesta.findUnique({ where: { instituicaoId }, select: { saldoAtual: true } }),
      ]);

      let necessidadeMensalTotal = 0;
      let necessidadePendente = 0;
      let atendidosNoMes = 0;

      for (const beneficiario of beneficiarios) {
        const composicao = Math.max(Number(beneficiario.composicaoFamiliar) || 1, 1);
        const quantidade = Math.max(calcularQuantidadeCestas(composicao), 1);
        necessidadeMensalTotal += quantidade;
        if (beneficiario.doacoes.length > 0) atendidosNoMes += 1;
        else necessidadePendente += quantidade;
      }

      const beneficiariosAtivosCesta = beneficiarios.length;
      const pendentesNoMes = Math.max(beneficiariosAtivosCesta - atendidosNoMes, 0);
      const saldoAtual = Math.max(Number(saldo?.saldoAtual ?? 0), 0);
      const sugestaoEnvio = Math.max(necessidadePendente - saldoAtual, 0);

      return res.status(200).json({
        instituicao,
        referencia: { mes: agora.getMonth() + 1, ano: agora.getFullYear() },
        beneficiariosAtivosCesta,
        atendidosNoMes,
        pendentesNoMes,
        necessidadeMensalTotal,
        necessidadePendente,
        saldoAtual,
        sugestaoEnvio,
        saldoProjetado: saldoAtual + sugestaoEnvio,
        sobraProjetada: Math.max(saldoAtual + sugestaoEnvio - necessidadePendente, 0),
        regra: "1 cesta a cada 3 pessoas da composição familiar",
      });
    } catch (error) {
      console.error(`GET /saldo-cestas/${instituicaoId}/recomendacao error:`, error);
      return res.status(500).json({ error: "Erro ao calcular a sugestão de envio de cestas." });
    }
  }

  async detalheSaldo(req, res) {
    const instituicaoId = Number(req.params.instituicaoId);

    if (!idValido(instituicaoId)) {
      return res.status(400).json({ error: "ID inválido." });
    }

    if (req.user.role !== "ADMIN" && req.user.instituicaoId !== instituicaoId) {
      return res.status(403).json({ error: "Acesso não autorizado a este saldo." });
    }

    try {
      const saldo = await obterSaldo(instituicaoId);
      return res.status(200).json(saldo);
    } catch (error) {
      console.error(`GET /saldo-cestas/${instituicaoId} error:`, error);
      return res.status(500).json({ error: "Erro ao buscar saldo." });
    }
  }

  async historicoSaldo(req, res) {
    const instituicaoId = Number(req.params.instituicaoId);

    if (!idValido(instituicaoId)) {
      return res.status(400).json({ error: "ID inválido." });
    }

    if (req.user.role !== "ADMIN" && req.user.instituicaoId !== instituicaoId) {
      return res.status(403).json({ error: "Acesso não autorizado a este histórico." });
    }

    try {
      const page = Math.max(Number(req.query.page) || 1, 1);
      const pageSize = Math.min(Math.max(Number(req.query.pageSize) || 20, 1), 100);
      const { tipo } = req.query;

      const resultado = await listarHistorico(instituicaoId, { page, pageSize, tipo });
      return res.status(200).json(resultado);
    } catch (error) {
      console.error(`GET /saldo-cestas/${instituicaoId}/historico error:`, error);
      return res.status(500).json({ error: "Erro ao buscar histórico de saldo." });
    }
  }

  async listarSaldos(req, res) {
    try {
      const saldos = await prisma.saldoCesta.findMany({
        include: { instituicao: { select: { id: true, nome: true } } },
        orderBy: { instituicao: { nome: "asc" } },
      });
      return res.status(200).json(saldos);
    } catch (error) {
      console.error("GET /saldo-cestas error:", error);
      return res.status(500).json({ error: "Erro ao listar saldos." });
    }
  }
}

export default new SaldoCestaController();