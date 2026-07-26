(function () {
  "use strict";

  const formulario = document.querySelector("[data-form-autenticacao]");
  const botoesModo = document.querySelectorAll("[data-modo]");
  const titulo = document.querySelector("#titulo-autenticacao");
  const texto = document.querySelector("#texto-autenticacao");
  const botaoEnviar = document.querySelector("[data-botao-auth]");
  const mensagem = document.querySelector("[data-mensagem-auth]");
  const ajudaSenha = document.querySelector("[data-ajuda-senha]");
  const campoSenha = formulario?.elements.senha;
  const camposCadastro = document.querySelector("[data-campos-cadastro]");

  if (!formulario || !window.supabase || !window.ENDOMAPA_SUPABASE) {
    if (mensagem) {
      mostrarMensagem("Não foi possível iniciar a conexão. Atualize a página e tente novamente.", true);
    }
    return;
  }

  const clienteSupabase = window.supabase.createClient(
    window.ENDOMAPA_SUPABASE.projectUrl,
    window.ENDOMAPA_SUPABASE.publicAnonKey,
  );

  let modo = "entrar";

  alterarModo("entrar", false);
  mostrarMotivoDoRedirecionamento();
  verificarSessao();

  botoesModo.forEach(function (botao) {
    botao.addEventListener("click", function () {
      alterarModo(botao.dataset.modo);
    });
  });

  formulario.addEventListener("submit", async function (evento) {
    evento.preventDefault();
    limparMensagem();

    const dados = new FormData(formulario);
    const email = String(dados.get("email") || "").trim();
    const senha = String(dados.get("senha") || "");
    const nome = String(dados.get("nome") || "").trim();
    const tituloProfissional = String(dados.get("titulo") || "");

    if (!email || !senha) {
      mostrarMensagem("Preencha o e-mail e a senha para continuar.", true);
      return;
    }

    if (senha.length < 6) {
      mostrarMensagem("A senha precisa ter pelo menos 6 caracteres.", true);
      return;
    }

    if (modo === "cadastrar" && !tituloProfissional) {
      mostrarMensagem("Escolha Dr. ou Dra. para continuar.", true);
      return;
    }

    if (modo === "cadastrar" && !nome) {
      mostrarMensagem("Preencha o nome completo do médico.", true);
      formulario.elements.nome.focus();
      return;
    }

    definirCarregamento(true);

    try {
      if (modo === "cadastrar") {
        await cadastrar(email, senha, nome, tituloProfissional);
      } else {
        await entrar(email, senha);
      }
    } catch (erro) {
      mostrarMensagem("Não foi possível falar com o Supabase. Confira sua internet e tente novamente.", true);
    } finally {
      definirCarregamento(false);
    }
  });

  async function verificarSessao() {
    const { data, error } = await clienteSupabase.auth.getSession();

    if (error) {
      mostrarMensagem("Não foi possível conferir seu acesso. Tente novamente.", true);
      return;
    }

    if (data.session) {
      window.location.replace("app.html");
    }
  }

  async function entrar(email, senha) {
    const { error } = await clienteSupabase.auth.signInWithPassword({
      email: email,
      password: senha,
    });

    if (error) {
      mostrarMensagem(traduzirErro(error), true);
      return;
    }

    mostrarMensagem("Entrada confirmada. Abrindo sua área protegida...", false);
    window.location.replace("app.html");
  }

  async function cadastrar(email, senha, nome, tituloProfissional) {
    const { data, error } = await clienteSupabase.auth.signUp({
      email: email,
      password: senha,
      options: {
        data: {
          nome: nome,
          titulo: tituloProfissional,
        },
      },
    });

    if (error) {
      mostrarMensagem(traduzirErro(error), true);
      return;
    }

    if (!data.session) {
      mostrarMensagem(
        "Cadastro criado. Confira sua caixa de e-mail e confirme o endereço antes de entrar.",
        false,
      );
      alterarModo("entrar", false);
      return;
    }

    mostrarMensagem("Cadastro concluído. Abrindo sua área protegida...", false);
    window.location.replace("app.html");
  }

  function alterarModo(novoModo, limpar = true) {
    modo = novoModo === "cadastrar" ? "cadastrar" : "entrar";
    const cadastroAtivo = modo === "cadastrar";

    botoesModo.forEach(function (botao) {
      const ativo = botao.dataset.modo === modo;
      botao.classList.toggle("ativo", ativo);
      botao.setAttribute("aria-pressed", String(ativo));
    });

    camposCadastro.hidden = !cadastroAtivo;
    camposCadastro.querySelectorAll("input").forEach(function (campo) {
      campo.disabled = !cadastroAtivo;
    });

    if (modo === "cadastrar") {
      titulo.textContent = "Crie sua conta";
      texto.textContent = "Cadastre seu e-mail e escolha uma senha para acessar o Endomapa.";
      botaoEnviar.textContent = "Criar conta";
      campoSenha.autocomplete = "new-password";
      ajudaSenha.textContent = "Crie uma senha com pelo menos 6 caracteres.";
    } else {
      titulo.textContent = "Entre no Endomapa";
      texto.textContent = "Use seu e-mail e sua senha para acessar seus próprios mapas.";
      botaoEnviar.textContent = "Entrar";
      campoSenha.autocomplete = "current-password";
      ajudaSenha.textContent = "A senha precisa ter pelo menos 6 caracteres.";
    }

    if (limpar) {
      limparMensagem();
    }
  }

  function definirCarregamento(carregando) {
    botaoEnviar.disabled = carregando;
    botaoEnviar.textContent = carregando
      ? modo === "cadastrar"
        ? "Criando conta..."
        : "Entrando..."
      : modo === "cadastrar"
        ? "Criar conta"
        : "Entrar";
  }

  function mostrarMensagem(textoMensagem, erro) {
    mensagem.textContent = textoMensagem;
    mensagem.classList.toggle("mensagem-formulario--erro", erro);
    mensagem.hidden = false;
  }

  function limparMensagem() {
    mensagem.textContent = "";
    mensagem.hidden = true;
    mensagem.classList.remove("mensagem-formulario--erro");
  }

  function mostrarMotivoDoRedirecionamento() {
    const parametros = new URLSearchParams(window.location.search);

    if (parametros.get("motivo") === "acesso") {
      mostrarMensagem("Entre para acessar a área protegida do Endomapa.", true);
      window.history.replaceState({}, "", "login.html");
    }

    if (parametros.get("motivo") === "perfil") {
      mostrarMensagem(
        "Não foi possível abrir o perfil médico. Entre novamente ou procure o responsável pelo sistema.",
        true,
      );
      window.history.replaceState({}, "", "login.html");
    }
  }

  function traduzirErro(erro) {
    const textoErro = String(erro.message || "").toLowerCase();

    if (textoErro.includes("invalid login credentials")) {
      return "E-mail ou senha incorretos. Confira os dados e tente novamente.";
    }

    if (textoErro.includes("email not confirmed")) {
      return "Confirme seu e-mail antes de entrar. Procure a mensagem enviada pelo Supabase.";
    }

    if (textoErro.includes("user already registered") || textoErro.includes("already registered")) {
      return "Este e-mail já possui uma conta. Use a opção Entrar.";
    }

    if (textoErro.includes("password")) {
      return "A senha não foi aceita. Use pelo menos 6 caracteres e tente novamente.";
    }

    if (textoErro.includes("email")) {
      return "O e-mail não foi aceito. Confira se ele foi digitado corretamente.";
    }

    if (textoErro.includes("rate limit")) {
      return "Foram feitas muitas tentativas. Aguarde alguns minutos e tente novamente.";
    }

    if (textoErro.includes("database error saving new user")) {
      return "Não foi possível criar o perfil médico. Confira nome, título e e-mail e tente novamente.";
    }

    return "Não foi possível concluir a operação. Confira os dados e tente novamente.";
  }
})();
