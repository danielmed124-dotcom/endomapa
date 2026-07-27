// Importa o cliente oficial do Supabase diretamente dentro desta função.
// Assim, o arquivo é completo e pode ser colado sozinho no editor do painel.
import { createClient } from "npm:@supabase/supabase-js@2";

// Define os cabeçalhos usados quando o navegador conversar com a função.
// Eles permitem a chamada, mas não substituem a exigência de estar logado.
const cabecalhosCors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Monta uma resposta JSON padronizada, sempre em português.
function responder(corpo: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: {
      ...cabecalhosCors,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

// Converte uma frase longa em uma descrição curta para a lista do WhatsApp.
function resumirTexto(texto: string | null) {
  const textoLimpo = texto?.trim().replace(/\s+/g, " ");

  if (!textoLimpo) {
    return "Sem descrição informada";
  }

  return textoLimpo.length > 100
    ? `${textoLimpo.slice(0, 97)}...`
    : textoLimpo;
}

// Recebe cada chamada feita para a Edge Function.
Deno.serve(async (requisicao) => {
  // O navegador envia OPTIONS antes da chamada real para conferir a permissão.
  // Essa resposta técnica não consulta nem revela nenhum dado.
  if (requisicao.method === "OPTIONS") {
    return new Response("ok", { headers: cabecalhosCors });
  }

  // Esta função é somente de leitura e aceita apenas chamadas POST.
  if (requisicao.method !== "POST") {
    return responder({ erro: "Método não permitido." }, 405);
  }

  // O cabeçalho Authorization contém o crachá digital da sessão do médico.
  // Sem esse crachá, a função encerra antes de consultar o banco.
  const autorizacao = requisicao.headers.get("Authorization");

  if (!autorizacao?.startsWith("Bearer ")) {
    return responder({ erro: "Você precisa entrar no Endomapa para ver este resumo." }, 401);
  }

  // Estas duas informações já são fornecidas pelo próprio Supabase no servidor.
  // Não usamos service_role: a chave pública junto do crachá mantém a RLS ativa.
  const urlSupabase = Deno.env.get("SUPABASE_URL");
  const chavePublicaSupabase = Deno.env.get("SUPABASE_ANON_KEY");

  if (!urlSupabase || !chavePublicaSupabase) {
    return responder({ erro: "A função não encontrou a configuração interna do Supabase." }, 500);
  }

  // Cria o acesso ao banco repassando exatamente o crachá recebido.
  // Por isso, auth.uid() corresponde ao médico logado e a RLS mostra só os dados dele.
  const supabase = createClient(urlSupabase, chavePublicaSupabase, {
    global: {
      headers: { Authorization: autorizacao },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  // Confere se o crachá realmente pertence a um usuário válido.
  // verify_jwt também deve permanecer ligado no painel como primeira barreira.
  const { data: dadosUsuario, error: erroUsuario } = await supabase.auth.getUser();

  if (erroUsuario || !dadosUsuario.user) {
    return responder({ erro: "Sua sessão terminou. Entre novamente no Endomapa." }, 401);
  }

  // Define qual é a data de hoje no horário de Brasília.
  const fusoHorario = "America/Sao_Paulo";
  const agora = new Date();
  const dataConsulta = new Intl.DateTimeFormat("en-CA", {
    timeZone: fusoHorario,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);

  // Busca uma janela um pouco maior que um dia e depois filtra pela data local.
  // A consulta continua protegida pela RLS e nunca recebe um user_id vindo da tela.
  const inicioDaJanela = new Date(agora.getTime() - 36 * 60 * 60 * 1000).toISOString();
  const { data: mapasConsultados, error: erroMapas } = await supabase
    .from("mapas")
    .select("id, texto_bruto, vistas, status, criado_em")
    .gte("criado_em", inicioDaJanela)
    .lte("criado_em", agora.toISOString())
    .order("criado_em", { ascending: true });

  // Nunca informa sucesso se o Supabase devolveu um erro.
  if (erroMapas) {
    console.error("Falha ao consultar mapas:", erroMapas.message);
    return responder({ erro: "Não foi possível montar o resumo agora. Tente novamente." }, 500);
  }

  // Mantém somente os mapas que pertencem ao dia atual em São Paulo.
  const mapasDoDia = (mapasConsultados ?? []).filter((mapa) => {
    const dataDoMapa = new Intl.DateTimeFormat("en-CA", {
      timeZone: fusoHorario,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(mapa.criado_em));

    return dataDoMapa === dataConsulta;
  });

  // Conta as lesões somente dos mapas encontrados.
  // A tabela de lesões também usa o mesmo crachá e a própria regra de dono.
  const quantidadePorMapa = new Map<string, number>();

  if (mapasDoDia.length > 0) {
    const idsDosMapas = mapasDoDia.map((mapa) => mapa.id);
    const { data: lesoes, error: erroLesoes } = await supabase
      .from("lesoes")
      .select("mapa_id")
      .in("mapa_id", idsDosMapas);

    if (erroLesoes) {
      console.error("Falha ao consultar lesões:", erroLesoes.message);
      return responder({ erro: "Não foi possível contar as lesões do resumo. Tente novamente." }, 500);
    }

    for (const lesao of lesoes ?? []) {
      quantidadePorMapa.set(
        lesao.mapa_id,
        (quantidadePorMapa.get(lesao.mapa_id) ?? 0) + 1,
      );
    }
  }

  // Calcula os números do resumo usando apenas os mapas devolvidos pela consulta segura.
  const contadores = {
    "em revisão": 0,
    "aguardando confirmação": 0,
    confirmado: 0,
    "PDF gerado": 0,
  };

  for (const mapa of mapasDoDia) {
    if (mapa.status in contadores) {
      contadores[mapa.status as keyof typeof contadores] += 1;
    }
  }

  const totalLesoes = [...quantidadePorMapa.values()].reduce(
    (total, quantidade) => total + quantidade,
    0,
  );

  // Formata a data e os horários para leitura humana em português brasileiro.
  const dataFormatada = new Intl.DateTimeFormat("pt-BR", {
    timeZone: fusoHorario,
    dateStyle: "long",
  }).format(agora);

  const formatadorDeHora = new Intl.DateTimeFormat("pt-BR", {
    timeZone: fusoHorario,
    hour: "2-digit",
    minute: "2-digit",
  });

  // Monta a lista pronta para ser colada no WhatsApp, sem identificar pacientes.
  const linhasDosMapas = mapasDoDia.length === 0
    ? ["Nenhum mapa criado hoje."]
    : mapasDoDia.map((mapa, indice) => {
      const quantidadeLesoes = quantidadePorMapa.get(mapa.id) ?? 0;
      const palavraLesao = quantidadeLesoes === 1 ? "lesão" : "lesões";

      return `${indice + 1}. ${formatadorDeHora.format(new Date(mapa.criado_em))} — ${mapa.vistas} — ${mapa.status} — ${quantidadeLesoes} ${palavraLesao}\n   ${resumirTexto(mapa.texto_bruto)}`;
    });

  const resumo = [
    "*Resumo do dia — Endomapa*",
    dataFormatada,
    "",
    `Total de mapas: ${mapasDoDia.length}`,
    `Em revisão: ${contadores["em revisão"]}`,
    `Aguardando confirmação: ${contadores["aguardando confirmação"]}`,
    `Confirmados: ${contadores.confirmado}`,
    `PDF gerado: ${contadores["PDF gerado"]}`,
    `Total de lesões: ${totalLesoes}`,
    "",
    "*Mapas do dia*",
    ...linhasDosMapas,
  ].join("\n");

  // Devolve tanto o texto pronto quanto os números separados para uso futuro na tela.
  return responder({
    resumo,
    data: dataConsulta,
    totais: {
      mapas: mapasDoDia.length,
      lesoes: totalLesoes,
      em_revisao: contadores["em revisão"],
      aguardando_confirmacao: contadores["aguardando confirmação"],
      confirmados: contadores.confirmado,
      pdf_gerado: contadores["PDF gerado"],
    },
  });
});
