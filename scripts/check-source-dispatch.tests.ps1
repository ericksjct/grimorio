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

# ── Dono único da resolução de versão inicial (04-02 Task 2) ───────
# Asserção por INTENÇÃO, não pelo texto exato da chamada. A versão anterior
# exigia o literal 'setCurrentVersion(_wantedVersionKey)' e por isso quebrou
# quando 04-05 passou a capturar a chave numa local antes de limpar
# _wantedVersionKey (CR-02). Uma asserção que trava a forma do código, e não o
# comportamento, transforma qualquer correção em falha de teste.
if (-not $loader.Contains('_wantedVersionKey')) {
  throw 'Missing spells-data-loader.jsx single-owner resolution detail: _wantedVersionKey'
}
if ($loader -notmatch 'refreshPluginVersions\(\)[\s\S]*?_wantedVersionKey[\s\S]{0,600}?setCurrentVersion\(') {
  throw 'refreshPluginVersions() must honor a pending _wantedVersionKey by calling setCurrentVersion once the key resolves.'
}

# ── CR-01: pluginStore ausente / listPacks() falha não pode deixar a
# preferência de versão pendente armada pra sempre — os dois early returns
# de _refreshPluginVersionsInner() precisam limpar _wantedVersionKey antes
# de devolver [], senão ela nunca mais é reconsiderada (nem quando resolveria
# de cara numa visita seguinte).
$innerMatch = [regex]::Match($loader, 'async function _refreshPluginVersionsInner\(\)[\s\S]{0,5000}?\r?\n\}')
if (-not $innerMatch.Success) {
  throw 'CR-01: could not locate _refreshPluginVersionsInner() body in spells-data-loader.jsx.'
}
$earlyReturnClears = ([regex]::Matches($innerMatch.Value, '_wantedVersionKey\s*=\s*null;\s*\r?\n\s*return \[\];')).Count
if ($earlyReturnClears -lt 2) {
  throw "CR-01: both early-return paths of _refreshPluginVersionsInner() (missing pluginStore, rejected listPacks()) must clear _wantedVersionKey before returning [] - found $earlyReturnClears. Otherwise a pending plugin-* preference is stranded for the rest of the session (and, via the index.html guard, so is all other prefs persistence)."
}

# ── WR-05: setCurrentVersion() must clear _wantedVersionKey UNCONDITIONALLY,
# before the `_currentVersion === key` no-op early-return. Selecting the
# version you are already on is the user's manual escape hatch for a stuck
# pending preference (CR-01) - if the clear sits after the early-return, that
# escape hatch is a no-op too.
$setCurMatch = [regex]::Match($loader, 'function setCurrentVersion\(key\)[\s\S]{0,1200}?\r?\n\}')
if (-not $setCurMatch.Success) {
  throw 'WR-05: could not locate setCurrentVersion(key) body in spells-data-loader.jsx.'
}
$setCurBody = $setCurMatch.Value
$clearIdx = $setCurBody.IndexOf('_wantedVersionKey = null;')
$noopIdx = $setCurBody.IndexOf('if (_currentVersion === key) return;')
if ($clearIdx -lt 0 -or $noopIdx -lt 0) {
  throw 'WR-05: setCurrentVersion() must contain both the _wantedVersionKey clear and the `_currentVersion === key` no-op check.'
}
if (-not ($clearIdx -lt $noopIdx)) {
  throw 'WR-05: setCurrentVersion() must clear _wantedVersionKey BEFORE the `_currentVersion === key` early-return, not after - otherwise re-selecting the version you are already on (the obvious manual fix) fails to cancel a stuck pending preference.'
}

# ── WR-03: loadVersion() must re-check _versionByKey(key) before caching an
# in-flight load's result. Without this, a pack removed mid-fetch (refreshPluginVersions
# invalidated it via `delete _cache[key]`) gets resurrected in memory the
# instant the stale fetch resolves.
if ($loader -notmatch 'if \(_versionByKey\(key\)\)[\s\S]{0,120}?_cache\[key\] = adapted') {
  throw 'WR-03: loadVersion() must re-check _versionByKey(key) before writing _cache[key] - otherwise an in-flight load for a version removed mid-fetch resurrects it in the cache.'
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

# ── CR-01: hasPendingSpellVersion() só pode gatear o campo versionKey do
# efeito de persistência de prefs, não o efeito inteiro. Round 2 (WR-01)
# gateava o `return` logo no topo do efeito, o que também suspendia
# dark/theme/characterName/lang pelo resto da sessão sempre que a
# preferência de versão não resolvesse (link compartilhado pra um pack
# ausente, IndexedDB indisponível).
$prefsEffectMatch = [regex]::Match($index, 'React\.useEffect\(\(\) => \{[\s\S]{0,700}?\}, \[dark, theme, character, lang, versionKey\]\);')
if (-not $prefsEffectMatch.Success) {
  throw 'CR-01: could not locate the prefs-persistence React.useEffect in index.html.'
}
$prefsEffectBody = $prefsEffectMatch.Value
if ($prefsEffectBody -match '^\s*React\.useEffect\(\(\) => \{\s*\r?\n\s*if \(window\.hasPendingSpellVersion') {
  throw 'CR-01: the prefs-persistence effect must not early-return the whole body on hasPendingSpellVersion() - that suspends dark/theme/characterName/lang persistence too, not just versionKey.'
}
if ($prefsEffectBody -notmatch 'characterName:\s*character') {
  throw 'CR-01: prefs-persistence effect must still write characterName unconditionally (not gated by hasPendingSpellVersion()).'
}
if ($prefsEffectBody -notmatch 'hasPendingSpellVersion') {
  throw 'CR-01: prefs-persistence effect lost the hasPendingSpellVersion() guard entirely - a pending plugin-* version preference must not be clobbered by an early savePrefs() write.'
}
if ($prefsEffectBody -notmatch 'versionKey:\s*window\.hasPendingSpellVersion') {
  throw 'CR-01: the hasPendingSpellVersion() guard must be scoped to the versionKey field of the saved prefs object, not the whole effect.'
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
