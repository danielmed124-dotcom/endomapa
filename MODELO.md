# Modelo de dados do Endomapa

## Limite deste documento

Este é o desenho da arquitetura futura com Supabase e login. Ele não coloca login, banco de dados ou histórico de mapas dentro do MVP de dez dias.

Cada linha de dado nasce com um `user_id` porque o sistema precisa saber quem é o dono desde a criação; acrescentar o dono depois deixaria dados antigos sem uma separação segura.

## Tabela: clínicas

Guarda a identidade visual da clínica atendida por uma instalação.

| Campo | Tipo | Para que serve |
|---|---|---|
| id | texto | Identificador único da clínica. |
| user_id | texto | Identificador do dono deste dado. |
| nome | texto | Nome da clínica. |
| logomarca | texto | Referência para o arquivo da logomarca. |
| marca_dagua | texto | Referência para o arquivo da marca-d'água. |
| cor_mapa | texto | Cor escolhida para o mapa da clínica. |
| criado_em | data e hora | Momento em que a clínica foi cadastrada. |

## Tabela: médicos

Guarda os médicos disponíveis para seleção e a assinatura aplicada ao PDF.

| Campo | Tipo | Para que serve |
|---|---|---|
| id | texto | Identificador único do médico. |
| user_id | texto | Identificador do dono deste dado. |
| clinica_id | texto | Identificador da clínica à qual o médico pertence. |
| nome | texto | Nome do médico exibido na seleção. |
| assinatura | texto | Referência para o arquivo da assinatura. |
| ativo | lista fechada: sim, não | Define se o médico aparece para seleção. |
| criado_em | data e hora | Momento em que o médico foi cadastrado. |

## Tabela: mapas

Guarda o trabalho iniciado a partir de um ditado. O armazenamento e o histórico desses mapas pertencem à arquitetura futura, não ao MVP de dez dias.

| Campo | Tipo | Para que serve |
|---|---|---|
| id | texto | Identificador único do mapa. |
| user_id | texto | Identificador do dono deste dado. |
| clinica_id | texto | Identificador da clínica cuja identidade visual será usada. |
| medico_id | texto | Identificador do médico responsável pela revisão. |
| texto_bruto | texto | Transcrição integral do ditado antes da interpretação pela IA. |
| confianca | número | Quanto a IA confia no conjunto de informações que entendeu. A escala ainda é uma decisão pendente. |
| status | lista fechada: em revisão, aguardando confirmação, confirmado, PDF gerado | Etapa atual do mapa. |
| criado_em | data e hora | Momento em que o mapa foi iniciado. |
| confirmado_em | data e hora | Momento da confirmação humana; fica vazio enquanto não houver confirmação. |
| pdf_gerado_em | data e hora | Momento da geração do PDF; fica vazio enquanto ele não existir. |

## Tabela: lesões

Um mapa pode ter várias lesões, e cada lesão pertence a um único mapa.

| Campo | Tipo | Para que serve |
|---|---|---|
| id | texto | Identificador único da lesão. |
| user_id | texto | Identificador do dono deste dado. |
| mapa_id | texto | Identificador do mapa ao qual a lesão pertence. |
| categoria | lista fechada: endometriose, adenomiose, mioma, lesão ovariana, lesão tubária | Categoria informada pelo médico. |
| localizacao | lista fechada: útero, ovário, tuba uterina, ligamento uterossacro, região retrocervical, reto ou sigmoide, bexiga, recesso pélvico | Estrutura ou região onde a lesão deve aparecer. |
| lado | lista fechada: direito, esquerdo, bilateral, central, não informado | Lateralidade extraída do ditado. |
| medida_1 | número | Primeira medida da lesão em centímetros. |
| medida_2 | número | Segunda medida da lesão em centímetros. |
| medida_3 | número | Terceira medida, quando tiver sido informada, em centímetros. |
| observacao | texto | Complemento ditado pelo médico que não cabe nos campos fechados. |
| confianca | número | Quanto a IA confia na interpretação desta lesão. A escala ainda é uma decisão pendente. |
| criado_em | data e hora | Momento em que a lesão foi incluída no mapa. |

## Tabela: relações anatômicas

Guarda relações descritas no ditado, como um ovário e o reto aderidos à região retrocervical.

| Campo | Tipo | Para que serve |
|---|---|---|
| id | texto | Identificador único da relação. |
| user_id | texto | Identificador do dono deste dado. |
| mapa_id | texto | Identificador do mapa ao qual a relação pertence. |
| estrutura_origem | lista fechada: útero, ovário, tuba uterina, ligamento uterossacro, reto ou sigmoide, bexiga | Primeira estrutura da relação. |
| lado_origem | lista fechada: direito, esquerdo, bilateral, central, não informado | Lado da primeira estrutura. |
| relacao | lista fechada: aderido a, deslocado para | Relação anatômica informada pelo médico. |
| estrutura_destino | lista fechada: útero, ovário, tuba uterina, ligamento uterossacro, região retrocervical, reto ou sigmoide, bexiga, recesso pélvico | Estrutura ou região de destino. |
| lado_destino | lista fechada: direito, esquerdo, bilateral, central, não informado | Lado da estrutura de destino. |
| lesao_id | texto | Identificador da lesão responsável pela relação, quando houver. |
| confianca | número | Quanto a IA confia na interpretação desta relação. A escala ainda é uma decisão pendente. |
| criado_em | data e hora | Momento em que a relação foi incluída. |

## Tabela: dúvidas da interpretação

Guarda contradições, medidas ausentes ou lateralidades duvidosas que precisam ser confirmadas pelo médico.

| Campo | Tipo | Para que serve |
|---|---|---|
| id | texto | Identificador único da dúvida. |
| user_id | texto | Identificador do dono deste dado. |
| mapa_id | texto | Identificador do mapa em revisão. |
| pergunta | texto | Pergunta apresentada ao médico. |
| resposta | texto | Confirmação dada pelo médico; fica vazia enquanto não houver resposta. |
| status | lista fechada: aguardando resposta, respondida | Informa se a dúvida impede a confirmação do mapa. |
| criado_em | data e hora | Momento em que a dúvida foi identificada. |
| respondido_em | data e hora | Momento da resposta; fica vazio enquanto não houver resposta. |

## Tabela: modelos visuais de lesão

Guarda a aparência aprovada para cada categoria de lesão. A IA não inventará uma aparência diferente a cada exame.

| Campo | Tipo | Para que serve |
|---|---|---|
| id | texto | Identificador único do modelo visual. |
| user_id | texto | Identificador do dono deste dado. |
| clinica_id | texto | Identificador da clínica que usa o modelo. |
| categoria | lista fechada: endometriose, adenomiose, mioma, lesão ovariana, lesão tubária | Categoria representada pelo modelo. |
| imagem | texto | Referência para o arquivo visual aprovado. |
| status | lista fechada: aguardando aprovação, aprovado | Define se o modelo pode ser usado nos mapas. |
| aprovado_em | data e hora | Momento da aprovação; fica vazio enquanto estiver pendente. |

## Relações entre as tabelas

- Uma clínica tem vários médicos; cada médico pertence a uma clínica.
- Uma clínica tem vários mapas; cada mapa pertence a uma clínica.
- Um médico pode revisar vários mapas; cada mapa tem um médico responsável.
- Um mapa tem várias lesões; cada lesão pertence a um mapa.
- Um mapa pode ter várias relações anatômicas; cada relação pertence a um mapa.
- Um mapa pode ter várias dúvidas; cada dúvida pertence a um mapa.
- Uma clínica pode ter modelos visuais para as cinco categorias; cada modelo pertence a uma clínica.

## Regra para a IA futura

A IA transformará o ditado médico ao vivo em lesões, medidas e relações anatômicas estruturadas, mas o mapa só poderá ser confirmado e o PDF gerado depois da conferência explícita do médico.
