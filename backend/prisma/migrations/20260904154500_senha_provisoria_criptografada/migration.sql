-- Armazena somente a versão criptografada da senha provisória.
ALTER TABLE "usuarios" ADD COLUMN "senhaProvisoriaCriptografada" TEXT;
