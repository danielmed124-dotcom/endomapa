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

      const { data: perfil, error: erroPerfil } = await clienteSupabase
        .from("medicos")
        .select("id, user_id, clinica_id, titulo, nome, assinatura, ativo")
        .eq("user_id", data.user.id)
        .single();

      if (erroPerfil || !perfil || perfil.ativo !== "sim") {
        await clienteSupabase.auth.signOut();
        enviarParaLogin("perfil");
        return;
      }

      const { data: recursos, error: erroRecursos } = await clienteSupabase
        .from('recursos_conta')
        .select('pode_ocultar_anotacoes,pode_exportar_divulgacao,indicar_lados_mapas,logo_semeare,logo_granvitta,logo_ana_paula,unidade_medidas,acrescimo_fonte_lesoes_pt,pode_ver_adesao')
        .eq('user_id', data.user.id).maybeSingle();
      if (erroRecursos) {
        mostrarErro('Não foi possível carregar as preferências da sua conta. Atualize a página antes de editar.');
        return;
      }
      Object.assign(perfil, {
        pode_ocultar_anotacoes: false, pode_exportar_divulgacao: false,
        indicar_lados_mapas: false, logo_semeare: false, logo_granvitta: false,
        logo_ana_paula: false, unidade_medidas: 'cm', acrescimo_fonte_lesoes_pt: 0,
        pode_ver_adesao: false,
      }, recursos || {});
      // Estado inicial das letras; o botão Inserir lados está disponível para todas as contas.
      if (perfil.logo_semeare) await window.endomapaLogoSemearePronta;
      if (perfil.logo_granvitta) await window.endomapaLogoGranvittaPronta;
      if (perfil.logo_ana_paula) await window.endomapaLogoAnaPaulaPronta;
      if (perfil.clinica_id && !perfil.logo_semeare && !perfil.logo_granvitta && !perfil.logo_ana_paula) await window.endocartaLogoCentrusPronta;
      try {Object.assign(perfil,await window.endocartaConfiguracoes.carregar(perfil));}
      catch {mostrarErro('Não foi possível carregar suas configurações. Atualize a página antes de editar os mapas.');return;}
      window.endomapaMedico = perfil;
      window.dispatchEvent(
        new CustomEvent("endomapa:perfil-carregado", {
          detail: perfil,
        }),
      );
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

  function enviarParaLogin(motivo = "acesso") {
    const destino = window.location.hash === "#editor-manual" ? "&destino=editor-manual" : "";
    window.location.replace(`login.html?motivo=${motivo}${destino}`);
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
