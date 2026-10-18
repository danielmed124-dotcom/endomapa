# Inclinação do útero — experimento local

Em 17/10/2026, Daniel pediu repetir o processo dos ovários em um projeto separado e escolheu inclinar o corpo uterino mantendo o colo como apoio. Não autorizou integração ou publicação.

Página: `experimentos/utero-sagital/index.html`, acessível pelo servidor local em `http://localhost:8767/experimentos/utero-sagital/index.html`.

## Integração local autorizada — 17/10/2026

Atualização posterior: Daniel aprovou a integração e autorizou publicação, junto de ajustes no catálogo. Retrofletido retirado das novas opções; compatibilidade de mapas salvos mantida. Mioma passa a Leiomioma nos nomes; Adenomiose 1 passa a Adenomiose e troca de posição com Cisto hemorrágico. Quatro testes passaram novamente, incluindo compatibilidade de montagem antiga do retrofletido e normalização de rótulo antigo. A restrição de publicação abaixo descreve a etapa anterior.

Daniel aprovou o acabamento e solicitou inserir no sagital os botões “Movimentar útero” e “Restaurar posição original” no mesmo local dos ovários. Autorização substitui a restrição de integração do histórico; publicação continua não autorizada.

- `utero-motor.js`: motor extraído do experimento aprovado, usando `orgaos-deformar.js` (idêntico ao deformador do teste). Camada transparente sobre a base da conta; em zero fica vazia, preservando a imagem original.
- `assets/utero-fundo-aprovado.png`: cópia exata do fundo aprovado do experimento.
- `utero-editor.js`: barra à direita, arraste/toque, teclado, limites, restauração, captura independente, validação e troca de conta. Movimentação bloqueada durante exportação/operação da biblioteca.
- `editor-manual.js`: caneta e movimento exclusivos, vínculo por centro das lesões com coordenadas originais, acompanhamento de posição e restauração, persistência e compatibilidade com mapas antigos, captura para PNG/JPEG/PDF e limpeza do sagital. Lesões acompanham o centro; seus próprios tamanho e rotação permanecem ajustáveis. Rótulos mantêm a posição escolhida.
- `app.html`: carrega os dois scripts após o motor dos ovários; versão do editor manual atualizada para evitar cache antigo quando houver publicação futura.

Verificações: `utero-integrado`, `editor-manual-integrado`, `pdf-manual`, `historico-manual` passaram. Novo teste cobre celular, botões, toque/cancelamento/segundo ponteiro, lesão vinculada, restauração, captura imutável, montagem salva/reaberta, rejeição de ângulo inválido, montagem antiga, PDF completo com imagem idêntica ao PNG, cinza na tela/exportação, caneta, limites e contas. Testes não gravam exames reais; biblioteca usa o ambiente simulado já existente.

Prévia do editor real sem login/serviços externos: `http://localhost:8767/output/previa-utero-sagital/editor.html` (HTTP 200 conferido). Abre no sagital, com anatomia neutra e todos os controles locais. Botões de biblioteca permanecem visíveis como no aplicativo, mas essa prévia não se conecta à conta nem grava exames. Scripts de montagem em `output/previa-utero-sagital/integrar.py` e `preparar-editor.py`; arquivos finais de integração estão na raiz. Não executar novamente o gerador para sobrescrever ajustes posteriores sem revisão.

Integração apenas no disco local. Nada foi enviado ao GitHub ou publicado. Aguarda teste visual de Daniel antes da próxima decisão.

## Primeira versão

- Usa a base neutra `assets/mapa-base-sagital-novo-visitante-suave.png` (1087 × 1447), sem alterar a imagem original.
- Recorte vetorial local, borda suave de 1 pixel e cópia isolada do deformador utilizado nos ovários. Não carrega scripts da aplicação autenticada, serviços remotos ou IA.
- Apoio inicial em x=650, y=640. Corpo superior gira; o peso do giro diminui suavemente de y=555 a y=655, mantendo a região inferior fixa. Ponto de apoio e recorte são hipóteses visuais para avaliação de Daniel, não demarcações clínicas validadas.
- Controles de −25° a +40°, botões de passo 2°, teclado (setas de passo 1°, Home restaura), arraste por ponteiro/toque e indicação opcional do apoio.
- Em 0°, desenha diretamente a base original; restauração é exata. Fora da área móvel, mantém os pixels da base. Movimentos maiores podem sobrepor estruturas vizinhas.
- Como não existe base sem útero, a área descoberta usa um gradiente com tons amostrados do fundo adjacente. A faixa lisa é provisória e visível; não representa reconstrução anatômica. Conexões com trompa e tecidos vizinhos não acompanham o útero nesta primeira avaliação.
- Não inclui lesões, salvamento, exportação, login ou integração ao editor. Recarregar reinicia o teste.

## Verificação

## Continuidade da linha posterior — 17/10/2026

Daniel marcou interrupção da linha branca na borda posterior superior. Recorte ajustado aos pixels externos da linha original entre aproximadamente y=450 e y=560, preservando o peritônio na camada móvel sem redesenho. Borda anterior aprovada e mecanismo de movimento mantidos. Teste `utero-sagital` passou; limites continuam −9° e +110,5°. Detalhe ampliado em +20° inspecionado em `output/previa-utero-sagital/linha-posterior-detalhe.png`; capturas e cópia anterior `antes-linha-posterior.js` na mesma pasta. Somente experimento local.

## Limite posterior pela parede do reto — 17/10/2026

Daniel aprovou o acabamento, mas informou que o teto de 90° parava antes da parede anterior do reto após a suavização. Substituído por busca do primeiro contato com uma demarcação geométrica da parede anterior externa nesta base, em passos de 0,25°. Limite resultante: +110,5°; limite anterior atual: −9°. Mantidos recorte/peritônio, fundo e ligação gradual de 190 pixels. A indicação do controle informa o contato posterior.

Teste atualizado passou: alcance maior que 90°, ausência de invasão do reto no limite, contato no passo seguinte, percurso completo em passos de 0,25° sem invadir reto ou bexiga, restauração e controles. Captura final inspecionada em `output/previa-utero-sagital/limite-reto-3.png`. Demarcação visual de teste, aguardando avaliação de Daniel; não representa medição clínica. Sem integração/publicação.

## Faixa verde anterior — 17/10/2026

Após nova imagem marcada por Daniel, recorte anterior alinhado à borda externa da linha clara original, especialmente entre y=490 e y=580 da base. Retirada a faixa verde que acompanhava o útero; peritônio preservado sem redesenho ou alteração de cor. Movimento e fundo mantidos. Teste `utero-sagital` passou; detalhe ampliado inspecionado em `output/previa-utero-sagital/borda-anterior-detalhe.png`, além das quatro capturas `borda-anterior-0.png` a `3.png`. Cópia anterior em `antes-borda-anterior.js` na mesma pasta. Ajuste local aguardando avaliação.

## Acabamento das regiões marcadas — 17/10/2026

Daniel enviou `Downloads/Imagem1.jpg` marcando a borda superior e duas saliências laterais. Refinado o recorte superior para reduzir a faixa externa mantendo a linha original; removida a pequena reversão da curva anterior junto ao colo. Limpeza do fundo passa a incluir a margem do contorno móvel, com transição junto ao apoio. Curvatura distribuída em 190 pixels, com entrada/saída graduais de 24 pixels, para reduzir a dobra da borda interna nas inclinações maiores. Substitui a ligação circular de 130 pixels descrita no histórico abaixo. Colo inferior e apoio mantidos fixos; o alcance posterior continua +90° no controle, com percurso ligeiramente diferente pela suavização.

Teste `utero-sagital` passou na versão final. Capturas em `output/previa-utero-sagital/acabamento-0.png` a `acabamento-3.png`; inspeção das posições +20° e +90° durante a revisão. Versão anterior preservada em `output/previa-utero-sagital/antes-acabamento.js`. Avaliação visual de Daniel pendente. Sem integração ou publicação.

## Peritônio acompanhando o útero — 17/10/2026

Daniel esclareceu que a linha do peritônio deve acompanhar o útero, não permanecer no fundo. Recorte móvel ampliado até imediatamente por fora da linha clara original, incluindo a borda anterior junto à transição para o colo. A linha vem dos pixels da imagem original e recebe a mesma transformação do corpo; não foi redesenhada. Fundo aprovado e mecanismo de movimento mantidos. O limite anterior continua calculado pelo novo contorno.

Teste `utero-sagital` passou após o ajuste: apoio/colo fixos, largura preservada, limites junto à bexiga, restauração exata, arraste, teclado e largura de celular. Capturas em `output/previa-utero-sagital/peritoneo-0.png` até `peritoneo-3.png`; inspecionadas posições +40° e +90°. Ajuste apenas local; acabamento aguarda avaliação de Daniel.

## Limpeza de fantasmas e limites — 17/10/2026

Daniel marcou resíduos junto ao fundo uterino e ovário, pediu maior alcance posterior e limite anterior na bexiga. Máscara de limpeza agora independente do recorte móvel: recompõe a posição antiga e a junção com o ovário com o fundo aprovado, protegendo a silhueta vesical. Recorte móvel mais interno exclui restos de estruturas vizinhas.

Movimento atualizado para uma ligação curva de 130 pixels, seguida de giro do corpo inteiro com largura preservada. O colo inferior permanece fixo. Substitui o antigo peso pela altura, que criava dobra em ângulos maiores. Alcance posterior de teste: +90°. Limite anterior calculado por contato do contorno com a silhueta vesical demarcada: −8° nesta base, verificado a cada 0,25° e arredondado para o lado seguro. É uma restrição geométrica do desenho, não uma medição clínica. Botões Para frente e Para trás. Arraste identifica o contorno transformado.

Testes passaram para limite junto à bexiga, ausência de colisão do contorno em todo o percurso em passos de 1°, largura do corpo, apoio/colo fixos, restauração exata, teclado, arraste e celular. Inspeção de capturas +20°, +40°, +90° e −8° em `output/previa-utero-sagital/contorno-limites-0.png` até `3.png`. Acabamento dinâmico aguarda Daniel. Sem publicação.

## Revisão com fundo aprovado — 17/10/2026

Daniel aprovou a proposta de fundo gerada com a ferramenta integrada de imagens. Cópia preservada em `experimentos/utero-sagital/fundo-aprovado.png`. Aplicação restrita à máscara do útero original, preservando o restante do mapa e a região inferior fixa. O contorno passou a seguir o limite externo, sem o recorte incorreto pela cavidade interna. A geração é um recurso estático: o movimento continua por código, sem chamadas de IA.

Verificação automatizada passou novamente. Capturas em `output/previa-utero-sagital/fundo-aprovado-teste-0.png` até `2.png`. Inspecionada a posição +20°. Ainda requer avaliação do contorno em movimento, das sobreposições e da união com o colo. Nenhuma integração ou publicação autorizada nesta etapa.

`tests/utero-sagital.html`, executado por `tests/validar-fluxo-medico.ps1 -Testes utero-sagital -Captura`, passou: apoio e colo inferior fixos, alteração visível, pixels externos preservados, restauração exata, limites, dados inválidos, teclado, arraste, segundo ponteiro, cancelamento e largura de 390 pixels.

Prévia visual inspecionada em +20°. Capturas de −25°, +20° e +40° em `output/previa-utero-sagital/`. Testes simulam toque; o uso em celular físico e o acabamento anatômico dependem da avaliação de Daniel.
