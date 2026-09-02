import fs from "fs/promises";
import path from "path";
import { OcrService } from "./coreOcrService.js";
import validarTexto from "../validators/cnpjValidator.js";
import { prisma } from "../config/db.js";

class ComprovanteService {
  async processar({
    buffer,
    caminhoArquivo,
    nomeArquivo,
    tipoDoc,
    doacaoId = null,
    usuario = null,
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
        const whereInstituicao = { cnpj: cnpjEncontrado };

        if (usuario?.role === "INSTITUICAO") {
          whereInstituicao.id = Number(usuario.instituicaoId);
        }

        instituicao = await prisma.instituicaoParceira.findFirst({
          where: whereInstituicao,
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

  async localizarArquivo(comprovanteId) {
    const id = Number(comprovanteId);

    if (!Number.isInteger(id) || id <= 0) {
      throw new Error("ID do comprovante inválido.");
    }

    const comprovante = await prisma.comprovante.findUnique({
      where: { id },
    });

    if (!comprovante) {
      throw new Error("Comprovante não encontrado.");
    }

    const pastaUploads = path.resolve("uploads");
    const pastaComprovantes = path.join(pastaUploads, "comprovantes");
    const nomeArquivo = path.basename(comprovante.arquivoUrl || "");

    if (!nomeArquivo) {
      throw new Error("Arquivo do comprovante não informado.");
    }

    const candidatos = [];

    if (comprovante.arquivoUrl) {
      candidatos.push(
        path.resolve(
          "uploads",
          comprovante.arquivoUrl.replace(/^\/uploads\//, ""),
        ),
      );
    }

    if (comprovante.instituicaoId) {
      candidatos.push(
        path.join(
          pastaComprovantes,
          String(comprovante.instituicaoId),
          nomeArquivo,
        ),
      );
    }

    candidatos.push(
      path.join(pastaComprovantes, "pendentes", nomeArquivo),
    );

    let caminhoEncontrado = null;

    for (const candidato of candidatos) {
      try {
        const stat = await fs.stat(candidato);

        if (stat.isFile()) {
          caminhoEncontrado = candidato;
          break;
        }
      } catch {
        // Continua procurando.
      }
    }

    if (!caminhoEncontrado) {
      try {
        const entradas = await fs.readdir(
          pastaComprovantes,
          { withFileTypes: true },
        );

        for (const entrada of entradas) {
          if (!entrada.isDirectory()) continue;

          const candidato = path.join(
            pastaComprovantes,
            entrada.name,
            nomeArquivo,
          );

          try {
            const stat = await fs.stat(candidato);

            if (stat.isFile()) {
              caminhoEncontrado = candidato;
              break;
            }
          } catch {
            // Continua procurando.
          }
        }
      } catch {
        // Pasta de comprovantes ainda não existe.
      }
    }

    if (!caminhoEncontrado) {
      throw new Error("Arquivo físico não encontrado.");
    }

    const relativoUploads = path
      .relative(pastaUploads, caminhoEncontrado)
      .split(path.sep)
      .join("/");

    const arquivoUrlCorreto = `/uploads/${relativoUploads}`;

    if (arquivoUrlCorreto !== comprovante.arquivoUrl) {
      await prisma.comprovante.update({
        where: { id },
        data: {
          arquivoUrl: arquivoUrlCorreto,
        },
      });
    }

    return {
      caminhoArquivo: caminhoEncontrado,
      nomeArquivo,
      comprovante,
    };
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
