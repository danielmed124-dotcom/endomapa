(() => {
  const novo = () => Object.assign(document.createElement('canvas'), {width:1086,height:1448});
  function fotografar(vista) {
    const c=novo(),g=c.getContext('2d');
    const o=window.endomapaOrgaos?.paraVista?.(vista)||(vista==='coronal'?window.endomapaOrgaos:null);
    const u=vista==='coronal'?window.endomapaUteroCoronal:vista==='sagital'?window.endomapaUtero:null;
    for(const parte of [u?.fotografarFrente?.(),o?.fotografarFrente?.()]) if(parte)g.drawImage(parte,0,0,c.width,c.height);
    const cinza=document.querySelector('[data-mapa-escala-cinza]')?.checked;
    const branco=Number(document.querySelector('[data-transparencia-cinza]')?.value||0)/100;
    if(cinza||branco){const im=g.getImageData(0,0,c.width,c.height),d=im.data;for(let i=0;i<d.length;i+=4){if(cinza){const v=.2126*d[i]+.7152*d[i+1]+.0722*d[i+2];d[i]=d[i+1]=d[i+2]=v;}for(let j=0;j<3;j++)d[i+j]+=(255-d[i+j])*branco;}g.putImageData(im,0,0);}
    return c;
  }
  let agendado=false;
  function atualizar(){agendado=false;document.querySelectorAll('[data-camada-editor]').forEach(camada=>{
    let tela=camada.querySelector('.ordem-lesoes-orgaos');
    const ativa=!!camada.querySelector('[data-ordem-camada="tras"]');
    if(!ativa){tela?.remove();return;}
    if(!tela){tela=novo();tela.className='ordem-lesoes-orgaos';camada.append(tela);}
    const g=tela.getContext('2d');g.clearRect(0,0,tela.width,tela.height);g.drawImage(fotografar(camada.dataset.camadaEditor),0,0);
  });}
  function agendar(){if(!agendado){agendado=true;requestAnimationFrame(atualizar);}}
  const observer=new MutationObserver(rs=>{if(rs.some(r=>r.type==='attributes'||Array.from([...r.addedNodes,...r.removedNodes]).some(n=>n.classList?.contains('lesao-editavel'))))agendar();});
  document.querySelectorAll('[data-camada-editor]').forEach(c=>observer.observe(c,{childList:true,subtree:true,attributes:true,attributeFilter:['data-ordem-camada']}));
  for(const evento of ['endomapa:ovario-movido','endomapa:orgaos-redesenhados','endomapa:utero-movido','endomapa:vistas-alteradas'])window.addEventListener(evento,agendar);
  for(const seletor of ['[data-mapa-escala-cinza]','[data-transparencia-cinza]'])document.querySelector(seletor)?.addEventListener('input',agendar);
  Promise.allSettled([window.endomapaOrgaos?.pronto,window.endomapaUtero?.pronto,window.endomapaUteroCoronal?.pronto]).then(agendar);
  window.endocartaOrdemLesoes={fotografar,atualizar};
})();
