-- CreateEnum
CREATE TYPE "StatusPeticao" AS ENUM ('A_VALIDAR', 'A_PAGAR', 'PAGA');

-- CreateTable
CREATE TABLE "peticoes" (
    "id" TEXT NOT NULL,
    "advogado_nome" TEXT NOT NULL,
    "cliente_nome" TEXT NOT NULL,
    "reclamada" TEXT,
    "processo_numero" TEXT,
    "descricao" TEXT NOT NULL,
    "data_entrega" DATE NOT NULL,
    "valor" DECIMAL(14,2),
    "status" "StatusPeticao" NOT NULL DEFAULT 'A_VALIDAR',
    "data_validacao" DATE,
    "data_pagamento" DATE,
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "peticoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "peticoes_status_data_entrega_idx" ON "peticoes"("status", "data_entrega");

-- CreateIndex
CREATE INDEX "peticoes_data_pagamento_idx" ON "peticoes"("data_pagamento");


-- Bloqueia a API pública do Supabase (ver migration de RLS).
ALTER TABLE "peticoes" ENABLE ROW LEVEL SECURITY;
