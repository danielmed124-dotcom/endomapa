/* Reamostragem continua: cada pixel final e escrito uma vez, sem juntar faixas do canvas. */
window.criarDeformador = function (fonte, area) {
 const W=fonte.width,H=fonte.height;
 const origem=fonte.getContext('2d').getImageData(area.x,area.y,area.w,area.h).data;
 const saida=Object.assign(document.createElement('canvas'),{width:W,height:H});
 const contexto=saida.getContext('2d'), quadro=contexto.createImageData(W,H),pixels=quadro.data;
 function triangulo(a,b,c) {
  const den=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);
  if(Math.abs(den)<0.0001)return;
  const x0=Math.max(0,Math.floor(Math.min(a.x,b.x,c.x))),x1=Math.min(W-1,Math.ceil(Math.max(a.x,b.x,c.x)));
  const y0=Math.max(0,Math.floor(Math.min(a.y,b.y,c.y))),y1=Math.min(H-1,Math.ceil(Math.max(a.y,b.y,c.y)));
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
   const u=((b.y-c.y)*(x+.5-c.x)+(c.x-b.x)*(y+.5-c.y))/den;
   const v=((c.y-a.y)*(x+.5-c.x)+(a.x-c.x)*(y+.5-c.y))/den,z=1-u-v;
   if(u<-.00001||v<-.00001||z<-.00001)continue;
   const sx=u*a.sx+v*b.sx+z*c.sx-area.x-.5,sy=u*a.sy+v*b.sy+z*c.sy-area.y-.5;
   const ix=Math.floor(sx),iy=Math.floor(sy),fx=sx-ix,fy=sy-iy;
   if(ix<0||iy<0||ix>=area.w-1||iy>=area.h-1)continue;
   const p=(iy*area.w+ix)*4,indices=[p,p+4,p+area.w*4,p+area.w*4+4];
   const pesos=[(1-fx)*(1-fy),fx*(1-fy),(1-fx)*fy,fx*fy];
   let alfa=0,vermelho=0,verde=0,azul=0;
   for(let k=0;k<4;k++){const i=indices[k],peso=pesos[k]*origem[i+3];alfa+=peso;vermelho+=origem[i]*peso;verde+=origem[i+1]*peso;azul+=origem[i+2]*peso}
   if(alfa<.5)continue;
   const d=(y*W+x)*4;
   // Em curvas fechadas, uma borda transparente nao deve recortar o tecido
   // ja desenhado pela secao vizinha. Mantem a amostra de maior cobertura.
   if(alfa<pixels[d+3])continue;
   pixels[d]=vermelho/alfa;pixels[d+1]=verde/alfa;pixels[d+2]=azul/alfa;pixels[d+3]=alfa;
  }
 }
 return transformar=>{
  pixels.fill(0);
  if(Array.isArray(transformar)){
   for(const [a,b,c] of transformar)triangulo(a,b,c);
  }else{
   const ponto=(x,y)=>({...transformar(x,y),sx:x,sy:y});
   for(let y=area.y;y<area.y+area.h;y+=4){
    const fim=Math.min(y+4,area.y+area.h),a=ponto(area.x,y),b=ponto(area.x+area.w,y),c=ponto(area.x+area.w,fim),d=ponto(area.x,fim);
    triangulo(a,b,c);triangulo(a,c,d);
   }
  }
  contexto.putImageData(quadro,0,0);return saida;
 };
};

// A largura e medida perpendicularmente ao eixo, antes e depois do movimento.
// O comprimento pode mudar; a largura de cada secao nunca depende da deformacao.
window.criarFaixaTexturizada=function(fonte,caminho,largura,area,{suavidade=1.8,atenuacaoBorda=1,bordasSuaves=[]}={}){
 const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',caminho);
 const comprimento=path.getTotalLength(),n=Math.ceil(comprimento/2);
 const pontos=Array.from({length:n+1},(_,i)=>{const p=path.getPointAtLength(comprimento*i/n);return{x:p.x,y:p.y}});
 function normais(lista){return lista.map((p,i)=>{
  const a=lista[Math.max(0,i-1)],b=lista[Math.min(lista.length-1,i+1)],dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy)||1;
  return{x:-dy/l,y:dx/l};
 })}
 const normaisOrigem=normais(pontos);
 const recorte=Object.assign(document.createElement('canvas'),{width:fonte.width,height:fonte.height}),r=recorte.getContext('2d');
 // A malha inclui toda a borda transparente, alem do calibre do tecido.
 const margem=suavidade*4;
 r.filter=`blur(${suavidade}px)`;r.lineWidth=largura;r.lineCap='round';r.lineJoin='round';r.stroke(new Path2D(caminho));
 r.filter='none';r.globalCompositeOperation='source-in';r.drawImage(fonte,0,0);
 // Atenua somente pixels de transicao; o centro opaco conserva sua textura.
 if(atenuacaoBorda!==1){
  const quadro=r.getImageData(area.x,area.y,area.w,area.h);
  for(let i=3;i<quadro.data.length;i+=4)quadro.data[i]=255*Math.pow(quadro.data[i]/255,atenuacaoBorda);
  r.putImageData(quadro,area.x,area.y);
 }
 // Ajustes locais acompanham a textura ao mover, sem atenuar toda a trompa.
 for(const {de,ate} of bordasSuaves){
  const borda=new Path2D();let iniciado=false;
  pontos.forEach((p,i)=>{
   const normal=normaisOrigem[i];
   if(p.y<de||p.y>ate||normal.x>=-.2){iniciado=false;return}
   const x=p.x+normal.x*(largura/2-2),y=p.y+normal.y*(largura/2-2);
   if(iniciado)borda.lineTo(x,y);else borda.moveTo(x,y);
   iniciado=true;
  });
  r.save();r.globalCompositeOperation='destination-out';r.globalAlpha=.65;
  r.filter='blur(3px)';r.lineWidth=10;r.lineCap='round';r.stroke(borda);r.restore();
 }
 const rasterizar=window.criarDeformador(recorte,area);
 function secoes(transformar,raio=largura*.5){
  const deslocados=pontos.map(p=>transformar(p.x,p.y));
  const novos=deslocados.map((p,i)=>{
   const y=pontos[i].y,fator=(transformar.suavizarCurva||0)*Math.max(0,Math.min(1,(y-550)/35,(690-y)/35));
   if(!fator)return p;
   let x=0,yy=0,total=0;
   for(let j=Math.max(0,i-24);j<=Math.min(n,i+24);j++){
    const peso=Math.exp(-.5*((j-i)/10)**2);x+=deslocados[j].x*peso;yy+=deslocados[j].y*peso;total+=peso;
   }
   return{x:p.x+(x/total-p.x)*fator,y:p.y+(yy/total-p.y)*fator};
  }),normaisDestino=normais(novos);
  return novos.map((p,i)=>[-1,1].map(sinal=>{
   const d=raio*sinal;
   return{x:p.x+normaisDestino[i].x*d,y:p.y+normaisDestino[i].y*d,sx:pontos[i].x+normaisOrigem[i].x*d,sy:pontos[i].y+normaisOrigem[i].y*d};
  }));
 }
 return{
  largura,
  secoes,
  desenhar(transformar){
   const raio=largura*.5+margem,s=secoes(transformar,raio),triangulos=[];
   for(let i=0;i<s.length-1;i++)triangulos.push([s[i][0],s[i][1],s[i+1][1]],[s[i][0],s[i+1][1],s[i+1][0]]);
   // Semicirculos preservam as pontas arredondadas e sua transparencia.
   for(const i of [0,pontos.length-1]){
    const p=pontos[i],q=transformar(p.x,p.y),no=normaisOrigem[i];
    const nd={x:(s[i][1].x-q.x)/raio,y:(s[i][1].y-q.y)/raio},sentido=i===0?-1:1;
    const centro={...q,sx:p.x,sy:p.y};
    const borda=angulo=>{
     const normal=Math.cos(angulo)*raio,tangente=Math.sin(angulo)*raio*sentido;
     return{x:q.x+nd.x*normal+nd.y*tangente,y:q.y+nd.y*normal-nd.x*tangente,sx:p.x+no.x*normal+no.y*tangente,sy:p.y+no.y*normal-no.x*tangente};
    };
    for(let k=0;k<24;k++)triangulos.push([centro,borda(k*Math.PI/24),borda((k+1)*Math.PI/24)]);
   }
   return rasterizar(triangulos);
  }
 };
};
