import express from "express";
import DoacoesController from "../controllers/doacoesController.js";
import { authorize, protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.post(
  "/",
  authorize("ADMIN", "INSTITUICAO"),
  DoacoesController.cadastrarDoacao,
);
router.get(
  "/",
  authorize("ADMIN", "INSTITUICAO"),
  DoacoesController.listarDoacoes,
);
router.get(
  "/:id",
  authorize("ADMIN", "INSTITUICAO"),
  DoacoesController.detalheDeDoacao,
);
router.put(
  "/:id",
  authorize("ADMIN", "INSTITUICAO"),
  DoacoesController.atualizarUmaDoacao,
);
router.patch(
  "/:id/comprovante",
  authorize("ADMIN", "INSTITUICAO"),
  DoacoesController.alterarComprovanteDoacao,
);
router.delete(
  "/:id",
  authorize("ADMIN", "INSTITUICAO"),
  DoacoesController.cancelarDoacao,
);

export default router;
