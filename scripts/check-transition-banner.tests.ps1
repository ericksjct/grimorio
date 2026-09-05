$ErrorActionPreference = 'Stop'

# MIGR-03 (06-04): o banner de transição só existe pra usuário existente (D-06), nunca
# some sozinho (D-05), dispensa no blob de prefs já existente sem chave nova (D-07), e
# todo texto vem de chaves migration.* com paridade total entre os dois idiomas.

$repoRoot = Split-Path -Parent $PSScriptRoot
$indexPath = Join-Path $repoRoot 'index.html'
$swPath = Join-Path $repoRoot 'sw.js'
$bannerPath = Join-Path $repoRoot 'transition-banner.jsx'
$index = Get-Content -Raw -LiteralPath $indexPath
$sw = Get-Content -Raw -LiteralPath $swPath
$banner = Get-Content -Raw -LiteralPath $bannerPath

# ── 1. Ordem de carga: transition-banner.jsx entre pack-manager.jsx e v10-hifi.jsx ──
$packManagerIdx = $index.IndexOf('src="pack-manager.jsx"')
$bannerScriptIdx = $index.IndexOf('src="transition-banner.jsx"')
$hifiIdx = $index.IndexOf('src="v10-hifi.jsx"')
if ($packManagerIdx -lt 0 -or $bannerScriptIdx -lt 0 -or $hifiIdx -lt 0) {
  throw 'Could not locate one of the pack-manager.jsx / transition-banner.jsx / v10-hifi.jsx <script> tags in index.html.'
}
if (-not ($packManagerIdx -lt $bannerScriptIdx -and $bannerScriptIdx -lt $hifiIdx)) {
  throw 'transition-banner.jsx must load after pack-manager.jsx and before v10-hifi.jsx (it consumes window.__openPackManager and window.peekBookmarks).'
}

# ── 2. Montagem: <TransitionBannerRoot recebendo lang={uiLang} ──
$mountMatch = [regex]::Match($index, '<TransitionBannerRoot[^>]*>')
if (-not $mountMatch.Success) {
  throw 'index.html is missing the <TransitionBannerRoot ... /> mount.'
}
if ($mountMatch.Value -notmatch 'lang=\{uiLang\}') {
  throw 'D-01: <TransitionBannerRoot must receive lang={uiLang} (the interface language), never a derivation of the active spell version.'
}

# ── 3. O efeito de persistência do App não grava migrationNoticeDismissed ──
# (senão uma troca de tema sobrescreve a dispensa - T-06-04-03).
$persistMatch = [regex]::Match($index, 'React\.useEffect\(\(\) => \{\s*const prev = loadPrefs\(\);[\s\S]{0,400}?\}, \[dark, theme, character, uiLang, versionKey\]\);')
if (-not $persistMatch.Success) {
  throw 'Could not locate the App prefs-persistence effect (const prev = loadPrefs(); savePrefs({...})) in index.html.'
}
if ($persistMatch.Value -match 'migrationNoticeDismissed') {
  throw 'T-06-04-03: the App persistence effect must NOT write migrationNoticeDismissed - the banner reads/writes that field itself, and this effect re-running on every theme change would overwrite the dismissal.'
}

# ── 4. PRECACHE em sw.js ──
if ($sw -notlike "*'./transition-banner.jsx'*") {
  throw 'sw.js is missing ./transition-banner.jsx from PRECACHE - the banner would break offline.'
}
if ($sw -notlike "*const CACHE_VERSION = 'grimorio-v2';*") {
  throw 'sw.js CACHE_VERSION is not grimorio-v2 - the decommission bump (D-14, 06-05) should already have happened.'
}

# ── 5. Assertivas de texto em transition-banner.jsx ──
if ($banner -match 'window\.loadBookmarks') {
  throw 'transition-banner.jsx must never call window.loadBookmarks() (it has a write branch) - use window.peekBookmarks() instead (D-06/WR-01).'
}
if ($banner -match 'setTimeout|setInterval') {
  throw 'D-05: the banner must never auto-dismiss - found setTimeout/setInterval in transition-banner.jsx.'
}
$blankMatches = [regex]::Matches($banner, '<a\b[^>]*target="_blank"[^>]*>')
if ($blankMatches.Count -eq 0) {
  throw 'transition-banner.jsx is missing the target="_blank" link to pack-docs.html.'
}
foreach ($m in $blankMatches) {
  if ($m.Value -notmatch 'rel="noopener noreferrer"') {
    throw ('T-06-04-01: every target="_blank" link must carry rel="noopener noreferrer" - found: ' + $m.Value)
  }
}

# ── 6. Prova de execução: paridade total das chaves migration.* entre ptbr e en ──
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  Write-Warning 'node nao encontrado - prova de execucao da paridade i18n pulada (assercoes estruturais ja rodaram).'
  Write-Output 'Transition banner structural checks passed (i18n parity proof skipped: node not found).'
  return
}

$nodeScript = @'
const fs = require('fs');
const vm = require('vm');
const src = fs.readFileSync('i18n.jsx', 'utf8');

// Executa o arquivo de PRODUCAO de verdade (nao uma reimplementacao) e captura
// STRINGS + a funcao real i18nParityCheck() - mesmo padrao de
// check-pack-import-dialog.tests.ps1 (vm.runInContext + captura via this.__x).
const sandbox = { console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(src + '\nthis.__STRINGS = STRINGS;\nthis.__i18nParityCheck = i18nParityCheck;\n', sandbox);
const STRINGS = sandbox.__STRINGS;
if (!STRINGS || !STRINGS.ptbr || !STRINGS.en) {
  console.error('nao consegui capturar STRINGS.ptbr/STRINGS.en de i18n.jsx');
  process.exit(1);
}

const MIGRATION_KEYS = [
  'migration.title', 'migration.removed', 'migration.kept',
  'migration.orphansOne', 'migration.orphansMany', 'migration.importCta',
  'migration.openManager', 'migration.learnMore', 'migration.dismiss', 'migration.dismissAria',
];

let failures = 0;
function check(label, cond) {
  if (!cond) { console.error('FAIL: ' + label); failures++; }
}

['ptbr', 'en'].forEach((lang) => {
  MIGRATION_KEYS.forEach((key) => {
    check(`STRINGS.${lang}['${key}'] exists`, typeof STRINGS[lang][key] === 'string' && STRINGS[lang][key].length > 0);
  });
});

// Chama a funcao REAL de producao, nao uma reimplementacao do parity check.
const parity = sandbox.__i18nParityCheck();
check('i18nParityCheck() returns {} (no gaps between ptbr/en)', Object.keys(parity).length === 0);
if (Object.keys(parity).length) console.error('gaps: ' + JSON.stringify(parity));

check('migration.orphansMany has the {n} placeholder in ptbr', /\{n\}/.test(STRINGS.ptbr['migration.orphansMany']));
check('migration.orphansMany has the {n} placeholder in en', /\{n\}/.test(STRINGS.en['migration.orphansMany']));
check('migration.orphansOne has NO placeholder in ptbr', !/\{n\}/.test(STRINGS.ptbr['migration.orphansOne']));
check('migration.orphansOne has NO placeholder in en', !/\{n\}/.test(STRINGS.en['migration.orphansOne']));

if (failures > 0) {
  console.error(failures + ' verificacao(oes) de paridade i18n falharam.');
  process.exit(1);
}
console.log('migration.* keys: 10/10 present in ptbr and en, full parity, singular/plural placeholders correct.');
'@

$tmp = Join-Path ([System.IO.Path]::GetTempPath()) "check-transition-banner-$([guid]::NewGuid()).cjs"
try {
  Set-Content -LiteralPath $tmp -Value $nodeScript -Encoding utf8NoBOM
  Push-Location $repoRoot
  try {
    $nodeOut = & node $tmp 2>&1
    $nodeExit = $LASTEXITCODE
  } finally {
    Pop-Location
  }
  if ($nodeExit -ne 0) {
    throw "Transition banner i18n parity proof failed: $nodeOut"
  }
} finally {
  if (Test-Path -LiteralPath $tmp) { Remove-Item -LiteralPath $tmp -Force }
}

# ── 7. Prova de execução: _hasExistingUserSignal() contra os leitores de produção ──
# 06-07 (06-UAT.md ## Gaps): a garantia D-06 ("banner nunca aparece em instalação nova")
# e a não-regressão de MIGR-03 ("banner continua aparecendo pra usuário existente") são
# provadas EXECUTANDO _hasExistingUserSignal() de verdade contra peekCharacters() e
# peekBookmarks() de verdade e um localStorage falso - nunca por grep no fonte.
$node2 = Get-Command node -ErrorAction SilentlyContinue
if (-not $node2) {
  Write-Warning 'node nao encontrado - prova de execucao de _hasExistingUserSignal() pulada (assercoes estruturais ja rodaram).'
  Write-Output 'Transition banner structural checks passed (existing-user signal proof skipped: node not found).'
  return
}

$nodeScript2 = @'
const fs = require('fs');
const editorSrc = fs.readFileSync('v11-character-editor.jsx', 'utf8');
const bannerSrc = fs.readFileSync('transition-banner.jsx', 'utf8');

const charsKeyMatch = editorSrc.match(/const HIFI_CHARS_KEY = ('[^']+');/);
const bookmarksKeyMatch = editorSrc.match(/const HIFI_BOOKMARKS_KEY = ('[^']+');/);
if (!charsKeyMatch || !bookmarksKeyMatch) { console.error('nao achei HIFI_CHARS_KEY/HIFI_BOOKMARKS_KEY'); process.exit(1); }
const HIFI_CHARS_KEY = eval(charsKeyMatch[1]);
const HIFI_BOOKMARKS_KEY = eval(bookmarksKeyMatch[1]);

const peekCharsMatch = editorSrc.match(/function peekCharacters\(\)[\s\S]*?\n\}/);
const peekBookmarksMatch = editorSrc.match(/function peekBookmarks\(\)[\s\S]*?\n\}/);
const signalMatch = bannerSrc.match(/function _hasExistingUserSignal\(\)[\s\S]*?\n\}/);
if (!peekCharsMatch) { console.error('nao achei peekCharacters() em v11-character-editor.jsx'); process.exit(1); }
if (!peekBookmarksMatch) { console.error('nao achei peekBookmarks() em v11-character-editor.jsx'); process.exit(1); }
if (!signalMatch) { console.error('nao achei _hasExistingUserSignal() em transition-banner.jsx'); process.exit(1); }

function makeFakeStorage(initial) {
  const store = Object.assign({}, initial);
  const calls = { getItem: 0, setItem: 0, removeItem: 0 };
  return {
    getItem(k) { calls.getItem++; return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem(k, v) { calls.setItem++; store[k] = String(v); },
    removeItem(k) { calls.removeItem++; delete store[k]; },
    _calls: calls,
  };
}

// Prova de execucao nas funcoes de PRODUCAO de verdade, nao numa reimplementacao.
eval(peekCharsMatch[0]);
eval(peekBookmarksMatch[0]);
eval(signalMatch[0]);

let failures = 0;
function check(label, cond, detail) {
  if (!cond) { console.error('FAIL: ' + label + (detail ? ' - ' + detail : '')); failures++; }
}

function setScenario(storageInitial, legacyFallback) {
  global.localStorage = makeFakeStorage(storageInitial);
  global.window = { __legacyVersionFallback: legacyFallback, peekCharacters, peekBookmarks };
}

// (a) D-06: storage vazio e __legacyVersionFallback nulo - instalacao nova, banner NAO
// pode aparecer, e a checagem em si nao pode deixar rastro no localStorage falso.
{
  setScenario({}, null);
  const r = _hasExistingUserSignal();
  check('(a) instalacao virgem: _hasExistingUserSignal() e false (D-06)', r === false);
  check('(a) instalacao virgem: a checagem nao escreve no localStorage', global.localStorage._calls.setItem === 0 && global.localStorage._calls.removeItem === 0);
}

// (b) MIGR-03 nao-regressao: hifi_chars_v1 com um personagem salvo de verdade.
{
  setScenario({ [HIFI_CHARS_KEY]: JSON.stringify([{ id: 'meu-personagem' }]) }, null);
  const r = _hasExistingUserSignal();
  check('(b) personagem salvo de verdade: _hasExistingUserSignal() e true (MIGR-03)', r === true);
}

// (c) MIGR-03 nao-regressao: hifi_bookmarks_v1 com uma favorita, nenhum personagem.
{
  setScenario({ [HIFI_BOOKMARKS_KEY]: JSON.stringify(['spell-a']) }, null);
  const r = _hasExistingUserSignal();
  check('(c) favorita global salva: _hasExistingUserSignal() e true (MIGR-03)', r === true);
}

// (d) MIGR-03 nao-regressao: storage vazio mas __legacyVersionFallback aponta uma das
// 4 chaves de versao removidas.
{
  setScenario({}, 'spells-5E-2024-PTBR');
  const r = _hasExistingUserSignal();
  check('(d) legacyVersionFallback presente: _hasExistingUserSignal() e true (MIGR-03)', r === true);
}

if (failures > 0) {
  console.error(failures + ' verificacao(oes) do sinal de usuario existente falharam.');
  process.exit(1);
}
console.log('_hasExistingUserSignal(): falso em instalacao virgem (D-06), verdadeiro para personagem salvo, favorita salva e legacyVersionFallback (MIGR-03, sem regressao).');
'@

$tmp2 = Join-Path ([System.IO.Path]::GetTempPath()) "check-transition-banner-signal-$([guid]::NewGuid()).cjs"
try {
  Set-Content -LiteralPath $tmp2 -Value $nodeScript2 -Encoding utf8NoBOM
  Push-Location $repoRoot
  try {
    $nodeOut2 = & node $tmp2 2>&1
    $nodeExit2 = $LASTEXITCODE
  } finally {
    Pop-Location
  }
  if ($nodeExit2 -ne 0) {
    throw "_hasExistingUserSignal() execution proof failed: $nodeOut2"
  }
} finally {
  if (Test-Path -LiteralPath $tmp2) { Remove-Item -LiteralPath $tmp2 -Force }
}

Write-Output 'Transition banner is wired (load order, mount, PRECACHE), safe (no write path, no auto-dismiss, safe external link), migration.* i18n keys have full parity, and _hasExistingUserSignal() is proven false on a fresh install (D-06) and true for a real existing user (MIGR-03, no regression).'
