-- Cria as travas financeiras da geração de imagens em um pacote "tudo ou nada".
begin;

-- Guarda a lista de contas que o proprietário autorizou explicitamente.
-- Uma conta recém-cadastrada não entra nesta lista e, portanto, não gera custo.
create table public.usuarios_imagem_autorizados (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

alter table public.usuarios_imagem_autorizados enable row level security;

-- O usuário pode apenas conferir a própria autorização.
-- Não existe política de INSERT, UPDATE ou DELETE para usuários do aplicativo.
create policy "Usuário lê somente a própria autorização de imagem"
on public.usuarios_imagem_autorizados
for select
to authenticated
using (auth.uid() = user_id);

revoke all on table public.usuarios_imagem_autorizados from anon;
revoke all on table public.usuarios_imagem_autorizados from authenticated;
grant select on table public.usuarios_imagem_autorizados to authenticated;

-- Guarda um contador único por usuário e dia.
-- OpenAI e Gemini consomem o mesmo limite para impedir a duplicação do gasto.
create table public.uso_imagem_diario (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dia date not null,
  chamadas integer not null default 0 check (chamadas >= 0 and chamadas <= 5),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (user_id, dia)
);

alter table public.uso_imagem_diario enable row level security;

-- O médico pode apenas conferir o próprio consumo.
-- A gravação passa obrigatoriamente pela função protegida abaixo.
create policy "Usuário lê somente o próprio uso de imagem"
on public.uso_imagem_diario
for select
to authenticated
using (auth.uid() = user_id);

revoke all on table public.uso_imagem_diario from anon;
revoke all on table public.uso_imagem_diario from authenticated;
grant select on table public.uso_imagem_diario to authenticated;

-- Reserva uma tentativa antes de chamar OpenAI ou Gemini.
-- A operação é atômica: chamadas simultâneas nunca ultrapassam cinco no dia.
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
begin
  if usuario_atual is null then
    raise exception 'Usuário não autenticado.' using errcode = '42501';
  end if;

  -- Recusa contas que não foram liberadas manualmente pelo proprietário.
  if not exists (
    select 1
    from public.usuarios_imagem_autorizados as autorizacao
    where autorizacao.user_id = usuario_atual
      and autorizacao.ativo = true
  ) then
    return query select false, 0, 5, 'conta_nao_autorizada'::text;
    return;
  end if;

  insert into public.uso_imagem_diario (user_id, dia, chamadas)
  values (usuario_atual, dia_atual, 1)
  on conflict (user_id, dia)
  do update
    set chamadas = public.uso_imagem_diario.chamadas + 1,
        atualizado_em = now()
    where public.uso_imagem_diario.chamadas < 5
  returning public.uso_imagem_diario.chamadas into quantidade_atual;

  if quantidade_atual is null then
    select uso.chamadas
      into quantidade_atual
      from public.uso_imagem_diario as uso
     where uso.user_id = usuario_atual
       and uso.dia = dia_atual;

    return query select false, coalesce(quantidade_atual, 5), 5, 'limite_atingido'::text;
    return;
  end if;

  return query select true, quantidade_atual, 5, 'permitido'::text;
end;
$$;

revoke all on function public.reservar_geracao_imagem() from public;
revoke all on function public.reservar_geracao_imagem() from anon;
grant execute on function public.reservar_geracao_imagem() to authenticated;

-- Nesta primeira etapa, somente a conta do proprietário pode gerar imagens pagas.
insert into public.usuarios_imagem_autorizados (user_id, ativo)
select users.id, true
from auth.users as users
where pg_catalog.lower(users.email) = 'danielmed124@gmail.com'
on conflict (user_id) do update set ativo = excluded.ativo;

commit;
