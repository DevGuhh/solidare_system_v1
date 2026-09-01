-- Garante a existência da tabela de notificações também em bancos criados
-- exclusivamente pelo histórico de migrations.
CREATE TABLE IF NOT EXISTS "notificacoes" (
    "id" SERIAL NOT NULL,
    "instituicao" TEXT NOT NULL,
    "assunto" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "mensagem" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'MENSAGEM',
    "destinatario" TEXT,
    "remetente" TEXT,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "notificacoes"
ADD COLUMN IF NOT EXISTS "instituicaoId" INTEGER;

-- Recupera o vínculo das mensagens antigas sempre que o nome armazenado
-- permitir identificar a instituição correspondente.
UPDATE "notificacoes" AS n
SET "instituicaoId" = i."id"
FROM "instituicoes_parceiras" AS i
WHERE n."instituicaoId" IS NULL
  AND (
    n."instituicao" = i."nome"
    OR n."remetente" = i."nome"
    OR n."destinatario" = i."nome"
  );

CREATE INDEX IF NOT EXISTS "notificacoes_instituicaoId_criadoEm_idx"
ON "notificacoes"("instituicaoId", "criadoEm");

CREATE INDEX IF NOT EXISTS "notificacoes_lida_criadoEm_idx"
ON "notificacoes"("lida", "criadoEm");

CREATE INDEX IF NOT EXISTS "notificacoes_instituicao_criadoEm_idx"
ON "notificacoes"("instituicao", "criadoEm");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'notificacoes_instituicaoId_fkey'
  ) THEN
    ALTER TABLE "notificacoes"
    ADD CONSTRAINT "notificacoes_instituicaoId_fkey"
    FOREIGN KEY ("instituicaoId") REFERENCES "instituicoes_parceiras"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
