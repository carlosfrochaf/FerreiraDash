-- AlterTable
ALTER TABLE "documentos" ADD COLUMN     "origem_externa" TEXT;

-- CreateTable
CREATE TABLE "integracoes" (
    "id" TEXT NOT NULL,
    "token_cifrado" TEXT NOT NULL,
    "segredo_aviso" TEXT NOT NULL,
    "conectado_por_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integracoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "documentos_origem_externa_key" ON "documentos"("origem_externa");


-- Bloqueia a API pública do Supabase nesta tabela (o app acessa pelo servidor).
ALTER TABLE "integracoes" ENABLE ROW LEVEL SECURITY;
