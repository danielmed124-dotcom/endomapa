-- Executar depois da migração na mesma transação, com ROLLBACK ao final.
do $$
begin
 perform set_config('teste.dono1',(select user_id::text from public.medicos where ativo='sim' order by user_id limit 1),true);
 perform set_config('teste.dono2',(select user_id::text from public.medicos where ativo='sim' order by user_id offset 1 limit 1),true);
 perform set_config('teste.mapa1',gen_random_uuid()::text,true);
 perform set_config('teste.mapa2',gen_random_uuid()::text,true);
 perform set_config('teste.pdf',gen_random_uuid()::text,true);
 perform set_config('request.jwt.claim.sub',current_setting('teste.dono1'),true);
end $$;
set local role authenticated;
do $$
declare a public.mapas_manuais; b public.mapas_manuais; antes bigint; negado boolean:=false;
begin
 select count(*) into antes from public.mapas_manuais;
 perform public.registrar_pdf_manual(current_setting('teste.pdf')::uuid);
 perform public.registrar_pdf_manual(current_setting('teste.pdf')::uuid);
 if (select count(*) from public.mapas_manuais)<>antes then raise exception 'PDF salvou mapa'; end if;
 if (select count(*) from public.pdfs_manuais where id=current_setting('teste.pdf')::uuid)<>1 then raise exception 'PDF duplicado'; end if;
 select * into a from public.salvar_mapa_manual(current_setting('teste.mapa1')::uuid,'Teste A','{"versao":1,"vistas":{}}',0);
 select * into b from public.salvar_mapa_manual(current_setting('teste.mapa2')::uuid,'Teste B','{"versao":1,"vistas":{}}',0);
 perform public.reordenar_mapa_manual(a.id,b.id,true);
 if (select ordem from public.mapas_manuais where id=a.id)<=(select ordem from public.mapas_manuais where id=b.id) then raise exception 'Arraste para depois falhou'; end if;
 perform public.reordenar_mapa_manual(a.id,b.id,false);
 if (select ordem from public.mapas_manuais where id=a.id)>=(select ordem from public.mapas_manuais where id=b.id) then raise exception 'Arraste para antes falhou'; end if;
 begin perform public.salvar_mapa_manual(a.id,'Automatico','{"versao":1,"vistas":{}}',1,gen_random_uuid()); exception when invalid_parameter_value then negado:=true; end;
 if not negado then raise exception 'Salvamento automatico antigo permitido'; end if;
 negado:=false;
 begin perform public.excluir_mapa_manual(b.id,0); exception when serialization_failure then negado:=true; end;
 if not negado then raise exception 'Exclusao de versao desatualizada permitida'; end if;
 perform public.excluir_mapa_manual(b.id,1);
 if exists(select 1 from public.mapas_manuais where id=b.id) then raise exception 'Exclusao falhou'; end if;
end $$;
reset role;
do $$ begin perform set_config('request.jwt.claim.sub',current_setting('teste.dono2'),true);end $$;
set local role authenticated;
do $$
declare negado boolean:=false;
begin
 if exists(select 1 from public.mapas_manuais where id=current_setting('teste.mapa1')::uuid) then raise exception 'Leitura cruzada permitida'; end if;
 begin perform public.excluir_mapa_manual(current_setting('teste.mapa1')::uuid,1); exception when insufficient_privilege then negado:=true; end;
 if not negado then raise exception 'Exclusao cruzada permitida'; end if;
 negado:=false;
 begin perform public.reordenar_mapa_manual(current_setting('teste.mapa1')::uuid,gen_random_uuid(),true); exception when insufficient_privilege then negado:=true; end;
 if not negado then raise exception 'Reordenacao cruzada permitida'; end if;
end $$;
reset role;
set local role anon;
do $$ declare negado boolean:=false; begin
 begin perform public.registrar_pdf_manual(gen_random_uuid()); exception when insufficient_privilege then negado:=true; end;
 if not negado then raise exception 'Anonimo registrou PDF'; end if;
end $$;
reset role;
rollback;
select 'PASSOU: PDF sem salvar mapas, idempotência, arraste, exclusão e isolamento; transação revertida' as resultado;
