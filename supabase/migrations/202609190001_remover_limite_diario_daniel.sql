begin;

-- Continua registrando as tentativas, sem teto numérico na tabela.
-- A função abaixo mantém o limite normal para as demais contas.
alter table public.uso_imagem_diario
  drop constraint uso_imagem_diario_chamadas_check,
  add constraint uso_imagem_diario_chamadas_check check (chamadas >= 0);

create or replace function public.reservar_geracao_imagem()
returns table (
  permitido boolean,
  total_chamadas integer,
  limite_diario integer,
  motivo text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  usuario_atual uuid := auth.uid();
  dia_atual date := (timezone('America/Sao_Paulo', now()))::date;
  quantidade_atual integer;
  limite_atual integer;
  sem_limite boolean;
begin
  if usuario_atual is null then
    raise exception 'Usuário não autenticado.' using errcode = '42501';
  end if;

  select
    case when autorizacao.limite_especial_ate >= dia_atual
      then autorizacao.limite_diario else 5 end,
    pg_catalog.lower(usuario.email) = 'danielmed124@gmail.com'
  into limite_atual, sem_limite
  from public.usuarios_imagem_autorizados as autorizacao
  join auth.users as usuario on usuario.id = autorizacao.user_id
  where autorizacao.user_id = usuario_atual
    and autorizacao.ativo = true;

  if limite_atual is null then
    return query select false, 0, 5, 'conta_nao_autorizada'::text;
    return;
  end if;

  insert into public.uso_imagem_diario (user_id, dia, chamadas)
  values (usuario_atual, dia_atual, 1)
  on conflict (user_id, dia)
  do update
    set chamadas = public.uso_imagem_diario.chamadas + 1,
        atualizado_em = now()
    where sem_limite or public.uso_imagem_diario.chamadas < limite_atual
  returning public.uso_imagem_diario.chamadas into quantidade_atual;

  if quantidade_atual is null then
    select uso.chamadas into quantidade_atual
    from public.uso_imagem_diario as uso
    where uso.user_id = usuario_atual and uso.dia = dia_atual;

    return query select false, coalesce(quantidade_atual, limite_atual),
      limite_atual, 'limite_atingido'::text;
    return;
  end if;

  return query select true, quantidade_atual,
    case when sem_limite then null::integer else limite_atual end,
    'permitido'::text;
end;
$$;

revoke all on function public.reservar_geracao_imagem() from public;
revoke all on function public.reservar_geracao_imagem() from anon;
grant execute on function public.reservar_geracao_imagem() to authenticated;

commit;
