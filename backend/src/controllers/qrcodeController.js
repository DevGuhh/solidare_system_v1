import { prisma } from "../config/db.js";
import crypto from "node:crypto";
import QRCode from "qrcode";
import { startOfMonth, endOfMonth } from "date-fns";
import { gerarCodigoDoacao } from "../utils/generateCode.js";
import {
  debitarSaldoParaDoacao,
  SaldoInsuficienteError,
} from "../services/saldoCestaService.js";
import { registrarEventoHistorico } from "../services/historicoBeneficiarioService.js";

function gerarCodigoQRCode() {
  const parte = crypto.randomBytes(6).toString("hex").toUpperCase();
  return `SOL-${parte}`;
}

function usuarioPodeAcessarBeneficiario(req, beneficiario) {
  if (req.user?.role === "ADMIN") return true;

  return (
    req.user?.role === "INSTITUICAO" &&
    Number(req.user.instituicaoId) === Number(beneficiario?.instituicao?.id)
  );
}

function periodoMesAtual() {
  const agora = new Date();
  return {
    inicioMes: startOfMonth(agora),
    fimMes: endOfMonth(agora),
  };
}

function normalizarTipoBeneficio(valor) {
  return String(valor ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

async function buscarDoacaoDoMes(beneficiarioId) {
  const { inicioMes, fimMes } = periodoMesAtual();

  return prisma.doacao.findFirst({
    where: {
      beneficiarioId,
      deletedAt: null,
      dataDoacao: {
        gte: inicioMes,
        lte: fimMes,
      },
    },
    select: {
      id: true,
      codigo: true,
      tipo: true,
      quantidade: true,
      dataDoacao: true,
      comprovante: true,
      usuario: {
        select: {
          id: true,
          nome: true,
        },
      },
    },
    orderBy: {
      dataDoacao: "desc",
    },
  });
}

async function montarSituacaoEntrega(beneficiario) {
  const [doacaoMes, saldo] = await Promise.all([
    buscarDoacaoDoMes(beneficiario.id),
    prisma.saldoCesta.findUnique({
      where: {
        instituicaoId: beneficiario.instituicao.id,
      },
      select: {
        saldoAtual: true,
      },
    }),
  ]);

  const tipoBeneficioNormalizado = normalizarTipoBeneficio(
    beneficiario.tipoBeneficio,
  );
  const tipoPermiteCesta = ["CESTA", "AMBOS"].includes(
    tipoBeneficioNormalizado,
  );
  const saldoDisponivel = Number(saldo?.saldoAtual ?? 0);

  let motivoBloqueio = null;
  let mensagemBloqueio = null;

  if (doacaoMes) {
    motivoBloqueio = "JA_RECEBEU_NO_MES";
    mensagemBloqueio = "Este beneficiário já recebeu uma doação neste mês.";
  } else if (!tipoPermiteCesta) {
    motivoBloqueio = "BENEFICIO_NAO_PERMITE_CESTA";
    mensagemBloqueio = "O benefício deste beneficiário não está configurado para cesta.";
  } else if (saldoDisponivel < 1) {
    motivoBloqueio = "SALDO_INSUFICIENTE";
    mensagemBloqueio = "A instituição não possui cesta disponível em saldo.";
  }

  return {
    liberada: !motivoBloqueio,
    tipo: "CESTA",
    quantidade: 1,
    saldoDisponivel,
    motivoBloqueio,
    mensagemBloqueio,
    doacaoMes,
  };
}

const selectBeneficiarioValidacao = {
  id: true,
  nomeCompleto: true,
  cpf: true,
  telefonePrincipal: true,
  email: true,
  tipoBeneficio: true,
  ativo: true,
  deletedAt: true,
  instituicao: {
    select: {
      id: true,
      nome: true,
      ativa: true,
    },
  },
};

class QrCodeController {
  async listarQRCodes(req, res) {
    try {
      const where = {};

      if (req.user.role === "INSTITUICAO") {
        where.beneficiario = {
          instituicaoId: req.user.instituicaoId,
        };
      }

      const qrcodes = await prisma.qRCode.findMany({
        where,
        include: {
          beneficiario: {
            select: {
              id: true,
              nomeCompleto: true,
              cpf: true,
            },
          },
        },
        orderBy: {
          criadoEm: "desc",
        },
      });

      return res.status(200).json({
        ok: true,
        data: qrcodes,
      });
    } catch (erro) {
      console.error("Erro ao listar QR Codes:", erro);

      return res.status(500).json({
        ok: false,
        message: "Erro interno ao listar QR Codes.",
        error: erro.message,
      });
    }
  }

  async criarQRCode(req, res) {
    try {
      const { beneficiarioId } = req.body;

      if (!beneficiarioId) {
        return res.status(400).json({
          ok: false,
          message: "O beneficiarioId é obrigatório.",
        });
      }

      const id = Number(beneficiarioId);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          ok: false,
          message: "O beneficiarioId deve ser um número inteiro válido.",
        });
      }

      const whereBeneficiario = {
        id,
        deletedAt: null,
      };

      if (req.user.role === "INSTITUICAO") {
        whereBeneficiario.instituicaoId = req.user.instituicaoId;
      }

      const beneficiario = await prisma.beneficiario.findFirst({
        where: whereBeneficiario,
      });

      if (!beneficiario) {
        return res.status(404).json({
          ok: false,
          message:
            req.user.role === "ADMIN"
              ? "Beneficiário não encontrado."
              : "Beneficiário não encontrado ou não pertence à sua instituição.",
        });
      }

      const qrCodeAtivo = await prisma.qRCode.findFirst({
        where: {
          beneficiarioId: id,
          ativo: true,
        },
      });

      if (qrCodeAtivo) {
        return res.status(409).json({
          ok: false,
          message: "Este beneficiário já possui um QR Code ativo.",
          data: {
            qrCode: qrCodeAtivo,
          },
        });
      }

      const codigo = gerarCodigoQRCode();

      const qrCode = await prisma.qRCode.create({
        data: {
          codigo,
          beneficiarioId: id,
          ativo: true,
        },
        include: {
          beneficiario: {
            select: {
              id: true,
              nomeCompleto: true,
              cpf: true,
            },
          },
        },
      });

      return res.status(201).json({
        ok: true,
        message: "QR Code criado com sucesso.",
        data: qrCode,
      });
    } catch (erro) {
      console.error("Erro ao criar QR Code:", erro);

      return res.status(500).json({
        ok: false,
        message: "Erro interno ao criar QR Code.",
        error: erro.message,
      });
    }
  }

  async gerarImagemQRCode(req, res) {
    try {
      const codigo = String(req.params.codigo ?? "").trim();

      if (!codigo) {
        return res.status(400).json({
          ok: false,
          message: "O código do QR Code é obrigatório.",
        });
      }

      const qrCode = await prisma.qRCode.findUnique({
        where: {
          codigo,
        },
        include: {
          beneficiario: {
            select: {
              id: true,
              nomeCompleto: true,
              cpf: true,
              instituicaoId: true,
            },
          },
        },
      });

      if (!qrCode) {
        return res.status(404).json({
          ok: false,
          message: "QR Code não encontrado.",
        });
      }

      if (
        req.user.role === "INSTITUICAO" &&
        Number(qrCode.beneficiario?.instituicaoId) !== Number(req.user.instituicaoId)
      ) {
        return res.status(403).json({
          ok: false,
          message: "Acesso não autorizado a este QR Code.",
        });
      }

      const imagem = await QRCode.toBuffer(qrCode.codigo, {
        type: "png",
        width: 420,
        margin: 2,
        errorCorrectionLevel: "H",
      });

      res.setHeader("Content-Type", "image/png");
      res.setHeader(
        "Content-Disposition",
        `inline; filename=qr-${qrCode.codigo}.png`,
      );
      res.setHeader("Cache-Control", "no-store");

      return res.status(200).send(imagem);
    } catch (erro) {
      console.error("Erro ao gerar imagem do QR Code:", erro);

      return res.status(500).json({
        ok: false,
        message: "Erro interno ao gerar a imagem do QR Code.",
        error: erro.message,
      });
    }
  }

  async validarQRCode(req, res) {
    try {
      const codigo = String(req.params.codigo ?? "").trim().toUpperCase();

      if (!codigo) {
        return res.status(400).json({
          ok: false,
          valido: false,
          message: "O código do QR Code é obrigatório.",
        });
      }

      const qrCode = await prisma.qRCode.findUnique({
        where: {
          codigo,
        },
        include: {
          beneficiario: {
            select: selectBeneficiarioValidacao,
          },
        },
      });

      if (!qrCode) {
        return res.status(404).json({
          ok: false,
          valido: false,
          motivo: "NAO_ENCONTRADO",
          message: "QR Code não encontrado.",
        });
      }

      if (!usuarioPodeAcessarBeneficiario(req, qrCode.beneficiario)) {
        return res.status(403).json({
          ok: false,
          valido: false,
          motivo: "ACESSO_NEGADO",
          message: "Este beneficiário não pertence à sua instituição.",
        });
      }

      if (!qrCode.ativo) {
        return res.status(200).json({
          ok: true,
          valido: false,
          motivo: "QR_CODE_INATIVO",
          message: "Este QR Code está desativado.",
          data: qrCode,
        });
      }

      if (!qrCode.beneficiario || qrCode.beneficiario.deletedAt) {
        return res.status(200).json({
          ok: true,
          valido: false,
          motivo: "BENEFICIARIO_NAO_ENCONTRADO",
          message: "O beneficiário vinculado não está disponível.",
          data: qrCode,
        });
      }

      if (!qrCode.beneficiario.ativo) {
        return res.status(200).json({
          ok: true,
          valido: false,
          motivo: "BENEFICIARIO_INATIVO",
          message: "O beneficiário vinculado está inativo.",
          data: qrCode,
        });
      }

      if (!qrCode.beneficiario.instituicao?.ativa) {
        return res.status(200).json({
          ok: true,
          valido: false,
          motivo: "INSTITUICAO_INATIVA",
          message: "A instituição vinculada está inativa.",
          data: qrCode,
        });
      }

      const entrega = await montarSituacaoEntrega(qrCode.beneficiario);
      const mensagem = entrega.liberada
        ? "QR Code válido. Beneficiário liberado para receber 1 cesta."
        : entrega.mensagemBloqueio || "QR Code válido, mas a entrega não está liberada.";

      return res.status(200).json({
        ok: true,
        valido: true,
        message: mensagem,
        data: {
          ...qrCode,
          entrega,
        },
      });
    } catch (erro) {
      console.error("Erro ao validar QR Code:", erro);

      return res.status(500).json({
        ok: false,
        valido: false,
        message: "Erro interno ao validar QR Code.",
        error: erro.message,
      });
    }
  }

  async confirmarEntrega(req, res) {
    try {
      const codigo = String(req.params.codigo ?? "").trim().toUpperCase();

      if (!codigo) {
        return res.status(400).json({
          ok: false,
          message: "O código do QR Code é obrigatório.",
        });
      }

      const qrCode = await prisma.qRCode.findUnique({
        where: { codigo },
        include: {
          beneficiario: {
            select: selectBeneficiarioValidacao,
          },
        },
      });

      if (!qrCode) {
        return res.status(404).json({
          ok: false,
          message: "QR Code não encontrado.",
        });
      }

      if (!usuarioPodeAcessarBeneficiario(req, qrCode.beneficiario)) {
        return res.status(403).json({
          ok: false,
          message: "Este beneficiário não pertence à sua instituição.",
        });
      }

      if (!qrCode.ativo) {
        return res.status(409).json({
          ok: false,
          message: "Este QR Code está desativado.",
        });
      }

      if (
        !qrCode.beneficiario ||
        qrCode.beneficiario.deletedAt ||
        !qrCode.beneficiario.ativo
      ) {
        return res.status(409).json({
          ok: false,
          message: "O beneficiário vinculado está indisponível ou inativo.",
        });
      }

      if (!qrCode.beneficiario.instituicao?.ativa) {
        return res.status(409).json({
          ok: false,
          message: "A instituição vinculada está inativa.",
        });
      }

      if (
        !["CESTA", "AMBOS"].includes(
          normalizarTipoBeneficio(qrCode.beneficiario.tipoBeneficio),
        )
      ) {
        return res.status(409).json({
          ok: false,
          message: "O benefício deste beneficiário não está configurado para cesta.",
        });
      }

      const doacaoExistente = await buscarDoacaoDoMes(qrCode.beneficiario.id);

      if (doacaoExistente) {
        return res.status(409).json({
          ok: false,
          motivo: "JA_RECEBEU_NO_MES",
          message: "Este beneficiário já recebeu uma doação neste mês.",
          data: {
            doacao: doacaoExistente,
          },
        });
      }

      const codigoDoacao = gerarCodigoDoacao();

      const doacao = await prisma.$transaction(async (tx) => {
        const novaDoacao = await tx.doacao.create({
          data: {
            codigo: codigoDoacao,
            beneficiarioId: qrCode.beneficiario.id,
            instituicaoId: qrCode.beneficiario.instituicao.id,
            usuarioId: req.user.id,
            tipo: "CESTA",
            quantidade: 1,
            observacoes: `Entrega confirmada por leitura do QR Code ${qrCode.codigo}.`,
            comprovante: false,
          },
          include: {
            beneficiario: {
              select: {
                id: true,
                nomeCompleto: true,
                cpf: true,
              },
            },
            instituicao: {
              select: {
                id: true,
                nome: true,
              },
            },
            usuario: {
              select: {
                id: true,
                nome: true,
              },
            },
          },
        });

        await debitarSaldoParaDoacao(tx, {
          instituicaoId: qrCode.beneficiario.instituicao.id,
          quantidade: 1,
          doacaoId: novaDoacao.id,
          usuarioId: req.user.id,
          observacao: `Baixa automática pela entrega via QR Code ${qrCode.codigo}`,
        });

        return novaDoacao;
      });

      await registrarEventoHistorico({
        beneficiarioId: qrCode.beneficiario.id,
        tipo: "DOACAO",
        descricao: "Entrega de 1 cesta confirmada por QR Code.",
        detalhes: {
          doacaoId: doacao.id,
          codigo: doacao.codigo,
          qrCode: qrCode.codigo,
          tipo: "CESTA",
          quantidade: 1,
        },
        usuarioId: req.user.id,
      });

      return res.status(201).json({
        ok: true,
        message: "Entrega da cesta confirmada com sucesso.",
        data: {
          doacao,
          entrega: {
            liberada: false,
            motivoBloqueio: "JA_RECEBEU_NO_MES",
            mensagemBloqueio: "Entrega já registrada neste mês.",
          },
        },
      });
    } catch (erro) {
      if (erro instanceof SaldoInsuficienteError) {
        return res.status(422).json({
          ok: false,
          motivo: "SALDO_INSUFICIENTE",
          message: erro.message,
        });
      }

      console.error("Erro ao confirmar entrega por QR Code:", erro);

      return res.status(500).json({
        ok: false,
        message: "Erro interno ao confirmar a entrega da cesta.",
        error: erro.message,
      });
    }
  }

  async buscarQRCode(req, res) {
    try {
      const codigo = String(req.params.codigo ?? "").trim().toUpperCase();

      if (!codigo) {
        return res.status(400).json({
          ok: false,
          message: "O código do QR Code é obrigatório.",
        });
      }

      const qrCode = await prisma.qRCode.findUnique({
        where: {
          codigo,
        },
        include: {
          beneficiario: {
            select: {
              id: true,
              nomeCompleto: true,
              cpf: true,
              telefonePrincipal: true,
              email: true,
              ativo: true,
              instituicaoId: true,
            },
          },
        },
      });

      if (!qrCode) {
        return res.status(404).json({
          ok: false,
          message: "QR Code não encontrado.",
        });
      }

      if (
        req.user.role === "INSTITUICAO" &&
        Number(qrCode.beneficiario?.instituicaoId) !== Number(req.user.instituicaoId)
      ) {
        return res.status(403).json({
          ok: false,
          message: "Acesso não autorizado a este QR Code.",
        });
      }

      return res.status(200).json({
        ok: true,
        data: qrCode,
      });
    } catch (erro) {
      console.error("Erro ao buscar QR Code:", erro);

      return res.status(500).json({
        ok: false,
        message: "Erro interno ao buscar QR Code.",
        error: erro.message,
      });
    }
  }

  async desativarQRCode(req, res) {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          ok: false,
          message: "ID do QR Code inválido.",
        });
      }

      const qrCode = await prisma.qRCode.findUnique({
        where: { id },
        include: {
          beneficiario: {
            select: {
              instituicaoId: true,
            },
          },
        },
      });

      if (!qrCode) {
        return res.status(404).json({
          ok: false,
          message: "QR Code não encontrado.",
        });
      }

      if (
        req.user.role === "INSTITUICAO" &&
        Number(qrCode.beneficiario?.instituicaoId) !== Number(req.user.instituicaoId)
      ) {
        return res.status(403).json({
          ok: false,
          message: "Acesso não autorizado a este QR Code.",
        });
      }

      const atualizado = await prisma.qRCode.update({
        where: { id },
        data: {
          ativo: false,
        },
      });

      return res.status(200).json({
        ok: true,
        message: "QR Code desativado com sucesso.",
        data: atualizado,
      });
    } catch (erro) {
      console.error("Erro ao desativar QR Code:", erro);

      return res.status(500).json({
        ok: false,
        message: "Erro interno ao desativar QR Code.",
        error: erro.message,
      });
    }
  }
}

export default new QrCodeController();
