/*
  Warnings:

  - A unique constraint covering the columns `[cnpj]` on the table `instituicoes_parceiras` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "StatusComprovante" AS ENUM ('PROCESSANDO', 'VINCULADO', 'PENDENTE_REVISAO', 'ERRO');

-- AlterTable
ALTER TABLE "instituicoes_parceiras" ADD COLUMN     "cnpj" TEXT;

-- CreateTable
CREATE TABLE "comprovantes" (
    "id" SERIAL NOT NULL,
    "arquivoUrl" TEXT NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "cnpjDetectado" TEXT,
    "status" "StatusComprovante" NOT NULL DEFAULT 'PROCESSANDO',
    "instituicaoId" INTEGER,
    "usuarioId" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

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
