(() => {
 'use strict';
 const botao=document.querySelector('#baixar-pdf'),mensagem=document.querySelector('#estado-pdf');
 let ocupado=false;
 async function baixar(){
  if(ocupado||!window.testeHidrosalpinge.estado().pronto)return;
  ocupado=true;botao.disabled=true;botao.textContent='Preparando PDF…';mensagem.textContent='';
  let endereco;
  try{
   const teste=window.testeHidrosalpinge,modelo=teste.estado().modelo;
   // Aplica também o último movimento, mesmo antes do próximo quadro da tela.
   teste.desenhar();
   const fonte=document.querySelector('#mapa'),copia=document.createElement('canvas');
   copia.width=fonte.width;copia.height=fonte.height;copia.getContext('2d').drawImage(fonte,0,0);
   // Congela a imagem no clique. Marcadores são elementos HTML fora do canvas.
   await new Promise(resolve=>setTimeout(resolve,0));
   const blob=window.endomapaGerarPdfA4([{canvas:copia,vista:'hidrosalpinge-'+modelo}]);
   endereco=URL.createObjectURL(blob);
   const link=document.createElement('a');link.href=endereco;link.download=`endomapa-teste-hidrosalpinge-${modelo}-a4.pdf`;link.hidden=true;
   document.body.append(link);try{link.click()}finally{link.remove()}
   const temporario=endereco;setTimeout(()=>URL.revokeObjectURL(temporario),60000);endereco=null;
   mensagem.textContent=`PDF A4 da hidrosalpinge ${modelo} preparado. Salve ou abra o arquivo para conferir.`;
  }catch(erro){
   if(endereco)URL.revokeObjectURL(endereco);
   mensagem.textContent='Não foi possível preparar o PDF. Seus ajustes continuam no teste. Tente novamente.';
  }finally{ocupado=false;botao.disabled=false;botao.textContent='Baixar PDF'}
 }
 botao.addEventListener('click',baixar);
 window.testeHidrosalpinge.pronto.then(()=>{botao.disabled=false}).catch(()=>{mensagem.textContent='O PDF ficará disponível quando as imagens carregarem.'});
})();
