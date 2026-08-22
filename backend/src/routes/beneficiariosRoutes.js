import express from "express";
import beneficiarioController from "../controllers/beneficiarioController.js";
import { authorize, protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post(
  "/",
  protect,
  authorize("ADMIN", "INSTITUICAO"),
  beneficiarioController.cadastrarBeneficiario,
);
router.get(
  "/",
  protect,
  authorize("ADMIN", "INSTITUICAO"),
  beneficiarioController.listarBeneficiarios,
);
router.get(
  "/:id",
  protect,
  authorize("ADMIN", "INSTITUICAO"),
  beneficiarioController.detalheDoBeneficiario,
);
router.get(
  "/:id/historico",
  protect,
  authorize("ADMIN", "INSTITUICAO"),
  beneficiarioController.listarHistoricoDoBeneficiario,
);
router.get(
  "/:id/carteirinha",
  protect,
  authorize("ADMIN", "INSTITUICAO"),
  beneficiarioController.obterCarteirinha,
);
router.get(
  "/:id/foto",
  protect,
  authorize("ADMIN", "INSTITUICAO"),
  beneficiarioController.obterFotoPerfil,
);
router.put(
  "/:id/foto",
  protect,
  authorize("ADMIN", "INSTITUICAO"),
  beneficiarioController.salvarFotoPerfil,
);

router.put(
  "/:id",
  protect,
  authorize("ADMIN", "INSTITUICAO"),
  beneficiarioController.atualizarDadosBeneficiario,
);
router.patch(
  "/:id",
  protect,
  authorize("ADMIN", "INSTITUICAO"),
  beneficiarioController.desativarBeneficiario,
);

export default router;
