// Somente metadados públicos de diagnóstico; nunca registrar imagens ou chaves.
export function diagnosticarErroImagem(detalhes, identificadorCabecalho) {
  const erro = detalhes?.error;
  const bloqueado = ["moderation_blocked", "content_policy_violation"].includes(erro?.code);
  if (!bloqueado) return null;

  const identificador = /^req_[a-zA-Z0-9_-]{1,180}$/.test(identificadorCabecalho || "")
    ? identificadorCabecalho
    : null;
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
    "O serviço de imagens não concluiu esta solicitação devido à sua verificação de conteúdo.",
    etapas[etapa] || "A resposta não informou em qual etapa ocorreu o bloqueio.",
    informadas.length ? `Classificação informada pelo filtro: ${informadas.map((item) => categorias[item]).join(", ")}. Isso não confirma que a classificação esteja correta para este uso médico.` : "A resposta não informou uma categoria específica reconhecida pelo Endomapa.",
    "A montagem manual permanece no editor. Você pode revisar a descrição ou encaminhar este diagnóstico ao suporte.",
    identificador ? `Identificador do pedido: ${identificador}.` : "A resposta não trouxe um identificador de pedido válido.",
  ].join(" ");
  return { erro: texto, codigo: "GPT_SEGURANCA", estado: "bloqueado_provedor", pedido_id: identificador, etapa, categorias: informadas };
}

export function classificarErroImagem(detalhes, status, identificadorCabecalho) {
  const erro = detalhes?.error || {};
  const codigo = typeof erro.code === "string" && /^[a-z0-9_-]{1,80}$/i.test(erro.code) ? erro.code : null;
  const tipo = typeof erro.type === "string" && /^[a-z0-9_-]{1,80}$/i.test(erro.type) ? erro.type : null;
  const pedido = /^req_[a-zA-Z0-9_-]{1,180}$/.test(identificadorCabecalho || "") ? identificadorCabecalho : null;
  const moderacao = diagnosticarErroImagem(detalhes, pedido);
  if (moderacao) return { ...moderacao, http_status: status, error_type: tipo, error_code: codigo };
  let estado = "falha_tecnica", mensagem = "O serviço de imagens não concluiu o pedido.";
  if (status === 401 || ["invalid_api_key", "authentication_error"].includes(codigo)) mensagem = "A autenticação da OpenAI falhou.";
  else if (status === 403 || ["model_not_found", "insufficient_permissions"].includes(codigo)) mensagem = "A chave não tem acesso ao modelo solicitado.";
  else if (["insufficient_quota", "billing_hard_limit_reached", "billing_not_active"].includes(codigo)) mensagem = "O saldo ou limite financeiro da OpenAI impede esta geração.";
  else if (status === 429) mensagem = "A OpenAI limitou temporariamente as chamadas ou a cota. Confira o código técnico antes de repetir.";
  else if (status === 400) { estado = "entrada_invalida"; mensagem = "A OpenAI rejeitou os parâmetros ou a imagem de entrada."; }
  else if (status >= 500) mensagem = "O serviço de imagens apresentou uma falha temporária.";
  return { erro: mensagem, estado, codigo: "GPT_FALHA", pedido_id: pedido, http_status: status, error_type: tipo, error_code: codigo };
}
