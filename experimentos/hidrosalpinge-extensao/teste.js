(() => {
 'use strict';
 const W=1086,H=1448,canvas=document.querySelector('#mapa'),ctx=canvas.getContext('2d');
 const seletor=document.querySelector('#modelo'),controles=document.querySelector('#controles'),marcadores=document.querySelector('#marcadores');
 const restaurar=document.querySelector('#restaurar'),marcacoes=document.querySelector('#marcacoes'),mensagem=document.querySelector('#estado');
 const modelos={direita:['direita'],esquerda:['esquerda'],bilateral:['direita','esquerda']};
 // Os lados preservam a associação dos arquivos da biblioteca, sem espelhar.
 const trajetos={
  direita:{d:'M 684 487 C 718 500 721 538 775 562 C 820 578 846 610 855 655 C 875 695 894 735 868 787 C 850 828 814 854 782 841 C 757 834 743 813 737 796',area:{x:656,y:455,w:286,h:452},raios:[24,32,45,55,60,60,56,44,27]},
  esquerda:{d:'M 404 484 C 373 494 365 528 323 553 C 277 566 251 598 237 645 C 213 686 215 730 236 769 C 247 799 269 819 295 813',area:{x:167,y:455,w:269,h:430},raios:[24,32,45,53,55,56,58,63,65]}
 };
 const estados=Object.fromEntries(Object.entries(modelos).map(([modelo,lados])=>[modelo,Object.fromEntries(lados.map(lado=>[lado,{inicio:0,fim:100}]))]));
 const estadosTubas=Object.fromEntries(Object.keys(modelos).map(nome=>[nome,{direita:{inicio:0,fim:100,ativo:false},esquerda:{inicio:0,fim:100,ativo:false}}]));
 let tubas;
 const imagens={},camadas={},geometrias={};
 let modelo='direita',pronto=false,quadro=0,arraste=null;
 const limitar=(v,a,b)=>Math.max(a,Math.min(b,v));
 const suave=v=>{v=limitar(v,0,1);return v*v*(3-2*v)};
 const carregar=src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Não foi possível carregar uma imagem. Reabra o teste.'));img.src=src});
 const novoCanvas=()=>Object.assign(document.createElement('canvas'),{width:W,height:H});
 function amostrar(lado){
  const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',trajetos[lado].d);
  const comprimento=path.getTotalLength(),n=Math.ceil(comprimento/4);
  return Array.from({length:n+1},(_,i)=>{const p=path.getPointAtLength(i*comprimento/n);return{x:p.x,y:p.y,t:i/n}});
 }
 function maisProximo(lado,x,y){
  const pontos=pronto&&modelo==='bilateral'?camadas[modelo][lado].afilar.pontos:geometrias[lado].pontos;let melhor={dist:Infinity,t:0};
  for(let i=0;i<pontos.length-1;i++){
   const a=pontos[i],b=pontos[i+1],dx=b.x-a.x,dy=b.y-a.y;
   const u=limitar(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);
   const dist=Math.hypot(x-a.x-u*dx,y-a.y-u*dy);
   if(dist<melhor.dist)melhor={dist,t:a.t+(b.t-a.t)*u};
  }
  return melhor;
 }
 function ponto(lado,valor){
  const lista=pronto&&modelo==='bilateral'?camadas[modelo][lado].afilar.pontos:geometrias[lado].pontos,pos=limitar(valor,0,100)/100*(lista.length-1),i=Math.floor(pos),a=lista[i],b=lista[Math.min(i+1,lista.length-1)],u=pos-i;
  return{x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u};
 }
 function prepararGeometria(lado){
  const {area,raios}=trajetos[lado],pixels=[];
  geometrias[lado]={pontos:amostrar(lado)};
  for(let y=0;y<area.h;y++)for(let x=0;x<area.w;x++){
   const p=maisProximo(lado,x+area.x,y+area.y),r=p.t*(raios.length-1),i=Math.floor(r),raio=raios[i]+(raios[Math.min(i+1,raios.length-1)]-raios[i])*(r-i);
   const peso=suave((raio+18-p.dist)/10);
   if(peso>0)pixels.push({i:(y*area.w+x)*4,t:p.t,peso});
  }
  geometrias[lado].pixels=pixels;
 }
 function prepararCamadas(){
  const base=novoCanvas(),b=base.getContext('2d');b.drawImage(imagens.normal,0,0);
  for(const nome of Object.keys(modelos)){
   const fonte=novoCanvas(),f=fonte.getContext('2d');f.drawImage(imagens[nome],0,0);camadas[nome]={};
   for(const lado of modelos[nome]){
    const a=trajetos[lado].area;
    camadas[nome][lado]={original:f.getImageData(a.x,a.y,a.w,a.h),normal:b.getImageData(a.x,a.y,a.w,a.h),saida:f.createImageData(a.w,a.h),afilar:window.criarHidrosalpingeAfilada(imagens[nome],imagens.normal,lado,nome,a)};
   }
  }
 }
 function desenhar(){
  if(!pronto)return;
  ctx.drawImage(imagens[modelo],0,0);
  for(const lado of modelos[modelo]){
   const {inicio,fim}=estados[modelo][lado];if(inicio===0&&fim===100)continue;
   const {original,normal,saida,afilar}=camadas[modelo][lado],a=trajetos[lado].area;
   saida.data.set(original.data);
   for(const p of geometrias[lado].pixels){
    const peso=p.peso;
    for(let c=0;c<3;c++)saida.data[p.i+c]=Math.round(original.data[p.i+c]*(1-peso)+normal.data[p.i+c]*peso);
   }
   ctx.putImageData(saida,a.x,a.y);
   ctx.save();ctx.beginPath();ctx.rect(a.x,a.y,a.w,a.h);ctx.clip();
   ctx.drawImage(afilar.desenhar(inicio,fim),0,0);ctx.restore();
  }
  if(Object.values(estadosTubas[modelo]).some(e=>e.ativo)){
   const protecoes=modelos[modelo].map(lado=>{const e=estados[modelo][lado],a=camadas[modelo][lado].afilar;return{canvas:a.desenhar(e.inicio,e.fim),secoes:a.secoes(e.inicio,e.fim)}});
   tubas.proteger(protecoes);tubas.aplicar(ctx,estadosTubas[modelo]);
  }
 }
 function agendar(){if(!quadro)quadro=requestAnimationFrame(()=>{quadro=0;desenhar()})}
 function separarMarcadores(){
  const largura=canvas.clientWidth,altura=canvas.clientHeight;if(!largura||!altura)return;
  const ocupados=[],folga=48,raio=23;
  for(const botao of marcadores.children){
   const x=parseFloat(botao.style.left)/100*largura,y=parseFloat(botao.style.top)/100*altura;
   const preferido=botao.dataset.tuba?(botao.dataset.chave==='inicio'?-30:30):0;
   const candidatos=[{dx:preferido,dy:0},{dx:0,dy:0}];
   for(let anel=1;anel<=5;anel++)for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]])candidatos.push({dx:dx*folga*anel,dy:dy*folga*anel});
   const livre=candidatos.find(p=>x+p.dx>=raio&&x+p.dx<=largura-raio&&y+p.dy>=raio&&y+p.dy<=altura-raio&&!ocupados.some(q=>Math.abs(x+p.dx-q.x)<folga&&Math.abs(y+p.dy-q.y)<folga))||candidatos[0];
   ocupados.push({x:x+livre.dx,y:y+livre.dy});
   botao.style.marginLeft=livre.dx+'px';botao.style.marginTop=livre.dy+'px';
   botao.style.setProperty('--guia-comprimento',Math.hypot(livre.dx,livre.dy)+'px');
   botao.style.setProperty('--guia-angulo',Math.atan2(-livre.dy,-livre.dx)+'rad');
  }
 }
 function atualizar(){
  for(const lado of modelos[modelo])for(const chave of ['inicio','fim']){
   const valor=estados[modelo][lado][chave],entrada=document.querySelector(`#${lado}-${chave}`),botao=marcadores.querySelector(`[data-lado="${lado}"][data-chave="${chave}"]`);
   entrada.value=valor;entrada.setAttribute('aria-valuetext',`${valor}% do trajeto desenhado, do útero ao ovário`);
   document.querySelector(`#valor-${lado}-${chave}`).textContent=valor+'%';
   const p=ponto(lado,valor);botao.style.left=p.x/W*100+'%';botao.style.top=p.y/H*100+'%';
   botao.setAttribute('aria-label',`${chave==='inicio'?'Início':'Término'} da dilatação ${lado==='direita'?'direita':'esquerda'}: ${valor}%. Use as setas para ajustar.`);
  }
  for(const lado of ['direita','esquerda'])for(const chave of ['inicio','fim']){
   const e=estadosTubas[modelo][lado],valor=e[chave],entrada=document.querySelector(`#tuba-${lado}-${chave}`),botao=marcadores.querySelector(`[data-tuba="${lado}"][data-chave="${chave}"]`);
   entrada.value=valor;entrada.setAttribute('aria-valuetext',`${valor}% do trajeto da tuba ${lado}`);
   document.querySelector(`#valor-tuba-${lado}-${chave}`).textContent=valor+'%';
   const p=tubas.ponto(lado,valor);botao.style.left=p.x/W*100+'%';botao.style.top=p.y/H*100+'%';
   botao.setAttribute('aria-label',`${chave==='inicio'?'Início':'Término'} do trecho afinado da tuba ${lado}: ${valor}%. Use as setas para ajustar.`);
   document.querySelector(`#situacao-tuba-${lado}`).textContent=e.ativo?'Trecho selecionado: até 1/3 da espessura, preservando a dilatação.':'Espessura original. Mova A ou B para selecionar o trecho afinado.';
  }
  separarMarcadores();
 }
 function definirTuba(lado,chave,valor){
  if(!pronto||!['direita','esquerda'].includes(lado)||!['inicio','fim'].includes(chave)||!Number.isFinite(Number(valor)))return;
  const e=estadosTubas[modelo][lado];e[chave]=Math.round(limitar(Number(valor),chave==='fim'?e.inicio:0,chave==='inicio'?e.fim:100));e.ativo=true;
  atualizar();agendar();
 }
 function definir(lado,chave,valor){
  if(!pronto||!modelos[modelo].includes(lado)||!['inicio','fim'].includes(chave)||!Number.isFinite(Number(valor)))return;
  const e=estados[modelo][lado];e[chave]=Math.round(limitar(Number(valor),chave==='fim'?e.inicio:0,chave==='inicio'?e.fim:100));
  atualizar();agendar();
 }
 function montarControles(){
  arraste=null;controles.replaceChildren();marcadores.replaceChildren();
  for(const lado of modelos[modelo]){
   const field=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent=`Trompa ${lado}`;field.append(legend);
   const dica=document.createElement('p');dica.className='legenda';dica.textContent='I = início · T = término';field.append(dica);
   for(const [chave,titulo,letra] of [['inicio','Início','I'],['fim','Término','T']]){
    const div=document.createElement('div');div.className='controle '+chave;
    div.innerHTML=`<label for="${lado}-${chave}">${titulo}</label><output id="valor-${lado}-${chave}" for="${lado}-${chave}"></output><input id="${lado}-${chave}" type="range" min="0" max="100" step="1">`;
    div.querySelector('input').addEventListener('input',e=>definir(lado,chave,e.target.value));field.append(div);
    const botao=document.createElement('button');botao.type='button';botao.className='marcador '+chave;botao.dataset.lado=lado;botao.dataset.chave=chave;botao.innerHTML=`<span>${letra}</span>`;
    botao.addEventListener('keydown',e=>{const delta={ArrowLeft:-1,ArrowDown:-1,ArrowRight:1,ArrowUp:1,PageDown:-10,PageUp:10}[e.key];if(delta!==undefined){e.preventDefault();definir(lado,chave,estados[modelo][lado][chave]+delta)}else if(e.key==='Home'||e.key==='End'){e.preventDefault();definir(lado,chave,e.key==='Home'?0:100)}});
    botao.addEventListener('pointerdown',e=>{if(e.button!==0||e.isPrimary===false||arraste)return;arraste={id:e.pointerId,lado,chave,x:e.clientX,y:e.clientY,p:ponto(lado,estados[modelo][lado][chave])};botao.setPointerCapture(e.pointerId);e.preventDefault()});
    botao.addEventListener('pointermove',e=>{if(arraste?.id!==e.pointerId||arraste.tuba)return;const r=canvas.getBoundingClientRect(),x=arraste.p.x+(e.clientX-arraste.x)*W/r.width,y=arraste.p.y+(e.clientY-arraste.y)*H/r.height;definir(lado,chave,maisProximo(lado,x,y).t*100);e.preventDefault()});
    const encerrar=e=>{if(arraste?.id===e.pointerId)arraste=null};
    botao.addEventListener('pointerup',encerrar);botao.addEventListener('pointercancel',encerrar);botao.addEventListener('lostpointercapture',encerrar);
    marcadores.append(botao);
   }
   controles.append(field);
  }
  for(const lado of ['direita','esquerda']){
   const field=document.createElement('fieldset');field.className='controles-tuba';
   field.innerHTML=`<legend>Afilamento da tuba ${lado}</legend><p class="legenda" id="situacao-tuba-${lado}"></p>`;
   for(const [chave,titulo,letra] of [['inicio','Início do trecho afinado','A'],['fim','Término do trecho afinado','B']]){
    const div=document.createElement('div');div.className='controle tuba';
    div.innerHTML=`<label for="tuba-${lado}-${chave}">${titulo}</label><output id="valor-tuba-${lado}-${chave}"></output><input id="tuba-${lado}-${chave}" type="range" min="0" max="100" step="1">`;
    div.querySelector('input').addEventListener('input',e=>definirTuba(lado,chave,e.target.value));field.append(div);
    const botao=document.createElement('button');botao.type='button';botao.className='marcador tuba tuba-'+chave;botao.dataset.tuba=lado;botao.dataset.chave=chave;botao.innerHTML=`<span>${letra}</span>`;
    botao.addEventListener('keydown',e=>{const delta={ArrowLeft:-1,ArrowDown:-1,ArrowRight:1,ArrowUp:1,PageDown:-10,PageUp:10}[e.key];if(delta!==undefined){e.preventDefault();definirTuba(lado,chave,estadosTubas[modelo][lado][chave]+delta)}else if(e.key==='Home'||e.key==='End'){e.preventDefault();definirTuba(lado,chave,e.key==='Home'?0:100)}});
    botao.addEventListener('pointerdown',e=>{if(e.button!==0||e.isPrimary===false||arraste)return;arraste={id:e.pointerId,lado,chave,tuba:true,x:e.clientX,y:e.clientY,p:tubas.ponto(lado,estadosTubas[modelo][lado][chave])};botao.setPointerCapture(e.pointerId);e.preventDefault()});
    botao.addEventListener('pointermove',e=>{if(arraste?.id!==e.pointerId||!arraste.tuba)return;const r=canvas.getBoundingClientRect();definirTuba(lado,chave,tubas.proximo(lado,arraste.p.x+(e.clientX-arraste.x)*W/r.width,arraste.p.y+(e.clientY-arraste.y)*H/r.height));e.preventDefault()});
    const encerrar=e=>{if(arraste?.id===e.pointerId)arraste=null};botao.addEventListener('pointerup',encerrar);botao.addEventListener('pointercancel',encerrar);botao.addEventListener('lostpointercapture',encerrar);
    marcadores.append(botao);
   }
   controles.append(field);
  }
  atualizar();
 }
 function selecionar(nome){if(!pronto||!modelos[nome])return;modelo=nome;seletor.value=nome;montarControles();desenhar();mensagem.textContent=nome==='bilateral'?'Ajuste cada trompa de forma independente.':'Ajuste o início e o término da dilatação.'}
 function restaurarAtual(){if(!pronto)return;for(const lado of modelos[modelo])estados[modelo][lado]={inicio:0,fim:100};for(const lado of ['direita','esquerda'])estadosTubas[modelo][lado]={inicio:0,fim:100,ativo:false};montarControles();desenhar();mensagem.textContent='Desenho original restaurado neste mapa.'}
 seletor.addEventListener('change',()=>selecionar(seletor.value));restaurar.addEventListener('click',restaurarAtual);
 marcacoes.addEventListener('click',()=>{marcadores.hidden=!marcadores.hidden;marcacoes.setAttribute('aria-pressed',String(!marcadores.hidden));marcacoes.textContent=marcadores.hidden?'Mostrar marcações':'Ocultar marcações'});
 new ResizeObserver(()=>{if(pronto)separarMarcadores()}).observe(canvas);
 const inicializar=async()=>{
  const fontes={normal:'../../assets/mapa-base-coronal-aberto-visitante.png?v=reto-20261019',fundo:'../../assets/mapas-especiais/bilateral-cor-v3/ooforectomia-bilateral-neutro.png',...Object.fromEntries(Object.keys(modelos).map(nome=>[nome,`../../assets/mapas-especiais/hidrosalpinge/hidrosalpinge-${nome}-neutro.png?v=reto-20261019`]))};
  await Promise.all(Object.entries(fontes).map(async([nome,src])=>{const img=await carregar(src);if(img.naturalWidth!==W||img.naturalHeight!==H)throw Error('A imagem tem dimensões diferentes das previstas para o teste.');imagens[nome]=img}));
  prepararGeometria('direita');prepararGeometria('esquerda');prepararCamadas();tubas=window.criarAfilamentoTubas(imagens.fundo);pronto=true;
  seletor.disabled=restaurar.disabled=marcacoes.disabled=false;selecionar('direita');window.dispatchEvent(new Event('hidrosalpinge:pronta'));
 };
 window.testeHidrosalpinge={estado:()=>({pronto,modelo,mapas:structuredClone(estados),tubas:structuredClone(estadosTubas)}),definir,definirTuba,pontoTuba:(lado,valor)=>tubas.ponto(lado,valor),protecaoTubas:()=>tubas.protegidos(),selecionar,restaurar:restaurarAtual,desenhar,ponto,area:lado=>({...trajetos[lado].area}),original:nome=>imagens[nome],secoes:(lado,inicio,fim)=>camadas[modelo][lado].afilar.secoes(inicio,fim),camadaAfilada:(lado,inicio,fim)=>camadas[modelo][lado].afilar.desenhar(inicio,fim)};
 window.testeHidrosalpinge.pronto=inicializar().catch(erro=>{mensagem.textContent=erro.message;throw erro});
})();
