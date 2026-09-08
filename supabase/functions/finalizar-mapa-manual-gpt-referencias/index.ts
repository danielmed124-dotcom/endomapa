import { createClient } from "npm:@supabase/supabase-js@2";

const ORIGENS = new Set(["https://endomapa.pages.dev", "https://experimento-editor-manual.endomapa.pages.dev"]);
const BASE_PUBLICA = "https://experimento-editor-manual.endomapa.pages.dev";
const REFERENCIAS: Record<string, { caminho: string; arquivo: string }> = {
  "Ligamento uterossacro": { caminho: "assets/lesoes/endometriose-isolada-referencia-transparente.png", arquivo: "referencia-ligamento-uterossacro.png" },
  "Cisto": { caminho: "assets/lesoes/cisto-referencia.png", arquivo: "referencia-cisto.png" },
  "Endometriose alongada": { caminho: "assets/lesoes/endometriose-ligamento-original.png", arquivo: "referencia-endometriose-alongada.png" },
  "Endometriose arredondada": { caminho: "assets/lesoes/endometriose-ligamento-arredondada-referencia.png", arquivo: "referencia-endometriose-arredondada.png" },
  "Adenomiose": { caminho: "assets/lesoes/adenomiose-parede-anterior-referencia-v3.png", arquivo: "referencia-adenomiose.png" },
};
const LIMITE_MS = 120_000;
const corsBase = { "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin" };

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
  const composicao = corpo.composicao_base64;
  if (typeof composicao !== "string" || composicao.length < 1000 || composicao.length > 7_000_000) return responder({ erro: "A composição do mapa não tem um tamanho válido." }, 400);
  if (!Array.isArray(corpo.tipos_lesao)) return responder({ erro: "Os tipos de lesão não foram identificados." }, 400);
  const tipos = [...new Set(corpo.tipos_lesao.filter((tipo): tipo is string => typeof tipo === "string" && tipo in REFERENCIAS))];
  if (!tipos.length || tipos.length > 3) return responder({ erro: "Nenhuma referência visual válida foi identificada." }, 400);

  const { data: reserva, error: erroReserva } = await supabase.rpc("reservar_geracao_imagem").single();
  if (erroReserva || !reserva) return responder({ erro: "Não foi possível conferir o limite de imagens." }, 500);
  if (!reserva.permitido) return responder({ erro: reserva.motivo === "limite_atingido" ? "O limite diário de imagens foi atingido." : "A geração paga não foi liberada para esta conta." }, 429);

  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), LIMITE_MS);
  try {
    const respostasReferencias = await Promise.all(tipos.map((tipo) => fetch(`${BASE_PUBLICA}/${REFERENCIAS[tipo].caminho}`, { signal: controlador.signal })));
    if (respostasReferencias.some((resposta) => !resposta.ok || !resposta.headers.get("content-type")?.startsWith("image/"))) {
      return responder({ erro: "O servidor não devolveu uma imagem válida para uma das referências visuais." }, 502);
    }
    const bytes = Uint8Array.from(atob(composicao), (caractere) => caractere.charCodeAt(0));
    const formulario = new FormData();
    formulario.append("model", "gpt-image-2");
    formulario.append("image[]", new File([bytes], "01-mapa-manual.jpg", { type: "image/jpeg" }));
    for (let indice = 0; indice < tipos.length; indice += 1) {
      const referencia = REFERENCIAS[tipos[indice]];
      formulario.append("image[]", new File([await respostasReferencias[indice].blob()], referencia.arquivo, { type: "image/png" }));
    }
    formulario.append("quality", "medium");
    formulario.append("size", "1024x1536");
    formulario.append("output_format", "webp");
    formulario.append("output_compression", "85");
    formulario.append("moderation", "low");
    formulario.append("prompt", [
      "Edição de ilustração médica anatômica profissional, clínica, não sexual e sem paciente real.",
      "A PRIMEIRA imagem é a composição final revisada pelo médico e é a única autoridade para anatomia, posição, limites, forma, rotação, tamanho, quantidade e distribuição das lesões.",
      `As imagens seguintes são referências visuais somente para textura, cor, brilho, relevo e integração tecidual destes tipos já presentes: ${tipos.join(", ")}.`,
      "Não copie das referências a posição, o contorno externo, a escala, a quantidade nem qualquer fundo anatômico.",
      "Transforme de modo claramente visível a aparência interna de cada lesão já presente na primeira imagem, aplicando textura orgânica, variação de cor, volume, luz e integração com o tecido conforme as referências.",
      "Mantenha o contorno externo, a posição, a rotação e o tamanho de cada lesão. Nenhum pixel fora desses contornos deve virar lesão.",
      "Não crie lesões, nódulos, pontos escuros, manchas ou extensões em nenhum outro local. Não aumente nem diminua os contornos existentes.",
      "Preserve exatamente anatomia, cores, enquadramento, logomarca, marca-d'água, linhas pretas e textos de medidas da primeira imagem.",
      "O resultado é apenas uma prévia experimental para comparação médica obrigatória.",
    ].join(" "));

    const resposta = await fetch("https://api.openai.com/v1/images/edits", { method: "POST", signal: controlador.signal, headers: { Authorization: `Bearer ${chave}` }, body: formulario });
    if (!resposta.ok) {
      const detalhes = await resposta.json().catch(() => null);
      const motivo = typeof detalhes?.error?.message === "string" ? ` Motivo: ${detalhes.error.message}` : "";
      return responder({ erro: `O GPT recusou o teste com referências (código GPT-REF-${resposta.status}).${motivo}` }, resposta.status === 429 ? 429 : 502);
    }
    const dados = await resposta.json();
    const imagem = dados?.data?.[0]?.b64_json;
    if (typeof imagem !== "string" || !imagem) return responder({ erro: "O GPT terminou sem devolver uma imagem válida." }, 502);
    return responder({ imagem_base64: imagem, formato: "image/webp", aviso: "Prévia GPT com referências: confira primeiro limites, quantidade e localização; depois avalie a aparência." });
  } catch (erro) {
    if (erro instanceof DOMException && erro.name === "AbortError") return responder({ erro: "O GPT demorou mais de dois minutos." }, 504);
    return responder({ erro: "Não foi possível gerar a versão do GPT com referências." }, 502);
  } finally { clearTimeout(temporizador); }
});
