import express from "express";
import instituicoesController from "../controllers/instituicoesController.js";
import { authorize, protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get(
  "/",
  protect,
  authorize("ADMIN"),
  instituicoesController.listarInstituicoes,
);
router.get(
  "/:id",
  protect,
  authorize("ADMIN"),
  instituicoesController.detalheDaInstituicao,
);
router.get(
  "/:id/senha-provisoria",
  protect,
  authorize("ADMIN"),
  instituicoesController.visualizarSenhaProvisoria,
);
router.get(
  "/:id/beneficiarios",
  protect,
  authorize("ADMIN"),
  instituicoesController.listarBeneficiariosInstituicao,
);
router.post(
  "/",
  protect,
  authorize("ADMIN"),
  instituicoesController.cadastrarInstituicao,
);
router.put(
  "/:id",
  protect,
  authorize("ADMIN"),
  instituicoesController.atualizarDadosInstituicao,
);
router.patch(
  "/:id/status_ok",
  protect,
  authorize("ADMIN"),
  instituicoesController.atualizaStatus,
);
router.patch(
  "/:id",
  protect,
  authorize("ADMIN"),
  instituicoesController.desativarInstituicao,
);


export default router;
