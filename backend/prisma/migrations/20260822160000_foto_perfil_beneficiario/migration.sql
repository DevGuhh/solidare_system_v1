-- Foto cadastral permanente usada na carteirinha do beneficiário.
ALTER TABLE "beneficiarios"
ADD COLUMN "fotoPerfil" BYTEA,
ADD COLUMN "fotoPerfilMimeType" TEXT;
