-- Cria a tabela que guarda cada mapa iniciado no Endomapa.
-- O identificador é gerado automaticamente, assim como a data de criação.
create table public.mapas (
  id uuid primary key default gen_random_uuid(),

  -- Esta é a coluna do dono.
  -- auth.uid() identifica automaticamente o usuário que está logado no momento da gravação.
  user_id uuid not null default auth.uid() references auth.users(id),

  clinica_id uuid not null,
  medico_id uuid not null,
  texto_bruto text,
  confianca numeric,
  vistas text not null check (vistas in ('coronal', 'sagital', 'ambas')),
  status text not null default 'em revisão'
    check (status in ('em revisão', 'aguardando confirmação', 'confirmado', 'PDF gerado')),
  criado_em timestamptz not null default now(),
  confirmado_em timestamptz,
  pdf_gerado_em timestamptz
);

-- Liga a fechadura da tabela.
-- Com o Row Level Security (RLS) ativo, nenhum acesso é permitido sem uma regra explícita.
alter table public.mapas enable row level security;

-- Cria a regra de dono para leitura e gravação.
-- USING controla quais linhas o usuário pode ler, alterar ou apagar:
-- somente aquelas cujo user_id é igual ao identificador de quem está logado.
-- WITH CHECK controla quais linhas podem ser criadas ou modificadas:
-- o usuário não pode gravar uma linha em nome de outra pessoa.
create policy "Usuário acessa somente os próprios mapas"
on public.mapas
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
