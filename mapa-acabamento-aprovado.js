// Montagem local com aparência já aprovada. Não faz chamadas à API.
(function () {
  "use strict";
  const REFERENCIA = "/output/estudos-realismo/mapa-realista-completo-estudo-v1.png";
  const EXEMPLOS = [
    { nome: /adenomiose 1|endometriose isolada|endometriose retrocervical/i, caixa: [602, 548, 90, 90], escala: 1.18, mascara: "escura" },
    { nome: /^mioma/i, caixa: [558, 410, 98, 98], escala: 1.02, mascara: "oval" },
    { nome: /cisto hemorrágico/i, caixa: [263, 704, 111, 111], escala: 1.08, mascara: "oval" },
    { nome: /endometrioma|teratoma|^cisto$/i, caixa: [727, 709, 111, 111], escala: 1.08, mascara: "oval" },
  ];

  function abrir(src) {
    return new Promise((resolver, rejeitar) => {
      const imagem = new Image();
      imagem.onload = () => resolver(imagem);
      imagem.onerror = () => rejeitar(new Error("Não foi possível abrir a aparência aprovada ou uma lesão."));
      imagem.src = src;
    });
  }

  function tamanhoDaLesao(dados, larguraMapa) {
    const escala = Number(dados.tamanho) / 100;
    return {
      largura: larguraMapa * 0.13 * escala * Number(dados.eixoX) / 100,
      altura: larguraMapa * 0.13 / Number(dados.proporcao || 1.8) * escala * Number(dados.eixoY) / 100,
    };
  }

  function recorteAprovado(aprovado, base, exemplo, corAlvo) {
    const [x, y, largura, altura] = exemplo.caixa;
    const tela = document.createElement("canvas");
    tela.width = largura;
    tela.height = altura;
    const contexto = tela.getContext("2d", { willReadFrequently: true });
    contexto.drawImage(aprovado, x, y, largura, altura, 0, 0, largura, altura);
    const pixels = contexto.getImageData(0, 0, largura, altura);
    const amostra = document.createElement("canvas");
    amostra.width = largura;
    amostra.height = altura;
    const contextoBase = amostra.getContext("2d", { willReadFrequently: true });
    contextoBase.drawImage(base, x, y, largura, altura, 0, 0, largura, altura);
    const basePixels = contextoBase.getImageData(0, 0, largura, altura).data;
    const meio = ((Math.floor(altura / 2) * largura + Math.floor(largura / 2)) * 4);
    const desvio = [0, 1, 2].map((canal) => Math.max(-28, Math.min(28, corAlvo[canal] - basePixels[meio + canal])));
    for (let py = 0; py < altura; py++) {
      for (let px = 0; px < largura; px++) {
        const indice = (py * largura + px) * 4;
        const dx = (px - largura / 2) / (largura * 0.47);
        const dy = (py - altura / 2) / (altura * 0.47);
        const distancia = Math.hypot(dx, dy);
        const transicao = Math.max(0, Math.min(1, (1 - distancia) / 0.2));
        let peso = transicao * transicao * (3 - 2 * transicao);
        if (exemplo.mascara === "escura") {
          const verde = pixels.data[indice + 1];
          const azul = pixels.data[indice + 2];
          const pigmento = Math.max(0, Math.min(1, (120 - Math.max(verde, azul)) / 35));
          peso *= pigmento;
        }
        pixels.data[indice + 3] = Math.round(255 * peso);
        for (let canal = 0; canal < 3; canal++) {
          pixels.data[indice + canal] = Math.max(0, Math.min(255, pixels.data[indice + canal] + desvio[canal]));
        }
      }
    }
    contexto.putImageData(pixels, 0, 0);
    return tela;
  }

  function desenharOriginal(contexto, imagem, dados, largura, altura) {
    const sombra = Math.max(4, largura * 0.08);
    contexto.shadowColor = "rgba(66, 26, 29, 0.52)";
    contexto.shadowBlur = sombra;
    contexto.shadowOffsetY = Math.max(2, altura * 0.035);
    contexto.drawImage(imagem, -largura / 2, -altura / 2, largura, altura);
    contexto.shadowColor = "transparent";
    contexto.shadowBlur = 0;
    contexto.shadowOffsetY = 0;
    contexto.drawImage(imagem, -largura / 2, -altura / 2, largura, altura);
  }

  async function montar(baseDataUrl, lesoes) {
    const [base, aprovado] = await Promise.all([abrir(baseDataUrl), abrir(REFERENCIA)]);
    if (base.naturalWidth !== aprovado.naturalWidth || base.naturalHeight !== aprovado.naturalHeight) {
      throw new Error("A base e a aparência aprovada têm dimensões diferentes.");
    }
    const tela = document.createElement("canvas");
    tela.width = base.naturalWidth;
    tela.height = base.naturalHeight;
    const contexto = tela.getContext("2d", { willReadFrequently: true });
    contexto.drawImage(base, 0, 0);
    const semExemplo = [];
    for (const lesao of lesoes) {
      const dados = lesao.dataset;
      const { largura, altura } = tamanhoDaLesao(dados, tela.width);
      const x = tela.width * Number(dados.x) / 100;
      const y = tela.height * Number(dados.y) / 100;
      const exemplo = EXEMPLOS.find((item) => item.nome.test(dados.nome || ""));
      contexto.save();
      contexto.translate(x, y);
      contexto.rotate(Number(dados.giro) * Math.PI / 180);
      if (exemplo && !/^DIU\b/i.test(dados.nome || "")) {
        const corMapa = contexto.getImageData(Math.round(x), Math.round(y), 1, 1).data;
        const recorte = recorteAprovado(aprovado, base, exemplo, corMapa);
        const proporcao = exemplo.caixa[3] / exemplo.caixa[2];
        const destinoLargura = largura * exemplo.escala;
        const destinoAltura = destinoLargura * proporcao;
        contexto.drawImage(recorte, -destinoLargura / 2, -destinoAltura / 2, destinoLargura, destinoAltura);
      } else {
        const imagem = await abrir(lesao.querySelector("img").src);
        desenharOriginal(contexto, imagem, dados, largura, altura);
        if (!/^DIU\b/i.test(dados.nome || "")) semExemplo.push(dados.nome || "Lesão");
      }
      contexto.restore();
    }
    return { imagem: tela.toDataURL("image/png"), semExemplo: [...new Set(semExemplo)] };
  }

  window.EndomapaAcabamentoAprovado = { montar };
})();
