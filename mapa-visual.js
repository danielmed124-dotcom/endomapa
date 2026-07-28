(function () {
  "use strict";

  const camadas = document.querySelectorAll("[data-camada-lesoes]");
  const lista = document.querySelector("[data-lista-lesoes-mapa]");

  if (!camadas.length || !lista) return;

  const modelos = {
    endometriose: "assets/lesoes/endometriose-v2.png",
    adenomiose: "assets/lesoes/adenomiose.png",
  };

  const posicoes = {
    coronal: {
      "útero": { x: 50, y: 42 },
      "ovário": { direito: [32, 50], esquerdo: [68, 50], central: [50, 50] },
      "tuba uterina": { direito: [31, 34], esquerdo: [69, 34], central: [50, 34] },
      // A lateralidade é radiológica: o lado da paciente aparece invertido na imagem.
      "ligamento uterossacro": {
        direito: [41, 56, -42],
        esquerdo: [59, 56, 42],
        central: [50, 56, 0],
      },
      "região retrocervical": { x: 50, y: 62 },
      "reto ou sigmoide": { x: 50, y: 72 },
      "bexiga": { x: 50, y: 69 },
      "recesso pélvico": { direito: [23, 58], esquerdo: [77, 58], central: [50, 58] },
    },
    sagital: {
      "útero": { x: 54, y: 42 },
      "ovário": { x: 52, y: 31 },
      "tuba uterina": { x: 48, y: 28 },
      "ligamento uterossacro": { x: 65, y: 45, rotacao: -12 },
      "região retrocervical": { x: 68, y: 49 },
      "reto ou sigmoide": { x: 77, y: 49 },
      "bexiga": { x: 35, y: 50 },
      "recesso pélvico": { x: 63, y: 35 },
    },
  };

  window.addEventListener("endomapa:lesoes-confirmadas", function (evento) {
    const lesoes = Array.isArray(evento.detail?.lesoes) ? evento.detail.lesoes : [];
    renderizar(lesoes);
  });

  function renderizar(lesoes) {
    camadas.forEach((camada) => camada.replaceChildren());
    lista.replaceChildren();

    lesoes.forEach(function (lesao, indice) {
      lista.append(criarResumo(lesao, indice));

      if (!modelos[lesao.categoria]) return;

      camadas.forEach(function (camada) {
        const vista = camada.dataset.camadaLesoes;
        const ponto = obterPonto(vista, lesao.localizacao, lesao.lado);
        if (!ponto) return;
        camada.append(criarLesaoVisual(lesao, indice, ponto));
      });
    });
  }

  function obterPonto(vista, localizacao, lado) {
    const configuracao = posicoes[vista]?.[localizacao];
    if (!configuracao) return null;
    if (typeof configuracao.x === "number") return configuracao;
    const coordenadas = configuracao[lado] || configuracao.central;
    return coordenadas
      ? { x: coordenadas[0], y: coordenadas[1], rotacao: coordenadas[2] || 0 }
      : null;
  }

  function criarLesaoVisual(lesao, indice, ponto) {
    const elemento = document.createElement("div");
    elemento.className = `lesao-no-mapa lesao-no-mapa--${lesao.categoria}`;
    elemento.style.left = `${ponto.x}%`;
    elemento.style.top = `${ponto.y}%`;
    const dimensoes = calcularDimensoes(lesao);
    const rotacao = ponto.rotacao ?? ((indice % 5) * 7 - 14);
    elemento.style.setProperty("--largura-lesao", `${dimensoes.largura}%`);
    elemento.style.setProperty("--proporcao-lesao", dimensoes.proporcao);
    elemento.style.setProperty("--rotacao-lesao", `${rotacao}deg`);
    elemento.style.setProperty("--rotacao-medida", `${-rotacao}deg`);

    const imagem = document.createElement("img");
    imagem.className = "lesao-no-mapa__imagem";
    imagem.src = modelos[lesao.categoria];
    imagem.alt = "";

    const medida = document.createElement("span");
    medida.className = "lesao-no-mapa__medida";
    medida.textContent = formatarMedidas(lesao);

    elemento.append(imagem);
    if (medida.textContent !== "Medida não informada") elemento.append(medida);
    return elemento;
  }

  function calcularDimensoes(lesao) {
    if (lesao.categoria === "adenomiose") {
      return { largura: 22, proporcao: 1.2 };
    }

    const comprimento = numeroPositivo(lesao.medida_1) || 0.8;
    const espessura = numeroPositivo(lesao.medida_2) || comprimento;

    return {
      largura: Math.min(22, Math.max(7, 5 + comprimento * 5.5)),
      proporcao: Math.min(6, Math.max(0.45, comprimento / espessura)),
    };
  }

  function numeroPositivo(valor) {
    return typeof valor === "number" && valor > 0 ? valor : null;
  }

  function criarResumo(lesao, indice) {
    const artigo = document.createElement("article");
    artigo.className = "achado";

    const titulo = document.createElement("h3");
    titulo.className = "achado__categoria";
    titulo.textContent = `${indice + 1}. ${capitalizar(lesao.categoria)}`;

    const descricao = document.createElement("p");
    descricao.textContent = `${capitalizar(lesao.localizacao)} · ${lesao.lado} · ${formatarMedidas(lesao)}`;
    artigo.append(titulo, descricao);

    if (!modelos[lesao.categoria]) {
      const aviso = document.createElement("p");
      aviso.className = "texto-apoio";
      aviso.textContent = "Sem modelo visual aprovado: esta lesão não foi desenhada no mapa.";
      artigo.append(aviso);
    }

    return artigo;
  }

  function formatarMedidas(lesao) {
    const medidas = [lesao.medida_1, lesao.medida_2, lesao.medida_3]
      .filter((valor) => typeof valor === "number")
      .map((valor) => valor.toLocaleString("pt-BR"));
    return medidas.length ? `${medidas.join(" × ")} cm` : "Medida não informada";
  }

  function capitalizar(texto) {
    return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : "";
  }
})();
