// Prova A/B com Gemini. A chave permanece somente no servidor Supabase.
import { createClient } from "npm:@supabase/supabase-js@2";

const ORIGEM = "https://endomapa.pages.dev";
const MAPA = `${ORIGEM}/assets/mapa-base-coronal.png`;
const REFERENCIA = `${ORIGEM}/assets/mapa-coronal-fornecido-sem-assinatura.png`;
const LIMITE_MS = 120_000;
const cors = {
  "Access-Control-Allow-Origin": ORIGEM,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

function responder(corpo: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8" },
  });
}

function origemValida(req: Request) {
  return req.headers.get("Origin") === ORIGEM;
}

function numeroValido(valor: unknown): valor is number {
  return typeof valor === "number" && Number.isFinite(valor) && valor > 0 && valor <= 20;
}

function formatar(valor: number) {
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
}

function bytesParaBase64(bytes: Uint8Array) {
  let binario = "";
  const tamanhoBloco = 32_768;
  for (let inicio = 0; inicio < bytes.length; inicio += tamanhoBloco) {
    binario += String.fromCharCode(...bytes.subarray(inicio, inicio + tamanhoBloco));
  }
  return btoa(binario);
}

async function respostaEmBase64(resposta: Response) {
  return bytesParaBase64(new Uint8Array(await resposta.arrayBuffer()));
}

// A resposta REST contém etapas. Procuramos somente um bloco explicitamente marcado como imagem.
function encontrarImagem(valor: unknown): { data: string; mime_type: string } | null {
  if (!valor || typeof valor !== "object") return null;
  const objeto = valor as Record<string, unknown>;
  if (objeto.type === "image" && typeof objeto.data === "string") {
    return {
      data: objeto.data,
      mime_type: typeof objeto.mime_type === "string" ? objeto.mime_type : "image/png",
    };
  }
  for (const filho of Object.values(objeto)) {
    if (Array.isArray(filho)) {
      for (const item of filho) {
        const encontrada = encontrarImagem(item);
        if (encontrada) return encontrada;
      }
    } else if (filho && typeof filho === "object") {
      const encontrada = encontrarImagem(filho);
      if (encontrada) return encontrada;
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return origemValida(req) ? new Response("ok", { headers: cors }) : responder({ erro: "Origem não autorizada." }, 403);
  }
  if (req.method !== "POST") return responder({ erro: "Método não permitido." }, 405);
  if (!origemValida(req)) return responder({ erro: "Esta chamada não veio do Endomapa." }, 403);

  const autorizacao = req.headers.get("Authorization");
  if (!autorizacao?.startsWith("Bearer ")) return responder({ erro: "Entre no Endomapa antes de gerar a imagem." }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const chaveGemini = Deno.env.get("GEMINI_API_KEY");
  if (!url || !anon) return responder({ erro: "A função não encontrou a configuração interna do Supabase." }, 500);
  if (!chaveGemini) return responder({ erro: "O Gemini ainda não foi configurado no servidor." }, 503);

  const supabase = createClient(url, anon, {
    global: { headers: { Authorization: autorizacao } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: usuario, error: erroUsuario } = await supabase.auth.getUser();
  if (erroUsuario || !usuario.user) return responder({ erro: "Sua sessão terminou. Entre novamente." }, 401);

  let corpo: Record<string, unknown>;
  try { corpo = await req.json(); } catch (_erro) { return responder({ erro: "Os dados da lesão não chegaram corretamente." }, 400); }
  const { mapa_id, categoria, localizacao, lado, medida_1, medida_2, mascara_base64 } = corpo;
  if (typeof mapa_id !== "string" || !mapa_id) return responder({ erro: "O mapa não foi identificado." }, 400);
  if (categoria !== "endometriose" || localizacao !== "ligamento uterossacro") {
    return responder({ erro: "O teste atual aceita somente endometriose no ligamento uterossacro." }, 400);
  }
  if (lado !== "esquerdo" && lado !== "direito") return responder({ erro: "A lateralidade precisa ser esquerda ou direita." }, 400);
  if (!numeroValido(medida_1) || !numeroValido(medida_2)) return responder({ erro: "Informe duas medidas válidas." }, 400);
  if (typeof mascara_base64 !== "string" || !mascara_base64 || mascara_base64.length > 2_000_000) {
    return responder({ erro: "A máscara anatômica não chegou corretamente." }, 400);
  }

  const { data: mapa, error: erroMapa } = await supabase.from("mapas").select("id").eq("id", mapa_id).single();
  if (erroMapa || !mapa) return responder({ erro: "O mapa não foi encontrado entre os seus dados." }, 403);

  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), LIMITE_MS);
  try {
    const [respostaMapa, respostaReferencia] = await Promise.all([fetch(MAPA), fetch(REFERENCIA)]);
    if (!respostaMapa.ok || !respostaReferencia.ok) return responder({ erro: "As referências visuais não puderam ser carregadas." }, 502);

    const mapaBase64 = await respostaEmBase64(respostaMapa);
    const referenciaBase64 = await respostaEmBase64(respostaReferencia);
    const ladoVisual = lado === "esquerdo" ? "lado esquerdo visual" : "lado direito visual";
    const forma = medida_1 / medida_2 >= 1.6 ? "alongada" : medida_1 / medida_2 <= 1.2 ? "arredondada" : "ovalada";
    const instrucao = [
      "Edição de ilustração médica anatômica profissional, clínica, não sexual e sem paciente real.",
      "A primeira imagem é o mapa coronal original e deve permanecer idêntico fora da área indicada.",
      "A segunda imagem é a referência visual. Copie o padrão do foco alongado sobre o ligamento uterossacro no lado esquerdo visual, marcado como 1,6 por 0,5 cm.",
      "A terceira imagem é uma máscara: branco significa preservar sem nenhuma alteração; a pequena abertura transparente indica o único lugar que pode ser editado.",
      `Acrescente exatamente um foco no ligamento uterossacro ${lado}, no ${ladoVisual}, medindo ${formatar(medida_1)} por ${formatar(medida_2)} cm e com forma ${forma}.`,
      "O foco deve ter nódulos castanho-escuros irregulares, densamente agrupados e integrados ao tecido, nunca pontos dispersos.",
      "Não acrescente medidas, textos ou setas. Não altere anatomia, logomarca, marca-d'água, assinatura, iluminação ou enquadramento.",
    ].join(" ");

    const respostaGemini = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      signal: controlador.signal,
      headers: { "x-goog-api-key": chaveGemini, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-3.1-flash-image",
        input: [
          { type: "text", text: instrucao },
          { type: "image", mime_type: "image/png", data: mapaBase64 },
          { type: "image", mime_type: "image/png", data: referenciaBase64 },
          { type: "image", mime_type: "image/png", data: mascara_base64 },
        ],
        response_format: { type: "image", mime_type: "image/png", aspect_ratio: "2:3", image_size: "1K" },
      }),
    });

    if (!respostaGemini.ok) {
      let codigo = "sem_codigo";
      let detalheSeguro = "sem_detalhe";
      try {
        const falha = await respostaGemini.json();
        codigo = String(falha?.error?.status || falha?.error?.code || codigo);
        if (typeof falha?.error?.message === "string") {
          detalheSeguro = falha.error.message
            .replace(/AIza[0-9A-Za-z_-]+/g, "[chave protegida]")
            .slice(0, 240);
        }
      } catch (_erro) {}
      console.error(`Gemini recusou a imagem: status ${respostaGemini.status}, código ${codigo}, detalhe ${detalheSeguro}.`);
      return responder({
        erro: `O Gemini recusou a configuração: ${detalheSeguro} (código GEMINI-${respostaGemini.status}-${codigo}).`,
      }, 502);
    }

    const resposta = await respostaGemini.json();
    const imagem = encontrarImagem(resposta);
    if (!imagem) return responder({ erro: "O Gemini terminou sem devolver uma imagem válida." }, 502);
    return responder({
      imagem_base64: imagem.data,
      formato: imagem.mime_type,
      aviso: "Prévia Gemini: confira lado, posição, anatomia e aparência antes de comparar.",
    });
  } catch (erro) {
    if (erro instanceof DOMException && erro.name === "AbortError") return responder({ erro: "O Gemini demorou mais de dois minutos." }, 504);
    console.error("Falha na comunicação com Gemini, sem registrar chave ou dados clínicos.");
    return responder({ erro: "Não foi possível gerar a prévia com Gemini." }, 502);
  } finally {
    clearTimeout(temporizador);
  }
});
