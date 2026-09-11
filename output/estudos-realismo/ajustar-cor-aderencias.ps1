$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
public static class CorAderencias {
    public static void Aplicar(string origem, string destino) {
        using (var entrada = new Bitmap(origem))
        using (var saida = new Bitmap(entrada.Width, entrada.Height, PixelFormat.Format32bppArgb)) {
            for (int y = 0; y < entrada.Height; y++) {
                for (int x = 0; x < entrada.Width; x++) {
                    var cor = entrada.GetPixel(x, y);
                    saida.SetPixel(x, y, Color.FromArgb(cor.A,
                        (int)Math.Round(cor.R * 0.68),
                        (int)Math.Round(cor.G * 0.52),
                        (int)Math.Round(cor.B * 0.72 + cor.R * 0.12)));
                }
            }
            saida.Save(destino, ImageFormat.Png);
        }
        using (var original = new Bitmap(origem))
        using (var resultado = new Bitmap(destino)) {
            for (int y = 0; y < original.Height; y++)
                for (int x = 0; x < original.Width; x++)
                    if (original.GetPixel(x, y).A != resultado.GetPixel(x, y).A)
                        throw new Exception("A transparência foi alterada em " + destino);
        }
    }
}
'@
$pastaLesoes = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../assets/lesoes'))
foreach ($numero in 1,2,3,4) {
    $nomeOriginal = if ($numero -eq 1) { 'aderencias-1-referencia.png' } else { "aderencia-$numero-referencia.png" }
    $origem = Join-Path $pastaLesoes $nomeOriginal
    $destino = Join-Path $pastaLesoes "aderencia-$numero-arroxeada.png"
    [CorAderencias]::Aplicar($origem, $destino)
    Write-Output "Aderência ${numero}: cor ajustada; transparência idêntica em todos os pixels."
}
