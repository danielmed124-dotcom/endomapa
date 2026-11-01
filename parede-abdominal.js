(() => {
  'use strict';
  const vista='parede-abdominal', mapa=document.querySelector(`[data-mapa-editor="${vista}"] .mapa-editor__desenho`);
  if(!mapa)return;
  document.querySelector('[data-vista-manual="coronal"]').parentElement.append(mapa.closest('[data-vista-manual]'));
  const inicial=()=>({ligamentos:false,lupa:true,cicatriz:false,janela:{x:61,y:8},ponto:{x:64,y:61},cicatrizPos:{x:0,y:0}});
  let estado=inicial(),carregado=false;
  let unidade=window.endomapaMedico?.unidade_medidas==='mm'?'mm':'cm';
  function converter(valor,fator){if(!valor||fator===1)return valor;const n=Number(valor.replace(',','.'));return Number.isFinite(n)?String(Number((n*fator).toFixed(8))).replace('.',','):valor;}
  const exibir=valor=>converter(valor,unidade==='mm'?10:1);
  const armazenar=valor=>converter(valor,unidade==='mm'?0.1:1);
  const formatar=valor=>Number(exibir(valor).replace(',','.')).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:2});
  const tela=document.createElement('canvas');tela.width=1086;tela.height=1448;tela.dataset.paredeTela='';mapa.append(tela);
  const telaLesoes=document.createElement('canvas');telaLesoes.width=1086;telaLesoes.height=1448;telaLesoes.dataset.paredeLesoes='';mapa.append(telaLesoes);
  const q=s=>document.querySelector(`[data-parede-${s}]`),ligamentos=q('ligamentos'),lupa=q('lupa'),cicatriz=q('cicatriz');
  const imagens=['parede-anterior-v1.png','parede-canais-inguinais-v2.png','corte-axial-subcutaneo-v3.png','endometrioma-parede-axial-v2.png'].map(nome=>{const img=new Image();img.src=`assets/parede-abdominal/${nome}`;return img;});
  const axialInicial=()=>({visivel:false,x:35,y:48});
  const axial=()=>estado.axial || axialInicial();
  function posicaoInicialRotulo(indice=0){
    const proporcao=mapa.clientWidth&&mapa.clientHeight?mapa.clientWidth/mapa.clientHeight:1086/1448;
    return {x:estado.janela.x+18,y:estado.janela.y+36*proporcao*(.18+(indice%3)*.09)};
  }
  const todosAxiais=()=>[...(estado.axiais||[]),...(estado.axial?[estado.axial]:[])];
  const alcasExtras=new Map();
  function ativarPar(id){
    if(axial().parId===id)return;
    const alvo=(estado.axiais||[]).find(a=>a.parId===id);if(!alvo)return;
    estado.axiais=estado.axiais.filter(a=>a!==alvo);if(estado.axial)estado.axiais.push(estado.axial);estado.axial=alvo;desenhar();
  }
  function inserirPar(id){
    if(todosAxiais().some(a=>a.parId===id)){ativarPar(id);return;}
    if(estado.axial?.parId){estado.axiais=[...(estado.axiais||[]),estado.axial];const n=estado.axiais.length;estado.axial={...axialInicial(),visivel:true,parId:id,x:35+(n%3)*15,y:48+(Math.floor(n/3)%2)*12,rotulo:posicaoInicialRotulo(n)};}
    else estado.axial={...axial(),visivel:true,parId:id};
    estado.lupa=true;desenhar();
  }
  function removerPar(id){
    if(!id)return;
    estado.axiais=(estado.axiais||[]).filter(a=>a.parId!==id);
    if(estado.axial?.parId===id){if(estado.axiais.length)estado.axial=estado.axiais.pop();else delete estado.axial;}
    if(!estado.axiais.length)delete estado.axiais;desenhar();
  }
  function excluirParAtual(){if(axial().parId){window.dispatchEvent(new CustomEvent('endomapa:excluir-par-parede',{detail:axial().parId}));return true;}return false;}
  const painelAxial=document.createElement('div');painelAxial.className='parede-axial-controles';
  const inserirAxial=document.createElement('button');inserirAxial.type='button';inserirAxial.className='botao botao--secundario';inserirAxial.dataset.paredeAxial='';
  const ajudaAxial=document.createElement('p');ajudaAxial.textContent='Arraste a lesão dentro da lupa ou use as setas do teclado para ajustar sua posição no corte axial.';
  painelAxial.append(inserirAxial,ajudaAxial);q('restaurar').closest('.parede-controles').after(painelAxial);
  const edicaoAxial=document.createElement('div');edicaoAxial.className='parede-axial-edicao';
  edicaoAxial.innerHTML='<fieldset class="medidas-editor"><legend>Medidas em centímetros</legend><label class="medidas-editor__nome"><span>Nome da lesão no mapa · opcional</span><input type="text" maxlength="60" data-axial-nome></label><label><span>1ª medida</span><input type="text" inputmode="decimal" maxlength="12" data-axial-medida="1" placeholder="Ex.: 1,0"></label><label><span>2ª medida</span><input type="text" inputmode="decimal" maxlength="12" data-axial-medida="2" placeholder="Ex.: 0,5"></label><label><span>3ª medida · opcional</span><input type="text" inputmode="decimal" maxlength="12" data-axial-medida="3" placeholder="Ex.: 0,3"></label></fieldset><button type="button" class="botao botao--secundario" data-axial-texto>Adicionar caixa de texto</button>';
  const painelAjustar=document.querySelector('[data-controles-lesao]');
  painelAjustar.querySelector('[data-remover-lesao]').before(edicaoAxial);
  const distancias=document.createElement('fieldset');distancias.className='medidas-editor parede-axial-distancias';distancias.hidden=true;
  distancias.innerHTML='<legend>Distâncias em centímetros</legend><label><span>Distância do peritônio</span><input type="text" inputmode="decimal" maxlength="12" data-axial-distancia="distanciaPeritonio" placeholder="Ex.: 1,0"></label><label><span>Distância da pele</span><input type="text" inputmode="decimal" maxlength="12" data-axial-distancia="distanciaPele" placeholder="Ex.: 0,5"></label>';
  edicaoAxial.after(distancias);
  const camposDistancias=[...distancias.querySelectorAll('input')];
  function mostrarDistancias(id){distancias.hidden=!id;desenhar();}
  camposDistancias.forEach(campo=>campo.oninput=()=>{const partes=campo.value.replace('.',',').replace(/[^0-9,]/g,'').split(',');campo.value=(partes.length>1?partes.shift()+','+partes.join('').slice(0,2):partes[0]).slice(0,12);estado.axial={...axial(),[campo.dataset.axialDistancia]:armazenar(campo.value)};desenhar();});
  function linhasDistancias(){
    const itens=todosAxiais().filter(a=>a.visivel),linhas=[];
    itens.forEach((a,i)=>{for(const [campo,nome]of [['distanciaPeritonio','Distância do peritônio'],['distanciaPele','Distância da pele']]){
      const valor=a[campo];if(!valor||!Number.isFinite(Number(valor.replace(',','.'))))continue;
      if(linhas.length)linhas.push('');
      linhas.push((itens.length>1?(i+1)+' · ':'')+nome+': '+formatar(valor)+' '+unidade);
    }});return linhas;
  }
  let editandoAxial=false;
  const geometriaAxial=a=>({giro:a.giro??0,tamanho:a.tamanho??100,eixoX:a.eixoX??100,eixoY:a.eixoY??100});
  function geometriaEmEdicao(){return editandoAxial&&axial().visivel?geometriaAxial(axial()):null;}
  function aplicarGeometria(valores){
    if(!geometriaEmEdicao())return;
    const novo={...axial(),...valores};validarBase({...estado,axial:novo});estado.axial=novo;desenhar();
  }
  function editarNoPainel(ativo){
    editandoAxial=Boolean(ativo);painelAjustar.classList.toggle('controles-lesao--axial',editandoAxial);
    edicaoAxial.hidden=!editandoAxial||!axial().visivel;
    if(editandoAxial){
      painelAjustar.hidden=false;distancias.hidden=false;painelAjustar.querySelector('[data-nome-lesao]').textContent='Endometrioma de parede · corte axial';
      const g=geometriaAxial(axial());
      for(const [campo,seletor,saida,sufixo]of [['giro','giro','giro','°'],['tamanho','tamanho','tamanho','%'],['eixoX','eixo-x','eixo-x','%'],['eixoY','eixo-y','eixo-y','%']]){
        const input=painelAjustar.querySelector('[data-controle-'+seletor+']');if(campo==='tamanho')input.min='5';input.value=g[campo];painelAjustar.querySelector('[data-valor-'+saida+']').textContent=g[campo]+sufixo;
      }
    }
  }
  const nomeAxial=edicaoAxial.querySelector('[data-axial-nome]'),camposAxiais=[...edicaoAxial.querySelectorAll('[data-axial-medida]')];
  const nomeDoAxial=()=>axial().nome??'Endometrioma de parede';
  const posicaoRotulo=()=>axial().rotulo??posicaoInicialRotulo();
  nomeAxial.oninput=()=>{estado.axial={...axial(),nome:nomeAxial.value};desenhar();};
  camposAxiais.forEach(campo=>campo.oninput=()=>{const partes=campo.value.replace('.',',').replace(/[^0-9,]/g,'').split(',');campo.value=(partes.length>1?partes.shift()+','+partes.join('').slice(0,2):partes[0]).slice(0,12);estado.axial={...axial(),['medida'+campo.dataset.axialMedida]:armazenar(campo.value)};desenhar();});
  edicaoAxial.querySelector('[data-axial-texto]').onclick=()=>{
    window.dispatchEvent(new Event('endomapa:movimentar-parede'));
    const barra=document.querySelector('[data-textos-vista="parede-abdominal"]');barra.querySelector('[data-adicionar-texto]').click();barra.scrollIntoView({block:'center',behavior:'smooth'});
  };
  const rotuloAxial=document.createElement('span');rotuloAxial.className='medida-lesao-editavel parede-axial-rotulo';rotuloAxial.dataset.axialRotulo='';rotuloAxial.tabIndex=0;rotuloAxial.setAttribute('aria-label','Arraste para mover o nome e as medidas da lesão axial');mapa.append(rotuloAxial);
  const telaRotulo=document.createElement('canvas');telaRotulo.width=1086;telaRotulo.height=1448;telaRotulo.dataset.paredeAnotacoes='';mapa.append(telaRotulo);
  let anotacoesOcultas=false;
  function moverRotulo(x,y){estado.axial={...axial(),rotulo:{x:Math.max(13,Math.min(87,x)),y:Math.max(2,Math.min(85,y))}};desenhar();}
  rotuloAxial.addEventListener('pointerdown',e=>{if(e.button!==0||e.isPrimary===false)return;e.preventDefault();e.stopPropagation();window.dispatchEvent(new Event('endomapa:movimentar-parede'));rotuloAxial.focus({preventScroll:true});rotuloAxial.setPointerCapture(e.pointerId);const inicio={...posicaoRotulo()},r=mapa.getBoundingClientRect(),px=e.clientX,py=e.clientY;
    const mover=e=>moverRotulo(inicio.x+(e.clientX-px)/r.width*100,inicio.y+(e.clientY-py)/r.height*100);
    const fim=()=>{rotuloAxial.removeEventListener('pointermove',mover);rotuloAxial.removeEventListener('pointerup',fim);rotuloAxial.removeEventListener('pointercancel',fim);};rotuloAxial.addEventListener('pointermove',mover);rotuloAxial.addEventListener('pointerup',fim);rotuloAxial.addEventListener('pointercancel',fim);
  });
  rotuloAxial.addEventListener('keydown',e=>{const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(d){e.preventDefault();moverRotulo(posicaoRotulo().x+d[0],posicaoRotulo().y+d[1]);}});
  function pintarAnotacoes(canvas,desenharTexto=true){
    const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;c.clearRect(0,0,w,h);
    rotuloAxial.hidden=true;
    for(const a of todosAxiais()){
    const ativo=a===estado.axial,pos=a.rotulo??posicaoInicialRotulo(),valores=[a.medida1,a.medida2,a.medida3].filter(Boolean).map(formatar);
    const texto=[(a.nome??'Endometrioma de parede').trim(),valores.length?valores.join(' × ')+' '+unidade:''].filter(Boolean).join('\n');
    if(!a.visivel||!estado.lupa||anotacoesOcultas||!texto)continue;
    if(ativo){rotuloAxial.hidden=false;rotuloAxial.textContent=texto;rotuloAxial.style.left=pos.x+'%';rotuloAxial.style.top=pos.y+'%';}
    const css=getComputedStyle(rotuloAxial),escala=w/(mapa.clientWidth||600),fonte=parseFloat(css.fontSize)*escala,linha=fonte*1.15,padx=4*escala,pady=2*escala;
    c.font=`800 ${fonte}px ${css.fontFamily}`;const linhas=[];
    for(const paragrafo of texto.split('\n')){let atual='';for(const palavra of paragrafo.split(/\s+/)){const tentativa=atual?atual+' '+palavra:palavra;if(atual&&c.measureText(tentativa).width>w*.26-padx*2){linhas.push(atual);atual=palavra;}else atual=tentativa;}linhas.push(atual);}
    const largura=Math.max(...linhas.map(t=>c.measureText(t).width))+padx*2,altura=linhas.length*linha+pady*2,x=pos.x*w/100,y=pos.y*h/100;
    if(ativo){rotuloAxial.textContent=linhas.join('\n');rotuloAxial.style.width=(largura/w*100)+'%';}
    c.strokeStyle='#000';c.lineWidth=1.5*escala;c.setLineDash([1.5*escala,3*escala]);c.beginPath();c.moveTo(estado.janela.x*w/100+w*.36*a.x/100,estado.janela.y*h/100+w*.36*a.y/100);c.lineTo(x,y);c.stroke();c.setLineDash([]);
    if(desenharTexto||!ativo){c.fillStyle='rgba(255,255,255,.88)';c.beginPath();c.roundRect(x-largura/2,y,largura,altura,4*escala);c.fill();c.fillStyle='#7c1919';c.textAlign='center';c.textBaseline='top';linhas.forEach((t,i)=>c.fillText(t,x,y+pady+i*linha));}
    }
    const dist=linhasDistancias();telaRotulo.setAttribute('aria-label',dist.join(' '));
    if(estado.lupa&&!anotacoesOcultas&&dist.length){
      const diametro=w*.36,escala=w/(mapa.clientWidth||600),fonte=Math.min(10*escala,diametro*.27/(dist.length*1.15)),linha=fonte*1.15,x=estado.janela.x*w/100+diametro/2,y=estado.janela.y*h/100+diametro*.65;
      c.fillStyle='#7c1919';c.textAlign='center';c.textBaseline='top';c.font=`800 ${fonte}px "Segoe UI",sans-serif`;
      dist.forEach((texto,i)=>c.fillText(texto,x,y+i*linha,diametro*.76));
    }
  }
  const alcaAxial=document.createElement('button');alcaAxial.type='button';alcaAxial.className='parede-alca parede-alca--axial';alcaAxial.dataset.paredeAlca='axial';alcaAxial.setAttribute('aria-label','Mover endometrioma dentro do corte axial');mapa.append(alcaAxial);
  alcaAxial.onclick=()=>{if(axial().parId)window.dispatchEvent(new CustomEvent('endomapa:selecionar-par-parede',{detail:axial().parId}));editarNoPainel(true);};
  function moverAxial(x,y){const dx=x-50,dy=y-50,distancia=Math.hypot(dx,dy),fator=distancia>32?32/distancia:1;estado.axial={...axial(),visivel:true,x:50+dx*fator,y:50+dy*fator};desenhar();}
  inserirAxial.onclick=()=>{if(excluirParAtual())return;if(!axial().visivel){document.querySelector('[data-editar-vista="parede-abdominal"]').click();document.querySelector('[data-modelo="assets/lesoes/endometrioma-parede-v3.png"]').click();return;}estado.axial={...axial(),visivel:false};desenhar();};
  for(const alvo of [alcaAxial,rotuloAxial])alvo.addEventListener('keydown',e=>{if(e.key==='Delete'){e.preventDefault();e.stopPropagation();if(!excluirParAtual()){delete estado.axial;desenhar();}}});
  alcaAxial.addEventListener('pointerdown',e=>{
    if(e.button!==0||e.isPrimary===false)return;
    e.preventDefault();e.stopPropagation();window.dispatchEvent(new Event('endomapa:movimentar-parede'));alcaAxial.focus();alcaAxial.setPointerCapture(e.pointerId);
    const diametro=mapa.getBoundingClientRect().width*.36,origem={...axial()},px=e.clientX,py=e.clientY;
    const mover=e=>moverAxial(origem.x+(e.clientX-px)/diametro*100,origem.y+(e.clientY-py)/diametro*100);
    const fim=()=>{alcaAxial.removeEventListener('pointermove',mover);alcaAxial.removeEventListener('pointerup',fim);alcaAxial.removeEventListener('pointercancel',fim);alcaAxial.removeEventListener('lostpointercapture',fim);};
    alcaAxial.addEventListener('pointermove',mover);alcaAxial.addEventListener('pointerup',fim);alcaAxial.addEventListener('pointercancel',fim);alcaAxial.addEventListener('lostpointercapture',fim);
  });
  alcaAxial.addEventListener('keydown',e=>{const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(d){e.preventDefault();e.stopPropagation();window.dispatchEvent(new Event('endomapa:movimentar-parede'));moverAxial(axial().x+d[0],axial().y+d[1]);}});
  const copiar=o=>JSON.parse(JSON.stringify(o));
  const limites={janela:[0,64,0,73],ponto:[3,97,0,97],cicatrizPos:[-280,280,-250,100]};
  const alcas={};
  for(const [id,nome]of [['janela','Lupa móvel com corte axial'],['ponto','Ponto de ligação móvel'],['cicatrizPos','Cicatriz móvel']]){
    const el=document.createElement('button');el.type='button';el.className=`parede-alca parede-alca--${id==='cicatrizPos'?'cicatriz':id}`;el.setAttribute('aria-label',nome);el.dataset.paredeAlca=id;mapa.append(el);alcas[id]=el;
    function mover(x,y){const [xmin,xmax,ymin,ymax]=limites[id];estado[id]={x:Math.max(xmin,Math.min(xmax,x)),y:Math.max(ymin,Math.min(ymax,y))};desenhar();}
    el.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();window.dispatchEvent(new Event('endomapa:movimentar-parede'));el.focus();el.setPointerCapture(e.pointerId);const r=mapa.getBoundingClientRect(),ox=estado[id].x,oy=estado[id].y,px=e.clientX,py=e.clientY;
      const move=e=>mover(ox+(e.clientX-px)/r.width*(id==='cicatrizPos'?1000:100),oy+(e.clientY-py)/r.height*(id==='cicatrizPos'?1333.333:100));
      const fim=()=>{el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',fim);el.removeEventListener('pointercancel',fim);};el.addEventListener('pointermove',move);el.addEventListener('pointerup',fim);el.addEventListener('pointercancel',fim);
    });
    el.addEventListener('keydown',e=>{const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(d){e.preventDefault();e.stopPropagation();mover(estado[id].x+d[0]*(id==='cicatrizPos'?4:1),estado[id].y+d[1]*(id==='cicatrizPos'?4:1));}});
  }
  function pintar(canvas){
    const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height,escala=w/(mapa.clientWidth||600);
    c.clearRect(0,0,w,h);c.drawImage(imagens[estado.ligamentos?1:0],0,0,w,h);
    if(estado.cicatriz){c.save();c.scale(w/1000,h/1333.333);c.translate(estado.cicatrizPos.x,estado.cicatrizPos.y);c.strokeStyle='#000000';c.lineWidth=4;c.setLineDash([12,9]);c.beginPath();c.moveTo(340,960);c.quadraticCurveTo(500,1020,660,960);c.stroke();c.restore();}
    if(estado.lupa){
      const r=w*.18,x=estado.janela.x*w/100+r,y=estado.janela.y*h/100+r,px=estado.ponto.x*w/100,py=estado.ponto.y*h/100;
      c.save();c.strokeStyle='#b4944b';c.lineWidth=2*escala;c.setLineDash([5*escala,4*escala]);c.beginPath();c.moveTo(px,py);c.lineTo(x,y);c.stroke();c.setLineDash([]);
      c.shadowColor='#0002';c.shadowBlur=25*escala;c.shadowOffsetY=7*escala;c.fillStyle='#fff';c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();c.shadowColor='transparent';
      c.save();c.clip();const iw=2*r,ih=iw*imagens[2].naturalHeight/imagens[2].naturalWidth;c.drawImage(imagens[2],x-r,y-ih/2,iw,ih);
      c.restore();
      c.strokeStyle='#c9a24d';c.lineWidth=3*escala;c.stroke();c.fillStyle='#675432';c.font=`${Math.min(13,Math.max(9,innerWidth*.016))*escala}px "Segoe UI", sans-serif`;c.textAlign='center';if(!linhasDistancias().length)c.fillText('Corte axial',x,y+r*.63);
      c.fillStyle='#c9a24d88';c.strokeStyle='#8b6927';c.lineWidth=2*escala;c.beginPath();c.arc(px,py,13*escala,0,Math.PI*2);c.fill();c.stroke();c.restore();
    }
  }
  function pintarLesoes(canvas){
    const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height,escala=w/(mapa.clientWidth||600);
    c.clearRect(0,0,w,h);
    if(!estado.lupa)return;
    const r=w*.18,x=estado.janela.x*w/100+r,y=estado.janela.y*h/100+r,iw=2*r;
    c.save();c.beginPath();c.arc(x,y,Math.max(0,r-1.5*escala),0,Math.PI*2);c.clip();
    for(const a of todosAxiais().filter(a=>a.visivel)){const g=geometriaAxial(a),base=iw*.25*g.tamanho/100,aw=base*g.eixoX/100,ah=base*imagens[3].naturalHeight/imagens[3].naturalWidth*g.eixoY/100;c.save();c.translate(x-r+iw*a.x/100,y-r+iw*a.y/100);c.rotate(g.giro*Math.PI/180);c.drawImage(imagens[3],-aw/2,-ah/2,aw,ah);c.restore();}
    c.restore();
  }
  function desenhar(){
    camposDistancias.forEach(campo=>{if(document.activeElement!==campo)campo.value=exibir(axial()[campo.dataset.axialDistancia]||'');});
    edicaoAxial.hidden=!axial().visivel||!editandoAxial;
    if(document.activeElement!==nomeAxial)nomeAxial.value=nomeDoAxial();
    camposAxiais.forEach(campo=>{if(document.activeElement!==campo)campo.value=exibir(axial()['medida'+campo.dataset.axialMedida]||'');});
    const a=axial(),diametro=mapa.clientWidth*.36;
    inserirAxial.textContent=a.parId?'Excluir lesão dos dois mapas':a.visivel?'Retirar lesão do corte axial':'Inserir endometrioma nos dois mapas';inserirAxial.setAttribute('aria-pressed',String(a.visivel));
    ajudaAxial.hidden=!a.visivel;alcaAxial.hidden=!a.visivel||!estado.lupa;
    alcaAxial.style.left=(estado.janela.x+36*a.x/100)+'%';alcaAxial.style.top=(estado.janela.y*mapa.clientHeight/100+diametro*a.y/100)+'px';
    const geometria=geometriaAxial(a),razao=imagens[3].naturalWidth?imagens[3].naturalHeight/imagens[3].naturalWidth:1/1.6;
    alcaAxial.style.width=Math.min(diametro,diametro*.25*geometria.tamanho/100*geometria.eixoX/100)+'px';
    alcaAxial.style.height=Math.min(diametro,diametro*.25*razao*geometria.tamanho/100*geometria.eixoY/100)+'px';
    alcaAxial.style.transform=`translate(-50%,-50%) rotate(${geometria.giro}deg)`;
    const extras=estado.axiais||[];
    for(const [id,el]of alcasExtras)if(!extras.some(a=>a.parId===id)){el.remove();alcasExtras.delete(id);}
    for(const outro of extras){let el=alcasExtras.get(outro.parId);if(!el){el=document.createElement('button');el.type='button';el.className='parede-alca parede-alca--axial';el.dataset.axialPar=outro.parId;el.setAttribute('aria-label','Selecionar endometrioma no corte axial');el.onclick=()=>{ativarPar(outro.parId);alcaAxial.focus({preventScroll:true});};mapa.append(el);alcasExtras.set(outro.parId,el);}el.hidden=!outro.visivel||!estado.lupa;el.style.left=(estado.janela.x+36*outro.x/100)+'%';el.style.top=(estado.janela.y*mapa.clientHeight/100+diametro*outro.y/100)+'px';}
    for(const [botao,chave] of [[ligamentos,'ligamentos'],[lupa,'lupa'],[cicatriz,'cicatriz']])botao.setAttribute('aria-pressed',String(estado[chave]));q('nota').hidden=!estado.cicatriz;
    for(const id of ['janela','ponto']){alcas[id].hidden=!estado.lupa;alcas[id].style.left=estado[id].x+'%';alcas[id].style.top=estado[id].y+'%';}
    alcas.cicatrizPos.hidden=!estado.cicatriz;alcas.cicatrizPos.style.left=(50+estado.cicatrizPos.x/10)+'%';alcas.cicatrizPos.style.top=((980+estado.cicatrizPos.y)/1333.333*100)+'%';
    if(carregado){pintar(tela);pintarLesoes(telaLesoes);}
    pintarAnotacoes(telaRotulo,false);
  }
  function validarBase(e){if(e===undefined)return;const falhar=()=>{throw Error('Posições da parede abdominal incompatíveis. O mapa aberto foi preservado.');};if(!e||typeof e!=='object')falhar();for(const k of ['ligamentos','lupa','cicatriz'])if(typeof e[k]!=='boolean')falhar();for(const [k,[xmin,xmax,ymin,ymax]]of Object.entries(limites)){const p=e[k];if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<xmin||p.x>xmax||p.y<ymin||p.y>ymax)falhar();}if(e.axial!==undefined){const a=e.axial;if(!a||typeof a.visivel!=='boolean'||!Number.isFinite(a.x)||!Number.isFinite(a.y)||Math.hypot(a.x-50,a.y-50)>32.000001)falhar();for(const [chave,min,max]of [['giro',-180,180],['tamanho',5,250],['eixoX',40,250],['eixoY',40,250]])if(a[chave]!==undefined&&(!Number.isFinite(a[chave])||a[chave]<min||a[chave]>max))falhar();if(a.nome!==undefined&&(typeof a.nome!=='string'||a.nome.length>60))falhar();for(const k of ['medida1','medida2','medida3','distanciaPeritonio','distanciaPele'])if(a[k]!==undefined&&(typeof a[k]!=='string'||a[k].length>12||!/^\d*(,\d{0,3})?$/.test(a[k])))falhar();if(a.rotulo!==undefined){const p=a.rotulo;if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<13||p.x>87||p.y<2||p.y>85)falhar();}}}
  ligamentos.onclick=()=>{estado.ligamentos=!estado.ligamentos;desenhar();};lupa.onclick=()=>{estado.lupa=!estado.lupa;desenhar();};cicatriz.onclick=()=>{estado.cicatriz=!estado.cicatriz;desenhar();};q('restaurar').onclick=()=>{Object.assign(estado,{janela:{x:61,y:8},ponto:{x:64,y:61},cicatrizPos:{x:0,y:0}});if(estado.axial)estado.axial={...estado.axial,x:35,y:48,rotulo:posicaoInicialRotulo()};desenhar();};
  new ResizeObserver(desenhar).observe(mapa);
  function validar(e){
    validarBase(e);if(e===undefined)return;
    const falhar=()=>{throw Error('Vínculo da lesão axial incompatível. O mapa aberto foi preservado.');};
    if(e.axiais!==undefined&&(!Array.isArray(e.axiais)||e.axiais.length>499))falhar();
    const itens=[...(e.axiais||[]),...(e.axial?[e.axial]:[])],ids=new Set();
    for(const a of itens){validarBase({...e,axial:a});if(a.parId!==undefined){if(typeof a.parId!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(a.parId)||ids.has(a.parId))falhar();ids.add(a.parId);}}
    if((e.axiais||[]).some(a=>!a.parId))falhar();
  }
  const pronto=Promise.all(imagens.map(img=>img.decode())).then(()=>{carregado=true;desenhar();});
  pronto.catch(()=>{q('nota').hidden=false;q('nota').textContent='Não foi possível carregar as imagens da parede abdominal. Recarregue a página.';});
  window.endomapaParede={pronto,validar,geometriaEmEdicao,aplicarGeometria,mostrarDistancias,editarNoPainel,inserirPar,ativarPar,removerPar,ocultarAnotacoes(ocultar){anotacoesOcultas=Boolean(ocultar);desenhar();},estado:()=>JSON.stringify(estado)===JSON.stringify(inicial())?undefined:copiar(estado),restaurar(e){validar(e);estado=e?copiar(e):inicial();desenhar();},fotografar(id){if(id!==vista)return null;if(!carregado)throw Error('Aguarde as imagens da parede abdominal.');const foto=document.createElement('canvas');foto.width=1086;foto.height=1448;pintar(foto);const anotacoes=document.createElement('canvas');anotacoes.width=1086;anotacoes.height=1448;pintarAnotacoes(anotacoes);foto.anotacoesParede=anotacoes;const lesoes=document.createElement('canvas');lesoes.width=1086;lesoes.height=1448;pintarLesoes(lesoes);foto.lesoesParede=lesoes;return foto;}};
  function atualizarUnidade(perfil){
    unidade=perfil?.unidade_medidas==='mm'?'mm':'cm';
    edicaoAxial.querySelector('legend').textContent=unidade==='mm'?'Medidas em milímetros':'Medidas em centímetros';
    distancias.querySelector('legend').textContent=unidade==='mm'?'Distâncias em milímetros':'Distâncias em centímetros';
    [...camposAxiais,...camposDistancias].forEach(c=>{c.placeholder=unidade==='mm'?'Ex.: 10':'Ex.: 1,0';});
    desenhar();
  }
  window.addEventListener('endomapa:perfil-carregado',e=>atualizarUnidade(e.detail));
  atualizarUnidade(window.endomapaMedico);
})();
