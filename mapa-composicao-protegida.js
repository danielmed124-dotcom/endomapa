// Máscara de aplicação final: alfa 1 no centro de cada lesão e transição
// somente dentro da elipse autorizada. A Images API não recebe esta máscara.
export function misturarPixelsProtegidos(originais, gerados, largura, altura, regioes) {
  if (originais.length !== gerados.length || originais.length !== largura * altura * 4) throw new Error("As imagens precisam ter as mesmas dimensões.");
  const saida = new Uint8ClampedArray(originais);
  let alterados = 0;
  for (let y = 0; y < altura; y++) for (let x = 0; x < largura; x++) {
    const alfa = alfaNaRegiao(x, y, regioes);
    if (alfa <= 0) continue;
    const indice = (y * largura + x) * 4;
    for (let canal = 0; canal < 3; canal++) saida[indice + canal] = Math.round(originais[indice + canal] * (1 - alfa) + gerados[indice + canal] * alfa);
    if (saida[indice] !== originais[indice] || saida[indice + 1] !== originais[indice + 1] || saida[indice + 2] !== originais[indice + 2]) alterados++;
  }
  return { pixels: saida, alterados };
}

export function calcularRegioes(inventario, largura, altura) {
  return inventario.map((item) => ({
    x: largura * item.x / 100, y: altura * item.y / 100,
    raioX: Math.max(12, largura * item.largura / 200 * 1.5),
    raioY: Math.max(12, altura * item.altura / 200 * 1.5),
    giro: (item.giro || 0) * Math.PI / 180,
  }));
}

export function alfaNaRegiao(x, y, regioes) {
  let alfa = 0;
  for (const regiao of regioes) {
    const dx = x - regiao.x, dy = y - regiao.y;
    const cosseno = Math.cos(regiao.giro || 0), seno = Math.sin(regiao.giro || 0);
    const distancia = Math.hypot((dx * cosseno + dy * seno) / regiao.raioX, (-dx * seno + dy * cosseno) / regiao.raioY);
    if (distancia < 1) alfa = Math.max(alfa, distancia <= 0.8 ? 1 : (1 - distancia) / 0.2);
  }
  return alfa;
}

export function criarPreviaMascara(inventario, largura, altura) {
  const canvas = document.createElement("canvas"); canvas.width = largura; canvas.height = altura;
  const contexto = canvas.getContext("2d");
  const dados = contexto.createImageData(largura, altura);
  const regioes = calcularRegioes(inventario, largura, altura);
  for (let y = 0; y < altura; y++) for (let x = 0; x < largura; x++) {
    const alfa = alfaNaRegiao(x, y, regioes);
    const indice = (y * largura + x) * 4;
    dados.data[indice] = 255;
    dados.data[indice + 1] = Math.round(255 - 200 * alfa);
    dados.data[indice + 2] = Math.round(255 - 217 * alfa);
    dados.data[indice + 3] = 255;
  }
  contexto.putImageData(dados, 0, 0);
  return canvas.toDataURL("image/png");
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
  const geradaAlinhada = canvas.toDataURL("image/png");
  const regioes = calcularRegioes(inventario, largura, altura);
  const resultado = misturarPixelsProtegidos(pixelsOriginais.data, pixelsGerados.data, largura, altura, regioes);
  const diferenca = contexto.createImageData(largura, altura);
  let alteradosFora = 0, alteradosDentro = 0, mudancaBrutaDentro = 0;
  for (let y = 0; y < altura; y++) for (let x = 0; x < largura; x++) {
    const indice = (y * largura + x) * 4;
    const interior = alfaNaRegiao(x, y, regioes) > 0;
    const mudou = [0, 1, 2].some((canal) => resultado.pixels[indice + canal] !== pixelsOriginais.data[indice + canal]);
    const mudouBruto = [0, 1, 2].some((canal) => pixelsGerados.data[indice + canal] !== pixelsOriginais.data[indice + canal]);
    if (interior && mudou) alteradosDentro++;
    if (!interior && mudou) alteradosFora++;
    if (interior && mudouBruto) mudancaBrutaDentro++;
    diferenca.data[indice] = mudou ? 220 : 255;
    diferenca.data[indice + 1] = mudou ? 48 : 255;
    diferenca.data[indice + 2] = mudou ? 38 : 255;
    diferenca.data[indice + 3] = 255;
  }
  contexto.putImageData(diferenca, 0, 0);
  const imagemDiferenca = canvas.toDataURL("image/png");
  pixelsOriginais.data.set(resultado.pixels);
  contexto.putImageData(pixelsOriginais, 0, 0);
  return { imagem: canvas.toDataURL("image/png"), imagemDiferenca, geradaAlinhada,
    pixelsAlterados: resultado.alterados, alteradosFora, alteradosDentro, mudancaBrutaDentro,
    dimensoesOriginais: `${largura}×${altura}`, dimensoesGeradas: `${gerada.naturalWidth}×${gerada.naturalHeight}` };
}
