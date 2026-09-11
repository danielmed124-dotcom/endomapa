# Ponto de retomada — 10 de setembro de 2026

## Direção atual confirmada por Daniel

Continuar no editor manual experimental. Usar os mapas anatômicos já salvos no Endomapa como base, sem lesões fixas. Cada lesão deve ser adicionada separadamente, posicionada e ajustada manualmente. Não recriar nem limpar por IA a imagem completa selecionada em 8 de setembro para usá-la como base. A escolha daquela imagem é histórico visual, não a direção atual do editor.

## Entregas de hoje, salvas e publicadas

- Depois de Teratoma, Daniel pediu acrescentar DIU de Cobre com `DIU cobre.png`. Arquivo original preservado em `assets/lesoes/diu-cobre-referencia.png`, com transparência e proporção 1122/1402 no editor, sem recorte do dispositivo ou do fio. Usa os controles manuais existentes, incluindo nome e medidas.

- Continuação após o encerramento: Daniel enviou `Teratoma.png` e pediu publicar Teratoma. A nova imagem foi copiada integralmente para `assets/lesoes/teratoma-referencia.png` e adicionada ao editor, preservando também o fundo marrom presente nela. Esse novo pedido não retoma a edição cancelada de `Tera 1.png`.

- Cisto hemorrágico: imagem fornecida por Daniel em `assets/lesoes/cisto-hemorragico-referencia.png`.
- Endometrioma: imagem fornecida por Daniel em `assets/lesoes/endometrioma-referencia.png`.
- Adenomiose 1: imagem fornecida por Daniel em `assets/lesoes/adenomiose-1-referencia.png`.
- As três imagens foram copiadas sem alteração e têm transparência. As opções foram acrescentadas à biblioteca de `experimento-editor.html`, com os controles existentes de posição, tamanho, rotação e medidas.
- Campo opcional “Nome da lesão no mapa” nos ajustes de cada lesão. O nome aparece acima das medidas; nome e medidas são arrastados juntos. Cada lesão conserva seu próprio nome durante a montagem. O nome também entra na captura da montagem enviada à IA.
- Verificação no Chrome, com tela de 390 × 844, em `tests/editor-manual-nomes.html`: nomes independentes, seleção, texto seguro, captura, remoção e medidas passaram. Campo, código e estilo foram conferidos na página publicada.

Commits das entregas: `1b4eb67`, `2f71643`, `b1e5a7c` e `d585b16`.

Editor de teste: https://experimento-editor-manual.endomapa.pages.dev/experimento-editor?versao=d585b16

Ramo de trabalho e publicação: `experimento-editor-manual`. A publicação ocorre por envio desse ramo ao GitHub.

## Pedido cancelado e próxima sessão

Daniel pediu ampliar `Tera 1.png`, remover a legenda e tornar o fundo transparente. A ferramenta produziu duas versões com quadriculado desenhado, sem transparência real. Daniel cancelou essa lesão: não adicioná-la ao editor e não continuar o recorte. As versões geradas não foram incorporadas ao projeto.

Daniel encerrou a sessão pedindo salvar e publicar o trabalho de hoje para retornar amanhã, mas depois enviou uma nova imagem `Teratoma.png` e pediu sua publicação, registrada acima. Após essa inclusão, nenhuma próxima lesão ou mudança foi escolhida. Na retomada, seguir o editor manual e pedir o próximo item desejado, sem retomar a edição cancelada de `Tera 1.png`.

Os arquivos não rastreados em `.ferramentas-publicacao/`, `supabase/.temp/` e os cinco mapas soltos em `assets/` já apareciam antes das alterações de hoje. Não foram incluídos nesta publicação; preservar os arquivos locais.

## Histórico — 8 de setembro de 2026

Daniel escolheu a imagem completa `mapa-gerado-v1.png` e autorizou salvar e publicar.

Naquela sessão, a referência selecionada foi esse arquivo integral, inclusive o cisto e a lesão do ligamento. Não confundir com `mapa-integrado-v1.png`, outras montagens ou o estudo isolado `ligamento-integracao-v1.png`. A direção atual está registrada acima.

SHA-256 do arquivo selecionado: `C657BF10D853CB209CA8337D4085B2A8BB8AF794BD866E603C7C2D2A9095A8ED`.

Publicação na versão de teste, ramo `experimento-editor-manual`:

- Imagem: https://experimento-editor-manual.endomapa.pages.dev/output/estudos-realismo/mapa-gerado-v1.png
- Editor com acesso à imagem: https://experimento-editor-manual.endomapa.pages.dev/experimento-editor

As demais imagens e montagens desta pasta são histórico dos estudos. Os pedidos usados na geração estão em `PROMPTS.md`. A imagem selecionada é um resultado visual estático; sua seleção não modifica o funcionamento da geração de lesões no editor.
