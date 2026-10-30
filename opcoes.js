(() => {
  const estilo = document.createElement('style');
  estilo.textContent = '.opcao-mapa{display:inline-flex;align-items:center;gap:6px;margin:8px 0 0 8px;padding:10px 12px;border:1px solid #c9a24d;border-radius:7px;color:#f5f2e9;font-weight:600;cursor:pointer;min-height:44px}.opcao-mapa input{width:18px;height:18px;accent-color:#c9a24d;margin:0}';
  document.head.append(estilo);
  const rotulo = document.createElement('label');
  rotulo.className = 'opcao-mapa';
  const controle = document.createElement('input');
  controle.type = 'checkbox';
  controle.id = 'mostrar-lupa';
  controle.checked = true;
  rotulo.append(controle, ' Lupa com corte axial');
  document.getElementById('ligamentos-redondos').parentElement.after(rotulo);
  controle.onchange = () => {
    for(const id of ['janela', 'ponto', 'linha']) {
      document.getElementById(id).style.display = controle.checked ? '' : 'none';
    }
    // Recalcula a ligação quando a lupa volta a ter dimensões visíveis.
    window.dispatchEvent(new Event('resize'));
  };
})();
