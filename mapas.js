(function () {
  "use strict";

  const clienteSupabase = window.endomapaSupabase;
  const botaoSalvar = document.querySelector("[data-salvar-mapa]");
  const mensagem = document.querySelector("[data-mensagem-salvamento]");
  const campoTexto = document.querySelector("#texto_bruto");
  const camposVista = document.querySelectorAll('input[name="vistas"]');

  const CLINICA_CENTRUS_ID = "20000000-0000-4000-8000-000000000001";
  let mapaJaSalvo = false;

  if (!clienteSupabase || !botaoSalvar || !mensagem || !campoTexto) {
    return;
  }

  botaoSalvar.addEventListener("click", salvarMapa);
  campoTexto.addEventListener("input", marcarComoAlterado);
  camposVista.forEach(function (campo) {
    campo.addEventListener("change", marcarComoAlterado);
  });

  async function salvarMapa() {
    const textoBruto = campoTexto.value.trim();
    const vistaSelecionada = document.querySelector('input[name="vistas"]:checked')?.value;
    const medicoId = document.body.dataset.medicoId;

    limparMensagem();

    if (!textoBruto) {
      mostrarMensagem("Digite ou dite os achados antes de salvar o mapa.", true);
      campoTexto.focus();
      return;
    }

    if (!vistaSelecionada) {
      mostrarMensagem("Escolha a vista coronal, sagital ou ambas.", true);
      return;
    }

    if (!medicoId) {
      mostrarMensagem("Selecione o médico responsável antes de salvar.", true);
      return;
    }

    if (mapaJaSalvo) {
      mostrarMensagem("Este mapa já foi salvo. Altere algum campo para salvar uma nova versão.", true);
      return;
    }

    definirCarregamento(true);

    try {
      const { data, error } = await clienteSupabase
        .from("mapas")
        .insert({
          clinica_id: CLINICA_CENTRUS_ID,
          medico_id: medicoId,
          texto_bruto: textoBruto,
          vistas: vistaSelecionada,
          status: "em revisão",
        })
        .select("id, user_id, criado_em")
        .single();

      if (error) {
        mostrarMensagem(traduzirErro(error), true);
        definirCarregamento(false);
        return;
      }

      if (!data || !data.id || !data.user_id) {
        mostrarMensagem(
          "O banco não confirmou a criação do mapa. Nenhum sucesso foi registrado; tente novamente.",
          true,
        );
        definirCarregamento(false);
        return;
      }

      mapaJaSalvo = true;
      botaoSalvar.textContent = "Mapa salvo";
      botaoSalvar.disabled = true;
      mostrarMensagem(`Mapa salvo com segurança. Identificador: ${data.id}`, false);
    } catch (erro) {
      mostrarMensagem(
        "Não foi possível falar com o Supabase. Confira sua internet e tente novamente.",
        true,
      );
      definirCarregamento(false);
    }
  }

  function marcarComoAlterado() {
    if (!mapaJaSalvo) {
      return;
    }

    mapaJaSalvo = false;
    botaoSalvar.disabled = false;
    botaoSalvar.textContent = "Salvar mapa";
    limparMensagem();
  }

  function definirCarregamento(carregando) {
    botaoSalvar.disabled = carregando;
    botaoSalvar.textContent = carregando ? "Salvando..." : "Salvar mapa";
  }

  function mostrarMensagem(texto, erro) {
    mensagem.textContent = texto;
    mensagem.classList.toggle("mensagem-formulario--erro", erro);
    mensagem.hidden = false;
  }

  function limparMensagem() {
    mensagem.textContent = "";
    mensagem.hidden = true;
    mensagem.classList.remove("mensagem-formulario--erro");
  }

  function traduzirErro(erro) {
    const codigo = String(erro.code || "");
    const textoErro = String(erro.message || "").toLowerCase();

    if (codigo === "42501" || textoErro.includes("row-level security")) {
      return "Seu acesso não permitiu salvar este mapa. Saia, entre novamente e tente outra vez.";
    }

    if (codigo === "23502") {
      return "Falta uma informação obrigatória para salvar o mapa.";
    }

    if (codigo === "23514") {
      return "Uma das opções escolhidas não é aceita pelo banco. Revise os dados e tente novamente.";
    }

    if (textoErro.includes("jwt") || textoErro.includes("token")) {
      return "Seu acesso expirou. Saia, entre novamente e tente outra vez.";
    }

    return "Não foi possível salvar o mapa. Confira os dados e tente novamente.";
  }
})();
