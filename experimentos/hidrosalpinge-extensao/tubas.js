// Afilamento local das tubas normais. Não altera a malha da hidrosalpinge.
window.criarAfilamentoTubas=function(fundo){
 'use strict';
 const W=1086,H=1448,limitar=(v,a,b)=>Math.max(a,Math.min(b,v));
 const suave=v=>{v=limitar(v,0,1);return v*v*(3-2*v)};
 const caminhos={
  direita:'M 684 487 C 720 501 726 538 774 567 C 817 590 839 622 841 663 C 840 704 852 731 853 764 C 856 806 837 835 808 846 C 782 856 755 833 740 809 C 733 797 729 784 726 771',
  esquerda:'M 404 484 C 378 493 373 525 331 551 C 297 572 257 586 252 622 C 248 663 250 683 237 719 C 222 761 236 803 265 820 C 291 837 326 823 346 802 C 355 790 358 777 361 764'
 };
 const criar=()=>Object.assign(document.createElement('canvas'),{width:W,height:H});
 const geometrias={};
 const base=criar(),bg=base.getContext('2d');bg.drawImage(fundo,0,0,W,H);
 const pixelsFundo=bg.getImageData(0,0,W,H).data;
 const outros=criar(),og=outros.getContext('2d');
 // Recortes dos ovários e ligamentos já usados no experimento de órgãos.
 // Ficam fixos; nunca acompanham a compressão da tuba vizinha.
 og.filter='blur(1px)';og.beginPath();og.ellipse(330,707,63,102,.35,0,Math.PI*2);og.fill();
 og.beginPath();og.ellipse(763,720,64,105,-.30,0,Math.PI*2);og.fill();
 og.lineWidth=28;og.lineCap='round';
 og.stroke(new Path2D('M 406 493 C 405 530 386 580 372 622'));
 og.stroke(new Path2D('M 695 496 C 700 535 718 588 732 629'));
 const orgaos=og.getImageData(0,0,W,H).data;
 const protecao=criar(),pg=protecao.getContext('2d',{willReadFrequently:true});
 let protegidos=new Uint8ClampedArray(W*H*4);
 const distancias=new Float32Array(W*H);
 function preparar(lado){
  const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',caminhos[lado]);
  const L=path.getTotalLength(),n=Math.ceil(L/2),pontos=[];
  for(let i=0;i<=n;i++){
   const t=i/n,p=path.getPointAtLength(t*L),a=path.getPointAtLength(Math.max(0,t*L-1)),b=path.getPointAtLength(Math.min(L,t*L+1));
   const dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy)||1;
   pontos.push({x:p.x,y:p.y,nx:-dy/l,ny:dx/l,t});
  }
  const area=lado==='direita'?{x:650,y:450,w:245,h:450}:{x:195,y:450,w:245,h:420};
  const lista=[];
  for(let y=area.y;y<area.y+area.h;y++)for(let x=area.x;x<area.x+area.w;x++){
   let menor=Infinity,melhor;
   for(const p of pontos){const d=(x+.5-p.x)**2+(y+.5-p.y)**2;if(d<menor){menor=d;melhor=p}}
   if(menor>38*38)continue;
   const p=melhor,d=(x+.5-p.x)*p.nx+(y+.5-p.y)*p.ny;
   // Sem deslocar as inserções, o ovário ou o ligamento ao lado da tuba.
   const ponta=suave(p.t/.035)*suave((1-p.t)/.06);
   lista.push({i:(y*W+x)*4,x,y,p,d,ponta});
  }
  geometrias[lado]={pontos,lista};
 }
 for(const lado of Object.keys(caminhos))preparar(lado);
 function ponto(lado,valor){
  const ps=geometrias[lado].pontos,pos=limitar(valor,0,100)/100*(ps.length-1),i=Math.floor(pos),a=ps[i],b=ps[Math.min(ps.length-1,i+1)],u=pos-i;
  return{x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u};
 }
 function proximo(lado,x,y){
  let menor=Infinity,valor=0;
  for(const p of geometrias[lado].pontos){const d=(x-p.x)**2+(y-p.y)**2;if(d<menor){menor=d;valor=p.t*100}}
  return valor;
 }
 function perfil(t,e){
  if(!e.ativo||e.inicio===e.fim)return 0;
  const a=e.inicio/100,b=e.fim/100,transicao=Math.min(.10,(b-a)/2);
  return suave((t-a)/transicao)*suave((b-t)/transicao);
 }
 function ler(dados,x,y,c){
  x=limitar(x-.5,0,W-2);y=limitar(y-.5,0,H-2);
  const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,i=(iy*W+ix)*4;
  return dados[i+c]*(1-fx)*(1-fy)+dados[i+4+c]*fx*(1-fy)+dados[i+W*4+c]*(1-fx)*fy+dados[i+W*4+4+c]*fx*fy;
 }
 function proteger(camadas){
  pg.clearRect(0,0,W,H);
  // O recorte antigo incluía o trajeto inteiro, mesmo o trecho de calibre
  // normal antes da dilatação. Protege só as seções realmente alargadas.
  for(const {canvas,secoes} of camadas){
   const recorte=new Path2D();let trecho=[];
   const fechar=()=>{
    if(trecho.length<2){trecho=[];return}
    trecho.forEach((p,i)=>{const x=p.xFinal+p.nfx*(p.raioFinal+5),y=p.yFinal+p.nfy*(p.raioFinal+5);if(i)recorte.lineTo(x,y);else recorte.moveTo(x,y)});
    for(let i=trecho.length-1;i>=0;i--){const p=trecho[i];recorte.lineTo(p.xFinal-p.nfx*(p.raioFinal+5),p.yFinal-p.nfy*(p.raioFinal+5))}
    recorte.closePath();
    for(const p of [trecho[0],trecho.at(-1)])if(p===secoes[0]||p===secoes.at(-1)){
     recorte.moveTo(p.xFinal+p.raioFinal+5,p.yFinal);recorte.arc(p.xFinal,p.yFinal,p.raioFinal+5,0,Math.PI*2);
    }
    trecho=[];
   };
   for(const p of secoes){if(p.raioFinal>=28)trecho.push(p);else fechar()}fechar();
   pg.save();pg.clip(recorte);pg.drawImage(canvas,0,0);pg.restore();
  }
  protegidos=pg.getImageData(0,0,W,H).data;
  // Distância contínua da região protegida: a largura retorna ao original
  // antes da junção, sem degraus nem recorte brusco ao tocar a dilatação.
  for(let i=0;i<distancias.length;i++)distancias[i]=protegidos[i*4+3]?0:1000;
  for(let y=1;y<H;y++)for(let x=1;x<W-1;x++){
   const i=y*W+x;distancias[i]=Math.min(distancias[i],distancias[i-1]+1,distancias[i-W]+1,distancias[i-W-1]+Math.SQRT2,distancias[i-W+1]+Math.SQRT2);
  }
  for(let y=H-2;y>=0;y--)for(let x=W-2;x>0;x--){
   const i=y*W+x;distancias[i]=Math.min(distancias[i],distancias[i+1]+1,distancias[i+W]+1,distancias[i+W-1]+Math.SQRT2,distancias[i+W+1]+Math.SQRT2);
  }
 }
 function aplicar(ctx,estados){
  if(!Object.values(estados).some(e=>e.ativo&&e.inicio<e.fim))return;
  const quadro=ctx.getImageData(0,0,W,H),origem=quadro.data.slice(),saida=quadro.data;
  for(const lado of Object.keys(caminhos)){
   const e=estados[lado];if(!e.ativo||e.inicio===e.fim)continue;
   for(const {i,x,y,p,d,ponta} of geometrias[lado].lista){
    if(protegidos[i+3]||orgaos[i+3]===255)continue;
    // A redução chega a 1/3 sem transparência do tecido. Retoma o calibre
    // normal suavemente antes de encontrar a região dilatada protegida.
    const livre=suave(distancias[Math.round(p.y)*W+Math.round(p.x)]/24);
    const intensidade=perfil(p.t,e)*ponta*livre;
    if(intensidade<=0)continue;
    const escala=1-2/3*intensidade,dist=Math.abs(d),raio=24,suporte=38;
    if(dist>=suporte)continue;
    // Reamostra a própria imagem; o entorno retorna suavemente à identidade
    // na borda da faixa. Não cola um fundo de outra ilustração.
    const novoRaio=raio*escala;
    const deslocamento=dist<=novoRaio?dist/escala-dist:(raio-novoRaio)*(1-suave((dist-novoRaio)/(suporte-novoRaio)));
    const origemD=d+Math.sign(d)*deslocamento;
    const sx=x+.5+p.nx*(origemD-d),sy=y+.5+p.ny*(origemD-d);
    const j=(Math.round(sy)*W+Math.round(sx))*4;if(protegidos[j+3])continue;
    const amostraOrgao=ler(orgaos,sx,sy,3)/255;
    for(let c=0;c<3;c++){
     const cor=ler(origem,sx,sy,c);
     // A compressão pode revelar o espaço entre a tuba e o ovário. Esse
     // espaço usa a camada de fundo existente, sem esticar o ovário para lá.
     const externo=lado==='esquerda'?1:-1;
     const bx=p.x+p.nx*externo*48,by=p.y+p.ny*externo*48;
     const corFundo=limitar(pixelsFundo[i+c]+ler(origem,bx,by,c)-ler(pixelsFundo,bx,by,c),0,255);
     const novo=cor*(1-amostraOrgao)+corFundo*amostraOrgao;
     const fixo=orgaos[i+3]/255;saida[i+c]=Math.round(novo*(1-fixo)+origem[i+c]*fixo);
    }
   }
  }
  ctx.putImageData(quadro,0,0);
 }
 return{ponto,proximo,perfil,proteger,aplicar,protegidos:()=>protegidos.slice(),orgaos:()=>orgaos.slice()};
};
