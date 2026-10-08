(function () {
  "use strict";
  window.criarMicrofoneDeTeste = function ({ aoEstado, aoTexto, aoComando }) {
    const Tipo = window.SpeechRecognition || window.webkitSpeechRecognition;
    let atual = null, retomada = null;
    let continuar = false, finalizarSolicitado = false, interpretando = false;
    let ciclo = 0, textoAcumulado = '', textoExibido = '', exigeRevisao = false;
    let encerramentosVazios = 0;
    const juntar = (...partes) => partes.map(p => p.trim()).filter(Boolean).join(' ');
    const estado = (texto, tipo, ativo) => aoEstado({ texto, tipo, ativo, interpretando });
    function exibir(texto) { textoExibido = texto; aoTexto(texto); }
    async function finalizar() {
      if (!finalizarSolicitado || interpretando) return;
      finalizarSolicitado = false;
      if (!textoAcumulado.trim()) {
        estado('Nenhuma fala foi confirmada. Inicie o ditado novamente.', 'erro', false);
        return;
      }
      if (exigeRevisao) {
        estado('O navegador não confirmou um trecho do ditado. O texto foi preservado: confira e toque em Inserir lesões do texto.', 'erro', false);
        return;
      }
      const versao = ciclo;
      interpretando = true;
      estado('Interpretando o ditado completo…', 'processando', false);
      let sucesso = false;
      try { sucesso = await aoComando(textoAcumulado); }
      catch (_) { estado('Não foi possível concluir a interpretação. O texto foi preservado.', 'erro', false); }
      finally {
        interpretando = false;
        if (versao === ciclo) estado('', sucesso ? 'sucesso' : 'erro', false);
      }
    }
    function iniciarTrecho() {
      retomada = null;
      if (!continuar || atual || interpretando) return;
      const token = ++ciclo;
      const reconhecimento = new Tipo();
      const finais = new Map();
      let provisorio = '', falhou = false, encerrou = false;
      const valido = () => token === ciclo && !encerrou;
      const textoFinal = () => [...finais.entries()].sort((a, b) => a[0] - b[0]).map(([, texto]) => texto).join(' ');
      const textoCompleto = () => juntar(textoAcumulado, textoFinal(), provisorio);
      atual = { reconhecimento, preservar() {
        if (provisorio) exigeRevisao = true;
        const houveFala = Boolean(textoFinal() || provisorio);
        textoAcumulado = textoCompleto();
        finais.clear(); provisorio = '';
        exibir(textoAcumulado);
        return houveFala;
      } };
      reconhecimento.lang = 'pt-BR';
      reconhecimento.continuous = true;
      reconhecimento.interimResults = true;
      reconhecimento.maxAlternatives = 1;
      // Não usar "phrases": o serviço padrão do Chrome pode recusar a escuta.
      reconhecimento.onstart = () => { if (valido()) estado('Ouvindo. Dite todas as lesões e medidas. Toque em Finalizar ditado e inserir lesões quando terminar.', 'ouvindo', true); };
      reconhecimento.onresult = evento => {
        if (!valido() || falhou) return;
        const parciais = [];
        for (let i = 0; i < evento.results.length; i++) {
          const resultado = evento.results[i];
          const texto = resultado[0].transcript.trim();
          if (resultado.isFinal) finais.set(i, texto);
          else parciais.push(texto);
        }
        provisorio = parciais.join(' ');
        exibir(textoCompleto());
      };
      reconhecimento.onerror = evento => {
        if (!valido()) return;
        if (evento.error === 'no-speech' && continuar) return;
        falhou = true; continuar = false; finalizarSolicitado = false;
        const mensagens = {
          'not-allowed': 'Autorize o microfone no navegador para testar a voz.',
          'service-not-allowed': 'O navegador bloqueou o serviço de voz.',
          'audio-capture': 'Nenhum microfone foi encontrado.',
          'network': 'O reconhecimento perdeu a conexão. O texto foi preservado; você pode continuar o ditado ou revisá-lo.',
          'no-speech': 'Nenhuma fala nova foi reconhecida. Confira o texto antes de inserir.',
          'language-not-supported': 'O navegador não reconhece português do Brasil.',
        };
        estado(mensagens[evento.error] || 'A fala foi interrompida. O texto foi preservado e nada foi inserido.', 'erro', false);
      };
      reconhecimento.onend = () => {
        if (!valido()) return;
        encerrou = true;
        const houveFala = atual.preservar();
        atual = null;
        if (falhou) return;
        if (finalizarSolicitado) { finalizar(); return; }
        if (!continuar) return;
        encerramentosVazios = houveFala ? 0 : encerramentosVazios + 1;
        if (encerramentosVazios >= 3) {
          continuar = false;
          estado('O navegador encerrou a escuta sem fala nova. Seu texto está preservado; toque em Continuar ditado ou insira as lesões pelo texto.', 'erro', false);
          return;
        }
        estado('Retomando a escuta. O ditado está preservado; nenhuma interpretação foi iniciada.', 'ouvindo', true);
        retomada = setTimeout(iniciarTrecho, 250);
      };
      estado('Solicitando o microfone…', 'iniciando', true);
      try { reconhecimento.start(); }
      catch (_) {
        atual = null; continuar = false; ++ciclo;
        estado('Não foi possível iniciar o microfone. Seu texto foi preservado. Tente novamente.', 'erro', false);
      }
    }
    return {
      disponivel: Boolean(Tipo),
      iniciar(textoInicial = '') {
        if (!Tipo || continuar || atual || interpretando) return;
        exigeRevisao = exigeRevisao && textoInicial.trim() === textoExibido.trim();
        textoAcumulado = textoInicial.trim();
        exibir(textoAcumulado);
        encerramentosVazios = 0; finalizarSolicitado = false; continuar = true;
        iniciarTrecho();
      },
      parar() {
        if ((!continuar && !atual) || finalizarSolicitado || interpretando) return;
        continuar = false; finalizarSolicitado = true;
        clearTimeout(retomada); retomada = null;
        estado('Finalizando o ditado. Aguardando as últimas palavras…', 'finalizando', true);
        if (atual) {
          try { atual.reconhecimento.stop(); }
          catch (_) { this.cancelar(); }
        } else finalizar();
      },
      cancelar() {
        if (!continuar && !atual && !interpretando) return;
        continuar = false; finalizarSolicitado = false; ++ciclo;
        clearTimeout(retomada); retomada = null;
        const anterior = atual;
        if (anterior) anterior.preservar();
        atual = null;
        if (anterior) { try { anterior.reconhecimento.abort(); } catch (_) {} }
        estado('Microfone parado. O ditado foi preservado; nenhuma inserção foi iniciada.', 'neutro', false);
      },
    };
  };
})();
