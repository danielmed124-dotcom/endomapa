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
        if (String(url).includes('/functions/v1/interpretar-ditado')) {
          t.chamadas.push({ texto: JSON.parse(opcoes.body).texto_bruto, metodo: opcoes.method });
          if (t.atrasar) await new Promise(r => { t.liberar = r; });
          return new Response(JSON.stringify(t.falhar ? { erro: 'Falha simulada do serviço.' } : { sugestao: t.resposta }), { status: t.falhar ? 503 : 200, headers: { 'Content-Type': 'application/json' } });
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
    }
    // Estado do microfone também é testado isoladamente, sem o interpretador.
    const simuladas = [], estados = [];
    let liberarVoz;
    let atrasarVoz = false;
    const mic = w.criarMicrofoneDeTeste({ aoTexto() {}, aoEstado: e => estados.push(e), aoComando: async texto => {
      simuladas.push(texto); if (atrasarVoz) await new Promise(r => { liberarVoz = r; }); return true;
    } });
    mic.iniciar();
    let instancia = t.instancias.at(-1);
    instancia.resultado('Somente provisório', false); instancia.onend(); await pausa();
    verificar(simuladas.length === 0, 'Interim sem final não pode ser enviado');
    mic.iniciar(); instancia = t.instancias.at(-1);
    instancia.onerror({ error: 'not-allowed' }); instancia.onend(); await pausa();
    verificar(estados.at(-1).texto.includes('Autorize'), 'Erro de permissão deve permanecer visível');
    mic.iniciar(); instancia = t.instancias.at(-1);
    mic.cancelar(); instancia.terminar('Comando após cancelamento'); await pausa();
    verificar(simuladas.length === 0, 'Cancelar deve descartar resultados tardios');
    mic.iniciar(); instancia = t.instancias.at(-1);
    instancia.resultado('Frase ao parar', true); mic.parar(); await pausa();
    verificar(simuladas.length === 1 && estados.at(-1).texto.includes('parado'), 'Parar deve concluir uma frase final sem reativar');
    atrasarVoz = true;
    mic.iniciar(); instancia = t.instancias.at(-1); instancia.terminar('Frase lenta');
    await esperar(() => liberarVoz, 'A interpretação simulada não aguardou');
    const antesDeParar = t.instancias.length;
    mic.parar(); liberarVoz(); await pausa();
    verificar(t.instancias.length === antesDeParar && simuladas.length === 2, 'Parar durante interpretação não pode reativar microfone');
    const Tipo = w.SpeechRecognition, TipoWebkit = w.webkitSpeechRecognition;
    w.SpeechRecognition = undefined; w.webkitSpeechRecognition = undefined;
    const semVoz = w.criarMicrofoneDeTeste({ aoEstado() {}, aoTexto() {}, aoComando() {} });
    verificar(!semVoz.disponivel, 'Navegador sem voz deve ser detectado'); semVoz.iniciar();
    w.SpeechRecognition = Tipo; w.webkitSpeechRecognition = TipoWebkit;
    t.instancias.length = 0;
    t.resposta = sugestao();
    $('#voz-iniciar').click(); $('#voz-iniciar').click();
    await esperar(() => t.instancias.length === 1, 'Microfone não iniciou');
    const primeiro = t.instancias[0];
    verificar(primeiro.phrases.length === 0 && primeiro.iniciou, 'Voz padrão não deve usar o vocabulário que o Chrome recusa');
    verificar(primeiro.lang === 'pt-BR' && primeiro.continuous === false, 'Microfone deve ouvir um comando pt-BR por vez');
    primeiro.resultado('Endometrioma provisório', false);
    await pausa(); verificar(t.chamadas.length === 0 && lesoes('coronal').length === 0, 'Texto provisório não pode virar lesão');
    primeiro.terminar('Endometrioma no ovário direito, três vírgula dois por dois vírgula um centímetros');
    await esperar(() => lesoes('coronal').length === 1 && t.instancias.length === 2, 'Comando final não inseriu automaticamente e retomou o microfone');
    verificar(t.chamadas.length === 1, 'Eventos finais repetidos devem gerar uma única interpretação');
    const inserida = lesoes('coronal')[0];
    verificar(inserida.dataset.medida1 === '3,2' && inserida.dataset.medida2 === '2,1' && inserida.dataset.medida3 === '', 'Medidas ditadas não chegaram ao mapa');
    verificar(inserida.dataset.x === '32' && inserida.dataset.y === '50', 'Posição deve seguir o mapeamento existente');
    verificar(lesoes('sagital').length === 0, 'Coronal não pode inserir na sagital');
    primeiro.terminar('Resposta atrasada'); await pausa(); verificar(t.chamadas.length === 1, 'Resultado antigo não pode duplicar lesões');
    t.resposta = { ...sugestao(), duvidas: [{ pergunta: 'Qual o lado?' }] };
    t.instancias[1].terminar('Endometrioma sem lado');
    await esperar(() => !$('#voz-enviar').disabled, 'Dúvida não parou a escuta');
    verificar(lesoes('coronal').length === 1 && t.instancias.length === 2, 'Dúvida não pode inserir nem continuar consumindo chamadas');
    verificar($('#voz-estado').textContent.includes('Qual o lado'), 'Pergunta deve ficar visível');
    t.resposta = sugestao([dado({ lado: 'esquerdo' })]);
    const ambas = $('input[name="vistas-editor"][value="ambas"]'); ambas.checked = true; ambas.dispatchEvent(new w.Event('change', { bubbles: true }));
    $('#voz-texto').value = 'Endometrioma no ovário esquerdo de 3,2 por 2,1 centímetros';
    $('#voz-enviar').click(); $('#voz-enviar').dispatchEvent(new w.MouseEvent('click'));
    await esperar(() => !$('#voz-enviar').disabled, 'Texto não concluiu');
    verificar(lesoes('coronal').length === 2 && lesoes('sagital').length === 1 && t.chamadas.length === 3, 'Texto e Ambas devem acrescentar uma vez, preservando o mapa');
    t.resposta = sugestao([dado(), dado({ medida_1: -1 })]);
    $('#voz-enviar').click(); await esperar(() => !$('#voz-enviar').disabled, 'Falha atômica não terminou');
    verificar(lesoes('coronal').length === 2, 'Um item inválido deve impedir inserção parcial');
    t.falhar = true; $('#voz-enviar').click(); await esperar(() => !$('#voz-enviar').disabled, 'Falha do serviço não terminou');
    verificar(lesoes('coronal').length === 2 && $('#voz-estado').textContent.includes('Falha simulada'), 'Falha deve preservar montagem e explicar causa');
    t.falhar = false; t.atrasar = true; t.resposta = sugestao();
    $('#voz-enviar').click(); await esperar(() => t.liberar, 'Pedido lento não começou');
    lesoes('coronal')[0].dataset.x = '24';
    t.liberar(); await esperar(() => !$('#voz-enviar').disabled, 'Pedido lento não terminou');
    verificar(lesoes('coronal').length === 3 && lesoes('coronal')[0].dataset.x === '24', 'Ajuste manual durante a interpretação deve ser preservado');
    t.liberar = null;
    $('#voz-enviar').click(); await esperar(() => t.liberar, 'Pedido lento não começou');
    t.auth('SIGNED_OUT', null); t.liberar(); await pausa();
    verificar(lesoes('coronal').length === 3 && $('#voz-comandos').disabled, 'Resposta depois de sair não pode inserir');
    verificar(t.erros.length === 0, t.erros.join('; '));
    $('#imagem-teste').scrollIntoView();
    saida.textContent = 'PASSOU: voz automática com resultados finais, retomada, sem duplicação, medidas, lateralidade, duas vistas, dúvidas, falhas, cancelamento de sessão, regras atômicas e celular de 390 pixels. Nenhuma chamada real à IA ou gravação de mapas.';
  } catch (erro) { saida.textContent = 'FALHOU: ' + erro.message; }
})();
