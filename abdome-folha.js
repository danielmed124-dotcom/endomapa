// Enquadramento da folha; a anatomia e as coordenadas salvas permanecem intactas.
(() => {
  'use strict';
  const vista = 'ceco-apendice-ileo-diafragma';
  const largura = 1086, altura = 1448, x = 0.16, y = 0.16, escala = 0.68;
  const mapa = document.querySelector(`[data-mapa-editor="${vista}"]`);
  if (mapa) {
    const desenho = mapa.querySelector('.mapa-editor__desenho');
    const folha = document.createElement('div');
    folha.dataset.folhaAbdome = '';
    folha.style.cssText = `position:relative;background:white;aspect-ratio:${largura}/${altura}`;
    desenho.before(folha);
    folha.append(desenho);
    desenho.style.cssText = `position:absolute;left:${x*100}%;top:${y*100}%;width:${escala*100}%`;
    folha.append(mapa.querySelector('[data-assinatura-manual]'));
  }
  window.endocartaFolhaAbdome = {
    aceita: id => id === vista,
    compor(cena) {
      const folha = document.createElement('canvas');
      folha.width = largura; folha.height = altura;
      const ctx = folha.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, largura, altura);
      ctx.drawImage(cena, x*largura, y*altura, escala*largura, escala*largura*cena.height/cena.width);
      return folha;
    },
  };
})();
