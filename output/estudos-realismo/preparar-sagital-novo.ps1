param(
  [string]$Origem = (Join-Path $PSScriptRoot 'sagital-novo-original.png'),
  [string]$PastaSaida = (Join-Path $PSScriptRoot '../../assets'),
  [ValidateRange(0, 1)][double]$Saturacao = 0.86,
  [ValidateRange(0, 1)][double]$Contraste = 0.90,
  [ValidateRange(0, 1)][double]$Aquecimento = 0.16
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Collections.Generic;

public static class SagitalNovo {
    const int W = 1087, H = 1447;
    static double Suave(double v) {
        v = Math.Max(0, Math.Min(1, v));
        return v * v * (3 - 2 * v);
    }
    static double Luz(byte[] p, int i) { return p[i] * .0722 + p[i+1] * .7152 + p[i+2] * .2126; }
    static int Croma(byte[] p, int i) {
        return Math.Max(p[i], Math.Max(p[i+1], p[i+2])) - Math.Min(p[i], Math.Min(p[i+1], p[i+2]));
    }
    static void Salvar(byte[] pixels, string destino) {
        using (var imagem = new Bitmap(W, H, PixelFormat.Format32bppArgb)) {
            var dados = imagem.LockBits(new Rectangle(0,0,W,H), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
            try { Marshal.Copy(pixels, 0, dados.Scan0, pixels.Length); }
            finally { imagem.UnlockBits(dados); }
            imagem.Save(destino, ImageFormat.Png);
        }
    }
    public static void Preparar(string origem, string pasta, string semAssinatura, double saturacao, double contraste, double aquecimento) {
        var pixels = new byte[W * H * 4];
        using (var original = new Bitmap(origem)) {
            if (original.Width != W || original.Height != H) throw new Exception("Referencia deve ter 1087 x 1447 pixels.");
            using (var copia = original.Clone(new Rectangle(0,0,W,H), PixelFormat.Format32bppArgb)) {
                var dados = copia.LockBits(new Rectangle(0,0,W,H), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
                try { Marshal.Copy(dados.Scan0, pixels, 0, pixels.Length); }
                finally { copia.UnlockBits(dados); }
            }
        }
        // Isola os tracos escuros da assinatura pelo contraste local no rodape.
        // O limite inclinado exclui a anatomia no canto superior direito da area.
        var tinta = new bool[W * H];
        var vizinhos = new double[169];
        for (int y=1096; y<=1242; y++) for (int x=7; x<=274; x++) {
            if (y < 1096 + Math.Max(0,x-210)*.65) continue;
            int n=0;
            for (int dy=-6; dy<=6; dy++) for (int dx=-6; dx<=6; dx++)
                vizinhos[n++] = Luz(pixels, ((y+dy)*W+x+dx)*4);
            Array.Sort(vizinhos);
            if (vizinhos[84] - Luz(pixels,(y*W+x)*4) > 5) tinta[y*W+x] = true;
        }
        var mascara = new bool[W * H];
        for (int y=1096; y<=1242; y++) for (int x=7; x<=274; x++) {
            if (!tinta[y*W+x]) continue;
            for (int dy=-2; dy<=2; dy++) for (int dx=-2; dx<=2; dx++) mascara[(y+dy)*W+x+dx] = true;
        }
        var pontos = new List<int>();
        for (int p=0; p<mascara.Length; p++) if (mascara[p]) pontos.Add(p);
        // Difusao deterministica apenas na mascara, usando o fundo vizinho.
        var trabalho = new double[pixels.Length];
        for (int i=0; i<pixels.Length; i++) trabalho[i] = pixels[i];
        for (int passo=0; passo<240; passo++) foreach (int p in pontos) {
            for (int canal=0; canal<3; canal++) {
                int i=p*4+canal;
                trabalho[i]=(trabalho[i-4]+trabalho[i+4]+trabalho[i-W*4]+trabalho[i+W*4])*.25;
            }
        }
        foreach (int p in pontos) for(int c=0;c<3;c++) pixels[p*4+c]=(byte)Math.Round(trabalho[p*4+c]);
        Salvar(pixels, semAssinatura);
        var ajustada = (byte[])pixels.Clone();
        for (int y=0;y<H;y++) for(int x=0;x<W;x++) {
            int i=(y*W+x)*4;
            // Preserva logo e fundo neutro; suaviza somente os tons da anatomia.
            double peso=Suave((y-200)/35.0)*Suave((Croma(pixels,i)-8)/24.0);
            double luz=Luz(pixels,i);
            for(int c=0;c<3;c++) {
                double cor=luz+saturacao*(pixels[i+c]-luz);
                cor=255-contraste*(255-cor);
                ajustada[i+c]=(byte)Math.Round(pixels[i+c]+peso*(cor-pixels[i+c]));
            }
            // Aproxima os vermelhos do tom salmao do coronal, preservando verdes.
            if(pixels[i+2]>pixels[i+1] && pixels[i+1]>=pixels[i])
                ajustada[i+1]=(byte)Math.Round(ajustada[i+1]+peso*aquecimento*(ajustada[i+2]-ajustada[i+1]));
        }
        Salvar(ajustada, System.IO.Path.Combine(pasta,"mapa-base-sagital-novo-suave.png"));
        // Usa a cor anterior ao ajuste para separar o fundo da anatomia.
        var fundo=new bool[W*H];
        var fila=new Queue<int>();
        for(int y=0;y<H;y++) { fila.Enqueue(y*W); fila.Enqueue(y*W+W-1); }
        for(int x=0;x<W;x++) { fila.Enqueue(x); fila.Enqueue((H-1)*W+x); }
        while(fila.Count>0) {
            int p=fila.Dequeue(); if(fundo[p]) continue;
            int x=p%W,y=p/W,i=p*4;
            int minimo=Math.Min(pixels[i],Math.Min(pixels[i+1],pixels[i+2]));
            if(y>=190 && (minimo<175 || Croma(pixels,i)>16)) continue;
            fundo[p]=true;
            if(x>0)fila.Enqueue(p-1); if(x<W-1)fila.Enqueue(p+1);
            if(y>0)fila.Enqueue(p-W); if(y<H-1)fila.Enqueue(p+W);
        }
        for(int p=0;p<fundo.Length;p++) {
            if(!fundo[p])continue;
            double peso=p/W<190 ? 1 : 1-Suave((Croma(pixels,p*4)-4)/12.0);
            for(int c=0;c<3;c++) ajustada[p*4+c]=(byte)Math.Round(ajustada[p*4+c]+peso*(255-ajustada[p*4+c]));
        }
        // No rodape esquerdo a marca cruza a sombra externa, ficando tingida.
        // Suaviza esse fundo para branco abaixo do contorno, sem tocar os orgaos.
        int[] xs={0,80,160,220,280,400,470,520};
        int[] ys={930,977,1040,1100,1138,1158,1195,1235};
        for(int x=0;x<520;x++) {
            int trecho=0; while(trecho<xs.Length-2 && x>xs[trecho+1])trecho++;
            double limite=ys[trecho]+(ys[trecho+1]-ys[trecho])*(x-xs[trecho])/(double)(xs[trecho+1]-xs[trecho]);
            for(int y=(int)limite;y<H;y++) {
                double peso=Suave((y-limite)/35.0);
                int i=(y*W+x)*4;
                for(int c=0;c<3;c++)ajustada[i+c]=(byte)Math.Round(ajustada[i+c]+peso*(255-ajustada[i+c]));
            }
        }
        Salvar(ajustada,System.IO.Path.Combine(pasta,"mapa-base-sagital-novo-visitante-suave.png"));
        Console.WriteLine("Assinatura removida em {0} pixels; dimensoes, anatomia e transparencia preservadas.",pontos.Count);
    }
}
'@
$destino = [IO.Path]::GetFullPath($PastaSaida)
New-Item -ItemType Directory -Path $destino -Force | Out-Null
[SagitalNovo]::Preparar([IO.Path]::GetFullPath($Origem), $destino, (Join-Path $PSScriptRoot 'sagital-novo-sem-assinatura.png'), $Saturacao, $Contraste, $Aquecimento)
