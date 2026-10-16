$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System.Drawing;
public static class SompBounds {
 public static Rectangle Find(Bitmap b) {
  int x0=b.Width,y0=b.Height,x1=0,y1=0;
  for(int y=0;y<b.Height;y++) for(int x=0;x<b.Width;x++) if(b.GetPixel(x,y).A>=8) {
   x0=System.Math.Min(x0,x); y0=System.Math.Min(y0,y); x1=System.Math.Max(x1,x); y1=System.Math.Max(y1,y);
  }
  return new Rectangle(x0,y0,x1-x0+1,y1-y0+1);
 }
}
'@
$pasta=$PSScriptRoot
$asset=[System.Drawing.Bitmap]::new((Join-Path $pasta '../../assets/lesoes/foliculo.png'))
$bounds=[SompBounds]::Find($asset)
# Centros e dimensoes medidos visualmente na referencia 1086 x 1448.
# Nao sao medidas clinicas. Ordem explicita para preservar as sobreposicoes.
$foliculos=@(
 @(359,631,24,27), @(331,648,47,50), @(373,660,29,33),
 @(302,662,20,19), @(292,689,29,33), @(319,684,25,28),
 @(371,686,23,26), @(358,702,22,21), @(375,712,30,34),
 @(280,713,25,27), @(300,722,25,27), @(350,730,21,20),
 @(370,740,25,29), @(268,736,19,21), @(278,752,30,32),
 @(305,760,25,26), @(348,766,30,33), @(287,778,26,27),
 @(326,781,26,26), @(307,788,20,20)
)
if($foliculos.Count -ne 20){throw 'A montagem deve conter 20 foliculos.'}
$x0=254; $y0=612; $largura=143; $altura=192; $fator=8
$saida=[System.Drawing.Bitmap]::new($largura*$fator,$altura*$fator)
$g=[System.Drawing.Graphics]::FromImage($saida)
$g.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode=[System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.CompositingQuality=[System.Drawing.Drawing2D.CompositingQuality]::HighQuality
foreach($f in $foliculos){
 $dest=[System.Drawing.Rectangle]::new(($f[0]-$f[2]/2-$x0)*$fator,($f[1]-$f[3]/2-$y0)*$fator,$f[2]*$fator,$f[3]*$fator)
 $g.DrawImage($asset,$dest,$bounds.X,$bounds.Y,$bounds.Width,$bounds.Height,[System.Drawing.GraphicsUnit]::Pixel)
}
$g.Dispose()
$saida.Save((Join-Path $pasta 'somp-esquerdo-biblioteca-8x.png'),[System.Drawing.Imaging.ImageFormat]::Png)
$foto=[System.Drawing.Bitmap]::new('C:\Users\Daniel\Downloads\endomapa-manual-coronal.jpg')
$previa=[System.Drawing.Bitmap]::new(980,660)
$g=[System.Drawing.Graphics]::FromImage($previa)
$g.Clear([System.Drawing.Color]::White)
$g.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode=[System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$fonte=[System.Drawing.Font]::new('Arial',16)
$g.DrawString('Referencia original',$fonte,[System.Drawing.Brushes]::Black,25,20)
$g.DrawString('20 foliculos da biblioteca',$fonte,[System.Drawing.Brushes]::Black,510,20)
$g.DrawImage($foto,[System.Drawing.Rectangle]::new(25,65,$largura*3,$altura*3),$x0,$y0,$largura,$altura,[System.Drawing.GraphicsUnit]::Pixel)
$g.DrawImage($saida,[System.Drawing.Rectangle]::new(510,65,$largura*3,$altura*3),0,0,$saida.Width,$saida.Height,[System.Drawing.GraphicsUnit]::Pixel)
$previa.Save((Join-Path $pasta 'comparacao-biblioteca.png'),[System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $fonte.Dispose(); $previa.Dispose(); $foto.Dispose()
[ordered]@{arquivo='somp-esquerdo-biblioteca-8x.png'; quantidade=$foliculos.Count; larguraPixels=$saida.Width; alturaPixels=$saida.Height; xNoMapa=$x0; yNoMapa=$y0; larguraNoMapa=$largura; alturaNoMapa=$altura; foliculosCentroXYLarguraAltura=$foliculos; observacao='Posicoes e tamanhos aproximados por medicao visual da referencia; textura e transparencia do foliculo da biblioteca; previa sem integracao'} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $pasta 'posicao-biblioteca.json') -Encoding UTF8
Write-Output ('20 foliculos; PNG transparente '+$saida.Width+' x '+$saida.Height+'; origem '+$asset.Width+' x '+$asset.Height)
$saida.Dispose(); $asset.Dispose()
