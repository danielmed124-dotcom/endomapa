begin;

-- Metadados de exportação; nunca guarda paciente, montagem ou arquivo.
-- "acionado" significa chamada de download concluída no navegador, não arquivo salvo.
create table public.exportacoes_arquivos (
  id uuid primary key,
  user_id uuid not null references auth.users(id),
  formato text not null check (formato in ('pdf', 'png', 'jpeg')),
  ferramenta text not null check (ferramenta in ('mapa', 'fusao')),
  preparado_em timestamptz not null default now(),
  acionado_em timestamptz,
  constraint exportacao_ordem check (acionado_em is null or acionado_em >= preparado_em)
);
create index exportacoes_usuario_data on public.exportacoes_arquivos(user_id, preparado_em);
create index exportacoes_data on public.exportacoes_arquivos(preparado_em);
alter table public.exportacoes_arquivos enable row level security;
create policy "Ler exportações próprias" on public.exportacoes_arquivos
  for select to authenticated using (user_id = auth.uid());
revoke all on public.exportacoes_arquivos from anon, authenticated;
grant select on public.exportacoes_arquivos to authenticated;

create function public.registrar_exportacao_arquivo(
  p_id uuid, p_formato text, p_ferramenta text, p_etapa text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  dono uuid := auth.uid();
  registro public.exportacoes_arquivos;
begin
  if dono is null or not exists (
    select 1 from public.medicos where user_id = dono and ativo = 'sim'
  ) then raise exception 'Acesso não autorizado' using errcode = '42501'; end if;
  if p_id is null or p_formato is null or p_formato not in ('pdf','png','jpeg')
    or p_ferramenta is null or p_ferramenta not in ('mapa','fusao')
    or p_etapa is null or p_etapa not in ('preparado','acionado')
  then raise exception 'Exportação inválida' using errcode = '22023'; end if;

  if p_etapa = 'preparado' then
    insert into public.exportacoes_arquivos(id,user_id,formato,ferramenta)
      values(p_id,dono,p_formato,p_ferramenta) on conflict(id) do nothing;
  end if;
  select * into registro from public.exportacoes_arquivos where id=p_id for update;
  if not found then raise exception 'Exportação não preparada' using errcode='22023'; end if;
  if registro.user_id <> dono then raise exception 'Acesso não autorizado' using errcode='42501'; end if;
  if registro.formato <> p_formato or registro.ferramenta <> p_ferramenta then
    raise exception 'Identificador já usado em outra exportação' using errcode='22023';
  end if;
  if p_etapa='acionado' and registro.acionado_em is null then
    update public.exportacoes_arquivos set acionado_em=clock_timestamp() where id=p_id;
  end if;
  return p_id;
end $$;
revoke all on function public.registrar_exportacao_arquivo(uuid,text,text,text) from public, anon;
grant execute on function public.registrar_exportacao_arquivo(uuid,text,text,text) to authenticated;

-- Totais globais somente para Daniel; a autorização é verificada no servidor.
create function public.resumo_adesao_exportacoes() returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  agora timestamptz:=statement_timestamp();
  local_agora timestamp:=agora at time zone 'America/Sao_Paulo';
  resumo jsonb;
begin
  if not exists(select 1 from auth.users u join public.medicos m on m.user_id=u.id
    where u.id=auth.uid() and lower(u.email)='danielmed124@gmail.com' and m.ativo='sim')
  then raise exception 'Acesso não autorizado' using errcode='42501'; end if;
  select jsonb_build_object(
    'hoje',count(*) filter(where preparado_em >= (date_trunc('day',local_agora) at time zone 'America/Sao_Paulo')),
    'semana',count(*) filter(where preparado_em >= (date_trunc('week',local_agora) at time zone 'America/Sao_Paulo')),
    'mes',count(*) filter(where preparado_em >= (date_trunc('month',local_agora) at time zone 'America/Sao_Paulo')),
    'total',count(*),
    'sem_confirmacao',count(*) filter(where acionado_em is null),
    'inicio',min(preparado_em),
    'atualizado_em',agora,
    'pdfs_antigos_incompletos',(select count(*) from public.pdfs_manuais)
  ) into resumo from public.exportacoes_arquivos where preparado_em<=agora;
  return resumo;
end $$;
revoke all on function public.resumo_adesao_exportacoes() from public,anon;
grant execute on function public.resumo_adesao_exportacoes() to authenticated;

commit;
