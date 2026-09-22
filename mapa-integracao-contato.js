// A resposta da IA fornece apenas intensidade e direção suaves de iluminação.
// As formas, cores e texturas da imagem final vêm da montagem manual.
const LIMITE_TOM = 0.06;
const limitar = (valor, minimo, maximo) => Math.max(minimo, Math.min(maximo, valor));

function carregarImagem(src) {
  return new Promise((resolver, rejeitar) => {
    const imagem = new Image();
    imagem.onload = () => resolver(imagem);
    imagem.onerror = () => rejeitar(new Error("Não foi possível ler a imagem para integrar o contato."));
    imagem.src = src;
  });
}

function lerPixels(imagem, largura, altura) {
  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const contexto = canvas.getContext("2d", { willReadFrequently: true });
  contexto.drawImage(imagem, 0, 0, largura, altura);
  return contexto.getImageData(0, 0, largura, altura);
}

function produtoVetorial(a, b, c) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function envoltorio(mascara) {
  const pontos = [];
  for (let y = 0; y < mascara.altura; y++) {
    let inicio = -1, fim = -1;
    for (let x = 0; x < mascara.largura; x++) {
      if (!mascara.alfa[y * mascara.largura + x]) continue;
      if (inicio < 0) inicio = x;
      fim = x;
    }
    if (inicio < 0) continue;
    // Inclui a célula inteira, não apenas seu centro: até alfa 1 é protegido.
    for (const x of [inicio, fim + 1]) {
      pontos.push({ x: mascara.x + x, y: mascara.y + y });
      pontos.push({ x: mascara.x + x, y: mascara.y + y + 1 });
    }
  }
  pontos.sort((a, b) => a.x - b.x || a.y - b.y);
  if (!pontos.length) return [];
  const metade = (lista) => {
    const pilha = [];
    for (const ponto of lista) {
      while (pilha.length >= 2 && produtoVetorial(pilha.at(-2), pilha.at(-1), ponto) <= 0) pilha.pop();
      pilha.push(ponto);
    }
    pilha.pop();
    return pilha;
  };
  return metade(pontos).concat(metade([...pontos].reverse()));
}

function limites(poligono, margem, largura, altura) {
  return {
    x0: Math.max(0, Math.floor(Math.min(...poligono.map((p) => p.x)) - margem)),
    x1: Math.min(largura - 1, Math.ceil(Math.max(...poligono.map((p) => p.x)) + margem)),
    y0: Math.max(0, Math.floor(Math.min(...poligono.map((p) => p.y)) - margem)),
    y1: Math.min(altura - 1, Math.ceil(Math.max(...poligono.map((p) => p.y)) + margem)),
  };
}

function protegerInterior(poligono, protegidos, largura, altura) {
  const caixa = limites(poligono, 0, largura, altura);
  for (let y = caixa.y0; y <= caixa.y1; y++) {
    const cruzamentos = [];
    for (let i = 0; i < poligono.length; i++) {
      const a = poligono[i], b = poligono[(i + 1) % poligono.length];
      if ((a.y > y + 0.5) === (b.y > y + 0.5)) continue;
      cruzamentos.push(a.x + (y + 0.5 - a.y) * (b.x - a.x) / (b.y - a.y));
    }
    if (cruzamentos.length < 2) continue;
    const inicio = Math.max(0, Math.ceil(Math.min(...cruzamentos) - 0.5));
    const fim = Math.min(largura - 1, Math.floor(Math.max(...cruzamentos) - 0.5));
    protegidos.fill(1, y * largura + inicio, y * largura + fim + 1);
  }
}

function distanciaAoContorno(x, y, poligono) {
  let menor = Infinity;
  for (let i = 0; i < poligono.length; i++) {
    const a = poligono[i], b = poligono[(i + 1) % poligono.length];
    const dx = b.x - a.x, dy = b.y - a.y;
    const t = limitar(((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
    menor = Math.min(menor, Math.hypot(x - a.x - t * dx, y - a.y - t * dy));
  }
  return menor;
}

// A preparação acontece antes da chamada paga. Se a proteção não puder ser
// construída, não há envio. Os espaços entre focos do mesmo desenho ficam
// dentro do envoltório convexo e também permanecem intocados.
export async function prepararIntegracaoContato(captura) {
  const { largura, altura, lesoes } = captura || {};
  const falha = () => new Error("Não foi possível preparar a proteção das lesões. A montagem foi preservada; nenhuma geração foi solicitada.");
  if (!Number.isInteger(largura) || !Number.isInteger(altura) || largura <= 0 || altura <= 0 || largura * altura > 16000000 || !Array.isArray(lesoes) || !lesoes.length) throw falha();
  if (typeof captura.imagem !== "string" || !captura.imagem.startsWith("data:image/png;base64,")) throw falha();
  const protegidos = new Uint8Array(largura * altura);
  const poligonos = [];
  for (const mascara of lesoes) {
    if (!mascara || ![mascara.x, mascara.y, mascara.largura, mascara.altura].every(Number.isInteger) || mascara.x < 0 || mascara.y < 0 || mascara.largura < 0 || mascara.altura < 0 || mascara.x + mascara.largura > largura || mascara.y + mascara.altura > altura || !(mascara.alfa instanceof Uint8Array || mascara.alfa instanceof Uint8ClampedArray) || mascara.alfa.length !== mascara.largura * mascara.altura) throw falha();
    const poligono = envoltorio(mascara);
    if (poligono.length < 3) continue;
    poligonos.push(poligono);
    protegerInterior(poligono, protegidos, largura, altura);
    // Verificação independente do preenchimento geométrico para as bordas alfa.
    for (let y = 0; y < mascara.altura; y++) for (let x = 0; x < mascara.largura; x++) {
      if (mascara.alfa[y * mascara.largura + x]) protegidos[(mascara.y + y) * largura + mascara.x + x] = 1;
    }
  }
  if (!poligonos.length) throw falha();
  const raio = Math.max(1, Math.min(6, Math.round(largura * 4 / 1086)));
  const regioes = poligonos.map((poligono) => {
    const caixa = limites(poligono, raio * 5, largura, altura);
    const centroX = poligono.reduce((soma, p) => soma + p.x, 0) / poligono.length;
    const centroY = poligono.reduce((soma, p) => soma + p.y, 0) / poligono.length;
    const contato = [], entorno = [];
    for (let y = caixa.y0; y <= caixa.y1; y++) for (let x = caixa.x0; x <= caixa.x1; x++) {
      const indice = y * largura + x;
      if (protegidos[indice]) continue;
      const distancia = distanciaAoContorno(x + 0.5, y + 0.5, poligono);
      if (distancia < raio) {
        const dx = x + 0.5 - centroX, dy = y + 0.5 - centroY;
        const norma = Math.hypot(dx, dy) || 1;
        contato.push({ indice, peso: (1 - distancia / raio) ** 2, cos: dx / norma, sen: dy / norma });
      } else if (distancia >= raio * 3 && distancia < raio * 5) entorno.push(indice);
    }
    return { contato, entorno };
  });
  if (!regioes.some((regiao) => regiao.contato.length)) throw new Error("Não há borda externa disponível para integrar. A montagem foi preservada; nenhuma geração foi solicitada.");
  const original = await carregarImagem(captura.imagem);
  if (original.naturalWidth !== largura || original.naturalHeight !== altura) throw falha();
  return { largura, altura, originais: lerPixels(original, largura, altura).data, protegidos, regioes, raio };
}

function mediana(valores) {
  if (!valores.length) return 0;
  valores.sort((a, b) => a - b);
  const meio = Math.floor(valores.length / 2);
  return valores.length % 2 ? valores[meio] : (valores[meio - 1] + valores[meio]) / 2;
}

function diferencaDeLuz(originais, gerados, indice) {
  const i = indice * 4;
  if (gerados[i + 3] !== 255) return 0;
  const luminancia = (pixels) => 0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2];
  const original = luminancia(originais);
  return limitar((luminancia(gerados) - original) / Math.max(32, original), -0.3, 0.3);
}

// Uma mediana e uma primeira harmônica não transportam manchas, ramificações,
// septos nem textura gerada. Mudanças gerais de luz são descontadas pelo entorno.
function estimarLuz(regiao, originais, gerados) {
  const valores = [], esquerda = [], direita = [], cima = [], baixo = [];
  for (const ponto of regiao.contato) {
    const diferenca = diferencaDeLuz(originais, gerados, ponto.indice);
    valores.push(diferenca);
    (ponto.cos < 0 ? esquerda : direita).push(diferenca);
    (ponto.sen < 0 ? cima : baixo).push(diferenca);
  }
  const variacaoGeral = mediana(regiao.entorno.map((indice) => diferencaDeLuz(originais, gerados, indice)));
  return {
    media: limitar(mediana(valores) - variacaoGeral, -LIMITE_TOM, LIMITE_TOM),
    x: limitar((mediana(direita) - mediana(esquerda)) / 2, -LIMITE_TOM / 2, LIMITE_TOM / 2),
    y: limitar((mediana(baixo) - mediana(cima)) / 2, -LIMITE_TOM / 2, LIMITE_TOM / 2),
  };
}

export async function integrarContato(preparacao, geradaUrl) {
  const { largura, altura, originais, protegidos, regioes } = preparacao;
  const gerada = await carregarImagem(geradaUrl);
  const proporcao = (gerada.naturalWidth / gerada.naturalHeight) / (largura / altura);
  if (!Number.isFinite(proporcao) || Math.abs(proporcao - 1) > 0.02) throw new Error("O Gemini mudou o enquadramento. O acabamento não foi aplicado; a montagem foi preservada.");
  const gerados = lerPixels(gerada, largura, altura).data;
  const ajustes = new Float32Array(largura * altura);
  for (const regiao of regioes) {
    const luz = estimarLuz(regiao, originais, gerados);
    for (const ponto of regiao.contato) {
      const ajuste = limitar(luz.media + luz.x * ponto.cos + luz.y * ponto.sen, -LIMITE_TOM, LIMITE_TOM) * ponto.peso;
      // Contatos sobrepostos nunca somam sua intensidade.
      if (Math.abs(ajuste) > Math.abs(ajustes[ponto.indice])) ajustes[ponto.indice] = ajuste;
    }
  }
  const saida = new Uint8ClampedArray(originais);
  let pixelsAlterados = 0;
  for (let indice = 0; indice < ajustes.length; indice++) {
    if (protegidos[indice] || !ajustes[indice]) continue;
    const i = indice * 4;
    let mudou = false;
    for (let canal = 0; canal < 3; canal++) {
      saida[i + canal] = Math.round(originais[i + canal] * (1 + ajustes[indice]));
      mudou ||= saida[i + canal] !== originais[i + canal];
    }
    if (mudou) pixelsAlterados++;
  }
  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  canvas.getContext("2d").putImageData(new ImageData(saida, largura, altura), 0, 0);
  return { imagem: canvas.toDataURL("image/png"), pixelsAlterados };
}
