(() => {
 'use strict';
 const W=1086,H=1448,lados=['direita','esquerda'];
 const canvas=document.querySelector('#mapa'),ctx=canvas.getContext('2d'),marcadores=document.querySelector('#marcadores');
 const mensagem=document.querySelector('#estado'),remover=document.querySelector('#remover');
 const imagens={},camadas={};let tubas,espessador,movimento,pronto=false,selecao=null,arraste=null,quadro=0,pdfOcupado=false;
 const originalTuba=()=>({inicio:0,fim:100,ativo:false});
 const poseOriginal=()=>Array.from({length:4},()=>({x:0,y:0}));
 const criarEstado=()=>Object.fromEntries(lados.map(lado=>[lado,{inserida:false,inicio:0,fim:100,tuba:originalTuba(),tubaAnterior:null,espessamento:{ativo:false,inicio:38,fim:60},posicao:poseOriginal()}]));
 let estado=criarEstado();
 const limitar=(v,a,b)=>Math.max(a,Math.min(b,v)),suave=v=>{v=limitar(v,0,1);return v*v*(3-2*v)};
 const novoCanvas=()=>Object.assign(document.createElement('canvas'),{width:W,height:H});
 const carregar=src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Não foi possível carregar o desenho. Reabra a prévia.'));img.src=src});
 const areas={direita:{x:656,y:455,w:286,h:452},esquerda:{x:167,y:455,w:269,h:430}};
 function pontoHidro(lado,valor){
  const ps=camadas[lado].motor.pontos,pos=limitar(valor,0,100)/100*(ps.length-1),i=Math.floor(pos),a=ps[i],b=ps[Math.min(i+1,ps.length-1)],u=pos-i;
  return{x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u};
 }
 function proximoHidro(lado,x,y){
  let dist=Infinity,t=0;const ps=camadas[lado].motor.pontos;
  for(let i=0;i<ps.length-1;i++){
   const a=ps[i],b=ps[i+1],dx=b.x-a.x,dy=b.y-a.y,u=limitar(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1),0,1),d=Math.hypot(x-a.x-u*dx,y-a.y-u*dy);
   if(d<dist){dist=d;t=(a.t+(b.t-a.t)*u)*100}
  }
  return{valor:t,dist};
 }
 function preparar(lado){
  const a=areas[lado],fonte=novoCanvas(),f=fonte.getContext('2d');f.drawImage(imagens[lado],0,0);
  const base=novoCanvas(),b=base.getContext('2d');b.drawImage(imagens.normal,0,0);
  const original=f.getImageData(a.x,a.y,a.w,a.h),normal=b.getImageData(a.x,a.y,a.w,a.h);
  const motor=window.criarHidrosalpingeAfilada(imagens[lado],imagens.normal,lado,lado,a),pesos=new Float32Array(a.w*a.h);
  // O mapa continua sendo o coronal comum. Só a vizinhança da tuba recebe
  // a anatomia inserida; o restante da ilustração não é trocado por modelo.
  const ps=motor.pontos;
  for(let y=0;y<a.h;y++)for(let x=0;x<a.w;x++){
   let dist=Infinity,p;
   for(const q of ps){const d=(x+a.x-q.x)**2+(y+a.y-q.y)**2;if(d<dist){dist=d;p=q}}
   pesos[y*a.w+x]=suave((p.r+18-Math.sqrt(dist))/10);
  }
  const patch=f.createImageData(a.w,a.h),limpo=f.createImageData(a.w,a.h);
  patch.data.set(normal.data);limpo.data.set(normal.data);
  for(let i=0;i<pesos.length;i++)for(let k=0;k<3;k++)patch.data[i*4+k]=Math.round(normal.data[i*4+k]*(1-pesos[i])+original.data[i*4+k]*pesos[i]);
  camadas[lado]={motor,patch,limpo};
 }
 let chaveBase='',baseSemMovimento;
 function desenhar(){
  if(!pronto)return;
  const chave=JSON.stringify(lados.map(l=>{const e=estado[l];return[e.inserida,e.inicio,e.fim,e.tuba,e.espessamento]}));
  if(chave===chaveBase&&baseSemMovimento)ctx.putImageData(baseSemMovimento,0,0);
  else{
  ctx.drawImage(imagens.normal,0,0);
  const protecoes=[];
  for(const lado of lados){
   const e=estado[lado];if(!e.inserida)continue;
   const a=areas[lado],{motor,patch,limpo}=camadas[lado],camada=motor.desenhar(e.inicio,e.fim);
   if(e.inicio===0&&e.fim===100)ctx.putImageData(patch,a.x,a.y);
   else{
    ctx.putImageData(limpo,a.x,a.y);ctx.save();ctx.beginPath();ctx.rect(a.x,a.y,a.w,a.h);ctx.clip();ctx.drawImage(camada,0,0);ctx.restore();
   }
   protecoes.push({canvas:camada,secoes:motor.secoes(e.inicio,e.fim)});
  }
  if(lados.some(lado=>estado[lado].tuba.ativo)){
   tubas.proteger(protecoes);tubas.aplicar(ctx,Object.fromEntries(lados.map(lado=>[lado,estado[lado].tuba])));
  }
  espessador.desenhar(ctx,estado);
  baseSemMovimento=ctx.getImageData(0,0,W,H);chaveBase=chave;
  }
  movimento.aplicar(ctx,estado);
 }
 function agendar(){if(!quadro)quadro=requestAnimationFrame(()=>{quadro=0;desenhar()})}
 function deformar(lado,p){return movimento.deformar(lado,p,estado[lado].posicao)}
 function ponto(lado,chave,tuba){const p=tuba==='espessamento'?tubas.ponto(lado,estado[lado].espessamento[chave]):tuba?tubas.ponto(lado,estado[lado].tuba[chave]):pontoHidro(lado,estado[lado][chave]);return deformar(lado,p)}
 function proximoMovido(lado,x,y,tuba){
  if(!movimento.ativo(estado[lado].posicao))return tuba?tubas.proximo(lado,x,y):proximoHidro(lado,x,y).valor;
  let dist=Infinity,valor=0;
  for(let i=0;i<=400;i++){const t=i/4,p=deformar(lado,tuba?tubas.ponto(lado,t):pontoHidro(lado,t)),d=Math.hypot(x-p.x,y-p.y);if(d<dist){dist=d;valor=t}}
  return valor;
 }
 function posicionar(){
  const largura=canvas.clientWidth,altura=canvas.clientHeight;if(!largura)return;
  const ocupados=[];
  for(const b of marcadores.children){
   const {lado,chave}=b.dataset,mover=b.dataset.tipo==='posicao',tuba=b.dataset.tipo==='espessamento'?'espessamento':b.dataset.tipo==='tuba',p=mover?movimento.ponto(lado,Number(chave),estado[lado].posicao):ponto(lado,chave,tuba),x=p.x/W*largura,y=p.y/H*altura;
   b.style.left=p.x/W*100+'%';b.style.top=p.y/H*100+'%';
   const candidatos=[{dx:tuba?(chave==='inicio'?-30:30):0,dy:0},{dx:0,dy:0}];
   for(let anel=1;anel<=5;anel++)for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]])candidatos.push({dx:dx*48*anel,dy:dy*48*anel});
   const livre=candidatos.find(q=>x+q.dx>=23&&x+q.dx<=largura-23&&y+q.dy>=23&&y+q.dy<=altura-23&&!ocupados.some(o=>Math.abs(x+q.dx-o.x)<48&&Math.abs(y+q.dy-o.y)<48))||candidatos[0];
   ocupados.push({x:x+livre.dx,y:y+livre.dy});b.style.marginLeft=livre.dx+'px';b.style.marginTop=livre.dy+'px';
   b.style.setProperty('--guia-comprimento',Math.hypot(livre.dx,livre.dy)+'px');b.style.setProperty('--guia-angulo',Math.atan2(-livre.dy,-livre.dx)+'rad');
   if(mover){b.setAttribute('aria-label',`Mover ponto ${Number(chave)+1} da tuba ${lado}. Arraste ou use as setas.`);continue}
   const valor=(tuba==='espessamento'?estado[lado].espessamento:tuba?estado[lado].tuba:estado[lado])[chave];
   b.setAttribute('aria-label',`${chave==='inicio'?'Início':'Término'} ${tuba==='espessamento'?'do espessamento':tuba?'do afilamento da tuba':'da hidrosalpinge'} ${lado}: ${valor}%. Arraste ou use as setas.`);
  }
 }
 function definir(lado,chave,valor,tuba=false){
  if(!pronto||!lados.includes(lado)||!['inicio','fim'].includes(chave)||!Number.isFinite(Number(valor))||(!tuba&&!estado[lado].inserida))return;
  const e=tuba==='espessamento'?estado[lado].espessamento:tuba?estado[lado].tuba:estado[lado];e[chave]=Math.round(limitar(Number(valor),chave==='fim'?e.inicio:0,chave==='inicio'?e.fim:100));if(tuba)e.ativo=true;
  posicionar();agendar();
 }
 function marcador(lado,chave,tuba){
  const b=document.createElement('button');b.type='button';b.className='marcador '+chave+(tuba?' tuba':'');b.dataset.lado=lado;b.dataset.chave=chave;b.dataset.tipo=tuba==='espessamento'?'espessamento':tuba?'tuba':'hidro';b.innerHTML=`<span>${tuba&&tuba!=='espessamento'?(chave==='inicio'?'A':'B'):(chave==='inicio'?'I':'T')}</span>`;
  b.addEventListener('keydown',e=>{
   if(e.key==='Escape'){selecionar(null);return}
   const delta={ArrowLeft:-1,ArrowDown:-1,ArrowRight:1,ArrowUp:1,PageDown:-10,PageUp:10}[e.key];
   if(delta!==undefined){e.preventDefault();definir(lado,chave,(tuba==='espessamento'?estado[lado].espessamento:tuba?estado[lado].tuba:estado[lado])[chave]+delta,tuba)}
   else if(e.key==='Home'||e.key==='End'){e.preventDefault();definir(lado,chave,e.key==='Home'?0:100,tuba)}
  });
  b.addEventListener('pointerdown',e=>{if(e.button!==0||e.isPrimary===false||arraste)return;arraste={id:e.pointerId,x:e.clientX,y:e.clientY,p:ponto(lado,chave,tuba)};b.setPointerCapture(e.pointerId);e.preventDefault()});
  b.addEventListener('pointermove',e=>{if(arraste?.id!==e.pointerId)return;const r=canvas.getBoundingClientRect(),x=arraste.p.x+(e.clientX-arraste.x)*W/r.width,y=arraste.p.y+(e.clientY-arraste.y)*H/r.height;definir(lado,chave,proximoMovido(lado,x,y,tuba),tuba);e.preventDefault()});
  const encerrar=e=>{if(arraste?.id===e.pointerId)arraste=null};for(const tipo of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(tipo,encerrar);
  marcadores.append(b);
 }
 function mover(lado,indice,x,y){
  if(!pronto||!lados.includes(lado))return;
  movimento.definir(lado,estado[lado].posicao,indice,x,y);posicionar();agendar();
 }
 function marcadorPosicao(lado,indice){
  const b=document.createElement('button');b.type='button';b.className='marcador posicao';b.dataset.lado=lado;b.dataset.chave=indice;b.dataset.tipo='posicao';b.innerHTML=`<span>${indice+1}</span>`;
  b.addEventListener('keydown',e=>{
   if(e.key==='Escape'){selecionar(null);return}
   if(e.key==='Home'){e.preventDefault();mover(lado,indice,0,0);return}
   const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
   if(delta){e.preventDefault();const p=estado[lado].posicao[indice],passo=e.shiftKey?10:2;mover(lado,indice,p.x+delta[0]*passo,p.y+delta[1]*passo)}
  });
  b.addEventListener('pointerdown',e=>{if(e.button!==0||e.isPrimary===false||arraste)return;arraste={id:e.pointerId,x:e.clientX,y:e.clientY,pose:{...estado[lado].posicao[indice]}};b.setPointerCapture(e.pointerId);e.preventDefault()});
  b.addEventListener('pointermove',e=>{if(arraste?.id!==e.pointerId)return;const r=canvas.getBoundingClientRect();mover(lado,indice,arraste.pose.x+(e.clientX-arraste.x)*W/r.width,arraste.pose.y+(e.clientY-arraste.y)*H/r.height);e.preventDefault()});
  const encerrar=e=>{if(arraste?.id===e.pointerId)arraste=null};for(const tipo of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(tipo,encerrar);
  marcadores.append(b);
 }
 function selecionar(valor){
  if(!pronto)return;selecao=valor;arraste=null;marcadores.replaceChildren();
  if(selecao){
   const ativos=selecao.lado?[selecao.lado]:lados;
   if(selecao.tipo==='posicao')for(const lado of ativos)for(let i=0;i<4;i++)marcadorPosicao(lado,i);
   for(const lado of ativos)for(const chave of ['inicio','fim']){if(selecao.tipo==='hidro'&&estado[lado].inserida)marcador(lado,chave,false);if(selecao.tipo==='tubas')marcador(lado,chave,true);if(selecao.tipo==='espessamento'&&estado[lado].espessamento.ativo)marcador(lado,chave,'espessamento')}
  }
  for(const [atributo,tipo] of [['inserir','hidro'],['afilar','tubas'],['espessar','espessamento'],['mover','posicao']])for(const b of document.querySelectorAll(`[data-${atributo}]`)){
   const lado=b.dataset[atributo];b.setAttribute('aria-pressed',String(selecao?.tipo===tipo&&(selecao.lado||'ambos')===lado));
  }
  remover.hidden=!['hidro','tubas','espessamento'].includes(selecao?.tipo);
  if(!remover.hidden)remover.textContent=`Remover ${{hidro:'hidrosalpinge',tubas:'obstrução tubas',espessamento:'espessamento tubas'}[selecao.tipo]} — ${selecao.lado||'ambos os lados'}`;
  document.querySelector('#restaurar-posicao').hidden=selecao?.tipo!=='posicao';
  mensagem.textContent=!selecao?'Escolha um ajuste ou toque na tuba. Toque fora para ocultar os controles.':selecao.tipo==='hidro'?'Hidrosalpinge: arraste I/T para ajustar o início e o término.':selecao.tipo==='espessamento'?'Espessamento: arraste I/T para ajustar o início e o término do trecho em corte.':'Obstrução tubas: arraste A/B para delimitar o trecho.';
  if(selecao?.tipo==='posicao')mensagem.textContent='Arraste 1, 2, 3 e 4 para ajustar a tuba. As duas pontas ficam fixas: no útero e no ovário. Os achados acompanham a tuba.';
  posicionar();
 }
 function inserir(lado){
  if(lado==='ambos'){for(const l of lados)inserir(l);selecionar({tipo:'hidro',lado:null});return}
  if(!pronto||!lados.includes(lado))return;const e=estado[lado];
  if(!e.inserida){e.tubaAnterior=structuredClone(e.tuba);e.inserida=true;e.inicio=0;e.fim=100}
  desenhar();selecionar({tipo:'hidro',lado});
 }
 function retirar(lado){
  if(!pronto||!estado[lado]?.inserida)return;const e=estado[lado];e.inserida=false;e.inicio=0;e.fim=100;e.tuba=e.tubaAnterior||originalTuba();e.tubaAnterior=null;
  desenhar();selecionar(null);
 }
 function espessar(lado){if(!pronto)return;for(const l of lado==='ambos'?lados:[lado]){if(!estado[l])return;estado[l].espessamento.ativo=true}desenhar();selecionar({tipo:'espessamento',lado:lado==='ambos'?null:lado})}
 function restaurar(){if(!pronto)return;estado=criarEstado();desenhar();selecionar(null)}
 canvas.addEventListener('click',e=>{
  if(!pronto||arraste)return;const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*W/r.width,y=(e.clientY-r.top)*H/r.height;
  let melhor=null,dist=Infinity;
  for(const lado of lados){
   if(estado[lado].inserida)for(const p of camadas[lado].motor.secoes(estado[lado].inicio,estado[lado].fim)){
    const q=deformar(lado,{x:p.xFinal,y:p.yFinal}),d=Math.hypot(x-q.x,y-q.y);if(d<p.raioFinal+14&&d<dist){dist=d;melhor={tipo:'hidro',lado}}
   }
   const valor=proximoMovido(lado,x,y,true),p=deformar(lado,tubas.ponto(lado,valor)),d=Math.hypot(x-p.x,y-p.y);
   if(d<26&&d<dist){const esp=estado[lado].espessamento;dist=d;melhor={tipo:esp.ativo&&valor>=esp.inicio&&valor<=esp.fim?'espessamento':estado[lado].inserida?'hidro':'tubas',lado}}
  }
  selecionar(melhor);
 });
 for(const b of document.querySelectorAll('[data-inserir]'))b.addEventListener('click',()=>inserir(b.dataset.inserir));
 for(const b of document.querySelectorAll('[data-afilar]'))b.addEventListener('click',()=>selecionar({tipo:'tubas',lado:b.dataset.afilar==='ambos'?null:b.dataset.afilar}));
 for(const b of document.querySelectorAll('[data-espessar]'))b.addEventListener('click',()=>espessar(b.dataset.espessar));
 for(const b of document.querySelectorAll('[data-mover]'))b.addEventListener('click',()=>selecionar({tipo:'posicao',lado:b.dataset.mover==='ambos'?null:b.dataset.mover}));
 document.querySelector('#restaurar-posicao').addEventListener('click',()=>{for(const lado of selecao?.lado?[selecao.lado]:lados)estado[lado].posicao=poseOriginal();desenhar();posicionar()});
 remover.addEventListener('click',()=>{const atual=selecao;if(!atual)return;for(const lado of atual.lado?[atual.lado]:lados){if(atual.tipo==='hidro')retirar(lado);else if(atual.tipo==='tubas'){estado[lado].tuba=originalTuba();if(estado[lado].tubaAnterior)estado[lado].tubaAnterior=originalTuba()}else if(atual.tipo==='espessamento')estado[lado].espessamento={ativo:false,inicio:38,fim:60}}desenhar();selecionar(null)});
 document.querySelector('#restaurar').addEventListener('click',restaurar);
 document.addEventListener('click',e=>{if(pronto&&!e.target.closest('.barra,.contexto,.desenho'))selecionar(null)});
 new ResizeObserver(()=>{if(pronto)posicionar()}).observe(canvas);
 document.querySelector('#baixar-pdf').addEventListener('click',async()=>{
  if(!pronto||pdfOcupado)return;pdfOcupado=true;const b=document.querySelector('#baixar-pdf'),msg=document.querySelector('#estado-pdf');b.disabled=true;msg.textContent='Preparando PDF…';let url;
  try{
   desenhar();const copia=novoCanvas();copia.getContext('2d').drawImage(canvas,0,0);await new Promise(r=>setTimeout(r,0));
   const blob=window.endomapaGerarPdfA4([{canvas:copia,vista:'coronal'}]);url=URL.createObjectURL(blob);
   const a=document.createElement('a');a.href=url;a.download='endomapa-teste-insercao-coronal-a4.pdf';a.hidden=true;document.body.append(a);try{a.click()}finally{a.remove()}
   const temporario=url;setTimeout(()=>URL.revokeObjectURL(temporario),60000);url=null;msg.textContent='PDF preparado com os ajustes do mapa, sem os controles.';
  }catch(e){if(url)URL.revokeObjectURL(url);msg.textContent='Não foi possível gerar o PDF. Seus ajustes continuam no mapa.'}
  finally{pdfOcupado=false;b.disabled=false}
 });
 const inicializar=async()=>{
  const fontes={normal:'../../assets/mapa-base-coronal-aberto-visitante.png?v=reto-20261019',fundo:'../../assets/mapas-especiais/bilateral-cor-v3/ooforectomia-bilateral-neutro.png',...Object.fromEntries(lados.map(lado=>[lado,`../../assets/mapas-especiais/hidrosalpinge/hidrosalpinge-${lado}-neutro.png?v=reto-20261019`]))};
  await Promise.all(Object.entries(fontes).map(async([nome,src])=>{const img=await carregar(src);if(img.naturalWidth!==W||img.naturalHeight!==H)throw Error('Dimensão inesperada do desenho.');imagens[nome]=img}));
  for(const lado of lados)preparar(lado);tubas=window.criarAfilamentoTubas(imagens.fundo,{escalaMinima:1/6});
  const referencia=await carregar('../../output/hidrosalpinge-insercao/espessamento-tubas-referencia-usuario.png');
  const recortes={};
  await Promise.all(lados.map(async lado=>{recortes[lado]=await carregar(`../../output/tubas-posicao/hidrosalpinge-${lado}-recorte-imagegen.png`)}));
  const fundoMovimento=await carregar('../../output/tubas-posicao/fundo-sem-tubas-imagegen-v4.png');
  espessador=window.criarEspessamentoTubas(referencia,tubas);movimento=window.criarMovimentoTubas(tubas,imagens.fundo,camadas,recortes,fundoMovimento);pronto=true;
  for(const b of document.querySelectorAll('button'))b.disabled=false;desenhar();selecionar(null);
 };
 window.testeInsercao={estado:()=>({pronto,lados:structuredClone(estado),selecao:structuredClone(selecao)}),inserir,espessar,retirar,restaurar,selecionar,definir,desenhar,mover,deformar,pontoHidro,pontoTuba:(lado,valor)=>tubas.ponto(lado,valor),original:()=>imagens.normal,area:lado=>({...areas[lado]})};
 window.testeInsercao.pronto=inicializar().catch(erro=>{mensagem.textContent=erro.message;throw erro});
})();
