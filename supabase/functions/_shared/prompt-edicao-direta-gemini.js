import { CATALOGO_REFINAMENTO } from "./catalogo-refinamento.js";

export const VERSAO_PROMPT_DIRETO = "gemini-superficie-v6";

const erroEntrada = () => new Error("A lista de lesões não corresponde ao formato esperado. Salve a montagem manual e abra a versão atual do editor. Nenhuma geração foi solicitada.");
const objeto = (valor) => valor !== null && typeof valor === "object" && !Array.isArray(valor);
const camposExatos = (valor, nomes) => objeto(valor) && Object.keys(valor).length === nomes.length && nomes.every(nome => Object.hasOwn(valor, nome));
const numero = (valor, minimo, maximo) => typeof valor === "number" && Number.isFinite(valor) && valor >= minimo && valor <= maximo;
const numeroLocal = (valor, minimo, maximo) => numero(valor, minimo, maximo) && Math.abs(valor * 10000 - Math.round(valor * 10000)) < 0.000001;

// Só dados geométricos e chaves conhecidas atravessam a fronteira do editor.
// Nomes personalizados, medidas, descrições livres e dados de pacientes não são aceitos.
export function normalizarEntradaRefinamento(inventario, autorizadas) {
  if (!camposExatos(inventario, ["largura_mapa", "altura_mapa", "lesoes"]) ||
      !Number.isInteger(inventario.largura_mapa) || !Number.isInteger(inventario.altura_mapa) ||
      !numero(inventario.largura_mapa, 1, 4096) || !numero(inventario.altura_mapa, 1, 4096) ||
      inventario.largura_mapa * inventario.altura_mapa > 16_000_000 ||
      !Array.isArray(inventario.lesoes) || inventario.lesoes.length === 0 || inventario.lesoes.length > 64) throw erroEntrada();

  const lesoes = inventario.lesoes.map((lesao, indice) => {
    if (!camposExatos(lesao, ["id", "modelo", "x", "y", "largura", "altura", "giro", "recorte"]) ||
        lesao.id !== `L${indice + 1}` || typeof lesao.modelo !== "string" || !Object.hasOwn(CATALOGO_REFINAMENTO, lesao.modelo) ||
        !numeroLocal(lesao.x, 0, 100) || !numeroLocal(lesao.y, 0, 100) ||
        !numeroLocal(lesao.largura, 0.0001, 200) || !numeroLocal(lesao.altura, 0.0001, 200) ||
        !numeroLocal(lesao.giro, -180, 180) || !["alfa", "elipse"].includes(lesao.recorte)) throw erroEntrada();
    return { id: lesao.id, modelo: lesao.modelo, x: lesao.x, y: lesao.y,
      largura: lesao.largura, altura: lesao.altura, giro: lesao.giro, recorte: lesao.recorte };
  });
  const editaveis = lesoes.filter(lesao => CATALOGO_REFINAMENTO[lesao.modelo].editavel).map(lesao => lesao.id);
  const escolhidas = autorizadas === undefined ? editaveis : autorizadas;
  if (!Array.isArray(escolhidas) || escolhidas.length === 0 || escolhidas.length > lesoes.length ||
      new Set(escolhidas).size !== escolhidas.length || escolhidas.some(id => typeof id !== "string" || !editaveis.includes(id))) throw erroEntrada();
  return {
    inventario: { largura_mapa: inventario.largura_mapa, altura_mapa: inventario.altura_mapa, lesoes },
    autorizadas: lesoes.filter(lesao => escolhidas.includes(lesao.id)).map(lesao => lesao.id),
  };
}

export function construirPromptEdicaoDireta(inventarioRecebido, autorizadasRecebidas) {
  const { inventario, autorizadas } = normalizarEntradaRefinamento(inventarioRecebido, autorizadasRecebidas);
  const lista = inventario.lesoes.map(lesao => {
    const perfil = CATALOGO_REFINAMENTO[lesao.modelo];
    // Os identificadores e nomes do catálogo servem ao editor. O modelo recebe
    // somente posição, aparência e autorização, sem códigos para virar rótulos.
    return { x: lesao.x, y: lesao.y, largura: lesao.largura, altura: lesao.altura,
      giro: lesao.giro, recorte: lesao.recorte, tipo_visual: perfil.tipo_visual,
      preservar: perfil.preservar, autorizada: autorizadas.includes(lesao.id) };
  });
  return [
    "ENDOMAPA — ACABAMENTO DE SUPERFÍCIE EM ILUSTRAÇÃO MÉDICA",
    "OBJETIVO\nEdite a única imagem anexada, BASE_MAPA. Ela contém uma ilustração anatômica didática já finalizada e lesões posicionadas manualmente. Faça um acabamento de superfície nas lesões autorizadas, para que a luz, os reflexos e a textura tenham a mesma qualidade de pintura dos órgãos próximos. A anatomia e o desenho de cada lesão já estão definidos e completos. Mantenha a linguagem de atlas médico ilustrado.",
    "LOCALIZAR E PRESERVAR\nA lista abaixo localiza elementos que já existem na imagem. Edite somente os que tenham autorizada: true; mantenha os demais integralmente. Cada entrada corresponde ao elemento já visível naquela posição, sem pedir uma nova cópia. Use a imagem para conservar seu desenho concreto e a lista para reconhecer sua localização e seus atributos. Os lados são os vistos pelo observador. A lista é informação de trabalho: não desenhe suas palavras, coordenadas ou identificadores.",
    "ACABAMENTO A EXECUTAR\nTrabalhe sobre a superfície já desenhada de cada lesão:\n1. Ajuste a direção, a suavidade e a intensidade dos reflexos à iluminação do tecido imediatamente vizinho. Substitua brilhos pontuais excessivos por reflexos graduais, mantendo as cores características da lesão.\n2. Modele a luz e a sombra sobre os volumes que já existem, com transições contínuas. A sensação de volume deve vir dessa iluminação; conserve relevos, sulcos e contornos nas mesmas posições.\n3. Ajuste a escala e o contraste da microtextura ao acabamento ilustrado do órgão. A textura deve ser fina e subordinada ao desenho existente, sem se tornar novos pontos, linhas ou divisões visíveis. Preserve a nitidez dos detalhes que identificam a lesão.\n4. Harmonize a borda pelo lado de dentro da lesão, suavizando o contraste de recorte sem engrossar, desfocar ou deslocar seu contorno. Onde houver contato visível com o órgão, use somente uma transição tonal curta e suave, junto à borda.\nO ganho esperado é uma lesão com luz e material coerentes com o órgão, mantendo seu desenho reconhecível. Uma simples cópia, desfoque ou mudança uniforme de brilho não realiza esse acabamento.",
    "COMO CONSERVAR O DESENHO\nOs pontos, linhas, ramificações, divisões, relevos e intervalos vazios existentes são partes fixas do desenho. Preserve posição, tamanho, orientação, silhueta, quantidade e organização. Em conteúdo homogêneo, module apenas a iluminação suave, conservando a continuidade. Em uma trama, mantenha cada ligação e abertura; ajuste a luz das linhas existentes sem criar outras divisões. Em conjuntos de focos, trate a superfície de cada foco sem unir nem preencher os espaços entre eles. Em volumes lobulados, conserve a quantidade e a disposição das saliências e dos sulcos. A descrição do catálogo não autoriza completar um achado com detalhes imaginados ou inferidos de conhecimento médico.",
    "TECIDO AO REDOR\nUse os órgãos próximos apenas para observar sua iluminação e qualidade de pintura. Eles permanecem com o mesmo formato, volume, cor, pregas e textura. A integração acontece no acabamento da lesão, sem remodelar o órgão para acomodá-la. Preserve integralmente a superfície do útero, os ovários, as trompas, os ligamentos e o trajeto, calibre, pregas e detalhes amarelados do intestino. Fora da lesão e do contato imediato de sua borda, mantenha a imagem-base. Não adicione traços escuros, manchas, depressões, pregas, halos ou alterações do tecido ao redor.",
    "LIMITES DA EDIÇÃO\nNenhum elemento pode ser criado, removido, deslocado, ampliado, unido, dividido ou redistribuído. Conserve os componentes internos de cada lesão. Mantenha o enquadramento, a perspectiva, o fundo, os elementos gráficos, o logotipo e o texto institucional. Toda alteração de luz ou textura é local; mantenha o tratamento global da imagem. Nenhum texto ou marca nova deve aparecer.",
    `LISTA DINÂMICA DE ELEMENTOS\nBASE_MAPA tem ${inventario.largura_mapa} × ${inventario.altura_mapa} pixels. x e y são o centro em porcentagem da largura e da altura, com origem no canto superior esquerdo. largura e altura são porcentagens das dimensões da imagem antes da rotação; giro é o ângulo em graus. Essas caixas servem para localizar os elementos: somente a silhueta visível é editável, com os espaços vazios preservados. recorte alfa mantém a transparência original; recorte elipse limita a figura ao contorno elíptico do editor.\n[INÍCIO DA LISTA DINÂMICA]\n${JSON.stringify(lista, null, 2)}\n[FINAL DA LISTA DINÂMICA]`,
    "SAÍDA\nEntregue uma única imagem editada, no mesmo enquadramento e proporção. Compare com a entrada: os elementos e seus desenhos devem coincidir, e a melhoria deve aparecer no acabamento local da luz, do material e das bordas das lesões autorizadas. A fidelidade ao desenho tem prioridade sobre a intensidade do efeito. Entregue somente a imagem, sem legendas ou comparação desenhadas nela.",
  ].join("\n\n");
}
