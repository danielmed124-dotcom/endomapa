(() => {
 'use strict';
 const mapa=document.querySelector('[data-mapa-editor="sagital"]');if(!mapa)return;
 const desenho=mapa.querySelector('.mapa-editor__desenho');
 let barra=mapa.querySelector('.mapa-editor__barra');
 if(!barra){barra=document.createElement('div');barra.className='mapa-editor__barra';desenho.before(barra)}
 const acoes=document.createElement('div');acoes.className='mapa-editor__orgaos-acoes';
 acoes.innerHTML='<button type="button" class="botao botao--secundario" data-movimentar-utero aria-pressed="false" disabled>Movimentar útero</button><button type="button" class="botao botao--secundario" data-restaurar-utero disabled>Restaurar posição original</button>';
 barra.append(acoes);
 const botao=acoes.firstElementChild,restaurar=acoes.lastElementChild;
 const tela=Object.assign(document.createElement('canvas'),{width:1087,height:1447,className:'mapa-editor__orgaos'});
 tela.dataset.utero='';desenho.querySelector('[data-mapa-base]').after(tela);
 const toque=document.createElement('div');toque.className='mapa-editor__orgaos-toque';toque.hidden=true;toque.tabIndex=0;
 toque.dataset.uteroToque='';toque.setAttribute('aria-label','Arraste o corpo do útero para inclinar. Use as setas para ajustar e Home para restaurar.');desenho.append(toque);
 let motor,ativo=false,arraste=null,conta=null,pendente;
 const estado=()=>motor?.estado()||{...(pendente||{angulo:0})};
 const ocupado=()=>window.endomapaEditorManual?.ocupado()||window.endomapaHistoricoManual?.ocupado();
 function atualizar(){restaurar.disabled=!motor||!estado().angulo}
 function modo(v){ativo=Boolean(v)&&Boolean(motor);arraste=null;toque.hidden=!ativo;botao.setAttribute('aria-pressed',String(ativo));if(ativo){window.endomapaOrgaos?.desativar();window.dispatchEvent(new Event('endomapa:movimentar-utero'));toque.focus({preventScroll:true})}}
 function mover(a){if(!motor||ocupado())return;const antes=estado().angulo;motor.mover(a);window.dispatchEvent(new CustomEvent('endomapa:utero-movido',{detail:{antes,depois:estado().angulo}}));atualizar()}
 function validar(v){if(v===undefined)return;const l=motor?.limites()||{min:-9,max:110.5};if(!v||!Number.isFinite(v.angulo)||v.angulo<l.min||v.angulo>l.max)throw Error('Posição do útero inválida. O mapa aberto foi preservado.')}
 window.endomapaUtero={estado,validar,desativar:()=>modo(false),alterado:v=>v==='sagital'&&Boolean(estado().angulo),
  restaurar(v){validar(v);modo(false);pendente={...(v||{angulo:0})};motor?.restaurar(pendente);atualizar()},
  vincular(x,y){if(!motor||!motor.localizar(x*1087/100,y*1447/100))return null;return motor.origem(x*1087/100,y*1447/100)},
  posicao:(x,y,a)=>motor?.transformar(x,y,a),
  orientar(x,y,giro,antes,depois){
   if(!motor)return giro;
   const derivada=a=>{
    const e=.1,px=motor.transformar(x+e,y,a),mx=motor.transformar(x-e,y,a),py=motor.transformar(x,y+e,a),my=motor.transformar(x,y-e,a);
    return{xx:(px.x-mx.x)/(2*e),yx:(px.y-mx.y)/(2*e),xy:(py.x-my.x)/(2*e),yy:(py.y-my.y)/(2*e)};
   };
   const a=derivada(antes),b=derivada(depois),rad=giro*Math.PI/180,vx=-Math.sin(rad),vy=Math.cos(rad),det=a.xx*a.yy-a.xy*a.yx;
   if(Math.abs(det)<1e-6)return giro;
   const ux=(a.yy*vx-a.xy*vy)/det,uy=(-a.yx*vx+a.xx*vy)/det;
   return Math.atan2(-(b.xx*ux+b.xy*uy),b.yx*ux+b.yy*uy)*180/Math.PI;
  },
  fotografar(v){if(v!=='sagital')return null;if(!motor)throw Error('Aguarde o carregamento do útero.');const c=Object.assign(document.createElement('canvas'),{width:1087,height:1447});c.getContext('2d').drawImage(tela,0,0);return c;}
 };
 botao.onclick=()=>{if(!ocupado())modo(!ativo)};
 restaurar.onclick=()=>{if(!ocupado()){arraste=null;mover(0)}};
 const ponto=e=>{const r=toque.getBoundingClientRect();return{x:(e.clientX-r.left)*1087/r.width,y:(e.clientY-r.top)*1447/r.height}};
 toque.onpointerdown=e=>{if(!ativo||arraste||e.button!==0||e.isPrimary===false||ocupado())return;const p=ponto(e);if(!motor.localizar(p.x,p.y)||Math.hypot(p.x-650,p.y-640)<=110)return;arraste={id:e.pointerId,inicio:Math.atan2(p.y-640,p.x-650),angulo:estado().angulo};toque.setPointerCapture(e.pointerId);e.preventDefault()};
 toque.onpointermove=e=>{if(arraste?.id!==e.pointerId)return;const p=ponto(e),delta=Math.atan2(p.y-640,p.x-650)-arraste.inicio;mover(arraste.angulo+Math.atan2(Math.sin(delta),Math.cos(delta))*180/Math.PI);e.preventDefault()};
 toque.onpointerup=toque.onpointercancel=toque.onlostpointercapture=e=>{if(arraste?.id===e.pointerId)arraste=null};
 toque.onkeydown=e=>{if(!ativo||!['ArrowLeft','ArrowDown','ArrowRight','ArrowUp','Home'].includes(e.key))return;e.preventDefault();e.stopPropagation();mover(e.key==='Home'?0:estado().angulo+(['ArrowLeft','ArrowDown'].includes(e.key)?-1:1))};
 window.addEventListener('endomapa:vistas-alteradas',()=>modo(false));
 window.addEventListener('endomapa:movimentar-ovarios',()=>modo(false));
 window.addEventListener('endomapa:perfil-carregado',e=>{if(conta!==e.detail.id)window.endomapaUtero.restaurar();conta=e.detail.id});
 window.endomapaUtero.pronto=window.endomapaCriarUtero(tela).then(m=>{motor=m;if(pendente){validar(pendente);motor.restaurar(pendente)}botao.disabled=false;atualizar()}).catch(()=>{botao.disabled=true;botao.title='Não foi possível carregar o útero. Recarregue a página.'});
})();
