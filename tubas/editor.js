(() => {
 'use strict';
 const M=window.endomapaTubasModelos,entradas=new Map();let conta,restaurando=false;
 const pares={esquerda:'esquerdo',direita:'direito'};
 const ocupado=()=>window.endomapaEditorManual?.ocupado()||window.endomapaHistoricoManual?.ocupado();
 const ativo=e=>JSON.stringify(e.estado)!==JSON.stringify(M.inicial(e.vista));
 const orgaosDaVista=v=>window.endomapaOrgaos?.paraVista?.(v)||(v==='coronal'?window.endomapaOrgaos:null);
 const transformar=(e,l,p)=>orgaosDaVista(e.vista)?.transformarTuba(pares[l],p)||p;
 function mensagem(e,texto){e.msg.textContent=texto}
 function renderizar(e){
  if(!e.motor)return;
  const g=e.tela.getContext('2d');g.clearRect(0,0,1086,1448);
  if(!ativo(e)){e.valido=true;posicionar(e);return}
  const orgaos=orgaosDaVista(e.vista);
  const comOrgaos=orgaos?.alterado(e.vista);let final;
  if(comOrgaos){
   const partes=e.motor.renderizar(e.estado,true);final=partes.fundo;const f=final.getContext('2d');
   const camada=orgaos.fotografarParaTubas();if(camada)f.drawImage(camada,0,0);
   for(const [lado,tela] of Object.entries(partes.camadas)){
    const p=orgaos.estado()[pares[lado]];
    if(!p.x&&!p.y){f.drawImage(tela,0,0);continue}
    const deformar=window.criarDeformador(tela,{x:80,y:420,w:930,h:570});
    f.drawImage(deformar((x,y)=>transformar(e,lado,{x,y})),0,0);
   }
   f.drawImage(partes.raizes,0,0);
  }else final=e.motor.renderizar(e.estado);
  // Apenas a região anatômica: cabeçalho, marca e assinatura vêm da conta.
  g.drawImage(final,80,420,930,720,80,420,930,720);e.valido=true;posicionar(e);
 }
 function agendar(e){if(!e.quadro)e.quadro=requestAnimationFrame(()=>{e.quadro=0;renderizar(e)})}
 async function preparar(e){
  if(e.motor)return e.motor;if(e.carregando)return e.carregando;
  e.abrir.disabled=true;mensagem(e,'Preparando as tubas…');
  e.carregando=window.endomapaCriarTubas(e.vista,e.fonte).then(m=>{e.motor=m;renderizar(e);mensagem(e,'Escolha a alteração e o lado.');for(const outra of entradas.values())if(outra!==e&&outra.vista!=='coronal'&&!outra.carregando){outra.motor=null;selecionar(outra,null)}return m}).catch(err=>{mensagem(e,err.message);throw err}).finally(()=>{e.carregando=null;e.abrir.disabled=false});
  return e.carregando;
 }
 function fechar(e){e.painel.hidden=true;e.abrir.setAttribute('aria-expanded','false');selecionar(e,null)}
 function selecionar(e,tipo){
  if(e.tipo!==tipo)e.alternancia={};
  e.tipo=tipo;e.arraste=null;e.marcadores.replaceChildren();
  for(const b of e.painel.querySelectorAll('[data-tuba-acao]'))b.setAttribute('aria-pressed',String(b.dataset.tubaAcao===tipo));
  for(const b of e.painel.querySelectorAll('[data-tuba-lado]'))b.setAttribute('aria-pressed',String(b.dataset.tubaLado===e.lado));
  const ativos=e.lado==='ambos'?e.config.lados:[e.lado];
  if(tipo&&tipo!=='salpingectomia')for(const l of ativos){
   if(e.estado[l].removida)continue;
   if(tipo==='hidro'&&!e.estado[l].inserida)continue;
   if(tipo==='espessamento'&&!e.estado[l].espessamento.ativo)continue;
   for(const chave of tipo==='posicao'?[0,1,2,3]:['inicio','fim'])marcador(e,l,String(chave));
  }
  e.remover.hidden=!tipo;e.remover.textContent=tipo==='salpingectomia'?'Restaurar tuba':tipo==='posicao'?'Restaurar posição':`Remover ${{hidro:'hidrosalpinge',tubas:'obstrução',espessamento:'espessamento'}[tipo]||''}`;
  mensagem(e,({posicao:'Arraste 1, 2, 3 e 4. As pontas acompanham as ligações com o útero e o ovário.',hidro:'Hidrosalpinge: arraste I/T para definir o início e o término.',tubas:'Obstrução: arraste A/B para delimitar o trecho.',espessamento:'Espessamento: arraste I/T para delimitar o trecho.',salpingectomia:'Salpingectomia: tuba retirada no lado selecionado, com o ovário preservado.'})[tipo]||'Escolha a alteração e o lado.');
  if(tipo&&tipo!=='salpingectomia'&&ativos.every(l=>e.estado[l].removida))mensagem(e,'Tuba retirada. Selecione Salpingectomia e Restaurar tuba para voltar a editá-la.');
  posicionar(e);
 }
 function executar(e,tipo){
  if(!e.motor||ocupado())return;
  orgaosDaVista(e.vista)?.desativar();window.endomapaUtero?.desativar();
  window.dispatchEvent(new Event('endomapa:alterar-tubas'));
  for(const l of e.lado==='ambos'?e.config.lados:[e.lado]){
   const s=e.estado[l];
   if(tipo==='salpingectomia'){s.removida=true;continue}
   if(s.removida)continue;
   if(tipo==='hidro'&&!s.inserida){s.tubaAnterior=structuredClone(s.tuba);s.inserida=true;s.inicio=0;s.fim=100}
   if(tipo==='espessamento')s.espessamento.ativo=true;
  }
  renderizar(e);selecionar(e,tipo);
 }
 function alternarLado(e,lado){
  if(ocupado()||e.lado===lado)return;
  const tipo=e.tipo,anteriores=e.lado==='ambos'?e.config.lados:[e.lado];
  e.lado=lado;
  if(!tipo||tipo==='posicao'){selecionar(e,tipo);return}
  const campos={hidro:['inserida','inicio','fim','tubaAnterior'],tubas:['tuba'],espessamento:['espessamento'],salpingectomia:['removida']}[tipo];
  const copiar=s=>Object.fromEntries(campos.map(k=>[k,structuredClone(s[k])]));
  const aplicar=(s,dados)=>{for(const k of campos){if(dados[k]===undefined)delete s[k];else s[k]=structuredClone(dados[k])}};
  const memoria=e.alternancia||(e.alternancia={});
  for(const l of anteriores)memoria[l]=copiar(e.estado[l]);
  const temAlteracao=s=>tipo==='hidro'?s.inserida:tipo==='tubas'?s.tuba.ativo:tipo==='espessamento'?s.espessamento.ativo:s.removida;
  const exemplo=memoria[anteriores.find(l=>temAlteracao(memoria[l]))||anteriores[0]];
  const novos=lado==='ambos'?e.config.lados:[lado];
  for(const l of e.config.lados){const s=e.estado[l];
   if(novos.includes(l)){
    if(tipo!=='salpingectomia'&&s.removida)continue;
    if(!anteriores.includes(l)||(!temAlteracao(s)&&temAlteracao(exemplo))){
     const anterior=structuredClone(s.tuba);aplicar(s,memoria[l]&&temAlteracao(memoria[l])?memoria[l]:exemplo);
     if(tipo==='hidro')s.tubaAnterior=anterior;
    }
   }else if(tipo==='hidro'){s.inserida=false;s.inicio=0;s.fim=100;s.tubaAnterior=null}
   else if(tipo==='tubas')s.tuba=M.segmento();
   else if(tipo==='espessamento')s.espessamento={ativo:false,inicio:38,fim:60};
   else delete s.removida;
  }
  renderizar(e);selecionar(e,tipo);
 }
 function ponto(e,l,chave){return transformar(e,l,e.motor.ponto(l,e.tipo,chave,e.estado))}
 function posicionar(e){
  if(!e.motor||!e.tela.clientWidth)return;const w=e.tela.clientWidth,h=e.tela.clientHeight,ocupados=[];
  for(const b of e.marcadores.children){const p=ponto(e,b.dataset.lado,b.dataset.chave),x=p.x/1086*w,y=p.y/1448*h;
   let desloc={x:0,y:0};const candidatos=[desloc];for(let n=1;n<=6;n++)for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,1]])candidatos.push({x:dx*46*n,y:dy*46*n});
   desloc=candidatos.find(q=>x+q.x>=22&&x+q.x<=w-22&&y+q.y>=22&&y+q.y<=h-22&&!ocupados.some(o=>Math.abs(x+q.x-o.x)<44&&Math.abs(y+q.y-o.y)<44))||desloc;
   ocupados.push({x:x+desloc.x,y:y+desloc.y});b.style.left=p.x/1086*100+'%';b.style.top=p.y/1448*100+'%';b.style.marginLeft=desloc.x+'px';b.style.marginTop=desloc.y+'px';
   b.style.setProperty('--guia-comprimento',Math.hypot(desloc.x,desloc.y)+'px');b.style.setProperty('--guia-angulo',Math.atan2(-desloc.y,-desloc.x)+'rad');
  }
 }
 function definir(e,l,chave,valor){
  const s=e.tipo==='hidro'?e.estado[l]:e.tipo==='tubas'?e.estado[l].tuba:e.estado[l].espessamento;
  s[chave]=Math.round(Math.max(chave==='fim'?s.inicio:0,Math.min(chave==='inicio'?s.fim:100,valor)));if(e.tipo!=='hidro')s.ativo=true;agendar(e);posicionar(e);
 }
 function marcador(e,l,chave){
  const b=document.createElement('button');b.type='button';b.className='tubas-marcador '+(e.tipo==='posicao'?'posicao':e.tipo==='tubas'?'tuba':chave);b.dataset.lado=l;b.dataset.chave=chave;
  b.innerHTML=`<span>${e.tipo==='posicao'?Number(chave)+1:e.tipo==='tubas'?(chave==='inicio'?'A':'B'):(chave==='inicio'?'I':'T')}</span>`;
  b.setAttribute('aria-label',`${e.tipo==='posicao'?'Mover ponto '+(Number(chave)+1):chave==='inicio'?'Início':'Término'} da tuba ${l}. Arraste ou use as setas.`);
  b.onkeydown=ev=>{if(ocupado())return;if(ev.key==='Escape'){fechar(e);return}const d={ArrowLeft:-1,ArrowDown:-1,ArrowRight:1,ArrowUp:1}[ev.key];if(d===undefined&&ev.key!=='Home'&&ev.key!=='End')return;ev.preventDefault();ev.stopPropagation();
   if(e.tipo==='posicao'){const p=e.estado[l].posicao[Number(chave)],passo=ev.shiftKey?10:2;if(ev.key==='Home')e.motor.movimento.definir(l,e.estado[l].posicao,Number(chave),0,0);else if(d!==undefined)e.motor.movimento.definir(l,e.estado[l].posicao,Number(chave),p.x+(['ArrowLeft','ArrowRight'].includes(ev.key)?d*passo:0),p.y+(['ArrowUp','ArrowDown'].includes(ev.key)?-d*passo:0));agendar(e);posicionar(e)}
   else{const s=e.tipo==='hidro'?e.estado[l]:e.tipo==='tubas'?e.estado[l].tuba:e.estado[l].espessamento;definir(e,l,chave,ev.key==='Home'?0:ev.key==='End'?100:s[chave]+d)}
  };
  b.onpointerdown=ev=>{if(ocupado()||ev.button!==0||ev.isPrimary===false||e.arraste)return;e.arraste={id:ev.pointerId,x:ev.clientX,y:ev.clientY,p:ponto(e,l,chave),pose:{...e.estado[l].posicao[Number(chave)]}};b.setPointerCapture(ev.pointerId);ev.preventDefault();ev.stopPropagation()};
  b.onpointermove=ev=>{const a=e.arraste;if(a?.id!==ev.pointerId||ocupado())return;const r=e.tela.getBoundingClientRect(),dx=(ev.clientX-a.x)*1086/r.width,dy=(ev.clientY-a.y)*1448/r.height;
   if(e.tipo==='posicao'){e.motor.movimento.definir(l,e.estado[l].posicao,Number(chave),a.pose.x+dx,a.pose.y+dy);agendar(e);posicionar(e)}else{
    // Busca no trajeto exibido, incluindo o deslocamento ovariano.
    let dist=Infinity,v=0;for(let t=0;t<=100;t+=.25){const s=e.tipo==='hidro'?e.estado[l]:e.tipo==='tubas'?e.estado[l].tuba:e.estado[l].espessamento,antes=s[chave];s[chave]=t;const p=ponto(e,l,chave);s[chave]=antes;const d=(p.x-a.p.x-dx)**2+(p.y-a.p.y-dy)**2;if(d<dist){dist=d;v=t}}definir(e,l,chave,v);
   }ev.preventDefault();
  };
  b.onpointerup=b.onpointercancel=b.onlostpointercapture=ev=>{if(e.arraste?.id===ev.pointerId)e.arraste=null};e.marcadores.append(b);
 }
 for(const [vista,config] of Object.entries(M.configs)){
  const mapa=document.querySelector(`[data-mapa-editor="${vista}"]`);if(!mapa)continue;const desenho=mapa.querySelector('.mapa-editor__desenho');
  let barra=mapa.querySelector('.mapa-editor__barra');if(!barra){barra=document.createElement('div');barra.className='mapa-editor__barra';desenho.before(barra)}
  const abrir=document.createElement('button');abrir.type='button';abrir.className='botao';abrir.dataset.alterarTubas=vista;abrir.textContent='Alterar tubas';abrir.setAttribute('aria-expanded','false');
  const ureteres=mapa.querySelector('[data-inserir-ureteres]');if(ureteres){ureteres.before(abrir);ureteres.parentElement.classList.add('com-tubas')}else barra.append(abrir);
  if(!config.lados.length||vista==='kissing-ovaries'){abrir.disabled=true;abrir.title=!config.lados.length?'Este modelo não contém tubas.':'Ajuste de tubas em preparação para este mapa.';continue}
  const painel=document.createElement('section');painel.className='tubas-painel';painel.hidden=true;painel.id='tubas-'+vista;abrir.setAttribute('aria-controls',painel.id);
  painel.innerHTML='<div class="tubas-alteracoes" role="group" aria-label="Alteração">'+[['posicao','Posição'],['hidro','Hidrosalpinge'],['espessamento','Espessamento'],['tubas','Obstrução'],['salpingectomia','Salpingectomia']].map(([v,t])=>`<button type="button" class="botao botao--secundario" data-tuba-acao="${v}" aria-pressed="false">${t}</button>`).join('')+'</div><div class="tubas-lados" role="group" aria-label="Lado">'+[['esquerda','Esquerda'],['direita','Direita'],['ambos','Ambas']].filter(([l])=>l==='ambos'?config.lados.length===2:config.lados.includes(l)).map(([l,t])=>`<button type="button" class="botao botao--secundario" data-tuba-lado="${l}">${t}</button>`).join('')+'</div><p role="status" aria-live="polite"></p><div class="tubas-restaurar"><button type="button" class="botao botao--secundario" data-tuba-remover hidden>Remover</button><button type="button" class="botao botao--secundario" data-tuba-restaurar>Restaurar tubas</button></div>';
  desenho.before(painel);const tela=M.canvas();tela.className='mapa-editor__orgaos tubas-canvas';desenho.querySelector('.mapa-editor__orgaos')?.after(tela);if(!tela.parentElement)desenho.querySelector('[data-mapa-base]').after(tela);
  const marcadores=document.createElement('div');marcadores.className='tubas-marcadores';desenho.append(marcadores);
  const e={vista,config,mapa,desenho,painel,abrir,tela,marcadores,msg:painel.querySelector('[role="status"]'),remover:painel.querySelector('[data-tuba-remover]'),estado:M.inicial(vista),lado:config.lados.length===2?'ambos':config.lados[0],tipo:null,fonte:mapa.querySelector('[data-mapa-base]').dataset.srcVisitante};entradas.set(vista,e);
  abrir.onclick=async()=>{if(ocupado())return;if(window.endomapaCartografico?.ativo()){window.alert('Para alterar as tubas, volte ao mapa original.');return}if(!painel.hidden){fechar(e);return}for(const outra of entradas.values())if(outra!==e)fechar(outra);painel.hidden=false;abrir.setAttribute('aria-expanded','true');try{await preparar(e);selecionar(e,null)}catch{}};
  for(const b of painel.querySelectorAll('[data-tuba-acao]'))b.onclick=()=>executar(e,b.dataset.tubaAcao);
  for(const b of painel.querySelectorAll('[data-tuba-lado]'))b.onclick=()=>alternarLado(e,b.dataset.tubaLado);
  e.remover.onclick=()=>{if(ocupado()||!e.tipo)return;for(const l of e.lado==='ambos'?config.lados:[e.lado]){const s=e.estado[l];if(e.tipo==='salpingectomia')delete s.removida;else if(e.tipo==='posicao')s.posicao=M.pose();else if(e.tipo==='hidro'){s.inserida=false;s.tuba=s.tubaAnterior||M.segmento();s.tubaAnterior=null;s.inicio=0;s.fim=100}else if(e.tipo==='tubas')s.tuba=M.segmento();else s.espessamento={ativo:false,inicio:38,fim:60}}renderizar(e);selecionar(e,null)};
  painel.querySelector('[data-tuba-restaurar]').onclick=()=>{if(!ocupado())restaurar(vista)};
  new ResizeObserver(()=>posicionar(e)).observe(desenho);
  desenho.addEventListener('pointerdown',ev=>{if(!ev.target.closest('.tubas-marcador'))selecionar(e,null)});
 }
 function restaurar(vista,dados){const e=entradas.get(vista);M.validar(vista,dados);if(!e)return;e.estado=structuredClone(dados||M.inicial(vista));e.valido=false;selecionar(e,null);if(e.motor)renderizar(e);else if(ativo(e))return preparar(e);else{e.tela.getContext('2d').clearRect(0,0,1086,1448);e.valido=true}}
 window.endomapaTubas={
  estado:v=>{const e=entradas.get(v);return e&&ativo(e)?structuredClone(e.estado):undefined},validar:M.validar,
  alterado:v=>Boolean(entradas.get(v)&&ativo(entradas.get(v))),
  ocupado:()=>restaurando||[...entradas.values()].some(e=>e.carregando),
  async aguardar(){await Promise.all([...entradas.values()].map(e=>e.carregando))},
  restaurar,restaurarTodas(vistas){const pendentes=[];restaurando=true;for(const e of entradas.values()){e.estado=structuredClone(vistas?.[e.vista]?.tubas||M.inicial(e.vista));e.valido=false;selecionar(e,null);if(e.motor)renderizar(e);else if(ativo(e))pendentes.push(e);else{e.tela.getContext('2d').clearRect(0,0,1086,1448);e.valido=true}}if(!pendentes.length){restaurando=false;return Promise.resolve()}return (async()=>{for(const e of pendentes)await preparar(e)})().finally(()=>{restaurando=false})},
  desativar(){for(const e of entradas.values())selecionar(e,null)},
  fotografar(v){const e=entradas.get(v);if(!e||!ativo(e))return null;if(!e.motor&&!e.valido)throw Error('Aguarde o preparo das tubas.');if(e.motor)renderizar(e);const c=M.canvas();c.getContext('2d').drawImage(e.tela,0,0);return c},
  preparar:async v=>preparar(entradas.get(v))
 };
 for(const tipo of ['endomapa:ovario-movido','endomapa:orgaos-redesenhados'])window.addEventListener(tipo,ev=>{const e=entradas.get(ev.detail?.vista||'coronal');if(e?.motor)renderizar(e);else if(e&&ativo(e))preparar(e).catch(()=>{})});
 for(const tipo of ['endomapa:vistas-alteradas','endomapa:movimentar-ovarios','endomapa:movimentar-utero'])window.addEventListener(tipo,()=>window.endomapaTubas.desativar());
 window.addEventListener('endomapa:perfil-carregado',ev=>{if(conta!==ev.detail.id)window.endomapaTubas.restaurarTodas({}).catch(()=>{});conta=ev.detail.id});
})();
