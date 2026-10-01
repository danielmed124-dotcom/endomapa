# Ponto de retomada de 30 de setembro de 2026

As alterações de hoje no Endomapa foram salvas e publicadas. Daniel confirmou que o teste com outra conta funcionou, incluindo o encaminhamento para login ao tentar abrir o editor sem estar conectado.

Site: https://endomapa.pages.dev/app

Última alteração de produto publicada e conferida: `bbb2f6e`.

## Alteração concluída

- A segunda página, Novo mapa, mantém o título, o botão **Montar mapa manualmente** e a caixa **Médico responsável**.
- Foram retirados dessa tela o ditado, a transcrição, a interpretação, os dados demonstrativos e os demais controles do fluxo de voz. Os scripts de voz e interpretação deixaram de ser carregados pelo aplicativo.
- Coronal, Sagital e Ambas continuam disponíveis dentro do editor manual, com os ajustes de navegação necessários.
- Os testes locais do editor integrado em tamanho de celular e da geração de PDF passaram. A página pública atualizada foi conferida após a publicação.

## Acesso e teste com outro usuário

- O login continua obrigatório, inclusive no endereço direto `https://endomapa.pages.dev/app#editor-manual`.
- Daniel esclareceu que deseja impedir o acesso sem login. Não foi implementado modo visitante, acesso anônimo ou teste sem cadastro.
- Daniel informou que testou com outro usuário e confirmou: o link direto sem login levou à tela de entrada; com a outra conta, o nome e a assinatura estavam corretos, sem a marca Centrus.
- Essa confirmação é um relato do teste realizado por Daniel, não uma auditoria completa de segurança ou das permissões do banco.

## Próxima sessão

- Nenhuma alteração de produto solicitada hoje ficou pendente.
- As montagens manuais continuam somente na aba, sem histórico de exames. PNG e PDF continuam disponíveis no editor.
- Permanecem alterações locais anteriores em `AGENTS.md` e `supabase/functions/interpretar-ditado/index.ts`, imagens auxiliares e pastas de ferramentas. Já existiam antes desta sessão e foram preservadas separadamente. Não publicar a mudança de modelo do ditado sem sua validação própria.
- Ler `ESPEC.md` antes de propor novas mudanças. Manter o acesso ao editor restrito a usuários conectados.
