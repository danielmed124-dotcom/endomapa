// Validação anterior à reserva de geração. Clientes antigos continuam enviando JPEG.
export function prepararEdicaoGPT(composicao, mascara) {
  const erro = () => { throw new Error("A área de integração não chegou corretamente. Atualize o editor e tente novamente."); };
  if (typeof composicao !== "string" || composicao.length > 14_000_000) erro();
  let imagem;
  try { imagem = Uint8Array.from(atob(composicao), (c) => c.charCodeAt(0)); } catch (_) { erro(); }
  if (mascara === undefined) return { imagem, mascara: null, tipo: "image/jpeg", extensao: "jpg" };
  if (typeof mascara !== "string" || mascara.length > 7_000_000) erro();
  let bytes;
  try { bytes = Uint8Array.from(atob(mascara), (c) => c.charCodeAt(0)); } catch (_) { erro(); }
  function dimensoes(png, exigirAlpha) {
    const assinatura = [137, 80, 78, 71, 13, 10, 26, 10];
    if (png.length < 33 || assinatura.some((v, i) => png[i] !== v) ||
        String.fromCharCode(...png.slice(12, 16)) !== "IHDR") erro();
    const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
    const largura = view.getUint32(16), altura = view.getUint32(20);
    if (largura !== 1086 || altura !== 1448 || (exigirAlpha && ![4, 6].includes(png[25]))) erro();
    return [largura, altura];
  }
  dimensoes(imagem, false);
  dimensoes(bytes, true);
  return { imagem, mascara: bytes, tipo: "image/png", extensao: "png" };
}
