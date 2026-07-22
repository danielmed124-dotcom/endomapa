# Especificação do MVP

## 1. O PROBLEMA

Médicos radiologistas gastam de dois a três minutos desenhando lesões manualmente em um mapa anatômico de papel.
Os desenhos feitos com canetinhas têm baixa definição anatômica e aparência pouco profissional.
O radiologista precisa produzir, com mais rapidez, um mapa profissional para exames de endometriose e fertilidade.

## 2. QUEM USA

O médico radiologista entra no sistema para ditar os achados de um exame e sair com mapas anatômicos coronal e sagital revisados, com as lesões e alterações descritas, em um PDF pronto para impressão.

## 3. O QUE A PESSOA FAZ HOJE

O médico realiza o exame, identifica as lesões e depois as desenha manualmente, com canetinhas, sobre uma figura anatômica já impressa. Essa confecção leva de dois a três minutos e produz um resultado com pouca definição anatômica e aparência pouco profissional.

## 4. O QUE É SUCESSO

Em celular, tablet ou computador, o médico deve concluir todo o processo — do início do ditado ao PDF revisado e confirmado — em no máximo 60 segundos, e os 20 mapas de teste devem representar corretamente tipo, lado, localização e medidas dos achados, sem tolerância a erro.

**Regra permanente:** tudo deve funcionar primeiro no celular.

## 5. A FEATURE DE IA

Mais para a frente, a IA transformará o ditado médico ao vivo em instruções de lesões, medidas e relações anatômicas para montar o mapa, pedindo confirmação quando houver dúvida e exigindo que o médico confira e confirme o resultado antes de gerar o PDF.

## 6. FORA DE ESCOPO

- Cadastro ou identificação de pacientes.
- Histórico de exames.
- Integração com sistemas de laudos.
- Interpretação dos achados, sugestão de diagnóstico ou escrita automática do laudo.
- Envio de gravações prontas; o ditado será somente ao vivo.
- Exportação em PNG, JPEG ou outros formatos além de PDF.
- Correção manual por toque ou mouse; as correções serão feitas por comando de voz.
- Representação de estruturas além de útero, ovários, tubas uterinas, ligamentos uterossacros, região retrocervical, reto/sigmoide, bexiga e recessos pélvicos.
- IA inventando uma aparência diferente para cada exame; será usada uma aparência visual aprovada para cada categoria de lesão.
- Painel de vendas, cobrança ou administração de várias clínicas na mesma instalação.
- Contas de usuário; os médicos e suas assinaturas serão cadastrados na implantação.
- Várias identidades visuais na mesma instalação; cada instalação atenderá uma clínica.

## 7. CASOS DE BORDA

- **Mapa vazio, sem nenhuma lesão:** não gerar o PDF e avisar ao médico que nenhum achado foi informado.
- **Medida igual a zero ou negativa:** não inserir a lesão e pedir ao médico uma medida válida por voz.
- **Nome obrigatório em branco:** não iniciar o ditado enquanto o médico não selecionar seu nome na lista.
- **Dois toques rápidos em confirmar e gerar PDF:** aceitar somente o primeiro comando e gerar apenas um PDF.
