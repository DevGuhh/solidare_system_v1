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
    const ocrResult = await OcrService.sendBuffer(buffer);

    // Converte o resultado do Azure OCR em uma lista de textos
    const texts = (ocrResult.regions ?? [])
      .flatMap((region) =>
        (region.lines ?? []).map((line) =>
          (line.words ?? []).map((word) => word.text).join(" "),
        ),
      )
      .filter(Boolean);

    // Extrai CNPJs válidos encontrados no documento
    const candidatosCnpj = validarTexto.extrairCandidatos(texts);

    // Usa o primeiro CNPJ válido encontrado
    const cnpjEncontrado = candidatosCnpj[0] ?? null;

    let instituicao = null;

    if (cnpjEncontrado) {
      instituicao = await prisma.instituicaoParceira.findFirst({
        where: {
          cnpj: cnpjEncontrado,
        },
      });
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

    return prisma.comprovante.create({
      data: {
        arquivoUrl,
        tipoDoc,
        cnpjExtraido: cnpjEncontrado,
        instituicaoId: instituicao?.id ?? null,
        doacaoId,
        status: instituicao ? "VINCULADO" : "PENDENTE_REVISAO",
      },
    });
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
