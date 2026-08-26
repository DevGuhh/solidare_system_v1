import fs from "fs/promises";
import path from "path";
import { OcrService } from "./coreOcrService.js";
import validarTexto from "../validators/cnpjValidator.js";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

class ComprovanteService {
  async processar({
    buffer,
    caminhoArquivo,
    nomeArquivo,
    tipoDoc,
    doacaoId = null,
  }) {
    let cnpjEncontrado = null;
    let instituicao = null;
    let ocrProcessado = true;
    let erroOcr = null;

    /*
     * O arquivo já foi recebido e salvo pelo controller.
     * Uma indisponibilidade do Azure OCR não pode fazer o upload ser perdido.
     * Nessa situação o comprovante segue para revisão manual.
     */
    try {
      const ocrResult = await OcrService.sendBuffer(buffer);

      const texts = (ocrResult.regions ?? [])
        .flatMap((region) =>
          (region.lines ?? []).map((line) =>
            (line.words ?? []).map((word) => word.text).join(" "),
          ),
        )
        .filter(Boolean);

      const candidatosCnpj = validarTexto.extrairCandidatos(texts);
      cnpjEncontrado = candidatosCnpj[0] ?? null;

      if (cnpjEncontrado) {
        instituicao = await prisma.instituicaoParceira.findFirst({
          where: {
            cnpj: cnpjEncontrado,
          },
        });
      }
    } catch (error) {
      ocrProcessado = false;
      erroOcr = error?.message || "Falha desconhecida no OCR.";

      console.error(
        "OCR indisponível. Comprovante será enviado para revisão manual:",
        erroOcr,
      );
    }

    let arquivoUrl = `/uploads/comprovantes/pendentes/${nomeArquivo}`;

    if (instituicao) {
      const pastaInstituicao = path.join(
        "uploads",
        "comprovantes",
        String(instituicao.id),
      );

      await fs.mkdir(pastaInstituicao, {
        recursive: true,
      });

      const caminhoFinal = path.join(pastaInstituicao, nomeArquivo);

      await fs.rename(caminhoArquivo, caminhoFinal);

      arquivoUrl = `/uploads/comprovantes/${instituicao.id}/${nomeArquivo}`;
    }

    const comprovante = await prisma.comprovante.create({
      data: {
        arquivoUrl,
        tipoDoc,
        cnpjExtraido: cnpjEncontrado,
        instituicaoId: instituicao?.id ?? null,
        doacaoId,
        status: instituicao ? "VINCULADO" : "PENDENTE_REVISAO",
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
      throw new Error("ID da instituição inválido.");
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

  async rejeitar(comprovanteId) {
    const comprovante = await prisma.comprovante.findUnique({
      where: {
        id: Number(comprovanteId),
      },
    });

    if (!comprovante) {
      throw new Error("Comprovante não encontrado.");
    }

    return prisma.comprovante.update({
      where: {
        id: Number(comprovanteId),
      },
      data: {
        status: "REJEITADO",
        revisadoEm: new Date(),
      },
    });
  }

  async vincularManualmente(comprovanteId, instituicaoId) {
    const comprovante = await prisma.comprovante.findUnique({
      where: {
        id: Number(comprovanteId),
      },
    });

    if (!comprovante) {
      throw new Error("Comprovante não encontrado.");
    }

    const instituicao = await prisma.instituicaoParceira.findUnique({
      where: {
        id: Number(instituicaoId),
      },
    });

    if (!instituicao) {
      throw new Error("Instituição não encontrada.");
    }

    const nomeArquivo = path.basename(comprovante.arquivoUrl);

    const caminhoAtual = path.join(
      "uploads",
      comprovante.arquivoUrl.replace(/^\/uploads\//, ""),
    );

    const pastaInstituicao = path.join(
      "uploads",
      "comprovantes",
      String(instituicao.id),
    );

    await fs.mkdir(pastaInstituicao, {
      recursive: true,
    });

    const caminhoFinal = path.join(pastaInstituicao, nomeArquivo);

    await fs.rename(caminhoAtual, caminhoFinal);

    const arquivoUrl = `/uploads/comprovantes/${instituicao.id}/${nomeArquivo}`;

    return prisma.comprovante.update({
      where: {
        id: Number(comprovanteId),
      },
      data: {
        instituicaoId: Number(instituicaoId),
        status: "VINCULADO",
        revisadoEm: new Date(),
        arquivoUrl,
      },
    });
  }
}

export default new ComprovanteService();
