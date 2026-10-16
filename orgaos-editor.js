(() => {
 'use strict';
 const mapa=document.querySelector('[data-mapa-editor="coronal"]');if(!mapa)return;
 const desenho=mapa.querySelector('.mapa-editor__desenho');
 let barra=mapa.querySelector('.mapa-editor__barra');
 if(!barra){barra=document.createElement('div');barra.className='mapa-editor__barra';desenho.before(barra)}
 const acoes=document.createElement('div');acoes.className='mapa-editor__orgaos-acoes';
 acoes.innerHTML='<button type="button" class="botao botao--secundario" data-movimentar-ovarios aria-pressed="false" disabled>Movimentar ovários</button><button type="button" class="botao botao--secundario" data-restaurar-ovarios disabled>Restaurar posições originais</button>';
 barra.append(acoes);
 const botao=acoes.firstElementChild,restaurar=acoes.lastElementChild;
 const tela=Object.assign(document.createElement('canvas'),{width:1086,height:1448,className:'mapa-editor__orgaos'});
 desenho.querySelector('[data-mapa-base]').after(tela);
 const toque=document.createElement('div');toque.className='mapa-editor__orgaos-toque';toque.hidden=true;toque.tabIndex=0;
 toque.setAttribute('aria-label','Arraste um ovário para movê-lo. As setas movem o último ovário selecionado.');desenho.append(toque);
 let motor,ativo=false,arraste=null,selecionado='esquerdo',conta=null,pendente;
 const vazio=()=>({esquerdo:{x:0,y:0},direito:{x:0,y:0}});
 const estado=()=>motor?.estado()||structuredClone(pendente||vazio());
 const ocupado=()=>window.endomapaEditorManual?.ocupado()||window.endomapaHistoricoManual?.ocupado();
 function atualizar(){restaurar.disabled=!motor||!Object.values(estado()).some(g=>g.x||g.y)}
 function modo(valor){ativo=Boolean(valor)&&Boolean(motor);arraste=null;toque.hidden=!ativo;botao.setAttribute('aria-pressed',String(ativo));if(ativo){window.dispatchEvent(new Event('endomapa:movimentar-ovarios'));toque.focus({preventScroll:true})}}
 function mover(lado,x,y){
  if(!motor||ocupado())return;
  const antes=estado()[lado];motor.mover(lado,x,y);const depois=estado()[lado];
  window.dispatchEvent(new CustomEvent('endomapa:ovario-movido',{detail:{lado,antes,depois}}));atualizar();
 }
 function validar(valores){
  if(valores===undefined)return;
  for(const [lado,min,max] of [['esquerdo',-90,530],['direito',-530,90]]){
   const p=valores?.[lado];if(!p||!Number.isFinite(p.x)||p.x<min||p.x>max||!Number.isFinite(p.y)||p.y< -360||p.y>200)throw Error('Posições dos ovários inválidas. O mapa aberto foi preservado.');
  }
 }
 window.endomapaOrgaos={
  estado,validar,desativar:()=>modo(false),alterado:vista=>vista==='coronal'&&Object.values(estado()).some(g=>g.x||g.y),
  restaurar(valores){validar(valores);modo(false);pendente=structuredClone(valores||vazio());motor?.restaurar(pendente);atualizar()},
  localizar:(x,y)=>motor?.localizar(x*1086/100,y*1448/100,selecionado)||null,
  fotografar(vista){
   if(vista!=='coronal'||!Object.values(estado()).some(g=>g.x||g.y))return null;
   if(!motor)throw Error('Aguarde o carregamento dos ovários.');
   const copia=Object.assign(document.createElement('canvas'),{width:1086,height:1448});copia.getContext('2d').drawImage(tela,0,0);return copia;
  }
 };
 botao.onclick=()=>{if(!ocupado())modo(!ativo)};
 restaurar.onclick=()=>{if(ocupado())return;arraste=null;for(const lado of ['esquerdo','direito'])mover(lado,0,0)};
 const ponto=e=>{const r=toque.getBoundingClientRect();return{x:(e.clientX-r.left)*1086/r.width,y:(e.clientY-r.top)*1448/r.height}};
 toque.onpointerdown=e=>{
  if(!ativo||arraste||e.button!==0||e.isPrimary===false||ocupado())return;
  const p=ponto(e),lado=motor.localizar(p.x,p.y,selecionado);if(!lado)return;
  selecionado=lado;arraste={id:e.pointerId,lado,p,...estado()[lado]};toque.setPointerCapture(e.pointerId);e.preventDefault();
 };
 toque.onpointermove=e=>{if(arraste?.id!==e.pointerId)return;const p=ponto(e),a=arraste;mover(a.lado,a.x+p.x-a.p.x,a.y+p.y-a.p.y);e.preventDefault()};
 toque.onpointerup=toque.onpointercancel=toque.onlostpointercapture=e=>{if(arraste?.id===e.pointerId)arraste=null};
 toque.onkeydown=e=>{const d={ArrowLeft:[-10,0],ArrowRight:[10,0],ArrowUp:[0,-10],ArrowDown:[0,10]}[e.key];if(!ativo||!d)return;e.preventDefault();e.stopPropagation();const g=estado()[selecionado];mover(selecionado,g.x+d[0],g.y+d[1])};
 window.addEventListener('endomapa:vistas-alteradas',()=>modo(false));
 window.addEventListener('endomapa:perfil-carregado',e=>{if(conta!==e.detail.id)window.endomapaOrgaos.restaurar();conta=e.detail.id});
 window.endomapaOrgaos.pronto=window.endomapaCriarOrgaos(tela).then(m=>{motor=m;if(pendente)motor.restaurar(pendente);botao.disabled=false;atualizar()}).catch(()=>{botao.disabled=true;botao.title='Não foi possível carregar os ovários. Recarregue a página.'});
})();
