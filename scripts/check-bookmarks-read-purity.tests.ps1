$ErrorActionPreference = 'Stop'

# WR-01 (fold-todo review-05-warnings) + 06-07 gap closure (06-UAT.md ## Gaps):
# pack-manager.jsx used to be read-pure only because window.loadBookmarks() - which HAS
# a write branch (one-time migration of per-character bookmarks into the global list) -
# happened to already have run during boot before the manager could open. This gate
# proves the guarantee is now LOCAL, for BOTH stores: peekBookmarks() and peekCharacters()
# are pure accessors with no write branch at all; loadCharacters() never substitutes a
# synthesized default character for "nothing saved" (Gap 1 - the defect that let the
# migration banner appear on a fresh install); and loadBookmarks() never creates
# hifi_bookmarks_v1 on a fresh install with nothing to migrate (Gap 2), while still
# migrating real per-character favorites exactly once. Every guarantee is proven by
# executing the real production function against an instrumented fake localStorage - not
# by reading source text.

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

// Só o literal do array (nao a declaracao `const` inteira) - um `const` dentro de um
// eval() nao vaza pro escopo de fora, mas o VALOR de uma expressao evaluada sim.
const defaultCharsMatch = src.match(/const HIFI_DEFAULT_CHARS = (\[[\s\S]*?\n\]);/);
if (!defaultCharsMatch) { console.error('nao achei HIFI_DEFAULT_CHARS'); process.exit(1); }
const HIFI_DEFAULT_CHARS = eval(defaultCharsMatch[1]);

const peekMatch = src.match(/function peekBookmarks\(\)[\s\S]*?\n\}/);
const loadMatch = src.match(/function loadBookmarks\(\)[\s\S]*?\n\}/);
const peekCharsMatch = src.match(/function peekCharacters\(\)[\s\S]*?\n\}/);
const loadCharsMatch = src.match(/function loadCharacters\(\)[\s\S]*?\n\}/);
if (!peekMatch) { console.error('nao achei peekBookmarks() em v11-character-editor.jsx'); process.exit(1); }
if (!loadMatch) { console.error('nao achei loadBookmarks() em v11-character-editor.jsx'); process.exit(1); }
if (!peekCharsMatch) { console.error('nao achei peekCharacters() em v11-character-editor.jsx'); process.exit(1); }
if (!loadCharsMatch) { console.error('nao achei loadCharacters() em v11-character-editor.jsx'); process.exit(1); }
// Prova de execucao na funcao de PRODUCAO de verdade, nao numa reimplementacao.
eval(peekMatch[0]);
eval(loadMatch[0]);
// _normChar identidade: o que esta sob prova aqui e QUAL array loadCharacters() escolhe,
// nao a cadeia de normalizacao (_normSlots/_normClassLevels/_normAbilities), que ja tem
// cobertura propria nos gates de personagem existentes.
function _normChar(c) { return c; }
eval(peekCharsMatch[0]);
eval(loadCharsMatch[0]);

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

// Cenario Gap 2 (06-UAT): loadBookmarks(), AMBAS as chaves ausentes - nada a migrar,
// setItem tem de ficar em zero (a chave nao pode nascer de uma leitura).
{
  global.localStorage = makeFakeStorage({});
  const r = loadBookmarks();
  check('loadBookmarks (nada a migrar, storage virgem) nao escreve', global.localStorage._calls.setItem === 0, 'setItem chamado ' + global.localStorage._calls.setItem + ' vez(es)');
  check('loadBookmarks (nada a migrar, storage virgem) retorna array vazio', Array.isArray(r) && r.length === 0);
}

// Cenario Gap 2 (06-UAT): hifi_chars_v1 presente mas nenhum personagem tem favoritas -
// ainda nada a migrar, setItem tambem tem de ficar em zero.
{
  const chars = [{ id: 1, bookmarked: [] }, { id: 2 }];
  global.localStorage = makeFakeStorage({ [HIFI_CHARS_KEY]: JSON.stringify(chars) });
  const r = loadBookmarks();
  check('loadBookmarks (personagens sem favoritas) nao escreve', global.localStorage._calls.setItem === 0, 'setItem chamado ' + global.localStorage._calls.setItem + ' vez(es)');
  check('loadBookmarks (personagens sem favoritas) retorna array vazio', Array.isArray(r) && r.length === 0);
}

// Cenario peekCharacters 1 (Gap 1, 06-UAT): chave ausente devolve array de comprimento 0
// - contraprova direta: nenhum item devolvido pode ter o id do personagem default.
{
  global.localStorage = makeFakeStorage({});
  const r = peekCharacters();
  check('peekCharacters (chave ausente) nao escreve', global.localStorage._calls.setItem === 0 && global.localStorage._calls.removeItem === 0);
  check('peekCharacters (chave ausente) retorna array de comprimento 0', Array.isArray(r) && r.length === 0);
  check('peekCharacters (chave ausente) nunca sintetiza o personagem default', !r.some((c) => c && c.id === HIFI_DEFAULT_CHARS[0].id));
}

// Cenario peekCharacters 2: chave com JSON valido de dois personagens devolve os dois.
{
  const chars = [{ id: 'a' }, { id: 'b' }];
  global.localStorage = makeFakeStorage({ [HIFI_CHARS_KEY]: JSON.stringify(chars) });
  const r = peekCharacters();
  check('peekCharacters (JSON valido) nao escreve', global.localStorage._calls.setItem === 0 && global.localStorage._calls.removeItem === 0);
  check('peekCharacters (JSON valido) devolve os dois personagens salvos', Array.isArray(r) && r.length === 2 && r[0].id === 'a' && r[1].id === 'b');
}

// Cenario peekCharacters 3: chave com JSON corrompido degrada para array vazio.
{
  global.localStorage = makeFakeStorage({ [HIFI_CHARS_KEY]: '{not json' });
  const r = peekCharacters();
  check('peekCharacters (JSON corrompido) nao escreve', global.localStorage._calls.setItem === 0 && global.localStorage._calls.removeItem === 0);
  check('peekCharacters (JSON corrompido) degrada para array vazio', Array.isArray(r) && r.length === 0);
}

// Cenario loadCharacters 1 (Gap 1, 06-UAT): chave ausente devolve exatamente a lista
// default - comprimento e id conferidos contra a declaracao extraida do fonte.
{
  global.localStorage = makeFakeStorage({});
  const r = loadCharacters();
  check('loadCharacters (chave ausente) nao escreve', global.localStorage._calls.setItem === 0);
  check(
    'loadCharacters (chave ausente) devolve a lista default',
    Array.isArray(r) && r.length === HIFI_DEFAULT_CHARS.length && r[0].id === HIFI_DEFAULT_CHARS[0].id
  );
}

// Cenario loadCharacters 2: personagens salvos devolvidos, nao o default.
{
  const chars = [{ id: 'meu-personagem' }];
  global.localStorage = makeFakeStorage({ [HIFI_CHARS_KEY]: JSON.stringify(chars) });
  const r = loadCharacters();
  check('loadCharacters (personagens salvos) nao escreve', global.localStorage._calls.setItem === 0);
  check('loadCharacters (personagens salvos) devolve o salvo, nao o default', Array.isArray(r) && r.length === 1 && r[0].id === 'meu-personagem');
}

if (failures > 0) {
  console.error(failures + ' verificacao(oes) de pureza de leitura falharam.');
  process.exit(1);
}
console.log('peekBookmarks()/peekCharacters() nunca escrevem; loadCharacters() nunca sintetiza o default como personagem salvo; loadBookmarks() so migra quando ha algo a migrar (exatamente uma vez), e nao cria a chave numa instalacao virgem.');
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

Write-Output 'Bookmarks read-purity gate passed: peekBookmarks()/peekCharacters() never write, loadCharacters() never substitutes the default for a real save, and loadBookmarks() only migrates (and only writes) when there is something to migrate.'
