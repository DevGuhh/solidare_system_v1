import express from "express";
import notificacoesController from "../controllers/notificacoesController.js";
import { authorize, protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/", authorize("ADMIN", "INSTITUICAO"), notificacoesController.listar);
router.post("/", authorize("ADMIN", "INSTITUICAO"), notificacoesController.criar);
router.patch("/:id/lida", authorize("ADMIN", "INSTITUICAO"), notificacoesController.marcarComoLida);

export default router;
