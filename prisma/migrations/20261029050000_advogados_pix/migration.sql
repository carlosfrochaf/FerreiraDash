-- CreateTable
CREATE TABLE "advogados" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "pix" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "advogados_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "advogados_chave_key" ON "advogados"("chave");


-- Bloqueia a API pública do Supabase (ver migration de RLS).
ALTER TABLE "advogados" ENABLE ROW LEVEL SECURITY;
