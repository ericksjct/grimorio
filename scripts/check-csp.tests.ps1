$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$indexPath = Join-Path $repoRoot 'index.html'
$docsPath = Join-Path $repoRoot 'pack-docs.html'
$concernsPath = Join-Path $repoRoot '.planning\codebase\CONCERNS.md'

$index = Get-Content -Raw -LiteralPath $indexPath
$docs = Get-Content -Raw -LiteralPath $docsPath
$concerns = Get-Content -Raw -LiteralPath $concernsPath

# 1. Presenca da meta CSP em cada pagina.
$pages = @{ 'index.html' = $index; 'pack-docs.html' = $docs }
$policies = @{}
foreach ($name in $pages.Keys) {
  $match = [regex]::Match($pages[$name], '<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]*)"\s*/?>')
  if (-not $match.Success) {
    throw "$name is missing a <meta http-equiv=`"Content-Security-Policy`"> tag."
  }
  $policies[$name] = $match.Groups[1].Value
}

# 2. Diretivas minimas: exigidas nas duas politicas.
$requiredDirectives = @("object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'")
foreach ($name in $policies.Keys) {
  foreach ($directive in $requiredDirectives) {
    if ($policies[$name] -notlike "*$directive*") {
      throw "$name CSP is missing required directive: $directive"
    }
  }
}

# 3. Politicas identicas (normaliza espacos) - pack-docs.html sob politica mais
# fraca que o app seria um buraco.
$normalize = { param($s) ($s -replace '\s+', ' ').Trim() }
$normIndex = & $normalize $policies['index.html']
$normDocs = & $normalize $policies['pack-docs.html']
if ($normIndex -ne $normDocs) {
  throw "index.html and pack-docs.html CSP policies differ.`nindex.html: $normIndex`npack-docs.html: $normDocs"
}

# 4. Sem connect-src - restringir isso quebraria o import por URL do PKG-03,
# que busca hosts arbitrarios escolhidos pelo usuario.
foreach ($name in $policies.Keys) {
  if ($policies[$name] -like '*connect-src*') {
    throw "$name CSP declares connect-src - the PKG-03 URL import fetches arbitrary user-chosen hosts, restricting connect-src would break it."
  }
}

# 4b. Sem img-src - restringir imagens quebraria meta.image https:// (GAP-3,
# E-03): o cartao do menu carrega a URL escolhida pelo autor do pacote.
foreach ($name in $policies.Keys) {
  if ($policies[$name] -like '*img-src*') {
    throw "$name CSP declares img-src - meta.image accepts https:// URLs (GAP-3, E-03) that the pack card loads, restricting img-src would break them."
  }
}

# 5. Scripts existentes intactos - D-10 proibe remover o Babel standalone para
# acomodar a CSP.
foreach ($needle in @('purify.min.js', 'babel.min.js', 'react.production.min.js', 'react-dom.production.min.js', 'pack-import.jsx', 'pack-import-dialog.jsx')) {
  if ($index -notlike "*$needle*") {
    throw "index.html is missing $needle - D-10 forbids removing or replacing Babel standalone (or its dependents) to accommodate the CSP."
  }
}

# 6. Durabilidade do registro - a rota de saida de D-10 nao pode ficar so no
# PLAN; agentes de fases seguintes leem CONCERNS e SUMMARY, nao PLANs antigos.
if ($concerns -notlike '*D-10*' -or $concerns -notlike '*Content-Security-Policy*') {
  throw '.planning/codebase/CONCERNS.md is missing the D-10 / Content-Security-Policy entry - the exit route for script-src must be on record there, not only in a past PLAN.'
}

Write-Output 'CSP directives that close are shipped; the rest is on record.'
