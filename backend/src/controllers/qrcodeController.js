import { prisma } from "../config/db.js";
import crypto from "node:crypto";
import QRCode from "qrcode";

function gerarCodigoQRCode() {
  const parte = crypto.randomBytes(6).toString("hex").toUpperCase();

  return `SOL-${parte}`;
}

class QrCodeController {
  async listarQRCodes(req, res) {
    try {
      const qrcodes = await prisma.qRCode.findMany({
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

      if (!Number.isInteger(id)) {
        return res.status(400).json({
          ok: false,
          message: "O beneficiarioId deve ser um número inteiro.",
        });
      }

      const beneficiario = await prisma.beneficiario.findUnique({
        where: {
          id,
        },
      });

      if (!beneficiario) {
        return res.status(404).json({
          ok: false,
          message: "Beneficiário não encontrado.",
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

      const imagem = await QRCode.toBuffer(qrCode.codigo, {
        type: "png",
        width: 420,
        margin: 2,
        errorCorrectionLevel: "H",
      });

      res.setHeader("Content-Type", "image/png");

      res.setHeader(
        "Content-Disposition",
        `inline; filename=qr-${qrCode.codigo}.png`
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
      const codigo = String(req.params.codigo ?? "").trim();

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
            select: {
              id: true,
              nomeCompleto: true,
              cpf: true,
              telefonePrincipal: true,
              email: true,
              ativo: true,
              deletedAt: true,
              instituicao: {
                select: {
                  id: true,
                  nome: true,
                  ativa: true,
                },
              },
            },
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

      return res.status(200).json({
        ok: true,
        valido: true,
        message: "QR Code válido.",
        data: qrCode,
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

  async buscarQRCode(req, res) {
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
              telefonePrincipal: true,
              email: true,
              ativo: true,
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

      if (!Number.isInteger(id)) {
        return res.status(400).json({
          ok: false,
          message: "ID do QR Code inválido.",
        });
      }

      const qrCode = await prisma.qRCode.findUnique({
        where: {
          id,
        },
      });

      if (!qrCode) {
        return res.status(404).json({
          ok: false,
          message: "QR Code não encontrado.",
        });
      }

      const atualizado = await prisma.qRCode.update({
        where: {
          id,
        },
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