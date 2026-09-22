# Testes locais da função Gemini

Executar a partir da pasta principal do projeto, com o Deno já disponível:

```powershell
.\.ferramentas-publicacao\deno-teste\deno.exe test --no-check --no-config --no-lock --no-remote --deny-net --deny-env --deny-read --deny-write --deny-run --deny-ffi --deny-sys --import-map=tests/servidor-gemini-offline/import-map.json tests/servidor-gemini-offline/servidor_test.ts
```

O teste carrega a função real, mas substitui Supabase, ambiente, servidor HTTP e chamadas externas por respostas locais. Não utiliza credenciais reais, não abre porta, não chama Gemini e não grava imagem ou resultado no Supabase. A imagem de teste é um PNG sintético de um pixel.

Os 14 casos verificam a lista dinâmica de lesões, o catálogo fechado, a proteção dos dispositivos, a rejeição de campos livres e de autorizações inválidas, a correspondência entre as dimensões da lista e do PNG e o bloqueio de mudanças entre preparação e geração. Conferem também o envio do mesmo prompt preparado, com uma única imagem e uma chamada, a compatibilidade da versão do editor, os limites, os erros e a ausência de recuperação de imagem antiga. Uma lista inválida ou alterada é recusada antes de reservar cota.

O teste não valida a disponibilidade do modelo na conta nem a qualidade de imagens reais. Isso exigiria uma chamada externa, que estes testes não fazem.
