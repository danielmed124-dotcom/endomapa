# Teste local de trompas e ovários móveis

## Integração autorizada — 16/10/2026

Daniel aprovou a revisão 9 e autorizou publicar no editor coronal para todas as contas. A autorização substitui as restrições de publicação registradas no histórico abaixo. A interface integrada usa somente “Movimentar ovários” e “Restaurar posições originais”, à direita de “Inserir lados (direito/esquerdo)”.

Arquivos de produção: `orgaos-deformar.js` (reamostragem aprovada), `orgaos-motor.js` (composição transparente), `orgaos-editor.js` (interação). O editor manual salva posições/vínculos, acompanha lesões localizadas sobre os ovários e inclui a camada anatômica antes das lesões nas exportações, inclusive escala de cinza. Rótulos de medida conservam suas posições e as linhas de ligação são recalculadas. A captura é feita no instante do clique. A anatomia de fundo e a identidade da conta são preservadas fora da área móvel. A página experimental continua separada como registro visual.

Verificação integrada em `tests/ovarios-editor.html`: botões e toque em largura de celular, movimento cruzado, associação de lesões, restauração, PNG/JPEG/PDF, salvamento e reabertura, montagens antigas, dados inválidos, troca de conta e exclusividade com caneta. O executor agora rejeita saída vazia do navegador.

Daniel autorizou em 16/10/2026 um teste separado: mapa coronal, cada ovário acompanhado de sua trompa e das lesões associadas, com restauração da posição original. Não autorizou integrar esta experiência ao editor publicado.

Página: `experimentos/orgaos-moveis/index.html`. Código e estilos próprios na mesma pasta. Acessível com o servidor local existente em `http://localhost:8767/experimentos/orgaos-moveis/index.html`. Se o servidor não estiver ativo, usar `output/previa-somp-esquerdo/servir-teste.ps1`.

## Funcionamento

- Selecionar conjunto esquerdo ou direito e arrastar pelo ovário, usar os botões de seta ou as teclas de seta com foco no mapa.
- Adicionar SOMP, folículo, cisto, endometrioma, cisto hemorrágico, teratoma ou corpo lúteo ao conjunto selecionado.
- As lesões guardam coordenadas relativas ao conjunto: acompanham o deslocamento automaticamente. A associação é explícita na inserção, sem inferência por IA ou proximidade.
- Ativar **Ajustar lesões** para arrastá-las individualmente, conservando sua associação. Excluir remove apenas a lesão selecionada.
- **Restaurar posições originais** zera os deslocamentos dos conjuntos e leva as lesões junto, sem apagá-las. Ajustes relativos feitos nas lesões são preservados.
- Não há salvamento na conta, carregamento de exames, exportação clínica ou chamada de API neste experimento. Recarregar a página reinicia o teste.

## Composição visual

### Revisão após avaliação de Daniel

**Revisão 9 — atravessar o centro:** Daniel aprovou as curvas e pediu maior alcance para o lado oposto. O limite horizontal interno passa de 220 para 530 pixels em ambos os conjuntos (esquerdo até +530; direito até −530). Os limites para fora e verticais permanecem iguais. Teste verifica arraste dos dois conjuntos para o lado oposto, lesão vinculada, calibre, limite e restauração; captura inclui os conjuntos cruzados. Prévia `?versao=9`, somente local.

**Revisão 8 — quinas ao elevar os ovários:** após aprovação do acabamento, Daniel marcou duas quinas na imagem `download (6).png`. O arco lateral usa seno ao quadrado para terminar com inclinação nula; a região de transição recebe suavização gradual do eixo apenas em elevações maiores que 100 pixels. As seções continuam perpendiculares e de largura constante. Na sobreposição de seções da mesma faixa, a amostra de maior cobertura prevalece, impedindo que uma borda transparente recorte o tecido já desenhado. Parâmetros de transparência aprovados preservados. Testes passaram e a captura foi conferida com ambos os ovários em −360 pixels, aproximando a referência. Prévia `?versao=8`, somente local.

**Revisão 7 — duas bordas da trompa direita:** conforme as marcas vermelhas da imagem `download (5).png`, suavização localizada da borda interna nos trechos de origem y=525–635 e y=720–780. Máscara acompanha a textura deformada, com largura de 10 pixels, desfoque de 3 pixels e atenuação máxima de 65%. Sem mudança dos parâmetros globais, da trompa esquerda, dos ovários ou dos ligamentos. Captura adicional aproxima o deslocamento mostrado por Daniel (direito −220,+90). Prévia `?versao=7`, somente local.

**Revisão 6 — resíduo superior e destaque à esquerda:** a limpeza da posição antiga passa a incluir os próprios trajetos das trompas e ligamentos, com margens suaves de 64 e 42 pixels, além do contorno amplo anterior. Isso cobre bordas que podiam permanecer estáticas. Trompa esquerda móvel com opacidade de 90% e atenuação de borda de 1,5; direita conserva o acabamento anterior. Calibre, trajetória móvel e recorte ovariano mantidos. Prévia `?versao=6`, somente local, para avaliação de Daniel.

**Revisão 5 — ajuste fino das bordas das trompas:** a pedido de Daniel, transparência mais suave, principalmente no conjunto esquerdo. Suavização de 2,8 pixels à esquerda e 2,3 à direita, com atenuação dos pixels parcialmente transparentes (expoentes de alfa 1,2 e 1,1). O centro opaco conserva a textura; os trajetos e calibres da malha permanecem iguais. Ligamentos e ovários conservam os parâmetros anteriores. Prévia `?versao=5`, somente local.

**Revisão 4 — extremidades e transparência:** Daniel rejeitou o acabamento da revisão 3: pontas e inserções incompletas e aparência de colagem. A malha anterior terminava no calibre central e cortava tanto os extremos arredondados quanto a transição de alfa. A malha agora inclui uma margem transparente de 7,2 pixels e semicículos texturizados nas duas extremidades. A suavização é de 1,8 pixel; o calibre central continua constante. Os trajetos incluem o prolongamento terminal das trompas junto aos ovários e o início dos ligamentos junto ao útero. Recortes centrais: trompas 30 pixels, ligamentos 14 pixels. O recorte ovariano aprovado permanece igual. Testes verificaram pontas após translação, desaparecimento gradual da borda, calibre e interações anteriores; captura conferida em deslocamentos para cima e para baixo. Prévia `?versao=4`, aguardando avaliação visual de Daniel. Não publicada.

**Revisão de calibre constante:** Daniel aprovou os ovários, mas apontou sombra nas trompas e afinamento/distorção de trompas e ligamentos durante o movimento. Agora cada estrutura tubular tem um eixo próprio amostrado a cada aproximadamente 2 pixels. O movimento altera somente esse eixo; as seções transversais são reconstruídas perpendicularmente à nova direção, com a mesma largura da seção de origem. A textura vem da própria imagem original, reamostrada em uma malha contínua. Trompas usam recorte de 26 pixels e ligamentos de 12 pixels da referência, com suavização de 0,6 pixel, retirando parte da faixa de sombra anteriormente incluída. Esses valores são parâmetros visuais, não medidas clínicas.

Os ovários usam o mesmo recorte elíptico aprovado, agora com translação rígida integral; nenhum eixo ou textura ovariana é esticado. Lesões continuam vinculadas à translação do conjunto. A curvatura em deslocamentos extremos permanece uma aproximação para avaliação. Testes medem a espessura visível de uma faixa inclinada/encurtada e verificam as seções de ambas as trompas e ligamentos em movimentos grandes para baixo e para cima. Revisão acessível com `?versao=3`, exclusivamente local.

Daniel apontou sombra espessa, linhas transversais nas trompas/ligamentos ao descer e limite insuficiente para subir. O recorte móvel passou a usar máscaras específicas dos ovários, trompas e ligamentos, suavizadas em 1,2 pixel, enquanto a máscara ampla de limpeza do fundo permanece separada. Isso reduz o tecido sombreado transportado com os órgãos.

`deformar.js` substitui a montagem por faixas `drawImage` por reamostragem contínua da textura em uma malha triangular. A interpolação considera a transparência, e os pixels são escritos em uma única imagem de saída, sem sobreposição de transparências nas emendas. Ao subir muito, a ligação faz uma curva lateral; a forma resultante ainda exige avaliação anatômica visual. O movimento vertical agora vai de −360 a +200 pixels, permitindo alcançar a região da bexiga. As posições das lesões continuam acompanhando a translação integral do ovário.

O teste adicional verifica uma textura uniforme para detectar frestas ou aumento de opacidade nas emendas, além do arraste até −310 pixels e da comparação visual de deslocamentos para baixo e para cima. Continua exclusivamente local.

Descrição da primeira versão, preservada como histórico:

A página reutiliza a base coronal neutra e o fundo já existente `assets/mapas-especiais/bilateral-cor-v3/ooforectomia-bilateral-neutro.png`, ambos de 1086 × 1448. Não houve geração de imagem por IA nem alteração dos arquivos originais.

Duas máscaras curvas no canvas delimitam conjuntos e sombras, suavizadas em 5 pixels. Onde um conjunto se move, o fundo alternativo cobre sua posição original; uma camada da imagem original acompanha o deslocamento. A união superior permanece fixa, com deslocamento progressivo entre y=470 e y=625; abaixo disso, ovário e lesões se deslocam sem mudança de tamanho. As máscaras também contêm uma pequena região de tecido de fundo; isto é uma aproximação visual para avaliação, não uma segmentação anatômica validada.

Limites de translação ilustrativa: esquerdo x entre −90 e 220, direito x entre −220 e 90; ambos y entre −80 e 150 pixels da referência. Não são medidas de mobilidade clínica. Deslocamentos amplos podem evidenciar diferenças de textura, sobreposições com estruturas fixas ou transições nas uniões. Precisam de revisão visual de Daniel antes de qualquer integração.

Os nomes esquerdo/direito seguem os rótulos aprovados para SOMP neste projeto. O teste não muda a convenção de lateralidade existente.

## Verificação

`tests/orgaos-moveis.html` verifica largura de celular, deslocamento independente, acompanhamento de lesões, teclado, restauração e exclusão. Execução pelo mesmo `tests/validar-fluxo-medico.ps1`. A captura visual inicial mostrou os conjuntos movidos para o centro e a lesão acompanhando o conjunto esquerdo. Isso não substitui testar o toque em um aparelho físico nem validar anatomia.

Arquivos da aplicação publicada permaneceram intactos. Não publicar ou integrar este experimento sem nova instrução.
