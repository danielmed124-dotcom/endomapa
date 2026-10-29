// Reduz a largura transversal da própria textura. A opacidade do tecido não muda.
window.criarHidrosalpingeAfilada=function(imagem,normal,lado,modelo,area,opcoes={}){
 const W=1086,H=1448;
 const criar=()=>Object.assign(document.createElement('canvas'),{width:W,height:H});
 const suave=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v)};
 const caminhos={
  direita:'M 684 487 C 718 500 721 538 775 562 C 820 578 846 610 855 655 C 875 695 894 735 868 787 C 850 828 814 854 782 841 C 757 834 743 813 737 796',
  esquerda:'M 404 484 C 373 494 365 528 323 553 C 277 566 251 598 237 645 C 213 686 215 730 236 769 C 247 799 269 819 295 813'
 };
 const normais={
  direita:'M 684 487 C 720 501 726 538 774 567 C 817 590 839 622 841 663 C 840 704 852 731 853 764 C 856 806 837 835 808 846 C 782 856 755 833 740 809 C 733 797 729 784 726 771',
  esquerda:'M 404 484 C 378 493 373 525 331 551 C 297 572 257 586 252 622 C 248 663 250 683 237 719 C 222 761 236 803 265 820 C 291 837 326 823 346 802 C 355 790 358 777 361 764'
 };
 if(modelo==='bilateral'){
  caminhos.direita='M 684 487 C 718 500 728 538 775 562 C 824 580 858 608 860 650 C 862 691 880 731 865 772 C 854 808 831 830 804 825';
  caminhos.esquerda='M 404 484 C 373 494 365 528 323 553 C 282 567 251 596 241 639 C 244 670 250 687 237 721 C 223 759 240 793 275 812 C 285 820 295 820 302 816';
 }
 if(opcoes.caminhos)Object.assign(caminhos,opcoes.caminhos);
 if(opcoes.normais)Object.assign(normais,opcoes.normais);
 // O recorte inclui toda a largura original e seu contorno. A redução
 // acontece na geometria das pontas, nunca por transparência longitudinal.
 const perfis=modelo==='bilateral'
  ?{direita:[24,30,43,46,49,50,54,57,57],esquerda:[24,29,42,44,44,48,50,54,52]}
  :{direita:[24,28,40,46,51,54,52,40,25],esquerda:[24,28,34,39,44,48,52,55,50]};
 const path=d=>{const p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d',d);return p};
 const dilatado=path(caminhos[lado]),saudavel=path(normais[lado]),L=dilatado.getTotalLength(),LN=saudavel.getTotalLength();
 const amostrar=(p,l,t)=>{const q=p.getPointAtLength(t*l),a=p.getPointAtLength(Math.max(0,t*l-1)),b=p.getPointAtLength(Math.min(l,t*l+1)),dx=b.x-a.x,dy=b.y-a.y,dist=Math.hypot(dx,dy)||1;return{x:q.x,y:q.y,nx:-dy/dist,ny:dx/dist}};
 const raio=t=>{const lista=perfis[lado],r=t*(lista.length-1),i=Math.floor(r);return lista[i]+(lista[Math.min(i+1,lista.length-1)]-lista[i])*(r-i)};
 const N=Math.ceil(L/2),origem=Array.from({length:N+1},(_,i)=>{const t=i/N,p=amostrar(dilatado,L,t);return{...p,t,r:raio(t)}});
 // Corresponde cada seção ao ponto mais próximo da trompa normal, evitando
 // deslocamento longitudinal causado por comprimentos diferentes das imagens.
 const normaisAmostrados=Array.from({length:401},(_,i)=>amostrar(saudavel,LN,i/400));
 for(const p of origem){
  let menor=Infinity,q;
  for(const n of normaisAmostrados){const d=(n.x-p.x)**2+(n.y-p.y)**2;if(d<menor){menor=d;q=n}}
  p.normal=q;
 }
 function forma(pontos,margem=0){
  const caminho=new Path2D();
  pontos.forEach((p,i)=>{const x=p.x+p.nx*(p.r+margem),y=p.y+p.ny*(p.r+margem);if(i)caminho.lineTo(x,y);else caminho.moveTo(x,y)});
  for(let i=pontos.length-1;i>=0;i--){const p=pontos[i];caminho.lineTo(p.x-p.nx*(p.r+margem),p.y-p.ny*(p.r+margem))}
  caminho.closePath();return caminho;
 }
 const fonte=criar(),f=fonte.getContext('2d');f.filter='blur(1.8px)';f.fill(forma(origem));
 for(const i of [0,origem.length-1]){const p=origem[i];f.beginPath();f.arc(p.x,p.y,p.r,0,Math.PI*2);f.fill()}
 f.filter='none';f.globalCompositeOperation='source-in';f.drawImage(imagem,0,0);
 // Só o mapa unilateral esquerdo carrega uma faixa de sombra externa mais
 // espessa no recorte. Atenua essa borda antes de deformar, sem mexer no miolo.
 if(modelo==='esquerda'&&lado==='esquerda'){
  const borda=new Path2D();let iniciou=false;
  for(const p of origem){
   if(p.y<550||p.y>805||p.nx>=-.2){iniciou=false;continue}
   const x=p.x+p.nx*(p.r-1.5),y=p.y+p.ny*(p.r-1.5);
   if(iniciou)borda.lineTo(x,y);else borda.moveTo(x,y);iniciou=true;
  }
  f.save();f.globalCompositeOperation='destination-out';f.globalAlpha=.85;
  f.filter='blur(2.5px)';f.lineWidth=8;f.lineCap='round';f.lineJoin='round';f.stroke(borda);f.restore();
 }
 // As duas texturas compartilham a mesma silhueta deformada. Misturamos apenas
 // a cor do tecido na junção; o alfa vem sempre do recorte opaco da trompa.
 const fonteNormal=criar();fonteNormal.getContext('2d').drawImage(normal,0,0);
 const original=f.getImageData(area.x,area.y,area.w,area.h).data;
 const saudavelPixels=fonteNormal.getContext('2d').getImageData(area.x,area.y,area.w,area.h).data;
 // Clareia apenas a sombra externa dos modelos individuais. Não altera
 // o recorte, o alfa, as larguras ou a geometria já aprovada das pontas.
 if(modelo!=='bilateral')for(let y=0;y<area.h;y++)for(let x=0;x<area.w;x++){
  const X=x+area.x,Y=y+area.y,i=(y*area.w+x)*4;
  if(Y<550||Y>805||!original[i+3])continue;
  let p,menor=Infinity;
  for(const q of origem){const d=(X-q.x)**2+(Y-q.y)**2;if(d<menor){menor=d;p=q}}
  const sentido=lado==='esquerda'?1:-1;
  if(p.nx>=-.2)continue;
  const lateral=((X-p.x)*p.nx+(Y-p.y)*p.ny)*sentido;
  const faixa=suave((lateral/p.r-.65)/.25);
  const sombra=suave((saudavelPixels[i]+saudavelPixels[i+1]+saudavelPixels[i+2]-original[i]-original[i+1]-original[i+2]-15)/75);
  for(let c=0;c<3;c++)original[i+c]+=Math.max(0,saudavelPixels[i+c]-original[i+c])*.65*faixa*sombra;
 }
 const tela=criar(),g=tela.getContext('2d'),quadro=g.createImageData(W,H),pixels=quadro.data;
 function ler(dados,x,y,cor){
  x-=area.x+.5;y-=area.y+.5;const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
  if(ix<0||iy<0||ix>=area.w-1||iy>=area.h-1){cor.fill(0);return}
  const i=(iy*area.w+ix)*4,indices=[i,i+4,i+area.w*4,i+area.w*4+4],pesos=[(1-fx)*(1-fy),fx*(1-fy),(1-fx)*fy,fx*fy];
  cor.fill(0);for(let k=0;k<4;k++){const j=indices[k],a=dados[j+3]*pesos[k];cor[3]+=a;for(let c=0;c<3;c++)cor[c]+=dados[j+c]*a}
  if(cor[3])for(let c=0;c<3;c++)cor[c]/=cor[3];
 }
 function rasterizar(triangulos){
  pixels.fill(0);const cor=new Float64Array(4),corNormal=new Float64Array(4);
  for(const [a,b,c] of triangulos){
   const den=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);if(Math.abs(den)<.0001)continue;
   const x0=Math.max(area.x,Math.floor(Math.min(a.x,b.x,c.x))),x1=Math.min(area.x+area.w-1,Math.ceil(Math.max(a.x,b.x,c.x)));
   const y0=Math.max(area.y,Math.floor(Math.min(a.y,b.y,c.y))),y1=Math.min(area.y+area.h-1,Math.ceil(Math.max(a.y,b.y,c.y)));
   for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
    const u=((b.y-c.y)*(x+.5-c.x)+(c.x-b.x)*(y+.5-c.y))/den,v=((c.y-a.y)*(x+.5-c.x)+(a.x-c.x)*(y+.5-c.y))/den,z=1-u-v;
    if(u<-.00001||v<-.00001||z<-.00001)continue;
    ler(original,u*a.sx+v*b.sx+z*c.sx,u*a.sy+v*b.sy+z*c.sy,cor);
    const i=(y*W+x)*4;if(cor[3]<.5||cor[3]<pixels[i+3])continue;
    const k=suave(u*a.k+v*b.k+z*c.k);
    if(k<.999)ler(saudavelPixels,u*a.hx+v*b.hx+z*c.hx,u*a.hy+v*b.hy+z*c.hy,corNormal);
    for(let canal=0;canal<3;canal++)pixels[i+canal]=k>=.999?cor[canal]:cor[canal]*k+corNormal[canal]*(1-k);
    pixels[i+3]=cor[3];
   }
  }
  g.putImageData(quadro,0,0);return tela;
 }
 function perfil(t,inicio,fim){
  if(inicio===fim||t<inicio/100||t>fim/100)return 0;
  const faixa=Math.min(.13,(fim-inicio)/100*.46);
  // Um intervalo curto não comporta dois ombros largos: limita a expansão,
  // e também o deslocamento do eixo, para evitar uma dobra sobre si mesmo.
  const amplitude=suave((fim-inicio)/24);
  const entrada=inicio===0?1:suave((t-inicio/100)/faixa),saida=fim===100?1:suave((fim/100-t)/faixa);
  // No bilateral a ponta original é volumosa. O primeiro passo do controle
  // inicia a compressão, em vez de trocar imediatamente o bulbo por 14 px.
  if(modelo==='bilateral')return amplitude*(1-suave(inicio/10)*(1-entrada))*(1-suave((100-fim)/10)*(1-saida));
  return amplitude*entrada*saida;
 }
 function secao(t,inicio,fim){
  const pos=t*N,i=Math.min(N-1,Math.floor(pos)),u=pos-i,a=origem[i],b=origem[i+1];
  const p=amostrar(dilatado,L,t),r=raio(t),k=perfil(t,inicio,fim);
  const normal={x:a.normal.x+(b.normal.x-a.normal.x)*u,y:a.normal.y+(b.normal.y-a.normal.y)*u,nx:a.normal.nx+(b.normal.nx-a.normal.nx)*u,ny:a.normal.ny+(b.normal.ny-a.normal.ny)*u};
  return{...p,t,r,k,normal,xFinal:normal.x+(p.x-normal.x)*k,yFinal:normal.y+(p.y-normal.y)*k,raioFinal:14+(r-14)*k};
 }
 function secoes(inicio,fim){
  if(inicio===fim)return[];
  const n=Math.max(20,Math.ceil(L*(fim-inicio)/100/2));
  const lista=Array.from({length:n+1},(_,i)=>secao((inicio+(fim-inicio)*i/n)/100,inicio,fim));
  // Normal do eixo final: conserva a seção transversal mesmo nas transições.
  return lista.map((p,i)=>{const a=lista[Math.max(0,i-1)],b=lista[Math.min(n,i+1)],dx=b.xFinal-a.xFinal,dy=b.yFinal-a.yFinal,l=Math.hypot(dx,dy)||1;return{...p,nfx:-dy/l,nfy:dx/l,opacidade:1}});
 }
 function desenhar(inicio,fim){
  const s=secoes(inicio,fim),triangulos=[],margem=4.4;
  const bordas=p=>[-1,1].map(sinal=>({x:p.xFinal+p.nfx*(p.raioFinal+margem*p.raioFinal/p.r)*sinal,y:p.yFinal+p.nfy*(p.raioFinal+margem*p.raioFinal/p.r)*sinal,sx:p.x+p.nx*(p.r+margem)*sinal,sy:p.y+p.ny*(p.r+margem)*sinal,hx:p.normal.x+p.normal.nx*14*(1+margem/p.r)*sinal,hy:p.normal.y+p.normal.ny*14*(1+margem/p.r)*sinal,k:p.k}));
  for(let i=0;i<s.length-1;i++){const a=bordas(s[i]),b=bordas(s[i+1]);triangulos.push([a[0],a[1],b[1]],[a[0],b[1],b[0]])}
  // A tampa bilateral acompanha a compressão inicial para não desaparecer
  // inteira ao passar de 100% para 99% (ou de 0% para 1%).
  for(const [indice,manter,sentido] of [[0,inicio===0||(modelo==='bilateral'&&inicio<10),-1],[s.length-1,fim===100||(modelo==='bilateral'&&fim>90),1]]){
   if(!manter||!s.length)continue;const p=s[indice];
   const centro={x:p.xFinal,y:p.yFinal,sx:p.x,sy:p.y,hx:p.normal.x,hy:p.normal.y,k:p.k};
   const borda=ang=>{const n=Math.cos(ang),v=Math.sin(ang)*sentido;return{x:p.xFinal+(p.nfx*n+p.nfy*v)*(p.raioFinal+margem),y:p.yFinal+(p.nfy*n-p.nfx*v)*(p.raioFinal+margem),sx:p.x+(p.nx*n+p.ny*v)*(p.r+margem),sy:p.y+(p.ny*n-p.nx*v)*(p.r+margem),hx:p.normal.x,hy:p.normal.y,k:p.k}};
   for(let j=0;j<24;j++)triangulos.push([centro,borda(j*Math.PI/24),borda((j+1)*Math.PI/24)]);
  }
  return rasterizar(triangulos);
 }
 return{desenhar,secoes,perfil,pontos:origem};
};
