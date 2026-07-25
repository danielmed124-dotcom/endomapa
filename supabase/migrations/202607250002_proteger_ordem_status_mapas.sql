-- Inicia um pacote "tudo ou nada".
begin;

-- Cria a regra fixa que será executada antes de mudar o status de um mapa.
create or replace function public.validar_transicao_status_mapa()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  -- Se o status não mudou, preserva as datas controladas pelo banco.
  if new.status = old.status then
    new.confirmado_em := old.confirmado_em;
    new.pdf_gerado_em := old.pdf_gerado_em;
    return new;
  end if;

  -- Aceita somente o próximo passo da ordem definida no MODELO.md.
  if not (
    (old.status = 'em revisão' and new.status = 'aguardando confirmação')
    or
    (old.status = 'aguardando confirmação' and new.status = 'confirmado')
    or
    (old.status = 'confirmado' and new.status = 'PDF gerado')
  ) then
    raise exception 'Mudança de status fora da ordem permitida.'
      using errcode = '23514';
  end if;

  -- Um mapa vazio não pode sair da revisão.
  if old.status = 'em revisão'
    and new.status = 'aguardando confirmação'
    and not exists (
      select 1
      from public.lesoes
      where lesoes.mapa_id = old.id
        and lesoes.user_id = old.user_id
    )
  then
    raise exception 'O mapa precisa ter pelo menos uma lesão antes da confirmação.'
      using errcode = '23514';
  end if;

  -- O banco registra sozinho o momento da confirmação humana.
  if new.status = 'confirmado' then
    new.confirmado_em := now();
    new.pdf_gerado_em := null;
  end if;

  -- O banco registra sozinho o momento em que o PDF for realmente gerado.
  if new.status = 'PDF gerado' then
    new.confirmado_em := old.confirmado_em;
    new.pdf_gerado_em := now();
  end if;

  return new;
end;
$$;

-- Executa a regra quando status ou datas controladas forem alterados.
create trigger proteger_ordem_status_mapas
before update of status, confirmado_em, pdf_gerado_em
on public.mapas
for each row
execute function public.validar_transicao_status_mapa();

-- Confirma o pacote depois que função e gatilho estão prontos.
commit;
