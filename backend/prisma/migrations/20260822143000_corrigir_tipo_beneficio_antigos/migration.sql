-- Corrige beneficiários antigos que possam estar sem tipo de benefício.
-- O valor padrão do sistema é CESTA.

UPDATE "beneficiarios"
SET "tipoBeneficio" = 'CESTA'
WHERE "tipoBeneficio" IS NULL;

-- Garante que novos registros tenham CESTA como padrão no banco.
ALTER TABLE "beneficiarios"
ALTER COLUMN "tipoBeneficio" SET DEFAULT 'CESTA';

-- Garante consistência com o schema Prisma atual.
ALTER TABLE "beneficiarios"
ALTER COLUMN "tipoBeneficio" SET NOT NULL;
