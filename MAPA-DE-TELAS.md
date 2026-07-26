# Mapa de telas do Endomapa

## Limite deste documento

Este documento desenha o percurso atual e futuro do Endomapa. Cadastro, login, recuperação de senha, perfis, mapas, lesões e painel diário já estão ligados ao Supabase. Edge Function, IA e geração real do PDF continuam futuras.

**Regra permanente:** todas as telas serão desenhadas e testadas primeiro no celular, começando por uma largura de 390 pixels.

## Telas públicas e protegidas

| PÚBLICO — qualquer pessoa pode abrir | PROTEGIDO — exige login |
|---|---|
| **Apresentação:** mostra o nome Endomapa e sua promessa para médicos radiologistas. | **Novo mapa e ditado:** abre diretamente para o médico autenticado e inicia o ditado sem identificação da paciente. |
| **Cadastro e login:** cria o perfil com nome e título e permite entrar com e-mail e senha. | **Meus mapas:** mostra somente mapas e lesões do usuário logado. |
| **Recuperação de senha:** envia um link seguro e permite definir uma nova senha. | **Painel do dia:** conta e filtra somente os mapas de hoje pertencentes ao usuário. |
|  | **Confirmação de dúvidas:** apresenta contradições, lateralidade duvidosa ou medidas ausentes e recebe a resposta do médico por voz. |
|  | **Revisão do mapa:** mostra juntas as vistas coronal e sagital, com lesões, medidas e relações anatômicas interpretadas. |
|  | **Correção por voz:** recebe um novo comando do médico e atualiza o mapa para outra revisão. |
|  | **Confirmação e PDF:** só gera o PDF depois de um comando explícito do médico confirmando que o mapa está correto. |

## Caminho principal do médico

1. O médico abre a apresentação do Endomapa no celular.
2. Cria sua conta ou entra com e-mail e senha.
3. O sistema carrega o perfil e abre diretamente sua área de trabalho.
4. Inicia um novo mapa e faz o ditado ao vivo.
5. O sistema organiza as lesões, medidas e relações anatômicas descritas.
6. Se houver qualquer dúvida, o sistema interrompe a montagem e pede confirmação.
7. O médico responde às dúvidas por voz.
8. O sistema mostra as vistas coronal e sagital para revisão.
9. Se houver algo incorreto, o médico dá um novo comando de voz e revisa novamente.
10. Quando tudo estiver correto, o médico confirma explicitamente.
11. O sistema gera um único PDF pronto para impressão, com a identidade permitida para a conta e a assinatura do médico autenticado.

## Caminhos que impedem a geração do PDF

- Sem perfil médico autenticado e ativo: não abrir a área de trabalho.
- Sem nenhuma lesão informada: não gerar o PDF e avisar que nenhum achado foi informado.
- Com medida igual a zero ou negativa: não inserir a lesão e pedir uma medida válida.
- Com dúvida ainda sem resposta: não permitir a confirmação do mapa.
- Com dois comandos rápidos para gerar o PDF: aceitar somente o primeiro e gerar apenas um arquivo.

## Diagrama simples da arquitetura

> MÉDICO NO CELULAR
> 
> ↓ usa
> 
> NAVEGADOR — telas do Endomapa publicadas no Cloudflare Pages
> 
> ├── conversa com o SUPABASE — login, perfis, mapas, lesões e RLS atuais
> 
> └── conversa com a EDGE FUNCTION futura — recebe o ditado e devolve dados estruturados
> 
> &nbsp;&nbsp;&nbsp;&nbsp;└── COFRE DO SERVIDOR — guarda a chave secreta da IA
> 
> A chave da IA nunca segue para o navegador.

## O que cada parte pode acessar

| Parte | Pode acessar | Não pode acessar |
|---|---|---|
| Navegador | Telas, chave pública do Supabase, dados permitidos para o usuário logado e resultado devolvido pela Edge Function. | Chave secreta da IA. |
| Supabase | Login atual, perfis, dados ligados ao `user_id` e regras que separam os donos. | Não interpreta o ditado médico. |
| Edge Function futura | Texto do ditado, chave secreta da IA no servidor e resposta estruturada da IA. | Não confirma o mapa no lugar do médico. |
| IA futura | Somente o texto necessário para estruturar lesões, medidas e relações anatômicas. | Identificação da paciente e decisão final sobre o mapa. |

## Resultado visível em cada etapa

| Etapa | O que o médico vê na tela |
|---|---|
| Apresentação | Nome Endomapa e promessa do sistema. |
| Cadastro e login | Nome completo, Dr. ou Dra., e-mail e senha; no login, somente e-mail e senha. |
| Recuperação de senha | Solicitação do link e definição segura da nova senha. |
| Área de trabalho | Novo mapa aberto diretamente com nome, assinatura e identidade visual do perfil autenticado. |
| Meus mapas | Histórico protegido com lesões e status. |
| Painel do dia | Totais, contadores, filtros e busca nos mapas de hoje. |
| Ditado | Indicação clara de que o sistema está ouvindo. |
| Dúvida | Uma pergunta objetiva que precisa ser respondida antes de continuar. |
| Revisão | Mapas coronal e sagital com lesões, medidas e relações anatômicas. |
| Correção | O mapa atualizado após o novo comando de voz. |
| Confirmação | Ação explícita para confirmar e gerar o PDF. |
| Conclusão | PDF pronto para impressão, sem criação duplicada. |
