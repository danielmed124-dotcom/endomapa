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
  telas.forEach((tela) => {
    tela.hidden = tela.dataset.tela !== nomeDaTela;
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function aplicarMedico(nomeDoMedico, modoVisitante) {
  const primeiroNome = modoVisitante
    ? ""
    : nomeDoMedico.replace(/^Dr(a)?\.\s*/, "").trim().split(/\s+/)[0];

  destinosDoNome.forEach((destino) => {
    destino.textContent = modoVisitante ? "Médico visitante" : nomeDoMedico;
  });

  linhasDeIdentificacao.forEach((linha) => {
    linha.hidden = modoVisitante;
  });

  identificacoesDaClinica.forEach((identificacao) => {
    identificacao.hidden = modoVisitante;
  });

  mapasBase.forEach((mapa) => {
    mapa.src = modoVisitante ? mapa.dataset.srcVisitante : mapa.dataset.srcClinica;
  });

  const desenharAssinatura = (assinatura) => {
    assinatura.replaceChildren();
    assinatura.hidden = modoVisitante;

    if (modoVisitante || !primeiroNome) return;

    const inicial = document.createElement("span");
    inicial.className = "assinatura__inicial";
    inicial.textContent = primeiroNome.charAt(0);

    const restante = document.createElement("span");
    restante.className = "assinatura__restante";
    restante.textContent = primeiroNome.slice(1);

    assinatura.append(inicial, restante);
  };

  assinaturasDosMapas.forEach(desenharAssinatura);

  if (assinaturaFinal) {
    desenharAssinatura(assinaturaFinal);
  }
}

function aplicarVistas() {
  const vistaSelecionada = document.querySelector('input[name="vistas"]:checked')?.value || "ambas";

  imagensPorVista.forEach((imagem) => {
    imagem.hidden = vistaSelecionada !== "ambas" && imagem.dataset.vista !== vistaSelecionada;
  });
}

document.querySelectorAll("[data-tela-alvo]").forEach((elemento) => {
  elemento.addEventListener("click", () => {
    if (elemento.hasAttribute("data-modo-visitante")) {
      aplicarMedico("", true);
    } else if (elemento.hasAttribute("data-escolher-medico")) {
      const medicoSelecionado = document.querySelector('input[name="medico_id"]:checked');
      const nomeDoMedico = medicoSelecionado?.closest(".opcao-medico")?.querySelector(".opcao-medico__nome")?.textContent;

      if (nomeDoMedico) {
        aplicarMedico(nomeDoMedico, false);
      }
    }

    aplicarVistas();
    abrirTela(elemento.dataset.telaAlvo);
  });
});
