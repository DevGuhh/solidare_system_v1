-- CreateEnum
CREATE TYPE "TipoEventoHistorico" AS ENUM ('CADASTRO', 'ATUALIZACAO', 'DOACAO');

-- CreateTable
CREATE TABLE "historico_beneficiarios" (
    "id" SERIAL NOT NULL,
    "beneficiarioId" INTEGER NOT NULL,
    "tipo" "TipoEventoHistorico" NOT NULL,
    "descricao" TEXT NOT NULL,
    "detalhes" JSONB,
    "usuarioId" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historico_beneficiarios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "historico_beneficiarios_beneficiarioId_idx" ON "historico_beneficiarios"("beneficiarioId");

-- CreateIndex
CREATE INDEX "historico_beneficiarios_beneficiarioId_criadoEm_idx" ON "historico_beneficiarios"("beneficiarioId", "criadoEm");

-- AddForeignKey
ALTER TABLE "historico_beneficiarios" ADD CONSTRAINT "historico_beneficiarios_beneficiarioId_fkey" FOREIGN KEY ("beneficiarioId") REFERENCES "beneficiarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_beneficiarios" ADD CONSTRAINT "historico_beneficiarios_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
