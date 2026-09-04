import express from "express";
import saldoCestaController from "../controllers/saldoCestaController.js";
import { authorize, protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/entrada", authorize("ADMIN"), saldoCestaController.registrarEntrada);
router.get("/", authorize("ADMIN"), saldoCestaController.listarSaldos);
router.get("/:instituicaoId/recomendacao", authorize("ADMIN"), saldoCestaController.recomendacaoEnvio);
router.get("/:instituicaoId", authorize("ADMIN", "INSTITUICAO"), saldoCestaController.detalheSaldo);
router.get("/:instituicaoId/historico", authorize("ADMIN", "INSTITUICAO"), saldoCestaController.historicoSaldo);

export default router;