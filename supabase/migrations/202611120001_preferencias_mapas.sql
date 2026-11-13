-- PREPARADO PARA REVISÃO. NÃO EXECUTADO. A prévia usa somente armazenamento local.
begin;
create table public.preferencias_mapas (
 user_id uuid primary key references auth.users(id) on delete cascade,
 cor_mapa text not null default 'colorido' check (cor_mapa in ('colorido','cinza')),
 transparencia_cinza integer not null default 0 check (transparencia_cinza between 0 and 100),
 logo_png text check (logo_png is null or (length(logo_png)<=700000 and logo_png ~ '^data:image/png;base64,iVBORw0KGgo[A-Za-z0-9+/=]+$')),
 atualizado_em timestamptz not null default now()
);
alter table public.preferencias_mapas enable row level security;
revoke all on public.preferencias_mapas from public, anon, authenticated;
grant select on public.preferencias_mapas to authenticated;
create policy ler_proprias_preferencias on public.preferencias_mapas for select to authenticated using (user_id=(select auth.uid()));

create function public.salvar_preferencias_mapas(p_assinatura text,p_cor_mapa text,p_logo_png text,p_transparencia_cinza integer default 0)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare usuario uuid := auth.uid(); nome_assinatura text := btrim(p_assinatura);
begin
 if p_transparencia_cinza is null or p_transparencia_cinza not between 0 and 100 then raise exception 'Transparência inválida'; end if;
 if usuario is null then raise exception 'Sessão necessária'; end if;
 if nome_assinatura is null or length(nome_assinatura) not between 1 and 100 or nome_assinatura ~ '[[:cntrl:]]' then raise exception 'Assinatura inválida'; end if;
 if p_cor_mapa is null or p_cor_mapa not in ('colorido','cinza') then raise exception 'Cor inválida'; end if;
 if p_logo_png is not null and (length(p_logo_png)>700000 or p_logo_png !~ '^data:image/png;base64,iVBORw0KGgo[A-Za-z0-9+/=]+$') then raise exception 'Logomarca inválida'; end if;
 update public.medicos set assinatura=nome_assinatura where user_id=usuario and ativo='sim';
 if not found then raise exception 'Perfil ativo necessário'; end if;
 insert into public.preferencias_mapas(user_id,cor_mapa,logo_png,transparencia_cinza) values(usuario,p_cor_mapa,p_logo_png,p_transparencia_cinza)
 on conflict(user_id) do update set cor_mapa=excluded.cor_mapa,logo_png=excluded.logo_png,transparencia_cinza=excluded.transparencia_cinza,atualizado_em=now();
 return jsonb_build_object('assinatura',nome_assinatura,'cor_mapa',p_cor_mapa,'logo_png',p_logo_png,'transparencia_cinza',p_transparencia_cinza);
end;
$$;
revoke all on function public.salvar_preferencias_mapas(text,text,text,integer) from public,anon;
grant execute on function public.salvar_preferencias_mapas(text,text,text,integer) to authenticated;
commit;
