-- CreateTable
CREATE TABLE "despesas_recorrentes" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "valor" DECIMAL(14,2) NOT NULL,
    "dia_vencimento" INTEGER NOT NULL,
    "categoria_id" TEXT NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "ultimo_mes" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "despesas_recorrentes_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "transacoes" ADD COLUMN "recorrencia_id" TEXT;

-- CreateIndex
CREATE INDEX "despesas_recorrentes_ativa_idx" ON "despesas_recorrentes"("ativa");

-- CreateIndex
CREATE INDEX "transacoes_recorrencia_id_idx" ON "transacoes"("recorrencia_id");

-- AddForeignKey
ALTER TABLE "transacoes" ADD CONSTRAINT "transacoes_recorrencia_id_fkey" FOREIGN KEY ("recorrencia_id") REFERENCES "despesas_recorrentes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despesas_recorrentes" ADD CONSTRAINT "despesas_recorrentes_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Bloqueia a API pública do Supabase (ver migration de RLS).
ALTER TABLE "despesas_recorrentes" ENABLE ROW LEVEL SECURITY;
