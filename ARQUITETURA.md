# Arquitetura do Endomapa

## Limite deste documento

Este documento mostra a arquitetura atual e futura do Endomapa. O site está publicado no Cloudflare Pages; Supabase, login, perfis médicos, mapas, lesões e RLS já estão ligados. Edge Function, IA e geração real do PDF continuam como etapas futuras.

## 1. Tela no navegador

A parte visual do Endomapa roda no navegador do celular, tablet ou computador. Ela deve ser construída primeiro para uma tela de celular com 390 pixels de largura, porque o público usa principalmente o telefone.

Essa parte será um front estático: arquivos visuais entregues prontos ao navegador, sem guardar segredos. A publicação continuará no Cloudflare Pages, conectado ao repositório do GitHub.

Responsabilidades da tela:

- Mostrar a apresentação pública do Endomapa.
- Mostrar cadastro, login e recuperação de senha.
- Carregar automaticamente o perfil do médico autenticado.
- Capturar o ditado ao vivo.
- Mostrar dúvidas que precisam de confirmação.
- Exibir os mapas coronal e sagital para revisão.
- Receber correções por novos comandos de voz.
- Só permitir a geração do PDF depois da confirmação explícita do médico.

## 2. Banco de dados e login no Supabase

O Supabase é usado para login e banco de dados. Banco de dados é o local organizado onde ficam as informações descritas no `MODELO.md`.

Responsabilidades do Supabase:

- Confirmar quem entrou no sistema.
- Associar cada linha de dado ao seu dono por meio do `user_id`.
- Guardar perfis médicos, assinaturas geradas, mapas e lesões.
- Guardar futuramente clínicas configuráveis, modelos visuais, relações anatômicas e dúvidas.
- Impedir que um usuário acesse dados pertencentes a outro dono.

O médico cria a conta com nome completo e título Dr. ou Dra. Depois do login, entra diretamente na área de trabalho; não existe seleção manual de médico nem modo visitante. A conta `danielmed124@gmail.com` usa a identidade Centrus MG, e as demais contas usam mapas neutros.

## 3. Edge Function: o cofre da IA

Edge Function é uma função que executa no servidor, fora do navegador do usuário. Ela será construída mais para a frente para receber o ditado, conversar com o serviço de IA e devolver somente as informações estruturadas necessárias.

Responsabilidades futuras da Edge Function:

- Receber a transcrição do ditado enviada pela tela.
- Enviar o texto ao serviço de IA sem revelar a chave secreta.
- Receber tipo, lado, localização, medidas, relações anatômicas e confiança.
- Devolver essas informações para a conferência do médico.
- Pedir confirmação quando houver contradição, lateralidade duvidosa ou medida ausente.
- Nunca confirmar o mapa ou gerar o PDF no lugar do médico.

A Edge Function e a integração com IA ficam para a etapa futura prevista para a IA; não fazem parte do MVP atual.

## Onde vive cada segredo

### Chave pública do Supabase

A `anon key` identifica publicamente o projeto Supabase e foi criada para ser usada no navegador junto das regras de acesso do banco.
Ela não concede acesso livre aos dados: o Supabase ainda precisa verificar o login, o `user_id` e as regras de cada tabela.

### Chave secreta da IA

A chave da IA permite consumir um serviço pago e agir em nome do projeto, por isso viverá somente como segredo da Edge Function no servidor.
Ela nunca será escrita em arquivo enviado ao GitHub nem aparecerá no navegador, pois qualquer pessoa poderia copiá-la e usá-la.

## Regras permanentes de segurança

- Nenhuma senha, token ou chave secreta será colocada no código que chega ao navegador.
- A chave secreta da IA ficará somente no servidor.
- Cada linha das tabelas de dados terá um `user_id` desde sua criação.
- O banco impedirá que uma pessoa consulte ou altere dados de outro dono.
- O médico sempre conferirá a interpretação antes de confirmar o mapa e gerar o PDF.
- O ditado não deverá conter nome, idade, número de exame ou outra identificação da paciente.

## Histórico das mudanças do banco

Toda mudança futura no banco de dados será registrada em um arquivo SQL dentro da pasta `supabase/migrations` e guardada no Git.

SQL é o texto que descreve uma alteração no banco. Manter cada mudança em um arquivo permite saber o que foi alterado, repetir a configuração e voltar a uma versão anterior com segurança.

Nenhuma mudança será feita diretamente no banco sem o arquivo correspondente no histórico do projeto.

## Publicação

- O GitHub guarda os documentos, arquivos visuais e o histórico do projeto.
- O Cloudflare Pages publica a parte visual que roda no navegador.
- O Supabase cuida do login e dos dados; futuramente também hospedará a Edge Function.
- Uma mudança só seguirá para publicação depois de explicada, aprovada, testada e registrada no Git.
