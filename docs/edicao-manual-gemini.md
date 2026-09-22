# Montagem manual com edição Gemini — 21/09/2026

## Escolha do provedor e tela

Daniel solicitou explicitamente usar a API Gemini já configurada. O botão principal é **Gerar mapa realista com Gemini · pago**. Ele usa a montagem manual existente e apresenta a original com rótulos ao lado da proposta para revisão. A montagem editável não é substituída pela proposta.

O texto fixo `mapa-direto-v1` em `supabase/functions/_shared/prompt-edicao-direta-mapa.js` é reutilizado sem reformulação. A mudança de provedor não confirma que a imagem será aceita nem que o acabamento preservará a anatomia; o médico deve comparar os resultados. Não foram configurados filtros mais permissivos, nomes anatômicos ocultados ou provedores alternativos automáticos.

## Função e configuração

- Função existente: `finalizar-mapa-manual-gemini`; versão lógica `gemini-direto-v1`.
- Segredo existente no servidor: `GEMINI_API_KEY`.
- Modelo mantido: `gemini-3.1-flash-lite-image`.
- Endpoint mantido: `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-image:generateContent`.
- Entrada direta: um PNG sem rótulos, em `contents[0].parts[].inlineData`; prompt em outra parte textual. Sem referência adicional ou máscara de API.
- `generationConfig`: `responseModalities: ["IMAGE"]`, `imageConfig: { aspectRatio: "3:4", imageSize: "1K" }`, `thinkingConfig: { thinkingLevel: "minimal" }`.
- Nenhum `safetySettings` é enviado pelo modo direto.

A documentação oficial descreve o modelo como compatível com entrada de imagem, edição e saída em 1K, incluindo proporção 3:4. Isso valida a configuração documentada, não o acesso atual da conta nem a aceitação de um pedido específico. [Modelo Gemini 3.1 Flash Lite Image](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite-image).

## Preparação, custo e resposta

1. O navegador obtém a sessão e captura a montagem em PNG sem nomes e medidas; cria uma cópia com rótulos para comparação.
2. Uma preparação na mesma função valida o PNG e devolve prompt, configuração e hashes da imagem e do texto. Ela retorna antes de reservar limite ou chamar o Gemini.
3. A chamada de edição confere os mesmos hashes, verifica o limite interno e faz um único envio ao Gemini. O fluxo não repete automaticamente nem troca de modelo/provedor.
4. A resposta direta devolve somente a imagem deste pedido. Esse caminho não usa a tabela de último diagnóstico por conta, não armazena `ultima-imagem-gemini` e não recupera uma imagem anterior após falha de rede.
5. O navegador aceita PNG/JPEG/WebP, recoloca nomes e medidas localmente e mostra a proposta identificada como Gemini. Uma resposta de bloqueio, ausência de imagem ou falha mantém a montagem; outra geração exige novo clique explícito.

O aviso de custo informa que o recurso é pago; não comprova cobrança de uma operação que falhou. Uso de tokens, quando retornado, é registrado separadamente. Confirmação financeira depende do faturamento do provedor.

## Diagnóstico

O modo direto registra UUID de operação, hora UTC, função, prompt, modelo, endpoint, quantidade de tentativas e configuração/hashes no envio. Da resposta, conserva somente campos estruturados selecionados: HTTP, código/status de erro, `responseId`, `promptFeedback.blockReason`, `candidates[0].finishReason`, avaliações reconhecidas e contagens de uso. Não registra segredo, imagem, texto livre do provedor ou identificação de usuário/paciente.

O tratamento dá precedência ao bloqueio estruturado, mesmo se houver imagem em uma resposta contraditória. Uma imagem interna de raciocínio, conteúdo de outro candidato, texto solto ou arquivo de formato inválido não é aceito como resultado. Os campos selecionados não equivalem ao corpo original completo da resposta. [Estrutura da resposta generateContent](https://ai.google.dev/api/generate-content).

O pacote privado referente aos pedidos OpenAI anteriores permanece como evidência histórica, sem alteração. Esta troca não resolve aquele incidente.

## Verificação sem gerar imagens

Os testes da interface e do tratamento de resposta usam dados fictícios e bloqueiam conexões reais. Execute:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tests\validar-fluxo-medico.ps1
```

Os testes não comprovam qualidade visual, fidelidade clínica, saldo disponível ou sucesso de uma geração real.

Os testes da função em [tests/servidor-gemini-offline](../tests/servidor-gemini-offline/LEIA-ME.md) substituem autenticação, reserva de limite e chamada ao Gemini por objetos locais. O Deno é executado com acesso a rede e variáveis de ambiente proibido.

Verificação desta alteração: sete páginas de testes no Chrome passaram, incluindo 14 cenários do botão principal e a espera por experimento em andamento; oito testes da função passaram no Deno sem acesso externo. A compilação também passou com as definições reais do Supabase. Nenhuma geração real foi executada. A função foi publicada e sua versão Supabase **12**, estado `ACTIVE`, foi confirmada antes da atualização da interface.

## Ordem de publicação

Publicar primeiro `finalizar-mapa-manual-gemini` com a versão lógica `gemini-direto-v1` e conferir a publicação antes de atualizar o site. A versão antiga da função não reconhece o pedido de preparação direta e poderia tratá-lo como geração. Para uma reversão, retirar primeiro a interface que usa esse contrato, mantendo a função compatível enquanto houver abas dessa versão abertas. Não verificar a publicação executando uma geração.

## Limite de preservação

O tratamento de falhas preserva a montagem na aba aberta. Ainda não existe salvamento persistente dos objetos editáveis nem exportação PDF nativa. A imagem já visível em **Comparação → Montagem manual exata** pode ser salva pelo navegador, quando o aparelho oferecer essa opção; não exige sucesso da IA.
