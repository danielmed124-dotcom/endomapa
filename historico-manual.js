(function () {
  'use strict';
  const cliente = window.endomapaSupabase;
  const editor = window.endomapaEditorManual;
  if (!cliente || !editor) return;
  const buscar = s => document.querySelector(s);
  const titulo = buscar('[data-titulo-montagem]');
  const aviso = buscar('[data-estado-salvar-manual]');
  const salvar = buscar('[data-salvar-manual]');
  const novo = buscar('[data-novo-manual]');
  const vazia = editor.capturar();
  let id = crypto.randomUUID(), versao = 0, ocupado = false, salvo = '';
  let paginas = 0, lista = [], dia = [], leitura = 0;
  const textoData = valor => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(valor));
  const conteudo = montagem => Object.values(montagem.vistas).some(v => v.lesoes.length || v.tracos.length);
  const capturar = () => ({ titulo: titulo.value.trim() || 'Mapa sem título', montagem: editor.capturar() });
  const chave = dados => JSON.stringify({ titulo: dados.titulo, montagem: dados.montagem });
  function alterado() { const atual = capturar(); return salvo ? chave(atual) !== salvo : conteudo(atual.montagem) || Boolean(titulo.value.trim()); }
  function mensagem(texto, erro = false) { aviso.textContent = texto; aviso.classList.toggle('mensagem-formulario--erro', erro); aviso.hidden = false; }
  function bloquear(valor) { ocupado = valor; salvar.disabled = valor; novo.disabled = valor; }
  function preparar(pdf = false) { return { ...capturar(), id, versao, pdf: pdf ? crypto.randomUUID() : null }; }
  function erroHistorico(texto) { const erro = new Error(texto); erro.historico = true; return erro; }
  async function gravar(registro) {
    if (ocupado) throw erroHistorico('Aguarde o salvamento terminar.');
    bloquear(true);
    mensagem('Salvando a montagem na sua conta…');
    try {
      editor.validar(registro.montagem);
      const { data, error } = await cliente.rpc('salvar_mapa_manual', {
        p_id: registro.id, p_titulo: registro.titulo, p_montagem: registro.montagem, p_versao: registro.versao, p_pdf_id: registro.pdf,
      });
      if (error) {
        if (error.code === '40001') throw erroHistorico('Este mapa foi alterado em outra aba. Sua montagem continua aqui. Reabra o mapa salvo antes de atualizar esse registro.');
        throw error;
      }
      const mapa = Array.isArray(data) ? data[0] : data;
      if (!mapa || mapa.id !== registro.id || !mapa.versao) throw new Error('Salvamento não confirmado');
      id = mapa.id; versao = mapa.versao; salvo = chave(registro);
      mensagem(alterado() ? 'Versão salva. Há alterações feitas durante o salvamento; clique em Salvar mapa para guardá-las.' : 'Mapa salvo na sua conta. Você pode reabri-lo em Meus mapas.');
      return mapa;
    } catch (erro) {
      const texto = erro.historico ? erro.message : 'Não foi possível confirmar o salvamento na sua conta. Confira a conexão e tente novamente. A montagem permanece aberta.' + (registro.pdf ? ' O PDF não foi baixado nesta tentativa.' : '');
      mensagem(texto, true);
      throw erroHistorico(texto);
    } finally { bloquear(false); }
  }
  window.endomapaHistoricoManual = { ocupado: () => ocupado, prepararPdf: () => preparar(true), salvarPdf: gravar };
  salvar.addEventListener('click', async () => {
    if (ocupado || editor.ocupado()) return;
    const registro = preparar();
    if (!conteudo(registro.montagem) && !versao) { mensagem('Adicione uma imagem ou um desenho antes de salvar.', true); return; }
    try { await gravar(registro); } catch (_) { /* Mensagem já exibida. */ }
  });
  function podeSubstituir() {
    if (ocupado || editor.ocupado()) { mensagem('Aguarde o salvamento ou a exportação terminar.'); return false; }
    return !alterado() || window.confirm('Há alterações não salvas na montagem aberta. Deseja descartá-las e continuar?');
  }
  novo.addEventListener('click', () => {
    if (!podeSubstituir()) return;
    editor.restaurar(vazia); id = crypto.randomUUID(); versao = 0; salvo = ''; titulo.value = '';
    mensagem('Novo mapa iniciado. Monte e salve quando desejar.');
  });
  window.addEventListener('beforeunload', e => { if (alterado() || ocupado) { e.preventDefault(); e.returnValue = ''; } });
  async function abrir(mapaId, botao) {
    if (!podeSubstituir()) return;
    const antesDeAbrir = chave(capturar());
    botao.disabled = true; bloquear(true);
    try {
      const { data, error } = await cliente.from('mapas_manuais').select('*').eq('id', mapaId).single();
      if (error || !data) throw new Error('Não foi possível abrir o mapa. Tente novamente.');
      // O usuário pode ter continuado editando enquanto a consulta estava em andamento.
      if (chave(capturar()) !== antesDeAbrir && !window.confirm('Você editou a montagem durante o carregamento. Abrir o mapa salvo substituirá essas alterações. Continuar?')) return;
      editor.restaurar(data.montagem);
      titulo.value = data.titulo; id = data.id; versao = data.versao; salvo = chave(capturar());
      mensagem('Mapa aberto. Clique em Salvar mapa para guardar novas alterações.');
      window.endomapaAbrirTela('editor-manual');
    } catch (erro) { window.alert(erro.message || 'Não foi possível abrir. A montagem atual foi preservada.'); }
    finally { botao.disabled = false; bloquear(false); }
  }
  function renderizar(destino, mapas) {
    destino.replaceChildren();
    mapas.forEach(mapa => {
      const artigo = document.createElement('article'); artigo.className = 'mapa-salvo';
      const nome = document.createElement('h3'); nome.textContent = mapa.titulo;
      const data = document.createElement('p'); data.textContent = 'Salvo em ' + textoData(mapa.atualizado_em);
      const botao = document.createElement('button'); botao.type = 'button'; botao.className = 'botao botao--secundario'; botao.textContent = 'Abrir para editar';
      botao.addEventListener('click', () => abrir(mapa.id, botao));
      artigo.append(nome, data, botao); destino.append(artigo);
    });
  }
  async function carregarMapas(mais = false) {
    const rodada = ++leitura;
    const estado = buscar('[data-estado-lista-mapas]'), tentar = buscar('[data-tentar-carregar-mapas]'), proxima = buscar('[data-mais-mapas]');
    estado.hidden = false; estado.textContent = 'Carregando seus mapas…'; tentar.hidden = true; proxima.disabled = true;
    if (!mais) { paginas = 0; lista = []; buscar('[data-lista-mapas]').replaceChildren(); }
    try {
      const { data, error } = await cliente.from('mapas_manuais').select('id,titulo,criado_em,atualizado_em').order('atualizado_em', { ascending: false }).order('id').range(paginas * 30, paginas * 30 + 29);
      if (rodada !== leitura) return;
      if (error) throw error;
      lista.push(...data); paginas++;
      renderizar(buscar('[data-lista-mapas]'), lista);
      estado.textContent = 'Nenhum mapa manual salvo. Abra o editor e use Salvar mapa.'; estado.hidden = lista.length > 0;
      proxima.hidden = data.length < 30;
    } catch (_) {
      if (rodada !== leitura) return;
      estado.textContent = 'Não foi possível carregar seus mapas. Tente novamente.'; tentar.hidden = false;
    } finally { if (rodada === leitura) proxima.disabled = false; }
  }
  let rodadaDia = 0;
  async function carregarDia() {
    const rodada = ++rodadaDia;
    const estado = buscar('[data-estado-painel]'), painel = buscar('[data-conteudo-painel]'), tentar = buscar('[data-tentar-carregar-painel]');
    estado.hidden = false; estado.textContent = 'Carregando o painel do dia…'; painel.hidden = true; tentar.hidden = true;
    const agora = new Date(), inicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()), fim = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()+1);
    try {
      const mapas = [];
      for (let offset = 0; ; offset += 200) {
        const { data, error } = await cliente.from('mapas_manuais').select('id,titulo,criado_em,atualizado_em').gte('atualizado_em', inicio.toISOString()).lt('atualizado_em', fim.toISOString()).order('atualizado_em', { ascending: false }).order('id').range(offset,offset+199);
        if (rodada !== rodadaDia) return;
        if (error) throw error;
        mapas.push(...data); if (data.length < 200) break;
      }
      const { count, error } = await cliente.from('pdfs_manuais').select('id', { count: 'exact', head: true }).gte('criado_em', inicio.toISOString()).lt('criado_em', fim.toISOString());
      if (rodada !== rodadaDia) return;
      if (error) throw error;
      dia = mapas;
      buscar('[data-total-mapas-hoje]').textContent = dia.length;
      buscar('[data-contador-pdf]').textContent = count;
      buscar('[data-data-painel]').textContent = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(agora);
      buscar('[data-busca-painel]').value = ''; filtrarDia(); estado.hidden = true; painel.hidden = false;
    } catch (_) {
      if (rodada !== rodadaDia) return;
      estado.textContent = 'Não foi possível carregar o painel. Confira a conexão e tente novamente.'; tentar.hidden = false;
    }
  }
  function filtrarDia() {
    const normalizar = t => t.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const termo = normalizar(buscar('[data-busca-painel]').value.trim());
    const filtrados = dia.filter(m => normalizar(m.titulo).includes(termo));
    renderizar(buscar('[data-lista-painel]'), filtrados);
    const estado = buscar('[data-estado-lista-painel]'); estado.hidden = filtrados.length > 0;
    estado.textContent = dia.length ? 'Nenhum mapa corresponde à busca.' : 'Nenhuma montagem salva hoje.';
  }
  buscar('[data-tentar-carregar-mapas]').addEventListener('click', () => carregarMapas());
  buscar('[data-mais-mapas]').addEventListener('click', () => carregarMapas(true));
  buscar('[data-tentar-carregar-painel]').addEventListener('click', carregarDia);
  buscar('[data-busca-painel]').addEventListener('input', filtrarDia);
  window.addEventListener('endomapa:tela-aberta', e => {
    if (e.detail === 'meus-mapas') carregarMapas();
    if (e.detail === 'painel-dia') carregarDia();
  });
})();
