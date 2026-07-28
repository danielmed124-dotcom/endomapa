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
    aplicarVistas();
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
  aplicarVistas();
  abrirTela("revisao");
});
