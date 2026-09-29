param(
  [string]$Origem = (Join-Path $PSScriptRoot 'coronal-aberto-original.png'),
  [string]$PastaSaida = (Join-Path $PSScriptRoot '../../assets')
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;

public static class CoronalAberto {
    static double Suave(double v) {
        v = Math.Max(0, Math.Min(1, v));
        return v * v * (3 - 2 * v);
    }
    static Color Misturar(Color a, Color b, double peso) {
        return Color.FromArgb(a.A,
            (int)Math.Round(a.R + (b.R - a.R) * peso),
            (int)Math.Round(a.G + (b.G - a.G) * peso),
            (int)Math.Round(a.B + (b.B - a.B) * peso));
    }
    public static void Preparar(string origem, string clinica, string neutro) {
        using (var original = new Bitmap(origem)) {
            if (original.Width != 1086 || original.Height != 1448)
                throw new Exception("A imagem deve ser a referencia original de 1086 x 1448 pixels.");
            using (var limpa = original.Clone(new Rectangle(0, 0, 1086, 1448), PixelFormat.Format32bppArgb)) {
                // A assinatura fica inteiramente no fundo, fora da anatomia.
                // Interpola o fundo pelas bordas superior e inferior, sem IA.
                for (int y = 1168; y <= 1304; y++) {
                    for (int x = 820; x < 1086; x++) {
                        double t = (y - 1167.0) / (1305 - 1167);
                        Color fundo = Misturar(original.GetPixel(x, 1167), original.GetPixel(x, 1305), t);
                        double peso = Suave(Math.Min(x - 820, Math.Min(y - 1168, 1304 - y)) / 8.0);
                        limpa.SetPixel(x, y, Misturar(original.GetPixel(x, y), fundo, peso));
                    }
                }
                limpa.Save(clinica, ImageFormat.Png);
                using (var visitante = limpa.Clone(new Rectangle(0, 0, 1086, 1448), PixelFormat.Format32bppArgb)) {
                    // Seleciona somente o fundo claro e neutro conectado as bordas.
                    // A selecao acompanha as curvas, sem faixas retangulares.
                    var fundo = new bool[1086 * 1448];
                    var fila = new System.Collections.Generic.Queue<int>();
                    for (int y = 0; y < 1448; y++) {
                        fila.Enqueue(y * 1086);
                        fila.Enqueue(y * 1086 + 1085);
                    }
                    for (int x = 0; x < 1086; x++) {
                        fila.Enqueue(x);
                        fila.Enqueue(1447 * 1086 + x);
                    }
                    while (fila.Count > 0) {
                        int p = fila.Dequeue();
                        if (fundo[p]) continue;
                        int x = p % 1086, y = p / 1086;
                        Color c = limpa.GetPixel(x, y);
                        int minimo = Math.Min(c.R, Math.Min(c.G, c.B));
                        int croma = Math.Max(c.R, Math.Max(c.G, c.B)) - minimo;
                        // O cabecalho acima de 190 pixels nao contem anatomia.
                        if (y >= 190 && (minimo < 175 || croma > 16)) continue;
                        fundo[p] = true;
                        if (x > 0) fila.Enqueue(p - 1);
                        if (x < 1085) fila.Enqueue(p + 1);
                        if (y > 0) fila.Enqueue(p - 1086);
                        if (y < 1447) fila.Enqueue(p + 1086);
                    }
                    for (int y = 0; y < 1448; y++) {
                        for (int x = 0; x < 1086; x++) {
                            if (!fundo[y * 1086 + x]) continue;
                            Color c = limpa.GetPixel(x, y);
                            int croma = Math.Max(c.R, Math.Max(c.G, c.B)) - Math.Min(c.R, Math.Min(c.G, c.B));
                            double peso = y < 190 ? 1 : 1 - Suave((croma - 4) / 12.0);
                            visitante.SetPixel(x, y, Misturar(c, Color.White, peso));
                        }
                    }
                    visitante.Save(neutro, ImageFormat.Png);
                }
            }
        }
    }
}
'@
$destino = [IO.Path]::GetFullPath($PastaSaida)
New-Item -ItemType Directory -Path $destino -Force | Out-Null
[CoronalAberto]::Preparar([IO.Path]::GetFullPath($Origem), (Join-Path $destino 'mapa-base-coronal-aberto.png'), (Join-Path $destino 'mapa-base-coronal-aberto-visitante.png'))
Write-Output 'Bases coronais preparadas sem IA, mantendo as dimensoes originais.'
