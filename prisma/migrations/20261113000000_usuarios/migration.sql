-- CreateEnum
CREATE TYPE "Perfil" AS ENUM ('DONO', 'FINANCEIRO', 'SECRETARIA', 'ADVOGADO');

-- Aparelhos antigos (sem dono) saem: o ambiente de teste não tem uso real.
DELETE FROM "push_subscriptions";

-- AlterTable
ALTER TABLE "push_subscriptions" ADD COLUMN     "usuario_id" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "perfil" "Perfil" NOT NULL,
    "advogado_chave" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "versao_sessao" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "push_subscriptions_usuario_id_idx" ON "push_subscriptions"("usuario_id");

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Bloqueia a API pública do Supabase nesta tabela (o app acessa pelo servidor).
ALTER TABLE "usuarios" ENABLE ROW LEVEL SECURITY;
