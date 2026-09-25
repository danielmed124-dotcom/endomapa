(function () {
  "use strict";

  window.endomapaGerarPdfA4 = function (paginas) {
    if (!paginas.length || !window.jspdf?.jsPDF) {
      throw new Error("Não foi possível iniciar o PDF.");
    }
    const pdf = new window.jspdf.jsPDF({
      orientation: "portrait", unit: "mm", format: "a4", compress: true,
    });
    pdf.setProperties({ title: "Endomapa - mapa manual", creator: "Endomapa" });
    const margem = 10;
    paginas.forEach(function (pagina, indice) {
      if (indice) pdf.addPage("a4", "portrait");
      const larguraPagina = pdf.internal.pageSize.getWidth();
      const alturaPagina = pdf.internal.pageSize.getHeight();
      const { canvas } = pagina;
      if (!canvas.width || !canvas.height) throw new Error("Mapa sem imagem.");
      const escala = Math.min(
        (larguraPagina - margem * 2) / canvas.width,
        (alturaPagina - margem * 2) / canvas.height,
      );
      const largura = canvas.width * escala;
      const altura = canvas.height * escala;
      // PNG mantém todos os pixels originais, inclusive nomes e medidas.
      pdf.addImage(canvas, "PNG", (larguraPagina - largura) / 2,
        (alturaPagina - altura) / 2, largura, altura, `vista-${indice}`, "FAST");
    });
    return pdf.output("blob");
  };
})();
