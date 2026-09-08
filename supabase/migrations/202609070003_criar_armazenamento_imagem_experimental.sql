-- Guarda somente a ultima imagem experimental de cada usuario.
-- O bucket e privado; a funcao devolve um endereco temporario para visualizacao.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'imagens-experimentais',
  'imagens-experimentais',
  false,
  8000000,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
