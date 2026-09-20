// Planejamento e montagem determinísticos: nenhuma chamada de IA ocorre aqui.
function limitar(valor, minimo, maximo) {
  return Math.min(maximo, Math.max(minimo, valor));
}

function carregarImagem(src) {
  return new Promise((resolver, rejeitar) => {
    const imagem = new Image();
    imagem.onload = () => resolver(imagem);
    imagem.onerror = () => rejeitar(new Error("Uma imagem da montagem por regiões não pôde ser aberta."));
    imagem.src = src;
  });
}

function caixaDaLesao(lesao, larguraMapa, alturaMapa) {
  const dados = lesao.dataset;
  const escala = Number(dados.tamanho) / 100;
  const largura = larguraMapa * 0.13 * escala * Number(dados.eixoX) / 100;
  const altura = larguraMapa * 0.13 / Number(dados.proporcao || 1.8) * escala * Number(dados.eixoY) / 100;
  const angulo = Number(dados.giro) * Math.PI / 180;
  const larguraGirada = Math.abs(largura * Math.cos(angulo)) + Math.abs(altura * Math.sin(angulo));
  const alturaGirada = Math.abs(altura * Math.cos(angulo)) + Math.abs(largura * Math.sin(angulo));
  const centroX = larguraMapa * Number(dados.x) / 100;
  const centroY = alturaMapa * Number(dados.y) / 100;
  if (![larguraGirada, alturaGirada, centroX, centroY].every(Number.isFinite)) {
    throw new Error("Há uma lesão com posição ou tamanho inválido.");
  }
  return {
    esquerda: centroX - larguraGirada / 2,
    topo: centroY - alturaGirada / 2,
    direita: centroX + larguraGirada / 2,
    base: centroY + alturaGirada / 2,
    ids: [dados.id], nomes: [dados.nome || "Lesão"],
  };
}

function unir(a, b) {
  return {
    esquerda: Math.min(a.esquerda, b.esquerda),
    topo: Math.min(a.topo, b.topo),
    direita: Math.max(a.direita, b.direita),
    base: Math.max(a.base, b.base),
    ids: [...a.ids, ...b.ids],
    nomes: [...new Set([...a.nomes, ...b.nomes])],
  };
}

function distancia(a, b) {
  const horizontal = Math.max(0, a.esquerda - b.direita, b.esquerda - a.direita);
  const vertical = Math.max(0, a.topo - b.base, b.topo - a.base);
  return Math.hypot(horizontal, vertical);
}

function planejarRegioes(lesoes, larguraMapa, alturaMapa) {
  if (!Number.isFinite(larguraMapa) || !Number.isFinite(alturaMapa) || larguraMapa < 200 || alturaMapa < 200) {
    throw new Error("As dimensões do mapa não são válidas.");
  }
  const editaveis = [...lesoes].filter((lesao) => !/^DIU\b/i.test(lesao.dataset.nome || ""));
  if (!editaveis.length) throw new Error("Adicione uma lesão editável; o DIU permanece preservado no mapa.");
  const grupos = editaveis.map((lesao) => caixaDaLesao(lesao, larguraMapa, alturaMapa));
  let continuar = true;
  while (continuar) {
    continuar = false;
    let melhor = null;
    for (let i = 0; i < grupos.length; i++) {
      for (let j = i + 1; j < grupos.length; j++) {
        const conjunto = unir(grupos[i], grupos[j]);
        const tamanho = Math.max(conjunto.direita - conjunto.esquerda, conjunto.base - conjunto.topo) + 120;
        const separacao = distancia(grupos[i], grupos[j]);
        if (separacao <= 90 && tamanho <= Math.min(620, larguraMapa, alturaMapa) &&
            (!melhor || separacao < melhor.separacao)) melhor = { i, j, conjunto, separacao };
      }
    }
    if (melhor) {
      grupos[melhor.i] = melhor.conjunto;
      grupos.splice(melhor.j, 1);
      continuar = true;
    }
  }
  if (grupos.length > 6) throw new Error(`O mapa exigiria ${grupos.length} chamadas pagas. Reposicione as lesões próximas ao mesmo órgão ou divida o estudo.`);
  return grupos.map((grupo) => {
    const centroX = (grupo.esquerda + grupo.direita) / 2;
    const centroY = (grupo.topo + grupo.base) / 2;
    const lado = Math.round(limitar(Math.max(grupo.direita - grupo.esquerda, grupo.base - grupo.topo) + 120,
      220, Math.min(larguraMapa, alturaMapa)));
    return {
      esquerda: Math.round(limitar(centroX - lado / 2, 0, larguraMapa - lado)),
      topo: Math.round(limitar(centroY - lado / 2, 0, alturaMapa - lado)),
      lado, ids: grupo.ids, nomes: grupo.nomes,
    };
  }).sort((a, b) => a.topo - b.topo || a.esquerda - b.esquerda);
}

async function recortarRegiao(composicao, regiao) {
  const mapa = await carregarImagem(composicao);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1024;
  canvas.getContext("2d").drawImage(mapa, regiao.esquerda, regiao.topo, regiao.lado, regiao.lado,
    0, 0, 1024, 1024);
  return canvas.toDataURL("image/jpeg", 0.93);
}

async function montarRegioes(composicao, respostas) {
  const mapa = await carregarImagem(composicao);
  const resultado = document.createElement("canvas");
  resultado.width = mapa.naturalWidth;
  resultado.height = mapa.naturalHeight;
  const contexto = resultado.getContext("2d");
  contexto.drawImage(mapa, 0, 0);
  for (const { regiao, imagem } of respostas) {
    const gerada = await carregarImagem(imagem);
    const area = document.createElement("canvas");
    area.width = area.height = regiao.lado;
    const contextoArea = area.getContext("2d", { willReadFrequently: true });
    contextoArea.drawImage(gerada, 0, 0, regiao.lado, regiao.lado);
    const pixels = contextoArea.getImageData(0, 0, regiao.lado, regiao.lado);
    const margem = Math.max(12, Math.round(regiao.lado * 0.08));
    for (let y = 0; y < regiao.lado; y++) {
      for (let x = 0; x < regiao.lado; x++) {
        const distanciaBorda = Math.min(x, y, regiao.lado - 1 - x, regiao.lado - 1 - y);
        const peso = limitar(distanciaBorda / margem, 0, 1);
        const indice = (y * regiao.lado + x) * 4 + 3;
        pixels.data[indice] = Math.round(pixels.data[indice] * peso);
      }
    }
    contextoArea.putImageData(pixels, 0, 0);
    contexto.drawImage(area, regiao.esquerda, regiao.topo);
  }
  return resultado.toDataURL("image/png");
}

window.EndomapaRegioes = { planejarRegioes, recortarRegiao, montarRegioes };
