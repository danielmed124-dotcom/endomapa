const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const codigo = fs.readFileSync('contador-exportacoes.js', 'utf8');
function ambiente(responder, cliqueFalha = false) {
  const chamadas = [], cliques = [], removidos = [];
  let sequencia = 0;
  const window = { endomapaSupabase: { rpc(nome, parametros) {
    chamadas.push({ nome, ...parametros });
    return { abortSignal: signal => responder(parametros, chamadas.length, signal) };
  } } };
  const contexto = { window, crypto: { randomUUID: () => 'evento-' + (++sequencia) }, AbortController, setTimeout, clearTimeout,
    document: { body: { append() {} }, createElement() { return {
      click() { if (cliqueFalha) throw new Error('Falha do navegador'); cliques.push(this.download); },
      remove() { removidos.push(true); },
    }; } } };
  vm.runInNewContext(codigo, contexto);
  return { window, chamadas, cliques, removidos, baixar: window.endocartaExportacoes.baixar };
}
const opcoes = { endereco: 'blob:teste', nome: 'endocarta-teste.pdf', formato: 'pdf', ferramenta: 'mapa' };
const ok = p => Promise.resolve({ data: p.p_id, error: null });
test('as seis saídas só acionam download depois da confirmação', async () => {
  for (const ferramenta of ['mapa', 'fusao']) for (const formato of ['pdf', 'png', 'jpeg']) {
    let liberar;
    const a = ambiente(p => p.p_etapa === 'preparado' ? new Promise(r => liberar = () => r({ data: p.p_id })) : ok(p));
    const pendente = a.baixar({ ...opcoes, formato, ferramenta });
    assert.equal(a.cliques.length, 0);
    liberar();
    const resultado = await pendente;
    assert.equal(resultado.acionamentoConfirmado, true);
    assert.equal(a.cliques.length, 1);
    assert.deepEqual(a.chamadas.map(c => c.p_etapa), ['preparado', 'acionado']);
    assert.equal(a.chamadas[0].p_id, a.chamadas[1].p_id);
    assert.equal(a.chamadas[0].p_ferramenta, ferramenta);
    assert.equal(a.chamadas[0].p_formato, formato);
    assert.equal(Object.hasOwn(a.chamadas[0], 'user_id'), false);
  }
});
test('falha de rede, resposta inválida ou acesso negado bloqueiam download', async () => {
  for (const resposta of [() => Promise.reject(new Error('offline')), () => Promise.resolve({ data: null }), () => Promise.resolve({error:{code:'42501'}})]) {
    const a = ambiente(resposta);
    await assert.rejects(a.baixar(opcoes), e => e.exportacao && /não foi liberado/.test(e.message));
    assert.equal(a.cliques.length, 0);
    assert.ok(a.chamadas.length <= 2);
  }
});
test('resposta perdida é repetida com mesmo ID e só um download', async () => {
  const a = ambiente((p, n) => n === 1 ? Promise.reject(new Error('resposta perdida')) : ok(p));
  await a.baixar(opcoes);
  assert.equal(new Set(a.chamadas.map(c => c.p_id)).size, 1);
  assert.equal(a.cliques.length, 1);
});
test('falha após o clique preserva registro preparado e informa confirmação pendente', async () => {
  const a = ambiente(p => p.p_etapa === 'preparado' ? ok(p) : Promise.reject(new Error('offline')));
  assert.equal((await a.baixar(opcoes)).acionamentoConfirmado, false);
  assert.equal(a.cliques.length, 1);
  assert.equal(a.chamadas.length, 3);
});
test('falha do navegador não confirma acionamento e remove link', async () => {
  const a = ambiente(ok, true);
  await assert.rejects(a.baixar(opcoes));
  assert.equal(a.chamadas.length, 1);
  assert.equal(a.removidos.length, 1);
});
test('nova exportação ganha ID próprio; módulo sem sessão bloqueia', async () => {
  const a = ambiente(ok);
  const primeira = await a.baixar(opcoes), segunda = await a.baixar(opcoes);
  assert.notEqual(primeira.id, segunda.id);
  delete a.window.endomapaSupabase;
  await assert.rejects(a.baixar(opcoes));
  assert.equal(a.cliques.length, 2);
});
