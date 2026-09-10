import "dotenv/config";
import pkg from "pg";
const { Client } = pkg;

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const sql = `
  CREATE TABLE IF NOT EXISTS "notificacoes" (
    "id" SERIAL PRIMARY KEY,
    "instituicao" TEXT NOT NULL,
    "assunto" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "mensagem" TEXT,
    "tipo" TEXT DEFAULT 'MENSAGEM',
    "destinatario" TEXT,
    "remetente" TEXT,
    "lida" BOOLEAN DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS "idx_notificacoes_lida_criadoEm" ON "notificacoes" ("lida", "criadoEm");
  CREATE INDEX IF NOT EXISTS "idx_notificacoes_instituicao_criadoEm" ON "notificacoes" ("instituicao", "criadoEm");
  `;

  await client.query(sql);
  console.log("Tabela notificacoes criada/atualizada com sucesso.");

  await client.end();
}

main().catch((e) => {
  console.error("Erro criando tabela notificacoes:", e);
  process.exit(1);
});
