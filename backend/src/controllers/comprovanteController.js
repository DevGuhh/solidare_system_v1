// backend/src/controllers/comprovanteController.js
import multer from "multer";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import comprovanteService from "../services/comprovanteService.js";

// CONFIGURAÇÃO DO MULTER
// Cria uma configuração do Multer.
// O Multer será responsável por receber o arquivo enviado pelo usuário.
const TIPOS_PERMITIDOS = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const EXTENSAO_POR_MIME = {
  "application/pdf": ".pdf",
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
};

function assinaturaCompativel(buffer, mimetype) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return false;

  if (mimetype === "application/pdf") {
    return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  }

  if (mimetype === "image/png") {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }

  if (mimetype === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  if (mimetype === "image/webp") {
    return (
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }

  return false;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
  fileFilter: (req, file, cb) => {
    if (!TIPOS_PERMITIDOS.has(file.mimetype)) {
      const error = new Error(
        "Tipo de arquivo não permitido. Envie um PDF, PNG, JPEG ou WEBP.",
      );
      error.code = "FILE_TYPE_NOT_ALLOWED";
      return cb(error);
    }

    cb(null, true);
  },
});

// MIDDLEWARE DE UPLOAD
export const uploadMiddleware = (req, res, next) => {
  upload.single("arquivo")(req, res, (err) => {
    if (err) {
      console.error("========== ERRO MULTER ==========");
      console.error("Código:", err.code);
      console.error("Campo rejeitado:", err.field);
      console.error("Mensagem:", err.message);
      console.error("==================================");

      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          message: "Arquivo muito grande. O tamanho máximo permitido é 10 MB.",
          code: err.code,
          field: err.field,
        });
      }

      if (err.code === "FILE_TYPE_NOT_ALLOWED") {
        return res.status(400).json({
          message: err.message,
          code: err.code,
          field: err.field,
        });
      }

      return res.status(400).json({
        message: "Não foi possível receber o arquivo enviado.",
        code: err.code || "UPLOAD_ERROR",
        field: err.field,
      });
    }

    next();
  });
};

// CONTROLLER DE COMPROVANTES
class ComprovanteController {
  // ENVIAR COMPROVANTE
  async enviar(req, res) {
    try {
      // PEGANDO O TIPO DO DOCUMENTO
      const { tipo_doc } = req.body;
      // VERIFICANDO SE O ARQUIVO FOI ENVIADO
      if (!req.file)
        return res.status(400).json({ message: "arquivo é obrigatório" });
      // VERIFICANDO SE O TIPO DO DOCUMENTO FOI INFORMADO
      if (!tipo_doc)
        return res.status(400).json({ message: "tipo_doc é obrigatório" });

      // O MIME informado pelo cliente já foi filtrado pelo Multer, mas também
      // validamos a assinatura real do conteúdo antes de gravar no disco.
      if (!assinaturaCompativel(req.file.buffer, req.file.mimetype)) {
        return res.status(400).json({
          message:
            "O conteúdo do arquivo não corresponde ao tipo informado. Envie um PDF, PNG, JPEG ou WEBP válido.",
          code: "INVALID_FILE_SIGNATURE",
        });
      }

      // Não utiliza originalname no caminho do servidor. Isso evita nomes
      // malformados, caracteres especiais e tentativas de manipulação de caminho.
      const extensao = EXTENSAO_POR_MIME[req.file.mimetype];
      const nomeArquivo = `${randomUUID()}${extensao}`;

      const caminhoTemporario = path.join(
        "uploads",
        "comprovantes",
        "pendentes",
        nomeArquivo,
      );

      await fs.mkdir(path.dirname(caminhoTemporario), { recursive: true });
      await fs.writeFile(caminhoTemporario, req.file.buffer);

      const comprovante = await comprovanteService.processar({
        buffer: req.file.buffer,
        caminhoArquivo: caminhoTemporario,
        nomeArquivo,
        tipoDoc: tipo_doc,
        usuario: req.user,
      });

      return res.status(201).json(comprovante);
    } catch (error) {
      console.error("Erro ao processar comprovante:", error);
      return res.status(500).json({
        message: "Erro interno ao processar comprovante.",
      });
    }
  }

  async listarPendentes(req, res) {
    try {
      const pendentes = await comprovanteService.listarPendentes();
      return res.status(200).json(pendentes);
    } catch (error) {
      console.error("Erro ao listar comprovantes pendentes:", error);
      return res.status(500).json({
        message: "Erro interno ao listar comprovantes pendentes.",
      });
    }
  }

  async listarPorInstituicao(req, res) {
    try {
      const { instituicaoId } = req.params;

      const documentos =
        await comprovanteService.listarPorInstituicao(instituicaoId);

      return res.status(200).json(documentos);
    } catch (error) {
      if (error.message === "ID da instituição inválido.") {
        return res.status(400).json({
          message: "ID da instituição inválido.",
        });
      }

      console.error("Erro ao listar documentos da instituição:", error);
      return res.status(500).json({
        message: "Erro interno ao listar documentos da instituição.",
      });
    }
  }

  async abrirArquivo(req, res) {
    try {
      const { id } = req.params;

      const resultado = await comprovanteService.localizarArquivo(id);

      if (
        req.user?.role === "INSTITUICAO" &&
        Number(resultado.comprovante.instituicaoId) !== Number(req.user.instituicaoId)
      ) {
        return res.status(403).json({
          message: "Você não possui permissão para acessar este documento.",
        });
      }

      res.setHeader(
        "Content-Disposition",
        `inline; filename*=UTF-8''${encodeURIComponent(resultado.nomeArquivo)}`,
      );

      return res.sendFile(resultado.caminhoArquivo);
    } catch (error) {
      if (
        error.message === "Comprovante não encontrado." ||
        error.message === "Arquivo físico não encontrado."
      ) {
        return res.status(404).json({
          message: error.message,
        });
      }

      if (error.message === "ID do comprovante inválido.") {
        return res.status(400).json({
          message: error.message,
        });
      }

      console.error("Erro ao abrir o documento:", error);
      return res.status(500).json({
        message: "Erro interno ao abrir o documento.",
      });
    }
  }

  async vincular(req, res) {
    try {
      const { id } = req.params;
      const { instituicaoId } = req.body;
      if (!instituicaoId)
        return res.status(400).json({ message: "instituicaoId é obrigatório" });

      const comprovante = await comprovanteService.vincularManualmente(
        id,
        instituicaoId,
      );
      return res.status(200).json(comprovante);
    } catch (error) {
      console.error("Erro ao vincular comprovante:", error);
      return res.status(500).json({
        message: "Erro interno ao vincular comprovante.",
      });
    }
  }

  async rejeitar(req, res) {
    try {
      const { id } = req.params;

      const comprovante = await comprovanteService.rejeitar(id);
      return res.status(200).json(comprovante);
    } catch (error) {
      if (error.message === "Comprovante não encontrado.") {
        return res.status(404).json({ message: error.message });
      }

      console.error("Erro ao rejeitar comprovante:", error);
      return res.status(500).json({
        message: "Erro interno ao rejeitar comprovante.",
      });
    }
  }
}

export default new ComprovanteController();
