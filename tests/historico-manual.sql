-- Executar em transação e encerrar com ROLLBACK. Não deixa mapas de teste.
select set_config('teste.dono1', (select user_id::text from public.medicos where ativo = 'sim' order by user_id limit 1), true);
select set_config('teste.dono2', (select user_id::text from public.medicos where ativo = 'sim' order by user_id offset 1 limit 1), true);
select set_config('teste.mapa', gen_random_uuid()::text, true);
select set_config('teste.pdf', gen_random_uuid()::text, true);
select set_config('request.jwt.claim.sub', current_setting('teste.dono1'), true);
set local role authenticated;
do $$
declare r public.mapas_manuais; negado boolean := false;
begin
  select * into r from public.salvar_mapa_manual(current_setting('teste.mapa')::uuid,'Teste transacional','{"versao":1,"vistas":{}}',0);
  if r.user_id::text <> current_setting('teste.dono1') or r.versao <> 1 then raise exception 'Dono ou versão incorreto'; end if;
  select * into r from public.salvar_mapa_manual(r.id,'Teste transacional','{"versao":1,"vistas":{}}',0);
  if r.versao <> 1 then raise exception 'Repetição criou nova versão'; end if;
  select * into r from public.salvar_mapa_manual(r.id,'Atualizado','{"versao":1,"vistas":{}}',1,current_setting('teste.pdf')::uuid);
  if r.versao <> 2 then raise exception 'Atualização falhou'; end if;
  perform public.salvar_mapa_manual(r.id,'Atualizado','{"versao":1,"vistas":{}}',1,current_setting('teste.pdf')::uuid);
  if (select count(*) from public.pdfs_manuais where mapa_id=r.id) <> 1 then raise exception 'PDF duplicado'; end if;
  begin perform public.salvar_mapa_manual(r.id,'Conflito','{"versao":1,"vistas":{}}',1); exception when serialization_failure then negado:=true; end;
  if not negado then raise exception 'Conflito não bloqueado'; end if;
  negado:=false;
  begin update public.mapas_manuais set titulo='Gravação direta' where id=r.id; exception when insufficient_privilege then negado:=true; end;
  if not negado then raise exception 'Escrita direta permitida'; end if;
  negado:=false;
  begin perform public.salvar_mapa_manual(gen_random_uuid(),'Inválido','{}',0); exception when invalid_parameter_value then negado:=true; end;
  if not negado then raise exception 'Formato inválido aceito'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('teste.dono2'),true);
set local role authenticated;
do $$
declare negado boolean := false;
begin
  if current_setting('teste.dono2') = '' then raise exception 'Necessários dois perfis para validar isolamento'; end if;
  if exists(select 1 from public.mapas_manuais where id=current_setting('teste.mapa')::uuid) then raise exception 'Outro usuário leu mapa'; end if;
  if exists(select 1 from public.pdfs_manuais where mapa_id=current_setting('teste.mapa')::uuid) then raise exception 'Outro usuário leu PDF'; end if;
  begin perform public.salvar_mapa_manual(current_setting('teste.mapa')::uuid,'Invasão','{"versao":1,"vistas":{}}',2); exception when insufficient_privilege then negado:=true; end;
  if not negado then raise exception 'Outro usuário alterou mapa'; end if;
end $$;
reset role;
set local role anon;
do $$
declare negado boolean := false;
begin
  begin perform public.salvar_mapa_manual(gen_random_uuid(),'Anônimo','{"versao":1,"vistas":{}}',0); exception when insufficient_privilege then negado:=true; end;
  if not negado then raise exception 'Anônimo gravou mapa'; end if;
end $$;
reset role;
