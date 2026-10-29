-- CreateEnum
CREATE TYPE "StatusRecebimento" AS ENUM ('PENDENTE', 'RECEBIDO');

-- CreateEnum
CREATE TYPE "StatusRepasse" AS ENUM ('PENDENTE', 'REPASSADO');

-- CreateTable
CREATE TABLE "recebimentos" (
    "id" TEXT NOT NULL,
    "processo_id" TEXT,
    "processo_numero" TEXT,
    "cliente_nome" TEXT NOT NULL,
    "reclamada" TEXT,
    "valor_total" DECIMAL(14,2) NOT NULL,
    "percentual_escritorio" DECIMAL(5,2) NOT NULL,
    "numero_parcelas" INTEGER NOT NULL,
    "data_primeiro_vencimento" DATE NOT NULL,
    "dia_vencimento" INTEGER NOT NULL,
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recebimentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parcelas" (
    "id" TEXT NOT NULL,
    "recebimento_id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "vencimento" DATE NOT NULL,
    "valor_parcela" DECIMAL(14,2) NOT NULL,
    "valor_escritorio" DECIMAL(14,2) NOT NULL,
    "valor_cliente" DECIMAL(14,2) NOT NULL,
    "status_recebimento" "StatusRecebimento" NOT NULL DEFAULT 'PENDENTE',
    "data_recebimento" DATE,
    "status_repasse" "StatusRepasse" NOT NULL DEFAULT 'PENDENTE',
    "data_repasse" DATE,
    "comprovante_repasse_url" TEXT,
    "comprovante_repasse_nome" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parcelas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recebimentos_processo_id_idx" ON "recebimentos"("processo_id");

-- CreateIndex
CREATE INDEX "parcelas_vencimento_idx" ON "parcelas"("vencimento");

-- CreateIndex
CREATE INDEX "parcelas_status_recebimento_vencimento_idx" ON "parcelas"("status_recebimento", "vencimento");

-- CreateIndex
CREATE INDEX "parcelas_status_repasse_status_recebimento_idx" ON "parcelas"("status_repasse", "status_recebimento");

-- CreateIndex
CREATE UNIQUE INDEX "parcelas_recebimento_id_numero_key" ON "parcelas"("recebimento_id", "numero");

-- AddForeignKey
ALTER TABLE "recebimentos" ADD CONSTRAINT "recebimentos_processo_id_fkey" FOREIGN KEY ("processo_id") REFERENCES "processos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcelas" ADD CONSTRAINT "parcelas_recebimento_id_fkey" FOREIGN KEY ("recebimento_id") REFERENCES "recebimentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

