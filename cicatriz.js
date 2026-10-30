// Marcação esquemática sobre a imagem; não altera a ilustração anatômica.
(() => {
  const mapa = document.getElementById('mapa');
  const botao = document.createElement('button');
  botao.textContent = 'Inserir cicatriz de cesárea';
  botao.setAttribute('aria-pressed', 'false');
  botao.style.margin = '8px 0 0 8px';
  document.getElementById('restaurar').after(botao);
  const ns = 'http://www.w3.org/2000/svg';
  const camada = document.createElementNS(ns, 'svg');
  camada.setAttribute('viewBox', '0 0 1000 1333.333');
  camada.setAttribute('aria-label', 'Cicatriz cutânea de cesárea — marcação pontilhada');
  const grupo = document.createElementNS(ns, 'g');
  grupo.setAttribute('tabindex', '0');
  grupo.setAttribute('role', 'img');
  grupo.setAttribute('aria-label', 'Cicatriz móvel. Arraste ou use as setas para ajustar a posição.');
  grupo.style.cssText = 'cursor:move;touch-action:none;pointer-events:stroke';
  for (const [cor, largura, pontos] of [['transparent', 44, false], ['#000000', 4, true]]) {
    const linha = document.createElementNS(ns, 'path');
    linha.setAttribute('d', 'M 340 960 Q 500 1020 660 960');
    linha.setAttribute('fill', 'none');
    linha.setAttribute('stroke', cor);
    linha.setAttribute('stroke-width', largura);
    if (pontos) {
      linha.setAttribute('stroke-dasharray', '12 9');
      linha.setAttribute('stroke-linecap', 'butt');
    }
    grupo.append(linha);
  }
  camada.append(grupo);
  mapa.insertBefore(camada, document.getElementById('janela'));
  camada.style.display = 'none';
  const nota = document.createElement('p');
  nota.hidden = true;
  nota.textContent = 'Cicatriz transversal curva, em traços pretos. Arraste a linha para ajustar à paciente. A linha indica a projeção da cicatriz da pele sobre o mapa muscular; não é um corte nos músculos. Posição ilustrativa, sem escala em centímetros.';
  mapa.after(nota);
  let visivel = false, x = 0, y = 0;
  function mover(nx, ny) {
    x = Math.max(-280, Math.min(280, nx));
    y = Math.max(-250, Math.min(100, ny));
    grupo.setAttribute('transform', `translate(${x} ${y})`);
  }
  botao.onclick = () => {
    visivel = !visivel;
    camada.style.display = visivel ? '' : 'none';
    nota.hidden = !visivel;
    botao.textContent = visivel ? 'Retirar cicatriz de cesárea' : 'Inserir cicatriz de cesárea';
    botao.setAttribute('aria-pressed', String(visivel));
  };
  grupo.addEventListener('pointerdown', e => {
    e.preventDefault();
    grupo.focus();
    grupo.setPointerCapture(e.pointerId);
    const px = e.clientX, py = e.clientY, ox = x, oy = y;
    const move = e => mover(ox + (e.clientX-px)/mapa.clientWidth*1000, oy + (e.clientY-py)/mapa.clientHeight*1333.333);
    const fim = () => {
      grupo.removeEventListener('pointermove', move);
      grupo.removeEventListener('pointerup', fim);
      grupo.removeEventListener('pointercancel', fim);
    };
    grupo.addEventListener('pointermove', move);
    grupo.addEventListener('pointerup', fim);
    grupo.addEventListener('pointercancel', fim);
  });
  grupo.addEventListener('keydown', e => {
    const d = {ArrowLeft:[-4,0],ArrowRight:[4,0],ArrowUp:[0,-4],ArrowDown:[0,4]}[e.key];
    if(d) { e.preventDefault(); mover(x+d[0], y+d[1]); }
  });
  document.getElementById('restaurar').addEventListener('click', () => mover(0,0));
})();
