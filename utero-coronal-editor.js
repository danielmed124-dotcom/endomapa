(() => {
 'use strict';
 const mapa=document.querySelector('[data-mapa-editor="coronal"]');if(!mapa)return;
 const desenho=mapa.querySelector('.mapa-editor__desenho'),linha=mapa.querySelector('.mapa-editor__orgaos-linha');
 const botao=document.createElement('button');botao.type='button';botao.className='botao botao--secundario';botao.dataset.movimentarUteroCoronal='';botao.textContent='Movimentar útero';botao.disabled=true;botao.setAttribute('aria-pressed','false');
 const ovarios=linha.querySelector('[data-movimentar-ovarios]'),tubas=linha.querySelector('[data-alterar-tubas]');
 linha.prepend(tubas,botao,ovarios);linha.classList.add('com-utero');
 const painel=document.createElement('div');painel.className='utero-coronal-painel';painel.hidden=true;
 painel.innerHTML='<p role="status" aria-live="polite">Arraste o corpo do útero para os lados. O colo permanece fixo.</p><button type="button" class="botao botao--secundario">Restaurar posição do útero</button>';
 mapa.querySelector('.mapa-editor__barra').after(painel);
 const msg=painel.querySelector('p'),restaurar=painel.querySelector('button');
 const novo=()=>Object.assign(document.createElement('canvas'),{width:1086,height:1448});
 const fonte=novo(),tela=novo();tela.className='mapa-editor__orgaos';tela.dataset.uteroCoronal='';desenho.querySelector('[data-mapa-base]').after(tela);
 const toque=document.createElement('div');toque.className='mapa-editor__orgaos-toque';toque.hidden=true;toque.tabIndex=0;toque.dataset.uteroCoronalToque='';toque.setAttribute('aria-label','Arraste o corpo do útero para inclinar. Setas ajustam; Home restaura.');desenho.append(toque);
 let motor,ativo=false,arraste=null,pendente={angulo:0},conta,assinatura='',cacheOrgaos;
 const estado=()=>motor?.estado()||{...pendente};
 const ocupado=()=>window.endomapaEditorManual?.ocupado()||window.endomapaHistoricoManual?.ocupado();
 function validar(v){if(v!==undefined&&(!v||!Number.isFinite(v.angulo)||v.angulo< -20||v.angulo>20))throw Error('Inclinação do útero inválida. O mapa aberto foi preservado.')}
 function desenhar(){
  const g=tela.getContext('2d');g.clearRect(0,0,1086,1448);
  const combinado=Boolean(estado().angulo&&(window.endomapaOrgaos?.alterado('coronal')||window.endomapaTubas?.alterado('coronal')));
  desenho.classList.toggle('utero-coronal-combinado',combinado);
  if(combinado&&window.endomapaTubas?.combinacaoPronta?.('coronal')===false)return;
  if(estado().angulo&&motor){
   const o=window.endomapaOrgaos,t=window.endomapaTubas,chave=JSON.stringify([estado().angulo,o?.estado(),o?.ureteres(),t?.estado('coronal')]);
   if(chave!==assinatura){
    const apenasUreteres=!t?.alterado('coronal')&&!Object.values(o?.estado()||{}).some(p=>p.x||p.y);
    const chaveOrgaos=JSON.stringify([estado().angulo,o?.estado(),o?.ureteres(),apenasUreteres]);
    if(combinado&&cacheOrgaos?.chave!==chaveOrgaos)cacheOrgaos={chave:chaveOrgaos,partes:o?.fotografarCombinacao(motor.ligar,apenasUreteres)};
    const orgaos=combinado?cacheOrgaos.partes:null;
    const tubas=combinado?t?.fotografarCombinacao('coronal'):null;
    motor.definir(estado().angulo,combinado?{orgaos,tubas}:undefined);assinatura=chave;
   }
   g.drawImage(fonte,80,180,930,960,80,180,930,960);
  }
  restaurar.disabled=!estado().angulo;
 }
 function modo(v){ativo=Boolean(v)&&Boolean(motor);arraste=null;toque.hidden=!ativo;painel.hidden=!ativo;botao.setAttribute('aria-pressed',String(ativo));if(ativo){window.endomapaOrgaos?.desativar();window.endomapaTubas?.desativar();window.endomapaUtero?.desativar();window.dispatchEvent(new CustomEvent('endomapa:movimentar-utero',{detail:{vista:'coronal'}}));toque.focus({preventScroll:true})}}
 function origem(x,y){if(!motor)return null;let p={x,y};for(let i=0;i<30;i++){const q=motor.transformar(p.x,p.y);p.x+=x-q.x;p.y+=y-q.y;}if(p.x<0||p.y<0||p.x>=1086||p.y>=1448)return null;return motor.mascara.getContext('2d').getImageData(Math.floor(p.x),Math.floor(p.y),1,1).data[3]>128?p:null;}
 function mover(a){if(!motor||ocupado())return;assinatura='';motor.definir(a);desenhar();window.dispatchEvent(new CustomEvent('endomapa:utero-movido',{detail:{vista:'coronal'}}));msg.textContent=estado().angulo?`Inclinação: ${Math.abs(Math.round(estado().angulo))}° para a ${estado().angulo<0?'esquerda':'direita'} da tela. Arraste para ajustar.`:'Arraste o corpo do útero para os lados. O colo permanece fixo.';}
 const api=window.endomapaUteroCoronal={estado,validar,desativar:()=>modo(false),alterado:v=>v==='coronal'&&Boolean(estado().angulo),
  restaurar(v){validar(v);modo(false);assinatura='';pendente={...(v||{angulo:0})};motor?.definir(pendente.angulo);desenhar();window.dispatchEvent(new CustomEvent('endomapa:utero-movido',{detail:{vista:'coronal'}}))},
  vincular:(x,y)=>origem(x*1086/100,y*1448/100),posicao:(x,y)=>motor?.transformar(x,y),
  transformarAnexo:(x,y)=>motor?.transformarAnexo(x,y)||{x,y},
  ligar:(caminho,deslocamento)=>motor?.ligar(caminho,deslocamento),
  fotografar(v){if(!api.alterado(v))return null;if(!motor)throw Error('Aguarde o preparo do útero.');desenhar();const c=novo();c.getContext('2d').drawImage(tela,0,0);return c;}
 };
 botao.onclick=()=>{if(ocupado())return;if(!ativo&&window.endomapaCartografico?.desejado()){painel.hidden=false;msg.textContent='Volte ao mapa original antes de inclinar o útero.';return}modo(!ativo)};
 restaurar.onclick=()=>mover(0);
 const ponto=e=>{const r=toque.getBoundingClientRect();return{x:(e.clientX-r.left)*1086/r.width,y:(e.clientY-r.top)*1448/r.height}};
 toque.onpointerdown=e=>{if(!ativo||arraste||e.button!==0||e.isPrimary===false||ocupado())return;const p=ponto(e);if(!origem(p.x,p.y)||Math.hypot(p.x-550,p.y-700)<45)return;arraste={id:e.pointerId,inicio:Math.atan2(p.y-700,p.x-550),angulo:estado().angulo};toque.setPointerCapture(e.pointerId);e.preventDefault()};
 toque.onpointermove=e=>{if(arraste?.id!==e.pointerId)return;const p=ponto(e),d=Math.atan2(p.y-700,p.x-550)-arraste.inicio;mover(arraste.angulo+Math.atan2(Math.sin(d),Math.cos(d))*180/Math.PI);e.preventDefault()};
 toque.onpointerup=toque.onpointercancel=toque.onlostpointercapture=e=>{if(arraste?.id===e.pointerId)arraste=null};
 toque.onkeydown=e=>{if(!ativo||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))return;e.preventDefault();e.stopPropagation();mover(e.key==='Home'?0:estado().angulo+(['ArrowLeft','ArrowDown'].includes(e.key)?-1:1))};
 // Bloqueia somente combinações que ainda não foram adaptadas neste teste local.
 document.addEventListener('click',e=>{if(!estado().angulo)return;const b=e.target.closest('[data-mapa-cartografico]');if(b){e.preventDefault();e.stopImmediatePropagation();painel.hidden=false;msg.textContent='Restaure a posição do útero antes de usar o mapa cartográfico.';}},true);
 for(const evento of ['endomapa:ovario-movido','endomapa:orgaos-redesenhados','endomapa:tubas-redesenhadas'])window.addEventListener(evento,e=>{if(motor&&(e.detail?.vista||'coronal')==='coronal')desenhar()});
 for(const evento of ['endomapa:vistas-alteradas','endomapa:movimentar-ovarios','endomapa:alterar-tubas'])window.addEventListener(evento,()=>modo(false));
 window.addEventListener('endomapa:movimentar-utero',e=>{if(e.detail?.vista!=='coronal')modo(false)});
 window.addEventListener('endomapa:perfil-carregado',e=>{if(conta!==e.detail.id)api.restaurar();conta=e.detail.id});
 api.pronto=window.endomapaCriarUteroCoronal(fonte).then(m=>{motor=m;motor.definir(pendente.angulo);desenhar();botao.disabled=false;return m}).catch(e=>{botao.title='Não foi possível carregar o útero. Recarregue a página.';throw e});
})();
