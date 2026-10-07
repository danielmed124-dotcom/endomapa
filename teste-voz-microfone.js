(function () {
  "use strict";
  // Mesmo reconhecimento pt-BR de voz.js, isolado por comando neste experimento.
  // Uma instância por frase impede resultados tardios de contaminarem a próxima.
  window.criarMicrofoneDeTeste = function ({ aoEstado, aoTexto, aoComando }) {
    const Tipo = window.SpeechRecognition || window.webkitSpeechRecognition;
    let continuar = false;
    let atual = null;
    let interpretando = false;
    let ciclo = 0;
    function estado(texto, tipo, ativo) { aoEstado({ texto, tipo, ativo, interpretando }); }
    function iniciarFrase() {
      if (!continuar || atual || interpretando) return;
      const token = ++ciclo;
      const reconhecimento = new Tipo();
      atual = reconhecimento;
      reconhecimento.lang = 'pt-BR';
      reconhecimento.continuous = false;
      reconhecimento.interimResults = true;
      reconhecimento.maxAlternatives = 1;
      const finais = new Map();
      let falhou = false;
      let encerrou = false;
      const valido = () => token === ciclo && !encerrou;
      // O Chrome expõe "phrases", mas o serviço padrão pode recusar start()
      // com phrases-not-supported. Não habilitar essa ajuda experimental.
      reconhecimento.onstart = () => { if (valido()) estado('Ouvindo. Dite uma lesão com local, lado e medidas.', 'ouvindo', true); };
      reconhecimento.onresult = evento => {
        if (!valido() || falhou) return;
        const provisorios = [];
        for (let i = 0; i < evento.results.length; i++) {
          const resultado = evento.results[i];
          const texto = resultado[0].transcript.trim();
          if (resultado.isFinal) finais.set(i, texto);
          else provisorios.push(texto);
        }
        aoTexto([...finais.values(), ...provisorios].join(' '));
      };
      reconhecimento.onerror = evento => {
        if (!valido()) return;
        falhou = true;
        continuar = false;
        const mensagens = {
          'not-allowed': 'Autorize o microfone no navegador para testar a voz.',
          'service-not-allowed': 'O navegador bloqueou o serviço de voz.',
          'audio-capture': 'Nenhum microfone foi encontrado.',
          'network': 'O reconhecimento de voz perdeu a conexão. Tente novamente.',
          'no-speech': 'Nenhuma fala foi reconhecida. Ative o microfone para tentar novamente.',
          'language-not-supported': 'O navegador não reconhece português do Brasil.',
        };
        estado(mensagens[evento.error] || 'A fala foi interrompida. Nada deste comando foi inserido.', 'erro', false);
      };
      reconhecimento.onend = async () => {
        if (!valido()) return;
        encerrou = true;
        atual = null;
        if (falhou) return;
        const texto = [...finais.values()].join(' ').trim();
        aoTexto(texto); // Nunca envia palavras provisórias ao interpretador.
        if (!texto) {
          continuar = false;
          estado('Comando sem frase confirmada. Ative o microfone e tente novamente.', 'erro', false);
          return;
        }
        interpretando = true;
        estado('Interpretando o comando. Aguarde antes de falar novamente…', 'processando', continuar);
        let sucesso = false;
        try { sucesso = await aoComando(texto); }
        finally { interpretando = false; }
        if (token !== ciclo) return;
        if (!sucesso) continuar = false;
        if (continuar) iniciarFrase();
        else estado(sucesso ? 'Comando inserido. Microfone parado.' : '', sucesso ? 'sucesso' : 'erro', false);
      };
      estado('Solicitando o microfone…', 'iniciando', true);
      try { reconhecimento.start(); }
      catch (_) {
        atual = null;
        continuar = false;
        ++ciclo;
        estado('Não foi possível iniciar o microfone. Tente novamente.', 'erro', false);
      }
    }
    return {
      disponivel: Boolean(Tipo),
      iniciar() {
        if (!Tipo || continuar || atual || interpretando) return;
        continuar = true;
        iniciarFrase();
      },
      parar() {
        continuar = false;
        if (atual) {
          estado('Finalizando a frase e parando o microfone…', 'finalizando', true);
          try { atual.stop(); } catch (_) { this.cancelar(); }
        } else if (interpretando) estado('Concluindo o comando recebido. O microfone permanecerá parado.', 'processando', false);
      },
      cancelar() {
        continuar = false;
        ++ciclo;
        const anterior = atual;
        atual = null;
        if (anterior) { try { anterior.abort(); } catch (_) {} }
        estado('Microfone parado.', 'neutro', false);
      },
    };
  };
})();
