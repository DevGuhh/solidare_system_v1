import { prisma } from "../config/db.js";

function numeroId(valor) {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function textoLimitado(valor, maximo) {
  const texto = String(valor ?? "").trim();
  return texto.length <= maximo ? texto : null;
}

async function buscarInstituicaoDoUsuario(req) {
  const instituicaoId = numeroId(req.user?.instituicaoId);
  if (!instituicaoId) return null;

  return prisma.instituicaoParceira.findUnique({
    where: { id: instituicaoId },
    select: { id: true, nome: true, ativa: true },
  });
}

async function resolverInstituicaoDestino(body = {}) {
  const idInformado =
    numeroId(body.instituicaoId) ||
    numeroId(body.destinatarioId) ||
    numeroId(body.remetenteId);

  if (idInformado) {
    return prisma.instituicaoParceira.findUnique({
      where: { id: idInformado },
      select: { id: true, nome: true, ativa: true },
    });
  }

  const ignorar = new Set(["", "Administrador Geral", "Sistema"]);
  const nomes = [body.instituicao, body.destinatario, body.remetente]
    .map((valor) => String(valor || "").trim())
    .filter((valor, indice, lista) => !ignorar.has(valor) && lista.indexOf(valor) === indice);

  for (const nome of nomes) {
    const encontradas = await prisma.instituicaoParceira.findMany({
      where: { nome },
      select: { id: true, nome: true, ativa: true },
      take: 2,
    });

    if (encontradas.length === 1) return encontradas[0];
    if (encontradas.length > 1) {
      const erro = new Error("Há mais de uma instituição com esse nome. Informe o ID da instituição.");
      erro.statusCode = 409;
      throw erro;
    }
  }

  return null;
}

export function normalizarNotificacao(item = {}) {
  const assunto = item.assunto || item.titulo || "Nova mensagem";
  const descricao =
    item.descricao || item.mensagem || "Mensagem registrada no sistema.";
  const instituicao = item.instituicao || item.remetente || "Sistema";

  return {
    id: Number(item.id) || Date.now() + Math.random(),
    instituicaoId: numeroId(item.instituicaoId),
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
      const where = {};

      if (req.user.role === "INSTITUICAO") {
        const instituicao = await buscarInstituicaoDoUsuario(req);
        if (!instituicao) {
          return res.status(403).json({
            ok: false,
            error: "Usuário não está vinculado a uma instituição válida.",
          });
        }
        where.instituicaoId = instituicao.id;
      }

      const registros = await prisma.notificacao.findMany({
        where,
        orderBy: { criadoEm: "desc" },
        take: limite,
      });

      const dados = registros.map((item) =>
        normalizarNotificacao({ ...item, data: item.criadoEm }),
      );

      return res.status(200).json({ ok: true, dados, total: dados.length });
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
      let instituicao = null;

      if (req.user.role === "INSTITUICAO") {
        instituicao = await buscarInstituicaoDoUsuario(req);
        if (!instituicao) {
          return res.status(403).json({
            ok: false,
            error: "Usuário não está vinculado a uma instituição válida.",
          });
        }
      } else {
        instituicao = await resolverInstituicaoDestino(body);
      }

      const assunto = textoLimitado(body.assunto || "Nova mensagem", 150);
      const descricao = textoLimitado(
        body.descricao || body.mensagem || "Mensagem registrada pelo sistema.",
        2000,
      );
      const mensagem = textoLimitado(
        body.mensagem || body.descricao || descricao,
        2000,
      );
      const tipo = textoLimitado(body.tipo || "MENSAGEM", 50);

      const instituicaoTexto = instituicao?.nome ||
        textoLimitado(body.instituicao || body.remetente || "Sistema", 150);

      const destinatario =
        req.user.role === "INSTITUICAO"
          ? "Administrador Geral"
          : textoLimitado(
              body.destinatario || instituicao?.nome || "Administrador Geral",
              150,
            );

      const remetente =
        req.user.role === "INSTITUICAO"
          ? instituicao.nome
          : textoLimitado(body.remetente || "Administrador Geral", 150);

      if (
        !instituicaoTexto ||
        !assunto ||
        !descricao ||
        !mensagem ||
        !tipo ||
        !destinatario ||
        !remetente
      ) {
        return res.status(400).json({
          ok: false,
          error:
            "Os campos da notificação são obrigatórios e devem respeitar os limites de tamanho.",
        });
      }

      const payload = {
        instituicaoId: instituicao?.id ?? null,
        instituicao: instituicaoTexto,
        assunto,
        descricao,
        mensagem,
        tipo,
        destinatario,
        remetente,
        lida: false,
      };

      if (req.user.role === "ADMIN" && !payload.instituicaoId) {
        return res.status(400).json({
          ok: false,
          error: "Não foi possível identificar a instituição destinatária da notificação.",
        });
      }

      const registro = await prisma.notificacao.create({ data: payload });

      return res.status(201).json({
        ok: true,
        sucesso: true,
        mensagem: "Notificação criada com sucesso.",
        dados: normalizarNotificacao({ ...registro, data: registro.criadoEm }),
      });
    } catch (error) {
      console.error("Erro ao criar notificação:", error);
      return res.status(error.statusCode || 500).json({
        ok: false,
        error: error.statusCode
          ? error.message
          : "Erro interno ao criar notificação.",
      });
    }
  }

  async marcarComoLida(req, res) {
    try {
      const id = numeroId(req.params.id);
      if (!id) {
        return res.status(400).json({
          ok: false,
          error: "ID da notificação inválido.",
        });
      }

      const where = { id };
      if (req.user.role === "INSTITUICAO") {
        const instituicao = await buscarInstituicaoDoUsuario(req);
        if (!instituicao) {
          return res.status(403).json({
            ok: false,
            error: "Usuário não está vinculado a uma instituição válida.",
          });
        }
        where.instituicaoId = instituicao.id;
      }

      const existente = await prisma.notificacao.findFirst({ where });
      if (!existente) {
        return res.status(404).json({
          ok: false,
          error: "Notificação não encontrada.",
        });
      }

      const registro = await prisma.notificacao.update({
        where: { id },
        data: { lida: true },
      });

      return res.status(200).json({
        ok: true,
        mensagem: "Notificação marcada como lida.",
        dados: normalizarNotificacao({ ...registro, data: registro.criadoEm }),
      });
    } catch (error) {
      console.error("Erro ao marcar notificação como lida:", error);
      return res.status(500).json({
        ok: false,
        error: "Erro interno ao marcar a notificação como lida.",
      });
    }
  }
}

export default new NotificacoesController();
