import { createClient } from "npm:@supabase/supabase-js@2";
import { diagnosticarErroImagem } from "../_shared/erro-imagem-gpt.js";

const ORIGENS = new Set([
  "https://endomapa.pages.dev",
  "https://experimento-editor-manual.endomapa.pages.dev",
]);
const LIMITE_MS = 120_000;
const corsBase = {
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

function cabecalhos(origem: string | null) {
  return { ...corsBase, "Access-Control-Allow-Origin": origem && ORIGENS.has(origem) ? origem : "https://endomapa.pages.dev" };
}

function responderComOrigem(corpo: Record<string, unknown>, status = 200, origem: string | null = null) {
  return new Response(JSON.stringify(corpo), { status, headers: { ...cabecalhos(origem), "Content-Type": "application/json; charset=utf-8" } });
}

Deno.serve(async (req) => {
  const origem = req.headers.get("Origin");
  const responder = (corpo: Record<string, unknown>, status = 200) => responderComOrigem(corpo, status, origem);
  if (req.method === "OPTIONS") return origem && ORIGENS.has(origem) ? new Response("ok", { headers: cabecalhos(origem) }) : responder({ erro: "Origem não autorizada." }, 403);
  if (req.method !== "POST") return responder({ erro: "Método não permitido." }, 405);
  if (!origem || !ORIGENS.has(origem)) return responder({ erro: "Esta chamada não veio do Endomapa." }, 403);

  const autorizacao = req.headers.get("Authorization");
  if (!autorizacao?.startsWith("Bearer ")) return responder({ erro: "Entre no Endomapa antes de gerar a imagem." }, 401);
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const chave = Deno.env.get("OPENAI_API_KEY");
  if (!url || !anon || !chave) return responder({ erro: "A geração com GPT não está configurada no servidor." }, 503);

  const supabase = createClient(url, anon, { global: { headers: { Authorization: autorizacao } }, auth: { persistSession: false } });
  const { data: usuario } = await supabase.auth.getUser();
  if (!usuario.user) return responder({ erro: "Sua sessão terminou. Entre novamente." }, 401);

  let corpo: Record<string, unknown>;
  try { corpo = await req.json(); } catch (_erro) { return responder({ erro: "A composição não chegou corretamente." }, 400); }
  // Confere a chave e o acesso ao modelo sem reservar geração nem enviar imagem.
  if (corpo.verificar_conexao === true) {
    const controladorTeste = new AbortController();
    const temporizadorTeste = setTimeout(() => controladorTeste.abort(), 15_000);
    try {
      const respostaTeste = await fetch("https://api.openai.com/v1/models/gpt-image-2.5-sunburst", {
        headers: { Authorization: `Bearer ${chave}` }, signal: controladorTeste.signal,
      });
      const pedido = respostaTeste.headers.get("x-request-id");
      const pedidoId = pedido && /^req_[a-zA-Z0-9_-]{1,180}$/.test(pedido) ? pedido : null;
      if (!respostaTeste.ok) return responder({ erro: `A OpenAI recusou a verificação da chave ou do modelo (código ${respostaTeste.status}).`, pedido_id: pedidoId }, 502);
      const modelo = await respostaTeste.json().catch(() => null);
      if (modelo?.id !== "gpt-image-2.5-sunburst") return responder({ erro: "A OpenAI respondeu, mas não confirmou o modelo de imagens.", pedido_id: pedidoId }, 502);
      return responder({ conexao_ok: true, modelo: "gpt-image-2.5-sunburst", pedido_id: pedidoId });
    } catch (_erro) {
      return responder({ erro: "O servidor não conseguiu consultar a OpenAI. Verifique a conexão e tente novamente." }, 502);
    } finally { clearTimeout(temporizadorTeste); }
  }
  const composicao = corpo.composicao_base64;
  const modoDetalhe = corpo.modo_detalhe === true;
  const modoRegiao = corpo.modo_regiao === true;
  const nomesRegiao = corpo.tipos_lesao;
  if (modoRegiao && (!Array.isArray(nomesRegiao) || nomesRegiao.length < 1 || nomesRegiao.length > 10 ||
    !nomesRegiao.every((nome) => typeof nome === "string" && nome.length >= 1 && nome.length <= 60))) {
    return responder({ erro: "A lista de lesões desta região é inválida." }, 400);
  }
  if (typeof composicao !== "string" || composicao.length < 1000 || composicao.length > 7_000_000) {
    return responder({ erro: "A composição do mapa não tem um tamanho válido." }, 400);
  }

  const { data: reserva, error: erroReserva } = await supabase.rpc("reservar_geracao_imagem").single();
  if (erroReserva || !reserva) return responder({ erro: "Não foi possível conferir o limite de imagens." }, 500);
  if (!reserva.permitido) return responder({ erro: reserva.motivo === "limite_atingido" ? "O limite diário de imagens foi atingido." : "A geração paga não foi liberada para esta conta." }, 429);

  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), LIMITE_MS);
  try {
    const bytes = Uint8Array.from(atob(composicao), (caractere) => caractere.charCodeAt(0));
    const formulario = new FormData();
    formulario.append("model", "gpt-image-2.5-sunburst");
    formulario.append("image", new File([bytes], "mapa-manual.jpg", { type: "image/jpeg" }));
    formulario.append("quality", "medium");
    // A edição local recebe um recorte quadrado ampliado pelo editor.
    formulario.append("size", modoDetalhe || modoRegiao ? "1024x1024" : "1056x1408");
    formulario.append("output_format", "webp");
    formulario.append("output_compression", "85");
    formulario.append("moderation", "low");
    formulario.append("prompt", (modoRegiao ? [
      "Edit this close crop of a non-sexual gynecology medical-atlas illustration showing only internal pelvic organs.",
      "Repaint the EXISTING findings and the adjacent organ tissue together as a coherent anatomical illustration. Make the integration visibly different from pasted graphics: continuous surface texture, matching light, organic depth and contact shadows. Change the findings themselves, not just the overall tone.",
      `Expected existing findings: ${(nomesRegiao as string[]).join(", ")}.`,
      "Preserve the count, type, approximate center, size, side and distinct foci or branches of each finding. Do not invent or erase findings. Preserve surrounding anatomy and align all outer crop edges with the source image. Do not add text, labels, devices or logos. This is an experimental medical preview for physician review.",
    ] : modoDetalhe ? [
      "Close de uma ilustração científica de órgãos pélvicos internos, para revisão por médico radiologista. A imagem mostra tecido interno isolado, sem pessoa ou anatomia externa.",
      "Trabalhe apenas na lesão já visível no centro do recorte e no tecido imediatamente ao seu redor. Integre a lesão ao órgão com iluminação contínua, sombra de contato, reflexos e textura orgânica coerentes nos dois lados da borda. A mudança deve ser claramente visível nesta área ampliada.",
      "Preserve o tipo, a quantidade, o lado, a posição, a forma, o tamanho, a distribuição, a parede e o conteúdo da lesão. Se houver focos ou ramos separados, mantenha todos separados. Não acrescente nem remova achados.",
      "Mantenha a anatomia do recorte e qualquer linha ou medida. Não altere áreas distantes da lesão. A imagem será recolocada apenas na área local e revisada pelo médico.",
    ] : [
      "Ilustração científica de atlas ginecológico para revisão por médico radiologista. A figura mostra somente órgãos pélvicos internos isolados, sem pessoa ou anatomia externa.",
      "A tarefa é integrar visualmente as lesões já presentes à superfície dos órgãos. Trabalhe primeiro nos pontos de contato: crie sombra suave sob cada lesão, reflita a luz do tecido vizinho em sua borda e faça a textura superficial continuar naturalmente entre lesão e órgão.",
      "Nos cistos e nódulos, mantenha a parede e o conteúdo interno reconhecíveis; substitua o brilho e a borda de adesivo por volume orgânico com sombra de contato. Nos focos escuros, mantenha cada foco separado e faça a pigmentação acompanhar a curvatura do tecido. Nas aderências, dê relevo fibroso aos ramos existentes sem criar novas conexões.",
      "O acabamento da interface deve ser claramente diferente da montagem original. Alterar somente nitidez, saturação ou contraste geral não resolve a tarefa.",
      "Mantenha exatamente a quantidade, o tipo, o lado, o centro, o tamanho e os contornos clínicos de cada lesão, além dos espaços entre focos e ramos. Não crie, apague, agrupe ou desloque achados.",
      "Preserve a anatomia, o enquadramento 3:4, o DIU e seu fio, a logomarca, a marca-d'água e qualquer texto. Fora das lesões e de uma faixa estreita de tecido em seus pontos de contato, mantenha a composição como está.",
      "O resultado é uma prévia experimental que exige comparação e aprovação médica.",
    ]).join(" "));

    const resposta = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST", signal: controlador.signal, headers: { Authorization: `Bearer ${chave}` }, body: formulario,
    });
    if (!resposta.ok) {
      const detalhes = await resposta.json().catch(() => null);
      const diagnostico = diagnosticarErroImagem(detalhes, resposta.headers.get("x-request-id"));
      if (diagnostico) return responder(diagnostico, 422);
      const motivo = typeof detalhes?.error?.message === "string" ? ` Motivo: ${detalhes.error.message}` : "";
      return responder({ erro: `O GPT recusou a geração (código GPT-${resposta.status}).${motivo}` }, resposta.status === 429 ? 429 : 502);
    }
    const dados = await resposta.json();
    const imagem = dados?.data?.[0]?.b64_json;
    if (typeof imagem !== "string" || !imagem) return responder({ erro: "O GPT terminou sem devolver uma imagem válida." }, 502);
    const identificador = resposta.headers.get("x-request-id");
    const pedidoId = identificador && /^req_[a-zA-Z0-9_-]{1,180}$/.test(identificador) ? identificador : null;
    return responder({ imagem_base64: imagem, formato: "image/webp", pedido_id: pedidoId, aviso: modoRegiao
      ? "Região experimental: confira cada lesão e a anatomia antes de usar o mapa completo."
      : modoDetalhe
      ? "Prévia de uma lesão: compare o conteúdo e o contorno com a montagem manual antes de aceitar."
      : "Prévia GPT: compare anatomia, posições, formas, linhas e medidas antes de aceitar." });
  } catch (erro) {
    if (erro instanceof DOMException && erro.name === "AbortError") return responder({ erro: "O GPT demorou mais de dois minutos." }, 504);
    return responder({ erro: "Não foi possível gerar a versão realista com GPT." }, 502);
  } finally { clearTimeout(temporizador); }
});
