(function () {
  'use strict';
  window.endomapaCriarDocumento = function (mapas, ativar) {
    const copiar = valor => JSON.parse(JSON.stringify(valor));
    const limite = (n, max) => Math.max(0, Math.min(max, n));
    const vistas = {};
    const ajustes = document.createElement('div'); ajustes.className = 'documento-ajustes';
    const controles = document.querySelector('[data-controles-lesao]');
    controles.before(ajustes); ajustes.append(controles);
    let cabecalho = { ativo: false, campos: [] };
    const painel = document.createElement('details');
    painel.className = 'documento-opcoes';
    painel.innerHTML = `<summary>Dados da paciente (opcional)</summary><label><input type="checkbox" data-cabecalho-ativo> Mostrar cabeçalho da paciente</label><div data-campos-paciente></div><button type="button" class="botao botao--secundario" data-novo-campo>Adicionar campo</button><p>Defina os nomes e os valores dos campos. Somente campos preenchidos aparecem no mapa. Ao salvar o mapa ou gerar PDF, esses dados ficam na montagem salva na sua conta.</p>`;
    document.querySelector('.editor-manual__area').prepend(painel);
    const campos = painel.querySelector('[data-campos-paciente]');
    const ativo = painel.querySelector('input');
    function formulario() {
      ativo.checked = cabecalho.ativo;
      campos.replaceChildren();
      cabecalho.campos.forEach((campo, indice) => {
        const linha = document.createElement('div'); linha.className = 'documento-campo';
        ['nome', 'valor'].forEach(chave => {
          const label = document.createElement('label'); label.textContent = chave === 'nome' ? 'Nome do campo' : 'Informação';
          const input = document.createElement('input'); input.value = campo[chave]; input.maxLength = chave === 'nome' ? 60 : 200;
          input.addEventListener('input', () => { campo[chave] = input.value; atualizarCabecalho(); });
          label.append(input); linha.append(label);
        });
        const remover = document.createElement('button'); remover.type = 'button'; remover.textContent = 'Remover campo';
        remover.onclick = () => { cabecalho.campos.splice(indice, 1); formulario(); atualizarCabecalho(); };
        linha.append(remover); campos.append(linha);
      });
      painel.querySelector('[data-novo-campo]').disabled = cabecalho.campos.length >= 12;
    }
    ativo.onchange = () => { cabecalho.ativo = ativo.checked; atualizarCabecalho(); };
    painel.querySelector('[data-novo-campo]').onclick = () => {
      if (cabecalho.campos.length >= 12) return;
      cabecalho.campos.push({ nome: '', valor: '' }); formulario(); campos.lastChild.querySelector('input').focus();
    };
    function linhas(ctx, texto, largura) {
      const resultado = [];
      String(texto).split('\n').forEach(paragrafo => {
        let linha = '';
        for (const letra of paragrafo) {
          if (linha && ctx.measureText(linha + letra).width > largura) { resultado.push(linha); linha = ''; }
          linha += letra;
        }
        resultado.push(linha);
      });
      return resultado;
    }
    function estiloTexto(id) {
      const amostra = document.createElement('span'); amostra.className = 'medida-lesao-editavel';
      amostra.style.visibility = 'hidden'; vistas[id].camada.append(amostra);
      const css = getComputedStyle(amostra);
      const largura = vistas[id].camada.getBoundingClientRect().width || mapas.map(m => m.querySelector('.mapa-editor__desenho').getBoundingClientRect().width).find(Boolean) || 320;
      const escala = 1086 / largura;
      const estilo = { fonte: parseFloat(css.fontSize) * escala, familia: css.fontFamily, peso: css.fontWeight,
        linha: parseFloat(css.lineHeight) * escala, px: parseFloat(css.paddingLeft) * escala,
        py: parseFloat(css.paddingTop) * escala, raio: parseFloat(css.borderRadius) * escala, cor: css.color, fundo: css.backgroundColor };
      amostra.remove(); return estilo;
    }
    function imagemTexto(texto, estilo) {
      const tela = document.createElement('canvas');
      tela.setAttribute('role', 'img'); tela.setAttribute('aria-label', texto);
      let ctx = tela.getContext('2d'); const fonte = `${estilo.peso} ${estilo.fonte}px ${estilo.familia}`;
      ctx.font = fonte;
      const trechos = linhas(ctx, texto, 434 - 2 * estilo.px);
      tela.width = Math.ceil(Math.max(...trechos.map(t => ctx.measureText(t).width), 1) + 2 * estilo.px);
      tela.height = Math.ceil(trechos.length * estilo.linha + 2 * estilo.py);
      ctx = tela.getContext('2d'); ctx.fillStyle = estilo.fundo;
      ctx.beginPath(); ctx.roundRect(0, 0, tela.width, tela.height, estilo.raio); ctx.fill();
      ctx.fillStyle = estilo.cor; ctx.font = fonte; ctx.textAlign = 'center';
      const metrica = ctx.measureText('Mg');
      const base = (estilo.linha + metrica.fontBoundingBoxAscent - metrica.fontBoundingBoxDescent) / 2;
      trechos.forEach((linha, i) => ctx.fillText(linha, tela.width / 2, estilo.py + i * estilo.linha + base));
      return tela;
    }
    function imagemCabecalho(dados) {
      if (!dados.ativo) return null;
      const campos = dados.campos.filter(c => c.nome.trim() && c.valor.trim());
      if (!campos.length) return null;
      const tela = document.createElement('canvas'); tela.width = 1086;
      const ctx = tela.getContext('2d'); const larguras = [570, 230, 230], posicoes = [28, 598, 828];
      const blocos = campos.map((campo, i) => {
        ctx.font = '16px Arial'; const nomes = linhas(ctx, campo.nome.trim(), larguras[i % 3] - 20);
        ctx.font = 'bold 20px Arial'; const valores = linhas(ctx, campo.valor.trim(), larguras[i % 3] - 20);
        return { nomes, valores, altura: nomes.length * 19 + valores.length * 23 + 12 };
      });
      const alturas = [];
      for (let i = 0; i < blocos.length; i += 3) alturas.push(Math.max(...blocos.slice(i, i + 3).map(b => b.altura)));
      tela.height = alturas.reduce((a, b) => a + b, 0) + 32;
      tela.setAttribute('role', 'img'); tela.setAttribute('aria-label', campos.map(c => `${c.nome}: ${c.valor}`).join('; '));
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, tela.width, tela.height);
      ctx.strokeStyle = '#303030'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(10, 8, 1066, tela.height - 16, 24); ctx.stroke();
      ctx.fillStyle = '#111'; ctx.textBaseline = 'top';
      let y = 18;
      blocos.forEach((bloco, i) => {
        if (i && i % 3 === 0) y += alturas[i / 3 - 1];
        ctx.font = '16px Arial'; bloco.nomes.forEach((t, n) => ctx.fillText(t, posicoes[i % 3], y + n * 19));
        ctx.font = 'bold 20px Arial'; bloco.valores.forEach((t, n) => ctx.fillText(t, posicoes[i % 3], y + bloco.nomes.length * 19 + n * 23));
      });
      return tela;
    }
    function atualizarCabecalho() {
      mapas.forEach(mapa => {
        const previa = vistas[mapa.dataset.mapaEditor].previa;
        const tela = imagemCabecalho(cabecalho); previa.replaceChildren(); previa.hidden = !tela;
        if (tela) previa.append(tela);
      });
    }
    mapas.forEach(mapa => {
      const id = mapa.dataset.mapaEditor;
      const previa = document.createElement('div'); previa.className = 'documento-cabecalho'; previa.hidden = true; mapa.before(previa);
      const barra = document.createElement('div'); barra.className = 'documento-textos';
      barra.innerHTML = `<button type="button" class="botao botao--secundario" data-adicionar-texto>Adicionar caixa de texto</button><div data-edicao-texto hidden><label>Texto livre<textarea maxlength="500" rows="3" data-texto-livre></textarea></label><p>Arraste a caixa no mapa ou ajuste a posição abaixo.</p><label>Posição horizontal<input type="range" min="0" max="60" step="0.1" data-texto-x></label><label>Posição vertical<input type="range" min="0" max="90" step="0.1" data-texto-y></label><button type="button" data-excluir-texto>Excluir caixa de texto</button></div>`;
      barra.dataset.textosVista = id; barra.hidden = id !== 'coronal'; controles.before(barra);
      const desenho = mapa.querySelector('.mapa-editor__desenho');
      const camada = document.createElement('div'); camada.className = 'documento-camada'; desenho.append(camada);
      const estado = vistas[id] = { textos: [], previa, camada, selecionado: null, barra };
      const edicao = barra.querySelector('[data-edicao-texto]');
      const campo = barra.querySelector('textarea');
      function selecionar(item) {
        ativar(id); estado.selecionado = item; edicao.hidden = !item;
        if (item) { campo.value = item.texto; barra.querySelector('[data-texto-x]').value = item.x; barra.querySelector('[data-texto-y]').value = item.y; }
      }
      estado.selecionar = selecionar;
      barra.querySelector('[data-adicionar-texto]').onclick = () => {
        if (estado.textos.length >= 50) return;
        const item = { texto: '', x: 5, y: 15 }; estado.textos.push(item); selecionar(item); desenhar(id); campo.focus();
      };
      campo.oninput = () => { if (estado.selecionado) { estado.selecionado.texto = campo.value; desenhar(id); } };
      ['x', 'y'].forEach(eixo => { barra.querySelector(`[data-texto-${eixo}]`).oninput = evento => {
        if (estado.selecionado) { estado.selecionado[eixo] = Number(evento.target.value); desenhar(id); }
      }; });
      barra.querySelector('[data-excluir-texto]').onclick = () => { estado.textos = estado.textos.filter(t => t !== estado.selecionado); selecionar(null); desenhar(id); };
      estado.criarBotao = item => {
        const botao = document.createElement('button'); botao.type = 'button'; botao.className = 'documento-texto';
        botao.setAttribute('aria-label', item.texto || 'Caixa de texto vazia');
        const imagem = imagemTexto(item.texto || 'Digite seu texto', estiloTexto(id));
        botao.append(imagem); botao.style.width = `${imagem.width / 1086 * 100}%`;
        botao.style.left = `${item.x}%`; botao.style.top = `${item.y}%`;
        botao.onclick = () => selecionar(item);
        botao.onpointerdown = evento => {
          evento.preventDefault(); selecionar(item); botao.setPointerCapture(evento.pointerId);
          const rect = desenho.getBoundingClientRect(), inicio = { x: evento.clientX, y: evento.clientY, px: item.x, py: item.y };
          botao.onpointermove = e => {
            item.x = limite(inicio.px + (e.clientX - inicio.x) / rect.width * 100, 60);
            item.y = limite(inicio.py + (e.clientY - inicio.y) / rect.height * 100, Math.max(0, 100 - botao.offsetHeight / rect.height * 100));
            botao.style.left = `${item.x}%`; botao.style.top = `${item.y}%`; selecionar(item);
          };
          botao.onpointerup = botao.onpointercancel = () => { botao.onpointermove = null; };
        };
        return botao;
      };
    });
    function desenhar(id) {
      const estado = vistas[id]; estado.camada.replaceChildren();
      estado.textos.forEach(item => {
        const botao = estado.criarBotao(item);
        // Limita também a altura após editar o texto, para não cortar a anotação.
        const altura = botao.firstChild.height / 1448 * 100;
        item.y = limite(item.y, Math.max(0, 100 - altura)); botao.style.top = `${item.y}%`;
        estado.camada.append(botao);
      });
    }
    formulario();
    window.addEventListener('resize', () => Object.keys(vistas).forEach(desenhar));
    return {
      ativar(id) { Object.entries(vistas).forEach(([vista, estado]) => { estado.barra.hidden = vista !== id; }); },
      capturar: (aparencia = false) => copiar({ cabecalho, textos: Object.fromEntries(Object.entries(vistas).map(([id, v]) => [id, v.textos])), ...(aparencia ? { estilos: Object.fromEntries(Object.keys(vistas).map(id => [id, estiloTexto(id)])) } : {}) }),
      validar(dados) {
        if (dados === undefined) return;
        const falhar = () => { throw new Error('Textos ou cabeçalho incompatíveis. O mapa aberto foi preservado.'); };
        if (!dados || typeof dados.cabecalho?.ativo !== 'boolean' || !Array.isArray(dados.cabecalho.campos) || dados.cabecalho.campos.length > 12 || !dados.textos) falhar();
        dados.cabecalho.campos.forEach(c => { if (!c || typeof c.nome !== 'string' || c.nome.length > 60 || typeof c.valor !== 'string' || c.valor.length > 200) falhar(); });
        Object.entries(dados.textos).forEach(([id, textos]) => {
          if (!Object.hasOwn(vistas, id) || !Array.isArray(textos) || textos.length > 50) falhar();
          textos.forEach(t => { if (!t || typeof t.texto !== 'string' || t.texto.length > 500 || !Number.isFinite(t.x) || t.x < 0 || t.x > 60 || !Number.isFinite(t.y) || t.y < 0 || t.y > 100) falhar(); });
        });
      },
      restaurar(dados) {
        cabecalho = copiar(dados?.cabecalho || { ativo: false, campos: [] });
        Object.entries(vistas).forEach(([id, estado]) => { estado.textos = copiar(dados?.textos[id] || []); estado.selecionar(null); desenhar(id); });
        formulario(); atualizarCabecalho();
      },
      limpar(id) { vistas[id].textos = []; vistas[id].selecionar(null); desenhar(id); },
      temTexto: id => vistas[id].textos.some(t => t.texto.trim()),
      compor(canvas, dados, id) {
        if (!dados) return canvas;
        const ctx = canvas.getContext('2d');
        (dados.textos[id] || []).filter(t => t.texto.trim()).forEach(t => {
          const imagem = imagemTexto(t.texto, dados.estilos?.[id] || estiloTexto(id)); const escala = canvas.width / 1086;
          ctx.drawImage(imagem, t.x * canvas.width / 100, t.y * canvas.height / 100, imagem.width * escala, imagem.height * escala);
        });
        const topo = imagemCabecalho(dados.cabecalho); if (!topo) return canvas;
        const resultado = document.createElement('canvas'); resultado.width = canvas.width;
        const altura = Math.round(topo.height * canvas.width / topo.width); resultado.height = canvas.height + altura;
        resultado.getContext('2d').drawImage(topo, 0, 0, canvas.width, altura);
        resultado.getContext('2d').drawImage(canvas, 0, altura); return resultado;
      },
    };
  };
})();
