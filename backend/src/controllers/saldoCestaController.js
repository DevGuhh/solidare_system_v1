import { prisma } from "../config/db.js";
import { ZodError } from "zod";
import { registrarEntradaSaldoSchema } from "../validators/saldoCestaValidator.js";
import {
  registrarEntrada,
  obterSaldo,
  listarHistorico,
} from "../services/saldoCestaService.js";

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