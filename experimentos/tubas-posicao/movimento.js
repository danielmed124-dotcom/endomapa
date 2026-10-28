// Deformação local da composição existente; não gera uma nova ilustração.
window.criarMovimentoTubas=function(tubas,fundo,camadas,recortes,fundoMovimento){
 const W=1086,H=1448,lados=['direita','esquerda'],nos=[0,.02,.18,.40,.64,.82,.94,1];
 const suave=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v)};
 const criar=()=>Object.assign(document.createElement('canvas'),{width:W,height:H});
 const fundoTela=criar(),fg=fundoTela.getContext('2d');fg.drawImage(fundoMovimento,0,0,W,H);
 const fundoPixels=fg.getImageData(0,0,W,H).data,orgaos=tubas.orgaos();
 const caminhos=Object.fromEntries(lados.map(l=>[l,Array.from({length:201},(_,i)=>({...tubas.ponto(l,i/2),t:i/200}))]));
 // Recortes da imagegen fornecem somente a seleção. A textura continua sendo
 // a da montagem original. Corrige a ampliação feita pela ferramenta.
 const registro={esquerda:{sx:158,sy:241,sw:578,sh:968,x:183,y:468,w:232,h:386},direita:{sx:279,sy:153,sw:725,sh:1082,x:683,y:473,w:251,h:404}};
 const recortesHidro={};
 for(const lado of lados){
  const tela=criar(),g=tela.getContext('2d'),r=registro[lado];
  g.drawImage(recortes[lado],r.sx,r.sy,r.sw,r.sh,r.x,r.y,r.w,r.h);
  // Descarta apenas ruído quase transparente exterior da geração.
  const dados=g.getImageData(0,0,W,H);for(let i=3;i<dados.data.length;i+=4)if(dados.data[i]<20)dados.data[i]=0;g.putImageData(dados,0,0);
  recortesHidro[lado]={original:tela,motor:window.criarHidrosalpingeAfilada(tela,criar(),lado,lado,lado==='direita'?{x:656,y:455,w:286,h:452}:{x:167,y:455,w:269,h:430})};
 }
 const regiao=l=>l==='direita'?{x:640,y:450,w:330,h:460}:{x:130,y:450,w:330,h:450};
 const ativo=pose=>pose.some(p=>p.x||p.y);
 function maisProximo(lado,p){
  let melhor=0,dist=Infinity;
  const ps=caminhos[lado];
  for(let i=1;i<ps.length;i++){
   const a=ps[i-1],b=ps[i],dx=b.x-a.x,dy=b.y-a.y;
   const u=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy)));
   const d=(p.x-a.x-u*dx)**2+(p.y-a.y-u*dy)**2;
   if(d<dist){dist=d;melhor=a.t+(b.t-a.t)*u}
  }
  return melhor;
 }
 function deslocamento(t,pose){
  const ts=[0,...nos.slice(2,6),.94,1],pontos=[{x:0,y:0},...pose,{x:0,y:0},{x:0,y:0}];
  let i=1;while(i<ts.length-1&&t>ts[i])i++;
  const h=ts[i]-ts[i-1],u=(t-ts[i-1])/h,a=pontos[i-1],b=pontos[i];
  const derivada=(j,k)=>j>=5||j===0?0:(pontos[j+1][k]-pontos[j-1][k])/(ts[j+1]-ts[j-1]);
  const ler=k=>(2*u**3-3*u*u+1)*a[k]+(u**3-2*u*u+u)*h*derivada(i-1,k)+(-2*u**3+3*u*u)*b[k]+(u**3-u*u)*h*derivada(i,k);
  return{x:ler('x'),y:ler('y')};
 }
 function deformar(lado,p,pose){
  if(!ativo(pose))return{x:p.x,y:p.y};
  return transformar(lado,p,maisProximo(lado,p),pose);
 }
 // Gira a seção transversal sem reduzir sua largura quando o eixo se inclina.
 function transformar(lado,p,t,pose){
  const centro=tubas.ponto(lado,t*100),a=tubas.ponto(lado,Math.max(0,t-.002)*100),b=tubas.ponto(lado,Math.min(1,t+.002)*100);
  const d=deslocamento(t,pose),da=deslocamento(Math.max(0,t-.002),pose),db=deslocamento(Math.min(1,t+.002),pose);
  const ang=Math.atan2(b.y+db.y-a.y-da.y,b.x+db.x-a.x-da.x)-Math.atan2(b.y-a.y,b.x-a.x);
  const co=Math.cos(ang),si=Math.sin(ang),x=p.x-centro.x,y=p.y-centro.y;
  return{x:centro.x+d.x+x*co-y*si,y:centro.y+d.y+x*si+y*co};
 }
 function ponto(lado,indice,pose){
  const p=tubas.ponto(lado,nos[indice+2]*100);return{x:p.x+pose[indice].x,y:p.y+pose[indice].y};
 }
 function definir(lado,pose,indice,x,y){
  if(![0,1,2,3].includes(indice)||!Number.isFinite(x)||!Number.isFinite(y))return;
  const tamanho=Math.hypot(x,y),f=tamanho>260?260/tamanho:1,anterior={...pose[indice]},alvo={x:x*f,y:y*f};
  // Permite girar para cima, mas rejeita o colapso local do eixo.
  for(let tentativa=0;tentativa<8;tentativa++){
   const peso=2**(-tentativa);pose[indice]={x:anterior.x+(alvo.x-anterior.x)*peso,y:anterior.y+(alvo.y-anterior.y)*peso};
   let valido=true;
   for(let i=1;i<caminhos[lado].length;i++){
    const a=caminhos[lado][i-1],b=caminhos[lado][i],da=deslocamento(a.t,pose),db=deslocamento(b.t,pose),dx=b.x-a.x,dy=b.y-a.y;
    if(Math.hypot(dx+db.x-da.x,dy+db.y-da.y)<.2*Math.hypot(dx,dy)){valido=false;break}
   }
   if(valido)return;
  }
  pose[indice]=anterior;
 }
 const mapas={};
 for(const lado of lados){
  const a=regiao(lado),lista=[],vertices=new Map();
  const vertice=(x,y)=>{const chave=y*W+x;if(!vertices.has(chave))vertices.set(chave,{x,y,t:maisProximo(lado,{x,y})});return vertices.get(chave)};
  for(let y=a.y;y<a.y+a.h;y+=4)for(let x=a.x;x<a.x+a.w;x+=4){
   const ps=[[x,y],[x+4,y],[x+4,y+4],[x,y+4]].map(([x,y])=>vertice(x,y));
   lista.push([ps[0],ps[1],ps[2]],[ps[0],ps[2],ps[3]]);
  }
  mapas[lado]=lista;
 }
 function protegido(x,y,protegerUtero=true){
  const i=(y*W+x)*4;
  let peso=orgaos[i+3]/255;
  // Perto da raiz, a máscara do ligamento incluía um pedaço da tuba antiga.
  // Libera esse pedaço para girar; o ponto de inserção continua fixo.
  for(const lado of lados){const p=caminhos[lado][0];peso*=suave((Math.hypot(x-p.x,y-p.y)-30)/20)}
  if(protegerUtero&&x>=435&&x<=652&&y>=450&&y<=820)peso=1;
  for(const lado of lados){
   const p=caminhos[lado][0],d=Math.hypot(x-p.x,y-p.y);peso=Math.max(peso,1-suave((d-2)/8));
   const fim=caminhos[lado].at(-1);peso=Math.max(peso,1-suave((Math.hypot(x-fim.x,y-fim.y)-14)/6));
  }
  return peso;
 }
 const protecao=new Float32Array(W*H),protecaoFrente=new Float32Array(W*H);
 // A proteção da fonte impede extrair o útero junto com a tuba.
 // No destino, a tuba pode passar à frente dele sem um corte retangular.
 for(let y=420;y<1000;y++)for(let x=120;x<990;x++){
  protecao[y*W+x]=protegido(x,y);
  protecaoFrente[y*W+x]=protegido(x,y,false);
 }
 function mascara(lado,e,tecido=false){
  const tela=criar(),g=tela.getContext('2d');
  g.lineCap='round';g.lineJoin='round';g.strokeStyle='#fff';g.fillStyle='#fff';g.filter=tecido?'blur(.6px)':'blur(9px)';
  // Limpeza inclui o fundo sombreado; o recorte móvel contém só o corpo da tuba.
  g.lineWidth=tecido?32:100;g.beginPath();let anteriorRecorte;
  caminhos[lado].forEach((p,i)=>{
   let x=p.x,y=p.y;
   if(tecido&&lado==='direita'){
    const a=caminhos[lado][Math.max(0,i-1)],b=caminhos[lado][Math.min(200,i+1)],dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy)||1;
    // Centraliza no tecido, usando apenas a normal como no recorte esquerdo.
    // O eixo de controle direito passa abaixo do centro da ilustração na raiz.
    const d=(12-6*suave((p.t-.1)/.25))*suave(p.t/.025)*suave((1-p.t)/.15);
    x+=dy/l*d;y-=dx/l*d;
   }
   if(tecido&&lado==='direita'){
    if(anteriorRecorte){g.lineWidth=32-6*suave(p.t/.025)*(1-suave((p.t-.20)/.15));g.beginPath();g.moveTo(anteriorRecorte.x,anteriorRecorte.y);g.lineTo(x,y);g.stroke()}
    anteriorRecorte={x,y};
   }else if(i)g.lineTo(x,y);else g.moveTo(x,y);
  });if(!(tecido&&lado==='direita'))g.stroke();
  if(tecido&&e.espessamento.ativo){
   const esp=e.espessamento,ps=[];
   for(let i=0;i<=150;i++)ps.push(tubas.ponto(lado,esp.inicio+(esp.fim-esp.inicio)*i/150));
   const comprimento=ps.slice(1).reduce((s,p,i)=>s+Math.hypot(p.x-ps[i].x,p.y-ps[i].y),0);
   for(let i=0;i<ps.length;i++){
    const u=i/150,p=ps[i],a=ps[Math.max(0,i-1)],b=ps[Math.min(150,i+1)],dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy)||1;
    let x=p.x,y=p.y;
    if(lado==='direita'){const d=6*suave(u/.15)*suave((1-u)/.15),sup=1-suave((p.y-485)/140);x+=dy/l*d+14*sup;y-=dx/l*d+4*sup}
    const tr=Math.min(48,comprimento*.35)||1,raio=14+8*suave(u*comprimento/tr)*suave((1-u)*comprimento/tr);
    g.beginPath();g.arc(x,y,raio,0,Math.PI*2);g.fill();
   }
  }
  if(e.inserida){
   if(tecido){
    // Mantém o eixo estreito da tuba nas transições, evitando interrupções
    // entre o segmento normal e uma dilatação parcial.
    g.save();g.filter='none';
    const r=recortesHidro[lado];g.drawImage(e.inicio===0&&e.fim===100?r.original:r.motor.desenhar(e.inicio,e.fim),0,0);g.restore();
   }else for(const p of camadas[lado].motor.secoes(e.inicio,e.fim)){g.beginPath();g.arc(p.xFinal,p.yFinal,p.raioFinal+5,0,Math.PI*2);g.fill()}
  }
  const a=regiao(lado),m=g.getImageData(a.x,a.y,a.w,a.h);
  for(let y=0;y<a.h;y++)for(let x=0;x<a.w;x++){
   const X=x+a.x,Y=y+a.y,j=Y*W+X;
   // O modelo dilatado já contém tecido da tuba à frente do ovário.
   // Cortá-lo pela elipse do ovário abre uma falha ao mover a dilatação.
   let p=protecao[j];
   if(e.inserida&&!(X>=435&&X<=652&&Y>=450&&Y<=820)){
    p=0;for(const l of lados){const q=caminhos[l][0],fim=caminhos[l].at(-1);p=Math.max(p,1-suave((Math.hypot(X-q.x,Y-q.y)-2)/8),1-suave((Math.hypot(X-fim.x,Y-fim.y)-14)/6))}
   }
   m.data[(y*a.w+x)*4+3]*=1-p;
  }
  return{a,m};
 }
 const recortesProntos={};
 function prepararRecorte(lado,e){
  const chave=JSON.stringify([e.inserida,e.inicio,e.fim,e.espessamento]);
  if(recortesProntos[lado]?.chave===chave)return recortesProntos[lado];
  const {a,m}=mascara(lado,e),recorte=mascara(lado,e,true).m,raiz=caminhos[lado][0],pixels=[];
  for(let y=0;y<a.h;y++)for(let x=0;x<a.w;x++){
   const k=(y*a.w+x)*4,alfa=m.data[k+3];if(!alfa)continue;
   const origem={x:x+a.x,y:y+a.y},perto=1-suave((Math.hypot(origem.x-raiz.x,origem.y-raiz.y)-25)/25);
   pixels.push({i:(origem.y*W+origem.x)*4,alfa,tecido:Math.min(alfa,recorte.data[k+3]),origem,perto,t:perto?maisProximo(lado,origem):0});
  }
  // A interpolação lê os vizinhos: inclui margem para não descartar bordas.
  const triangulos=mapas[lado].filter(triangulo=>{
   const x0=Math.max(a.x,Math.min(...triangulo.map(p=>p.x))-1),x1=Math.min(a.x+a.w-1,Math.max(...triangulo.map(p=>p.x))+1);
   const y0=Math.max(a.y,Math.min(...triangulo.map(p=>p.y))-1),y1=Math.min(a.y+a.h-1,Math.max(...triangulo.map(p=>p.y))+1);
   for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const k=((y-a.y)*a.w+x-a.x)*4+3;if(m.data[k]&&recorte.data[k])return true}
   return false;
  });
  return recortesProntos[lado]={chave,pixels,triangulos};
 }
 function aplicar(ctx,estados){
  if(!lados.some(l=>ativo(estados[l].posicao)))return;
  const original=ctx.getImageData(0,0,W,H),composicao=new Uint8ClampedArray(original.data);
  for(const lado of lados){
   const e=estados[lado];if(!ativo(e.posicao))continue;
   const {pixels,triangulos}=prepararRecorte(lado,e),fonte=new Uint8ClampedArray(W*H*4);
   // Extrai a tuba com seus achados, preservando ovários e inserções.
   for(const {i,alfa,tecido,origem,perto,t} of pixels){
    const destino=perto?transformar(lado,origem,t,e.posicao):origem;
    // Não troca pelo fundo limpo a raiz que permanece no mesmo lugar.
    const limpeza=alfa/255*(1-perto+perto*suave(Math.hypot(destino.x-origem.x,destino.y-origem.y)/4));
    for(let c=0;c<3;c++){fonte[i+c]=original.data[i+c];composicao[i+c]=composicao[i+c]*(1-limpeza)+fundoPixels[i+c]*limpeza}
    fonte[i+3]=tecido;
   }
   const camada=new Uint8ClampedArray(W*H*4);
   const verticesMovidos=new Map();
   const moverVertice=p=>{if(!verticesMovidos.has(p))verticesMovidos.set(p,{sx:p.x,sy:p.y,...transformar(lado,p,p.t,e.posicao)});return verticesMovidos.get(p)};
   for(const triangulo of triangulos){
    const [a,b,c]=triangulo.map(moverVertice);
    const den=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);if(Math.abs(den)<.001)continue;
    const x0=Math.max(0,Math.floor(Math.min(a.x,b.x,c.x))),x1=Math.min(W-1,Math.ceil(Math.max(a.x,b.x,c.x)));
    const y0=Math.max(0,Math.floor(Math.min(a.y,b.y,c.y))),y1=Math.min(H-1,Math.ceil(Math.max(a.y,b.y,c.y)));
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
     const u=((b.y-c.y)*(x+.5-c.x)+(c.x-b.x)*(y+.5-c.y))/den,v=((c.y-a.y)*(x+.5-c.x)+(a.x-c.x)*(y+.5-c.y))/den,z=1-u-v;
     if(u<-.00001||v<-.00001||z<-.00001)continue;
     const sx=u*a.sx+v*b.sx+z*c.sx-.5,sy=u*a.sy+v*b.sy+z*c.sy-.5,ix=Math.floor(sx),iy=Math.floor(sy),fx=sx-ix,fy=sy-iy;
     if(ix<0||iy<0||ix>=W-1||iy>=H-1)continue;
     const j=(iy*W+ix)*4,indices=[j,j+4,j+W*4,j+W*4+4],pesos=[(1-fx)*(1-fy),fx*(1-fy),(1-fx)*fy,fx*fy],dest=(y*W+x)*4;
     let alfa=0,r=0,g=0,az=0;
     for(let k=0;k<4;k++){const q=indices[k],peso=pesos[k]*fonte[q+3];alfa+=peso;r+=fonte[q]*peso;g+=fonte[q+1]*peso;az+=fonte[q+2]*peso}
     if(alfa<.5||alfa<camada[dest+3])continue;
     camada[dest]=r/alfa;camada[dest+1]=g/alfa;camada[dest+2]=az/alfa;camada[dest+3]=alfa;
    }
   }
   for(let i=0;i<camada.length;i+=4){
    const alfa=camada[i+3]/255;if(!alfa)continue;
    for(let c=0;c<3;c++)composicao[i+c]=composicao[i+c]*(1-alfa)+camada[i+c]*alfa;
   }
  }
  // Ovários, ligamentos e fixações continuam à frente; o útero fica na base.
  for(let j=0;j<protecaoFrente.length;j++)if(protecaoFrente[j])for(let c=0;c<3;c++)composicao[j*4+c]=composicao[j*4+c]*(1-protecaoFrente[j])+original.data[j*4+c]*protecaoFrente[j];
  original.data.set(composicao);ctx.putImageData(original,0,0);
 }
 return{aplicar,ponto,deformar,definir,ativo};
};
