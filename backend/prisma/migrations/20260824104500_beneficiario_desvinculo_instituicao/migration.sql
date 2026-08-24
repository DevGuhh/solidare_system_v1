-- Permite manter o beneficiário no sistema mesmo depois de ser
-- desvinculado por uma instituição.
ALTER TABLE "beneficiarios"
ALTER COLUMN "instituicaoId" DROP NOT NULL;
