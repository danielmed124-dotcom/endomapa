param(
  [ValidateRange(0, 1)][double]$Saturacao = 0.88,
  [ValidateRange(0, 1)][double]$Contraste = 0.97
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class AjusteCorKissingOvaries {
    static double Suavizar(double valor) {
        valor = Math.Max(0, Math.Min(1, valor));
        return valor * valor * (3 - 2 * valor);
    }
    public static void Aplicar(string origem, string destino, double saturacao, double contraste) {
        using (var original = new Bitmap(origem))
        using (var imagem = original.Clone(new Rectangle(0, 0, original.Width, original.Height), PixelFormat.Format32bppArgb)) {
            var area = new Rectangle(0, 0, imagem.Width, imagem.Height);
            var dados = imagem.LockBits(area, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
            try {
                var pixels = new byte[dados.Stride * imagem.Height];
                Marshal.Copy(dados.Scan0, pixels, 0, pixels.Length);
                for (int y = 0; y < imagem.Height; y++) {
                    // O cabecalho e a logomarca permanecem identicos ao original.
                    double pesoVertical = Suavizar((y / (double)imagem.Height - 0.14) / 0.02);
                    for (int x = 0; x < imagem.Width; x++) {
                        int i = y * dados.Stride + x * 4;
                        double b = pixels[i], g = pixels[i + 1], r = pixels[i + 2];
                        double croma = Math.Max(r, Math.Max(g, b)) - Math.Min(r, Math.Min(g, b));
                        // Preserva o fundo neutro e a marca-d'agua, com transicao
                        // gradual ate os pixels coloridos da anatomia.
                        double peso = pesoVertical * Suavizar((croma - 8) / 24);
                        if (peso == 0 || pixels[i + 3] == 0) continue;
                        double luminancia = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                        for (int canal = 0; canal < 3; canal++) {
                            double anterior = pixels[i + canal];
                            double cor = luminancia + saturacao * (anterior - luminancia);
                            // Reduz contraste elevando sombras sem escurecer o branco.
                            cor = 255 - contraste * (255 - cor);
                            pixels[i + canal] = (byte)Math.Round(anterior + peso * (cor - anterior));
                        }
                        // Nenhuma mudanca de posicao, dimensao ou transparencia.
                    }
                }
                Marshal.Copy(pixels, 0, dados.Scan0, pixels.Length);
            } finally { imagem.UnlockBits(dados); }
            imagem.Save(destino, ImageFormat.Png);
        }
    }
}
'@
$origem = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../assets/mapas-especiais/kissing-ovaries'))
$destino = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../assets/mapas-especiais/kissing-ovaries-cor-v2'))
New-Item -ItemType Directory -Path $destino -Force | Out-Null
foreach ($perfil in @('centrus','neutro')) {
  $nome = 'kissing-ovaries-' + $perfil + '.png'
  [AjusteCorKissingOvaries]::Aplicar((Join-Path $origem $nome), (Join-Path $destino $nome), $Saturacao, $Contraste)
}
Write-Output 'Tonalidade Kissing Ovaries ajustada nas duas identidades.'