-- Etapa 2: comprovante fotográfico obrigatório na confirmação via QR Code.
CREATE TABLE "comprovantes_entrega" (
    "id" SERIAL NOT NULL,
    "doacaoId" INTEGER NOT NULL,
    "foto" BYTEA NOT NULL,
    "mimeType" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comprovantes_entrega_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "comprovantes_entrega_doacaoId_key" ON "comprovantes_entrega"("doacaoId");
CREATE INDEX "comprovantes_entrega_expiraEm_idx" ON "comprovantes_entrega"("expiraEm");

ALTER TABLE "comprovantes_entrega"
ADD CONSTRAINT "comprovantes_entrega_doacaoId_fkey"
FOREIGN KEY ("doacaoId") REFERENCES "doacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
