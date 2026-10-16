# SOMP — procedimento aprovado e continuidade

## Estado atual — publicação autorizada

Apresentação dos botões: a pedido de Daniel durante a publicação, ambos os nomes usam exatamente duas linhas, com `SOMP` na primeira e `esquerdo`/`direito` na segunda. A quebra é explícita e cada palavra permanece inteira.

Em 16/10/2026, Daniel aprovou também o lado direito e autorizou inserir e publicar ambos no Endomapa. Ordem: Cisto → SOMP esquerdo → SOMP direito → Cisto hemorrágico. Tamanhos iniciais: esquerdo 95%, direito 100%. Esta autorização substitui as observações históricas abaixo sobre aguardar aprovação. A publicação usa somente os arquivos desta entrega, sem as alterações locais anteriores de outras tarefas.

Registro de 16/10/2026. Daniel aprovou o resultado do lado esquerdo e pediu que todo o caminho fosse salvo para repetir no lado direito quando enviar a referência. Não gerar o lado direito por espelhamento ou por suposição: aguardar a imagem enviada.

## Pedido e referência

- Isolar o conjunto de 20 folículos desenhados sobre o ovário indicado por Daniel como esquerdo, mantendo organização, tamanhos relativos e proporção em relação ao ovário.
- Referência: `C:/Users/Daniel/Downloads/endomapa-manual-coronal.jpg`, 1086 × 1448 pixels.
- O conjunto está à esquerda de quem olha a imagem. Preservar a nomenclatura escolhida pelo usuário, sem inferir outra lateralidade.
- Preparar prévia e inserir no Endomapa somente depois da aprovação.

## Tentativas e aprendizado

1. A edição por IA tentou remover a anatomia e preservar apenas os folículos. Duas versões alteraram a escala e o desenho. Não foram aprovadas nem integradas.
2. Com autorização de Daniel, o recorte passou a ser feito por processamento determinístico. Python não estava disponível; foram usados PowerShell e System.Drawing do Windows, sem instalar dependências. Daniel autorizou instalar Python caso necessário, mas isso não foi necessário.
3. `output/previa-somp-esquerdo/recortar.ps1` selecionou pixels azuis na região x=250…399 e y=610…806, com B−R>12 e B−G>12. Preservou os valores RGB dos pixels mantidos, mas o recorte binário produziu bordas serrilhadas. O conjunto extraído ocupa x=260, y=618, largura=131 e altura=180. Foram mantidos 11.192 pixels, sem divergência RGB.
4. `suavizar.ps1` ampliou o recorte 4 vezes com interpolação bicúbica e margem transparente. Melhorou a apresentação, mas não recuperou detalhes ou contornos da imagem pequena. Daniel rejeitou essa solução por continuar serrilhada e com baixa resolução.
5. Daniel autorizou reconstruir o conjunto usando o folículo azul original da biblioteca. Essa foi a solução aprovada: reutilizar a imagem detalhada, posicionando 20 instâncias segundo a referência, sem IA.

## Solução aprovada

- Imagem-fonte: `assets/lesoes/foliculo.png`, 1254 × 1254 pixels; usar sua cor e transparência atuais, sem aplicar novamente a conversão para azul ou o fator de opacidade.
- Gerador reproduzível: `output/previa-somp-esquerdo/reconstruir.ps1`.
- O gerador determina os limites visíveis do original com alfa ≥ 8 e desenha cada instância com interpolação bicúbica de alta qualidade.
- Os centros e tamanhos foram medidos visualmente na referência. São aproximações de desenho, não medidas clínicas nem uma segmentação exata.
- A ordem abaixo é a ordem de desenho, preservando as sobreposições previstas.

| Folículo | Centro X | Centro Y | Largura | Altura |
| --- | --- | --- | --- | --- |
| 1 | 359 | 631 | 24 | 27 |
| 2 | 331 | 648 | 47 | 50 |
| 3 | 373 | 660 | 29 | 33 |
| 4 | 302 | 662 | 20 | 19 |
| 5 | 292 | 689 | 29 | 33 |
| 6 | 319 | 684 | 25 | 28 |
| 7 | 371 | 686 | 23 | 26 |
| 8 | 358 | 702 | 22 | 21 |
| 9 | 375 | 712 | 30 | 34 |
| 10 | 280 | 713 | 25 | 27 |
| 11 | 300 | 722 | 25 | 27 |
| 12 | 350 | 730 | 21 | 20 |
| 13 | 370 | 740 | 25 | 29 |
| 14 | 268 | 736 | 19 | 21 |
| 15 | 278 | 752 | 30 | 32 |
| 16 | 305 | 760 | 25 | 26 |
| 17 | 348 | 766 | 30 | 33 |
| 18 | 287 | 778 | 26 | 27 |
| 19 | 326 | 781 | 26 | 26 |
| 20 | 307 | 788 | 20 | 20 |

As coordenadas usam pixels da referência original. A área de composição começa em x=254, y=612 e mede 143 × 192. O fator de renderização é 8, produzindo PNG transparente de 1144 × 1536, com proporção 143:192.

## Arquivos preservados

Todos os estudos ficam em `output/previa-somp-esquerdo/`:

- `recortar.ps1`, `suavizar.ps1`, `reconstruir.ps1`: procedimentos reproduzíveis.
- `somp-esquerdo-camada-original.png`, `somp-esquerdo-recorte.png`, `somp-esquerdo-suavizado-4x.png`: tentativas anteriores.
- `comparacao.png`, `comparacao-bordas.png`: comparações anteriores.
- `somp-esquerdo-biblioteca-8x.png`: imagem aprovada.
- `comparacao-biblioteca.png`: referência e reconstrução lado a lado.
- `posicao-original.json`, `posicao-suavizada.json`, `posicao-biblioteca.json`: coordenadas, dimensões e observações de cada etapa.
- `servir-teste.ps1`: servidor local restrito a localhost, porta 8767.

A imagem aprovada foi copiada para `assets/lesoes/somp-esquerdo.png`. As alterações de tamanho no editor não modificam esse PNG.

## Integração e decisões finais aprovadas

- `app.html`: botão **SOMP esquerdo**, imediatamente depois de **Cisto** e antes de **Cisto hemorrágico**.
- Imagem: `assets/lesoes/somp-esquerdo.png?v=1`.
- Proporção: `0.7447916666666666`; sem recorte elíptico.
- Tamanho inicial final: **95%**, solicitado e aprovado por Daniel. Mínimo: 5%.
- Centro no coronal: x=29,97237569%, y=48,89502762%.
- O editor define a largura a 100% como 13% da largura do mapa. A 95%, a largura é 12,35% do mapa. Esse tamanho final foi aprovado visualmente; não confundir a área da referência de 143 pixels com a largura efetiva final do editor.
- `editor-manual.js`: ao clicar no botão, aplica x/y iniciais somente quando `data-vista-inicial` corresponde à vista ativa. Nas outras vistas, conserva o posicionamento padrão ajustável.
- Os 20 folículos são um único elemento: mover, girar, redimensionar e excluir afetam o conjunto.
- A versão de carregamento do editor em `app.html` passou a `somp-esquerdo-1`.
- Não foi adicionado reconhecimento por voz para SOMP.
- Nada foi publicado no site remoto. As mudanças estão salvas na pasta local, sem commit criado nesta conversa.
- Havia alterações prévias em `AGENTS.md` e `supabase/functions/interpretar-ditado/index.ts`; elas não fazem parte deste trabalho e não devem ser incluídas inadvertidamente em uma publicação ou commit futuro.

## Testes e avaliação do usuário

`tests/somp-esquerdo.html` carrega o editor real em uma cópia local sem autenticação e sem histórico da conta. Insere SOMP automaticamente, confere imagem de 1144 pixels de largura, posição, escala, proporção, ausência de transbordamento no celular, validação da montagem e captura PNG. Permite alternar a largura de celular/computador e testar os controles reais.

Execução no Windows:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tests/validar-fluxo-medico.ps1 -Testes somp-esquerdo -TempoVirtual 30000
powershell -NoProfile -ExecutionPolicy Bypass -File tests/validar-fluxo-medico.ps1 -Testes editor-manual-integrado -TempoVirtual 45000
```

Ambos passaram na integração inicial a 100%. Após o ajuste para 95%, a expectativa de escala do teste foi atualizada e Daniel aprovou visualmente; não houve nova execução automatizada após essa alteração simples. A conferência de diferenças não apontou erros de formatação.

O Chrome precisou de execução fora do ambiente restrito, pois o Windows recusou a criação de seus processos internos. Scripts PowerShell foram executados com liberação apenas no processo, sem alterar a política permanente do Windows.

Para reabrir o teste, iniciar `servir-teste.ps1` se necessário e acessar:

`http://localhost:8767/tests/somp-esquerdo.html?visual`

O servidor foi iniciado em segundo plano; sua continuidade depende da sessão do computador. Não reutilizar identificadores antigos de processo sem conferir qual programa está em execução.

## Próximo passo: lado direito

**Atualização — lado direito preparado em 16/10/2026:** Daniel enviou `C:/Users/Daniel/Downloads/endomapa-manual-coronal-a4 (5).pdf` e pediu SOMP direito na biblioteca. Confirmou que deve ficar depois de SOMP esquerdo. A solicitação atual autorizou disponibilizá-lo no teste local, ainda sujeito à avaliação visual final e sem publicação remota.

- PDF de uma página A4, renderizado pelo leitor do Windows. Sua imagem RGB interna de 1086 × 1448 foi extraída sem redimensionamento por `output/previa-somp-direito/extrair-referencia.ps1` (objeto 19, FlateDecode, preditor PNG 11). O extrator valida o formato específico; não é um leitor genérico para outros PDFs.
- Referência preservada em `output/previa-somp-direito/referencia-original.png`; PDF renderizado e ampliação do ovário também estão nessa pasta.
- `output/previa-somp-direito/reconstruir.ps1` posiciona 20 instâncias independentes do original da biblioteca segundo a nova referência. O original de cada folículo é girado 180 graus para acompanhar o reflexo inferior observado; o conjunto esquerdo não foi espelhado.
- Coordenadas e dimensões completas: `output/previa-somp-direito/posicao-biblioteca.json`, além do próprio gerador.
- Área de composição na referência: x=695, y=626, largura=141, altura=194. Renderização 8 vezes: 1128 × 1552 pixels, PNG transparente.
- Imagem: `output/previa-somp-direito/somp-direito-biblioteca-8x.png`, copiada para `assets/lesoes/somp-direito.png`. Comparação: `output/previa-somp-direito/comparacao-biblioteca.png`.
- Botão em `app.html`: depois de SOMP esquerdo, antes de Cisto hemorrágico. Proporção 141:194; tamanho inicial 100%, mínimo 5%, centro coronal x=70,48802946593%, y=49,9309392265193%. A largura padrão do editor (141,18 pixels em mapa de 1086) aproxima a área de 141 pixels medida na referência. O tamanho de 95% do esquerdo não foi aplicado automaticamente ao direito.
- `tests/somp-direito.html` prepara a avaliação interativa. Testes de direito a 100% e esquerdo a 95% passaram: carregamento, posição, proporção, escala, celular, validação da montagem e captura PNG.
- Acesso local: `http://localhost:8767/tests/somp-direito.html?visual`, com o mesmo servidor local usado no lado esquerdo.

O roteiro abaixo registra o plano original, agora executado até o teste local do lado direito:

1. Aguardar e inspecionar a referência que Daniel enviará; conferir quantidade, distribuição, dimensões e lado indicado por ele.
2. Usar o folículo azul original da biblioteca. Não repetir as tentativas rejeitadas de geração por IA ou ampliação do recorte pequeno.
3. Medir os centros e tamanhos da nova referência, preservar a ordem de sobreposição e registrar os valores em um gerador próprio para o lado direito.
4. Renderizar em alta resolução, com fundo transparente, e apresentar comparação ampliada. Manter separados os arquivos do lado esquerdo aprovado.
5. Obter aprovação da nova imagem antes de integrá-la, conforme o fluxo estabelecido. O tamanho final de 95% foi aprovado para o esquerdo; conferir visualmente a escala do direito em sua referência, sem presumir igualdade.
6. Após autorização de integração, testar no editor, incluindo celular, captura e proporções. Publicação remota continua sendo uma etapa separada.
