-- SOMENTE no projeto de TESTE (FerreiraDash-teste). Nunca rodar no banco do escritório.
-- Cria public.recarregar_dados_exemplo(): apaga os dados e põe exemplos inventados, com datas
-- a partir de hoje (Brasília), para os avisos das 8h/19h terem o que mostrar.
-- Mantém categorias e as inscrições de notificação dos celulares.
-- Uso: select public.recarregar_dados_exemplo();

create or replace function public.recarregar_dados_exemplo()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  d date := (now() at time zone 'America/Sao_Paulo')::date;
  r1 text := gen_random_uuid()::text;
  r2 text := gen_random_uuid()::text;
  r3 text := gen_random_uuid()::text;
  cat_custo text := (select id from categorias where slug = 'CUSTO_OPERACIONAL');
  cat_salario text := (select id from categorias where slug = 'SALARIO');
  rec_aluguel text := gen_random_uuid()::text;
  rec_salario text := gen_random_uuid()::text;
begin
  delete from transacoes;
  delete from despesas_recorrentes;
  delete from parcelas;
  delete from recebimentos;
  delete from audiencias;
  delete from peticoes;
  delete from advogados;

  insert into advogados (id, nome, chave, pix, updated_at) values
    (gen_random_uuid()::text, 'Dra. Exemplo', 'dra. exemplo', 'dra.exemplo@example.com', now()),
    (gen_random_uuid()::text, 'Dr. Modelo', 'dr. modelo', 'dr.modelo@example.com', now());

  -- Causa 1: R$ 8.000 em 2x; 1ª vence HOJE.
  insert into recebimentos (id, processo_numero, cliente_nome, cliente_pix, reclamada, valor_total, percentual_escritorio,
    numero_parcelas, data_primeiro_vencimento, dia_vencimento, observacoes, updated_at)
  values (r1, '0000001-11.2026.5.03.0001', 'Mariana Teste Souza', 'mariana.teste@example.com', 'Construtora Exemplo Ltda',
    8000, 30, 2, d, extract(day from d), 'Dados de exemplo', now());
  insert into parcelas (id, recebimento_id, numero, vencimento, valor_parcela, valor_escritorio, valor_cliente, updated_at) values
    (gen_random_uuid()::text, r1, 1, d, 4000, 2000, 2000, now()),
    (gen_random_uuid()::text, r1, 2, d + 30, 4000, 400, 3600, now());

  -- Causa 2: R$ 10.000 em 5x; 1ª já recebida e pronta para repassar; 2ª vence AMANHÃ.
  insert into recebimentos (id, processo_numero, cliente_nome, cliente_pix, reclamada, valor_total, percentual_escritorio,
    numero_parcelas, data_primeiro_vencimento, dia_vencimento, observacoes, updated_at)
  values (r2, '0000002-22.2026.5.03.0002', 'João Fictício Lima', 'joao.ficticio@example.com', 'Transportes Modelo S.A.',
    10000, 30, 5, d - 30, extract(day from d - 30), 'Dados de exemplo', now());
  insert into parcelas (id, recebimento_id, numero, vencimento, valor_parcela, valor_escritorio, valor_cliente,
    status_recebimento, data_recebimento, updated_at) values
    (gen_random_uuid()::text, r2, 1, d - 30, 2000, 1000, 1000, 'RECEBIDO', d - 29, now()),
    (gen_random_uuid()::text, r2, 2, d + 1, 2000, 1000, 1000, 'PENDENTE', null, now()),
    (gen_random_uuid()::text, r2, 3, d + 31, 2000, 1000, 1000, 'PENDENTE', null, now()),
    (gen_random_uuid()::text, r2, 4, d + 61, 2000, 0, 2000, 'PENDENTE', null, now()),
    (gen_random_uuid()::text, r2, 5, d + 91, 2000, 0, 2000, 'PENDENTE', null, now());

  -- Causa 3: R$ 6.000 em 3x; 1ª ATRASADA (venceu há 10 dias).
  insert into recebimentos (id, processo_numero, cliente_nome, cliente_pix, reclamada, valor_total, percentual_escritorio,
    numero_parcelas, data_primeiro_vencimento, dia_vencimento, observacoes, updated_at)
  values (r3, '0000003-33.2026.5.03.0003', 'Ana Demo Pereira', null, 'Mercado Ilustrativo ME',
    6000, 30, 3, d - 10, extract(day from d - 10), 'Dados de exemplo', now());
  insert into parcelas (id, recebimento_id, numero, vencimento, valor_parcela, valor_escritorio, valor_cliente, updated_at) values
    (gen_random_uuid()::text, r3, 1, d - 10, 2000, 1000, 1000, now()),
    (gen_random_uuid()::text, r3, 2, d + 20, 2000, 800, 1200, now()),
    (gen_random_uuid()::text, r3, 3, d + 50, 2000, 0, 2000, now());

  -- Audiências: uma amanhã, uma já feita e não paga.
  insert into audiencias (id, data, hora, advogado_nome, cliente_nome, reclamada, valor, updated_at) values
    (gen_random_uuid()::text, d + 1, '10:00', 'Dra. Exemplo', 'Mariana Teste Souza', 'Construtora Exemplo Ltda', 150, now()),
    (gen_random_uuid()::text, d - 5, '14:30', 'Dr. Modelo', 'João Fictício Lima', 'Transportes Modelo S.A.', 200, now());

  -- Petições a pagar.
  insert into peticoes (id, advogado_nome, cliente_nome, reclamada, descricao, data_entrega, valor, updated_at) values
    (gen_random_uuid()::text, 'Dra. Exemplo', 'Ana Demo Pereira', 'Mercado Ilustrativo ME', 'Petição inicial', d - 3, 300, now()),
    (gen_random_uuid()::text, 'Dr. Modelo', 'Mariana Teste Souza', 'Construtora Exemplo Ltda', 'Manifestação', d - 1, 350, now());

  -- Despesas recorrentes do mês: aluguel (vence dia 10) e salário (mês de referência).
  insert into despesas_recorrentes (id, nome, valor, dia_vencimento, categoria_id, ultimo_mes, updated_at) values
    (rec_aluguel, 'Aluguel (exemplo)', 1500, 10, cat_custo, to_char(d, 'YYYY-MM'), now()),
    (rec_salario, 'Funcionário Teste', 2000, 1, cat_salario, to_char(d, 'YYYY-MM'), now());
  insert into transacoes (id, tipo, valor, data_competencia, status, descricao, categoria_id, recorrencia_id, updated_at) values
    (gen_random_uuid()::text, 'SAIDA', 1500, make_date(extract(year from d)::int, extract(month from d)::int, 10), 'PENDENTE',
      'Aluguel (exemplo)', cat_custo, rec_aluguel, now()),
    (gen_random_uuid()::text, 'SAIDA', 2000, date_trunc('month', d)::date, 'PENDENTE',
      'Funcionário Teste', cat_salario, rec_salario, now());

  return 'Dados de exemplo recarregados para ' || to_char(d, 'DD/MM/YYYY');
end;
$$;

revoke all on function public.recarregar_dados_exemplo() from public, anon, authenticated;
