(function () {
  'use strict';
  const painel = document.querySelector('[data-painel-adesao]');
  if (!painel) return;
  const estado = painel.querySelector('[data-estado-adesao]');
  const numeros = painel.querySelector('[data-numeros-adesao]');
  const atualizar = painel.querySelector('[data-atualizar-adesao]');
  let rodada = 0;
  async function carregar() {
    const atual = ++rodada;
    painel.hidden = true; numeros.hidden = true;
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
      estado.textContent = `Atualizado em ${dataHora(resumo.atualizado_em)} (Brasília). ` + (resumo.inicio ? `Novo contador desde ${dataHora(resumo.inicio)}. ` : 'Nenhuma exportação no novo contador. ') + `${resumo.sem_confirmacao} registro(s) ainda sem confirmação de acionamento. Histórico anterior incompleto: ${resumo.pdfs_antigos_incompletos} PDFs, fora dos totais acima.`;
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
