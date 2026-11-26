(() => {
  'use strict';

  const id = 'falha-peritoneal-sagital';
  const mapa = document.querySelector(`[data-mapa-editor="${id}"]`);
  if (!mapa) return;

  const desenho = mapa.querySelector('.mapa-editor__desenho');
  const tela = document.createElement('canvas');
  tela.width = 1087;
  tela.height = 1447;
  tela.className = 'mapa-editor__orgaos';
  tela.dataset.falhaPeritoneal = '';
  desenho.querySelector('[data-mapa-base]').after(tela);
  const ctx = tela.getContext('2d');
  const painel = mapa.querySelector('[data-falha-ajustes]');
  const comprimento = painel.querySelector('[data-falha-comprimento]');
  const profundidade = painel.querySelector('[data-falha-profundidade]');
  const minimo=20,maximo=100,limiteAntigo=125,tamanhoInicial=60;
  const padrao = () => ({comprimento:tamanhoInicial, profundidade:tamanhoInicial});
  const limitarTamanho=valor=>Math.max(minimo,Math.min(maximo,valor));
  let estado = padrao();
  let referencia;
  let fundoOriginal;
  let fundoSemFalha;
  let fundoLimpo;
  let referencia96;
  let geometria96;
  let bordaNormalReal;
  let referenciasSombra;
  const uteroOriginal = document.createElement('canvas');
  uteroOriginal.width = tela.width;
  uteroOriginal.height = tela.height;
  let quadro = 0;

  // Coordenadas da fotografia original da prévia, já registrada sobre a base.
  const recorte = {x:550, y:355, w:408, h:440};
  const area = {x:620, y:420, w:338, h:375};
  const centro = {x:800, y:620};

  function suavizar(inicio, fim, valor) {
    const t = Math.max(0, Math.min(1, (valor-inicio)/(fim-inicio)));
    return t*t*(3-2*t);
  }

  function mediaRGB(imagem, x, y, largura, altura) {
    const soma=[0,0,0];
    for(let j=y;j<y+altura;j++) for(let i=x;i<x+largura;i++) {
      const p=(j*imagem.width+i)*4;
      for(let c=0;c<3;c++)soma[c]+=imagem.data[p+c];
    }
    return soma.map(v=>v/(largura*altura));
  }

  function limiteNaAltura(pontos,y) {
    let i=1;
    while(i<pontos.length-1&&y>pontos[i][0])i++;
    const [y0,x0]=pontos[i-1], [y1,x1]=pontos[i];
    const t=Math.max(0,Math.min(1,(y-y0)/(y1-y0)));
    return x0+(x1-x0)*t;
  }

  function calibrarCor(imagem) {
    // Médias dos pixels dentro do círculo verde na referência de Daniel.
    const alvo=[198.21,146.83,108.25];
    const fonte=mediaRGB(imagem,736-area.x,515-area.y,8,8);
    const luminancia=([r,g,b])=>.2126*r+.7152*g+.0722*b;
    const rg=alvo[0]-alvo[1],gb=alvo[1]-alvo[2];
    const rgFonte=fonte[0]-fonte[1],gbFonte=fonte[1]-fonte[2];
    const luz=luminancia(alvo)/luminancia(fonte);
    return (r,g,b)=>{
      const a=rg+((r-g)-rgFonte)*.35,c=gb+((g-b)-gbFonte)*.35;
      const verde=luminancia([r,g,b])*luz-.2126*a+.0722*c;
      return [verde+a,verde,verde-c];
    };
  }

  function preparar(base, arte, limpo) {
    const folha = document.createElement('canvas');
    folha.width = area.w;
    folha.height = area.h;
    const papel = folha.getContext('2d', {willReadFrequently:true});
    papel.drawImage(base, area.x,area.y,area.w,area.h, 0,0,area.w,area.h);
    papel.drawImage(uteroOriginal,area.x,area.y,area.w,area.h,0,0,area.w,area.h);
    const original = papel.getImageData(0,0,area.w,area.h);
    fundoOriginal=papel.getImageData(0,0,area.w,area.h);
    papel.clearRect(0,0,area.w,area.h);
    papel.imageSmoothingQuality = 'high';
    papel.drawImage(arte,recorte.x-area.x,recorte.y-area.y,recorte.w,recorte.h);
    const retocada = papel.getImageData(0,0,area.w,area.h);
    papel.clearRect(0,0,area.w,area.h);
    papel.drawImage(limpo,recorte.x-area.x,recorte.y-area.y,recorte.w,recorte.h);
    fundoLimpo=papel.getImageData(0,0,area.w,area.h);

    // A referência cromática vem da região anterior indicada sobre o próprio
    // mapa. Ajusta-se somente a tonalidade da composição, sem alterar o PNG.
    const corRetocada=calibrarCor(retocada),corLimpa=calibrarCor(fundoLimpo);

    // Transição suave na periferia do recorte. A cavidade e as duas emendas
    // centrais são reproduzidas diretamente da ilustração entregue por Daniel.
    const limiteEsquerdo=[[420,630],[445,630],[480,665],[510,688],[550,718],[595,740],[650,761],[680,770],[698,778],[730,780],[795,780]];
    const limiteDireitoCor=[[430,770],[450,780],[480,785],[520,799],[550,808],[570,829],[590,860],[610,886],[630,891],[650,879],[670,856],[690,820],[710,807]];
    let trecho=1;
    for (let y=0;y<area.h;y++) for(let x=0;x<area.w;x++) {
      const px=area.x+x, py=area.y+y;
      while(trecho<limiteEsquerdo.length-1&&py>limiteEsquerdo[trecho][0])trecho++;
      const [y0,x0]=limiteEsquerdo[trecho-1], [y1,x1]=limiteEsquerdo[trecho];
      const limite=x0+(x1-x0)*(py-y0)/(y1-y0);
      const peso=suavizar(limite-8,limite+12,px)*(1-suavizar(930,958,px))*
        suavizar(420,460,py)*(1-suavizar(745,795,py));
      const i=(y*area.w+x)*4;
      for(let canal=0;canal<4;canal++) {
        original.data[i+canal]=original.data[i+canal]*(1-peso)+retocada.data[i+canal]*peso;
      }
      const r=original.data[i],g=original.data[i+1],b=original.data[i+2];
      const direita=limiteNaAltura(limiteDireitoCor,py);
      const corPeso=suavizar(limite-3,limite+9,px)*(1-suavizar(direita-7,direita+2,px))*
        suavizar(430,452,py)*(1-suavizar(692,710,py))*suavizar(15,28,g-b)*suavizar(0,15,r-g);
      if(corPeso>0) {
        const nova=corRetocada(r,g,b);
        for(let canal=0;canal<3;canal++)original.data[i+canal]=original.data[i+canal]*(1-corPeso)+nova[canal]*corPeso;
      }
      const [rl,gl,bl]=fundoLimpo.data.subarray(i,i+3);
      const pesoLimpo=suavizar(limite-3,limite+9,px)*suavizar(430,452,py)*(1-suavizar(692,710,py))*suavizar(15,28,gl-bl)*suavizar(0,15,rl-gl);
      if(pesoLimpo>0){const nova=corLimpa(rl,gl,bl);for(let c=0;c<3;c++)fundoLimpo.data[i+c]=fundoLimpo.data[i+c]*(1-pesoLimpo)+nova[c]*pesoLimpo;}
    }
    return original;
  }

  function limitePosterior(y) {
    // Mantém fixa a parede posterior do reto, que fica mais próxima da
    // cavidade na parte superior do recorte.
    return 912+33*suavizar(450,590,y)-15*suavizar(715,780,y);
  }

  function amostrar(x,y,destino,i,fonte=referencia) {
    x=Math.max(0,Math.min(area.w-1.001,x-area.x));
    y=Math.max(0,Math.min(area.h-1.001,y-area.y));
    const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
    const origem=(iy*area.w+ix)*4,p=fonte.data,passo=area.w*4;
    for(let c=0;c<4;c++) destino[i+c]=
      (p[origem+c]*(1-fx)+p[origem+4+c]*fx)*(1-fy)+
      (p[origem+passo+c]*(1-fx)+p[origem+passo+4+c]*fx)*fy;
  }

  // Encaixe das linhas claras da parede na ilustração recebida e no mapa
  // original, conferidas em coordenadas da base. São referências de posição.
  const paredeRetocada=[[450,800],[470,801],[490,806],[510,811],[530,818],[550,842],[570,878],[590,891],[610,898],[630,898],[650,892],[670,879],[690,844],[710,841],[730,841]];
  const paredeOriginal=[[450,800],[470,801],[490,806],[510,812],[530,819],[550,826],[570,831],[590,835],[610,838],[630,840],[650,841],[670,841],[690,838],[710,841],[730,844]];

  function saliencia(y) {
    const pontos=paredeRetocada.map(([altura,x],i)=>[altura,x-paredeOriginal[i][1]]);
    let j=1;
    while(j<pontos.length-1&&y>pontos[j][0])j++;
    const [a,u]=pontos[j-1],[b,v]=pontos[j];
    const anterior=pontos[Math.max(0,j-2)],posterior=pontos[Math.min(pontos.length-1,j+1)];
    const t=Math.max(0,Math.min(1,(y-a)/(b-a))),t2=t*t,t3=t2*t;
    const m0=(v-anterior[1])/(b-anterior[0])*(b-a);
    const m1=(posterior[1]-u)/(posterior[0]-a)*(b-a);
    return (2*t3-3*t2+1)*u+(t3-2*t2+t)*m0+(-2*t3+3*t2)*v+(t3-t2)*m1;
  }

  function prepararFundoSemFalha() {
    const imagem=ctx.createImageData(area.w,area.h);
    imagem.data.set(referencia.data);
    // Recupera a parede e a luz do mapa normal onde não há mais defeito.
    // O tecido já harmonizado atrás do útero permanece à esquerda da junção.
    for(let y=500;y<720;y++) {
      const parede=limiteNaAltura(paredeOriginal,y);
      const pesoY=suavizar(500,525,y)*(1-suavizar(695,720,y));
      for(let x=Math.ceil(parede-62);x<area.x+area.w;x++) {
        const peso=pesoY*suavizar(parede-62,parede-45,x);
        const pesoParede=suavizar(parede-25,parede-16,x);
        const i=((y-area.y)*area.w+x-area.x)*4;
        for(let c=0;c<3;c++) {
          const fundo=fundoLimpo.data[i+c]*(1-pesoParede)+fundoOriginal.data[i+c]*pesoParede;
          imagem.data[i+c]=imagem.data[i+c]*(1-peso)+fundo*peso;
        }
      }
    }
    return imagem;
  }

  function comporFalha(imagem, valores=estado) {
    const comprimento=valores.comprimento/100, profundidade=valores.profundidade/100;
    const amostra=new Uint8ClampedArray(4),amostraLuz=new Uint8ClampedArray(4),acima=new Uint8ClampedArray(4),abaixo=new Uint8ClampedArray(4),parede=new Uint8ClampedArray(4);
    const suavidade=Math.max(0,Math.min(2.5,(1/comprimento-1)/2));
    const reducao=1-suavizar(.45,.85,comprimento);
    const escalaParede=comprimento+Math.max(0,.48-comprimento)*reducao;
    // Redimensiona somente a diferença entre o contorno normal e o contorno
    // da imagem aprovada. A parede conserva sua espessura e a curva original
    // nas extremidades, inclusive a dobra inferior.
    for(let y=area.y;y<area.y+area.h;y++) {
      const sy=centro.y+(y-centro.y)/comprimento;
      const syParede=centro.y+(y-centro.y)/escalaParede;
      if(syParede<510||syParede>710)continue;
      const normal=limiteNaAltura(paredeOriginal,y);
      const normalFonte=limiteNaAltura(paredeOriginal,sy);
      const fonte=limiteNaAltura(paredeRetocada,sy);
      const pesoY=suavizar(510,540,sy)*(1-suavizar(680,710,sy));
      const pesoCurva=suavizar(510,540,syParede)*(1-suavizar(680,710,syParede));
      const alvo=normal+saliencia(syParede)*profundidade*pesoCurva;
      const esquerda=normal-48,esquerdaFonte=normalFonte-48;
      const espessura=14;
      const dentro=alvo-espessura,dentroFonte=fonte-espessura;
      const fim=limitePosterior(y);
      for(let x=Math.max(area.x,Math.ceil(esquerda));x<fim;x++) {
        const sxAntigo=x<dentro?esquerdaFonte+(x-esquerda)*(dentroFonte-esquerdaFonte)/(dentro-esquerda):fonte+x-alvo;
        const sxProporcional=dentroFonte+(x-dentro)/comprimento;
        const sx=x<dentro?sxAntigo*(1-reducao)+sxProporcional*reducao:sxAntigo;
        const pesoBorda=suavizar(esquerda,esquerda+10,x)*(1-suavizar(fim-7,fim,x));
        const pesoParede=suavizar(alvo-25,alvo-14,x);
        const pesoArte=suavizar(esquerdaFonte-12,esquerdaFonte+4,sx);
        const peso=pesoBorda*(pesoY*(1-pesoParede)*(1-reducao+reducao*pesoArte)+pesoParede*pesoCurva);
        amostrar(sx,sy,amostra,0);
        if(suavidade>.25){
          amostrar(sx,sy-suavidade,acima,0);amostrar(sx,sy+suavidade,abaixo,0);
          for(let c=0;c<3;c++)amostra[c]=.5*amostra[c]+.25*acima[c]+.25*abaixo[c];
        }
        // A faixa da parede vem da mesma linha horizontal do mapa normal.
        // Seu contorno claro acompanha uma única curva, sem sobrepor emendas.
        if(pesoParede>0) {
          amostrar(normal+x-alvo,y,parede,0,fundoOriginal);
          const normalidade=1-suavizar(.65,.98,Math.min(comprimento,profundidade));
          for(let c=0;c<3;c++)amostra[c]=amostra[c]*(1-pesoParede*normalidade)+parede[c]*pesoParede*normalidade;
        }
        if(x>alvo+3&&fim>alvo+4) {
          const t=(x-alvo-4)/(fim-alvo-4);
          const luzX=normal+4+Math.max(0,t)*(fim-normal-4);
          amostrar(luzX,y,amostraLuz,0,fundoOriginal);
          const pesoLuz=suavizar(alvo+3,alvo+12,x);
          for(let c=0;c<3;c++)amostra[c]=amostra[c]*(1-pesoLuz)+amostraLuz[c]*pesoLuz;
        }
        const i=((y-area.y)*area.w+x-area.x)*4;
        for(let c=0;c<3;c++)imagem.data[i+c]=imagem.data[i+c]*(1-peso)+amostra[c]*peso;
      }
    }
  }

  function continuidadeInferior(imagem, valores=estado) {
    const escala=valores.comprimento/100;
    if(escala>=.98)return;
    const linha=[[650,805],[655,808],[660,811],[665,812],[670,811],[675,806],[680,802],[685,801],[690,802],[695,798]];
    const inicio=centro.y+30*escala,fim=695;
    const normal=limiteNaAltura(paredeOriginal,inicio),normalFonte=limiteNaAltura(paredeOriginal,650);
    const fonte=limiteNaAltura(paredeRetocada,650),alvo=normal+saliencia(650)*valores.profundidade/100;
    const reducao=1-suavizar(.45,.85,escala);
    const xAntigo=normal-48+(805-(normalFonte-48))*((alvo-14)-(normal-48))/((fonte-14)-(normalFonte-48));
    const xProporcional=alvo-14+(805-(fonte-14))*escala;
    const xInicial=xAntigo*(1-reducao)+xProporcional*reducao;
    const amostra=new Uint8ClampedArray(4);
    for(let y=Math.ceil(inicio);y<=fim;y++) {
      const t=(y-inicio)/(fim-inicio),sy=650+45*t;
      const sx=limiteNaAltura(linha,sy),xCentro=sx+(xInicial-805)*(1-t);
      const limite=limiteNaAltura(paredeOriginal,y)-19;
      for(let x=Math.ceil(xCentro-10);x<=Math.min(limite,xCentro+10);x++) {
        amostrar(sx+x-xCentro,sy,amostra,0);
        const peso=(1-suavizar(4,10,Math.abs(x-xCentro)))*suavizar(inicio,inicio+5,y)*(1-suavizar(690,695,y));
        const i=((y-area.y)*area.w+x-area.x)*4;
        for(let c=0;c<3;c++)imagem.data[i+c]=imagem.data[i+c]*(1-peso)+amostra[c]*peso;
      }
    }
  }

  // Interpolação contínua e sem sobrepassar os pontos de controle.
  // Usada no eixo da parede e no mapeamento horizontal de cada linha.
  function curvaMonotona(pontos, extremos) {
    const n=pontos.length, h=[], d=[], m=[];
    for(let i=0;i<n-1;i++) {
      h[i]=pontos[i+1][0]-pontos[i][0];
      d[i]=(pontos[i+1][1]-pontos[i][1])/h[i];
    }
    m[0]=extremos===undefined?d[0]:Math.min(extremos,3*d[0]);
    m[n-1]=extremos===undefined?d[n-2]:Math.min(extremos,3*d[n-2]);
    for(let i=1;i<n-1;i++) {
      const a=d[i-1],b=d[i];
      const w1=2*h[i]+h[i-1],w2=h[i]+2*h[i-1];
      m[i]=a*b<=0?0:(w1+w2)/(w1/a+w2/b);
    }
    const uniforme=h.every(v=>v===h[0]);
    return x=>{
      if(x<=pontos[0][0])return pontos[0][1];
      if(x>=pontos[n-1][0])return pontos[n-1][1];
      let i=uniforme?Math.min(n-2,Math.floor((x-pontos[0][0])/h[0])):0;
      if(!uniforme){
        let a=0,b=n-1;
        while(b-a>1){const meio=(a+b)>>1;if(x<pontos[meio][0])b=meio;else a=meio;}
        i=a;
      }
      const t=(x-pontos[i][0])/h[i],q=t*t,r=q*t;
      return (2*r-3*q+1)*pontos[i][1]+(r-2*q+t)*h[i]*m[i]+
        (-2*r+3*q)*pontos[i+1][1]+(r-q)*h[i]*m[i+1];
    };
  }

  const paredeNormalContinua=curvaMonotona([[450,800],[470,801],[480,803],[490,806],[500,809],[510,812],[520,816],[530,819],[540,823],[550,826],[560,828],[570,831],[580,833],[590,835],[600,837],[610,838],[620,839],[630,840],[640,841],[650,841],[660,841],[670,841],[680,839],[690,838],[700,837],[710,840],[720,845],[730,848],[750,841]]);
  const paredeFalhaContinua=curvaMonotona([[450,800],[470,801],[480,803],[490,806],[500,809],[510,811],[520,814],[530,818],[540,825],[550,842],[560,863],[570,878],[580,886],[590,891],[600,895],[610,898],[620,898],[630,898],[640,895],[650,892],[660,887],[670,879],[680,864],[690,844],[700,837],[710,841],[720,846],[730,849],[750,841]]);
  const margemRetocada=curvaMonotona([[420,630],[445,630],[480,665],[510,688],[550,718],[595,740],[650,761],[680,770],[698,778],[730,780],[795,780]]);

  function suaveQuintica(a,b,x) {
    const t=Math.max(0,Math.min(1,(x-a)/(b-a)));
    return t*t*t*(t*(6*t-15)+10);
  }

  const peritoneoNormal=curvaMonotona([[450,782],[470,783],[480,784],[490,788],[500,791],[510,794],[520,798],[530,801],[540,805],[550,809],[560,812],[570,813],[580,816],[590,819],[600,820],[610,821],[620,822],[630,823],[640,824],[650,824],[660,824],[670,823],[680,820],[690,812],[695,800],[700,790]]);
  // Posições da linha branca existente na ilustração de Daniel. Entre as
  // duas pontas abertas, os pontos virtuais orientam apenas a amostragem.
  const peritoneoFalha=curvaMonotona([[450,782],[470,783],[480,785],[490,787],[500,791],[510,794],[520,796],[530,798],[540,799],[550,801],[560,809],[570,814],[580,815],[590,809],[600,800],[605,800],[625,800],[630,799],[640,799],[650,805],[660,811],[670,811],[680,802],[690,802],[695,798],[700,790]]);
  const peritoneoLimpo=curvaMonotona([[450,782],[470,783],[480,785],[490,786],[500,786],[510,788],[520,792],[530,792],[540,795],[550,801],[560,814],[570,831],[580,847],[590,856],[600,860],[610,862],[620,861],[630,859],[640,861],[650,854],[660,839],[670,815],[680,804],[690,804],[700,799]]);

  function geometriaParede(escala) {
    // A imagem da falha e a parede têm transformações separadas. A falha
    // diminui proporcionalmente; a parede usa a textura do reto normal em
    // sua orientação original, acompanhando a curvatura da nova borda.
    const pesoVertical=y=>suaveQuintica(480,550,y)*(1-suaveQuintica(665,700,y));
    const escalaLocal=y=>1+(escala-1)*pesoVertical(y);
    const destinoY=y=>centro.y+(y-centro.y)*escalaLocal(y);
    const inversaVertical=curvaMonotona(Array.from({length:221},(_,i)=>{
      const y=i+480;
      return [destinoY(y),y];
    }),1);
    const origemY=y=>y<=480||y>=700?y:inversaVertical(y);

    // Suavização geométrica das junções antes da amostragem da textura.
    // A pequena saliência não precisa dobrar a parede num raio diminuto.
    const escalaParede=Math.max(.47,escala);
    const sigma=Math.max(.35,5.5*Math.sqrt(Math.max(0,1-escala)));
    const raio=Math.ceil(sigma*3),kernel=[];
    let soma=0;
    for(let k=-raio;k<=raio;k++){
      const peso=Math.exp(-.5*(k/sigma)**2);kernel.push(peso);soma+=peso;
    }
    const bruto=y=>{
      const sy=centro.y+(y-centro.y)/escalaParede;
      return escala*(paredeFalhaContinua(sy)-paredeNormalContinua(sy))*
        suaveQuintica(500,535,sy)*(1-suaveQuintica(695,715,sy));
    };
    const alturas=[], curvas=[];
    let pico=0;
    for(let y=460;y<=750;y++){
      let desloc=0;
      for(let k=-raio;k<=raio;k++)desloc+=bruto(y+k)*kernel[k+raio]/soma;
      alturas.push([y,desloc]);pico=Math.max(pico,desloc);
    }
    const normalizador=59*escala/Math.max(1,pico);
    for(const [y,desloc] of alturas)curvas.push([y,paredeNormalContinua(y)+desloc*normalizador]);
    const alvo=curvaMonotona(curvas);
    const derivada=(curva,y)=>curva(y+.5)-curva(y-.5);
    return {alvo,derivada,origemY,destinoY,escalaLocal,escalaParede};
  }

  function comporParedeContinua(imagem, escala=estado.comprimento/100) {
    const {alvo,derivada,origemY,escalaLocal}=geometriaParede(escala);
    const sample=new Uint8ClampedArray(4),sampleRef=new Uint8ClampedArray(4),sampleLimpo=new Uint8ClampedArray(4);
    const tomRef=suaveQuintica(.87,1,escala);

    for(let y=481;y<730;y++) {
      const sy=origemY(y),local=escalaLocal(sy);
      const a=paredeNormalContinua(y),b=alvo(y),bf=paredeFalhaContinua(sy);
      const p=derivada(alvo,y),pf=derivada(paredeFalhaContinua,sy);
      const j=b-10*Math.hypot(1,p),jf=bf-10*Math.hypot(1,pf);
      const uf=peritoneoFalha(sy);
      let u=peritoneoNormal(y)+(uf-peritoneoNormal(sy))*local;
      if(sy>=695)u=uf+(u-uf)*(1-suaveQuintica(695,700,sy));
      u=Math.min(j-5,u);
      const esquerda=Math.min(u-6,uf-6,Math.max(margemRetocada(y)+5,Math.min(u,uf,peritoneoFalha(y))-26));
      const direita=limitePosterior(y);

      // Reamostra a cavidade preservando a posição e a continuidade da linha
      // branca. O trecho inferior volta à sua posição original, sem salto.
      if(y<700 && jf>uf+3 && j>u+3) {
        const larguraLinha=Math.min(1.1,(j-u)*.17,(jf-uf)*.17);
        const xCavidade=curvaMonotona([[esquerda,esquerda],[u-larguraLinha,uf-larguraLinha],[u,uf],[u+larguraLinha,uf+larguraLinha],[j+3,jf+3]],1);
        const limiteLimpo=peritoneoLimpo(y)-5;
        const pesoLimpo=(1-suaveQuintica(.4,.82,escala))*suaveQuintica(490,525,y)*(1-suaveQuintica(680,700,y));
        for(let x=Math.max(area.x,Math.ceil(esquerda));x<=j+3;x++) {
          const yy=y+(sy-y)*suaveQuintica(esquerda,u-3,x);
          const i=((y-area.y)*area.w+x-area.x)*4;
          amostrar(xCavidade(x),yy,imagem.data,i,referencia);
          // Fora das duas pequenas bordas, conservar a textura sem a falha
          // na altura original. Isso evita o efeito de tecido puxado para o
          // centro quando a cavidade é reduzida para 20–40%.
          const limpo=pesoLimpo*suaveQuintica(esquerda,esquerda+12,x)*(1-suaveQuintica(u-10,u-2,x));
          if(limpo>0){
            const sx=Math.min(limiteLimpo,x+(limiteLimpo-(u-3))*suaveQuintica(esquerda,u-3,x));
            amostrar(sx,y,sampleLimpo,0,fundoLimpo);
            for(let c=0;c<3;c++)imagem.data[i+c]+=(sampleLimpo[c]-imagem.data[i+c])*limpo;
          }
        }
      }

      // A borda interna e sua faixa de tecido vêm de uma única amostragem
      // em coordenadas perpendiculares à parede. Não misturar duas bordas.
      const fimLuz=Math.min(direita,Math.max(b+19,a+66));
      const mapaLuz=curvaMonotona([[b,a],[b+5,a+5],[fimLuz,fimLuz]],1);
      const xLuz=x=>x>=fimLuz?x:mapaLuz(x);
      const refY=origemY(y),refA=paredeFalhaContinua(refY);
      const fimLuzRef=Math.min(direita,Math.max(b+19,refA+19,a+66));
      const mapaLuzRef=curvaMonotona([[b,refA],[b+5,refA+5],[fimLuzRef,fimLuzRef]],1);
      const xLuzRef=x=>x>=fimLuzRef?x:mapaLuzRef(x);
      const deslocamento=Math.abs(b-a);
      const expansaoTextura=3.4*suaveQuintica(.8,7,deslocamento);
      for(let x=Math.max(area.x,Math.ceil(b-22*Math.hypot(1,p)));x<direita;x++) {
        let sx,yy,rx,ry,pesoFaixa=1;
        if(x<b+17) {
          // Projeção do pixel sobre a curva: alinha as fibras do desenho à
          // tangente local, em vez de comprimi-las na vertical.
          let q=y;
          for(let k=0;k<5;k++) {
            const t=alvo(q),v=derivada(alvo,q),z=alvo(q+1)-2*t+alvo(q-1);
            const passo=(q-y+(t-x)*v)/Math.max(.35,1+v*v+(t-x)*z);
            q=Math.max(y-32,Math.min(y+32,q-Math.max(-8,Math.min(8,passo))));
            if(Math.abs(passo)<.015)break;
          }
          const v=derivada(alvo,q),n=((x-alvo(q))-(y-q)*v)/Math.hypot(1,v);
          pesoFaixa=suaveQuintica(-18,-14,n);
          if(pesoFaixa===0)continue;
          const v0=derivada(paredeNormalContinua,q),h0=Math.hypot(1,v0);
          // A textura da faixa muscular é mantida inclusive na metade
          // externa, sem trazer junto a antiga linha branca externa.
          const nFonte=n+expansaoTextura*(1-suaveQuintica(-17,-8,n));
          sx=paredeNormalContinua(q)+nFonte/h0;yy=q-nFonte*v0/h0;
          if(tomRef>0){
            const qr=origemY(q),vr=derivada(paredeFalhaContinua,qr),hr=Math.hypot(1,vr);
            rx=paredeFalhaContinua(qr)+n/hr;ry=qr-n*vr/hr;
          }
          const luz=suaveQuintica(b+3,b+17,x);
          sx+=(xLuz(x)-sx)*luz;yy+=(y-yy)*luz;
          if(tomRef>0){rx+=(xLuzRef(x)-rx)*luz;ry+=(y-ry)*luz;}
        }else{
          sx=xLuz(x);yy=y;rx=xLuzRef(x);ry=y;
        }
        amostrar(sx,yy,sample,0,fundoOriginal);
        if(tomRef>0){
          amostrar(rx,ry,sampleRef,0,referencia);
          for(let c=0;c<3;c++)sample[c]+=(sampleRef[c]-sample[c])*tomRef;
        }
        const peso=pesoFaixa*suaveQuintica(u+1.6,u+4.7,x)*(1-suaveQuintica(direita-8,direita,x))*
          suaveQuintica(481,510,y)*(1-suaveQuintica(700,730,y));
        const i=((y-area.y)*area.w+x-area.x)*4;
        for(let c=0;c<3;c++)imagem.data[i+c]+=(sample[c]-imagem.data[i+c])*peso;
      }
    }
  }

  function eixoVerticalParede(g) {
    const destino=y=>centro.y+(y-centro.y)*(1+(g.escalaParede-1)*suaveQuintica(480,530,y)*(1-suaveQuintica(695,727,y)));
    const inversa=curvaMonotona(Array.from({length:248},(_,i)=>[destino(480+i),480+i]),1);
    return {destino,origem:y=>y<=480||y>=727?y:inversa(y)};
  }

  function posicaoPeritoneo(g,y,sy) {
    const j=g.alvo(y)-10*Math.hypot(1,g.derivada(g.alvo,y));
    const uf=peritoneoFalha(sy);
    let u=peritoneoNormal(y)+(uf-peritoneoNormal(sy))*g.escalaLocal(sy);
    if(sy>=695)u=uf+(u-uf)*(1-suaveQuintica(695,700,sy));
    return Math.min(j-5,u);
  }

  // Localiza a linha clara real nos pixels da ilustração, em vez de usar
  // apenas a aproximação pelos pontos medidos. A posição é suavizada ao
  // longo da parede para não transportar serrilhados para a nova escala.
  function extrairBordaClara(imagem,estimativa,raio=4) {
    const leituras=[];
    const cinza=(x,y)=>{
      const i=((y-area.y)*area.w+x-area.x)*4;
      return (imagem.data[i]+imagem.data[i+1]+imagem.data[i+2])/3;
    };
    for(let y=460;y<=750;y++){
      const e=estimativa(y);let pico=Math.round(e),melhor=-Infinity;
      for(let x=Math.round(e)-raio;x<=Math.round(e)+raio;x++){
        const v=cinza(x,y),depois=(cinza(x+4,y)+cinza(x+5,y)+cinza(x+6,y))/3;
        const nota=v+.35*(v-depois)-.7*Math.abs(x-e);
        if(nota>melhor){melhor=nota;pico=x;}
      }
      const l=cinza(pico-1,y),c=cinza(pico,y),d=cinza(pico+1,y),den=l-2*c+d;
      const ajuste=den<-.1?Math.max(-.5,Math.min(.5,.5*(l-d)/den)):0;
      leituras.push(c>195?pico+ajuste:e);
    }
    const pontos=[];
    for(let y=460;y<=750;y++){
      let soma=0,pesos=0;
      for(let k=-6;k<=6;k++){
        const w=Math.exp(-.5*(k/2.2)**2);
        soma+=w*leituras[Math.max(0,Math.min(leituras.length-1,y-460+k))];pesos+=w;
      }
      pontos.push([y,soma/pesos]);
    }
    return curvaMonotona(pontos);
  }

  function geometriaFaixa96(escala) {
    const g=geometriaParede(escala),r=geometria96;
    const eixo=eixoVerticalParede(g),eixoRef=eixoVerticalParede(r);
    const rel=escala/.96;
    g.alvo=curvaMonotona(Array.from({length:291},(_,i)=>{
      const y=460+i,q=eixoRef.destino(eixo.origem(y));
      return [y,bordaNormalReal(y)+(r.alvo(q)-bordaNormalReal(q))*rel];
    }));
    return {g,r,eixo,eixoRef,rel};
  }

  function comporFaixa96(imagem,escala=estado.comprimento/100) {
    const {g,r,eixo,eixoRef,rel}=geometriaFaixa96(escala);
    const amostraLimpa=new Uint8ClampedArray(4),amostraNormal=new Uint8ClampedArray(4);
    const normalFora=1-suaveQuintica(.70,.94,escala);
    const normalLuz=1-suaveQuintica(.88,.96,escala);
    const cx=peritoneoNormal(centro.y)+(847-peritoneoNormal(centro.y))*rel;
    imagem.data.set(referencia96.data);
    for(let y=481;y<730;y++){
      const sy=g.origemY(y),yr=r.destinoY(sy);
      const b=g.alvo(y),bRef=r.alvo(yr),p=g.derivada(g.alvo,y),pr=r.derivada(r.alvo,yr);
      const j=b-10*Math.hypot(1,p),jf=bRef-10*Math.hypot(1,pr);
      const u=posicaoPeritoneo(g,y,sy),uf=posicaoPeritoneo(r,yr,sy);
      const esquerda=Math.min(u-6,uf-6,Math.max(margemRetocada(y)+5,Math.min(u,uf,posicaoPeritoneo(r,y,r.origemY(y)))-26));
      const direita=limitePosterior(y);
      const pesoY=suaveQuintica(481,510,y)*(1-suaveQuintica(700,730,y));
      const temCavidade=y<700&&jf>uf+3&&j>u+3;
      const larguraLinha=Math.min(1.1,(j-u)*.17,(jf-uf)*.17);
      const xCavidade=temCavidade?curvaMonotona([[esquerda,esquerda],[u-larguraLinha,uf-larguraLinha],[u,uf],[u+larguraLinha,uf+larguraLinha],[j+3,jf+3]],1):x=>x;
      // A luz mantém a altura original, sem ser arrastada junto com as
      // junções. A mudança horizontal termina antes da parede posterior.
      const bLuzRef=r.alvo(y),fimLuz=Math.min(direita,Math.max(b+20,bLuzRef+20,paredeNormalContinua(y)+66));
      const mapaLuz=curvaMonotona([[b,bLuzRef],[b+5,bLuzRef+5],[fimLuz,fimLuz]],1);
      const xLuz=x=>x>=fimLuz?x:mapaLuz(x);
      const a=bordaNormalReal(y),fimLuzNormal=Math.min(direita,Math.max(b+19,a+66));
      const mapaLuzNormal=curvaMonotona([[b,a],[b+5,a+5],[fimLuzNormal,fimLuzNormal]],1);
      const xLuzNormal=x=>x>=fimLuzNormal?x:mapaLuzNormal(x);
      const limiteLimpo=peritoneoLimpo(y)-5;
      const pesoLimpo=(1-suaveQuintica(.4,.8,escala))*suaveQuintica(490,525,y)*(1-suaveQuintica(680,700,y));
      for(let x=Math.max(area.x,Math.ceil(Math.min(esquerda,b-24*Math.hypot(1,p))));x<direita;x++){
        let sx=x,yy=y,nx=x,ny=y,pesoNormal=0;
        if(temCavidade&&x>=esquerda){
          sx=x<=j+3?xCavidade(x):jf+3+(x-j-3);
          yy=y+(yr-y)*suaveQuintica(esquerda,u-3,x);
        }
        // O núcleo arredondado conserva a proporção exata nos dois eixos.
        // A faixa externa é a única parte que se acomoda à parede.
        const pesoNucleo=Math.abs(x-cx)<36*rel&&Math.abs(y-centro.y)<41*rel?
          1-suaveQuintica(.78,1.13,Math.hypot((x-cx)/(31*rel),(y-centro.y)/(36*rel))):0;
        if(pesoNucleo>0){
          sx+=(847+(x-cx)/rel-sx)*pesoNucleo;
          yy+=(centro.y+(y-centro.y)/rel-yy)*pesoNucleo;
        }
        if(x>=b-24*Math.hypot(1,p)){
          let px,py,pesoParede=1;
          if(x<b+18){
            // Correspondência sobre a mesma faixa da imagem de 96%.
            // A correção é feita nas coordenadas, antes de ler os pixels.
            let q=y+(x-b)*p/(1+p*p);
            q=Math.max(y-24,Math.min(y+24,q));
            for(let k=0;k<2;k++){
              const t=g.alvo(q),v=g.derivada(g.alvo,q),z=g.alvo(q+1)-2*t+g.alvo(q-1);
              const passo=(q-y+(t-x)*v)/Math.max(.7,1+v*v+(t-x)*z);
              q=Math.max(y-24,Math.min(y+24,q-Math.max(-4,Math.min(4,passo))));
            }
            const v=g.derivada(g.alvo,q),h=Math.hypot(1,v),n=((x-g.alvo(q))-(y-q)*v)/h;
            const qRef=eixoRef.destino(eixo.origem(q)),vRef=r.derivada(r.alvo,qRef),hRef=Math.hypot(1,vRef);
            px=x+r.alvo(qRef)+n/hRef-(g.alvo(q)+n/h);
            py=y+qRef-n*vRef/hRef-(q-n*v/h);
            pesoParede=suaveQuintica(-19,-12,n)*suaveQuintica(u+1.6,u+4.7,x)*(1-pesoNucleo);
            // Fora das junções, recuperar a textura na altura original,
            // sem transportar a dobra inferior para cima quando a falha
            // fica pequena. Dentro das junções a fonte é a imagem de 96%.
            const normalNaFaixa=normalFora*(1-suaveQuintica(520,544,qRef)*(1-suaveQuintica(680,700,qRef)));
            const v0=g.derivada(bordaNormalReal,q),h0=Math.hypot(1,v0);
            const n0=n+2.5*suaveQuintica(.8,7,Math.abs(b-a))*(1-suaveQuintica(-17,-8,n));
            nx=x+bordaNormalReal(q)+n0/h0-(g.alvo(q)+n/h);
            ny=y+q-n0*v0/h0-(q-n*v/h);
            const luz=suaveQuintica(b+3,b+18,x);
            px+=(xLuz(x)-px)*luz;py+=(y-py)*luz;
            nx+=(xLuzNormal(x)-nx)*luz;ny+=(y-ny)*luz;
            // Ambas as linhas claras já estão alinhadas. A luz normal
            // começa na própria borda, não depois de uma faixa iluminada
            // que poderia criar uma segunda sombra paralela.
            pesoNormal=pesoParede*(normalNaFaixa+(1-normalNaFaixa)*normalLuz*suaveQuintica(-1,2,n));
          }else{px=xLuz(x);py=y;nx=xLuzNormal(x);ny=y;pesoNormal=normalLuz;}
          sx+=(px-sx)*pesoParede;yy+=(py-yy)*pesoParede;
        }
        const peso=pesoY*(1-suaveQuintica(direita-8,direita,x));
        sx=x+(sx-x)*peso;yy=y+(yy-y)*peso;
        const i=((y-area.y)*area.w+x-area.x)*4;
        amostrar(sx,yy,imagem.data,i,referencia96);
        if(pesoNormal>0){
          // A mistura é restrita ao fundo da luz e aos trechos de parede
          // que voltaram à posição natural, com as bordas já alinhadas.
          amostrar(x+(nx-x)*peso,y+(ny-y)*peso,amostraNormal,0,fundoOriginal);
          for(let c=0;c<3;c++)imagem.data[i+c]+=(amostraNormal[c]-imagem.data[i+c])*pesoNormal*peso;
        }
        const limpo=pesoLimpo*suaveQuintica(esquerda,esquerda+12,x)*(1-suaveQuintica(u-10,u-2,x));
        if(limpo>0){
          const xLimpo=Math.min(limiteLimpo,x+(limiteLimpo-(u-3))*suaveQuintica(esquerda,u-3,x));
          amostrar(xLimpo,y,amostraLimpa,0,fundoLimpo);
          for(let c=0;c<3;c++)imagem.data[i+c]+=(amostraLimpa[c]-imagem.data[i+c])*limpo;
        }
      }
    }
  }

  function construirComposicao(tamanho) {
    const imagem=ctx.createImageData(area.w,area.h);
    const valores={comprimento:tamanho,profundidade:tamanho};
    if(tamanho===100)imagem.data.set(referencia.data);
    else if(tamanho<96)comporFaixa96(imagem,tamanho/100);
    else if(tamanho<100){
      imagem.data.set(referencia.data);
      comporParedeContinua(imagem,tamanho/100);
    }else{
      imagem.data.set(fundoSemFalha.data);
      comporFalha(imagem,valores);
      continuidadeInferior(imagem,valores);
    }
    return imagem;
  }

  function estimarParedeDaComposicao(tamanho) {
    if(tamanho<96)return geometriaFaixa96(tamanho/100).g.alvo;
    if(tamanho<100)return geometriaParede(tamanho/100).alvo;
    if(tamanho===100)return paredeFalhaContinua;
    const escala=tamanho/100;
    return y=>{
      const sy=centro.y+(y-centro.y)/escala;
      return limiteNaAltura(paredeOriginal,y)+saliencia(sy)*escala*suavizar(510,540,sy)*(1-suavizar(680,710,sy));
    };
  }

  function prepararReferenciasSombra() {
    // Daniel indicou que a sombra está correta fora de 92–101%. Usamos
    // os dois tamanhos imediatamente vizinhos para uma transição contínua.
    return [91,102].map(tamanho=>{
      const imagem=construirComposicao(tamanho);
      return {imagem,contorno:contornoDaSombra(imagem,estimarParedeDaComposicao(tamanho))};
    });
  }

  function contornoDaSombra(imagem,estimativa) {
    const pontos=[],limites=[];
    const pixel=(x,y)=>{
      const i=((y-area.y)*area.w+x-area.x)*4;
      const [r,g,b]=[imagem.data[i],imagem.data[i+1],imagem.data[i+2]];
      return [(r+g+b)/3,r-b];
    };
    for(let y=460;y<=750;y++){
      const e=estimativa(y),h=Math.hypot(1,estimativa(y+.5)-estimativa(y-.5));
      let pico=Math.round(e),melhor=-Infinity;
      // A luz intestinal também pode ser clara. Prioriza a faixa de tecido
      // de cor marfim na posição anatômica, não um reflexo dentro da luz.
      for(let x=Math.round(e)-3;x<=Math.round(e)+3;x++){
        const [l,c]=pixel(x,y),nota=l-.55*c-8*Math.abs(x-e);
        if(nota>melhor){melhor=nota;pico=x;}
      }
      const [lp,cp]=pixel(pico,y);
      let fim=pico;
      for(let x=pico+1;x<=pico+Math.ceil(2*h);x++){
        const [l,c]=pixel(x,y);
        if(l<lp-24||c>cp+18)break;
        fim=x;
      }
      limites.push(fim);
      pontos.push([y,pico]);
    }
    const suave=curvaMonotona(pontos.map(([y],i)=>{
      let soma=0,n=0;
      for(let k=-5;k<=5;k++){
        const w=Math.exp(-.5*(k/2.5)**2);
        soma+=pontos[Math.max(0,Math.min(pontos.length-1,i+k))][1]*w;n+=w;
      }
      return [y,soma/n];
    }));
    return {borda:suave,primeiro:y=>limites[Math.max(0,Math.min(limites.length-1,Math.round(y)-460))]+1};
  }

  function corrigirApenasSombra(imagem,tamanho) {
    if(tamanho<92||tamanho>101||!referenciasSombra)return;
    const contorno=contornoDaSombra(imagem,estimarParedeDaComposicao(tamanho));
    const [menor,maior]=referenciasSombra,fracao=suavizar(91,102,tamanho);
    const amostraMenor=new Uint8ClampedArray(4),amostraMaior=new Uint8ClampedArray(4),amostraAtual=new Uint8ClampedArray(4);
    const inclinacao=(curva,y)=>Math.hypot(1,curva(y+.5)-curva(y-.5));
    // Separa a iluminação dos pormenores da textura. A diferença de cor
    // é calculada em faixas paralelas à parede e suavizada antes de ser
    // aplicada. Nenhum contorno ou detalhe de um outro tamanho é colado.
    const y0=488,y1=727,passos=33,linhas=y1-y0+1;
    const diferencas=new Float32Array(linhas*passos*3),horizontal=new Float32Array(diferencas.length),luz=new Float32Array(diferencas.length);
    const indice=(y,n,c)=>((y-y0)*passos+n)*3+c;
    for(let y=y0;y<=y1;y++){
      const b=contorno.borda(y),h=inclinacao(contorno.borda,y);
      const fim=Math.min(limitePosterior(y),b+32*h),maximo=(fim-b)/h;
      const pMenor=menor.contorno.borda(y),pMaior=maior.contorno.borda(y);
      const hMenor=inclinacao(menor.contorno.borda,y),hMaior=inclinacao(maior.contorno.borda,y);
      for(let n=0;n<passos;n++){
        const d=Math.min(n,maximo),x=b+d*h;
        const local=1-suaveQuintica(Math.max(7,maximo-12),maximo,d);
        const xm=Math.max(menor.contorno.primeiro(y),x+(pMenor+d*hMenor-x)*local);
        const xM=Math.max(maior.contorno.primeiro(y),x+(pMaior+d*hMaior-x)*local);
        amostrar(xm,y,amostraMenor,0,menor.imagem);
        amostrar(xM,y,amostraMaior,0,maior.imagem);
        amostrar(Math.max(contorno.primeiro(y),x),y,amostraAtual,0,imagem);
        for(let c=0;c<3;c++)diferencas[indice(y,n,c)]=amostraMenor[c]+(amostraMaior[c]-amostraMenor[c])*fracao-amostraAtual[c];
      }
    }
    for(let y=y0;y<=y1;y++)for(let n=0;n<passos;n++)for(let c=0;c<3;c++){
      let valor=0;
      for(let k=-2;k<=2;k++)valor+=[1,4,6,4,1][k+2]*diferencas[indice(y,Math.max(0,Math.min(passos-1,n+k)),c)];
      horizontal[indice(y,n,c)]=valor/16;
    }
    const pesos=Array.from({length:15},(_,i)=>Math.exp(-.5*((i-7)/3)**2)),total=pesos.reduce((a,b)=>a+b,0);
    for(let y=y0;y<=y1;y++)for(let n=0;n<passos;n++)for(let c=0;c<3;c++){
      let valor=0;
      for(let k=-7;k<=7;k++)valor+=pesos[k+7]*horizontal[indice(Math.max(y0,Math.min(y1,y+k)),n,c)];
      luz[indice(y,n,c)]=valor/total;
    }
    for(let y=493;y<722;y++){
      const b=contorno.borda(y),h=inclinacao(contorno.borda,y),fim=Math.min(limitePosterior(y),b+32*h);
      const pesoY=suaveQuintica(493,525,y)*(1-suaveQuintica(695,722,y));
      for(let x=Math.max(contorno.primeiro(y),Math.ceil(b+1.2*h));x<fim;x++){
        const d=(x-b)/h,peso=suaveQuintica(1.2,3.4,d)*(1-suaveQuintica(fim-9,fim,x))*pesoY;
        if(peso<=0)continue;
        const n=Math.min(passos-2,Math.floor(d)),t=d-n;
        const delta=[0,1,2].map(c=>luz[indice(y,n,c)]*(1-t)+luz[indice(y,n+1,c)]*t);
        const media=(delta[0]+delta[1]+delta[2])/3;
        // Corrige a sombra sem criar um reflexo claro de outro tamanho.
        const limite=media>5?5/media:1;
        const i=((y-area.y)*area.w+x-area.x)*4;
        for(let c=0;c<3;c++)imagem.data[i+c]+=delta[c]*peso*limite;
      }
    }
  }

  function desenhar() {
    quadro=0;
    if (!referencia) return;
    ctx.clearRect(0,0,tela.width,tela.height);
    ctx.drawImage(uteroOriginal,0,0);
    const imagem=construirComposicao(estado.comprimento);
    corrigirApenasSombra(imagem,estado.comprimento);
    ctx.putImageData(imagem,area.x,area.y);
  }

  function atualizarControles() {
    for(const [campo,controle] of [['comprimento',comprimento],['profundidade',profundidade]]) {
      controle.value=estado[campo];
      controle.setAttribute('aria-valuetext',estado[campo]+'%');
      painel.querySelector(`[data-falha-valor="${campo}"]`).textContent=estado[campo]+'%';
    }
  }

  function validar(valores) {
    if(valores===undefined)return;
    // Montagens antigas com até 125% continuam legíveis, porém são
    // restauradas no novo limite de 100%. Não oferecem mais ampliação.
    if(!valores || ['comprimento','profundidade'].some(c=>!Number.isInteger(valores[c])||valores[c]<minimo||valores[c]>limiteAntigo))
      throw Error('Dimensões da falha peritoneal inválidas. O mapa aberto foi preservado.');
  }

  function restaurar(valores) {
    validar(valores);
    const tamanho=valores?limitarTamanho(valores.comprimento):tamanhoInicial;
    estado={comprimento:tamanho,profundidade:tamanho};
    atualizarControles();
    if(quadro)cancelAnimationFrame(quadro);
    desenhar();
  }

  for(const [campo,controle] of [['comprimento',comprimento],['profundidade',profundidade]]) {
    controle.addEventListener('input',()=>{
      estado.comprimento=estado.profundidade=limitarTamanho(Number(controle.value));
      atualizarControles();
      if(!quadro)quadro=requestAnimationFrame(desenhar);
    });
  }
  painel.querySelector('[data-falha-restaurar]').addEventListener('click',()=>restaurar());

  function carregar(src) {
    const img=new Image();
    img.src=src;
    return img.decode().then(()=>img);
  }
  const pronto=Promise.all([
    carregar('assets/mapa-base-sagital-novo-visitante-suave.png'),
    carregar('assets/mapas-especiais/falha-peritoneal-retocada.png'),
    carregar('assets/mapas-especiais/falha-peritoneal-fundo-limpo.png'),
    window.endomapaCriarUtero(uteroOriginal)
  ]).then(([base,arte,limpo])=>{
    referencia=preparar(base,arte,limpo);
    fundoSemFalha=prepararFundoSemFalha();
    referencia96=ctx.createImageData(area.w,area.h);
    referencia96.data.set(referencia.data);
    comporParedeContinua(referencia96,.96);
    geometria96=geometriaParede(.96);
    geometria96.alvo=extrairBordaClara(referencia96,geometria96.alvo);
    bordaNormalReal=extrairBordaClara(fundoOriginal,paredeNormalContinua);
    referenciasSombra=prepararReferenciasSombra();
    painel.querySelectorAll('input,button').forEach(el=>el.disabled=false);
    desenhar();
  }).catch(erro=>{
    painel.querySelector('[data-falha-aviso]').textContent='Não foi possível carregar a imagem da falha peritoneal.';
    throw erro;
  });

  window.endocartaFalhaPeritoneal={
    id,pronto,estado:()=>({...estado}),validar,restaurar,
    fotografar(vista) {
      if(vista!==id)return null;
      if(!referencia)throw Error('Aguarde o carregamento da falha peritoneal.');
      if(quadro){cancelAnimationFrame(quadro);desenhar();}
      const copia=document.createElement('canvas');
      copia.width=tela.width;copia.height=tela.height;
      copia.getContext('2d').drawImage(tela,0,0);
      return copia;
    }
  };
  atualizarControles();
})();
