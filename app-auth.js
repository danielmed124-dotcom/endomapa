(function () {
  "use strict";

  const corpo = document.body;
  const botaoSair = document.querySelector("[data-sair]");
  const aviso = document.querySelector("[data-aviso]");

  if (!window.supabase || !window.ENDOMAPA_SUPABASE) {
    liberarTelaComErro(
      "Não foi possível iniciar a conexão segura. Atualize a página e tente novamente.",
    );
    return;
  }

  const clienteSupabase = window.supabase.createClient(
    window.ENDOMAPA_SUPABASE.projectUrl,
    window.ENDOMAPA_SUPABASE.publicAnonKey,
  );

  window.endomapaSupabase = clienteSupabase;

  conferirAcesso();

  if (botaoSair) {
    botaoSair.addEventListener("click", sair);
  }

  async function conferirAcesso() {
    try {
      const { data, error } = await clienteSupabase.auth.getUser();

      if (error || !data.user) {
        enviarParaLogin();
        return;
      }

      corpo.classList.remove("autenticacao-pendente");
    } catch (erro) {
      enviarParaLogin();
    }
  }

  async function sair() {
    botaoSair.disabled = true;
    botaoSair.textContent = "Saindo...";

    try {
      const { error } = await clienteSupabase.auth.signOut();

      if (error) {
        mostrarErro("Não foi possível sair agora. Tente novamente.");
        botaoSair.disabled = false;
        botaoSair.textContent = "Sair";
        return;
      }

      window.location.replace("login.html");
    } catch (erro) {
      mostrarErro("Não foi possível falar com o Supabase. Confira sua internet e tente novamente.");
      botaoSair.disabled = false;
      botaoSair.textContent = "Sair";
    }
  }

  function enviarParaLogin() {
    window.location.replace("login.html?motivo=acesso");
  }

  function mostrarErro(texto) {
    if (!aviso) {
      window.alert(texto);
      return;
    }

    aviso.textContent = texto;
    aviso.hidden = false;
  }
})();
