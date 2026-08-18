import express from "express";
import ocrController from "../controllers/ocrController.js"
import { authorize, protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/send-image", ocrController.sendImage);


export default router;