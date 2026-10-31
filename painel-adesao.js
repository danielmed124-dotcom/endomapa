(function () {
  'use strict';
  const painel = document.querySelector('[data-painel-adesao]');
  if (!painel) return;
  const estado = painel.querySelector('[data-estado-adesao]');
  const numeros = painel.querySelector('[data-numeros-adesao]');
  const ranking = painel.querySelector('[data-ranking-adesao]');
  const linhas = painel.querySelector('[data-ranking-linhas]');
  const atualizar = painel.querySelector('[data-atualizar-adesao]');
  let rodada = 0;
  async function carregar() {
    const atual = ++rodada;
    painel.hidden = true; numeros.hidden = true;
    ranking.hidden = true; linhas.replaceChildren();
    painel.querySelectorAll('[data-adesao]').forEach(elemento => { elemento.textContent = '—'; });
    estado.textContent = '';
    const cliente = window.endomapaSupabase;
    if (!cliente || document.querySelector('[data-tela="painel-dia"]')?.hidden) return;
    try {
      const { data, error } = await cliente.auth.getUser();
      if (atual !== rodada || error || data?.user?.email?.toLowerCase() !== 'danielmed124@gmail.com') return;
      painel.hidden = false; atualizar.disabled = true;
      estado.textContent = 'Carregando os totais de todos os usuários…';
      const resposta = await cliente.rpc('resumo_adesao_exportacoes');
      if (atual !== rodada) return;
      if (resposta.error || !resposta.data) throw new Error('Consulta não confirmada');
      const resumo = resposta.data;
      for (const periodo of ['hoje','semana','mes','total']) {
        const valor = Number(resumo[periodo]);
        if (!Number.isSafeInteger(valor) || valor < 0) throw new Error('Total inválido');
        painel.querySelector(`[data-adesao="${periodo}"]`).textContent = valor.toLocaleString('pt-BR');
      }
      const dataHora = valor => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(valor));
      estado.textContent = `Atualizado em ${dataHora(resumo.atualizado_em)} (Brasília). ` + (resumo.inicio ? `Registros desde ${dataHora(resumo.inicio)}. ` : 'Nenhuma exportação registrada. ') + `Os totais incluem ${resumo.pdfs_antigos_incompletos} PDFs do histórico anterior disponível. Exportações antigas não registradas não estão incluídas. ${resumo.sem_confirmacao} registro(s) novos ainda sem confirmação de acionamento.`;
      if (!Array.isArray(resumo.ranking)) throw new Error('Ranking indisponível');
      resumo.ranking.forEach((item, indice) => {
        const quantidade = Number(item.quantidade);
        if (typeof item.usuario !== 'string' || !Number.isSafeInteger(quantidade) || quantidade < 1) throw new Error('Ranking inválido');
        const linha = document.createElement('tr');
        for (const texto of [String(indice + 1), item.usuario, quantidade.toLocaleString('pt-BR')]) {
          const celula = document.createElement('td'); celula.textContent = texto; linha.append(celula);
        }
        linhas.append(linha);
      });
      painel.querySelector('[data-ranking-vazio]').hidden = resumo.ranking.length > 0;
      ranking.hidden = false;
      numeros.hidden = false;
    } catch (_) {
      if (atual === rodada && !painel.hidden) estado.textContent = 'Não foi possível atualizar os totais. Confira a conexão e tente novamente.';
    } finally { if (atual === rodada) atualizar.disabled = false; }
  }
  atualizar.addEventListener('click', carregar);
  window.addEventListener('endomapa:perfil-carregado', carregar);
  window.addEventListener('endomapa:tela-aberta', carregar);
  carregar();
})();
