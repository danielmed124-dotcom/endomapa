"use strict";
(async()=>{
 const relatorio=document.getElementById("relatorio"),frame=document.getElementById("pagina"),logs=[];
 const pausa=ms=>new Promise(r=>setTimeout(r,ms));
 const afirmar=(ok,msg)=>{if(!ok)throw new Error(msg);logs.push("OK: "+msg);};
 const esperar=async fn=>{for(let i=0;i<200;i++){if(fn())return;await pausa(30);}throw new Error("Espera excedida");};
 try{
  const html=await (await fetch("../app.html")).text();
  const doc=new DOMParser().parseFromString(html,"text/html");
  doc.querySelectorAll("script").forEach(s=>s.remove());
  const base=doc.createElement("base");base.href=new URL("../",location.href).href;doc.head.prepend(base);
  doc.body.classList.remove("autenticacao-pendente");
  const carregou=new Promise(r=>frame.onload=r);frame.srcdoc=doc.documentElement.outerHTML;await carregou;
  const w=frame.contentWindow,d=w.document;
  async function script(src){await new Promise((r,e)=>{const s=d.createElement("script");s.src=src;s.onload=r;s.onerror=e;d.body.append(s);});}
  await script("prototipo.js");await script("assets/vendor/jspdf-4.2.1.umd.min.js");await script("fusao-integracao.js");
  const botoes=d.querySelectorAll('[data-tela="novo-mapa"] .acoes button');
  afirmar(botoes[0].textContent==="Montar mapa de endometriose manualmente","Botão de endometriose renomeado");
  afirmar(botoes[1].textContent==="Fusão de imagens 3D/Hycosy","Novo botão logo após o editor manual");
  botoes[1].click();await pausa(100);
  const host=d.querySelector("[data-fusao-host]");
  afirmar(!host.shadowRoot,"Ferramenta aguarda perfil autenticado");
  w.endomapaMedico={id:"teste",nome:"Exemplo",titulo:"Dr.",ativo:"sim"};
  w.dispatchEvent(new w.CustomEvent("endomapa:perfil-carregado",{detail:w.endomapaMedico}));
  await esperar(()=>d.querySelector("[data-fusao-estado]").hidden);
  const raiz=host.shadowRoot,$=id=>raiz.getElementById(id);
  afirmar(!!$("base") && !!$("baixar-pdf"),"Fusão integrada carrega importação, ajustes e PDF");
  const origem=d.createElement("canvas");origem.width=200;origem.height=150;const ctx=origem.getContext("2d");ctx.fillStyle="#ee8844";ctx.fillRect(0,0,200,150);
  const blob=await new Promise(r=>origem.toBlob(r));
  for(const id of ["base","hycosy"]){const dt=new w.DataTransfer();dt.items.add(new w.File([blob],"imagem-artificial.png",{type:"image/png"}));$(id).files=dt.files;$(id).dispatchEvent(new w.Event("change"));}
  await esperar(()=>!$("baixar-pdf").disabled);
  $("largura").value=132;$("largura").dispatchEvent(new w.Event("input"));await pausa(100);
  const canvas=$("resultado"),pixel=Array.from(canvas.getContext("2d").getImageData(100,80,1,1).data).join();
  d.querySelector('[data-tela="fusao-hycosy"] [data-tela-alvo="novo-mapa"]').click();
  afirmar(d.querySelector('[data-tela="fusao-hycosy"]').hidden,"Voltar ao início fecha somente a tela");
  botoes[1].click();await pausa(100);
  afirmar($("resultado")===canvas && $("largura").value==="132" && Array.from(canvas.getContext("2d").getImageData(100,80,1,1).data).join()===pixel,"Navegação mantém imagens e ajustes da fusão");
  afirmar(d.querySelectorAll('script[src^="fusao-hycosy/fusao.js"]').length===1,"Retornar não reinicializa o editor");
  botoes[0].click();afirmar(!d.querySelector('[data-tela="editor-manual"]').hidden,"Botão manual continua abrindo editor de endometriose");
  botoes[1].click();
  for(const largura of [320,390,1280]){frame.width=largura;await pausa(80);afirmar(d.documentElement.scrollWidth<=d.documentElement.clientWidth,"Integração sem rolagem horizontal em "+largura+"px ("+d.documentElement.scrollWidth+"; "+Array.from(raiz.querySelectorAll("*")).filter(e=>e.getBoundingClientRect().right>d.documentElement.clientWidth+1).map(e=>e.tagName+"."+e.className+":"+Math.round(e.getBoundingClientRect().width)).slice(0,12).join(",")+")");}
  relatorio.textContent="PASSOU: "+logs.length+" verificações de integração\n"+logs.join("\n");
 }catch(e){relatorio.textContent="FALHOU: "+e.message+"\n"+logs.join("\n");}
 await fetch("/resultado-hycosy",{method:"POST",body:relatorio.textContent});
})();
