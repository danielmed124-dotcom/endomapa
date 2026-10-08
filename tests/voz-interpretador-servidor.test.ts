import { validarInterpretacao, esquemaInterpretacao } from '../supabase/functions/interpretar-voz-teste/contrato.ts';

const conferir = (ok: unknown, mensagem: string) => { if (!ok) throw new Error(mensagem); };
const item = (modelo: string, medidas: (number | null)[], extras = {}) => ({ modelo, quantidade: 1, localizacao: 'não informada', lado: 'não informado', medida_1: medidas[0], medida_2: medidas[1], medida_3: medidas[2], posicao_ditada: null, confianca: 95, ...extras });
const exemplo = { confianca: 95, duvidas: [], itens: [
  item('Ligamento uterossacro', [1.8, .6, null], { lado: 'esquerdo' }),
  item('Pólipo', [.6, .8, null]), item('Mioma 1', [3.1, .8, .9]),
  item('Adenomiose 1', [null, null, null], { quantidade: 3 }), item('DIU de Cobre', [null, null, null]),
] };

Deno.test('contrato da biblioteca conserva quantidades e medidas ausentes', () => {
  conferir(validarInterpretacao(exemplo), 'Exemplo válido recusado');
  for (const alteracao of [{ modelo: 'Categoria inventada' }, { quantidade: 31 }, { quantidade: 1.5 }, { medida_1: -1 }, { medida_1: '1.8' }, { medida_1: null, medida_2: 1 }, { quantidade: 3, medida_1: 1 }, { lado: 'inventado' }]) {
    conferir(!validarInterpretacao({ ...exemplo, itens: [{ ...exemplo.itens[0], ...alteracao }] }), 'Aceitou item inválido');
  }
  conferir(!validarInterpretacao({ ...exemplo, itens: Array(11).fill(exemplo.itens[3]) }), 'Limite deve contar focos, não só grupos');
});

Deno.test('função nova protege acesso e cota e usa o esquema da biblioteca', async () => {
  const fetchAnterior = globalThis.fetch, serveAnterior = Deno.serve;
  const nomes = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'GEMINI_API_KEY'];
  const anteriores = nomes.map(n => Deno.env.get(n));
  let handler: (r: Request) => Promise<Response>;
  let autenticado = true, ativo = true, permitido = true, reservas = 0, chamadas = 0, payload: any;
  let retorno: unknown = exemplo;
  let fim = "STOP", statusGemini = 200;
  try {
    Deno.env.set('SUPABASE_URL', 'https://projeto-ficticio.supabase.co');
    Deno.env.set('SUPABASE_ANON_KEY', 'chave-publica-ficticia');
    Deno.env.set('GEMINI_API_KEY', 'segredo-ficticio');
    Deno.serve = ((h: typeof handler) => { handler = h; }) as typeof Deno.serve;
    globalThis.fetch = (async (entrada: Request | string | URL, opcoes?: RequestInit) => {
      const url = String(entrada instanceof Request ? entrada.url : entrada);
      const json = (v: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(v), { status, headers: { 'Content-Type': 'application/json' } }));
      if (url.includes('/auth/v1/user')) return autenticado ? json({ id: '11111111-1111-4111-8111-111111111111', app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '' }) : json({ message: 'Sessão inválida' }, 401);
      if (url.includes('/rest/v1/usuarios_imagem_autorizados')) return json([{ ativo }]);
      if (url.includes('/rest/v1/rpc/reservar_chamada_ia')) { reservas++; return json({ permitido, total_chamadas: reservas, limite_diario: 20 }); }
      if (url === 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent') { chamadas++; payload = JSON.parse(String(opcoes?.body)); return json({ candidates: [{ finishReason: fim, content: { parts: [{ thought: true, text: "raciocinio-ficticio" }, { text: JSON.stringify(retorno) }] } }] }, statusGemini); }
      throw new Error('Rede não prevista no teste: ' + url);
    }) as typeof fetch;
    await import('../supabase/functions/interpretar-voz-teste/index.ts');
    const pedir = (texto: unknown = 'Pólipo de 0,6 por 0,8 cm', origin = 'https://endomapa.pages.dev', token = true) => handler(new Request('https://local/interpretar-voz-teste', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer token-ficticio' } : {}) }, body: JSON.stringify({ texto_bruto: texto }) }));
    conferir((await pedir(undefined, 'https://estranho.invalid')).status === 403, 'Origem externa deve ser recusada');
    conferir((await pedir(undefined, undefined, false)).status === 401, 'Exige autenticação');
    autenticado = false; conferir((await pedir()).status === 401, 'Token inválido deve ser recusado'); autenticado = true;
    ativo = false; conferir((await pedir()).status === 403, 'Conta não autorizada deve ser recusada'); ativo = true;
    conferir((await pedir('')).status === 400 && (await pedir('a'.repeat(4001))).status === 413, 'Valida entrada antes da cota');
    conferir(reservas === 0 && chamadas === 0, 'Recusas não podem consumir IA');
    Deno.env.delete('GEMINI_API_KEY'); conferir((await pedir()).status === 503 && reservas === 0, 'Configuração ausente não deve consumir cota'); Deno.env.set('GEMINI_API_KEY', 'segredo-ficticio');
    permitido = false; conferir((await pedir()).status === 429 && chamadas === 0, 'Cota bloqueada deve impedir IA'); permitido = true;
    const resposta = await pedir(); const corpo = await resposta.json();
    conferir(resposta.status === 200 && corpo.sugestao.itens.length === 5 && corpo.sugestao.duvidas.length === 0, 'Lote válido deve ser retornado completo');
    conferir(JSON.stringify(payload.generationConfig.responseJsonSchema) === JSON.stringify(esquemaInterpretacao), 'Deve enviar o contrato novo ao provedor');
    conferir(payload.systemInstruction.parts[0].text.includes('NÃO peça lados, distribuição') && payload.systemInstruction.parts[0].text.includes('Pólipo possui imagem própria'), 'Instruções devem explicar campos opcionais e biblioteca');
    conferir(!JSON.stringify(corpo).includes('segredo-ficticio'), 'Não vazar chave');
    conferir(corpo.provedor === 'Gemini' && corpo.modelo === 'gemini-3.5-flash-lite', 'Deve informar o provedor usado');
    conferir(payload.generationConfig.responseMimeType === 'application/json', 'Deve pedir JSON');
    fim = 'MAX_TOKENS'; conferir((await pedir()).status === 502, 'Resposta truncada não pode ser inserida'); fim = 'STOP';
    for (const status of [402, 429, 403]) {
      statusGemini = status;
      const erro = await pedir();
      conferir(erro.status === 503 && (await erro.json()).erro.includes('Gemini'), 'Erro do Google deve identificar o serviço');
    }
    statusGemini = 200;
    retorno = { ...exemplo, itens: [item('Pólipo', [-1, .8, null])] };
    conferir((await pedir()).status === 502, 'Resposta inválida deve ser recusada pelo servidor');
  } finally {
    globalThis.fetch = fetchAnterior; Deno.serve = serveAnterior;
    nomes.forEach((n, i) => anteriores[i] === undefined ? Deno.env.delete(n) : Deno.env.set(n, anteriores[i]!));
  }
});
