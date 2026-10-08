(async function () {
  const saida = document.querySelector('#resultado');
  const verificar = (condicao, mensagem) => { if (!condicao) throw new Error(mensagem); };
  const esperar = async (condicao, mensagem) => {
    for (let n = 0; n < 400; n++) { if (condicao()) return; await new Promise(r => setTimeout(r, 25)); }
    throw new Error(mensagem);
  };
  const pausa = () => new Promise(r => setTimeout(r, 50));
  try {
    const original = await (await fetch('../teste-voz.html')).text();
    const html = new DOMParser().parseFromString(original, 'text/html');
    html.querySelectorAll('script[src^="https:"]').forEach(e => e.remove());
    const base = html.createElement('base'); base.href = new URL('../', location.href).href; html.head.prepend(base);
    const csp = html.createElement('meta'); csp.httpEquiv = 'Content-Security-Policy';
    csp.content = "default-src 'self' data:; script-src 'self' 'unsafe-inline'; connect-src 'self'; style-src 'self' 'unsafe-inline'";
    html.head.prepend(csp);
    const ambiente = html.createElement('script');
    ambiente.textContent = `
      window.__teste = { chamadas: [], erros: [], instancias: [], resposta: null, falhar: false, atrasar: false, liberar: null, auth: null, conectado: false, perfilFalha: false };
      const t = window.__teste;
      window.addEventListener('error', e => t.erros.push(e.message));
      window.addEventListener('unhandledrejection', e => t.erros.push(String(e.reason)));
      const usuario = { id: 'medico-sintetico' };
      window.supabase = { createClient() { return {
        auth: {
          getUser: async () => ({ data: { user: t.conectado ? usuario : null } }),
          getSession: async () => ({ data: { session: { user: usuario, access_token: 'token-ficticio' } } }),
          onAuthStateChange: callback => { t.auth = callback; }
        },
        from(nome) {
          if (nome !== 'medicos') throw new Error('Acesso a tabela indevida: ' + nome);
          return { select() { return { eq() { return { single: async () => t.perfilFalha ? { error: { message: 'Falha simulada' }, data: null } : ({ data: { id: 'medico', titulo: 'Dr.', nome: 'Teste', assinatura: 'Teste', clinica_id: null, ativo: 'sim' } }) }; } }; } };
        }
      }; } };
      const fetchReal = window.fetch;
      window.fetch = async (url, opcoes) => {
        if (String(url).includes('/functions/v1/interpretar-ditado')) throw new Error('O teste voltou ao interpretador antigo');
        if (String(url).includes('/functions/v1/interpretar-voz-teste')) {
          t.chamadas.push({ texto: JSON.parse(opcoes.body).texto_bruto, metodo: opcoes.method, url: String(url) });
          if (t.atrasar) await new Promise(r => { t.liberar = r; });
          // Adapta os casos antigos de transporte para o contrato novo.
          const resposta = t.resposta?.itens ? t.resposta : { confianca: t.resposta?.confianca, duvidas: t.resposta?.duvidas,
            itens: t.resposta?.lesoes.map(l => ({ modelo: l.localizacao === 'ligamento uterossacro' ? 'Ligamento uterossacro' : l.observacao || 'Mioma 1', quantidade: 1, localizacao: l.localizacao, lado: l.lado, medida_1: l.medida_1, medida_2: l.medida_2, medida_3: l.medida_3, posicao_ditada: null, confianca: l.confianca })) };
          return new Response(JSON.stringify(t.falhar ? { erro: 'Falha simulada do serviço.' } : { sugestao: resposta }), { status: t.falhar ? 503 : 200, headers: { 'Content-Type': 'application/json' } });
        }
        if (new URL(url, document.baseURI).origin !== new URL(document.baseURI).origin) throw new Error('Rede externa bloqueada');
        return fetchReal(url, opcoes);
      };
      window.SpeechRecognitionPhrase = class { constructor(phrase, boost) { this.phrase = phrase; this.boost = boost; } };
      window.SpeechRecognition = class {
        constructor() { this.phrases = []; t.instancias.push(this); }
        start() {
          if (this.phrases.length) { setTimeout(() => { this.onerror?.({ error: 'phrases-not-supported' }); this.onend?.(); }, 0); return; }
          this.iniciou = true; setTimeout(() => this.onstart?.(), 0);
        }
        stop() { setTimeout(() => this.onend?.(), 0); }
        abort() { this.abortou = true; this.onend?.(); }
        resultado(texto, final) { const r = [{ transcript: texto }]; r.isFinal = final; this.onresult?.({ resultIndex: 0, results: [r] }); }
        resultados(trechos) { this.onresult?.({ resultIndex: 0, results: trechos.map(([texto, final]) => { const r = [{ transcript: texto }]; r.isFinal = final; return r; }) }); }
        terminar(texto) { this.resultado(texto, true); this.resultado(texto, true); this.onend?.(); this.onend?.(); }
      };
    `;
    html.head.append(ambiente);
    const quadro = document.querySelector('iframe');
    quadro.srcdoc = '<!doctype html>' + html.documentElement.outerHTML;
    await esperar(() => quadro.contentDocument?.body.dataset.vozPronta, 'A página de teste não iniciou');
    const w = quadro.contentWindow, d = quadro.contentDocument, t = w.__teste;
    const $ = seletor => d.querySelector(seletor);
    verificar(d.body.dataset.vozPronta === 'erro' && !$('#voz-login').hidden && !$('#voz-rever-acesso').hidden, 'Sem login, deve oferecer acesso e recuperação');
    verificar($('#voz-iniciar').matches(':disabled'), 'Voz deve aguardar autenticação');
    verificar(typeof t.auth === 'function', 'Login em outra aba precisa ser observado mesmo após falha inicial');
    t.conectado = true;
    t.auth('SIGNED_IN', { user: { id: 'medico-sintetico' } });
    await esperar(() => d.body.dataset.vozPronta === 'true' && !$('#voz-iniciar').matches(':disabled'), 'O botão não reativou após login em outra aba');
    verificar($('#voz-login').hidden && $('#voz-rever-acesso').hidden, 'Avisos de acesso devem desaparecer após login');
    verificar($('#voz-lateral').contains($('#voz-painel')) && !$('#voz-painel').hidden && $('#voz-ajustes').hidden, 'Ditado deve iniciar no painel lateral');
    verificar(!$('.biblioteca-lesoes').closest('details'), 'Biblioteca manual deve permanecer aberta');
    t.auth('SIGNED_OUT', null);
    t.perfilFalha = true;
    $('#voz-rever-acesso').click();
    await esperar(() => d.body.dataset.vozPronta === 'erro' && !$('#voz-rever-acesso').disabled, 'Falha temporária de perfil não foi tratada');
    t.perfilFalha = false;
    $('#voz-rever-acesso').click();
    await esperar(() => !$('#voz-iniciar').matches(':disabled'), 'Tentar novamente não recuperou o botão');
    const lesoes = vista => d.querySelectorAll('[data-camada-editor="' + vista + '"] .lesao-editavel');
    const dado = (extras = {}) => ({ categoria: 'lesão ovariana', localizacao: 'ovário', lado: 'direito', medida_1: 3.2, medida_2: 2.1, medida_3: null, observacao: 'Endometrioma', confianca: 95, ...extras });
    const sugestao = (itens = [dado()]) => ({ confianca: 95, lesoes: itens, duvidas: [], relacoes_anatomicas: [] });
    const biblioteca = Array.from(d.querySelectorAll('[data-modelo]'), b => ({ ...b.dataset }));
    const interpretarBiblioteca = w.EndomapaVozRegras.interpretarBiblioteca;
    const ditadoDaniel = 'ligamento uterosacro esquerdo medindo 1,8 por 0,6 cm três focos de adenomiose DIU de cobre mioma 1 medindo 3,6 por 2,1 por 2,3 cm retrocervical medindo 3,6 por 2,9 cm pólipo medindo 0,8 por 0,6 cm';
    const interpretado = interpretarBiblioteca(ditadoDaniel);
    verificar(interpretado?.lesoes.length === 8 && interpretado.duvidas.length === 0, 'O ditado real deve produzir oito itens sem perguntas de categoria');
    const planoDaniel = w.EndomapaVozRegras.planejar(interpretado, ditadoDaniel, 'ambas', biblioteca);
    verificar(planoDaniel.filter(l => l.nome.startsWith('Adenomiose')).length === 3, 'Três focos devem produzir três imagens');
    verificar(new Set(planoDaniel.filter(l => l.nome.startsWith('Adenomiose')).map(l => l.vistas[0].dados.x)).size === 3, 'Os focos devem aparecer separados');
    for (const l of planoDaniel.filter(l => /Adenomiose|DIU/.test(l.nome))) verificar(l.medidas.every(m => m === null) && l.vistas.every(v => v.dados.medida1 === ''), 'Não inventar medidas para adenomiose ou DIU');
    for (const [nome, valores, arquivo] of [
      ['Ligamento uterossacro · esquerdo', [1.8, .6, null], 'endometriose-isolada'],
      ['Mioma 1', [3.6, 2.1, 2.3], 'mioma-1'],
      ['Retrocervical', [3.6, 2.9, null], 'retrocervical'],
      ['Pólipo', [.8, .6, null], 'polipo'],
      ['DIU de Cobre', [null, null, null], 'diu-cobre'],
    ]) {
      const l = planoDaniel.find(item => item.nome === nome);
      verificar(l && JSON.stringify(l.medidas) === JSON.stringify(valores) && l.vistas.every(v => v.src.includes(arquivo)), 'Modelo ou medidas incorretos para ' + nome);
    }
    verificar(interpretarBiblioteca('Mioma dois medindo três vírgula seis por dois vírgula um centímetros. Pólipo medindo zero vírgula oito por zero vírgula seis centímetros.').lesoes[0].modelo === 'Mioma 2', 'Números falados e modelo numerado devem ser reconhecidos');
    for (const texto of ['não há mioma', 'Mioma 4', 'mioma no reto medindo 2 cm', 'pólipo medindo 0,8 por 0,6 cm e lesão desconhecida', 'mioma 1 medindo -2 cm', 'dois focos de adenomiose um deles posterior']) {
      verificar(interpretarBiblioteca(texto) === null, 'Trecho desconhecido ou negativo não pode ser ignorado: ' + texto);
    }
    for (const texto of ['ligamento uterossacro medindo 1 cm', 'cisto medindo 2 cm', 'três focos de adenomiose medindo 2 cm', 'pólipo medindo 0 cm', '31 focos de adenomiose']) {
      let recusado = false; try { interpretarBiblioteca(texto); } catch (_) { recusado = true; }
      verificar(recusado, 'Não aceitar lado ausente, medida inválida ou atribuição ambígua: ' + texto);
    }
    // Os cenários antigos abaixo exercitam especificamente respostas/falhas da IA.
    // O caminho local real é restaurado e testado pela interface ao final.
    w.EndomapaVozRegras.interpretarBiblioteca = () => null;
    const planejar = (s, texto = 'Endometrioma direito de 3,2 por 2,1 centímetros', vista = 'coronal') => w.EndomapaVozRegras.planejar(s, texto, vista, biblioteca);
    const recusar = (s, texto, trecho) => { try { planejar(s, texto); } catch (e) { verificar(e.message.includes(trecho), 'Recusa inesperada: ' + e.message); return; } throw new Error('Comando inválido foi aceito'); };
    recusar(sugestao([dado({ lado: 'não informado' })]), '', 'Informe um comando');
    recusar(sugestao([dado({ lado: 'não informado' })]), 'Endometrioma de 3 centímetros', 'Informe o lado');
    recusar(sugestao([dado({ lado: 'bilateral' })]), 'Endometrioma bilateral', 'cada lado');
    for (const m of [0, -1, '3', Infinity, undefined]) recusar(sugestao([dado({ medida_1: m })]), 'Endometrioma', 'medidas positivas');
    recusar(sugestao([dado({ confianca: 40 })]), 'Endometrioma', 'confiança');
    recusar({ ...sugestao(), duvidas: [{ pergunta: 'Qual lado?' }] }, 'Endometrioma', 'Qual lado');
    recusar(sugestao(), 'Endometrioma de 32 milímetros', 'centímetros');
    recusar(sugestao(), 'Excluir endometrioma', 'corrigir ou excluir');
    recusar({ ...sugestao(), relacoes_anatomicas: [{}] }, 'Endometrioma', 'Aderências');
    recusar(sugestao([dado({ categoria: 'lesão tubária', localizacao: 'tuba uterina' })]), 'Lesão tubária', 'localização');
    recusar(sugestao([dado({ observacao: null }), dado({ observacao: null })]), 'Endometrioma e cisto', 'ambíguo');
    verificar(planejar(sugestao([dado({ lado: 'esquerdo' })]))[0].vistas[0].dados.x === 68, 'Lado esquerdo do ovário deve seguir a posição existente');
    verificar(planejar(sugestao(), 'Endometrioma direito', 'ambas')[0].vistas.length === 2, 'Ambas deve criar duas representações');
    for (const [categoria, localizacao, lado, modelo] of [['endometriose','ligamento uterossacro','esquerdo','Ligamento uterossacro'], ['endometriose','região retrocervical','central','Retrocervical'], ['adenomiose','útero','central','Adenomiose'], ['mioma','útero','central','Mioma']]) {
      verificar(planejar(sugestao([dado({ categoria, localizacao, lado, observacao: null })]), modelo)[0].nome.startsWith(modelo), 'Imagem incorreta: ' + modelo);
    }
    verificar(!d.querySelector('[data-salvar-manual], [data-baixar-pdf-manual]'), 'Teste não deve oferecer salvamento nem PDF');
    verificar(!Array.from(d.scripts).some(s => /historico-manual|mapas\.js|ia\.js|app-auth/.test(s.src)), 'Scripts de produção com gravação não devem carregar');
    verificar(d.documentElement.scrollWidth <= w.innerWidth, 'Página ultrapassa os 390 pixels');
    for (const largura of [320, 1440, 390]) {
      quadro.style.width = largura + 'px';
      await pausa();
      verificar(d.documentElement.scrollWidth <= w.innerWidth, 'Página ultrapassa a tela de ' + largura + ' pixels');
      if (largura === 1440) {
        const bibliotecaBox = $('.biblioteca-lesoes').getBoundingClientRect(), mapaBox = $('#imagem-teste').getBoundingClientRect(), painelBox = $('#voz-lateral').getBoundingClientRect();
        verificar(bibliotecaBox.right <= mapaBox.left && mapaBox.right <= painelBox.left, 'Computador deve mostrar biblioteca à esquerda, mapa central e ditado à direita');
      }
    }
    // Estados e preservação do texto sem chamar o interpretador.
    const simuladas = [], estados = [];
    let textoMostrado = '', liberarVoz;
    let atrasarVoz = false;
    const mic = w.criarMicrofoneDeTeste({ aoTexto: texto => { textoMostrado = texto; }, aoEstado: e => estados.push(e), aoComando: async texto => {
      simuladas.push(texto); if (atrasarVoz) await new Promise(r => { liberarVoz = r; }); return true;
    } });
    mic.iniciar();
    let instancia = t.instancias.at(-1);
    instancia.resultado('Somente provisório', false); mic.parar(); await pausa();
    verificar(simuladas.length === 0 && textoMostrado === 'Somente provisório', 'Trecho provisório deve ser preservado para revisão, sem interpretar');
    verificar(estados.at(-1).texto.includes('não confirmou'), 'Trecho não confirmado precisa ser explicado');
    mic.iniciar(); instancia = t.instancias.at(-1);
    instancia.onerror({ error: 'not-allowed' }); instancia.onend(); await pausa();
    verificar(estados.at(-1).texto.includes('Autorize'), 'Erro de permissão deve permanecer visível');
    mic.iniciar(); instancia = t.instancias.at(-1);
    instancia.resultado('Frase preservada', true); mic.cancelar(); instancia.terminar('Resposta após cancelamento'); await pausa();
    verificar(simuladas.length === 0 && textoMostrado === 'Frase preservada', 'Cancelar deve preservar texto e ignorar resultados tardios');
    mic.iniciar(textoMostrado); instancia = t.instancias.at(-1);
    instancia.resultado('Segunda frase', true); mic.parar();
    instancia.resultados([['Segunda frase', true], ['Últimas medidas', true]]);
    await pausa();
    verificar(simuladas.length === 1 && simuladas[0] === 'Frase preservada Segunda frase Últimas medidas', 'Finalizar deve aguardar e incluir as últimas palavras');
    atrasarVoz = true;
    mic.iniciar(); instancia = t.instancias.at(-1); instancia.resultado('Frase lenta', true); mic.parar();
    await esperar(() => liberarVoz, 'A interpretação simulada não aguardou');
    const antesDeParar = t.instancias.length;
    mic.parar(); liberarVoz(); await pausa();
    verificar(t.instancias.length === antesDeParar && simuladas.length === 2, 'Finalizar duas vezes não pode duplicar nem reativar o microfone');
    const Tipo = w.SpeechRecognition, TipoWebkit = w.webkitSpeechRecognition;
    w.SpeechRecognition = undefined; w.webkitSpeechRecognition = undefined;
    const semVoz = w.criarMicrofoneDeTeste({ aoEstado() {}, aoTexto() {}, aoComando() {} });
    verificar(!semVoz.disponivel, 'Navegador sem voz deve ser detectado'); semVoz.iniciar();
    w.SpeechRecognition = Tipo; w.webkitSpeechRecognition = TipoWebkit;
    t.instancias.length = 0;
    const escrever = texto => { $('#voz-texto').value = texto; $('#voz-texto').dispatchEvent(new w.Event('input', { bubbles: true })); };
    // Uma lesão colocada manualmente antes do ditado deve permanecer intacta.
    $('[data-modelo][data-nome="Mioma 1"]').click();
    verificar($('#voz-painel').hidden && !$('#voz-ajustes').hidden && !$('[data-controles-lesao]').hidden, 'Inserção manual deve abrir ajustes');
    lesoes('coronal')[0].dataset.x = '24';
    lesoes('coronal')[0].dataset.medida1 = '7,5';
    const texto1 = 'Endometrioma no ovário direito, três vírgula dois por dois vírgula um centímetros.';
    const texto2 = 'Cisto no ovário esquerdo de dois vírgula quatro por um vírgula oito por um vírgula três centímetros.';
    const texto3 = 'Endometriose no ligamento uterossacro esquerdo de um vírgula nove por zero vírgula dois centímetros.';
    const ligamento = dado({ categoria: 'endometriose', localizacao: 'ligamento uterossacro', lado: 'esquerdo', medida_1: 1.9, medida_2: 0.2, observacao: null });
    t.resposta = sugestao([dado(), dado({ lado: 'esquerdo', medida_1: 2.4, medida_2: 1.8, medida_3: 1.3, observacao: 'Cisto' }), ligamento]);
    $('#voz-iniciar').click(); $('#voz-iniciar').click();
    await esperar(() => t.instancias.length === 1, 'Microfone não iniciou');
    const primeiro = t.instancias[0];
    verificar(primeiro.phrases.length === 0 && primeiro.iniciou, 'Voz padrão não deve usar o vocabulário que o Chrome recusa');
    verificar(primeiro.lang === 'pt-BR' && primeiro.continuous === true, 'Microfone deve captar o ditado contínuo pt-BR');
    primeiro.resultado('Endometrioma provisório', false);
    await pausa(); verificar(t.chamadas.length === 0 && lesoes('coronal').length === 1, 'Fala não pode alterar o mapa antes de finalizar');
    primeiro.resultados([[texto1, true], [texto2, true]]);
    primeiro.resultados([[texto1, true], [texto2, true]]);
    await pausa();
    verificar(t.chamadas.length === 0 && $('#voz-texto').value === texto1 + ' ' + texto2, 'Frases finais devem se acumular sem interpretar ou duplicar');
    primeiro.onend(); primeiro.onend();
    await esperar(() => t.instancias.length === 2, 'Fim de sessão do navegador deve retomar somente a escuta');
    verificar(t.chamadas.length === 0 && lesoes('coronal').length === 1, 'Pausa natural não pode enviar o texto à IA');
    const segundo = t.instancias[1];
    segundo.resultado(texto3, true);
    verificar($('#voz-texto').value === [texto1, texto2, texto3].join(' '), 'Retomada não pode perder frases anteriores');
    $('#voz-parar').click(); $('#voz-parar').dispatchEvent(new w.MouseEvent('click'));
    await esperar(() => lesoes('coronal').length === 4 && !$('#voz-iniciar').disabled, 'Ditado completo não inseriu as três lesões ao finalizar');
    verificar($('#voz-painel').hidden && !$('#voz-ajustes').hidden && !$('#voz-retomar').hidden, 'Após ditado deve mostrar ajustes e Retomar ditado');
    verificar(t.chamadas.length === 1 && t.chamadas[0].texto === [texto1, texto2, texto3].join(' '), 'Deve enviar exatamente uma interpretação do texto inteiro');
    verificar(t.instancias.length === 2, 'O microfone deve permanecer parado após inserir');
    const endometrioma = Array.from(lesoes('coronal')).find(l => l.dataset.nomeNoMapa.startsWith('Endometrioma'));
    const cisto = Array.from(lesoes('coronal')).find(l => l.dataset.nomeNoMapa.startsWith('Cisto'));
    const uterossacro = Array.from(lesoes('coronal')).find(l => l.dataset.nomeNoMapa.startsWith('Ligamento'));
    verificar(endometrioma.dataset.medida1 === '3,2' && endometrioma.dataset.medida2 === '2,1' && endometrioma.dataset.medida3 === '', 'Medidas do endometrioma devem permanecer associadas a ele');
    verificar(cisto.dataset.medida1 === '2,4' && cisto.dataset.medida2 === '1,8' && cisto.dataset.medida3 === '1,3' && cisto.querySelector('img').src.includes('/cisto-referencia.png'), 'Cisto deve usar sua imagem e suas três medidas');
    verificar(uterossacro.dataset.medida1 === '1,9' && uterossacro.dataset.medida2 === '0,2', 'Ligamento deve receber somente suas medidas');
    verificar(lesoes('coronal')[0].dataset.x === '24' && lesoes('coronal')[0].dataset.medida1 === '7,5', 'Lesão manual existente deve ser preservada');
    verificar(lesoes('sagital').length === 0, 'Coronal não pode inserir na sagital');
    primeiro.terminar('Resposta atrasada'); await pausa(); verificar(t.chamadas.length === 1, 'Resultado antigo não pode duplicar lesões');
    $('#voz-enviar').dispatchEvent(new w.MouseEvent('click')); await pausa();
    verificar(t.chamadas.length === 1, 'Reenviar ditado já inserido não pode duplicar o lote');
    // Novo ditado começa vazio e só processa ao finalizar.
    $('#voz-iniciar').click(); verificar($('#voz-texto').value === '', 'Novo ditado não deve reaproveitar texto já inserido');
    const terceiro = t.instancias.at(-1);
    t.resposta = { ...sugestao(), duvidas: [{ pergunta: 'Qual o lado?' }] };
    terceiro.resultado('Endometrioma sem lado', true); $('#voz-parar').click();
    await esperar(() => !$('#voz-enviar').disabled, 'Dúvida não liberou a revisão');
    verificar(lesoes('coronal').length === 4 && t.instancias.length === 3, 'Dúvida não pode inserir nem retomar o microfone');
    verificar($('#voz-estado').textContent.includes('Qual o lado'), 'Pergunta deve ficar visível');
    verificar(!$('#voz-painel').hidden && $('#voz-ajustes').hidden, 'Dúvida deve manter ditado visível para revisão');
    // Continua possível corrigir o texto e acrescentar em Ambas.
    t.resposta = sugestao([dado({ lado: 'esquerdo' })]);
    const ambas = $('input[name="vistas-editor"][value="ambas"]'); ambas.checked = true; ambas.dispatchEvent(new w.Event('change', { bubbles: true }));
    escrever('Endometrioma no ovário esquerdo de 3,2 por 2,1 centímetros');
    $('#voz-enviar').click(); $('#voz-enviar').dispatchEvent(new w.MouseEvent('click'));
    await esperar(() => lesoes('coronal').length === 5 && !$('#voz-iniciar').disabled, 'Texto não concluiu');
    verificar(lesoes('sagital').length === 1 && t.chamadas.length === 3, 'Ambas deve acrescentar uma vez, preservando o mapa');
    escrever('Outro endometrioma no ovário esquerdo de 2 por 1 centímetros');
    t.resposta = sugestao([dado(), dado({ medida_1: -1 })]);
    $('#voz-enviar').click(); await esperar(() => !$('#voz-enviar').disabled, 'Falha atômica não terminou');
    verificar(lesoes('coronal').length === 5, 'Um item inválido deve impedir inserção parcial');
    t.falhar = true; $('#voz-enviar').click(); await esperar(() => !$('#voz-enviar').disabled, 'Falha do serviço não terminou');
    verificar(lesoes('coronal').length === 5 && $('#voz-estado').textContent.includes('Falha simulada'), 'Falha deve preservar montagem e explicar causa');
    t.falhar = false; t.atrasar = true; t.resposta = sugestao();
    $('#voz-enviar').click(); await esperar(() => t.liberar, 'Pedido lento não começou');
    lesoes('coronal')[0].dataset.x = '28';
    t.liberar(); await esperar(() => lesoes('coronal').length === 6 && !$('#voz-iniciar').disabled, 'Pedido lento não terminou');
    verificar(lesoes('coronal')[0].dataset.x === '28', 'Ajuste manual durante a interpretação deve ser preservado');
    t.liberar = null; escrever('Um novo endometrioma no ovário direito');
    $('#voz-enviar').click(); await esperar(() => t.liberar, 'Pedido lento não começou');
    t.auth('SIGNED_OUT', null); t.liberar(); await pausa();
    verificar(lesoes('coronal').length === 6 && $('#voz-comandos').disabled, 'Resposta depois de sair não pode inserir');
    w.EndomapaVozRegras.interpretarBiblioteca = interpretarBiblioteca;
    t.atrasar = false;
    t.auth('SIGNED_IN', { user: { id: 'medico-sintetico' } });
    await esperar(() => !$('#voz-iniciar').disabled, 'Acesso não voltou para testar o ditado real');
    const antesCoronal = lesoes('coronal').length, antesSagital = lesoes('sagital').length, chamadasAntes = t.chamadas.length;
    escrever(''); $('#voz-iniciar').click();
    const ditadoReal = t.instancias.at(-1);
    ditadoReal.resultado(ditadoDaniel, true);
    verificar(lesoes('coronal').length === antesCoronal, 'Ditado real não pode inserir antes de finalizar');
    $('#voz-parar').click();
    await esperar(() => lesoes('coronal').length === antesCoronal + 8 && !$('#voz-iniciar').disabled, 'Ditado real não inseriu seus oito itens: ' + $('#voz-estado').textContent);
    verificar(lesoes('sagital').length === antesSagital + 8 && t.chamadas.length === chamadasAntes, 'Nomes da biblioteca devem funcionar em ambas sem chamada à IA');
    verificar($('#voz-estado').textContent.includes('sem medidas ditadas') && $('#voz-estado').textContent.includes('posição inicial ajustável'), 'Defaults precisam ser apresentados como ajustes, não achados ditados');
    const lote = Array.from(lesoes('coronal')).slice(-8);
    verificar(lote.filter(l => l.dataset.nomeNoMapa.startsWith('Adenomiose')).length === 3, 'Os três focos devem existir no editor real');
    verificar(lote.find(l => l.dataset.nomeNoMapa === 'Pólipo').dataset.medida2 === '0,6', 'Medida do pólipo deve chegar ao editor');
    verificar(lesoes('coronal')[0].dataset.x === '28', 'Ditado real deve preservar ajustes anteriores');
    $('#voz-enviar').dispatchEvent(new w.MouseEvent('click')); await pausa();
    verificar(lesoes('coronal').length === antesCoronal + 8, 'Oito itens não podem se duplicar');
    // Uma frase fora da gramática direta deve usar a nova IA, não a antiga.
    const variacao = 'Vejo no ligamento uterosacro esquerdo uma imagem de 1,8 por 0,6 cm. Há também um pólipo de 0,6 por 0,8 cm, mioma 1 de 3,1 por 0,8 por 0,9 cm e três focos de adenomiose no útero.';
    verificar(interpretarBiblioteca(variacao) === null, 'Este caso precisa exercitar a interpretação de linguagem livre');
    const itemIA = (modelo, medidas, extras = {}) => ({ modelo, quantidade: 1, localizacao: 'não informada', lado: 'não informado', medida_1: medidas[0], medida_2: medidas[1], medida_3: medidas[2], posicao_ditada: null, confianca: 95, ...extras });
    t.resposta = { confianca: 95, duvidas: [], itens: [
      itemIA('Ligamento uterossacro', [1.8, .6, null], { lado: 'esquerdo' }),
      itemIA('Pólipo', [.6, .8, null]), itemIA('Mioma 1', [3.1, .8, .9]),
      itemIA('Adenomiose 1', [null, null, null], { quantidade: 3, localizacao: 'útero' }),
    ] };
    const antesIA = lesoes('coronal').length;
    escrever(variacao); $('#voz-enviar').click();
    await esperar(() => !$('#voz-iniciar').disabled && lesoes('coronal').length === antesIA + 6, 'A nova IA não inseriu o lote: ' + $('#voz-estado').textContent);
    verificar(t.chamadas.length === chamadasAntes + 1 && t.chamadas.at(-1).url.endsWith('/interpretar-voz-teste'), 'Linguagem livre deve chamar exclusivamente a função nova');
    const novos = Array.from(lesoes('coronal')).slice(-6);
    verificar(novos[1].dataset.nomeNoMapa === 'Pólipo' && novos[1].dataset.medida1 === '0,6' && novos[1].dataset.medida2 === '0,8', 'IA deve conservar a ordem das medidas do pólipo');
    verificar(novos[2].dataset.nomeNoMapa === 'Mioma 1' && novos[2].dataset.medida1 === '3,1' && novos[2].dataset.medida3 === '0,9', 'Número do modelo não pode virar medida');
    verificar(novos.slice(3).every(l => l.dataset.nomeNoMapa.startsWith('Adenomiose') && l.dataset.medida1 === ''), 'IA deve preservar os três focos sem medidas');
    for (const item of [itemIA('Pólipo', [.6, .8, null], { localizacao: 'outra' }), itemIA('Cisto', [1, null, null]), itemIA('Adenomiose 1', [2, null, null], { quantidade: 3 }), itemIA('DIU de Cobre', [-1, null, null]), itemIA('Imagem inventada', [null, null, null])]) {
      let recusado = false; try { w.EndomapaVozRegras.prepararSugestaoIA({ confianca: 95, duvidas: [], itens: [item] }); } catch (_) { recusado = true; }
      verificar(recusado, 'Resposta da nova IA inválida não pode entrar no mapa');
    }
    const totalAntesRetomar = lesoes('coronal').length, antesRetomar = t.chamadas.length;
    $('#voz-retomar').click();
    verificar(!$('#voz-painel').hidden && $('#voz-ajustes').hidden && $('#voz-texto').value === '', 'Retomar deve reabrir ditado limpo e ocultar ajustes');
    const vozRetomada = t.instancias.at(-1);
    vozRetomada.resultado('Mioma 2 medindo 1,2 por 0,8 cm', true);
    verificar(lesoes('coronal').length === totalAntesRetomar && t.chamadas.length === antesRetomar, 'Retomar não pode repetir o lote anterior nem interpretar antes de finalizar');
    $('#voz-parar').click();
    await esperar(() => lesoes('coronal').length === totalAntesRetomar + 1 && !$('#voz-iniciar').disabled, 'Ditado retomado não acrescentou item');
    verificar($('#voz-painel').hidden && !$('#voz-ajustes').hidden, 'Novo sucesso deve voltar aos ajustes');
    const nomeSelecionado = $('[data-controle-nome-lesao]');
    nomeSelecionado.value = 'Lesão ajustada'; nomeSelecionado.dispatchEvent(new w.Event('input', { bubbles: true }));
    verificar(Array.from(lesoes('coronal')).some(l => l.dataset.nomeNoMapa === 'Lesão ajustada'), 'Ajuste deve funcionar depois da troca de painéis');
    $('[data-modelo][data-nome="Pólipo"]').click();
    verificar(lesoes('coronal').length === totalAntesRetomar + 2 && !$('#voz-ajustes').hidden, 'Biblioteca deve continuar inserindo manualmente após ditado');
    verificar(t.erros.length === 0, t.erros.join('; '));
    // Deixa a captura final mostrando os três painéis no computador.
    quadro.style.width = '1360px';
    await pausa();
    $('#voz-lateral').scrollIntoView();
    saida.textContent = 'PASSOU: painel direito alterna ditado e ajustes, Retomar ditado não duplica lote, biblioteca aberta à esquerda no computador, inserção e ajuste manual preservados, celular sem transbordamento; ditado contínuo, interpretação, falhas e login. Voz e IA simuladas.';
  } catch (erro) { saida.textContent = 'FALHOU: ' + erro.message; }
})();
