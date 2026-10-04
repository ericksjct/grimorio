$ErrorActionPreference = 'Stop'

# Fase 8 (MGMT-07, D-08..D-14): identidade por slug de magia no funil de import
# (pack-import.jsx) e o prompt de renomear reutilizável (pack-rename-dialog.jsx).
# Molde de check-pack-composition.tests.ps1: asserções estruturais + prova de
# execução em Node contra os arquivos de produção reais.

$repoRoot = Split-Path -Parent $PSScriptRoot
$packImportPath = Join-Path $repoRoot 'pack-import.jsx'
$packImport = Get-Content -Raw -LiteralPath $packImportPath

# ── Task 1: presença estrutural em pack-import.jsx ──

foreach ($needle in @(
  'const SLUG_PATTERN',
  'function slugKey(',
  'function detectSlugConflicts(',
  'function suggestSlug(',
  'function validateSlugRename(',
  'function applySlugRenames(',
  'function loadReservedSlugs(',
  'function slugOwnersOf(',
  "SLUG_CONFLICT: 'slug-conflict'"
)) {
  if ($packImport -notlike "*$needle*") {
    throw "Missing pack-import.jsx slug-identity implementation detail: $needle"
  }
}

$exposedMatch = [regex]::Match($packImport, 'window\.packImport\s*=\s*\{[\s\S]*?\};')
if (-not $exposedMatch.Success) {
  throw 'Could not locate the window.packImport assignment block.'
}
$exposedBlock = $exposedMatch.Value
foreach ($fn in @('SLUG_PATTERN', 'slugKey', 'detectSlugConflicts', 'suggestSlug', 'validateSlugRename', 'applySlugRenames', 'loadReservedSlugs', 'slugOwnersOf')) {
  if ($exposedBlock -notlike "*$fn*") {
    throw "window.packImport block is missing exposed slug-identity member: $fn"
  }
}

# E-01: o import resolve colisão sozinho — nada do prompt nem de dado de
# personagem pode sobrar em pack-import.jsx (D-13).
foreach ($gone in @('CANCELLED', 'cancelled', 'onConflicts', 'window.adaptSpell', 'window.hifiSpellKey', 'localStorage', 'persistCharacters', 'persistBookmarks', 'hifi_chars_v1', 'hifi_bookmarks_v1')) {
  if ($packImport -match [regex]::Escape($gone)) {
    throw "pack-import.jsx must not contain $gone after E-01 (import auto-renames, no prompt, no character/bookmark storage)."
  }
}

# freeIdentifier() (colisão de ID DE PACK) permanece intocado por suggestSlug/
# detectSlugConflicts — mecanismos separados (RESEARCH Pitfall 4).
function Get-FunctionBody([string]$src, [string]$signature) {
  $m = [regex]::Match($src, [regex]::Escape($signature) + '[\s\S]*?\r?\n\}\r?\n')
  if (-not $m.Success) { throw "Could not locate function block for: $signature" }
  return $m.Value
}
$suggestSlugBody = Get-FunctionBody $packImport 'function suggestSlug('
$detectConflictsBody = Get-FunctionBody $packImport 'function detectSlugConflicts('
if ($suggestSlugBody -match 'freeIdentifier\(' -or $detectConflictsBody -match 'freeIdentifier\(') {
  throw 'suggestSlug()/detectSlugConflicts() must never call freeIdentifier() - slug identity and pack-id collision are separate mechanisms.'
}

# ── Task 2: pack-rename-dialog.jsx ──

$dialogModulePath = Join-Path $repoRoot 'pack-rename-dialog.jsx'
if (Test-Path -LiteralPath $dialogModulePath) {
  $dialogModule = Get-Content -Raw -LiteralPath $dialogModulePath

  foreach ($needle in @(
    'function PackRenameForm(',
    'function PackRenameDialog(',
    'async function renameInstalledPackSlugs(',
    'function renameImpact(',
    'Object.assign(window, {',
    'useDialogA11y',
    '.slice(0, 64)',
    'rename.applyAllSuffix',
    'rename.submitting',
    'rename.submitDisabledHint',
    "'rename.impactWarning.'"
  )) {
    if ($dialogModule -notlike "*$needle*") {
      throw "Missing pack-rename-dialog.jsx implementation detail: $needle"
    }
  }

  $dialogRoleMatches = [regex]::Matches($dialogModule, 'role="dialog"')
  if ($dialogRoleMatches.Count -ne 1) {
    throw "Expected exactly 1 role=`"dialog`" in pack-rename-dialog.jsx, found $($dialogRoleMatches.Count)."
  }
  $dialogPutPackMatches = [regex]::Matches($dialogModule, 'pluginStore\.putPack\(')
  if ($dialogPutPackMatches.Count -ne 1) {
    throw "Expected exactly 1 pluginStore.putPack( call in pack-rename-dialog.jsx, found $($dialogPutPackMatches.Count)."
  }

  # D-13: nenhuma escrita em dado de personagem, nem por identificador citado
  # em prosa (o gate proíbe por conceito, checando o arquivo INTEIRO).
  foreach ($forbidden in @('localStorage', 'persistCharacters', 'persistBookmarks', 'toggleBookmark', 'loadBookmarks', 'dangerouslySetInnerHTML')) {
    if ($dialogModule -match [regex]::Escape($forbidden)) {
      throw "pack-rename-dialog.jsx must never reference character/bookmark storage or unsafe HTML - found forbidden token: $forbidden (D-13)."
    }
  }

  # ── index.html: pack-rename-dialog.jsx entre v11-character-editor.jsx e pack-manager.jsx ──
  $indexPath = Join-Path $repoRoot 'index.html'
  $indexHtml = Get-Content -Raw -LiteralPath $indexPath
  $idxEditor = $indexHtml.IndexOf('src="v11-character-editor.jsx"')
  $idxRename = $indexHtml.IndexOf('src="pack-rename-dialog.jsx"')
  $idxManager = $indexHtml.IndexOf('src="pack-manager.jsx"')
  if ($idxEditor -lt 0 -or $idxRename -lt 0 -or $idxManager -lt 0 -or -not ($idxEditor -lt $idxRename -and $idxRename -lt $idxManager)) {
    throw 'index.html must load pack-rename-dialog.jsx after v11-character-editor.jsx and before pack-manager.jsx (uses window.useDialogA11y/peek*; PackManagerRoot mounts PackRenameDialog).'
  }
  # E-02: so a selecao usa o prompt - o formulario fica interno ao arquivo.
  $assignMatch = [regex]::Match($dialogModule, 'Object\.assign\(window,\s*\{([\s\S]*?)\}\);')
  if (-not $assignMatch.Success) { throw 'Could not locate Object.assign(window, {...}) in pack-rename-dialog.jsx.' }
  $exposedNames = ($assignMatch.Groups[1].Value -split ',') | ForEach-Object { $_.Trim() } | Where-Object { $_ } | Sort-Object
  $expectedNames = @('PackRenameDialog', 'renameImpact', 'renameInstalledPackSlugs') | Sort-Object
  if (($exposedNames -join '|') -ne ($expectedNames -join '|')) {
    throw "pack-rename-dialog.jsx must expose exactly PackRenameDialog, renameInstalledPackSlugs and renameImpact on window (E-02); found: $($exposedNames -join ', ')"
  }
}

# ── Prova de execução real (Node) — pack-import.jsx inteiro (sem JSX) ──
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  Write-Warning 'node nao encontrado - prova de execucao das funcoes de slug pulada (assercoes estruturais ja rodaram).'
  Write-Output 'Slug-rename structural assertions passed (execution proof skipped: node not found).'
  return
}

$nodeScript = @'
const fs = require('fs');
const vm = require('vm');
const src = fs.readFileSync('pack-import.jsx', 'utf8');

let failures = 0;
function check(label, cond, detail) {
  if (!cond) { console.error('FAIL: ' + label + (detail ? ' - ' + detail : '')); failures++; }
}

function makeSandbox(stubs) {
  stubs = stubs || {};
  const win = Object.assign({
    DOMPurify: { sanitize: (v) => v },
    SPELL_VERSIONS: [],
    hifiSpellKey: undefined,
    adaptSpell: undefined,
  }, stubs.window || {});
  const sandbox = {
    console,
    fetch: stubs.fetch || (() => Promise.reject(new Error('fetch not stubbed'))),
    TextEncoder, TextDecoder,
    structuredClone: typeof structuredClone === 'function' ? structuredClone : undefined,
  };
  sandbox.window = win;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  return sandbox;
}

// ── detectSlugConflicts ──
{
  const { window: w } = makeSandbox();
  const owners = new Map([['fireball', [{ label: 'SRD 5.2 (EN)', name: 'Fireball' }]]]);
  const rows = w.packImport.detectSlugConflicts(
    [{ name: 'fireball', displayName: 'Bola' }, { name: 'meu-raio' }],
    owners
  );
  check('detectSlugConflicts finds exactly 1 conflicting row', rows.length === 1, 'got ' + rows.length);
  if (rows.length === 1) {
    check('detectSlugConflicts row has slug fireball', rows[0].slug === 'fireball');
    check('detectSlugConflicts row uses displayName as name', rows[0].name === 'Bola');
    check('detectSlugConflicts row carries existing owners', Array.isArray(rows[0].existing) && rows[0].existing.length === 1);
  }

  const rowsUpper = w.packImport.detectSlugConflicts([{ name: 'Fireball' }], owners);
  check('detectSlugConflicts is case-insensitive (A-10)', rowsUpper.length === 1);

  const rowsDup = w.packImport.detectSlugConflicts([{ name: 'fireball' }, { name: 'fireball' }], owners);
  check('detectSlugConflicts dedupes repeated targets into 1 row', rowsDup.length === 1);
}

// ── suggestSlug ──
{
  const { window: w } = makeSandbox();
  check("suggestSlug('fireball','meu-homebrew', new Set()) === 'fireball-meu-homebrew'",
    w.packImport.suggestSlug('fireball', 'meu-homebrew', new Set()) === 'fireball-meu-homebrew');
  check("suggestSlug('fireball','meu-homebrew', taken) === 'fireball-meu-homebrew-2'",
    w.packImport.suggestSlug('fireball', 'meu-homebrew', new Set(['fireball-meu-homebrew'])) === 'fireball-meu-homebrew-2');
  check("suggestSlug('Bola de Fogo','x', new Set()) === 'bola-de-fogo-x'",
    w.packImport.suggestSlug('Bola de Fogo', 'x', new Set()) === 'bola-de-fogo-x');
  const long = w.packImport.suggestSlug('a'.repeat(80), 'b'.repeat(80), new Set());
  check('suggestSlug always matches SLUG_PATTERN and is <= 64 chars', w.packImport.SLUG_PATTERN.test(long) && long.length <= 64);
}

// ── validateSlugRename ──
{
  const { window: w } = makeSandbox();
  const reserved = new Set(['fireball']);
  const taken = new Set(['meu-raio']);
  check("validateSlugRename('Fire Ball', ...) === 'format'", w.packImport.validateSlugRename('Fire Ball', reserved, taken) === 'format');
  check("validateSlugRename('fireball', ...) === 'reserved'", w.packImport.validateSlugRename('fireball', reserved, taken) === 'reserved');
  check("validateSlugRename('meu-raio', ...) === 'duplicate'", w.packImport.validateSlugRename('meu-raio', reserved, taken) === 'duplicate');
  check("validateSlugRename('livre-slug', ...) === null", w.packImport.validateSlugRename('livre-slug', reserved, taken) === null);
}

// ── applySlugRenames ──
{
  const { window: w } = makeSandbox();
  const original = [{ name: 'fireball' }];
  const renamed = w.packImport.applySlugRenames(original, new Map([['fireball', 'fireball-x']]));
  check('applySlugRenames renames the target spell', renamed[0].name === 'fireball-x');
  check('applySlugRenames copies the old name into displayName (A-11)', renamed[0].displayName === 'fireball');
  check('applySlugRenames does not mutate the original entry', original[0].name === 'fireball' && original[0].displayName === undefined);

  const withDisplay = w.packImport.applySlugRenames([{ name: 'raio', displayName: 'Raio Custom' }], new Map([['raio', 'raio-x']]));
  check('applySlugRenames keeps an existing displayName', withDisplay[0].displayName === 'Raio Custom');
}

// ── funil: _install via installFromFile — auto-renomeacao (E-01) ──
async function runFunnel() {
  const RESERVED_DEFAULT = ['fireball'];
  function makeInstallSandbox(opts) {
    opts = opts || {};
    const putCalls = [];
    const pluginStore = {
      listPacks: async () => opts.packs || [],
      putPack: async (record) => { putCalls.push(record); },
    };
    const reservedJson = {
      packs: [{ source: 'srd-2024-en', name: 'SRD 5.2 (EN)' }],
      slugs: (opts.reserved || RESERVED_DEFAULT).map((slug) => ({ slug, in: [{ source: 'srd-2024-en', name: slug }] })),
    };
    const fetchStub = opts.fetch || (() => Promise.resolve({ ok: true, json: async () => reservedJson }));
    const win = { SPELL_VERSIONS: opts.versions || [], pluginStore };
    if (opts.loadSpellVersion) win.loadSpellVersion = opts.loadSpellVersion;
    const { window: w } = makeSandbox({ fetch: fetchStub, window: win });
    return { w, putCalls };
  }

  function fixturePack(names) {
    names = Array.isArray(names) ? names : [names];
    return JSON.stringify({
      meta: { source: 'meu-homebrew', name: 'Meu Pacote', version: '1.0.0', author: 'Autor', lang: 'ptbr', license: { id: 'CC-BY-4.0', attribution: 'Atribuição.' } },
      spells: names.map((n) => ({ name: n, level: 1, school: 'evocation', description: 'ok' })),
    });
  }
  const file = (names) => ({ size: 10, text: async () => fixturePack(names) });
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  // 1. colisao com reservado: renomeia com o sufixo do pack, sem prompt, 1 gravacao.
  {
    const { w, putCalls } = makeInstallSandbox();
    const res = await w.packImport.installFromFile(file('fireball'));
    check('funil: colisao grava exatamente 1 vez', putCalls.length === 1, 'got ' + putCalls.length);
    check('funil: slug renomeado para fireball-meu-homebrew', putCalls.length === 1 && putCalls[0].spells[0].name === 'fireball-meu-homebrew');
    check('funil: displayName guarda o nome antigo', putCalls.length === 1 && putCalls[0].spells[0].displayName === 'fireball');
    check('funil: renamed lista a renomeacao', same(res.renamed, [{ from: 'fireball', to: 'fireball-meu-homebrew' }]), JSON.stringify(res.renamed));
    check('funil: resultado mantem identifier/spellCount', res.identifier === 'meu-homebrew' && res.spellCount === 1);
  }

  // 2. sem colisao: renamed vazio, nome intacto, 1 gravacao.
  {
    const { w, putCalls } = makeInstallSandbox();
    const res = await w.packImport.installFromFile(file('raio-livre'));
    check('funil: sem colisao renamed === []', Array.isArray(res.renamed) && res.renamed.length === 0);
    check('funil: sem colisao grava 1 vez e nome intacto', putCalls.length === 1 && putCalls[0].spells[0].name === 'raio-livre');
  }

  // 3. o proprio pack ocupa o sufixo: fireball -> -2, a outra fica.
  {
    const { w, putCalls } = makeInstallSandbox();
    const res = await w.packImport.installFromFile(file(['fireball', 'fireball-meu-homebrew']));
    const names = putCalls[0].spells.map((s) => s.name);
    check('funil: slug do proprio pack ocupado vira -2', same(names, ['fireball-meu-homebrew-2', 'fireball-meu-homebrew']), JSON.stringify(names));
    check('funil: renamed aponta para -2', same(res.renamed, [{ from: 'fireball', to: 'fireball-meu-homebrew-2' }]));
  }

  // 4. maiuscula: igualdade em minusculas, displayName preserva o original.
  {
    const { w, putCalls } = makeInstallSandbox();
    const res = await w.packImport.installFromFile(file('Fireball'));
    check('funil: Fireball colide com o reservado fireball', putCalls[0].spells[0].name === 'fireball-meu-homebrew');
    check("funil: displayName === 'Fireball'", putCalls[0].spells[0].displayName === 'Fireball');
    check('funil: renamed.from guarda o nome original', res.renamed[0].from === 'Fireball');
  }

  // 5. identificador FINAL do pack (freeIdentifier) entra no sufixo.
  {
    const { w } = makeInstallSandbox({ packs: [{ source: 'meu-homebrew' }] });
    const res = await w.packImport.installFromFile(file('fireball'));
    check('funil: identifier final meu-homebrew-2', res.identifier === 'meu-homebrew-2');
    check('funil: sufixo usa o identificador final', res.renamed[0] && res.renamed[0].to === 'fireball-meu-homebrew-2', JSON.stringify(res.renamed));
  }

  // 6. colisao com pack ja instalado (nunca e tocado).
  {
    const { w, putCalls } = makeInstallSandbox({
      versions: [{ key: 'plugin-outro', source: 'idb', labelEn: 'Outro' }],
      loadSpellVersion: async (key) => (key === 'plugin-outro' ? [{ en: 'meu-raio', displayName: 'Meu Raio' }] : []),
    });
    const res = await w.packImport.installFromFile(file('meu-raio'));
    check('funil: colisao com instalado renomeia o que entra', res.renamed[0] && res.renamed[0].to === 'meu-raio-meu-homebrew', JSON.stringify(res.renamed));
    check('funil: so o pack que entra e gravado', putCalls.length === 1 && putCalls[0].id === 'meu-homebrew');
  }

  // 7. 5 colisoes: 5 slugs distintos, todos SLUG_PATTERN <= 64 (mesmo com maiuscula).
  {
    const reserved = ['fireball', 'magic-missile', 'bola-de-fogo', 'raio', 'cura'];
    const { w, putCalls } = makeInstallSandbox({ reserved });
    const res = await w.packImport.installFromFile(file(['Fireball', 'MAGIC-missile', 'bola-de-fogo', 'raio', 'cura']));
    const tos = res.renamed.map((r) => r.to);
    check('funil: 5 colisoes geram 5 renamed', res.renamed.length === 5, 'got ' + res.renamed.length);
    check('funil: 5 slugs distintos', new Set(tos).size === 5, JSON.stringify(tos));
    check('funil: todo slug gerado casa SLUG_PATTERN e <= 64', tos.every((t) => w.packImport.SLUG_PATTERN.test(t) && t.length <= 64), JSON.stringify(tos));
    check('funil: 1 gravacao', putCalls.length === 1);
  }

  // 8. nome com espaco no original vira slug valido.
  {
    const { w } = makeInstallSandbox({ reserved: ['bola de fogo'] });
    const res = await w.packImport.installFromFile(file('Bola de Fogo'));
    check('funil: nome com espaco gera slug valido', res.renamed.length === 1 && w.packImport.SLUG_PATTERN.test(res.renamed[0].to), JSON.stringify(res.renamed));
  }

  // 9. falha fechada: sem srd-reserved-slugs.json nao grava.
  {
    const { w, putCalls } = makeInstallSandbox({ fetch: () => Promise.reject(new Error('offline')) });
    let rejected = false;
    try { await w.packImport.installFromFile(file('fireball')); } catch (err) { rejected = true; }
    check('funil: sem lista de reservados rejeita', rejected === true);
    check('funil: sem lista de reservados nao grava', putCalls.length === 0);
  }
}

runFunnel().then(() => {
  if (failures > 0) {
    console.error(failures + ' verificacao(oes) de identidade por slug falharam.');
    process.exit(1);
  }
  console.log('Slug identity: detectSlugConflicts/suggestSlug/validateSlugRename/applySlugRenames provados puros; funil _install renomeia sozinho o slug em colisao (reservado/instalado/proprio pack), devolve renamed, grava uma vez e falha fechada sem a lista de reservados.');
}).catch((err) => {
  console.error('runFunnel threw: ' + (err && err.stack || err));
  process.exit(1);
});
'@

$tmp = Join-Path ([System.IO.Path]::GetTempPath()) "check-slug-rename-$([guid]::NewGuid()).cjs"
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
    throw "Slug-rename runtime proof failed: $nodeOut"
  }
  Write-Output $nodeOut
} finally {
  if (Test-Path -LiteralPath $tmp) { Remove-Item -LiteralPath $tmp -Force }
}

# ── Prova de execução real (Node) — renameImpact()/renameInstalledPackSlugs()
# extraídas por regex de pack-rename-dialog.jsx (que TEM JSX e não roda inteiro
# num vm puro) e avaliadas contra as funções de leitura REAIS de
# v11-character-editor.jsx, com localStorage instrumentado — mesmo molde de
# scripts/check-bookmarks-read-purity.tests.ps1. ──

if (Test-Path -LiteralPath $dialogModulePath) {
  $nodeScript2 = @'
const fs = require('fs');

const dialogSrc = fs.readFileSync('pack-rename-dialog.jsx', 'utf8');
const editorSrc = fs.readFileSync('v11-character-editor.jsx', 'utf8');
const packImportSrc = fs.readFileSync('pack-import.jsx', 'utf8');

let failures = 0;
function check(label, cond, detail) {
  if (!cond) { console.error('FAIL: ' + label + (detail ? ' - ' + detail : '')); failures++; }
}

const renameImpactMatch = dialogSrc.match(/function renameImpact\(oldKeys, stillResolves\)[\s\S]*?\r?\n\}/);
const renameInstalledMatch = dialogSrc.match(/async function renameInstalledPackSlugs\(packId, renames\)[\s\S]*?\r?\n\}/);
if (!renameImpactMatch) { console.error('nao achei function renameImpact(oldKeys, stillResolves) em pack-rename-dialog.jsx'); process.exit(1); }
if (!renameInstalledMatch) { console.error('nao achei async function renameInstalledPackSlugs(packId, renames) em pack-rename-dialog.jsx'); process.exit(1); }

const peekCharsMatch = editorSrc.match(/function peekCharacters\(\)[\s\S]*?\n\}/);
const peekBookmarksMatch = editorSrc.match(/function peekBookmarks\(\)[\s\S]*?\n\}/);
const charsKeyMatch = editorSrc.match(/const HIFI_CHARS_KEY = ('[^']+');/);
const bookmarksKeyMatch = editorSrc.match(/const HIFI_BOOKMARKS_KEY = ('[^']+');/);
if (!peekCharsMatch || !peekBookmarksMatch || !charsKeyMatch || !bookmarksKeyMatch) {
  console.error('nao achei peekCharacters()/peekBookmarks()/HIFI_CHARS_KEY/HIFI_BOOKMARKS_KEY em v11-character-editor.jsx');
  process.exit(1);
}
const HIFI_CHARS_KEY = eval(charsKeyMatch[1]);
const HIFI_BOOKMARKS_KEY = eval(bookmarksKeyMatch[1]);

const applySlugRenamesMatch = packImportSrc.match(/function applySlugRenames\(spells, renames\)[\s\S]*?\n\}/);
if (!applySlugRenamesMatch) { console.error('nao achei function applySlugRenames(spells, renames) em pack-import.jsx'); process.exit(1); }

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

// ── renameImpact: 2 personagens preparando a chave antiga + 1 favorita igual -> 3 ──
{
  const chars = [
    { id: 1, prepared: ['4-3-fireball', 'other-key'] },
    { id: 2, prepared: ['4-3-fireball'] },
    { id: 3, prepared: ['unrelated'] },
  ];
  global.localStorage = makeFakeStorage({
    [HIFI_CHARS_KEY]: JSON.stringify(chars),
    [HIFI_BOOKMARKS_KEY]: JSON.stringify(['4-3-fireball']),
  });
  global.window = {};
  eval(peekCharsMatch[0]);
  eval(peekBookmarksMatch[0]);
  window.peekCharacters = peekCharacters;
  window.peekBookmarks = peekBookmarks;
  eval(renameImpactMatch[0]);

  const oldKeys = new Set(['4-3-fireball']);
  const impact = renameImpact(oldKeys, () => false);
  check('renameImpact conta 2 preparadas + 1 favorita = 3', impact === 3, 'got ' + impact);
  check('renameImpact (stillResolves sempre true) = 0', renameImpact(oldKeys, () => true) === 0);
  check('renameImpact nunca escreve (setItem/removeItem)', global.localStorage._calls.setItem === 0 && global.localStorage._calls.removeItem === 0);

  let dispatchCalls = 0;
  global.window.dispatchEvent = () => { dispatchCalls++; };
  renameImpact(oldKeys, () => false);
  check('renameImpact nunca despacha evento', dispatchCalls === 0);
}

// ── renameInstalledPackSlugs: getPack -> putPack 1x com spell renomeado, displayName preservado -> invalidateSpellVersion -> refreshPluginVersions ──
async function runRenameInstalled() {
  eval(applySlugRenamesMatch[0]);
  global.window = { packImport: { applySlugRenames } };
  eval(renameInstalledMatch[0]);

  {
    const putCalls = [];
    const invalidateCalls = [];
    let refreshCalled = false;
    window.pluginStore = {
      getPack: async (id) => (id === 'x' ? { id: 'x', meta: { source: 'x' }, spells: [{ name: 'fireball' }] } : null),
      putPack: async (record) => { putCalls.push(record); },
    };
    window.invalidateSpellVersion = (key) => { invalidateCalls.push(key); };
    window.refreshPluginVersions = async () => { refreshCalled = true; };

    await renameInstalledPackSlugs('x', new Map([['fireball', 'fireball-x']]));
    check('renameInstalledPackSlugs grava exatamente 1 vez', putCalls.length === 1, 'got ' + putCalls.length);
    check('renameInstalledPackSlugs renomeia o spell', putCalls.length === 1 && putCalls[0].spells[0].name === 'fireball-x');
    check('renameInstalledPackSlugs preserva displayName (A-11: vira o nome antigo)', putCalls.length === 1 && putCalls[0].spells[0].displayName === 'fireball');
    check('renameInstalledPackSlugs invalida plugin-x', invalidateCalls.length === 1 && invalidateCalls[0] === 'plugin-x');
    check('renameInstalledPackSlugs chama refreshPluginVersions', refreshCalled === true);
  }

  {
    let putCalled = false;
    window.pluginStore = {
      getPack: async () => null,
      putPack: async () => { putCalled = true; },
    };
    let threw = false;
    try {
      await renameInstalledPackSlugs('nao-existe', new Map());
    } catch (e) { threw = true; }
    check('renameInstalledPackSlugs rejeita quando getPack devolve null', threw === true);
    check('renameInstalledPackSlugs nao grava quando o pack nao existe', putCalled === false);
  }
}

runRenameInstalled().then(() => {
  if (failures > 0) {
    console.error(failures + ' verificacao(oes) de renameImpact/renameInstalledPackSlugs falharam.');
    process.exit(1);
  }
  console.log('renameImpact()/renameInstalledPackSlugs(): impacto contado por leitura pura (0 escritas/eventos), regravacao do pack instalado com 1 putPack + invalidacao + refresh, rejeita sem gravar quando o pack nao existe.');
}).catch((err) => {
  console.error('runRenameInstalled threw: ' + (err && err.stack || err));
  process.exit(1);
});
'@

  $tmp2 = Join-Path ([System.IO.Path]::GetTempPath()) "check-slug-rename-dialog-$([guid]::NewGuid()).cjs"
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
      throw "Rename-dialog runtime proof failed: $nodeOut2"
    }
    Write-Output $nodeOut2
  } finally {
    if (Test-Path -LiteralPath $tmp2) { Remove-Item -LiteralPath $tmp2 -Force }
  }
}

Write-Output 'Slug identity (D-08..D-14) gate passed.'
