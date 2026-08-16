$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$indexPath = Join-Path $repoRoot 'index.html'
$swPath = Join-Path $repoRoot 'sw.js'
$index = Get-Content -Raw -LiteralPath $indexPath
$sw = Get-Content -Raw -LiteralPath $swPath

# 1. Formato da tag do DOMPurify: versao literal, integrity sha384, crossorigin anonymous.
$purifyMatch = [regex]::Match($index, '<script[^>]*purify\.min\.js[^>]*>')
if (-not $purifyMatch.Success) {
  throw 'index.html is missing the DOMPurify <script> tag (purify.min.js).'
}
$purifyTag = $purifyMatch.Value
if ($purifyTag -notmatch 'dompurify@\d+\.\d+\.\d+') {
  throw 'DOMPurify script src is not pinned to a literal version (dompurify@X.Y.Z) - sanitizacao e a unica tranca contra XSS armazenado e uma dependencia de CDN sem versao fixa a anula.'
}
if ($purifyTag -notlike '*integrity="sha384-*') {
  throw 'DOMPurify script tag is missing integrity="sha384-..." - sanitizacao e a unica tranca contra XSS armazenado e uma dependencia de CDN sem verificacao de integridade a anula.'
}
if ($purifyTag -notlike '*crossorigin="anonymous"*') {
  throw 'DOMPurify script tag is missing crossorigin="anonymous".'
}

# 2. Ordem de carga. Usa a posicao da TAG de script (src="..."), nao de qualquer
# mencao ao nome do arquivo em comentario, que poderia aparecer antes da tag real.
$pluginStoreIdx = $index.IndexOf('src="plugin-store.jsx"')
$packImportIdx = $index.IndexOf('src="pack-import.jsx"')
$purifyIdx = $purifyMatch.Index
$editorIdx = $index.IndexOf('src="v11-character-editor.jsx"')
$dialogIdx = $index.IndexOf('src="pack-import-dialog.jsx"')

if (-not ($pluginStoreIdx -lt $packImportIdx)) {
  throw 'plugin-store.jsx must appear before pack-import.jsx in index.html.'
}
if (-not ($purifyIdx -lt $packImportIdx)) {
  throw 'purify.min.js must appear before pack-import.jsx in index.html.'
}
if (-not ($editorIdx -lt $dialogIdx)) {
  throw 'v11-character-editor.jsx must appear before pack-import-dialog.jsx in index.html.'
}

# 3. Montagem: PackImportRoot montado exatamente uma vez, depois de HifiPrintRoot.
$rootMatches = [regex]::Matches($index, '<PackImportRoot')
if ($rootMatches.Count -ne 1) {
  throw "Expected exactly one <PackImportRoot mount in index.html, found $($rootMatches.Count) - o gatilho tem de estar montado dentro do App para o import ser alcancavel."
}
$hifiPrintIdx = $index.IndexOf('<HifiPrintRoot')
$packImportRootIdx = $index.IndexOf('<PackImportRoot')
if (-not ($hifiPrintIdx -lt $packImportRootIdx)) {
  throw '<PackImportRoot must be mounted after <HifiPrintRoot in the App render tree.'
}

# 4. Paridade PRECACHE: os quatro arquivos novos precisam estar no sw.js.
foreach ($needle in @('./pack-import.jsx', './pack-import-dialog.jsx', './pack-docs.html', './pack.schema.json')) {
  if ($sw -notlike "*'$needle'*") {
    throw "sw.js is missing $needle from PRECACHE - a ausencia quebra o modo offline."
  }
}

# 5. URL do vendor identica nos dois arquivos.
$purifyUrlMatch = [regex]::Match($index, 'https://unpkg\.com/dompurify@[\d\.]+/dist/purify\.min\.js')
if (-not $purifyUrlMatch.Success) {
  throw 'Could not extract the DOMPurify URL from index.html.'
}
$purifyUrl = $purifyUrlMatch.Value
if ($sw -notlike "*$purifyUrl*") {
  throw "sw.js does not contain the exact DOMPurify URL from index.html. index.html: $purifyUrl"
}

# 6. CACHE_VERSION intacto.
if ($sw -notlike "*const CACHE_VERSION = 'grimorio-v1';*") {
  throw "sw.js CACHE_VERSION changed - acrescimo puro ao PRECACHE nao justifica bump e bumpar re-baixaria os JSONs de magias ja cacheados."
}

# 7. Pacotes SRD agora obrigatorios no PRECACHE (Fase 4, SRD-03).
if ($sw -notlike '*srd-2014-en.json*' -or $sw -notlike '*srd-2024-en.json*') {
  throw 'sw.js must precache srd-2014-en.json and srd-2024-en.json - a ausencia quebra o modo offline do pack embutido (SRD-03).'
}

# 8. Fixtures de QA nunca entram no app shell offline.
if ($sw -like '*qa-fixtures*') {
  throw 'sw.js must not reference qa-fixtures in PRECACHE - payload de teste nao entra no app shell offline de ninguem.'
}

Write-Output 'Import pipeline is wired, pinned and precached.'
