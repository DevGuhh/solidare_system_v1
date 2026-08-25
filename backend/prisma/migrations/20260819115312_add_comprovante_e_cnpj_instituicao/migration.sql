/*
  Warnings:

  - A unique constraint covering the columns `[cnpj]` on the table `instituicoes_parceiras` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "StatusComprovante" AS ENUM ('VINCULADO', 'PENDENTE_REVISAO', 'REJEITADO');

-- AlterTable
ALTER TABLE "instituicoes_parceiras" ADD COLUMN     "cnpj" TEXT;

-- CreateTable
CREATE TABLE "comprovantes" (
    "id" SERIAL NOT NULL,
    "arquivoUrl" TEXT NOT NULL,
    "tipoDoc" TEXT NOT NULL,
    "cnpjExtraido" TEXT,
    "status" "StatusComprovante" NOT NULL DEFAULT 'PENDENTE_REVISAO',
    "instituicaoId" INTEGER,
    "doacaoId" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revisadoEm" TIMESTAMP(3),

    CONSTRAINT "comprovantes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "comprovantes_instituicaoId_idx" ON "comprovantes"("instituicaoId");

-- CreateIndex
CREATE INDEX "comprovantes_status_idx" ON "comprovantes"("status");

-- CreateIndex
CREATE UNIQUE INDEX "instituicoes_parceiras_cnpj_key" ON "instituicoes_parceiras"("cnpj");

-- AddForeignKey
ALTER TABLE "comprovantes" ADD CONSTRAINT "comprovantes_instituicaoId_fkey" FOREIGN KEY ("instituicaoId") REFERENCES "instituicoes_parceiras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comprovantes" ADD CONSTRAINT "comprovantes_doacaoId_fkey" FOREIGN KEY ("doacaoId") REFERENCES "doacoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
