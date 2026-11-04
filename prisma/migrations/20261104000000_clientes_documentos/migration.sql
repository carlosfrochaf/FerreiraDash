-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('RG_CNH', 'CPF', 'COMPROVANTE_ENDERECO', 'CTPS', 'PROCURACAO', 'CONTRATO_HONORARIOS', 'PETICAO', 'DECISAO', 'ACORDO_ATA', 'ALVARA', 'COMPROVANTE', 'OUTRO');

-- AlterTable
ALTER TABLE "recebimentos" ADD COLUMN     "cliente_id" TEXT;

-- AlterTable
ALTER TABLE "audiencias" ADD COLUMN     "cliente_id" TEXT;

-- AlterTable
ALTER TABLE "peticoes" ADD COLUMN     "cliente_id" TEXT;

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "endereco" TEXT,
    "data_nascimento" DATE,
    "pix" TEXT,
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos" (
    "id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "recebimento_id" TEXT,
    "tipo" "TipoDocumento" NOT NULL,
    "nome" TEXT NOT NULL,
    "caminho" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "documentos_cliente_id_idx" ON "documentos"("cliente_id");

-- CreateIndex
CREATE INDEX "documentos_recebimento_id_idx" ON "documentos"("recebimento_id");

-- CreateIndex
CREATE INDEX "recebimentos_cliente_id_idx" ON "recebimentos"("cliente_id");

-- CreateIndex
CREATE INDEX "audiencias_cliente_id_idx" ON "audiencias"("cliente_id");

-- CreateIndex
CREATE INDEX "peticoes_cliente_id_idx" ON "peticoes"("cliente_id");

-- AddForeignKey
ALTER TABLE "recebimentos" ADD CONSTRAINT "recebimentos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audiencias" ADD CONSTRAINT "audiencias_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peticoes" ADD CONSTRAINT "peticoes_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_recebimento_id_fkey" FOREIGN KEY ("recebimento_id") REFERENCES "recebimentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Bloqueia a API pública do Supabase (ver migration de RLS).
ALTER TABLE "clientes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "documentos" ENABLE ROW LEVEL SECURITY;
