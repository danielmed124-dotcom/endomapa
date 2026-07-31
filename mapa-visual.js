(function () {
  "use strict";

  const camadas = document.querySelectorAll("[data-camada-lesoes]");
  const lista = document.querySelector("[data-lista-lesoes-mapa]");
  const mapaCoronal = document.querySelector('[data-vista="coronal"]');

  if (!camadas.length || !lista) return;

  const CHAVE_AJUSTES = "endomapa:ajustes-anatomicos:v1";
  let calibracaoAtiva = false;
  let lesoesAtuais = [];
  let ajustesSalvos = lerAjustesSalvos();
  let ajustesTemporarios = structuredClone(ajustesSalvos);
  const controles = criarControlesDeCalibracao();

  // Cada modelo visual é liberado somente para a combinação anatômica aprovada.
  // Isso impede reutilizar silenciosamente uma lesão uterossacra em outro órgão.
  const modelos = {
    "endometriose|ligamento uterossacro": "assets/lesoes/endometriose-ligamento-original.png",
    "adenomiose|útero": "assets/lesoes/adenomiose.png",
  };

  const posicoes = {
    coronal: {
      "útero": { x: 50, y: 42 },
      "ovário": { direito: [32, 50], esquerdo: [68, 50], central: [50, 50] },
      "tuba uterina": { direito: [31, 34], esquerdo: [69, 34], central: [50, 34] },
      // Orientação validada pelo médico: o lado informado usa o mesmo lado visual.
      "ligamento uterossacro": {
        esquerdo: [38, 56, -38],
        direito: [64.5, 58, 48],
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
    lesoesAtuais = lesoes;
    renderizar(lesoes);
  });

  function renderizar(lesoes) {
    camadas.forEach((camada) => camada.replaceChildren());
    lista.replaceChildren();

    lesoes.forEach(function (lesao, indice) {
      lista.append(criarResumo(lesao, indice));

      const modelo = obterModelo(lesao);
      if (!modelo) return;

      camadas.forEach(function (camada) {
        const vista = camada.dataset.camadaLesoes;
        const chave = criarChaveDeAjuste(vista, lesao);
        const pontoPadrao = obterPonto(vista, lesao.localizacao, lesao.lado);
        const ponto = aplicarAjusteAoPonto(pontoPadrao, ajustesTemporarios[chave]?.lesao);
        if (!ponto) return;
        const elementoLesao = criarLesaoVisual(lesao, indice, ponto, modelo);
        prepararElementoAjustavel(elementoLesao, chave, "lesao", camada);
        camada.append(elementoLesao);
        if (formatarMedidas(lesao) !== "Medida não informada") {
          const pontoMedidaPadrao = { x: ponto.x, y: Math.min(92, ponto.y + 4.5) };
          const pontoMedida = aplicarAjusteAoPonto(
            pontoMedidaPadrao,
            ajustesTemporarios[chave]?.medida,
          );
          const medida = criarAnotacaoDaMedida(lesao, pontoMedida);
          prepararElementoAjustavel(medida, chave, "medida", camada);
          camada.append(medida);
        }
      });
    });

    atualizarEstadoDaCalibracao();
  }

  function obterModelo(lesao) {
    return modelos[`${lesao.categoria}|${lesao.localizacao}`] || null;
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

  function criarLesaoVisual(lesao, indice, ponto, modelo) {
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
    imagem.src = modelo;
    imagem.alt = "";
    elemento.append(imagem);
    return elemento;
  }

  function criarAnotacaoDaMedida(lesao, ponto) {
    const medida = document.createElement("span");
    medida.className = "medida-no-mapa";
    medida.style.left = `${ponto.x}%`;
    medida.style.top = `${ponto.y}%`;
    medida.textContent = formatarMedidas(lesao);
    return medida;
  }

  function criarChaveDeAjuste(vista, lesao) {
    return [vista, lesao.categoria, lesao.localizacao, lesao.lado].join("|");
  }

  function aplicarAjusteAoPonto(pontoPadrao, ajuste) {
    if (!pontoPadrao) return null;
    if (!ajuste) return { ...pontoPadrao };
    return {
      ...pontoPadrao,
      x: numeroEntre(ajuste.x, 0, 100, pontoPadrao.x),
      y: numeroEntre(ajuste.y, 0, 100, pontoPadrao.y),
    };
  }

  function prepararElementoAjustavel(elemento, chave, tipo, camada) {
    if (camada.dataset.camadaLesoes !== "coronal") return;
    elemento.dataset.ajusteChave = chave;
    elemento.dataset.ajusteTipo = tipo;
    elemento.addEventListener("pointerdown", iniciarArraste);
  }

  function iniciarArraste(evento) {
    if (!calibracaoAtiva) return;
    evento.preventDefault();
    const elemento = evento.currentTarget;
    const camada = elemento.parentElement;
    elemento.setPointerCapture(evento.pointerId);
    elemento.classList.add("elemento-em-arraste");

    const mover = function (movimento) {
      const retangulo = camada.getBoundingClientRect();
      const x = Math.min(98, Math.max(2, ((movimento.clientX - retangulo.left) / retangulo.width) * 100));
      const y = Math.min(96, Math.max(4, ((movimento.clientY - retangulo.top) / retangulo.height) * 100));
      elemento.style.left = `${x}%`;
      elemento.style.top = `${y}%`;

      const chave = elemento.dataset.ajusteChave;
      const tipo = elemento.dataset.ajusteTipo;
      ajustesTemporarios[chave] ??= {};
      ajustesTemporarios[chave][tipo] = {
        x: arredondarCoordenada(x),
        y: arredondarCoordenada(y),
      };
      mostrarCoordenadas(chave);
    };

    const terminar = function () {
      elemento.classList.remove("elemento-em-arraste");
      elemento.removeEventListener("pointermove", mover);
      elemento.removeEventListener("pointerup", terminar);
      elemento.removeEventListener("pointercancel", terminar);
    };

    elemento.addEventListener("pointermove", mover);
    elemento.addEventListener("pointerup", terminar);
    elemento.addEventListener("pointercancel", terminar);
  }

  function criarControlesDeCalibracao() {
    if (!mapaCoronal) return null;
    const painel = document.createElement("section");
    painel.className = "calibracao-mapa";
    painel.setAttribute("aria-label", "Ajuste médico da posição no mapa coronal");
    painel.innerHTML = `
      <button class="botao botao--secundario" type="button" data-ativar-calibracao>Ajustar posição</button>
      <div class="calibracao-mapa__acoes" data-acoes-calibracao hidden>
        <p class="calibracao-mapa__instrucao">Arraste a lesão e a medida separadamente com o dedo.</p>
        <output class="calibracao-mapa__coordenadas" data-coordenadas-calibracao>Toque na lesão para começar.</output>
        <button class="botao" type="button" data-salvar-calibracao>Salvar posição</button>
        <button class="botao botao--secundario" type="button" data-restaurar-calibracao>Restaurar padrão</button>
        <button class="link-voltar" type="button" data-cancelar-calibracao>Cancelar ajuste</button>
      </div>`;
    mapaCoronal.insertAdjacentElement("afterend", painel);

    painel.querySelector("[data-ativar-calibracao]").addEventListener("click", function () {
      calibracaoAtiva = true;
      ajustesTemporarios = structuredClone(ajustesSalvos);
      atualizarEstadoDaCalibracao();
    });
    painel.querySelector("[data-salvar-calibracao]").addEventListener("click", salvarCalibracao);
    painel.querySelector("[data-restaurar-calibracao]").addEventListener("click", restaurarPadrao);
    painel.querySelector("[data-cancelar-calibracao]").addEventListener("click", function () {
      calibracaoAtiva = false;
      ajustesTemporarios = structuredClone(ajustesSalvos);
      renderizar(lesoesAtuais);
    });
    return painel;
  }

  function atualizarEstadoDaCalibracao() {
    if (!controles || !mapaCoronal) return;
    mapaCoronal.classList.toggle("mapa-visual--calibrando", calibracaoAtiva);
    controles.querySelector("[data-acoes-calibracao]").hidden = !calibracaoAtiva;
    controles.querySelector("[data-ativar-calibracao]").hidden = calibracaoAtiva;
  }

  function salvarCalibracao() {
    ajustesSalvos = structuredClone(ajustesTemporarios);
    localStorage.setItem(CHAVE_AJUSTES, JSON.stringify(ajustesSalvos));
    calibracaoAtiva = false;
    renderizar(lesoesAtuais);
    controles.querySelector("[data-ativar-calibracao]").textContent = "Posição salva · ajustar novamente";
  }

  function restaurarPadrao() {
    document.querySelectorAll('[data-camada-lesoes="coronal"] [data-ajuste-chave]').forEach(function (elemento) {
      delete ajustesTemporarios[elemento.dataset.ajusteChave];
      delete ajustesSalvos[elemento.dataset.ajusteChave];
    });
    localStorage.setItem(CHAVE_AJUSTES, JSON.stringify(ajustesSalvos));
    renderizar(lesoesAtuais);
    controles.querySelector("[data-coordenadas-calibracao]").textContent = "Posição padrão restaurada.";
    controles.querySelector("[data-ativar-calibracao]").textContent = "Ajustar posição";
  }

  function mostrarCoordenadas(chave) {
    const ajuste = ajustesTemporarios[chave] || {};
    const lesao = ajuste.lesao ? `Lesão: ${ajuste.lesao.x}%, ${ajuste.lesao.y}%` : "Lesão: posição padrão";
    const medida = ajuste.medida ? `Medida: ${ajuste.medida.x}%, ${ajuste.medida.y}%` : "Medida: posição padrão";
    controles.querySelector("[data-coordenadas-calibracao]").textContent = `${lesao} · ${medida}`;
  }

  function lerAjustesSalvos() {
    try {
      return JSON.parse(localStorage.getItem(CHAVE_AJUSTES) || "{}") || {};
    } catch (_erro) {
      return {};
    }
  }

  function numeroEntre(valor, minimo, maximo, padrao) {
    return typeof valor === "number" && valor >= minimo && valor <= maximo ? valor : padrao;
  }

  function arredondarCoordenada(valor) {
    return Math.round(valor * 10) / 10;
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

    if (!obterModelo(lesao)) {
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
      .map((valor) => valor.toLocaleString("pt-BR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 2,
      }));
    return medidas.length ? `${medidas.join(" × ")} cm` : "Medida não informada";
  }

  function capitalizar(texto) {
    return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : "";
  }
})();
