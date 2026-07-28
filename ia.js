(function () {
  "use strict";

  const clienteSupabase = window.endomapaSupabase;
  const campoTexto = document.querySelector("#texto_bruto");
  const botaoInterpretar = document.querySelector("[data-interpretar-ditado]");
  const resultado = document.querySelector("[data-resultado-ia]");
  const confianca = document.querySelector("[data-confianca-ia]");
  const estado = document.querySelector("[data-estado-ia]");
  const listaLesoes = document.querySelector("[data-lesoes-ia]");
  const grupoRelacoes = document.querySelector("[data-grupo-relacoes-ia]");
  const listaRelacoes = document.querySelector("[data-relacoes-ia]");
  const grupoDuvidas = document.querySelector("[data-grupo-duvidas-ia]");
  const listaDuvidas = document.querySelector("[data-duvidas-ia]");
  const botaoConfirmar = document.querySelector("[data-confirmar-ia]");
  const botaoFechar = document.querySelector("[data-fechar-ia]");

  if (
    !clienteSupabase ||
    !campoTexto ||
    !botaoInterpretar ||
    !resultado ||
    !confianca ||
    !estado ||
    !listaLesoes ||
    !grupoRelacoes ||
    !listaRelacoes ||
    !grupoDuvidas ||
    !listaDuvidas ||
    !botaoConfirmar ||
    !botaoFechar
  ) {
    return;
  }

  let sugestaoAtual = null;
  let salvamentoEmAndamento = false;
  const LIMITE_CONFIANCA_BAIXA = 70;

  botaoInterpretar.addEventListener("click", interpretarDitado);
  botaoConfirmar.addEventListener("click", salvarLesoesConfirmadas);
  botaoFechar.addEventListener("click", fecharResultado);
  campoTexto.addEventListener("input", function () {
    if (!resultado.hidden) {
      fecharResultado();
    }
  });

  async function interpretarDitado() {
    const textoBruto = campoTexto.value.trim();

    if (!textoBruto) {
      mostrarResultadoComErro("Dite ou escreva os achados antes de pedir a interpretação.");
      campoTexto.focus();
      return;
    }

    if (!document.body.dataset.mapaAtualId) {
      mostrarResultadoComErro("Salve primeiro o mapa bruto. Depois peça a interpretação da IA.");
      return;
    }

    definirInterpretacaoEmAndamento(true);
    resultado.hidden = false;
    mostrarEstado("Interpretando o ditado com segurança...", false);
    limparListas();

    try {
      const { data, error } = await clienteSupabase.functions.invoke("interpretar-ditado", {
        body: { texto_bruto: textoBruto },
      });

      if (error) {
        mostrarEstado(await traduzirErroDaFuncao(error), true);
        definirInterpretacaoEmAndamento(false);
        return;
      }

      if (!data?.sugestao || !Array.isArray(data.sugestao.lesoes)) {
        mostrarEstado("A função não devolveu uma sugestão válida. Tente novamente.", true);
        definirInterpretacaoEmAndamento(false);
        return;
      }

      sugestaoAtual = data.sugestao;
      renderizarSugestao(sugestaoAtual, data.uso);
      definirInterpretacaoEmAndamento(false);
      resultado.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (erro) {
      mostrarEstado("Não foi possível falar com a IA. Confira sua internet e tente novamente.", true);
      definirInterpretacaoEmAndamento(false);
    }
  }

  function renderizarSugestao(sugestao, uso) {
    const confiancaBaixa = sugestao.confianca < LIMITE_CONFIANCA_BAIXA;
    confianca.classList.toggle("resultado-ia__confianca--baixa", confiancaBaixa);
    confianca.textContent = confiancaBaixa
      ? `Confiança baixa: ${sugestao.confianca}%`
      : `Confiança ${sugestao.confianca}%`;
    limparListas();

    if (sugestao.lesoes.length === 0) {
      listaLesoes.append(criarMensagemVazia("Nenhuma lesão foi identificada."));
    } else {
      sugestao.lesoes.forEach(function (lesao, indice) {
        listaLesoes.append(criarCartaoLesao(lesao, indice));
      });
    }

    grupoRelacoes.hidden = sugestao.relacoes_anatomicas.length === 0;
    sugestao.relacoes_anatomicas.forEach(function (relacao) {
      listaRelacoes.append(criarCartaoRelacao(relacao));
    });

    grupoDuvidas.hidden = sugestao.duvidas.length === 0;
    sugestao.duvidas.forEach(function (duvida) {
      listaDuvidas.append(criarCartaoDuvida(duvida));
    });

    const possuiDuvidas = sugestao.duvidas.length > 0;
    const possuiLesoes = sugestao.lesoes.length > 0;
    botaoConfirmar.disabled = possuiDuvidas || !possuiLesoes;

    if (possuiDuvidas) {
      mostrarEstado("A IA encontrou dúvidas. Corrija o ditado e interprete novamente antes de salvar.", true);
    } else if (!possuiLesoes) {
      mostrarEstado("Nenhuma lesão foi sugerida. Nada pode ser salvo.", true);
    } else {
      const textoUso = uso ? ` Chamada ${uso.chamadas_hoje} de ${uso.limite_diario} hoje.` : "";
      mostrarEstado(`Sugestão pronta para sua conferência.${textoUso}`, false);
    }
  }

  function criarCartaoLesao(lesao, indice) {
    const artigo = document.createElement("article");
    artigo.className = "achado";

    const cabecalho = document.createElement("div");
    cabecalho.className = "achado__cabecalho";
    const categoria = document.createElement("h4");
    categoria.className = "achado__categoria";
    categoria.textContent = `${indice + 1}. ${capitalizar(lesao.categoria)}`;
    const lado = document.createElement("span");
    lado.className = "achado__lado";
    lado.textContent = lesao.lado;
    cabecalho.append(categoria, lado);

    const dados = document.createElement("dl");
    adicionarDado(dados, "Localização", lesao.localizacao);
    adicionarDado(dados, "Medidas", formatarMedidas(lesao));
    adicionarDado(dados, "Confiança", `${lesao.confianca}%`);
    if (lesao.observacao) adicionarDado(dados, "Observação", lesao.observacao);

    artigo.append(cabecalho, dados);
    return artigo;
  }

  function criarCartaoRelacao(relacao) {
    const artigo = document.createElement("article");
    artigo.className = "achado";
    const texto = document.createElement("p");
    texto.textContent = `${capitalizar(relacao.estrutura_origem)} ${relacao.lado_origem} ${relacao.relacao} ${relacao.estrutura_destino} ${relacao.lado_destino}.`;
    const nota = document.createElement("small");
    nota.textContent = `Confiança ${relacao.confianca}%. Esta relação ainda não será salva no MVP.`;
    artigo.append(texto, nota);
    return artigo;
  }

  function criarCartaoDuvida(duvida) {
    const artigo = document.createElement("article");
    artigo.className = "achado achado--duvida";
    const pergunta = document.createElement("strong");
    pergunta.textContent = duvida.pergunta;
    const trecho = document.createElement("p");
    trecho.textContent = `Trecho: “${duvida.trecho}”`;
    artigo.append(pergunta, trecho);
    return artigo;
  }

  async function salvarLesoesConfirmadas() {
    if (salvamentoEmAndamento || !sugestaoAtual) return;

    const mapaId = document.body.dataset.mapaAtualId;
    if (!mapaId) {
      mostrarEstado("O mapa bruto mudou. Salve novamente antes de confirmar as lesões.", true);
      return;
    }

    if (sugestaoAtual.duvidas.length > 0 || sugestaoAtual.lesoes.length === 0) {
      mostrarEstado("Resolva as dúvidas antes de salvar as lesões.", true);
      return;
    }

    salvamentoEmAndamento = true;
    botaoConfirmar.disabled = true;
    botaoConfirmar.textContent = "Salvando lesões...";
    mostrarEstado("Salvando somente depois da sua confirmação...", false);

    const linhas = sugestaoAtual.lesoes.map(function (lesao) {
      return {
        mapa_id: mapaId,
        categoria: lesao.categoria,
        localizacao: lesao.localizacao,
        lado: lesao.lado,
        medida_1: lesao.medida_1,
        medida_2: lesao.medida_2,
        medida_3: lesao.medida_3,
        observacao: lesao.observacao,
        confianca: lesao.confianca,
      };
    });

    try {
      // Registra no mapa a confiança geral somente depois da conferência humana.
      // A regra de dono do banco impede alterar um mapa de outro médico.
      const { data: mapaAtualizado, error: erroMapa } = await clienteSupabase
        .from("mapas")
        .update({ confianca: sugestaoAtual.confianca })
        .eq("id", mapaId)
        .select("id, user_id, confianca")
        .single();

      if (erroMapa) {
        mostrarEstado(`A confiança não foi salva: ${traduzirErroDoBanco(erroMapa)}`, true);
        liberarConfirmacao();
        return;
      }

      if (
        !mapaAtualizado ||
        mapaAtualizado.id !== mapaId ||
        !mapaAtualizado.user_id ||
        Number(mapaAtualizado.confianca) !== Number(sugestaoAtual.confianca)
      ) {
        mostrarEstado("O banco não confirmou a confiança da interpretação. Nada será anunciado como salvo.", true);
        liberarConfirmacao();
        return;
      }

      const { data, error } = await clienteSupabase
        .from("lesoes")
        .insert(linhas)
        .select("id, mapa_id, user_id");

      if (error) {
        mostrarEstado(`As lesões não foram salvas: ${traduzirErroDoBanco(error)}`, true);
        liberarConfirmacao();
        return;
      }

      if (!data || data.length !== linhas.length || data.some((linha) => linha.mapa_id !== mapaId || !linha.user_id)) {
        mostrarEstado("O banco não confirmou todas as lesões. A tela não registrará sucesso.", true);
        liberarConfirmacao();
        return;
      }

      botaoConfirmar.textContent = "Lesões salvas";
      botaoConfirmar.disabled = true;
      mostrarEstado(`${data.length} ${data.length === 1 ? "lesão salva" : "lesões salvas"} após sua conferência.`, false);
    } catch (erro) {
      mostrarEstado("Não foi possível falar com o banco. Confira sua internet e tente novamente.", true);
      liberarConfirmacao();
    }
  }

  async function traduzirErroDaFuncao(error) {
    try {
      const corpo = await error.context?.json();
      if (corpo?.erro) return corpo.erro;
    } catch (_erro) {
      // A resposta pode já ter sido consumida; nesse caso usamos a mensagem segura abaixo.
    }
    return "A IA não conseguiu interpretar o ditado. O texto continua disponível para revisão.";
  }

  function traduzirErroDoBanco(error) {
    if (error.code === "23514") return "uma medida ou opção não passou na validação.";
    if (error.code === "42501") return "a regra de dono recusou a gravação.";
    return "o banco devolveu um erro. Tente novamente.";
  }

  function mostrarResultadoComErro(mensagem) {
    resultado.hidden = false;
    sugestaoAtual = null;
    confianca.textContent = "";
    confianca.classList.remove("resultado-ia__confianca--baixa");
    limparListas();
    botaoConfirmar.disabled = true;
    mostrarEstado(mensagem, true);
    resultado.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function mostrarEstado(mensagem, erro) {
    estado.textContent = mensagem;
    estado.hidden = false;
    estado.classList.toggle("mensagem-formulario--erro", erro);
  }

  function definirInterpretacaoEmAndamento(carregando) {
    botaoInterpretar.disabled = carregando;
    botaoInterpretar.textContent = carregando ? "Interpretando..." : "Interpretar e continuar";
  }

  function liberarConfirmacao() {
    salvamentoEmAndamento = false;
    botaoConfirmar.disabled = false;
    botaoConfirmar.textContent = "Conferi e salvar lesões";
  }

  function fecharResultado() {
    resultado.hidden = true;
    sugestaoAtual = null;
    confianca.classList.remove("resultado-ia__confianca--baixa");
    campoTexto.focus();
  }

  function limparListas() {
    listaLesoes.replaceChildren();
    listaRelacoes.replaceChildren();
    listaDuvidas.replaceChildren();
    grupoRelacoes.hidden = true;
    grupoDuvidas.hidden = true;
  }

  function criarMensagemVazia(texto) {
    const paragrafo = document.createElement("p");
    paragrafo.className = "texto-apoio";
    paragrafo.textContent = texto;
    return paragrafo;
  }

  function adicionarDado(lista, rotulo, valor) {
    const termo = document.createElement("dt");
    termo.textContent = rotulo;
    const descricao = document.createElement("dd");
    descricao.textContent = valor;
    lista.append(termo, descricao);
  }

  function formatarMedidas(lesao) {
    const medidas = [lesao.medida_1, lesao.medida_2, lesao.medida_3]
      .filter((medida) => typeof medida === "number")
      .map((medida) => medida.toLocaleString("pt-BR"));
    return medidas.length ? `${medidas.join(" × ")} cm` : "Não informadas";
  }

  function capitalizar(texto) {
    return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : "";
  }
})();
