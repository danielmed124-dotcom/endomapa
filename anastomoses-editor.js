(() => {
  'use strict';
  const definitions = {
    linear: {name:'Linear (coronal)',min:0,position:50,size:100,max:13},
    'discoide-coronal': {name:'Discoide (coronal)',min:0,position:50,size:100,max:6},
    'linear-sagital': {name:'Linear (sagital)',min:58,position:75,size:5,max:15,directCount:true},
    discoide: {name:'Discoide (sagital)',min:58,position:58},
    'segmentar-coronal': {name:'Segmentar (coronal)',min:0,position:100,size:400},
    'segmentar-sagital': {name:'Segmentar (sagital)',min:58,position:58}
  };
  const pelvic = new Set(['coronal','utero-retrofletido','ooforectomia-direita','ooforectomia-esquerda','ooforectomia-bilateral','kissing-ovaries','hidrosalpinge-direita','hidrosalpinge-esquerda','hidrosalpinge-bilateral',...window.endocartaHisterectomias.modelos.map(m=>m.id)]);
  const views=new Map(),engines={}, selections=new Map();let active='coronal', callbacks={}, sequence=0, annotationsHidden=false;
  const allowed=(kind,view)=>['linear','discoide-coronal','segmentar-coronal'].includes(kind)?pelvic.has(view):['discoide','linear-sagital','segmentar-sagital'].includes(kind)&&view==='sagital';
  const root=document.createElement('section');root.className='anastomoses';root.setAttribute('aria-label','Alterações pós cirúrgicas (anastomoses)');
  root.innerHTML='<h3>Alterações pós cirúrgicas (anastomoses)</h3><div class="anastomoses-opcoes"></div><p data-anastomoses-aviso role="status"></p><div data-anastomoses-ajustes hidden><label>Representação inserida<select data-anastomoses-selecao></select></label><label>Posição <output data-anastomoses-valor></output><input data-anastomoses-posicao type="range" max="100" step="1"></label><label data-anastomoses-comprimento><span data-anastomoses-rotulo>Comprimento</span> <output data-anastomoses-quantidade></output><input data-anastomoses-tamanho type="range" min="50" max="400" step="1"></label><label>Distância da borda anal (cm)<input type="text" inputmode="decimal" maxlength="12" placeholder="Ex.: 12,5" data-anastomoses-distancia></label><button class="botao botao--secundario" type="button" data-anastomoses-remover>Remover representação</button></div>';
  const library=document.querySelector('.biblioteca-lesoes__lista');
  const lastAdhesion=[...library.querySelectorAll('[data-modelo]')].filter(b=>/^Aderência/i.test(b.dataset.nome)).at(-1);
  if(lastAdhesion)lastAdhesion.after(root);else library.append(root);
  const $=s=>root.querySelector(s),panel=$('[data-anastomoses-ajustes]'),select=$('select'),position=$('[data-anastomoses-posicao]'),size=$('[data-anastomoses-tamanho]'),notice=$('[data-anastomoses-aviso]'),distance=$('[data-anastomoses-distancia]');
  for(const [kind,def] of Object.entries(definitions)) {
    const button=document.createElement('button');button.type='button';button.className='botao botao--secundario';button.dataset.anastomose=kind;button.textContent=def.name;button.disabled=true;
    button.onclick=()=>{try{insert(kind,active)}catch(e){notice.textContent=e.message}};$('.anastomoses-opcoes').append(button);
  }
  for(const map of document.querySelectorAll('[data-mapa-editor]')) {
    const id=map.dataset.mapaEditor,drawing=map.querySelector('.mapa-editor__desenho'),base=map.querySelector('[data-mapa-base]');
    const overlay=document.createElement('canvas');overlay.className='anastomoses-camada';overlay.hidden=true;overlay.setAttribute('aria-hidden','true');drawing.append(overlay);
    const handles=document.createElement('div');handles.className='anastomoses-alcas';drawing.append(handles);
    const labels=document.createElement('div');labels.className='anastomoses-rotulos';drawing.append(labels);
    views.set(id,{map,base,overlay,handles,labels,items:[],version:0});
    new ResizeObserver(()=>updateLabels(id)).observe(drawing);
    base.addEventListener('load',()=>refresh(id));
    new MutationObserver(()=>refresh(id)).observe(base,{attributes:true,attributeFilter:['src']});
  }
  function capture(id) {return structuredClone(views.get(id)?.items||[])}
  function validate(id,items) {
    if(items===undefined)return;
    if(!Array.isArray(items)||items.length>50)throw Error('Representações intestinais inválidas.');
    const ids=new Set();
    for(const item of items) {
      const def=definitions[item?.kind];
      if(!def||!allowed(item.kind,id)||typeof item.id!=='string'||!/^[a-z0-9-]{1,60}$/.test(item.id)||ids.has(item.id)||!Number.isFinite(item.position)||item.position<def.min||item.position>100||(def.size!==undefined&&(!Number.isFinite(item.size)||item.size<(def.directCount?1:50)||item.size>(def.directCount?def.max:400)||(def.directCount&&!Number.isInteger(item.size))))||(def.size===undefined&&item.size!==undefined))throw Error('Representação intestinal incompatível com esta vista ou com os limites aprovados.');
      if(item.distanciaBordaAnal!==undefined&&(typeof item.distanciaBordaAnal!=='string'||item.distanciaBordaAnal.length>12||(item.distanciaBordaAnal!==''&&!/^(?:\d+(?:[,.]\d*)?|[,.]\d+)$/.test(item.distanciaBordaAnal))))throw Error('Distância da borda anal inválida.');
      if(item.rotulo!==undefined&&(!item.rotulo||!Number.isFinite(item.rotulo.x)||!Number.isFinite(item.rotulo.y)||item.rotulo.x<0||item.rotulo.x>100||item.rotulo.y<0||item.rotulo.y>100))throw Error('Posição do nome inválida.');
      ids.add(item.id);
    }
  }
  function selected(){return views.get(active)?.items.find(i=>i.id===selections.get(active))}
  function updateUI() {
    for(const b of root.querySelectorAll('[data-anastomose]')){b.hidden=!allowed(b.dataset.anastomose,active);b.disabled=!engines[b.dataset.anastomose];}
    notice.textContent=Object.keys(definitions).some(k=>allowed(k,active))?'Escolha uma representação para inserir nesta vista.':'Estas representações não estão disponíveis neste mapa.';
    const items=views.get(active)?.items||[],item=selected();select.replaceChildren();
    items.forEach((i,index)=>{const o=document.createElement('option');o.value=i.id;o.textContent=definitions[i.kind].name+(items.filter(x=>x.kind===i.kind).length>1?' · '+(index+1):'');select.append(o)});
    panel.hidden=!items.length;
    if(items.length&&!item){const option=document.createElement('option');option.value='';option.textContent='Escolha uma representa\u00e7\u00e3o';option.selected=true;select.prepend(option);}
    for(const control of panel.children){if(!control.contains(select))control.hidden=!item;}
    if(item){if(document.activeElement!==distance)distance.value=item.distanciaBordaAnal||'';select.value=item.id;position.min=definitions[item.kind].min;position.value=item.position;$('[data-anastomoses-valor]').textContent=Math.round(item.position)+'%';$('[data-anastomoses-comprimento]').hidden=item.size===undefined;
      if(item.size!==undefined){const def=definitions[item.kind],max=def.max||20;$('[data-anastomoses-rotulo]').textContent=def.directCount?'Quantidade de grampos':'Comprimento';size.min=def.directCount?1:50;size.max=def.directCount?max:400;size.value=item.size;const count=def.directCount?item.size:Math.max(2,Math.min(max,Math.round(2+(max-2)*(item.size-50)/350)));$('[data-anastomoses-quantidade]').textContent=count+' grampos';}}
    for(const [id,v] of views) for(const h of v.handles.children)h.hidden=id!==active||h.dataset.id!==selections.get(id);
  }
  function insert(kind,id) {
    if(!allowed(kind,id))throw Error('Esta representação não pode ser inserida nesta vista.');
    if(!engines[kind])throw Error('Aguarde o carregamento da representação.');
    const v=views.get(id);if(v.items.length>=50)throw Error('Limite de representações nesta vista atingido.');
    const def=definitions[kind],item={id:'intestinal-'+Date.now().toString(36)+'-'+(++sequence),kind,position:def.position};if(def.size!==undefined)item.size=def.size;
    v.items.push(item);active=id;selections.set(id,item.id);deactivateOthers();refresh(id);updateUI();return item.id;
  }
  function deactivateOthers(){window.endomapaTubas?.desativar();window.endomapaOrgaos?.paraVista?.(active)?.desativar();window.endomapaUtero?.desativar();window.endomapaUteroCoronal?.desativar();window.dispatchEvent(new CustomEvent('endocarta:editar-anastomose'));}
  function set(id,itemId,values) {
    const v=views.get(id),index=v.items.findIndex(i=>i.id===itemId);if(index<0)throw Error('Representação não encontrada.');
    const updated={...v.items[index],...values};validate(id,[updated]);const previous=v.items[index];v.items[index]=updated;
    if(previous.position!==updated.position||previous.size!==updated.size){
      if(!v.frame)v.frame=requestAnimationFrame(()=>{v.frame=0;refresh(id);});
      if(Object.keys(values).length===1&&values.position!==undefined){position.value=updated.position;$('[data-anastomoses-valor]').textContent=Math.round(updated.position)+'%';}
      else updateUI();
    }else updateLabels(id);
  }
  select.onchange=()=>{selections.set(active,select.value);if(selected())deactivateOthers();updateUI()};
  position.oninput=()=>{const i=selected();if(i)set(active,i.id,{position:+position.value})};
  distance.oninput=()=>{const i=selected();if(!i)return;distance.value=callbacks.limparMedida(distance.value);const value=callbacks.numeroIntestinal(distance.value)?distance.value:'';set(active,i.id,{distanciaBordaAnal:value});};
  size.oninput=()=>{const i=selected();if(i)set(active,i.id,{size:+size.value})};
  function removeSelected(id=active){
    if(id!==active)return false;
    const v=views.get(id),item=selected();if(!item)return false;
    v.items=v.items.filter(x=>x.id!==item.id);selections.set(id,v.items.at(-1)?.id);refresh(id);updateUI();return true;
  }
  $('[data-anastomoses-remover]').onclick=()=>removeSelected();
  function compose(canvas,items) {
    const ctx=canvas.getContext('2d');
    for(const item of items){const engine=engines[item.kind];if(!engine)throw Error('Aguarde o carregamento das representações.');const rendered=engine.render(canvas,item);ctx.drawImage(rendered,0,0,canvas.width,canvas.height);}
  }
  function labelData(item){
    const engine=engines[item.kind];
    const a=engine.labelAnchor(item),x=a.x/engine.width*100,y=a.y/engine.height*100;
    const name='Anastomose '+definitions[item.kind].name.split(' (')[0].toLocaleLowerCase('pt-BR');
    const lines=[name];
    if(item.distanciaBordaAnal){lines.push('Distância da borda anal:',callbacks.formatarMedida(item.distanciaBordaAnal)+' cm');}
    const target=item.rotulo||{x:x>65?x-22:x+24,y:Math.max(5,y-10)};
    return {lines,dataset:{x,y,medidaX:target.x,medidaY:target.y}};
  }
  function updateLabels(id){
    const v=views.get(id);if(!v)return;
    const area=v.labels.getBoundingClientRect();
    const known=new Map([...v.labels.children].map(e=>[e.dataset.id,e]));
    for(const item of v.items){
      if(!engines[item.kind])continue;
      let group=known.get(item.id);known.delete(item.id);
      if(!group){
        group=document.createElement('div');group.dataset.id=item.id;
        const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('anastomoses-linha');svg.setAttribute('viewBox','0 0 100 100');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-hidden','true');
        const line=document.createElementNS('http://www.w3.org/2000/svg','line');line.setAttribute('vector-effect','non-scaling-stroke');svg.append(line);
        const dot=document.createElement('span');dot.className='anastomoses-ponto';
        const label=document.createElement('span');label.className='medida-lesao-editavel';label.dataset.medidaId=item.id;label.setAttribute('aria-label','Arraste para mover o nome e a distância');
        group.append(svg,label,dot);v.labels.append(group);
        label.onpointerdown=e=>{e.preventDefault();e.stopPropagation();active=id;selections.set(id,item.id);deactivateOthers();updateUI();label.setPointerCapture(e.pointerId);};
        label.onpointermove=e=>{
          if(!label.hasPointerCapture(e.pointerId))return;
          const r=v.labels.getBoundingClientRect();if(!r.width||!r.height)return;
          const x=Math.max(4,Math.min(96,(e.clientX-r.left)/r.width*100)),y=Math.max(4,Math.min(96,(e.clientY-r.top)/r.height*100));
          set(id,item.id,{rotulo:{x,y}});
        };
      }
      const {lines,dataset:d}=labelData(item),[svg,label,dot]=group.children,line=svg.firstElementChild;
      group.hidden=annotationsHidden;label.textContent=lines.join('\n');
      const mx=area.width?(label.offsetWidth/2+4)/area.width*100:0,my=area.height?(label.offsetHeight+4)/area.height*100:0;
      const tx=Math.max(mx,Math.min(100-mx,d.medidaX)),ty=Math.max(1,Math.min(100-my,d.medidaY));
      label.style.left=tx+'%';label.style.top=ty+'%';
      line.setAttribute('x1',d.x);line.setAttribute('y1',d.y);line.setAttribute('x2',tx);line.setAttribute('y2',ty);
      dot.style.left=d.x+'%';dot.style.top=d.y+'%';
    }
    known.forEach(e=>e.remove());
  }
  function captureLabels(id){
    const v=views.get(id);if(!v||annotationsHidden)return [];
    updateLabels(id);
    return v.items.filter(i=>engines[i.kind]).map(item=>{
      const data=labelData(item),label=v.labels.querySelector(`[data-medida-id="${item.id}"]`);
      if(!label)return null;
      data.dataset.medidaX=parseFloat(label.style.left);data.dataset.medidaY=parseFloat(label.style.top);
      return {dataset:data.dataset,linhasAnastomose:data.lines,estiloRotulo:callbacks.fotografarEstilo(label,v.labels)};
    }).filter(Boolean);
  }
  function handles(id) {
    const v=views.get(id),known=new Map([...v.handles.children].map(h=>[h.dataset.id,h]));
    for(const item of v.items){const engine=engines[item.kind];if(!engine)continue;let h=known.get(item.id);known.delete(item.id);
      if(!h){h=document.createElement('button');h.type='button';h.className='anastomoses-alca';h.dataset.id=item.id;h.textContent='↕';h.setAttribute('aria-label','Mover '+definitions[item.kind].name);v.handles.append(h);let drag;
        h.onpointerdown=e=>{if(e.button!==0)return;active=id;selections.set(id,item.id);deactivateOthers();const current=v.items.find(i=>i.id===item.id),a=engine.anchor(current),r=v.overlay.getBoundingClientRect();drag={id:e.pointerId,dx:(e.clientX-r.left)*engine.width/r.width-a.x,dy:(e.clientY-r.top)*engine.height/r.height-a.y};h.setPointerCapture(e.pointerId);h.style.opacity='0';e.preventDefault();e.stopPropagation();updateUI()};
        h.onpointermove=e=>{if(!drag||drag.id!==e.pointerId)return;const current=v.items.find(i=>i.id===item.id),r=v.overlay.getBoundingClientRect(),x=(e.clientX-r.left)*engine.width/r.width-drag.dx,y=(e.clientY-r.top)*engine.height/r.height-drag.dy;let best=current.position,d=Infinity;
          for(let p=definitions[item.kind].min;p<=100;p++){const a=engine.anchor(current,p),delta=(a.x-x)**2+(a.y-y)**2;if(delta<d){d=delta;best=p}}if(best!==current.position)set(id,item.id,{position:best});};
        h.onpointerup=h.onpointercancel=h.onlostpointercapture=()=>{drag=null;h.style.opacity=''};
        h.onkeydown=e=>{if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();e.stopPropagation();const current=v.items.find(i=>i.id===item.id);set(id,item.id,{position:Math.max(definitions[item.kind].min,Math.min(100,current.position+(['ArrowUp','ArrowRight'].includes(e.key)?2:-2)))})};
      }
      const a=engine.anchor(item);h.style.left=a.x/engine.width*100+'%';h.style.top=a.y/engine.height*100+'%';h.hidden=id!==active||selections.get(id)!==item.id;
    }
    known.forEach(h=>h.remove());
  }
  async function refresh(id) {
    const v=views.get(id);if(!v)return;const version=++v.version;
    if(!v.items.length){v.overlay.hidden=true;v.handles.replaceChildren();v.labels.replaceChildren();return;}
    try{
      await ready;await v.base.decode();if(version!==v.version)return;
      if(v.items.every(item=>engines[item.kind].direct)){
        if(v.overlay.width!==v.base.naturalWidth||v.overlay.height!==v.base.naturalHeight){v.overlay.width=v.base.naturalWidth;v.overlay.height=v.base.naturalHeight;}
        v.overlay.getContext('2d').clearRect(0,0,v.overlay.width,v.overlay.height);
        compose(v.overlay,v.items);v.overlay.hidden=false;handles(id);updateLabels(id);return;
      }
      const canvas=document.createElement('canvas');canvas.width=v.base.naturalWidth;canvas.height=v.base.naturalHeight;const ctx=canvas.getContext('2d',{willReadFrequently:true});
      ctx.drawImage(v.base,0,0);const organs=callbacks.fotografarOrgaos?.(id);if(organs)ctx.drawImage(organs,0,0,canvas.width,canvas.height);
      const before=ctx.getImageData(0,0,canvas.width,canvas.height);compose(canvas,v.items);
      const after=ctx.getImageData(0,0,canvas.width,canvas.height);
      for(let i=0;i<after.data.length;i+=4)if(after.data[i]===before.data[i]&&after.data[i+1]===before.data[i+1]&&after.data[i+2]===before.data[i+2]&&after.data[i+3]===before.data[i+3])after.data[i+3]=0;
      v.overlay.width=canvas.width;v.overlay.height=canvas.height;v.overlay.getContext('2d').putImageData(after,0,0);v.overlay.hidden=false;handles(id);updateLabels(id);
    }catch(e){notice.textContent='Não foi possível preparar a representação: '+e.message;console.error(e)}
  }
  const ready=Promise.all(Object.entries(window.endocartaMotoresIntestinais).map(async([kind,p])=>{engines[kind]=await p})).then(()=>{updateUI()});
  window.endocartaAnastomoses={pronto:ready,definicoes:definitions,permite:allowed,capturar:capture,validar:validate,inserir:insert,ajustar:set,compor:compose,
    configurar(c){callbacks=c},removerSelecionada:removeSelected,desativar(id){selections.delete(id);updateUI();},capturarRotulos:captureLabels,ocultarAnotacoes(value){annotationsHidden=value;for(const id of views.keys())updateLabels(id);},ativar(id){active=id;updateUI();refresh(id)},tem:id=>Boolean(views.get(id)?.items.length),
    limpar(id){const v=views.get(id);if(v){v.items=[];selections.delete(id);refresh(id);updateUI()}},
    restaurar(vistas){for(const [id,v] of views){v.items=structuredClone(vistas[id]?.anastomoses||[]);selections.set(id,v.items.at(-1)?.id);refresh(id)}updateUI()},
    atualizar:refresh
  };
  for(const event of ['endomapa:utero-movido','endomapa:ovario-movido','endomapa:orgaos-redesenhados','endomapa:tubas-redesenhadas'])window.addEventListener(event,e=>refresh(e.detail?.vista||active));
  updateUI();
})();
