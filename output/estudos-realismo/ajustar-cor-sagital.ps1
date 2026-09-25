param(
  [ValidateRange(0, 1)][double]$SaturacaoClinica = 0.80,
  [ValidateRange(0, 1)][double]$ContrasteClinica = 0.90,
  [ValidateRange(0, 1)][double]$SaturacaoVisitante = 0.88,
  [ValidateRange(0, 1)][double]$ContrasteVisitante = 0.92,
  [string]$PastaSaida = (Join-Path $PSScriptRoot '../../assets')
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class AjusteCorSagital {
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
$pastaOriginais = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../assets'))
$pastaDestino = [IO.Path]::GetFullPath($PastaSaida)
New-Item -ItemType Directory -Path $pastaDestino -Force | Out-Null
[AjusteCorSagital]::Aplicar((Join-Path $pastaOriginais 'mapa-base-sagital.png'), (Join-Path $pastaDestino 'mapa-base-sagital-suave.png'), $SaturacaoClinica, $ContrasteClinica)
[AjusteCorSagital]::Aplicar((Join-Path $pastaOriginais 'mapa-base-sagital-visitante.png'), (Join-Path $pastaDestino 'mapa-base-sagital-visitante-suave.png'), $SaturacaoVisitante, $ContrasteVisitante)
Write-Output 'Cores sagitais ajustadas a partir dos originais preservados.'
