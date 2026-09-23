# Avaliação reversível do Gemini Pro — 22/09/2026

Daniel autorizou a troca do botão principal para avaliação, com retorno ao modelo anterior se o resultado não funcionar. A publicação e os testes locais não geram imagens reais. A avaliação visual depende do clique explícito do usuário.

## Configuração da avaliação

- Modelo: `gemini-3-pro-image`.
- Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image:generateContent`.
- Saída solicitada: `responseModalities: ["IMAGE"]`, `imageConfig: { aspectRatio: "3:4", imageSize: "2K" }`.
- Sem `thinkingConfig`: usar o raciocínio padrão do Pro.
- Função: `finalizar-mapa-manual-gemini`, versão lógica `gemini-pro-avaliacao-v1`.
- Compatibilidade do botão: `refinamento-pro-v1`.
- Prompt preservado: `gemini-refinamento-v5`.
- Mesma conta/chave existente no servidor, uma imagem de montagem por chamada, sem referência adicional, ferramentas de pesquisa ou alteração de filtros.
- Experimentos antigos permanecem no Lite. Uma falha do Pro não chama o Lite.

O download do original conserva os bytes e a resolução recebidos. A composição final conserva as dimensões da montagem manual; somente as áreas previamente autorizadas recebem a imagem redimensionada. Essa proteção não valida o conteúdo gerado dentro das lesões.

## Custo consultado

Na tabela padrão do Google em 22/09/2026, a imagem de saída Pro em 1K/2K custa o equivalente a US$ 0,134. Entrada e texto/raciocínio são cobrados separadamente. O Lite anterior em 1K tem saída equivalente a US$ 0,0336. Esses valores são tarifas publicadas, não comprovação de cobrança desta avaliação. [Tabela oficial](https://ai.google.dev/gemini-api/docs/pricing).

O Pro é documentado para edição de imagens e tarefas visuais complexas. Isso não garante fidelidade anatômica nem melhora neste caso. [Modelo](https://ai.google.dev/gemini-api/docs/models/gemini-3-pro-image), [geração e edição](https://ai.google.dev/gemini-api/docs/generate-content/image-generation).

## Configuração anterior e retorno

A configuração anterior está preservada no commit `3215170`:

- Modelo: `gemini-3.1-flash-lite-image`.
- Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-image:generateContent`.
- `responseModalities: ["IMAGE"]`.
- `imageConfig: { aspectRatio: "3:4", imageSize: "1K" }`.
- `thinkingConfig: { thinkingLevel: "minimal" }`.
- Função lógica `gemini-refinamento-v3`, compatibilidade `refinamento-v2` e o mesmo prompt `gemini-refinamento-v5`.

Se Daniel solicitar o retorno após avaliar, reverter somente o commit desta troca (ou reaplicar a configuração acima em uma alteração direcionada se houver trabalho posterior), verificar os testes, publicar a função e depois a interface. Não restaurar o projeto inteiro nem apagar trabalhos posteriores. Manter a compatibilidade da interface e da função sincronizada; aba Pro com servidor Lite deve parar antes da chamada paga.

Antes de atualizar a aba, preservar os arquivos baixados e manter a montagem manual aberta: os objetos editáveis ainda não têm salvamento persistente. Não executar geração para confirmar a reversão.
