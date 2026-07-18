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

if ($store -notmatch 'window\.pluginStore\s*=\s*\{[\s\S]*?\}') {
  throw 'Could not locate the window.pluginStore assignment block.'
}
$exposedBlock = [regex]::Match($store, 'window\.pluginStore\s*=\s*\{[\s\S]*?\};').Value
foreach ($fn in @('requestPersistence', 'getPersistenceState', 'putPack', 'getPack', 'getSpells', 'listPacks', 'deletePack', 'openDB')) {
  if ($exposedBlock -notlike "*$fn*") {
    throw "window.pluginStore block is missing exposed function: $fn"
  }
}

if ($store -match 'catch\s*\([^)]*\)\s*\{\s*\}') {
  throw 'plugin-store.jsx has an empty catch block - the storage layer must not swallow errors.'
}

Write-Output 'Persistent storage request is wired.'
