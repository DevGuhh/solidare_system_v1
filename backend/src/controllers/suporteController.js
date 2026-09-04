import { prisma } from "../config/db.js";

const CATEGORIAS = new Set([
  "ALTERACAO_CADASTRAL",
  "DUVIDA",
  "PROBLEMA_TECNICO",
  "OUTRO",
]);

const STATUS = new Set([
  "ABERTO",
  "EM_ATENDIMENTO",
  "AGUARDANDO_INSTITUICAO",
  "RESOLVIDO",
]);

function idValido(valor) {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function texto(valor, maximo) {
  const resultado = String(valor ?? "").trim();
  if (!resultado || resultado.length > maximo) return null;
  return resultado;
}

function filtroAcesso(req) {
  if (req.user.role === "INSTITUICAO") {
    return { instituicaoId: req.user.instituicaoId };
  }
  return {};
}

async function buscarChamadoAcessivel(req, id, incluirMensagens = false) {
  return prisma.chamadoSuporte.findFirst({
    where: {
      id,
      ...filtroAcesso(req),
    },
    include: {
      instituicao: {
        select: {
          id: true,
          nome: true,
          email: true,
        },
      },
      ...(incluirMensagens
        ? {
            mensagens: {
              orderBy: { criadoEm: "asc" },
            },
          }
        : {}),
    },
  });
}

function serializarChamado(chamado, roleAtual) {
  const mensagens = chamado.mensagens || [];
  const naoLidas = mensagens.filter(
    (mensagem) => !mensagem.lida && mensagem.autorRole !== roleAtual,
  ).length;

  const ultimaMensagem =
    mensagens.length > 0
      ? mensagens[mensagens.length - 1]
      : null;

  return {
    ...chamado,
    naoLidas,
    ultimaMensagem,
  };
}

class SuporteController {
  async listar(req, res) {
    try {
      const limite = Math.min(
        Math.max(Number(req.query.limite) || 50, 1),
        100,
      );

      const statusInformado = String(req.query.status || "")
        .trim()
        .toUpperCase();

      const where = {
        ...filtroAcesso(req),
      };

      if (statusInformado && STATUS.has(statusInformado)) {
        where.status = statusInformado;
      }

      const chamados = await prisma.chamadoSuporte.findMany({
        where,
        orderBy: { atualizadoEm: "desc" },
        take: limite,
        include: {
          instituicao: {
            select: {
              id: true,
              nome: true,
              email: true,
            },
          },
          mensagens: {
            orderBy: { criadoEm: "asc" },
            select: {
              id: true,
              autorRole: true,
              autorNome: true,
              mensagem: true,
              lida: true,
              criadoEm: true,
            },
          },
        },
      });

      const dados = chamados.map((chamado) =>
        serializarChamado(chamado, req.user.role),
      );

      const totalNaoLidas = dados.reduce(
        (soma, chamado) => soma + chamado.naoLidas,
        0,
      );

      return res.status(200).json({
        ok: true,
        dados,
        totalNaoLidas,
      });
    } catch (error) {
      console.error("Erro ao listar chamados de suporte:", error);
      return res.status(500).json({
        ok: false,
        error: "Erro interno ao listar chamados de suporte.",
      });
    }
  }

  async criar(req, res) {
    try {
      if (req.user.role !== "INSTITUICAO") {
        return res.status(403).json({
          ok: false,
          error: "A abertura de chamados é exclusiva para instituições.",
        });
      }

      const instituicaoId = idValido(req.user.instituicaoId);
      if (!instituicaoId) {
        return res.status(403).json({
          ok: false,
          error: "Usuário não está vinculado a uma instituição válida.",
        });
      }

      const assunto = texto(req.body?.assunto, 150);
      const mensagem = texto(req.body?.mensagem, 4000);
      const categoria = String(req.body?.categoria || "")
        .trim()
        .toUpperCase();

      if (!assunto || !mensagem || !CATEGORIAS.has(categoria)) {
        return res.status(400).json({
          ok: false,
          error:
            "Informe assunto, categoria e uma mensagem válida para abrir o chamado.",
        });
      }

      const instituicao = await prisma.instituicaoParceira.findFirst({
        where: {
          id: instituicaoId,
          ativa: true,
          deletedAt: null,
        },
        select: {
          id: true,
          nome: true,
        },
      });

      if (!instituicao) {
        return res.status(403).json({
          ok: false,
          error: "Instituição inválida ou inativa.",
        });
      }

      const chamado = await prisma.chamadoSuporte.create({
        data: {
          instituicaoId,
          assunto,
          categoria,
          criadoPorNome: req.user.nome || instituicao.nome,
          mensagens: {
            create: {
              autorRole: "INSTITUICAO",
              autorNome: req.user.nome || instituicao.nome,
              mensagem,
            },
          },
        },
        include: {
          instituicao: {
            select: {
              id: true,
              nome: true,
              email: true,
            },
          },
          mensagens: {
            orderBy: { criadoEm: "asc" },
          },
        },
      });

      return res.status(201).json({
        ok: true,
        mensagem: "Chamado aberto com sucesso.",
        dados: serializarChamado(chamado, req.user.role),
      });
    } catch (error) {
      console.error("Erro ao criar chamado de suporte:", error);
      return res.status(500).json({
        ok: false,
        error: "Erro interno ao abrir chamado de suporte.",
      });
    }
  }

  async detalhar(req, res) {
    try {
      const id = idValido(req.params.id);
      if (!id) {
        return res.status(400).json({
          ok: false,
          error: "ID do chamado inválido.",
        });
      }

      const chamado = await buscarChamadoAcessivel(req, id, true);

      if (!chamado) {
        return res.status(404).json({
          ok: false,
          error: "Chamado não encontrado.",
        });
      }

      await prisma.mensagemSuporte.updateMany({
        where: {
          chamadoId: id,
          lida: false,
          autorRole: {
            not: req.user.role,
          },
        },
        data: {
          lida: true,
        },
      });

      chamado.mensagens = chamado.mensagens.map((mensagem) => ({
        ...mensagem,
        lida:
          mensagem.autorRole !== req.user.role
            ? true
            : mensagem.lida,
      }));

      return res.status(200).json({
        ok: true,
        dados: serializarChamado(chamado, req.user.role),
      });
    } catch (error) {
      console.error("Erro ao detalhar chamado de suporte:", error);
      return res.status(500).json({
        ok: false,
        error: "Erro interno ao carregar o chamado.",
      });
    }
  }

  async responder(req, res) {
    try {
      const id = idValido(req.params.id);
      const mensagem = texto(req.body?.mensagem, 4000);

      if (!id || !mensagem) {
        return res.status(400).json({
          ok: false,
          error: "Chamado ou mensagem inválidos.",
        });
      }

      const chamado = await buscarChamadoAcessivel(req, id, false);

      if (!chamado) {
        return res.status(404).json({
          ok: false,
          error: "Chamado não encontrado.",
        });
      }

      if (chamado.status === "RESOLVIDO") {
        return res.status(409).json({
          ok: false,
          error:
            "Este chamado já foi resolvido. Abra um novo chamado se precisar de outro atendimento.",
        });
      }

      const proximoStatus =
        req.user.role === "ADMIN"
          ? "AGUARDANDO_INSTITUICAO"
          : chamado.status === "ABERTO"
            ? "ABERTO"
            : "EM_ATENDIMENTO";

      const [, mensagemCriada] = await prisma.$transaction([
        prisma.chamadoSuporte.update({
          where: { id },
          data: {
            status: proximoStatus,
          },
        }),
        prisma.mensagemSuporte.create({
          data: {
            chamadoId: id,
            autorRole: req.user.role,
            autorNome:
              req.user.nome ||
              (req.user.role === "ADMIN"
                ? "Administrador"
                : chamado.instituicao.nome),
            mensagem,
          },
        }),
      ]);

      return res.status(201).json({
        ok: true,
        mensagem: "Resposta enviada com sucesso.",
        dados: mensagemCriada,
      });
    } catch (error) {
      console.error("Erro ao responder chamado:", error);
      return res.status(500).json({
        ok: false,
        error: "Erro interno ao responder chamado.",
      });
    }
  }

  async alterarStatus(req, res) {
    try {
      if (req.user.role !== "ADMIN") {
        return res.status(403).json({
          ok: false,
          error: "Apenas administradores podem alterar o status do chamado.",
        });
      }

      const id = idValido(req.params.id);
      const status = String(req.body?.status || "")
        .trim()
        .toUpperCase();

      if (!id || !STATUS.has(status)) {
        return res.status(400).json({
          ok: false,
          error: "Status inválido.",
        });
      }

      const chamado = await prisma.chamadoSuporte.findUnique({
        where: { id },
      });

      if (!chamado) {
        return res.status(404).json({
          ok: false,
          error: "Chamado não encontrado.",
        });
      }

      const atualizado = await prisma.chamadoSuporte.update({
        where: { id },
        data: {
          status,
          resolvidoEm:
            status === "RESOLVIDO"
              ? new Date()
              : null,
        },
        include: {
          instituicao: {
            select: {
              id: true,
              nome: true,
              email: true,
            },
          },
          mensagens: {
            orderBy: { criadoEm: "asc" },
          },
        },
      });

      return res.status(200).json({
        ok: true,
        mensagem: "Status atualizado.",
        dados: serializarChamado(atualizado, req.user.role),
      });
    } catch (error) {
      console.error("Erro ao alterar status do chamado:", error);
      return res.status(500).json({
        ok: false,
        error: "Erro interno ao alterar o status.",
      });
    }
  }
}

export default new SuporteController();
