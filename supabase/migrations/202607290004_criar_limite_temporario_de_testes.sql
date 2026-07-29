-- Cria um limite temporário maior somente para a conta usada na validação clínica.
-- Em 6 de agosto de 2026, a função volta automaticamente ao limite normal de 5.
begin;

-- Permite configurar um limite especial e a data em que ele deixa de valer.
-- Contas comuns continuam nascendo com o limite normal de 5 imagens por dia.
alter table public.usuarios_imagem_autorizados
  add column limite_diario integer not null default 5
    check (limite_diario between 1 and 100),
  add column limite_especial_ate date;

-- O contador precisa aceitar até 100 durante o período de validação.
-- A função abaixo continua sendo a única porta de gravação desse contador.
alter table public.uso_imagem_diario
  drop constraint uso_imagem_diario_chamadas_check,
  add constraint uso_imagem_diario_chamadas_check
    check (chamadas between 0 and 100);

-- Reserva uma geração paga e calcula o limite efetivo no servidor.
-- O navegador não escolhe o limite e não consegue se autorizar sozinho.
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
begin
  if usuario_atual is null then
    raise exception 'Usuário não autenticado.' using errcode = '42501';
  end if;

  -- Busca a autorização no banco. Fora da data especial, o limite volta para 5.
  select case
    when autorizacao.limite_especial_ate >= dia_atual
      then autorizacao.limite_diario
    else 5
  end
  into limite_atual
  from public.usuarios_imagem_autorizados as autorizacao
  where autorizacao.user_id = usuario_atual
    and autorizacao.ativo = true;

  if limite_atual is null then
    return query select false, 0, 5, 'conta_nao_autorizada'::text;
    return;
  end if;

  -- Soma uma tentativa sem permitir que chamadas simultâneas ultrapassem o limite.
  insert into public.uso_imagem_diario (user_id, dia, chamadas)
  values (usuario_atual, dia_atual, 1)
  on conflict (user_id, dia)
  do update
    set chamadas = public.uso_imagem_diario.chamadas + 1,
        atualizado_em = now()
    where public.uso_imagem_diario.chamadas < limite_atual
  returning public.uso_imagem_diario.chamadas into quantidade_atual;

  if quantidade_atual is null then
    select uso.chamadas
    into quantidade_atual
    from public.uso_imagem_diario as uso
    where uso.user_id = usuario_atual
      and uso.dia = dia_atual;

    return query select false, coalesce(quantidade_atual, limite_atual), limite_atual,
      'limite_atingido'::text;
    return;
  end if;

  return query select true, quantidade_atual, limite_atual, 'permitido'::text;
end;
$$;

-- Mantém a função proibida para visitantes e disponível somente após login.
revoke all on function public.reservar_geracao_imagem() from public;
revoke all on function public.reservar_geracao_imagem() from anon;
grant execute on function public.reservar_geracao_imagem() to authenticated;

-- Libera temporariamente 100 testes diários somente para a conta de Daniel.
update public.usuarios_imagem_autorizados as autorizacao
set
  limite_diario = 100,
  limite_especial_ate = date '2026-08-05'
from auth.users as usuario
where usuario.id = autorizacao.user_id
  and pg_catalog.lower(usuario.email) = 'danielmed124@gmail.com';

commit;
