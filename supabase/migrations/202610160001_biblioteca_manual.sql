begin;
alter table public.mapas_manuais add column ordem bigint not null default 0;
with posicoes as (
 select id,row_number() over(partition by user_id order by atualizado_em desc,id) as ordem from public.mapas_manuais
) update public.mapas_manuais m set ordem=p.ordem from posicoes p where p.id=m.id;
create index mapas_manuais_usuario_ordem on public.mapas_manuais(user_id,ordem,criado_em desc,id);
alter table public.pdfs_manuais alter column mapa_id drop not null;
alter table public.pdfs_manuais drop constraint pdfs_manuais_mapa_id_fkey;
alter table public.pdfs_manuais add constraint pdfs_manuais_mapa_id_fkey foreign key(mapa_id) references public.mapas_manuais(id) on delete set null;

-- O contador guarda somente um evento, sem salvar montagem ou dados do laudo.
create function public.registrar_pdf_manual(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare dono uuid:=auth.uid();
begin
 if dono is null or not exists(select 1 from public.medicos where user_id=dono and ativo='sim') then raise exception 'Acesso não autorizado' using errcode='42501'; end if;
 if exists(select 1 from public.pdfs_manuais where id=p_id and user_id<>dono) then raise exception 'Acesso não autorizado' using errcode='42501'; end if;
 insert into public.pdfs_manuais(id,user_id) values(p_id,dono) on conflict(id) do nothing;
end $$;

create function public.reordenar_mapa_manual(p_id uuid,p_destino uuid,p_depois boolean) returns void
language plpgsql security definer set search_path='' as $$
declare dono uuid:=auth.uid(); destino bigint;
begin
 if dono is null or not exists(select 1 from public.medicos where user_id=dono and ativo='sim') then raise exception 'Acesso não autorizado' using errcode='42501'; end if;
 if p_depois is null or p_id=p_destino then raise exception 'Destino inválido' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended(dono::text,0));
 if (select count(*) from public.mapas_manuais where id in(p_id,p_destino) and user_id=dono)<>2 then raise exception 'Mapa não encontrado' using errcode='42501'; end if;
 with posicoes as (select id,row_number() over(order by ordem,criado_em desc,id) as n from public.mapas_manuais where user_id=dono)
 update public.mapas_manuais m set ordem=p.n*2 from posicoes p where m.id=p.id;
 select ordem into destino from public.mapas_manuais where id=p_destino and user_id=dono;
 update public.mapas_manuais set ordem=destino+case when p_depois then 1 else -1 end where id=p_id and user_id=dono;
end $$;

create function public.excluir_mapa_manual(p_id uuid,p_versao bigint) returns void
language plpgsql security definer set search_path='' as $$
declare dono uuid:=auth.uid(); atual bigint;
begin
 if dono is null or not exists(select 1 from public.medicos where user_id=dono and ativo='sim') then raise exception 'Acesso não autorizado' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(dono::text,0));
 select versao into atual from public.mapas_manuais where id=p_id and user_id=dono for update;
 if not found then raise exception 'Mapa não encontrado' using errcode='42501'; end if;
 if atual is distinct from p_versao then raise exception 'O mapa foi atualizado. Recarregue a biblioteca antes de excluir.' using errcode='40001'; end if;
 delete from public.mapas_manuais where id=p_id and user_id=dono;
end $$;
revoke all on function public.registrar_pdf_manual(uuid),public.reordenar_mapa_manual(uuid,uuid,boolean),public.excluir_mapa_manual(uuid,bigint) from public,anon;
grant execute on function public.registrar_pdf_manual(uuid),public.reordenar_mapa_manual(uuid,uuid,boolean),public.excluir_mapa_manual(uuid,bigint) to authenticated;
create or replace function public.salvar_mapa_manual(p_id uuid, p_titulo text, p_montagem jsonb, p_versao bigint, p_pdf_id uuid default null)
returns public.mapas_manuais language plpgsql security definer set search_path = '' as $$
declare
  dono uuid := auth.uid();
  salvo public.mapas_manuais;
begin
  if dono is null or not exists (select 1 from public.medicos where user_id = dono and ativo = 'sim') then
    raise exception 'Acesso não autorizado' using errcode = '42501';
  end if;
  if p_pdf_id is not null then raise exception 'Atualize a página para baixar o PDF sem salvar na biblioteca.' using errcode = '22023'; end if;
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

commit;
