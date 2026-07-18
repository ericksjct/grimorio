$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$storePath = Join-Path $repoRoot 'plugin-store.jsx'
$indexPath = Join-Path $repoRoot 'index.html'
$swPath = Join-Path $repoRoot 'sw.js'
$store = Get-Content -Raw -LiteralPath $storePath
$index = Get-Content -Raw -LiteralPath $indexPath
$sw = Get-Content -Raw -LiteralPath $swPath

foreach ($needle in @(
  "'grimorio-plugins'",
  "'packs'",
  "keyPath: 'id'",
  'function openDB',
  'function putPack',
  'function getPack',
  'function getSpells',
  'function listPacks',
  'function deletePack',
  '_assertPackShape',
  'onabort',
  'window.pluginStore'
)) {
  if ($store -notlike "*$needle*") {
    throw "Missing plugin-store.jsx implementation detail: $needle"
  }
}

if ($store -notmatch 'DB_VERSION\s*=\s*1') {
  throw 'DB_VERSION is not set to 1.'
}

if ($store -match 'catch\s*\([^)]*\)\s*\{\s*\}') {
  throw 'plugin-store.jsx has an empty catch block - the storage layer must not swallow errors.'
}

# 'navigator.storage' removido desta lista no plano 02-02: STOR-02 exige
# navigator.storage.persist()/.persisted() dentro de plugin-store.jsx no boot
# (ROADMAP/REQUIREMENTS autoritativos, ver A-03 em 02-02-PLAN.md) — a suposição
# original desta lista (02-01) ficou obsoleta, não é mais uma violação de escopo.
foreach ($boundary in @('adaptSpell', 'DOMPurify', 'import ', 'export ')) {
  if ($store -like "*$boundary*") {
    throw "plugin-store.jsx crosses a scope boundary it does not own: $boundary"
  }
}

if ($index -notlike '*src="plugin-store.jsx"*') {
  throw 'index.html is missing the plugin-store.jsx script tag.'
}

$loaderIdx = $index.IndexOf('spells-data-loader.jsx')
$storeIdx = $index.IndexOf('plugin-store.jsx')
$editorIdx = $index.IndexOf('v11-character-editor.jsx')
if (-not ($loaderIdx -lt $storeIdx -and $storeIdx -lt $editorIdx)) {
  throw 'plugin-store.jsx script tag is not positioned between spells-data-loader.jsx and v11-character-editor.jsx.'
}

if ($sw -notlike "*'./plugin-store.jsx'*") {
  throw 'sw.js is missing ./plugin-store.jsx in PRECACHE.'
}

if ($sw -notlike "*const CACHE_VERSION = 'grimorio-v1';*") {
  throw 'sw.js CACHE_VERSION changed - the cache bump was deliberately avoided in this phase.'
}

foreach ($json in @(
  './spells-5E-2024-PTBR.json',
  './spells-5E-2014-PTBR.json',
  './spells-5E-2024-EN.json',
  './spells-5E-2014-EN.json'
)) {
  if ($sw -notlike "*'$json'*") {
    throw "sw.js is missing $json from PRECACHE - decommissioning that file is owned by Phase 6."
  }
}

Write-Output 'Plugin store (IndexedDB) wiring, schema constants and failure semantics are present.'
