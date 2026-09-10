(function () {
  "use strict";
  const camada = document.querySelector("[data-camada-editor]");
  const controles = document.querySelector("[data-controles-lesao]");
  const mensagem = document.querySelector("[data-mensagem-editor]");
  const giro = document.querySelector("[data-controle-giro]");
  const tamanho = document.querySelector("[data-controle-tamanho]");
  const eixoX = document.querySelector("[data-controle-eixo-x]");
  const eixoY = document.querySelector("[data-controle-eixo-y]");
  const nomeNoMapa = document.querySelector("[data-controle-nome-lesao]");
  let selecionada = null;
  let proximoId = 1;
  if (!camada || !controles) return;

  document.querySelectorAll("[data-modelo]").forEach(function (botao) {
    botao.addEventListener("click", function () {
      adicionarLesao(botao.dataset.modelo, botao.dataset.nome, botao.dataset.proporcao, botao.dataset.semRecorte);
    });
  });
  giro.addEventListener("input", aplicarControles);
  tamanho.addEventListener("input", aplicarControles);
  eixoX.addEventListener("input", aplicarControles);
  eixoY.addEventListener("input", aplicarControles);
  nomeNoMapa.addEventListener("input", function () {
    if (!selecionada) return;
    selecionada.dataset.nomeNoMapa = nomeNoMapa.value;
    atualizarRotuloDeMedidas(selecionada);
  });
  document.querySelectorAll("[data-medida]").forEach(function (campo) {
    campo.addEventListener("input", aplicarMedidas);
  });
  document.querySelectorAll("[data-girar]").forEach(function (botao) {
    botao.addEventListener("click", function () {
      alterarGiro(Number(botao.dataset.girar));
    });
  });
  document.querySelectorAll("[data-redimensionar]").forEach(function (botao) {
    botao.addEventListener("click", function () {
      alterarTamanho(Number(botao.dataset.redimensionar));
    });
  });
  document.querySelector("[data-remover-lesao]").addEventListener("click", removerSelecionada);
  document.querySelector("[data-limpar-mapa]").addEventListener("click", limparMapa);
  window.addEventListener("resize", atualizarTodasAsLinhas);
  window.endomapaCapturarMapaManual = capturarMapa;

  function adicionarLesao(src, nome, proporcao = "1.8", semRecorte = "false") {
    const lesao = document.createElement("button");
    const deslocamento = ((proximoId - 1) % 5) * 3;
    lesao.type = "button";
    lesao.className = "lesao-editavel";
    lesao.dataset.id = String(proximoId++);
    lesao.dataset.nome = nome;
    lesao.dataset.nomeNoMapa = "";
    lesao.dataset.proporcao = proporcao;
    lesao.dataset.semRecorte = semRecorte;
    lesao.dataset.x = String(44 + deslocamento);
    lesao.dataset.y = String(45 + deslocamento);
    lesao.dataset.giro = "0";
    lesao.dataset.tamanho = "100";
    lesao.dataset.eixoX = "100";
    lesao.dataset.eixoY = "100";
    lesao.dataset.medida1 = "";
    lesao.dataset.medida2 = "";
    lesao.dataset.medida3 = "";
    lesao.dataset.medidaX = String(56 + deslocamento);
    lesao.dataset.medidaY = String(52 + deslocamento);
    lesao.setAttribute("aria-label", `${nome}. Arraste para mover.`);
    lesao.style.setProperty("--proporcao-lesao", proporcao);
    lesao.classList.toggle("lesao-editavel--sem-recorte", semRecorte === "true");
    lesao.innerHTML = `<img src="${src}" alt="" draggable="false" />`;
    lesao.addEventListener("pointerdown", iniciarMovimento);
    lesao.addEventListener("click", function () { selecionar(lesao); });
    atualizarVisual(lesao);
    camada.append(lesao);
    criarRotuloDeMedidas(lesao);
    selecionar(lesao);
    mostrar(`${nome} adicionada. Arraste a imagem para posicioná-la.`);
  }

  function selecionar(lesao) {
    camada.querySelectorAll(".lesao-editavel").forEach(function (item) {
      item.classList.toggle("lesao-editavel--selecionada", item === lesao);
    });
    selecionada = lesao;
    controles.hidden = false;
    giro.value = lesao.dataset.giro;
    tamanho.value = lesao.dataset.tamanho;
    eixoX.value = lesao.dataset.eixoX;
    eixoY.value = lesao.dataset.eixoY;
    nomeNoMapa.value = lesao.dataset.nomeNoMapa || "";
    document.querySelectorAll("[data-medida]").forEach(function (campo) {
      campo.value = lesao.dataset[`medida${campo.dataset.medida}`] || "";
    });
    document.querySelector("[data-nome-lesao]").textContent = lesao.dataset.nome;
    atualizarValoresControles();
  }

  function iniciarMovimento(evento) {
    const lesao = evento.currentTarget;
    selecionar(lesao);
    evento.preventDefault();
    lesao.setPointerCapture(evento.pointerId);
    const mover = function (movimento) {
      const area = camada.getBoundingClientRect();
      lesao.dataset.x = limitar(((movimento.clientX - area.left) / area.width) * 100, 3, 97).toFixed(1);
      lesao.dataset.y = limitar(((movimento.clientY - area.top) / area.height) * 100, 3, 97).toFixed(1);
      atualizarVisual(lesao);
      atualizarRotuloDeMedidas(lesao);
    };
    const terminar = function () {
      lesao.removeEventListener("pointermove", mover);
      lesao.removeEventListener("pointerup", terminar);
      lesao.removeEventListener("pointercancel", terminar);
    };
    lesao.addEventListener("pointermove", mover);
    lesao.addEventListener("pointerup", terminar);
    lesao.addEventListener("pointercancel", terminar);
  }

  function aplicarControles() {
    if (!selecionada) return;
    selecionada.dataset.giro = giro.value;
    selecionada.dataset.tamanho = tamanho.value;
    selecionada.dataset.eixoX = eixoX.value;
    selecionada.dataset.eixoY = eixoY.value;
    atualizarVisual(selecionada);
    atualizarValoresControles();
  }

  function alterarGiro(passo) {
    if (!selecionada) return;
    giro.value = String(limitar(Number(giro.value) + passo, -180, 180));
    aplicarControles();
  }

  function alterarTamanho(passo) {
    if (!selecionada) return;
    tamanho.value = String(limitar(Number(tamanho.value) + passo, 40, 250));
    aplicarControles();
  }

  function aplicarMedidas(evento) {
    if (!selecionada) return;
    const campo = evento.currentTarget;
    campo.value = limparMedida(campo.value);
    selecionada.dataset[`medida${campo.dataset.medida}`] = campo.value;
    atualizarRotuloDeMedidas(selecionada);
  }

  function criarRotuloDeMedidas(lesao) {
    const linha = document.createElement("span");
    linha.className = "linha-medida-editavel";
    linha.dataset.linhaId = lesao.dataset.id;
    linha.hidden = true;
    const rotulo = document.createElement("span");
    rotulo.className = "medida-lesao-editavel";
    rotulo.dataset.medidaId = lesao.dataset.id;
    rotulo.hidden = true;
    rotulo.setAttribute("aria-label", "Arraste para mover o nome e as medidas");
    rotulo.addEventListener("pointerdown", iniciarMovimentoDaMedida);
    camada.append(linha, rotulo);
    atualizarRotuloDeMedidas(lesao);
  }

  function atualizarRotuloDeMedidas(lesao) {
    const rotulo = camada.querySelector(`[data-medida-id="${lesao.dataset.id}"]`);
    if (!rotulo) return;
    const linhas = linhasDoRotulo(lesao);
    rotulo.textContent = linhas.join("\n");
    rotulo.hidden = !linhas.length;
    rotulo.style.left = `${lesao.dataset.medidaX}%`;
    rotulo.style.top = `${lesao.dataset.medidaY}%`;
    atualizarLinhaDeMedida(lesao, Boolean(linhas.length));
  }

  function linhasDoRotulo(lesao) {
    const nome = (lesao.dataset.nomeNoMapa || "").trim();
    const valores = [lesao.dataset.medida1, lesao.dataset.medida2, lesao.dataset.medida3]
      .filter(Boolean).map(formatarMedida);
    return [nome, valores.length ? `${valores.join(" × ")} cm` : ""].filter(Boolean);
  }

  function iniciarMovimentoDaMedida(evento) {
    const rotulo = evento.currentTarget;
    const lesao = camada.querySelector(`[data-id="${rotulo.dataset.medidaId}"]`);
    if (!lesao) return;
    selecionar(lesao);
    evento.preventDefault();
    rotulo.setPointerCapture(evento.pointerId);
    const mover = function (movimento) {
      const area = camada.getBoundingClientRect();
      lesao.dataset.medidaX = limitar(((movimento.clientX - area.left) / area.width) * 100, 4, 96).toFixed(1);
      lesao.dataset.medidaY = limitar(((movimento.clientY - area.top) / area.height) * 100, 4, 96).toFixed(1);
      atualizarRotuloDeMedidas(lesao);
    };
    const terminar = function () {
      rotulo.removeEventListener("pointermove", mover);
      rotulo.removeEventListener("pointerup", terminar);
      rotulo.removeEventListener("pointercancel", terminar);
    };
    rotulo.addEventListener("pointermove", mover);
    rotulo.addEventListener("pointerup", terminar);
    rotulo.addEventListener("pointercancel", terminar);
  }

  function atualizarLinhaDeMedida(lesao, visivel) {
    const linha = camada.querySelector(`[data-linha-id="${lesao.dataset.id}"]`);
    if (!linha) return;
    linha.hidden = !visivel;
    if (!visivel) return;
    const area = camada.getBoundingClientRect();
    const inicioX = area.width * Number(lesao.dataset.x) / 100;
    const inicioY = area.height * Number(lesao.dataset.y) / 100;
    const fimX = area.width * Number(lesao.dataset.medidaX) / 100;
    const fimY = area.height * Number(lesao.dataset.medidaY) / 100;
    const distancia = Math.hypot(fimX - inicioX, fimY - inicioY);
    const angulo = Math.atan2(fimY - inicioY, fimX - inicioX) * 180 / Math.PI;
    linha.style.left = `${inicioX}px`;
    linha.style.top = `${inicioY}px`;
    linha.style.width = `${distancia}px`;
    linha.style.transform = `rotate(${angulo}deg)`;
  }

  function atualizarTodasAsLinhas() {
    camada.querySelectorAll(".lesao-editavel").forEach(function (lesao) {
      atualizarRotuloDeMedidas(lesao);
    });
  }

  function limparMedida(valor) {
    const partes = String(valor).replace(".", ",").replace(/[^0-9,]/g, "").split(",");
    return partes.length > 1 ? `${partes.shift()},${partes.join("").slice(0, 2)}` : partes[0];
  }

  function formatarMedida(valor) {
    const numero = Number(String(valor).replace(",", "."));
    if (!Number.isFinite(numero)) return valor;
    return numero.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  }

  function atualizarVisual(lesao) {
    lesao.style.left = `${lesao.dataset.x}%`;
    lesao.style.top = `${lesao.dataset.y}%`;
    lesao.style.setProperty("--giro-editor", `${lesao.dataset.giro}deg`);
    lesao.style.setProperty("--tamanho-editor", Number(lesao.dataset.tamanho) / 100);
    lesao.style.setProperty("--escala-x-editor", Number(lesao.dataset.eixoX) / 100);
    lesao.style.setProperty("--escala-y-editor", Number(lesao.dataset.eixoY) / 100);
  }

  function atualizarValoresControles() {
    document.querySelector("[data-valor-giro]").textContent = `${giro.value}°`;
    document.querySelector("[data-valor-tamanho]").textContent = `${tamanho.value}%`;
    document.querySelector("[data-valor-eixo-x]").textContent = `${eixoX.value}%`;
    document.querySelector("[data-valor-eixo-y]").textContent = `${eixoY.value}%`;
  }

  function removerSelecionada() {
    if (!selecionada) return;
    const nome = selecionada.dataset.nome;
    camada.querySelector(`[data-medida-id="${selecionada.dataset.id}"]`)?.remove();
    camada.querySelector(`[data-linha-id="${selecionada.dataset.id}"]`)?.remove();
    selecionada.remove();
    selecionada = null;
    controles.hidden = true;
    mostrar(`${nome} excluída do mapa.`);
  }

  function limparMapa() {
    camada.replaceChildren();
    selecionada = null;
    controles.hidden = true;
    mostrar("Mapa limpo. Escolha uma lesão para começar novamente.");
  }

  function mostrar(texto) { mensagem.textContent = texto; }
  function limitar(valor, minimo, maximo) { return Math.min(maximo, Math.max(minimo, valor)); }

  async function capturarMapa() {
    const base = await carregarImagem("assets/mapa-base-coronal.png");
    const canvas = document.createElement("canvas");
    canvas.width = base.naturalWidth;
    canvas.height = base.naturalHeight;
    const contexto = canvas.getContext("2d");
    contexto.drawImage(base, 0, 0, canvas.width, canvas.height);

    for (const lesao of camada.querySelectorAll(".lesao-editavel")) {
      const imagem = await carregarImagem(lesao.querySelector("img").src);
      const x = canvas.width * Number(lesao.dataset.x) / 100;
      const y = canvas.height * Number(lesao.dataset.y) / 100;
      const tamanhoGeral = Number(lesao.dataset.tamanho) / 100;
      const largura = canvas.width * 0.13 * tamanhoGeral * Number(lesao.dataset.eixoX) / 100;
      const altura = canvas.width * 0.13 / Number(lesao.dataset.proporcao || 1.8) * tamanhoGeral * Number(lesao.dataset.eixoY) / 100;
      contexto.save();
      contexto.translate(x, y);
      contexto.rotate(Number(lesao.dataset.giro) * Math.PI / 180);
      if (lesao.dataset.semRecorte !== "true") {
        contexto.beginPath();
        contexto.ellipse(0, 0, largura / 2, altura / 2, 0, 0, Math.PI * 2);
        contexto.clip();
      }
      contexto.drawImage(imagem, -largura / 2, -altura / 2, largura, altura);
      contexto.restore();
    }

    contexto.strokeStyle = "#000";
    contexto.fillStyle = "#000";
    contexto.lineWidth = Math.max(1.5, canvas.width / 700);
    contexto.font = `700 ${Math.max(15, canvas.width / 58)}px Arial`;
    contexto.textAlign = "center";
    contexto.textBaseline = "middle";
    for (const lesao of camada.querySelectorAll(".lesao-editavel")) {
      const linhas = linhasDoRotulo(lesao);
      if (!linhas.length) continue;
      const inicioX = canvas.width * Number(lesao.dataset.x) / 100;
      const inicioY = canvas.height * Number(lesao.dataset.y) / 100;
      const fimX = canvas.width * Number(lesao.dataset.medidaX) / 100;
      const fimY = canvas.height * Number(lesao.dataset.medidaY) / 100;
      contexto.beginPath();
      contexto.moveTo(inicioX, inicioY);
      contexto.lineTo(fimX, fimY);
      contexto.stroke();
      contexto.beginPath();
      contexto.arc(inicioX, inicioY, 3, 0, Math.PI * 2);
      contexto.fill();
      const alturaLinha = Math.max(15, canvas.width / 58) * 1.15;
      const larguraTexto = Math.max(...linhas.map((texto) => contexto.measureText(texto).width)) + 12;
      contexto.fillStyle = "rgba(255,255,255,0.9)";
      contexto.fillRect(fimX - larguraTexto / 2, fimY, larguraTexto, alturaLinha * linhas.length + 4);
      contexto.fillStyle = "#7c1919";
      linhas.forEach((texto, indice) => {
        contexto.fillText(texto, fimX, fimY + 2 + alturaLinha * (indice + 0.5));
      });
      contexto.fillStyle = "#000";
    }
    return canvas.toDataURL("image/jpeg", 0.9);
  }

  function carregarImagem(src) {
    return new Promise(function (resolver, rejeitar) {
      const imagem = new Image();
      imagem.onload = function () { resolver(imagem); };
      imagem.onerror = function () { rejeitar(new Error("Uma imagem do mapa não pôde ser carregada.")); };
      imagem.src = src;
    });
  }
})();
