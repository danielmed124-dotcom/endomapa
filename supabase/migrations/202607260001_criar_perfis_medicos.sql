-- Inicia um pacote "tudo ou nada".
begin;

-- Cria o perfil profissional ligado à conta de login do médico.
create table public.medicos (
  -- Identificador usado pelos mapas para apontar o médico responsável.
  id uuid primary key default gen_random_uuid(),

  -- Cada conta de login pode possuir somente um perfil médico.
  user_id uuid not null unique default auth.uid() references auth.users(id) on delete cascade,

  -- Fica vazio para médicos que usam mapas neutros.
  -- Daniel será ligado ao identificador interno da Centrus MG.
  clinica_id uuid,

  -- Lista fechada para o tratamento profissional.
  titulo text not null check (titulo in ('Dr.', 'Dra.')),

  -- Nome completo informado no cadastro; espaços vazios não são aceitos.
  nome text not null check (length(trim(nome)) > 0),

  -- Primeiro nome usado para gerar a assinatura cursiva.
  assinatura text not null check (length(trim(assinatura)) > 0),

  -- Permite desativar um perfil sem apagar seu histórico.
  ativo text not null default 'sim' check (ativo in ('sim', 'não')),

  -- Data e hora preenchidas automaticamente.
  criado_em timestamptz not null default now()
);

-- Liga a fechadura da tabela no mesmo pacote da criação.
alter table public.medicos enable row level security;

-- O médico pode ler e alterar somente o próprio perfil.
create policy "Usuário acessa somente o próprio perfil médico"
on public.medicos
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Cria automaticamente o perfil quando uma nova conta nasce no Supabase Auth.
create or replace function public.criar_perfil_medico_apos_cadastro()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  nome_completo text := pg_catalog.btrim(new.raw_user_meta_data ->> 'nome');
  titulo_escolhido text := new.raw_user_meta_data ->> 'titulo';
  primeiro_nome text;
  clinica_centrus uuid;
begin
  -- Recusa cadastros que tentem contornar os campos obrigatórios da tela.
  if nome_completo is null or nome_completo = '' then
    raise exception 'O nome completo do médico é obrigatório.';
  end if;

  if titulo_escolhido not in ('Dr.', 'Dra.') then
    raise exception 'Escolha Dr. ou Dra. no cadastro.';
  end if;

  primeiro_nome := pg_catalog.split_part(nome_completo, ' ', 1);

  -- Somente a conta definida pelo proprietário recebe a identidade Centrus MG.
  if pg_catalog.lower(new.email) = 'danielmed124@gmail.com' then
    clinica_centrus := '20000000-0000-4000-8000-000000000001'::uuid;
  else
    clinica_centrus := null;
  end if;

  insert into public.medicos (
    user_id,
    clinica_id,
    titulo,
    nome,
    assinatura
  ) values (
    new.id,
    clinica_centrus,
    titulo_escolhido,
    nome_completo,
    primeiro_nome
  );

  return new;
end;
$$;

-- Executa a criação do perfil depois de cada nova conta do Supabase Auth.
create trigger criar_perfil_medico_apos_cadastro
after insert on auth.users
for each row
execute function public.criar_perfil_medico_apos_cadastro();

-- Cria ou corrige o perfil da conta que já existia antes desta automação.
-- O identificador preserva a referência usada pelos mapas demonstrativos anteriores.
insert into public.medicos (
  id,
  user_id,
  clinica_id,
  titulo,
  nome,
  assinatura,
  ativo
)
select
  '10000000-0000-4000-8000-000000000001'::uuid,
  users.id,
  '20000000-0000-4000-8000-000000000001'::uuid,
  'Dr.',
  'Daniel de Souza Carneiro',
  'Daniel',
  'sim'
from auth.users as users
where pg_catalog.lower(users.email) = 'danielmed124@gmail.com'
on conflict (user_id) do update
set
  clinica_id = excluded.clinica_id,
  titulo = excluded.titulo,
  nome = excluded.nome,
  assinatura = excluded.assinatura,
  ativo = excluded.ativo;

-- Confirma o pacote depois que tabela, fechadura e automação estão prontas.
commit;
