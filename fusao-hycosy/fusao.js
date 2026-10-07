"use strict";
(() => {
  const raiz = document.querySelector("[data-fusao-host]")?.shadowRoot || document;
  const $ = id => raiz.getElementById(id);
  const original = $("origem"), resultado = $("resultado");
  const ctxO = original.getContext("2d"), ctxR = resultado.getContext("2d");
  const textura = document.createElement("canvas"), ctxT = textura.getContext("2d", {willReadFrequently:true});
  const sombra = document.createElement("canvas"), ctxS = sombra.getContext("2d");
  const camada = document.createElement("canvas");
  const baseColorida = document.createElement("canvas"), ctxB = baseColorida.getContext("2d", {willReadFrequently:true});
  let baseEmCache = null, chaveBase = "";
  const gl = camada.getContext("webgl", {alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:true});
  let base = null, hycosy = null, selecao = null, pontos = [], modo = "retangulo", gesto = null;
  let area = null, temPixels = false, quadro = 0, precisaTextura = false, falhaGL = !gl;
  let carregando = 0, exportando = false;
  const versoes = {base:0,hycosy:0};
  const iniciais = {x:50,y:56,escala:60,largura:100,altura:100,giro:0,rx:0,ry:0,opacidade:85,contraste:100,brilho:180,colorir:0,cabecalho:12};
  const valor = id => Number($(id).value);
  const limitar = (n,a,b) => Math.max(a,Math.min(b,n));
  function estado(texto, erro = false) { $("estado").textContent = texto; $("estado").classList.toggle("erro",erro); }
  function saidas() {
    $("transparencia").value=100-valor("opacidade");
    raiz.querySelectorAll("output[for]").forEach(o => {const c=$(o.htmlFor); o.value=c.value+(c.dataset.unidade ? " "+c.dataset.unidade : "");});
  }
  let programa, buffer, tex, texSombra;
  function shader(tipo, fonte) {
    const s=gl.createShader(tipo); gl.shaderSource(s,fonte); gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw new Error("Não foi possível preparar a perspectiva neste navegador.");
    return s;
  }
  try {
    if(gl){
      programa=gl.createProgram();
      gl.attachShader(programa,shader(gl.VERTEX_SHADER,"attribute vec4 pos; attribute vec2 uv; varying vec2 v; void main(){gl_Position=pos;v=uv;}"));
      gl.attachShader(programa,shader(gl.FRAGMENT_SHADER,"precision mediump float; varying vec2 v; uniform sampler2D imagem; void main(){gl_FragColor=texture2D(imagem,v);}"));
      gl.linkProgram(programa);
      if(!gl.getProgramParameter(programa,gl.LINK_STATUS)) throw new Error("Perspectiva indisponível.");
      buffer=gl.createBuffer();tex=gl.createTexture();texSombra=gl.createTexture();
      for(const texturaGL of [tex,texSombra]){
      gl.bindTexture(gl.TEXTURE_2D,texturaGL);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      }
    }
  } catch {falhaGL=true;}
  camada.addEventListener("webglcontextlost",e=>{e.preventDefault();falhaGL=true;estado("A visualização perdeu o acesso gráfico. Reabra esta página e carregue as imagens novamente.",true);habilitar();});
  function habilitar(){
    $("baixar").disabled=!(base && hycosy && temPixels) || falhaGL || carregando>0 || exportando || pontos.length>0;
    $("baixar-pdf").disabled=$("baixar").disabled;
    $("baixar-jpeg").disabled=$("baixar").disabled;
    $("repor").disabled=!(base || hycosy);
    $("fusao-clara").disabled=!hycosy;
    $("recorte-inicial").disabled=!hycosy;
    $("fechar").disabled=pontos.length<3;
    $("voltar-ponto").disabled=!pontos.length;
  }
  function agendar(mudarTextura=false){
    precisaTextura ||= mudarTextura;
    if(!quadro)quadro=setTimeout(()=>{quadro=0;atualizar();},16);
  }
  function atualizar(){
    saidas();
    if(precisaTextura){precisaTextura=false;recortar();}
    desenharOrigem();desenharResultado();habilitar();
  }
  function selecaoInicial(){
    if(!hycosy)return;
    const w=hycosy.width,h=hycosy.height;
    selecao=[[w*.16,h*.17],[w*.86,h*.17],[w*.86,h*.87],[w*.16,h*.87]];
    pontos=[];agendar(true);
  }
  function caminho(ctx,lista){ctx.beginPath();lista.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();}
  function desenharOrigem(){
    ctxO.clearRect(0,0,original.width,original.height);
    if(!hycosy)return;
    ctxO.drawImage(hycosy,0,0);
    if(selecao){
      ctxO.save();ctxO.fillStyle="rgba(0,0,0,.58)";ctxO.beginPath();ctxO.rect(0,0,original.width,original.height);
      selecao.forEach((p,i)=>i?ctxO.lineTo(...p):ctxO.moveTo(...p));ctxO.closePath();ctxO.fill("evenodd");
      caminho(ctxO,selecao);ctxO.strokeStyle="#64ffba";ctxO.lineWidth=Math.max(2,original.width/400);ctxO.stroke();ctxO.restore();
    }
    if(pontos.length){
      ctxO.save();ctxO.strokeStyle="#ffe29a";ctxO.fillStyle="#ffe29a";ctxO.lineWidth=Math.max(2,original.width/400);
      ctxO.beginPath();pontos.forEach((p,i)=>i?ctxO.lineTo(...p):ctxO.moveTo(...p));ctxO.stroke();
      pontos.forEach(p=>{ctxO.beginPath();ctxO.arc(...p,original.width/180,0,Math.PI*2);ctxO.fill();});ctxO.restore();
    }
  }
  function recortar(){
    temPixels=false;
    if(!hycosy || !selecao)return;
    const xs=selecao.map(p=>p[0]),ys=selecao.map(p=>p[1]);
    area={x:Math.floor(Math.min(...xs)),y:Math.floor(Math.min(...ys)),w:Math.ceil(Math.max(...xs))-Math.floor(Math.min(...xs)),h:Math.ceil(Math.max(...ys))-Math.floor(Math.min(...ys))};
    if(area.w<2 || area.h<2)return;
    textura.width=area.w;textura.height=area.h;
    ctxT.save();ctxT.translate(-area.x,-area.y);caminho(ctxT,selecao);ctxT.clip();ctxT.drawImage(hycosy,0,0);ctxT.restore();
    const dados=ctxT.getImageData(0,0,area.w,area.h),d=dados.data;
    sombra.width=area.w;sombra.height=area.h;
    const dadosSombra=ctxS.createImageData(area.w,area.h),s=dadosSombra.data;
    const corte=valor("limiar"),borda=valor("suavidade"),contraste=valor("contraste")/100,brilho=valor("brilho")/100,mistura=valor("colorir")/100;
    const cor=$("cor").value.match(/[a-f0-9]{2}/gi).map(v=>parseInt(v,16));
    const preservar=$("preservar-relevo").checked;
    // Curva contínua: realça luminosidade sem achatar altas luzes por corte em 255.
    const curva=new Float32Array(256);
    for(let n=0;n<256;n++){
      const t=n/255,a=Math.pow(t,contraste),b=Math.pow(1-t,contraste);
      const contrasteSuave=a/(a+b);
      curva[n]=255*brilho*contrasteSuave/(1+(brilho-1)*contrasteSuave);
    }
    const tonalizar=n=>{
      if(!preservar)return limitar(((n-127.5)*contraste+127.5)*brilho,0,255);
      const limitado=limitar(n,0,255),baixo=Math.floor(limitado),alto=Math.min(255,baixo+1);
      return curva[baixo]+(curva[alto]-curva[baixo])*(limitado-baixo);
    };
    for(let i=0;i<d.length;i+=4){
      // A máscara usa a cor original: aumentar brilho não recupera fundo removido.
      const intensidade=Math.max(d[i],d[i+1],d[i+2]);
      d[i+3]=Math.round(d[i+3]*limitar((intensidade-corte)/borda,0,1));
      if(d[i+3])temPixels=true;
      const luminancia=.2126*d[i]+.7152*d[i+1]+.0722*d[i+2];
      // O detalhe vem da imagem original, antes do tingimento: preto não apaga a textura.
      const detalhe=tonalizar(luminancia);
      s[i+3]=d[i+3];
      for(let c=0;c<3;c++){
        s[i+c]=255-detalhe*(1-cor[c]/255);
        const tingido=luminancia*cor[c]/(preservar?255:160);
        d[i+c]=tonalizar(d[i+c]*(1-mistura)+tingido*mistura);
      }
    }
    ctxT.putImageData(dados,0,0);
    ctxS.putImageData(dadosSombra,0,0);
    if(gl && !falhaGL){
      gl.bindTexture(gl.TEXTURE_2D,tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,textura);
      gl.bindTexture(gl.TEXTURE_2D,texSombra);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,sombra);
    }
    if(!temPixels)estado("O recorte ficou vazio. Amplie a seleção ou diminua a retirada do fundo escuro.",true);
  }
  function projetar(texturaGL=tex){
    const w=base.width,h=base.height;
    if(camada.width!==w || camada.height!==h){camada.width=w;camada.height=h;}
    gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
    const rad=Math.PI/180,ax=valor("rx")*rad,ay=valor("ry")*rad,az=valor("giro")*rad;
    const largura=area.w*valor("largura")/100,altura=area.h*valor("altura")/100;
    const escala=w*valor("escala")/100/area.w,focal=Math.max(largura,altura)*2;
    const vertices=[];
    for(const [u,v] of [[0,0],[1,0],[0,1],[1,1]]){
      let x=(u-.5)*largura,y=(v-.5)*altura,z=0;
      z=y*Math.sin(ax);y*=Math.cos(ax);
      const novoX=x*Math.cos(ay)+z*Math.sin(ay);z=-x*Math.sin(ay)+z*Math.cos(ay);x=novoX;
      const giradoX=x*Math.cos(az)-y*Math.sin(az);y=x*Math.sin(az)+y*Math.cos(az);x=giradoX;
      const q=1-z/focal;
      const px=x*escala+w*valor("x")/100*q,py=y*escala+h*valor("y")/100*q;
      vertices.push(2*px/w-q,q-2*py/h,0,q,u,v);
    }
    gl.useProgram(programa);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.DYNAMIC_DRAW);
    const pos=gl.getAttribLocation(programa,"pos"),uv=gl.getAttribLocation(programa,"uv");
    gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,4,gl.FLOAT,false,24,0);
    gl.enableVertexAttribArray(uv);gl.vertexAttribPointer(uv,2,gl.FLOAT,false,24,16);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texturaGL);gl.uniform1i(gl.getUniformLocation(programa,"imagem"),0);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  }
  function obterBaseColorida(){
    const mistura=valor("colorir-base")/100;
    if(!mistura)return base;
    const chave=[$("cor-base").value,mistura,valor("cabecalho")].join(":");
    if(baseEmCache===base && chaveBase===chave)return baseColorida;
    baseColorida.width=base.width;baseColorida.height=base.height;ctxB.drawImage(base,0,0);
    const topo=Math.ceil(base.height*valor("cabecalho")/100);
    const dados=ctxB.getImageData(0,topo,base.width,base.height-topo),d=dados.data;
    const cor=$("cor-base").value.match(/[a-f0-9]{2}/gi).map(v=>parseInt(v,16));
    for(let i=0;i<d.length;i+=4){
      const luminancia=.2126*d[i]+.7152*d[i+1]+.0722*d[i+2];
      for(let c=0;c<3;c++)d[i+c]=limitar(d[i+c]*(1-mistura)+luminancia*cor[c]/160*mistura,0,255);
    }
    ctxB.putImageData(dados,0,topo);baseEmCache=base;chaveBase=chave;
    return baseColorida;
  }
  function desenharResultado(forcarComposicao=false){
    ctxR.clearRect(0,0,resultado.width,resultado.height);
    if(!base)return;
    const comparar=$("comparar").checked && !forcarComposicao;
    ctxR.drawImage(comparar ? base : obterBaseColorida(),0,0);
    if(!hycosy || !temPixels || falhaGL || comparar)return;
    ctxR.save();ctxR.beginPath();
    const topo=Math.ceil(base.height*valor("cabecalho")/100);
    ctxR.rect(0,topo,base.width,base.height-topo);ctxR.clip();
    const clara=$("modo-fusao").value==="screen",opacidade=valor("opacidade")/100;
    const rgb=$("cor").value.match(/[a-f0-9]{2}/gi).map(v=>parseInt(v,16));
    const luzCor=.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
    const transicao=limitar((160-luzCor)/80,0,1);
    const pesoEscuro=clara ? transicao*transicao*(3-2*transicao)*limitar(valor("colorir")/100*3,0,1) : 0;
    // Nos últimos 20 pontos de opacidade, a fusão cede suavemente à camada sólida.
    // No limite de 0% de transparência, nenhum pixel sólido depende da cor da base.
    const solidez=limitar((opacidade-.8)/.2,0,1);
    const cobertura=clara ? solidez*solidez*(3-2*solidez) : 0;
    // Dentro da mesma fusão, tons claros iluminam e tons escuros marcam os detalhes.
    if(pesoEscuro<1 && cobertura<1){
      projetar();ctxR.globalAlpha=opacidade*(1-pesoEscuro);
      ctxR.globalCompositeOperation=clara ? "screen" : "source-over";ctxR.drawImage(camada,0,0);
    }
    if(pesoEscuro>0 && cobertura<1){
      projetar(texSombra);ctxR.globalAlpha=opacidade*pesoEscuro;
      ctxR.globalCompositeOperation="multiply";ctxR.drawImage(camada,0,0);
    }
    if(cobertura>0){
      projetar();ctxR.globalAlpha=cobertura;
      ctxR.globalCompositeOperation="source-over";ctxR.drawImage(camada,0,0);
    }
    ctxR.restore();
  }
  async function carregar(tipo,arquivo){
    if(!arquivo)return;
    const versao=++versoes[tipo];carregando++;habilitar();
    let url;
    try{
      if(!["image/png","image/jpeg","image/webp"].includes(arquivo.type))throw new Error("Escolha uma imagem JPG, PNG ou WebP.");
      if(arquivo.size>30*1024*1024)throw new Error("A imagem excede 30 MB. Exporte uma cópia menor para carregar.");
      url=URL.createObjectURL(arquivo);const img=new Image();img.src=url;
      try{await img.decode();}catch{throw new Error("Não foi possível ler esta imagem. Escolha outro arquivo JPG, PNG ou WebP.");}
      if(versao!==versoes[tipo])return;
      if(img.width>4096 || img.height>4096 || img.width*img.height>12000000)throw new Error("A imagem ultrapassa o limite de tamanho indicado. Use uma cópia menor; o original não foi alterado.");
      if(gl && (img.width>gl.getParameter(gl.MAX_TEXTURE_SIZE) || img.height>gl.getParameter(gl.MAX_TEXTURE_SIZE) || img.width>gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) || img.height>gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)))throw new Error("Esta imagem excede a capacidade gráfica deste aparelho.");
      if(tipo==="base"){
        base=img;baseEmCache=null;restaurarCorBase();resultado.width=img.width;resultado.height=img.height;$("vazio-base").hidden=true;
      }else{
        hycosy=img;original.width=img.width;original.height=img.height;$("vazio-origem").hidden=true;selecaoInicial();
        restaurar(false);
      }
      estado(base && hycosy ? "Imagens carregadas. Confira a seleção da Hycosy e ajuste seu alinhamento sobre o 3D." : "Imagem carregada. Selecione também a outra parte do exame.");
      if(falhaGL)estado("Este navegador não disponibilizou o recurso gráfico para a perspectiva. Tente abrir no Chrome ou Edge com aceleração gráfica ativada.",true);
      agendar(true);
    }catch(e){if(versao===versoes[tipo])estado(e instanceof Error && e.message ? e.message : "Não foi possível abrir a imagem. Tente outro arquivo.",true);}
    finally{if(url)URL.revokeObjectURL(url);carregando--;habilitar();}
  }
  function restaurarCorBase(){$("cor-base").value="#efb65d";$("colorir-base").value=0;}
  function restaurar(incluirBase=true){Object.entries(iniciais).forEach(([id,v])=>$(id).value=v);$("preservar-relevo").checked=true;$("modo-fusao").value="screen";$("cor").value="#efb65d";if(incluirBase)restaurarCorBase();$("comparar").checked=false;agendar(true);}
  function posicao(e,canvas){const r=canvas.getBoundingClientRect();return [limitar((e.clientX-r.left)/r.width*canvas.width,0,canvas.width),limitar((e.clientY-r.top)/r.height*canvas.height,0,canvas.height)];}
  original.addEventListener("pointerdown",e=>{
    if(!hycosy || gesto || e.button>0)return;
    const p=posicao(e,original);
    if(modo==="contorno"){pontos.push(p);habilitar();agendar();return;}
    gesto={tipo:"recorte",id:e.pointerId,inicio:p,anterior:selecao};original.setPointerCapture(e.pointerId);
  });
  original.addEventListener("pointermove",e=>{
    if(gesto?.tipo!=="recorte" || gesto.id!==e.pointerId)return;
    const [x,y]=gesto.inicio,[x2,y2]=posicao(e,original);
    selecao=[[Math.min(x,x2),Math.min(y,y2)],[Math.max(x,x2),Math.min(y,y2)],[Math.max(x,x2),Math.max(y,y2)],[Math.min(x,x2),Math.max(y,y2)]];agendar();
  });
  function terminarRecorte(e,cancelado=false){
    if(gesto?.tipo!=="recorte" || gesto.id!==e.pointerId)return;
    const [x,y]=gesto.inicio,p=posicao(e,original);
    if(cancelado || Math.abs(x-p[0])<5 || Math.abs(y-p[1])<5)selecao=gesto.anterior;
    gesto=null;agendar(true);
  }
  original.addEventListener("pointerup",e=>terminarRecorte(e));original.addEventListener("pointercancel",e=>terminarRecorte(e,true));
  resultado.addEventListener("pointerdown",e=>{
    if(!base || !hycosy || $("comparar").checked || gesto || e.button>0)return;
    gesto={tipo:"mover",id:e.pointerId,inicio:posicao(e,resultado),x:valor("x"),y:valor("y")};resultado.setPointerCapture(e.pointerId);
  });
  resultado.addEventListener("pointermove",e=>{
    if(gesto?.tipo!=="mover" || gesto.id!==e.pointerId)return;
    const p=posicao(e,resultado);$("x").value=limitar(gesto.x+(p[0]-gesto.inicio[0])*100/base.width,-50,150);$("y").value=limitar(gesto.y+(p[1]-gesto.inicio[1])*100/base.height,-50,150);agendar();
  });
  for(const evento of ["pointerup","pointercancel"])resultado.addEventListener(evento,e=>{if(gesto?.tipo==="mover" && gesto.id===e.pointerId)gesto=null;});
  for(const id of ["retangulo","contorno"])$(id).addEventListener("click",()=>{
    modo=id;pontos=[];$("retangulo").setAttribute("aria-pressed",id==="retangulo");$("contorno").setAttribute("aria-pressed",id==="contorno");
    $("ajuda-recorte").textContent=id==="contorno"?"Toque em pontos ao redor da região, em ordem, sem cruzar as linhas. Depois toque em Aplicar contorno.":"Arraste sobre a imagem para substituir a seleção inicial.";agendar();
  });
  $("fechar").addEventListener("click",()=>{if(pontos.length>=3){selecao=pontos.slice();pontos=[];agendar(true);}});
  $("voltar-ponto").addEventListener("click",()=>{pontos.pop();agendar();});
  $("recorte-inicial").addEventListener("click",selecaoInicial);
  $("repor").addEventListener("click",()=>restaurar());
  $("modo-fusao").addEventListener("change",()=>{$("comparar").checked=false;agendar();});
  $("preservar-relevo").addEventListener("change",()=>{$("comparar").checked=false;agendar(true);});
  $("fusao-clara").addEventListener("click",()=>{
    $("modo-fusao").value="screen";
    Object.entries({opacidade:85,brilho:180,contraste:100,colorir:0,limiar:8,suavidade:8}).forEach(([id,v])=>$(id).value=v);
    $("comparar").checked=false;agendar(true);
    estado("Fusão clara aplicada. Confira os detalhes da Hycosy e refine a luminosidade e a intensidade. Posição e angulação foram mantidas.");
  });
  for(const tipo of ["base","hycosy"])$(tipo).addEventListener("change",e=>carregar(tipo,e.target.files[0]));
  raiz.querySelectorAll("input[type=range],input[type=color]").forEach(c=>{
    const mudar=()=>{
      if(c.id==="transparencia"){$("opacidade").value=100-valor("transparencia");$("comparar").checked=false;}
      if(c.id==="cor" && valor("colorir")===0)$("colorir").value=100;
      if(c.id==="cor-base" && valor("colorir-base")===0)$("colorir-base").value=100;
      if(["cor","colorir","cor-base","colorir-base"].includes(c.id))$("comparar").checked=false;
      agendar(["limiar","suavidade","contraste","brilho","colorir","cor"].includes(c.id));
    };
    c.addEventListener("input",mudar);
    if(c.type==="color")c.addEventListener("change",mudar);
  });
  $("comparar").addEventListener("change",()=>agendar());
  function baixarImagem(formato){
    if($("baixar").disabled)return;
    exportando=true;habilitar();
    try{
      if(quadro){clearTimeout(quadro);quadro=0;}atualizar();desenharResultado(true);
      let captura=resultado;
      if(formato==='jpeg'){
        captura=document.createElement('canvas');captura.width=resultado.width;captura.height=resultado.height;
        const ctx=captura.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,captura.width,captura.height);ctx.drawImage(resultado,0,0);
      }
      captura.toBlob(blob=>{
        try{
          if(!blob)throw new Error();
          const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`endomapa-fusao-hycosy.${formato==='jpeg'?'jpg':'png'}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
          estado(`Composição ${formato.toUpperCase()} preparada nas dimensões da imagem 3D. Os arquivos originais foram preservados.`);
        }catch{estado(`Não foi possível preparar o ${formato.toUpperCase()}. As imagens continuam na tela.`,true);}
        finally{exportando=false;desenharResultado();habilitar();}
      },`image/${formato}`,0.95);
      desenharResultado();
    }catch{exportando=false;estado("Não foi possível exportar. As imagens continuam na tela.",true);habilitar();}
  }
  $("baixar").addEventListener("click",()=>baixarImagem('png'));
  $("baixar-jpeg").addEventListener("click",()=>baixarImagem('jpeg'));
  $("baixar-pdf").addEventListener("click",async()=>{
    if($("baixar-pdf").disabled)return;
    exportando=true;habilitar();
    try{
      if(quadro){clearTimeout(quadro);quadro=0;}atualizar();
      if(!base || !hycosy || !temPixels)throw new Error("Montagem vazia.");
      desenharResultado(true);
      const captura=document.createElement("canvas");captura.width=resultado.width;captura.height=resultado.height;
      captura.getContext("2d").drawImage(resultado,0,0);
      desenharResultado();estado("Preparando PDF A4…");
      await new Promise(r=>setTimeout(r,0));
      const blob=window.hycosyGerarPdf(captura);
      const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="endomapa-fusao-hycosy.pdf";a.click();
      setTimeout(()=>URL.revokeObjectURL(url),60000);
      estado("PDF A4 preparado com a composição completa, sem cortes e com as proporções preservadas.");
    }catch{estado("Não foi possível gerar o PDF. As imagens e os ajustes continuam disponíveis.",true);}
    finally{exportando=false;desenharResultado();habilitar();}
  });
  $("limpar").addEventListener("click",()=>{
    if((base || hycosy) && !confirm("Descartar as imagens e os ajustes desta aba?"))return;
    versoes.base++;versoes.hycosy++;base=null;hycosy=null;selecao=null;area=null;pontos=[];temPixels=false;gesto=null;
    $("base").value="";$("hycosy").value="";$("vazio-base").hidden=false;$("vazio-origem").hidden=false;
    textura.width=1;textura.height=1;camada.width=1;camada.height=1;baseColorida.width=1;baseColorida.height=1;baseEmCache=null;
    estado("Imagens retiradas desta aba. Carregue um novo par para começar.");restaurar();
  });
  saidas();habilitar();
})();
