param(
  [string]$Origem = (Join-Path $PSScriptRoot 'kissing-ovaries-original.png'),
  [string]$PastaSaida = (Join-Path $PSScriptRoot '../../assets/mapas-especiais/kissing-ovaries')
)
$ErrorActionPreference = 'Stop'
# Mesma preparacao das bases coronais: retira a assinatura incorporada
# e cria as identidades Centrus e neutra sem modificar a anatomia.
$saida = [IO.Path]::GetFullPath($PastaSaida)
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'preparar-coronal-aberto.ps1') -Origem $Origem -PastaSaida $saida
if ($LASTEXITCODE -ne 0) { throw 'Falha ao preparar Kissing Ovaries' }
Move-Item -LiteralPath (Join-Path $saida 'mapa-base-coronal-aberto.png') -Destination (Join-Path $saida 'kissing-ovaries-centrus.png') -Force
Move-Item -LiteralPath (Join-Path $saida 'mapa-base-coronal-aberto-visitante.png') -Destination (Join-Path $saida 'kissing-ovaries-neutro.png') -Force
