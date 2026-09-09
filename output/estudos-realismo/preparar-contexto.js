(async function () {
  "use strict";
  try {
    const imagem = new Image();
    await new Promise((resolve, reject) => { imagem.onload = resolve; imagem.onerror = reject; imagem.src = "mapa-integrado-v2.png"; });
    const canvas = document.getElementById("recorte");
    canvas.width = 1020;
    canvas.height = 1020;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(imagem, 350, 740, 170, 170, 0, 0, 1020, 1020);
    const registro = document.createElement("script");
    registro.type = "application/json";
    registro.id = "artefato-png";
    registro.textContent = JSON.stringify(canvas.toDataURL("image/png"));
    document.body.append(registro);
    document.getElementById("estado").textContent = "Recorte pronto: mesma região do mapa, ampliada seis vezes.";
  } catch (_erro) { document.getElementById("estado").textContent = "Não foi possível preparar o recorte."; }
})();
