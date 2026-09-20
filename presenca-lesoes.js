// Compara o contraste de uma lesão com o mesmo local no mapa anatômico limpo.
// Serve apenas para rejeitar perdas evidentes; a revisão médica continua necessária.
export function lesaoDesapareceu(original, base, gerada, mascara) {
  if (original.length !== base.length || original.length !== gerada.length || original.length !== mascara.length) {
    throw new Error("As imagens não têm o mesmo tamanho para conferir as lesões.");
  }
  let contrasteOriginal = 0;
  let contrasteGerado = 0;
  let pontos = 0;
  for (let i = 0; i < original.length; i += 4) {
    if (mascara[i + 3] < 160) continue;
    const antes = (Math.abs(original[i] - base[i]) + Math.abs(original[i + 1] - base[i + 1]) + Math.abs(original[i + 2] - base[i + 2])) / 3;
    if (antes < 28) continue;
    const depois = (Math.abs(gerada[i] - base[i]) + Math.abs(gerada[i + 1] - base[i + 1]) + Math.abs(gerada[i + 2] - base[i + 2])) / 3;
    contrasteOriginal += antes;
    contrasteGerado += depois;
    pontos += 1;
  }
  // Lesões pouco contrastadas não permitem um diagnóstico automático confiável.
  return pontos >= 24 && contrasteGerado < contrasteOriginal * 0.35;
}
