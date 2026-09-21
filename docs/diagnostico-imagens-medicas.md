# Diagnóstico do fluxo de imagens médicas — 20/09/2026

## O que foi comprovado

- O botão pago do editor captura o mapa em JPEG, sem rótulos, e envia os bytes em base64 e o inventário das lesões à função Supabase `finalizar-mapa-manual-gpt`.
- A função baixa a referência didática aprovada, anexa os dois arquivos como `image[]` e chama diretamente `POST https://api.openai.com/v1/images/edits` com `gpt-image-2.5-sunburst`. Não há modelo de texto intermediário, SDK OpenAI, gateway de terceiros nem triagem local por nomes anatômicos nesse fluxo. O cliente Supabase usa `@supabase/supabase-js@2` na função e a biblioteca pública do navegador no editor.
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
   Uma única repetição é permitida apenas quando a OpenAI devolve explicitamente `rate_limit_exceeded` (HTTP 429) ou `service_unavailable` (HTTP 503), respeitando `Retry-After` até dez segundos e pequena variação aleatória. Bloqueio, timeout, erro de rede, saldo e credencial não são repetidos automaticamente. O fluxo usa `fetch` direto, portanto não há retentativa oculta do SDK OpenAI.
5. Navegador: decodifica a imagem. A proposta é aplicada somente dentro de elipses ao redor das lesões, com transição dentro dessas áreas. Fora delas, os pixels decodificados da montagem original são copiados literalmente. A API não recebe máscara; a máscara aqui é de composição final e não tenta contornar moderação.

O registro do servidor guarda somente: UUID interno, horário UTC (`Z`), endpoint, modelo, versão do prompt, etapa, status, `error.type`, `error.code`, `x-request-id` validado, estágio e categorias de moderação quando informados. Não grava imagens, chave, prompt completo, laudo ou mensagem livre da API. O horário UTC inclui fuso e pode ser convertido para Brasília.

## Testes e validação

No PowerShell, na raiz do projeto:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tests\validar-fluxo-medico.ps1
git diff --check
```

Os testes locais verificam termos anatômicos, referência anexada, ausência de referência, diagnóstico de moderação com e sem detalhes, distinção de saldo/frequência/autenticação/servidor, não vazamento de mensagem livre, máscara e pixels externos. Eles não chamam a OpenAI. A validação médica e uma geração real continuam pendentes.

## Revisão de suporte

Pacote mínimo para `req_9311f0a44d18490bb610d862a42d6844`: modelo `gpt-image-2.5-sunburst`; endpoint `/v1/images/edits`; finalidade: edição de ilustração de atlas anatômico ginecológico; estágio informado `output`; categoria informada `sexual`; horário exato, HTTP e código técnico desse pedido anterior: indisponíveis. Não incluir imagem de paciente, chave, token ou laudo. Não enviar automaticamente.

## Reversão

Os arquivos alterados nesta correção podem ser revertidos com `git revert <commit desta correção>` após publicação do commit. A função Supabase deve ser publicada novamente a partir da revisão anterior; reverter apenas o site deixa o servidor na revisão atual.
