-- Sistema de suporte por chamados entre instituições e administradores.

CREATE TYPE "CategoriaChamadoSuporte" AS ENUM (
  'ALTERACAO_CADASTRAL',
  'DUVIDA',
  'PROBLEMA_TECNICO',
  'OUTRO'
);

CREATE TYPE "StatusChamadoSuporte" AS ENUM (
  'ABERTO',
  'EM_ATENDIMENTO',
  'AGUARDANDO_INSTITUICAO',
  'RESOLVIDO'
);

CREATE TABLE "chamados_suporte" (
  "id" SERIAL NOT NULL,
  "instituicaoId" INTEGER NOT NULL,
  "assunto" TEXT NOT NULL,
  "categoria" "CategoriaChamadoSuporte" NOT NULL,
  "status" "StatusChamadoSuporte" NOT NULL DEFAULT 'ABERTO',
  "criadoPorNome" TEXT NOT NULL,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL,
  "resolvidoEm" TIMESTAMP(3),

  CONSTRAINT "chamados_suporte_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "mensagens_suporte" (
  "id" SERIAL NOT NULL,
  "chamadoId" INTEGER NOT NULL,
  "autorRole" "RoleUsuario" NOT NULL,
  "autorNome" TEXT NOT NULL,
  "mensagem" TEXT NOT NULL,
  "lida" BOOLEAN NOT NULL DEFAULT false,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "mensagens_suporte_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "chamados_suporte_instituicaoId_atualizadoEm_idx"
ON "chamados_suporte"("instituicaoId", "atualizadoEm");

CREATE INDEX "chamados_suporte_status_atualizadoEm_idx"
ON "chamados_suporte"("status", "atualizadoEm");

CREATE INDEX "mensagens_suporte_chamadoId_criadoEm_idx"
ON "mensagens_suporte"("chamadoId", "criadoEm");

CREATE INDEX "mensagens_suporte_lida_criadoEm_idx"
ON "mensagens_suporte"("lida", "criadoEm");

ALTER TABLE "chamados_suporte"
ADD CONSTRAINT "chamados_suporte_instituicaoId_fkey"
FOREIGN KEY ("instituicaoId")
REFERENCES "instituicoes_parceiras"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "mensagens_suporte"
ADD CONSTRAINT "mensagens_suporte_chamadoId_fkey"
FOREIGN KEY ("chamadoId")
REFERENCES "chamados_suporte"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
