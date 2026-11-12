/* Prévia isolada: anatomia original fixa, recorte uterino independente.
   O fundo foi preparado pela imagegen. Os contornos abaixo são máscaras
   de composição e não desenham ou substituem tecido anatômico. */
window.endomapaCriarUteroCoronal=async function(canvas){
 'use strict';
 const W=1086,H=1448,apoio={x:550,y:700};
 const novo=()=>Object.assign(document.createElement('canvas'),{width:W,height:H});
 const carregar=async src=>{const i=new Image();i.src=src;await i.decode();return i};
 const [original,fundo,semTubas,fundoLimpo,continuacao]=await Promise.all([carregar('assets/mapa-base-coronal-aberto-visitante.png'),carregar('output/utero-coronal/fundo-imagegen-v15.png'),carregar('assets/tubas/fundo-sem-tubas-imagegen-v4.png'),carregar('output/utero-coronal/fundo-imagegen-v11.png'),carregar('output/utero-coronal/continuacao-bexiga-v16.png')]);
 const ctx=canvas.getContext('2d'),base=novo();base.getContext('2d').drawImage(original,0,0,W,H);
 const fundoInsercoes=await carregar('output/utero-coronal/fundo-insercoes-v29.png'),limpezaInsercoes={};
 for(const [lado,x] of [['esquerda',401],['direita',695]]){
  const c=novo(),g=c.getContext('2d');g.filter='blur(9px)';g.beginPath();g.ellipse(x,490,65,67,0,0,Math.PI*2);g.fill();g.filter='none';g.globalCompositeOperation='source-in';g.drawImage(fundoInsercoes,0,0,W,H);limpezaInsercoes[lado]=c;
 }
 const texturaBordas=novo();texturaBordas.getContext('2d').drawImage(await carregar('output/utero-coronal/textura-bordas-v17.png'),0,0,W,H);
 const texturaDireita=novo();texturaDireita.getContext('2d').drawImage(await carregar('output/utero-coronal/textura-direita-v19.png'),0,0,W,H);
 // A imagem nova fornece apenas a ponta: nenhuma mudança no restante da textura.
 const ponta=novo(),pp=ponta.getContext('2d');pp.filter='blur(6px)';pp.fillRect(850,275,65,150);pp.filter='none';pp.globalCompositeOperation='source-in';pp.drawImage(await carregar('output/utero-coronal/textura-ponta-v20.png'),0,0,W,H);
 const texturaPonta=novo(),tp=texturaPonta.getContext('2d');tp.drawImage(texturaDireita,0,0);tp.drawImage(ponta,0,0);
 // A imagegen corrige apenas a margem externa; o corpo mantém a textura V20.
 const eixoBorda=document.createElementNS('http://www.w3.org/2000/svg','path');
 eixoBorda.setAttribute('d','M 691 458 C 752 469 832 444 859 410 C 883 379 882 321 894 285');
 const comprimentoBorda=eixoBorda.getTotalLength(),interna=[],externa=[];
 for(let i=0;i<=160;i++){
  const s=comprimentoBorda*(.12+.88*i/160),p=eixoBorda.getPointAtLength(s),a=eixoBorda.getPointAtLength(Math.max(0,s-.5)),b=eixoBorda.getPointAtLength(Math.min(comprimentoBorda,s+.5));
  const dx=b.x-a.x,dy=b.y-a.y,n=Math.hypot(dx,dy);
  const progresso=s/comprimentoBorda,entrada=Math.max(0,Math.min(1,(progresso-.5)/.22)),margem=9-14*entrada*entrada*(3-2*entrada);
  interna.push({x:p.x-dy/n*margem,y:p.y+dx/n*margem});externa.push({x:p.x-dy/n*26,y:p.y+dx/n*26});
 }
 const contornoBorda=new Path2D();[...interna,...externa.reverse()].forEach((p,i)=>i?contornoBorda.lineTo(p.x,p.y):contornoBorda.moveTo(p.x,p.y));contornoBorda.closePath();
 const mascaraBorda=novo(),mb=mascaraBorda.getContext('2d');mb.filter='blur(3px)';mb.fill(contornoBorda);
 const bordaCorrigida=novo(),bc=bordaCorrigida.getContext('2d');bc.drawImage(await carregar('output/utero-coronal/recorte-borda-v25.png'),0,0,W,H);bc.globalCompositeOperation='destination-in';bc.drawImage(mascaraBorda,0,0);
 tp.globalCompositeOperation='destination-out';tp.drawImage(mascaraBorda,0,0);tp.globalCompositeOperation='source-over';tp.drawImage(bordaCorrigida,0,0);
 const suave=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
 // O contorno termina antes das inserções uterossacras e do colo inferior.
 const contorno=new Path2D('M 401 453 C 442 438 469 391 548 390 C 614 388 653 432 699 452 C 691 472 684 507 674 536 C 658 581 635 608 624 641 C 614 666 614 688 624 704 C 599 692 574 687 550 688 C 526 687 505 693 484 704 C 496 682 491 660 481 638 C 468 609 446 580 432 548 C 417 514 411 484 401 453 Z');
 const mascara=novo(),m=mascara.getContext('2d');m.filter='blur(0.7px)';m.fill(contorno);
 const utero=novo(),u=utero.getContext('2d');u.drawImage(base,0,0);u.globalCompositeOperation='destination-in';u.drawImage(mascara,0,0);
 // A limpeza é independente do recorte: inclui a sombra externa antiga.
 const limpezaUtero=novo(),lu=limpezaUtero.getContext('2d');lu.filter='blur(9px)';lu.lineWidth=110;lu.lineJoin='round';lu.fill(contorno);lu.stroke(contorno);lu.filter='none';
 // A transição inferior não alcança as inserções uterossacras nem o colo.
 lu.globalCompositeOperation='destination-in';const limite=lu.createLinearGradient(0,668,0,707);limite.addColorStop(0,'white');limite.addColorStop(1,'transparent');lu.fillStyle=limite;lu.fillRect(0,0,W,H);
 // O fundo uterino começa em y=390; a limpeza não alcança a bexiga acima.
 const teto=lu.createLinearGradient(0,385,0,389);teto.addColorStop(0,'transparent');teto.addColorStop(1,'white');lu.fillStyle=teto;lu.fillRect(0,0,W,H);
 const reparo=novo(),r=reparo.getContext('2d');r.drawImage(fundoLimpo,0,0,W,H);r.globalCompositeOperation='destination-in';r.drawImage(limpezaUtero,0,0);
 // Proteção explícita da superfície visível da bexiga na imagem original.
 const bexigaOriginal=novo(),bo=bexigaOriginal.getContext('2d');
 const contornoBexiga=new Path2D('M 260 410 C 290 330 430 230 550 232 C 700 232 790 330 839 410 C 805 445 735 455 685 436 C 635 417 610 389 548 389 C 480 389 450 417 403 435 C 340 455 290 445 260 410 Z');
 bo.filter='blur(5px)';bo.fill(contornoBexiga);bo.filter='none';bo.fill(contornoBexiga);
 const protecao=bo.getImageData(0,0,W,H);
 for(let i=3;i<protecao.data.length;i+=4)if(protecao.data[i]>=250)protecao.data[i]=255;
 bo.putImageData(protecao,0,0);
 bo.globalCompositeOperation='source-in';bo.drawImage(base,0,0);
 // O topo já é a base intacta; evita recompor transparências da borda externa.
 bo.clearRect(0,0,W,300);
 const laterais=novo(),la=laterais.getContext('2d');la.filter='blur(8px)';
 la.fill(new Path2D('M 205 340 C 215 400 260 437 345 458 L 310 489 Q 268 516 246 562 L 185 562 C 175 470 184 394 205 340 Z'));
 la.fill(new Path2D('M 885 340 C 875 400 830 437 745 458 L 780 489 Q 822 516 844 562 L 905 562 C 915 470 906 394 885 340 Z'));
 la.filter='none';la.globalCompositeOperation='source-in';la.drawImage(fundo,0,0,W,H);
 // Apenas a antiga borda superior uterina recebe tecido de bexiga da imagegen.
 const faixaBexiga=novo(),fb=faixaBexiga.getContext('2d');
 fb.filter='blur(5px)';
 fb.fill(new Path2D('M 433 418 C 472 386 507 374 550 374 C 597 374 636 394 672 420 L 672 444 Q 550 420 433 444 Z'));
 fb.filter='none';fb.globalCompositeOperation='source-in';fb.drawImage(continuacao,0,0,W,H);
 const deformar=window.criarDeformador(utero,{x:380,y:375,w:340,h:345});
 let angulo=0;
 const tubas=[
  {lado:'esquerda da tela',raiz:{x:411,y:484},fim:575,caminho:'M 411 484 C 378 493 373 525 331 551 C 317 560 305 567 295 575',area:{x:270,y:455,w:170,h:145}},
  {lado:'direita da tela',raiz:{x:690,y:484},fim:588,caminho:'M 690 484 C 718 497 732 541 775 565 C 788 573 797 581 806 588',area:{x:655,y:455,w:180,h:160}}
 ].map(t=>{
  const trajeto=document.createElementNS('http://www.w3.org/2000/svg','path');trajeto.setAttribute('d',t.caminho);
  const comprimento=trajeto.getTotalLength(),amostras=Array.from({length:201},(_,i)=>{const p=trajeto.getPointAtLength(comprimento*i/200);return {x:p.x,y:p.y,t:i/200}}),fim=amostras.at(-1);
  const limpeza=novo(),l=limpeza.getContext('2d');l.filter='blur(3px)';l.lineWidth=48;l.lineCap='round';l.stroke(new Path2D(t.caminho));l.filter='none';l.globalCompositeOperation='source-in';l.drawImage(semTubas,0,0,W,H);
  const normalizar=(a,b)=>{const d=Math.hypot(b.x-a.x,b.y-a.y);return{x:(b.x-a.x)/d,y:(b.y-a.y)/d}};
  const tangenteInicio=normalizar(amostras[0],amostras[2]),tangenteFim=normalizar(amostras[198],fim);
  // O trecho final original é recomposto progressivamente sobre a união.
  const transicao=novo(),tc=transicao.getContext('2d');tc.drawImage(base,0,0);tc.globalCompositeOperation='destination-in';
  const janela=novo(),jc=janela.getContext('2d');jc.lineWidth=64;jc.lineCap='round';jc.stroke(new Path2D(t.caminho));jc.globalCompositeOperation='destination-in';const grad=jc.createLinearGradient(0,t.fim-24,0,t.fim-2);grad.addColorStop(0,'transparent');grad.addColorStop(1,'white');jc.fillStyle=grad;jc.fillRect(0,0,W,H);tc.drawImage(janela,0,0);
  return {...t,amostras,ponta:fim,tangenteInicio,tangenteFim,transicao,limpeza,faixa:window.criarFaixaTexturizada(t.raiz.x>550?texturaDireita:texturaBordas,t.caminho,30,t.area,{suavidade:.9})};
 });
 const redondos=[
  {raiz:{x:410,y:458},caminho:'M 410 458 C 347 467 265 448 230 413 C 207 390 207 320 195 284',area:{x:170,y:260,w:265,h:230}},
  {raiz:{x:691,y:458},caminho:'M 691 458 C 752 469 832 444 859 410 C 883 379 882 321 894 285',area:{x:665,y:260,w:255,h:230}}
 ].map(t=>{
  const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',t.caminho);
  const comprimento=path.getTotalLength(),amostras=Array.from({length:201},(_,i)=>{const p=path.getPointAtLength(comprimento*i/200);return{x:p.x,y:p.y,t:i/200}});
  const limpeza=novo(),l=limpeza.getContext('2d');l.filter='blur(9px)';l.lineWidth=120;l.lineCap='round';l.stroke(new Path2D(t.caminho));l.filter='none';l.globalCompositeOperation='source-in';l.drawImage(fundo,0,0,W,H);
  return {...t,amostras,limpeza,faixa:window.criarFaixaTexturizada(t.raiz.x>550?texturaPonta:texturaBordas,t.caminho,32,t.area,{suavidade:1})};
 });
 function transformarRedondo(t,x,y){
  let mais=t.amostras[0],distancia=Infinity;
  for(const p of t.amostras){const d=(x-p.x)**2+(y-p.y)**2;if(d<distancia){distancia=d;mais=p}}
  const destino=transformar(t.raiz.x,t.raiz.y),peso=1-suave(mais.t);
  return{x:x+(destino.x-t.raiz.x)*peso,y:y+(destino.y-t.raiz.y)*peso};
 }
 function transformar(x,y,graus=angulo){
  const a=graus*Math.PI/180*(1-suave((y-600)/100)),dx=x-apoio.x,dy=y-apoio.y;
  return{x:apoio.x+dx*Math.cos(a)-dy*Math.sin(a),y:apoio.y+dx*Math.sin(a)+dy*Math.cos(a)};
 }
 function transformarTuba(t,x,y){
  const destino=transformar(t.raiz.x,t.raiz.y),fim=t.ponta;
  let amostra=t.amostras[0],distancia=Infinity;
  for(const p of t.amostras){const d=(p.x-x)**2+(p.y-y)**2;if(d<distancia){distancia=d;amostra=p}}
  const s=amostra.t,u=1-s;
  const distanciaNova=Math.hypot(destino.x-fim.x,destino.y-fim.y),a=angulo*Math.PI/180;
  const ti={x:t.tangenteInicio.x*Math.cos(a)-t.tangenteInicio.y*Math.sin(a),y:t.tangenteInicio.x*Math.sin(a)+t.tangenteInicio.y*Math.cos(a)};
  const c1={x:destino.x+ti.x*distanciaNova/3,y:destino.y+ti.y*distanciaNova/3},c2={x:fim.x-t.tangenteFim.x*distanciaNova/3,y:fim.y-t.tangenteFim.y*distanciaNova/3};
  const bx=u*u*u*destino.x+3*u*u*s*c1.x+3*u*s*s*c2.x+s*s*s*fim.x,by=u*u*u*destino.y+3*u*u*s*c1.y+3*u*s*s*c2.y+s*s*s*fim.y;
  const mistura=suave(Math.abs(angulo)/6),peso=1-suave(s);
  const anterior={x:x+(destino.x-t.raiz.x)*peso,y:y+(destino.y-t.raiz.y)*peso};
  return{x:anterior.x+(bx-anterior.x)*mistura,y:anterior.y+(by-anterior.y)*mistura};
 }
 function transformarAnexo(x,y){
  const p=transformar(x,y),peso=1-suave((y-490)/135);
  return{x:x+(p.x-x)*peso,y:y+(p.y-y)*peso};
 }
 const ligacoes=new Map();
 function ligar(caminho,deslocamento={x:0,y:0}){
  if(!ligacoes.has(caminho)){
   const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',caminho);
   const l=path.getTotalLength(),ps=Array.from({length:161},(_,i)=>{const p=path.getPointAtLength(l*i/160);return{x:p.x,y:p.y}});
   const corte=ps.findIndex(p=>p.y>=625);ligacoes.set(caminho,{ps,corte:corte<0?160:corte});
  }
  const {ps,corte}=ligacoes.get(caminho),inicio=ps[0],fim=ps[corte],r=transformar(inicio.x,inicio.y),f={x:fim.x+deslocamento.x,y:fim.y+deslocamento.y};
  const normal=(a,b)=>{const l=Math.hypot(b.x-a.x,b.y-a.y)||1;return{x:(b.x-a.x)/l,y:(b.y-a.y)/l}};
  const ti=normal(ps[0],ps[1]),tf=normal(ps[Math.max(0,corte-1)],fim),a=angulo*Math.PI/180,d=Math.hypot(f.x-r.x,f.y-r.y)/3;
  const c1={x:r.x+(ti.x*Math.cos(a)-ti.y*Math.sin(a))*d,y:r.y+(ti.x*Math.sin(a)+ti.y*Math.cos(a))*d},c2={x:f.x-tf.x*d,y:f.y-tf.y*d};
  return(x,y)=>{
   let melhor=0,dist=Infinity,fracao=0;
   for(let i=0;i<ps.length-1;i++){const p=ps[i],q=ps[i+1],dx=q.x-p.x,dy=q.y-p.y,t=Math.max(0,Math.min(1,((x-p.x)*dx+(y-p.y)*dy)/(dx*dx+dy*dy))),dd=(x-p.x-t*dx)**2+(y-p.y-t*dy)**2;if(dd<dist){dist=dd;melhor=i;fracao=t}}
   const indice=melhor+fracao;if(indice>=corte)return{x:x+deslocamento.x,y:y+deslocamento.y};
   const t=indice/corte,u=1-t,p=ps[melhor],q=ps[melhor+1],centro={x:p.x+(q.x-p.x)*fracao,y:p.y+(q.y-p.y)*fracao};
   const nx=u*u*u*r.x+3*u*u*t*c1.x+3*u*t*t*c2.x+t*t*t*f.x,ny=u*u*u*r.y+3*u*u*t*c1.y+3*u*t*t*c2.y+t*t*t*f.y;
   const dx=3*u*u*(c1.x-r.x)+6*u*t*(c2.x-c1.x)+3*t*t*(f.x-c2.x),dy=3*u*u*(c1.y-r.y)+6*u*t*(c2.y-c1.y)+3*t*t*(f.y-c2.y),g=Math.atan2(dy,dx)-Math.atan2(q.y-p.y,q.x-p.x),ox=x-centro.x,oy=y-centro.y;
   return{x:nx+ox*Math.cos(g)-oy*Math.sin(g),y:ny+ox*Math.sin(g)+oy*Math.cos(g)};
  };
 }
 let cacheComposicao;
 function definir(valor,combinacao){
  if(!Number.isFinite(valor))throw Error('Inclinação inválida');
  angulo=Math.max(-20,Math.min(20,valor));ctx.clearRect(0,0,W,H);ctx.drawImage(base,0,0);
  if(!angulo)return;
  const reutilizar=combinacao?.tubas&&!combinacao.tubas.limpeza;
  const removidas=(combinacao?.tubas?.removidas||[]).join(',');
  if(reutilizar&&cacheComposicao?.angulo===angulo&&cacheComposicao.orgaos===combinacao.orgaos&&cacheComposicao.removidas===removidas){
   ctx.drawImage(cacheComposicao.fundo,0,0);ctx.drawImage(combinacao.tubas.frente,0,0);ctx.drawImage(cacheComposicao.frente,0,0);return;
  }
  ctx.drawImage(laterais,0,0);
  for(const t of tubas)ctx.drawImage(t.limpeza,0,0);
  for(const t of redondos)ctx.drawImage(t.limpeza,0,0);
  ctx.drawImage(reparo,0,0);
  ctx.drawImage(bexigaOriginal,0,0);
  ctx.drawImage(faixaBexiga,0,0);
  // A limpeza dos anexos vem depois dos fundos que ainda contêm sua posição antiga.
  if(combinacao?.tubas?.limpeza)ctx.drawImage(combinacao.tubas.limpeza,0,0);
  if(combinacao?.orgaos)ctx.drawImage(combinacao.orgaos.limpeza,0,0);
  for(const lado of combinacao?.tubas?.removidas||[])ctx.drawImage(limpezaInsercoes[lado],0,0);
  if(combinacao?.orgaos?.ureteres)ctx.drawImage(combinacao.orgaos.ureteres,0,0);
  if(combinacao&&!combinacao.orgaos?.apenasUreteres){
   const o=combinacao.orgaos;
   if(o)ctx.drawImage(o.ligamentos,0,0);
   if(reutilizar){const fundo=novo();fundo.getContext('2d').drawImage(canvas,0,0);cacheComposicao={angulo,orgaos:o,removidas,fundo,frente:novo()};}
   if(combinacao.tubas)ctx.drawImage(combinacao.tubas.frente,0,0);else if(o)ctx.drawImage(o.tubas,0,0);
  }else{
   for(const t of tubas)ctx.drawImage(t.faixa.desenhar((x,y)=>transformarTuba(t,x,y)),0,0);
   for(const t of tubas)ctx.drawImage(t.transicao,0,0);
  }
  const frente=reutilizar?cacheComposicao.frente.getContext('2d'):ctx;
  for(const t of redondos)frente.drawImage(t.faixa.desenhar((x,y)=>transformarRedondo(t,x,y)),0,0);
  frente.drawImage(deformar((x,y)=>transformar(x,y)),0,0);
  if(combinacao?.orgaos)frente.drawImage(combinacao.orgaos.ovarios,0,0);
  if(reutilizar)ctx.drawImage(cacheComposicao.frente,0,0);
 }
 definir(0);
 return {definir,transformar,transformarAnexo,ligar,apoio,estado:()=>({angulo}),base,mascara,juncoes:()=>tubas.map(t=>({lado:t.lado,utero:transformar(t.raiz.x,t.raiz.y),tuba:transformarTuba(t,t.raiz.x,t.raiz.y),fim:transformarTuba(t,t.ponta.x,t.ponta.y),fimOriginal:t.ponta}))};
};
