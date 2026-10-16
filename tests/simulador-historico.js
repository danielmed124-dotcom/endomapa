window.__historico = { mapas: new Map(), pdfs: [], falhar: false, atrasar: null, confirmar: false, erros: [] };
window.confirm = () => window.__historico.confirmar;
window.alert = texto => window.__historico.erros.push(texto);
window.endomapaSupabase = {
  async rpc(nome, p) {
    const h = window.__historico;
    if (h.atrasar) await h.atrasar;
    if (h.falhar) return { error: { message: 'Falha simulada' } };
    if(nome==='registrar_pdf_manual'){if(!h.pdfs.some(r=>r.id===p.p_id))h.pdfs.push({id:p.p_id,criado_em:new Date().toISOString()});return {data:null};}
    if(nome==='reordenar_mapa_manual'){
      const itens=[...h.mapas.values()].sort((a,b)=>(a.ordem||0)-(b.ordem||0)||b.criado_em.localeCompare(a.criado_em)||a.id.localeCompare(b.id));
      const origem=itens.findIndex(m=>m.id===p.p_id),item=itens.splice(origem,1)[0],destino=itens.findIndex(m=>m.id===p.p_destino);
      itens.splice(destino+(p.p_depois?1:0),0,item);itens.forEach((m,i)=>m.ordem=i+1);return {data:null};
    }
    if(nome==='excluir_mapa_manual'){if(h.mapas.get(p.p_id)?.versao!==p.p_versao)return {error:{code:'40001'}};h.mapas.delete(p.p_id);return {data:null};}
    const anterior = h.mapas.get(p.p_id);
    if (anterior && anterior.versao !== p.p_versao) return { error: { code: '40001' } };
    const mapa = { id: p.p_id, titulo: p.p_titulo, montagem: structuredClone(p.p_montagem), ordem:anterior?.ordem||0, versao: (anterior?.versao || 0) + 1, criado_em: anterior?.criado_em || new Date().toISOString(), atualizado_em: new Date().toISOString() };
    h.mapas.set(mapa.id, mapa);
    if (p.p_pdf_id) h.pdfs.push({ id: p.p_pdf_id, mapa_id: mapa.id, criado_em: new Date().toISOString() });
    return { data: structuredClone(mapa) };
  },
  from(tabela) {
    let filtros = [], intervalo = null, contagem = false, unico = false, ordens=[];
    const q = {
      select(campos, opcoes) { contagem = Boolean(opcoes?.count); return this; },
      eq(c,v) { filtros.push(r => r[c] === v); return this; },
      gte(c,v) { filtros.push(r => r[c] >= v); return this; },
      lt(c,v) { filtros.push(r => r[c] < v); return this; },
      order(c,opcoes) { ordens.push([c,opcoes?.ascending!==false?1:-1]); return this; },
      range(a,b) { intervalo = [a,b]; return this; },
      single() { unico = true; return this; },
      then(resolve,reject) {
        if (window.__historico.falhar) return Promise.resolve({error:{message:'Falha simulada'}}).then(resolve,reject);
        let linhas = tabela === 'mapas_manuais' ? Array.from(window.__historico.mapas.values()) : window.__historico.pdfs;
        linhas = linhas.filter(r => filtros.every(f => f(r)));
        linhas.sort((a,b)=>{for(const [c,s]of ordens){if(a[c]<b[c])return -s;if(a[c]>b[c])return s}return 0});
        const count = linhas.length;
        if (intervalo) linhas = linhas.slice(intervalo[0], intervalo[1]+1);
        return Promise.resolve({ data: structuredClone(unico ? linhas[0] : linhas), count: contagem ? count : null }).then(resolve,reject);
      },
    };
    return q;
  },
};
