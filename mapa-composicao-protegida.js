// Máscara de aplicação final: alfa 1 no centro de cada lesão e transição
// somente dentro da elipse autorizada. A Images API não recebe esta máscara.
export function misturarPixelsProtegidos(originais, gerados, largura, altura, regioes) {
  if (originais.length !== gerados.length || originais.length !== largura * altura * 4) throw new Error("As imagens precisam ter as mesmas dimensões.");
  const saida = new Uint8ClampedArray(originais);
  let alterados = 0;
  for (let y = 0; y < altura; y++) for (let x = 0; x < largura; x++) {
    let alfa = 0;
    for (const regiao of regioes) {
      const dx = x - regiao.x, dy = y - regiao.y;
      const cosseno = Math.cos(regiao.giro || 0), seno = Math.sin(regiao.giro || 0);
      const distancia = Math.hypot((dx * cosseno + dy * seno) / regiao.raioX, (-dx * seno + dy * cosseno) / regiao.raioY);
      if (distancia >= 1) continue;
      alfa = Math.max(alfa, distancia <= 0.8 ? 1 : (1 - distancia) / 0.2);
    }
    if (alfa <= 0) continue;
    const indice = (y * largura + x) * 4;
    for (let canal = 0; canal < 3; canal++) saida[indice + canal] = Math.round(originais[indice + canal] * (1 - alfa) + gerados[indice + canal] * alfa);
    if (saida[indice] !== originais[indice] || saida[indice + 1] !== originais[indice + 1] || saida[indice + 2] !== originais[indice + 2]) alterados++;
  }
  return { pixels: saida, alterados };
}

export async function comporMapaProtegido(originalUrl, geradaUrl, inventario) {
  const carregar = (src) => new Promise((resolver, rejeitar) => {
    const imagem = new Image(); imagem.onload = () => resolver(imagem);
    imagem.onerror = () => rejeitar(new Error("A imagem não pôde ser decodificada.")); imagem.src = src;
  });
  const [original, gerada] = await Promise.all([carregar(originalUrl), carregar(geradaUrl)]);
  const largura = original.naturalWidth, altura = original.naturalHeight;
  const canvas = document.createElement("canvas"); canvas.width = largura; canvas.height = altura;
  const contexto = canvas.getContext("2d", { willReadFrequently: true });
  contexto.drawImage(original, 0, 0);
  const pixelsOriginais = contexto.getImageData(0, 0, largura, altura);
  contexto.clearRect(0, 0, largura, altura);
  contexto.drawImage(gerada, 0, 0, largura, altura);
  const pixelsGerados = contexto.getImageData(0, 0, largura, altura);
  const regioes = inventario.map((item) => ({
    x: largura * item.x / 100, y: altura * item.y / 100,
    raioX: Math.max(12, largura * item.largura / 200 * 1.5),
    raioY: Math.max(12, altura * item.altura / 200 * 1.5),
    giro: (item.giro || 0) * Math.PI / 180,
  }));
  const resultado = misturarPixelsProtegidos(pixelsOriginais.data, pixelsGerados.data, largura, altura, regioes);
  pixelsOriginais.data.set(resultado.pixels);
  contexto.putImageData(pixelsOriginais, 0, 0);
  return { imagem: canvas.toDataURL("image/png"), pixelsAlterados: resultado.alterados };
}
