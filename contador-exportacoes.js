(function () {
  'use strict';
  function falha() {
    const erro = new Error('Não foi possível confirmar o registro da exportação. Confira a conexão e tente novamente. O arquivo não foi liberado; sua montagem continua aberta.');
    erro.exportacao = true;
    return erro;
  }
  async function registrar(cliente, evento, etapa) {
    // Reenvios usam o mesmo identificador: uma resposta perdida não duplica eventos.
    for (let tentativa = 0; tentativa < 2; tentativa++) {
      try {
        const controlador = new AbortController();
        const limite = setTimeout(() => controlador.abort(), 12000);
        try {
          const { data, error } = await cliente.rpc('registrar_exportacao_arquivo', {
            p_id: evento.id, p_formato: evento.formato,
            p_ferramenta: evento.ferramenta, p_etapa: etapa,
          }).abortSignal(controlador.signal);
          if (!error && data === evento.id) return;
          if (error && ['42501', '22023'].includes(error.code)) break;
        } finally { clearTimeout(limite); }
      } catch (_) { /* Segunda tentativa limitada; nunca liberar sem confirmação. */ }
    }
    throw falha();
  }
  async function baixar({ endereco, nome, formato, ferramenta }) {
    const cliente = window.endomapaSupabase;
    if (!cliente || !['pdf', 'png', 'jpeg'].includes(formato) || !['mapa', 'fusao'].includes(ferramenta)) throw falha();
    const evento = { id: crypto.randomUUID(), formato, ferramenta };
    // O arquivo já está pronto. O servidor deriva o usuário da sessão autenticada.
    await registrar(cliente, evento, 'preparado');
    const link = document.createElement('a');
    link.href = endereco;
    link.download = nome;
    document.body.append(link);
    try { link.click(); } finally { link.remove(); }
    // Se esta confirmação falhar, o evento preparado continua visível no relatório.
    // Não repetir o download automaticamente nem afirmar que o aparelho salvou o arquivo.
    try {
      await registrar(cliente, evento, 'acionado');
      return { id: evento.id, acionamentoConfirmado: true };
    } catch (_) {
      return { id: evento.id, acionamentoConfirmado: false };
    }
  }
  window.endocartaExportacoes = Object.freeze({ baixar });
})();
