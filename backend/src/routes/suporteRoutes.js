import express from "express";
import suporteController from "../controllers/suporteController.js";
import { authorize, protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get(
  "/chamados",
  authorize("ADMIN", "INSTITUICAO"),
  suporteController.listar,
);

router.post(
  "/chamados",
  authorize("INSTITUICAO"),
  suporteController.criar,
);

router.get(
  "/chamados/:id",
  authorize("ADMIN", "INSTITUICAO"),
  suporteController.detalhar,
);

router.post(
  "/chamados/:id/mensagens",
  authorize("ADMIN", "INSTITUICAO"),
  suporteController.responder,
);

router.patch(
  "/chamados/:id/status",
  authorize("ADMIN"),
  suporteController.alterarStatus,
);

export default router;
