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
  "key: 'srd-2024-ptbr'",
  'function _versionByKey(',
  'function _defaultVersion(',
  'const SPELL_VERSIONS = BUILTIN_VERSIONS.slice();'
)) {
  if (-not $loader.Contains($needle)) {
    throw "Missing spells-data-loader.jsx registry detail: $needle"
  }
}

$fetchSourceCount = ([regex]::Matches($loader, "source: 'fetch'")).Count
if ($fetchSourceCount -ne 3) {
  throw "Expected 3 occurrences of source: 'fetch' (3 SRD embutidos: 5.2 EN, 5.1 EN, 5.2 PT-BR), found $fetchSourceCount."
}

$editionCount = ([regex]::Matches($loader, "edition: '5e 20")).Count
if ($editionCount -ne 3) {
  throw "Expected 3 occurrences of edition: '5e 20...', found $editionCount."
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

# Ordem: srd-2024-en < srd-2014-en.
$idxSrd2024 = $loader.IndexOf("key: 'srd-2024-en'")
$idxSrd2014 = $loader.IndexOf("key: 'srd-2014-en'")
if (-not ($idxSrd2024 -lt $idxSrd2014)) {
  throw 'BUILTIN_VERSIONS order is wrong: expected srd-2024-en before srd-2014-en.'
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
  'function refreshPluginVersions(',
  # WR-02: o trabalho real de enumeracao mora na inner async; WR-01 trocou o
  # wrapper sincrono de dedup-por-coalescencia (devolver a MESMA promise em
  # voo) por uma fila-de-um encadeada, porque coalescer descarta uma chamada
  # mais nova cuja escrita a enumeracao em voo ainda nao tinha como observar.
  'async function _refreshPluginVersionsInner(',
  'pluginStore.listPacks(',
  'window.refreshPluginVersions'
)) {
  if (-not $loader.Contains($needle)) {
    throw "Missing spells-data-loader.jsx plugin-enumeration detail: $needle"
  }
}

# WR-01: refreshPluginVersions() must CHAIN concurrent calls (a fila-de-um),
# não apenas devolver a promise já em voo pra quem chega depois. Coalescer
# descarta a chamada mais nova: import de pack A dispara a enumeracao sem
# esperar; enquanto ela ainda le o IndexedDB, a escrita de instalacao do
# pack B comita; a chamada de B pra refreshPluginVersions() devolveria a
# promise de A (que ja tinha lido ANTES do commit de B) - B nunca
# apareceria no seletor.
if ($loader -notmatch 'let\s+_refreshChain\s*=\s*Promise\.resolve') {
  throw 'WR-01: refreshPluginVersions() must chain onto a shared _refreshChain promise (not coalesce onto an in-flight one) - a coalescing dedup drops a call whose write the in-flight enumeration started before observing.'
}
if ($loader -notmatch '_refreshChain\s*=\s*_refreshChain\s*\.catch\([\s\S]{0,30}?\)\s*\.then\(\s*_refreshPluginVersionsInner\s*\)') {
  throw 'WR-01: refreshPluginVersions() must reassign _refreshChain to _refreshChain.catch(...).then(_refreshPluginVersionsInner) on every call - a rejected prior link (a failed enumeration) must not poison the chain for later callers.'
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

# ── Fase 8: pendência por item substitui a preferência única pendente ──
# _wantedVersionKey (um único item pendente, consumido por setCurrentVersion())
# não existe mais - a pendência agora vive DENTRO da própria lista de seleção
# crua (_selectedKeys), resolvida item a item por resolveSelection(). Ver
# check-selection-migration.tests.ps1 para a prova de execução completa
# (pendência antes da enumeração, resolução após, poda só depois dela).
foreach ($forbidden in @('_wantedVersionKey', 'function setCurrentVersion')) {
  if ($loader.Contains($forbidden)) {
    throw "spells-data-loader.jsx must no longer contain $forbidden - single-item pending preference was replaced by per-item resolution inside the selection list (D-24)."
  }
}

# ── CR-01: pluginStore ausente / listPacks() falha não pode deixar a
# enumeração parada pra sempre — os dois early returns de
# _refreshPluginVersionsInner() precisam marcar _enumerated = true antes de
# devolver [], senão a poda de chaves fantasma (D-24) nunca teria permissão
# de rodar, mesmo que o IndexedDB volte a responder numa chamada seguinte.
$innerMatch = [regex]::Match($loader, 'async function _refreshPluginVersionsInner\(\)[\s\S]{0,6000}?\r?\n\}')
if (-not $innerMatch.Success) {
  throw 'CR-01: could not locate _refreshPluginVersionsInner() body in spells-data-loader.jsx.'
}
$earlyReturnClears = ([regex]::Matches($innerMatch.Value, '_enumerated\s*=\s*true;\s*\r?\n\s*return \[\];')).Count
if ($earlyReturnClears -lt 2) {
  throw "CR-01: both early-return paths of _refreshPluginVersionsInner() (missing pluginStore, rejected listPacks()) must set _enumerated = true before returning [] - found $earlyReturnClears. Otherwise a pending plugin-* selection can never be pruned by a later explicit change (D-24), even once the IndexedDB responds again."
}

# ── IN-01: um blob de prefs corrompido não pode descartar um `?v=` válido ──
# _initialSelection() (antes _initialVersionKey()) lia urlV E fazia
# JSON.parse(prefs) dentro do MESMO try - um blob corrompido lançava, o try
# inteiro desenrolava, e um `?v=` perfeitamente válido de um link
# compartilhado era silenciosamente descartado em favor do default. O parse
# de prefs agora mora isolado em _readPrefs(), com o próprio try/catch.
$readPrefsMatch = [regex]::Match($loader, 'function _readPrefs\(\)[\s\S]{0,600}?\r?\n\}')
if (-not $readPrefsMatch.Success) {
  throw 'IN-01: could not locate _readPrefs() body in spells-data-loader.jsx.'
}
if ($readPrefsMatch.Value -notmatch 'try\s*\{[\s\S]{0,200}?JSON\.parse') {
  throw "IN-01: _readPrefs() must parse the saved prefs blob inside its OWN try/catch - a corrupt localStorage blob must not discard a valid ?v= from a shared link."
}
$initialSelectionMatch = [regex]::Match($loader, 'function _initialSelection\(\)[\s\S]{0,2000}?\r?\n\}')
if (-not $initialSelectionMatch.Success) {
  throw 'IN-01: could not locate _initialSelection() body in spells-data-loader.jsx.'
}
if ($initialSelectionMatch.Value -notmatch '_readPrefs\(\)') {
  throw 'IN-01: _initialSelection() must read prefs via _readPrefs() (the isolated try/catch), not inline JSON.parse.'
}

# ── WR-03: loadVersion() must re-check _versionByKey(key) before caching an
# in-flight load's result. Without this, a pack removed mid-fetch (refreshPluginVersions
# invalidated it via `delete _cache[key]`) gets resurrected in memory the
# instant the stale fetch resolves.
if ($loader -notmatch 'if \(_versionByKey\(key\)\)[\s\S]{0,120}?_cache\[key\] = adapted') {
  throw 'WR-03: loadVersion() must re-check _versionByKey(key) before writing _cache[key] - otherwise an in-flight load for a version removed mid-fetch resurrects it in the cache.'
}

# ── index.html: sem estado de versão (Fase 8, D-07) ─────────────────
$indexPath = Join-Path $repoRoot 'index.html'
$index = Get-Content -Raw -LiteralPath $indexPath

foreach ($forbidden in @('getCurrentSpellVersion', 'versionKey', 'hasPendingSpellVersion', 'hifi-spells-source-changed')) {
  if ($index.Contains($forbidden)) {
    throw "index.html must no longer contain $forbidden - the loader (spells-data-loader.jsx) owns the package selection AND its persistence now (D-07); index.html only persists theme/mode/character/language."
  }
}

# Fase 04.1 desacopla o idioma da interface da versão ativa (D-18): o estado
# uiLang não pode mais derivar de langOfVersionKey/initialVersionKey. Ver
# scripts/check-ui-lang-state.tests.ps1 para a asserção positiva completa.
if ($index.Contains('langOfVersionKey')) {
  throw 'index.html must not contain langOfVersionKey anymore - the language state was decoupled from the active spell version (Phase 04.1).'
}
$uiLangStateMatch = [regex]::Match($index, 'React\.useState\(\s*initial\.lang\s*\|\|\s*detectLang\(\)\s*\)')
if (-not $uiLangStateMatch.Success) {
  throw 'index.html uiLang state must initialize from initial.lang || detectLang(), independent of the active version.'
}

# ── Fase 8: o efeito de persistência de prefs não carrega mais versionKey -
# só tema/modo/personagem/idioma. O spread de `prev` (relido a cada execução)
# preserva o `selectedVersionKeys` que o loader grava por conta própria.
$prefsEffectMatch = [regex]::Match($index, 'React\.useEffect\(\(\) => \{[\s\S]{0,700}?\}, \[dark, theme, character, uiLang\]\);')
if (-not $prefsEffectMatch.Success) {
  throw 'Could not locate the prefs-persistence React.useEffect in index.html with deps [dark, theme, character, uiLang].'
}
$prefsEffectBody = $prefsEffectMatch.Value
if ($prefsEffectBody -notmatch 'characterName:\s*character') {
  throw 'prefs-persistence effect must still write characterName unconditionally.'
}
if ($prefsEffectBody -notmatch 'lang:\s*uiLang') {
  throw 'prefs-persistence effect must still write lang: uiLang.'
}
if ($prefsEffectBody -match 'versionKey|hasPendingSpellVersion') {
  throw 'prefs-persistence effect must not reference versionKey or hasPendingSpellVersion anymore - the loader persists the package selection on its own (D-07).'
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
