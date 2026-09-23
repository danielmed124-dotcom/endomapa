# Testes locais da função Gemini

Executar a partir da pasta principal do projeto, com o Deno já disponível:

```powershell
.\.ferramentas-publicacao\deno-teste\deno.exe test --no-check --no-config --no-lock --no-remote --deny-net --deny-env --deny-read --deny-write --deny-run --deny-ffi --deny-sys --import-map=tests/servidor-gemini-offline/import-map.json tests/servidor-gemini-offline/servidor_test.ts
```

O teste carrega a função real, mas substitui Supabase, ambiente, servidor HTTP e chamadas externas por respostas locais. Não utiliza credenciais reais, não abre porta, não chama Gemini e não grava imagem ou resultado no Supabase. A imagem de teste é um PNG sintético de um pixel.

Os 17 casos verificam a lista dinâmica de lesões, o catálogo fechado, a proteção dos dispositivos, a rejeição de campos livres e de autorizações inválidas, a correspondência entre as dimensões da lista e do PNG e o bloqueio de mudanças entre preparação e geração. Conferem também o envio do mesmo prompt preparado, com uma única imagem e uma chamada, a compatibilidade da versão do editor, os limites, os erros e a ausência de recuperação de imagem antiga. Uma lista inválida ou alterada é recusada antes de reservar cota.

No retorno ao Gemini Lite, a preparação, o envio e os registros precisam identificar `gemini-3.1-flash-lite-image` com imagem `1K` e `thinkingConfig: { thinkingLevel: "minimal" }`. A função identifica a revisão `gemini-lite-retorno-v1`, com compatibilidade `refinamento-lite-v3`. Abas com as versões anteriores `refinamento-v2` ou `refinamento-pro-v1` param antes de reservar cota. Uma indisponibilidade do Lite não pode repetir a solicitação nem tentar outro modelo automaticamente.

Na versão de prompt `gemini-refinamento-v5`, os testes verificam que códigos internos e nomes de arquivos ou botões não são enviados ao modelo. Os 18 perfis visuais precisam permanecer distintos, para que mudar o modelo de uma lesão continue alterando o prompt e seu hash. Mesmo em elementos idênticos e sobrepostos, a ordem e as autorizações são diferenciadas; trocar a seleção depois da preparação impede a chamada.

O teste não valida a disponibilidade do modelo na conta nem a qualidade de imagens reais. Isso exigiria uma chamada externa, que estes testes não fazem.
