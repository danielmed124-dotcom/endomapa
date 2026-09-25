# Especificação do MVP

## 1. O PROBLEMA

Médicos radiologistas gastam de dois a três minutos desenhando lesões manualmente em um mapa anatômico de papel.
Os desenhos feitos com canetinhas têm baixa definição anatômica e aparência pouco profissional.
O radiologista precisa produzir, com mais rapidez, um mapa profissional para exames de endometriose e fertilidade.

## 2. QUEM USA

O médico radiologista entra no sistema para ditar os achados de um exame e sair com mapas anatômicos coronal e sagital revisados, com as lesões e alterações descritas, em um PDF pronto para impressão.

Cada médico cria sua conta com nome completo, título profissional, e-mail e senha. Depois do login, entra diretamente na própria área de trabalho; o nome e o primeiro nome usado na assinatura vêm do perfil autenticado, sem seleção manual. A conta `danielmed124@gmail.com` usa a identidade Centrus MG, e os demais médicos usam mapas neutros, sem logomarca nem marca-d'água.

## 3. O QUE A PESSOA FAZ HOJE

O médico realiza o exame, identifica as lesões e depois as desenha manualmente, com canetinhas, sobre uma figura anatômica já impressa. Essa confecção leva de dois a três minutos e produz um resultado com pouca definição anatômica e aparência pouco profissional.

## 4. O QUE É SUCESSO

Em celular, tablet ou computador, o médico deve concluir todo o processo — do início do ditado ao PDF revisado e confirmado — em no máximo 60 segundos, e os 20 mapas de teste devem representar corretamente tipo, lado, localização e medidas dos achados, sem tolerância a erro.

**Regra permanente:** tudo deve funcionar primeiro no celular.

## 5. A FEATURE DE IA

Mais para a frente, a IA transformará o ditado médico ao vivo em instruções de lesões, medidas e relações anatômicas para montar o mapa, pedindo confirmação quando houver dúvida e exigindo que o médico confira e confirme o resultado antes de gerar o PDF.

## 6. FORA DE ESCOPO

Atualização de 24/09/2026 — montagem manual no Endomapa: por solicitação de Daniel, a geração de imagens realistas por IA fica adiada. Os botões, comparações e carregamentos de geração de imagens Gemini/GPT são retirados da interface principal. O editor manual passa a ser uma tela da área autenticada do Endomapa, acessível por **Montar mapa manualmente** e **Editor manual**. O endereço antigo do experimento encaminha para essa tela. Permanecem a biblioteca existente, a vista coronal, os ajustes de posição, tamanho e rotação, os nomes e as medidas. O download da montagem manual em PNG, já existente no experimento, passa a funcionar diretamente no navegador, sem depender de geração de IA. A imagem-base exibida e baixada acompanha a identidade do perfil conectado. O ditado permanece disponível. A montagem manual continua na aba e não é gravada no histórico; geração real de PDF e edição manual sagital não fazem parte desta transferência. O código dos experimentos fica preservado para eventual retomada, sem botões no fluxo do usuário. Esta decisão substitui as instruções anteriores de exibir geração realista no editor.

Atualização de 18/09/2026: por solicitação de Daniel, o editor manual e todos os recursos do ramo `experimento-editor-manual` foram incorporados ao projeto principal. Além do ditado, o médico pode abrir o editor manual, escolher imagens da biblioteca e ajustar posição, tamanho, rotação, nome e medidas. Os recursos de comparação por IA continuam experimentais e sujeitos à revisão do médico.

Atualização de 21/09/2026: no editor manual, o médico monta as lesões e usa o botão **Gerar mapa realista · pago**, que envia a própria montagem diretamente à API de imagens. A etapa de acabamento gratuito deixa de ser necessária. O sistema recoloca os nomes e as medidas, exibe a montagem original e a proposta para revisão e só solicita outra geração mediante novo clique explícito. Os experimentos anteriores ficam recolhidos.

Atualização posterior de 21/09/2026: por escolha explícita de Daniel, o botão principal passa a **Gerar mapa realista com Gemini · pago**, usando a integração Gemini já configurada. A preparação e a edição recebem a mesma captura PNG sem rótulos. O texto didático do pedido é mantido; não há redução dos filtros, troca automática de provedor ou repetição automática. A resposta é uma proposta para revisão médica, e uma falha preserva a montagem manual. O incidente anterior da OpenAI continua separado e não resolvido.

Revisão seguinte do prompt Gemini: Daniel solicitou acabamento mais integrado às lesões e preservação expressa do intestino, usando somente a montagem manual, sem imagem de referência. O prompt `gemini-local-v2` limita o acabamento às lesões e a uma faixa mínima de contato, preservando contornos, conteúdo, focos e detalhes amarelados da anatomia original. Trata-se de orientação ao modelo; essa mudança de texto não implementa proteção dos pixels por código.

Integração com desenho preservado: após observar lesões modificadas e inventadas na resposta do Gemini, Daniel escolheu manter um único botão de geração direta, sem aprovação por lesão, preservando o desenho manual. O prompt `gemini-contato-v3` solicita somente luz e sombra de contato. O editor captura a montagem e a transparência exata de cada lesão; protege por código o desenho inteiro, inclusive espaços entre focos do mesmo elemento, e todos os pixels fora de uma faixa externa estreita (4 pixels em um mapa de 1086 pixels de largura, máximo de 6). A imagem do Gemini fornece somente intensidade e direção suaves da iluminação nessa faixa, com variação máxima de 6%; seus pixels, formas, lesões e texturas não são copiados. As proteções são unidas em lesões sobrepostas. O acabamento possível é mais discreto, sem remodelar a lesão; uma faixa junto a um limite anatômico pode ajustar também o tom da estrutura adjacente, pois não existe identificação automática de órgãos. Os nomes e as medidas são recolocados pelo editor. Se não houver mudança aproveitável, o sistema informa e não apresenta o original como resultado novo. Há uma única chamada de geração por clique, sem referência adicional, mudança de modelo, repetição automática ou aprovação individual de lesões.

O servidor exige a versão de integração `contato-v1` antes da preparação e da geração direta. Uma aba antiga, sem a proteção, recebe orientação para salvar a montagem e abrir a versão atual; a tentativa é recusada antes de reservar cota ou chamar o Gemini. Essa verificação indica compatibilidade do editor, não validação clínica.

Refinamento interno autorizado: após o acabamento de contato resultar em mudança visual insuficiente, Daniel forneceu um novo prompt e autorizou sua aplicação com os ajustes analisados. A versão `gemini-refinamento-v4` permite refinar textura, brilho e sombreamento DENTRO das lesões e suas bordas, solicitando melhora perceptível sem modificar posição, dimensões, silhueta, quantidade de focos, ramificações ou padrões internos. A captura gera automaticamente a lista L1…Ln, com modelo da biblioteca, centro, tamanho, rotação e recorte no mesmo instante da montagem. O servidor valida os dados e acrescenta descrições visuais fixas, verificadas nas próprias figuras da biblioteca; nenhum nome livre, rótulo ou medida é enviado nessa lista. A API recebe uma única imagem, a montagem sem rótulos, sem referência visual adicional.

Nesta revisão, a proteção local permite aplicar a imagem gerada dentro da transparência original das lesões autorizadas, com transição proporcional ao alfa nas bordas, preservando os espaços vazios. Fora delas, permanece somente a faixa estreita de iluminação de contato já existente, derivada suavemente da resposta; o restante conserva os pixels da montagem. Os DIUs e os elementos não autorizados ficam protegidos, inclusive em sobreposições. Essa proteção delimita onde pode haver mudança; ela não verifica a correção dos novos detalhes internos, que devem ser conferidos no mapa final. O fluxo continua com um botão e uma geração por clique, sem aprovação individual. Uma resposta sem alteração interna não é exibida como refinamento novo. Preparação e geração usam a mesma imagem, lista e autorizações, vinculadas pelo resumo criptográfico do prompt completo. A compatibilidade exigida passa a `refinamento-v2`, recusando abas antigas antes de reservar cota ou chamar o Gemini. O modelo, a conta, os filtros e o provedor permanecem os configurados.

Comparação da resposta original (22/09/2026): a geração direta passa a exibir e permitir baixar três etapas: montagem manual com seus rótulos, imagem original recebida do Gemini e resultado final após os ajustes do Endomapa. O arquivo original do Gemini mantém os bytes e o formato recebidos, sem redimensionamento, composição ou rótulos acrescentados pelo aplicativo. Essa imagem serve para comparação e pode conter mudanças de anatomia ou lesões que a proteção local descartou. Ela fica disponível também quando o refinamento local falha ou não produz mudança interna, desde que a resposta seja uma imagem válida. As três etapas aproveitam a mesma geração, sem nova chamada de IA ao visualizar ou baixar. Uma nova tentativa limpa os dados da comparação anterior antes do envio, e os experimentos antigos não reutilizam essa resposta. Os arquivos ficam disponíveis na aba; não há recuperação retroativa da resposta original de gerações passadas nem armazenamento adicional no servidor. Modelo, prompt e regras de composição permanecem os configurados.

Correção dos códigos desenhados pelo Gemini (22/09/2026): a revisão `gemini-refinamento-v5` retira do prompt os identificadores internos das lesões, os nomes dos arquivos e os nomes dos botões da biblioteca. Esses dados continuam sendo validados pelo editor e pelo servidor; a lista enviada ao modelo usa somente posição, dimensões, rotação, recorte, descrição visual e autorização. Mantém todos os elementos, inclusive os protegidos. O objetivo é retirar do pedido a fonte dos códigos que o Gemini desenhou indevidamente. A mudança não comprova melhoria de acabamento nem garante ausência de textos gerados. A composição continua protegendo áreas externas às lesões, mas não reconhece letras ou outros conteúdos inventados dentro delas. Nenhuma nova geração faz parte da validação desta correção.

Avaliação reversível do Gemini Pro (22/09/2026): Daniel autorizou trocar o botão principal para `gemini-3-pro-image`, solicitando saída em 2K e proporção 3:4, com retorno ao Lite se a avaliação não funcionar. O Pro usa seu raciocínio padrão, sem o parâmetro `minimal` da configuração Lite. O prompt `gemini-refinamento-v5`, a montagem única enviada, a composição protegida e a comparação das três etapas são mantidos para esta avaliação. O arquivo original devolvido pelo Pro conserva sua resolução; o mapa final mantém as dimensões da montagem manual para preservar os pixels fora das lesões. A tela identifica o Gemini Pro e confere modelo e tamanho na preparação, antes da chamada paga. A compatibilidade `refinamento-pro-v1` impede abas antigas de acionar o modelo mais caro sem a identificação correspondente. Não há geração automática durante a publicação, repetição após falha nem retorno automático ao Lite. Experimentos anteriores continuam com sua configuração Lite. Configuração anterior e procedimento de retorno estão registrados em `docs/avaliacao-gemini-pro.md`.

Retorno após avaliação do Pro: Daniel apresentou uma resposta com novos agrupamentos escuros fora das lesões originais e alteração do desenho interno de uma lesão circular; o resultado final descartou as novidades externas, mas manteve a alteração interna e não alcançou o acabamento esperado. Conforme a autorização de retornar se a avaliação não funcionasse, o botão principal volta ao `gemini-3.1-flash-lite-image`, com saída 1K, proporção 3:4 e `thinkingLevel: "minimal"`. A função identifica `gemini-lite-retorno-v1` e exige `refinamento-lite-v3`, interrompendo abas Pro antes de reservar cota ou gerar. A interface identifica Gemini Lite e confere o modelo e o tamanho na preparação. Prompt v5, preservação espacial, comparação e montagem manual são mantidos. A reversão não resolve a limitação de fidelidade interna nem representa nova validação de qualidade. Não há geração real como parte da reversão. A avaliação e suas limitações estão em `docs/avaliacao-gemini-pro.md`.

Revisão do acabamento de superfície: após novo resultado Lite com traços escuros não existentes e deformação do útero, Daniel solicitou revisão do prompt. A versão `gemini-superficie-v6` especifica uma operação de pintura local: harmonizar reflexos, iluminar volumes já desenhados, ajustar microtextura e tratar a borda pelo lado interno. Substitui o pedido amplo de relevo/profundidade por instruções concretas de iluminação da superfície existente. Mantém silhueta, organização interna, lista dinâmica, autorizações, montagem única, modelo Lite 1K e composição protegida. Não há imagem adicional, aprovação por lesão ou nova geração na implantação. A revisão de texto não comprova melhoria visual nem garante fidelidade do modelo. O texto de leitura está em `docs/prompt-gemini-superficie-v6.txt`, com os campos dinâmicos explicitamente marcados; não é registro de uma chamada real.

- Cadastro ou identificação de pacientes.
- Histórico de exames.
- Integração com sistemas de laudos.
- Interpretação dos achados, sugestão de diagnóstico ou escrita automática do laudo.
- Envio de gravações prontas; o ditado será somente ao vivo.
- Exportação em PNG, JPEG ou outros formatos além de PDF.
- Substituir o fluxo de ditado pelo editor manual; ambos permanecem disponíveis.
- Representação de estruturas além de útero, ovários, tubas uterinas, ligamentos uterossacros, região retrocervical, reto/sigmoide, bexiga e recessos pélvicos.
- IA inventando uma aparência diferente para cada exame; será usada uma aparência visual aprovada para cada categoria de lesão.
- Painel de vendas, cobrança ou administração de várias clínicas na mesma instalação.
- Cadastro e configuração de identidades visuais para outras clínicas; nesta etapa, somente a conta definida do proprietário usa Centrus MG e as demais usam mapas neutros.

## 7. CASOS DE BORDA

- **Mapa vazio, sem nenhuma lesão:** não gerar o PDF e avisar ao médico que nenhum achado foi informado.
- **Medida igual a zero ou negativa:** não inserir a lesão e pedir ao médico uma medida válida por voz.
- **Nome obrigatório em branco:** não iniciar o ditado enquanto o médico não selecionar seu nome na lista.
- **Dois toques rápidos em confirmar e gerar PDF:** aceitar somente o primeiro comando e gerar apenas um PDF.
