(() => {
const fonteIstmocele=new Image();let campoIstmocele=null,renderAnterior='',canvasAtual;
const cache=new Map();
const pronto=new Promise((resolve,reject)=>{fonteIstmocele.onload=()=>{campoIstmocele=prepararContorno();resolve();window.dispatchEvent(new Event('endocarta:istmocele-pronta'));};fonteIstmocele.onerror=reject;});
fonteIstmocele.src='assets/lesoes/istmocele-v9.png';
function prepararContorno(){
 const c=document.createElement('canvas');c.width=700;c.height=Math.round(700*fonteIstmocele.naturalHeight/fonteIstmocele.naturalWidth);
 const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(fonteIstmocele,0,0,c.width,c.height);
 const w=c.width,h=c.height,rgba=ctx.getImageData(0,0,w,h).data,n=w*h,d=new Float32Array(n),mask=new Uint8Array(n);
 for(let i=0;i<n;i++){mask[i]=rgba[i*4+3]>100?1:0;d[i]=1e5;}
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;if(mask[i]!==mask[i-1]||mask[i]!==mask[i+1]||mask[i]!==mask[i-w]||mask[i]!==mask[i+w])d[i]=0;}
 for(let y=1;y<h;y++)for(let x=1;x<w-1;x++){const i=y*w+x;d[i]=Math.min(d[i],d[i-1]+1,d[i-w]+1,d[i-w-1]+Math.SQRT2,d[i-w+1]+Math.SQRT2);}
 for(let y=h-2;y>=0;y--)for(let x=w-2;x>0;x--){const i=y*w+x;d[i]=Math.min(d[i],d[i+1]+1,d[i+w]+1,d[i+w+1]+Math.SQRT2,d[i+w-1]+Math.SQRT2);}
 for(let i=0;i<n;i++)if(!mask[i])d[i]=-d[i];
 // Suaviza apenas o campo de deslocamento; não desfoca a imagem da lesão.
 const tmp=new Float32Array(n);
 for(let passo=0;passo<5;passo++){
  tmp.set(d);for(let y=2;y<h-2;y++)for(let x=2;x<w-2;x++){const i=y*w+x;tmp[i]=(d[i-2]+4*d[i-1]+6*d[i]+4*d[i+1]+d[i+2])/16;}
  d.set(tmp);for(let y=2;y<h-2;y++)for(let x=2;x<w-2;x++){const i=y*w+x;d[i]=(tmp[i-2*w]+4*tmp[i-w]+6*tmp[i]+4*tmp[i+w]+tmp[i+2*w])/16;}
 }
 const nx=new Float32Array(n),ny=new Float32Array(n);
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x,gx=(d[i+1]-d[i-1])/2,gy=(d[i+w]-d[i-w])/2,len=Math.hypot(gx,gy);if(len){nx[i]=gx/len;ny[i]=gy/len;}}
 return {w,h,rgba,d,nx,ny};
}
function desenharLesao(profundidade,largura){
 if(!campoIstmocele)return;const chave=profundidade+':'+largura;if(renderAnterior===chave)return;renderAnterior=chave;
 const canvas=canvasAtual,{w,h,rgba,d,nx,ny}=campoIstmocele;
 const limite=Math.min(1,1400/Math.max(w*profundidade,h*largura));
 canvas.width=Math.max(1,Math.round(w*profundidade*limite));canvas.height=Math.max(1,Math.round(h*largura*limite));
 const ctx=canvas.getContext('2d');
 if(profundidade===largura){ctx.drawImage(fonteIstmocele,0,0,canvas.width,canvas.height);return;}
 const out=ctx.createImageData(canvas.width,canvas.height),a=canvas.width/w,b=canvas.height/h,espessura=Math.min(1,profundidade,largura)*limite;
 const bilinear=(v,x,y)=>{const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,i=iy*w+ix;return v[i]*(1-fx)*(1-fy)+v[i+1]*fx*(1-fy)+v[i+w]*(1-fx)*fy+v[i+w+1]*fx*fy;};
 for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
  let sx=(x+.5)/a-.5,sy=(y+.5)/b-.5;if(sx<1||sy<1||sx>=w-2||sy>=h-2)continue;
  const distancia=bilinear(d,sx,sy);let gx=bilinear(nx,sx,sy),gy=bilinear(ny,sx,sy);const norma=Math.hypot(gx,gy);
  if(norma&&Math.abs(distancia)<45){
   gx/=norma;gy/=norma;const q=Math.hypot(gx/a,gy/b),alvo=distancia/(q*espessura);
   const t=Math.max(0,Math.min(1,(Math.abs(alvo)-14)/30)),peso=1-t*t*(3-2*t),ajuste=(alvo-distancia)*peso;
   sx+=gx*ajuste;sy+=gy*ajuste;
  }
  if(sx<0||sy<0||sx>=w-1||sy>=h-1)continue;
  const ix=Math.floor(sx),iy=Math.floor(sy),fx=sx-ix,fy=sy-iy,i=iy*w+ix;
  const indices=[i,i+1,i+w,i+w+1],pesos=[(1-fx)*(1-fy),fx*(1-fy),(1-fx)*fy,fx*fy];
  let alpha=0,r=0,g=0,bl=0;for(let k=0;k<4;k++){const j=indices[k]*4,pa=pesos[k]*rgba[j+3];alpha+=pa;r+=rgba[j]*pa;g+=rgba[j+1]*pa;bl+=rgba[j+2]*pa;}
  const dest=(y*canvas.width+x)*4;if(alpha){out.data[dest]=r/alpha;out.data[dest+1]=g/alpha;out.data[dest+2]=bl/alpha;out.data[dest+3]=alpha;}
 }
 ctx.putImageData(out,0,0);
}


function imagem(dados){
 if(!campoIstmocele)return null;
 const p=Number(dados.eixoX)/100,l=Number(dados.eixoY)/100,chave=p+':'+l;
 if(cache.has(chave))return cache.get(chave);
 canvasAtual=document.createElement('canvas');renderAnterior='';desenharLesao(p,l);
 if(cache.size>=12)cache.delete(cache.keys().next().value);
 cache.set(chave,canvasAtual);return canvasAtual;
}
function atualizar(lesao){
 const img=imagem(lesao.dataset);if(!img)return;
 let c=lesao.querySelector('canvas');if(!c){c=document.createElement('canvas');lesao.append(c);}
 if(c.dataset.chave!==lesao.dataset.eixoX+':'+lesao.dataset.eixoY){c.width=img.width;c.height=img.height;c.getContext('2d').drawImage(img,0,0);c.dataset.chave=lesao.dataset.eixoX+':'+lesao.dataset.eixoY;}
 const area=lesao.closest('[data-camada-editor]')?.getBoundingClientRect();
 if(!area?.width)return;
 const w=area.width*.085*Number(lesao.dataset.tamanho)/100*Number(lesao.dataset.eixoX)/100;
 const h=area.height*.03765625*Number(lesao.dataset.tamanho)/100*Number(lesao.dataset.eixoY)/100;
 lesao.style.width=w+'px';lesao.style.height=h+'px';
 lesao.style.transform='translate(-74%,-50%) rotate('+lesao.dataset.giro+'deg)';
 lesao.style.transformOrigin='74% 50%';
}
window.endocartaIstmocele={pronto,imagem,atualizar};
})();