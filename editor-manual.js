(function () {
  "use strict";
  const camada = document.querySelector("[data-camada-editor]");
  const controles = document.querySelector("[data-controles-lesao]");
  const mensagem = document.querySelector("[data-mensagem-editor]");
  const giro = document.querySelector("[data-controle-giro]");
  const tamanho = document.querySelector("[data-controle-tamanho]");
  let selecionada = null;
  let proximoId = 1;
  if (!camada || !controles) return;

  document.querySelectorAll("[data-modelo]").forEach(function (botao) {
    botao.addEventListener("click", function () { adicionarLesao(botao.dataset.modelo, botao.dataset.nome); });
  });
  giro.addEventListener("input", aplicarControles);
  tamanho.addEventListener("input", aplicarControles);
  document.querySelector("[data-remover-lesao]").addEventListener("click", removerSelecionada);
  document.querySelector("[data-limpar-mapa]").addEventListener("click", limparMapa);

  function adicionarLesao(src, nome) {
    const lesao = document.createElement("button");
    const deslocamento = ((proximoId - 1) % 5) * 3;
    lesao.type = "button";
    lesao.className = "lesao-editavel";
    lesao.dataset.id = String(proximoId++);
    lesao.dataset.nome = nome;
    lesao.dataset.x = String(44 + deslocamento);
    lesao.dataset.y = String(45 + deslocamento);
    lesao.dataset.giro = "0";
    lesao.dataset.tamanho = "100";
    lesao.setAttribute("aria-label", `${nome}. Arraste para mover.`);
    lesao.innerHTML = `<img src="${src}" alt="" draggable="false" />`;
    lesao.addEventListener("pointerdown", iniciarMovimento);
    lesao.addEventListener("click", function () { selecionar(lesao); });
    atualizarVisual(lesao);
    camada.append(lesao);
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
    atualizarVisual(selecionada);
    atualizarValoresControles();
  }

  function atualizarVisual(lesao) {
    lesao.style.left = `${lesao.dataset.x}%`;
    lesao.style.top = `${lesao.dataset.y}%`;
    lesao.style.setProperty("--giro-editor", `${lesao.dataset.giro}deg`);
    lesao.style.setProperty("--tamanho-editor", Number(lesao.dataset.tamanho) / 100);
  }

  function atualizarValoresControles() {
    document.querySelector("[data-valor-giro]").textContent = `${giro.value}°`;
    document.querySelector("[data-valor-tamanho]").textContent = `${tamanho.value}%`;
  }

  function removerSelecionada() {
    if (!selecionada) return;
    const nome = selecionada.dataset.nome;
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
})();
