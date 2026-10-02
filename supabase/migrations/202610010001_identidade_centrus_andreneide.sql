-- Amplia somente a identidade visual; nao altera assinatura nem acesso a dados.
BEGIN;

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

  -- Contas autorizadas pelo proprietario recebem a identidade Centrus MG.
  if pg_catalog.lower(new.email) in ('danielmed124@gmail.com', 'andreneide@gmail.com', 'andreneide@yahoo.com.br') then
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

UPDATE public.medicos AS medico
SET clinica_id = '20000000-0000-4000-8000-000000000001'::uuid
FROM auth.users AS usuario
WHERE medico.user_id = usuario.id
  AND pg_catalog.lower(usuario.email) IN ('andreneide@gmail.com', 'andreneide@yahoo.com.br');

COMMIT;
