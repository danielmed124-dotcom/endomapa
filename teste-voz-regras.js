(function () {
  "use strict";
  const normalizar = texto => String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const falhar = mensagem => { throw new Error(mensagem); };
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
      falhar('O tipo da lesão ovariana ficou ambíguo. Dite uma lesão por comando, indicando, por exemplo, endometrioma ou cisto.');
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
      if (!['direito', 'esquerdo', 'central'].includes(lesao.lado)) falhar('Informe o lado da lesão. Para lesões bilaterais, dite cada lado com suas medidas em comandos separados.');
      const medidas = [lesao.medida_1, lesao.medida_2, lesao.medida_3];
      if (typeof medidas[0] !== 'number' || medidas.some(m => m !== null && (typeof m !== 'number' || !Number.isFinite(m) || m <= 0)) || (medidas[1] === null && medidas[2] !== null)) falhar('Informe medidas positivas, em centímetros, na ordem correta. Nada foi inserido.');
      // O coronal também valida lateralidade na vista sagital, que não separa os lados visualmente.
      if (!pontos.coronal[lesao.localizacao]?.[lesao.lado]) falhar('A localização e o lado precisam de esclarecimento antes da inserção.');
      const nomeModelo = modeloPara(lesao, texto, sugestao.lesoes.length === 1);
      const modelo = biblioteca.find(m => m.nome === nomeModelo);
      if (!modelo) falhar('A imagem ' + nomeModelo + ' não está disponível na biblioteca.');
      const nome = nomeModelo.replace(/ 1$/, '') + (lesao.lado === 'central' ? '' : ' · ' + lesao.lado);
      const dadosMedidas = Object.fromEntries(medidas.map((m, i) => ['medida' + (i + 1), m === null ? '' : String(m).replace('.', ',')]));
      return { nome, medidas, observacao: String(lesao.observacao || ''), vistas: vistas.map(vista => {
        const [x, y, giro = Number(modelo.giroInicial || 0)] = vista === 'coronal' ? pontos.coronal[lesao.localizacao][lesao.lado] : pontos.sagital[lesao.localizacao];
        return { vista, src: modelo.modelo.split('?')[0], dados: { x, y, giro,
          tamanho: Number(modelo.tamanhoInicial || 65), eixoX: 100, eixoY: 100,
          medidaX: x, medidaY: Math.min(92, y + 9), nomeNoMapa: nome, ...dadosMedidas } };
      }) };
    });
  }
  window.EndomapaVozRegras = { planejar, conferirTexto };
})();
