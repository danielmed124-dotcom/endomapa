// Reamostra o recorte recebido com corpo estreito e pontas afiladas.
// O afilamento comprime a textura transversalmente, mantendo o corpo opaco.
window.criarEspessamentoTubas = function(imagem, tubas) {
 const fonte=Object.assign(document.createElement('canvas'),{width:imagem.width,height:imagem.height});
 const f=fonte.getContext('2d');f.drawImage(imagem,0,0);
 const textura=f.getImageData(0,0,fonte.width,fonte.height).data;
 const suave=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v)};
 // Centro da tuba na referência, incluindo tecido fechado antes/depois da janela.
 const eixo=[[430,1045],[449,1055],[480,1063],[520,1071],[560,1077],[590,1076]];
 function centro(y){
  for(let i=1;i<eixo.length;i++)if(y<=eixo[i][0]){
   const a=eixo[i-1],b=eixo[i],u=(y-a[0])/(b[0]-a[0]);return a[1]+(b[1]-a[1])*u;
  }
  return eixo.at(-1)[1];
 }
 function desenhar(ctx, estados) {
  for(const lado of ['direita','esquerda']) {
   const e=estados[lado].espessamento;
   if(!e.ativo||e.inicio===e.fim)continue;
   const pontos=[];
   for(let i=0;i<=300;i++)pontos.push(tubas.ponto(lado,e.inicio+(e.fim-e.inicio)*i/300));
   // Ajuste somente da tuba à direita da tela: acompanha a curva para fora.
   if(lado==='direita'){
    const eixoOriginal=pontos.map(p=>({...p}));
    for(let i=0;i<pontos.length;i++){
     const a=eixoOriginal[Math.max(0,i-1)],b=eixoOriginal[Math.min(pontos.length-1,i+1)];
     const dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy)||1,u=i/(pontos.length-1);
     const deslocamento=6*suave(u/.15)*suave((1-u)/.15);
     pontos[i].x+=dy/l*deslocamento;pontos[i].y-=dx/l*deslocamento;
     // O início do trajeto antigo fica medial ao centro da tuba desenhada.
     // Corrige pela posição anatômica, independentemente do intervalo I/T.
     pontos[i].ajusteSuperior=1-suave((eixoOriginal[i].y-485)/140);
    }
   }
   let comprimento=0;
   pontos[0].s=0;
   for(let i=1;i<pontos.length;i++){comprimento+=Math.hypot(pontos[i].x-pontos[i-1].x,pontos[i].y-pontos[i-1].y);pontos[i].s=comprimento}
   if(comprimento<.01)continue;
   // Mantém as coordenadas da textura abaixo da correção local.
   for(const p of pontos)if(p.ajusteSuperior){p.x+=14*p.ajusteSuperior;p.y-=4*p.ajusteSuperior}
   const raio=22;
   const x0=Math.max(0,Math.floor(Math.min(...pontos.map(p=>p.x))-raio-1));
   const y0=Math.max(0,Math.floor(Math.min(...pontos.map(p=>p.y))-raio-1));
   const x1=Math.min(ctx.canvas.width,Math.ceil(Math.max(...pontos.map(p=>p.x))+raio+1));
   const y1=Math.min(ctx.canvas.height,Math.ceil(Math.max(...pontos.map(p=>p.y))+raio+1));
   const w=x1-x0,h=y1-y0,distancias=new Float32Array(w*h).fill(Infinity);
   const laterais=new Float32Array(w*h),posicoes=new Float32Array(w*h);
   // Cada pixel pertence à seção mais próxima: curvas não acumulam tiras ou emendas.
   for(let i=1;i<pontos.length;i++){
    const a=pontos[i-1],b=pontos[i],dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy);
    if(l<.0001)continue;
    const xa=Math.max(x0,Math.floor(Math.min(a.x,b.x)-raio)),xb=Math.min(x1-1,Math.ceil(Math.max(a.x,b.x)+raio));
    const ya=Math.max(y0,Math.floor(Math.min(a.y,b.y)-raio)),yb=Math.min(y1-1,Math.ceil(Math.max(a.y,b.y)+raio));
    for(let y=ya;y<=yb;y++)for(let x=xa;x<=xb;x++){
     const vx=x+.5-a.x,vy=y+.5-a.y,t=Math.max(0,Math.min(1,(vx*dx+vy*dy)/(l*l)));
     const d=(vx-t*dx)**2+(vy-t*dy)**2,j=(y-y0)*w+x-x0;
     if(d>=distancias[j]||d>raio*raio)continue;
     distancias[j]=d;laterais[j]=(-dy*vx+dx*vy)/l;posicoes[j]=a.s+t*(b.s-a.s);
    }
   }
   const quadro=ctx.getImageData(x0,y0,w,h),pixels=quadro.data;
   const transicao=Math.min(48,comprimento*.35);
   const juncao=Math.min(20,comprimento*.2);
   for(let j=0;j<distancias.length;j++){
    if(!Number.isFinite(distancias[j]))continue;
    const s=posicoes[j],u=s/comprimento,d=laterais[j];
    const afilamento=suave(s/transicao)*suave((comprimento-s)/transicao);
    // 14 px nas junções, compatível com o calibre normal; 22 px no corpo.
    const raioLocal=14+(raio-14)*afilamento;
    // O formato afila; a cor encontra o tecido original nas junções, com alfa intacto.
    const cobertura=suave((raioLocal-Math.abs(d))/1.5)*suave(s/juncao)*suave((comprimento-s)/juncao);
    if(!cobertura)continue;
    // Comprime somente o comprimento das margens fechadas para cerca de 6%
    // em cada ponta. A abertura ocupa o miolo sem alcançar I/T.
    // Mantém os mesmos pixels fechados nas extremidades e a geometria externa.
    const sy=u<.06?430+22*u/.06:u>.94?568+22*(u-.94)/.06:452+116*(u-.06)/.88;
    const sx=centro(sy)-d/raioLocal*20;
    const ix=Math.floor(sx),iy=Math.floor(sy),fx=sx-ix,fy=sy-iy;
    const indices=[(iy*fonte.width+ix)*4,(iy*fonte.width+ix+1)*4,((iy+1)*fonte.width+ix)*4,((iy+1)*fonte.width+ix+1)*4];
    const pesos=[(1-fx)*(1-fy),fx*(1-fy),(1-fx)*fy,fx*fy];
    for(let c=0;c<3;c++){
     let cor=0;for(let k=0;k<4;k++)cor+=textura[indices[k]+c]*pesos[k];
     pixels[j*4+c]=pixels[j*4+c]*(1-cobertura)+cor*cobertura;
    }
   }
   ctx.putImageData(quadro,x0,y0);
  }
 }
 return {desenhar};
};
