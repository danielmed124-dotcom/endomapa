(function () {
  "use strict";
  const botoes = document.querySelectorAll("[data-gerar-realista]");
  const resultado = document.querySelector("[data-resultado-realista]");
  const original = document.querySelector("[data-imagem-original]");
  const resultadoGemini = document.querySelector("[data-resultado-gemini]");
  const realista = document.querySelector("[data-imagem-realista]");
  const resultadoGpt = document.querySelector("[data-resultado-gpt]");
  const imagemGpt = document.querySelector("[data-imagem-gpt]");
  const resultadoGptReferencias = document.querySelector("[data-resultado-gpt-referencias]");
  const imagemGptReferencias = document.querySelector("[data-imagem-gpt-referencias]");
  if (!botoes.length || !window.supabase || !window.ENDOMAPA_SUPABASE) return;

  const cliente = window.supabase.createClient(
    window.ENDOMAPA_SUPABASE.projectUrl,
    window.ENDOMAPA_SUPABASE.publicAnonKey,
  );
  const gerando = { gemini: false, gpt: false, "gpt-referencias": false };
  const botaoConexao = document.querySelector("[data-verificar-conexao-gpt]");
  botaoConexao?.addEventListener("click", verificarConexaoGPT);
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
      if (resposta.data?.conexao_ok !== true || resposta.data?.modelo !== "gpt-image-2") {
        mostrar(estado, "O servidor respondeu, mas não confirmou o acesso ao modelo de imagens da OpenAI. Nenhuma geração foi solicitada.", true);
        return;
      }
      const pedido = /^req_[a-zA-Z0-9_-]{1,180}$/.test(resposta.data.pedido_id || "") ? ` Pedido OpenAI: ${resposta.data.pedido_id}.` : "";
      mostrar(estado, `Login, servidor do Endomapa, chave da OpenAI e acesso ao modelo gpt-image-2 confirmados.${pedido} Nenhuma imagem foi gerada. Este teste não confirma que uma imagem específica será aceita.`, false);
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
    const nomeProvedor = provedor === "gemini" ? "Gemini" : provedor === "gpt" ? "GPT" : "GPT com referências";
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
      if (corpo?.erro) return corpo.erro;
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
