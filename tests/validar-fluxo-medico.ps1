param([string[]]$Testes = @('erro-imagem-gpt', 'fluxo-mapa-medico', 'preparo-teste-unico', 'preparo-teste-unico-sucesso', 'botao-final-realista', 'editor-manual-nomes'))
$ErrorActionPreference = 'Stop'
$raiz = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$servidor = Start-Job -ArgumentList $raiz -ScriptBlock {
  param($raizProjeto)
  $http = [Net.HttpListener]::new()
  $http.Prefixes.Add('http://localhost:8766/')
  $http.Start()
  try {
    while ($http.IsListening) {
      $pedido = $http.GetContext()
      $rota = [Uri]::UnescapeDataString($pedido.Request.Url.AbsolutePath).TrimStart('/')
      if ($rota -eq 'encerrar') { $pedido.Response.Close(); break }
      $arquivo = [IO.Path]::GetFullPath((Join-Path $raizProjeto $rota))
      if (!$arquivo.StartsWith($raizProjeto + '\') -or !(Test-Path -LiteralPath $arquivo -PathType Leaf)) {
        $pedido.Response.StatusCode = 404; $pedido.Response.Close(); continue
      }
      $pedido.Response.ContentType = switch ([IO.Path]::GetExtension($arquivo)) {
        '.js' { 'text/javascript; charset=utf-8' }
        '.css' { 'text/css; charset=utf-8' }
        '.png' { 'image/png' }
        '.jpg' { 'image/jpeg' }
        default { 'text/html; charset=utf-8' }
      }
      $bytes = [IO.File]::ReadAllBytes($arquivo)
      $pedido.Response.ContentLength64 = $bytes.Length
      $pedido.Response.OutputStream.Write($bytes, 0, $bytes.Length)
      $pedido.Response.Close()
    }
  } finally { $http.Stop() }
}
try {
  Start-Sleep -Seconds 2
  foreach ($nome in $Testes) {
    $arquivoSaida = Join-Path $env:TEMP "endomapa-$nome-dom.html"
    $arquivoErro = Join-Path $env:TEMP "endomapa-$nome-erros.txt"
    $rota = if ($nome -eq 'preparo-teste-unico-sucesso') { 'preparo-teste-unico.html#sucesso' } else { "$nome.html" }
    $argumentos = @('--headless=new', '--disable-gpu', '--no-first-run', "--user-data-dir=$env:TEMP\endomapa-fluxo-medico-$nome", '--virtual-time-budget=5000', '--dump-dom', "http://localhost:8766/tests/$rota")
    $processo = Start-Process -FilePath 'C:\Program Files\Google\Chrome\Application\chrome.exe' -ArgumentList $argumentos -WindowStyle Hidden -Wait -PassThru -RedirectStandardOutput $arquivoSaida -RedirectStandardError $arquivoErro
    $texto = Get-Content $arquivoSaida -Raw -ErrorAction SilentlyContinue
    if ($processo.ExitCode -ne 0 -or $texto -notmatch '<pre[^>]*>PASSOU:') { throw "Teste $nome falhou. Consulte $arquivoSaida e $arquivoErro." }
    Write-Output "$nome : PASSOU"
  }
} finally {
  try { Invoke-WebRequest -UseBasicParsing 'http://localhost:8766/encerrar' | Out-Null } catch {}
  Stop-Job $servidor
  Remove-Job $servidor
}
