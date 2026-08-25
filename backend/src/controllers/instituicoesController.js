import { prisma } from "../config/db.js";
import bcrypt from "bcrypt";
import { createPassword } from "../utils/generatePassword.js";
import { criarInstituicaoSchema } from "../validators/instituicaoValidator.js";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

function idValido(id) {
  return Number.isInteger(id) && id > 0;
}

function montarFiltrosInstituicoes(query) {
  const { nome, tipo, cidade, statusOk, ativa } = query;
  const where = {
    deletedAt: null,
  };

  if (nome) {
    where.nome = {
      contains: nome,
      mode: "insensitive",
    };
  }

  if (tipo) {
    where.tipo = tipo.toUpperCase();
  }

  if (cidade) {
    where.cidade = {
      contains: cidade,
      mode: "insensitive",
    };
  }

  if (statusOk) {
    where.statusOk = statusOk.toUpperCase();
  }

  if (ativa !== undefined) {
    where.ativa = ativa === "true";
  }

  return where;
}

function montarOrdenacao(sort) {
  if (!sort) {
    return {
      nome: "asc",
    };
  }

  const camposPermitidos = [
    "id",
    "nome",
    "email",
    "tipo",
    "responsavel",
    "cidade",
    "statusOk",
    "ativa",
    "createdAt",
  ];

  const ordenacoes = sort
    .split(",")
    .map((item) => {
      const [campo, direcao] = item.split(":");

      if (!camposPermitidos.includes(campo)) {
        return null;
      }

      const direcaoNormalizada =
        direcao?.toLowerCase() === "desc" ? "desc" : "asc";

      return {
        [campo]: direcaoNormalizada,
      };
    })
    .filter(Boolean);

  return ordenacoes.length > 0
    ? ordenacoes
    : {
        nome: "asc",
      };
}

const atualizarInstituicaoSchema = criarInstituicaoSchema.partial();

class InstituicaoController {
  async listarInstituicoes(req, res) {
    try {
      const page = Math.max(Number(req.query.page) || 1, 1);
      const limit = Math.min(Math.max(Number(req.query.limit) || 25, 1), 100);
      const where = montarFiltrosInstituicoes(req.query);
      const orderBy = montarOrdenacao(req.query.sort);

      const [instituicoes, total] = await prisma.$transaction([
        prisma.instituicaoParceira.findMany({
          where,
          orderBy,
          take: limit,
          skip: (page - 1) * limit,
        }),

        prisma.instituicaoParceira.count({
          where,
        }),
      ]);

      return res.status(200).json({
        dados: instituicoes,
        paginacao: {
          paginaAtual: page,
          quantidadePorPagina: limit,
          totalRegistros: total,
          totalPaginas: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("GET /instituicoes error:", error);

      return res.status(500).json({
        error: "Erro interno ao listar as instituições.",
      });
    }
  }

  async cadastrarInstituicao(req, res) {
    try {
      // Valida os dados recebidos pelo formulário.
      const data = criarInstituicaoSchema.parse(req.body);

      const emailNormalizado = data.email.trim().toLowerCase();

      const usuarioExistente = await prisma.usuario.findUnique({
        where: {
          email: emailNormalizado,
        },
      });

      if (usuarioExistente) {
        return res.status(409).json({
          error: "Já existe um usuário cadastrado com esse e-mail.",
        });
      }

      const senhaGerada = createPassword();

      if (typeof senhaGerada !== "string" || senhaGerada.trim().length < 8) {
        console.error("A função createPassword não gerou uma senha válida.");

        return res.status(500).json({
          error: "Não foi possível gerar a senha temporária.",
        });
      }

      const senhaHash = await bcrypt.hash(senhaGerada, 12);

      /*
       * Cria o usuário e a instituição na mesma operação.
       * Caso alguma criação falhe, nenhuma delas será salva.
       */
      const novoUsuario = await prisma.usuario.create({
        data: {
          nome: data.responsavel.trim(),
          email: emailNormalizado,
          senhaHash,

          // A instituição precisará trocar a senha no primeiro acesso
          senhaProvisoria: true,

          role: "INSTITUICAO",

          instituicao: {
            create: {
              nome: data.nome.trim(),
              cnpj: data.cnpj,
              email: emailNormalizado,
              tipo: data.tipo,
              responsavel: data.responsavel.trim(),
              telefone: data.telefone,

              // Mantém o campo legado "endereco" preenchido.
              endereco: [data.logradouro, data.numero, data.complemento]
                .filter(Boolean)
                .join(", "),

              cep: data.cep,
              logradouro: data.logradouro,
              numero: data.numero,
              complemento: data.complemento || null,
              bairro: data.bairro,
              cidade: data.cidade,
              uf: data.uf,
            },
          },
        },

        include: {
          instituicao: true,
        },
      });

      res.setHeader("Cache-Control", "no-store");

      return res.status(201).json({
        mensagem: "Instituição cadastrada com sucesso!",
        credenciais: {
          email: novoUsuario.email,
          senhaTemporaria: senhaGerada,
        },
        instituicao: novoUsuario.instituicao,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: "Dados inválidos.",
          issues: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        });
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return res.status(409).json({
          error: "Já existe um cadastro utilizando esse e-mail.",
        });
      }

      console.error("POST /instituicoes error:", error);

      return res.status(500).json({
        error: "Erro interno ao cadastrar a instituição.",
      });
    }
  }

  async detalheDaInstituicao(req, res) {
    const id = Number(req.params.id);

    if (!idValido(id)) {
      return res.status(400).json({
        error: "ID inválido. Informe um número inteiro positivo.",
      });
    }

    try {
      const instituicao = await prisma.instituicaoParceira.findFirst({
        where: {
          id,
          deletedAt: null,
        },
      });

      if (!instituicao) {
        return res.status(404).json({
          error: "Instituição não encontrada.",
        });
      }

      return res.status(200).json(instituicao);
    } catch (error) {
      console.error(`GET /instituicoes/${id} error:`, error);

      return res.status(500).json({
        error: "Erro interno ao buscar a instituição.",
      });
    }
  }

  async atualizarDadosInstituicao(req, res) {
    const id = Number(req.params.id);

    if (!idValido(id)) {
      return res.status(400).json({
        error: "ID inválido. Informe um número inteiro positivo.",
      });
    }

    try {
      const data = atualizarInstituicaoSchema.parse(req.body);

      const instituicaoExistente = await prisma.instituicaoParceira.findFirst({
        where: {
          id,
          deletedAt: null,
        },
      });

      if (!instituicaoExistente) {
        return res.status(404).json({
          error: "Instituição não encontrada.",
        });
      }

      const dadosAtualizacao = {
        ...data,
      };

      if (data.email) {
        dadosAtualizacao.email = data.email.trim().toLowerCase();
      }

      if (data.nome) {
        dadosAtualizacao.nome = data.nome.trim();
      }

      if (data.responsavel) {
        dadosAtualizacao.responsavel = data.responsavel.trim();
      }

      // Mantém o campo legado "endereco" sincronizado com os campos estruturados.
      if (
        data.logradouro !== undefined ||
        data.numero !== undefined ||
        data.complemento !== undefined
      ) {
        const logradouro =
          data.logradouro ?? instituicaoExistente.logradouro ?? "";

        const numero = data.numero ?? instituicaoExistente.numero ?? "";

        const complemento =
          data.complemento ?? instituicaoExistente.complemento ?? "";

        dadosAtualizacao.endereco = [logradouro, numero, complemento]
          .filter(Boolean)
          .join(", ");
      }

      const instituicaoAtualizada = await prisma.instituicaoParceira.update({
        where: {
          id,
        },
        data: dadosAtualizacao,
      });

      return res.status(200).json({
        mensagem: "Instituição atualizada com sucesso.",
        instituicao: instituicaoAtualizada,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: "Dados inválidos.",
          issues: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        });
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        return res.status(404).json({
          error: "Instituição não encontrada.",
        });
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return res.status(409).json({
          error: "Já existe um cadastro utilizando esse e-mail.",
        });
      }

      console.error(`PUT /instituicoes/${id} error:`, error);

      return res.status(500).json({
        error: "Erro interno ao atualizar a instituição.",
      });
    }
  }

  async desativarInstituicao(req, res) {
    const id = Number(req.params.id);

    if (!idValido(id)) {
      return res.status(400).json({
        error: "ID inválido.",
      });
    }

    try {
      const instituicao = await prisma.instituicaoParceira.findUnique({
        where: { id },
      });

      if (!instituicao) {
        return res.status(404).json({
          error: "Instituição não encontrada.",
        });
      }

      const data = atualizarInstituicaoSchema.parse(req.body);
      const { ativa } = data;

      if (typeof ativa !== "boolean") {
        return res.status(400).json({
          error: "O campo ativa deve ser true ou false.",
        });
      }

      const instituicaoAtualizada = await prisma.$transaction(async (tx) => {
        const atualizada = await tx.instituicaoParceira.update({
          where: { id },
          data: { ativa },
        });

        await tx.usuario.updateMany({
          where: { instituicaoId: id },
          data: { ativo: ativa },
        });

        return atualizada;
      });

      return res.status(200).json({
        mensagem: ativa
          ? "Instituição ativada com sucesso."
          : "Instituição inativada com sucesso.",
        instituicao: instituicaoAtualizada,
      });
      
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        return res.status(404).json({
          error: "Instituição não encontrada.",
        });
      }

      console.error(`DELETE /instituicoes/${id} error:`, error);

      return res.status(500).json({
        error: "Erro interno ao remover a instituição.",
      });
    }
  }

  async atualizaStatus(req, res) {
    const id = Number(req.params.id);

    if (!idValido(id)) {
      return res.status(400).json({
        error: "ID inválido. Informe um número inteiro positivo.",
      });
    }

    try {
      const { statusOk } = req.body;

      const statusNormalizado =
        typeof statusOk === "string" ? statusOk.toUpperCase() : "";

      const valoresValidos = ["OK", "PENDENTE"];

      if (!valoresValidos.includes(statusNormalizado)) {
        return res.status(400).json({
          error: 'O status deve ser "OK" ou "PENDENTE".',
        });
      }

      const instituicao = await prisma.instituicaoParceira.findFirst({
        where: {
          id,
          deletedAt: null,
        },
      });

      if (!instituicao) {
        return res.status(404).json({
          error: "Instituição não encontrada.",
        });
      }

      const instituicaoAtualizada = await prisma.instituicaoParceira.update({
        where: {
          id,
        },
        data: {
          statusOk: statusNormalizado,
        },
      });

      return res.status(200).json({
        mensagem: "Status atualizado com sucesso.",
        instituicao: instituicaoAtualizada,
      });
    } catch (error) {
      console.error(`PATCH /instituicoes/${id}/status error:`, error);

      return res.status(500).json({
        error: "Erro interno ao atualizar o status.",
      });
    }
  }

  async listarBeneficiariosInstituicao(req, res) {
    const id = Number(req.params.id);

    if (!idValido(id)) {
      return res.status(400).json({
        error: "ID inválido. Informe um número inteiro positivo.",
      });
    }

    try {
      const instituicao = await prisma.instituicaoParceira.findFirst({
        where: {
          id,
          deletedAt: null,
        },
      });

      if (!instituicao) {
        return res.status(404).json({
          error: "Instituição não encontrada.",
        });
      }

      const beneficiarios = await prisma.beneficiario.findMany({
        where: {
          instituicaoId: id,
        },
        orderBy: {
          nomeCompleto: "asc",
        },
      });

      return res.status(200).json(beneficiarios);
    } catch (error) {
      console.error(`GET /instituicoes/${id}/beneficiarios error:`, error);

      return res.status(500).json({
        error: "Erro interno ao listar os beneficiários da instituição.",
      });
    }
  }
}

export default new InstituicaoController();
