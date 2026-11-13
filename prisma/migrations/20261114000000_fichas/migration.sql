-- CreateEnum
CREATE TYPE "SituacaoFicha" AS ENUM ('RASCUNHO', 'ENVIADA');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TipoDocumento" ADD VALUE 'TRCT';
ALTER TYPE "TipoDocumento" ADD VALUE 'HOLERITE';
ALTER TYPE "TipoDocumento" ADD VALUE 'EXTRATO_FGTS';
ALTER TYPE "TipoDocumento" ADD VALUE 'CARTAO_PONTO';
ALTER TYPE "TipoDocumento" ADD VALUE 'CONTRATO_TRABALHO';
ALTER TYPE "TipoDocumento" ADD VALUE 'AVISO_PREVIO';
ALTER TYPE "TipoDocumento" ADD VALUE 'ATESTADO';
ALTER TYPE "TipoDocumento" ADD VALUE 'CAT';
ALTER TYPE "TipoDocumento" ADD VALUE 'PRINTS';

-- AlterTable
ALTER TABLE "clientes" ADD COLUMN     "cep" TEXT,
ADD COLUMN     "cidade_uf" TEXT,
ADD COLUMN     "estado_civil" TEXT,
ADD COLUMN     "origem" TEXT;

-- AlterTable
ALTER TABLE "documentos" ADD COLUMN     "enviado_por_id" TEXT,
ADD COLUMN     "peticao_id" TEXT;

-- CreateTable
CREATE TABLE "fichas" (
    "id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "advogado_chave" TEXT,
    "empresa" TEXT,
    "situacao" "SituacaoFicha" NOT NULL DEFAULT 'RASCUNHO',
    "dados" JSONB NOT NULL DEFAULT '{}',
    "recebimento_id" TEXT,
    "criada_por_id" TEXT,
    "enviada_em" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fichas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fichas_cliente_id_idx" ON "fichas"("cliente_id");

-- CreateIndex
CREATE INDEX "fichas_advogado_chave_idx" ON "fichas"("advogado_chave");

-- CreateIndex
CREATE INDEX "documentos_peticao_id_idx" ON "documentos"("peticao_id");

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_peticao_id_fkey" FOREIGN KEY ("peticao_id") REFERENCES "peticoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fichas" ADD CONSTRAINT "fichas_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fichas" ADD CONSTRAINT "fichas_recebimento_id_fkey" FOREIGN KEY ("recebimento_id") REFERENCES "recebimentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Bloqueia a API pública do Supabase nesta tabela (o app acessa pelo servidor).
ALTER TABLE "fichas" ENABLE ROW LEVEL SECURITY;
