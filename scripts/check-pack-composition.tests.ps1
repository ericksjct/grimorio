$ErrorActionPreference = 'Stop'

# Fase 8 (Task 1): núcleo puro da composição aditiva de pacotes — normalizeSelection,
# resolveSelection, unionSpells e o carimbo lang/_versionKey por magia (D-02, D-03,
# D-04, D-05, D-06). Molde de check-loader-hardening.tests.ps1: asserções estruturais
# + prova de execução em Node contra o arquivo de produção real.

$repoRoot = Split-Path -Parent $PSScriptRoot
$loaderPath = Join-Path $repoRoot 'spells-data-loader.jsx'
$loader = Get-Content -Raw -LiteralPath $loaderPath

# ── Asserções estruturais ──────────────────────────────────────────
foreach ($needle in @(
  'function normalizeSelection(',
  'function resolveSelection(',
  'function unionSpells(',
  'function _browserDefaultKey(',
  'function _isSrdBuiltin(',
  'function _isFallback('
)) {
  if (-not $loader.Contains($needle)) {
    throw "Missing spells-data-loader.jsx composition detail: $needle"
  }
}

$adaptSpellMatch = [regex]::Match($loader, 'function adaptSpell\(s, versionLang, edition, versionKey\)[\s\S]{0,8000}?\r?\n\}')
if (-not $adaptSpellMatch.Success) {
  throw 'adaptSpell(s, versionLang, edition, versionKey) not found with the new 4th parameter.'
}
if ($adaptSpellMatch.Value -notmatch "lang:\s*versionLang === 'ptbr' \? 'ptbr' : 'en'") {
  throw "adaptSpell()'s returned object must contain lang: versionLang === 'ptbr' ? 'ptbr' : 'en' (D-06)."
}
if ($adaptSpellMatch.Value -notmatch "_versionKey:\s*versionKey \|\| ''") {
  throw "adaptSpell()'s returned object must contain _versionKey: versionKey || ''."
}

if (-not $loader.Contains('adaptSpells(json, ver.lang, ver.edition, ver.key)')) {
  throw 'loadVersion() must call adaptSpells(json, ver.lang, ver.edition, ver.key) - the 4th argument (ver.key) stamps _versionKey onto every adapted spell.'
}

foreach ($forbidden in @('hifi_chars_v1', 'hifi_bookmarks_v1', 'persistCharacters', 'persistBookmarks')) {
  if ($loader.Contains($forbidden)) {
    throw "spells-data-loader.jsx must never reference character/bookmark storage - found forbidden token: $forbidden (D-13, F5 D-07)."
  }
}

# ── Prova de execução real (Node) ──────────────────────────────────
$nodeScript = @'
const fs = require('fs');
const vm = require('vm');
const src = fs.readFileSync('spells-data-loader.jsx', 'utf8');

// Recorta antes de buildSpellsFromRealData: dali pra frente ha hooks React e
// JSX (VersionSelector), que o vm puro nao parseia. As funcoes de composicao
// -- o que este teste exercita -- vem todas antes.
const cut = src.indexOf('function buildSpellsFromRealData');
if (cut < 0) { console.error('nao achei buildSpellsFromRealData para cortar'); process.exit(1); }
const body = src.slice(0, cut);

function makeSandbox(opts) {
  opts = opts || {};
  const store = {};
  const listeners = {};
  const events = [];
  class CustomEvent {
    constructor(type, init) { this.type = type; this.detail = init && init.detail; }
  }
  const win = {
    location: { href: opts.href || 'http://localhost/' },
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    dispatchEvent(evt) { events.push(evt); (listeners[evt.type] || []).forEach(fn => fn(evt)); return true; },
    tt: (lang, key) => key,
  };
  const sandbox = {
    window: win,
    localStorage: {
      getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
    },
    navigator: {
      language: opts.language || 'en-US',
      languages: opts.languages || [opts.language || 'en-US'],
    },
    URL,
    console,
    CustomEvent,
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(
    body + '\nthis.__x = { normalizeSelection, resolveSelection, unionSpells, _browserDefaultKey, adaptSpells, _isSrdBuiltin, _isFallback };',
    sandbox
  );
  return { x: sandbox.__x, events, store };
}

let failures = 0;
function check(label, cond) {
  if (!cond) { console.error('FAIL: ' + label); failures++; }
}
function arrEq(a, b) {
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => v === b[i]);
}

// ── normalizeSelection ──
{
  const { x } = makeSandbox();
  check("normalizeSelection(['srd-2014-en','srd-2024-en']) === ['srd-2024-en']",
    arrEq(x.normalizeSelection(['srd-2014-en', 'srd-2024-en']), ['srd-2024-en']));
  check("normalizeSelection(['srd-2024-en','srd-2014-en']) === ['srd-2014-en']",
    arrEq(x.normalizeSelection(['srd-2024-en', 'srd-2014-en']), ['srd-2014-en']));
  check("normalizeSelection(['srd-2024-en','srd-2024-ptbr']) keeps both",
    arrEq(x.normalizeSelection(['srd-2024-en', 'srd-2024-ptbr']), ['srd-2024-en', 'srd-2024-ptbr']));
  check("normalizeSelection(['srd-2014-en','srd-2024-ptbr','srd-2024-en']) === ['srd-2024-ptbr','srd-2024-en']",
    arrEq(x.normalizeSelection(['srd-2014-en', 'srd-2024-ptbr', 'srd-2024-en']), ['srd-2024-ptbr', 'srd-2024-en']));
  check("normalizeSelection(['a','a',' b ', 7, null, '']) === ['a','b']",
    arrEq(x.normalizeSelection(['a', 'a', ' b ', 7, null, '']), ['a', 'b']));
  check('normalizeSelection never removes an unregistered/plugin key even mixed with an SRD edition switch (D-05)',
    arrEq(x.normalizeSelection(['plugin-x', 'srd-2014-en', 'srd-2024-en']), ['plugin-x', 'srd-2024-en']));
}

// ── resolveSelection / _browserDefaultKey ──
{
  const { x } = makeSandbox({ language: 'pt-BR', languages: ['pt-BR'] });
  check('resolveSelection([]) === [_browserDefaultKey()] with a pt-BR navigator (srd-2024-ptbr)',
    arrEq(x.resolveSelection([]), ['srd-2024-ptbr']) && x._browserDefaultKey() === 'srd-2024-ptbr');
}
{
  const { x } = makeSandbox({ language: 'en-US', languages: ['en-US'] });
  check('resolveSelection([]) === [_browserDefaultKey()] with an en-US navigator (srd-2024-en)',
    arrEq(x.resolveSelection([]), ['srd-2024-en']) && x._browserDefaultKey() === 'srd-2024-en');
  check("resolveSelection(['plugin-ghost']) falls back to the default version",
    arrEq(x.resolveSelection(['plugin-ghost']), ['srd-2024-en']));
  check("resolveSelection(['srd-2024-en','plugin-ghost']) drops the unresolved ghost key",
    arrEq(x.resolveSelection(['srd-2024-en', 'plugin-ghost']), ['srd-2024-en']));
}

// ── unionSpells + adaptSpells lang/_versionKey stamping ──
{
  const { x } = makeSandbox();
  const keyOf = (s) => s.school + '-' + s.lvl + '-' + s.en;

  const fixture = { spells: [{ name: 'fireball', displayName: 'Bola de Fogo', level: 3, school: 'evocation', class: ['wizard'], source: 'SRD', description: '<p>ok</p>' }] };
  const enSpells = x.adaptSpells(fixture, 'en', '5e 2024', 'srd-2024-en');
  const ptSpells = x.adaptSpells(fixture, 'ptbr', '5e 2024', 'srd-2024-ptbr');

  check("adaptSpells(fixture, 'ptbr', '5e 2024', 'srd-2024-ptbr') stamps lang==='ptbr' and _versionKey==='srd-2024-ptbr' on every spell",
    ptSpells.length > 0 && ptSpells.every(s => s.lang === 'ptbr' && s._versionKey === 'srd-2024-ptbr'));
  check("adaptSpells(fixture, 'en', '5e 2024', 'srd-2024-en') stamps lang==='en' and _versionKey==='srd-2024-en' on every spell",
    enSpells.length > 0 && enSpells.every(s => s.lang === 'en' && s._versionKey === 'srd-2024-en'));

  const unionPt = x.unionSpells([
    { version: { key: 'srd-2024-en', corpus: 'srd', edition: '5e 2024' }, spells: enSpells },
    { version: { key: 'srd-2024-ptbr', corpus: 'srd', edition: '5e 2024' }, spells: ptSpells },
  ], 'ptbr', keyOf);
  check('union of SRD EN+PT (EN first) with uiLang ptbr keeps the PT spell, size stays at one list size',
    unionPt.length === 1 && unionPt[0].lang === 'ptbr');

  const unionPtReversed = x.unionSpells([
    { version: { key: 'srd-2024-ptbr', corpus: 'srd', edition: '5e 2024' }, spells: ptSpells },
    { version: { key: 'srd-2024-en', corpus: 'srd', edition: '5e 2024' }, spells: enSpells },
  ], 'ptbr', keyOf);
  check('union of SRD PT+EN (PT first) with uiLang ptbr keeps the PT spell regardless of entry order',
    unionPtReversed.length === 1 && unionPtReversed[0].lang === 'ptbr');

  const unionEn = x.unionSpells([
    { version: { key: 'srd-2024-en', corpus: 'srd', edition: '5e 2024' }, spells: enSpells },
    { version: { key: 'srd-2024-ptbr', corpus: 'srd', edition: '5e 2024' }, spells: ptSpells },
  ], 'en', keyOf);
  check('union of SRD EN+PT with uiLang en keeps the EN spell, size stays at one list size',
    unionEn.length === 1 && unionEn[0].lang === 'en');

  const unionEnReversed = x.unionSpells([
    { version: { key: 'srd-2024-ptbr', corpus: 'srd', edition: '5e 2024' }, spells: ptSpells },
    { version: { key: 'srd-2024-en', corpus: 'srd', edition: '5e 2024' }, spells: enSpells },
  ], 'en', keyOf);
  check('union of SRD PT+EN (PT first) with uiLang en keeps the EN spell regardless of entry order',
    unionEnReversed.length === 1 && unionEnReversed[0].lang === 'en');

  const fixtureB = { spells: [{ name: 'magic-missile', level: 1, school: 'evocation', class: ['wizard'], source: 'Homebrew', description: '<p>ok</p>' }] };
  const homebrewDistinct = x.adaptSpells(fixtureB, 'en', '', 'plugin-homebrew');
  const unionDistinct = x.unionSpells([
    { version: { key: 'srd-2024-en', corpus: 'srd', edition: '5e 2024' }, spells: enSpells },
    { version: { key: 'plugin-homebrew', corpus: 'pack', edition: '' }, spells: homebrewDistinct },
  ], 'en', keyOf);
  check('union of SRD + a homebrew with a distinct slug concatenates in entry order, size 2',
    unionDistinct.length === 2 && unionDistinct[0]._versionKey === 'srd-2024-en' && unionDistinct[1]._versionKey === 'plugin-homebrew');

  const homebrewA = x.adaptSpells(fixture, 'en', '', 'plugin-a');
  const homebrewB = x.adaptSpells(fixture, 'en', '', 'plugin-b');
  const unionHomebrewCollision = x.unionSpells([
    { version: { key: 'plugin-a', corpus: 'pack', edition: '' }, spells: homebrewA },
    { version: { key: 'plugin-b', corpus: 'pack', edition: '' }, spells: homebrewB },
  ], 'en', keyOf);
  check('union of two homebrews sharing the same slug keeps the first entry, no duplicate (A-04)',
    unionHomebrewCollision.length === 1 && unionHomebrewCollision[0]._versionKey === 'plugin-a');
}

if (failures > 0) {
  console.error(failures + ' verificacao(oes) de composicao de pacotes falharam.');
  process.exit(1);
}
console.log('Pack composition core (normalizeSelection, resolveSelection, unionSpells, adaptSpells lang/_versionKey) verified end to end.');
'@

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  Write-Warning 'node nao encontrado - prova de execucao do nucleo de composicao pulada (assercoes estruturais ja rodaram).'
} else {
  $tmp = Join-Path ([System.IO.Path]::GetTempPath()) "check-pack-composition-$([guid]::NewGuid()).cjs"
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
      throw "Pack composition runtime proof failed: $nodeOut"
    }
    Write-Output $nodeOut
  } finally {
    if (Test-Path -LiteralPath $tmp) { Remove-Item -LiteralPath $tmp -Force }
  }
}

Write-Output 'Pack composition core contract present (normalizeSelection, resolveSelection, unionSpells, adaptSpell lang/_versionKey stamping).'
