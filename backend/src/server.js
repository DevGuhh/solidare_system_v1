import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { config } from "dotenv";
import rateLimit from "express-rate-limit";
import { connectDB, disconnectDB } from "./config/db.js";
import { iniciarLimpezaAutomaticaComprovantes } from "./services/limpezaComprovantesService.js";

// ===============================
// IMPORTAÇÃO DAS ROTAS
// ===============================

import authRoutes from "./routes/authRoutes.js";
import instituicoesRoutes from "./routes/instituicoesRoutes.js";
import beneficiariosRoutes from "./routes/beneficiariosRoutes.js";
import doacoesRoutes from "./routes/doacoesRoutes.js";
import qrcodeRoutes from "./routes/qrcodeRoutes.js";
import saldoCestaRoutes from "./routes/saldoCestaRoutes.js";
import comprovanteRoutes from "./routes/comprovanteRoutes.js";

// ===============================
// VARIÁVEIS DE AMBIENTE
// ===============================

config();

// ===============================
// CONEXÃO COM O BANCO
// ===============================

connectDB();

// ===============================
// EXPRESS
// ===============================

const app = express();

app.set("trust proxy", 1);

// ===============================
// CORS
// ===============================

const allowedOrigins = [
  "https://solidare-login-v4.vercel.app",
  "https://solidare-system-v1.vercel.app",
  "https://solidare-login-v4-jihy0l9fa-devguhhs-projects.vercel.app",
  "http://127.0.0.1:5500",
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Origin não permitida"));
      }
    },
    credentials: true,
  }),
);

// ===============================
// MIDDLEWARES
// ===============================

app.use(cookieParser());
app.use(express.json({ limit: "8mb" }));
app.use(express.urlencoded({ extended: true, limit: "8mb" }));
// Rotas
app.use("/uploads", express.static("uploads"));

// Se o arquivo físico não existir, encerra aqui.
// Isso impede que /uploads caia no rate limit global.
app.use("/uploads", (req, res) => {
  return res.status(404).json({
    error: "Arquivo não encontrado.",
  });
});

app.use("/api/comprovantes", comprovanteRoutes);

// ===============================
// RATE LIMIT
// ===============================

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// ===============================
// ROTAS
// ===============================

app.use("/auth", authRoutes);

app.use("/instituicoes", instituicoesRoutes);

app.use("/beneficiarios", beneficiariosRoutes);

app.use("/doacoes", doacoesRoutes);

app.use("/qrcodes", qrcodeRoutes);

app.use("/saldo-cestas", saldoCestaRoutes);

// ===============================
// PORTA
// ===============================

const PORT = process.env.PORT || 3000;

// ===============================
// INICIA O SERVIDOR
// ===============================

const server = app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  iniciarLimpezaAutomaticaComprovantes();
});

// ===============================
// TRATAMENTO DE ERROS
// ===============================

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);

  server.close(async () => {
    await disconnectDB();
    process.exit(1);
  });
});

process.on("uncaughtException", async (err) => {
  console.error("Uncaught Exception:", err);

  await disconnectDB();
  process.exit(1);
});

process.on("SIGTERM", async () => {
  console.log("SIGTERM recebido. Encerrando aplicação...");

  server.close(async () => {
    await disconnectDB();
    process.exit(0);
  });
});
