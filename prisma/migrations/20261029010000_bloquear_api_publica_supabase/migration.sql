-- Liga o RLS (sem nenhuma policy) em todas as tabelas.
-- Efeito: a API pública do Supabase (chave anon/authenticated) não lê nem altera nada.
-- O app não é afetado: o Prisma conecta como "postgres", dono das tabelas, que ignora o RLS.
-- Toda tabela nova criada no futuro deve receber a mesma linha.
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "categorias" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contatos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "processos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "transacoes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "repasses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "push_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "recebimentos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "parcelas" ENABLE ROW LEVEL SECURITY;
