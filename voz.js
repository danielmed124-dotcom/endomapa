(function () {
  "use strict";

  // Localiza os três elementos que participam do ditado.
  const campoTexto = document.querySelector("#texto_bruto");
  const botaoIniciar = document.querySelector("[data-iniciar-ditado]");
  const botaoParar = document.querySelector("[data-parar-ditado]");
  const estadoDitado = document.querySelector("[data-estado-ditado]");

  if (!campoTexto || !botaoIniciar || !botaoParar || !estadoDitado) {
    return;
  }

  // Alguns navegadores usam o nome padrão e outros ainda usam o nome com "webkit".
  const ReconhecimentoDeVoz = window.SpeechRecognition || window.webkitSpeechRecognition;

  // A digitação manual continua funcionando quando o navegador não oferece voz.
  if (!ReconhecimentoDeVoz) {
    botaoIniciar.disabled = true;
    botaoParar.disabled = true;
    mostrarEstado(
      "Este navegador não oferece reconhecimento de voz. Você ainda pode digitar os achados.",
      "erro",
    );
    return;
  }

  const reconhecimento = new ReconhecimentoDeVoz();
  reconhecimento.lang = "pt-BR";
  reconhecimento.continuous = true;
  reconhecimento.interimResults = true;
  reconhecimento.maxAlternatives = 1;

  let estaOuvindo = false;
  let deveContinuar = false;
  let textoAntesDoDitado = "";
  let textoConfirmadoNestaSessao = "";
  let ultimoTextoProvisorio = "";
  let mensagemDoUltimoErro = "";

  botaoIniciar.addEventListener("click", iniciarDitado);
  botaoParar.addEventListener("click", pararDitado);

  function iniciarDitado() {
    if (estaOuvindo) return;

    textoAntesDoDitado = campoTexto.value.trim();
    textoConfirmadoNestaSessao = "";
    ultimoTextoProvisorio = "";
    mensagemDoUltimoErro = "";
    deveContinuar = true;

    try {
      reconhecimento.start();
      mostrarEstado("Solicitando acesso ao microfone...", "ouvindo");
    } catch (erro) {
      deveContinuar = false;
      mostrarEstado("O microfone já está iniciando. Aguarde um instante.", "erro");
    }
  }

  function pararDitado() {
    if (!estaOuvindo) return;

    deveContinuar = false;
    botaoParar.disabled = true;
    mostrarEstado("Finalizando o ditado...", "ouvindo");
    reconhecimento.stop();
  }

  reconhecimento.onstart = function () {
    estaOuvindo = true;
    botaoIniciar.disabled = true;
    botaoParar.disabled = false;
    botaoIniciar.classList.add("botao--gravando");
    mostrarEstado("Ouvindo. Dite os achados e toque em “Parar ditado” ao terminar.", "ouvindo");
  };

  reconhecimento.onresult = function (evento) {
    let textoProvisorio = "";

    // Resultados finais são guardados; resultados provisórios podem mudar enquanto o médico fala.
    for (let indice = evento.resultIndex; indice < evento.results.length; indice += 1) {
      const trecho = evento.results[indice][0].transcript.trim();

      if (evento.results[indice].isFinal) {
        textoConfirmadoNestaSessao = juntarTextos(textoConfirmadoNestaSessao, trecho);
      } else {
        textoProvisorio = juntarTextos(textoProvisorio, trecho);
      }
    }

    ultimoTextoProvisorio = textoProvisorio;
    atualizarCampo(textoProvisorio);
  };

  reconhecimento.onerror = function (evento) {
    const mensagens = {
      "not-allowed": "O acesso ao microfone foi negado. Autorize o microfone no navegador e tente novamente.",
      "service-not-allowed": "O navegador bloqueou o serviço de voz. Confira a permissão do microfone.",
      "audio-capture": "Nenhum microfone foi encontrado neste aparelho.",
      network: "A transcrição perdeu a conexão. Confira a internet e tente novamente.",
      "no-speech": "Nenhuma fala foi identificada. Toque em iniciar e tente novamente.",
      "language-not-supported": "Este navegador não reconhece português do Brasil.",
    };

    deveContinuar = false;
    mensagemDoUltimoErro =
      mensagens[evento.error] || "Não foi possível reconhecer a fala. Tente novamente.";
    mostrarEstado(mensagemDoUltimoErro, "erro");
  };

  reconhecimento.onend = function () {
    estaOuvindo = false;

    // Alguns navegadores encerram uma sessão longa sozinhos; enquanto o médico não parar,
    // iniciamos outra sessão para que o ditado possa continuar.
    if (deveContinuar) {
      window.setTimeout(function () {
        try {
          reconhecimento.start();
        } catch (erro) {
          deveContinuar = false;
          finalizarInterface("O ditado foi interrompido. Toque em iniciar para continuar.", "erro");
        }
      }, 250);
      return;
    }

    // Preserva a explicação do erro, pois o navegador dispara "end" também depois de falhar.
    if (mensagemDoUltimoErro) {
      finalizarInterface(mensagemDoUltimoErro, "erro");
      return;
    }

    // Remove da caixa qualquer palavra provisória que o navegador não confirmou.
    ultimoTextoProvisorio = "";
    atualizarCampo("");
    finalizarInterface(
      textoConfirmadoNestaSessao
        ? "Ditado concluído. Confira o texto antes de salvar."
        : "Ditado encerrado sem uma frase confirmada.",
      textoConfirmadoNestaSessao ? "sucesso" : "neutro",
    );
  };

  function atualizarCampo(textoProvisorio) {
    campoTexto.value = juntarTextos(
      textoAntesDoDitado,
      textoConfirmadoNestaSessao,
      textoProvisorio,
    );

    // Avisa ao restante do aplicativo que o conteúdo mudou, como numa digitação comum.
    campoTexto.dispatchEvent(new Event("input", { bubbles: true }));
    campoTexto.scrollTop = campoTexto.scrollHeight;
  }

  function juntarTextos(...partes) {
    return partes
      .map(function (parte) {
        return parte.trim();
      })
      .filter(Boolean)
      .join(" ");
  }

  function finalizarInterface(mensagem, tipo) {
    botaoIniciar.disabled = false;
    botaoParar.disabled = true;
    botaoIniciar.classList.remove("botao--gravando");
    mostrarEstado(mensagem, tipo);
  }

  function mostrarEstado(mensagem, tipo) {
    estadoDitado.textContent = mensagem;
    estadoDitado.dataset.tipo = tipo;
  }
})();
