-- Torna endereço e telefone principal opcionais para beneficiários.
ALTER TABLE "beneficiarios"
    ALTER COLUMN "logradouro" DROP NOT NULL,
    ALTER COLUMN "numero" DROP NOT NULL,
    ALTER COLUMN "regiao" DROP NOT NULL,
    ALTER COLUMN "cidade" DROP NOT NULL,
    ALTER COLUMN "uf" DROP NOT NULL,
    ALTER COLUMN "telefonePrincipal" DROP NOT NULL;
