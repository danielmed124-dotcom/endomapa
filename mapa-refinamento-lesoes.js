import { normalizarEntradaRefinamento } from "./supabase/functions/_shared/prompt-edicao-direta-gemini.js";
import { prepararIntegracaoContato, integrarContatoPixels, protegerInterior } from "./mapa-integracao-contato.js?v=refinamento-1";

const erroPreparo = () => new Error("Não foi possível preparar as áreas autorizadas. A montagem foi preservada; nenhuma geração foi solicitada.");

// O inventário descreve a mesma captura e suas máscaras em ordem. A seleção é
// automática, sem uma etapa de aprovação por lesão. DIUs e itens desconhecidos
// não podem entrar na seleção; o servidor aplica a mesma validação do catálogo.
export async function prepararRefinamento(captura, autorizadasOpcional) {
  const { inventario, autorizadas } = normalizarEntradaRefinamento(captura?.inventario, autorizadasOpcional);
  if (captura.largura !== inventario.largura_mapa || captura.altura !== inventario.altura_mapa ||
      !Array.isArray(captura.lesoes) || captura.lesoes.length !== inventario.lesoes.length) throw erroPreparo();
  const contato = await prepararIntegracaoContato(captura, { permitirSemContato: true });
  const { largura, altura } = contato;
  const selecionadas = new Set(autorizadas);
  const alfaInterno = new Uint8ClampedArray(largura * altura);
  const bloqueados = new Uint8Array(largura * altura);
  const regioesAutorizadas = [];
  for (const regiao of contato.regioes) {
    if (selecionadas.has(inventario.lesoes[regiao.indiceLesao].id)) regioesAutorizadas.push(regiao);
    else protegerInterior(regiao.poligono, bloqueados, largura, altura);
  }
  for (let indiceLesao = 0; indiceLesao < captura.lesoes.length; indiceLesao++) {
    const mascara = captura.lesoes[indiceLesao];
    const autorizada = selecionadas.has(inventario.lesoes[indiceLesao].id);
    let visiveis = 0;
    for (let y = 0; y < mascara.altura; y++) for (let x = 0; x < mascara.largura; x++) {
      const alfa = mascara.alfa[y * mascara.largura + x];
      if (!alfa) continue;
      visiveis++;
      const indice = (mascara.y + y) * largura + mascara.x + x;
      if (autorizada) alfaInterno[indice] = Math.max(alfaInterno[indice], alfa);
      else bloqueados[indice] = 1;
    }
    if (autorizada && !visiveis) throw erroPreparo();
  }
  let editaveis = 0;
  for (let indice = 0; indice < alfaInterno.length; indice++) {
    if (bloqueados[indice]) alfaInterno[indice] = 0;
    if (alfaInterno[indice]) editaveis++;
  }
  if (!editaveis) throw erroPreparo();
  return { ...contato, regioes: regioesAutorizadas, alfaInterno, inventario, autorizadas };
}

function carregarImagem(src) {
  return new Promise((resolver, rejeitar) => {
    const imagem = new Image();
    imagem.onload = () => resolver(imagem);
    imagem.onerror = () => rejeitar(new Error("Não foi possível ler o acabamento recebido. A montagem foi preservada."));
    imagem.src = src;
  });
}

// A proteção é espacial, não uma validação clínica do conteúdo gerado dentro
// das lesões. O mapa final continua sujeito à revisão do médico.
export async function refinarLesoes(preparo, geradaUrl) {
  const { largura, altura, originais, alfaInterno } = preparo;
  const gerada = await carregarImagem(geradaUrl);
  const proporcao = (gerada.naturalWidth / gerada.naturalHeight) / (largura / altura);
  if (!Number.isFinite(proporcao) || Math.abs(proporcao - 1) > 0.02) throw new Error("O Gemini mudou o enquadramento. O acabamento não foi aplicado; a montagem foi preservada.");
  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const contexto = canvas.getContext("2d", { willReadFrequently: true });
  contexto.drawImage(gerada, 0, 0, largura, altura);
  const gerados = contexto.getImageData(0, 0, largura, altura).data;
  if (!gerados.some((valor, indice) => indice % 4 === 3 && valor === 255)) throw new Error("A imagem recebida não possui conteúdo opaco aproveitável. A montagem foi preservada.");
  const contato = integrarContatoPixels(preparo, gerados);
  const saida = contato.pixels;
  let pixelsInternosAlterados = 0;
  for (let indice = 0; indice < alfaInterno.length; indice++) {
    if (!alfaInterno[indice]) continue;
    const i = indice * 4;
    // Transparência do provedor não autoriza apagar, atenuar ou revelar outra
    // estrutura. Apenas pixels opacos fornecem acabamento interno.
    if (gerados[i + 3] !== 255) continue;
    const peso = alfaInterno[indice] / 255;
    let mudou = false;
    for (let canal = 0; canal < 3; canal++) {
      saida[i + canal] = Math.round(originais[i + canal] * (1 - peso) + gerados[i + canal] * peso);
      mudou ||= saida[i + canal] !== originais[i + canal];
    }
    if (mudou) pixelsInternosAlterados++;
  }
  contexto.putImageData(new ImageData(saida, largura, altura), 0, 0);
  return { imagem: canvas.toDataURL("image/png"), pixelsAlterados: contato.pixelsAlterados + pixelsInternosAlterados, pixelsInternosAlterados };
}
