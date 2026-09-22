# Diagnóstico do fluxo de imagens médicas — 20/09/2026

## Fluxo manual direto — atualização de 21/09/2026

Por solicitação de Daniel, o fluxo principal do editor agora é montar as lesões manualmente e clicar em **Gerar mapa realista · pago**. A captura é PNG, com as lesões atuais e sem rótulos. O navegador faz a preparação gratuita automaticamente e envia os mesmos bytes e hashes ao modo `modo_edicao_direta` da função `finalizar-mapa-manual-gpt`, que já existe no servidor. Não é necessário gerar antes o acabamento gratuito.

O sistema recoloca os nomes e medidas nas duas imagens e mostra a montagem original junto da proposta. Durante a operação, o botão e os ajustes ficam bloqueados. Ao terminar, voltam a funcionar; uma nova geração exige um novo clique, sem repetição automática. Os testes anteriores ficam recolhidos em **Experimentos anteriores**. As seções abaixo descrevem o fluxo anterior de teste com duas imagens.

Verificação local: `tests/botao-final-realista.html` simula oito cenários, incluindo falha, clique duplicado, mapa vazio, falta de login e mudança da montagem durante a operação. `tests/editor-manual-nomes.html` verifica a captura PNG, a reposição dos rótulos e o acesso ao botão em tela de 390 pixels. Esses testes não fazem uma geração real nem comprovam o resultado visual da IA.

## O que foi comprovado

- O botão pago do editor captura o mapa em JPEG, sem rótulos, e envia os bytes em base64 e o inventário das lesões à função Supabase `finalizar-mapa-manual-gpt`.
- A função baixa a referência didática aprovada, anexa os dois arquivos como `image[]` e chama diretamente `POST https://api.openai.com/v1/images/edits` com `gpt-image-2.5-sunburst`. Não há modelo de texto intermediário, SDK OpenAI, gateway de terceiros nem triagem local por nomes anatômicos nesse fluxo. O cliente Supabase usa `@supabase/supabase-js@2` na função (sem versão menor fixada) e `@supabase/supabase-js@2.111.0` no navegador.
- São enviados `moderation=low`, `quality=max`, `size=1088x1456` e `output_format=png` no modo do mapa completo. `low` continua sujeito à verificação do provedor. O prompt visual é `mapa-medico-v2` em `_shared/prompt-mapa-medico.js`.
- O pedido `req_9311f0a44d18490bb610d862a42d6844` foi apresentado pelo aplicativo com estágio `output` e categoria `sexual`. Isso indica que a resposta recebida continha esses metadados. O status HTTP, `error.code` e o horário exato desse pedido não foram conservados; portanto, não são afirmados aqui.
- O aplicativo não repetia automaticamente o pedido após essa recusa. A montagem manual foi preservada.

## Hipóteses e limites

- O conteúdo didático pode ter sido classificado de forma inadequada na avaliação da saída, mas somente o provedor pode confirmar isso. O aplicativo não altera nem desativa essa avaliação.
- O prompt anterior pedia redesenhar o mapa inteiro e descrevia órgãos internos em inglês. Não há prova de que essa redação tenha causado o bloqueio. O novo prompt mantém os nomes anatômicos e explicita corretamente que a referência é ilustração de atlas, sem alegar que toda imagem médica seja aceita.
- Não foi feita nova chamada paga. Os testes abaixo simulam respostas e processamento local; não medem taxa de aceitação nem fidelidade clínica.

## Separação das etapas

1. Navegador: montagem e inventário. Entrada inválida ou ausência de login são bloqueios locais.
2. Supabase: valida JPEG, inventário e referência antes de reservar a geração. Segredos permanecem no servidor: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `OPENAI_API_KEY`.
3. OpenAI Images API: recebe os dois arquivos e o prompt. Não existe etapa de modelo de texto neste botão.
4. Resposta: código estruturado de moderação gera estado `bloqueado_provedor`; autenticação, saldo, frequência, parâmetro e servidor têm mensagens separadas. Resposta 200 sem `b64_json` é tratada como ausência de imagem, não como sucesso.
   Para o teste único preparado, não há repetição automática em nenhuma resposta, incluindo HTTP 429, HTTP 503, bloqueio, timeout ou erro de rede. O fluxo usa `fetch` direto, sem SDK OpenAI. O pedido define `n=1`. A contagem `tentativas_envio_imagem=1` indica uma tentativa de envio pelo servidor; em falha de rede ou timeout, não confirma que a OpenAI a recebeu.
5. Navegador: decodifica a imagem. A proposta é aplicada somente dentro de elipses ao redor das lesões, com transição dentro dessas áreas. Fora delas, os pixels decodificados da montagem original são copiados literalmente. A API não recebe máscara; a máscara aqui é de composição final e não tenta contornar moderação.

O registro do servidor guarda somente: UUID interno, horário UTC (`Z`), endpoint, modelo, versão do prompt, etapa, status, `error.type`, `error.code`, `x-request-id` validado, estágio e categorias de moderação quando informados. Não grava imagens, chave, prompt completo, laudo ou mensagem livre da API. O horário UTC inclui fuso e pode ser convertido para Brasília.

## Testes e validação

No PowerShell, na raiz do projeto:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tests\validar-fluxo-medico.ps1
git diff --check
```

Os testes locais verificam termos anatômicos, referência anexada, ausência de referência, diagnóstico de moderação com e sem detalhes, distinção de saldo/frequência/autenticação/servidor, não vazamento de mensagem livre, máscara e pixels externos. Simulam preparação gratuita, dois cliques rápidos, recusa e sucesso com comparação PNG. Eles não chamam a OpenAI. A validação médica e uma geração real continuam pendentes.

## Teste único no editor

1. Monte somente um caso didático, sem nome ou dados de paciente.
2. Clique em **Preparar teste da OpenAI · grátis**. Confira as duas imagens, o prompt exato e a máscara local. A referência deve ser `mapa-realista-completo-estudo-v1.png`; hashes do mapa, referência e prompt ficam no diagnóstico.
3. Clique uma vez em **Executar uma geração preparada · pago**. O botão fica bloqueado após a tentativa, mesmo se houver erro. Se o mapa ou a referência mudar, o servidor recusa antes da chamada paga.
4. Copie o texto de **Diagnóstico desta operação**. Se houver imagem, salve o PNG da diferença e compare o mapa enviado, a proposta bruta e o resultado protegido. O original de referência é o JPEG enviado, decodificado sem rótulos; a proposta é alinhada às suas dimensões antes da comparação.

O editor não envia máscara à OpenAI. A máscara vermelha controla apenas onde a proposta pode ser aplicada localmente. Fora dela, a comparação exige zero pixels alterados. Dentro dela, o médico precisa revisar posição, forma, tamanho e presença de cada lesão.

## Revisão de suporte

Pacote mínimo para `req_9311f0a44d18490bb610d862a42d6844`: modelo `gpt-image-2.5-sunburst`; endpoint `/v1/images/edits`; finalidade: edição de ilustração de atlas anatômico ginecológico; estágio informado `output`; categoria informada `sexual`; horário exato, HTTP e código técnico desse pedido anterior: indisponíveis. Não incluir imagem de paciente, chave, token ou laudo. Não enviar automaticamente.

## Reversão

Os arquivos alterados nesta correção podem ser revertidos com `git revert <commit desta correção>` após publicação do commit. A função Supabase deve ser publicada novamente a partir da revisão anterior; reverter apenas o site deixa o servidor na revisão atual.
