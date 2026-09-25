# Ponto de retomada — encerramento de 24 para 25/09/2026

Site: https://endomapa.pages.dev/

Última alteração de produto publicada: `636097c`.

## Concluído e publicado

- Geração de imagens por IA adiada; botões removidos da interface principal.
- Editor manual integrado ao Endomapa, com vistas Coronal, Sagital e Ambas funcionando e montagens independentes.
- Retrocervical ao lado do ligamento uterossacro, com imagem transparente, tamanho inicial de 45% e giro de 31 graus.
- Aderências 1, 2 e 3 substituídas pelas últimas imagens transparentes fornecidas por Daniel. Aderência 4 retirada da biblioteca.
- Botão **Gerar PDF A4**: em Ambas, um único arquivo com duas páginas, coronal seguida de sagital. Mantém lesões, nomes, medidas e identidade visual; margem mínima de 10 mm. Download PNG da vista ativa preservado.
- Cores das bases sagitais suavizadas por código nas versões da clínica e de visitantes. Tela, PNG e PDF usam as mesmas imagens ajustadas. Originais preservados.

## Conferências concluídas

- Editor manual, nomes, captura e PDF passaram nos testes locais de navegador.
- PDF conferido também no leitor nativo do Windows: duas páginas A4, com inspeção visual das páginas.
- Dimensões, transparência, cabeçalho e pixels neutros das bases sagitais preservados; intensidade das cores e sombras reduzidas.
- Os arquivos da última alteração de produto foram conferidos no site público.

## Para a próxima sessão

- Não reativar geração de imagens por IA sem nova solicitação de Daniel.
- A montagem manual permanece somente na aba; não há gravação de exames no histórico. O PDF real está no editor manual; as telas de conclusão do ditado ainda são protótipos.
- Já existiam alterações locais em `AGENTS.md` e `supabase/functions/interpretar-ditado/index.ts`, além de imagens auxiliares e pastas de ferramentas. Foram preservadas separadamente e não incluídas nas publicações acima. A mudança local de provedor/modelo do ditado requer sua própria validação antes de eventual implantação.
- Para reproduzir as cores sagitais: `output/estudos-realismo/ajustar-cor-sagital.ps1`.
- Para conferir o editor e PDF: `powershell -NoProfile -ExecutionPolicy Bypass -File .\tests\validar-fluxo-medico.ps1`.
