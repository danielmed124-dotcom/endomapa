'use strict'; window.endocartaMotoresIntestinais = {};

function motorCoronal(discoide = false) {
const canvas=document.createElement('canvas');canvas.width=1086;canvas.height=1448;const ctx=canvas.getContext('2d',{willReadFrequently:true});
  const W=1086,H=1448, state={inserted:false,position:50,size:100,compare:false};
  const base=new Image(),piece=new Image(),metal=new Image(); let original,stamp,metalStamp,frame=0,drag=null,ready=false;
  // Quantidade ilustrativa; o metal mantém dimensões fixas na base.
  function staples(){const max=discoide?6:13;const count=Math.max(2,Math.min(max,Math.round(2+(max-2)*(state.size-50)/350)));return {count,width:discoide?24:12,height:discoide?18.2:4.92,pitch:discoide?21:10};}
  // Centro da alça conforme marcação de Daniel, preservada em referencia-trajeto-daniel.png.
  // Coordenadas gráficas da base, não medidas anatômicas.
  const points=[[290,1110],[410,990],[550,895],[652,888]];
  function geometry(value=state.position) {
    // Peças maiores precisam de margem nas duas pontas para não sair do intestino.
    const margin=.07+.08*(state.size/100);
    const t=margin+(1-2*margin)*value/100,a=1-t;
    const p={x:a*a*a*points[0][0]+3*a*a*t*points[1][0]+3*a*t*t*points[2][0]+t*t*t*points[3][0],y:a*a*a*points[0][1]+3*a*a*t*points[1][1]+3*a*t*t*points[2][1]+t*t*t*points[3][1]};
    let tx=3*a*a*(points[1][0]-points[0][0])+6*a*t*(points[2][0]-points[1][0])+3*t*t*(points[3][0]-points[2][0]);
    let ty=3*a*a*(points[1][1]-points[0][1])+6*a*t*(points[2][1]-points[1][1])+3*t*t*(points[3][1]-points[2][1]);
    const length=Math.hypot(tx,ty);tx/=length;ty/=length;return {...p,tx,ty,nx:-ty,ny:tx,k:state.size/100};
  }
  const bump=v=>Math.abs(v)>=1?0:(1-v*v)**3;
  function discoideHalf(){const a=staples();return (a.count-1)*a.pitch/2+a.width/2;}
  function discoideCurve(u){const t=Math.max(-1,Math.min(1,u/discoideHalf()));return -8-13*(1-t*t);}
  function displacement(u,v,k){
    if(discoide)return 17*bump(u/(discoideHalf()+15))*bump((v-discoideCurve(u))/45);
    return Math.min(12*k,28)*bump(u/Math.min(52*k,90))*bump(v/Math.min(75*k,100));
  }
  function stapleLayout(g=geometry()){
    const s=staples(),curve=[];
    if(discoide){
      return Array.from({length:s.count},(_,i)=>{
        const u=(i-(s.count-1)/2)*s.pitch;
        return {u,v:discoideCurve(u),angle:Math.atan(26*u/discoideHalf()**2)};
      });
    }
    // Curva central indicada por Daniel na captura, em coordenadas da base.
    for(let i=0;i<=800;i++){
      const t=i/800,a=1-t;
      let x=a*a*a*points[0][0]+3*a*a*t*points[1][0]+3*a*t*t*points[2][0]+t*t*t*points[3][0];
      let y=a*a*a*points[0][1]+3*a*a*t*points[1][1]+3*a*t*t*points[2][1]+t*t*t*points[3][1];
      // Ajuste da linha preta: atravessar o centro da retração sem mover o tecido.
      const localU=(x-g.x)*g.tx+(y-g.y)*g.ty;
      const shift=1.75*g.k-.045*localU;
      x+=g.nx*shift;y+=g.ny*shift;
      const prev=curve.at(-1);curve.push({x,y,d:prev?prev.d+Math.hypot(x-prev.x,y-prev.y):0});
    }
    const nearest=curve.reduce((best,p)=>Math.hypot(p.x-g.x,p.y-g.y)<Math.hypot(best.x-g.x,best.y-g.y)?p:best);
    const half=(s.count-1)*s.pitch/2,center=Math.max(half+6,Math.min(curve.at(-1).d-half-6,nearest.d)),result=[];
    for(let i=0;i<s.count;i++){
      const distance=center+(i-(s.count-1)/2)*s.pitch;
      let j=1;while(j<curve.length-1&&curve[j].d<distance)j++;
      const a=curve[j-1],b=curve[j],f=(distance-a.d)/(b.d-a.d);
      const angleWorld=Math.atan2(b.y-a.y,b.x-a.x),offset=i%2?2.8:-2.8;
      const curveOffset=0;
      const x=a.x+(b.x-a.x)*f-Math.sin(angleWorld)*(offset+curveOffset),y=a.y+(b.y-a.y)*f+Math.cos(angleWorld)*(offset+curveOffset);
      const dx=x-g.x,dy=y-g.y;
      result.push({u:dx*g.tx+dy*g.ty,v:dx*g.nx+dy*g.ny,angle:angleWorld-Math.atan2(g.ty,g.tx),distance});
    }
    return result;
  }
  function sample(x,y,out,i){
    x=Math.max(0,Math.min(W-1.001,x));y=Math.max(0,Math.min(H-1.001,y));
    const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,j=(iy*W+ix)*4,src=original.data;
    for(let c=0;c<4;c++)out[i+c]=(src[j+c]*(1-fx)+src[j+4+c]*fx)*(1-fy)+(src[j+W*4+c]*(1-fx)+src[j+(W+1)*4+c]*fx)*fy;
  }
  function draw(){
    frame=0;if(!ready)return;ctx.putImageData(original,0,0);
    const g=geometry(),visible=state.inserted&&!state.compare;
    if(visible){
      const radius=discoide?Math.ceil(discoideHalf()+65):Math.ceil(108*g.k),x0=Math.max(0,Math.floor(g.x-radius)),y0=Math.max(0,Math.floor(g.y-radius)),w=Math.min(W-x0,2*radius),h=Math.min(H-y0,2*radius);
      const roi=ctx.getImageData(x0,y0,w,h);
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){
        const dx=x+x0-g.x,dy=y+y0-g.y,u=dx*g.tx+dy*g.ty,v=dx*g.nx+dy*g.ny;
        if(!discoide&&(Math.abs(u)>=52*g.k||Math.abs(v)>=90*g.k))continue;
        if(discoide&&(Math.abs(u)>=discoideHalf()+15||Math.abs(v-discoideCurve(u))>=45))continue;
        let sv=v;for(let n=0;n<8;n++)sv=v-displacement(u,sv,g.k);
        if(Math.abs(sv-v)<.001)continue;
        sample(g.x+u*g.tx+sv*g.nx,g.y+u*g.ty+sv*g.ny,roi.data,(y*w+x)*4);
      }
      ctx.putImageData(roi,x0,y0);
      // Compositing only: source PNG is unchanged. A compact surface area avoids its pale outer rim.
      ctx.save();ctx.translate(g.x,g.y);ctx.transform(g.tx,g.ty,g.nx,g.ny,0,0);
      if(discoide){
        const half=discoideHalf()+12, strips=Math.ceil(half*2), step=half*2/strips, height=48;
        for(let i=0;i<strips;i++){
          const u=-half+(i+.5)*step;
          ctx.drawImage(stamp,i*stamp.width/strips,0,stamp.width/strips,stamp.height,u-step/2,discoideCurve(u)-height*.42+6,step+.2,height);
        }
      }else ctx.drawImage(stamp,-43*g.k,-10*g.k,86*g.k,48*g.k);
      const s=staples();
      for(const p of stapleLayout(g)){
        ctx.save();ctx.translate(p.u,p.v);ctx.rotate(p.angle);
        ctx.drawImage(metalStamp,-s.width/2,-s.height/2,s.width,s.height);ctx.restore();
      }
      ctx.restore();
    }

  }
  return Promise.all([new Promise((ok,no)=>{base.onload=ok;base.onerror=no;base.src='assets/anastomoses/linear/base-coronal.png';}),new Promise((ok,no)=>{piece.onload=ok;piece.onerror=no;piece.src='assets/anastomoses/linear/linear-tecido-v3-sem-metal.png';}),new Promise((ok,no)=>{metal.onload=ok;metal.onerror=no;metal.src='assets/anastomoses/linear/linear-grampos-isolados-v1.png';})]).then(()=>{
    ctx.drawImage(base,0,0,W,H);original=ctx.getImageData(0,0,W,H);
    metalStamp=document.createElement('canvas');metalStamp.width=195;metalStamp.height=80;
    metalStamp.getContext('2d').drawImage(metal,metal.width*480/2160,metal.height*265/720,metal.width*195/2160,metal.height*80/720,0,0,195,80);
    stamp=document.createElement('canvas');stamp.width=430;stamp.height=240;const sc=stamp.getContext('2d');
    sc.drawImage(piece,piece.width*.355,piece.height*.325,piece.width*.29,piece.height*.30,0,0,430,240);
    const mask=document.createElement('canvas');mask.width=430;mask.height=240;const mc=mask.getContext('2d');
    mc.translate(215,100);mc.scale(215,140);
    const grad=mc.createRadialGradient(0,0,0,0,0,1);grad.addColorStop(0,'white');grad.addColorStop(.35,'white');grad.addColorStop(.7,'rgba(255,255,255,.5)');grad.addColorStop(1,'transparent');mc.fillStyle=grad;mc.fillRect(-1,-1,2,2);
    sc.globalCompositeOperation='destination-in';sc.drawImage(mask,0,0);ready=true;
    
  return {
      render(source, values) {
        Object.assign(state,values,{inserted:true,compare:false});
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.drawImage(source,0,0,canvas.width,canvas.height);
        original=ctx.getImageData(0,0,canvas.width,canvas.height);
        draw();
        const changed=ctx.getImageData(0,0,canvas.width,canvas.height);
        for(let i=0;i<changed.data.length;i+=4)if(changed.data[i]===original.data[i]&&changed.data[i+1]===original.data[i+1]&&changed.data[i+2]===original.data[i+2]&&changed.data[i+3]===original.data[i+3])changed.data[i+3]=0;
        const patch=document.createElement('canvas');patch.width=canvas.width;patch.height=canvas.height;patch.getContext('2d').putImageData(changed,0,0);return patch;
      },
      anchor(values,position=values.position) { Object.assign(state,values); const g=geometry(position);
        return Array.isArray(g)?{x:(g[0].x+g[1].x)/2,y:(g[0].y+g[1].y)/2}:{x:g.x+g.nx*56,y:g.y+g.ny*56};
      },
      labelAnchor(values){Object.assign(state,values);const g=geometry();const offset=discoide?discoideCurve(0):0;return {x:g.x+g.nx*offset,y:g.y+g.ny*offset};},
      raw:()=>canvas,
      width:canvas.width,height:canvas.height
    };});
}
window.endocartaMotoresIntestinais.linear = motorCoronal();
window.endocartaMotoresIntestinais['discoide-coronal'] = motorCoronal(true);

window.endocartaMotoresIntestinais['segmentar-coronal'] = (() => {
const canvas=document.createElement('canvas');canvas.width=1086;canvas.height=1448;const ctx=canvas.getContext('2d',{willReadFrequently:true});
  const W=1086,H=1448, state={inserted:false,position:100,size:400,compare:false};
  const base=new Image(),piece=new Image(),metal=new Image(),ends=new Image(); let lightColor,darkColor,original,stamp,endStamp,metalStamp,frame=0,drag=null,ready=false;
  // Quantidade ilustrativa; o metal mantém dimensões fixas na base.
  function staples(){const count=Math.max(2,Math.min(20,Math.round(2+18*(state.size-50)/350)));return {count,width:12,height:4.92,pitch:10};}
  // Limite local de composição, acompanhado sobre o contorno da base.
  // Não desenha anatomia: somente protege os pixels fora da parede intestinal.
  const wall=new Path2D();
  wall.moveTo(207,1090);wall.bezierCurveTo(255,1020,315,970,368,939);
  wall.bezierCurveTo(420,896,470,856,535,875);
  wall.bezierCurveTo(640,861,698,942,700,1028);
  wall.bezierCurveTo(649,1030,559,1035,520,1082);
  wall.bezierCurveTo(477,1131,471,1182,430,1200);
  wall.bezierCurveTo(340,1206,255,1170,207,1090);wall.closePath();
  const surplus=new Path2D();
  // Região verde da nova referência: preservar a anatomia original por baixo.
  const green=[[1231,836],[1261,813],[1290,799],[1303,799],[1302,817],[1292,836],[1261,859],[1232,859]];
  green.forEach(([x,y],i)=>{const bx=(x-1038)*1086/800,by=(y-108)*1448/1067;i?surplus.lineTo(bx,by):surplus.moveTo(bx,by);});surplus.closePath();
  let wallMask,wholeWallMask;
  const boundaryCtx=document.createElement('canvas').getContext('2d');
  // Linha preta da captura convertida para a base1086x1448.
  const reference=[[1309,900],[1320,908],[1330,915],[1340,922],[1350,929],[1360,936],[1370,944],[1380,952],[1390,961],[1400,971],[1410,988],[1421,1005]].map(([x,y])=>({x:(x-1038)*1086/800,y:(y-208)*1448/1067}));
  // Curvatura tomada da linha VERMELHA; posição ancorada no centro PRETO.
  // Translação rígida: conserva integralmente a forma, sem a deformação mínima da V4.
  const red=[[1315,792],[1325,793],[1335,793],[1345,795],[1355,796],[1365,800],[1375,803],[1385,807.5],[1395,814],[1405,821.5],[1415,831],[1425,844.5],[1435,862],[1445,883.5]];
  const redArc=red.map(([x,y],i)=>({x,y,d:0}));
  for(let i=1;i<redArc.length;i++)redArc[i].d=redArc[i-1].d+Math.hypot(redArc[i].x-redArc[i-1].x,redArc[i].y-redArc[i-1].y);
  const redMiddle=onRoute(redArc,redArc.at(-1).d/2),blackCenter={x:1364,y:847};
  const metalReference=red.map(([x,y])=>({x:(x-redMiddle.x+blackCenter.x-1038)*1086/800,y:(y-redMiddle.y+blackCenter.y-108)*1448/1067}));
  const metalAnchor={x:(blackCenter.x-1038)*1086/800,y:(blackCenter.y-108)*1448/1067};
  // Linha preta da refer?ncia V13: quadro de1000px, origem(979,-75).
  const upperReference=[[1403,737],[1420,737],[1440,743],[1460,749],[1480,755],[1497,770],[1516,790],[1532,821],[1543,852],[1547,872]].map(([x,y])=>({x:(x-979)*1086/1000,y:(y+75)*1086/1000,d:0}));
  for(let i=1;i<upperReference.length;i++)upperReference[i].d=upperReference[i-1].d+Math.hypot(upperReference[i].x-upperReference[i-1].x,upperReference[i].y-upperReference[i-1].y);
  function route(value,metal=false){
    const originalValue=Math.min(100,value*2),shift=(originalValue-50)*.4,advance=Math.max(0,(value-50)/50);
    const source=metal?metalReference:reference;
    const points=source.map((p,i)=>{
      const start={x:p.x+shift*.8,y:p.y-shift*.6};
      const target=onRoute(upperReference,upperReference.at(-1).d*i/(source.length-1));
      return{x:start.x+(target.x-start.x)*advance,y:start.y+(target.y-start.y)*advance};
    });
    // Prolongar somente o caminho de cálculo para encontrar a borda, nunca a arte.
    const a=points[0],b=points[1],z=points.at(-1),y=points.at(-2);
    points.unshift({x:a.x+(a.x-b.x)*4,y:a.y+(a.y-b.y)*4});
    points.push({x:z.x+(z.x-y.x)*4,y:z.y+(z.y-y.y)*4});
    const all=[];
    for(let j=0;j<points.length-1;j++)for(let i=0;i<30;i++){
      const f=i/30,x=points[j].x+(points[j+1].x-points[j].x)*f,y=points[j].y+(points[j+1].y-points[j].y)*f;
      if(boundaryCtx.isPointInPath(wall,x,y)){const prev=all.at(-1);all.push({x,y,d:prev?prev.d+Math.hypot(x-prev.x,y-prev.y):0});}
    }
    return all;
  }
  function onRoute(curve,d){
    d=Math.max(0,Math.min(curve.at(-1).d,d));let j=1;while(j<curve.length-1&&curve[j].d<d)j++;
    const a=curve[j-1],b=curve[j],f=(d-a.d)/(b.d-a.d),angle=Math.atan2(b.y-a.y,b.x-a.x);
    return{x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f,angle};
  }
  function geometry(value=state.position){
    const curve=route(value),length=curve.at(-1).d,p=onRoute(curve,length/2),tx=Math.cos(p.angle),ty=Math.sin(p.angle);
    return {...p,tx,ty,nx:-ty,ny:tx,k:state.size/100,curve,length};
  }
  const bump=v=>Math.abs(v)>=1?0:(1-v*v)**3;
  function displacement(u,v,k){return Math.min(12*k,28)*bump(u/Math.min(52*k,90))*bump(v/Math.min(75*k,100));}
  function stapleLayout(g=geometry()){
    const s=staples(),curve=route(state.position,true),length=curve.at(-1).d,span=(length-s.width)*(s.count-1)/19,start=(length-span)/2,result=[];
    for(let i=0;i<s.count;i++){
      const distance=start+span*i/(s.count-1),p=onRoute(curve,distance),dx=p.x-g.x,dy=p.y-g.y;
      // Duas fileiras centradas; afastamento desaparece nas extremidades.
      const angle=p.angle-g.angle,offset=(i%2?2.8:-2.8)*Math.sin(Math.PI*i/(s.count-1));
      result.push({u:dx*g.tx+dy*g.ty-Math.sin(angle)*offset,v:dx*g.nx+dy*g.ny+Math.cos(angle)*offset,angle,distance});
    }
    return result;
  }
  function sample(x,y,out,i){
    x=Math.max(0,Math.min(W-1.001,x));y=Math.max(0,Math.min(H-1.001,y));
    const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,j=(iy*W+ix)*4,src=original.data;
    for(let c=0;c<4;c++)out[i+c]=(src[j+c]*(1-fx)+src[j+4+c]*fx)*(1-fy)+(src[j+W*4+c]*(1-fx)+src[j+(W+1)*4+c]*fx)*fy;
  }
  function draw(){
    frame=0;if(!ready)return;ctx.putImageData(original,0,0);
    const g=geometry(),visible=state.inserted&&!state.compare;
    if(visible){
      const radius=Math.ceil(108*g.k),x0=Math.max(0,Math.floor(g.x-radius)),y0=Math.max(0,Math.floor(g.y-radius)),w=Math.min(W-x0,2*radius),h=Math.min(H-y0,2*radius);
      const roi=ctx.getImageData(x0,y0,w,h);
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){
        const dx=x+x0-g.x,dy=y+y0-g.y,u=dx*g.tx+dy*g.ty,v=dx*g.nx+dy*g.ny;
        if(Math.abs(u)>=52*g.k||Math.abs(v)>=90*g.k)continue;
        let sv=v;for(let n=0;n<8;n++)sv=v-displacement(u,sv,g.k);
        if(Math.abs(sv-v)<.001)continue;
        sample(g.x+u*g.tx+sv*g.nx,g.y+u*g.ty+sv*g.ny,roi.data,(y*w+x)*4);
      }
      ctx.putImageData(roi,x0,y0);
      // A nova textura contínua é composta ao longo da linha, abaixo dos grampos.
    }
    if(visible){
      const pixels=ctx.getImageData(0,0,W,H);
      for(let i=0;i<pixels.data.length;i+=4)if(wallMask[i+3]!==255){
        pixels.data[i]=original.data[i];pixels.data[i+1]=original.data[i+1];
        pixels.data[i+2]=original.data[i+2];pixels.data[i+3]=original.data[i+3];
      }
      ctx.putImageData(pixels,0,0);
      // O recorte da sobra protege o tecido; o metal termina na parede verdadeira.
      ctx.save();ctx.clip(wall);
      const line=route(state.position,true),layout=stapleLayout(g);
      const from=Math.max(0,layout[0].distance-6),to=Math.min(line.at(-1).d,layout.at(-1).distance+6),extent=to-from;
      const strips=Math.ceil(extent),step=extent/strips;
      // Uma única faixa imagegen: cada trecho da imagem aparece uma vez, sem mosaico.
      for(let i=0;i<strips;i++){
        const p=onRoute(line,from+(i+.5)*step);
        ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);
        // Arte nova apenas nas pontas; centro da V10 preservado.
        const edge=Math.min((i+.5)/strips,1-(i+.5)/strips);
        const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
        const blend=shadowAt(p),opacity=smooth(edge/.065);
        ctx.globalAlpha=opacity*(1-blend);
        ctx.drawImage(stamp,stamp.width*(.03+.94*i/strips),0,stamp.width*.94/strips,stamp.height,-step/2-.1,-60,step+.2,120);
        ctx.globalAlpha=opacity*blend;
        ctx.drawImage(endStamp,endStamp.width*(.03+.94*i/strips),0,endStamp.width*.94/strips,endStamp.height,-step/2-.1,-60,step+.2,120);
        ctx.restore();
      }
      ctx.translate(g.x,g.y);ctx.transform(g.tx,g.ty,g.nx,g.ny,0,0);
      const s=staples();
      for(const p of stapleLayout(g)){
        ctx.save();ctx.translate(p.u,p.v);ctx.rotate(p.angle);
        ctx.drawImage(metalStamp,-s.width/2,-s.height/2,s.width,s.height);ctx.restore();
      }
      ctx.restore();
      const bounded=ctx.getImageData(0,0,W,H);
      for(let i=0;i<bounded.data.length;i+=4)if(wholeWallMask[i+3]!==255){
        bounded.data[i]=original.data[i];bounded.data[i+1]=original.data[i+1];
        bounded.data[i+2]=original.data[i+2];bounded.data[i+3]=original.data[i+3];
      }
      ctx.putImageData(bounded,0,0);
    }

  }
  // A cor vem da anatomia original nessa coordenada, nunca das pontas da pe?a.
  function surroundingColor(p){
    const color=[0,0,0];let total=0;
    for(let dy=-8;dy<=8;dy+=4)for(let dx=-8;dx<=8;dx+=4){
      const x=Math.max(0,Math.min(W-1,Math.round(p.x+dx))),y=Math.max(0,Math.min(H-1,Math.round(p.y+dy))),i=(y*W+x)*4;
      if(wholeWallMask[i+3]!==255)continue;
      for(let c=0;c<3;c++)color[c]+=original.data[i+c];total++;
    }
    if(!total)return lightColor;
    return color.map(v=>v/total);
  }
  function shadowAt(p){
    const target=surroundingColor(p),delta=lightColor.map((v,i)=>darkColor[i]-v);
    const weight=target.reduce((v,c,i)=>v+(c-lightColor[i])*delta[i],0)/delta.reduce((v,c)=>v+c*c,0);
    return Math.max(0,Math.min(1,weight));
  }
  function artworkColor(image){
    const c=document.createElement('canvas');c.width=image.width;c.height=image.height;
    const x=c.getContext('2d');x.drawImage(image,0,0);const d=x.getImageData(0,0,c.width,c.height).data,sum=[0,0,0];let n=0;
    for(let y=Math.floor(c.height*.32);y<c.height*.68;y+=8)for(let xx=Math.floor(c.width*.15);xx<c.width*.85;xx+=8){
      if(y>c.height*.44&&y<c.height*.56)continue;
      const i=(y*c.width+xx)*4;if(d[i+3]<200)continue;
      for(let k=0;k<3;k++)sum[k]+=d[i+k];n++;
    }
    return sum.map(v=>v/n);
  }
  return Promise.all([new Promise((ok,no)=>{ends.onload=ok;ends.onerror=no;ends.src='assets/anastomoses/segmentar-coronal/pregas-sombra-uniforme-v1.png';}),new Promise((ok,no)=>{base.onload=ok;base.onerror=no;base.src='assets/anastomoses/segmentar-coronal/base-coronal.png';}),new Promise((ok,no)=>{piece.onload=ok;piece.onerror=no;piece.src='assets/anastomoses/segmentar-coronal/pregas-integradas-v1.png';}),new Promise((ok,no)=>{metal.onload=ok;metal.onerror=no;metal.src='assets/anastomoses/segmentar-coronal/linear-grampos-isolados-v1.png';})]).then(()=>{
    ctx.fillStyle='white';ctx.fillRect(0,0,W,H);ctx.drawImage(base,0,0,W,H);original=ctx.getImageData(0,0,W,H);
    const wc=document.createElement('canvas');wc.width=W;wc.height=H;const wx=wc.getContext('2d');wx.fill(wall);wholeWallMask=wx.getImageData(0,0,W,H).data;wx.globalCompositeOperation='destination-out';wx.fill(surplus);wallMask=wx.getImageData(0,0,W,H).data;
    metalStamp=document.createElement('canvas');metalStamp.width=195;metalStamp.height=80;
    metalStamp.getContext('2d').drawImage(metal,metal.width*480/2160,metal.height*265/720,metal.width*195/2160,metal.height*80/720,0,0,195,80);
    // Transição da camada em tempo de exibição; o PNG imagegen permanece intacto.
    stamp=document.createElement('canvas');stamp.width=piece.width;stamp.height=piece.height;
    const sc=stamp.getContext('2d');sc.drawImage(piece,0,0);
    const mask=document.createElement('canvas');mask.width=piece.width;mask.height=piece.height;
    const mc=mask.getContext('2d'),grad=mc.createLinearGradient(0,0,0,piece.height);
    grad.addColorStop(0,'transparent');grad.addColorStop(.22,'transparent');
    grad.addColorStop(.34,'rgba(255,255,255,.45)');grad.addColorStop(.44,'white');
    grad.addColorStop(.56,'white');grad.addColorStop(.66,'rgba(255,255,255,.45)');
    grad.addColorStop(.78,'transparent');grad.addColorStop(1,'transparent');
    mc.fillStyle=grad;mc.fillRect(0,0,mask.width,mask.height);
    sc.globalCompositeOperation='destination-in';sc.drawImage(mask,0,0);endStamp=document.createElement('canvas');endStamp.width=stamp.width;endStamp.height=stamp.height;const ec=endStamp.getContext('2d');ec.drawImage(ends,0,0,endStamp.width,endStamp.height);ec.globalCompositeOperation='destination-in';ec.drawImage(mask,0,0);lightColor=artworkColor(piece);darkColor=artworkColor(ends);ready=true;
    
  return {
      render(source, values) {
        Object.assign(state,values,{inserted:true,compare:false});
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.drawImage(source,0,0,canvas.width,canvas.height);
        original=ctx.getImageData(0,0,canvas.width,canvas.height);
        draw();
        const changed=ctx.getImageData(0,0,canvas.width,canvas.height);
        for(let i=0;i<changed.data.length;i+=4)if(changed.data[i]===original.data[i]&&changed.data[i+1]===original.data[i+1]&&changed.data[i+2]===original.data[i+2]&&changed.data[i+3]===original.data[i+3])changed.data[i+3]=0;
        const patch=document.createElement('canvas');patch.width=canvas.width;patch.height=canvas.height;patch.getContext('2d').putImageData(changed,0,0);return patch;
      },
      anchor(values,position=values.position) { Object.assign(state,values); const g=geometry(position);
        return Array.isArray(g)?{x:(g[0].x+g[1].x)/2,y:(g[0].y+g[1].y)/2}:{x:g.x+g.nx*56,y:g.y+g.ny*56};
      },
      labelAnchor(values){Object.assign(state,values);const g=geometry();return {x:g.x,y:g.y};},
      raw:()=>canvas,
      width:canvas.width,height:canvas.height
    };});
})();

function motorSagital(kind) {
  const linear=kind==='linear-sagital',segmentar=kind==='segmentar-sagital';
  const canvas=document.createElement('canvas');canvas.width=1086;canvas.height=1448;
  const ctx=canvas.getContext('2d');
  const state={position:58,size:5};
 // Pares correspondentes nas duas paredes, da região superior à inferior.
 const pairs=[[[798,460],[936,446]],[[813,530],[950,520]],[[824,600],[962,596]],[[828,668],[959,690]],[[818,716],[940,754]],[[773,758],[901,811]],[[719,795],[853,853]],[[674,837],[821,898]],[[647,882],[801,936]]];
 // Linha branca externa de cada parede, conferida sobre a base original.
 const borders=[[[440,781],[460,782],[480,785],[500,791],[520,798],[540,805],[560,811],[580,816],[600,820],[620,822],[640,824],[660,824],[680,820],[700,809],[720,798]],[[420,925],[440,933],[460,941],[480,948],[500,953],[520,957],[540,962],[560,966],[580,970],[600,974],[620,977],[640,979],[660,980],[680,980],[700,979],[720,977]]];
 function borderX(side,y){const points=borders[side];let k=1;while(k<points.length-1&&points[k][0]<y)k++;const a=points[k-1],b=points[k];return a[1]+(b[1]-a[1])*(y-a[0])/(b[0]-a[0]);}
 const centers=pairs.map(([a,b],i)=>({x:(a[0]+b[0])/2,y:(a[1]+b[1])/2,d:0}));
 for(let i=1;i<centers.length;i++)centers[i].d=centers[i-1].d+Math.hypot(centers[i].x-centers[i-1].x,centers[i].y-centers[i-1].y);
 function layout(value=state.position){
  const d=(1-value/100)*centers.at(-1).d;let j=1;while(j<centers.length-1&&centers[j].d<d)j++;
  const f=(d-centers[j-1].d)/(centers[j].d-centers[j-1].d);
  return [0,1].map(side=>{const a=pairs[j-1][side],b=pairs[j][side],y=a[1]+(b[1]-a[1])*f;return{x:borderX(side,y),y,angle:Math.atan2(2,borderX(side,y+1)-borderX(side,y-1))};});
 }


  const height=linear?13:38,width=linear?14:16,pitch=14;
  function groupCenter(values,position=values.position){
    const p=layout(position)[0];
    if(!linear)return p.y;
    const half=(values.size-1)*pitch/2+height/2;
    const top=Math.max(460,440+half),bottom=Math.min(layout(58)[0].y,720-half);
    return top+(bottom-top)*(100-position)/42;
  }
  function load(src){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=src;});}
  const folder=segmentar?'segmentar-sagital':'discoide';
  return Promise.all([load(`assets/anastomoses/${folder}/base-sagital.png`),load(`assets/anastomoses/${folder}/grampo-metal-contraste-v1.png`)]).then(([base,metal])=>{
    canvas.width=base.width;canvas.height=base.height;
    // Prepare the approved metal image once, at its display scale.
    const stamp=document.createElement('canvas');stamp.width=width*3;stamp.height=height*3;
    const st=stamp.getContext('2d');
    st.filter=linear?'brightness(0.53) contrast(1.35)':'brightness(0.78)';
    st.drawImage(metal,395,112,464,1032,0,0,stamp.width,stamp.height);
    function drawStaple(side,center){
      for(let row=0;row<height;row++){
        const y=center-height/2+row,bow=(linear?2.5:4)*Math.sin(Math.PI*(row+.5)/height);
        const x=borderX(side,y+.5)+(side===0?-bow:bow);
        ctx.save();ctx.translate(x,y);if(side===1)ctx.scale(-1,1);
        ctx.drawImage(stamp,0,row*3,stamp.width,3,-185*width/464,0,width,1);ctx.restore();
      }
    }
    return {
      direct:true,width:canvas.width,height:canvas.height,
      render(source,values){
        Object.assign(state,values);ctx.clearRect(0,0,canvas.width,canvas.height);
        const ps=layout(values.position);
        if(linear){const center=groupCenter(values);for(let i=0;i<values.size;i++)drawStaple(0,center+(i-(values.size-1)/2)*pitch);}
        else{drawStaple(0,ps[0].y);if(segmentar)drawStaple(1,ps[1].y);}
        return canvas;
      },
      anchor(values,position=values.position){
        const ps=layout(position);
        if(linear){const y=groupCenter(values,position);return{x:(borderX(0,y)+borderX(1,y))/2,y};}
        return{x:(ps[0].x+ps[1].x)/2,y:(ps[0].y+ps[1].y)/2};
      },
      labelAnchor(values){const y=groupCenter(values);return{x:borderX(0,y),y};},
      raw:()=>canvas
    };
  });
}
for(const kind of ['segmentar-sagital','discoide','linear-sagital'])window.endocartaMotoresIntestinais[kind]=motorSagital(kind);
