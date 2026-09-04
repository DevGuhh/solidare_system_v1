import { prisma } from "../config/db.js";
import crypto from "node:crypto";
import QRCode from "qrcode";
import { startOfMonth, endOfMonth, addDays } from "date-fns";
import { gerarCodigoDoacao } from "../utils/generateCode.js";
import { calcularQuantidadeCestas } from "../utils/generateQtdCestas.js";
import {
  debitarSaldoParaDoacao,
  SaldoInsuficienteError,
} from "../services/saldoCestaService.js";
import { registrarEventoHistorico } from "../services/historicoBeneficiarioService.js";


const MIME_TYPES_FOTO_PERMITIDOS = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const TAMANHO_MAXIMO_FOTO_BYTES = 3 * 1024 * 1024;

class FotoComprovanteError extends Error {}

function prepararFotoComprovante(fotoBase64) {
  const valor = String(fotoBase64 ?? "").trim();

  if (!valor) {
    throw new FotoComprovanteError(
      "A foto do beneficiário é obrigatória para confirmar a entrega.",
    );
  }

  const correspondencia = valor.match(
    /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/i,
  );

  if (!correspondencia) {
    throw new FotoComprovanteError(
      "Formato de foto inválido. Use JPEG, PNG ou WEBP.",
    );
  }

  const mimeType = correspondencia[1].toLowerCase();
  if (!MIME_TYPES_FOTO_PERMITIDOS.has(mimeType)) {
    throw new FotoComprovanteError("Formato de foto não permitido.");
  }

  const foto = Buffer.from(correspondencia[2].replace(/\s/g, ""), "base64");

  if (!foto.length) {
    throw new FotoComprovanteError("A foto enviada está vazia.");
  }

  if (foto.length > TAMANHO_MAXIMO_FOTO_BYTES) {
    throw new FotoComprovanteError(
      "A foto é muito grande. O tamanho máximo permitido é 3 MB.",
    );
  }

  const assinaturaValida =
    (mimeType === "image/jpeg" && foto[0] === 0xff && foto[1] === 0xd8 && foto[2] === 0xff) ||
    (mimeType === "image/png" && foto.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) ||
    (mimeType === "image/webp" && foto.subarray(0, 4).toString("ascii") === "RIFF" && foto.subarray(8, 12).toString("ascii") === "WEBP");

  if (!assinaturaValida) {
    throw new FotoComprovanteError("O arquivo enviado não corresponde a uma imagem válida.");
  }

  return { foto, mimeType, tamanho: foto.length };
}

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
  const quantidadeCestas = calcularQuantidadeCestas(
    beneficiario.composicaoFamiliar,
  );

  let motivoBloqueio = null;
  let mensagemBloqueio = null;

  if (doacaoMes) {
    motivoBloqueio = "JA_RECEBEU_NO_MES";
    mensagemBloqueio = "Este beneficiário já recebeu uma doação neste mês.";
  } else if (!tipoPermiteCesta) {
    motivoBloqueio = "BENEFICIO_NAO_PERMITE_CESTA";
    mensagemBloqueio = "O benefício deste beneficiário não está configurado para cesta.";
  } else if (saldoDisponivel < quantidadeCestas) {
    motivoBloqueio = "SALDO_INSUFICIENTE";
    mensagemBloqueio =
      `Saldo insuficiente. A família possui ${beneficiario.composicaoFamiliar} pessoa(s) ` +
      `e necessita de ${quantidadeCestas} cesta(s), mas há ${saldoDisponivel} disponível(is).`;
  }

  return {
    liberada: !motivoBloqueio,
    tipo: "CESTA",
    quantidade: quantidadeCestas,
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
  composicaoFamiliar: true,
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
              tipoBeneficio: true,
              ativo: true,
              deletedAt: true,
            },
          },
        },
        orderBy: {
          criadoEm: "desc",
        },
      });

      const beneficiarioIds = [...new Set(qrcodes.map((item) => item.beneficiarioId))];
      const hoje = new Date();
      const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
      const fimHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1);

      let resumoPorBeneficiario = new Map();
      let entregasHoje = 0;

      if (beneficiarioIds.length > 0) {
        const [resumosDoacoes, totalEntregasHoje] = await Promise.all([
          prisma.doacao.groupBy({
            by: ["beneficiarioId"],
            where: {
              beneficiarioId: { in: beneficiarioIds },
              deletedAt: null,
              tipo: { in: ["CESTA", "AMBOS"] },
            },
            _sum: { quantidade: true },
            _max: { dataDoacao: true },
          }),
          prisma.doacao.count({
            where: {
              beneficiarioId: { in: beneficiarioIds },
              deletedAt: null,
              tipo: { in: ["CESTA", "AMBOS"] },
              dataDoacao: { gte: inicioHoje, lt: fimHoje },
            },
          }),
        ]);

        resumoPorBeneficiario = new Map(
          resumosDoacoes.map((item) => [
            item.beneficiarioId,
            {
              cestasRecebidas: Number(item._sum.quantidade ?? 0),
              ultimaEntrega: item._max.dataDoacao ?? null,
            },
          ]),
        );
        entregasHoje = totalEntregasHoje;
      }

      const agora = new Date();
      const qrcodesComEntregas = qrcodes.map((item) => {
        const resumo = resumoPorBeneficiario.get(item.beneficiarioId) ?? {
          cestasRecebidas: 0,
          ultimaEntrega: null,
        };

        let proximaEntrega = null;
        let proximaEntregaStatus = "DISPONIVEL";
        const tipo = normalizarTipoBeneficio(item.beneficiario?.tipoBeneficio);

        if (!item.ativo || !item.beneficiario?.ativo || item.beneficiario?.deletedAt) {
          proximaEntregaStatus = "INDISPONIVEL";
        } else if (!["CESTA", "AMBOS"].includes(tipo)) {
          proximaEntregaStatus = "NAO_APLICAVEL";
        } else if (resumo.ultimaEntrega) {
          const ultima = new Date(resumo.ultimaEntrega);
          const mesmoMes = ultima.getFullYear() === agora.getFullYear()
            && ultima.getMonth() === agora.getMonth();

          if (mesmoMes) {
            proximaEntrega = new Date(agora.getFullYear(), agora.getMonth() + 1, 1);
            proximaEntregaStatus = "AGENDADA";
          }
        }

        return {
          ...item,
          entregas: {
            ...resumo,
            proximaEntrega,
            proximaEntregaStatus,
          },
        };
      });

      return res.status(200).json({
        ok: true,
        data: qrcodesComEntregas,
        resumo: { entregasHoje },
      });
    } catch (erro) {
      console.error("Erro ao listar QR Codes:", erro);

      return res.status(500).json({
        ok: false,
        message: "Erro interno ao listar QR Codes.",
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
        ? `QR Code válido. Beneficiário liberado para receber ${entrega.quantidade} cesta(s).`
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

      const fotoComprovante = prepararFotoComprovante(req.body?.fotoBase64);
      const expiraEm = addDays(new Date(), 60);

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

      const quantidadeCestas = calcularQuantidadeCestas(
        qrCode.beneficiario.composicaoFamiliar,
      );

      const codigoDoacao = gerarCodigoDoacao();

      const doacao = await prisma.$transaction(async (tx) => {
        const novaDoacao = await tx.doacao.create({
          data: {
            codigo: codigoDoacao,
            beneficiarioId: qrCode.beneficiario.id,
            instituicaoId: qrCode.beneficiario.instituicao.id,
            usuarioId: req.user.id,
            tipo: "CESTA",
            quantidade: quantidadeCestas,
            observacoes: `Entrega confirmada por leitura do QR Code ${qrCode.codigo}.`,
            comprovante: true,
            origem: "QR_CODE",
            composicaoFamiliarSnapshot: qrCode.beneficiario.composicaoFamiliar,
            quantidadeCalculada: true,
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
          quantidade: quantidadeCestas,
          doacaoId: novaDoacao.id,
          usuarioId: req.user.id,
          observacao:
            `Baixa automática de ${quantidadeCestas} cesta(s) pela entrega via QR Code ${qrCode.codigo}`,
        });

        await tx.comprovanteEntrega.create({
          data: {
            doacaoId: novaDoacao.id,
            foto: fotoComprovante.foto,
            mimeType: fotoComprovante.mimeType,
            tamanho: fotoComprovante.tamanho,
            expiraEm,
          },
        });

        return novaDoacao;
      });

      await registrarEventoHistorico({
        beneficiarioId: qrCode.beneficiario.id,
        tipo: "DOACAO",
        descricao:
          `Entrega de ${quantidadeCestas} cesta(s) confirmada por QR Code.`,
        detalhes: {
          doacaoId: doacao.id,
          codigo: doacao.codigo,
          qrCode: qrCode.codigo,
          tipo: "CESTA",
          quantidade: quantidadeCestas,
          comprovanteFotografico: true,
          comprovanteExpiraEm: expiraEm.toISOString(),
        },
        usuarioId: req.user.id,
      });

      return res.status(201).json({
        ok: true,
        message: "Entrega da cesta confirmada com sucesso.",
        data: {
          doacao,
          comprovante: {
            registrado: true,
            expiraEm,
          },
          entrega: {
            liberada: false,
            motivoBloqueio: "JA_RECEBEU_NO_MES",
            mensagemBloqueio: "Entrega já registrada neste mês.",
          },
        },
      });
    } catch (erro) {
      if (erro instanceof FotoComprovanteError) {
        return res.status(400).json({
          ok: false,
          motivo: "FOTO_OBRIGATORIA",
          message: erro.message,
        });
      }

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
      });
    }
  }
}

export default new QrCodeController();
