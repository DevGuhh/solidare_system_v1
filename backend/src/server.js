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
import notificacoesRoutes from "./routes/notificacoesRoutes.js";

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

const allowedOrigins = new Set([
  "https://solidare-login-v4.vercel.app",
  "https://solidare-system-v1.vercel.app",
  "https://solidare-login-v4-jihy0l9fa-devguhhs-projects.vercel.app",
]);

function origemPermitida(origin) {
  // Requisições sem Origin (Postman, servidor-servidor, health checks).
  if (!origin) return true;

  if (allowedOrigins.has(origin)) return true;

  // Ambiente local: aceita Live Server em localhost/127.0.0.1,
  // independentemente da porta escolhida pelo VS Code.
  try {
    const url = new URL(origin);

    return (
      url.protocol === "http:" &&
      (url.hostname === "127.0.0.1" || url.hostname === "localhost")
    );
  } catch {
    return false;
  }
}

app.use(
  cors({
    origin(origin, callback) {
      if (origemPermitida(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Origin não permitida: ${origin}`));
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
// Arquivos de comprovantes não são públicos. O acesso ocorre somente
// pela rota autenticada /api/comprovantes/:id/arquivo.

// ===============================
// RATE LIMIT
// ===============================

// O limitador precisa ser registrado antes de TODAS as rotas.
// OPTIONS é ignorado para não penalizar o preflight do CORS.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === "OPTIONS",
  message: {
    error: "Muitas requisições. Tente novamente em alguns minutos.",
  },
});

app.use(limiter);

// Limite adicional para operações de comprovantes/OCR, que são mais pesadas.
const comprovantesLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === "OPTIONS",
  message: {
    error: "Muitas operações com comprovantes. Tente novamente em alguns minutos.",
  },
});

// ===============================
// ROTAS
// ===============================

app.use("/api/comprovantes", comprovantesLimiter, comprovanteRoutes);
app.use("/notificacoes", notificacoesRoutes);

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
