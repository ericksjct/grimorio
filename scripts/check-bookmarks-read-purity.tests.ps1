$ErrorActionPreference = 'Stop'

# WR-01 (fold-todo review-05-warnings): pack-manager.jsx used to be read-pure only
# because window.loadBookmarks() - which HAS a write branch (one-time migration of
# per-character bookmarks into the global list) - happened to already have run
# during boot before the manager could open. This gate proves the guarantee is now
# LOCAL: pack-manager.jsx reads through peekBookmarks(), a pure accessor with no
# write branch at all, and that purity is proven by executing the real production
# function against an instrumented fake localStorage - not by reading source text.

$repoRoot = Split-Path -Parent $PSScriptRoot
$managerPath = Join-Path $repoRoot 'pack-manager.jsx'
$editorPath = Join-Path $repoRoot 'v11-character-editor.jsx'
$manager = Get-Content -Raw -LiteralPath $managerPath
$editor = Get-Content -Raw -LiteralPath $editorPath

# ── 1. Assertiva de texto: pack-manager.jsx não alcança mais o acessor migratório ──

if ($manager -match 'window\.loadBookmarks') {
  throw 'WR-01 regressed: pack-manager.jsx must not call window.loadBookmarks() anymore - it must read through window.peekBookmarks() (no write branch).'
}
if ($manager -notmatch 'window\.peekBookmarks') {
  throw 'pack-manager.jsx must call window.peekBookmarks() in _removalImpact() to read the bookmarks list.'
}

# ── 2. Prova de execução: peekBookmarks() nunca escreve, loadBookmarks() migra uma vez ──

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  Write-Warning 'node nao encontrado - prova de execucao da pureza de peekBookmarks() pulada (assercoes de texto ja rodaram).'
  Write-Output 'Bookmarks read-purity text assertions passed (execution proof skipped: node not found).'
  return
}

$nodeScript = @'
const fs = require('fs');
const src = fs.readFileSync('v11-character-editor.jsx', 'utf8');

const keyMatch = src.match(/const HIFI_BOOKMARKS_KEY = ('[^']+');/);
const charsKeyMatch = src.match(/const HIFI_CHARS_KEY = ('[^']+');/);
if (!keyMatch || !charsKeyMatch) { console.error('nao achei HIFI_BOOKMARKS_KEY/HIFI_CHARS_KEY'); process.exit(1); }
const HIFI_BOOKMARKS_KEY = eval(keyMatch[1]);
const HIFI_CHARS_KEY = eval(charsKeyMatch[1]);

const peekMatch = src.match(/function peekBookmarks\(\)[\s\S]*?\n\}/);
const loadMatch = src.match(/function loadBookmarks\(\)[\s\S]*?\n\}/);
if (!peekMatch) { console.error('nao achei peekBookmarks() em v11-character-editor.jsx'); process.exit(1); }
if (!loadMatch) { console.error('nao achei loadBookmarks() em v11-character-editor.jsx'); process.exit(1); }
// Prova de execucao na funcao de PRODUCAO de verdade, nao numa reimplementacao.
eval(peekMatch[0]);
eval(loadMatch[0]);

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

let failures = 0;
function check(label, cond, detail) {
  if (!cond) {
    console.error('FAIL: ' + label + (detail ? ' - ' + detail : ''));
    failures++;
  }
}

// Cenario 1: peekBookmarks(), chave ausente.
{
  global.localStorage = makeFakeStorage({});
  const r = peekBookmarks();
  check('peekBookmarks (chave ausente) nao escreve', global.localStorage._calls.setItem === 0 && global.localStorage._calls.removeItem === 0);
  check('peekBookmarks (chave ausente) retorna array', Array.isArray(r));
}

// Cenario 2: peekBookmarks(), chave com JSON valido.
{
  global.localStorage = makeFakeStorage({ [HIFI_BOOKMARKS_KEY]: JSON.stringify(['a', 'b']) });
  const r = peekBookmarks();
  check('peekBookmarks (JSON valido) nao escreve', global.localStorage._calls.setItem === 0 && global.localStorage._calls.removeItem === 0);
  check('peekBookmarks (JSON valido) retorna array com o conteudo salvo', Array.isArray(r) && r.length === 2 && r[0] === 'a' && r[1] === 'b');
}

// Cenario 3: peekBookmarks(), chave com JSON corrompido.
{
  global.localStorage = makeFakeStorage({ [HIFI_BOOKMARKS_KEY]: '{not json' });
  const r = peekBookmarks();
  check('peekBookmarks (JSON corrompido) nao escreve', global.localStorage._calls.setItem === 0 && global.localStorage._calls.removeItem === 0);
  check('peekBookmarks (JSON corrompido) degrada para array vazio', Array.isArray(r) && r.length === 0);
}

// Cenario espelho: loadBookmarks(), chave ausente + hifi_chars_v1 com favoritas por
// personagem - a migracao unica continua existindo e escreve exatamente uma vez.
{
  const chars = [
    { id: 1, bookmarked: ['spell-a', 'spell-b'] },
    { id: 2, bookmarked: ['spell-b', 'spell-c'] },
  ];
  global.localStorage = makeFakeStorage({ [HIFI_CHARS_KEY]: JSON.stringify(chars) });
  const r = loadBookmarks();
  check('loadBookmarks (migracao) escreve exatamente uma vez', global.localStorage._calls.setItem === 1, 'setItem chamado ' + global.localStorage._calls.setItem + ' vez(es)');
  check('loadBookmarks (migracao) retorna array', Array.isArray(r));
  check('loadBookmarks (migracao) junta as favoritas dos personagens', r.length === 3 && ['spell-a', 'spell-b', 'spell-c'].every(k => r.includes(k)));
}

if (failures > 0) {
  console.error(failures + ' verificacao(oes) de pureza de leitura falharam.');
  process.exit(1);
}
console.log('peekBookmarks() nunca escreve (3 cenarios); loadBookmarks() migra exatamente uma vez quando a chave esta ausente.');
'@

$tmp = Join-Path ([System.IO.Path]::GetTempPath()) "check-bookmarks-read-purity-$([guid]::NewGuid()).cjs"
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
    throw "Bookmarks read-purity runtime proof failed: $nodeOut"
  }
} finally {
  if (Test-Path -LiteralPath $tmp) { Remove-Item -LiteralPath $tmp -Force }
}

Write-Output 'Bookmarks read-purity gate passed: peekBookmarks() never writes, loadBookmarks() migrates exactly once.'
