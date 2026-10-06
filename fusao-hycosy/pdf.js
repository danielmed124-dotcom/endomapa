"use strict";
window.hycosyGerarPdf = function(canvas) {
  if(!canvas.width || !canvas.height || !window.jspdf?.jsPDF)throw new Error("Não foi possível iniciar o PDF.");
  const pdf=new window.jspdf.jsPDF({orientation:canvas.width>canvas.height?"landscape":"portrait",unit:"mm",format:"a4",compress:true});
  pdf.setProperties({title:"Fusão de imagens Hycosy",creator:"Endomapa"});
  const w=pdf.internal.pageSize.getWidth(),h=pdf.internal.pageSize.getHeight();
  const escala=Math.min((w-20)/canvas.width,(h-20)/canvas.height);
  const largura=canvas.width*escala,altura=canvas.height*escala;
  pdf.addImage(canvas,"PNG",(w-largura)/2,(h-altura)/2,largura,altura,"fusao","FAST");
  return pdf.output("blob");
};
