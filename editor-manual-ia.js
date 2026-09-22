(function () {
  "use strict";
  const botoes = document.querySelectorAll("[data-gerar-realista]");
  const resultado = document.querySelector("[data-resultado-realista]");
  const original = document.querySelector("[data-imagem-original]");
  const resultadoGemini = document.querySelector("[data-resultado-gemini]");
  const realista = document.querySelector("[data-imagem-realista]");
  const resultadoGpt = document.querySelector("[data-resultado-gpt]");
  const imagemGpt = document.querySelector("[data-imagem-gpt]");
  const resultadoGeminiDetalhe = document.querySelector("[data-resultado-gemini-detalhe]");
  const imagemGeminiDetalhe = document.querySelector("[data-imagem-gemini-detalhe]");
  const resultadoMioma = document.querySelector("[data-resultado-mioma]");
  const imagemMioma = document.querySelector("[data-imagem-mioma]");
  const resultadoGptReferencias = document.querySelector("[data-resultado-gpt-referencias]");
  const imagemGptReferencias = document.querySelector("[data-imagem-gpt-referencias]");
  const botaoPreviaMioma = document.querySelector("[data-previa-mioma]");
  const botaoGerarRegioes = document.querySelector("[data-gerar-regioes]");
  const botaoFinalRealista = document.querySelector("[data-gerar-final-realista]");
  const estadoFinalRealista = document.querySelector("[data-estado-final-realista]");
  const estadoRegioes = document.querySelector("[data-estado-regioes]");
  const botaoMapaApi = document.querySelector("[data-gerar-mapa-api]");
  const botaoPrepararTeste = document.querySelector("[data-preparar-teste-api]");
  const estadoMapaApi = document.querySelector("[data-estado-mapa-api]");
  botaoPreviaMioma?.addEventListener("click", gerarPreviaMioma);
  botaoGerarRegioes?.addEventListener("click", gerarAcabamentoAprovado);
  if (!window.supabase || !window.ENDOMAPA_SUPABASE) return;

  const cliente = window.supabase.createClient(
    window.ENDOMAPA_SUPABASE.projectUrl,
    window.ENDOMAPA_SUPABASE.publicAnonKey,
  );
  let preparacaoTeste = null;
  let geracaoFinalIniciada = false;
  let chamadaUnicaIniciada = false;
  let urlReferenciaAnterior = null;
  botaoPrepararTeste?.addEventListener("click", prepararTesteApi);
  botaoMapaApi?.addEventListener("click", gerarMapaApi);
  botaoFinalRealista?.addEventListener("click", gerarFinalRealista);

  function montarInventario(lesoes, imagem) {
    return lesoes.map((lesao) => {
      const dados = lesao.dataset;
      const escala = Number(dados.tamanho) / 100;
      return {
        nome: dados.nome, x: Number(dados.x), y: Number(dados.y), giro: Number(dados.giro || 0),
        largura: 13 * escala * Number(dados.eixoX) / 100,
        altura: imagem.naturalWidth / imagem.naturalHeight * 13 / Number(dados.proporcao || 1.8) * escala * Number(dados.eixoY) / 100,
      };
    });
  }

  async function chamarFuncaoUmaVez(body, sessao) {
    const url = `${window.ENDOMAPA_SUPABASE.projectUrl}/functions/v1/finalizar-mapa-manual-gpt`;
    const resposta = await fetch(url, { method: "POST", headers: {
      Authorization: `Bearer ${sessao.access_token}`,
      apikey: window.ENDOMAPA_SUPABASE.publicAnonKey,
      "Content-Type": "application/json",
    }, body: JSON.stringify(body) });
    const dados = await resposta.json().catch(() => null);
    return { resposta, dados };
  }

  async function prepararTesteApi() {
    if (botaoPrepararTeste.disabled || chamadaUnicaIniciada) return;
    const lesoes = [...document.querySelectorAll(".lesao-editavel")];
    if (!lesoes.length) return mostrar(estadoMapaApi, "Adicione pelo menos uma lesão ao mapa.", true);
    if (window.location.protocol === "file:") return mostrar(estadoMapaApi, "Abra o editor no site do Endomapa para preparar o teste.", true);
    botaoPrepararTeste.disabled = true;
    botaoMapaApi.disabled = true;
    preparacaoTeste = null;
    document.querySelector("[data-preparo-teste]").hidden = true;
    document.querySelector("[data-relato-suporte]").hidden = true;
    mostrar(estadoMapaApi, "Preparando as entradas e o prompt. Nenhuma imagem será gerada ou cobrada.", false);
    try {
      const { data: sessao, error: erroSessao } = await cliente.auth.getSession();
      if (erroSessao || !sessao?.session) throw new Error("Entre na sua conta do Endomapa antes de preparar o teste.");
      const assinatura = assinaturaMapa();
      const composicao = await window.endomapaCapturarMapaManual({ semRotulos: true });
      const imagem = await carregarImagem(composicao);
      const inventario = montarInventario(lesoes, imagem);
      const { resposta, dados } = await chamarFuncaoUmaVez({ composicao_base64: composicao.split(",")[1],
        modo_mapa_referencia: true, preparar_teste: true, inventario_lesoes: inventario }, sessao.session);
      if (!resposta.ok || !dados?.pronto) throw new Error(dados?.erro || "O servidor não concluiu a preparação gratuita.");
      if (assinatura !== assinaturaMapa()) throw new Error("O mapa mudou durante a preparação. Prepare novamente.");
      const respostaReferencia = await fetch(dados.imagem_2.url);
      if (!respostaReferencia.ok) throw new Error("A referência aprovada não pôde ser carregada no navegador.");
      const bytesReferencia = await respostaReferencia.arrayBuffer();
      const hashReferencia = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytesReferencia))]
        .map((byte) => byte.toString(16).padStart(2, "0")).join("");
      if (hashReferencia !== dados.imagem_2.sha256) throw new Error("A referência recebida no navegador difere da referência preparada no servidor.");
      const urlReferencia = URL.createObjectURL(new Blob([bytesReferencia], { type: "image/png" }));
      const referencia = await carregarImagem(urlReferencia);
      if (referencia.naturalWidth !== dados.imagem_2.largura || referencia.naturalHeight !== dados.imagem_2.altura) {
        throw new Error("As dimensões da referência não correspondem às verificadas pelo servidor.");
      }
      const { criarPreviaMascara } = await import("./mapa-composicao-protegida.js?v=teste-unico-1");
      document.querySelector("[data-entrada-mapa]").src = composicao;
      if (urlReferenciaAnterior) URL.revokeObjectURL(urlReferenciaAnterior);
      urlReferenciaAnterior = urlReferencia;
      document.querySelector("[data-entrada-referencia]").src = urlReferencia;
      document.querySelector("[data-mascara-teste]").src = criarPreviaMascara(inventario, imagem.naturalWidth, imagem.naturalHeight);
      document.querySelector("[data-dimensoes-mapa]").textContent = `Imagem 1 · mapa didático enviado · ${imagem.naturalWidth} × ${imagem.naturalHeight} px`;
      document.querySelector("[data-dimensoes-referencia]").textContent = `Imagem 2 · referência de estilo; não aprova cada lesão · ${referencia.naturalWidth} × ${referencia.naturalHeight} px`;
      document.querySelector("[data-prompt-teste]").textContent = dados.prompt_visual;
      document.querySelector("[data-configuracao-teste]").textContent = `Função ${dados.versao_funcao}; prompt ${dados.versao_prompt}; ${dados.modelo}; ${dados.endpoint}; moderation=${dados.parametros.moderation}; n=${dados.parametros.n}; size=${dados.parametros.size}; quality=${dados.parametros.quality}; output_format=${dados.parametros.output_format}. Tarifas publicadas: US$ 5 por milhão de tokens de texto de entrada, US$ 8 por milhão de tokens de imagem de entrada e US$ 30 por milhão de tokens de imagem de saída. O número de tokens desta edição não é conhecido antes da chamada; isto não é cobrança confirmada.`;
      document.querySelector("[data-diagnostico-teste]").textContent = JSON.stringify({
        estado: "preparado_sem_geracao", horario_utc: dados.horario_utc, operacao_preparacao: dados.operacao_id,
        versao_funcao: dados.versao_funcao, versao_prompt: dados.versao_prompt,
        mapa_sha256: dados.imagem_1.sha256, referencia_sha256: dados.imagem_2.sha256,
        prompt_sha256: dados.prompt_sha256, tentativas_envio_imagem: dados.tentativas_envio_imagem,
      }, null, 2);
      preparacaoTeste = { composicao, inventario, assinatura, ...dados };
      document.querySelector("[data-preparo-teste]").hidden = false;
      botaoMapaApi.disabled = false;
      document.querySelector("[data-preparo-teste]").scrollIntoView({ behavior: "smooth", block: "start" });
      mostrar(estadoMapaApi, "Preparação concluída sem geração paga. Confira as imagens, a máscara e o prompt antes de executar uma vez.", false);
    } catch (erro) {
      mostrar(estadoMapaApi, erro.message || "Não foi possível preparar o teste gratuito.", true);
    } finally { botaoPrepararTeste.disabled = false; }
  }

  async function gerarMapaApi() {
    if (botaoMapaApi.disabled || chamadaUnicaIniciada || !preparacaoTeste) return;
    if (preparacaoTeste.assinatura !== assinaturaMapa()) {
      botaoMapaApi.disabled = true;
      return mostrar(estadoMapaApi, "O mapa mudou depois da preparação. Prepare novamente antes de gerar.", true);
    }
    chamadaUnicaIniciada = true;
    botaoMapaApi.disabled = true;
    botaoPrepararTeste.disabled = true;
    const { data: sessao, error: erroSessao } = await cliente.auth.getSession();
    if (erroSessao || !sessao?.session) return mostrar(estadoMapaApi, "A sessão terminou. Nenhuma geração foi solicitada.", true);
    document.querySelector("[data-resultado-mapa-api]").hidden = true;
    document.querySelector("[data-imagem-mapa-api]").removeAttribute("src");
    document.querySelector("[data-resultado-proposta-api]").hidden = true;
    document.querySelector("[data-resultado-diferenca-api]").hidden = true;
    mostrar(estadoMapaApi, "Uma solicitação paga está em andamento. Não haverá nova chamada automática, mesmo se ocorrer timeout.", false);
    const preparo = preparacaoTeste;
    let tentativaIniciada = false;
    let diagnosticoAtual = null;
    let etapaCliente = "envio";
    try {
      tentativaIniciada = true;
      const { resposta, dados } = await chamarFuncaoUmaVez({
        composicao_base64: preparo.composicao.split(",")[1], modo_mapa_referencia: true,
        inventario_lesoes: preparo.inventario, mapa_sha256: preparo.imagem_1.sha256,
        referencia_sha256: preparo.imagem_2.sha256, prompt_sha256: preparo.prompt_sha256,
      }, sessao.session);
      const diagnostico = { estado: dados?.estado || (resposta.ok ? "resposta_recebida" : "falha_tecnica"),
        horario_utc: dados?.horario_utc || new Date().toISOString(), operacao_id: dados?.operacao_id || null,
        pedido_openai: dados?.pedido_id || null, modelo: preparo.modelo, endpoint: preparo.endpoint,
        parametros: preparo.parametros, versao_prompt: dados?.versao_prompt || preparo.versao_prompt,
        versao_funcao: dados?.versao_funcao || null, http_status_openai: dados?.http_status || null,
        error_type: dados?.error_type || null, error_code: dados?.error_code || null,
        tentativas_envio_imagem: dados?.tentativas_envio_imagem ?? "não confirmado",
        uso_informado_pela_api: dados?.uso || null,
      };
      if (dados?.detalhes_moderacao_recebidos) diagnostico.moderation_details = {
        moderation_stage: dados.etapa || "unknown", categories: dados.categorias || [],
      };
      if (diagnostico.estado === "bloqueado_provedor") {
        document.querySelector("[data-texto-relato-suporte]").textContent = [
          "Possível falso positivo em ilustração anatômica didática; classificação não confirmada como erro.",
          `Horário UTC: ${diagnostico.horario_utc}`,
          `Operação Endomapa: ${diagnostico.operacao_id || "não informado"}`,
          `Pedido OpenAI: ${diagnostico.pedido_openai || "não informado"}`,
          `Modelo: ${diagnostico.modelo}; endpoint: ${diagnostico.endpoint}; prompt: ${diagnostico.versao_prompt}`,
          `HTTP OpenAI: ${diagnostico.http_status_openai || "não informado"}; código: ${diagnostico.error_code || "não informado"}`,
          diagnostico.moderation_details ? `Detalhes de moderação: ${JSON.stringify(diagnostico.moderation_details)}` : "Detalhes de moderação: não retornados",
          `Tentativas de envio ao serviço de imagens: ${diagnostico.tentativas_envio_imagem}`,
        ].join("\n");
        document.querySelector("[data-relato-suporte]").hidden = false;
      }
      diagnosticoAtual = diagnostico;
      document.querySelector("[data-diagnostico-teste]").textContent = JSON.stringify(diagnostico, null, 2);
      if (!resposta.ok) throw new Error(dados?.erro || "Falha técnica sem diagnóstico retornado. Não repita a operação.");
      if (!dados?.imagem_base64) { diagnostico.estado = "resposta_sem_imagem"; throw new Error("O serviço respondeu sem imagem utilizável. Nenhuma nova chamada será feita."); }
      const recebida = `data:${dados.formato || "image/png"};base64,${dados.imagem_base64}`;
      etapaCliente = "decodificacao";
      await carregarImagem(recebida);
      if (preparo.assinatura !== assinaturaMapa()) throw new Error("O mapa mudou durante a geração. A proposta não foi aplicada ao mapa atual.");
      etapaCliente = "composicao";
      const { comporMapaProtegido } = await import("./mapa-composicao-protegida.js?v=teste-unico-1");
      const protegida = await comporMapaProtegido(preparo.composicao, recebida, preparo.inventario);
      original.src = preparo.composicao;
      document.querySelector("[data-imagem-mapa-api]").src = protegida.imagem;
      document.querySelector("[data-imagem-proposta-api]").src = recebida;
      document.querySelector("[data-dimensoes-proposta]").textContent = protegida.dimensoesGeradas;
      document.querySelector("[data-imagem-diferenca-api]").src = protegida.imagemDiferenca;
      document.querySelector("[data-baixar-diferenca-api]").href = protegida.imagemDiferenca;
      document.querySelector("[data-resultado-mapa-api]").hidden = false;
      document.querySelector("[data-resultado-proposta-api]").hidden = false;
      document.querySelector("[data-resultado-diferenca-api]").hidden = false;
      resultado.hidden = false;
      resultado.scrollIntoView({ behavior: "smooth", block: "start" });
      const avisos = [];
      if (!protegida.pixelsAlterados) avisos.push("A proposta não alterou a área das lesões.");
      if (protegida.alteradosFora) avisos.push("Foram detectados pixels alterados fora da máscara.");
      try { const ausentes = await conferirLesoesVisiveis(preparo.composicao, protegida.imagem);
        if (ausentes.length) avisos.push(`Possível ausência de: ${ausentes.join(", ")}.`);
      } catch (_erro) { avisos.push("A conferência de presença das lesões não foi concluída."); }
      diagnostico.estado = avisos.length ? "revisao_necessaria" : "imagem_recebida_revisao_medica";
      diagnostico.comparacao = { raster_original: "JPEG enviado, decodificado sem rótulos",
        dimensoes_originais: protegida.dimensoesOriginais, dimensoes_proposta: protegida.dimensoesGeradas,
        alinhamento: "proposta redimensionada ao raster original antes da comparação",
        pixels_alterados_dentro: protegida.alteradosDentro, pixels_alterados_fora: protegida.alteradosFora,
        pixels_proposta_bruta_dentro: protegida.mudancaBrutaDentro };
      document.querySelector("[data-diagnostico-teste]").textContent = JSON.stringify(diagnostico, null, 2);
      mostrar(estadoMapaApi, `${avisos.join(" ") || "Imagem recebida para revisão."} Fora da máscara: ${protegida.alteradosFora} pixels alterados; dentro: ${protegida.alteradosDentro}. A referência valida somente o estilo: lesões sem exemplo correspondente continuam pendentes de aprovação individual. Confira posição, forma e tamanho de cada lesão. Nenhuma outra geração será feita.`, avisos.length > 0);
    } catch (erro) {
      if (diagnosticoAtual && diagnosticoAtual.estado === "resposta_recebida") {
        diagnosticoAtual.estado = etapaCliente === "decodificacao" ? "imagem_recebida_falha_decodificacao" : "imagem_recebida_falha_composicao";
      }
      if (diagnosticoAtual) document.querySelector("[data-diagnostico-teste]").textContent = JSON.stringify(diagnosticoAtual, null, 2);
      if (tentativaIniciada && !document.querySelector("[data-diagnostico-teste]").textContent.includes('"operacao_id"')) {
        document.querySelector("[data-diagnostico-teste]").textContent = JSON.stringify({ estado: "resposta_nao_recebida", horario_utc: new Date().toISOString(), tentativas_no_navegador: 1,
          recebimento_pela_openai: "desconhecido", orientacao: "Não repetir automaticamente; conferir uso e registros do servidor." }, null, 2);
      }
      mostrar(estadoMapaApi, `${erro.message || "A resposta não foi recebida."} A montagem manual permanece no editor. Nenhuma nova chamada será feita automaticamente.`, true);
    }
  }

  async function gerarAcabamentoAprovado() {
    if (botaoGerarRegioes.disabled) return;
    botaoGerarRegioes.disabled = true;
    try {
      const lesoes = [...document.querySelectorAll(".lesao-editavel")];
      if (!lesoes.length) throw new Error("Adicione pelo menos uma lesão antes de gerar o mapa.");
      if (!window.EndomapaAcabamentoAprovado) throw new Error("O acabamento aprovado não carregou. Atualize a página e tente novamente.");
      mostrar(estadoRegioes, "Montando o mapa completo com os exemplos aprovados, sem chamada paga...", false);
      const assinatura = assinaturaMapa();
      const base = await window.endomapaCapturarMapaManual({ semLesoes: true, semRotulos: true });
      const proposta = await window.EndomapaAcabamentoAprovado.montar(base, lesoes);
      if (assinatura !== assinaturaMapa()) throw new Error("O mapa mudou durante a montagem. Gere novamente para manter as posições corretas.");
      const imagemFinal = await window.endomapaAdicionarRotulos(proposta.imagem);
      original.src = await window.endomapaCapturarMapaManual();
      document.querySelector("[data-imagem-regioes]").src = imagemFinal;
      document.querySelector("[data-legenda-regioes]").textContent = "Mapa com acabamento aprovado · revisão médica necessária";
      document.querySelector("[data-resultado-regioes]").hidden = false;
      document.querySelector("[data-resultado-final-realista]").hidden = true;
      document.querySelector("[data-imagem-final-realista]").removeAttribute("src");
      resultado.hidden = false;
      resultado.scrollIntoView({ behavior: "smooth", block: "start" });
      const aviso = proposta.semExemplo.length
        ? ` As categorias ${proposta.semExemplo.join(", ")} ainda não têm exemplo aprovado; nessas lesões foi mantida a imagem da biblioteca com sombra de contato.`
        : " Todos os tipos deste mapa têm exemplo visual no estudo aprovado.";
      mostrar(estadoRegioes, `Mapa completo pronto, sem uso da API de imagens.${aviso} Confira a posição, a quantidade e as medidas antes de usar.`, false);
    } catch (erro) {
      mostrar(estadoRegioes, erro.message || "Não foi possível montar o mapa.", true);
    } finally {
      botaoGerarRegioes.disabled = false;
    }
  }

  async function gerarFinalRealista() {
    if (geracaoFinalIniciada || botaoFinalRealista.disabled) return;
    if (!document.querySelector(".lesao-editavel")) {
      return mostrar(estadoFinalRealista, "Adicione pelo menos uma lesão ao mapa antes de gerar a versão realista.", true);
    }
    geracaoFinalIniciada = true;
    botaoFinalRealista.disabled = true;
    botaoFinalRealista.setAttribute("aria-busy", "true");
    botaoFinalRealista.textContent = "Gerando mapa realista…";
    const alternarControles = document.querySelector("[data-alternar-controles]");
    if (alternarControles?.getAttribute("aria-expanded") === "true") alternarControles.click();
    const areasEdicao = [...document.querySelectorAll(".biblioteca-lesoes, .editor-manual__area, [data-controles-lesao], .editor-manual__experimentos")]
      .map((elemento) => ({ elemento, inerte: elemento.inert }));
    areasEdicao.forEach(({ elemento }) => { elemento.inert = true; });
    const botaoLimpar = document.querySelector("[data-limpar-mapa]");
    const limparEstavaBloqueado = botaoLimpar?.disabled;
    if (botaoLimpar) botaoLimpar.disabled = true;
    const assinatura = assinaturaMapa();
    let envioPagoIniciado = false;
    mostrar(estadoFinalRealista, "Preparando a sua montagem manual para gerar o mapa realista…", false);
    try {
      const { data: sessao, error: erroSessao } = await cliente.auth.getSession();
      if (erroSessao || !sessao?.session) throw new Error("Entre na sua conta do Endomapa. Nenhuma geração foi solicitada.");

      // Envia as lesões montadas pelo médico, sem aplicar o acabamento dos estudos.
      // Nomes e medidas são desenhados pelo editor, sem pedir à IA para recriá-los.
      const composicao = await window.endomapaCapturarMapaManual({ semRotulos: true, formato: "image/png" });
      const montagemOriginal = await window.endomapaAdicionarRotulos(composicao);
      if (assinatura !== assinaturaMapa()) throw new Error("O mapa mudou durante a preparação. Clique novamente para enviar a montagem atual. Nenhuma geração foi solicitada.");
      const base64 = composicao.split(",")[1];
      const preflight = await chamarFuncaoUmaVez({ modo_edicao_direta: true, preparar_teste: true, composicao_base64: base64 }, sessao.session);
      if (!preflight.resposta.ok || !preflight.dados?.pronto) throw new Error(preflight.dados?.erro || "Não foi possível preparar a chamada. Nenhuma geração foi solicitada.");
      if (assinatura !== assinaturaMapa()) throw new Error("O mapa mudou antes do envio. Clique novamente para enviar a montagem atual. Nenhuma geração foi solicitada.");

      // A comparação usa a mesma captura enviada ao servidor, com os rótulos originais.
      original.src = montagemOriginal;
      resultado.querySelectorAll("[data-resultado-final-realista], [data-resultado-regioes], [data-resultado-gpt], [data-resultado-gemini], [data-resultado-mapa-api], [data-resultado-proposta-api], [data-resultado-diferenca-api], [data-resultado-gemini-detalhe], [data-resultado-mioma], [data-resultado-gpt-referencias], [data-comparacao-mioma-ampliada]")
        .forEach((painel) => { painel.hidden = true; });
      document.querySelector("[data-imagem-final-realista]").removeAttribute("src");
      resultado.hidden = false;
      mostrar(estadoFinalRealista, "Gerando o mapa realista a partir da sua montagem. Aguarde para editar novamente; esta geração é paga.", false);
      envioPagoIniciado = true;
      const { resposta, dados } = await chamarFuncaoUmaVez({ modo_edicao_direta: true, composicao_base64: base64,
        mapa_sha256: preflight.dados.imagem_1.sha256, prompt_sha256: preflight.dados.prompt_sha256 }, sessao.session);
      const suporte = dados?.pedido_id ? ` Pedido OpenAI: ${dados.pedido_id}.` : "";
      const operacao = dados?.operacao_id ? ` Operação Endomapa: ${dados.operacao_id}.` : "";
      if (!resposta.ok) throw new Error((dados?.erro || "Falha técnica na geração.") + operacao + suporte);
      if (!dados?.imagem_base64) throw new Error("A OpenAI respondeu sem imagem utilizável." + operacao + suporte);
      const recebida = `data:image/png;base64,${dados.imagem_base64}`;
      await carregarImagem(recebida);
      if (assinatura !== assinaturaMapa()) throw new Error("O mapa mudou durante a geração. A proposta não foi aplicada à montagem atual." + operacao);
      const imagemFinal = await window.endomapaAdicionarRotulos(recebida);
      await carregarImagem(imagemFinal);
      if (assinatura !== assinaturaMapa()) throw new Error("O mapa mudou durante a preparação do resultado. A proposta não foi aplicada à montagem atual." + operacao);
      document.querySelector("[data-imagem-final-realista]").src = imagemFinal;
      document.querySelector("[data-resultado-final-realista]").hidden = false;
      resultado.hidden = false;
      resultado.scrollIntoView({ behavior: "smooth", block: "start" });
      mostrar(estadoFinalRealista, "Mapa realista pronto para revisão. Compare as lesões e a anatomia com sua montagem manual. Um novo clique solicita outra geração paga.", false);
    } catch (erro) {
      const aviso = envioPagoIniciado
        ? " A montagem manual foi preservada. Não haverá repetição automática; um novo clique poderá gerar outra cobrança."
        : " A montagem manual foi preservada.";
      mostrar(estadoFinalRealista, (erro.message || "A geração não foi concluída.") + aviso, true);
    } finally {
      areasEdicao.forEach(({ elemento, inerte }) => { elemento.inert = inerte; });
      if (botaoLimpar) botaoLimpar.disabled = limparEstavaBloqueado;
      geracaoFinalIniciada = false;
      botaoFinalRealista.disabled = false;
      botaoFinalRealista.removeAttribute("aria-busy");
      botaoFinalRealista.textContent = "Gerar mapa realista · pago";
    }
  }

  function assinaturaMapa() {
    return JSON.stringify([...document.querySelectorAll(".lesao-editavel")].map((lesao) => ({ ...lesao.dataset })));
  }

  const gerando = { gemini: false, gpt: false, "gpt-referencias": false, detalhe: false };
  const tentativasSemMudanca = new WeakSet();
  const botaoConexao = document.querySelector("[data-verificar-conexao-gpt]");
  const botaoDetalhe = document.querySelector("[data-gerar-detalhe-gemini]");
  botaoConexao?.addEventListener("click", verificarConexaoGPT);
  botaoDetalhe?.addEventListener("click", gerarDetalhe);
  botoes.forEach((botao) => botao.addEventListener("click", () => gerar(botao.dataset.gerarRealista, botao)));

  async function verificarConexaoGPT() {
    if (botaoConexao.disabled) return;
    const estado = document.querySelector("[data-estado-conexao-gpt]");
    botaoConexao.disabled = true;
    let etapa = "login";
    mostrar(estado, "Verificando login, chave da OpenAI e acesso ao modelo. Nenhuma imagem será gerada.", false);
    try {
      if (window.location.protocol === "file:") {
        mostrar(estado, "Abra o editor no site do Endomapa para verificar a conexão.", true);
        return;
      }
      if (navigator.onLine === false) {
        mostrar(estado, "O navegador está sem conexão com a internet. Nenhuma geração foi solicitada.", true);
        return;
      }
      const { data, error } = await cliente.auth.getSession();
      if (error) throw error;
      if (!data?.session) {
        mostrar(estado, "Não há uma sessão conectada. Entre no Endomapa em outra aba e volte aqui para verificar novamente, mantendo sua montagem aberta.", true);
        return;
      }
      etapa = "servidor";
      const resposta = await cliente.functions.invoke("finalizar-mapa-manual-gpt", {
        body: { verificar_conexao: true }, timeout: 20000,
      });
      if (resposta.error) throw resposta.error;
      if (resposta.data?.conexao_ok !== true || resposta.data?.modelo !== "gpt-image-2.5-sunburst") {
        mostrar(estado, "O servidor respondeu, mas não confirmou o acesso ao modelo de imagens da OpenAI. Nenhuma geração foi solicitada.", true);
        return;
      }
      const pedido = /^req_[a-zA-Z0-9_-]{1,180}$/.test(resposta.data.pedido_id || "") ? ` Pedido OpenAI: ${resposta.data.pedido_id}.` : "";
      mostrar(estado, `Login, servidor do Endomapa, chave da OpenAI e acesso ao modelo gpt-image-2.5-sunburst confirmados.${pedido} Nenhuma imagem foi gerada. Este teste não confirma que uma imagem específica será aceita.`, false);
    } catch (erro) {
      let detalhe;
      try { detalhe = (await erro.context?.json())?.erro; } catch (_erro) {}
      const status = erro.context?.status;
      if (!detalhe && status === 401) detalhe = "Sua sessão não foi aceita. Entre no Endomapa em outra aba e volte para verificar novamente.";
      if (!detalhe && status === 403) detalhe = "O acesso foi recusado. Confirme que o editor foi aberto no endereço endomapa.pages.dev.";
      if (!detalhe) detalhe = etapa === "login"
        ? "Não foi possível consultar seu login neste navegador."
        : "O navegador não recebeu uma resposta legível do servidor. Isso pode envolver a rede, extensões, proteção do navegador ou indisponibilidade do serviço.";
      mostrar(estado, `${detalhe} Nenhuma geração foi solicitada por esta verificação.`, true);
    } finally {
      botaoConexao.disabled = false;
    }
  }

  async function gerar(provedor, botao) {
    if (!["gemini", "gpt", "gpt-referencias"].includes(provedor) || gerando[provedor]) return;
    const estado = document.querySelector(`[data-estado-realista="${provedor}"]`);
    const nomeProvedor = provedor === "gemini" ? "Gemini" : provedor === "gpt" ? "GPT Sunburst" : "GPT com referências";
    if (!document.querySelector(".lesao-editavel")) {
      mostrar(estado, "Adicione pelo menos uma lesão antes de gerar a versão realista.", true);
      return;
    }
    if (window.location.protocol === "file:") {
      mostrar(estado, "A geração com IA funciona somente na página publicada e com sua conta conectada. O editor local continua disponível para montagem.", true);
      return;
    }
    const { data: sessao } = await cliente.auth.getSession();
    if (!sessao.session) {
      mostrar(estado, "Entre na sua conta do Endomapa antes de usar a geração com IA.", true);
      return;
    }
    gerando[provedor] = true;
    botao.disabled = true;
    botao.textContent = `Gerando com ${nomeProvedor}...`;
    if (provedor === "gpt") resultadoGpt.hidden = true;
    if (provedor === "gpt-referencias") resultadoGptReferencias.hidden = true;
    mostrar(estado, `O ${nomeProvedor} está trabalhando sobre uma cópia. Isso pode levar até dois minutos.`, false);
    const funcoes = {
      gemini: "finalizar-mapa-manual-gemini",
      gpt: "finalizar-mapa-manual-gpt",
      "gpt-referencias": "finalizar-mapa-manual-gpt-referencias",
    };
    const funcao = funcoes[provedor];
    try {
      const composicao = await window.endomapaCapturarMapaManual();
      original.src = composicao;
      const tiposLesao = [...new Set([...document.querySelectorAll(".lesao-editavel")].map((item) => item.dataset.nome))];
      const { data, error } = await cliente.functions.invoke(funcao, {
        body: { composicao_base64: composicao.split(",")[1], tipos_lesao: tiposLesao },
      });
      if (error) throw new Error(await traduzirErro(error));
      if (!data?.imagem_base64 && !data?.imagem_url) throw new Error(`O ${nomeProvedor} terminou sem devolver uma imagem.`);
      const imagemRecebida = data.imagem_url || `data:${data.formato || (provedor === "gemini" ? "image/jpeg" : "image/webp")};base64,${data.imagem_base64}`;
      const identificador = provedor !== "gemini" && /^req_[a-zA-Z0-9_-]{1,180}$/.test(data.pedido_id || "")
        ? ` Pedido OpenAI: ${data.pedido_id}.` : "";
      await carregarImagem(imagemRecebida);
      if (provedor !== "gemini") {
        const apagadas = await conferirLesoesVisiveis(composicao, imagemRecebida);
        if (apagadas.length) throw new Error(`O GPT apagou ou enfraqueceu ${apagadas.join(", ")}. A prévia foi recusada; sua montagem manual permanece no editor.${identificador}`);
      }
      if (provedor === "gpt-referencias") {
        imagemGptReferencias.src = imagemRecebida;
        resultadoGptReferencias.hidden = false;
      } else if (provedor === "gpt") {
        imagemGpt.src = imagemRecebida;
        resultadoGpt.hidden = false;
      } else {
        realista.src = imagemRecebida;
        resultadoGemini.hidden = false;
      }
      resultado.hidden = false;
      resultado.scrollIntoView({ behavior: "smooth", block: "start" });
      let comparacao;
      try {
        comparacao = await compararImagens(composicao, imagemRecebida);
      } catch (_erroComparacao) {
        mostrar(estado, `A imagem foi recebida e está disponível abaixo, mas a comparação automática falhou. Confira visualmente as lesões, a anatomia e as medidas.${identificador}`, true);
        return;
      }
      const verificacao = comparacao.arquivosIdenticos
        ? "Alerta: a imagem recebida é exatamente igual à imagem enviada."
        : comparacao.diferencaVisual < 0.5
          ? `Alerta: o arquivo mudou, mas a diferença visual média foi de apenas ${formatarPercentual(comparacao.diferencaVisual)}%. As imagens são praticamente iguais.`
          : `A diferença visual média foi de ${formatarPercentual(comparacao.diferencaVisual)}%. Esse número não confirma a fidelidade das lesões.`;
      mostrar(estado, `${verificacao} ${data.aviso || "Compare cuidadosamente as imagens."}${identificador}`, comparacao.arquivosIdenticos || comparacao.diferencaVisual < 0.5);
    } catch (erro) {
      const diagnostico = provedor === "gemini" && erro.message === "Failed to fetch"
        ? await consultarDiagnosticoGemini(funcao)
        : null;
      if (diagnostico?.imagemUrl) {
        exibirResultadoGeminiRecuperado(diagnostico.imagemUrl, diagnostico.mensagem);
      } else {
        mostrar(estado, diagnostico?.mensagem || await traduzirErro(erro), true);
      }
    } finally {
      gerando[provedor] = false;
      botao.disabled = false;
      botao.textContent = `Gerar outra versão com ${nomeProvedor}`;
    }
  }

  async function traduzirErro(erro) {
    try {
      const corpo = await erro.context?.json();
      if (corpo?.erro) {
        const pedido = /^req_[a-zA-Z0-9_-]{1,180}$/.test(corpo.pedido_id || "") && !corpo.erro.includes(corpo.pedido_id)
          ? ` Pedido OpenAI: ${corpo.pedido_id}.` : "";
        const operacao = /^[a-f0-9-]{36}$/i.test(corpo.operacao_id || "")
          ? ` Operação Endomapa: ${corpo.operacao_id}.` : "";
        return `${corpo.erro}${pedido}${operacao}`;
      }
    } catch (_erro) {}
    if (erro.name === "FunctionsFetchError" || /Failed to fetch|Failed to send a request|NetworkError|Load failed/i.test(erro.message || "")) {
      return "A conexão foi interrompida antes de receber a imagem. Não foi possível confirmar se a geração terminou no servidor.";
    }
    if (erro.name === "FunctionsHttpError" || erro.name === "FunctionsRelayError") {
      return "O servidor não conseguiu concluir o pedido de imagem. Tente novamente mais tarde.";
    }
    return erro.message || "Não foi possível gerar a versão realista.";
  }

  async function consultarDiagnosticoGemini(funcao) {
    try {
      const { data } = await cliente.functions.invoke(funcao, { body: { consultar_diagnostico: true } });
      const mensagens = {
        pedido_enviado_ao_gemini: "A conexão caiu enquanto o Gemini processava a imagem.",
        resposta_recebida_do_gemini: "O Gemini respondeu, mas a conexão caiu antes de o servidor ler a imagem.",
        imagem_encontrada_na_resposta: "O Gemini gerou a imagem, mas a conexão caiu antes do armazenamento.",
        imagem_armazenada: "A imagem foi armazenada, mas a conexão caiu antes de criar o endereço temporário.",
        concluida: "A geração foi concluída no servidor, mas a conexão caiu antes de chegar ao navegador.",
      };
      return {
        mensagem: mensagens[data?.diagnostico?.etapa] || "A conexão com a função Gemini foi interrompida sem concluir o diagnóstico.",
        imagemUrl: data?.imagem_url || null,
      };
    } catch (_erro) {
      return { mensagem: "A conexão com o Supabase foi interrompida e o diagnóstico também não pôde ser consultado.", imagemUrl: null };
    }
  }

  function exibirResultadoGeminiRecuperado(imagemUrl, mensagem) {
    const estado = document.querySelector('[data-estado-realista="gemini"]');
    resultadoGemini.hidden = true;
    realista.onload = () => {
      resultadoGemini.hidden = false;
      resultado.hidden = false;
      mostrar(estado, mensagem, false);
    };
    realista.onerror = () => {
      resultadoGemini.hidden = true;
      mostrar(estado, "A imagem foi gerada e armazenada, mas não pôde ser carregada no navegador.", true);
    };
    realista.src = imagemUrl;
  }

  async function compararImagens(originalDataUrl, recebidaDataUrl) {
    const [originalHash, recebidaHash, imagemOriginal, imagemRecebida] = await Promise.all([
      calcularHash(originalDataUrl),
      calcularHash(recebidaDataUrl),
      carregarImagem(originalDataUrl),
      carregarImagem(recebidaDataUrl),
    ]);
    const largura = 256;
    const altura = 340;
    const pixelsOriginal = obterPixels(imagemOriginal, largura, altura);
    const pixelsRecebidos = obterPixels(imagemRecebida, largura, altura);
    let diferencaTotal = 0;
    for (let indice = 0; indice < pixelsOriginal.length; indice += 4) {
      diferencaTotal += Math.abs(pixelsOriginal[indice] - pixelsRecebidos[indice]);
      diferencaTotal += Math.abs(pixelsOriginal[indice + 1] - pixelsRecebidos[indice + 1]);
      diferencaTotal += Math.abs(pixelsOriginal[indice + 2] - pixelsRecebidos[indice + 2]);
    }
    return {
      arquivosIdenticos: originalHash === recebidaHash,
      diferencaVisual: diferencaTotal / (largura * altura * 3 * 255) * 100,
    };
  }

  async function calcularHash(dataUrl) {
    let bytes;
    if (dataUrl.startsWith("data:")) {
      // A imagem já está na memória. fetch(data:) é bloqueado pela proteção da página.
      const separador = dataUrl.indexOf(",");
      if (separador < 0 || !dataUrl.slice(0, separador).endsWith(";base64")) {
        throw new Error("A imagem não está no formato esperado para comparação.");
      }
      bytes = Uint8Array.from(atob(dataUrl.slice(separador + 1)), (caractere) => caractere.charCodeAt(0));
    } else {
      const resposta = await fetch(dataUrl);
      if (!resposta.ok) throw new Error("Não foi possível ler a imagem para comparação.");
      bytes = await resposta.arrayBuffer();
    }
    const hash = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  function carregarImagem(src) {
    return new Promise((resolver, rejeitar) => {
      const imagem = new Image();
      if (src.startsWith("http")) imagem.crossOrigin = "anonymous";
      imagem.onload = () => resolver(imagem);
      imagem.onerror = () => rejeitar(new Error("A imagem não pôde ser carregada no navegador."));
      imagem.src = src;
    });
  }

  function obterPixels(imagem, largura, altura) {
    const canvas = document.createElement("canvas");
    canvas.width = largura;
    canvas.height = altura;
    const contexto = canvas.getContext("2d");
    contexto.drawImage(imagem, 0, 0, largura, altura);
    return contexto.getImageData(0, 0, largura, altura).data;
  }

  async function gerarPreviaMioma() {
    const estado = document.querySelector("[data-estado-previa-mioma]");
    const lesao = document.querySelector(".lesao-editavel--selecionada");
    if (!lesao?.dataset.nome.startsWith("Mioma")) {
      mostrar(estado, "Selecione um mioma no mapa para comparar a integração gratuita.", true);
      return;
    }
    botaoPreviaMioma.disabled = true;
    mostrar(estado, "Preparando as duas imagens no navegador, sem chamar a API.", false);
    try {
      const composicao = await window.endomapaCapturarMapaManual();
      const integrada = await window.endomapaCapturarMapaManual({ miomaIntegradoId: lesao.dataset.id });
      const [antesAmpliado, depoisAmpliado] = await Promise.all([
        ampliarMioma(composicao, lesao), ampliarMioma(integrada, lesao),
      ]);
      original.src = composicao;
      imagemMioma.src = integrada;
      document.querySelector("[data-mioma-antes-ampliado]").src = antesAmpliado;
      document.querySelector("[data-mioma-depois-ampliado]").src = depoisAmpliado;
      document.querySelector("[data-comparacao-mioma-ampliada]").hidden = false;
      resultadoMioma.hidden = false;
      resultado.hidden = false;
      const alternarControles = document.querySelector("[data-alternar-controles]");
      if (alternarControles?.getAttribute("aria-expanded") === "true") alternarControles.click();
      document.querySelector("[data-comparacao-mioma-ampliada]").scrollIntoView({ behavior: "smooth", block: "start" });
      mostrar(estado, "Prévia gratuita pronta. Compare a borda do mioma e o tecido adjacente. A lesão não foi redesenhada e sua montagem manual permanece no editor.", false);
    } catch (erro) {
      mostrar(estado, erro.message || "Não foi possível montar a prévia gratuita.", true);
    } finally {
      botaoPreviaMioma.disabled = false;
    }
  }

  async function ampliarMioma(src, lesao) {
    const imagem = await carregarImagem(src);
    const x = imagem.naturalWidth * Number(lesao.dataset.x) / 100;
    const y = imagem.naturalHeight * Number(lesao.dataset.y) / 100;
    const largura = imagem.naturalWidth * 0.13 * Number(lesao.dataset.tamanho) / 100 * Number(lesao.dataset.eixoX) / 100;
    const altura = imagem.naturalWidth * 0.13 / Number(lesao.dataset.proporcao || 1.8) * Number(lesao.dataset.tamanho) / 100 * Number(lesao.dataset.eixoY) / 100;
    const lado = Math.min(Math.max(150, Math.max(largura, altura) * 2.4), imagem.naturalWidth, imagem.naturalHeight);
    const esquerda = Math.min(Math.max(0, x - lado / 2), imagem.naturalWidth - lado);
    const topo = Math.min(Math.max(0, y - lado / 2), imagem.naturalHeight - lado);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 420;
    canvas.getContext("2d").drawImage(imagem, esquerda, topo, lado, lado, 0, 0, 420, 420);
    return canvas.toDataURL("image/png");
  }

  async function gerarDetalhe() {
    const estado = document.querySelector("[data-estado-detalhe-gemini]");
    const lesao = document.querySelector(".lesao-editavel--selecionada");
    if (!lesao) {
      mostrar(estado, "Selecione uma lesão no mapa antes de testar a integração local.", true);
      return;
    }
    if (tentativasSemMudanca.has(lesao)) {
      mostrar(estado, "O último teste desta lesão quase não mudou a imagem. Para evitar outra cobrança pelo mesmo resultado, não repetiremos a geração nesta sessão. Você pode continuar ajustando o mapa manualmente.", true);
      return;
    }
    if (gerando.detalhe) return;
    if (window.location.protocol === "file:") {
      mostrar(estado, "Abra o editor publicado e entre na sua conta para testar esta opção.", true);
      return;
    }
    const { data: sessao } = await cliente.auth.getSession();
    if (!sessao?.session) {
      mostrar(estado, "Entre na sua conta do Endomapa antes de gerar a imagem.", true);
      return;
    }
    gerando.detalhe = true;
    botaoDetalhe.disabled = true;
    botaoDetalhe.textContent = "Refinando a lesão selecionada...";
    resultadoGeminiDetalhe.hidden = true;
    mostrar(estado, "Ampliando a lesão selecionada para o Gemini. Esta geração usa uma chamada paga.", false);
    try {
      const composicao = await window.endomapaCapturarMapaManual();
      const { prepararRecorte, recomporRecorte } = await import("./detalhe-local.js");
      const { imagem, regiao } = await prepararRecorte(composicao, lesao);
      const { data, error } = await cliente.functions.invoke("finalizar-mapa-manual-gemini", {
        body: { composicao_base64: imagem.split(",")[1], modo_detalhe: true },
      });
      if (error) throw new Error(await traduzirErro(error));
      if (!data?.imagem_base64) throw new Error("O Gemini terminou sem devolver o detalhe da lesão.");
      const detalhe = `data:${data.formato || "image/png"};base64,${data.imagem_base64}`;
      const comparacaoLocal = await compararImagens(imagem, detalhe);
      if (comparacaoLocal.diferencaVisual < 1) {
        tentativasSemMudanca.add(lesao);
        throw new Error(`O Gemini devolveu uma imagem quase igual ao recorte enviado (diferença média de ${formatarPercentual(comparacaoLocal.diferencaVisual)}%). A prévia foi recusada e outra tentativa nesta lesão foi bloqueada nesta sessão para evitar nova cobrança.`);
      }
      const imagemFinal = await recomporRecorte(composicao, detalhe, regiao);
      const apagadas = await conferirLesoesVisiveis(composicao, imagemFinal);
      if (apagadas.length) throw new Error(`O Gemini apagou ou enfraqueceu ${apagadas.join(", ")}. A prévia local foi recusada.`);
      original.src = composicao;
      imagemGeminiDetalhe.src = imagemFinal;
      resultadoGeminiDetalhe.hidden = false;
      resultado.hidden = false;
      resultado.scrollIntoView({ behavior: "smooth", block: "start" });
      mostrar(estado, `O Gemini alterou ${formatarPercentual(comparacaoLocal.diferencaVisual)}% do recorte ampliado, em média. A prévia inclui a lesão e o tecido de contato; confira contorno, conteúdo e tamanho. Esse número não confirma realismo nem fidelidade clínica.`, false);
    } catch (erro) {
      mostrar(estado, await traduzirErro(erro), true);
    } finally {
      gerando.detalhe = false;
      botaoDetalhe.disabled = false;
      botaoDetalhe.textContent = "Testar 1 lesão com Gemini · cobra 1 imagem";
    }
  }

  async function conferirLesoesVisiveis(composicao, gerada) {
    const lesoes = [...document.querySelectorAll(".lesao-editavel")].filter((item) => item.querySelector("img"));
    if (!lesoes.length) return [];
    const { lesaoDesapareceu } = await import("./presenca-lesoes.js");
    const largura = 384, altura = 512;
    const [imagemOriginal, imagemGerada, imagemBase] = await Promise.all([
      carregarImagem(composicao), carregarImagem(gerada), carregarImagem("assets/mapa-base-coronal.png"),
    ]);
    const original = obterPixels(imagemOriginal, largura, altura);
    const resultado = obterPixels(imagemGerada, largura, altura);
    const base = obterPixels(imagemBase, largura, altura);
    const canvas = document.createElement("canvas");
    canvas.width = largura;
    canvas.height = altura;
    const contexto = canvas.getContext("2d");
    const apagadas = [];
    for (const lesao of lesoes) {
      const dados = lesao.dataset;
      const imagem = await carregarImagem(lesao.querySelector("img").src);
      const escala = Number(dados.tamanho) / 100;
      const larguraLesao = largura * 0.13 * escala * Number(dados.eixoX) / 100;
      const alturaLesao = largura * 0.13 / Number(dados.proporcao || 1.8) * escala * Number(dados.eixoY) / 100;
      contexto.clearRect(0, 0, largura, altura);
      contexto.save();
      contexto.translate(largura * Number(dados.x) / 100, altura * Number(dados.y) / 100);
      contexto.rotate(Number(dados.giro) * Math.PI / 180);
      if (dados.semRecorte !== "true") {
        contexto.beginPath();
        contexto.ellipse(0, 0, larguraLesao / 2, alturaLesao / 2, 0, 0, Math.PI * 2);
        contexto.clip();
      }
      contexto.drawImage(imagem, -larguraLesao / 2, -alturaLesao / 2, larguraLesao, alturaLesao);
      contexto.restore();
      const mascara = contexto.getImageData(0, 0, largura, altura).data;
      if (lesaoDesapareceu(original, base, resultado, mascara)) apagadas.push(dados.nome || "uma lesão");
    }
    return [...new Set(apagadas)];
  }

  function formatarPercentual(valor) {
    return valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function mostrar(estado, texto, erro) {
    estado.textContent = texto;
    estado.hidden = false;
    estado.classList.toggle("mensagem-formulario--erro", erro);
  }
})();
