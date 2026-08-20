import { prisma } from "../config/db.js";
import { string, ZodError } from "zod";
import { criarBeneficiarioSchema } from "../validators/beneficiarioValidator.js";
import {
  registrarEventoHistorico,
  montarAlteracoesBeneficiario,
  descreverAlteracoes,
} from "../services/historicoBeneficiarioService.js";

// Schema usado para validar atualizações parciais do beneficiário.
const atualizarBeneficiarioSchema = criarBeneficiarioSchema.partial();

class BeneficiarioController {
  async cadastrarBeneficiario(req, res) {
    try {
      // Valida os dados recebidos no corpo da requisição.
      const data = criarBeneficiarioSchema.parse(req.body);

      // Verifica se já existe beneficiário com o mesmo CPF.
      const beneficiarioExiste = await prisma.beneficiario.findUnique({
        where: { cpf: data.cpf },
      });

      // Se já existir, bloqueia o cadastro.
      if (beneficiarioExiste) {
        return res.status(400).json({
          error: "Beneficiário já existente com este CPF",
        });
      }

      // Variável que vai guardar a instituição do beneficiário.
      let instituicaoId;

      // Se for ADMIN, ele pode escolher a instituição pelo formulário.
      if (req.user.role === "ADMIN") {
        instituicaoId = data.instituicaoId;
      } else {
        // Se for usuário de instituição, usa a instituição vinculada ao token.
        instituicaoId = req.user.instituicaoId;
      }

      // Segurança: se não houver instituição, bloqueia o cadastro.
      if (!instituicaoId) {
        return res.status(403).json({
          error: "Usuário não está vinculado a nenhuma instituição parceira.",
        });
      }

      // Cria o beneficiário no banco de dados.
      const novoBeneficiario = await prisma.beneficiario.create({
        data: {
          ...data,
          instituicaoId,
        },
      });

      await registrarEventoHistorico({
        beneficiarioId: novoBeneficiario.id,
        tipo: "CADASTRO",
        descricao: "Beneficiário cadastrado no sistema.",
        usuarioId: req.user.id,
      });

      // Retorna sucesso.
      return res.status(201).json({
        mensagem: "Beneficiário cadastrado com sucesso!",
        beneficiario: novoBeneficiario,
      });
    } catch (error) {
      // Trata erros de validação do Zod.
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: "Payload inválido",
          issues: error.issues.map((e) => ({
            path: e.path.join("."),
            message: e.message,
          })),
        });
      }

      console.error("POST /beneficiarios error:", error);

      return res.status(500).json({
        error: "Erro interno ao criar beneficiário",
      });
    }
  }

  async listarBeneficiarios(req, res) {
    try {
      // Filtro base: busca somente beneficiários não deletados.
      const where = { deletedAt: null };

      // Usuário INSTITUICAO só vê os beneficiários da própria instituição.
      if (req.user.role === "INSTITUICAO") {
        where.instituicaoId = req.user.instituicaoId;

        // ADMIN pode ver todos ou filtrar por uma instituição específica.
      } else if (req.user.role === "ADMIN") {
        if (req.query.instituicaoId !== undefined) {
          const instituicaoId = Number(req.query.instituicaoId);

          // Valida o ID recebido na query string.
          if (!Number.isInteger(instituicaoId) || instituicaoId <= 0) {
            return res.status(400).json({
              error:
                "O parâmetro instituicaoId deve ser um número inteiro válido.",
            });
          }

          where.instituicaoId = instituicaoId;
        }

        // Qualquer outro tipo de usuário é bloqueado.
      } else {
        return res.status(403).json({
          error: "Acesso não autorizado.",
        });
      }

      // Busca beneficiários no banco.
      const beneficiarios = await prisma.beneficiario.findMany({
        where,
        include: {
          instituicao: {
            select: {
              id: true,
              nome: true,
            },
          },
        },
        orderBy: {
          nomeCompleto: "asc",
        },
      });

      return res.status(200).json(beneficiarios);
    } catch (error) {
      console.error("GET /beneficiarios error:", error);

      return res.status(500).json({
        error: "Erro ao listar os beneficiários.",
      });
    }
  }
  async detalheDoBeneficiario(req, res) {
    const id = Number(req.params.id);

    // Valida o ID recebido pela URL.
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: "ID inválido.",
      });
    }

    try {
      // Filtro base.
      const where = {
        id,
        deletedAt: null,
      };

      // Usuário que não é ADMIN só pode acessar beneficiários da própria instituição.
      if (req.user.role !== "ADMIN") {
        where.instituicaoId = req.user.instituicaoId;
      }

      // Busca o beneficiário.
      const beneficiario = await prisma.beneficiario.findFirst({
        where,
      });

      // Se não encontrar, retorna erro 404.
      if (!beneficiario) {
        return res.status(404).json({
          error: "Beneficiário não encontrado",
        });
      }

      return res.status(200).json(beneficiario);
    } catch (error) {
      console.error(`GET /beneficiarios/${req.params.id} error:`, error);

      return res.status(500).json({
        error: "Erro ao buscar beneficiário.",
      });
    }
  }
  async atualizarDadosBeneficiario(req, res) {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: "ID inválido",
      });
    }

    try {
      const where = {
        id,
        deletedAt: null,
      };

      // Instituição só pode editar seus próprios beneficiários.
      if (req.user.role !== "ADMIN") {
        where.instituicaoId = req.user.instituicaoId;
      }

      // Confere se o beneficiário existe.
      const beneficiario = await prisma.beneficiario.findFirst({
        where,
      });

      if (!beneficiario) {
        return res.status(404).json({
          error: "Beneficiário não encontrado.",
        });
      }

      // Valida os dados enviados.
      const data = atualizarBeneficiarioSchema.parse(req.body);

      // CPF e data de nascimento são imutáveis após o cadastro.
      // Mesmo uma chamada manual à API não pode alterar esses campos.
      if (data.cpf !== undefined && data.cpf !== beneficiario.cpf) {
        return res.status(400).json({
          error: "O CPF não pode ser alterado após o cadastro.",
        });
      }

      if (data.dataNascimento !== undefined) {
        const dataAtual = new Date(beneficiario.dataNascimento).getTime();
        const dataRecebida = new Date(data.dataNascimento).getTime();

        if (dataAtual !== dataRecebida) {
          return res.status(400).json({
            error: "A data de nascimento não pode ser alterada após o cadastro.",
          });
        }
      }

      // Remove os campos imutáveis do objeto enviado ao Prisma.
      delete data.cpf;
      delete data.dataNascimento;

      const alteracoes = montarAlteracoesBeneficiario(beneficiario, data);

      // Atualiza no banco.
      const update = await prisma.beneficiario.update({
        where: { id },
        data,
      });

      if (alteracoes.length > 0) {
        await registrarEventoHistorico({
          beneficiarioId: id,
          tipo: "ATUALIZACAO",
          descricao: descreverAlteracoes(alteracoes),
          detalhes: { alteracoes },
          usuarioId: req.user.id,
        });
      }

      return res.status(200).json(update);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: "Payload inválido",
          issues: error.issues.map((e) => ({
            path: e.path.join("."),
            message: e.message,
          })),
        });
      }

      console.error(`PUT /beneficiarios/${req.params.id} error:`, error);

      return res.status(500).json({
        error: "Erro interno ao atualizar beneficiário.",
      });
    }
  }
  async desativarBeneficiario(req, res) {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: "ID inválido.",
      });
    }

    try {
      const where = { id };

      // Instituição só pode alterar status dos próprios beneficiários.
      if (req.user.role !== "ADMIN") {
        where.instituicaoId = req.user.instituicaoId;
      }

      const beneficiario = await prisma.beneficiario.findFirst({
        where,
      });

      if (!beneficiario) {
        return res.status(404).json({
          error: "Beneficiário não encontrado.",
        });
      }

      // Valida o corpo da requisição.
      const data = atualizarBeneficiarioSchema.parse(req.body);
      const { ativo } = data;

      // Garante que o status seja booleano.
      if (typeof ativo !== "boolean") {
        return res.status(400).json({
          error: "Status deve ser true ou false",
        });
      }

      // Atualiza apenas o campo ativo.
      const beneficiarioAtualizado = await prisma.beneficiario.update({
        where: { id },
        data: { ativo },
      });

      // Registra a mudança de status no histórico, se ela realmente ocorreu.
      if (beneficiario.ativo !== ativo) {
        await registrarEventoHistorico({
          beneficiarioId: id,
          tipo: "ATUALIZACAO",
          descricao: ativo
            ? "Beneficiário reativado."
            : "Beneficiário inativado.",
          detalhes: {
            alteracoes: [
              {
                campo: "ativo",
                rotulo: "Status",
                de: String(beneficiario.ativo),
                para: String(ativo),
              },
            ],
          },
          usuarioId: req.user.id,
        });
      }

      return res.status(200).json(beneficiarioAtualizado);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: "Dados inválidos",
          issues: error.issues.map((e) => ({
            path: e.path.join("."),
            message: e.message,
          })),
        });
      }

      console.error(
        `PATCH /beneficiarios/${req.params.id}/status error:`,
        error,
      );

      return res.status(500).json({
        error: "Erro interno do servidor",
      });
    }
  }

  async listarHistoricoDoBeneficiario(req, res) {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: "ID inválido.",
      });
    }

    try {
      // Filtro base: aplica a mesma regra de acesso usada na ficha do beneficiário.
      const where = { id };

      if (req.user.role !== "ADMIN") {
        where.instituicaoId = req.user.instituicaoId;
      }

      // Confirma que o beneficiário existe e que o usuário tem acesso a ele.
      const beneficiario = await prisma.beneficiario.findFirst({
        where,
        select: { id: true },
      });

      if (!beneficiario) {
        return res.status(404).json({
          error: "Beneficiário não encontrado.",
        });
      }

      // Busca os registros do histórico em ordem cronológica decrescente
      // (mais recente primeiro).
      const historico = await prisma.historicoBeneficiario.findMany({
        where: { beneficiarioId: id },
        orderBy: { criadoEm: "desc" },
        include: {
          usuario: {
            select: { id: true, nome: true },
          },
        },
      });

      return res.status(200).json(historico);
    } catch (error) {
      console.error(
        `GET /beneficiarios/${req.params.id}/historico error:`,
        error,
      );

      return res.status(500).json({
        error: "Erro ao buscar o histórico do beneficiário.",
      });
    }
  }
}

export default new BeneficiarioController();
