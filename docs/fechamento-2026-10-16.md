# Ponto de retomada — 16 de outubro de 2026

Daniel solicitou salvar o trabalho e encerrar. Não há publicação social pendente desta campanha segundo a confirmação do Dot compartilhada por Daniel. Não republicar estes materiais.

## Produto publicado

- `bf1d1d0`: opção Inserir lados disponível para todas as contas.
- `f64daef`: movimento dos ovários integrado ao editor coronal, após aprovação dos testes. Botões “Movimentar ovários” e “Restaurar posições originais” no lado oposto a “Inserir lados (direito/esquerdo)”. Permite atravessar o centro, acompanha lesões vinculadas e inclui posições no salvamento e nas exportações. Histórico de ajustes de sombras, transparência, calibre e uniões em `docs/teste-orgaos-moveis.md`.
- `1b4c515`: “Salvar na biblioteca” substitui o salvamento anterior. Mapas são gravados somente por escolha do usuário; gerar PDF não salva a montagem automaticamente. O contador de PDFs continua separado. Em “Meus mapas”, a ordem é alterada arrastando o título com dedo ou mouse, sem botões de subir/descer. Exclusão diretamente no cartão, mediante confirmação. Mapas antigos preservados.
- Migração aplicada: `supabase/migrations/202610160001_biblioteca_manual.sql`. Reordenação e exclusão respeitam a conta; exclusão verifica versão. Contagem de PDFs preservada após excluir mapa.
- Verificação da biblioteca: testes de navegador `historico-manual` e `pdf-manual`; testes SQL `tests/biblioteca-manual.sql` com transação desfeita ao final, incluindo isolamento entre contas. Arquivos públicos do aplicativo comparados com os locais.

## Dot e divulgação

Dot é o assistente do GPT que Daniel já utiliza para artes e legendas de @endomapa. Esse contexto já constava em `docs/fechamento-2026-10-05.md`; consultar os registros antes de perguntar novamente o que é Dot.

- Preparada demonstração vertical de 20 segundos com o motor real de movimento, sem narração nem música. Pasta local: `output/divulgacao-ovarios/` (roteiro `briefing-dot.txt`, apresentação `demonstracao.html`, gerador `gerar-video.ps1`, demonstração `endomapa-ovarios.mp4`).
- O gerador original de captura parou após 430 quadros; o MP4 de demonstração foi concluído mantendo a última cena até 20 segundos. O script original não deve ser considerado uma geração automática já corrigida. O vídeo final aprovado é o editado pelo Dot, listado abaixo.
- Dot preparou Reels, capa e Story; Daniel aprovou. Cores verde escuro e dourado, textos fora da anatomia. Usar “toque” em vez de “clique”.
- O navegador do Dot bloqueou a operação em `cua_repl`/`tab.getAXState`, conforme relato compartilhado. Nada havia sido publicado nessa tentativa.
- Windsor apresentou sessão invalidada e depois conta não selecionada. Instagram Public tinha @endomapa marcado, mas isso não habilitou publicação. A conexão utilizada com sucesso foi Instagram Insights.
- Inicialmente Instagram Insights mostrava somente ia_medico. Daniel autorizou o perfil correto e confirmou que funcionou. Dot confirmou acesso ao @endomapa. A conta estar aberta no navegador não basta para autorizar a integração.
- Integração exigiu URLs públicas de mídia e capa JPEG. ChatGPT Sites não foi utilizado. Hospedagem feita no próprio Endomapa, por GitHub integrado ao Cloudflare Pages.

## Arquivos finais e hospedagem

Commit `254c333`: somente três arquivos de divulgação adicionados. Sem mudanças no aplicativo. Não foram encontradas funções Cloudflare Pages ou worker no repositório para essas rotas; funções Supabase são separadas. Não foi feita auditoria de cobrança da conta Cloudflare.

Links testados sem login: HTTP 200, tipos `video/mp4` e `image/jpeg`, conteúdo comparado por SHA-256 com os arquivos locais.

- Reels: https://endomapa.pages.dev/divulgacao/ovarios/reels.mp4
- Capa JPEG: https://endomapa.pages.dev/divulgacao/ovarios/capa.jpg
- Story: https://endomapa.pages.dev/divulgacao/ovarios/stories.mp4

Originais fornecidos por Daniel:

- `C:\Users\Daniel\Downloads\Endomapa_Reel_Ovarios_em_movimento.mp4`
- `C:\Users\Daniel\Downloads\Endomapa_Story_Ovarios_em_movimento.mp4`
- `C:\Users\Daniel\Downloads\Imagem do ChatGPT 16 de out. de 2026, 21_02_54.png`

Capa convertida via System.Drawing para JPEG, qualidade 100, sem redimensionamento ou redesenho. PNG original preservado. Vídeos copiados sem recodificação para a pasta pública `divulgacao/ovarios/`.

## Publicação concluída — confirmação recebida

Fonte da confirmação: mensagens do Dot encaminhadas por Daniel, não consulta independente ao Instagram pelo Codex. Dot informou um Reels e um Story publicados, sem duplicatas. Story sem adesivo de link, com chamada para o novo Reels.

- Data: 16/10/2026; horários de Brasília, UTC−3.
- Reels: 21:38:39 — https://www.instagram.com/reel/Dek1qq3CfNc/
- Story: 21:39:43.

Legenda final:

> Novo no Endomapa: ovários em movimento.
> Personalize a posição dos ovários no seu mapa de endometriose:
> - Ative “Movimentar ovários”.
> - Arraste cada ovário para a posição desejada.
> - Para voltar ao início, toque em “Restaurar posições originais”.
>
> Mais flexibilidade no ajuste manual do mapa para representar os achados do seu exame.
> Experimente no Endomapa. Acesse pelo link da bio.
> #Endomapa #Endometriose #Radiologia #Ultrassonografia

## Retomada e preservação

As entregas de produto e mídias estão no GitHub. Experimentos, quadros de vídeo e outros materiais locais permanecem no computador. Não incluir indiscriminadamente pastas de ferramentas, credenciais, arquivos temporários ou alterações de outras tarefas no Git.

No encerramento havia alterações anteriores em `AGENTS.md` e `supabase/functions/interpretar-ditado/index.ts`, além de materiais locais não rastreados. Foram preservadas, sem incorporação ao registro desta entrega. A preferência de modelo em AGENTS.md não altera automaticamente o modelo da conversa.

Para próximas publicações, validar a conexão e a conta do Windsor, conferir duplicatas e fornecer URLs diretas. A reconexão bem-sucedida desta sessão não garante sessões futuras. Não tratar a pendência antiga de 05/10 como bloqueio atual: esta campanha foi concluída segundo o Dot.
