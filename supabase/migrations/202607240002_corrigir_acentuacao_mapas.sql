-- Retira temporariamente apenas a validação do campo status.
-- A fechadura RLS continua ligada durante toda a correção.
alter table public.mapas
  drop constraint if exists mapas_status_check;

-- Corrige valores de status que possam ter sido gravados com a acentuação quebrada.
-- Esta etapa preserva os mapas existentes.
update public.mapas
set status = case status
  when 'em revisÃ£o' then 'em revisão'
  when 'aguardando confirmaÃ§Ã£o' then 'aguardando confirmação'
  else status
end
where status in ('em revisÃ£o', 'aguardando confirmaÃ§Ã£o');

-- Recria a lista fechada de opções com a acentuação correta.
alter table public.mapas
  add constraint mapas_status_check
  check (status in ('em revisão', 'aguardando confirmação', 'confirmado', 'PDF gerado'));

-- Corrige o valor preenchido automaticamente quando nenhum status é informado.
alter table public.mapas
  alter column status set default 'em revisão';

-- Remove somente a antiga regra geral de dono, cujo nome ficou com acentos quebrados.
-- O nome é localizado pelo banco para não dependermos de copiar os caracteres corrompidos.
do $$
declare
  regra_antiga text;
begin
  for regra_antiga in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'mapas'
      and cmd = 'ALL'
      and policyname like 'Usu%mapas'
  loop
    execute format('drop policy %I on public.mapas', regra_antiga);
  end loop;
end
$$;

-- Recria a regra de dono com o nome legível.
-- USING protege a leitura e WITH CHECK protege a gravação.
create policy "Usuário acessa somente os próprios mapas"
on public.mapas
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
