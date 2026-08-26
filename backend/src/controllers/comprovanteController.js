// backend/src/controllers/comprovanteController.js
import multer from "multer";
import fs from "fs/promises";
import path from "path";
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
        message: "Erro no upload",
        code: err.code,
        field: err.field,
        error: err.message,
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

      // CRIANDO UM NOVO NOME PARA O ARQUIVO
      const nomeArquivo = `${Date.now()}-${req.file.originalname}`;

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
      });

      return res.status(201).json(comprovante);
    } catch (error) {
      return res.status(500).json({
        message: "Erro ao processar comprovante",
        error: error.message,
      });
    }
  }

  async listarPendentes(req, res) {
    try {
      const pendentes = await comprovanteService.listarPendentes();
      return res.status(200).json(pendentes);
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Erro ao listar pendentes", error: error.message });
    }
  }

  async listarPorInstituicao(req, res) {
    try {
      const { instituicaoId } = req.params;

      const documentos =
        await comprovanteService.listarPorInstituicao(instituicaoId);

      return res.status(200).json(documentos);
    } catch (error) {
      const status =
        error.message === "ID da instituição inválido." ? 400 : 500;

      return res.status(status).json({
        message: "Erro ao listar documentos da instituição",
        error: error.message,
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
      return res.status(500).json({
        message: "Erro ao vincular comprovante",
        error: error.message,
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

      return res.status(500).json({
        message: "Erro ao rejeitar comprovante",
        error: error.message,
      });
    }
  }
}

export default new ComprovanteController();
