(function () {
  "use strict";
  const normalizar = texto => String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const falhar = mensagem => { throw new Error(mensagem); };
  // Só objetos produzidos por estas regras podem usar os padrões da biblioteca.
  // A resposta do interpretador antigo continua sujeita às verificações anteriores.
  const itensDaBiblioteca = new WeakSet();
  const numeros = { zero: 0, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10 };
  const modelos = [
    ['ligamentos? uteross?acros?', 'Ligamento uterossacro', 'ligamento uterossacro', 'endometriose'],
    ['retrocervical', 'Retrocervical', 'região retrocervical', 'endometriose'],
    ['adenomiose(?: 1)?', 'Adenomiose 1', 'útero', 'adenomiose'],
    ['diu (?:de )?cobre', 'DIU de Cobre', 'útero', 'dispositivo'],
    ['diu hormonal', 'DIU hormonal', 'útero', 'dispositivo'],
    ['mioma pediculado', 'Mioma pediculado', 'útero', 'mioma'],
    ['mioma (?:1|um)', 'Mioma 1', 'útero', 'mioma'],
    ['mioma (?:2|dois)', 'Mioma 2', 'útero', 'mioma'],
    ['mioma (?:3|tres)', 'Mioma 3', 'útero', 'mioma'],
    ['miomas?', 'Mioma 1', 'útero', 'mioma'],
    ['polipos?', 'Pólipo', 'útero', 'pólipo'],
    ['endometriomas?', 'Endometrioma', 'ovário', 'lesão ovariana'],
    ['cistos? hemorragicos?', 'Cisto hemorrágico', 'ovário', 'lesão ovariana'],
    ['cistos?', 'Cisto', 'ovário', 'lesão ovariana'],
    ['foliculos?', 'Folículo', 'ovário', 'lesão ovariana'],
    ['teratomas?', 'Teratoma', 'ovário', 'lesão ovariana'],
    ['corpo luteo', 'Corpo Lúteo', 'ovário', 'lesão ovariana'],
  ];
  function prepararSugestaoIA(sugestao) {
    if (!sugestao || !Number.isInteger(sugestao.confianca) || sugestao.confianca < 70 || sugestao.confianca > 100 || !Array.isArray(sugestao.itens) || sugestao.itens.length > 30 || !Array.isArray(sugestao.duvidas) || sugestao.duvidas.length > 20) falhar('A interpretação não identificou as imagens com confiança suficiente. Confira o texto.');
    if (sugestao.duvidas.length) falhar(sugestao.duvidas.map(d => String(d?.pergunta || 'Confira o texto.')).join(' '));
    const lesoes = [];
    for (const item of sugestao.itens) {
      const modelo = modelos.find(m => m[1] === item?.modelo);
      if (!modelo || !Number.isInteger(item.quantidade) || item.quantidade < 1 || item.quantidade > 30 || lesoes.length + item.quantidade > 30 || !Number.isInteger(item.confianca) || item.confianca < 70 || item.confianca > 100) falhar('Uma imagem ou sua quantidade não foi identificada com confiança suficiente.');
      if (!['não informada', modelo[2]].includes(item.localizacao)) falhar('Confira a localização ditada para ' + modelo[1] + ': esta imagem usa a região ' + modelo[2] + '.');
      if (!['não informado', 'central', 'direito', 'esquerdo', 'bilateral'].includes(item.lado)) falhar('Lado inválido para ' + modelo[1] + '.');
      if (item.lado === 'bilateral') falhar('Descreva cada lado com suas próprias medidas para ' + modelo[1] + '.');
      if (['ovário', 'ligamento uterossacro'].includes(modelo[2]) && !['direito', 'esquerdo'].includes(item.lado)) falhar('Informe o lado de ' + modelo[1] + '.');
      const medidas = [item.medida_1, item.medida_2, item.medida_3];
      if (medidas.some(m => m !== null && (typeof m !== 'number' || !Number.isFinite(m) || m <= 0)) || (medidas[0] === null && medidas[1] !== null) || (medidas[1] === null && medidas[2] !== null)) falhar('Informe medidas positivas, em centímetros, na ordem correta.');
      if (item.quantidade > 1 && medidas.some(m => m !== null)) falhar('Descreva cada foco com suas próprias medidas.');
      if (item.posicao_ditada !== null && (typeof item.posicao_ditada !== 'string' || item.posicao_ditada.length > 500)) falhar('A posição ditada veio em formato inválido.');
      const lado = item.lado === 'não informado' ? 'central' : item.lado;
      for (let j = 0; j < item.quantidade; j++) {
        const lesao = { categoria: modelo[3], localizacao: modelo[2], modelo: modelo[1], lado,
          medida_1: medidas[0], medida_2: medidas[1], medida_3: medidas[2], confianca: item.confianca,
          observacao: item.posicao_ditada ? 'posição ditada: ' + item.posicao_ditada + '; ajuste no mapa' : item.lado === 'não informado' ? 'posição inicial ajustável; localização específica não ditada' : '',
          foco: item.quantidade > 1 ? j + 1 : null, deslocamento: item.quantidade > 1 ? (j - (item.quantidade - 1) / 2) * 5 : 0 };
        itensDaBiblioteca.add(lesao);
        lesoes.push(lesao);
      }
    }
    return { confianca: sugestao.confianca, lesoes, duvidas: [], relacoes_anatomicas: [] };
  }
  function interpretarBiblioteca(texto) {
    conferirTexto(texto);
    const fonte = normalizar(texto);
    const quantidade = '(?:(\\d+|um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez)\\s+(?:focos?\\s+de\\s+)?)?';
    const exp = new RegExp('\\b' + quantidade + '(' + modelos.map(m => m[0]).join('|') + ')\\b', 'g');
    const encontrados = Array.from(fonte.matchAll(exp));
    // Não ignorar negativas, correções, locais ou qualquer trecho desconhecido.
    const vazio = trecho => /^[\s,;.]*(?:e[\s,;.]*)?$/.test(trecho);
    if (!encontrados.length || !vazio(fonte.slice(0, encontrados[0].index).replace(/^(?:inserir|adicione|adicionar)\s+/, ''))) return null;
    const lesoes = [];
    for (let i = 0; i < encontrados.length; i++) {
      const achado = encontrados[i];
      const modelo = modelos.find(m => new RegExp('^(?:' + m[0] + ')$').test(achado[2]));
      const n = achado[1] ? (numeros[achado[1]] ?? Number(achado[1])) : 1;
      if (!Number.isInteger(n) || n < 1 || lesoes.length + n > 30) falhar('Informe de 1 a 30 itens por ditado.');
      let resto = fonte.slice(achado.index + achado[0].length, encontrados[i + 1]?.index ?? fonte.length).trim();
      const local = modelo[2] === 'ovário' ? /^\s*(?:no |em |do )?ovario\b/ : modelo[2] === 'útero' ? /^\s*(?:no |em |do )?utero\b/ : /$^/;
      resto = resto.replace(local, '').trim();
      const lateral = /^(?:a |do lado |no lado |lado )?(direit[oa]|esquerd[oa]|central)\b/.exec(resto);
      let lado = lateral ? lateral[1].replace(/a$/, 'o') : null;
      if (lateral) resto = resto.slice(lateral[0].length).trim();
      resto = resto.replace(local, '').trim();
      // Números falados simples: não transformar palavras desconhecidas em zero.
      resto = resto.replace(/\b(zero|um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez)\b/g, p => numeros[p]);
      resto = resto.replace(/\s+virgula\s+/g, ',');
      let medidas = [null, null, null];
      if (!vazio(resto)) {
        // Um número de modelo desconhecido não é uma medida (ex.: "Mioma 4").
        if (!/^(?:,\s*)?(?:medindo|mede|de|com)\b/.test(resto) && !/\b(?:cm|centimetros?)\b/.test(resto)) return null;
        const medida = /^(?:(?:,\s*)?(?:medindo|mede|de|com medidas de|com)\s+)?(\d+(?:[.,]\d+)?)(?:\s*(?:por|x|×)\s*(\d+(?:[.,]\d+)?))?(?:\s*(?:por|x|×)\s*(\d+(?:[.,]\d+)?))?\s*(?:cm|centimetros?)?([\s,;.]*(?:e[\s,;.]*)?)$/.exec(resto);
        if (!medida) return null;
        medidas = medida.slice(1, 4).map(m => m === undefined ? null : Number(m.replace(',', '.')));
        if (medidas.some(m => m !== null && m <= 0)) falhar('Informe medidas positivas em centímetros.');
        if (n > 1) falhar('Para vários focos com medidas, descreva cada foco com suas próprias medidas.');
      }
      if (!lado && ['ovário', 'ligamento uterossacro'].includes(modelo[2])) falhar('Informe o lado de ' + modelo[1] + '.');
      const posicaoInicial = !lado;
      lado ||= 'central';
      for (let j = 0; j < n; j++) {
        const item = { categoria: modelo[3], localizacao: modelo[2], lado, modelo: modelo[1],
          medida_1: medidas[0], medida_2: medidas[1], medida_3: medidas[2], confianca: 100,
          observacao: posicaoInicial ? 'posição inicial ajustável; localização específica não ditada' : '',
          foco: n > 1 ? j + 1 : null, deslocamento: n > 1 ? (j - (n - 1) / 2) * 5 : 0 };
        itensDaBiblioteca.add(item);
        lesoes.push(item);
      }
    }
    return { confianca: 100, lesoes, duvidas: [], relacoes_anatomicas: [] };
  }
  // Posições iniciais herdadas de mapa-visual.js, não uma nova calibração clínica.
  const pontos = {
    coronal: {
      'útero': { central: [50, 42], direito: [57, 42], esquerdo: [43, 42] },
      'ovário': { direito: [32, 50], esquerdo: [68, 50] },
      'ligamento uterossacro': { esquerdo: [38, 56, -38], direito: [64.5, 58, 48] },
      'região retrocervical': { central: [50, 62] },
    },
    sagital: {
      'útero': [54, 42], 'ovário': [52, 31],
      'ligamento uterossacro': [65, 45, -12], 'região retrocervical': [68, 49],
    },
  };
  function conferirTexto(texto) {
    if (typeof texto !== 'string' || !texto.trim() || texto.length > 4000) falhar('Informe um comando de até 4.000 caracteres.');
    if (/\b(mm|milimetros?|metros?)\b/.test(normalizar(texto))) falhar('Neste teste, informe as medidas em centímetros. Reescreva ou dite novamente o comando.');
    if (/\b(apagar|apague|excluir|exclua|remover|remova|corrigir|corrija|substituir|substitua|desfazer|desfaca)\b/.test(normalizar(texto))) falhar('Este teste insere novas lesões. Para corrigir ou excluir uma lesão inserida, use os controles do mapa.');
  }
  function modeloPara(lesao, texto, unica) {
    const chave = lesao.categoria + '|' + lesao.localizacao;
    if (chave === 'endometriose|ligamento uterossacro') return 'Ligamento uterossacro';
    if (chave === 'endometriose|região retrocervical') return 'Retrocervical';
    if (chave === 'adenomiose|útero') return 'Adenomiose 1';
    if (chave === 'mioma|útero') {
      return /pediculad/.test(normalizar(lesao.observacao) + (unica ? ' ' + normalizar(texto) : '')) ? 'Mioma pediculado' : 'Mioma 1';
    }
    if (chave === 'lesão ovariana|ovário') {
      // Com várias lesões, nunca atribuir a todas um subtipo citado em outra lesão.
      const termos = normalizar(lesao.observacao) + (unica ? ' ' + normalizar(texto) : '');
      const tipos = [[/\bendometriomas?\b/, 'Endometrioma'], [/\bteratomas?\b/, 'Teratoma'],
        [/\bfoliculos?\b/, 'Folículo'], [/\bcorpo luteo\b/, 'Corpo Lúteo'],
        [/\bcistos? hemorragic[oa]s?\b/, 'Cisto hemorrágico']];
      const encontrados = tipos.filter(([expressao]) => expressao.test(termos));
      if (encontrados.length === 1) return encontrados[0][1];
      if (!encontrados.length && /\bcistos?\b/.test(termos)) return 'Cisto';
      falhar('O tipo de uma lesão ovariana ficou ambíguo. Confira se o ditado identifica cada lesão e suas medidas, por exemplo, endometrioma no ovário direito e cisto no esquerdo.');
    }
    falhar('Ainda não há inserção automática para ' + lesao.categoria + ' em ' + lesao.localizacao + ' neste teste. A montagem foi preservada.');
  }
  function planejar(sugestao, texto, destino, biblioteca) {
    conferirTexto(texto);
    if (!['coronal', 'sagital', 'ambas'].includes(destino)) falhar('Escolha Coronal, Sagital ou Ambas.');
    if (!sugestao || !Array.isArray(sugestao.lesoes) || sugestao.lesoes.length > 30 ||
        !Array.isArray(sugestao.duvidas) || !Array.isArray(sugestao.relacoes_anatomicas) ||
        !Number.isInteger(sugestao.confianca) || sugestao.confianca < 0 || sugestao.confianca > 100) falhar('A interpretação retornou um formato inválido. Nada foi inserido.');
    if (sugestao.duvidas.length) falhar(sugestao.duvidas.map(d => String(d.pergunta || 'Confira o comando.')).join(' '));
    if (sugestao.confianca < 70) falhar('A interpretação teve baixa confiança. Dite novamente com local, lado e medidas.');
    if (sugestao.relacoes_anatomicas.length) falhar('Aderências e deslocamentos ainda não são inseridos por voz neste teste. Dite somente a lesão, o local, o lado e as medidas.');
    if (!sugestao.lesoes.length) falhar('Nenhuma lesão foi identificada. Nada foi inserido.');
    const vistas = destino === 'ambas' ? ['coronal', 'sagital'] : [destino];
    return sugestao.lesoes.map(lesao => {
      if (!lesao || !Number.isInteger(lesao.confianca) || lesao.confianca < 70 || lesao.confianca > 100) falhar('Uma lesão não foi entendida com confiança suficiente. Confira o comando.');
      if (!['direito', 'esquerdo', 'central'].includes(lesao.lado)) falhar('Informe o lado da lesão. Para lesões bilaterais, descreva cada lado com suas próprias medidas no mesmo ditado.');
      const medidas = [lesao.medida_1, lesao.medida_2, lesao.medida_3];
      const daBiblioteca = itensDaBiblioteca.has(lesao);
      if ((!daBiblioteca && typeof medidas[0] !== 'number') || medidas.some(m => m !== null && (typeof m !== 'number' || !Number.isFinite(m) || m <= 0)) || (medidas[0] === null && medidas[1] !== null) || (medidas[1] === null && medidas[2] !== null)) falhar('Informe medidas positivas, em centímetros, na ordem correta. Nada foi inserido.');
      // O coronal também valida lateralidade na vista sagital, que não separa os lados visualmente.
      if (!pontos.coronal[lesao.localizacao]?.[lesao.lado]) falhar('A localização e o lado precisam de esclarecimento antes da inserção.');
      // Uma única lesão desta categoria pode usar seu nome explícito no ditado,
      // mesmo quando há lesões de outras categorias no mesmo texto.
      const unicaDaCategoria = sugestao.lesoes.filter(l => l.categoria === lesao.categoria).length === 1;
      const nomeModelo = daBiblioteca ? lesao.modelo : modeloPara(lesao, texto, unicaDaCategoria);
      const modelo = biblioteca.find(m => m.nome === nomeModelo);
      if (!modelo) falhar('A imagem ' + nomeModelo + ' não está disponível na biblioteca.');
      const nome = (daBiblioteca ? nomeModelo.replace(/^Adenomiose 1$/, 'Adenomiose') : nomeModelo.replace(/ 1$/, '')) + (lesao.foco && daBiblioteca ? ' · foco ' + lesao.foco : '') + (lesao.lado === 'central' ? '' : ' · ' + lesao.lado);
      const dadosMedidas = Object.fromEntries(medidas.map((m, i) => ['medida' + (i + 1), m === null ? '' : String(m).replace('.', ',')]));
      return { nome, medidas, observacao: String(lesao.observacao || ''), vistas: vistas.map(vista => {
        let [x, y, giro = Number(modelo.giroInicial || 0)] = vista === 'coronal' ? pontos.coronal[lesao.localizacao][lesao.lado] : pontos.sagital[lesao.localizacao];
        if (daBiblioteca) x = Math.max(5, Math.min(95, x + lesao.deslocamento));
        return { vista, src: modelo.modelo.split('?')[0], dados: { x, y, giro,
          tamanho: Number(modelo.tamanhoInicial || 65), eixoX: 100, eixoY: 100,
          medidaX: x, medidaY: Math.min(92, y + 9), nomeNoMapa: nome, ...dadosMedidas } };
      }) };
    });
  }
  window.EndomapaVozRegras = { planejar, conferirTexto, interpretarBiblioteca, prepararSugestaoIA };
})();
