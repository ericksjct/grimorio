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

$adaptSpellMatch = [regex]::Match($loader, 'function adaptSpell\(s, versionLang, edition, versionKey, packName\)[\s\S]{0,8000}?\r?\n\}')
if (-not $adaptSpellMatch.Success) {
  throw 'adaptSpell(s, versionLang, edition, versionKey, packName) not found with the 5th parameter packName (GAP-1, E-04).'
}
if ($adaptSpellMatch.Value -notmatch "lang:\s*versionLang === 'ptbr' \? 'ptbr' : 'en'") {
  throw "adaptSpell()'s returned object must contain lang: versionLang === 'ptbr' ? 'ptbr' : 'en' (D-06)."
}
if ($adaptSpellMatch.Value -notmatch "_versionKey:\s*versionKey \|\| ''") {
  throw "adaptSpell()'s returned object must contain _versionKey: versionKey || ''."
}

if (-not $loader.Contains('adaptSpells(json, ver.lang, ver.edition, ver.key, ver.labelEn)')) {
  throw 'loadVersion() must call adaptSpells(json, ver.lang, ver.edition, ver.key, ver.labelEn) - ver.key stamps _versionKey and ver.labelEn (5th argument) is the pack-name fallback for spells without a source (GAP-1, E-04).'
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

// Recorta antes de buildSpellsFromRealData: dali pra frente ha hooks React
// (useSpellVersions), que o vm puro nao parseia. As funcoes de composicao
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
  vm.runInContext(fs.readFileSync('packs/index.js', 'utf8'), sandbox);
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
  check("normalizeSelection(['srd-2024-en','srd-2024-ptbr']) === ['srd-2024-ptbr'] (um base por vez)",
    arrEq(x.normalizeSelection(['srd-2024-en', 'srd-2024-ptbr']), ['srd-2024-ptbr']));
  check("normalizeSelection(['srd-2014-en','srd-2024-ptbr','srd-2024-en']) === ['srd-2024-en']",
    arrEq(x.normalizeSelection(['srd-2014-en', 'srd-2024-ptbr', 'srd-2024-en']), ['srd-2024-en']));
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

// ── fonte: fallback para o nome do pacote (GAP-1, E-04) ──
{
  const { x } = makeSandbox();
  const noSrc = { spells: [{ name: 'qa-raio-unico', level: 1, school: 'evocation', description: '<p>x</p>' }] };
  const a = x.adaptSpells(noSrc, 'ptbr', '2024', 'plugin-qa-ptbr', 'QA PT-BR')[0];
  check("magia sem source + packName 'QA PT-BR' -> sourceFull 'QA PT-BR' e src 'QA P'",
    a.sourceFull === 'QA PT-BR' && a.src === 'QA P');

  const srd = x.adaptSpells({ spells: [{ name: 'a', level: 1, source: 'SRD 5.2', description: 'x' }] }, 'en', '', 'k', 'Outro Pack')[0];
  check("source declarada 'SRD 5.2' nao e trocada pelo packName", srd.sourceFull === 'SRD 5.2' && srd.src === 'SRD');

  const phb = x.adaptSpells({ spells: [{ name: 'a', level: 1, source: "Player's Handbook", description: 'x' }] }, 'en', '', 'k', 'X')[0];
  check("source Player's Handbook continua 'PHB'", phb.src === 'PHB');

  const none = x.adaptSpells(noSrc, 'en', '', 'k')[0];
  check('sem source e sem packName -> src e sourceFull vazios', none.src === '' && none.sourceFull === '');

  const ctor = x.adaptSpells(noSrc, 'en', '', 'k', 'constructor')[0];
  check("packName 'constructor' -> src 'CONS' (tabela sem prototipo)", ctor.src === 'CONS' && ctor.sourceFull === 'constructor');
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

# ── Fase 8 plano 03 (D-03/D-22): "Também em" e o comparador de edição ancoram
# no pacote de ORIGEM da própria magia (s._versionKey), não numa "versão
# ativa" global (essa deixou de existir na composição aditiva, Task 1/08-01).
# Nenhum selo novo no card (D-20): HifiSpellCard continua sem consultar
# alsoIn/packSpellIndex - o rodapé `src` continua sendo a única indicação de
# origem no card. ────────────────────────────────────────────────────────
$uiPath = Join-Path $repoRoot 'v10-hifi.jsx'
$ui = Get-Content -Raw -LiteralPath $uiPath

$detailMatch = [regex]::Match($ui, 'function HifiDetailContent\([\s\S]{0,7000}?\n\}')
if (-not $detailMatch.Success) {
  throw 'Could not locate HifiDetailContent in v10-hifi.jsx.'
}
if ($detailMatch.Value -notmatch 's\._versionKey') {
  throw "HifiDetailContent must anchor the also-in note on the spell's own package (s._versionKey), not a global active version (08-03)."
}
if ($detailMatch.Value -notmatch 'getResolvedVersionKeys') {
  throw 'HifiDetailContent must consult window.getResolvedVersionKeys() for the SRD EN x PT sibling case within the resolved selection (D-03/D-22).'
}

$cardMatch = [regex]::Match($ui, 'const HifiSpellCard = React\.memo\(function HifiSpellCard\([\s\S]{0,7200}?\}\, \(prev, next\) =>[\s\S]{0,900}?\);')
if (-not $cardMatch.Success) {
  throw 'Could not locate HifiSpellCard (including its React.memo comparator) in v10-hifi.jsx.'
}
if ($cardMatch.Value -match 'alsoIn' -or $cardMatch.Value -match 'packSpellIndex') {
  throw 'HifiSpellCard must never consult alsoIn/packSpellIndex - no new badge on the card or grid row (D-20).'
}

Write-Output "Also-in note and edition comparator anchor on each spell's own package (_versionKey); no new badge on the card."

# ── Fase 8 plano 06 (D-16/D-18/D-21/D-24): o chip do menu de pacotes fica na
# barra e no drawer; o link de compartilhar leva a seleção inteira em lista;
# nenhum filtro por pacote aparece na barra de filtros. ──────────────────
$chipMounts = [regex]::Matches($ui, '<window\.PackMenuChip\b[^>]*lang=\{uiLang\}')
if ($chipMounts.Count -ne 2) {
  throw "v10-hifi.jsx must mount <window.PackMenuChip lang={uiLang} exactly twice (desktop bar + mobile drawer, D-16/D-18) - found $($chipMounts.Count)."
}

$shareFnMatch = [regex]::Match($ui, 'function hifiShareViewUrl\([\s\S]{0,600}?\n\}')
if (-not $shareFnMatch.Success) {
  throw 'Could not locate hifiShareViewUrl in v10-hifi.jsx.'
}
if ($shareFnMatch.Value -notmatch "versionKeys\.join\(','\)") {
  throw "hifiShareViewUrl must emit ?v= from versionKeys.join(',') - the shared link must carry the whole list selection (D-24, MIGR-04)."
}

foreach ($forbidden in @('switchVersion', 'VersionSelector', 'toast.versionShort')) {
  if ($ui.Contains($forbidden)) {
    throw "v10-hifi.jsx must not reference $forbidden anymore - the old single-active-version selector and its compatibility shims are removed in 08-06."
  }
}

$filterCfgMatch = [regex]::Match($ui, 'function hifiFilterConfig\(lang\)[\s\S]{0,2000}?return Object\.assign\(Object\.create\(null\), \{([\s\S]{0,2200}?)\}\);')
if (-not $filterCfgMatch.Success) {
  throw 'Could not locate hifiFilterConfig(lang) body in v10-hifi.jsx.'
}
$filterKeys = [regex]::Matches($filterCfgMatch.Groups[1].Value, '(?m)^\s*([a-zA-Z]+):\s*\{') | ForEach-Object { $_.Groups[1].Value }
$expectedFilterKeys = @('level', 'school', 'class', 'comp', 'conc', 'rit', 'time', 'dur', 'range', 'src')
if (($filterKeys -join ',') -ne ($expectedFilterKeys -join ',')) {
  throw "hifiFilterConfig must keep exactly the 10 keys level,school,class,comp,conc,rit,time,dur,range,src (D-21, no pack filter) - found: $($filterKeys -join ',')."
}

Write-Output 'Pack menu chip mounted twice (bar + drawer); share link emits ?v= as a list; no pack filter added; old single-version selector fully gone.'

# ── Fase 8 plano 06 (D-01/D-16): nenhum leitor de "versão ativa única" sobra
# no app inteiro - VersionSelector/getCurrentSpellVersion/switchVersion não
# podem aparecer em nenhum .jsx nem em index.html, e o retorno de
# useSpellVersions() não pode mais expor `current`. ──────────────────────
$appFiles = @(Get-ChildItem -LiteralPath $repoRoot -Filter '*.jsx' -File) + (Get-Item -LiteralPath (Join-Path $repoRoot 'index.html'))
foreach ($file in $appFiles) {
  $content = Get-Content -Raw -LiteralPath $file.FullName
  foreach ($forbidden in @('VersionSelector', 'getCurrentSpellVersion', 'switchVersion')) {
    if ($content -match [regex]::Escape($forbidden)) {
      throw "$($file.Name) still references $forbidden - no reader of a single 'active version' may remain anywhere in the app (D-01, 08-06)."
    }
  }
}

$useSpellVersionsMatch = [regex]::Match($loader, 'function useSpellVersions\(uiLang\)[\s\S]{0,3000}?\n\}')
if (-not $useSpellVersionsMatch.Success) {
  throw 'Could not locate useSpellVersions(uiLang) in spells-data-loader.jsx.'
}
if ($useSpellVersionsMatch.Value -match '\bcurrent\b') {
  throw "useSpellVersions()'s return must not expose current anymore (D-01, 08-06) - selectedKeys/resolvedKeys are the sole selection contract."
}

Write-Output 'No reader of a single active version remains anywhere in the app; useSpellVersions() no longer exposes current/switchVersion.'

# ── Fase 8 plano 09 (GAP-1, E-04): a linha FONTE do detalhe mostra o nome
# completo e só junta com ' · ' as partes presentes — nunca separador órfão. ──
$srcBlockMatch = [regex]::Match($ui, '\{/\* Source \*/\}[\s\S]*?alsoIn\.length')
if (-not $srcBlockMatch.Success) {
  throw 'Could not locate the {/* Source */} block of the detail panel in v10-hifi.jsx.'
}
foreach ($needle in @('s.sourceFull', ".filter(Boolean).join(' · ')", "'—'")) {
  if (-not $srcBlockMatch.Value.Contains($needle)) {
    throw "The detail FONTE block must contain $needle - only non-empty parts joined, '—' when empty (GAP-1)."
  }
}
if ($ui -match '\{s\.src\}\{s\.edition \?') {
  throw 'v10-hifi.jsx still concatenates {s.src}{s.edition ? ...} without a guard - orphan separator (GAP-1).'
}

Write-Output 'Detail FONTE line shows the full source name and never an orphan separator.'
