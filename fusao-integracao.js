"use strict";
(() => {
  const tela=document.querySelector('[data-tela="fusao-hycosy"]');
  const host=document.querySelector('[data-fusao-host]');
  const estado=document.querySelector('[data-fusao-estado]');
  const repetir=document.querySelector('[data-fusao-repetir]');
  if(!tela || !host)return;
  let carregando=false,pronta=false;
  function script(src){return new Promise((resolve,reject)=>{
    const tag=document.createElement("script");tag.src=src;tag.onload=resolve;
    tag.onerror=()=>{tag.remove();reject(new Error("Falha ao carregar ferramenta"));};document.body.append(tag);
  });}
  async function carregar(){
    if(tela.hidden || !window.endomapaMedico || carregando || pronta)return;
    carregando=true;repetir.hidden=true;estado.hidden=false;estado.textContent="Carregando ferramentas de fusão…";
    try{
      const resposta=await fetch("fusao-hycosy/index.html?v=jpeg-1");
      if(!resposta.ok)throw new Error("Falha de conexão");
      const pagina=new DOMParser().parseFromString(await resposta.text(),"text/html");
      const raiz=host.shadowRoot || host.attachShadow({mode:"open"});
      raiz.replaceChildren();
      const estilo=document.createElement("link");estilo.rel="stylesheet";estilo.href="fusao-hycosy/estilo.css?v=1";
      const estiloPronto=new Promise((resolve,reject)=>{estilo.onload=resolve;estilo.onerror=reject;});
      raiz.append(estilo,...Array.from(pagina.body.children));
      await estiloPronto;
      await script("fusao-hycosy/pdf.js?v=1");
      await script("fusao-hycosy/fusao.js?v=jpeg-1");
      pronta=true;estado.hidden=true;
    }catch{
      host.shadowRoot?.replaceChildren();
      estado.textContent="Não foi possível carregar a fusão. Confira sua conexão e tente novamente.";repetir.hidden=false;
    }finally{carregando=false;}
  }
  window.addEventListener("endomapa:tela-aberta",carregar);
  window.addEventListener("endomapa:perfil-carregado",carregar);
  repetir.addEventListener("click",carregar);
  carregar();
})();
