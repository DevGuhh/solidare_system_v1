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

      // Modo leve para seletores/autocomplete. Evita carregar endereço,
      // observações e outros campos quando a tela precisa apenas identificar
      // o beneficiário. O modo padrão permanece inalterado para relatórios,
      // dashboard e tabela de beneficiários.
      if (req.query.modo === "selecao") {
        const beneficiarios = await prisma.beneficiario.findMany({
          where,
          select: {
            id: true,
            nomeCompleto: true,
            cpf: true,
            ativo: true,
            instituicaoId: true,
            tipoBeneficio: true,
            instituicao: {
              select: {
                id: true,
                nome: true,
              },
            },
          },
          orderBy: { nomeCompleto: "asc" },
        });

        return res.status(200).json(beneficiarios);
      }

      const beneficiarios = await prisma.beneficiario.findMany({
        where,
        omit: { fotoPerfil: true },
        include: { instituicao: { select: { id: true, nome: true } } },
        orderBy: { nomeCompleto: "asc" },
      });

      return res.status(200).json(beneficiarios.map((beneficiario) => ({
        ...beneficiario,
        possuiFoto: Boolean(beneficiario.fotoPerfilMimeType),
      })));
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

      // Regras de edição por perfil:
      // ADMIN pode alterar CPF e data de nascimento.
      // INSTITUICAO pode alterar data de nascimento, mas nunca o CPF.
      if (req.user.role === "INSTITUICAO") {
        if (data.cpf !== undefined && data.cpf !== beneficiario.cpf) {
          return res.status(400).json({
            error: "A instituição não pode alterar o CPF do beneficiário.",
          });
        }

        // Mesmo que o formulário envie o CPF atual, ele não participa do update.
        delete data.cpf;

        // A instituição também não pode transferir o beneficiário por edição.
        delete data.instituicaoId;
      } else if (req.user.role === "ADMIN") {
        // Se o ADMIN alterar o CPF, garante que o novo CPF não pertence
        // a outro beneficiário.
        if (data.cpf !== undefined && data.cpf !== beneficiario.cpf) {
          const cpfEmUso = await prisma.beneficiario.findUnique({
            where: { cpf: data.cpf },
            select: { id: true },
          });

          if (cpfEmUso && cpfEmUso.id !== id) {
            return res.status(400).json({
              error: "Já existe outro beneficiário cadastrado com este CPF.",
            });
          }
        }
      } else {
        return res.status(403).json({
          error: "Acesso não autorizado.",
        });
      }

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

      // Quando uma INSTITUICAO desativa o beneficiário, ele deixa de
      // pertencer à instituição. Como a listagem da instituição filtra pelo
      // instituicaoId do usuário, ele desaparece imediatamente da tabela dela.
      // O ADMIN continua vendo o registro, agora inativo e sem instituição.
      const dadosAtualizacao =
        req.user.role === "INSTITUICAO" && ativo === false
          ? {
              ativo: false,
              instituicaoId: null,
            }
          : {
              ativo,
            };

      const beneficiarioAtualizado = await prisma.beneficiario.update({
        where: { id },
        data: dadosAtualizacao,
        include: {
          instituicao: {
            select: {
              id: true,
              nome: true,
            },
          },
        },
      });

      // Registra a mudança de status no histórico, se ela realmente ocorreu.
      if (beneficiario.ativo !== ativo) {
        await registrarEventoHistorico({
          beneficiarioId: id,
          tipo: "ATUALIZACAO",
          descricao:
            req.user.role === "INSTITUICAO" && ativo === false
              ? "Beneficiário inativado e desvinculado da instituição."
              : ativo
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
              ...(
                req.user.role === "INSTITUICAO" && ativo === false
                  ? [
                      {
                        campo: "instituicaoId",
                        rotulo: "Instituição",
                        de: String(beneficiario.instituicaoId ?? ""),
                        para: "",
                      },
                    ]
                  : []
              ),
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

  async obterCarteirinha(req, res) {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID inválido." });
    }

    try {
      const where = { id, deletedAt: null };
      if (req.user.role !== "ADMIN") {
        where.instituicaoId = req.user.instituicaoId;
      }

      const beneficiario = await prisma.beneficiario.findFirst({
        where,
        select: {
          id: true,
          nomeCompleto: true,
          cpf: true,
          dataNascimento: true,
          tipoBeneficio: true,
          ativo: true,
          fotoPerfil: true,
          instituicao: {
            select: { id: true, nome: true },
          },
          qrcodes: {
            where: { ativo: true },
            orderBy: { criadoEm: "desc" },
            take: 1,
            select: { id: true, codigo: true, criadoEm: true },
          },
        },
      });

      if (!beneficiario) {
        return res.status(404).json({ error: "Beneficiário não encontrado." });
      }

      const { fotoPerfil, qrcodes, ...dados } = beneficiario;

      return res.status(200).json({
        ...dados,
        possuiFoto: Boolean(fotoPerfil?.length),
        qrCode: qrcodes?.[0] ?? null,
      });
    } catch (error) {
      console.error(`GET /beneficiarios/${req.params.id}/carteirinha error:`, error);
      return res.status(500).json({ error: "Erro ao carregar a carteirinha." });
    }
  }

  async obterFotoPerfil(req, res) {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID inválido." });
    }

    try {
      const where = { id, deletedAt: null };
      if (req.user.role !== "ADMIN") {
        where.instituicaoId = req.user.instituicaoId;
      }

      const beneficiario = await prisma.beneficiario.findFirst({
        where,
        select: { fotoPerfil: true, fotoPerfilMimeType: true },
      });

      if (!beneficiario) {
        return res.status(404).json({ error: "Beneficiário não encontrado." });
      }

      if (!beneficiario.fotoPerfil) {
        return res.status(404).json({ error: "Beneficiário ainda não possui foto cadastral." });
      }

      res.setHeader("Content-Type", beneficiario.fotoPerfilMimeType || "image/jpeg");
      res.setHeader("Cache-Control", "private, no-store");
      return res.status(200).send(Buffer.from(beneficiario.fotoPerfil));
    } catch (error) {
      console.error(`GET /beneficiarios/${req.params.id}/foto error:`, error);
      return res.status(500).json({ error: "Erro ao carregar a foto do beneficiário." });
    }
  }

  async salvarFotoPerfil(req, res) {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID inválido." });
    }

    try {
      const where = { id, deletedAt: null };
      if (req.user.role !== "ADMIN") {
        where.instituicaoId = req.user.instituicaoId;
      }

      const beneficiario = await prisma.beneficiario.findFirst({
        where,
        select: { id: true },
      });

      if (!beneficiario) {
        return res.status(404).json({ error: "Beneficiário não encontrado." });
      }

      const fotoBase64 = String(req.body?.fotoBase64 ?? "");
      const match = fotoBase64.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);

      if (!match) {
        return res.status(400).json({ error: "Envie uma foto JPEG, PNG ou WEBP válida." });
      }

      const mimeType = match[1];
      const arquivo = Buffer.from(match[2], "base64");

      if (!arquivo.length || arquivo.length > 3 * 1024 * 1024) {
        return res.status(413).json({ error: "A foto deve ter no máximo 3 MB." });
      }

      await prisma.beneficiario.update({
        where: { id },
        data: {
          fotoPerfil: arquivo,
          fotoPerfilMimeType: mimeType,
        },
      });

      await registrarEventoHistorico({
        beneficiarioId: id,
        tipo: "ATUALIZACAO",
        descricao: "Foto cadastral do beneficiário atualizada.",
        usuarioId: req.user.id,
      });

      return res.status(200).json({ message: "Foto cadastral atualizada com sucesso." });
    } catch (error) {
      console.error(`PUT /beneficiarios/${req.params.id}/foto error:`, error);
      return res.status(500).json({ error: "Erro ao salvar a foto do beneficiário." });
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

      // Torna alterações de instituição legíveis sem modificar os
      // registros históricos já gravados no banco. Os IDs originais
      // continuam preservados em detalhes.alteracoes para auditoria.
      const idsInstituicoes = new Set();

      for (const evento of historico) {
        const alteracoes = evento?.detalhes?.alteracoes;

        if (!Array.isArray(alteracoes)) {
          continue;
        }

        for (const alteracao of alteracoes) {
          if (alteracao?.campo !== "instituicaoId") {
            continue;
          }

          for (const valor of [alteracao?.de, alteracao?.para]) {
            const idInstituicao = Number(valor);

            if (
              Number.isInteger(idInstituicao) &&
              idInstituicao > 0
            ) {
              idsInstituicoes.add(idInstituicao);
            }
          }
        }
      }

      const instituicoes =
        idsInstituicoes.size > 0
          ? await prisma.instituicaoParceira.findMany({
              where: {
                id: {
                  in: [...idsInstituicoes],
                },
              },
              select: {
                id: true,
                nome: true,
              },
            })
          : [];

      const nomesInstituicoes = new Map(
        instituicoes.map((instituicao) => [
          instituicao.id,
          instituicao.nome,
        ]),
      );

      const historicoLegivel = historico.map((evento) => {
        const alteracoes = evento?.detalhes?.alteracoes;

        if (!Array.isArray(alteracoes)) {
          return evento;
        }

        return {
          ...evento,
          detalhes: {
            ...evento.detalhes,
            alteracoes: alteracoes.map((alteracao) => {
              if (alteracao?.campo !== "instituicaoId") {
                return alteracao;
              }

              const idAnterior = Number(alteracao?.de);
              const idAtual = Number(alteracao?.para);

              return {
                ...alteracao,
                deExibicao:
                  Number.isInteger(idAnterior) && idAnterior > 0
                    ? nomesInstituicoes.get(idAnterior) ||
                      `Instituição #${idAnterior}`
                    : "Nenhuma",
                paraExibicao:
                  Number.isInteger(idAtual) && idAtual > 0
                    ? nomesInstituicoes.get(idAtual) ||
                      `Instituição #${idAtual}`
                    : "Nenhuma",
              };
            }),
          },
        };
      });

      return res.status(200).json(historicoLegivel);
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
