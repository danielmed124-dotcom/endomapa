-- Executar em banco de teste com a migração aplicada e duas contas ativas.
-- Nenhum evento deste teste permanece após ROLLBACK.
begin;
do $$ begin
 perform set_config('teste.dono1',(select user_id::text from public.medicos where ativo='sim' order by user_id limit 1),true);
 perform set_config('teste.dono2',(select user_id::text from public.medicos where ativo='sim' order by user_id offset 1 limit 1),true);
 if nullif(current_setting('teste.dono2'),'') is null then raise exception 'São necessárias duas contas de teste'; end if;
 perform set_config('teste.exportacao',gen_random_uuid()::text,true);
 perform set_config('request.jwt.claim.sub',current_setting('teste.dono1'),true);
end $$;
set local role authenticated;
do $$
declare evento uuid:=current_setting('teste.exportacao')::uuid; negado boolean; horario timestamptz;
begin
 perform public.registrar_exportacao_arquivo(evento,'pdf','mapa','preparado');
 perform public.registrar_exportacao_arquivo(evento,'pdf','mapa','preparado');
 if (select count(*) from public.exportacoes_arquivos where id=evento)<>1 then raise exception 'Preparação duplicada'; end if;
 if exists(select 1 from public.exportacoes_arquivos where id=evento and acionado_em is not null) then raise exception 'Preparação contada como download acionado'; end if;
 perform public.registrar_exportacao_arquivo(evento,'pdf','mapa','acionado');
 select acionado_em into horario from public.exportacoes_arquivos where id=evento;
 perform public.registrar_exportacao_arquivo(evento,'pdf','mapa','acionado');
 if (select acionado_em from public.exportacoes_arquivos where id=evento) is distinct from horario then raise exception 'Reenvio alterou horário'; end if;
 negado:=false;
 begin perform public.registrar_exportacao_arquivo(evento,'png','mapa','preparado'); exception when invalid_parameter_value then negado:=true; end;
 if not negado then raise exception 'Identificador aceitou outro formato'; end if;
 negado:=false;
 begin perform public.registrar_exportacao_arquivo(gen_random_uuid(),'pdf','mapa','acionado'); exception when invalid_parameter_value then negado:=true; end;
 if not negado then raise exception 'Acionamento sem preparação'; end if;
 negado:=false;
 begin perform public.registrar_exportacao_arquivo(gen_random_uuid(),'exe','mapa','preparado'); exception when invalid_parameter_value then negado:=true; end;
 if not negado then raise exception 'Formato inválido aceito'; end if;
 negado:=false;
 begin delete from public.exportacoes_arquivos where id=evento; exception when insufficient_privilege then negado:=true; end;
 if not negado then raise exception 'Usuário apagou contador'; end if;
end $$;
reset role;
do $$ begin perform set_config('request.jwt.claim.sub',current_setting('teste.dono2'),true); end $$;
set local role authenticated;
do $$ declare negado boolean:=false; begin
 if exists(select 1 from public.exportacoes_arquivos where id=current_setting('teste.exportacao')::uuid) then raise exception 'Leitura de outra conta'; end if;
 begin perform public.registrar_exportacao_arquivo(current_setting('teste.exportacao')::uuid,'pdf','mapa','preparado'); exception when insufficient_privilege then negado:=true; end;
 if not negado then raise exception 'Contagem atribuída a outra conta'; end if;
end $$;
reset role;
set local role anon;
do $$ declare negado boolean:=false; begin
 begin perform public.registrar_exportacao_arquivo(gen_random_uuid(),'pdf','mapa','preparado'); exception when insufficient_privilege then negado:=true; end;
 if not negado then raise exception 'Contagem anônima aceita'; end if;
end $$;
reset role;
rollback;
select 'PASSOU: etapas, reenvio sem duplicação, formato e isolamento entre usuários' as resultado;
