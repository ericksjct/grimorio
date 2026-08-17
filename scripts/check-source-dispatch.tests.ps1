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

# ── Enumeração de packs do IndexedDB no boot (04-02 Task 1) ────────
foreach ($needle in @(
  'function _packToVersion(',
  'async function refreshPluginVersions(',
  'pluginStore.listPacks(',
  'window.refreshPluginVersions'
)) {
  if (-not $loader.Contains($needle)) {
    throw "Missing spells-data-loader.jsx plugin-enumeration detail: $needle"
  }
}

$pluginsChangedCount = ([regex]::Matches($loader, 'hifi-plugins-changed')).Count
if ($pluginsChangedCount -lt 2) {
  throw "Expected at least 2 occurrences of hifi-plugins-changed (one dispatchEvent, one addEventListener), found $pluginsChangedCount."
}
if (-not ($loader.Contains("dispatchEvent(new CustomEvent('hifi-plugins-changed'"))) {
  throw 'Missing hifi-plugins-changed dispatchEvent in spells-data-loader.jsx.'
}
if (-not ($loader.Contains("addEventListener('hifi-plugins-changed'"))) {
  throw 'Missing hifi-plugins-changed addEventListener in spells-data-loader.jsx.'
}

# SPELL_VERSIONS ainda não pode ser reatribuído por refreshPluginVersions -
# a checagem geral de reatribuição acima já cobre isto, mas reforçamos que a
# mutação usa splice/push, não uma nova atribuição.
if (-not $loader.Contains('SPELL_VERSIONS.splice(')) {
  throw 'refreshPluginVersions() must mutate SPELL_VERSIONS in place via splice(), not reassign it.'
}
if (-not $loader.Contains('SPELL_VERSIONS.push(')) {
  throw 'refreshPluginVersions() must append new idb entries via push().'
}

# ── Dono único da resolução de versão inicial (04-02 Task 2) ───────
foreach ($needle in @(
  '_wantedVersionKey',
  'setCurrentVersion(_wantedVersionKey)'
)) {
  if (-not $loader.Contains($needle)) {
    throw "Missing spells-data-loader.jsx single-owner resolution detail: $needle"
  }
}

# ── index.html: leitura única da versão inicial (04-02 Task 2) ─────
$indexPath = Join-Path $repoRoot 'index.html'
$index = Get-Content -Raw -LiteralPath $indexPath

if (-not $index.Contains('getCurrentSpellVersion')) {
  throw 'index.html no longer reads window.getCurrentSpellVersion() to seed the initial version.'
}
if ($index.Contains('window.setCurrentSpellVersion(versionKey)')) {
  throw 'index.html still contains the removed mount effect pushing versionKey back to the loader - this races with the 04-02 retry.'
}

# Compara os índices DENTRO da mesma expressão de estado inicial de idioma
# (não a primeira ocorrência de "initial.lang" no arquivo inteiro, que aparece
# antes disso na derivação de initialVersionKey).
$langStateMatch = [regex]::Match($index, 'React\.useState\(\s*langOfVersionKey\(initialVersionKey\)\s*\|\|\s*initial\.lang')
if (-not $langStateMatch.Success) {
  throw 'index.html initial lang state must try langOfVersionKey(initialVersionKey) before initial.lang.'
}

# ── Ordem de carga: plugin-store antes do loader (04-05, regressao do passo 12) ─
# spells-data-loader.jsx chama refreshPluginVersions() no boot, que retorna []
# em silencio se window.pluginStore ainda nao existe. Como o Babel standalone
# executa os scripts text/babel em ordem de documento no DOMContentLoaded, o
# loader cai no ramo else e roda ANTES do proximo script. Se plugin-store.jsx
# vier depois do loader, nenhum pack instalado aparece apos recarregar.
$idxPluginStoreTag = $index.IndexOf('src="plugin-store.jsx"')
$idxLoaderTag = $index.IndexOf('src="spells-data-loader.jsx"')
if ($idxPluginStoreTag -lt 0 -or $idxLoaderTag -lt 0) {
  throw 'index.html must load both plugin-store.jsx and spells-data-loader.jsx.'
}
if (-not ($idxPluginStoreTag -lt $idxLoaderTag)) {
  throw 'index.html must load plugin-store.jsx BEFORE spells-data-loader.jsx - the loader calls refreshPluginVersions() at boot and silently enumerates nothing when window.pluginStore does not exist yet.'
}

# ── pack-import-dialog.jsx: avisa o loader depois de instalar (04-02 Task 3) ─
$dialogPath = Join-Path $repoRoot 'pack-import-dialog.jsx'
$dialog = Get-Content -Raw -LiteralPath $dialogPath

if (-not $dialog.Contains('refreshPluginVersions')) {
  throw 'pack-import-dialog.jsx does not call refreshPluginVersions() after a successful install.'
}
$idxSetResult = $dialog.IndexOf('setResult(res)')
$idxRefresh = $dialog.IndexOf('refreshPluginVersions')
if ($idxSetResult -lt 0 -or $idxRefresh -lt 0 -or -not ($idxSetResult -lt $idxRefresh)) {
  throw 'pack-import-dialog.jsx must call refreshPluginVersions() after setResult(res), on the success path.'
}

Write-Output 'Source-dispatch registry and loadVersion() dispatch contract are present.'
