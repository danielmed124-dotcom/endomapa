const aviso = document.querySelector("[data-aviso]");
let temporizadorDoAviso;

function mostrarAviso(mensagem) {
  if (!aviso) return;

  aviso.textContent = mensagem;
  aviso.hidden = false;
  clearTimeout(temporizadorDoAviso);

  temporizadorDoAviso = setTimeout(() => {
    aviso.hidden = true;
  }, 4200);
}

document.querySelectorAll("[data-mensagem]").forEach((elemento) => {
  elemento.addEventListener("click", () => {
    mostrarAviso(elemento.dataset.mensagem);
  });
});

const telas = document.querySelectorAll("[data-tela]");
const destinosDoNome = document.querySelectorAll("[data-medico-selecionado]");
const linhasDeIdentificacao = document.querySelectorAll("[data-identificacao-medico]");
const assinaturasDosMapas = document.querySelectorAll("[data-assinatura-mapa]");
const assinaturaFinal = document.querySelector("[data-assinatura-final]");
const imagensPorVista = document.querySelectorAll("[data-vista]");
const mapasBase = document.querySelectorAll("[data-mapa-base]");
const identificacoesDaClinica = document.querySelectorAll("[data-identificacao-clinica]");

function abrirTela(nomeDaTela) {
  if (!Array.from(telas).some((tela) => tela.dataset.tela === nomeDaTela)) return;
  aplicarVistas();
  telas.forEach((tela) => {
    tela.hidden = tela.dataset.tela !== nomeDaTela;
  });

  document.querySelectorAll(".navegacao [data-tela-alvo]").forEach((botao) => {
    if (botao.dataset.telaAlvo === nomeDaTela) botao.setAttribute("aria-current", "page");
    else botao.removeAttribute("aria-current");
  });
  if (nomeDaTela === "editor-manual" || window.location.hash === "#editor-manual") {
    const fragmento = nomeDaTela === "editor-manual" ? "#editor-manual" : "";
    window.history.replaceState(null, "", window.location.pathname + window.location.search + fragmento);
  }
  window.dispatchEvent(new CustomEvent("endomapa:tela-aberta", { detail: nomeDaTela }));

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Permite que mapas carregados do banco reabram a revisão após um novo login.
window.endomapaAbrirTela = abrirTela;

function aplicarPerfilMedico(perfil) {
  const nomeDoMedico = `${perfil.titulo} ${perfil.nome}`;
  const primeiroNome = perfil.assinatura || perfil.nome.trim().split(/\s+/)[0];
  const usarIdentidadeCentrus = Boolean(perfil.clinica_id);

  document.body.dataset.medicoId = perfil.id;

  destinosDoNome.forEach((destino) => {
    destino.textContent = nomeDoMedico;
  });

  linhasDeIdentificacao.forEach((linha) => {
    linha.hidden = false;
  });

  identificacoesDaClinica.forEach((identificacao) => {
    identificacao.hidden = !usarIdentidadeCentrus;
  });

  mapasBase.forEach((mapa) => {
    mapa.src = usarIdentidadeCentrus ? mapa.dataset.srcClinica : mapa.dataset.srcVisitante;
  });

  const desenharAssinatura = (assinatura) => {
    assinatura.replaceChildren();
    assinatura.hidden = !primeiroNome;

    if (!primeiroNome) return;

    const inicial = document.createElement("span");
    inicial.className = "assinatura__inicial";
    inicial.textContent = primeiroNome.charAt(0);

    const restante = document.createElement("span");
    restante.className = "assinatura__restante";
    restante.textContent = primeiroNome.slice(1);

    assinatura.append(inicial, restante);
  };

  assinaturasDosMapas.forEach(desenharAssinatura);

  document.querySelectorAll("[data-assinatura-manual]").forEach((canvas) => {
    desenharAssinaturaManual(canvas, primeiroNome);
  });

  if (assinaturaFinal) {
    desenharAssinatura(assinaturaFinal);
  }
}

// A mesma assinatura desenhada na tela é copiada para o PNG e para o PDF.
function desenharAssinaturaManual(canvas, nome) {
  const contexto = canvas.getContext("2d");
  contexto.clearRect(0, 0, canvas.width, canvas.height);
  canvas.hidden = !nome;
  canvas.setAttribute("aria-label", `Assinatura: ${nome}`);
  if (!nome) return;

  contexto.save();
  contexto.translate(canvas.width * 0.06, canvas.height * 0.94);
  contexto.rotate(-3 * Math.PI / 180);
  contexto.fillStyle = "rgba(161, 111, 32, 0.62)";
  const fonte = '"Segoe Script", "Lucida Handwriting", "Brush Script MT", cursive';
  contexto.font = `italic 49px ${fonte}`;
  const larguraInicial = contexto.measureText(nome.charAt(0)).width - 6;
  contexto.font = `italic 28px ${fonte}`;
  const largura = larguraInicial + contexto.measureText(nome.slice(1)).width;
  const escala = Math.min(1, canvas.width * 0.6 / Math.max(largura, 1));
  contexto.scale(escala, escala);
  contexto.font = `italic 49px ${fonte}`;
  contexto.fillText(nome.charAt(0), 0, 0);
  contexto.font = `italic 28px ${fonte}`;
  contexto.fillText(nome.slice(1), larguraInicial, 0);
  const traco = contexto.createLinearGradient(0, 0, largura * 1.28, 0);
  traco.addColorStop(0, "rgba(161, 111, 32, 0.58)");
  traco.addColorStop(0.72, "rgba(161, 111, 32, 0.5)");
  traco.addColorStop(1, "rgba(161, 111, 32, 0)");
  contexto.strokeStyle = traco;
  contexto.lineWidth = 2;
  contexto.beginPath();
  contexto.moveTo(largura * 0.08, 10);
  contexto.lineTo(largura * 1.28, 5);
  contexto.stroke();
  contexto.restore();
}

function aplicarVistas() {
  const vistaSelecionada = document.querySelector('input[name="vistas-editor"]:checked')?.value || "ambas";

  imagensPorVista.forEach((imagem) => {
    imagem.hidden = vistaSelecionada !== "ambas" && imagem.dataset.vista !== vistaSelecionada;
  });
  document.querySelectorAll('input[name="vistas-editor"]').forEach((campo) => {
    campo.checked = campo.value === vistaSelecionada;
  });
  window.dispatchEvent(new CustomEvent("endomapa:vistas-alteradas", { detail: vistaSelecionada }));
}

document.querySelectorAll('input[name="vistas-editor"]').forEach((campo) => {
  campo.addEventListener("change", aplicarVistas);
});
document.querySelector('[data-mapa-especial]')?.addEventListener('change', () => {
  document.querySelector('input[name="vistas-editor"][value="especiais"]').checked = true;
  aplicarVistas();
});
document.querySelectorAll("[data-tela-alvo]").forEach((elemento) => {
  elemento.addEventListener("click", () => {
    abrirTela(elemento.dataset.telaAlvo);
  });
});

window.addEventListener("endomapa:perfil-carregado", (evento) => {
  aplicarPerfilMedico(evento.detail);
});

if (window.endomapaMedico) {
  aplicarPerfilMedico(window.endomapaMedico);
}

window.addEventListener("endomapa:lesoes-confirmadas", () => {
  abrirTela("revisao");
});

if (window.location.hash === "#editor-manual") {
  abrirTela("editor-manual");
}
