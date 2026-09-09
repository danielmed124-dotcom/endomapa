// Reintegra o recorte de contexto editado pela IA. Protótipo deste mapa específico.
(async function () {
  "use strict";
  const estado = document.getElementById("estado");
  const vistas = { cisto: [229, 724, 142, 161], ligamento: [350, 740, 170, 170], mapa: [0, 0, 1024, 1536] };
  function carregar(src) {
    return new Promise((resolve, reject) => {
      const imagem = new Image();
      imagem.onload = () => resolve(imagem);
      imagem.onerror = () => reject(new Error("Não foi possível carregar uma imagem."));
      imagem.src = src;
    });
  }
  function tela(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
  function exibirComparacao(original, proposta) {
    function exibir(vista) {
      const [x, y, w, h] = vistas[vista];
      for (const [id, fonte] of [["original", original], ["proposta", proposta]]) {
        const c = document.getElementById(id);
        c.width = w * (vista === "mapa" ? 1 : 4); c.height = h * (vista === "mapa" ? 1 : 4);
        const ctx = c.getContext("2d"); ctx.imageSmoothingQuality = "high";
        ctx.drawImage(fonte, x, y, w, h, 0, 0, c.width, c.height);
      }
      document.querySelectorAll("[data-vista]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.vista === vista)));
    }
    document.querySelectorAll("[data-vista]").forEach((b) => b.addEventListener("click", () => exibir(b.dataset.vista)));
    const vista = new URLSearchParams(location.search).get("vista");
    exibir(Object.hasOwn(vistas, vista) ? vista : "ligamento");
    estado.textContent = "Comparação pronta. A região do cisto é a mesma nas duas versões.";
  }
  function peso(x, y) {
    const dx = x - 432, dy = y - 819, angulo = -0.81;
    const u = dx * Math.cos(angulo) + dy * Math.sin(angulo);
    const v = -dx * Math.sin(angulo) + dy * Math.cos(angulo);
    const distancia = Math.hypot(u / 68, v / 28);
    const t = Math.max(0, Math.min(1, (1 - distancia) / 0.25));
    return t * t * (3 - 2 * t);
  }
  try {
    const anterior = await carregar("mapa-integrado-v2.png");
    if (!new URLSearchParams(location.search).has("montar")) {
      exibirComparacao(anterior, await carregar("mapa-integrado-v3.png")); return;
    }
    const recorte = await carregar("ligamento-juncao-v1.png");
    if (anterior.naturalWidth !== 1024 || anterior.naturalHeight !== 1536 || recorte.naturalWidth !== recorte.naturalHeight) throw new Error("Dimensões incompatíveis com o recorte deste mapa.");
    const proposta = tela(1024, 1536), ctx = proposta.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(anterior, 0, 0);
    const originais = ctx.getImageData(0, 0, 1024, 1536);
    const resultado = new ImageData(new Uint8ClampedArray(originais.data), 1024, 1536);
    const camada = tela(1024, 1536), cctx = camada.getContext("2d", { willReadFrequently: true });
    cctx.imageSmoothingQuality = "high";
    cctx.drawImage(recorte, 350, 740, 170, 170);
    const novos = cctx.getImageData(0, 0, 1024, 1536).data;
    let mudancas = 0, fora = 0, cisto = 0;
    for (let y = 0; y < 1536; y++) for (let x = 0; x < 1024; x++) {
      const i = (y * 1024 + x) * 4, p = peso(x + 0.5, y + 0.5);
      if (p > 0) for (let c = 0; c < 3; c++) resultado.data[i + c] = Math.round(originais.data[i + c] * (1 - p) + novos[i + c] * p);
      const mudou = [0, 1, 2, 3].some((c) => resultado.data[i + c] !== originais.data[i + c]);
      if (mudou) {
        mudancas++;
        if (p === 0) fora++;
        if (x >= 229 && x < 371 && y >= 724 && y < 885) cisto++;
      }
    }
    if (fora || cisto || !mudancas) throw new Error("A conferência da montagem falhou.");
    ctx.putImageData(resultado, 0, 0);
    exibirComparacao(anterior, proposta);
    const registro = document.createElement("pre"); registro.id = "verificacao";
    registro.textContent = JSON.stringify({ pixelsAlterados: mudancas, alteradosFora: fora, alteradosNoCisto: cisto });
    registro.style.whiteSpace = "pre-wrap"; document.body.append(registro);
    const arquivo = document.createElement("script"); arquivo.type = "application/json"; arquivo.id = "artefato-png";
    arquivo.textContent = JSON.stringify(proposta.toDataURL("image/png")); document.body.append(arquivo);
  } catch (erro) { estado.textContent = erro.message; estado.dataset.erro = "true"; }
})();
