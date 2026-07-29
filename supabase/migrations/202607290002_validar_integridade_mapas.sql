-- Reforça no banco as regras que antes dependiam somente da tela.
begin;

-- Permite que médicos sem clínica usem mapas neutros.
alter table public.mapas
  alter column clinica_id drop not null;

-- Um mapa novo precisa ter texto útil e respeitar o mesmo limite da Edge Function.
-- NOT VALID preserva registros antigos, mas a regra já vale para toda gravação nova.
alter table public.mapas
  add constraint mapas_texto_bruto_valido
  check (
    texto_bruto is not null
    and length(trim(texto_bruto)) between 1 and 4000
  ) not valid;

-- A confiança é opcional, mas, quando existir, precisa ficar entre 0 e 100.
alter table public.mapas
  add constraint mapas_confianca_valida
  check (confianca is null or confianca between 0 and 100) not valid;

alter table public.lesoes
  add constraint lesoes_confianca_valida
  check (confianca is null or confianca between 0 and 100) not valid;

-- Evita observações gigantes enviadas diretamente à API do banco.
alter table public.lesoes
  add constraint lesoes_observacao_tamanho
  check (observacao is null or length(observacao) <= 1000) not valid;

-- Cria a referência composta necessária para provar que o médico do mapa
-- pertence à mesma conta que é dona do mapa.
alter table public.medicos
  add constraint medicos_id_user_id_unicos unique (id, user_id);

alter table public.mapas
  add constraint mapas_medico_pertence_ao_dono
  foreign key (medico_id, user_id)
  references public.medicos (id, user_id)
  not valid;

commit;
