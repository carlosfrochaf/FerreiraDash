-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('RG_CNH', 'CPF', 'COMPROVANTE_ENDERECO', 'CTPS', 'PROCURACAO', 'CONTRATO_HONORARIOS', 'DECLARACAO_HIPOSSUFICIENCIA', 'PETICAO', 'DECISAO', 'ACORDO_ATA', 'ALVARA', 'COMPROVANTE', 'TRCT', 'HOLERITE', 'EXTRATO_FGTS', 'CARTAO_PONTO', 'CONTRATO_TRABALHO', 'AVISO_PREVIO', 'ATESTADO', 'CAT', 'PRINTS', 'OUTRO');

-- CreateEnum
CREATE TYPE "SituacaoFicha" AS ENUM ('RASCUNHO', 'ENVIADA');

-- CreateEnum
CREATE TYPE "MomentoMensagem" AS ENUM ('ANTES_CONTRATO', 'DEPOIS_CONTRATO', 'AUDIENCIA', 'SEMPRE');

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
    "estado_civil" TEXT,
    "cep" TEXT,
    "cidade_uf" TEXT,
    "origem" TEXT,
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
    "enviado_por_id" TEXT,
    "peticao_id" TEXT,
    "origem_externa" TEXT,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "modelos_mensagem" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "momento" "MomentoMensagem" NOT NULL,
    "texto" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modelos_mensagem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "documentos_origem_externa_key" ON "documentos"("origem_externa");

-- CreateIndex
CREATE INDEX "documentos_cliente_id_idx" ON "documentos"("cliente_id");

-- CreateIndex
CREATE INDEX "documentos_recebimento_id_idx" ON "documentos"("recebimento_id");

-- CreateIndex
CREATE INDEX "documentos_peticao_id_idx" ON "documentos"("peticao_id");

-- CreateIndex
CREATE INDEX "fichas_cliente_id_idx" ON "fichas"("cliente_id");

-- CreateIndex
CREATE INDEX "fichas_advogado_chave_idx" ON "fichas"("advogado_chave");

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

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_peticao_id_fkey" FOREIGN KEY ("peticao_id") REFERENCES "peticoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fichas" ADD CONSTRAINT "fichas_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fichas" ADD CONSTRAINT "fichas_recebimento_id_fkey" FOREIGN KEY ("recebimento_id") REFERENCES "recebimentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Bloqueia a API pública do Supabase (o app acessa pelo servidor).
ALTER TABLE "clientes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "documentos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "fichas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "modelos_mensagem" ENABLE ROW LEVEL SECURITY;
