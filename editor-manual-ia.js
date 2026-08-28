(function () {
  "use strict";
  const botao = document.querySelector("[data-gerar-realista]");
  const estado = document.querySelector("[data-estado-realista]");
  const resultado = document.querySelector("[data-resultado-realista]");
  const original = document.querySelector("[data-imagem-original]");
  const realista = document.querySelector("[data-imagem-realista]");
  if (!botao || !window.supabase || !window.ENDOMAPA_SUPABASE) return;

  const cliente = window.supabase.createClient(
    window.ENDOMAPA_SUPABASE.projectUrl,
    window.ENDOMAPA_SUPABASE.publicAnonKey,
  );
  let gerando = false;
  botao.addEventListener("click", gerar);

  async function gerar() {
    if (gerando) return;
    if (!document.querySelector(".lesao-editavel")) {
      mostrar("Adicione pelo menos uma lesão antes de gerar a versão realista.", true);
      return;
    }
    if (window.location.protocol === "file:") {
      mostrar("A geração com IA funciona somente na página publicada e com sua conta conectada. O editor local continua disponível para montagem.", true);
      return;
    }
    const { data: sessao } = await cliente.auth.getSession();
    if (!sessao.session) {
      mostrar("Entre na sua conta do Endomapa antes de usar a geração com IA.", true);
      return;
    }
    gerando = true;
    botao.disabled = true;
    botao.textContent = "Gerando versão realista...";
    resultado.hidden = true;
    mostrar("O Gemini está trabalhando sobre uma cópia. Isso pode levar até dois minutos.", false);
    try {
      const composicao = await window.endomapaCapturarMapaManual();
      original.src = composicao;
      const { data, error } = await cliente.functions.invoke("finalizar-mapa-manual-gemini", {
        body: { composicao_base64: composicao.split(",")[1] },
      });
      if (error) throw new Error(await traduzirErro(error));
      if (!data?.imagem_base64) throw new Error("O Gemini terminou sem devolver uma imagem.");
      realista.src = `data:${data.formato || "image/jpeg"};base64,${data.imagem_base64}`;
      resultado.hidden = false;
      mostrar(data.aviso || "Compare cuidadosamente as duas imagens.", false);
      resultado.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (erro) {
      mostrar(erro.message || "Não foi possível gerar a versão realista.", true);
    } finally {
      gerando = false;
      botao.disabled = false;
      botao.textContent = "Gerar outra versão realista com Gemini";
    }
  }

  async function traduzirErro(erro) {
    try {
      const corpo = await erro.context?.json();
      if (corpo?.erro) return corpo.erro;
    } catch (_erro) {}
    return "Não foi possível gerar a versão realista.";
  }

  function mostrar(texto, erro) {
    estado.textContent = texto;
    estado.hidden = false;
    estado.classList.toggle("mensagem-formulario--erro", erro);
  }
})();
