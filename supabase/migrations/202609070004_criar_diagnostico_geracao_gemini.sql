-- Registra somente a etapa tecnica da ultima tentativa Gemini.
-- Nao armazena imagens, comandos medicos, chaves ou dados clinicos.
create table if not exists public.diagnostico_geracao_gemini (
  user_id uuid primary key references auth.users(id) on delete cascade,
  etapa text not null,
  atualizado_em timestamptz not null default now()
);

alter table public.diagnostico_geracao_gemini enable row level security;
revoke all on table public.diagnostico_geracao_gemini from public, anon, authenticated;
