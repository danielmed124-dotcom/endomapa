(() => {
 'use strict';
 const normal={direita:'M 684 487 C 720 501 726 538 774 567 C 817 590 839 622 841 663 C 840 704 852 731 853 764 C 856 806 837 835 808 846 C 782 856 755 833 740 809 C 733 797 729 784 726 771',esquerda:'M 404 484 C 378 493 373 525 331 551 C 297 572 257 586 252 622 C 248 663 250 683 237 719 C 222 761 236 803 265 820 C 291 837 326 823 346 802 C 355 790 358 777 361 764'};
 const kissing={esquerda:'M 380 484 C 348 501 344 541 371 568 C 389 584 416 592 418 618 C 421 643 372 663 372 701 C 370 733 405 750 408 777 C 413 816 441 834 471 830 C 499 827 521 811 532 781',direita:'M 710 483 C 742 503 746 538 726 564 C 708 586 680 591 678 618 C 673 646 711 671 712 706 C 716 740 699 767 693 787 C 683 822 661 834 630 830 C 600 828 574 812 559 782'};
 const ambas=['direita','esquerda'];
 const configs={coronal:{lados:ambas},'ooforectomia-direita':{lados:['esquerda']},'ooforectomia-esquerda':{lados:['direita']},'ooforectomia-bilateral':{lados:[]},'kissing-ovaries':{lados:ambas,trajetoProprio:true,caminhos:kissing,areas:{esquerda:{x:315,y:450,w:250,h:425},direita:{x:525,y:450,w:250,h:425}}},'hidrosalpinge-direita':{lados:ambas,nativas:['direita']},'hidrosalpinge-esquerda':{lados:ambas,nativas:['esquerda']},'hidrosalpinge-bilateral':{lados:ambas,nativas:ambas,modelo:'bilateral'}};
 const pose=()=>Array.from({length:4},()=>({x:0,y:0}));
 const segmento=()=>({ativo:false,inicio:0,fim:100});
 function inicial(vista){return Object.fromEntries(ambas.map(l=>[l,{inserida:Boolean(configs[vista]?.nativas?.includes(l)),inicio:0,fim:100,tuba:segmento(),tubaAnterior:null,espessamento:{ativo:false,inicio:38,fim:60},posicao:pose()}]))}
 function validar(vista,estado){
  if(estado===undefined)return;
  const config=configs[vista],falhar=()=>{throw Error('Ajustes das tubas inválidos. O mapa aberto foi preservado.')};
  if(!config||vista==='kissing-ovaries'||!estado||typeof estado!=='object'||Array.isArray(estado))falhar();
  const faixa=e=>e&&Number.isFinite(e.inicio)&&Number.isFinite(e.fim)&&e.inicio>=0&&e.fim<=100&&e.inicio<=e.fim;
  const seg=e=>faixa(e)&&typeof e.ativo==='boolean';
  for(const l of ambas){const e=estado[l];
   if(e?.removida!==undefined&&typeof e.removida!=='boolean')falhar();
   if(!e||typeof e.inserida!=='boolean'||!faixa(e)||!seg(e.tuba)||!seg(e.espessamento)||(e.tubaAnterior!==null&&!seg(e.tubaAnterior))||!Array.isArray(e.posicao)||e.posicao.length!==4||e.posicao.some(p=>!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||Math.hypot(p.x,p.y)>260.001))falhar();
   if(!config.lados.includes(l)&&JSON.stringify(e)!==JSON.stringify(inicial(vista)[l]))falhar();
  }
 }
 const canvas=()=>Object.assign(document.createElement('canvas'),{width:1086,height:1448});
 const imagens=new Map();
 function carregar(src){if(!imagens.has(src))imagens.set(src,new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>{imagens.delete(src);reject(Error('Não foi possível carregar as tubas. Tente novamente.'))};i.src=src}));return imagens.get(src)}
 window.endomapaTubasModelos={configs,normal,inicial,validar,canvas,carregar,segmento,pose};
})();
