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
 const base=novo(),camada=novo(),fundo=novo();
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
  if(angulo){ctx.drawImage(fundo,0,0);
   // Malha bidimensional para girar sem aproximar cada linha por uma faixa reta.
   const malha=[],passo=6,ponto=(x,y)=>({...transformar(x,y),sx:x,sy:y});
   for(let y=area.y;y<area.y+area.h;y+=passo)for(let x=area.x;x<area.x+area.w;x+=passo){
    const xx=Math.min(x+passo,area.x+area.w),yy=Math.min(y+passo,area.y+area.h);
    const a=ponto(x,y),b=ponto(xx,y),c=ponto(xx,yy),d=ponto(x,yy);malha.push([a,b,c],[a,c,d]);
   }
   ctx.drawImage(deformar(malha),0,0);
  }
 }

 const carregar=src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Não foi possível carregar o útero.'));img.src=src});
 const [img,imagemFundo]=await Promise.all([carregar('assets/mapa-base-sagital-novo-visitante-suave.png'),carregar('assets/utero-fundo-aprovado.png')]);
 base.getContext('2d').drawImage(img,0,0);preparar(imagemFundo);
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
 return {estado:()=>({angulo}),limites:()=>({min:limiteAnterior,max:limitePosterior}),localizar,origem,transformar,
  mover(a){if(!Number.isFinite(a))return;angulo=Math.max(limiteAnterior,Math.min(limitePosterior,a));desenhar()},
  restaurar(v){angulo=v?.angulo||0;desenhar()},tocaReto,tocaBexiga};
};
