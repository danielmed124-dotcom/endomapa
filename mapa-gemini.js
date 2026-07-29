(function () {
  "use strict";
  const supabase = window.endomapaSupabase;
  const botao = document.querySelector("[data-gerar-mapa-gemini]");
  const estado = document.querySelector("[data-estado-mapa-gemini]");
  const resultado = document.querySelector("[data-resultado-mapa-gemini]");
  const imagem = document.querySelector("[data-imagem-mapa-gemini]");
  const medida = document.querySelector("[data-medida-mapa-gemini]");
  if (!supabase || !botao || !estado || !resultado || !imagem || !medida) return;

  let mapaId = null;
  let lesao = null;
  let carregando = false;

  window.addEventListener("endomapa:lesoes-confirmadas", function (evento) {
    mapaId = evento.detail?.mapaId || null;
    const lesoes = Array.isArray(evento.detail?.lesoes) ? evento.detail.lesoes : [];
    lesao = lesoes.find((item) => item.categoria === "endometriose" && item.localizacao === "ligamento uterossacro" &&
      ["esquerdo", "direito"].includes(item.lado) && typeof item.medida_1 === "number" && typeof item.medida_2 === "number") || null;
    botao.disabled = !lesao;
    resultado.hidden = true;
    medida.hidden = true;
    mostrar(lesao ? "Gemini pronto para uma comparação com os mesmos dados." : "Este teste exige endometriose no ligamento uterossacro.", !lesao);
  });

  botao.addEventListener("click", async function () {
    if (carregando || !mapaId || !lesao) return;
    carregando = true;
    botao.disabled = true;
    botao.textContent = "Gerando com Gemini...";
    resultado.hidden = true;
    mostrar("O Gemini está criando a alternativa. Aguarde sem fechar a tela...", false);
    try {
      const mascara = await criarMascara(lesao);
      const { data, error } = await supabase.functions.invoke("gerar-mapa-gemini", {
        body: { mapa_id: mapaId, categoria: lesao.categoria, localizacao: lesao.localizacao, lado: lesao.lado,
          medida_1: lesao.medida_1, medida_2: lesao.medida_2, mascara_base64: mascara },
      });
      if (error) { mostrar(await traduzir(error), true); liberar(); return; }
      if (!data?.imagem_base64) { mostrar("O Gemini terminou sem devolver uma imagem.", true); liberar(); return; }
      imagem.src = `data:${data.formato || "image/png"};base64,${data.imagem_base64}`;
      posicionarMedida();
      resultado.hidden = false;
      mostrar(data.aviso || "Confira a prévia Gemini.", false);
      carregando = false;
      botao.disabled = false;
      botao.textContent = "Gerar outra com Gemini";
      resultado.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (_erro) { mostrar("A comunicação com o Gemini falhou. Tente novamente mais tarde.", true); liberar(); }
  });

  async function criarMascara(item) {
    const base = await carregarImagem("assets/mapa-base-coronal.png");
    const canvas = document.createElement("canvas");
    canvas.width = base.naturalWidth; canvas.height = base.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Na vista coronal, esquerda da paciente fica à direita visual e vice-versa.
    const direitaVisual = item.lado === "esquerdo";
    const x = canvas.width * (direitaVisual ? 0.57 : 0.43); const y = canvas.height * 0.54;
    const proporcao = Math.max(1, Math.min(5, item.medida_1 / item.medida_2));
    const largura = Math.max(canvas.width * 0.075, Math.min(canvas.width * 0.15, canvas.width * (0.065 + item.medida_1 * 0.035)));
    const altura = Math.max(canvas.height * 0.025, Math.min(canvas.height * 0.06, largura / proporcao));
    ctx.save(); ctx.translate(x, y); ctx.rotate((direitaVisual ? 38 : -38) * Math.PI / 180);
    ctx.clearRect(-largura / 2, -altura / 2, largura, altura); ctx.restore();
    return canvas.toDataURL("image/png").split(",")[1];
  }

  function carregarImagem(src) { return new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = src; }); }
  function posicionarMedida() {
    const valores = [lesao.medida_1, lesao.medida_2, lesao.medida_3].filter((v) => typeof v === "number" && v > 0)
      .map((v) => v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 }));
    medida.textContent = `${valores.join(" × ")} cm`; medida.style.left = lesao.lado === "esquerdo" ? "57%" : "43%";
    medida.style.top = "59%"; medida.hidden = false;
  }
  async function traduzir(error) { try { const corpo = await error.context?.json(); if (corpo?.erro) return corpo.erro; } catch (_erro) {} return "O Gemini não conseguiu gerar a imagem."; }
  function mostrar(texto, erro) { estado.textContent = texto; estado.hidden = false; estado.classList.toggle("mensagem-formulario--erro", erro); }
  function liberar() { carregando = false; botao.disabled = false; botao.textContent = "Tentar novamente com Gemini"; }
})();
