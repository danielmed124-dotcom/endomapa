// Motor sagital: geometria e recorte aprovados no experimento local.
window.endomapaCriarUtero=async function(canvas){
 'use strict';
 const W=1087,H=1447,ctx=canvas.getContext('2d');
 const apoio={x:650,y:640},area={x:410,y:395,w:370,h:320};
 // Recorte de corpo e segmento de transição; colo inferior fica na base fixa.
 // O corte passa por fora da linha clara original do peritônio, que acompanha
 // o corpo na mesma camada. Não redesenha a linha nem a deixa fixa no fundo.
 const caminhoCorpo='M 446 540 C 436 529 429 516 427 502 C 425 487 427 474 431 465 C 442 433 475 412 512 410 C 557 408 614 431 656 470 C 675 489 686 509 696 520 C 710 542 727 569 741 598 C 753 628 754 658 743 682 C 735 700 719 701 705 687 C 691 673 680 676 668 689 C 655 703 636 706 621 702 C 609 687 598 672 589 653 C 580 631 563 610 543 596 C 529 586 511 577 497 571 C 476 561 458 553 446 540 Z';
 const contorno=new Path2D(caminhoCorpo);
 // Máscara independente e maior para apagar vestígios da posição antiga.
 // Inclui a união com o ovário; não transporta esses tecidos com o útero.
 const limpeza=new Path2D('M 414 447 C 410 411 436 361 478 346 C 516 335 553 355 579 393 C 620 421 668 464 700 509 C 732 555 754 604 757 653 L 585 653 C 572 617 553 598 521 587 C 484 576 450 565 428 544 C 414 520 406 479 414 447 Z');
 const bexiga=new Path2D('M 249 615 C 274 573 345 550 411 563 C 479 575 536 603 561 642 C 589 683 584 741 558 795 C 542 829 520 855 499 873 L 352 930 L 260 817 Z');
 // Parede anterior externa do reto, demarcada sobre esta imagem de teste.
 const reto=new Path2D('M 839 350 L 839 365 C 798 363 779 392 781 428 C 785 470 803 512 812 559 C 821 606 828 654 815 682 C 808 698 793 703 780 700 L 780 1000 L 1087 1000 L 1087 250 L 839 250 Z');
 let limitePosterior=0;
 let limiteAnterior=0,pontosBorda=[];
 const novo=()=>Object.assign(document.createElement('canvas'),{width:W,height:H});
 const base=novo(),camada=novo(),fundo=novo(),trompa=novo(),reparoRamo=novo(),reparoTrompa=novo();
 const encaixeTrompa={x:430,y:480};
 const eixoTrompa='M 430 480 C 411 449 439 418 456 380 C 470 345 492 336 513 349 C 531 359 540 369 548 382';
 let faixaTrompa,pontosTrompa=[],destinosTrompa=[],comprimentoTrompa=0,anguloTrompa=null;
 const pontaFixa=novo();
 const continuacao=novo(),continuacaoVisivel=novo();
 let trajetoContinuacao,comprimentoContinuacao=0;
 const caminhoContinuacao='M 424 451 C 410 500 469 497 525 477 C 603 449 697 416 810 410';
 const comprimento=ps=>ps.slice(1).reduce((s,p,i)=>s+Math.hypot(p.x-ps[i].x,p.y-ps[i].y),0);
 function prepararTrajetoTrompa(a){
  if(anguloTrompa===a)return;anguloTrompa=a;
  const inicio=transformar(encaixeTrompa.x,encaixeTrompa.y,a),fim=pontosTrompa.at(-1),n=pontosTrompa.length-1;
  // A curvatura diminui quando as pontas se aproximam, sem armazenar
  // comprimento excedente em uma dobra. A faixa mantém o calibre constante.
  const distancia=Math.hypot(inicio.x-fim.x,inicio.y-fim.y);
  const original=Math.hypot(encaixeTrompa.x-fim.x,encaixeTrompa.y-fim.y);
  const k=Math.min(1,distancia/original);
  const suave=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
  const mistura=suave(Math.abs(a)/18),lateral=-.22*distancia*(1-suave(Math.max(0,a)/55));
  // Perto do ovário a ligação fica quase reta: evita uma curva menor
  // que a própria espessura da trompa, que produzia quinas no contorno.
  const altura=.42*distancia*suave(distancia/85);
  const c1={x:inicio.x+(fim.x-inicio.x)/3+lateral,y:inicio.y+(fim.y-inicio.y)/3-altura};
  const c2={x:inicio.x+2*(fim.x-inicio.x)/3+lateral,y:inicio.y+2*(fim.y-inicio.y)/3-altura};
  const ps=pontosTrompa.map((p,i)=>{const t=i/n,u=1-t;
   const antigo={x:inicio.x*u+fim.x*t+k*(p.x-encaixeTrompa.x*u-fim.x*t),y:inicio.y*u+fim.y*t+k*(p.y-encaixeTrompa.y*u-fim.y*t)};
   const bezier={x:u*u*u*inicio.x+3*u*u*t*c1.x+3*u*t*t*c2.x+t*t*t*fim.x,y:u*u*u*inicio.y+3*u*u*t*c1.y+3*u*t*t*c2.y+t*t*t*fim.y};
   return{x:antigo.x+(bezier.x-antigo.x)*mistura,y:antigo.y+(bezier.y-antigo.y)*mistura};
  }),ac=[0];
  for(let i=1;i<ps.length;i++)ac.push(ac[i-1]+Math.hypot(ps[i].x-ps[i-1].x,ps[i].y-ps[i-1].y));
  let j=1;destinosTrompa=ps.map((_,i)=>{const s=ac.at(-1)*i/n;while(j<ac.length-1&&ac[j]<s)j++;const t=(s-ac[j-1])/(ac[j]-ac[j-1]||1);return{x:ps[j-1].x+(ps[j].x-ps[j-1].x)*t,y:ps[j-1].y+(ps[j].y-ps[j-1].y)*t}});
 }
 // Recorte independente: mantém textura e calibre, com comprimento adaptável.
 const contornoTrompa=new Path2D('M 428 493 C 410 479 407 453 417 429 C 428 409 439 383 450 361 C 464 333 487 325 510 332 C 535 336 548 352 555 367 L 578 389 L 575 397 L 568 396 L 568 402 L 560 402 L 554 393 L 552 403 L 545 401 L 541 389 L 538 400 L 530 398 L 527 385 L 523 395 L 517 392 L 520 370 C 517 358 504 351 491 358 C 479 364 473 381 463 400 C 453 419 442 435 437 452 C 434 465 436 475 433 484 Z');
 const ramoIndevido=new Path2D('M 245 485 C 267 475 279 494 302 500 C 330 514 346 491 372 499 C 404 502 421 532 460 548');
 function transformarTrompa(x,y,a=angulo){
  prepararTrajetoTrompa(a);let indice=0,distancia=Infinity;
  pontosTrompa.forEach((p,i)=>{const d=(p.x-x)**2+(p.y-y)**2;if(d<distancia){distancia=d;indice=i}});
  return destinosTrompa[indice];
 }
 function prepararTrompa(imagemReparo){
  const mascara=novo(),mc=mascara.getContext('2d');mc.filter='blur(0.7px)';mc.fill(contornoTrompa);
  const tc=trompa.getContext('2d');tc.drawImage(base,0,0);tc.globalCompositeOperation='destination-in';tc.drawImage(mascara,0,0);tc.globalCompositeOperation='source-over';
  // A máscara geométrica delimita o órgão; a cor elimina tecido rosado/marrom
  // capturado nas bordas e entre as fímbrias. Mantém os reflexos claros verdes.
  const recorte=tc.getImageData(400,320,190,185);
  for(let i=0;i<recorte.data.length;i+=4){
   const t=Math.max(0,Math.min(1,(recorte.data[i]-recorte.data[i+1]-10)/18));
   recorte.data[i+3]*=1-t*t*(3-2*t);
  }
  tc.putImageData(recorte,400,320);
  const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',eixoTrompa);
  const total=path.getTotalLength(),n=Math.ceil(total/2);
  pontosTrompa=Array.from({length:n+1},(_,i)=>{const p=path.getPointAtLength(total*i/n);return{x:p.x,y:p.y}});comprimentoTrompa=comprimento(pontosTrompa);
  faixaTrompa=window.criarFaixaTexturizada(trompa,eixoTrompa,25,{x:400,y:320,w:190,h:185},{suavidade:1.5,atenuacaoBorda:1.35});
  trajetoContinuacao=document.createElementNS('http://www.w3.org/2000/svg','path');trajetoContinuacao.setAttribute('d',caminhoContinuacao);comprimentoContinuacao=trajetoContinuacao.getTotalLength();
  // Usa somente o trecho verde limpo: a ponta junto ao útero contém
  // uma linha clara do peritônio que não pertence à nova continuação.
  const eixoLimpo='M 423 460 C 422 434 444 410 456 380 C 465 357 478 343 491 343';
  const limpo=document.createElementNS('http://www.w3.org/2000/svg','path');limpo.setAttribute('d',eixoLimpo);
  const tamanhoLimpo=limpo.getTotalLength(),amostras=Array.from({length:160},(_,i)=>limpo.getPointAtLength(tamanhoLimpo*i/159));
  const faixaLimpa=window.criarFaixaTexturizada(trompa,eixoLimpo,25,{x:400,y:320,w:190,h:185},{suavidade:1.5,atenuacaoBorda:1.35});
  const fixa=(x,y)=>{let indice=0,dist=Infinity;amostras.forEach((p,i)=>{const d=(p.x-x)**2+(p.y-y)**2;if(d<dist){dist=d;indice=i}});return trajetoContinuacao.getPointAtLength(comprimentoContinuacao*indice/159)};
  continuacao.getContext('2d').drawImage(faixaLimpa.desenhar(fixa),0,0);
  // Mistura o início da extensão com o arco original, em vez de deixar
  // a borda da faixa e sua mudança de iluminação visíveis na junção.
  // A transição fica restrita ao encaixe; não afeta a curva aprovada.
  const cc=continuacao.getContext('2d'),uniao=cc.getImageData(400,430,55,48);
  for(let y=0;y<uniao.height;y++){
   const t=Math.max(0,Math.min(1,(y+430-447)/27)),peso=t*t*(3-2*t);
   for(let x=0;x<uniao.width;x++)uniao.data[(y*uniao.width+x)*4+3]*=peso;
  }
  cc.putImageData(uniao,400,430);
  const pc=pontaFixa.getContext('2d');pc.drawImage(trompa,0,0);pc.globalCompositeOperation='destination-in';pc.fill(new Path2D('M 518 370 L 535 365 L 580 378 L 585 415 L 515 415 Z'));pc.globalCompositeOperation='source-over';
  function reparo(destino,comArco){
   const m=novo(),c=m.getContext('2d');c.filter='blur(5px)';c.lineCap='round';c.lineJoin='round';c.lineWidth=55;c.stroke(ramoIndevido);
   if(comArco){c.fill(contornoTrompa);c.lineWidth=9;c.stroke(contornoTrompa);c.lineWidth=38;c.stroke(new Path2D('M 428 463 C 426 491 452 519 447 538'))}
   // Na origem protege o útero fixo; durante o movimento limpa também
   // o antigo encaixe, que só existe no fundo sem útero.
   if(!comArco){c.filter='none';c.globalCompositeOperation='destination-out';c.fill(contorno)}
   const d=destino.getContext('2d');d.drawImage(imagemReparo,0,0,W,H);d.globalCompositeOperation='destination-in';d.drawImage(m,0,0);d.globalCompositeOperation='source-over';
  }
  reparo(reparoRamo,false);reparo(reparoTrompa,true);
 }
 let angulo=0,deformar;
 let curvaAngulo=null,curva=[];
 // Distribui a curva para evitar que a borda interna se dobre sobre si mesma.
 const ligacao=190,rampa=24;
 function giro(s,a){
  const v=Math.max(0,Math.min(ligacao,s));
  const trecho=v<rampa?v*v/(2*rampa):v>ligacao-rampa?ligacao-rampa-(ligacao-v)**2/(2*rampa):v-rampa/2;
  return a*Math.PI/180*trecho/(ligacao-rampa);
 }
 function prepararCurva(a){
  if(curvaAngulo===a)return;
  curvaAngulo=a;curva=[{l:0,t:0}];
  for(let i=1;i<=ligacao;i++){
   const rad=giro(i-.5,a),p=curva[i-1];
   curva.push({l:p.l+Math.cos(rad),t:p.t+Math.sin(rad)});
  }
 }
 function transformar(x,y,a=angulo){
  const dx=x-apoio.x,dy=y-apoio.y;
  // Curva de ligação com largura preservada. Acima da ligação o corpo
  // gira inteiro, sem torcer nem afinar o fundo uterino.
  const ux=-.6,uy=-.8,vx=.8,vy=-.6,s=dx*ux+dy*uy,t=dx*vx+dy*vy;
  if(s<=0||!a)return{x,y};
  // Curvatura entra e sai gradualmente: elimina o degrau lateral no colo.
  prepararCurva(a);
  const trecho=Math.min(s,ligacao),rad=giro(trecho,a),i=Math.floor(trecho),f=trecho-i;
  const p=curva[i],q=curva[Math.min(i+1,ligacao)];
  const longitudinal=p.l+(q.l-p.l)*f,transversal=p.t+(q.t-p.t)*f,extra=Math.max(0,s-ligacao);
  const rx=ux*Math.cos(rad)+vx*Math.sin(rad),ry=uy*Math.cos(rad)+vy*Math.sin(rad);
  const nx=vx*Math.cos(rad)-ux*Math.sin(rad),ny=vy*Math.cos(rad)-uy*Math.sin(rad);
  return{x:apoio.x+ux*longitudinal+vx*transversal+rx*extra+nx*t,y:apoio.y+uy*longitudinal+vy*transversal+ry*extra+ny*t};
 }
 function preparar(imagemFundo){
  const m=novo(),mc=m.getContext('2d');mc.filter='blur(0.6px)';mc.fill(contorno);
  const cc=camada.getContext('2d');cc.drawImage(base,0,0);cc.globalCompositeOperation='destination-in';cc.drawImage(m,0,0);cc.globalCompositeOperation='source-over';
  // Usa a proposta aprovada somente no espaço descoberto pelo corpo.
  // O restante do mapa, incluindo o colo fixo, vem do desenho original.
  const fc=fundo.getContext('2d');fc.drawImage(imagemFundo,0,0,W,H);
  const apagar=novo(),ac=apagar.getContext('2d');ac.filter='blur(3px)';ac.fill(limpeza);
  // Apaga também a borda original deslocada, além da antiga máscara de fundo.
  // A cobertura diminui junto ao apoio para não remover o colo que fica parado.
  const margem=novo(),mg=margem.getContext('2d');mg.fill(contorno);
  mg.lineWidth=10;mg.lineJoin='round';mg.stroke(contorno);
  const faixa=mg.getImageData(0,0,W,H);
  for(let y=area.y;y<area.y+area.h;y++)for(let x=area.x;x<area.x+area.w;x++){
   const s=(x-apoio.x)*-.6+(y-apoio.y)*-.8;
   const peso=Math.max(0,Math.min(1,(s+24)/18));
   faixa.data[(y*W+x)*4+3]*=peso*peso*(3-2*peso);
  }
  mg.putImageData(faixa,0,0);ac.filter='blur(1px)';ac.drawImage(margem,0,0);
  // A bexiga fica integralmente protegida, inclusive na borda suavizada.
  ac.filter='none';ac.globalCompositeOperation='destination-out';ac.fill(bexiga);
  fc.globalCompositeOperation='destination-in';fc.drawImage(apagar,0,0);fc.globalCompositeOperation='source-over';
  deformar=window.criarDeformador(camada,area);
  const borda=document.createElementNS('http://www.w3.org/2000/svg','path');borda.setAttribute('d',caminhoCorpo);
  const comprimento=borda.getTotalLength();
  pontosBorda=Array.from({length:Math.ceil(comprimento)+1},(_,i)=>borda.getPointAtLength(Math.min(i,comprimento)));
  // Busca o primeiro contato anterior com a silhueta da bexiga, em passos finos.
  for(let a=-.25;a>=-25;a-=.25){if(tocaBexiga(a))break;limiteAnterior=a;}
  // Substitui o teto fixo de 90° pelo primeiro contato com a parede do reto.
  for(let a=.25;a<=160;a+=.25){if(tocaReto(a)||tocaBexiga(a))break;limitePosterior=a;}

  limiteAnterior=Math.ceil(limiteAnterior);
 }
 function tocaBexiga(a){return pontosBorda.some(p=>{const q=transformar(p.x,p.y,a);return ctx.isPointInPath(bexiga,q.x,q.y)});}
 function tocaReto(a){return pontosBorda.some(p=>{const q=transformar(p.x,p.y,a);return ctx.isPointInPath(reto,q.x,q.y)});}
 function desenhar(){
  ctx.clearRect(0,0,W,H);
  ctx.drawImage(reparoRamo,0,0);
  if(angulo){ctx.drawImage(fundo,0,0);
   ctx.drawImage(reparoTrompa,0,0);
  }
  // O arco existente e sua continuação ficam parados atrás do corpo uterino.
  // A continuação termina dentro da primeira interseção com o útero, para
  // não reaparecer do outro lado sobre o intestino.
  const limite=limiteContinuacao(),vc=continuacaoVisivel.getContext('2d');vc.clearRect(0,0,W,H);
  vc.save();vc.lineWidth=38;vc.lineCap='round';vc.lineJoin='round';vc.beginPath();
  for(let s=0;s<=limite;s+=1){const p=trajetoContinuacao.getPointAtLength(s);if(s===0)vc.moveTo(p.x,p.y);else vc.lineTo(p.x,p.y)}
  vc.stroke();vc.globalCompositeOperation='source-in';vc.drawImage(continuacao,0,0);vc.restore();
  ctx.drawImage(trompa,0,0);ctx.drawImage(continuacaoVisivel,0,0);
  if(angulo){
   // Malha bidimensional para girar sem aproximar cada linha por uma faixa reta.
   const malha=[],passo=6,ponto=(x,y)=>({...transformar(x,y),sx:x,sy:y});
   for(let y=area.y;y<area.y+area.h;y+=passo)for(let x=area.x;x<area.x+area.w;x+=passo){
    const xx=Math.min(x+passo,area.x+area.w),yy=Math.min(y+passo,area.y+area.h);
    const a=ponto(x,y),b=ponto(xx,y),c=ponto(xx,yy),d=ponto(x,yy);malha.push([a,b,c],[a,c,d]);
   }
   ctx.drawImage(deformar(malha),0,0);
  }else ctx.drawImage(camada,0,0);
 }
 function limiteContinuacao(){
  const corpo=new Path2D();pontosBorda.forEach((p,i)=>{const q=transformar(p.x,p.y);if(i)corpo.lineTo(q.x,q.y);else corpo.moveTo(q.x,q.y)});corpo.closePath();
  for(let s=0;s<=comprimentoContinuacao;s++){const p=trajetoContinuacao.getPointAtLength(s);if(ctx.isPointInPath(corpo,p.x,p.y))return Math.min(comprimentoContinuacao,s+18)}
  return comprimentoContinuacao;
 }

 const carregar=src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Não foi possível carregar o útero.'));img.src=src});
 const [img,imagemFundo,imagemReparo]=await Promise.all([carregar('assets/mapa-base-sagital-novo-visitante-suave.png'),carregar('assets/utero-fundo-aprovado.png'),carregar('assets/trompa-sagital-fundo.png')]);
 base.getContext('2d').drawImage(img,0,0);preparar(imagemFundo);prepararTrompa(imagemReparo);desenhar();
 function localizar(x,y,a=angulo){const path=new Path2D();pontosBorda.forEach((p,i)=>{const q=transformar(p.x,p.y,a);if(i)path.lineTo(q.x,q.y);else path.moveTo(q.x,q.y)});path.closePath();return ctx.isPointInPath(path,x,y);}
 function origem(x,y,a=angulo){
  let p={x,y};
  for(let i=0;i<30;i++){
   const q=transformar(p.x,p.y,a),dx=x-q.x,dy=y-q.y;
   if(Math.hypot(dx,dy)<.001)return p;
   const u=transformar(p.x+.1,p.y,a),v=transformar(p.x,p.y+.1,a);
   const ax=(u.x-q.x)/.1,ay=(u.y-q.y)/.1,bx=(v.x-q.x)/.1,by=(v.y-q.y)/.1,det=ax*by-ay*bx;
   if(Math.abs(det)<.001)break;
   p.x+=Math.max(-30,Math.min(30,(dx*by-dy*bx)/det));p.y+=Math.max(-30,Math.min(30,(dy*ax-dx*ay)/det));
  }
  return Math.hypot(transformar(p.x,p.y,a).x-x,transformar(p.x,p.y,a).y-y)<.1?p:null;
 }
 return {estado:()=>({angulo}),limites:()=>({min:limiteAnterior,max:limitePosterior}),localizar,origem,transformar,transformarTrompa,
  conferirContinuacao(){return{limite:limiteContinuacao(),total:comprimentoContinuacao,inicio:trajetoContinuacao.getPointAtLength(0),ponto:s=>trajetoContinuacao.getPointAtLength(s)}},
  conferirTrompa(a=angulo){prepararTrajetoTrompa(a);return{original:comprimentoTrompa,atual:comprimento(destinosTrompa),inicio:destinosTrompa[0],fim:destinosTrompa.at(-1),ancora:transformar(encaixeTrompa.x,encaixeTrompa.y,a),fimOriginal:pontosTrompa.at(-1),secoes:faixaTrompa.secoes((x,y)=>transformarTrompa(x,y,a))}},
  mover(a){if(!Number.isFinite(a))return;angulo=Math.max(limiteAnterior,Math.min(limitePosterior,a));desenhar()},
  restaurar(v){angulo=v?.angulo||0;desenhar()},tocaReto,tocaBexiga};
};
