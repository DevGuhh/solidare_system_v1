import express from "express";
import qrcodeController from "../controllers/qrcodeController.js";
import { authorize, protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(authorize("ADMIN", "INSTITUICAO"));

// Listar QR Codes visíveis ao usuário autenticado
router.get("/", qrcodeController.listarQRCodes);

// Criar um novo QR Code
router.post("/", qrcodeController.criarQRCode);

// Validar o QR Code e consultar a situação da cesta do mês
router.get("/:codigo/validar", qrcodeController.validarQRCode);

// Confirmar a entrega de 1 cesta usando o QR Code
router.post("/:codigo/confirmar-entrega", qrcodeController.confirmarEntrega);

// Gerar imagem do QR Code
router.get("/:codigo/imagem", qrcodeController.gerarImagemQRCode);

// Buscar QR Code pelo código
router.get("/:codigo", qrcodeController.buscarQRCode);

// Desativar QR Code
router.patch("/:id", qrcodeController.desativarQRCode);

export default router;
