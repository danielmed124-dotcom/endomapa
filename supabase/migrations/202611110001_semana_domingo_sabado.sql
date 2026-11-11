begin;
-- Soma o histórico disponível aos novos registros, sem inventar eventos ausentes.
create or replace function public.resumo_adesao_exportacoes() returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  agora timestamptz:=statement_timestamp();
  local_agora timestamp:=agora at time zone 'America/Sao_Paulo';
  resumo jsonb;
begin
  if not exists(select 1 from auth.users u join public.medicos m on m.user_id=u.id
    where u.id=auth.uid() and lower(u.email)='danielmed124@gmail.com' and m.ativo='sim')
  then raise exception 'Acesso não autorizado' using errcode='42501'; end if;
  with registros as (
    select e.user_id,e.preparado_em as data, e.acionado_em is null as pendente, false as antigo
      from public.exportacoes_arquivos e
    union all
    select p.user_id,p.criado_em, false, true from public.pdfs_manuais p
      where not exists(select 1 from public.exportacoes_arquivos e where e.id=p.id)
  ), totais as (
    select coalesce(u.email,r.user_id::text) as usuario,count(*) as quantidade
    from registros r join auth.users u on u.id=r.user_id
    where r.data<=agora group by r.user_id,u.email
  )
  select jsonb_build_object(
    'hoje',count(*) filter(where data >= (date_trunc('day',local_agora) at time zone 'America/Sao_Paulo')),
    'semana',count(*) filter(where data >= ((date_trunc('day',local_agora) - extract(dow from local_agora)::int * interval '1 day') at time zone 'America/Sao_Paulo')),
    'mes',count(*) filter(where data >= (date_trunc('month',local_agora) at time zone 'America/Sao_Paulo')),
    'total',count(*),
    'sem_confirmacao',count(*) filter(where pendente),
    'inicio',min(data),
    'atualizado_em',agora,
    'pdfs_antigos_incompletos',count(*) filter(where antigo),
    'ranking',(select coalesce(jsonb_agg(to_jsonb(t) order by t.quantidade desc,t.usuario),'[]'::jsonb) from totais t)
  ) into resumo from registros where data<=agora;
  return resumo;
end $$;
revoke all on function public.resumo_adesao_exportacoes() from public,anon;
grant execute on function public.resumo_adesao_exportacoes() to authenticated;
commit;
