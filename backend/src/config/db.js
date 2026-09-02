import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

function normalizarDatabaseUrl(databaseUrl) {
    if (!databaseUrl) {
        throw new Error("DATABASE_URL não configurada.");
    }

    try {
        const url = new URL(databaseUrl);
        const sslMode = url.searchParams.get("sslmode");

        // pg-connection-string avisa que estes modos terão semântica diferente
        // em versões futuras. "verify-full" mantém explicitamente o
        // comportamento seguro utilizado atualmente.
        if (["prefer", "require", "verify-ca"].includes(sslMode)) {
            url.searchParams.set("sslmode", "verify-full");
        }

        return url.toString();
    } catch {
        // Mantém a mensagem de conexão original caso a URL seja inválida;
        // não expõe credenciais no log.
        throw new Error("DATABASE_URL inválida.");
    }
}

const connectionString = normalizarDatabaseUrl(process.env.DATABASE_URL);

const adapter = new PrismaPg({ connectionString });

// Consultas SQL detalhadas ficam desativadas por padrão, inclusive em
// desenvolvimento. Para diagnóstico pontual, use PRISMA_LOG_QUERIES=true.
// Erros continuam sendo registrados normalmente.
const logPrisma = ["error"];

if (process.env.NODE_ENV === "development") {
    logPrisma.push("warn");

    if (process.env.PRISMA_LOG_QUERIES === "true") {
        logPrisma.push("query");
    }
}

const prisma = new PrismaClient({
    adapter,
    log: logPrisma,
});

const connectDB = async () => {
    try {
        await prisma.$connect()
        console.log("BD conectado via Prisma")
    } catch (error) {
        console.error(`Erro de conexão com BD: ${error.message}`)
        process.exit(1)
    }
}

const disconnectDB = async () => {
    await prisma.$disconnect()
}

export { prisma, connectDB, disconnectDB};