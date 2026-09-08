-- Libera novamente os testes de hoje da conta do proprietario.
-- As tentativas de diagnostico terminaram sem entregar imagens ao navegador.
delete from public.uso_imagem_diario as uso
using auth.users as usuario
where usuario.id = uso.user_id
  and pg_catalog.lower(usuario.email) = 'danielmed124@gmail.com'
  and uso.dia = (timezone('America/Sao_Paulo', now()))::date;
