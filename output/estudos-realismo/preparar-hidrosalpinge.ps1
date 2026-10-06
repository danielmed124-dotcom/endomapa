param(
  [string]$Origem = (Join-Path $PSScriptRoot 'hidrosalpinge-originais'),
  [string]$PastaSaida = (Join-Path $PSScriptRoot 'hidrosalpinge-preparadas')
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'cores-hidrosalpinge.ps1')
$saida = [IO.Path]::GetFullPath($PastaSaida)
New-Item -ItemType Directory -Path $saida -Force | Out-Null
# Daniel confirmou manter a associação pelos nomes dos arquivos enviados.
$mapas = @(
  @('Hidrossalpinge Direita.png', 'arquivo-direita', 0.98, 1.0),
  @('Hidrossalpinge Esquerda.png', 'arquivo-esquerda', 0.83, 0.96),
  @('Hidrossalpinge bilateral.png', 'bilateral', 0.94, 0.99)
)
foreach ($mapa in $mapas) {
  $pasta = Join-Path $saida $mapa[1]
  & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'preparar-coronal-aberto.ps1') -Origem (Join-Path $Origem $mapa[0]) -PastaSaida $pasta
  if ($LASTEXITCODE -ne 0) { throw "Falha na preparação de $($mapa[0])" }
  $clinica = Join-Path $pasta 'mapa-base-coronal-aberto.png'
  # O primeiro arquivo não tem logomarca. Usa o mesmo cabeçalho Centrus da base padrão.
  $imagem = [Drawing.Bitmap]::new($clinica)
  $referencia = [Drawing.Bitmap]::new([IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../assets/mapa-base-coronal-aberto.png')))
  $copia = $imagem.Clone([Drawing.Rectangle]::new(0,0,1086,1448), [Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $imagem.Dispose()
  $grafico = [Drawing.Graphics]::FromImage($copia)
  $grafico.CompositingMode = [Drawing.Drawing2D.CompositingMode]::SourceCopy
  $grafico.DrawImage($referencia, [Drawing.Rectangle]::new(0,0,1086,190), 0,0,1086,190, [Drawing.GraphicsUnit]::Pixel)
  $grafico.Dispose(); $referencia.Dispose()
  $clinica = Join-Path $pasta 'com-cabecalho.png'
  $copia.Save($clinica, [Drawing.Imaging.ImageFormat]::Png); $copia.Dispose()
  [AjusteCorHidrosalpinge]::Aplicar($clinica, (Join-Path $saida ($mapa[1]+'-centrus.png')), $mapa[2], $mapa[3])
  [AjusteCorHidrosalpinge]::Aplicar((Join-Path $pasta 'mapa-base-coronal-aberto-visitante.png'), (Join-Path $saida ($mapa[1]+'-neutro.png')), $mapa[2], $mapa[3])
}
$destinoApp = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../assets/mapas-especiais/hidrosalpinge'))
New-Item -ItemType Directory -Path $destinoApp -Force | Out-Null
foreach ($lado in @('direita','esquerda','bilateral')) {
  $nomeOrigem = if ($lado -eq 'bilateral') { $lado } else { 'arquivo-' + $lado }
  foreach ($perfil in @('centrus','neutro')) {
    Copy-Item -LiteralPath (Join-Path $saida ($nomeOrigem+'-'+$perfil+'.png')) -Destination (Join-Path $destinoApp ('hidrosalpinge-'+$lado+'-'+$perfil+'.png')) -Force
  }
}
Write-Output 'Três mapas preparados nas duas identidades, com assinatura removida e cores aproximadas ao coronal.'
