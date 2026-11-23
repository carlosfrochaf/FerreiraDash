-- CreateTable
CREATE TABLE "contratos_assinados" (
    "id" TEXT NOT NULL,
    "doc_token" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "cliente_nome" TEXT NOT NULL,
    "cliente_cpf" TEXT,
    "cliente_telefone" TEXT,
    "cliente_email" TEXT,
    "contato_id" TEXT,
    "arquivos" JSONB NOT NULL,
    "assinado_em" TIMESTAMP(3) NOT NULL,
    "visto_em" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contratos_assinados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integracoes" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "conectado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integracoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contratos_assinados_doc_token_key" ON "contratos_assinados"("doc_token");

-- CreateIndex
CREATE INDEX "contratos_assinados_assinado_em_idx" ON "contratos_assinados"("assinado_em");

-- AddForeignKey
ALTER TABLE "contratos_assinados" ADD CONSTRAINT "contratos_assinados_contato_id_fkey" FOREIGN KEY ("contato_id") REFERENCES "contatos"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Mesmo padrão das outras tabelas: acesso só pelo servidor.
ALTER TABLE "contratos_assinados" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "integracoes" ENABLE ROW LEVEL SECURITY;
