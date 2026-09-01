/*
  Warnings:

  - Made the column `tipo` on table `notificacoes` required. This step will fail if there are existing NULL values in that column.
  - Made the column `lida` on table `notificacoes` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "beneficiarios" DROP CONSTRAINT "beneficiarios_instituicaoId_fkey";

-- AlterTable
ALTER TABLE "notificacoes" ADD COLUMN     "doacaoId" INTEGER,
ALTER COLUMN "tipo" SET NOT NULL,
ALTER COLUMN "lida" SET NOT NULL,
ALTER COLUMN "atualizadoEm" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "beneficiarios" ADD CONSTRAINT "beneficiarios_instituicaoId_fkey" FOREIGN KEY ("instituicaoId") REFERENCES "instituicoes_parceiras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_doacaoId_fkey" FOREIGN KEY ("doacaoId") REFERENCES "doacoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
