-- Agendamento dos avisos das 8h e das 19h (Brasília), direto no Supabase.
-- O disparo das 8h também lança as despesas recorrentes do mês (custos fixos e salários).
-- Substitui o agendamento do GitHub Actions, que atrasava horas ou pulava.
-- Fica fora das migrations do Prisma porque o banco local não tem pg_cron.
-- Os horários do pg_cron são em UTC (Brasília = UTC-3, sem horário de verão).
--
-- Pré-requisito (uma vez, no SQL Editor do Supabase), com o mesmo valor do CRON_SECRET do Render:
--   select vault.create_secret('<CRON_SECRET>', 'cron_secret');

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Chama o disparador do app. turno: 'manha', 'noite' ou 'teste'.
create or replace function public.disparar_notificacoes(turno text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  segredo text;
begin
  select decrypted_secret into segredo from vault.decrypted_secrets where name = 'cron_secret';
  if segredo is null then
    raise exception 'Falta o segredo cron_secret no Vault do Supabase.';
  end if;
  return net.http_post(
    url := 'https://ferreiradash.onrender.com/api/push/send-notifications?turno=' || turno,
    headers := jsonb_build_object('Authorization', 'Bearer ' || segredo),
    timeout_milliseconds := 120000
  );
end;
$$;

revoke all on function public.disparar_notificacoes(text) from public, anon, authenticated;

-- O plano gratuito do Render "dorme": acorda o servidor 5 e 2 minutos antes de cada aviso.
select cron.schedule('notif-acordar-manha', '55,58 10 * * *',
  $$select net.http_get('https://ferreiradash.onrender.com/login', timeout_milliseconds := 90000)$$);
select cron.schedule('notif-manha', '0 11 * * *', $$select public.disparar_notificacoes('manha')$$);

select cron.schedule('notif-acordar-noite', '55,58 21 * * *',
  $$select net.http_get('https://ferreiradash.onrender.com/login', timeout_milliseconds := 90000)$$);
select cron.schedule('notif-noite', '0 22 * * *', $$select public.disparar_notificacoes('noite')$$);

-- Conferir:
--   select jobname, schedule, active from cron.job;
--   select status, return_message, start_time from cron.job_run_details order by start_time desc limit 10;
--   select status_code, content, created from net._http_response order by created desc limit 10;
