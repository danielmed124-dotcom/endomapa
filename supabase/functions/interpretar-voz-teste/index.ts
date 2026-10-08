// Importa o cliente oficial do Supabase dentro deste arquivo independente.
// O conteúdo pode ser copiado inteiro para o editor de Edge Functions.
import { createClient } from "npm:@supabase/supabase-js@2";

// Somente a origem pública real do Endomapa recebe permissão do navegador.
const ORIGEM_PERMITIDA = "https://endomapa.pages.dev";
const LIMITE_CARACTERES = 4000;
const TEMPO_MAXIMO_IA_MS = 25_000;
const MODELO_GEMINI = "gemini-3.5-flash-lite";

const cabecalhosCors = {
  "Access-Control-Allow-Origin": ORIGEM_PERMITIDA,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

// Padroniza respostas em português sem incluir detalhes internos ou segredos.
function responder(corpo: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: {
      ...cabecalhosCors,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

// Confere a origem antes de qualquer trabalho que possa gerar custo.
function origemEstaPermitida(requisicao: Request) {
  return requisicao.headers.get("Origin") === ORIGEM_PERMITIDA;
}

import { esquemaInterpretacao, instrucoes, validarInterpretacao } from "./contrato.ts";

Deno.serve(async (requisicao) => {
  // O navegador faz esta pergunta técnica antes do POST real.
  if (requisicao.method === "OPTIONS") {
    if (!origemEstaPermitida(requisicao)) {
      return responder({ erro: "Origem não autorizada." }, 403);
    }

    return new Response("ok", { headers: cabecalhosCors });
  }

  if (requisicao.method !== "POST") {
    return responder({ erro: "Método não permitido." }, 405);
  }

  if (!origemEstaPermitida(requisicao)) {
    return responder({ erro: "Esta chamada não veio do Endomapa." }, 403);
  }

  // O JWT é o crachá digital do médico. verify_jwt deve continuar ligado no painel,
  // e esta segunda verificação mantém uma mensagem clara quando a sessão expira.
  const autorizacao = requisicao.headers.get("Authorization");

  if (!autorizacao?.startsWith("Bearer ")) {
    return responder({ erro: "Entre no Endomapa antes de interpretar o ditado." }, 401);
  }

  const urlSupabase = Deno.env.get("SUPABASE_URL");
  const chavePublicaSupabase = Deno.env.get("SUPABASE_ANON_KEY");

  if (!urlSupabase || !chavePublicaSupabase) {
    return responder({ erro: "A função não encontrou a configuração interna do Supabase." }, 500);
  }

  // Usa a chave pública junto do JWT do médico para preservar auth.uid() e a RLS.
  // A função nunca usa service_role para consultar dados do usuário.
  const supabase = createClient(urlSupabase, chavePublicaSupabase, {
    global: { headers: { Authorization: autorizacao } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: dadosUsuario, error: erroUsuario } = await supabase.auth.getUser();

  if (erroUsuario || !dadosUsuario.user) {
    return responder({ erro: "Sua sessão terminou. Entre novamente no Endomapa." }, 401);
  }

  // Antes de qualquer chamada paga, confirma que o proprietário liberou esta conta.
  // Reutilizamos a lista administrativa das imagens como autorização geral de IA.
  const { data: autorizacaoIA, error: erroAutorizacaoIA } = await supabase
    .from("usuarios_imagem_autorizados")
    .select("ativo")
    .eq("user_id", dadosUsuario.user.id)
    .maybeSingle();

  if (erroAutorizacaoIA) {
    console.error("Falha ao conferir a autorização de uso da IA.");
    return responder({ erro: "Não foi possível conferir a autorização da inteligência artificial." }, 500);
  }

  if (!autorizacaoIA?.ativo) {
    return responder({ erro: "A inteligência artificial ainda não foi liberada para esta conta." }, 403);
  }

  // Lê e valida a entrada antes de reservar cota ou chamar um serviço pago.
  let corpo: { texto_bruto?: unknown };

  try {
    corpo = await requisicao.json();
  } catch (_erro) {
    return responder({ erro: "O texto do ditado não chegou em um formato válido." }, 400);
  }

  if (typeof corpo.texto_bruto !== "string" || !corpo.texto_bruto.trim()) {
    return responder({ erro: "Dite ou escreva os achados antes de pedir a interpretação." }, 400);
  }

  const textoBruto = corpo.texto_bruto.trim();

  if (textoBruto.length > LIMITE_CARACTERES) {
    return responder(
      { erro: `O ditado ultrapassou o limite de ${LIMITE_CARACTERES.toLocaleString("pt-BR")} caracteres.` },
      413,
    );
  }

  // A chave secreta nasce e permanece somente dentro desta Edge Function.
  // Nunca registramos seu valor, nunca a devolvemos e nunca a enviamos ao navegador.
  const chaveGemini = Deno.env.get("GEMINI_API_KEY");

  if (!chaveGemini) {
    return responder({ erro: "A API do Gemini ainda não foi configurada no servidor." }, 503);
  }

  // Reserva uma das 20 chamadas do dia de forma atômica no banco.
  const { data: reserva, error: erroReserva } = await supabase
    .rpc("reservar_chamada_ia")
    .single<{ permitido: boolean; total_chamadas: number; limite_diario: number }>();

  if (erroReserva || !reserva) {
    console.error("Falha ao reservar cota de IA.");
    return responder({ erro: "Não foi possível conferir o limite diário. Tente novamente." }, 500);
  }

  if (!reserva.permitido) {
    return responder(
      { erro: "O limite de 20 interpretações de hoje foi atingido. Tente novamente amanhã." },
      429,
    );
  }

  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TEMPO_MAXIMO_IA_MS);

  try {
    const respostaGemini = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODELO_GEMINI}:generateContent`, {
      method: "POST",
      signal: controlador.signal,
      headers: {
        "x-goog-api-key": chaveGemini,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: instrucoes }] },
        contents: [{ role: "user", parts: [{ text: JSON.stringify({ texto_bruto: textoBruto }) }] }],
        generationConfig: {
          maxOutputTokens: 6000,
          responseMimeType: "application/json",
          responseJsonSchema: esquemaInterpretacao,
        },
      }),
    });

    if (!respostaGemini.ok) {
      // Registra apenas o código técnico, nunca a chave, o ditado ou o corpo do erro externo.
      console.error(`Gemini respondeu com status ${respostaGemini.status}.`);

      if (respostaGemini.status === 402) {
        return responder(
          { erro: "O Gemini recusou a cobrança da API. Confira o saldo e a conta de faturamento no Google AI Studio. O texto foi preservado." },
          503,
        );
      }

      if (respostaGemini.status === 429) {
        return responder({ erro: "O Gemini atingiu um limite de uso ou saldo da API. Confira a cota e o faturamento no Google AI Studio ou tente novamente mais tarde. O texto foi preservado." }, 503);
      }
      if ([401, 403].includes(respostaGemini.status)) return responder({ erro: "O Gemini recusou a chave ou a permissão do projeto. Confira a configuração da API no servidor." }, 503);

      return responder(
        { erro: `O Gemini não conseguiu interpretar o ditado (código GEMINI-${respostaGemini.status}). O texto foi preservado.` },
        502,
      );
    }

    const respostaExterna = await respostaGemini.json();
    const candidato = respostaExterna?.candidates?.[0];
    if (candidato?.finishReason !== "STOP") return responder({ erro: "O Gemini não concluiu a interpretação. O texto e o mapa foram preservados; revise o ditado ou tente novamente." }, 502);
    const conteudo = candidato?.content?.parts?.filter((p: { thought?: boolean; text?: unknown }) => !p.thought && typeof p.text === "string").map((p: { text: string }) => p.text).join("");

    if (typeof conteudo !== "string" || !conteudo) {
      return responder({ erro: "A inteligência artificial respondeu sem uma interpretação válida." }, 502);
    }

    let interpretacao: Record<string, unknown>;

    try {
      interpretacao = JSON.parse(conteudo);
    } catch (_erro) {
      return responder({ erro: "A inteligência artificial devolveu uma resposta incompleta. Tente novamente." }, 502);
    }

    if (!validarInterpretacao(interpretacao)) {
      return responder({ erro: "A resposta trouxe imagens, quantidades ou medidas em formato incompatível. Revise o texto e tente novamente." }, 502);
    }

    interpretacao.texto_bruto = textoBruto;

    return responder({
      sugestao: interpretacao,
      provedor: "Gemini",
      modelo: MODELO_GEMINI,
      aviso: "Sugestão da IA: confira todos os campos antes de salvar.",
      uso: {
        chamadas_hoje: reserva.total_chamadas,
        limite_diario: reserva.limite_diario,
      },
    });
  } catch (erro) {
    if (erro instanceof DOMException && erro.name === "AbortError") {
      return responder(
        { erro: "A inteligência artificial demorou mais de 25 segundos. Revise o texto ou tente novamente." },
        504,
      );
    }

    console.error("Falha de comunicação com o Gemini, sem registrar dados sensíveis.");
    return responder(
      { erro: "Não foi possível falar com a inteligência artificial. O texto continua disponível para revisão manual." },
      502,
    );
  } finally {
    clearTimeout(temporizador);
  }
});
