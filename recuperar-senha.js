(function () {
  "use strict";

  const etapaSolicitar = document.querySelector("[data-etapa-solicitar]");
  const etapaAlterar = document.querySelector("[data-etapa-alterar]");
  const blocoSolicitar = document.querySelector("[data-bloco-solicitar]");
  const blocoAlterar = document.querySelector("[data-bloco-alterar]");
  const campoEmail = document.querySelector('[name="email_recuperacao"]');
  const campoNovaSenha = document.querySelector('[name="nova_senha"]');
  const campoConfirmarSenha = document.querySelector('[name="confirmar_senha"]');
  const botaoEnviar = document.querySelector("[data-enviar-recuperacao]");
  const botaoAtualizar = document.querySelector("[data-atualizar-senha]");
  const mensagem = document.querySelector("[data-mensagem-recuperacao]");

  if (!window.supabase || !window.ENDOMAPA_SUPABASE) {
    mostrarMensagem(
      "Não foi possível iniciar a conexão segura. Atualize a página e tente novamente.",
      true,
    );
    botaoEnviar.disabled = true;
    botaoAtualizar.disabled = true;
    return;
  }

  const clienteSupabase = window.supabase.createClient(
    window.ENDOMAPA_SUPABASE.projectUrl,
    window.ENDOMAPA_SUPABASE.publicAnonKey,
  );

  botaoEnviar.addEventListener("click", enviarRecuperacao);
  botaoAtualizar.addEventListener("click", atualizarSenha);
  blocoSolicitar.addEventListener("keydown", tratarEnter);
  blocoAlterar.addEventListener("keydown", tratarEnter);

  clienteSupabase.auth.onAuthStateChange(function (evento, sessao) {
    if (evento === "PASSWORD_RECOVERY" && sessao) {
      mostrarEtapaDeNovaSenha();
    }
  });

  verificarRetornoDeRecuperacao();

  async function verificarRetornoDeRecuperacao() {
    const parametrosHash = new URLSearchParams(window.location.hash.slice(1));
    const parametrosBusca = new URLSearchParams(window.location.search);
    const retornoDeRecuperacao =
      parametrosHash.get("type") === "recovery"
      || parametrosBusca.get("type") === "recovery"
      || parametrosBusca.has("code");

    if (!retornoDeRecuperacao) {
      return;
    }

    const { data, error } = await clienteSupabase.auth.getSession();

    if (error) {
      mostrarMensagem(
        "O link de recuperação não pôde ser confirmado. Solicite um novo link.",
        true,
      );
      return;
    }

    if (data.session) {
      mostrarEtapaDeNovaSenha();
    }
  }

  async function enviarRecuperacao() {
    const email = campoEmail.value.trim();
    limparMensagem();

    if (!email) {
      mostrarMensagem("Preencha seu e-mail para receber o link de recuperação.", true);
      campoEmail.focus();
      return;
    }

    definirCarregamento(botaoEnviar, true, "Enviando...");

    try {
      const { error } = await clienteSupabase.auth.resetPasswordForEmail(email, {
        redirectTo: "https://endomapa.pages.dev/recuperar-senha",
      });

      if (error) {
        mostrarMensagem(traduzirErro(error), true);
        return;
      }

      mostrarMensagem(
        "Se o e-mail estiver cadastrado, você receberá um link para criar uma nova senha.",
        false,
      );
    } catch (erro) {
      mostrarMensagem(
        "Não foi possível falar com o Supabase. Confira sua internet e tente novamente.",
        true,
      );
    } finally {
      definirCarregamento(botaoEnviar, false, "Enviar link de recuperação");
    }
  }

  async function atualizarSenha() {
    const novaSenha = campoNovaSenha.value;
    const confirmacao = campoConfirmarSenha.value;
    limparMensagem();

    if (novaSenha.length < 8) {
      mostrarMensagem("A nova senha precisa ter pelo menos 8 caracteres.", true);
      campoNovaSenha.focus();
      return;
    }

    if (novaSenha !== confirmacao) {
      mostrarMensagem("As duas senhas precisam ser iguais.", true);
      campoConfirmarSenha.focus();
      return;
    }

    definirCarregamento(botaoAtualizar, true, "Salvando...");

    try {
      const { error } = await clienteSupabase.auth.updateUser({
        password: novaSenha,
      });

      if (error) {
        mostrarMensagem(traduzirErro(error), true);
        return;
      }

      const { error: erroSaida } = await clienteSupabase.auth.signOut();

      if (erroSaida) {
        mostrarMensagem(
          "A senha foi alterada, mas a sessão não pôde ser encerrada. Feche esta aba antes de entrar novamente.",
          true,
        );
        return;
      }

      window.history.replaceState({}, "", "recuperar-senha");
      etapaAlterar.hidden = true;
      mostrarMensagem("Senha alterada com segurança. Volte ao login para entrar.", false);
    } catch (erro) {
      mostrarMensagem(
        "Não foi possível falar com o Supabase. Confira sua internet e tente novamente.",
        true,
      );
    } finally {
      definirCarregamento(botaoAtualizar, false, "Salvar nova senha");
    }
  }

  function mostrarEtapaDeNovaSenha() {
    etapaSolicitar.hidden = true;
    etapaAlterar.hidden = false;
    window.history.replaceState({}, "", "recuperar-senha");
    campoNovaSenha.focus();
  }

  function tratarEnter(evento) {
    if (evento.key !== "Enter") {
      return;
    }

    evento.preventDefault();
    if (etapaAlterar.hidden) {
      enviarRecuperacao();
    } else {
      atualizarSenha();
    }
  }

  function definirCarregamento(botao, carregando, texto) {
    botao.disabled = carregando;
    botao.textContent = texto;
  }

  function mostrarMensagem(texto, erro) {
    mensagem.textContent = texto;
    mensagem.classList.toggle("mensagem-formulario--erro", erro);
    mensagem.hidden = false;
  }

  function limparMensagem() {
    mensagem.textContent = "";
    mensagem.classList.remove("mensagem-formulario--erro");
    mensagem.hidden = true;
  }

  function traduzirErro(erro) {
    const textoErro = String(erro.message || "").toLowerCase();

    if (textoErro.includes("rate limit")) {
      return "Foram feitas muitas tentativas. Aguarde alguns minutos e tente novamente.";
    }

    if (textoErro.includes("password")) {
      return "A nova senha não foi aceita. Escolha outra senha e tente novamente.";
    }

    if (textoErro.includes("session") || textoErro.includes("token")) {
      return "O link expirou ou já foi usado. Solicite um novo link de recuperação.";
    }

    return "Não foi possível concluir a recuperação. Tente novamente.";
  }
})();
