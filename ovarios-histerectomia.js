// Prévia V2: sombras suavizadas pela imagegen, aplicadas só aos recortes dos ovários.
window.endocartaCriarOvariosHisterectomia=async function(canvas,fontes,opcoes){
 'use strict';
 const W=1086,H=1448,ctx=canvas.getContext('2d'),lados=opcoes.lados;
 const novo=()=>Object.assign(document.createElement('canvas'),{width:W,height:H});
 const carregar=src=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error('Imagem não carregada: '+src));i.src=src});
 const total=opcoes.base.includes('/total-');
 const [base,fundo]=await Promise.all([carregar(opcoes.base),carregar('assets/histerectomias/'+(total?'total-ooforectomia-bilateral-v3.png':'parcial-ooforectomia-bilateral-v1.png'))]);
 const corrigida=await carregar('assets/ovarios-histerectomia/'+(total?'total':'parcial')+'-sombra-v2.png');
 const grupos={esquerdo:{x:0,y:0,cx:323,cy:715},direito:{x:0,y:0,cx:767,cy:721}};
 const caminhos={
 esquerdo:'M 409 472 C 397 507 377 552 364 601 C 358 624 384 650 388 682 C 395 727 374 778 350 799 C 329 819 293 818 274 797 C 251 774 249 745 257 709 C 266 668 284 645 310 627 C 337 609 344 588 357 555 L 402 473 Z',
 direito:'M 668 471 C 686 503 705 548 724 593 C 730 616 705 646 696 678 C 682 724 705 774 736 801 C 762 823 796 822 817 802 C 839 782 842 753 832 722 C 819 681 799 651 773 633 C 751 616 745 595 732 565 L 676 473 Z'
 };
 const camadas={};
 for(const lado of lados){
  const mask=novo(),m=mask.getContext('2d');m.filter='blur(1.5px)';m.fill(new Path2D(caminhos[lado]));
  const corrigir=!(total&&lado==='direito');
  const fonte=novo(),f=fonte.getContext('2d');f.drawImage(corrigir?corrigida:base,0,0,W,H);f.globalCompositeOperation='destination-in';f.drawImage(mask,0,0);
  const limpeza=novo(),l=limpeza.getContext('2d');
  const ampla=novo(),a=ampla.getContext('2d');a.filter='blur(16px)';a.lineWidth=72;a.lineJoin='round';a.fill(new Path2D(caminhos[lado]));a.stroke(new Path2D(caminhos[lado]));
  l.drawImage(fundo,0,0,W,H);l.globalCompositeOperation='destination-in';l.drawImage(ampla,0,0);
  camadas[lado]={corrigir,fonte,limpeza,deformar:window.criarDeformador(fonte,lado==='esquerdo'?{x:225,y:450,w:210,h:400}:{x:645,y:450,w:225,h:400})};
 }
 const peso=y=>{const t=Math.max(0,Math.min(1,(y-480)/150));return t*t*(3-2*t)};
 function desenhar(){ctx.clearRect(0,0,W,H);for(const lado of lados){const g=grupos[lado];if(camadas[lado].corrigir||g.x||g.y)ctx.drawImage(camadas[lado].limpeza,0,0)}for(const lado of lados){const g=grupos[lado];if(g.x||g.y)ctx.drawImage(camadas[lado].deformar((x,y)=>({x:x+g.x*peso(y),y:y+g.y*peso(y)})),0,0);else if(camadas[lado].corrigir)ctx.drawImage(camadas[lado].fonte,0,0)}}
 desenhar();
 return {
  estado:()=>Object.fromEntries(Object.entries(grupos).map(([k,g])=>[k,{x:g.x,y:g.y}])),
  mover(lado,x,y){if(!lados.includes(lado))return;const g=grupos[lado];g.x=Math.max(lado==='esquerdo'?-90:-530,Math.min(lado==='esquerdo'?530:90,x));g.y=Math.max(-360,Math.min(200,y));desenhar()},
  restaurar(v){for(const [lado,g] of Object.entries(grupos)){g.x=lados.includes(lado)?v?.[lado]?.x||0:0;g.y=lados.includes(lado)?v?.[lado]?.y||0:0}desenhar()},
  localizar(x,y,preferido){return [preferido,...lados.filter(l=>l!==preferido)].filter(l=>lados.includes(l)).find(l=>{const g=grupos[l];return ((x-g.cx-g.x)/80)**2+((y-g.cy-g.y)/110)**2<=1})||null},
  ureteresProntos:Promise.resolve(),definirUreteres(){}
 };
};
