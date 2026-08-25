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
router.patch(
  "/:id/vincular",
  protect,
  authorize("ADMIN"),
  comprovanteController.vincular,
);

export default router;

//asdfghjklç
