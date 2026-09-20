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
      "Reconstrua o acabamento visual de cada lesão inserida como uma renderização médica tridimensional de material orgânico, integrada ao mapa. A transformação de textura, iluminação e percepção de volume deve ser claramente visível ao comparar com a entrada.",
      "As texturas e os reflexos internos dos recortes podem ser redesenhados por completo; seus limites, dimensões, localização e características morfológicas são obrigatórios e devem permanecer iguais. Alterar apenas saturação, contraste ou nitidez não atende ao objetivo.",
      "Dê às superfícies variações contínuas de luz e sombra compatíveis com sua curvatura, microtextura coerente com a referência e reflexos de intensidade compatível com os órgãos ao redor. Preserve a cor característica de cada lesão e evite brilho plástico ou metálico.",
      "Priorize a integração entre cada lesão e as estruturas anatômicas adjacentes com as quais ela já está em contato. Harmonize a iluminação dos dois lados da interface e faça a transição de textura acompanhar a superfície do órgão, sem halo ou contorno de recorte.",
      "É permitido ajustar localmente luz, sombra e textura tanto na borda da lesão quanto em uma faixa estreita do tecido imediatamente adjacente ao contato. Use sombra de contato e oclusão ambiente coerentes com a profundidade existente, sem deslocar superfícies, aumentar a lesão ou alterar o formato do órgão.",
      "Preserve a ordem de sobreposição e os planos anatômicos da montagem. Não conecte estruturas separadas, não feche espaços e não represente invasão, retração ou deformação que não estejam desenhadas na entrada.",
      "Suavize a transição visual das bordas sem deslocar, expandir ou apagar os contornos. Não engrosse nem agrupe focos separados para aumentar o efeito visual.",
      "Nas aderências, renderize as faixas existentes com textura fibrosa e iluminação que acompanhe sua curvatura. Preserve espessura, cada ramificação, abertura e espaço vazio; integre os pontos de contato já existentes, sem criar novas conexões.",
      "Nas lesões arredondadas, integre a iluminação da borda à superfície curva e ao órgão vizinho, preservando a parede e a aparência interna mostradas na referência; não apague a parede, não adicione conteúdo e não crie um anel de contorno decorativo.",
      "Preserve com máxima fidelidade a posição, rotação, comprimento, largura, quantidade e distribuição de todas as lesões.",
      "Preserve a proporção 3:4 da composição original, seu enquadramento e suas margens. Não alongue, comprima, recorte nem reposicione o mapa.",
      "Fora das lesões e das faixas estreitas de contato descritas, mantenha a imagem inalterada. Preserve a geometria da anatomia de base e suas cores características, os dispositivos como o DIU e seu fio, a logomarca, a marca-d'água, as linhas pretas e os textos de medidas.",
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
