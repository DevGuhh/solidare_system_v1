import { OcrService } from "./coreOcrService.js";
import validarTexto from "../validators/cnpjValidator.js";
import { prisma } from "../config/db.js";
import {
  uploadFile,
  getFile,
  moveFile,
} from "../config/r2.js";

class ComprovanteService {
  async processar({
    buffer,
    nomeArquivo,
    mimeType,
    tipoDoc,
    doacaoId = null,
    usuario = null,
  }) {
    let cnpjEncontrado = null;
    let instituicao = null;
    let ocrProcessado = true;
    let erroOcr = null;

    try {
      const ocrResult = await OcrService.sendBuffer(buffer);

      const texts = (ocrResult.regions ?? [])
        .flatMap((region) =>
          (region.lines ?? []).map((line) =>
            (line.words ?? [])
              .map((word) => word.text)
              .join(" "),
          ),
        )
        .filter(Boolean);

      const candidatosCnpj =
        validarTexto.extrairCandidatos(texts);

      cnpjEncontrado = candidatosCnpj[0] ?? null;

      if (cnpjEncontrado) {
        const whereInstituicao = {
          cnpj: cnpjEncontrado,
        };

        if (usuario?.role === "INSTITUICAO") {
          whereInstituicao.id = Number(
            usuario.instituicaoId,
          );
        }

        instituicao =
          await prisma.instituicaoParceira.findFirst({
            where: whereInstituicao,
          });
      }
    } catch (error) {
      ocrProcessado = false;
      erroOcr =
        error?.message ||
        "Falha desconhecida no OCR.";

      console.error(
        "OCR indisponível. Comprovante será enviado para revisão manual:",
        erroOcr,
      );
    }

    const arquivoKey = instituicao
      ? `comprovantes/${instituicao.id}/${nomeArquivo}`
      : `comprovantes/pendentes/${nomeArquivo}`;

    await uploadFile({
      fileBuffer: buffer,
      key: arquivoKey,
      contentType: mimeType,
    });

    const comprovante =
      await prisma.comprovante.create({
        data: {
          arquivoUrl: arquivoKey,
          tipoDoc,
          cnpjExtraido: cnpjEncontrado,
          instituicaoId: instituicao?.id ?? null,
          doacaoId,
          status: instituicao
            ? "VINCULADO"
            : "PENDENTE_REVISAO",
        },
      });

    return {
      ...comprovante,
      ocrProcessado,
      avisoOcr: ocrProcessado
        ? null
        : "OCR indisponível. Documento enviado para revisão manual.",
    };
  }

  async listarPendentes() {
    return prisma.comprovante.findMany({
      where: {
        status: "PENDENTE_REVISAO",
      },
      orderBy: {
        criadoEm: "asc",
      },
    });
  }

  async listarPorInstituicao(instituicaoId) {
    const id = Number(instituicaoId);

    if (!Number.isInteger(id) || id <= 0) {
      throw new Error(
        "ID da instituição inválido.",
      );
    }

    return prisma.comprovante.findMany({
      where: {
        instituicaoId: id,
        status: "VINCULADO",
      },
      orderBy: {
        criadoEm: "desc",
      },
    });
  }

  async localizarArquivo(comprovanteId) {
    const id = Number(comprovanteId);

    if (!Number.isInteger(id) || id <= 0) {
      const error = new Error(
        "ID do comprovante inválido.",
      );
      error.statusCode = 400;
      throw error;
    }

    const comprovante =
      await prisma.comprovante.findUnique({
        where: { id },
      });

    if (!comprovante) {
      const error = new Error(
        "Comprovante não encontrado.",
      );
      error.statusCode = 404;
      throw error;
    }

    try {
      const arquivo = await getFile(
        comprovante.arquivoUrl,
      );

      return {
        comprovante,
        arquivo,
      };
    } catch (error) {
      if (
        error.name === "NoSuchKey" ||
        error.$metadata?.httpStatusCode === 404
      ) {
        const notFound = new Error(
          "Arquivo não encontrado no armazenamento.",
        );

        notFound.statusCode = 404;

        throw notFound;
      }

      throw error;
    }
  }

  async rejeitar(comprovanteId) {
    const id = Number(comprovanteId);

    if (!Number.isInteger(id) || id <= 0) {
      throw new Error(
        "ID do comprovante inválido.",
      );
    }

    const comprovante =
      await prisma.comprovante.findUnique({
        where: {
          id,
        },
      });

    if (!comprovante) {
      throw new Error(
        "Comprovante não encontrado.",
      );
    }

    return prisma.comprovante.update({
      where: {
        id,
      },
      data: {
        status: "REJEITADO",
        revisadoEm: new Date(),
      },
    });
  }

  async vincularManualmente(
    comprovanteId,
    instituicaoId,
  ) {
    const idComprovante = Number(
      comprovanteId,
    );
    const idInstituicao = Number(
      instituicaoId,
    );

    if (
      !Number.isInteger(idComprovante) ||
      idComprovante <= 0
    ) {
      throw new Error(
        "ID do comprovante inválido.",
      );
    }

    if (
      !Number.isInteger(idInstituicao) ||
      idInstituicao <= 0
    ) {
      throw new Error(
        "ID da instituição inválido.",
      );
    }

    const comprovante =
      await prisma.comprovante.findUnique({
        where: {
          id: idComprovante,
        },
      });

    if (!comprovante) {
      throw new Error(
        "Comprovante não encontrado.",
      );
    }

    const instituicao =
      await prisma.instituicaoParceira.findUnique({
        where: {
          id: idInstituicao,
        },
      });

    if (!instituicao) {
      throw new Error(
        "Instituição não encontrada.",
      );
    }

    const nomeArquivo =
      comprovante.arquivoUrl
        .split("/")
        .pop();

    if (!nomeArquivo) {
      throw new Error(
        "Nome do arquivo inválido.",
      );
    }

    const keyAtual =
      comprovante.arquivoUrl;

    const novaKey =
      `comprovantes/${instituicao.id}/${nomeArquivo}`;

    if (keyAtual !== novaKey) {
      await moveFile({
        sourceKey: keyAtual,
        destinationKey: novaKey,
      });
    }

    return prisma.comprovante.update({
      where: {
        id: idComprovante,
      },
      data: {
        instituicaoId: idInstituicao,
        status: "VINCULADO",
        revisadoEm: new Date(),
        arquivoUrl: novaKey,
      },
    });
  }
}

export default new ComprovanteService();