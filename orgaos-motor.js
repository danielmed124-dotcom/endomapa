// Motor coronal aprovado no teste local; camada transparente sobre a base da conta.
window.endomapaCriarOrgaos = async function(canvas) {
 'use strict';
 const W=1086,H=1448,ctx=canvas.getContext('2d');
 const contornos={
  esquerdo:'M 428 462 C 381 457 363 504 324 529 C 278 551 235 567 228 611 C 224 650 227 680 215 716 C 200 768 218 818 253 841 C 291 863 343 847 374 816 C 400 779 411 721 413 670 C 416 632 400 600 386 584 C 397 554 411 524 428 504 Z',
  direito:'M 662 461 C 706 458 730 510 770 538 C 816 559 853 585 866 629 C 880 672 870 697 881 733 C 895 778 886 824 851 855 C 813 885 764 865 732 834 C 704 800 691 752 687 708 C 679 663 689 620 704 595 C 694 562 678 527 662 504 Z'
 };
 const grupos={esquerdo:{x:0,y:0,cx:326,cy:710},direito:{x:0,y:0,cx:765,cy:724}};
 const limites={esquerdo:{minX:-90,maxX:530},direito:{minX:-530,maxX:90}};
 const imagens={},camadas={},paths={};
 const novoCanvas=()=>Object.assign(document.createElement('canvas'),{width:W,height:H});
 const carregar=src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Não foi possível carregar '+src));img.src=src});
 const suavizar=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
 // O inicio da trompa fica ancorado; o deslocamento cresce ate o ovario.
 const peso=y=>suavizar((y-470)/155);
 function prepararCamada(lado){
  const mascara=novoCanvas(),m=mascara.getContext('2d');
  paths[lado]=new Path2D(contornos[lado]);m.filter='blur(5px)';m.fill(paths[lado]);
  // Ovarios rigidos; trompas e ligamentos usam suas proprias secoes de calibre constante.
  const anatomia=novoCanvas(),a=anatomia.getContext('2d');a.filter='blur(1.2px)';
  const tubo=lado==='esquerdo'
   ?'M 411 484 C 378 493 373 525 331 551 C 297 572 257 586 252 622 C 248 663 250 683 237 719 C 222 761 236 803 265 820 C 291 837 326 823 346 802 C 355 790 358 777 361 764'
   :'M 682 485 C 720 501 726 538 774 567 C 817 590 839 622 841 663 C 840 704 852 731 853 764 C 856 806 837 835 808 846 C 782 856 755 833 740 809 C 733 797 729 784 726 771';
  const ligamento=lado==='esquerdo'?'M 406 493 C 405 530 386 580 372 622':'M 695 496 C 700 535 718 588 732 629';
  // Limpa tambem as bordas do trajeto original: o contorno amplo sozinho
  // deixava residuos da porcao superior ao deslocar o conjunto.
  m.filter='blur(4px)';m.lineCap='round';m.lineJoin='round';
  m.lineWidth=64;m.stroke(new Path2D(tubo));
  m.lineWidth=42;m.stroke(new Path2D(ligamento));
  a.beginPath();if(lado==='esquerdo')a.ellipse(330,707,61,100,.35,0,Math.PI*2);else a.ellipse(763,720,62,103,-.30,0,Math.PI*2);a.fill();
  const frente=novoCanvas(),f=frente.getContext('2d');f.drawImage(imagens.base,0,0);f.globalCompositeOperation='destination-in';f.drawImage(anatomia,0,0);
  const fundo=novoCanvas(),b=fundo.getContext('2d');b.drawImage(imagens.fundo,0,0,W,H);b.globalCompositeOperation='destination-in';b.drawImage(mascara,0,0);
  const area=lado==='esquerdo'?{x:205,y:450,w:235,h:440}:{x:650,y:450,w:240,h:440};
  const fonte=novoCanvas();fonte.getContext('2d').drawImage(imagens.base,0,0);
  const bordaTrompa=lado==='esquerdo'?{suavidade:2.8,atenuacaoBorda:1.5}:{suavidade:2.3,atenuacaoBorda:1.1,bordasSuaves:[{de:525,ate:635},{de:720,ate:780}]};
  camadas[lado]={frente,fundo,trompa:window.criarFaixaTexturizada(fonte,tubo,30,area,bordaTrompa),ligamento:window.criarFaixaTexturizada(fonte,ligamento,14,area)};
 }
 function transformarEixo(lado,x,y){
  const g=grupos[lado],p=peso(y),t=Math.max(0,Math.min(1,(y-470)/155));
  // A derivada do arco deve zerar nas duas unioes com os trechos rigidos.
  // O seno simples terminava com inclinacao abrupta, criando quinas ao subir.
  const arco=(lado==='esquerdo'?-1:1)*Math.max(0,-g.y-70)*.65*Math.sin(Math.PI*t)**2;
  return{x:x+g.x*p+arco,y:y+g.y*p};
 }
 function desenharGrupo(lado){
  const g=grupos[lado];
  if(!g.x&&!g.y){ctx.drawImage(camadas[lado].frente,0,0);return}
  const transformar=(x,y)=>transformarEixo(lado,x,y);
  transformar.suavizarCurva=suavizar((-g.y-100)/160);
  ctx.drawImage(camadas[lado].ligamento.desenhar(transformar),0,0);
  ctx.save();if(lado==='esquerdo')ctx.globalAlpha=.9;
  ctx.drawImage(camadas[lado].trompa.desenhar(transformar),0,0);
  ctx.restore();
  ctx.drawImage(camadas[lado].frente,g.x,g.y);
 }
 await Promise.all(Object.entries({base:'assets/mapa-base-coronal-aberto-visitante.png',fundo:'assets/mapas-especiais/bilateral-cor-v3/ooforectomia-bilateral-neutro.png'}).map(async([k,url])=>{imagens[k]=await carregar(url)}));
 Object.keys(grupos).forEach(prepararCamada);
 function renderizar(){
  ctx.clearRect(0,0,W,H);
  for(const lado of Object.keys(grupos))if(grupos[lado].x||grupos[lado].y)ctx.drawImage(camadas[lado].fundo,0,0);
  for(const lado of Object.keys(grupos))if(grupos[lado].x||grupos[lado].y)desenharGrupo(lado);
 }
 return {
  estado:()=>Object.fromEntries(Object.entries(grupos).map(([lado,g])=>[lado,{x:g.x,y:g.y}])),
  mover(lado,x,y){const g=grupos[lado],lim=limites[lado];g.x=Math.max(lim.minX,Math.min(lim.maxX,x));g.y=Math.max(-360,Math.min(200,y));renderizar()},
  restaurar(valores){for(const lado of Object.keys(grupos)){grupos[lado].x=valores?.[lado]?.x||0;grupos[lado].y=valores?.[lado]?.y||0}renderizar()},
  localizar(x,y,preferido){return [preferido,...Object.keys(grupos).filter(l=>l!==preferido)].filter(Boolean).find(l=>{const g=grupos[l];return ((x-g.cx-g.x)/85)**2+((y-g.cy-g.y)/125)**2<=1})||null}
 };
};