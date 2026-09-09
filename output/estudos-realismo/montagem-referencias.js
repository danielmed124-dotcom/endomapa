// Protótipo específico para o mapa enviado. Usa os arquivos de IA aprovados,
// incluindo a junção com o tecido. Não detecta lesões nem calcula medidas clínicas.
(async function () {
  "use strict";
  const estado = document.getElementById("estado");
  const vistas = { cisto: [229, 724, 142, 161], ligamento: [360, 750, 140, 153], mapa: [0, 0, 1024, 1536] };
  const regioes = [
    { nome: "cisto", arquivo: "cisto-integracao-v1.png", cx: 294, cy: 798, rx: 45, ry: 55, angulo: 0, sx: 346, sy: 721, escalaX: 6.5, escalaY: 5.85 },
    { nome: "ligamento", arquivo: "ligamento-integracao-v1.png", cx: 432, cy: 819, rx: 63, ry: 17, angulo: -0.81, sx: 627, sy: 627, escalaX: 12.9, escalaY: 12.1 },
  ];
  function carregar(src) {
    return new Promise((resolve, reject) => {
      const imagem = new Image();
      imagem.onload = () => resolve(imagem);
      imagem.onerror = () => reject(new Error("Não foi possível carregar uma imagem da comparação."));
      imagem.src = src;
    });
  }
  function tela(largura, altura) {
    const canvas = document.createElement("canvas");
    canvas.width = largura;
    canvas.height = altura;
    return canvas;
  }
  function suave(valor) { const t = Math.max(0, Math.min(1, valor)); return t * t * (3 - 2 * t); }
  function pesoRegiao(x, y, regiao) {
    const dx = x - regiao.cx;
    const dy = y - regiao.cy;
    const u = dx * Math.cos(regiao.angulo) + dy * Math.sin(regiao.angulo);
    const v = -dx * Math.sin(regiao.angulo) + dy * Math.cos(regiao.angulo);
    const distancia = Math.hypot(u / regiao.rx, v / regiao.ry);
    // A transição fica no tecido, fora da borda da lesão, para não apagar sua base.
    return suave((1 - distancia) / (regiao.nome === "ligamento" ? 0.35 : 0.23));
  }
  function comparar(original, proposta) {
    function exibir(vista) {
      const [x, y, largura, altura] = vistas[vista];
      for (const [id, fonte] of [["original", original], ["proposta", proposta]]) {
        const canvas = document.getElementById(id);
        canvas.width = largura * (vista === "mapa" ? 1 : 4);
        canvas.height = altura * (vista === "mapa" ? 1 : 4);
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(fonte, x, y, largura, altura, 0, 0, canvas.width, canvas.height);
      }
      document.querySelectorAll("[data-vista]").forEach((botao) => botao.setAttribute("aria-pressed", String(botao.dataset.vista === vista)));
    }
    document.querySelectorAll("[data-vista]").forEach((botao) => botao.addEventListener("click", () => exibir(botao.dataset.vista)));
    const vista = new URLSearchParams(location.search).get("vista");
    exibir(Object.hasOwn(vistas, vista) ? vista : "cisto");
    estado.textContent = "Comparação pronta. Observe a junção da lesão com o tecido ao redor.";
    return exibir;
  }
  try {
    const original = await carregar("mapa-original.webp");
    if (!new URLSearchParams(location.search).has("montar")) {
      comparar(original, await carregar("mapa-integrado-v2.png"));
      return;
    }
    if (original.naturalWidth !== 1024 || original.naturalHeight !== 1536) throw new Error("Este protótipo espera o mapa original de 1024 × 1536.");
    const imagens = await Promise.all(regioes.map((regiao) => carregar(regiao.arquivo)));
    const proposta = tela(1024, 1536);
    const ctx = proposta.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(original, 0, 0);
    const originalPixels = ctx.getImageData(0, 0, 1024, 1536);
    const pixels = new ImageData(new Uint8ClampedArray(originalPixels.data), 1024, 1536);
    const cobertura = new Uint8Array(1024 * 1536);
    const alterados = {};
    for (let indice = 0; indice < regioes.length; indice++) {
      const regiao = regioes[indice];
      const imagem = imagens[indice];
      const camada = tela(1024, 1536);
      const contexto = camada.getContext("2d", { willReadFrequently: true });
      contexto.imageSmoothingQuality = "high";
      contexto.drawImage(imagem,
        regiao.cx - regiao.sx / regiao.escalaX,
        regiao.cy - regiao.sy / regiao.escalaY,
        imagem.naturalWidth / regiao.escalaX,
        imagem.naturalHeight / regiao.escalaY);
      const amostra = contexto.getImageData(0, 0, 1024, 1536).data;
      // Retira o desenho escuro antigo antes de inserir o estudo aprovado.
      // Sem isso, projeções do recorte antigo permanecem ao lado da nova lesão.
      if (regiao.nome === "ligamento") {
        const areaRemocao = { ...regiao, ry: 25 };
        const xmin = 388, xmax = 482, ymin = 770, ymax = 878;
        const visitados = new Set();
        const fragmentos = new Set();
        const escuro = (p) => originalPixels.data[p * 4] < 110 && originalPixels.data[p * 4 + 1] < 65;
        // Sombras que continuam além da caixa não são partes do recorte antigo.
        for (let yy = ymin; yy <= ymax; yy++) for (let xx = xmin; xx <= xmax; xx++) {
          const inicio = yy * 1024 + xx;
          if (visitados.has(inicio) || !escuro(inicio)) continue;
          const grupo = [inicio];
          visitados.add(inicio);
          let tocaBorda = false;
          for (let q = 0; q < grupo.length; q++) {
            const p = grupo[q], px = p % 1024, py = Math.floor(p / 1024);
            if (px === xmin || px === xmax || py === ymin || py === ymax) tocaBorda = true;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
              const nx = px + dx, ny = py + dy, np = ny * 1024 + nx;
              if (nx < xmin || nx > xmax || ny < ymin || ny > ymax || visitados.has(np) || !escuro(np)) continue;
              visitados.add(np);
              grupo.push(np);
            }
          }
          if (!tocaBorda) grupo.forEach((p) => fragmentos.add(p));
        }
        for (let y = 776; y < 868; y++) for (let x = 391; x < 477; x++) {
          const i = (y * 1024 + x) * 4;
          if (!fragmentos.has(y * 1024 + x) || !pesoRegiao(x + 0.5, y + 0.5, areaRemocao)) continue;
          const vizinhos = [];
          for (const lado of [-1, 1]) {
            for (let passo = 5; passo <= 26; passo++) {
              const nx = Math.round(x + lado * passo * 0.724);
              const ny = Math.round(y + lado * passo * 0.69);
              const j = (ny * 1024 + nx) * 4;
              if (originalPixels.data[j] > 150 && originalPixels.data[j + 1] > 75) {
                vizinhos.push([originalPixels.data[j], originalPixels.data[j + 1], originalPixels.data[j + 2]]);
                break;
              }
            }
          }
          if (vizinhos.length) {
            for (let c = 0; c < 3; c++) pixels.data[i + c] = Math.round(vizinhos.reduce((soma, v) => soma + v[c], 0) / vizinhos.length);
            cobertura[y * 1024 + x] = 1;
          }
        }
      }
      // Equilibra somente a cor do tecido periférico. A textura vem da referência,
      // e os tons escuros da lesão permanecem os do estudo aprovado.
      const diferencas = [0, 0, 0];
      let quantidade = 0;
      for (let y = 740; y < 900; y++) for (let x = 235; x < 495; x++) {
        const peso = pesoRegiao(x + 0.5, y + 0.5, regiao);
        const i = (y * 1024 + x) * 4;
        if (peso > 0.05 && peso < 0.65 && amostra[i + 3] > 250 && amostra[i] > 175 && amostra[i + 1] > amostra[i] * 0.58 && originalPixels.data[i] > 150) {
          for (let c = 0; c < 3; c++) diferencas[c] += originalPixels.data[i + c] - amostra[i + c];
          quantidade++;
        }
      }
      const ajuste = diferencas.map((v) => quantidade ? Math.max(-35, Math.min(35, v / quantidade)) : 0);
      alterados[regiao.nome] = 0;
      for (let y = 730; y < 910; y++) for (let x = 235; x < 500; x++) {
        const i = (y * 1024 + x) * 4;
        let peso = pesoRegiao(x + 0.5, y + 0.5, regiao) * amostra[i + 3] / 255;
        if (!peso) continue;
        // Não transfere o fundo branco externo das referências para dentro do mapa.
        const branco = Math.min(amostra[i], amostra[i + 1], amostra[i + 2]);
        if (branco > 245) continue;
        if (regiao.nome === "ligamento") {
          let margem = 4;
          for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
            const j = ((y + dy) * 1024 + x + dx) * 4;
            if (amostra[j + 3] < 250 || Math.min(amostra[j], amostra[j + 1], amostra[j + 2]) > 245) margem = Math.min(margem, Math.hypot(dx, dy));
          }
          peso *= suave(margem / 4);
        }
        const tecido = suave((amostra[i + 1] / Math.max(1, amostra[i]) - 0.48) / 0.22) * suave((amostra[i] - 145) / 55);
        for (let c = 0; c < 3; c++) pixels.data[i + c] = Math.round(pixels.data[i + c] * (1 - peso) + Math.max(0, Math.min(255, amostra[i + c] + ajuste[c] * tecido)) * peso);
        cobertura[y * 1024 + x] = 1;
        if ([0, 1, 2].some((c) => pixels.data[i + c] !== originalPixels.data[i + c])) alterados[regiao.nome]++;
      }
    }
    let foraAlterados = 0;
    for (let p = 0; p < cobertura.length; p++) if (!cobertura[p]) {
      if ([0, 1, 2, 3].some((c) => pixels.data[p * 4 + c] !== originalPixels.data[p * 4 + c])) foraAlterados++;
    }
    if (foraAlterados || !alterados.cisto || !alterados.ligamento) throw new Error("Falha na conferência das regiões da montagem.");
    ctx.putImageData(pixels, 0, 0);
    const exibir = comparar(original, proposta);
    const verificacao = { foraAlterados, alterados, largura: 1024, altura: 1536, origem: "Estudos aprovados, incluindo tecido adjacente" };
    window.endomapaEstudoV2 = { proposta, verificacao, exibir };
    const registro = document.createElement("pre");
    registro.id = "verificacao";
    registro.textContent = JSON.stringify(verificacao);
    document.body.append(registro);
    const artefato = document.createElement("script");
    artefato.type = "application/json";
    artefato.id = "artefato-png";
    artefato.textContent = JSON.stringify(proposta.toDataURL("image/png"));
    document.body.append(artefato);
  } catch (erro) { estado.textContent = erro.message; estado.dataset.erro = "true"; }
})();
