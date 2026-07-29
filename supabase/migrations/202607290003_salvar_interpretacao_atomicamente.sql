-- Cria uma única operação para salvar confiança e lesões sem deixar trabalho pela metade.
begin;

create or replace function public.salvar_interpretacao_mapa(
  p_mapa_id uuid,
  p_confianca numeric,
  p_lesoes jsonb
)
returns table (
  mapa_id uuid,
  quantidade_lesoes integer
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  usuario_atual uuid := auth.uid();
  quantidade_recebida integer;
  quantidade_gravada integer;
begin
  if usuario_atual is null then
    raise exception 'Usuário não autenticado.' using errcode = '42501';
  end if;

  if p_confianca is null or p_confianca < 0 or p_confianca > 100 then
    raise exception 'A confiança precisa ficar entre 0 e 100.' using errcode = '23514';
  end if;

  if p_lesoes is null or jsonb_typeof(p_lesoes) <> 'array' then
    raise exception 'A lista de lesões não chegou em formato válido.' using errcode = '23514';
  end if;

  quantidade_recebida := jsonb_array_length(p_lesoes);
  if quantidade_recebida < 1 or quantidade_recebida > 30 then
    raise exception 'Informe de uma a trinta lesões.' using errcode = '23514';
  end if;

  -- Trava o mapa durante esta operação e confirma dono e estado.
  perform 1
  from public.mapas
  where id = p_mapa_id
    and user_id = usuario_atual
    and status = 'em revisão'
  for update;

  if not found then
    raise exception 'O mapa não pertence ao usuário ou já saiu da revisão.' using errcode = '42501';
  end if;

  update public.mapas
  set confianca = p_confianca
  where id = p_mapa_id
    and user_id = usuario_atual;

  -- Repetir a confirmação substitui o conjunto, em vez de criar duplicatas.
  delete from public.lesoes as lesao_existente
  where lesao_existente.mapa_id = p_mapa_id
    and lesao_existente.user_id = usuario_atual;

  insert into public.lesoes (
    user_id,
    mapa_id,
    categoria,
    localizacao,
    lado,
    medida_1,
    medida_2,
    medida_3,
    observacao,
    confianca
  )
  select
    usuario_atual,
    p_mapa_id,
    dados.categoria,
    dados.localizacao,
    coalesce(dados.lado, 'não informado'),
    dados.medida_1,
    dados.medida_2,
    dados.medida_3,
    dados.observacao,
    dados.confianca
  from jsonb_to_recordset(p_lesoes) as dados (
    categoria text,
    localizacao text,
    lado text,
    medida_1 numeric,
    medida_2 numeric,
    medida_3 numeric,
    observacao text,
    confianca numeric
  );

  get diagnostics quantidade_gravada = row_count;

  if quantidade_gravada <> quantidade_recebida then
    raise exception 'Nem todas as lesões foram gravadas.' using errcode = '23514';
  end if;

  return query select p_mapa_id, quantidade_gravada;
end;
$$;

revoke all on function public.salvar_interpretacao_mapa(uuid, numeric, jsonb) from public;
revoke all on function public.salvar_interpretacao_mapa(uuid, numeric, jsonb) from anon;
grant execute on function public.salvar_interpretacao_mapa(uuid, numeric, jsonb) to authenticated;

commit;
