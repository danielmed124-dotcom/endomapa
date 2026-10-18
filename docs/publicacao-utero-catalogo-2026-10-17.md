# Útero móvel e atualização do catálogo

Daniel aprovou a integração no editor e autorizou a publicação em 17/10/2026.

- Sagital: Movimentar útero e Restaurar posição original no mesmo local dos ovários; peritônio e acabamento aprovados, limites pela bexiga e parede anterior do reto.
- Posição e vínculo das lesões preservados em montagens e exportações. Escala de cinza, caneta, troca de vista e conta verificadas.
- Útero retrofletido removido da seleção de novos mapas especiais. Estrutura e imagens antigas conservadas somente para reabrir montagens existentes. A opção de compatibilidade é criada oculta/desabilitada apenas ao reabrir uma montagem antiga.
- Nomes Mioma passam a Leiomioma, preservando números e qualificadores. Nomes de lesões no mapa são normalizados ao inserir/editar/reabrir; não houve alteração em massa no banco de exames.
- Cisto hemorrágico e Adenomiose 1 trocam de posição. Adenomiose 1 passa a Adenomiose. Arquivos das imagens e identificadores mantidos.

Testes após a alteração final: `utero-integrado`, `editor-manual-integrado`, `pdf-manual`, `historico-manual`, todos passaram. `git diff --check` sem erros nos arquivos da entrega. Prévia em `output/previa-utero-sagital/editor.html`; não acessa contas ou serviços externos.

Publicação pelo fluxo existente GitHub → Cloudflare Pages. Alterações alheias em AGENTS.md, função de ditado e demais experimentos/arquivos temporários não fazem parte da entrega. Confirmação dos arquivos públicos registrada após o envio.
