import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const fonte = readFileSync(new URL('../recuperar-senha.js', import.meta.url), 'utf8');
function iniciar(hash = '', authExtra = {}) {
  const elementos = new Map();
  const elemento = seletor => {
    if (!elementos.has(seletor)) elementos.set(seletor, {
      hidden: /etapa-alterar|etapa-confirmar/.test(seletor), disabled: false, value: '',
      textContent: '', classList: { toggle() {}, remove() {} }, focus() {},
      eventos: {}, addEventListener(nome, fn) { this.eventos[nome] = fn; },
    });
    return elementos.get(seletor);
  };
  const chamadas = [];
  const sessao = { user: { id: 'conta-teste' } };
  const auth = {
    getSession: async () => ({ data: { session: null }, error: null }),
    verifyOtp: async dados => { chamadas.push(['validar', dados]); return { data: { session: sessao }, error: null }; },
    setSession: async dados => { chamadas.push(['sessao', dados]); return { data: { session: sessao }, error: null }; },
    updateUser: async dados => { chamadas.push(['senha', dados]); return { error: null }; },
    signOut: async () => { chamadas.push(['sair']); return { error: null }; },
    resetPasswordForEmail: async () => { chamadas.push(['enviar']); return { error: null }; },
    ...authExtra,
  };
  let opcoes;
  const location = { hash, search: '', pathname: '/recuperar-senha' };
  const storage = {};
  vm.runInNewContext(fonte, {
    URLSearchParams,
    document: { querySelector: elemento },
    window: {
      location, sessionStorage: storage,
      history: { replaceState() { location.hash = ''; location.search = ''; } },
      ENDOMAPA_SUPABASE: { projectUrl: 'https://teste.invalid', publicAnonKey: 'publica' },
      supabase: { createClient(_url, _key, options) { opcoes = options; return { auth }; } },
    },
  });
  return { elemento, chamadas, location, opcoes, storage,
    confirmar: () => elemento('[data-confirmar-recuperacao]').eventos.click(),
    salvar: () => elemento('[data-atualizar-senha]').eventos.click(),
    mensagem: () => elemento('[data-mensagem-recuperacao]').textContent,
    preencher() {
      elemento('[name="nova_senha"]').value = 'senha-de-teste-123';
      elemento('[name="confirmar_senha"]').value = 'senha-de-teste-123';
    },
  };
}
const aguardar = () => new Promise(resolve => setTimeout(resolve, 0));
const casos = [
  ['abrir o link não o consome; confirmação explícita e senha funcionam', async () => {
    const t = iniciar('#token_hash=teste&type=recovery');
    await aguardar();
    assert.equal(t.chamadas.length, 0);
    assert.equal(t.elemento('[data-etapa-confirmar]').hidden, false);
    assert.equal(t.opcoes.auth.detectSessionInUrl, false);
    assert.equal(t.opcoes.auth.storage, t.storage);
    await t.confirmar();
    assert.equal(t.chamadas[0][1].type, 'recovery');
    assert.equal(t.location.hash, '');
    t.preencher();
    await Promise.all([t.salvar(), t.salvar()]);
    await t.salvar();
    assert.equal(t.chamadas.filter(c => c[0] === 'senha').length, 1);
    assert.match(t.mensagem(), /Senha alterada/);
  }],
  ['duplo clique não consome o link duas vezes', async () => {
    const t = iniciar('#token_hash=teste&type=recovery');
    await Promise.all([t.confirmar(), t.confirmar()]);
    assert.equal(t.chamadas.length, 1);
  }],
  ['link usado oferece novo pedido e não abre troca de senha', async () => {
    const t = iniciar('#token_hash=teste&type=recovery', {
      verifyOtp: async () => ({ data: {}, error: { code: 'otp_expired' } }),
    });
    await t.confirmar();
    assert.match(t.mensagem(), /já foi usado/);
    assert.equal(t.elemento('[data-etapa-solicitar]').hidden, false);
    t.preencher(); await t.salvar();
    assert.equal(t.chamadas.length, 0);
  }],
  ['erro retornado pelo link antigo é mostrado', async () => {
    const t = iniciar('#error=access_denied&error_code=otp_expired');
    assert.match(t.mensagem(), /já foi usado/);
    assert.equal(t.location.hash, '');
  }],
  ['e-mail antigo ainda estabelece sua própria sessão', async () => {
    const t = iniciar('#access_token=teste&refresh_token=teste&type=recovery');
    await aguardar();
    assert.equal(t.chamadas[0][0], 'sessao');
    assert.equal(t.elemento('[data-etapa-alterar]').hidden, false);
  }],
  ['recarregar a aba retoma a sessão isolada de recuperação', async () => {
    const t = iniciar('', { getSession: async () => ({ data: { session: { user: { id: 'teste' } } } }) });
    await aguardar();
    assert.equal(t.opcoes.auth.storageKey, 'endomapa-recuperacao');
    assert.equal(t.elemento('[data-etapa-alterar]').hidden, false);
  }],
  ['falha de rede não é anunciada como link expirado e permite repetir', async () => {
    const t = iniciar('#token_hash=teste&type=recovery', { verifyOtp: async () => { throw new Error('rede'); } });
    await t.confirmar();
    assert.match(t.mensagem(), /internet/);
    assert.equal(t.elemento('[data-confirmar-recuperacao]').disabled, false);
    assert.notEqual(t.location.hash, '');
  }],
  ['falha ao sair não apaga o sucesso da troca de senha', async () => {
    const t = iniciar('#token_hash=teste&type=recovery', { signOut: async () => { throw new Error('rede'); } });
    await t.confirmar(); t.preencher(); await t.salvar();
    assert.match(t.mensagem(), /senha foi alterada/);
    assert.equal(t.elemento('[data-etapa-alterar]').hidden, true);
  }],
  ['abrir página sem link nem sessão não permite trocar senha', async () => {
    const t = iniciar(); await aguardar(); t.preencher(); await t.salvar();
    assert.equal(t.chamadas.length, 0);
    assert.equal(t.elemento('[data-etapa-alterar]').hidden, true);
  }],
];
for (const [nome, teste] of casos) {
  await teste();
  console.log('OK:', nome);
}
