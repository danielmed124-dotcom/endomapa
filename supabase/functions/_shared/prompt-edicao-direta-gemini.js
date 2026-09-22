import { CATALOGO_REFINAMENTO } from "./catalogo-refinamento.js";

export const VERSAO_PROMPT_DIRETO = "gemini-refinamento-v4";

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
    return { ...lesao, nome_da_biblioteca: perfil.nome, tipo_visual: perfil.tipo_visual,
      preservar: perfil.preservar, autorizada: autorizadas.includes(lesao.id) };
  });
  return [
    `ENDOMAPA — REFINAMENTO LOCALIZADO DE LESÕES EM ILUSTRAÇÃO MÉDICA\nVersão do pedido: ${VERSAO_PROMPT_DIRETO}.`,
    "TAREFA\nEdite a única imagem anexada, identificada neste pedido como BASE_MAPA: uma ilustração médica didática tridimensional da pelve feminina, com lesões inseridas manualmente. Melhore exclusivamente o acabamento visual das lesões autorizadas, integrando-as ao estilo dos órgãos. O resultado deve continuar sendo a mesma ilustração de atlas médico, com acabamento local mais realista. Não crie uma nova composição, não altere a anatomia e não transforme a imagem em fotografia clínica. Não há imagem adicional de referência.",
    "FONTE DE VERDADE\nBASE_MAPA determina a anatomia, a posição, a quantidade, o tamanho, a orientação e a distribuição dos achados. A lista abaixo identifica os elementos realmente presentes no editor e as características conhecidas das imagens da biblioteca; ela não é uma interpretação diagnóstica. A imagem determina seus detalhes concretos. Não invente características que não estejam visíveis ou descritas. Todas as indicações de esquerda e direita correspondem aos lados da imagem vistos pelo observador, não à lateralidade clínica da paciente.",
    `ESCOPO E AUTORIZAÇÃO\nLESOES_AUTORIZADAS = ${JSON.stringify(autorizadas)}. Edite somente esses identificadores. Os demais elementos da lista e todas as áreas não autorizadas devem permanecer inalterados. Os identificadores servem apenas para localizar os elementos e não devem ser escritos na imagem. A autorização já corresponde ao pedido único de geração do mapa; não produza etapas ou pedidos separados de aprovação.`,
    "ACABAMENTO PERMITIDO E PERCEPTÍVEL\nDentro das lesões autorizadas, você pode modificar a representação da textura, do brilho e do sombreamento internos. Refine a microtextura, harmonize a iluminação com a imagem original, dê profundidade visual e relevo discretos compatíveis com o tecido de apoio e faça o acabamento acompanhar a curvatura anatômica local. A melhoria deve ser claramente perceptível no tamanho normal de visualização, especialmente na textura e na integração ao órgão. Relevo discreto não significa acabamento praticamente idêntico ao original. Elimine a aparência de adesivo, recorte colado, desenho vetorial, elemento flutuante ou textura desconectada do tecido.",
    "GEOMETRIA E CONTEÚDO PRESERVADOS\nPreserve o centro e os limites de cada lesão, sem deslocamento. Mantenha suas dimensões, silhueta, orientação, cores características, padrão visual e organização do conteúdo existente. Não amplie, contraia, una, divida, apague ou redistribua lesões. Preserve a quantidade e a separação dos focos, os espaços vazios entre eles, o trajeto e a espessura das ramificações e suas extremidades. Não preencha transparências, não conecte ramos e não transforme focos separados numa mancha contínua. Textura e iluminação podem melhorar; a geometria e os componentes representados permanecem os mesmos.",
    "INTEGRAÇÃO DAS BORDAS\nPreserve o traçado e a extensão do contorno. Na borda, ajuste somente a transição de cor, brilho, sombra e textura, sem deslocá-la, engrossá-la ou criar halo. Concentre a mudança no interior da lesão até sua borda visível. Uma sombra de contato, quando necessária, deve ser curta, suave e imediata, sem avançar sobre limites anatômicos, preencher vazios ou criar novas manchas. Não use a integração para representar extensão da lesão ou reação do tecido. Fora da lesão e de sua borda imediata, mantenha a imagem original.",
    "PADRÕES INTERNOS\nQuando a lista indicar conteúdo homogêneo, preserve essa homogeneidade: iluminação suave é permitida, porém não acrescente manchas, divisões ou estruturas internas. Quando o padrão for reticulado, lobulado, pigmentado, nodular, cístico, fibrótico ou superficial, preserve exatamente sua organização e torne somente a representação mais orgânica e integrada. Não acrescente septações, calcificações, vegetações, vasos, cavidades, compartimentos, focos hemorrágicos, cicatrizes, filamentos, aderências ou outros componentes que não existam na montagem e não estejam descritos.",
    "ANATOMIA E ÁREAS PROTEGIDAS\nMantenha integralmente os órgãos, contornos, posições, proporções, relações anatômicas, volumes e perspectivas. Preserve útero, ovários, trompas, ligamentos e intestino. Não remodele órgãos para acomodar lesões. Preserve o trajeto, calibre, curvatura, sulcos, pregas e detalhes amarelados do intestino; esses detalhes da imagem-base não são lesões autorizadas e não devem ser desenvolvidos. Nenhuma área não listada pode receber sinais patológicos novos. Preserve também todos os dispositivos e elementos da lista marcados como não autorizados.",
    "COMPOSIÇÃO E IDENTIDADE VISUAL\nMantenha enquadramento, perspectiva, proporções da imagem, espaços entre estruturas, fundo branco, elementos gráficos cinza, logotipo e texto institucional. Não aplique correção global de cor, contraste, iluminação, nitidez ou textura. Não acrescente texto, identificadores, setas, medidas, legendas, marcas ou montagem comparativa.",
    `LISTA DINÂMICA DE ELEMENTOS\nBASE_MAPA tem ${inventario.largura_mapa} × ${inventario.altura_mapa} pixels. As coordenadas x e y indicam o centro em porcentagem da largura e da altura da imagem, com origem no canto superior esquerdo. Largura é porcentagem da largura da imagem e altura é porcentagem da altura da imagem, ambas antes da rotação; giro é o ângulo em graus aplicado pelo editor. A caixa descreve o posicionamento do elemento, não autoriza pintar seu retângulo inteiro. O recorte alfa preserva a transparência real da imagem; o recorte elipse limita o elemento ao contorno elíptico do editor. Respeite a silhueta visível e os espaços vazios em ambos os casos.\n[INÍCIO DA LISTA DINÂMICA]\n${JSON.stringify(lista, null, 2)}\n[FINAL DA LISTA DINÂMICA]`,
    "CONFERÊNCIA E SAÍDA\nEntregue uma única imagem editada, preferencialmente PNG, com o mesmo enquadramento e proporções. Antes de concluir, confira que a melhoria local é perceptível, que nenhuma lesão foi criada, removida, deslocada ou expandida, que os padrões e componentes internos continuam os mesmos e que a anatomia, as áreas não autorizadas, o fundo e a identidade visual estão preservados. Se não conseguir melhorar uma região mantendo esses limites, preserve-a. Entregue apenas a imagem, sem explicações escritas nela. O resultado será uma proposta para comparação e revisão médica.",
  ].join("\n\n");
}
