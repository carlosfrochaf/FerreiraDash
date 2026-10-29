-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TipoTransacao" AS ENUM ('ENTRADA', 'SAIDA');

-- CreateEnum
CREATE TYPE "StatusTransacao" AS ENUM ('PAGO', 'PENDENTE', 'NAO_PAGO');

-- CreateEnum
CREATE TYPE "TipoContato" AS ENUM ('CLIENTE', 'ADVOGADO_PARCEIRO', 'FORNECEDOR', 'COLABORADOR');

-- CreateTable
CREATE TABLE "categorias" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT,
    "tipo" "TipoTransacao" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contatos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoContato" NOT NULL,
    "email" TEXT,
    "telefone" TEXT,
    "cpf_cnpj" TEXT,
    "pix_chave" TEXT,
    "banco" TEXT,
    "agencia" TEXT,
    "conta" TEXT,
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contatos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processos" (
    "id" TEXT NOT NULL,
    "numero_pje" TEXT NOT NULL,
    "nome_acao" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "processos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transacoes" (
    "id" TEXT NOT NULL,
    "tipo" "TipoTransacao" NOT NULL,
    "valor" DECIMAL(65,30) NOT NULL,
    "data_competencia" TIMESTAMP(3) NOT NULL,
    "data_pagamento" TIMESTAMP(3),
    "status" "StatusTransacao" NOT NULL DEFAULT 'PENDENTE',
    "descricao" TEXT,
    "anexo_url" TEXT,
    "anexo_nome" TEXT,
    "processo_numero" TEXT,
    "cliente_nome" TEXT,
    "reclamada" TEXT,
    "categoria_id" TEXT NOT NULL,
    "processo_id" TEXT,
    "contato_id" TEXT,
    "repasse_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repasses" (
    "id" TEXT NOT NULL,
    "processo_id" TEXT NOT NULL,
    "valor_total_recebido" DECIMAL(65,30) NOT NULL,
    "percentual_escritorio" DECIMAL(65,30) NOT NULL,
    "valor_escritorio" DECIMAL(65,30) NOT NULL,
    "valor_cliente" DECIMAL(65,30) NOT NULL,
    "data_recebimento" TIMESTAMP(3) NOT NULL,
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "repasses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categorias_slug_key" ON "categorias"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "processos_numero_pje_key" ON "processos"("numero_pje");

-- CreateIndex
CREATE INDEX "processos_cliente_id_idx" ON "processos"("cliente_id");

-- CreateIndex
CREATE INDEX "transacoes_tipo_status_idx" ON "transacoes"("tipo", "status");

-- CreateIndex
CREATE INDEX "transacoes_categoria_id_idx" ON "transacoes"("categoria_id");

-- CreateIndex
CREATE INDEX "transacoes_data_competencia_idx" ON "transacoes"("data_competencia");

-- CreateIndex
CREATE INDEX "transacoes_processo_id_idx" ON "transacoes"("processo_id");

-- CreateIndex
CREATE INDEX "transacoes_contato_id_idx" ON "transacoes"("contato_id");

-- CreateIndex
CREATE INDEX "repasses_processo_id_idx" ON "repasses"("processo_id");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- AddForeignKey
ALTER TABLE "processos" ADD CONSTRAINT "processos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "contatos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacoes" ADD CONSTRAINT "transacoes_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacoes" ADD CONSTRAINT "transacoes_processo_id_fkey" FOREIGN KEY ("processo_id") REFERENCES "processos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacoes" ADD CONSTRAINT "transacoes_contato_id_fkey" FOREIGN KEY ("contato_id") REFERENCES "contatos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacoes" ADD CONSTRAINT "transacoes_repasse_id_fkey" FOREIGN KEY ("repasse_id") REFERENCES "repasses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repasses" ADD CONSTRAINT "repasses_processo_id_fkey" FOREIGN KEY ("processo_id") REFERENCES "processos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

