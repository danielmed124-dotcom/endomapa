-- PREPARADO; NÃO APLICADO. Somente novos salvamentos explícitos.
begin;
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
  -- A regra vale também para clientes antigos e chamadas diretas à API.
  -- Não modifica outros registros nem a captura do navegador.
  if p_montagem #> '{documento,cabecalho}' is not null then
    if jsonb_typeof(p_montagem #> '{documento,cabecalho,campos}') is distinct from 'array' then
      raise exception 'Cabeçalho inválido' using errcode = '22023';
    end if;
    if exists (
      select 1 from jsonb_array_elements(p_montagem #> '{documento,cabecalho,campos}') as c(campo)
      where jsonb_typeof(campo) is distinct from 'object'
         or jsonb_typeof(campo->'nome') is distinct from 'string'
    ) then raise exception 'Campo de cabeçalho inválido' using errcode = '22023'; end if;
    p_montagem := jsonb_set(p_montagem, '{documento,cabecalho,campos}', (
      select coalesce(jsonb_agg(campo || jsonb_build_object('valor', '') order by ordem), '[]'::jsonb)
      from jsonb_array_elements(p_montagem #> '{documento,cabecalho,campos}') with ordinality as c(campo,ordem)
    ));
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
