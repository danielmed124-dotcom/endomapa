// Montagem deste exemplo específico. As coordenadas não representam uma regra clínica.
// A IA cria o acabamento; esta composição preserva os pixels fora das áreas delimitadas.
(async function () {
  "use strict";
  const estado = document.getElementById("estado");
  const dimensoes = { largura: 1024, altura: 1536 };
  const vistas = {
    cisto: [232, 721, 125, 160],
    ligamento: [369, 752, 126, 139],
    mapa: [0, 0, dimensoes.largura, dimensoes.altura],
  };
  const poligonoLigamento = [
    [389, 865], [396, 840], [414, 812], [435, 789], [467, 773],
    [475, 783], [459, 807], [440, 827], [417, 853], [400, 870],
  ];

  function carregar(src) {
    return new Promise((resolve, reject) => {
      const imagem = new Image();
      imagem.onload = () => resolve(imagem);
      imagem.onerror = () => reject(new Error("Não foi possível abrir uma das imagens da comparação."));
      imagem.src = src;
    });
  }

  function pixelsDaImagem(imagem) {
    if (imagem.naturalWidth !== dimensoes.largura || imagem.naturalHeight !== dimensoes.altura) {
      throw new Error("As dimensões das imagens são diferentes. A montagem foi interrompida para evitar deslocamentos.");
    }
    const canvas = document.createElement("canvas");
    canvas.width = dimensoes.largura;
    canvas.height = dimensoes.altura;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(imagem, 0, 0);
    return { canvas, ctx, pixels: ctx.getImageData(0, 0, canvas.width, canvas.height) };
  }

  function distanciaSegmento(x, y, a, b) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy);
  }

  function pesoLigamento(x, y) {
    if (x < 389 || x > 475 || y < 773 || y > 870) return 0;
    let dentro = false;
    let distancia = Infinity;
    for (let i = 0, j = poligonoLigamento.length - 1; i < poligonoLigamento.length; j = i++) {
      const a = poligonoLigamento[i];
      const b = poligonoLigamento[j];
      if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) dentro = !dentro;
      distancia = Math.min(distancia, distanciaSegmento(x, y, a, b));
    }
    return dentro ? Math.min(1, distancia / 3) : 0;
  }

  function pesoCisto(x, y) {
    const distanciaRelativa = Math.hypot((x - 293.5) / 35.5, (y - 798.5) / 40.5);
    return Math.max(0, Math.min(1, (1 - distanciaRelativa) * 35.5 / 3));
  }

  function prepararComparacao(original, proposta) {
    function exibir(vista) {
      const [x, y, largura, altura] = vistas[vista];
      for (const [id, fonte] of [["original", original], ["proposta", proposta]]) {
        const destino = document.getElementById(id);
        destino.width = vista === "mapa" ? largura : largura * 4;
        destino.height = vista === "mapa" ? altura : altura * 4;
        const ctx = destino.getContext("2d");
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(fonte, x, y, largura, altura, 0, 0, destino.width, destino.height);
      }
      document.querySelectorAll("[data-vista]").forEach((botao) => botao.setAttribute("aria-pressed", String(botao.dataset.vista === vista)));
    }
    document.querySelectorAll("[data-vista]").forEach((botao) => botao.addEventListener("click", () => exibir(botao.dataset.vista)));
    const vistaInicial = new URLSearchParams(location.search).get("vista");
    exibir(Object.hasOwn(vistas, vistaInicial) ? vistaInicial : "cisto");
    estado.textContent = "Comparação pronta. Fora das duas áreas de acabamento, o mapa permanece igual ao original.";
    return exibir;
  }

  try {
    const modoVerificacao = new URLSearchParams(location.search).has("verificar");
    if (!modoVerificacao) {
      // A consulta usa os arquivos já montados: funciona também ao abrir o HTML local.
      const [original, proposta] = await Promise.all([carregar("mapa-original.webp"), carregar("mapa-integrado-v1.png")]);
      prepararComparacao(original, proposta);
      return;
    }
    const [imagemOriginal, imagemGerada] = await Promise.all([
      carregar("mapa-original.webp"), carregar("mapa-gerado-v1.png"),
    ]);
    const original = pixelsDaImagem(imagemOriginal);
    const gerada = pixelsDaImagem(imagemGerada);
    const nova = new ImageData(new Uint8ClampedArray(original.pixels.data), dimensoes.largura, dimensoes.altura);
    let foraAlterados = 0;
    let cistoAlterados = 0;
    let ligamentoAlterados = 0;
    for (let y = 0; y < dimensoes.altura; y++) {
      for (let x = 0; x < dimensoes.largura; x++) {
        const peso1 = pesoCisto(x + 0.5, y + 0.5);
        const peso2 = pesoLigamento(x + 0.5, y + 0.5);
        const peso = Math.max(peso1, peso2);
        const i = (y * dimensoes.largura + x) * 4;
        if (peso > 0) {
          for (let canal = 0; canal < 3; canal++) {
            nova.data[i + canal] = Math.round(original.pixels.data[i + canal] * (1 - peso) + gerada.pixels.data[i + canal] * peso);
          }
        }
        const mudou = [0, 1, 2, 3].some((canal) => nova.data[i + canal] !== original.pixels.data[i + canal]);
        if (mudou && peso === 0) foraAlterados++;
        if (mudou && peso1 > 0) cistoAlterados++;
        if (mudou && peso2 > 0) ligamentoAlterados++;
      }
    }
    if (foraAlterados || !cistoAlterados || !ligamentoAlterados) throw new Error("A montagem não passou pela conferência das áreas alteradas.");
    const proposta = document.createElement("canvas");
    proposta.width = dimensoes.largura;
    proposta.height = dimensoes.altura;
    proposta.getContext("2d").putImageData(nova, 0, 0);

    const exibir = prepararComparacao(original.canvas, proposta);
    // Permite salvar e verificar o artefato no teste local, sem acrescentar exportação ao aplicativo.
    window.endomapaEstudo = { proposta, original: original.canvas, foraAlterados, cistoAlterados, ligamentoAlterados, exibir };
    if (new URLSearchParams(location.search).has("verificar")) {
      const registro = document.createElement("pre");
      registro.id = "verificacao";
      registro.textContent = JSON.stringify({ foraAlterados, cistoAlterados, ligamentoAlterados, largura: proposta.width, altura: proposta.height });
      document.body.append(registro);
      const arquivo = document.createElement("script");
      arquivo.type = "application/json";
      arquivo.id = "artefato-png";
      arquivo.textContent = JSON.stringify(proposta.toDataURL("image/png"));
      document.body.append(arquivo);
    }
  } catch (erro) {
    estado.textContent = erro.message;
    estado.dataset.erro = "true";
  }
})();
