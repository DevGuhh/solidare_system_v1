// backend/src/routes/comprovanteRoutes.js
import express from "express";
import comprovanteController, {
  uploadMiddleware,
} from "../controllers/comprovanteController.js";
import { authorize, protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", protect, uploadMiddleware, comprovanteController.enviar);
router.get(
  "/pendentes",
  protect,
  authorize("ADMIN"),
  comprovanteController.listarPendentes,
);
router.get(
  "/instituicao/:instituicaoId",
  protect,
  authorize("ADMIN"),
  comprovanteController.listarPorInstituicao,
);

router.get(
  "/:id/arquivo",
  protect,
  authorize("ADMIN", "INSTITUICAO"),
  comprovanteController.abrirArquivo,
);

router.patch(
  "/:id/vincular",
  protect,
  authorize("ADMIN"),
  comprovanteController.vincular,
);
router.patch(
  "/:id/rejeitar",
  protect,
  authorize("ADMIN"),
  comprovanteController.rejeitar,
);

export default router;

