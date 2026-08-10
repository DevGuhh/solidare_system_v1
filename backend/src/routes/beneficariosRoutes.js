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
