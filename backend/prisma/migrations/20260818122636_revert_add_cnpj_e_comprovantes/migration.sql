ALTER TABLE "comprovantes"
DROP CONSTRAINT "comprovantes_instituicaoId_fkey";

DROP INDEX "comprovantes_instituicaoId_idx";

DROP INDEX "comprovantes_status_idx";

DROP TABLE "comprovantes";

DROP INDEX "instituicoes_parceiras_cnpj_key";

ALTER TABLE "instituicoes_parceiras"
DROP COLUMN "cnpj";

DROP TYPE "StatusComprovante";