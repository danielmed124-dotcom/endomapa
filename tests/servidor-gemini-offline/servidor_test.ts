import { ENDPOINT_GEMINI, estado, reiniciar } from "./ambiente.ts";
import "../../supabase/functions/finalizar-mapa-manual-gemini/index.ts";
import { PROMPT_EDICAO_DIRETA, VERSAO_PROMPT_DIRETO } from "../../supabase/functions/_shared/prompt-edicao-direta-gemini.js";

function igual(atual: unknown, esperado: unknown, mensagem: string) {
  if (JSON.stringify(atual) !== JSON.stringify(esperado)) {
    throw new Error(`${mensagem}: esperado ${JSON.stringify(esperado)}, recebido ${JSON.stringify(atual)}`);
  }
}
function verificar(condicao: unknown, mensagem: string): asserts condicao {
  if (!condicao) throw new Error(mensagem);
}
const base64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));

// PNG transparente de 1 pixel com comentário de teste. Não contém imagem clínica.
function criarPng() {
  const original = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aVZkAAAAASUVORK5CYII="), c => c.charCodeAt(0));
  const texto = new TextEncoder().encode(`Comentario\0${"teste sem dados reais ".repeat(50)}`);
  const bloco = new Uint8Array(texto.length + 12);
  new DataView(bloco.buffer).setUint32(0, texto.length);
  bloco.set(new TextEncoder().encode("tEXt"), 4);
  bloco.set(texto, 8);
  let crc = 0xffffffff;
  for (const byte of bloco.subarray(4, bloco.length - 4)) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  new DataView(bloco.buffer).setUint32(bloco.length - 4, (crc ^ 0xffffffff) >>> 0);
  const bytes = new Uint8Array(original.length + bloco.length);
  bytes.set(original.subarray(0, original.length - 12));
  bytes.set(bloco, original.length - 12);
  bytes.set(original.subarray(original.length - 12), bytes.length - 12);
  return base64(bytes);
}
const PNG = criarPng();
const imagemResposta = { inlineData: { mimeType: "image/png", data: PNG } };
const respostaValida = () => Response.json({ responseId: "pedido-simulado-1", candidates: [
  { finishReason: "STOP", content: { parts: [imagemResposta] } },
], usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20, totalTokenCount: 30 } });

async function chamar(corpo: Record<string, unknown>) {
  verificar(estado.handler, "O servidor não registrou o manipulador da requisição.");
  const resposta = await estado.handler(new Request("https://endomapa-teste.invalid/funcao", {
    method: "POST",
    headers: { Origin: "https://endomapa.pages.dev", Authorization: "Bearer sessao-sintetica", "Content-Type": "application/json" },
    body: JSON.stringify({ modo_edicao_direta: true, composicao_base64: PNG, ...corpo }),
  }));
  return { status: resposta.status, dados: await resposta.json() };
}
async function preparar() {
  const preparacao = await chamar({ preparar_teste: true });
  igual(preparacao.status, 200, "Preparação gratuita");
  return { mapa_sha256: preparacao.dados.imagem_1.sha256, prompt_sha256: preparacao.dados.prompt_sha256 };
}
function conferirMetadados(dados: Record<string, unknown>, tentativas: number) {
  verificar(typeof dados.operacao_id === "string" && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(dados.operacao_id), "Identificador de operação ausente");
  verificar(typeof dados.horario_utc === "string" && /Z$/.test(dados.horario_utc) && !Number.isNaN(Date.parse(dados.horario_utc)), "Horário UTC ausente");
  igual(dados.tentativas_envio_imagem, tentativas, "Quantidade de envios");
  igual(dados.versao_funcao, "gemini-direto-v1", "Versão da função");
  igual(dados.versao_prompt, VERSAO_PROMPT_DIRETO, "Versão do prompt");
  igual(dados.modelo, "gemini-3.1-flash-lite-image", "Modelo configurado");
  igual(dados.endpoint, ENDPOINT_GEMINI, "Endpoint configurado");
}
function teste(nome: string, executar: () => Promise<void>) {
  Deno.test(nome, async () => {
    reiniciar();
    try { await executar(); }
    finally {
      igual(estado.tabelas, 0, "O modo direto acessou tabela de resultado anterior");
      igual(estado.storage, 0, "O modo direto acessou armazenamento de imagens");
    }
  });
}

teste("preparação preserva o prompt e não reserva cota nem chama Gemini", async () => {
  const { status, dados } = await chamar({ preparar_teste: true });
  igual(status, 200, "Status da preparação");
  igual(dados.pronto, true, "Preparação concluída");
  igual(dados.prompt_visual, PROMPT_EDICAO_DIRETA, "Prompt intacto");
  verificar(/^[a-f0-9]{64}$/.test(dados.prompt_sha256), "Hash do prompt ausente");
  verificar(/^[a-f0-9]{64}$/.test(dados.imagem_1.sha256), "Hash da montagem ausente");
  igual(estado.reservas, 0, "Reservas na preparação");
  igual(estado.pedidos.length, 0, "Chamadas na preparação");
  conferirMetadados(dados, 0);
});

teste("imagem inválida e modos incompatíveis são recusados antes de cota ou chamada", async () => {
  for (const corpo of [
    { composicao_base64: "curta" },
    { composicao_base64: "!".repeat(1200) },
    { composicao_base64: base64(new Uint8Array(1000).fill(65)) },
    { modo_detalhe: true },
    { consultar_diagnostico: true },
  ]) {
    const { status, dados } = await chamar(corpo);
    igual(status, 400, "Entrada inválida");
    conferirMetadados(dados, 0);
  }
  igual(estado.reservas, 0, "Reservas com entrada inválida");
  igual(estado.pedidos.length, 0, "Chamadas com entrada inválida");
});

teste("alterar qualquer hash impede o envio e a reserva de cota", async () => {
  const hashes = await preparar();
  for (const campo of ["mapa_sha256", "prompt_sha256"]) {
    const { status, dados } = await chamar({ ...hashes, [campo]: "0".repeat(64) });
    igual(status, 409, "Hash alterado");
    igual(dados.estado, "entrada_invalida", "Estado da operação");
    conferirMetadados(dados, 0);
  }
  igual(estado.reservas, 0, "Reservas com hash inválido");
  igual(estado.pedidos.length, 0, "Chamadas com hash inválido");
});

teste("uma geração envia somente o PNG e o prompt original com o modelo configurado", async () => {
  const hashes = await preparar();
  estado.responder = respostaValida;
  const { status, dados } = await chamar(hashes);
  igual(status, 200, "Status da geração simulada");
  igual(estado.reservas, 1, "Reserva única");
  igual(estado.pedidos.length, 1, "Envio único");
  const pedido = estado.pedidos[0];
  igual(pedido.url, ENDPOINT_GEMINI, "Modelo e endpoint permanecem configurados");
  igual(pedido.opcoes?.method, "POST", "Método da geração");
  const corpo = JSON.parse(String(pedido.opcoes?.body));
  igual(corpo.contents, [{ parts: [{ inlineData: { mimeType: "image/png", data: PNG } }, { text: PROMPT_EDICAO_DIRETA }] }], "Imagem e prompt preservados");
  igual(corpo.generationConfig, { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "3:4", imageSize: "1K" }, thinkingConfig: { thinkingLevel: "minimal" } }, "Parâmetros configurados");
  igual(Object.keys(corpo).sort(), ["contents", "generationConfig"], "Sem instrução adicional nem alteração de safetySettings");
  igual(dados.imagem_base64, PNG, "Imagem desta resposta");
  igual(dados.formato, "image/png", "Formato da resposta");
  igual(dados.estado, "concluido", "Estado concluído");
  igual(dados.pedido_id, "pedido-simulado-1", "Identificador da resposta");
  conferirMetadados(dados, 1);
  igual(estado.registros.map(item => item.etapa), ["pedido_enviado", "imagem_recebida"], "Etapas registradas");
  verificar(estado.registros.every(item => item.operacao_id === dados.operacao_id), "Logs não correspondem à operação");
});

teste("bloqueio estruturado impede usar imagem presente na mesma resposta", async () => {
  const hashes = await preparar();
  estado.responder = () => Response.json({ responseId: "pedido-bloqueado", candidates: [
    { finishReason: "IMAGE_SAFETY", content: { parts: [imagemResposta] }, safetyRatings: [
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", probability: "HIGH", blocked: true },
    ] },
  ] });
  const { status, dados } = await chamar(hashes);
  igual(status, 422, "Status do bloqueio");
  igual(dados.estado, "bloqueado_provedor", "Estado bloqueado");
  igual(dados.finish_reason, "IMAGE_SAFETY", "Motivo estruturado do provedor");
  igual(dados.safety_ratings[0].blocked, true, "Classificação estruturada");
  verificar(!("imagem_base64" in dados) && !("imagem_url" in dados), "Bloqueio devolveu uma imagem");
  igual(estado.pedidos.length, 1, "Sem repetição após bloqueio");
  igual(estado.reservas, 1, "Reserva única após bloqueio");
  conferirMetadados(dados, 1);
});

teste("resposta 429 é apresentada sem repetir a chamada", async () => {
  const hashes = await preparar();
  estado.responder = () => Response.json({ error: { code: 429, status: "RESOURCE_EXHAUSTED", message: "mensagem livre que não deve aparecer" } }, { status: 429 });
  const { status, dados } = await chamar(hashes);
  igual(status, 429, "Status do limite remoto");
  igual(dados.error_code, 429, "Código do provedor");
  igual(dados.error_type, "RESOURCE_EXHAUSTED", "Tipo de erro do provedor");
  igual(estado.pedidos.length, 1, "Sem repetição após 429");
  igual(estado.reservas, 1, "Reserva única após 429");
  verificar(!JSON.stringify(dados).includes("mensagem livre"), "Texto livre vazou no diagnóstico");
  verificar(!("imagem_base64" in dados) && !("imagem_url" in dados), "Erro devolveu uma imagem");
  conferirMetadados(dados, 1);
});

teste("falha de rede mantém uma tentativa e não recupera resultado antigo", async () => {
  const hashes = await preparar();
  estado.responder = () => { throw new TypeError("rede simulada indisponível"); };
  const { status, dados } = await chamar(hashes);
  igual(status, 502, "Status da falha de rede");
  igual(dados.estado, "falha_tecnica", "Estado da falha");
  igual(estado.pedidos.length, 1, "Sem repetição após falha de rede");
  igual(estado.reservas, 1, "Reserva única após falha de rede");
  verificar(!("imagem_base64" in dados) && !("imagem_url" in dados), "Falha devolveu uma imagem");
  igual(estado.registros.map(item => item.etapa), ["pedido_enviado", "falha_tecnica"], "Falha registrada nesta operação");
  conferirMetadados(dados, 1);
});

teste("limite local impede chamada ao provedor", async () => {
  const hashes = await preparar();
  estado.permitido = false;
  const { status, dados } = await chamar(hashes);
  igual(status, 429, "Status do limite local");
  igual(estado.reservas, 1, "Limite conferido uma vez");
  igual(estado.pedidos.length, 0, "Sem chamada quando a cota não permite");
  conferirMetadados(dados, 0);
});
