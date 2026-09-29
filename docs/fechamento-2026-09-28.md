# Ponto de retomada — 28/09/2026

Site: https://endomapa.pages.dev/

Última alteração de produto publicada e conferida: `979c74f`.

## Concluído e publicado nesta sessão

- PDF A4 sem a margem adicional de 10 mm: ocupa toda a largura, preservando proporções e conteúdo, com aproximadamente 8,5 mm acima e abaixo.
- Assinatura automática restaurada nas duas vistas do editor e nas exportações PNG/PDF. A conta de Daniel mantém a identidade Centrus; os demais médicos usam bases neutras e assinatura pelo primeiro nome do cadastro.
- Novo mapa coronal fornecido por Daniel, com cavidade uterina aberta. Assinatura incorporada removida por edição comum, sem IA; versões Centrus e neutra preparadas.
- Novo mapa sagital fornecido por Daniel. Assinatura incorporada removida e cores/contraste aproximados do coronal; versões Centrus e neutra preparadas.
- Linhas entre lesões e seus nomes/medidas agora pontilhadas na tela, no PNG e no PDF.

## Arquivos e validação

- Referências e procedimentos reproduzíveis preservados em `output/estudos-realismo/`: `preparar-coronal-aberto.ps1` e `preparar-sagital-novo.ps1`.
- Bases ativas: `assets/mapa-base-coronal-aberto.png`, `assets/mapa-base-coronal-aberto-visitante.png`, `assets/mapa-base-sagital-novo-suave.png` e `assets/mapa-base-sagital-novo-visitante-suave.png`.
- Os quatro testes de `tests/validar-fluxo-medico.ps1` passaram após a última alteração: editor integrado, nomes, captura e PDF.
- PDFs de duas páginas A4 abertos e renderizados pelo leitor do Windows; aparência do pontilhado conferida.
- Novas imagens publicadas comparadas com os arquivos locais por SHA-256. A última versão da página, do estilo e da exportação pontilhada foi conferida no site.

## Para a próxima sessão

- Todas as mudanças de produto desta sessão estão registradas no Git e enviadas ao GitHub.
- Nenhuma alteração de produto solicitada ficou pendente.
- Permanecem alterações locais anteriores em `AGENTS.md` e `supabase/functions/interpretar-ditado/index.ts`, imagens auxiliares e pastas de ferramentas. Foram preservadas e não incluídas nas publicações desta sessão. Não publicar a mudança de modelo do ditado sem sua validação própria.
- As montagens manuais continuam somente na aba, sem histórico de exames. O PDF real continua no editor manual.
- Não reativar a geração de imagens por IA sem nova solicitação. Daniel autorizou a preparação destas bases por edição comum após a ferramenta de imagem bloquear a referência anatômica; as imagens finais foram preparadas sem IA.
- Ler `ESPEC.md` antes de novas propostas; as decisões desta sessão estão registradas lá.
