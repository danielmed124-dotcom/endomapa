(function () {
  "use strict";
  const $ = (seletor) => document.querySelector(seletor);
  const arquivo = $("[data-arquivo]");
  const preparar = $("[data-preparar]");
  const gerar = $("[data-gerar]");
  const estado = $("[data-estado]");
  const diagnostico = $("[data-diagnostico]");
  const cliente = window.supabase.createClient(window.ENDOMAPA_SUPABASE.projectUrl, window.ENDOMAPA_SUPABASE.publicAnonKey);
  let preparo = null;
  let chamadaIniciada = false;
  arquivo.addEventListener("change", () => { preparo = null; gerar.disabled = true; $("[data-preparo]").hidden = true; });
  const escrever = (dados) => { diagnostico.textContent = JSON.stringify(dados, null, 2); };
  async function sessaoAtual() {
    const { data, error } = await cliente.auth.getSession();
    if (error || !data?.session) throw new Error("Entre na sua conta do Endomapa no editor e volte a esta página.");
    return data.session;
  }
  async function chamar(corpo, sessao) {
    const resposta = await fetch(window.ENDOMAPA_SUPABASE.projectUrl + "/functions/v1/finalizar-mapa-manual-gpt", {
      method: "POST", headers: { Authorization: "Bearer " + sessao.access_token,
        apikey: window.ENDOMAPA_SUPABASE.publicAnonKey, "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    });
    return { resposta, dados: await resposta.json().catch(() => null) };
  }
  preparar.addEventListener("click", async () => {
    if (preparar.disabled || chamadaIniciada) return;
    const selecionado = arquivo.files?.[0];
    if (!selecionado || selecionado.type !== "image/png" || selecionado.size > 5_000_000) {
      estado.textContent = "Selecione o PNG do mapa gerado, com até 5 MB."; return;
    }
    preparar.disabled = true; gerar.disabled = true; preparo = null;
    $("[data-resultado]").hidden = true;
    estado.textContent = "Preparando sem geração paga...";
    try {
      const sessao = await sessaoAtual();
      const dataUrl = await new Promise((resolver, rejeitar) => {
        const leitor = new FileReader(); leitor.onload = () => resolver(leitor.result);
        leitor.onerror = () => rejeitar(new Error("Não foi possível ler o arquivo.")); leitor.readAsDataURL(selecionado);
      });
      const imagem = new Image(); imagem.src = dataUrl;
      await imagem.decode();
      if (imagem.naturalWidth !== 1086 || imagem.naturalHeight !== 1448) throw new Error("Este teste espera o mapa enviado, de 1086 × 1448 pixels.");
      const base64 = dataUrl.split(",")[1];
      const { resposta, dados } = await chamar({ modo_edicao_direta: true, preparar_teste: true, composicao_base64: base64 }, sessao);
      if (!resposta.ok || !dados?.pronto) throw new Error(dados?.erro || "O servidor não preparou o teste.");
      $("[data-entrada]").src = dataUrl;
      $("[data-dimensoes]").textContent = "Imagem única · " + imagem.naturalWidth + " × " + imagem.naturalHeight + " px";
      $("[data-prompt]").textContent = dados.prompt_visual;
      $("[data-configuracao]").textContent = dados.modelo + "; " + dados.endpoint + "; moderation=" + dados.parametros.moderation +
        "; n=" + dados.parametros.n + "; size=" + dados.parametros.size + "; quality=" + dados.parametros.quality +
        "; output_format=" + dados.parametros.output_format + ". Sem máscara ou segunda imagem.";
      preparo = { base64, dataUrl, nome: selecionado.name, tamanho: selecionado.size,
        mapa_sha256: dados.imagem_1.sha256, prompt_sha256: dados.prompt_sha256,
        modelo: dados.modelo, endpoint: dados.endpoint, parametros: dados.parametros, versao_prompt: dados.versao_prompt };
      escrever({ estado: "preparado_sem_geracao", horario_utc: dados.horario_utc, operacao_id: dados.operacao_id,
        versao_funcao: dados.versao_funcao, versao_prompt: dados.versao_prompt,
        mapa_sha256: dados.imagem_1.sha256, prompt_sha256: dados.prompt_sha256, tentativas_envio_imagem: 0 });
      $("[data-preparo]").hidden = false; gerar.disabled = false;
      estado.textContent = "Confira a imagem e o prompt. A geração só ocorrerá ao clicar no botão pago.";
    } catch (erro) { estado.textContent = erro.message || "Falha técnica na preparação."; }
    finally { preparar.disabled = false; }
  });
  gerar.addEventListener("click", async () => {
    if (chamadaIniciada || gerar.disabled || !preparo) return;
    chamadaIniciada = true; gerar.disabled = true; preparar.disabled = true; arquivo.disabled = true;
    $("[data-resultado]").hidden = true;
    estado.textContent = "Uma chamada paga em andamento. Não haverá repetição automática.";
    const atual = preparo;
    try {
      const sessao = await sessaoAtual();
      const { resposta, dados } = await chamar({ modo_edicao_direta: true, composicao_base64: atual.base64,
        mapa_sha256: atual.mapa_sha256, prompt_sha256: atual.prompt_sha256 }, sessao);
      const registro = { estado: dados?.estado || (resposta.ok ? "resposta_recebida" : "falha_tecnica"),
        horario_utc: dados?.horario_utc || new Date().toISOString(), operacao_id: dados?.operacao_id || null,
        pedido_openai: dados?.pedido_id || null, modelo: atual.modelo, endpoint: atual.endpoint,
        parametros: atual.parametros, versao_prompt: dados?.versao_prompt || atual.versao_prompt,
        versao_funcao: dados?.versao_funcao || null, http_status_openai: dados?.http_status || null,
        error_type: dados?.error_type || null, error_code: dados?.error_code || null,
        tentativas_envio_imagem: dados?.tentativas_envio_imagem ?? "não confirmado", uso: dados?.uso || null };
      if (dados?.detalhes_moderacao_recebidos) registro.moderation_details = {
        moderation_stage: dados.etapa || "unknown", categories: dados.categorias || [] };
      escrever(registro);
      if (!resposta.ok) throw new Error(dados?.erro || "Falha técnica. Não repita a chamada.");
      if (!dados?.imagem_base64) throw new Error("A API respondeu sem imagem utilizável. Não repita a chamada.");
      const url = "data:image/png;base64," + dados.imagem_base64;
      const gerada = new Image(); gerada.src = url; await gerada.decode();
      $("[data-original]").src = atual.dataUrl;
      $("[data-gerada]").src = url;
      $("[data-download]").href = url;
      $("[data-resultado]").hidden = false;
      registro.estado = "imagem_recebida_revisao_medica"; registro.dimensoes_proposta = gerada.naturalWidth + "x" + gerada.naturalHeight;
      escrever(registro);
      estado.textContent = "Imagem recebida. Compare todas as lesões; a proposta ainda não está aprovada. Nenhuma outra chamada será feita.";
    } catch (erro) { estado.textContent = (erro.message || "Falha técnica ou resultado incerto.") + " Nenhuma nova chamada será feita automaticamente."; }
  });
})();
