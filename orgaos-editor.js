(() => {
 'use strict';
 const instancias=new Map();
 const vazio=()=>({esquerdo:{x:0,y:0},direito:{x:0,y:0}});
 function criar(vista,lados){
  const mapa=document.querySelector(`[data-mapa-editor="${vista}"]`);if(!mapa)return;
  const desenho=mapa.querySelector('.mapa-editor__desenho');let barra=mapa.querySelector('.mapa-editor__barra');
  if(!barra){barra=document.createElement('div');barra.className='mapa-editor__barra';desenho.before(barra)}
  const acoes=document.createElement('div');acoes.className='mapa-editor__orgaos-acoes';
  acoes.innerHTML='<div class="mapa-editor__orgaos-linha"><button type="button" class="botao botao--secundario" data-movimentar-ovarios aria-pressed="false" disabled>Movimentar ovários</button><button type="button" class="botao botao--secundario" data-inserir-ureteres aria-pressed="false" disabled>Inserir ureteres</button></div><button type="button" class="botao botao--secundario" data-restaurar-ovarios disabled>Restaurar posições originais</button>';
  barra.append(acoes);
  const botao=acoes.querySelector('[data-movimentar-ovarios]'),restaurar=acoes.querySelector('[data-restaurar-ovarios]'),botaoUreteres=acoes.querySelector('[data-inserir-ureteres]');
  const tela=Object.assign(document.createElement('canvas'),{width:1086,height:1448,className:'mapa-editor__orgaos'});desenho.querySelector('[data-mapa-base]').after(tela);
  const toque=document.createElement('div');toque.className='mapa-editor__orgaos-toque';toque.hidden=true;toque.tabIndex=0;
  toque.setAttribute('aria-label','Arraste o ovário para movê-lo. As setas movem o último ovário selecionado.');desenho.append(toque);
  let motor,ativo=false,arraste=null,selecionado=lados[0],conta,pendente,ureteres=false,ureteresCarregados=false,carregando=false,preparo,preparoUreteres;
  const estado=()=>motor?.estado()||structuredClone(pendente||vazio());
  const ocupado=()=>window.endomapaEditorManual?.ocupado()||window.endomapaHistoricoManual?.ocupado();
  const notificar=()=>window.dispatchEvent(new CustomEvent('endomapa:orgaos-redesenhados',{detail:{vista}}));
  function atualizar(){restaurar.disabled=!motor||!Object.values(estado()).some(g=>g.x||g.y)}
  function definirUreteres(valor){ureteres=valor===true;motor?.definirUreteres(ureteres);botaoUreteres.textContent=ureteres?'Remover ureteres':'Inserir ureteres';botaoUreteres.setAttribute('aria-pressed',String(ureteres));notificar()}
  function validarUreteres(valor){if(valor!==undefined&&typeof valor!=='boolean')throw Error('Estado dos ureteres inválido. O mapa aberto foi preservado.')}
  function modo(valor){ativo=Boolean(valor)&&Boolean(motor);arraste=null;toque.hidden=!ativo;botao.setAttribute('aria-pressed',String(ativo));if(ativo){for(const outra of instancias.values())if(outra!==api)outra.desativar();window.dispatchEvent(new CustomEvent('endomapa:movimentar-ovarios',{detail:{vista}}));toque.focus({preventScroll:true})}}
  function mover(lado,x,y){if(!motor||ocupado()||!lados.includes(lado))return;const antes=estado()[lado];motor.mover(lado,x,y);const depois=estado()[lado];window.dispatchEvent(new CustomEvent('endomapa:ovario-movido',{detail:{vista,lado,antes,depois}}));atualizar()}
  function validar(valores){
   if(valores===undefined)return;
   for(const [lado,min,max] of [['esquerdo',-90,530],['direito',-530,90]]){const p=valores?.[lado];if(!p||!Number.isFinite(p.x)||p.x<min||p.x>max||!Number.isFinite(p.y)||p.y< -360||p.y>200||(!lados.includes(lado)&&(p.x||p.y)))throw Error('Posições dos ovários inválidas. O mapa aberto foi preservado.')}
  }
  function iniciar(){
   if(preparo)return preparo;carregando=true;
   preparo=window.endomapaCriarOrgaos(tela,undefined,{lados,base:mapa.querySelector('[data-mapa-base]').dataset.srcVisitante}).then(m=>{motor=m;if(pendente)motor.restaurar(pendente);motor.definirUreteres(ureteres);botao.disabled=false;atualizar();notificar();return m}).catch(()=>{preparo=null;botao.disabled=true;botao.title='Não foi possível carregar os ovários. Recarregue a página.'}).finally(()=>{carregando=false});
   return preparo;
  }
  function iniciarUreteres(){if(!preparoUreteres)preparoUreteres=iniciar().then(m=>m?.ureteresProntos).then(()=>{if(!motor)return;ureteresCarregados=true;botaoUreteres.disabled=false;notificar()}).catch(()=>{preparoUreteres=null;botaoUreteres.title='Não foi possível carregar os ureteres. Recarregue a página.'});return preparoUreteres}
  const api={vista,lados,
   fotografarParaTubas:()=>motor?.fotografarParaTubas(),transformarTuba:(lado,p)=>motor?.transformarTuba(lado,p)||p,
   estado,validar,validarUreteres,ureteres:()=>ureteres,desativar:()=>modo(false),carregando:()=>carregando,
   alterado:v=>v===vista&&(ureteres||Object.values(estado()).some(g=>g.x||g.y)),
   restaurar(valores,incluirUreteres=false){validar(valores);validarUreteres(incluirUreteres);modo(false);pendente=structuredClone(valores||vazio());motor?.restaurar(pendente);definirUreteres(incluirUreteres);atualizar();if(ureteres||Object.values(pendente).some(p=>p.x||p.y))iniciarUreteres()},
   localizar:(x,y)=>motor?.localizar(x*1086/100,y*1448/100,selecionado)||null,
   fotografar(v){if(!api.alterado(v))return null;if(!motor)throw Error('Aguarde o carregamento dos ovários.');if(ureteres&&!ureteresCarregados)throw Error('Aguarde o carregamento dos ureteres.');const c=Object.assign(document.createElement('canvas'),{width:1086,height:1448});c.getContext('2d').drawImage(tela,0,0);return c}
  };
  Object.defineProperties(api,{pronto:{get:iniciar},ureteresProntos:{get:iniciarUreteres}});
  botao.onclick=()=>{if(!ocupado())modo(!ativo)};botaoUreteres.onclick=()=>{if(!ocupado()&&ureteresCarregados)definirUreteres(!ureteres)};
  restaurar.onclick=()=>{if(ocupado())return;arraste=null;for(const lado of lados)mover(lado,0,0)};
  const ponto=e=>{const r=toque.getBoundingClientRect();return{x:(e.clientX-r.left)*1086/r.width,y:(e.clientY-r.top)*1448/r.height}};
  toque.onpointerdown=e=>{if(!ativo||arraste||e.button!==0||e.isPrimary===false||ocupado())return;const p=ponto(e),lado=motor.localizar(p.x,p.y,selecionado);if(!lado)return;selecionado=lado;arraste={id:e.pointerId,lado,p,...estado()[lado]};toque.setPointerCapture(e.pointerId);e.preventDefault()};
  toque.onpointermove=e=>{if(arraste?.id!==e.pointerId)return;const p=ponto(e),a=arraste;mover(a.lado,a.x+p.x-a.p.x,a.y+p.y-a.p.y);e.preventDefault()};
  toque.onpointerup=toque.onpointercancel=toque.onlostpointercapture=e=>{if(arraste?.id===e.pointerId)arraste=null};
  toque.onkeydown=e=>{const d={ArrowLeft:[-10,0],ArrowRight:[10,0],ArrowUp:[0,-10],ArrowDown:[0,10]}[e.key];if(!ativo||!d)return;e.preventDefault();e.stopPropagation();const g=estado()[selecionado];mover(selecionado,g.x+d[0],g.y+d[1])};
  window.addEventListener('endomapa:vistas-alteradas',()=>{modo(false);queueMicrotask(()=>{if(!mapa.closest('[data-vista-manual]')?.hidden)iniciarUreteres()})});
  window.addEventListener('endomapa:alterar-tubas',()=>modo(false));
  window.addEventListener('endomapa:perfil-carregado',e=>{if(conta!==e.detail.id)api.restaurar();conta=e.detail.id});
  if(vista==='coronal')iniciarUreteres();return api;
 }
 for(const [vista,lados] of [['coronal',['esquerdo','direito']],['ooforectomia-direita',['esquerdo']],['ooforectomia-esquerda',['direito']]]){const api=criar(vista,lados);if(api)instancias.set(vista,api)}
 const principal=instancias.get('coronal');if(!principal)return;
 principal.paraVista=v=>instancias.get(v)||null;
 principal.ocupado=()=>[...instancias.values()].some(a=>a.carregando());
 principal.restaurarTodas=vistas=>{for(const [v,a] of instancias)a.restaurar(vistas?.[v]?.ovarios,vistas?.[v]?.ureteres)};
 window.endomapaOrgaos=principal;
})();
