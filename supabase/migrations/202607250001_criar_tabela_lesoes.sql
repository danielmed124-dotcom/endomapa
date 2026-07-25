-- Inicia um pacote "tudo ou nada".
-- Se alguma etapa falhar, a tabela não ficará criada sem a fechadura.
begin;

-- Cria a tabela de lesões estruturadas do Endomapa.
create table public.lesoes (
  -- Gera sozinho o identificador único de cada lesão.
  id uuid primary key default gen_random_uuid(),

  -- Registra automaticamente o usuário que está logado como dono da lesão.
  user_id uuid not null default auth.uid() references auth.users(id),

  -- Liga a lesão ao mapa ao qual ela pertence.
  -- Se o mapa for apagado no futuro, suas lesões também serão apagadas.
  mapa_id uuid not null references public.mapas(id) on delete cascade,

  -- Aceita somente as cinco categorias previstas no MODELO.md.
  categoria text not null check (
    categoria in (
      'endometriose',
      'adenomiose',
      'mioma',
      'lesão ovariana',
      'lesão tubária'
    )
  ),

  -- Aceita somente as estruturas e regiões previstas no MODELO.md.
  localizacao text not null check (
    localizacao in (
      'útero',
      'ovário',
      'tuba uterina',
      'ligamento uterossacro',
      'região retrocervical',
      'reto ou sigmoide',
      'bexiga',
      'recesso pélvico'
    )
  ),

  -- Aceita somente as lateralidades previstas no MODELO.md.
  lado text not null default 'não informado' check (
    lado in ('direito', 'esquerdo', 'bilateral', 'central', 'não informado')
  ),

  -- Guarda as medidas em centímetros.
  -- Medidas informadas precisam ser maiores que zero.
  medida_1 numeric check (medida_1 is null or medida_1 > 0),
  medida_2 numeric check (medida_2 is null or medida_2 > 0),
  medida_3 numeric check (medida_3 is null or medida_3 > 0),

  -- Guarda um complemento que não caiba nos campos fechados.
  observacao text,

  -- Guarda futuramente a confiança da interpretação feita pela IA.
  confianca numeric,

  -- Preenche sozinho a data e a hora da criação.
  criado_em timestamptz not null default now()
);

-- Liga a fechadura Row Level Security na tabela de lesões.
alter table public.lesoes enable row level security;

-- Cria uma única regra de dono para ler e gravar.
create policy "Usuário acessa somente as próprias lesões"
on public.lesoes
for all
to authenticated

-- USING permite ler, alterar ou apagar somente lesões do usuário logado.
using (auth.uid() = user_id)

-- WITH CHECK impede gravar em nome de outra pessoa.
-- Também confirma que o mapa relacionado pertence ao mesmo usuário.
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.mapas
    where mapas.id = mapa_id
      and mapas.user_id = auth.uid()
  )
);

-- Confirma o pacote somente depois que tabela e fechadura estão prontas.
commit;
