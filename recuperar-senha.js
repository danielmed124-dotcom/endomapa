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
  const etapaConfirmar = document.querySelector("[data-etapa-confirmar]");
  const botaoConfirmar = document.querySelector("[data-confirmar-recuperacao]");
  const parametrosHash = new URLSearchParams(window.location.hash.slice(1));
  const parametrosBusca = new URLSearchParams(window.location.search);
  const parametro = (nome) => parametrosHash.get(nome) || parametrosBusca.get(nome);
  let recuperacaoValidada = false;
  let senhaSalva = false;

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
    { auth: {
      detectSessionInUrl: false,
      storageKey: "endomapa-recuperacao",
      storage: window.sessionStorage,
      flowType: "implicit",
    } },
  );

  botaoEnviar.addEventListener("click", enviarRecuperacao);
  botaoAtualizar.addEventListener("click", atualizarSenha);
  blocoSolicitar.addEventListener("keydown", tratarEnter);
  blocoAlterar.addEventListener("keydown", tratarEnter);

  botaoConfirmar.addEventListener("click", confirmarRecuperacao);

  verificarRetornoDeRecuperacao();

  async function verificarRetornoDeRecuperacao() {
    if (parametro("error") || parametro("error_code")) {
      mostrarMensagem(traduzirErro({ code: parametro("error_code") }), true);
      limparEndereco();
      return;
    }
    if (parametro("type") === "recovery" && parametro("token_hash")) {
      etapaSolicitar.hidden = true;
      etapaConfirmar.hidden = false;
      // Apenas uma ação da pessoa consome o link; abrir a página não o valida.
      return;
    }
    try {
      let resultado;
      if (parametro("type") === "recovery" && parametro("access_token") && parametro("refresh_token")) {
        // Compatibilidade com os e-mails enviados antes da correção.
        resultado = await clienteSupabase.auth.setSession({
          access_token: parametro("access_token"), refresh_token: parametro("refresh_token"),
        });
        limparEndereco();
      } else if (parametro("code") || parametro("type")) {
        mostrarMensagem("Este link não pôde ser confirmado. Solicite um novo e-mail de recuperação.", true);
        limparEndereco();
        return;
      } else {
        // Esta sessão pertence somente à recuperação nesta aba, nunca ao login comum.
        resultado = await clienteSupabase.auth.getSession();
      }
      if (resultado.error) mostrarMensagem(traduzirErro(resultado.error), true);
      else if (resultado.data.session) mostrarEtapaDeNovaSenha();
    } catch (erro) {
      mostrarMensagem("Não foi possível conferir o link. Confira sua internet e abra o link novamente.", true);
    }
  }

  async function confirmarRecuperacao() {
    if (botaoConfirmar.disabled) return;
    definirCarregamento(botaoConfirmar, true, "Confirmando...");
    limparMensagem();
    try {
      const { data, error } = await clienteSupabase.auth.verifyOtp({
        token_hash: parametro("token_hash"), type: "recovery",
      });
      if (error || !data.session) {
        mostrarMensagem(traduzirErro(error || {}), true);
        if (error?.code === "otp_expired") {
          etapaConfirmar.hidden = true;
          etapaSolicitar.hidden = false;
          limparEndereco();
        }
        return;
      }
      mostrarEtapaDeNovaSenha();
    } catch (erro) {
      mostrarMensagem("Não foi possível confirmar o link. Confira sua internet e tente novamente.", true);
    } finally {
      definirCarregamento(botaoConfirmar, false, "Continuar recuperação");
    }
  }

  async function enviarRecuperacao() {
    if (botaoEnviar.disabled) return;
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
        "Se o e-mail estiver cadastrado, você receberá um link para criar uma nova senha. Use o e-mail mais recente; ele pode ser aberto no celular ou no computador.",
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
    if (botaoAtualizar.disabled || !recuperacaoValidada || senhaSalva) return;
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

      senhaSalva = true;
      recuperacaoValidada = false;
      etapaAlterar.hidden = true;
      campoNovaSenha.value = "";
      campoConfirmarSenha.value = "";
      const { error: erroSaida } = await clienteSupabase.auth.signOut();

      if (erroSaida) {
        mostrarMensagem(
          "A senha foi alterada, mas a sessão não pôde ser encerrada. Feche esta aba antes de entrar novamente.",
          true,
        );
        return;
      }

      limparEndereco();
      etapaAlterar.hidden = true;
      mostrarMensagem("Senha alterada com segurança. Volte ao login para entrar.", false);
    } catch (erro) {
      mostrarMensagem(
        senhaSalva
          ? "Sua senha foi alterada. Volte ao login para entrar com a nova senha."
          : "Não foi possível salvar a senha. Confira sua internet e tente novamente.",
        true,
      );
    } finally {
      definirCarregamento(botaoAtualizar, false, "Salvar nova senha");
    }
  }

  function mostrarEtapaDeNovaSenha() {
    recuperacaoValidada = true;
    etapaConfirmar.hidden = true;
    etapaSolicitar.hidden = true;
    etapaAlterar.hidden = false;
    limparEndereco();
    campoNovaSenha.focus();
  }

  function limparEndereco() {
    window.history.replaceState({}, "", window.location.pathname);
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
    if (erro.code === "otp_expired") {
      return "Este link já foi usado ou perdeu a validade. Solicite um novo e-mail e use apenas o link mais recente.";
    }
    if (["session_not_found", "refresh_token_not_found", "refresh_token_already_used"].includes(erro.code)
      || erro.name === "AuthSessionMissingError") {
      return "A sessão de recuperação foi encerrada. Solicite um novo link para continuar.";
    }

    if (textoErro.includes("rate limit")) {
      return "Foram feitas muitas tentativas. Aguarde alguns minutos e tente novamente.";
    }

    if (textoErro.includes("password")) {
      return "A nova senha não foi aceita. Escolha outra senha e tente novamente.";
    }

    return "Não foi possível concluir a recuperação. Tente novamente.";
  }
})();
