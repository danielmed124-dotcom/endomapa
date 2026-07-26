(function () {
  "use strict";

  const clienteSupabase = window.endomapaSupabase;
  const botaoSalvar = document.querySelector("[data-salvar-mapa]");
  const mensagem = document.querySelector("[data-mensagem-salvamento]");
  const campoTexto = document.querySelector("#texto_bruto");
  const camposVista = document.querySelectorAll('input[name="vistas"]');
  const botoesMeusMapas = document.querySelectorAll('[data-tela-alvo="meus-mapas"]');
  const listaMapas = document.querySelector("[data-lista-mapas]");
  const estadoLista = document.querySelector("[data-estado-lista-mapas]");
  const botaoTentarLista = document.querySelector("[data-tentar-carregar-mapas]");
  const botoesPainel = document.querySelectorAll('[data-tela-alvo="painel-dia"]');
  const estadoPainel = document.querySelector("[data-estado-painel]");
  const botaoTentarPainel = document.querySelector("[data-tentar-carregar-painel]");
  const conteudoPainel = document.querySelector("[data-conteudo-painel]");
  const listaPainel = document.querySelector("[data-lista-painel]");
  const estadoListaPainel = document.querySelector("[data-estado-lista-painel]");
  const campoBuscaPainel = document.querySelector("[data-busca-painel]");
  const botoesFiltroPainel = document.querySelectorAll("[data-filtro-status]");
  const filtroAtualPainel = document.querySelector("[data-filtro-atual]");
  const textoFiltroAtual = document.querySelector("[data-texto-filtro-atual]");
  const botaoLimparFiltro = document.querySelector("[data-limpar-filtro]");

  const CLINICA_CENTRUS_ID = "20000000-0000-4000-8000-000000000001";
  let mapaJaSalvo = false;
  let mapasDoPainel = [];
  let statusFiltradoNoPainel = "";

  if (!clienteSupabase || !botaoSalvar || !mensagem || !campoTexto) {
    return;
  }

  botaoSalvar.addEventListener("click", salvarMapa);
  campoTexto.addEventListener("input", marcarComoAlterado);
  camposVista.forEach(function (campo) {
    campo.addEventListener("change", marcarComoAlterado);
  });
  botoesMeusMapas.forEach(function (botao) {
    botao.addEventListener("click", carregarMeusMapas);
  });
  botaoTentarLista?.addEventListener("click", carregarMeusMapas);
  botoesPainel.forEach(function (botao) {
    botao.addEventListener("click", carregarPainelDoDia);
  });
  botaoTentarPainel?.addEventListener("click", carregarPainelDoDia);
  campoBuscaPainel?.addEventListener("input", renderizarListaDoPainel);
  botoesFiltroPainel.forEach(function (botao) {
    botao.addEventListener("click", function () {
      statusFiltradoNoPainel = botao.dataset.filtroStatus;
      atualizarFiltroVisualDoPainel();
      renderizarListaDoPainel();
    });
  });
  botaoLimparFiltro?.addEventListener("click", function () {
    statusFiltradoNoPainel = "";
    atualizarFiltroVisualDoPainel();
    renderizarListaDoPainel();
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

  async function carregarMeusMapas() {
    if (!listaMapas || !estadoLista) {
      return;
    }

    listaMapas.replaceChildren();
    botaoTentarLista.hidden = true;
    mostrarEstadoLista("Carregando seus mapas...", false);

    try {
      const { data, error } = await clienteSupabase
        .from("mapas")
        .select(`
          id,
          texto_bruto,
          vistas,
          status,
          criado_em,
          confirmado_em,
          pdf_gerado_em,
          lesoes (
            id,
            categoria,
            localizacao,
            lado,
            medida_1,
            medida_2,
            medida_3,
            observacao,
            criado_em
          )
        `)
        .order("criado_em", { ascending: false });

      if (error) {
        mostrarEstadoLista(traduzirErroDeLeitura(error), true);
        return;
      }

      if (!data || data.length === 0) {
        mostrarEstadoLista(
          "Você ainda não possui mapas salvos. Toque em Criar novo mapa para começar.",
          false,
        );
        return;
      }

      estadoLista.hidden = true;
      data.forEach(renderizarMapa);
    } catch (erro) {
      mostrarEstadoLista(
        "Não foi possível carregar seus mapas. Confira sua internet e tente novamente.",
        true,
      );
    }
  }

  async function carregarPainelDoDia() {
    if (!estadoPainel || !conteudoPainel || !listaPainel) {
      return;
    }

    const agora = new Date();
    const inicioDoDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const inicioDoProximoDia = new Date(
      agora.getFullYear(),
      agora.getMonth(),
      agora.getDate() + 1,
    );

    estadoPainel.textContent = "Carregando o painel do dia...";
    estadoPainel.classList.remove("mensagem-formulario--erro");
    estadoPainel.hidden = false;
    botaoTentarPainel.hidden = true;
    conteudoPainel.hidden = true;

    try {
      const { data, error } = await clienteSupabase
        .from("mapas")
        .select(`
          id,
          texto_bruto,
          vistas,
          status,
          criado_em,
          lesoes (id)
        `)
        .gte("criado_em", inicioDoDia.toISOString())
        .lt("criado_em", inicioDoProximoDia.toISOString())
        .order("criado_em", { ascending: false });

      if (error) {
        mostrarErroDoPainel(traduzirErroDeLeitura(error));
        return;
      }

      mapasDoPainel = Array.isArray(data) ? data : [];
      statusFiltradoNoPainel = "";
      campoBuscaPainel.value = "";
      preencherResumoDoPainel(agora);
      atualizarFiltroVisualDoPainel();
      renderizarListaDoPainel();

      estadoPainel.hidden = true;
      conteudoPainel.hidden = false;
    } catch (erro) {
      mostrarErroDoPainel(
        "Não foi possível carregar o painel. Confira sua internet e tente novamente.",
      );
    }
  }

  function preencherResumoDoPainel(dataAtual) {
    const totais = {
      "em revisão": 0,
      "aguardando confirmação": 0,
      confirmado: 0,
      "PDF gerado": 0,
    };

    mapasDoPainel.forEach(function (mapa) {
      if (Object.hasOwn(totais, mapa.status)) {
        totais[mapa.status] += 1;
      }
    });

    const totalLesoes = mapasDoPainel.reduce(function (soma, mapa) {
      return soma + (Array.isArray(mapa.lesoes) ? mapa.lesoes.length : 0);
    }, 0);

    document.querySelector("[data-total-mapas-hoje]").textContent = mapasDoPainel.length;
    document.querySelector("[data-contador-revisao]").textContent = totais["em revisão"];
    document.querySelector("[data-contador-aguardando]").textContent =
      totais["aguardando confirmação"];
    document.querySelector("[data-contador-confirmados]").textContent = totais.confirmado;
    document.querySelector("[data-contador-pdf]").textContent = totais["PDF gerado"];
    document.querySelector("[data-total-lesoes-hoje]").textContent = totalLesoes;
    document.querySelector("[data-data-painel]").textContent = new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "full",
    }).format(dataAtual);
  }

  function renderizarListaDoPainel() {
    if (!listaPainel || !estadoListaPainel || !campoBuscaPainel) {
      return;
    }

    const termo = normalizarTexto(campoBuscaPainel.value.trim());
    const mapasFiltrados = mapasDoPainel.filter(function (mapa) {
      const correspondeAoStatus = !statusFiltradoNoPainel || mapa.status === statusFiltradoNoPainel;
      const correspondeABusca = !termo || normalizarTexto(mapa.texto_bruto).includes(termo);
      return correspondeAoStatus && correspondeABusca;
    });

    listaPainel.replaceChildren();

    if (mapasDoPainel.length === 0) {
      mostrarEstadoDaListaDoPainel(
        "Nenhum mapa foi criado hoje. Toque em Novo mapa para iniciar o primeiro.",
      );
      return;
    }

    if (mapasFiltrados.length === 0) {
      mostrarEstadoDaListaDoPainel("Nenhum mapa de hoje corresponde à busca ou ao filtro.");
      return;
    }

    estadoListaPainel.hidden = true;
    mapasFiltrados.forEach(renderizarMapaDoPainel);
  }

  function renderizarMapaDoPainel(mapa) {
    const artigo = document.createElement("article");
    artigo.className = "mapa-salvo";

    const topo = document.createElement("div");
    topo.className = "mapa-salvo__topo";

    const status = document.createElement("span");
    status.className = "etiqueta-estado";
    status.textContent = mapa.status;

    const dataCriacao = document.createElement("time");
    dataCriacao.className = "mapa-salvo__data";
    dataCriacao.dateTime = mapa.criado_em;
    dataCriacao.textContent = formatarData(mapa.criado_em);

    const texto = document.createElement("p");
    texto.className = "mapa-salvo__texto";
    texto.textContent = mapa.texto_bruto || "Sem texto bruto informado.";

    const detalhes = document.createElement("p");
    detalhes.className = "mapa-salvo__vista";
    const quantidadeLesoes = Array.isArray(mapa.lesoes) ? mapa.lesoes.length : 0;
    detalhes.textContent = `${formatarVista(mapa.vistas)} · ${quantidadeLesoes} ${
      quantidadeLesoes === 1 ? "lesão" : "lesões"
    }`;

    topo.append(status, dataCriacao);
    artigo.append(topo, texto, detalhes);
    listaPainel.append(artigo);
  }

  function atualizarFiltroVisualDoPainel() {
    botoesFiltroPainel.forEach(function (botao) {
      botao.setAttribute(
        "aria-pressed",
        String(botao.dataset.filtroStatus === statusFiltradoNoPainel),
      );
    });

    filtroAtualPainel.hidden = !statusFiltradoNoPainel;
    textoFiltroAtual.textContent = statusFiltradoNoPainel
      ? `Filtro: ${primeiraMaiuscula(statusFiltradoNoPainel)}`
      : "";
  }

  function mostrarEstadoDaListaDoPainel(texto) {
    estadoListaPainel.textContent = texto;
    estadoListaPainel.hidden = false;
  }

  function mostrarErroDoPainel(texto) {
    estadoPainel.textContent = texto;
    estadoPainel.classList.add("mensagem-formulario--erro");
    estadoPainel.hidden = false;
    botaoTentarPainel.hidden = false;
    conteudoPainel.hidden = true;
  }

  function normalizarTexto(texto) {
    return String(texto || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR");
  }

  function renderizarMapa(mapa) {
    const artigo = document.createElement("article");
    artigo.className = "mapa-salvo";

    const topo = document.createElement("div");
    topo.className = "mapa-salvo__topo";

    const status = document.createElement("span");
    status.className = "etiqueta-estado";
    status.textContent = mapa.status;

    const dataCriacao = document.createElement("time");
    dataCriacao.className = "mapa-salvo__data";
    dataCriacao.dateTime = mapa.criado_em;
    dataCriacao.textContent = formatarData(mapa.criado_em);

    const texto = document.createElement("p");
    texto.className = "mapa-salvo__texto";
    texto.textContent = mapa.texto_bruto || "Sem texto bruto informado.";

    const vista = document.createElement("p");
    vista.className = "mapa-salvo__vista";
    vista.textContent = `Vista: ${formatarVista(mapa.vistas)}`;

    const lesoes = Array.isArray(mapa.lesoes)
      ? [...mapa.lesoes].sort(function (primeira, segunda) {
          return new Date(primeira.criado_em) - new Date(segunda.criado_em);
        })
      : [];

    const blocoLesoes = document.createElement("section");
    blocoLesoes.className = "mapa-salvo__lesoes";

    const tituloLesoes = document.createElement("h3");
    tituloLesoes.className = "mapa-salvo__titulo-lesoes";
    tituloLesoes.textContent =
      lesoes.length === 1 ? "1 lesão estruturada" : `${lesoes.length} lesões estruturadas`;

    blocoLesoes.append(tituloLesoes);

    if (lesoes.length === 0) {
      const estadoVazio = document.createElement("p");
      estadoVazio.className = "mapa-salvo__sem-lesoes";
      estadoVazio.textContent = "Nenhuma lesão estruturada neste mapa.";
      blocoLesoes.append(estadoVazio);
    } else {
      lesoes.forEach(function (lesao) {
        blocoLesoes.append(criarResumoLesao(lesao));
      });
    }

    topo.append(status, dataCriacao);
    const controleStatus = criarControleStatus(mapa, lesoes.length);

    artigo.append(topo, texto, vista, blocoLesoes, controleStatus);
    listaMapas.append(artigo);
  }

  function criarControleStatus(mapa, quantidadeLesoes) {
    const controle = document.createElement("div");
    controle.className = "controle-status";

    const mensagemStatus = document.createElement("p");
    mensagemStatus.className = "controle-status__mensagem";
    mensagemStatus.hidden = true;
    controle.append(mensagemStatus);

    if (mapa.status === "em revisão") {
      if (quantidadeLesoes === 0) {
        mensagemStatus.textContent =
          "O mapa precisa ter pelo menos uma lesão estruturada antes da confirmação.";
        mensagemStatus.hidden = false;
        return controle;
      }

      controle.append(
        criarBotaoStatus(
          "Enviar para confirmação",
          mapa,
          "aguardando confirmação",
          mensagemStatus,
        ),
      );
      return controle;
    }

    if (mapa.status === "aguardando confirmação") {
      controle.append(
        criarBotaoStatus("Confirmar mapa", mapa, "confirmado", mensagemStatus),
      );
      return controle;
    }

    if (mapa.status === "confirmado") {
      mensagemStatus.textContent =
        "Mapa confirmado. A geração real do PDF será conectada em uma etapa futura.";
      mensagemStatus.hidden = false;
      return controle;
    }

    mensagemStatus.textContent = "PDF gerado.";
    mensagemStatus.hidden = false;
    return controle;
  }

  function criarBotaoStatus(rotulo, mapa, proximoStatus, mensagemStatus) {
    const botao = document.createElement("button");
    botao.className = "botao botao--status";
    botao.type = "button";
    botao.textContent = rotulo;

    botao.addEventListener("click", async function () {
      if (
        proximoStatus === "confirmado"
        && !window.confirm("Você conferiu os achados e deseja confirmar este mapa?")
      ) {
        return;
      }

      botao.disabled = true;
      botao.textContent = "Atualizando...";
      mensagemStatus.hidden = true;

      try {
        const { data, error } = await clienteSupabase
          .from("mapas")
          .update({ status: proximoStatus })
          .eq("id", mapa.id)
          .select("id, status, confirmado_em, pdf_gerado_em")
          .single();

        if (error) {
          mostrarErroStatus(error, mensagemStatus);
          botao.disabled = false;
          botao.textContent = rotulo;
          return;
        }

        if (!data || data.status !== proximoStatus) {
          mensagemStatus.textContent =
            "O banco não confirmou a mudança de status. Tente novamente.";
          mensagemStatus.classList.add("controle-status__mensagem--erro");
          mensagemStatus.hidden = false;
          botao.disabled = false;
          botao.textContent = rotulo;
          return;
        }

        await carregarMeusMapas();
      } catch (erro) {
        mensagemStatus.textContent =
          "Não foi possível falar com o Supabase. Confira sua internet e tente novamente.";
        mensagemStatus.classList.add("controle-status__mensagem--erro");
        mensagemStatus.hidden = false;
        botao.disabled = false;
        botao.textContent = rotulo;
      }
    });

    return botao;
  }

  function mostrarErroStatus(erro, mensagemStatus) {
    const codigo = String(erro.code || "");
    const textoErro = String(erro.message || "").toLowerCase();

    if (codigo === "23514" && textoErro.includes("pelo menos uma lesão")) {
      mensagemStatus.textContent =
        "O mapa precisa ter pelo menos uma lesão antes da confirmação.";
    } else if (codigo === "23514") {
      mensagemStatus.textContent =
        "Esta mudança de status não segue a ordem permitida.";
    } else if (codigo === "42501" || textoErro.includes("permission")) {
      mensagemStatus.textContent =
        "Seu acesso não permitiu alterar este mapa. Saia, entre novamente e tente outra vez.";
    } else {
      mensagemStatus.textContent =
        "Não foi possível mudar o status. Tente novamente.";
    }

    mensagemStatus.classList.add("controle-status__mensagem--erro");
    mensagemStatus.hidden = false;
  }

  function criarResumoLesao(lesao) {
    const resumo = document.createElement("article");
    resumo.className = "lesao-salva";

    const cabecalho = document.createElement("div");
    cabecalho.className = "lesao-salva__cabecalho";

    const categoria = document.createElement("strong");
    categoria.className = "lesao-salva__categoria";
    categoria.textContent = primeiraMaiuscula(lesao.categoria);

    const lado = document.createElement("span");
    lado.className = "lesao-salva__lado";
    lado.textContent = primeiraMaiuscula(lesao.lado);

    const localizacao = document.createElement("p");
    localizacao.className = "lesao-salva__localizacao";
    localizacao.textContent = primeiraMaiuscula(lesao.localizacao);

    const medidas = document.createElement("p");
    medidas.className = "lesao-salva__medidas";
    medidas.textContent = formatarMedidas(lesao);

    cabecalho.append(categoria, lado);
    resumo.append(cabecalho, localizacao, medidas);

    if (lesao.observacao) {
      const observacao = document.createElement("p");
      observacao.className = "lesao-salva__observacao";
      observacao.textContent = lesao.observacao;
      resumo.append(observacao);
    }

    return resumo;
  }

  function mostrarEstadoLista(texto, erro) {
    estadoLista.textContent = texto;
    estadoLista.classList.toggle("mensagem-formulario--erro", erro);
    estadoLista.hidden = false;
    botaoTentarLista.hidden = !erro;
  }

  function formatarData(data) {
    const instante = new Date(data);

    if (Number.isNaN(instante.getTime())) {
      return "Data não informada";
    }

    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(instante);
  }

  function formatarVista(vista) {
    const nomes = {
      coronal: "Coronal",
      sagital: "Sagital",
      ambas: "Coronal e sagital",
    };

    return nomes[vista] || vista;
  }

  function formatarMedidas(lesao) {
    const medidas = [lesao.medida_1, lesao.medida_2, lesao.medida_3]
      .filter(function (medida) {
        return medida !== null && medida !== undefined;
      })
      .map(function (medida) {
        return Number(medida).toLocaleString("pt-BR");
      });

    return medidas.length > 0 ? `${medidas.join(" × ")} cm` : "Medidas não informadas";
  }

  function primeiraMaiuscula(texto) {
    const valor = String(texto || "");
    return valor ? valor.charAt(0).toLocaleUpperCase("pt-BR") + valor.slice(1) : "";
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

  function traduzirErroDeLeitura(erro) {
    const codigo = String(erro.code || "");
    const textoErro = String(erro.message || "").toLowerCase();

    if (codigo === "42501" || textoErro.includes("permission")) {
      return "Seu acesso não permitiu consultar os mapas. Saia, entre novamente e tente outra vez.";
    }

    if (textoErro.includes("jwt") || textoErro.includes("token")) {
      return "Seu acesso expirou. Saia, entre novamente e tente outra vez.";
    }

    return "Não foi possível carregar seus mapas. Tente novamente.";
  }
})();
