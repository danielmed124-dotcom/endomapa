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
  // Consulta gratuita: termina antes da reserva e de qualquer chamada à OpenAI.
  if (corpo.verificar_conexao === true) return responder({ conexao_ok: true });
  const composicao = corpo.composicao_base64;
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
    formulario.append("model", "gpt-image-2");
    formulario.append("image", new File([bytes], "mapa-manual.jpg", { type: "image/jpeg" }));
    formulario.append("quality", "medium");
    // Mesma proporção 3:4 da base coronal (1086x1448); dimensões múltiplas de 16.
    formulario.append("size", "1056x1408");
    formulario.append("output_format", "webp");
    formulario.append("output_compression", "85");
    formulario.append("moderation", "low");
    formulario.append("prompt", [
      "Ilustração científica de atlas ginecológico destinada à revisão por médico radiologista.",
      "A figura mostra somente órgãos pélvicos internos isolados. Não há pessoa, pele, nudez, anatomia externa ou atividade sexual.",
      "A imagem recebida é uma composição final feita e revisada manualmente por um médico adulto para documentação clínica.",
      "Integre visualmente as lesões já inseridas à renderização médica tridimensional do mapa: harmonize a direção da luz, a intensidade do brilho e a textura com os tecidos vizinhos.",
      "Use variações sutis de cor e relevo dentro de cada lesão, com sombras suaves de contato na sua própria borda de inserção. A lesão deve parecer ligada à superfície em que foi posicionada, sem halo, contorno artificial ou aspecto de adesivo.",
      "Suavize a transição visual das bordas sem deslocar, expandir ou apagar os contornos. Não engrosse nem agrupe focos separados para aumentar o efeito visual.",
      "Nas aderências, preserve cada faixa, ramificação, abertura e espaço vazio; integre visualmente os pontos de contato já existentes, sem criar novas conexões.",
      "Preserve com máxima fidelidade a posição, rotação, comprimento, largura, quantidade e distribuição de todas as lesões.",
      "Preserve a proporção 3:4 da composição original, seu enquadramento e suas margens. Não alongue, comprima, recorte nem reposicione o mapa.",
      "Mantenha inalterados os tecidos fora das lesões, a anatomia de base e suas cores, os dispositivos como o DIU e seu fio, a logomarca, a marca-d'água, as linhas pretas e os textos de medidas.",
      "Não acrescente nem remova lesões, pontos, textos, números, setas ou estruturas. Não mova nenhum elemento.",
      "O resultado é apenas uma prévia experimental para comparação médica obrigatória.",
    ].join(" "));

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
    return responder({ imagem_base64: imagem, formato: "image/webp", aviso: "Prévia GPT: compare anatomia, posições, formas, linhas e medidas antes de aceitar." });
  } catch (erro) {
    if (erro instanceof DOMException && erro.name === "AbortError") return responder({ erro: "O GPT demorou mais de dois minutos." }, 504);
    return responder({ erro: "Não foi possível gerar a versão realista com GPT." }, 502);
  } finally { clearTimeout(temporizador); }
});
