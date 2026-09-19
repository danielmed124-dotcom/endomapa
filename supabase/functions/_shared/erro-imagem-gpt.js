// Somente metadados públicos de diagnóstico; nunca registrar imagens ou chaves.
export function diagnosticarErroImagem(detalhes, identificadorCabecalho) {
  const erro = detalhes?.error;
  const mensagem = typeof erro?.message === "string" ? erro.message : "";
  const bloqueado = ["moderation_blocked", "content_policy_violation"].includes(erro?.code)
    || /rejected by the safety system|rejected as a result of (?:the|our) safety system/i.test(mensagem);
  if (!bloqueado) return null;

  const identificador = /^req_[a-zA-Z0-9_-]{1,180}$/.test(identificadorCabecalho || "")
    ? identificadorCabecalho
    : mensagem.match(/\breq_[a-zA-Z0-9_-]{1,180}\b/)?.[0] || null;
  const etapas = {
    input: "O bloqueio ocorreu na avaliação do texto ou das imagens enviados.",
    output: "O bloqueio ocorreu na avaliação da imagem produzida.",
  };
  const categorias = {
    sexual: "conteúdo sexual",
    violence: "violência",
    "self-harm": "autolesão",
    harassment: "assédio",
    hate: "ódio",
  };
  const detalheModeracao = erro?.moderation_details;
  const etapa = Object.hasOwn(etapas, detalheModeracao?.moderation_stage)
    ? detalheModeracao.moderation_stage : "unknown";
  const informadas = Array.isArray(detalheModeracao?.categories)
    ? [...new Set(detalheModeracao.categories.filter((item) => typeof item === "string" && Object.hasOwn(categorias, item)))] : [];
  const texto = [
    "A OpenAI bloqueou esta geração pela verificação de segurança.",
    etapas[etapa] || "A resposta não informou em qual etapa ocorreu o bloqueio.",
    informadas.length ? `Classificação informada pelo filtro: ${informadas.map((item) => categorias[item]).join(", ")}. Isso não confirma que a classificação esteja correta para este uso médico.` : "A resposta não informou uma categoria específica reconhecida pelo Endomapa.",
    "A montagem manual permanece no editor. Para solicitar revisão, entre em contato com help.openai.com.",
    identificador ? `Identificador do pedido: ${identificador}.` : "A resposta não trouxe um identificador de pedido válido.",
  ].join(" ");
  return { erro: texto, codigo: "GPT_SEGURANCA", pedido_id: identificador, etapa, categorias: informadas };
}
