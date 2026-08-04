(function () {
  "use strict";

  const camadas = document.querySelectorAll("[data-camada-lesoes]");
  const lista = document.querySelector("[data-lista-lesoes-mapa]");
  const mapaCoronal = document.querySelector('[data-vista="coronal"]');

  if (!camadas.length || !lista) return;

  const CHAVE_AJUSTES = "endomapa:ajustes-anatomicos:v1";
  let calibracaoAtiva = false;
  let chaveAtiva = null;
  let lesoesAtuais = [];
  let ajustesSalvos = lerAjustesSalvos();
  let ajustesTemporarios = structuredClone(ajustesSalvos);
  const controles = criarControlesDeCalibracao();

  // Cada modelo visual é liberado somente para a combinação anatômica aprovada.
  // Isso impede reutilizar silenciosamente uma lesão uterossacra em outro órgão.
  const modelos = {
    "endometriose|ligamento uterossacro": {
      alongada: "assets/lesoes/endometriose-ligamento-original.png",
      arredondada: "assets/lesoes/endometriose-ligamento-arredondada-referencia.png",
    },
    "endometriose|região retrocervical": "assets/lesoes/endometriose-retrocervical-referencia.png",
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
        const ajusteLesao = ajustesTemporarios[chave]?.lesao;
        const ponto = aplicarAjusteAoPonto(pontoPadrao, ajusteLesao);
        if (!ponto) return;
        const elementoLesao = criarLesaoVisual(lesao, indice, ponto, modelo, ajusteLesao?.escala);
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
    const categoriaRecebida = normalizarTermo(lesao.categoria);
    const localizacaoRecebida = normalizarLocalizacao(lesao.localizacao);
    const chave = Object.keys(modelos).find(function (chaveModelo) {
      const [categoriaModelo, localizacaoModelo] = chaveModelo.split("|");
      return (
        normalizarTermo(categoriaModelo) === categoriaRecebida &&
        normalizarLocalizacao(localizacaoModelo) === localizacaoRecebida
      );
    });
    const modelo = chave ? modelos[chave] : null;
    if (!modelo) return null;
    if (typeof modelo === "string") return modelo;
    return medidasSaoAproximadamenteIguais(lesao) ? modelo.arredondada : modelo.alongada;
  }

  function obterPonto(vista, localizacao, lado) {
    const localizacaoRecebida = normalizarLocalizacao(localizacao);
    const chaveLocalizacao = Object.keys(posicoes[vista] || {}).find(function (localizacaoModelo) {
      return normalizarLocalizacao(localizacaoModelo) === localizacaoRecebida;
    });
    const configuracao = chaveLocalizacao ? posicoes[vista][chaveLocalizacao] : null;
    if (!configuracao) return null;
    if (typeof configuracao.x === "number") return configuracao;
    const ladoRecebido = normalizarTermo(lado);
    const chaveLado = Object.keys(configuracao).find(function (ladoModelo) {
      return normalizarTermo(ladoModelo) === ladoRecebido;
    });
    const coordenadas = configuracao[chaveLado] || configuracao.central;
    return coordenadas
      ? { x: coordenadas[0], y: coordenadas[1], rotacao: coordenadas[2] || 0 }
      : null;
  }

  // A IA e o banco podem devolver o mesmo termo com diferenÃ§as de maiÃºsculas,
  // acentos ou espaÃ§os invisÃ­veis. A comparaÃ§Ã£o visual nÃ£o pode falhar por isso.
  function normalizarTermo(valor) {
    return String(valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function normalizarLocalizacao(valor) {
    const localizacao = normalizarTermo(valor);
    if (localizacao === "retrocervical") return "regiao retrocervical";
    return localizacao;
  }

  function criarLesaoVisual(lesao, indice, ponto, modelo, escalaSalva) {
    const elemento = document.createElement("div");
    elemento.className = `lesao-no-mapa lesao-no-mapa--${lesao.categoria}`;
    elemento.style.left = `${ponto.x}%`;
    elemento.style.top = `${ponto.y}%`;
    const dimensoes = calcularDimensoes(lesao);
    const escala = numeroEntre(escalaSalva, 0.5, 2, 1);
    const rotacao = ponto.rotacao ?? ((indice % 5) * 7 - 14);
    elemento.dataset.larguraBase = dimensoes.largura;
    elemento.style.setProperty("--largura-lesao", `${dimensoes.largura * escala}%`);
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
      rotacao: numeroEntre(ajuste.rotacao, -180, 180, pontoPadrao.rotacao ?? 0),
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
    chaveAtiva = elemento.dataset.ajusteChave;
    sincronizarControles(chaveAtiva);
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
        <p class="calibracao-mapa__instrucao">Arraste a lesão e a medida separadamente com o dedo. Use os controles para girar e redimensionar.</p>
        <label class="calibracao-mapa__controle">
          <span>Girar lesão <strong data-valor-rotacao>0°</strong></span>
          <input type="range" min="-180" max="180" step="1" value="0" data-rotacao-calibracao />
        </label>
        <label class="calibracao-mapa__controle">
          <span>Tamanho visual <strong data-valor-escala>100%</strong></span>
          <input type="range" min="50" max="200" step="5" value="100" data-escala-calibracao />
        </label>
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
    painel.querySelector("[data-rotacao-calibracao]").addEventListener("input", ajustarRotacaoETamanho);
    painel.querySelector("[data-escala-calibracao]").addEventListener("input", ajustarRotacaoETamanho);
    painel.querySelector("[data-cancelar-calibracao]").addEventListener("click", function () {
      calibracaoAtiva = false;
      chaveAtiva = null;
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
    if (calibracaoAtiva && !chaveAtiva) {
      chaveAtiva = mapaCoronal.querySelector('[data-ajuste-tipo="lesao"]')?.dataset.ajusteChave || null;
    }
    sincronizarControles(chaveAtiva);
  }

  function salvarCalibracao() {
    ajustesSalvos = structuredClone(ajustesTemporarios);
    localStorage.setItem(CHAVE_AJUSTES, JSON.stringify(ajustesSalvos));
    calibracaoAtiva = false;
    chaveAtiva = null;
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

  function ajustarRotacaoETamanho() {
    if (!calibracaoAtiva || !chaveAtiva) return;
    const campoRotacao = controles.querySelector("[data-rotacao-calibracao]");
    const campoEscala = controles.querySelector("[data-escala-calibracao]");
    const rotacao = Number(campoRotacao.value);
    const escala = Number(campoEscala.value) / 100;
    ajustesTemporarios[chaveAtiva] ??= {};
    ajustesTemporarios[chaveAtiva].lesao ??= {};
    ajustesTemporarios[chaveAtiva].lesao.rotacao = rotacao;
    ajustesTemporarios[chaveAtiva].lesao.escala = escala;

    const elemento = Array.from(mapaCoronal.querySelectorAll('[data-ajuste-tipo="lesao"]'))
      .find((item) => item.dataset.ajusteChave === chaveAtiva);
    if (elemento) {
      const larguraBase = Number(elemento.dataset.larguraBase) || 10;
      elemento.style.setProperty("--rotacao-lesao", `${rotacao}deg`);
      elemento.style.setProperty("--largura-lesao", `${larguraBase * escala}%`);
    }
    sincronizarControles(chaveAtiva);
    mostrarCoordenadas(chaveAtiva);
  }

  function sincronizarControles(chave) {
    if (!controles) return;
    const campoRotacao = controles.querySelector("[data-rotacao-calibracao]");
    const campoEscala = controles.querySelector("[data-escala-calibracao]");
    const elemento = chave
      ? Array.from(mapaCoronal.querySelectorAll('[data-ajuste-tipo="lesao"]'))
        .find((item) => item.dataset.ajusteChave === chave)
      : null;
    const ajuste = chave ? ajustesTemporarios[chave]?.lesao : null;
    const rotacaoPadrao = elemento
      ? Number.parseFloat(elemento.style.getPropertyValue("--rotacao-lesao")) || 0
      : 0;
    const rotacao = numeroEntre(ajuste?.rotacao, -180, 180, rotacaoPadrao);
    const escala = numeroEntre(ajuste?.escala, 0.5, 2, 1);
    campoRotacao.value = String(rotacao);
    campoEscala.value = String(Math.round(escala * 100));
    campoRotacao.disabled = !chave;
    campoEscala.disabled = !chave;
    controles.querySelector("[data-valor-rotacao]").textContent = `${rotacao}°`;
    controles.querySelector("[data-valor-escala]").textContent = `${Math.round(escala * 100)}%`;
  }

  function mostrarCoordenadas(chave) {
    const ajuste = ajustesTemporarios[chave] || {};
    const lesao = ajuste.lesao ? `Lesão: ${ajuste.lesao.x}%, ${ajuste.lesao.y}%` : "Lesão: posição padrão";
    const medida = ajuste.medida ? `Medida: ${ajuste.medida.x}%, ${ajuste.medida.y}%` : "Medida: posição padrão";
    const rotacao = ajuste.lesao?.rotacao ?? "padrão";
    const tamanho = ajuste.lesao?.escala ? `${Math.round(ajuste.lesao.escala * 100)}%` : "padrão";
    controles.querySelector("[data-coordenadas-calibracao]").textContent = `${lesao} · ${medida} · Giro: ${rotacao}${typeof rotacao === "number" ? "°" : ""} · Tamanho: ${tamanho}`;
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

  function medidasSaoAproximadamenteIguais(lesao) {
    const medida1 = numeroPositivo(lesao.medida_1);
    const medida2 = numeroPositivo(lesao.medida_2);
    if (!medida1 || !medida2) return false;
    const proporcao = Math.max(medida1, medida2) / Math.min(medida1, medida2);
    return proporcao <= 1.4;
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
      aviso.textContent = lesao.categoria === "endometriose"
        && lesao.localizacao === "ligamento uterossacro"
        && medidasSaoAproximadamenteIguais(lesao)
        ? "Modelo arredondado ainda não aprovado: esta lesão não foi desenhada no mapa."
        : "Sem modelo visual aprovado: esta lesão não foi desenhada no mapa.";
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
