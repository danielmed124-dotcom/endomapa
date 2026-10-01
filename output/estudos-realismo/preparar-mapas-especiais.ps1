param(
  [string]$Origem = (Join-Path $PSScriptRoot 'mapas-especiais-originais'),
  [string]$PastaSaida = (Join-Path $PSScriptRoot '../../assets/mapas-especiais')
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Drawing.Drawing2D;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public static class MapasEspeciais {
    const int W = 1086, H = 1448;
    static double Suave(double v) { v = Math.Max(0, Math.Min(1, v)); return v*v*(3-2*v); }
    static byte Byte(double v) { return (byte)Math.Round(Math.Max(0, Math.Min(255,v))); }
    static double Luz(byte[] p, int i) { return .0722*p[i]+.7152*p[i+1]+.2126*p[i+2]; }
    static byte[] Ler(Bitmap b) {
        var d=b.LockBits(new Rectangle(0,0,b.Width,b.Height),ImageLockMode.ReadOnly,PixelFormat.Format32bppArgb);
        var p=new byte[b.Width*b.Height*4];
        try { Marshal.Copy(d.Scan0,p,0,p.Length); } finally { b.UnlockBits(d); }
        return p;
    }
    static void Gravar(Bitmap b, byte[] p) {
        var d=b.LockBits(new Rectangle(0,0,b.Width,b.Height),ImageLockMode.WriteOnly,PixelFormat.Format32bppArgb);
        try { Marshal.Copy(p,0,d.Scan0,p.Length); } finally { b.UnlockBits(d); }
    }
    // Reconstrucao local somente dos tracos finos nas areas da assinatura.
    static void RetirarAssinatura(Bitmap b, Rectangle area) {
        int w=b.Width, h=b.Height;
        var p=Ler(b); var mascara=new bool[w*h]; var valores=new double[81];
        for(int y=area.Top;y<area.Bottom;y++) for(int x=area.Left;x<area.Right;x++) {
            int n=0;
            for(int dy=-4;dy<=4;dy++) for(int dx=-4;dx<=4;dx++) valores[n++]=Luz(p,((y+dy)*w+x+dx)*4);
            Array.Sort(valores);
            if(valores[40]-Luz(p,(y*w+x)*4)<9) continue;
            for(int dy=-1;dy<=1;dy++) for(int dx=-1;dx<=1;dx++) mascara[(y+dy)*w+x+dx]=true;
        }
        var pontos=new List<int>();
        for(int i=0;i<mascara.Length;i++) if(mascara[i]) pontos.Add(i);
        var trabalho=new double[p.Length];
        for(int i=0;i<p.Length;i++) trabalho[i]=p[i];
        for(int passo=0;passo<220;passo++) foreach(int ponto in pontos) for(int c=0;c<3;c++) {
            int i=ponto*4+c;
            trabalho[i]=(trabalho[i-4]+trabalho[i+4]+trabalho[i-w*4]+trabalho[i+w*4])*.25;
        }
        foreach(int ponto in pontos) for(int c=0;c<3;c++) p[ponto*4+c]=Byte(trabalho[ponto*4+c]);
        Gravar(b,p);
    }
    static void Cores(Bitmap b, bool sagital) {
        var p=Ler(b);
        for(int i=0;i<p.Length;i+=4) {
            double r=p[i+2],g=p[i+1],bl=p[i],l=Luz(p,i);
            double max=Math.Max(r,Math.Max(g,bl)),min=Math.Min(r,Math.Min(g,bl));
            double peso=Suave((max-min-8)/24);
            if(sagital) {
                p[i]=Byte(bl+peso*((255-.90*(255-(l+.86*(bl-l))))-bl));
                p[i+1]=Byte(g+peso*((255-.90*(255-(l+.86*(g-l))))-g));
                p[i+2]=Byte(r+peso*((255-.90*(255-(l+.86*(r-l))))-r));
                if(r>g && g>=bl) p[i+1]=Byte(p[i+1]+peso*.16*(p[i+2]-p[i+1]));
            } else {
                // Aproxima o sepia do salmao coronal com uma transicao ampla
                // por matiz, sem selecionar manchas por luminosidade ou textura.
                double hue=Color.FromArgb((int)r,(int)g,(int)bl).GetHue();
                double tecido=(1-Suave((hue-48)/20))*peso;
                p[i+2]=Byte(r+tecido*(255-r)*.20);
                p[i+1]=Byte(g-tecido*g*.09);
                p[i]=Byte(bl+tecido*bl*.04);
            }
        }
        Gravar(b,p);
    }
    public static void Preparar(string origem,string destino,string referencia,string neutra,string id,bool sagital,Rectangle assinatura) {
        using(var original=new Bitmap(origem))
        using(var editada=original.Clone(new Rectangle(0,0,original.Width,original.Height),PixelFormat.Format32bppArgb)) {
            if(!assinatura.IsEmpty) RetirarAssinatura(editada,assinatura);
            Cores(editada,sagital);
            using(var pagina=new Bitmap(W,H,PixelFormat.Format32bppArgb)) {
                using(var g=Graphics.FromImage(pagina)) {
                    g.Clear(Color.White);
                    g.InterpolationMode=InterpolationMode.HighQualityBicubic;
                    if(sagital) g.DrawImage(editada,new Rectangle(0,0,W,H));
                    else {
                        double escala=Math.Min(1040.0/editada.Width,1080.0/editada.Height);
                        int largura=(int)Math.Round(editada.Width*escala),altura=(int)Math.Round(editada.Height*escala);
                        g.DrawImage(editada,new Rectangle((W-largura)/2,205+(1080-altura)/2,largura,altura));
                    }
                }
                pagina.Save(System.IO.Path.Combine(destino,id+"-neutro.png"),ImageFormat.Png);
                using(var marca=new Bitmap(referencia))
                using(var semMarca=new Bitmap(neutra)) {
                    var p=Ler(pagina); var m=Ler(marca); var n=Ler(semMarca);
                    for(int y=0;y<H;y++) for(int x=0;x<W;x++) {
                        int i=(y*W+x)*4;
                        if(y<190) { for(int c=0;c<3;c++) p[i+c]=m[i+c]; continue; }
                        // A diferenca entre as bases existentes isola a marca-d'agua.
                        // Aplica-a somente ao fundo claro, preservando a anatomia.
                        double fundo=Suave((Math.Min(p[i],Math.Min(p[i+1],p[i+2]))-225)/25.0);
                        int cromaMarca=Math.Max(m[i],Math.Max(m[i+1],m[i+2]))-Math.Min(m[i],Math.Min(m[i+1],m[i+2]));
                        if(Math.Min(n[i],Math.Min(n[i+1],n[i+2]))<250 || cromaMarca>6) continue;
                        for(int c=0;c<3;c++) p[i+c]=Byte(p[i+c]-fundo*Math.Max(0,n[i+c]-m[i+c]));
                    }
                    Gravar(pagina,p);
                }
                pagina.Save(System.IO.Path.Combine(destino,id+"-centrus.png"),ImageFormat.Png);
            }
        }
    }
}
'@
$saida = [IO.Path]::GetFullPath($PastaSaida)
New-Item -ItemType Directory -Path $saida -Force | Out-Null
$referencia = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../assets/mapa-base-coronal-aberto.png'))
$neutra = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../assets/mapa-base-coronal-aberto-visitante.png'))
$mapas = @(
  @('Útero Retrofletido.png', 'utero-retrofletido', $true, [Drawing.Rectangle]::Empty),
  @('Ooforectomia à direita.png', 'ooforectomia-direita', $false, [Drawing.Rectangle]::new(434, 648, 206, 120)),
  @('Ooforectomia à esquerda.png', 'ooforectomia-esquerda', $false, [Drawing.Rectangle]::new(426, 669, 192, 104)),
  @('Ooforectomia bilateral.png', 'ooforectomia-bilateral', $false, [Drawing.Rectangle]::new(439, 601, 201, 117))
)
foreach ($mapa in $mapas) {
  [MapasEspeciais]::Preparar((Join-Path ([IO.Path]::GetFullPath($Origem)) $mapa[0]), $saida, $referencia, $neutra, $mapa[1], $mapa[2], $mapa[3])
  Write-Output "$($mapa[0]): versoes neutra e Centrus preparadas."
}
