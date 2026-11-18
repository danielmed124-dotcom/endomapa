begin;
-- Somente administradores gravam personalizações especiais; navegador lê a própria conta.
create table public.recursos_conta (
 user_id uuid primary key references auth.users(id) on delete cascade,
 pode_ocultar_anotacoes boolean not null default false,
 pode_exportar_divulgacao boolean not null default false,
 indicar_lados_mapas boolean not null default false,
 logo_semeare boolean not null default false,
 logo_granvitta boolean not null default false,
 logo_ana_paula boolean not null default false,
 unidade_medidas text not null default 'cm' check (unidade_medidas in ('cm','mm')),
 acrescimo_fonte_lesoes_pt integer not null default 0 check (acrescimo_fonte_lesoes_pt between 0 and 10),
 pode_ver_adesao boolean not null default false
);
alter table public.recursos_conta enable row level security;
revoke all on public.recursos_conta from public,anon,authenticated;
grant select on public.recursos_conta to authenticated;
create policy ler_recursos_proprios on public.recursos_conta for select to authenticated
 using (user_id=(select auth.uid()) and exists (select 1 from public.medicos m where m.user_id=(select auth.uid()) and m.ativo='sim'));

-- Assinatura continua sendo alterada por salvar_preferencias_mapas, no servidor.
-- A criação de perfil por gatilho também continua funcionando com o dono da função.
revoke all on public.medicos from public,anon,authenticated;
grant select on public.medicos to authenticated;
drop policy "Usuário acessa somente o próprio perfil médico" on public.medicos;
create policy ler_perfil_proprio on public.medicos for select to authenticated using (user_id=(select auth.uid()));

-- Fluxo antigo preservado com permissões de linhas; retirar privilégios administrativos.
revoke all on public.mapas,public.lesoes from public,anon,authenticated;
grant select,insert,update,delete on public.mapas,public.lesoes to authenticated;
revoke all on function public.criar_perfil_medico_apos_cadastro() from public,anon,authenticated;
revoke all on function public.validar_transicao_status_mapa() from public,anon,authenticated;
commit;
