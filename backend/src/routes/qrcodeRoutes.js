import express from "express";
import qrcodeController from "../controllers/qrcodeController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Listar todos os QR Codes
router.get("/", protect, qrcodeController.listarQRCodes);

// Criar um novo QR Code
router.post("/", protect, qrcodeController.criarQRCode);

// Validar um QR Code
router.get("/:codigo/validar", protect, qrcodeController.validarQRCode);

// Gerar imagem do QR Code
router.get("/:codigo/imagem", protect, qrcodeController.gerarImagemQRCode);

// Buscar QR Code pelo código
router.get("/:codigo", protect, qrcodeController.buscarQRCode);

// Desativar QR Code
router.patch("/:id", protect, qrcodeController.desativarQRCode);

export default router;