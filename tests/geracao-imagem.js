// Abra geracao-imagem.html por um servidor local. Não chama serviços de IA.
(function () {
  "use strict";
  const canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 16;
  const contexto = canvas.getContext("2d");
  contexto.fillStyle = "white";
  contexto.fillRect(0, 0, 16, 16);
  const original = canvas.toDataURL("image/png");
  contexto.fillStyle = "red";
  contexto.fillRect(0, 0, 8, 8);
  const modificada = canvas.toDataURL("image/png");
  let respostaImagem = modificada;
  let falhaServidor = null;
  let violacoes = 0;
  document.addEventListener("securitypolicyviolation", () => { violacoes += 1; });

  window.ENDOMAPA_SUPABASE = { projectUrl: "teste", publicAnonKey: "teste" };
  window.endomapaCapturarMapaManual = async () => original;
  window.supabase = { createClient: () => ({
    auth: { getSession: async () => ({ data: { session: {} } }) },
    functions: { invoke: async (_nome, pedido) => {
      if (pedido.body.consultar_diagnostico) return { data: {} };
      if (falhaServidor) return { error: falhaServidor };
      return { data: { imagem_base64: respostaImagem.split(",")[1], formato: "image/png" } };
    } },
  }) };

  function conferir(condicao, mensagem) {
    if (!condicao) throw new Error(mensagem);
  }

  async function gerar(provedor) {
    const botao = document.querySelector(`[data-gerar-realista="${provedor}"]`);
    botao.click();
    // getSession é assíncrono; aguarde o início e o fim do processamento.
    await new Promise((resolver) => setTimeout(resolver, 30));
    const limite = Date.now() + 5000;
    while (botao.disabled && Date.now() < limite) {
      await new Promise((resolver) => setTimeout(resolver, 20));
    }
    conferir(!botao.disabled, "O botão ficou bloqueado.");
    return document.querySelector(`[data-estado-realista="${provedor}"]`).textContent;
  }

  window.addEventListener("load", async () => {
    const saida = document.getElementById("testes");
    const resultados = [];
    try {
      // Reproduz o erro anterior com a mesma restrição de conexão da página real.
      let bloqueado = false;
      try { await fetch(original); } catch (erro) { bloqueado = erro instanceof TypeError; }
      conferir(bloqueado, "A proteção não reproduziu o bloqueio de fetch(data:).");
      await new Promise((resolver) => setTimeout(resolver, 30));
      violacoes = 0;
      resultados.push("PASSOU: erro anterior reproduzido pela proteção do navegador.");

      for (const provedor of ["gpt", "gpt-referencias", "gemini"]) {
        const texto = await gerar(provedor);
        conferir(texto.includes("A diferença visual média foi de"), `${provedor}: comparação não concluída: ${texto}`);
        conferir(!document.querySelector(`[data-resultado-${provedor}]`).hidden, `${provedor}: imagem escondida.`);
        conferir(!document.querySelector("[data-resultado-realista]").hidden, "Comparação escondida.");
        resultados.push(`PASSOU: ${provedor} exibe e compara a imagem com a proteção ativa.`);
      }
      conferir(violacoes === 0, "A correção ainda provoca bloqueios de segurança.");

      respostaImagem = original;
      conferir((await gerar("gpt")).includes("exatamente igual"), "Imagem idêntica não foi identificada.");
      resultados.push("PASSOU: imagem idêntica continua sendo identificada.");

      const digestOriginal = crypto.subtle.digest;
      try {
        crypto.subtle.digest = async () => { throw new Error("Falha simulada na comparação"); };
        conferir((await gerar("gpt")).includes("comparação automática falhou"), "Falha na comparação sem aviso específico.");
        conferir(!document.querySelector("[data-resultado-gpt]").hidden, "Falha na comparação escondeu a imagem.");
      } finally { crypto.subtle.digest = digestOriginal; }
      resultados.push("PASSOU: falha na comparação mantém a imagem disponível.");

      falhaServidor = { name: "FunctionsFetchError", message: "Failed to fetch" };
      conferir((await gerar("gpt")).includes("A conexão foi interrompida"), "Erro de conexão não foi traduzido.");
      resultados.push("PASSOU: falha de conexão tem mensagem em português.");

      falhaServidor = { name: "FunctionsHttpError", context: { json: async () => ({ erro: "O limite diário de imagens foi atingido." }) } };
      conferir((await gerar("gpt")).includes("O limite diário"), "Mensagem do servidor foi perdida.");
      resultados.push("PASSOU: motivo informado pelo servidor continua visível.");
      saida.textContent = resultados.join("\n") + "\nSUCESSO";
    } catch (erro) {
      saida.textContent = resultados.join("\n") + `\nFALHOU: ${erro.message}`;
    }
  });
})();
