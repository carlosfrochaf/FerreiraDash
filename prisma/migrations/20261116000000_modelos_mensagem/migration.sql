-- CreateEnum
CREATE TYPE "MomentoMensagem" AS ENUM ('ANTES_CONTRATO', 'DEPOIS_CONTRATO', 'AUDIENCIA', 'SEMPRE');

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


-- Bloqueia a API pública do Supabase nesta tabela (o app acessa pelo servidor).
ALTER TABLE "modelos_mensagem" ENABLE ROW LEVEL SECURITY;
