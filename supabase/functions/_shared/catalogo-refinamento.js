// Descrições visuais das próprias figuras da biblioteca, conferidas nos PNGs.
// Não são achados clínicos nem uma imagem adicional enviada ao provedor.
// Os nomes identificam os botões existentes; não determinam a localização no mapa.
export const CATALOGO_REFINAMENTO = Object.freeze({
  "endometriose-isolada-referencia-transparente": Object.freeze({
    nome: "Ligamento uterossacro",
    tipo_visual: "Faixa irregular alongada marrom muito escura, com pequenos volumes, ramificações curtas e pontos separados.",
    preservar: "Preservar o trajeto, a largura, as ramificações e os pontos existentes, com seus intervalos vazios. Não prolongar a faixa, criar pontes nem acrescentar pontos.",
    editavel: true,
  }),
  "cisto-referencia": Object.freeze({
    nome: "Cisto",
    tipo_visual: "Forma arredondada rosada e lilás, com superfície contínua brilhante e linhas finas avermelhadas.",
    preservar: "Preservar a superfície contínua, as cores e a disposição das linhas existentes. Não inserir compartimentos, massas ou outros componentes internos.",
    editavel: true,
  }),
  "cisto-hemorragico-referencia": Object.freeze({
    nome: "Cisto hemorrágico",
    tipo_visual: "Forma arredondada avermelhada com áreas internas escuras e trama de linhas claras que delimitam espaços de aparência translúcida.",
    preservar: "Preservar a organização da trama, os espaços e as áreas escuras existentes. Não criar outras divisões, círculos ou componentes, nem transportar o padrão para fora da forma.",
    editavel: true,
  }),
  "endometrioma-referencia": Object.freeze({
    nome: "Endometrioma",
    tipo_visual: "Forma arredondada com conteúdo marrom de textura fina, relativamente uniforme, circundado por uma borda clara rosada.",
    preservar: "Preservar o aspecto contínuo do conteúdo marrom e a borda existente. Não inventar compartimentos, nódulos, filamentos, calcificações ou outras estruturas internas.",
    editavel: true,
  }),
  "adenomiose-1-referencia": Object.freeze({
    nome: "Adenomiose 1",
    tipo_visual: "Conjunto de pequenos volumes escuros brilhantes com ramificações vermelhas e espaços transparentes entre os elementos.",
    preservar: "Preservar cada foco, cada ramificação e todos os espaços vazios. Não unir o conjunto em mancha contínua, aumentar a quantidade de focos nem prolongar ramificações.",
    editavel: true,
  }),
  "teratoma-referencia": Object.freeze({
    nome: "Teratoma",
    tipo_visual: "Forma arredondada amarronzada, com volumes claros e filamentos escuros já visíveis no interior; a própria figura possui uma área de fundo marrom ao redor.",
    preservar: "Preservar os componentes claros e os filamentos existentes, sem acrescentar outros nem reinterpretar seu conteúdo. Preservar o contorno e a área já ocupada pela figura.",
    editavel: true,
  }),
  "mioma-1-referencia": Object.freeze({
    nome: "Mioma 1",
    tipo_visual: "Volume arredondado rosado, com relevos amplos e sulcos curvos suaves na superfície.",
    preservar: "Preservar a distribuição dos relevos e sulcos, a cor e o contorno existente. Não acrescentar lóbulos, cavidades, pontos escuros ou outros componentes.",
    editavel: true,
  }),
  "mioma-integrado-estudo-v1": Object.freeze({
    nome: "Mioma integrado · estudo",
    tipo_visual: "Volume rosado com relevos arredondados, base alargada e uma transição de cor suave já presente ao redor.",
    preservar: "Preservar os relevos, a base e a transição já existentes, sem ampliar sua extensão. Não criar novos volumes ou componentes internos.",
    editavel: true,
  }),
  "mioma-2-referencia": Object.freeze({
    nome: "Mioma 2",
    tipo_visual: "Conjunto rosado de volumes arredondados salientes, reunidos em uma forma global lobulada.",
    preservar: "Preservar a quantidade, a disposição e os limites dos volumes visíveis. Não acrescentar, fundir, separar nem deslocar os lóbulos existentes.",
    editavel: true,
  }),
  "mioma-3-referencia": Object.freeze({
    nome: "Mioma 3",
    tipo_visual: "Forma rosada larga, com saliências arredondadas e sulcos curvos entre elas.",
    preservar: "Preservar as saliências, os sulcos e o formato largo original. Não acrescentar lóbulos, cavidades ou novos componentes.",
    editavel: true,
  }),
  "mioma-pediculado-referencia": Object.freeze({
    nome: "Mioma pediculado",
    tipo_visual: "Volume rosado arredondado e lobulado, ligado a uma extensão estreita terminada em uma pequena base arredondada.",
    preservar: "Preservar os relevos, a extensão estreita, seu trajeto e sua base. Não mudar sua ligação nem acrescentar outros volumes ou prolongamentos.",
    editavel: true,
  }),
  "polipo-referencia": Object.freeze({
    nome: "Pólipo",
    tipo_visual: "Forma rosada alongada e arredondada, de superfície contínua, com haste curta e base alargada.",
    preservar: "Preservar a superfície contínua, as linhas finas existentes, a haste e a base. Não acrescentar lobulações, cavidades ou componentes internos.",
    editavel: true,
  }),
  "diu-cobre-referencia": Object.freeze({
    nome: "DIU de Cobre",
    tipo_visual: "Dispositivo em T branco, com partes cor de cobre e fio claro.",
    preservar: "Elemento não autorizado para edição. Preservar integralmente forma, posição, dimensões, orientação, cores e fio.",
    editavel: false,
  }),
  "diu-hormonal-referencia": Object.freeze({
    nome: "DIU hormonal",
    tipo_visual: "Dispositivo branco em T com braços curvos e fios finos na extremidade inferior.",
    preservar: "Elemento não autorizado para edição. Preservar integralmente forma, posição, dimensões, orientação, cores e fios.",
    editavel: false,
  }),
  "aderencia-1-marrom-escuro": Object.freeze({
    nome: "Aderências 1",
    tipo_visual: "Rede marrom de faixas largas entrecruzadas, com estrias claras e várias aberturas transparentes.",
    preservar: "Preservar o trajeto e a espessura das faixas, as interseções e todas as aberturas. Não preencher os vazados nem criar novas faixas ou conexões.",
    editavel: true,
  }),
  "aderencia-2-marrom-escuro": Object.freeze({
    nome: "Aderência 2",
    tipo_visual: "Faixa marrom alongada com extremidades alargadas, estrias longitudinais e aberturas na porção inferior.",
    preservar: "Preservar a curvatura, as extremidades, as aberturas e a distribuição das estrias. Não preencher os vazados nem alongar ou ramificar a faixa.",
    editavel: true,
  }),
  "aderencia-3-marrom-escuro": Object.freeze({
    nome: "Aderência 3",
    tipo_visual: "Faixa marrom curva com extremidades abertas e alargadas, estrias longitudinais e uma abertura alongada junto à parte superior.",
    preservar: "Preservar a curva, as extremidades e a abertura existente. Não preencher o vazado, criar conexões ou acrescentar ramificações.",
    editavel: true,
  }),
  "aderencia-4-marrom-escuro": Object.freeze({
    nome: "Aderência 4",
    tipo_visual: "Faixa marrom curva de extremidades alargadas, com estrias longitudinais e aberturas alongadas próximas às extremidades.",
    preservar: "Preservar a curva, a espessura, as extremidades e as aberturas existentes. Não preencher os vazados, conectar outras áreas nem criar novas faixas.",
    editavel: true,
  }),
});
