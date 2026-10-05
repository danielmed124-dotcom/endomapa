begin;

create table public.mapas_manuais (
  id uuid primary key,
  user_id uuid not null references auth.users(id),
  titulo text not null check (length(trim(titulo)) between 1 and 100),
  montagem jsonb not null check (jsonb_typeof(montagem) = 'object' and octet_length(montagem::text) <= 4000000),
  versao bigint not null default 1,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index mapas_manuais_usuario_data on public.mapas_manuais(user_id, atualizado_em desc);
alter table public.mapas_manuais enable row level security;
create policy "Ler montagens próprias" on public.mapas_manuais for select to authenticated using (user_id = auth.uid());
revoke all on public.mapas_manuais from anon, authenticated;
grant select on public.mapas_manuais to authenticated;

create table public.pdfs_manuais (
  id uuid primary key,
  mapa_id uuid not null references public.mapas_manuais(id),
  user_id uuid not null references auth.users(id),
  criado_em timestamptz not null default now()
);
create index pdfs_manuais_usuario_data on public.pdfs_manuais(user_id, criado_em);
alter table public.pdfs_manuais enable row level security;
create policy "Ler PDFs próprios" on public.pdfs_manuais for select to authenticated using (user_id = auth.uid());
revoke all on public.pdfs_manuais from anon, authenticated;
grant select on public.pdfs_manuais to authenticated;

-- Gravação atômica, dono derivado da sessão e controle de edição concorrente.
create function public.salvar_mapa_manual(p_id uuid, p_titulo text, p_montagem jsonb, p_versao bigint, p_pdf_id uuid default null)
returns public.mapas_manuais language plpgsql security definer set search_path = '' as $$
declare
  dono uuid := auth.uid();
  salvo public.mapas_manuais;
begin
  if dono is null or not exists (select 1 from public.medicos where user_id = dono and ativo = 'sim') then
    raise exception 'Acesso não autorizado' using errcode = '42501';
  end if;
  if p_montagem->>'versao' is distinct from '1' or jsonb_typeof(p_montagem->'vistas') is distinct from 'object' then
    raise exception 'Montagem inválida' using errcode = '22023';
  end if;
  -- Mesma chamada pode ser repetida após perda da resposta, sem duplicar mapa/PDF.
  select * into salvo from public.mapas_manuais where id = p_id for update;
  if found then
    if salvo.user_id <> dono then raise exception 'Acesso não autorizado' using errcode = '42501'; end if;
    if salvo.versao <> p_versao or p_versao is null then
      if salvo.titulo = p_titulo and salvo.montagem = p_montagem and
        (p_pdf_id is null or exists(select 1 from public.pdfs_manuais where id = p_pdf_id and mapa_id = p_id and user_id = dono)) then
        return salvo;
      end if;
      raise exception 'Este mapa foi alterado em outra aba. Reabra a versão salva antes de continuar.' using errcode = '40001';
    end if;
    update public.mapas_manuais set titulo = p_titulo, montagem = p_montagem, versao = versao + 1, atualizado_em = now()
      where id = p_id returning * into salvo;
  else
    if p_versao <> 0 or p_versao is null then raise exception 'Mapa não encontrado' using errcode = '40001'; end if;
    insert into public.mapas_manuais(id,user_id,titulo,montagem) values(p_id,dono,p_titulo,p_montagem) returning * into salvo;
  end if;
  if p_pdf_id is not null then
    if exists(select 1 from public.pdfs_manuais where id = p_pdf_id and (user_id <> dono or mapa_id <> p_id)) then
      raise exception 'Registro de PDF inválido' using errcode = '42501';
    end if;
    insert into public.pdfs_manuais(id,mapa_id,user_id) values(p_pdf_id,p_id,dono) on conflict(id) do nothing;
  end if;
  return salvo;
end $$;
revoke all on function public.salvar_mapa_manual(uuid,text,jsonb,bigint,uuid) from public, anon;
grant execute on function public.salvar_mapa_manual(uuid,text,jsonb,bigint,uuid) to authenticated;
commit;
