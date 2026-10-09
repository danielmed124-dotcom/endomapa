(async function () {
  "use strict";
  const $ = seletor => document.querySelector(seletor);
  const campo = $('#voz-texto');
  const iniciar = $('#voz-iniciar');
  const parar = $('#voz-parar');
  const enviar = $('#voz-enviar');
  const estado = $('#voz-estado');
  const apagar = $('#voz-apagar');
  let cliente, usuario, microfone;
  let ocupado = false;
  let ouvindo = false;
  let sequencia = 0;
  let requisicao = null;
  let total = 0;
  let ultimoTextoInserido = '';
  let acessoValido = false;
  let verificandoAcesso = false;
  let verificarDepois = false;
  let versaoAcesso = 0;
  const reverAcesso = $('#voz-rever-acesso');
  function mostrarPainel(modo, focar = false) {
    const lateral = $('#voz-lateral');
    if (!lateral) return;
    lateral.dataset.modo = modo;
    $('#voz-painel').hidden = modo !== 'ditado';
    $('#voz-ajustes').hidden = modo !== 'ajustes';
    if (focar) (modo === 'ditado' ? iniciar : $('#voz-retomar')).focus({ preventScroll: true });
  }
  function informar(texto, tipo = 'neutro') {
    if (texto) estado.textContent = texto;
    estado.dataset.tipo = tipo;
  }
  function controles() {
    iniciar.disabled = !acessoValido || !microfone?.disponivel || ocupado || ouvindo;
    parar.disabled = !ouvindo || ocupado;
    enviar.disabled = !acessoValido || ocupado || ouvindo || !campo.value.trim() || campo.value.trim() === ultimoTextoInserido;
    iniciar.textContent = campo.value.trim() && campo.value.trim() !== ultimoTextoInserido ? 'Continuar ditado' : 'Iniciar ditado';
    campo.readOnly = ocupado || ouvindo;
    apagar.disabled = !acessoValido || ocupado || !campo.value;
    $('#voz-barra').hidden = !ouvindo && !ocupado;
    $('#voz-barra-estado').textContent = ocupado ? 'Interpretando…' : 'Microfone ativo';
    $('#voz-barra-parar').disabled = !ouvindo;
    if ($('#voz-retomar')) $('#voz-retomar').disabled = !acessoValido || ocupado || ouvindo;
    document.querySelectorAll('input[name="vistas-editor"]').forEach(c => { c.disabled = ocupado || ouvindo; });
  }
  function apagarDitado() {
    if (!acessoValido || ocupado) return;
    microfone?.cancelar();
    campo.value = '';
    informar('Ditado apagado. As lesões do mapa foram preservadas.');
    controles();
    campo.focus();
  }
  function registrar(texto, mensagem, sucesso) {
    const item = document.createElement('li');
    const frase = document.createElement('p');
    const resultado = document.createElement('p');
    frase.textContent = texto;
    resultado.textContent = (sucesso ? 'Inserido: ' : 'Pendente: ') + mensagem;
    resultado.className = 'texto-apoio';
    item.append(frase, resultado);
    $('#voz-historico').prepend(item);
    total++;
    $('#voz-contagem').textContent = '(' + total + ')';
    while ($('#voz-historico').children.length > 30) $('#voz-historico').lastElementChild.remove();
    if (!sucesso) $('#voz-registro').open = true;
  }
  async function carregarScript(src) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Não foi possível carregar uma parte do editor. Atualize a página.'));
      document.body.append(script);
    });
  }
  async function prepararEditor() {
    // Reaproveita só a marcação do editor. Scripts, histórico, autenticação e
    // navegação do app não são executados nem incorporados nesta página.
    const resposta = await fetch('app.html');
    if (!resposta.ok) throw new Error('Não foi possível abrir o editor de teste.');
    const origem = new DOMParser().parseFromString(await resposta.text(), 'text/html');
    const editor = origem.querySelector('[data-tela="editor-manual"]');
    if (!editor) throw new Error('Editor indisponível. Atualize a página.');
    editor.hidden = false;
    editor.querySelectorAll('script').forEach(e => e.remove());
    editor.querySelector('#titulo-editor-manual').textContent = 'Mapa de teste';
    editor.querySelector('.selo').textContent = 'Montagem temporária';
    const cabecalho = editor.querySelector('.editor-manual__cabecalho');
    const explicacoes = cabecalho.querySelectorAll('p.texto-apoio');
    explicacoes[0].textContent = 'Confira local, lado e medidas. As posições são iniciais: arraste as lesões e os rótulos para ajustar.';
    explicacoes[1].textContent = 'As lesões do ditado entram na vista selecionada. Em Ambas, entram nas duas vistas. O tamanho da figura é ilustrativo; as medidas ficam no rótulo.';
    editor.querySelector('input[name="vistas-editor"][value="ambas"]').checked = false;
    editor.querySelector('input[name="vistas-editor"][value="coronal"]').checked = true;
    const acoes = editor.querySelector('.editor-manual__acoes');
    const limpar = acoes.querySelector('[data-limpar-mapa]');
    limpar.textContent = 'Limpar a vista de teste';
    acoes.replaceChildren(limpar);
    editor.querySelector('.editor-manual__area').id = 'imagem-teste';
    editor.querySelector('#ajuda-escala-cinza').textContent = 'Aplica-se às vistas deste teste. As lesões permanecem coloridas.';
    editor.querySelectorAll('[data-mapa-base]').forEach(img => { img.loading = 'eager'; });
    $('#mapa-teste').replaceChildren(document.importNode(editor, true));
    const ajustes = $('[data-controles-lesao]');
    const lateral = document.createElement('aside');
    lateral.id = 'voz-lateral';
    lateral.setAttribute('aria-label', 'Ditado e ajustes das lesões');
    ajustes.replaceWith(lateral);
    const grupo = document.createElement('div');
    grupo.id = 'voz-ajustes';
    const retomar = document.createElement('button');
    retomar.id = 'voz-retomar'; retomar.type = 'button'; retomar.className = 'botao botao--secundario';
    retomar.textContent = 'Retomar ditado';
    const resultado = document.createElement('p');
    resultado.id = 'voz-resultado'; resultado.setAttribute('role', 'status');
    const ajuda = document.createElement('p');
    ajuda.className = 'texto-apoio voz-sem-selecao';
    ajuda.textContent = 'Selecione uma lesão no mapa ou insira uma imagem pela biblioteca para ajustar.';
    grupo.append(retomar, resultado, ajustes, ajuda);
    lateral.append($('#voz-painel'), grupo);
    mostrarPainel('ditado');
    retomar.addEventListener('click', () => {
      mostrarPainel('ditado', true);
      if (!iniciar.disabled) iniciar.click();
      else campo.focus();
    });
    // A seleção manual abre seus ajustes, preservando qualquer texto pendente.
    $('#mapa-teste').addEventListener('click', evento => {
      if (!ocupado && !ouvindo && evento.target.closest('[data-modelo], .lesao-editavel')) mostrarPainel('ajustes');
    });
    await carregarScript('prototipo.js?v=hidrosalpinge-1');
    await carregarScript('editor-manual.js?v=rotulos-exportacao-1');
    if (!window.endomapaEditorManual) throw new Error('Não foi possível iniciar os controles do mapa.');
  }
  async function interpretar(texto, versao) {
    const { data, error } = await cliente.auth.getSession();
    if (error || !data.session || data.session.user.id !== usuario.id) throw new Error('Sua sessão terminou. Entre novamente e atualize esta página.');
    if (versao !== sequencia || !acessoValido) throw new Error('Comando cancelado.');
    const sugestaoLocal = window.EndomapaVozRegras.interpretarBiblioteca(texto);
    if (sugestaoLocal) return { sugestao: sugestaoLocal };
    requisicao = new AbortController();
    const tempo = setTimeout(() => requisicao?.abort(), 35000);
    try {
      const resposta = await fetch(window.ENDOMAPA_SUPABASE.projectUrl + '/functions/v1/interpretar-voz-teste', {
        method: 'POST', signal: requisicao.signal,
        headers: { 'Content-Type': 'application/json', apikey: window.ENDOMAPA_SUPABASE.publicAnonKey,
          Authorization: 'Bearer ' + data.session.access_token },
        body: JSON.stringify({ texto_bruto: texto }),
      });
      const retorno = await resposta.json();
      if (!resposta.ok || retorno.erro) throw new Error(typeof retorno.erro === 'string' ? retorno.erro : 'Não foi possível interpretar o comando. Tente novamente.');
      retorno.sugestao = window.EndomapaVozRegras.prepararSugestaoIA(retorno.sugestao);
      return retorno;
    } finally { clearTimeout(tempo); requisicao = null; }
  }
  async function processar(texto) {
    if (ocupado || !acessoValido) return false;
    if (texto.trim() === ultimoTextoInserido) { informar('Este ditado já foi inserido. Inicie outro ditado para acrescentar novas lesões.'); return false; }
    ocupado = true;
    const versao = ++sequencia;
    const destino = $('input[name="vistas-editor"]:checked').value;
    controles();
    informar('Interpretando o ditado completo e preparando todas as lesões…', 'processando');
    try {
      window.EndomapaVozRegras.conferirTexto(texto);
      const retorno = await interpretar(texto, versao);
      if (versao !== sequencia || !acessoValido) return false;
      const biblioteca = Array.from(document.querySelectorAll('[data-modelo]'), botao => ({ ...botao.dataset }));
      const plano = window.EndomapaVozRegras.planejar(retorno.sugestao, texto, destino, biblioteca);
      // Valida o comando inteiro antes de tocar na montagem. Usa a montagem
      // mais recente, preservando ajustes manuais feitos durante a interpretação.
      const montagem = window.endomapaEditorManual.capturar();
      for (const lesao of plano) for (const item of lesao.vistas) {
        montagem.vistas[item.vista].lesoes.push({ src: item.src, dados: item.dados });
      }
      montagem.escolha = destino;
      montagem.ativa = destino === 'sagital' ? 'sagital' : 'coronal';
      window.endomapaEditorManual.validar(montagem);
      window.endomapaEditorManual.restaurar(montagem);
      ultimoTextoInserido = texto.trim();
      const resumo = plano.map(l => l.nome + ', ' + (l.medidas.some(m => m !== null) ? l.medidas.filter(m => m !== null).map(m => String(m).replace('.', ',')).join(' × ') + ' cm' : 'sem medidas ditadas') + (l.observacao ? ' (' + l.observacao + ')' : '')).join('; ');
      registrar(texto, resumo + ' · ' + destino, true);
      informar('Inserido no mapa: ' + resumo + '. Confira a posição e as medidas.', 'sucesso');
      $('#voz-resultado').textContent = (plano.length === 1 ? '1 item inserido.' : plano.length + ' itens inseridos.') + ' Selecione uma lesão para ajustar.';
      mostrarPainel('ajustes', true);
      return true;
    } catch (erro) {
      if (versao !== sequencia) return false;
      const mensagem = erro.name === 'AbortError' ? 'A interpretação demorou demais. Seu mapa foi preservado; tente novamente.' : erro.message || 'Falha de conexão. Seu mapa foi preservado.';
      informar(mensagem, 'erro');
      mostrarPainel('ditado');
      registrar(texto, mensagem, false);
      return false;
    } finally { ocupado = false; controles(); }
  }
  function interromper() {
    ++sequencia;
    requisicao?.abort();
    microfone?.cancelar();
  }
  function comPrazo(pedido) {
    let temporizador;
    return Promise.race([pedido, new Promise((_, rejeitar) => {
      temporizador = setTimeout(() => rejeitar(new Error('A conferência do acesso demorou demais. Confira a conexão e toque em Tentar novamente.')), 15000);
    })]).finally(() => clearTimeout(temporizador));
  }
  async function conferirAcesso() {
    if (verificandoAcesso) { verificarDepois = true; return; }
    verificandoAcesso = true;
    const tentativa = ++versaoAcesso;
    reverAcesso.disabled = true;
    $('#voz-acesso').textContent = 'Conferindo acesso…';
    try {
      const { data, error } = await comPrazo(cliente.auth.getUser());
      if (tentativa !== versaoAcesso) return;
      if (error || !data.user) {
        $('#voz-login').hidden = false;
        throw new Error('Use o link de entrada para acessar sua conta. Ao voltar a esta aba, os comandos serão liberados após conferir seu acesso.');
      }
      if (usuario && usuario.id !== data.user.id) throw new Error('A conta conectada mudou. Atualize esta página para iniciar um teste com essa conta.');
      const { data: perfil, error: erroPerfil } = await comPrazo(cliente.from('medicos').select('id, titulo, nome, assinatura, clinica_id, ativo').eq('user_id', data.user.id).single());
      if (tentativa !== versaoAcesso) return;
      if (erroPerfil || !perfil || perfil.ativo !== 'sim') throw new Error('Não foi possível confirmar seu perfil ativo. Toque em Tentar novamente ou entre novamente no Endomapa.');
      usuario = data.user;
      window.dispatchEvent(new CustomEvent('endomapa:perfil-carregado', { detail: perfil }));
      acessoValido = true;
      $('#voz-comandos').disabled = false;
      $('#voz-login').hidden = true;
      reverAcesso.hidden = true;
      $('#voz-acesso').textContent = 'Acesso confirmado: ' + perfil.titulo + ' ' + perfil.nome + '.';
      informar(microfone.disponivel ? 'Pronto. Inicie o ditado e fale todas as lesões. Finalize somente quando terminar.' : 'Este navegador não oferece reconhecimento de voz. Você pode testar digitando o ditado.', microfone.disponivel ? 'neutro' : 'erro');
      document.body.dataset.vozPronta = 'true';
    } catch (erro) {
      if (tentativa !== versaoAcesso) return;
      acessoValido = false;
      mostrarPainel('ditado');
      $('#voz-comandos').disabled = true;
      $('#voz-login').hidden = false;
      reverAcesso.hidden = false;
      $('#voz-acesso').textContent = erro.message;
      informar(erro.message, 'erro');
      document.body.dataset.vozPronta = 'erro';
    } finally {
      verificandoAcesso = false;
      reverAcesso.disabled = false;
      controles();
      if (verificarDepois) {
        verificarDepois = false;
        if (!acessoValido) setTimeout(conferirAcesso, 0);
      }
    }
  }
  reverAcesso.addEventListener('click', () => {
    if (cliente && microfone) conferirAcesso();
    else window.location.reload();
  });
  try {
    await prepararEditor();
    if (!window.supabase || !window.ENDOMAPA_SUPABASE) throw new Error('Não foi possível iniciar a conexão de acesso. Atualize a página.');
    cliente = window.supabase.createClient(window.ENDOMAPA_SUPABASE.projectUrl, window.ENDOMAPA_SUPABASE.publicAnonKey);
    microfone = window.criarMicrofoneDeTeste({
      aoTexto: texto => { campo.value = texto; apagar.disabled = !acessoValido || ocupado || !texto; },
      aoComando: processar,
      aoEstado: situacao => { ouvindo = situacao.ativo; informar(situacao.texto, situacao.tipo); controles(); },
    });
    iniciar.addEventListener('click', () => {
      mostrarPainel('ditado');
      if (campo.value.trim() === ultimoTextoInserido) { campo.value = ''; ultimoTextoInserido = ''; }
      microfone.iniciar(campo.value);
    });
    campo.addEventListener('input', controles);
    apagar.addEventListener('click', apagarDitado);
    $('#voz-painel').addEventListener('keydown', evento => {
      if (!['Delete', 'Backspace'].includes(evento.key) || evento.isComposing) return;
      // A tecla neste painel nunca deve alcançar o atalho que exclui lesões.
      evento.stopPropagation();
      if (evento.target === campo) {
        if (ocupado) { evento.preventDefault(); return; }
        if (ouvindo) {
          const inicio = campo.selectionStart, fim = campo.selectionEnd;
          microfone.cancelar();
          controles();
          campo.setSelectionRange(inicio, fim);
          informar('Escuta pausada para editar o texto. Use Continuar ditado quando quiser retomar.');
        }
        // Mantém a edição nativa: seleção, Delete, Backspace e desfazer.
      } else if (evento.key === 'Delete' && !evento.ctrlKey && !evento.metaKey && !evento.altKey && !evento.target.closest('input, textarea, select, [contenteditable]')) {
        evento.preventDefault();
        if (!evento.repeat) apagarDitado();
      }
    });
    parar.addEventListener('click', () => microfone.parar());
    $('#voz-barra-parar').addEventListener('click', () => microfone.parar());
    enviar.addEventListener('click', () => processar(campo.value.trim()));
    cliente.auth.onAuthStateChange((evento, sessao) => {
      if (evento === 'SIGNED_OUT' || (usuario && sessao && sessao.user.id !== usuario.id)) {
        ++versaoAcesso;
        acessoValido = false;
        mostrarPainel('ditado');
        interromper();
        $('#voz-comandos').disabled = true;
        $('#voz-login').hidden = false;
        reverAcesso.hidden = false;
        $('#voz-acesso').textContent = 'Sua sessão mudou. Entre novamente para continuar o teste.';
      }
      // Nunca aguardar chamadas de autenticação dentro deste callback:
      // o cliente pode estar terminando a atualização da sessão.
      if (sessao && !acessoValido && ['SIGNED_IN', 'TOKEN_REFRESHED'].includes(evento)) setTimeout(conferirAcesso, 0);
    });
    window.addEventListener('focus', () => { if (!acessoValido) conferirAcesso(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) interromper(); });
    window.addEventListener('pagehide', interromper);
    window.addEventListener('beforeunload', evento => {
      if (ocupado || campo.value.trim() || document.querySelector('.lesao-editavel')) { evento.preventDefault(); evento.returnValue = ''; }
    });
    await conferirAcesso();
  } catch (erro) {
    $('#voz-acesso').textContent = erro.message;
    informar(erro.message, 'erro');
    $('#voz-comandos').disabled = true;
    reverAcesso.hidden = false;
    document.body.dataset.vozPronta = 'erro';
  }
})();
