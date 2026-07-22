# Mapa de telas do Endomapa

## Limite deste documento

Este documento desenha o percurso futuro completo para que o mockup e o banco sigam a mesma planta. Login, banco de dados, Edge Function e IA continuam fora do MVP de dez dias.

**Regra permanente:** todas as telas serão desenhadas e testadas primeiro no celular, começando por uma largura de 390 pixels.

## Telas públicas e protegidas

| PÚBLICO — qualquer pessoa pode abrir | PROTEGIDO — exige login futuro |
|---|---|
| **Apresentação:** mostra o nome Endomapa e sua promessa para médicos radiologistas. | **Seleção do médico:** mostra os médicos configurados para a clínica e aplica a assinatura correspondente. |
| **Login futuro:** permite ao usuário entrar antes de acessar dados da clínica. | **Novo mapa e ditado:** inicia o ditado médico ao vivo, sem identificação da paciente. |
|  | **Confirmação de dúvidas:** apresenta contradições, lateralidade duvidosa ou medidas ausentes e recebe a resposta do médico por voz. |
|  | **Revisão do mapa:** mostra juntas as vistas coronal e sagital, com lesões, medidas e relações anatômicas interpretadas. |
|  | **Correção por voz:** recebe um novo comando do médico e atualiza o mapa para outra revisão. |
|  | **Confirmação e PDF:** só gera o PDF depois de um comando explícito do médico confirmando que o mapa está correto. |

## Caminho principal do médico

1. O médico abre a apresentação do Endomapa no celular.
2. Quando o login futuro existir, entra em sua conta.
3. Seleciona seu nome na lista da clínica.
4. Inicia um novo mapa e faz o ditado ao vivo.
5. O sistema organiza as lesões, medidas e relações anatômicas descritas.
6. Se houver qualquer dúvida, o sistema interrompe a montagem e pede confirmação.
7. O médico responde às dúvidas por voz.
8. O sistema mostra as vistas coronal e sagital para revisão.
9. Se houver algo incorreto, o médico dá um novo comando de voz e revisa novamente.
10. Quando tudo estiver correto, o médico confirma explicitamente.
11. O sistema gera um único PDF pronto para impressão, com a identidade da clínica e a assinatura do médico selecionado.

## Caminhos que impedem a geração do PDF

- Sem médico selecionado: não iniciar o ditado.
- Sem nenhuma lesão informada: não gerar o PDF e avisar que nenhum achado foi informado.
- Com medida igual a zero ou negativa: não inserir a lesão e pedir uma medida válida.
- Com dúvida ainda sem resposta: não permitir a confirmação do mapa.
- Com dois comandos rápidos para gerar o PDF: aceitar somente o primeiro e gerar apenas um arquivo.

## Diagrama simples da arquitetura futura

> MÉDICO NO CELULAR
> 
> ↓ usa
> 
> NAVEGADOR — telas do Endomapa publicadas no Cloudflare Pages
> 
> ├── conversa com o SUPABASE — login e banco de dados futuros
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
| Supabase | Login futuro, dados ligados ao `user_id` e regras que separam os donos. | Não interpreta o ditado médico. |
| Edge Function futura | Texto do ditado, chave secreta da IA no servidor e resposta estruturada da IA. | Não confirma o mapa no lugar do médico. |
| IA futura | Somente o texto necessário para estruturar lesões, medidas e relações anatômicas. | Identificação da paciente e decisão final sobre o mapa. |

## Resultado visível em cada etapa

| Etapa | O que o médico vê na tela |
|---|---|
| Apresentação | Nome Endomapa e promessa do sistema. |
| Login futuro | Campos para entrar no sistema. |
| Seleção do médico | Lista de médicos da clínica. |
| Ditado | Indicação clara de que o sistema está ouvindo. |
| Dúvida | Uma pergunta objetiva que precisa ser respondida antes de continuar. |
| Revisão | Mapas coronal e sagital com lesões, medidas e relações anatômicas. |
| Correção | O mapa atualizado após o novo comando de voz. |
| Confirmação | Ação explícita para confirmar e gerar o PDF. |
| Conclusão | PDF pronto para impressão, sem criação duplicada. |
