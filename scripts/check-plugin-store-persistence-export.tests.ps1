$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$storePath = Join-Path $repoRoot 'plugin-store.jsx'
$store = Get-Content -Raw -LiteralPath $storePath

# ── Task 1: persistência solicitada no boot (STOR-02) ──

foreach ($needle in @(
  'function requestPersistence',
  'function getPersistenceState',
  'navigator.storage.persist',
  'navigator.storage.persisted',
  '_persistPromise',
  'DOMContentLoaded'
)) {
  if ($store -notlike "*$needle*") {
    throw "Missing plugin-store.jsx persistence detail: $needle"
  }
}

# O curto-circuito idempotente exige que persisted() seja consultado ANTES de persist().
$persistedIdx = $store.IndexOf('navigator.storage.persisted')
$persistIdx = $store.IndexOf('navigator.storage.persist(')
if ($persistedIdx -lt 0 -or $persistIdx -lt 0 -or -not ($persistedIdx -lt $persistIdx)) {
  throw 'navigator.storage.persisted() must appear before navigator.storage.persist() - that order is the idempotent short-circuit.'
}

# ── Task 2: exportação de pacote (STOR-03) ──

foreach ($needle in @(
  'function exportPack',
  '_packFileName',
  'application/json',
  'URL.createObjectURL',
  'URL.revokeObjectURL',
  'JSON.stringify'
)) {
  if ($store -notlike "*$needle*") {
    throw "Missing plugin-store.jsx export detail: $needle"
  }
}

$clickIdx = $store.IndexOf('.click()')
$revokeIdx = $store.IndexOf('URL.revokeObjectURL')
if ($clickIdx -lt 0 -or $revokeIdx -lt 0 -or -not ($revokeIdx -gt $clickIdx)) {
  throw 'URL.revokeObjectURL must come after .click() - revoking too early cancels the download in some browsers.'
}

if ($store -notmatch '\[\^a-z0-9-\]') {
  throw '_packFileName is missing the expected [^a-z0-9-] character-reduction pattern.'
}

# ── bloco window.pluginStore expõe todas as funções, incluindo as novas ──

if ($store -notmatch 'window\.pluginStore\s*=\s*\{[\s\S]*?\}') {
  throw 'Could not locate the window.pluginStore assignment block.'
}
$exposedBlock = [regex]::Match($store, 'window\.pluginStore\s*=\s*\{[\s\S]*?\};').Value
foreach ($fn in @('requestPersistence', 'getPersistenceState', 'exportPack', 'putPack', 'getPack', 'getSpells', 'listPacks', 'deletePack', 'openDB')) {
  if ($exposedBlock -notlike "*$fn*") {
    throw "window.pluginStore block is missing exposed function: $fn"
  }
}

if ($store -match 'catch\s*\([^)]*\)\s*\{\s*\}') {
  throw 'plugin-store.jsx has an empty catch block - the storage layer must not swallow errors.'
}

# ── durabilidade da suposição A-02: precisa chegar ao SUMMARY, não só ao PLAN.md ──
# Pulo intencional na primeira execução: o SUMMARY só existe depois de todas as
# tasks (passo create_summary de execute-plan.md). Durante a execução das tasks,
# Test-Path dá $false e este bloco não tem o que verificar - isso não é uma
# falha silenciosa, é sequenciamento esperado. A partir da reexecução dentro de
# create_summary, este bloco vira o gate de regressão permanente.
$summaryPath = Join-Path $repoRoot '.planning\phases\02-plugin-storage-foundation\02-02-SUMMARY.md'
if (Test-Path -LiteralPath $summaryPath) {
  $summary = Get-Content -Raw -LiteralPath $summaryPath
  if ($summary -notlike '*A-02*' -or $summary -notlike '*incluindo a chave de topo id*') {
    throw '02-02-SUMMARY.md exists but is missing the A-02 key-decision literal - Phase 3 loads SUMMARY/LEARNINGS, not this phase''s PLAN.md, so the assumption must be recorded there.'
  }
}

Write-Output 'Persistent storage request and pack export are wired.'
