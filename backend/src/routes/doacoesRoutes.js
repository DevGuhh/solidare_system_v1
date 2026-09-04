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
router.get(
  "/:id/comprovante-entrega",
  authorize("ADMIN", "INSTITUICAO"),
  DoacoesController.obterComprovanteEntrega,
);
// Doações concluídas são imutáveis.
// Em caso de erro, a correção deve ocorrer por cancelamento/estorno,
// preservando a rastreabilidade e o histórico da movimentação.
router.delete(
  "/:id",
  authorize("ADMIN", "INSTITUICAO"),
  DoacoesController.cancelarDoacao,
);

export default router;
