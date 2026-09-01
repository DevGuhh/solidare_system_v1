CREATE TABLE "notificacoes" (
    "id" SERIAL NOT NULL,
    "instituicao" TEXT NOT NULL,
    "assunto" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "mensagem" TEXT,
    "tipo" TEXT DEFAULT 'MENSAGEM',
    "destinatario" TEXT,
    "remetente" TEXT,
    "lida" BOOLEAN DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_notificacoes_instituicao_criadoEm"
ON "notificacoes"("instituicao", "criadoEm");

CREATE INDEX "idx_notificacoes_lida_criadoEm"
ON "notificacoes"("lida", "criadoEm");
