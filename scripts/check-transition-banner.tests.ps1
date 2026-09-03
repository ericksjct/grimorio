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

Write-Output 'Transition banner is wired (load order, mount, PRECACHE), safe (no write path, no auto-dismiss, safe external link), and migration.* i18n keys have full parity.'
