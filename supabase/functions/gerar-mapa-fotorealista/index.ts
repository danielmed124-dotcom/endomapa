// Gera uma prévia fotorealista no servidor, sem expor a chave da OpenAI.
import { createClient } from "npm:@supabase/supabase-js@2";

const ORIGEM_PERMITIDA = "https://endomapa.pages.dev";
const MAPA_CORONAL = `${ORIGEM_PERMITIDA}/assets/mapa-base-coronal.png`;
const REFERENCIA_ENDOMETRIOSE = `${ORIGEM_PERMITIDA}/assets/mapa-coronal-fornecido-sem-assinatura.png`;
const TEMPO_MAXIMO_MS = 120_000;

const cors = {
  "Access-Control-Allow-Origin": ORIGEM_PERMITIDA,
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

function origemPermitida(requisicao: Request) {
  return requisicao.headers.get("Origin") === ORIGEM_PERMITIDA;
}

function medidaValida(valor: unknown): valor is number {
  return typeof valor === "number" && Number.isFinite(valor) && valor > 0 && valor <= 20;
}

function formatarMedida(valor: number) {
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });
}

Deno.serve(async (requisicao) => {
  if (requisicao.method === "OPTIONS") {
    return origemPermitida(requisicao)
      ? new Response("ok", { headers: cors })
      : responder({ erro: "Origem não autorizada." }, 403);
  }

  if (requisicao.method !== "POST") return responder({ erro: "Método não permitido." }, 405);
  if (!origemPermitida(requisicao)) return responder({ erro: "Esta chamada não veio do Endomapa." }, 403);

  // O JWT é o crachá do médico. A função também deve permanecer com verify_jwt ligado.
  const autorizacao = requisicao.headers.get("Authorization");
  if (!autorizacao?.startsWith("Bearer ")) {
    return responder({ erro: "Entre no Endomapa antes de gerar a imagem." }, 401);
  }

  const urlSupabase = Deno.env.get("SUPABASE_URL");
  const chavePublica = Deno.env.get("SUPABASE_ANON_KEY");
  const chaveOpenAI = Deno.env.get("OPENAI_API_KEY");

  if (!urlSupabase || !chavePublica) {
    return responder({ erro: "A função não encontrou a configuração interna do Supabase." }, 500);
  }
  if (!chaveOpenAI) {
    return responder({ erro: "A geração fotorealista ainda não foi configurada no servidor." }, 503);
  }

  const supabase = createClient(urlSupabase, chavePublica, {
    global: { headers: { Authorization: autorizacao } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: dadosUsuario, error: erroUsuario } = await supabase.auth.getUser();
  if (erroUsuario || !dadosUsuario.user) {
    return responder({ erro: "Sua sessão terminou. Entre novamente no Endomapa." }, 401);
  }

  let corpo: Record<string, unknown>;
  try {
    corpo = await requisicao.json();
  } catch (_erro) {
    return responder({ erro: "Os dados da lesão não chegaram em formato válido." }, 400);
  }

  const { mapa_id, categoria, localizacao, lado, medida_1, medida_2, mascara_base64 } = corpo;
  if (typeof mapa_id !== "string" || !mapa_id) return responder({ erro: "O mapa não foi identificado." }, 400);
  if (categoria !== "endometriose" || localizacao !== "ligamento uterossacro") {
    return responder({ erro: "Nesta prova, somente endometriose no ligamento uterossacro está liberada." }, 400);
  }
  if (lado !== "esquerdo" && lado !== "direito") {
    return responder({ erro: "Informe se a lesão está no ligamento esquerdo ou direito." }, 400);
  }
  if (!medidaValida(medida_1) || !medidaValida(medida_2)) {
    return responder({ erro: "Informe duas medidas válidas e maiores que zero." }, 400);
  }
  if (typeof mascara_base64 !== "string" || !mascara_base64 || mascara_base64.length > 2_000_000) {
    return responder({ erro: "A área anatômica de edição não chegou em formato válido." }, 400);
  }

  // Confere no banco, sob RLS, se o mapa pertence realmente ao médico logado.
  const { data: mapa, error: erroMapa } = await supabase
    .from("mapas")
    .select("id, user_id, status")
    .eq("id", mapa_id)
    .single();
  if (erroMapa || !mapa) return responder({ erro: "O mapa não foi encontrado entre os seus dados." }, 403);

  // Reserva uma das cinco tentativas diárias antes de chamar o serviço pago.
  // A função do banco também recusa contas que não foram autorizadas pelo proprietário.
  const { data: reserva, error: erroReserva } = await supabase
    .rpc("reservar_geracao_imagem")
    .single();

  if (erroReserva || !reserva) {
    console.error("Falha ao conferir a autorização da geração de imagem.");
    return responder({ erro: "Não foi possível conferir o limite de imagens. Tente novamente." }, 500);
  }

  if (!reserva.permitido) {
    const mensagem = reserva.motivo === "limite_atingido"
      ? "O limite de cinco tentativas de imagem de hoje foi atingido. Tente novamente amanhã."
      : "A geração paga de imagens ainda não foi liberada para esta conta.";
    return responder({ erro: mensagem }, 429);
  }

  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TEMPO_MAXIMO_MS);

  try {
    const [respostaMapa, respostaReferencia] = await Promise.all([
      fetch(MAPA_CORONAL),
      fetch(REFERENCIA_ENDOMETRIOSE),
    ]);
    if (!respostaMapa.ok || !respostaReferencia.ok) {
      return responder({ erro: "Não foi possível carregar as imagens de referência." }, 502);
    }

    const formulario = new FormData();
    formulario.append("model", "gpt-image-2");
    formulario.append("image[]", new File([await respostaMapa.blob()], "mapa-coronal.png", { type: "image/png" }));
    formulario.append("image[]", new File([await respostaReferencia.blob()], "referencia-lesao.png", { type: "image/png" }));
    try {
      const bytesMascara = Uint8Array.from(atob(mascara_base64), (caractere) => caractere.charCodeAt(0));
      formulario.append("mask", new File([bytesMascara], "mascara-ligamento.png", { type: "image/png" }));
    } catch (_erro) {
      return responder({ erro: "A área anatômica de edição ficou corrompida. Atualize a página e tente novamente." }, 400);
    }
    formulario.append("quality", "medium");
    formulario.append("size", "1024x1536");
    formulario.append("output_format", "webp");
    formulario.append("output_compression", "85");
    // A própria API oferece "low" para aplicações legítimas que precisam de
    // filtragem menos restritiva. As demais políticas de segurança continuam ativas.
    formulario.append("moderation", "low");

    // A lateralidade aqui segue a imagem coronal já calibrada e aprovada pelo médico.
    const ladoVisual = lado === "esquerdo" ? "lado esquerdo visual da imagem" : "lado direito visual da imagem";
    const proporcao = medida_1 / medida_2;
    const forma = proporcao >= 1.6 ? "alongada" : proporcao <= 1.2 ? "arredondada" : "levemente ovalada";
    formulario.append("prompt", [
      "Edição de ilustração médica anatômica para uso profissional por radiologista adulto. Conteúdo estritamente clínico, educacional, não sexual e sem paciente real.",
      "A primeira imagem é um mapa anatômico coronal que deve ser preservado com máxima fidelidade.",
      "A segunda imagem é o modelo visual obrigatório. Observe especificamente o foco alongado sobre o ligamento uterossacro no lado esquerdo visual, marcado como 1,6 por 0,5 cm: nódulos castanho-escuros brilhantes, irregulares, densamente agrupados, integrados à superfície e com reação tecidual avermelhada discreta.",
      `Acrescente exatamente uma lesão de endometriose no ligamento uterossacro ${lado}, que fica no ${ladoVisual}.`,
      `A lesão mede ${formatarMedida(medida_1)} por ${formatarMedida(medida_2)} centímetros e deve ter forma ${forma}, respeitando essa proporção visual.`,
      "Edite somente a abertura transparente da máscara. Não desenhe nada fora dela. Não espalhe pontos separados: forme um único foco contínuo semelhante ao modelo da segunda imagem.",
      "Não acrescente textos, setas, medidas, assinatura ou novas marcas. Não altere útero, ovários, tubas, intestino, logomarca, marca-d'água, enquadramento, iluminação ou qualquer outra estrutura.",
      "Isto é uma prévia para conferência obrigatória de um médico, não um diagnóstico.",
    ].join(" "));

    const respostaOpenAI = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      signal: controlador.signal,
      headers: { Authorization: `Bearer ${chaveOpenAI}` },
      body: formulario,
    });

    if (!respostaOpenAI.ok) {
      // Lemos somente o código técnico seguro. Nunca devolvemos chave, prompt ou imagem.
      let codigoExterno = "sem_codigo";
      try {
        const falhaExterna = await respostaOpenAI.json();
        if (typeof falhaExterna?.error?.code === "string") codigoExterno = falhaExterna.error.code;
      } catch (_erro) {
        // Algumas falhas não trazem JSON; o status HTTP continua suficiente.
      }
      console.error(`OpenAI recusou a imagem: status ${respostaOpenAI.status}, código ${codigoExterno}.`);

      if (respostaOpenAI.status === 400) {
        return responder({ erro: `A OpenAI recusou a configuração da imagem (código IMAGEM-400-${codigoExterno}).` }, 502);
      }
      if (respostaOpenAI.status === 401) {
        return responder({ erro: "A chave da geração de imagens foi recusada (código IMAGEM-401)." }, 502);
      }
      if (respostaOpenAI.status === 403) {
        return responder({ erro: `A conta da OpenAI ainda não liberou a geração de imagens (código IMAGEM-403-${codigoExterno}).` }, 502);
      }
      if (respostaOpenAI.status === 429) {
        return responder({ erro: `O limite ou saldo da geração foi atingido (código IMAGEM-429-${codigoExterno}).` }, 429);
      }
      return responder({ erro: `A OpenAI não concluiu a imagem (código IMAGEM-${respostaOpenAI.status}-${codigoExterno}).` }, 502);
    }

    const resposta = await respostaOpenAI.json();
    const imagem = resposta?.data?.[0]?.b64_json;
    if (typeof imagem !== "string" || !imagem) {
      return responder({ erro: "A geração terminou sem devolver uma imagem válida." }, 502);
    }

    return responder({
      imagem_base64: imagem,
      formato: "image/webp",
      aviso: "Prévia produzida por IA. Confira anatomia, lado, localização, forma e proporção antes de aprovar.",
    });
  } catch (erro) {
    if (erro instanceof DOMException && erro.name === "AbortError") {
      return responder({ erro: "A geração demorou mais de dois minutos. Tente novamente." }, 504);
    }
    console.error("Falha na geração da imagem, sem registrar chave ou dados clínicos.");
    return responder({ erro: "Não foi possível gerar a prévia. O mapa original continua preservado." }, 502);
  } finally {
    clearTimeout(temporizador);
  }
});
