# Fusão 3D/Hycosy no Endomapa

Entrada: Novo mapa → Fusão de imagens 3D/Hycosy. `fusao-integracao.js` carrega a interface somente ao abrir a tela e após o perfil autenticado estar disponível. A interface usa uma árvore de elementos com estilos isolados (Shadow DOM), sem iframe e sem alterar as políticas de segurança do site. Ao alternar telas, conserva a mesma instância e as imagens em memória.

`index.html` define a interface; `estilo.css` contém seu visual; `fusao.js` faz recorte, transformações, composição e PNG; `pdf.js` gera PDF A4 com a biblioteca local já existente em `assets/vendor`. O HTML pode ser aberto isoladamente para testes. Os arquivos estáticos são públicos; não contêm exames nem credenciais.

O fluxo integrado aproveita a autenticação do aplicativo. Não cadastra pacientes, não envia exames ao servidor nem grava montagens no histórico. Recarregar ou fechar a aba descarta o trabalho. A identificação visível vem dos pixels da base 3D, com faixa de proteção ajustável. A compatibilidade e o alinhamento das imagens devem ser conferidos pelo usuário.

Recursos transferidos do protótipo: seleção por retângulo ou pontos, retirada do fundo escuro, arraste, tamanho/largura/altura, giro de −45° a +45° em passos de 0,1°, perspectivas, cores independentes, luminosidade/contraste, preservação de gradações, fusão de tons claros/escuros e transparência com limite sólido em 0%. Exportações mantêm composição e resolução. PDF centraliza a imagem em A4, sem cortes, com margem mínima de 10 mm e orientação adequada à imagem.

Validação: `tests/fusao-hycosy.html` executa 73 verificações com imagens artificiais. `tests/fusao-integracao.html` verifica o botão, carregamento condicionado ao perfil, navegação, preservação da montagem e larguras de tela. Os exemplos de pacientes não integram o repositório. O experimento original em `experimentos/fusao-hycosy` permanece separado, sem redirecionamento ou alteração automática.
