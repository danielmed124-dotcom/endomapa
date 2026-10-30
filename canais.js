(() => {
  const base = document.getElementById('base');
  const rotulo = document.createElement('label');
  rotulo.className = 'opcao-mapa';
  const botao = document.createElement('input');
  botao.type = 'checkbox';
  botao.id = 'ligamentos-redondos';
  rotulo.append(botao, ' Ligamentos redondos');
  let mostrar = false;
  function atualizar() {
    base.src = mostrar ? 'parede-canais-inguinais-v2.png' : 'parede-anterior-v1.png';
    base.alt = mostrar ? 'Parede abdominal anterior com janelas de exposição dos canais inguinais e ligamentos redondos' : 'Parede abdominal anterior';
    botao.checked = mostrar;
  }
  botao.onchange = () => { mostrar = botao.checked; atualizar(); };
  document.getElementById('restaurar').after(rotulo);
  atualizar();
})();
