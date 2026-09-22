// Resposta REST generateContent. Nenhum texto livre do provedor entra no diagnóstico.
const MOTIVOS_BLOQUEIO = new Set([
  "BLOCK_REASON_UNSPECIFIED", "SAFETY", "OTHER", "BLOCKLIST", "PROHIBITED_CONTENT", "IMAGE_SAFETY",
]);
const FINAIS_BLOQUEADOS = new Set([
  "SAFETY", "IMAGE_SAFETY", "PROHIBITED_CONTENT", "IMAGE_PROHIBITED_CONTENT",
  "BLOCKLIST", "SPII", "RECITATION", "IMAGE_RECITATION", "ESCALATION",
]);
const MOTIVOS_FINAIS = new Set([
  "FINISH_REASON_UNSPECIFIED", "STOP", "MAX_TOKENS", "LANGUAGE", "OTHER", "MALFORMED_FUNCTION_CALL",
  "IMAGE_OTHER", "NO_IMAGE", "UNEXPECTED_TOOL_CALL", "TOO_MANY_TOOL_CALLS", "MISSING_THOUGHT_SIGNATURE",
  "MALFORMED_RESPONSE", ...FINAIS_BLOQUEADOS,
]);
const TIPOS_ERRO = new Set([
  "CANCELLED", "UNKNOWN", "INVALID_ARGUMENT", "DEADLINE_EXCEEDED", "NOT_FOUND", "ALREADY_EXISTS",
  "PERMISSION_DENIED", "RESOURCE_EXHAUSTED", "FAILED_PRECONDITION", "ABORTED", "OUT_OF_RANGE",
  "UNIMPLEMENTED", "INTERNAL", "UNAVAILABLE", "DATA_LOSS", "UNAUTHENTICATED",
]);
const CATEGORIAS = new Set([
  "HARM_CATEGORY_UNSPECIFIED", "HARM_CATEGORY_HATE_SPEECH", "HARM_CATEGORY_SEXUALLY_EXPLICIT",
  "HARM_CATEGORY_DANGEROUS_CONTENT", "HARM_CATEGORY_HARASSMENT", "HARM_CATEGORY_CIVIC_INTEGRITY",
  "HARM_CATEGORY_JAILBREAK",
]);
const PROBABILIDADES = new Set(["HARM_PROBABILITY_UNSPECIFIED", "NEGLIGIBLE", "LOW", "MEDIUM", "HIGH"]);
const CAMPOS_USO = [
  "promptTokenCount", "cachedContentTokenCount", "candidatesTokenCount",
  "toolUsePromptTokenCount", "thoughtsTokenCount", "totalTokenCount",
];
const LIMITE_IMAGEM_BYTES = 20 * 1024 * 1024;

function enumerado(valor, permitidos) {
  return typeof valor === "string" && permitidos.has(valor) ? valor : null;
}

function avaliacoesSeguranca(avaliacoes, origem) {
  if (!Array.isArray(avaliacoes)) return [];
  return avaliacoes.slice(0, 20).flatMap((item) => {
    const categoria = enumerado(item?.category, CATEGORIAS);
    if (!categoria) return [];
    return [{
      origem,
      category: categoria,
      probability: enumerado(item?.probability, PROBABILIDADES),
      blocked: typeof item?.blocked === "boolean" ? item.blocked : null,
    }];
  });
}

function possuiBloqueio(avaliacoes) {
  return Array.isArray(avaliacoes) && avaliacoes.some((item) => item?.blocked === true);
}

function imagemFinal(partes) {
  if (!Array.isArray(partes)) return null;
  for (const parte of partes) {
    if (parte?.thought === true) continue;
    const dados = parte?.inlineData;
    if (!["image/png", "image/jpeg", "image/webp"].includes(dados?.mimeType)) continue;
    const base64 = dados?.data;
    if (typeof base64 !== "string" || !base64.length || base64.length % 4 !== 0
      || base64.length > Math.ceil(LIMITE_IMAGEM_BYTES / 3) * 4
      || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) continue;
    try {
      const bytes = atob(base64);
      if (bytes.length > LIMITE_IMAGEM_BYTES || btoa(bytes) !== base64) continue;
      const png = bytes.startsWith("\x89PNG\r\n\x1a\n");
      const jpeg = bytes.startsWith("\xff\xd8\xff");
      const webp = bytes.startsWith("RIFF") && bytes.slice(8, 12) === "WEBP";
      if (!(dados.mimeType === "image/png" && png || dados.mimeType === "image/jpeg" && jpeg
        || dados.mimeType === "image/webp" && webp)) continue;
      return { data: base64, mime_type: dados.mimeType };
    } catch { /* Base64 inválido: não aproveitar a parte como imagem. */ }
  }
  return null;
}

export function interpretarRespostaGemini(dados, statusHttp) {
  const candidato = Array.isArray(dados?.candidates) ? dados.candidates[0] : null;
  const feedback = dados?.promptFeedback;
  const status = Number.isInteger(statusHttp) && statusHttp >= 100 && statusHttp <= 599 ? statusHttp : null;
  const uso = {};
  for (const campo of CAMPOS_USO) {
    const valor = dados?.usageMetadata?.[campo];
    if (Number.isSafeInteger(valor) && valor >= 0) uso[campo] = valor;
  }
  const diagnostico = {
    http_status: status,
    error_code: Number.isInteger(dados?.error?.code) && dados.error.code >= 100 && dados.error.code <= 599
      ? dados.error.code : null,
    error_type: enumerado(dados?.error?.status, TIPOS_ERRO),
    pedido_id: typeof dados?.responseId === "string" && /^[A-Za-z0-9_-]{1,180}$/.test(dados.responseId)
      ? dados.responseId : null,
    block_reason: enumerado(feedback?.blockReason, MOTIVOS_BLOQUEIO),
    finish_reason: enumerado(candidato?.finishReason, MOTIVOS_FINAIS),
    safety_ratings: [
      ...avaliacoesSeguranca(feedback?.safetyRatings, "prompt"),
      ...avaliacoesSeguranca(candidato?.safetyRatings, "candidate"),
    ],
    uso: Object.keys(uso).length ? uso : null,
  };
  const falha = (erro, estado = "falha_tecnica", http = 502) => ({
    imagem: null, diagnostico, erro, estado, status: http,
  });
  if (status === null || status < 200 || status >= 300 || dados?.error) {
    if (status === 429 || diagnostico.error_type === "RESOURCE_EXHAUSTED") {
      return falha("O Gemini atingiu um limite de uso ou de frequência. Confira a cota antes de tentar novamente.", "falha_tecnica", 429);
    }
    if (status === 401 || diagnostico.error_type === "UNAUTHENTICATED") {
      return falha("A autenticação do Gemini falhou. A configuração no servidor precisa ser conferida.");
    }
    if (status === 403 || diagnostico.error_type === "PERMISSION_DENIED") {
      return falha("A configuração do Gemini não tem permissão para esta solicitação.");
    }
    if (status === 404 || diagnostico.error_type === "NOT_FOUND") {
      return falha("O modelo configurado do Gemini não está disponível para esta solicitação.");
    }
    if (status === 400 || diagnostico.error_type === "INVALID_ARGUMENT") {
      return falha("O Gemini rejeitou os parâmetros ou a imagem de entrada.", "entrada_invalida", 400);
    }
    return falha("O Gemini não concluiu a solicitação. A montagem manual permanece no editor.");
  }
  // Bloqueios precedem a leitura da imagem, mesmo em uma resposta contraditória.
  const bloqueioPrompt = feedback?.blockReason != null && feedback.blockReason !== ""
    && feedback.blockReason !== "BLOCK_REASON_UNSPECIFIED";
  if (bloqueioPrompt || FINAIS_BLOQUEADOS.has(candidato?.finishReason)
    || possuiBloqueio(feedback?.safetyRatings) || possuiBloqueio(candidato?.safetyRatings)) {
    return falha("O Gemini bloqueou esta solicitação em suas verificações. A montagem manual permanece no editor. O motivo técnico disponível está no diagnóstico.", "bloqueado_provedor", 422);
  }
  if (candidato?.finishReason !== "STOP") {
    return falha("O Gemini não devolveu uma imagem final concluída. A montagem manual permanece no editor.", "revisao_necessaria", 422);
  }
  const imagem = imagemFinal(candidato?.content?.parts);
  if (!imagem) {
    return falha("O Gemini respondeu sem uma imagem final válida. A montagem manual permanece no editor.", "revisao_necessaria", 422);
  }
  return { imagem, diagnostico, erro: null, estado: "concluido", status: 200 };
}
