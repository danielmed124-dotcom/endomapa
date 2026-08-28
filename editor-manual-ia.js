(function () {
  "use strict";
  const botoes = document.querySelectorAll("[data-gerar-realista]");
  const resultado = document.querySelector("[data-resultado-realista]");
  const original = document.querySelector("[data-imagem-original]");
  const resultadoGemini = document.querySelector("[data-resultado-gemini]");
  const realista = document.querySelector("[data-imagem-realista]");
  const resultadoGpt = document.querySelector("[data-resultado-gpt]");
  const imagemGpt = document.querySelector("[data-imagem-gpt]");
  const resultadoGptReferencias = document.querySelector("[data-resultado-gpt-referencias]");
  const imagemGptReferencias = document.querySelector("[data-imagem-gpt-referencias]");
  if (!botoes.length || !window.supabase || !window.ENDOMAPA_SUPABASE) return;

  const cliente = window.supabase.createClient(
    window.ENDOMAPA_SUPABASE.projectUrl,
    window.ENDOMAPA_SUPABASE.publicAnonKey,
  );
  const gerando = { gemini: false, gpt: false, "gpt-referencias": false };
  botoes.forEach((botao) => botao.addEventListener("click", () => gerar(botao.dataset.gerarRealista, botao)));

  async function gerar(provedor, botao) {
    if (!["gemini", "gpt", "gpt-referencias"].includes(provedor) || gerando[provedor]) return;
    const estado = document.querySelector(`[data-estado-realista="${provedor}"]`);
    const nomeProvedor = provedor === "gemini" ? "Gemini" : provedor === "gpt" ? "GPT" : "GPT com referências";
    if (!document.querySelector(".lesao-editavel")) {
      mostrar(estado, "Adicione pelo menos uma lesão antes de gerar a versão realista.", true);
      return;
    }
    if (window.location.protocol === "file:") {
      mostrar(estado, "A geração com IA funciona somente na página publicada e com sua conta conectada. O editor local continua disponível para montagem.", true);
      return;
    }
    const { data: sessao } = await cliente.auth.getSession();
    if (!sessao.session) {
      mostrar(estado, "Entre na sua conta do Endomapa antes de usar a geração com IA.", true);
      return;
    }
    gerando[provedor] = true;
    botao.disabled = true;
    botao.textContent = `Gerando com ${nomeProvedor}...`;
    mostrar(estado, `O ${nomeProvedor} está trabalhando sobre uma cópia. Isso pode levar até dois minutos.`, false);
    try {
      const composicao = await window.endomapaCapturarMapaManual();
      original.src = composicao;
      const funcoes = {
        gemini: "finalizar-mapa-manual-gemini",
        gpt: "finalizar-mapa-manual-gpt",
        "gpt-referencias": "finalizar-mapa-manual-gpt-referencias",
      };
      const tiposLesao = [...new Set([...document.querySelectorAll(".lesao-editavel")].map((item) => item.dataset.nome))];
      const funcao = funcoes[provedor];
      const { data, error } = await cliente.functions.invoke(funcao, {
        body: { composicao_base64: composicao.split(",")[1], tipos_lesao: tiposLesao },
      });
      if (error) throw new Error(await traduzirErro(error));
      if (!data?.imagem_base64) throw new Error(`O ${nomeProvedor} terminou sem devolver uma imagem.`);
      if (provedor === "gpt-referencias") {
        imagemGptReferencias.src = `data:${data.formato || "image/webp"};base64,${data.imagem_base64}`;
        resultadoGptReferencias.hidden = false;
      } else if (provedor === "gpt") {
        imagemGpt.src = `data:${data.formato || "image/webp"};base64,${data.imagem_base64}`;
        resultadoGpt.hidden = false;
      } else {
        realista.src = `data:${data.formato || "image/jpeg"};base64,${data.imagem_base64}`;
        resultadoGemini.hidden = false;
      }
      resultado.hidden = false;
      mostrar(estado, data.aviso || "Compare cuidadosamente as imagens.", false);
      resultado.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (erro) {
      mostrar(estado, erro.message || "Não foi possível gerar a versão realista.", true);
    } finally {
      gerando[provedor] = false;
      botao.disabled = false;
      botao.textContent = `Gerar outra versão com ${nomeProvedor}`;
    }
  }

  async function traduzirErro(erro) {
    try {
      const corpo = await erro.context?.json();
      if (corpo?.erro) return corpo.erro;
    } catch (_erro) {}
    return "Não foi possível gerar a versão realista.";
  }

  function mostrar(estado, texto, erro) {
    estado.textContent = texto;
    estado.hidden = false;
    estado.classList.toggle("mensagem-formulario--erro", erro);
  }
})();
