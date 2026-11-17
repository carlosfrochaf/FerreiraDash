-- CreateEnum
CREATE TYPE "TipoIntimacao" AS ENUM ('SENTENCA', 'ACORDAO', 'DECISAO', 'DESPACHO', 'AUDIENCIA', 'OUTRA');

-- CreateTable
CREATE TABLE "oabs_acompanhadas" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oabs_acompanhadas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intimacoes" (
    "id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "comunicacao_id" TEXT NOT NULL,
    "numero_processo" TEXT NOT NULL,
    "processo_mascara" TEXT,
    "data" DATE NOT NULL,
    "tipo" "TipoIntimacao" NOT NULL,
    "tribunal" TEXT,
    "orgao" TEXT,
    "classe" TEXT,
    "tipo_documento" TEXT,
    "texto" TEXT NOT NULL,
    "link" TEXT,
    "cliente_id" TEXT,
    "recebimento_id" TEXT,
    "lida_em" TIMESTAMP(3),
    "lida_por_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intimacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "oabs_acompanhadas_numero_uf_key" ON "oabs_acompanhadas"("numero", "uf");

-- CreateIndex
CREATE UNIQUE INDEX "intimacoes_chave_key" ON "intimacoes"("chave");

-- CreateIndex
CREATE INDEX "intimacoes_data_idx" ON "intimacoes"("data");

-- CreateIndex
CREATE INDEX "intimacoes_cliente_id_idx" ON "intimacoes"("cliente_id");

-- CreateIndex
CREATE INDEX "intimacoes_numero_processo_idx" ON "intimacoes"("numero_processo");

-- AddForeignKey
ALTER TABLE "intimacoes" ADD CONSTRAINT "intimacoes_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intimacoes" ADD CONSTRAINT "intimacoes_recebimento_id_fkey" FOREIGN KEY ("recebimento_id") REFERENCES "recebimentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Mesmo padrão das outras tabelas: acesso só pelo servidor.
ALTER TABLE "oabs_acompanhadas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "intimacoes" ENABLE ROW LEVEL SECURITY;
