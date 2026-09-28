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
  "SLUG_CONFLICT: 'slug-conflict'",
  "CANCELLED: 'cancelled'"
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

  # ── index.html: pack-rename-dialog.jsx entre v11-character-editor.jsx e pack-import-dialog.jsx ──
  $indexPath = Join-Path $repoRoot 'index.html'
  $indexHtml = Get-Content -Raw -LiteralPath $indexPath
  $idxEditor = $indexHtml.IndexOf('src="v11-character-editor.jsx"')
  $idxRename = $indexHtml.IndexOf('src="pack-rename-dialog.jsx"')
  $idxImportDialog = $indexHtml.IndexOf('src="pack-import-dialog.jsx"')
  if ($idxEditor -lt 0 -or $idxRename -lt 0 -or $idxImportDialog -lt 0 -or -not ($idxEditor -lt $idxRename -and $idxRename -lt $idxImportDialog)) {
    throw 'index.html must load pack-rename-dialog.jsx after v11-character-editor.jsx and before pack-import-dialog.jsx (uses window.useDialogA11y/peek*; PackImportDialog wires PackRenameForm).'
  }
}

# ── Task 3: pack-import-dialog.jsx integrado ao prompt ──

$importDialogPath = Join-Path $repoRoot 'pack-import-dialog.jsx'
$importDialog = Get-Content -Raw -LiteralPath $importDialogPath
if ($importDialog -match 'onConflicts') {
  foreach ($needle in @('onConflicts', 'window.PackRenameForm', "'cancelled'", 'window.renameImpact', 'setConflictCtx(null)')) {
    if ($importDialog -notlike "*$needle*") {
      throw "Missing pack-import-dialog.jsx rename-conflict wiring detail: $needle"
    }
  }
  if ($importDialog -notmatch 'installFromFile\([^)]*,\s*\{\s*onConflicts') {
    throw 'pack-import-dialog.jsx must pass { onConflicts } to window.packImport.installFromFile.'
  }
  if ($importDialog -notmatch 'installFromUrl\([^)]*,\s*\{\s*onConflicts') {
    throw 'pack-import-dialog.jsx must pass { onConflicts } to window.packImport.installFromUrl.'
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

// ── funil: _install via installFromFile stub-free (usa _fail interno) ──
async function runFunnel() {
  function makeInstallSandbox() {
    const putCalls = [];
    const pluginStore = {
      listPacks: async () => [],
      putPack: async (record) => { putCalls.push(record); },
    };
    const reservedJson = { packs: [{ source: 'srd-2024-en', name: 'SRD 5.2 (EN)' }], slugs: [{ slug: 'fireball', in: [{ source: 'srd-2024-en', name: 'Fireball' }] }] };
    const fetchStub = () => Promise.resolve({ ok: true, json: async () => reservedJson });
    const { window: w } = makeSandbox({
      fetch: fetchStub,
      window: { SPELL_VERSIONS: [], pluginStore },
    });
    return { w, putCalls };
  }

  function fixturePack(spellName) {
    return JSON.stringify({
      meta: { source: 'meu-homebrew', name: 'Meu Pacote', version: '1.0.0', author: 'Autor', lang: 'ptbr', license: { id: 'CC-BY-4.0', attribution: 'Atribuição.' } },
      spells: [{ name: spellName, level: 1, school: 'evocation', description: 'ok' }],
    });
  }

  // Colisão + onConflicts devolve null (cancela) -> rejeita 'cancelled', putPack 0 vezes.
  {
    const { w, putCalls } = makeInstallSandbox();
    let code = null;
    try {
      await w.packImport.installFromFile({ size: 10, text: async () => fixturePack('fireball') }, { onConflicts: async () => null });
    } catch (err) { code = err && err.code; }
    check('funil: onConflicts->null rejeita com cancelled', code === 'cancelled', 'got ' + code);
    check('funil: onConflicts->null nao grava', putCalls.length === 0);
  }

  // Colisão sem onConflicts -> rejeita 'slug-conflict', putPack 0 vezes.
  {
    const { w, putCalls } = makeInstallSandbox();
    let code = null;
    try {
      await w.packImport.installFromFile({ size: 10, text: async () => fixturePack('fireball') }, {});
    } catch (err) { code = err && err.code; }
    check('funil: sem onConflicts rejeita com slug-conflict', code === 'slug-conflict', 'got ' + code);
    check('funil: sem onConflicts nao grava', putCalls.length === 0);
  }

  // Colisão + onConflicts devolve Map fireball->fireball-x -> grava 1 vez com name fireball-x.
  {
    const { w, putCalls } = makeInstallSandbox();
    let onConflictsArgs = null;
    const result = await w.packImport.installFromFile({ size: 10, text: async () => fixturePack('fireball') }, {
      onConflicts: async (ctx) => { onConflictsArgs = ctx; return new Map([['fireball', 'fireball-x']]); },
    });
    check('funil: onConflicts->Map grava exatamente 1 vez', putCalls.length === 1, 'got ' + putCalls.length);
    check('funil: pack gravado tem o spell renomeado', putCalls.length === 1 && putCalls[0].spells[0].name === 'fireball-x');
    check('funil: onConflicts recebe rows com packId === packSource', onConflictsArgs && onConflictsArgs.rows[0].packId === onConflictsArgs.packSource);
    check('funil: onConflicts recebe takenKeys contendo o slug do proprio pack', onConflictsArgs && onConflictsArgs.takenKeys.has('fireball'));
    check('funil: install devolve identifier', result && typeof result.identifier === 'string');
  }

  // Sem colisão: nunca chama onConflicts, grava 1 vez.
  {
    const { w, putCalls } = makeInstallSandbox();
    let onConflictsCalled = false;
    await w.packImport.installFromFile({ size: 10, text: async () => fixturePack('raio-livre') }, {
      onConflicts: async () => { onConflictsCalled = true; return null; },
    });
    check('funil: sem colisao nunca chama onConflicts', onConflictsCalled === false);
    check('funil: sem colisao grava exatamente 1 vez', putCalls.length === 1, 'got ' + putCalls.length);
  }
}

runFunnel().then(() => {
  if (failures > 0) {
    console.error(failures + ' verificacao(oes) de identidade por slug falharam.');
    process.exit(1);
  }
  console.log('Slug identity: detectSlugConflicts/suggestSlug/validateSlugRename/applySlugRenames provados puros; funil _install resolve colisao via onConflicts, falha fechada sem onConflicts, cancela sem gravar, grava uma vez com o slug renomeado.');
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

Write-Output 'Slug identity (D-08..D-14) gate passed.'
