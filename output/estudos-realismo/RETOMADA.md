# Ponto de retomada — 10 de setembro de 2026

## Direção atual confirmada por Daniel

Continuar no editor manual experimental. Usar os mapas anatômicos já salvos no Endomapa como base, sem lesões fixas. Cada lesão deve ser adicionada separadamente, posicionada e ajustada manualmente. Não recriar nem limpar por IA a imagem completa selecionada em 8 de setembro para usá-la como base. A escolha daquela imagem é histórico visual, não a direção atual do editor.

## Entregas de hoje, salvas e publicadas

- Última alteração: as quatro aderências ficaram mais escuras e arroxeadas por ajuste de cor em código, explicitamente autorizado por Daniel após a ferramenta de IA perder a transparência. O editor usa `assets/lesoes/aderencia-1-arroxeada.png` até `aderencia-4-arroxeada.png`. Os originais permanecem preservados. O script `ajustar-cor-aderencias.ps1` reproduz o ajuste a partir dos originais e verifica que a transparência de cada pixel permaneceu idêntica. Nenhuma forma, dimensão ou posição foi alterada.

- Atualização de Aderências 1: Daniel pediu retirar a imagem antiga de `Aderências.png` e usar a nova `Aderência 1.png`. Substituído o conteúdo de `assets/lesoes/aderencias-1-referencia.png` pela nova imagem original, mantendo uma única opção “Aderências 1”. Referência no editor usa `?versao=2` para atualizar a imagem armazenada pelo navegador. Aderência 2, 3 e 4 permanecem disponíveis.

- Daniel pediu acrescentar separadamente `Aderência 2.png`, `Aderência 3.png` e `Aderência 4.png`, com os nomes dos arquivos. Opções “Aderência 2”, “Aderência 3” e “Aderência 4” adicionadas com suas respectivas imagens originais em `assets/lesoes/aderencia-2-referencia.png`, `aderencia-3-referencia.png` e `aderencia-4-referencia.png`. Todas 1254 × 1254, com transparência, sem recorte e tamanho inicial de 100%.

- A primeira imagem de “Aderências 1”, enviada como `Aderências.png`, foi substituída pela nova `Aderência 1.png`, conforme registrado acima. A versão antiga permanece apenas no histórico do Git.

- Daniel pediu tamanho de 150% para DIU de Cobre e DIU hormonal. Ambos agora são inseridos com tamanho inicial de 150%, mantendo proporção e controles de ajuste. Os outros modelos continuam com tamanho inicial de 100%.

- Depois do DIU de Cobre, Daniel enviou `DIU hormonal.png`. Imagem original preservada em `assets/lesoes/diu-hormonal-referencia.png`, com transparência e proporção 1672/941. Opção “DIU hormonal” adicionada ao editor com os mesmos controles manuais.

- Depois de Teratoma, Daniel pediu acrescentar DIU de Cobre com `DIU cobre.png`. Arquivo original preservado em `assets/lesoes/diu-cobre-referencia.png`, com transparência e proporção 1122/1402 no editor, sem recorte do dispositivo ou do fio. Usa os controles manuais existentes, incluindo nome e medidas.

- Continuação após o encerramento: Daniel enviou `Teratoma.png` e pediu publicar Teratoma. A nova imagem foi copiada integralmente para `assets/lesoes/teratoma-referencia.png` e adicionada ao editor, preservando também o fundo marrom presente nela. Esse novo pedido não retoma a edição cancelada de `Tera 1.png`.

- Cisto hemorrágico: imagem fornecida por Daniel em `assets/lesoes/cisto-hemorragico-referencia.png`.
- Endometrioma: imagem fornecida por Daniel em `assets/lesoes/endometrioma-referencia.png`.
- Adenomiose 1: imagem fornecida por Daniel em `assets/lesoes/adenomiose-1-referencia.png`.
- As três imagens foram copiadas sem alteração e têm transparência. As opções foram acrescentadas à biblioteca de `experimento-editor.html`, com os controles existentes de posição, tamanho, rotação e medidas.
- Campo opcional “Nome da lesão no mapa” nos ajustes de cada lesão. O nome aparece acima das medidas; nome e medidas são arrastados juntos. Cada lesão conserva seu próprio nome durante a montagem. O nome também entra na captura da montagem enviada à IA.
- Verificação no Chrome, com tela de 390 × 844, em `tests/editor-manual-nomes.html`: nomes independentes, seleção, texto seguro, captura, remoção e medidas passaram. Campo, código e estilo foram conferidos na página publicada.

Commits das entregas: `1b4eb67`, `2f71643`, `b1e5a7c`, `d585b16`, `cd3e90e`, `922ae1e`, `cf8003f`, `d50ce00`, `c746dc8`, `86a9f1d` e `c2a59d2`.

Editor de teste: https://experimento-editor-manual.endomapa.pages.dev/experimento-editor?versao=c2a59d2

Ramo de trabalho e publicação: `experimento-editor-manual`. A publicação ocorre por envio desse ramo ao GitHub.

## Pedido cancelado e próxima sessão

Daniel pediu ampliar `Tera 1.png`, remover a legenda e tornar o fundo transparente. A ferramenta produziu duas versões com quadriculado desenhado, sem transparência real. Daniel cancelou essa lesão: não adicioná-la ao editor e não continuar o recorte. As versões geradas não foram incorporadas ao projeto.

Último pedido: salvar e publicar tudo até aqui, após a substituição de Aderências 1. Foram concluídos também Teratoma, os dois DIUs com tamanho inicial de 150% e Aderência 2, 3 e 4 como opções separadas. Todos os recursos pedidos estão salvos no histórico e publicados no editor de teste. Nenhuma próxima lesão ou mudança foi escolhida. Na retomada, seguir o editor manual e pedir o próximo item desejado, sem retomar a edição cancelada de `Tera 1.png`.

Os arquivos não rastreados em `.ferramentas-publicacao/`, `supabase/.temp/` e os cinco mapas soltos em `assets/` já apareciam antes das alterações de hoje. Não foram incluídos nesta publicação; preservar os arquivos locais.

## Histórico — 8 de setembro de 2026

Daniel escolheu a imagem completa `mapa-gerado-v1.png` e autorizou salvar e publicar.

Naquela sessão, a referência selecionada foi esse arquivo integral, inclusive o cisto e a lesão do ligamento. Não confundir com `mapa-integrado-v1.png`, outras montagens ou o estudo isolado `ligamento-integracao-v1.png`. A direção atual está registrada acima.

SHA-256 do arquivo selecionado: `C657BF10D853CB209CA8337D4085B2A8BB8AF794BD866E603C7C2D2A9095A8ED`.

Publicação na versão de teste, ramo `experimento-editor-manual`:

- Imagem: https://experimento-editor-manual.endomapa.pages.dev/output/estudos-realismo/mapa-gerado-v1.png
- Editor com acesso à imagem: https://experimento-editor-manual.endomapa.pages.dev/experimento-editor

As demais imagens e montagens desta pasta são histórico dos estudos. Os pedidos usados na geração estão em `PROMPTS.md`. A imagem selecionada é um resultado visual estático; sua seleção não modifica o funcionamento da geração de lesões no editor.
