-- Inicia um pacote "tudo ou nada".
-- Se alguma trava falhar, o controle de uso não ficará criado pela metade.
begin;

-- Guarda quantas chamadas de IA cada médico reservou em cada dia.
create table public.uso_ia_diario (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dia date not null,
  chamadas integer not null default 0 check (chamadas >= 0 and chamadas <= 20),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (user_id, dia)
);

-- Liga a fechadura da tabela desde o primeiro instante.
alter table public.uso_ia_diario enable row level security;

-- O médico pode conferir somente o próprio contador.
-- Não existe regra de gravação direta: a alteração passa obrigatoriamente
-- pela função protegida criada abaixo.
create policy "Usuário lê somente o próprio uso de IA"
on public.uso_ia_diario
for select
to authenticated
using (auth.uid() = user_id);

-- Remove permissões de gravação direta das funções públicas do Supabase.
revoke all on table public.uso_ia_diario from anon;
revoke all on table public.uso_ia_diario from authenticated;
grant select on table public.uso_ia_diario to authenticated;

-- Reserva uma chamada de forma atômica: mesmo que dois pedidos cheguem juntos,
-- o banco incrementa um de cada vez e nunca ultrapassa 20 no mesmo dia.
create or replace function public.reservar_chamada_ia()
returns table (
  permitido boolean,
  total_chamadas integer,
  limite_diario integer
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
  -- A função também recusa chamadas sem um usuário autenticado.
  if usuario_atual is null then
    raise exception 'Usuário não autenticado.' using errcode = '42501';
  end if;

  -- Cria o contador na primeira chamada ou soma um nas chamadas seguintes.
  -- O WHERE impede que a vigésima primeira chamada seja registrada.
  insert into public.uso_ia_diario (user_id, dia, chamadas)
  values (usuario_atual, dia_atual, 1)
  on conflict (user_id, dia)
  do update
    set chamadas = public.uso_ia_diario.chamadas + 1,
        atualizado_em = now()
    where public.uso_ia_diario.chamadas < 20
  returning public.uso_ia_diario.chamadas into quantidade_atual;

  -- Sem retorno do INSERT/UPDATE, o limite já havia sido atingido.
  if quantidade_atual is null then
    select uso.chamadas
      into quantidade_atual
      from public.uso_ia_diario as uso
     where uso.user_id = usuario_atual
       and uso.dia = dia_atual;

    return query select false, coalesce(quantidade_atual, 20), 20;
    return;
  end if;

  return query select true, quantidade_atual, 20;
end;
$$;

-- Somente usuários logados podem pedir uma reserva.
revoke all on function public.reservar_chamada_ia() from public;
revoke all on function public.reservar_chamada_ia() from anon;
grant execute on function public.reservar_chamada_ia() to authenticated;

-- Confirma tabela, RLS, permissões e função no mesmo pacote.
commit;
