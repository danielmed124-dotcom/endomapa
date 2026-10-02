param(
  [string]$Origem = (Join-Path $PSScriptRoot 'ooforectomias-novas-originais'),
  [string]$PastaSaida = (Join-Path $PSScriptRoot '../../assets/mapas-especiais/ooforectomias-v2')
)
$ErrorActionPreference = 'Stop'
# As novas referencias compartilham as dimensoes e a posicao da assinatura
# da base coronal. Reutiliza sua preparacao sem alterar cores ou anatomia.
$saida = [IO.Path]::GetFullPath($PastaSaida)
New-Item -ItemType Directory -Path $saida -Force | Out-Null
$mapas = @(
  @('Ooforectomia à direita.png', 'ooforectomia-direita'),
  @('Ooforectomia à esquerda.png', 'ooforectomia-esquerda'),
  @('Ooforectomia bilateral.png', 'ooforectomia-bilateral')
)
foreach ($mapa in $mapas) {
  $entrada = Join-Path ([IO.Path]::GetFullPath($Origem)) $mapa[0]
  & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'preparar-coronal-aberto.ps1') -Origem $entrada -PastaSaida $saida
  if ($LASTEXITCODE -ne 0) { throw "Falha ao preparar $($mapa[0])" }
  Move-Item -LiteralPath (Join-Path $saida 'mapa-base-coronal-aberto.png') -Destination (Join-Path $saida ($mapa[1] + '-centrus.png')) -Force
  Move-Item -LiteralPath (Join-Path $saida 'mapa-base-coronal-aberto-visitante.png') -Destination (Join-Path $saida ($mapa[1] + '-neutro.png')) -Force
}
