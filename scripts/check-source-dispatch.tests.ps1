$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$loaderPath = Join-Path $repoRoot 'spells-data-loader.jsx'
$loader = Get-Content -Raw -LiteralPath $loaderPath
$lines = Get-Content -LiteralPath $loaderPath

# ── Registro declarativo, discriminado por origem (Task 1) ─────────
foreach ($needle in @(
  'const BUILTIN_VERSIONS = [',
  "key: 'srd-2024-en'",
  "key: 'srd-2014-en'",
  "key: 'spells-5E-2024-PTBR'",
  "key: 'spells-5E-2014-PTBR'",
  "key: 'spells-5E-2024-EN'",
  "key: 'spells-5E-2014-EN'",
  'function _versionByKey(',
  'function _defaultVersion(',
  'const SPELL_VERSIONS = BUILTIN_VERSIONS.slice();'
)) {
  if (-not $loader.Contains($needle)) {
    throw "Missing spells-data-loader.jsx registry detail: $needle"
  }
}

$fetchSourceCount = ([regex]::Matches($loader, "source: 'fetch'")).Count
if ($fetchSourceCount -ne 6) {
  throw "Expected 6 occurrences of source: 'fetch' (2 SRD + 4 legacy), found $fetchSourceCount."
}

$editionCount = ([regex]::Matches($loader, "edition: '5e 20")).Count
if ($editionCount -ne 6) {
  throw "Expected 6 occurrences of edition: '5e 20...', found $editionCount."
}

# Nenhuma reatribuição do registro: a única linha com "SPELL_VERSIONS =" que não
# seja a declaração const nem a exposição em window (window.SPELL_VERSIONS = ...,
# que atribui uma PROPRIEDADE de window, não a binding local) seria uma reatribuição
# direta contornando a regra de mutação in-place (push/splice).
$reassignLines = $lines | Where-Object {
  $_ -match 'SPELL_VERSIONS\s*=' -and
  $_ -notmatch '^\s*const SPELL_VERSIONS\s*=' -and
  $_ -notmatch 'window\.SPELL_VERSIONS\s*='
}
if ($reassignLines) {
  throw "Found reassignment of SPELL_VERSIONS outside its const declaration: $($reassignLines -join ' | ')"
}

# Ordem: srd-2024-en < srd-2014-en < primeira chave legada.
$idxSrd2024 = $loader.IndexOf("key: 'srd-2024-en'")
$idxSrd2014 = $loader.IndexOf("key: 'srd-2014-en'")
$idxLegacy = $loader.IndexOf("key: 'spells-5E-2024-PTBR'")
if (-not ($idxSrd2024 -lt $idxSrd2014 -and $idxSrd2014 -lt $idxLegacy)) {
  throw 'BUILTIN_VERSIONS order is wrong: expected srd-2024-en, then srd-2014-en, then legacy entries.'
}

if (-not $loader.Contains('window.SPELL_VERSIONS = SPELL_VERSIONS;')) {
  throw 'window.SPELL_VERSIONS is no longer exposed pointing at the live registry.'
}

# ── Dispatch por origem em loadVersion, com fallback de chave desconhecida (Task 2) ──
foreach ($needle in @(
  'function _fetchVersionJson(',
  'pluginStore.getSpells(',
  "ver.source === 'idb'"
)) {
  if (-not $loader.Contains($needle)) {
    throw "Missing spells-data-loader.jsx dispatch detail: $needle"
  }
}

$adaptSpellsCallCount = ([regex]::Matches($loader, 'adaptSpells\(')).Count
if ($adaptSpellsCallCount -ne 2) {
  throw "Expected exactly 2 occurrences of adaptSpells( (definition + single call site in loadVersion), found $adaptSpellsCallCount. A second normalization path may have been introduced."
}

if ($loader.Contains('detectEdition(ver.file)')) {
  throw 'loadVersion() must not derive edition from the file name anymore - edition must come from the version registry entry.'
}

if ($loader.Contains("throw new Error('Unknown version: '")) {
  throw 'loadVersion() must not throw on an unknown version key - it must redirect to the default version instead.'
}

foreach ($forbidden in @('putPack', 'deletePack', 'exportPack')) {
  if ($loader.Contains($forbidden)) {
    throw "spells-data-loader.jsx must be a strict IndexedDB reader - found forbidden call: $forbidden"
  }
}

Write-Output 'Source-dispatch registry and loadVersion() dispatch contract are present.'
