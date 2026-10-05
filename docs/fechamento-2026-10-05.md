# Ponto de retomada — sessão de 4 e 5 de outubro de 2026

As alterações de produto desta sessão foram salvas no Git, enviadas ao GitHub e publicadas. Último registro de produto: `75b2e6d`.

## Entregas

- `3a85e91`: Ctrl+C copia a imagem selecionada com tamanho ajustado, rotação, nome e medidas; Ctrl+V insere uma cópia independente; Delete exclui a seleção. Campos de texto são preservados.
- `ddaeadf`: exportação para divulgação em PNG e PDF A4 com bases neutras, sem identidade da clínica e sem assinatura automática. Preserva a montagem e não utiliza IA para apagar elementos.
- `79c9822`: opção de divulgação visível somente no login de Daniel. É uma restrição de interface, não uma proteção de acesso aos arquivos públicos das bases.
- `75b2e6d`: salvar e reabrir montagens manuais, atualizar o mesmo mapa, iniciar novo mapa, histórico paginado e painel do dia. PDF salva a montagem e registra a geração antes do download; PNG continua sendo somente download. Montagens nunca salvas não podem ser recuperadas pelo histórico.

## Verificações realizadas durante a implementação

- Testes de atalhos, exportação para divulgação, mapas especiais e histórico manual passaram no navegador, incluindo telas pequenas.
- Histórico testado com falhas de gravação, alterações durante salvamento, conflitos entre versões, paginação, reabertura das sete vistas e contagem de PDFs.
- Migração `202610050001_historico_manual.sql` aplicada ao Supabase. Testes de isolamento entre usuários, permissões, conflitos e repetição de requisições passaram com dados de teste revertidos.
- Arquivos públicos da última entrega foram comparados com a versão local testada.

## Divulgação e Instagram

- Perfil pretendido: `@endomapa`. Não foi feita publicação nesta conversa.
- Conforme retorno compartilhado por Daniel, a leitura autenticada pelo Windsor funcionou, mas há diferença entre o ID da conexão (`17841426342394611`) e o ID retornado na consulta (`28976538995309623`).
- Suporte Windsor: protocolo informado `11652091`. Aguardar esclarecimento antes da primeira publicação, conforme decisão do usuário. Não substituir o ID por suposição.
- Arte de apresentação e legenda foram preparadas no dot. Título: “Crie e personalize mapas anatômicos pélvicos”. Público: médicos radiologistas.
- Legenda final compartilhada:

> Conheça o Endomapa.
> Um editor manual de mapas anatômicos pélvicos desenvolvido para médicos radiologistas.
> Adicione imagens da biblioteca, ajuste tamanho e posição, inclua nomes e medidas e exporte sua montagem em PDF A4.
> Neste perfil, você verá demonstrações práticas das ferramentas e exemplos de uso do aplicativo.
> Acesse pelo link da bio.
> #Endomapa #Radiologia #MapeamentoPélvico

- Proposta de logo recebida: símbolo uterino dourado, fundo verde e nome Endomapa. Orientação de revisão: símbolo simplificado para avatar circular e versão completa com nome para materiais. Nenhuma substituição de identidade foi executada aqui.
- As imagens criadas no dot estão nos arquivos enviados por Daniel; este registro não constitui cópia desses arquivos externos ao projeto.
- Ao finalizar a sessão, Daniel enviou duas propostas refinadas: marca completa e símbolo isolado, ambas com um único ponto central, sem haste. O símbolo isolado foi recomendado para a foto de perfil e a marca completa para materiais de divulgação. Nenhuma imagem do Instagram foi substituída.

## Arquivos anteriores preservados

Continuam fora dos commits desta sessão as alterações anteriores em `AGENTS.md` e na função `supabase/functions/interpretar-ditado/index.ts`, imagens auxiliares, registro de fechamento de 01/10 e pastas locais de ferramentas/testes. A alteração antiga de provedor/modelo do ditado não foi validada nem publicada por esta sessão. Credenciais e arquivos temporários não devem ser adicionados ao Git.

Para retomar, ler `AGENTS.md` e `ESPEC.md`. O histórico manual agora persiste montagens salvas; instruções antigas que descrevem todas as montagens como restritas à aba foram substituídas pela entrega de 05/10.
