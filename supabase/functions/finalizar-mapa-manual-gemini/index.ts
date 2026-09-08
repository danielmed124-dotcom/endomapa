import { createClient } from "npm:@supabase/supabase-js@2";

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

function encontrarImagem(valor: unknown): { data: string; mime_type: string } | null {
  if (!valor || typeof valor !== "object") return null;
  const objeto = valor as Record<string, unknown>;
  if (objeto.type === "image" && typeof objeto.data === "string") {
    return { data: objeto.data, mime_type: typeof objeto.mime_type === "string" ? objeto.mime_type : "image/jpeg" };
  }
  if (typeof objeto.data === "string" && typeof objeto.mimeType === "string" && objeto.mimeType.startsWith("image/")) {
    return { data: objeto.data, mime_type: objeto.mimeType };
  }
  for (const filho of Object.values(objeto)) {
    if (Array.isArray(filho)) {
      for (const item of filho) { const imagem = encontrarImagem(item); if (imagem) return imagem; }
    } else if (filho && typeof filho === "object") {
      const imagem = encontrarImagem(filho); if (imagem) return imagem;
    }
  }
  return null;
}

Deno.serve(async (req) => {
  const origem = req.headers.get("Origin");
  const responder = (corpo: Record<string, unknown>, status = 200) => responderComOrigem(corpo, status, origem);
  if (req.method === "OPTIONS") return origem && ORIGENS.has(origem) ? new Response("ok", { headers: cabecalhos(origem) }) : responder({ erro: "Origem não autorizada." }, 403);
  if (req.method !== "POST") return responder({ erro: "Método não permitido." }, 405, origem);
  if (!origem || !ORIGENS.has(origem)) return responder({ erro: "Esta chamada não veio do Endomapa." }, 403, origem);
  const autorizacao = req.headers.get("Authorization");
  if (!autorizacao?.startsWith("Bearer ")) return responder({ erro: "Entre no Endomapa antes de gerar a imagem." }, 401);
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const chave = Deno.env.get("GEMINI_API_KEY");
  if (!url || !anon || !serviceRole || !chave) return responder({ erro: "A geração com Gemini não está configurada no servidor." }, 503);
  const supabase = createClient(url, anon, { global: { headers: { Authorization: autorizacao } }, auth: { persistSession: false } });
  const { data: usuario } = await supabase.auth.getUser();
  if (!usuario.user) return responder({ erro: "Sua sessão terminou. Entre novamente." }, 401);
  const administrador = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
  let corpo: Record<string, unknown>;
  try { corpo = await req.json(); } catch (_erro) { return responder({ erro: "A composição não chegou corretamente." }, 400); }
  if (corpo.consultar_diagnostico === true) {
    const { data: diagnostico } = await administrador
      .from("diagnostico_geracao_gemini")
      .select("etapa, atualizado_em")
      .eq("user_id", usuario.user.id)
      .maybeSingle();
    let imagemUrl: string | null = null;
    if (diagnostico?.etapa === "concluida") {
      const { data: arquivos } = await administrador.storage
        .from("imagens-experimentais")
        .list(usuario.user.id, { limit: 10 });
      const arquivo = arquivos?.find((item) => item.name.startsWith("ultima-imagem-gemini."));
      if (arquivo) {
        const { data: endereco } = await administrador.storage
          .from("imagens-experimentais")
          .createSignedUrl(`${usuario.user.id}/${arquivo.name}`, 600);
        imagemUrl = endereco?.signedUrl || null;
      }
    }
    return responder({ diagnostico: diagnostico || null, imagem_url: imagemUrl });
  }
  const composicao = corpo.composicao_base64;
  if (typeof composicao !== "string" || composicao.length < 1000 || composicao.length > 7_000_000) {
    return responder({ erro: "A composição do mapa não tem um tamanho válido." }, 400);
  }
  const { data: reserva, error: erroReserva } = await supabase.rpc("reservar_geracao_imagem").single();
  if (erroReserva || !reserva) return responder({ erro: "Não foi possível conferir o limite de imagens." }, 500);
  if (!reserva.permitido) return responder({ erro: reserva.motivo === "limite_atingido" ? "O limite diário de imagens foi atingido." : "A geração paga não foi liberada para esta conta." }, 429);

  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), LIMITE_MS);
  const registrarEtapa = (etapa: string) => administrador
    .from("diagnostico_geracao_gemini")
    .upsert({ user_id: usuario.user.id, etapa, atualizado_em: new Date().toISOString() });
  try {
    const instrucao = [
      "Ilustração científica de atlas ginecológico destinada à revisão por médico radiologista.",
      "A figura mostra somente órgãos pélvicos internos isolados. Não há pessoa, pele, nudez, anatomia externa ou atividade sexual.",
      "A imagem recebida é uma composição clínica final feita e revisada manualmente por um médico adulto.",
      "Transforme de modo claramente visível somente a aparência interna das lesões inseridas, aplicando acabamento de atlas médico, variação natural de cor e relevo ilustrado.",
      "Preserve com máxima fidelidade a posição, rotação, comprimento, largura, quantidade e distribuição de todas as lesões.",
      "Preserve exatamente toda a anatomia, cores, enquadramento, logomarca, marca-d'água, linhas pretas e textos de medidas.",
      "Não acrescente nem remova lesões, pontos, textos, números, setas ou estruturas. Não mova nenhum elemento.",
      "O resultado é apenas uma prévia experimental para comparação médica obrigatória.",
    ].join(" ");
    await registrarEtapa("pedido_enviado_ao_gemini");
    const resposta = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-image:generateContent", {
      method: "POST", signal: controlador.signal,
      headers: { "x-goog-api-key": chave, "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [
          { inlineData: { mimeType: "image/jpeg", data: composicao } },
          { text: instrucao },
        ] }],
        generationConfig: {
          responseModalities: ["IMAGE"],
          imageConfig: { aspectRatio: "3:4", imageSize: "1K" },
          thinkingConfig: { thinkingLevel: "minimal" },
        },
      }),
    });
    await registrarEtapa("resposta_recebida_do_gemini");
    if (!resposta.ok) {
      const detalhes = await resposta.json().catch(() => null);
      const mensagem = typeof detalhes?.error?.message === "string" ? detalhes.error.message : "";
      const motivo = mensagem ? ` Motivo: ${mensagem}` : "";
      return responder({ erro: `O Gemini recusou a geração (código GEMINI-${resposta.status}).${motivo}` }, resposta.status === 429 ? 429 : 502);
    }
    const imagem = encontrarImagem(await resposta.json());
    if (!imagem) return responder({ erro: "O Gemini terminou sem devolver uma imagem válida." }, 502);
    await registrarEtapa("imagem_encontrada_na_resposta");
    const extensao = imagem.mime_type === "image/png" ? "png" : imagem.mime_type === "image/webp" ? "webp" : "jpg";
    const caminho = `${usuario.user.id}/ultima-imagem-gemini.${extensao}`;
    const bytesImagem = Uint8Array.from(atob(imagem.data), (caractere) => caractere.charCodeAt(0));
    const { error: erroUpload } = await administrador.storage
      .from("imagens-experimentais")
      .upload(caminho, bytesImagem, { contentType: imagem.mime_type, upsert: true });
    if (erroUpload) return responder({ erro: "O Gemini gerou a imagem, mas o servidor não conseguiu armazená-la." }, 502);
    await registrarEtapa("imagem_armazenada");
    const { data: endereco, error: erroEndereco } = await administrador.storage
      .from("imagens-experimentais")
      .createSignedUrl(caminho, 600);
    if (erroEndereco || !endereco?.signedUrl) return responder({ erro: "A imagem foi gerada, mas o endereço temporário não pôde ser criado." }, 502);
    await registrarEtapa("concluida");
    return responder({ imagem_url: endereco.signedUrl, aviso: "Prévia experimental: compare anatomia, posições, formas, linhas e medidas antes de aceitar." });
  } catch (erro) {
    if (erro instanceof DOMException && erro.name === "AbortError") return responder({ erro: "O Gemini demorou mais de dois minutos." }, 504);
    return responder({ erro: "Não foi possível gerar a versão realista." }, 502);
  } finally { clearTimeout(temporizador); }
});
