-- CreateEnum
CREATE TYPE "TipoMovimentacaoSaldo" AS ENUM ('ENTRADA', 'SAIDA_DOACAO', 'ESTORNO_DOACAO');

-- CreateTable
CREATE TABLE "saldos_cesta" (
    "id" SERIAL NOT NULL,
    "instituicaoId" INTEGER NOT NULL,
    "saldoAtual" INTEGER NOT NULL DEFAULT 0,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saldos_cesta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentacoes_saldo" (
    "id" SERIAL NOT NULL,
    "saldoCestaId" INTEGER NOT NULL,
    "tipo" "TipoMovimentacaoSaldo" NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "saldoAnterior" INTEGER NOT NULL,
    "saldoPosterior" INTEGER NOT NULL,
    "doacaoId" INTEGER,
    "usuarioId" INTEGER NOT NULL,
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimentacoes_saldo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "saldos_cesta_instituicaoId_key" ON "saldos_cesta"("instituicaoId");

-- CreateIndex
CREATE INDEX "movimentacoes_saldo_saldoCestaId_criadoEm_idx" ON "movimentacoes_saldo"("saldoCestaId", "criadoEm");

-- CreateIndex
CREATE INDEX "movimentacoes_saldo_doacaoId_idx" ON "movimentacoes_saldo"("doacaoId");

-- AddForeignKey
ALTER TABLE "saldos_cesta" ADD CONSTRAINT "saldos_cesta_instituicaoId_fkey" FOREIGN KEY ("instituicaoId") REFERENCES "instituicoes_parceiras"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_saldo" ADD CONSTRAINT "movimentacoes_saldo_saldoCestaId_fkey" FOREIGN KEY ("saldoCestaId") REFERENCES "saldos_cesta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_saldo" ADD CONSTRAINT "movimentacoes_saldo_doacaoId_fkey" FOREIGN KEY ("doacaoId") REFERENCES "doacoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_saldo" ADD CONSTRAINT "movimentacoes_saldo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "saldos_cesta" ADD CONSTRAINT saldo_nao_negativo CHECK ("saldoAtual" >= 0);
