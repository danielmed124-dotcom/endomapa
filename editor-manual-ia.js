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
  botoes.forEach((botao) => botao.addEventListener("click", () => gerar(botao.dataset.gerarRealista, botao)));

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
    mostrar(estado, `O ${nomeProvedor} está trabalhando sobre uma cópia. Isso pode levar até dois minutos.`, false);
    try {
      const composicao = await window.endomapaCapturarMapaManual();
      original.src = composicao;
      const funcoes = {
        gemini: "finalizar-mapa-manual-gemini",
        gpt: "finalizar-mapa-manual-gpt",
        "gpt-referencias": "finalizar-mapa-manual-gpt-referencias",
      };
      const tiposLesao = [...new Set([...document.querySelectorAll(".lesao-editavel")].map((item) => item.dataset.nome))];
      const funcao = funcoes[provedor];
      const { data, error } = await cliente.functions.invoke(funcao, {
        body: { composicao_base64: composicao.split(",")[1], tipos_lesao: tiposLesao },
      });
      if (error) throw new Error(await traduzirErro(error));
      if (!data?.imagem_base64 && !data?.imagem_url) throw new Error(`O ${nomeProvedor} terminou sem devolver uma imagem.`);
      const imagemRecebida = data.imagem_url || `data:${data.formato || (provedor === "gemini" ? "image/jpeg" : "image/webp")};base64,${data.imagem_base64}`;
      const comparacao = await compararImagens(composicao, imagemRecebida);
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
      const verificacao = comparacao.arquivosIdenticos
        ? "Alerta: a imagem recebida é exatamente igual à imagem enviada."
        : comparacao.diferencaVisual < 0.5
          ? `Alerta: o arquivo mudou, mas a diferença visual média foi de apenas ${formatarPercentual(comparacao.diferencaVisual)}%. As imagens são praticamente iguais.`
          : `Verificação concluída: a diferença visual média foi de ${formatarPercentual(comparacao.diferencaVisual)}%.`;
      mostrar(estado, `${verificacao} ${data.aviso || "Compare cuidadosamente as imagens."}`, comparacao.arquivosIdenticos || comparacao.diferencaVisual < 0.5);
      resultado.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (erro) {
      mostrar(estado, erro.message || "Não foi possível gerar a versão realista.", true);
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
    return "Não foi possível gerar a versão realista.";
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
    const bytes = await (await fetch(dataUrl)).arrayBuffer();
    const hash = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  function carregarImagem(src) {
    return new Promise((resolver, rejeitar) => {
      const imagem = new Image();
      if (src.startsWith("http")) imagem.crossOrigin = "anonymous";
      imagem.onload = () => resolver(imagem);
      imagem.onerror = () => rejeitar(new Error("Não foi possível comparar as imagens."));
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

  function formatarPercentual(valor) {
    return valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function mostrar(estado, texto, erro) {
    estado.textContent = texto;
    estado.hidden = false;
    estado.classList.toggle("mensagem-formulario--erro", erro);
  }
})();
