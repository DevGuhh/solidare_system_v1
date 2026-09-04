ALTER TABLE "doacoes"
  ADD COLUMN "origem" TEXT NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN "composicaoFamiliarSnapshot" INTEGER,
  ADD COLUMN "quantidadeCalculada" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "canceladaEm" TIMESTAMP(3),
  ADD COLUMN "motivoCancelamento" TEXT,
  ADD COLUMN "canceladaPorId" INTEGER;

CREATE INDEX "doacoes_canceladaPorId_idx" ON "doacoes"("canceladaPorId");
CREATE INDEX "doacoes_origem_idx" ON "doacoes"("origem");

ALTER TABLE "doacoes"
  ADD CONSTRAINT "doacoes_canceladaPorId_fkey"
  FOREIGN KEY ("canceladaPorId") REFERENCES "usuarios"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
