import { createClient } from "npm:@supabase/supabase-js@2";
import { construirPromptEdicaoDireta, normalizarEntradaRefinamento, VERSAO_PROMPT_DIRETO } from "../_shared/prompt-edicao-direta-gemini.js";
import { interpretarRespostaGemini } from "../_shared/resposta-imagem-gemini.js";

const ORIGENS = new Set([
  "https://endomapa.pages.dev",
  "https://experimento-editor-manual.endomapa.pages.dev",
]);
const LIMITE_MS = 120_000;
const MODELO = "gemini-3.1-flash-lite-image";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`;
const VERSAO_FUNCAO = "gemini-refinamento-v3";
const VERSAO_INTEGRACAO = "refinamento-v2";
const CONFIGURACAO_DIRETA = {
  responseModalities: ["IMAGE"],
  imageConfig: { aspectRatio: "3:4", imageSize: "1K" },
  thinkingConfig: { thinkingLevel: "minimal" },
};
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
  const operacaoId = crypto.randomUUID();
  let tentativasEnvioImagem = 0;
  let modoDireto = false;
  const origem = req.headers.get("Origin");
  const metadados = () => ({ operacao_id: operacaoId, horario_utc: new Date().toISOString(),
    versao_funcao: VERSAO_FUNCAO, versao_prompt: modoDireto ? VERSAO_PROMPT_DIRETO : "legado",
    ...(modoDireto ? { versao_integracao: VERSAO_INTEGRACAO } : {}),
    modelo: MODELO, endpoint: ENDPOINT, tentativas_envio_imagem: tentativasEnvioImagem });
  const responder = (corpo: Record<string, unknown>, status = 200) => responderComOrigem({ ...corpo, ...metadados() }, status, origem);
  const registrar = (etapa: string, dados: Record<string, unknown> = {}) => console.info(JSON.stringify({ ...metadados(), etapa, ...dados }));
  if (req.method === "OPTIONS") return origem && ORIGENS.has(origem) ? new Response("ok", { headers: cabecalhos(origem) }) : responder({ erro: "Origem não autorizada." }, 403);
  if (req.method !== "POST") return responder({ erro: "Método não permitido." }, 405);
  if (!origem || !ORIGENS.has(origem)) return responder({ erro: "Esta chamada não veio do Endomapa." }, 403);
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
  modoDireto = corpo.modo_edicao_direta === true;
  // Compatibilidade com a composição protegida do editor: não é validação clínica
  // nem uma máscara enviada ao provedor. Abas antigas param antes de reservar cota.
  if (modoDireto && corpo.versao_integracao !== VERSAO_INTEGRACAO) {
    return responder({ estado: "editor_desatualizado",
      erro: "Esta aba está com uma versão antiga do editor. Salve a montagem manual antes de atualizar a página ou abrir uma nova aba. Nenhuma geração foi solicitada." }, 409);
  }
  if (modoDireto && (corpo.modo_detalhe === true || corpo.consultar_diagnostico === true || corpo.modo_regiao === true || corpo.modo_mapa_referencia === true)) {
    return responder({ erro: "Escolha somente um modo de edição. Nenhuma geração foi solicitada." }, 400);
  }
  if (modoDireto && Object.keys(corpo).some(campo => ![
    "modo_edicao_direta", "versao_integracao", "preparar_teste", "composicao_base64", "inventario_lesoes", "lesoes_autorizadas", "mapa_sha256", "prompt_sha256",
  ].includes(campo))) return responder({ estado: "entrada_invalida", erro: "O pedido contém campos não reconhecidos. Nenhuma geração foi solicitada." }, 400);
  if (corpo.preparar_teste === true && !modoDireto) return responder({ erro: "A preparação gratuita requer o modo de edição direta." }, 400);
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
  const modoDetalhe = corpo.modo_detalhe === true;
  if (typeof composicao !== "string" || composicao.length < 1000 || composicao.length > 7_000_000) {
    return responder({ erro: "A composição do mapa não tem um tamanho válido." }, 400);
  }
  let hashesDiretos: { mapa_sha256: string; prompt_sha256: string } | null = null;
  let promptDireto = "";
  let quantidadeLesoesDiretas = 0;
  let quantidadeAutorizadasDiretas = 0;
  if (modoDireto) {
    let entradaRefinamento;
    try {
      entradaRefinamento = normalizarEntradaRefinamento(corpo.inventario_lesoes, corpo.lesoes_autorizadas);
      promptDireto = construirPromptEdicaoDireta(entradaRefinamento.inventario, entradaRefinamento.autorizadas);
      quantidadeLesoesDiretas = entradaRefinamento.inventario.lesoes.length;
      quantidadeAutorizadasDiretas = entradaRefinamento.autorizadas.length;
    } catch (_erro) {
      return responder({ estado: "entrada_invalida", erro: "A lista de lesões ou suas autorizações está inválida. Salve a montagem manual e abra a versão atual do editor. Nenhuma geração foi solicitada." }, 400);
    }
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(composicao) || composicao.length % 4 !== 0) {
      return responder({ erro: "A imagem enviada está inválida. Nenhuma geração foi solicitada." }, 400);
    }
    let bytes: Uint8Array;
    try { bytes = Uint8Array.from(atob(composicao), (caractere) => caractere.charCodeAt(0)); }
    catch (_erro) { return responder({ erro: "A imagem enviada não pôde ser lida. Nenhuma geração foi solicitada." }, 400); }
    if (bytes.length < 33 || ![137,80,78,71,13,10,26,10].every((byte, indice) => bytes[indice] === byte) ||
        ![73,72,68,82].every((byte, indice) => bytes[indice + 12] === byte)) {
      return responder({ erro: "A edição direta requer o PNG da montagem manual. Nenhuma geração foi solicitada." }, 400);
    }
    const cabecalhoPng = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (cabecalhoPng.getUint32(8) !== 13 || cabecalhoPng.getUint32(16) !== entradaRefinamento.inventario.largura_mapa ||
        cabecalhoPng.getUint32(20) !== entradaRefinamento.inventario.altura_mapa) {
      return responder({ estado: "entrada_invalida", erro: "As dimensões da montagem e da lista de lesões não correspondem. Nenhuma geração foi solicitada." }, 400);
    }
    const hash = async (entrada: Uint8Array) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", entrada)))
      .map((byte) => byte.toString(16).padStart(2, "0")).join("");
    hashesDiretos = { mapa_sha256: await hash(bytes), prompt_sha256: await hash(new TextEncoder().encode(promptDireto)) };
    if (corpo.preparar_teste === true) return responder({
      pronto: true, prompt_visual: promptDireto, prompt_sha256: hashesDiretos.prompt_sha256,
      parametros: CONFIGURACAO_DIRETA, imagem_1: { papel: "montagem manual sem rótulos; única imagem enviada", sha256: hashesDiretos.mapa_sha256 },
      mascara_api: false, mascara_composicao_local: true, quantidade_lesoes: quantidadeLesoesDiretas, quantidade_autorizadas: quantidadeAutorizadasDiretas,
    });
    if (corpo.mapa_sha256 !== hashesDiretos.mapa_sha256 || corpo.prompt_sha256 !== hashesDiretos.prompt_sha256) {
      return responder({ erro: "A imagem, a lista de lesões, suas autorizações ou o prompt mudou desde a preparação. Nenhuma geração foi solicitada.", estado: "entrada_invalida" }, 409);
    }
  }
  const { data: reserva, error: erroReserva } = await supabase.rpc("reservar_geracao_imagem")
    .single<{ permitido: boolean; motivo: string | null }>();
  if (erroReserva || !reserva) return responder({ erro: "Não foi possível conferir o limite de imagens." }, 500);
  if (!reserva.permitido) return responder({ erro: reserva.motivo === "limite_atingido" ? "O limite diário de imagens foi atingido." : "A geração paga não foi liberada para esta conta." }, 429);

  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), LIMITE_MS);
  const registrarEtapa = async (etapa: string) => {
    // O modo direto devolve somente a resposta desta operação, sem reutilizar
    // a imagem anterior armazenada por conta nos experimentos antigos.
    if (modoDireto) return;
    await administrador.from("diagnostico_geracao_gemini")
      .upsert({ user_id: usuario.user.id, etapa, atualizado_em: new Date().toISOString() });
  };
  try {
    const instrucao = modoDireto ? promptDireto : (modoDetalhe ? [
      "Close quadrado de uma ilustração científica de órgãos pélvicos internos, para revisão por médico radiologista.",
      "Refine VISIVELMENTE a lesão no centro e sua união com o tecido ao redor: crie relevo orgânico, sombra de contato e continuidade de luz e textura. A borda deve parecer parte do órgão, sem aspecto de adesivo colado.",
      "Mantenha a mesma lesão, posição, lado, tamanho, contorno clínico, parede, conteúdo e número de focos. Não crie, apague, una nem desloque achados.",
      "Mantenha o tecido fora da lesão e da faixa de contato reconhecível. Preserve linhas e medidas visíveis. Devolva o mesmo enquadramento quadrado, sem texto novo.",
    ] : [
      "Ilustração científica de atlas ginecológico destinada à revisão por médico radiologista.",
      "A figura mostra somente órgãos pélvicos internos isolados. Não há pessoa, pele, nudez, anatomia externa ou atividade sexual.",
      "A imagem recebida é uma composição clínica final feita e revisada manualmente por um médico adulto.",
      "Transforme de modo claramente visível somente a aparência interna das lesões inseridas, aplicando acabamento de atlas médico, variação natural de cor e relevo ilustrado.",
      "Preserve com máxima fidelidade a posição, rotação, comprimento, largura, quantidade e distribuição de todas as lesões.",
      "Preserve exatamente toda a anatomia, cores, enquadramento, logomarca, marca-d'água, linhas pretas e textos de medidas.",
      "Não acrescente nem remova lesões, pontos, textos, números, setas ou estruturas. Não mova nenhum elemento.",
      "O resultado é apenas uma prévia experimental para comparação médica obrigatória.",
    ]).join(" ");
    await registrarEtapa("pedido_enviado_ao_gemini");
    tentativasEnvioImagem = 1;
    if (modoDireto) registrar("pedido_enviado", { tentativa: 1, ...hashesDiretos, parametros: CONFIGURACAO_DIRETA,
      quantidade_lesoes: quantidadeLesoesDiretas, quantidade_autorizadas: quantidadeAutorizadasDiretas });
    const resposta = await fetch(ENDPOINT, {
      method: "POST", signal: controlador.signal,
      headers: { "x-goog-api-key": chave, "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [
          { inlineData: { mimeType: modoDireto ? "image/png" : "image/jpeg", data: composicao } },
          { text: instrucao },
        ] }],
        generationConfig: modoDireto ? CONFIGURACAO_DIRETA : {
          responseModalities: ["IMAGE"],
          imageConfig: { aspectRatio: modoDetalhe ? "1:1" : "3:4", imageSize: "1K" },
          thinkingConfig: { thinkingLevel: "minimal" },
        },
      }),
    });
    await registrarEtapa("resposta_recebida_do_gemini");
    if (modoDireto) {
      const dados = await resposta.json().catch(() => null);
      const { imagem, diagnostico, erro, estado, status } = interpretarRespostaGemini(dados, resposta.status);
      registrar(imagem ? "imagem_recebida" : "resposta_erro", diagnostico);
      if (!imagem) return responder({ ...diagnostico, erro, estado }, status);
      return responder({ ...diagnostico, imagem_base64: imagem.data, formato: imagem.mime_type, estado,
        aviso: "Proposta Gemini para comparação. Confira anatomia, quantidade, posição e medidas de cada lesão antes de usar." });
    }
    if (!resposta.ok) {
      const detalhes = await resposta.json().catch(() => null);
      const mensagem = typeof detalhes?.error?.message === "string" ? detalhes.error.message : "";
      const motivo = mensagem ? ` Motivo: ${mensagem}` : "";
      return responder({ erro: `O Gemini recusou a geração (código GEMINI-${resposta.status}).${motivo}` }, resposta.status === 429 ? 429 : 502);
    }
    const imagem = encontrarImagem(await resposta.json());
    if (!imagem) return responder({ erro: "O Gemini terminou sem devolver uma imagem válida." }, 502);
    await registrarEtapa("imagem_encontrada_na_resposta");
    if (modoDetalhe) {
      await registrarEtapa("concluida");
      return responder({ imagem_base64: imagem.data, formato: imagem.mime_type,
        aviso: "Prévia local do Gemini: compare contorno, conteúdo e medidas antes de usar." });
    }
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
    if (modoDireto) {
      const timeout = erro instanceof DOMException && erro.name === "AbortError";
      registrar("falha_tecnica", { classe: timeout ? "timeout" : "rede_ou_processamento" });
      return responder({ estado: "falha_tecnica", erro: timeout
        ? "O Gemini demorou mais de dois minutos. O estado da geração é desconhecido; confira o uso antes de repetir. A montagem manual foi preservada."
        : "Não foi possível concluir a edição com Gemini. A montagem manual foi preservada; não houve nova tentativa automática." }, timeout ? 504 : 502);
    }
    if (erro instanceof DOMException && erro.name === "AbortError") return responder({ erro: "O Gemini demorou mais de dois minutos." }, 504);
    return responder({ erro: "Não foi possível gerar a versão realista." }, 502);
  } finally { clearTimeout(temporizador); }
});
