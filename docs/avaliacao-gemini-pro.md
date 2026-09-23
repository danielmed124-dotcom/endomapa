# Avaliação reversível do Gemini Pro — 22/09/2026

Daniel autorizou a troca do botão principal para avaliação, com retorno ao modelo anterior se o resultado não funcionar. A publicação e os testes locais não geram imagens reais. A avaliação visual depende do clique explícito do usuário.

## Resultado da avaliação e retorno ao Lite

Daniel apresentou a montagem manual, o original do Gemini e o resultado final após testar a versão Pro. Relatou que o original inventou lesões e que o resultado final permaneceu muito semelhante à montagem. A comparação visual dos anexos desta conversa sustenta que esta tentativa não atingiu o objetivo:

- No original do Gemini há novos agrupamentos escuros abaixo dos focos do útero e na parte superior do intestino, ausentes da montagem enviada.
- O resultado final descarta esses agrupamentos externos, mas conserva uma alteração interna indevida na lesão circular à esquerda do observador: a rede avermelhada original foi substituída por áreas arredondadas separadas por faixas claras.
- O aspecto final ainda não apresenta a integração local desejada por Daniel. A avaliação é deste exemplo; não comprova impossibilidade de todas as edições com o modelo.

A revisão do código confirma a causa da proteção parcial: a montagem original fornece os pixels externos e o Gemini fornece os pixels internos nas áreas autorizadas. Nos pontos opacos da lesão, a cor do Gemini é aplicada integralmente. A proteção controla a localização, mas não verifica a fidelidade dos detalhes internos. O prompt já solicita preservar esses detalhes. Não há evidência para atribuir o problema principalmente à redução de resolução ou a uma mistura fraca no interior.

Conforme a autorização de retornar ao original se a avaliação não funcionasse, a configuração do botão principal retorna ao Lite em 1K, com `thinkingLevel: "minimal"`. Esta reversão não resolve a limitação de acabamento. O prompt v5, a proteção espacial, a montagem manual e os três downloads continuam disponíveis. Nenhuma geração faz parte da reversão; não há repetição automática nem mudança de provedor, conta ou filtros.

Para identificar a reversão nos registros e interromper abas Pro antes da cota/chamada, as novas versões são `gemini-lite-retorno-v1` (função) e `refinamento-lite-v3` (compatibilidade). As verificações de modelo/resolução na preparação e os testes de resposta maior são conservados. As configurações abaixo registram o histórico da avaliação; não representam a configuração após este retorno.

Este registro usa os anexos e o código; não recupera registros da chamada paga. Pedido, operação, horário exato, parâmetros efetivamente enviados naquela operação e cobrança não foram verificados nesta análise. Nenhuma cobrança é inferida das imagens.

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
