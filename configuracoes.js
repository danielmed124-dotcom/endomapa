(() => {
 'use strict';
 const sair=document.querySelector('[data-sair]');if(!sair)return;
 const botao=document.createElement('button');botao.type='button';botao.className='config-engrenagem';botao.title='Configurações';botao.setAttribute('aria-label','Configurações');botao.setAttribute('aria-haspopup','dialog');botao.disabled=true;
 botao.innerHTML='<svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m9 3 .7 2.2a7 7 0 0 1 4.6 0L15 3l3 1.7-.6 2.3a7 7 0 0 1 2.3 4l2.3.5v3l-2.3.5a7 7 0 0 1-2.3 4l.6 2.3L15 23l-.7-2.2a7 7 0 0 1-4.6 0L9 23l-3-1.7.6-2.3a7 7 0 0 1-2.3-4L2 14.5v-3l2.3-.5a7 7 0 0 1 2.3-4L6 4.7Z" transform="translate(1 -1) scale(.91)"/><circle cx="12" cy="11.8" r="3.5"/></svg>';
 sair.before(botao);
 const dialog=document.createElement('dialog');dialog.className='config-dialog';dialog.setAttribute('aria-labelledby','config-titulo');
 dialog.innerHTML=`<form class="config-form"><header><div><p class="config-selo">SEU ENDOCARTA</p><h2 id="config-titulo">Configurações</h2></div><button type="button" class="config-fechar" aria-label="Fechar configurações">×</button></header>
 <p class="config-intro">Personalize a identificação e a aparência dos seus mapas.</p>
 <label for="config-assinatura">Nome de assinatura</label><input id="config-assinatura" name="assinatura" type="text" maxlength="100" required autocomplete="off"><p class="config-ajuda">Nome que aparece na assinatura dos mapas.</p>
 <label for="config-logo">Logomarca</label><div class="config-logo-preview"><img alt="Prévia da logomarca" hidden><span>Nenhuma imagem selecionada</span></div><input id="config-logo" type="file" accept="image/png,image/jpeg,image/webp"><p class="config-ajuda">PNG, JPG ou WebP de até 5 MB. A imagem mantém suas proporções.</p><button class="config-restaurar" type="button">Usar logomarca original do cadastro</button>
 <fieldset><legend>Definir cor do mapa</legend><label><input type="radio" name="cor" value="colorido"> Colorido</label><label><input type="radio" name="cor" value="cinza"> Em escala de cinza</label></fieldset>
 <label for="config-transparencia">Transparência do mapa <output id="config-transparencia-valor">0%</output></label><input id="config-transparencia" type="range" min="0" max="100" step="1" value="0"><p class="config-ajuda">Aplicada ao mapa em escala de cinza. Você também pode ajustar na tela do mapa.</p>
 <p class="config-ajuda">A escolha será o padrão dos novos mapas. Mapas reabertos mantêm a cor que foi salva.</p><p class="config-status" role="status" aria-live="polite"></p>
 <footer><button type="button" class="config-cancelar">Cancelar</button><button type="submit" class="config-salvar">Salvar alterações</button></footer></form>`;
 document.body.append(dialog);
 const $=s=>dialog.querySelector(s),form=$('form'),assinatura=$('#config-assinatura'),arquivo=$('#config-logo'),status=$('.config-status'),salvar=$('.config-salvar'),preview=$('.config-logo-preview img');
 const imagens=new Map();let perfil=null,rascunho=null,salvando=false,lendo=false,tentativa=0;
 function validar(d){d={...d,transparencia_cinza:d?.transparencia_cinza??0};if(!Number.isInteger(d.transparencia_cinza)||d.transparencia_cinza<0||d.transparencia_cinza>100)throw Error("Escolha uma transparência entre 0% e 100%.");if(!d||typeof d.assinatura!=='string'||!d.assinatura.trim()||d.assinatura.trim().length>100||/[\x00-\x1f\x7f]/.test(d.assinatura))throw Error('Preencha uma assinatura válida com até 100 caracteres.');if(!['colorido','cinza'].includes(d.cor_mapa))throw Error('Escolha a cor do mapa.');if(d.logo_png!==null&&(typeof d.logo_png!=='string'||d.logo_png.length>700000||!/^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+/=]+$/.test(d.logo_png)))throw Error('Selecione uma logomarca válida.');return {...d,assinatura:d.assinatura.trim()}}
 async function carregarImagem(src){if(!src)return null;if(imagens.has(src))return imagens.get(src);const img=new Image();img.src=src;await img.decode();imagens.set(src,img);return img}
 function dados(p){return {assinatura:p.assinatura,cor_mapa:p.configuracoes?.cor_mapa||'colorido',transparencia_cinza:p.configuracoes?.transparencia_cinza??0,logo_png:p.configuracoes?.logo_png||null}}
 function mensagem(t,erro=false){status.textContent=t;status.classList.toggle('config-erro',erro)}
 function mostrarLogo(){
  const original=window.endocartaLogoCadastro?.(perfil);
  const src=rascunho.logo_png||original?.src;
  preview.hidden=!src;if(src)preview.src=src;else preview.removeAttribute('src');
  const legenda=$('.config-logo-preview span');legenda.hidden=!!src;
  legenda.textContent=original?.incorporada?'Logomarca original preservada no mapa.':'Nenhuma logomarca no cadastro.';
  const restaurar=$('.config-restaurar');restaurar.disabled=salvando||lendo;
  restaurar.textContent=original?.src||original?.incorporada?'Usar logomarca original do cadastro':'Remover logomarca personalizada';
 }
 function bloquear(v){salvando=v;form.querySelectorAll('input,button').forEach(x=>x.disabled=v);if(!v){salvar.disabled=lendo;mostrarLogo()}}
 function fechar(){if(salvando)return;tentativa++;lendo=false;dialog.close();botao.focus()}
 function aplicarPadrao(){const c=document.querySelector('[data-mapa-escala-cinza]');if(!c||!perfil)return;const t=document.querySelector('[data-transparencia-cinza]');if(t)t.value=String(perfil.configuracoes?.transparencia_cinza??0);c.checked=perfil.configuracoes?.cor_mapa==='cinza';c.dispatchEvent(new Event('change',{bubbles:true}));}
 const api=window.endocartaConfiguracoes={
  validar,aplicarPadrao,
  logo:p=>imagens.get(p?.configuracoes?.logo_png)||null,
  async carregar(p){const adapter=window.endocartaPreferenciasTeste;let config;
   if(adapter)config=await adapter.ler(p.user_id);
   else {const {data,error}=await window.endomapaSupabase.from('preferencias_mapas').select('cor_mapa,logo_png,transparencia_cinza').eq('user_id',p.user_id).maybeSingle();if(error)throw Error('Não foi possível carregar as configurações.');config=data;}
   const next={...p,assinatura:config?.assinatura||p.assinatura,configuracoes:{cor_mapa:config?.cor_mapa||'colorido',transparencia_cinza:config?.transparencia_cinza??0,logo_png:config?.logo_png||null}};
   validar(dados(next));await carregarImagem(next.configuracoes.logo_png);return next;
  }
 };
 window.addEventListener('endomapa:perfil-carregado',e=>{const mudou=perfil?.user_id!==e.detail.user_id;perfil=e.detail;botao.disabled=false;if(mudou){if(dialog.open)fechar();aplicarPadrao()}});
 botao.onclick=()=>{if(!perfil)return;rascunho=dados(perfil);assinatura.value=rascunho.assinatura;form.elements.cor.value=rascunho.cor_mapa;$('#config-transparencia').value=rascunho.transparencia_cinza;atualizarTransparencia();arquivo.value='';mensagem('');lendo=false;bloquear(false);mostrarLogo();dialog.showModal();assinatura.focus()};
 function atualizarTransparencia(){const t=$('#config-transparencia');$('#config-transparencia-valor').textContent=t.value+'%';t.setAttribute('aria-valuetext',t.value+'% de transparência')}
 $('#config-transparencia').oninput=atualizarTransparencia;
 $('.config-fechar').onclick=$('.config-cancelar').onclick=fechar;
 dialog.addEventListener('cancel',e=>{e.preventDefault();fechar()});
 $('.config-restaurar').onclick=()=>{tentativa++;const mudou=!!rascunho.logo_png;rascunho.logo_png=null;arquivo.value='';mostrarLogo();const original=window.endocartaLogoCadastro?.(perfil);mensagem(original?.src||original?.incorporada?(mudou?'Logomarca original selecionada. Clique em Salvar alterações para aplicar.':'A logomarca original do cadastro já está em uso.'):(mudou?'Logomarca removida da prévia. Clique em Salvar alterações para aplicar.':'Este cadastro não tem logomarca.'))};
 arquivo.onchange=async()=>{const file=arquivo.files[0];if(!file)return;const seq=++tentativa;lendo=true;salvar.disabled=true;$('.config-restaurar').disabled=true;mensagem('Preparando imagem…');try{
   if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5*1024*1024)throw Error('Escolha PNG, JPG ou WebP de até 5 MB.');
   const url=URL.createObjectURL(file);let img=new Image();try{img.src=url;await img.decode();if(img.naturalWidth*img.naturalHeight>40000000)throw Error('A imagem é muito grande. Escolha uma versão menor.');const scale=Math.min(1,1024/Math.max(img.naturalWidth,img.naturalHeight));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.naturalWidth*scale));c.height=Math.max(1,Math.round(img.naturalHeight*scale));c.getContext('2d').drawImage(img,0,0,c.width,c.height);const png=c.toDataURL('image/png');if(png.length>700000)throw Error('A imagem tem muitos detalhes. Escolha uma versão menor da logomarca.');if(seq!==tentativa||!dialog.open)return;await carregarImagem(png);rascunho.logo_png=png;mostrarLogo();mensagem('Imagem pronta. Clique em Salvar alterações para aplicar.')}finally{URL.revokeObjectURL(url)}
  }catch(e){if(seq===tentativa)mensagem(e.message||'Não foi possível abrir a imagem.',true)}finally{if(seq===tentativa){lendo=false;salvar.disabled=false;mostrarLogo()}}};
 form.onsubmit=async e=>{e.preventDefault();if(salvando||lendo||!perfil)return;if(window.endomapaEditorManual?.ocupado()||window.endomapaHistoricoManual?.ocupado()){mensagem('Aguarde a exportação ou o salvamento do mapa terminar.',true);return}let data;try{data=validar({...rascunho,assinatura:assinatura.value,cor_mapa:form.elements.cor.value,transparencia_cinza:Number($('#config-transparencia').value)})}catch(err){mensagem(err.message,true);return}
  const user=perfil.user_id;let salvo=false;bloquear(true);mensagem('Salvando alterações…');try{
   const adapter=window.endocartaPreferenciasTeste;let saved;
   if(adapter)saved=await adapter.salvar(user,data);
   else {const {data:result,error}=await window.endomapaSupabase.rpc('salvar_preferencias_mapas',{p_assinatura:data.assinatura,p_cor_mapa:data.cor_mapa,p_logo_png:data.logo_png,p_transparencia_cinza:data.transparencia_cinza});if(error)throw Error('Não foi possível salvar. Confira a conexão e tente novamente.');saved=result;}
   saved=validar(saved);await carregarImagem(saved.logo_png);if(perfil.user_id!==user)throw Error('A conta mudou. Reabra as configurações.');
   perfil={...perfil,assinatura:saved.assinatura,configuracoes:{cor_mapa:saved.cor_mapa,transparencia_cinza:saved.transparencia_cinza,logo_png:saved.logo_png}};window.endomapaMedico=perfil;window.dispatchEvent(new CustomEvent('endomapa:perfil-carregado',{detail:perfil}));aplicarPadrao();rascunho=saved;mensagem('Alterações salvas. Seus próximos mapas usarão estas configurações.');
   salvo=true;
  }catch(err){mensagem(err.message||'Não foi possível salvar. Tente novamente.',true)}finally{bloquear(false);if(salvo)fechar()}
 };
})();
