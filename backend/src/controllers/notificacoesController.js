import { prisma } from "../config/db.js";

export function normalizarNotificacao(item = {}) {
  const assunto = item.assunto || item.titulo || "Nova mensagem";
  const descricao = item.descricao || item.mensagem || "Mensagem registrada no sistema.";
  const instituicao = item.instituicao || item.remetente || "Sistema";

  return {
    id: Number(item.id) || Date.now() + Math.random(),
    instituicao,
    assunto,
    descricao,
    mensagem: item.mensagem || descricao,
    tipo: item.tipo || "MENSAGEM",
    destinatario: item.destinatario || "Administrador Geral",
    remetente: item.remetente || instituicao,
    lida: Boolean(item.lida),
    data: item.data || item.criadoEm || new Date().toISOString(),
  };
}

class NotificacoesController {
  async listar(req, res) {
    try {
      const limite = Math.min(Math.max(Number(req.query.limite) || 10, 1), 50);

      const registros = await prisma.notificacao.findMany({
        orderBy: { criadoEm: "desc" },
        take: limite,
      });

      const dados = registros.map((item) => normalizarNotificacao({
        ...item,
        data: item.criadoEm,
      }));

      return res.status(200).json({
        ok: true,
        dados,
        total: dados.length,
      });
    } catch (error) {
      console.error("Erro ao listar notificações:", error);
      return res.status(500).json({
        ok: false,
        error: "Erro interno ao listar notificações.",
      });
    }
  }

  async criar(req, res) {
    try {
      const body = req.body || {};

      const payload = {
        instituicao: String(body.instituicao || body.remetente || "Sistema").trim(),
        assunto: String(body.assunto || "Nova mensagem").trim(),
        descricao: String(body.descricao || body.mensagem || "Mensagem registrada pelo sistema.").trim(),
        mensagem: String(body.mensagem || body.descricao || "Mensagem registrada pelo sistema.").trim(),
        tipo: String(body.tipo || "MENSAGEM").trim(),
        destinatario: body.destinatario ? String(body.destinatario).trim() : "Administrador Geral",
        remetente: body.remetente ? String(body.remetente).trim() : body.instituicao || "Sistema",
        lida: Boolean(body.lida),
      };

      if (!payload.instituicao || !payload.assunto || !payload.descricao) {
        return res.status(400).json({
          ok: false,
          error: "Instituição, assunto e descrição são obrigatórios.",
        });
      }

      const registro = await prisma.notificacao.create({
        data: payload,
      });

      return res.status(201).json({
        ok: true,
        mensagem: "Notificação criada com sucesso.",
        dados: normalizarNotificacao({
          ...registro,
          data: registro.criadoEm,
        }),
      });
    } catch (error) {
      console.error("Erro ao criar notificação:", error);
      return res.status(500).json({
        ok: false,
        error: "Erro interno ao criar notificação.",
      });
    }
  }

  async marcarComoLida(req, res) {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ ok: false, error: "ID da notificação inválido." });
      }

      const registro = await prisma.notificacao.update({
        where: { id },
        data: { lida: true },
      });

      return res.status(200).json({
        ok: true,
        mensagem: "Notificação marcada como lida.",
        dados: normalizarNotificacao({
          ...registro,
          data: registro.criadoEm,
        }),
      });
    } catch (error) {
      console.error("Erro ao marcar notificação como lida:", error);
      return res.status(404).json({
        ok: false,
        error: "Notificação não encontrada.",
      });
    }
  }
}

export default new NotificacoesController();
