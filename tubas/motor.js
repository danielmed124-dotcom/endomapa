// Composição das texturas aprovadas. Cada vista mantém a própria base.
window.endomapaCriarTubas=async function(vista,fonte){
 'use strict';
 const M=window.endomapaTubasModelos,config=M.configs[vista],W=1086,H=1448,lados=config.lados;
 const criar=M.canvas,suave=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v)};
 const [original,normalComum,fundo,referencia,fundoMovimento,...recortes]=await Promise.all([fonte,'assets/mapa-base-coronal-aberto-visitante.png?v=reto-20261019','assets/mapas-especiais/bilateral-cor-v3/ooforectomia-bilateral-neutro.png','assets/tubas/espessamento.png','assets/tubas/fundo-sem-tubas-imagegen-v4.png','assets/tubas/hidrosalpinge-direita-recorte-imagegen.png','assets/tubas/hidrosalpinge-esquerda-recorte-imagegen.png'].map(M.carregar));
 const normal=criar(),ng=normal.getContext('2d');ng.drawImage(original,0,0);
 const areas=config.areas||{direita:{x:656,y:455,w:286,h:452},esquerda:{x:167,y:455,w:269,h:430}};
 // Nos modelos que já abrem dilatados, a remoção troca apenas a região tubária.
 for(const lado of config.nativas||[]){const a=areas[lado];ng.drawImage(normalComum,a.x,a.y,a.w,a.h,a.x,a.y,a.w,a.h)}
 let orgaos,utero;
 if(config.trajetoProprio){
  const c=criar(),g=c.getContext('2d');g.filter='blur(1px)';
  g.beginPath();g.ellipse(477,749,61,74,-.45,0,Math.PI*2);g.fill();g.beginPath();g.ellipse(616,749,61,74,.45,0,Math.PI*2);g.fill();
  g.lineWidth=18;g.stroke(new Path2D('M 421 602 C 449 630 428 650 446 682 M 678 602 C 650 630 662 655 647 682'));
  orgaos=g.getImageData(0,0,W,H).data;
  const path=new Path2D('M 392 469 C 440 466 628 466 698 470 C 666 510 641 569 626 618 C 604 666 569 716 548 745 C 515 707 476 666 456 615 C 431 554 414 508 392 469 Z');
  const u=criar().getContext('2d');utero=(x,y)=>u.isPointInPath(path,x,y);
 }
 const tubas=window.criarAfilamentoTubas(fundo,{escalaMinima:1/6,caminhos:config.caminhos,areas:config.areas,orgaos});
 const motores={},patches={};
 const opcoesHidro=config.trajetoProprio?{caminhos:config.caminhos,normais:config.caminhos}:{};
 for(const lado of lados){
  const src=(config.nativas||[]).includes(lado)?original:await M.carregar(`assets/mapas-especiais/hidrosalpinge/hidrosalpinge-${lado}-neutro.png?v=reto-20261019`);
  let fonteHidro=src;
  if(config.trajetoProprio){
   // Transporta a textura existente para o trajeto próprio, sem gerar anatomia.
   const a={x:120,y:450,w:850,h:460},origMotor=window.criarHidrosalpingeAfilada(src,normalComum,lado,lado,a),camada=origMotor.desenhar(0,100);
   const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',M.normal[lado]);const L=path.getTotalLength();
   const ps=Array.from({length:201},(_,i)=>({...path.getPointAtLength(i*L/200),t:i/200}));
   // DOMPoint não expõe x/y na enumeração em todos os navegadores.
   for(let i=0;i<ps.length;i++){const p=path.getPointAtLength(i*L/200);ps[i]={x:p.x,y:p.y,t:i/200}}
   const transformar=(x,y)=>{let q=ps[0],dist=Infinity;for(const p of ps){const d=(x-p.x)**2+(y-p.y)**2;if(d<dist){dist=d;q=p}}
    const t=q.t,p=tubas.ponto(lado,t*100),o1=path.getPointAtLength(Math.max(0,t*L-1)),o2=path.getPointAtLength(Math.min(L,t*L+1)),n1=tubas.ponto(lado,Math.max(0,t*100-.2)),n2=tubas.ponto(lado,Math.min(100,t*100+.2));
    const ang=Math.atan2(n2.y-n1.y,n2.x-n1.x)-Math.atan2(o2.y-o1.y,o2.x-o1.x),co=Math.cos(ang),si=Math.sin(ang);return{x:p.x+(x-q.x)*co-(y-q.y)*si,y:p.y+(x-q.x)*si+(y-q.y)*co}};
   const triangulos=[];for(let y=a.y;y<a.y+a.h;y+=8)for(let x=a.x;x<a.x+a.w;x+=8){const p=[[x,y],[x+8,y],[x+8,y+8],[x,y+8]].map(([sx,sy])=>({sx,sy,...transformar(sx,sy)}));triangulos.push([p[0],p[1],p[2]],[p[0],p[2],p[3]])}
   fonteHidro=criar();const g=fonteHidro.getContext('2d');g.drawImage(normal,0,0);g.drawImage(window.criarDeformador(camada,a)(triangulos),0,0);
  }
  const a=areas[lado],motor=window.criarHidrosalpingeAfilada(fonteHidro,normal,lado,config.modelo||lado,a,opcoesHidro);
  const c=criar(),g=c.getContext('2d');g.drawImage(fonteHidro,0,0);const img=g.getImageData(a.x,a.y,a.w,a.h),limpo=ng.getImageData(a.x,a.y,a.w,a.h),patch=new ImageData(new Uint8ClampedArray(limpo.data),a.w,a.h);
  for(let y=0;y<a.h;y++)for(let x=0;x<a.w;x++){let d=Infinity,p;for(const q of motor.pontos){const dd=(x+a.x-q.x)**2+(y+a.y-q.y)**2;if(dd<d){d=dd;p=q}}
   const peso=suave((p.r+18-Math.sqrt(d))/10),i=(y*a.w+x)*4;for(let k=0;k<3;k++)patch.data[i+k]=Math.round(limpo.data[i+k]*(1-peso)+img.data[i+k]*peso);
  }
  motores[lado]={motor};patches[lado]={patch,limpo};
 }
 const espessador=window.criarEspessamentoTubas(referencia,tubas,config);
 const fundoLimpo=criar();fundoLimpo.getContext('2d').drawImage(config.trajetoProprio?fundo:fundoMovimento,0,0);
 const movimento=window.criarMovimentoTubas(tubas,fundo,motores,{direita:recortes[0],esquerda:recortes[1]},fundoLimpo,{...config,utero,limpezaLocal:vista!=='coronal'});
 let chave='',base;
 const tela=criar(),ctx=tela.getContext('2d');
 function preparar(estado){
  const k=JSON.stringify(lados.map(l=>{const e=estado[l];return[e.inserida,e.inicio,e.fim,e.tuba,e.espessamento]}));
  if(k===chave&&base){ctx.putImageData(base,0,0);return}
  ctx.drawImage(normal,0,0);const protecoes=[];
  for(const lado of lados){const e=estado[lado];if(!e.inserida)continue;const a=areas[lado],{motor}=motores[lado],camada=motor.desenhar(e.inicio,e.fim);
   if(e.inicio===0&&e.fim===100)ctx.putImageData(patches[lado].patch,a.x,a.y);
   else{ctx.putImageData(patches[lado].limpo,a.x,a.y);ctx.save();ctx.beginPath();ctx.rect(a.x,a.y,a.w,a.h);ctx.clip();ctx.drawImage(camada,0,0);ctx.restore()}
   protecoes.push({canvas:camada,secoes:motor.secoes(e.inicio,e.fim)});
  }
  if(lados.some(l=>estado[l].tuba.ativo)){tubas.proteger(protecoes);tubas.aplicar(ctx,estadoTubas(estado))}
  espessador.desenhar(ctx,estado);base=ctx.getImageData(0,0,W,H);chave=k;
 }
 const estadoTubas=e=>Object.fromEntries(['direita','esquerda'].map(l=>[l,e[l].tuba]));
 return {
  original,config,movimento,tubas,
  renderizar(estado,separar=false){preparar(estado);if(separar)return movimento.aplicar(ctx,estado,true);movimento.aplicar(ctx,estado);return tela},
  ponto(lado,tipo,chave,estado){const e=estado[lado];if(tipo==='posicao')return movimento.ponto(lado,Number(chave),e.posicao);
   const s=tipo==='hidro'?e:tipo==='tubas'?e.tuba:e.espessamento;let p;
   if(tipo==='hidro'){const ps=motores[lado].motor.pontos,f=s[chave]/100*(ps.length-1),i=Math.floor(f),a=ps[i],b=ps[Math.min(i+1,ps.length-1)];p={x:a.x+(b.x-a.x)*(f-i),y:a.y+(b.y-a.y)*(f-i)}}else p=tubas.ponto(lado,s[chave]);
   return movimento.deformar(lado,p,e.posicao);
  },
  proximo(lado,tipo,x,y,estado){let distancia=Infinity,valor=0;for(let t=0;t<=100;t+=.25){const copia={...estado,[lado]:{...estado[lado]}};const e=copia[lado];if(tipo==='hidro')e.inicio=t;else if(tipo==='tubas')e.tuba={...e.tuba,inicio:t};else e.espessamento={...e.espessamento,inicio:t};const p=this.ponto(lado,tipo,'inicio',copia),d=(p.x-x)**2+(p.y-y)**2;if(d<distancia){distancia=d;valor=t}}return valor}
 };
};
