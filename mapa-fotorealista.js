(function () {
  "use strict";

  const clienteSupabase = window.endomapaSupabase;
  const secao = document.querySelector("[data-previa-fotorealista]");
  const botao = document.querySelector("[data-gerar-mapa-fotorealista]");
  const estado = document.querySelector("[data-estado-mapa-fotorealista]");
  const resultado = document.querySelector("[data-resultado-mapa-fotorealista]");
  const imagem = document.querySelector("[data-imagem-mapa-fotorealista]");

  if (!clienteSupabase || !secao || !botao || !estado || !resultado || !imagem) return;

  let mapaIdAtual = null;
  let lesaoAtual = null;
  let geracaoEmAndamento = false;

  window.addEventListener("endomapa:lesoes-confirmadas", function (evento) {
    const lesoes = Array.isArray(evento.detail?.lesoes) ? evento.detail.lesoes : [];
    mapaIdAtual = evento.detail?.mapaId || null;
    lesaoAtual = lesoes.find(function (lesao) {
      return lesao.categoria === "endometriose" &&
        lesao.localizacao === "ligamento uterossacro" &&
        (lesao.lado === "esquerdo" || lesao.lado === "direito") &&
        typeof lesao.medida_1 === "number" &&
        typeof lesao.medida_2 === "number";
    }) || null;

    secao.hidden = false;
    resultado.hidden = true;
    imagem.removeAttribute("src");

    if (!lesaoAtual) {
      botao.disabled = true;
      mostrarEstado("A prova fotorealista atual aceita somente endometriose no ligamento uterossacro com duas medidas.", true);
      return;
    }

    botao.disabled = false;
    mostrarEstado("Pronto para gerar uma cópia fotorealista desta lesão. A geração pode levar até dois minutos.", false);
  });

  botao.addEventListener("click", gerarPrevia);

  async function gerarPrevia() {
    if (geracaoEmAndamento || !mapaIdAtual || !lesaoAtual) return;

    geracaoEmAndamento = true;
    botao.disabled = true;
    botao.textContent = "Gerando imagem...";
    resultado.hidden = true;
    mostrarEstado("A IA está preservando o mapa e aplicando a lesão. Aguarde sem fechar esta tela...", false);

    try {
      const mascaraBase64 = await criarMascaraDaLesao(lesaoAtual);
      const { data, error } = await clienteSupabase.functions.invoke("gerar-mapa-fotorealista", {
        body: {
          mapa_id: mapaIdAtual,
          categoria: lesaoAtual.categoria,
          localizacao: lesaoAtual.localizacao,
          lado: lesaoAtual.lado,
          medida_1: lesaoAtual.medida_1,
          medida_2: lesaoAtual.medida_2,
          mascara_base64: mascaraBase64,
        },
      });

      if (error) {
        mostrarEstado(await traduzirErro(error), true);
        liberarBotao();
        return;
      }

      if (!data?.imagem_base64 || !data?.formato) {
        mostrarEstado("O servidor terminou sem devolver uma imagem válida. O mapa original continua preservado.", true);
        liberarBotao();
        return;
      }

      imagem.src = `data:${data.formato};base64,${data.imagem_base64}`;
      resultado.hidden = false;
      mostrarEstado(data.aviso || "Confira cuidadosamente esta prévia antes de aprovar.", false);
      botao.textContent = "Gerar outra prévia";
      botao.disabled = false;
      geracaoEmAndamento = false;
      resultado.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (_erro) {
      mostrarEstado("A comunicação falhou. O mapa original continua preservado e você pode tentar novamente.", true);
      liberarBotao();
    }
  }

  async function criarMascaraDaLesao(lesao) {
    const mapaBase = await carregarImagem("assets/mapa-base-coronal.png");
    const canvas = document.createElement("canvas");
    canvas.width = mapaBase.naturalWidth;
    canvas.height = mapaBase.naturalHeight;
    const contexto = canvas.getContext("2d");

    // O branco opaco preserva toda a anatomia. Somente a abertura transparente
    // pode ser editada pela IA. Estes pontos reproduzem a calibração médica já aprovada.
    contexto.fillStyle = "#ffffff";
    contexto.fillRect(0, 0, canvas.width, canvas.height);

    const esquerdaVisual = lesao.lado === "esquerdo";
    const centroX = canvas.width * (esquerdaVisual ? 0.43 : 0.57);
    const centroY = canvas.height * 0.54;
    const proporcao = Math.max(1, Math.min(5, lesao.medida_1 / lesao.medida_2));
    const largura = Math.max(canvas.width * 0.075, Math.min(canvas.width * 0.15, canvas.width * (0.065 + lesao.medida_1 * 0.035)));
    const altura = Math.max(canvas.height * 0.025, Math.min(canvas.height * 0.06, largura / proporcao));
    const rotacao = (esquerdaVisual ? -38 : 38) * Math.PI / 180;

    contexto.save();
    contexto.translate(centroX, centroY);
    contexto.rotate(rotacao);
    contexto.clearRect(-largura / 2, -altura / 2, largura, altura);
    contexto.restore();

    return canvas.toDataURL("image/png").split(",")[1];
  }

  function carregarImagem(caminho) {
    return new Promise(function (resolver, rejeitar) {
      const elemento = new Image();
      elemento.onload = function () { resolver(elemento); };
      elemento.onerror = function () { rejeitar(new Error("Mapa-base indisponível.")); };
      elemento.src = caminho;
    });
  }

  async function traduzirErro(error) {
    try {
      const corpo = await error.context?.json();
      if (corpo?.erro) return corpo.erro;
    } catch (_erro) {
      // A resposta pode já ter sido lida; usamos a mensagem segura abaixo.
    }
    return "Não foi possível gerar a prévia fotorealista. Tente novamente.";
  }

  function mostrarEstado(mensagem, erro) {
    estado.textContent = mensagem;
    estado.hidden = false;
    estado.classList.toggle("mensagem-formulario--erro", erro);
  }

  function liberarBotao() {
    geracaoEmAndamento = false;
    botao.disabled = false;
    botao.textContent = "Tentar gerar novamente";
  }
})();
