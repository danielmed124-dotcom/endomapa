# Validação clínica do Endomapa

## Objetivo

Comprovar, com revisão do médico radiologista, que 20 mapas representam corretamente categoria, localização, lado e medidas dos achados e que cada fluxo completo termina em até 60 segundos no celular.

Este documento não transforma o Endomapa em dispositivo médico validado nem substitui uma avaliação regulatória. Ele registra o teste de aceitação do MVP.

## Regra de aprovação

Um caso só recebe **APROVADO** quando todas as respostas abaixo forem “sim”:

- A IA entendeu a categoria corretamente?
- A IA entendeu a localização corretamente?
- A IA entendeu a lateralidade corretamente?
- A imagem respeitou a inversão da vista coronal: achado esquerdo no lado direito visual e vice-versa?
- As medidas exibidas são exatamente as ditadas, com vírgula e uma casa decimal quando necessário?
- A forma respeitou a proporção das medidas: alongada quando os eixos são diferentes e arredondada quando são semelhantes?
- A aparência visual corresponde à referência aprovada para essa categoria?
- Nenhuma estrutura fora da região necessária foi alterada?
- O médico conferiu o resultado antes da confirmação?
- O processo completo terminou em no máximo 60 segundos no celular?

Qualquer resposta “não” torna o caso **REPROVADO**. Um caso sem referência visual aprovada fica **BLOQUEADO**, não aprovado.

## Como medir o tempo

1. Use um celular com conexão normal.
2. Abra a área de trabalho do Endomapa e deixe o cronômetro pronto.
3. Inicie o cronômetro ao tocar em “Iniciar ditado”.
4. Pare o cronômetro quando o mapa final estiver visível e pronto para a conferência.
5. Registre o tempo real, sem arredondar para baixo.

## Evidência a guardar

Para cada caso, registre:

- data;
- nome do médico avaliador;
- tempo em segundos;
- captura da interpretação estruturada;
- captura do mapa produzido;
- resultado: APROVADO, REPROVADO ou BLOQUEADO;
- motivo, quando não for aprovado.

Não inclua nome, CPF, telefone, e-mail ou qualquer identificador de paciente nas evidências.

## Casos de teste

### Casos atualmente executáveis

| Caso | Ditado de teste | Resultado esperado | Estado inicial |
|---|---|---|---|
| 01 | Lesão de endometriose no ligamento uterossacro esquerdo, medindo 1,0 por 0,3 centímetros. | Endometriose; ligamento uterossacro; esquerdo; 1,0 × 0,3 cm; foco alongado no lado direito visual da vista coronal. | PRONTO PARA TESTE |
| 02 | Lesão de endometriose no ligamento uterossacro direito, medindo 1,0 por 0,3 centímetros. | Endometriose; ligamento uterossacro; direito; 1,0 × 0,3 cm; foco alongado no lado esquerdo visual da vista coronal. | PRONTO PARA TESTE |
| 03 | Lesão de endometriose no ligamento uterossacro esquerdo, medindo 0,8 por 0,8 centímetros. | Endometriose; ligamento uterossacro; esquerdo; 0,8 × 0,8 cm; foco arredondado no lado direito visual da vista coronal. | PRONTO PARA TESTE |
| 04 | Lesão de endometriose no ligamento uterossacro direito, medindo 0,8 por 0,8 centímetros. | Endometriose; ligamento uterossacro; direito; 0,8 × 0,8 cm; foco arredondado no lado esquerdo visual da vista coronal. | PRONTO PARA TESTE |

### Casos bloqueados até implementação e referência visual aprovada

| Caso | Achado já definido no projeto | Motivo do bloqueio |
|---|---|---|
| 05 | Endometriose na região retrocervical, 0,3 × 0,2 cm. | Geração fotorealista dessa localização ainda não implementada. |
| 06 | Endometriose no recesso vesicouterino. | Posição e referência visual ainda não implementadas. |
| 07 | Endometriose junto à bexiga. | Posição e referência visual ainda não implementadas. |
| 08 | Endometriose na bexiga. | Aparência visual dessa estrutura ainda não aprovada. |
| 09 | Endometriose em reto ou sigmoide. | Aparência e posição ainda não implementadas. |
| 10 | Endometriose em recesso pélvico. | Aparência e posição ainda não implementadas. |
| 11 | Adenomiose na parede uterina anterior. | Referência de adenomiose existe, mas a geração ainda não foi conectada. |
| 12 | Adenomiose em outra região do útero. | Regra de posição ainda não implementada. |
| 13 | Mioma na parede uterina corporal posterior. | Referência visual aprovada ainda não foi fornecida e a geração não foi implementada. |
| 14 | Endometrioma no ovário direito, 2,7 × 3,3 cm. | Geração de lesão ovariana ainda não implementada. |
| 15 | Lesão ovariana no ovário esquerdo. | Referência visual e geração ainda não implementadas. |
| 16 | Lesão tubária à direita. | Referência visual e geração ainda não implementadas. |
| 17 | Lesão tubária à esquerda. | Referência visual e geração ainda não implementadas. |
| 18 | Ovário esquerdo aderido à região retocervical. | Alteração de posição anatômica ainda não implementada. |
| 19 | Reto aderido à região retocervical. | Relação anatômica é interpretada, mas ainda não é salva nem desenhada no MVP. |
| 20 | Reto e sigmoide aderidos ao ovário esquerdo. | Relação anatômica e deslocamento das estruturas ainda não são desenhados. |

## Registro dos resultados

| Caso | Data | Avaliador | Tempo em segundos | Categoria | Localização | Lado | Medidas | Aparência | Estruturas preservadas | Resultado | Motivo |
|---|---|---|---:|---|---|---|---|---|---|---|---|
| 01 | 29/07/2026 | Daniel de Souza Carneiro | 60 | Sim | Sim | Sim | Sim | Sim | Sim | APROVADO | Todos os critérios confirmados pelo médico avaliador. |
| 02 |  |  |  |  |  |  |  |  |  | NÃO TESTADO |  |
| 03 |  |  |  |  |  |  |  |  |  | NÃO TESTADO |  |
| 04 |  |  |  |  |  |  |  |  |  | NÃO TESTADO |  |
| 05 |  |  |  |  |  |  |  |  |  | BLOQUEADO |  |
| 06 |  |  |  |  |  |  |  |  |  | BLOQUEADO |  |
| 07 |  |  |  |  |  |  |  |  |  | BLOQUEADO |  |
| 08 |  |  |  |  |  |  |  |  |  | BLOQUEADO |  |
| 09 |  |  |  |  |  |  |  |  |  | BLOQUEADO |  |
| 10 |  |  |  |  |  |  |  |  |  | BLOQUEADO |  |
| 11 |  |  |  |  |  |  |  |  |  | BLOQUEADO |  |
| 12 |  |  |  |  |  |  |  |  |  | BLOQUEADO |  |
| 13 |  |  |  |  |  |  |  |  |  | BLOQUEADO |  |
| 14 |  |  |  |  |  |  |  |  |  | BLOQUEADO |  |
| 15 |  |  |  |  |  |  |  |  |  | BLOQUEADO |  |
| 16 |  |  |  |  |  |  |  |  |  | BLOQUEADO |  |
| 17 |  |  |  |  |  |  |  |  |  | BLOQUEADO |  |
| 18 |  |  |  |  |  |  |  |  |  | BLOQUEADO |  |
| 19 |  |  |  |  |  |  |  |  |  | BLOQUEADO |  |
| 20 |  |  |  |  |  |  |  |  |  | BLOQUEADO |  |

## Critério de conclusão

O objetivo de “20 mapas sem tolerância a erro” permanece **NÃO CONCLUÍDO** enquanto qualquer caso estiver reprovado, bloqueado ou não testado.
