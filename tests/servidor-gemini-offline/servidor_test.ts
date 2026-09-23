import { ENDPOINT_GEMINI, estado, reiniciar } from "./ambiente.ts";
import "../../supabase/functions/finalizar-mapa-manual-gemini/index.ts";
import { construirPromptEdicaoDireta, VERSAO_PROMPT_DIRETO } from "../../supabase/functions/_shared/prompt-edicao-direta-gemini.js";
import { CATALOGO_REFINAMENTO } from "../../supabase/functions/_shared/catalogo-refinamento.js";

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
const INVENTARIO = { largura_mapa: 1, altura_mapa: 1, lesoes: [
  { id: "L1", modelo: "cisto-referencia", x: 25, y: 50, largura: 13, altura: 9.75, giro: 0, recorte: "alfa" },
  { id: "L2", modelo: "endometriose-isolada-referencia-transparente", x: 75, y: 50, largura: 8, altura: 6, giro: 30, recorte: "alfa" },
  { id: "L3", modelo: "diu-cobre-referencia", x: 50, y: 35, largura: 5, altura: 8, giro: 0, recorte: "alfa" },
] };
const PROMPT_ESPERADO = construirPromptEdicaoDireta(INVENTARIO);
const CONFIGURACAO_LITE = { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "3:4", imageSize: "1K" }, thinkingConfig: { thinkingLevel: "minimal" } };
const catalogo: Record<string, { nome: string; tipo_visual: string; preservar: string; editavel: boolean }> = CATALOGO_REFINAMENTO;

function conferirListaVisual(prompt: string, inventario = INVENTARIO, autorizadas?: string[]) {
  verificar(!/\bL\d+\b/.test(prompt), "O prompt enviado contém identificadores que podem virar rótulos");
  verificar(!prompt.includes("LESOES_AUTORIZADAS"), "A enumeração de códigos de autorização foi enviada ao modelo");
  for (const [modelo, perfil] of Object.entries(catalogo)) {
    verificar(!prompt.includes(modelo), `O nome de arquivo do catálogo foi enviado ao modelo: ${modelo}`);
    verificar(!prompt.includes(perfil.nome), `O nome do botão da biblioteca foi enviado ao modelo: ${perfil.nome}`);
  }
  const lista = JSON.parse(prompt.split("[INÍCIO DA LISTA DINÂMICA]\n")[1].split("\n[FINAL DA LISTA DINÂMICA]")[0]);
  const esperada = inventario.lesoes.map((lesao) => {
    const perfil = catalogo[lesao.modelo];
    return { x: lesao.x, y: lesao.y, largura: lesao.largura, altura: lesao.altura,
      giro: lesao.giro, recorte: lesao.recorte, tipo_visual: perfil.tipo_visual,
      preservar: perfil.preservar, autorizada: autorizadas ? autorizadas.includes(lesao.id) : perfil.editavel };
  });
  igual(lista, esperada, "Lista visual deve conservar ordem, todas as posições, perfis e autorizações sem campos internos");
  return lista;
}

const imagemResposta = { inlineData: { mimeType: "image/png", data: PNG } };
const respostaValida = () => Response.json({ responseId: "pedido-simulado-1", candidates: [
  { finishReason: "STOP", content: { parts: [imagemResposta] } },
], usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20, totalTokenCount: 30 } });

async function chamar(corpo: Record<string, unknown>) {
  verificar(estado.handler, "O servidor não registrou o manipulador da requisição.");
  const resposta = await estado.handler(new Request("https://endomapa-teste.invalid/funcao", {
    method: "POST",
    headers: { Origin: "https://endomapa.pages.dev", Authorization: "Bearer sessao-sintetica", "Content-Type": "application/json" },
    body: JSON.stringify({ modo_edicao_direta: true, versao_integracao: "refinamento-lite-v3", composicao_base64: PNG, inventario_lesoes: INVENTARIO, ...corpo }),
  }));
  return { status: resposta.status, dados: await resposta.json() };
}
async function preparar(corpo: Record<string, unknown> = {}) {
  const preparacao = await chamar({ preparar_teste: true, ...corpo });
  igual(preparacao.status, 200, "Preparação gratuita");
  return { mapa_sha256: preparacao.dados.imagem_1.sha256, prompt_sha256: preparacao.dados.prompt_sha256 };
}
function conferirMetadados(dados: Record<string, unknown>, tentativas: number) {
  verificar(typeof dados.operacao_id === "string" && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(dados.operacao_id), "Identificador de operação ausente");
  verificar(typeof dados.horario_utc === "string" && /Z$/.test(dados.horario_utc) && !Number.isNaN(Date.parse(dados.horario_utc)), "Horário UTC ausente");
  igual(dados.tentativas_envio_imagem, tentativas, "Quantidade de envios");
  igual(dados.versao_funcao, "gemini-lite-retorno-v1", "Versão da função");
  igual(dados.versao_integracao, "refinamento-lite-v3", "Versão de compatibilidade da integração local");
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

teste("preparação preenche a lista real e não reserva cota nem chama Gemini", async () => {
  const { status, dados } = await chamar({ preparar_teste: true });
  igual(status, 200, "Status da preparação");
  igual(dados.pronto, true, "Preparação concluída");
  igual(dados.parametros, CONFIGURACAO_LITE, "Preparação deve anunciar Lite 1K com raciocínio minimal");
  igual(dados.prompt_visual, PROMPT_ESPERADO, "Prompt montado a partir do inventário validado");
  verificar(!dados.prompt_visual.includes("{{LESION_LIST}}"), "Lista dinâmica ficou sem preenchimento");
  const lista = conferirListaVisual(dados.prompt_visual);
  igual(lista.map((lesao: { autorizada: boolean }) => lesao.autorizada), [true, true, false], "DIU protegido e lesões autorizadas por padrão");
  verificar(lista.every((lesao: { tipo_visual: string; preservar: string }) => lesao.tipo_visual && lesao.preservar), "Perfil conhecido ausente da lista dinâmica");
  igual(dados.quantidade_lesoes, 3, "Quantidade de elementos capturados");
  igual(dados.quantidade_autorizadas, 2, "Quantidade autorizada sem incluir dispositivo");
  igual(dados.mascara_api, false, "Nenhuma máscara é enviada ao Gemini");
  igual(dados.mascara_composicao_local, true, "Composição protegida pertence ao editor local");
  verificar(/^[a-f0-9]{64}$/.test(dados.prompt_sha256), "Hash do prompt ausente");
  verificar(/^[a-f0-9]{64}$/.test(dados.imagem_1.sha256), "Hash da montagem ausente");
  igual(estado.reservas, 0, "Reservas na preparação");
  igual(estado.pedidos.length, 0, "Chamadas na preparação");
  conferirMetadados(dados, 0);
});

teste("editor antigo é recusado na preparação e no envio antes de cota ou chamada", async () => {
  const hashes = await preparar();
  for (const versao of [undefined, "contato-v1", "contato-desatualizado", "refinamento-v2", "refinamento-pro-v1"]) {
    for (const prepararTeste of [true, false]) {
      const { status, dados } = await chamar({ ...hashes, preparar_teste: prepararTeste, versao_integracao: versao });
      igual(status, 409, "Versão ausente ou incompatível");
      igual(dados.estado, "editor_desatualizado", "Estado do editor antigo");
      verificar(dados.erro.includes("Salve a montagem manual antes"), "Aviso precisa orientar salvar a montagem antes de atualizar");
      verificar(!dados.pronto && !("prompt_visual" in dados), "Editor antigo não pode concluir a preparação");
      verificar(!("imagem_base64" in dados) && !("imagem_url" in dados), "Editor antigo não pode receber imagem");
      conferirMetadados(dados, 0);
    }
  }
  const antigaComImagemInvalida = await chamar({ versao_integracao: undefined, composicao_base64: "curta" });
  igual(antigaComImagemInvalida.status, 409, "Compatibilidade deve ser conferida antes de validar e calcular hashes da imagem");
  igual(estado.reservas, 0, "Nenhuma reserva para editor antigo");
  igual(estado.pedidos.length, 0, "Nenhuma chamada para editor antigo");
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

teste("inventários incompletos, campos livres e coordenadas inválidas param antes de cota", async () => {
  const substituir = (alteracao: Record<string, unknown>) => ({ ...INVENTARIO,
    lesoes: [{ ...INVENTARIO.lesoes[0], ...alteracao }, ...INVENTARIO.lesoes.slice(1)] });
  const invalidos = [
    undefined, null, [], {}, { ...INVENTARIO, lesoes: [] },
    { ...INVENTARIO, largura_mapa: 0 }, { ...INVENTARIO, altura_mapa: 4097 },
    { ...INVENTARIO, largura_mapa: 4096, altura_mapa: 4096 },
    { ...INVENTARIO, nome_paciente: "DADO QUE NÃO DEVE IR AO PROMPT" },
    { ...INVENTARIO, lesoes: Array.from({ length: 65 }, (_, i) => ({ ...INVENTARIO.lesoes[0], id: `L${i + 1}` })) },
    substituir({ id: "L2" }), substituir({ modelo: "__proto__" }), substituir({ modelo: "tipo inventado" }),
    substituir({ x: -0.1 }), substituir({ y: 101 }), substituir({ giro: 181 }), substituir({ largura: 0 }),
    substituir({ altura: 200.1 }), substituir({ x: "25" }), substituir({ x: null }), substituir({ x: 25.12345 }),
    substituir({ recorte: "retangulo" }), substituir({ nomeNoMapa: "DADO QUE NÃO DEVE IR AO PROMPT" }),
    substituir({ medida1: "12 mm" }),
  ];
  for (const inventario of invalidos) {
    const { status, dados } = await chamar({ preparar_teste: true, inventario_lesoes: inventario });
    igual(status, 400, "Inventário inválido");
    igual(dados.estado, "entrada_invalida", "Estado da entrada recusada");
    verificar(!("prompt_visual" in dados) && !JSON.stringify(dados).includes("DADO QUE"), "Entrada livre vazou na resposta");
  }
  const livre = await chamar({ preparar_teste: true, nome_paciente: "DADO QUE NÃO DEVE IR AO PROMPT" });
  igual(livre.status, 400, "Campo livre fora do inventário também recusado");
  igual(estado.reservas, 0, "Sem reserva para inventário inválido");
  igual(estado.pedidos.length, 0, "Sem geração para inventário inválido");
});

teste("lista e PNG precisam ter as mesmas dimensões antes de reservar cota", async () => {
  const inventario = { ...INVENTARIO, largura_mapa: 2 };
  const { status, dados } = await chamar({ preparar_teste: true, inventario_lesoes: inventario });
  igual(status, 400, "Dimensões divergentes");
  igual(dados.estado, "entrada_invalida", "Estado de dimensões divergentes");
  igual(estado.reservas, 0, "Sem reserva para dimensões divergentes");
  igual(estado.pedidos.length, 0, "Sem chamada para dimensões divergentes");
});

teste("autorizações vazias, desconhecidas, repetidas e de dispositivo são recusadas", async () => {
  for (const autorizadas of [[], null, "L1", ["L4"], ["L1", "L1"], ["L3"], ["L1", "L3"], [1]]) {
    const { status } = await chamar({ preparar_teste: true, lesoes_autorizadas: autorizadas });
    igual(status, 400, "Autorização inválida");
  }
  const soDispositivo = { ...INVENTARIO, lesoes: [{ ...INVENTARIO.lesoes[2], id: "L1" }] };
  igual((await chamar({ preparar_teste: true, inventario_lesoes: soDispositivo })).status, 400, "Mapa só com dispositivo não deve gerar");
  igual(estado.reservas, 0, "Sem reserva para autorização inválida");
  igual(estado.pedidos.length, 0, "Sem chamada para autorização inválida");
});

teste("trocar a lista ou as autorizações depois da preparação impede a chamada", async () => {
  const hashes = await preparar();
  for (const alteracao of [{ x: 25.1 }, { y: 50.1 }, { largura: 13.1 }, { altura: 9.85 },
    { giro: -15 }, { recorte: "elipse" }, { modelo: "endometrioma-referencia" }]) {
    const inventario = { ...INVENTARIO, lesoes: [{ ...INVENTARIO.lesoes[0], ...alteracao }, ...INVENTARIO.lesoes.slice(1)] };
    const { status, dados } = await chamar({ ...hashes, inventario_lesoes: inventario });
    igual(status, 409, "Inventário alterado após preparar");
    igual(dados.estado, "entrada_invalida", "Alteração detectada antes da geração");
  }
  const selecao = await chamar({ ...hashes, lesoes_autorizadas: ["L1"] });
  igual(selecao.status, 409, "Autorização alterada após preparar");
  igual(estado.reservas, 0, "Sem reserva após trocar lista ou autorização");
  igual(estado.pedidos.length, 0, "Sem chamada após trocar lista ou autorização");
});

teste("seleção explícita produz lista e prompt idênticos na preparação e no envio", async () => {
  const autorizadas = ["L2"];
  const preparacao = await chamar({ preparar_teste: true, lesoes_autorizadas: autorizadas });
  igual(preparacao.status, 200, "Preparação de subconjunto");
  const lista = conferirListaVisual(preparacao.dados.prompt_visual, INVENTARIO, autorizadas);
  igual(lista.map((lesao: { autorizada: boolean }) => lesao.autorizada), [false, true, false], "Seleção e DIU protegido devem ser representados por posição, sem códigos");
  igual(preparacao.dados.quantidade_autorizadas, 1, "Somente uma lesão autorizada");
  estado.responder = respostaValida;
  const resultado = await chamar({ lesoes_autorizadas: autorizadas, mapa_sha256: preparacao.dados.imagem_1.sha256,
    prompt_sha256: preparacao.dados.prompt_sha256 });
  igual(resultado.status, 200, "Envio do subconjunto preparado");
  igual(estado.pedidos.length, 1, "Uma chamada para o subconjunto inteiro");
  const enviado = JSON.parse(String(estado.pedidos[0].opcoes?.body));
  igual(enviado.contents[0].parts[1].text, preparacao.dados.prompt_visual, "Texto realmente enviado coincide com a preparação");
  conferirListaVisual(enviado.contents[0].parts[1].text, INVENTARIO, autorizadas);
});

teste("os 18 perfis visuais são únicos e trocar um modelo protegido altera o prompt e seu hash", async () => {
  const perfis = Object.entries(catalogo);
  igual(perfis.length, 18, "Todos os perfis da biblioteca participam da conferência");
  const assinaturasVisuais = new Set(perfis.map(([, perfil]) => JSON.stringify([perfil.tipo_visual, perfil.preservar])));
  igual(assinaturasVisuais.size, perfis.length, "Tipo visual e instrução de preservação precisam distinguir cada modelo");
  const textos = new Set<string>();
  const hashes = new Set<string>();
  for (const [modelo] of perfis) {
    const inventario = { ...INVENTARIO, lesoes: [INVENTARIO.lesoes[0], { ...INVENTARIO.lesoes[1], modelo }] };
    const autorizadas = ["L1"];
    const { status, dados } = await chamar({ preparar_teste: true, inventario_lesoes: inventario, lesoes_autorizadas: autorizadas });
    igual(status, 200, `Preparação com o segundo modelo protegido: ${modelo}`);
    const lista = conferirListaVisual(dados.prompt_visual, inventario, autorizadas);
    igual(lista.map((lesao: { autorizada: boolean }) => lesao.autorizada), [true, false], "A lesão fixa permanece autorizada e a variante fica protegida, inclusive os DIUs");
    verificar(!textos.has(dados.prompt_visual), `Trocar o modelo não alterou o texto: ${modelo}`);
    verificar(!hashes.has(dados.prompt_sha256), `Trocar o modelo não alterou o hash: ${modelo}`);
    textos.add(dados.prompt_visual);
    hashes.add(dados.prompt_sha256);
  }
  igual(textos.size, 18, "Cada modelo protegido deve produzir um prompt distinto na mesma posição");
  igual(hashes.size, 18, "Cada modelo protegido deve produzir um hash distinto na mesma posição");
  igual(estado.reservas, 0, "A conferência dos perfis não reserva cota");
  igual(estado.pedidos.length, 0, "A conferência dos perfis não gera imagens");
});

teste("trocar a seleção entre elementos idênticos sobrepostos altera o prompt e invalida o hash anterior", async () => {
  const inventario = { ...INVENTARIO, lesoes: [INVENTARIO.lesoes[0], { ...INVENTARIO.lesoes[0], id: "L2" }] };
  const primeira = await chamar({ preparar_teste: true, inventario_lesoes: inventario, lesoes_autorizadas: ["L1"] });
  const segunda = await chamar({ preparar_teste: true, inventario_lesoes: inventario, lesoes_autorizadas: ["L2"] });
  igual(primeira.status, 200, "Preparação do primeiro elemento sobreposto");
  igual(segunda.status, 200, "Preparação do segundo elemento sobreposto");
  const listaPrimeira = conferirListaVisual(primeira.dados.prompt_visual, inventario, ["L1"]);
  const listaSegunda = conferirListaVisual(segunda.dados.prompt_visual, inventario, ["L2"]);
  igual(listaPrimeira.map((lesao: { autorizada: boolean }) => lesao.autorizada), [true, false], "Autorização do primeiro elemento preservada pela ordem");
  igual(listaSegunda.map((lesao: { autorizada: boolean }) => lesao.autorizada), [false, true], "Autorização do segundo elemento preservada pela ordem");
  verificar(primeira.dados.prompt_visual !== segunda.dados.prompt_visual, "O prompt perdeu a distinção entre as autorizações sem os códigos visíveis");
  verificar(primeira.dados.prompt_sha256 !== segunda.dados.prompt_sha256, "Autorizações diferentes de elementos idênticos precisam de hashes diferentes");
  const resultado = await chamar({ inventario_lesoes: inventario, lesoes_autorizadas: ["L2"],
    mapa_sha256: primeira.dados.imagem_1.sha256, prompt_sha256: primeira.dados.prompt_sha256 });
  igual(resultado.status, 409, "A seleção invertida não pode usar o hash anterior");
  igual(resultado.dados.estado, "entrada_invalida", "Seleção invertida recusada antes da geração");
  igual(estado.reservas, 0, "A seleção invertida não reserva cota");
  igual(estado.pedidos.length, 0, "A seleção invertida não chama o Gemini");
});

teste("uma geração envia somente o PNG e o prompt dinâmico preparado com o modelo configurado", async () => {
  const hashes = await preparar();
  estado.responder = respostaValida;
  const { status, dados } = await chamar(hashes);
  igual(status, 200, "Status da geração simulada");
  igual(estado.reservas, 1, "Reserva única");
  igual(estado.pedidos.length, 1, "Envio único");
  const pedido = estado.pedidos[0];
  igual(pedido.url, ENDPOINT_GEMINI, "Geração direta deve usar o endpoint Lite autorizado");
  igual(pedido.opcoes?.method, "POST", "Método da geração");
  const corpo = JSON.parse(String(pedido.opcoes?.body));
  igual(corpo.contents, [{ parts: [{ inlineData: { mimeType: "image/png", data: PNG } }, { text: PROMPT_ESPERADO }] }], "Imagem e prompt preparado preservados");
  conferirListaVisual(corpo.contents[0].parts[1].text);
  igual(corpo.generationConfig, CONFIGURACAO_LITE, "Configuração Lite 1K com thinkingConfig minimal");
  igual(Object.keys(corpo).sort(), ["contents", "generationConfig"], "Sem instrução adicional nem alteração de safetySettings");
  igual(dados.imagem_base64, PNG, "Imagem desta resposta");
  igual(dados.formato, "image/png", "Formato da resposta");
  igual(dados.estado, "concluido", "Estado concluído");
  igual(dados.pedido_id, "pedido-simulado-1", "Identificador da resposta");
  conferirMetadados(dados, 1);
  igual(estado.registros.map(item => item.etapa), ["pedido_enviado", "imagem_recebida"], "Etapas registradas");
  verificar(estado.registros.every(item => item.operacao_id === dados.operacao_id), "Logs não correspondem à operação");
  verificar(estado.registros.every(item => item.versao_integracao === "refinamento-lite-v3"), "Logs precisam registrar a compatibilidade da composição local");
  verificar(estado.registros.every(item => item.modelo === "gemini-3.1-flash-lite-image" && item.endpoint === ENDPOINT_GEMINI), "Logs precisam identificar o modelo Lite efetivamente selecionado");
  igual(estado.registros[0].parametros, CONFIGURACAO_LITE, "Registro deve conservar a configuração Lite enviada");
  igual(estado.registros[0].quantidade_lesoes, 3, "Registro da quantidade de elementos");
  igual(estado.registros[0].quantidade_autorizadas, 2, "Registro da quantidade autorizada");
  verificar(!JSON.stringify(estado.registros).includes(PNG) && !JSON.stringify(estado.registros).includes("nome_da_biblioteca"), "Logs não devem guardar imagem nem inventário completo");
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

teste("Lite indisponível informa falha sem tentar outro modelo nem repetir a geração", async () => {
  const hashes = await preparar();
  estado.responder = () => Response.json({ error: { code: 404, status: "NOT_FOUND", message: "modelo indisponível nesta conta simulada" } }, { status: 404 });
  const { status, dados } = await chamar(hashes);
  igual(status, 502, "Falha do modelo indisponível");
  igual(dados.error_code, 404, "Código original da indisponibilidade");
  igual(dados.error_type, "NOT_FOUND", "Tipo original da indisponibilidade");
  igual(estado.pedidos.length, 1, "Não deve tentar outro modelo automaticamente");
  igual(estado.pedidos[0].url, ENDPOINT_GEMINI, "Única tentativa deve continuar identificada como Lite");
  igual(estado.reservas, 1, "Indisponibilidade não deve criar outra reserva");
  verificar(!("imagem_base64" in dados) && !("imagem_url" in dados), "Indisponibilidade não pode apresentar resultado antigo");
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
