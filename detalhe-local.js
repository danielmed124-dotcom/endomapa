// Amplia uma lesão para edição e recoloca seus pixels e o tecido de contato.
// O mapa inteiro permanece a referência clínica para comparação.

function carregarImagem(src) {
  return new Promise((resolver, rejeitar) => {
    const imagem = new Image();
    imagem.onload = () => resolver(imagem);
    imagem.onerror = () => rejeitar(new Error("Não foi possível ler a imagem para o teste local."));
    imagem.src = src;
  });
}

function limitar(valor, minimo, maximo) {
  return Math.min(maximo, Math.max(minimo, valor));
}

export async function prepararRecorte(composicao, lesao) {
  const mapa = await carregarImagem(composicao);
  const imagemLesao = lesao.querySelector("img");
  if (!imagemLesao) throw new Error("A lesão selecionada não tem imagem.");
  const dados = lesao.dataset;
  const escala = Number(dados.tamanho) / 100;
  const larguraLesao = mapa.naturalWidth * 0.13 * escala * Number(dados.eixoX) / 100;
  const alturaLesao = mapa.naturalWidth * 0.13 / Number(dados.proporcao || 1.8) * escala * Number(dados.eixoY) / 100;
  const centroX = mapa.naturalWidth * Number(dados.x) / 100;
  const centroY = mapa.naturalHeight * Number(dados.y) / 100;
  const giro = Number(dados.giro) * Math.PI / 180;
  if (![larguraLesao, alturaLesao, centroX, centroY, giro].every(Number.isFinite)) {
    throw new Error("A posição ou o tamanho da lesão não é válido.");
  }
  const larguraGirada = Math.abs(larguraLesao * Math.cos(giro)) + Math.abs(alturaLesao * Math.sin(giro));
  const alturaGirada = Math.abs(alturaLesao * Math.cos(giro)) + Math.abs(larguraLesao * Math.sin(giro));
  const lado = Math.min(Math.max(Math.ceil(Math.max(larguraGirada, alturaGirada) * 2.8), 220), 600, mapa.naturalWidth, mapa.naturalHeight);
  const esquerda = Math.round(limitar(centroX - lado / 2, 0, mapa.naturalWidth - lado));
  const topo = Math.round(limitar(centroY - lado / 2, 0, mapa.naturalHeight - lado));
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1024;
  canvas.getContext("2d").drawImage(mapa, esquerda, topo, lado, lado, 0, 0, 1024, 1024);
  return {
    imagem: canvas.toDataURL("image/jpeg", 0.93),
    regiao: { esquerda, topo, lado, centroX, centroY, larguraLesao, alturaLesao, giro,
      semRecorte: dados.semRecorte === "true", srcLesao: imagemLesao.src },
  };
}

export async function recomporRecorte(composicao, detalheGerado, regiao) {
  const [mapa, detalhe] = await Promise.all([
    carregarImagem(composicao), carregarImagem(detalheGerado),
  ]);
  const { esquerda, topo, lado, centroX, centroY, larguraLesao, alturaLesao, giro } = regiao;
  const mascara = document.createElement("canvas");
  mascara.width = mascara.height = lado;
  const contextoMascara = mascara.getContext("2d");
  contextoMascara.save();
  contextoMascara.translate(centroX - esquerda, centroY - topo);
  contextoMascara.rotate(giro);
  // A sombra de contato fica no tecido ao redor, fora da imagem da lesão.
  // A margem acompanha o tamanho da lesão sem invadir o restante do mapa.
  const margem = Math.max(16, Math.min(32, Math.max(larguraLesao, alturaLesao) * 0.22));
  contextoMascara.fillStyle = "white";
  contextoMascara.beginPath();
  contextoMascara.ellipse(0, 0, larguraLesao / 2 + margem, alturaLesao / 2 + margem, 0, 0, Math.PI * 2);
  contextoMascara.fill();
  contextoMascara.restore();

  const borda = document.createElement("canvas");
  borda.width = borda.height = lado;
  const contextoBorda = borda.getContext("2d");
  contextoBorda.filter = "blur(10px)";
  contextoBorda.drawImage(mascara, 0, 0);

  const areaEditada = document.createElement("canvas");
  areaEditada.width = areaEditada.height = lado;
  const contextoArea = areaEditada.getContext("2d");
  contextoArea.drawImage(detalhe, 0, 0, lado, lado);
  contextoArea.globalCompositeOperation = "destination-in";
  contextoArea.drawImage(borda, 0, 0);

  const resultado = document.createElement("canvas");
  resultado.width = mapa.naturalWidth;
  resultado.height = mapa.naturalHeight;
  const contextoResultado = resultado.getContext("2d");
  contextoResultado.drawImage(mapa, 0, 0);
  contextoResultado.drawImage(areaEditada, esquerda, topo);
  return resultado.toDataURL("image/png");
}
