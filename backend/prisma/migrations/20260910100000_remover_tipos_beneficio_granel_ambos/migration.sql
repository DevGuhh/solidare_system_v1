BEGIN;

-- Registros antigos de Granel/Ambos passam a Cesta para preservar o histórico
-- antes da remoção desses valores do enum.
UPDATE "beneficiarios"
SET "tipoBeneficio" = 'CESTA'
WHERE "tipoBeneficio" IN ('GRANEL', 'AMBOS');

UPDATE "doacoes"
SET "tipo" = 'CESTA'
WHERE "tipo" IN ('GRANEL', 'AMBOS');

ALTER TYPE "public"."TipoBeneficio" RENAME TO "TipoBeneficio_old";

CREATE TYPE "public"."TipoBeneficio" AS ENUM ('CESTA', 'OUTROS');

ALTER TABLE "beneficiarios"
  ALTER COLUMN "tipoBeneficio" DROP DEFAULT,
  ALTER COLUMN "tipoBeneficio" TYPE "public"."TipoBeneficio"
    USING ("tipoBeneficio"::text::"public"."TipoBeneficio"),
  ALTER COLUMN "tipoBeneficio" SET DEFAULT 'CESTA';

ALTER TABLE "doacoes"
  ALTER COLUMN "tipo" TYPE "public"."TipoBeneficio"
    USING ("tipo"::text::"public"."TipoBeneficio");

DROP TYPE "public"."TipoBeneficio_old";

COMMIT;
