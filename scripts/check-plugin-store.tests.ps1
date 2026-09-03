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

# ── WR-04: a missing IndexedDB record must throw, not silently become []. A
# returned [] gets cached by loadVersion() as a "successful" empty spell list
# forever - the loader's own catch (which does NOT cache failures and toasts
# toast.loadFailed) never gets a chance to run.
if ($store -notmatch 'if \(!record\) throw new Error') {
  throw "WR-04: getSpells() must throw on a missing record, not return [] - an empty return is cached as success by loadVersion() and never retried."
}

# ── IN-07: exportPack() deve revogar a Object URL de forma ASSÍNCRONA, não
# logo após click(). Um revoke síncrono É o próprio caso "cedo demais" que o
# comentário original tentava evitar - o download pode ainda não ter
# começado quando a URL é invalidada (Firefox historicamente não sobrevive).
if ($store -notmatch 'setTimeout\(\(\)\s*=>\s*URL\.revokeObjectURL\(url\)') {
  throw "IN-07: exportPack() must revoke the object URL asynchronously (setTimeout(() => URL.revokeObjectURL(url), 0)), not synchronously right after click() - a synchronous revoke can cancel the download before the browser starts it."
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

# Ancorado em src="..." de proposito: os comentarios de ordem no index.html
# citam estes nomes de arquivo, entao um IndexOf do nome solto casaria o
# comentario em vez da tag.
# A metade "loader antes da store" desta assercao (02-01) ficou obsoleta em
# 04-05: o loader chama refreshPluginVersions() no boot e enumera nada, em
# silencio, quando window.pluginStore ainda nao existe. A store precisa vir
# ANTES do loader. O que a assercao sempre quis garantir de fato -- store antes
# de quem a consulta -- continua valendo, agora para o loader tambem.
$loaderIdx = $index.IndexOf('src="spells-data-loader.jsx"')
$storeIdx = $index.IndexOf('src="plugin-store.jsx"')
$editorIdx = $index.IndexOf('src="v11-character-editor.jsx"')
if ($loaderIdx -lt 0 -or $storeIdx -lt 0 -or $editorIdx -lt 0) {
  throw 'index.html is missing one of the plugin-store / spells-data-loader / v11-character-editor script tags.'
}
if (-not ($storeIdx -lt $loaderIdx -and $loaderIdx -lt $editorIdx)) {
  throw 'plugin-store.jsx script tag must load BEFORE spells-data-loader.jsx (which queries window.pluginStore during boot), and both before v11-character-editor.jsx.'
}

if ($sw -notlike "*'./plugin-store.jsx'*") {
  throw 'sw.js is missing ./plugin-store.jsx in PRECACHE.'
}

if ($sw -notlike "*const CACHE_VERSION = 'grimorio-v2';*") {
  throw 'sw.js CACHE_VERSION is not grimorio-v2 - the Phase 6 decommission bump must be present.'
}

Write-Output 'Plugin store (IndexedDB) wiring, schema constants and failure semantics are present.'
