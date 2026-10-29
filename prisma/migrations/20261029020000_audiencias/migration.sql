-- CreateEnum
CREATE TYPE "StatusPagamento" AS ENUM ('PENDENTE', 'PAGO');

-- CreateTable
CREATE TABLE "audiencias" (
    "id" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "hora" TEXT,
    "advogado_nome" TEXT NOT NULL,
    "cliente_nome" TEXT NOT NULL,
    "reclamada" TEXT,
    "processo_numero" TEXT,
    "valor" DECIMAL(14,2),
    "status_pagamento" "StatusPagamento" NOT NULL DEFAULT 'PENDENTE',
    "data_pagamento" DATE,
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audiencias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audiencias_data_idx" ON "audiencias"("data");

-- CreateIndex
CREATE INDEX "audiencias_status_pagamento_data_idx" ON "audiencias"("status_pagamento", "data");


-- Bloqueia a API pública do Supabase (ver migration de RLS).
ALTER TABLE "audiencias" ENABLE ROW LEVEL SECURITY;
