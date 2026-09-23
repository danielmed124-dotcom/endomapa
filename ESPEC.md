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

Atualização de 18/09/2026: por solicitação de Daniel, o editor manual e todos os recursos do ramo `experimento-editor-manual` foram incorporados ao projeto principal. Além do ditado, o médico pode abrir o editor manual, escolher imagens da biblioteca e ajustar posição, tamanho, rotação, nome e medidas. Os recursos de comparação por IA continuam experimentais e sujeitos à revisão do médico.

Atualização de 21/09/2026: no editor manual, o médico monta as lesões e usa o botão **Gerar mapa realista · pago**, que envia a própria montagem diretamente à API de imagens. A etapa de acabamento gratuito deixa de ser necessária. O sistema recoloca os nomes e as medidas, exibe a montagem original e a proposta para revisão e só solicita outra geração mediante novo clique explícito. Os experimentos anteriores ficam recolhidos.

Atualização posterior de 21/09/2026: por escolha explícita de Daniel, o botão principal passa a **Gerar mapa realista com Gemini · pago**, usando a integração Gemini já configurada. A preparação e a edição recebem a mesma captura PNG sem rótulos. O texto didático do pedido é mantido; não há redução dos filtros, troca automática de provedor ou repetição automática. A resposta é uma proposta para revisão médica, e uma falha preserva a montagem manual. O incidente anterior da OpenAI continua separado e não resolvido.

Revisão seguinte do prompt Gemini: Daniel solicitou acabamento mais integrado às lesões e preservação expressa do intestino, usando somente a montagem manual, sem imagem de referência. O prompt `gemini-local-v2` limita o acabamento às lesões e a uma faixa mínima de contato, preservando contornos, conteúdo, focos e detalhes amarelados da anatomia original. Trata-se de orientação ao modelo; essa mudança de texto não implementa proteção dos pixels por código.

Integração com desenho preservado: após observar lesões modificadas e inventadas na resposta do Gemini, Daniel escolheu manter um único botão de geração direta, sem aprovação por lesão, preservando o desenho manual. O prompt `gemini-contato-v3` solicita somente luz e sombra de contato. O editor captura a montagem e a transparência exata de cada lesão; protege por código o desenho inteiro, inclusive espaços entre focos do mesmo elemento, e todos os pixels fora de uma faixa externa estreita (4 pixels em um mapa de 1086 pixels de largura, máximo de 6). A imagem do Gemini fornece somente intensidade e direção suaves da iluminação nessa faixa, com variação máxima de 6%; seus pixels, formas, lesões e texturas não são copiados. As proteções são unidas em lesões sobrepostas. O acabamento possível é mais discreto, sem remodelar a lesão; uma faixa junto a um limite anatômico pode ajustar também o tom da estrutura adjacente, pois não existe identificação automática de órgãos. Os nomes e as medidas são recolocados pelo editor. Se não houver mudança aproveitável, o sistema informa e não apresenta o original como resultado novo. Há uma única chamada de geração por clique, sem referência adicional, mudança de modelo, repetição automática ou aprovação individual de lesões.

O servidor exige a versão de integração `contato-v1` antes da preparação e da geração direta. Uma aba antiga, sem a proteção, recebe orientação para salvar a montagem e abrir a versão atual; a tentativa é recusada antes de reservar cota ou chamar o Gemini. Essa verificação indica compatibilidade do editor, não validação clínica.

Refinamento interno autorizado: após o acabamento de contato resultar em mudança visual insuficiente, Daniel forneceu um novo prompt e autorizou sua aplicação com os ajustes analisados. A versão `gemini-refinamento-v4` permite refinar textura, brilho e sombreamento DENTRO das lesões e suas bordas, solicitando melhora perceptível sem modificar posição, dimensões, silhueta, quantidade de focos, ramificações ou padrões internos. A captura gera automaticamente a lista L1…Ln, com modelo da biblioteca, centro, tamanho, rotação e recorte no mesmo instante da montagem. O servidor valida os dados e acrescenta descrições visuais fixas, verificadas nas próprias figuras da biblioteca; nenhum nome livre, rótulo ou medida é enviado nessa lista. A API recebe uma única imagem, a montagem sem rótulos, sem referência visual adicional.

Nesta revisão, a proteção local permite aplicar a imagem gerada dentro da transparência original das lesões autorizadas, com transição proporcional ao alfa nas bordas, preservando os espaços vazios. Fora delas, permanece somente a faixa estreita de iluminação de contato já existente, derivada suavemente da resposta; o restante conserva os pixels da montagem. Os DIUs e os elementos não autorizados ficam protegidos, inclusive em sobreposições. Essa proteção delimita onde pode haver mudança; ela não verifica a correção dos novos detalhes internos, que devem ser conferidos no mapa final. O fluxo continua com um botão e uma geração por clique, sem aprovação individual. Uma resposta sem alteração interna não é exibida como refinamento novo. Preparação e geração usam a mesma imagem, lista e autorizações, vinculadas pelo resumo criptográfico do prompt completo. A compatibilidade exigida passa a `refinamento-v2`, recusando abas antigas antes de reservar cota ou chamar o Gemini. O modelo, a conta, os filtros e o provedor permanecem os configurados.

Comparação da resposta original (22/09/2026): a geração direta passa a exibir e permitir baixar três etapas: montagem manual com seus rótulos, imagem original recebida do Gemini e resultado final após os ajustes do Endomapa. O arquivo original do Gemini mantém os bytes e o formato recebidos, sem redimensionamento, composição ou rótulos acrescentados pelo aplicativo. Essa imagem serve para comparação e pode conter mudanças de anatomia ou lesões que a proteção local descartou. Ela fica disponível também quando o refinamento local falha ou não produz mudança interna, desde que a resposta seja uma imagem válida. As três etapas aproveitam a mesma geração, sem nova chamada de IA ao visualizar ou baixar. Uma nova tentativa limpa os dados da comparação anterior antes do envio, e os experimentos antigos não reutilizam essa resposta. Os arquivos ficam disponíveis na aba; não há recuperação retroativa da resposta original de gerações passadas nem armazenamento adicional no servidor. Modelo, prompt e regras de composição permanecem os configurados.

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
