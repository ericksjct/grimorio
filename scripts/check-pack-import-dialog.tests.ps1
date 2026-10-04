$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$dialogPath = Join-Path $repoRoot 'pack-import-dialog.jsx'
$i18nPath = Join-Path $repoRoot 'i18n.jsx'
$dialog = Get-Content -Raw -LiteralPath $dialogPath
$i18n = Get-Content -Raw -LiteralPath $i18nPath

# ── Estrutura do diálogo ──

foreach ($needle in @(
  'function PackImportDialog',
  'role="dialog"',
  'aria-modal="true"',
  'useDialogA11y',
  'type="file"',
  'hifi-input',
  'hifi-btn-primary',
  'hifi-btn-secondary',
  'hifi-mono',
  'hifi-section-label',
  'pack-docs.html',
  'hifi-toast',
  'overflowWrap',
  'textOverflow',
  'maxHeight',
  'disabled'
)) {
  if ($dialog -notlike "*$needle*") {
    throw "Missing pack-import-dialog.jsx implementation detail: $needle"
  }
}

# ── D-03: o gatilho fixo provisorio foi aposentado na Fase 5 - o import so e
# alcancavel de dentro do gerenciador (PackManagerRoot) e do estado vazio. Se
# este identificador reaparecer, o gatilho flutuante voltou.
if ($dialog -like '*PackImportRoot*') {
  throw 'pack-import-dialog.jsx references PackImportRoot - o gatilho fixo foi aposentado na Fase 5 (D-03); o import agora so e alcancado por dentro do gerenciador.'
}

# ── Contrato com o pipeline (planos 03-03/03-05) ──

foreach ($needle in @('packImport.installFromFile', 'packImport.installFromUrl')) {
  if ($dialog -notlike "*$needle*") {
    throw "Missing pipeline contract call in pack-import-dialog.jsx: $needle (nomes fixados pelos planos 03-03/03-05)"
  }
}

# ── Fase 8 (E-01): colisao de slug e resolvida pelo funil; o dialogo so mostra o aviso ──

foreach ($needle in @('function _renamedNotice(', 'RENAMED_NOTICE_CAP', "'import.renamed.'", "'import.renamedMore'", '.slice(0, 64)')) {
  if ($dialog -notlike "*$needle*") {
    throw "Missing renamed-notice detail in pack-import-dialog.jsx: $needle"
  }
}
$submitMatch = [regex]::Match($dialog, 'async function handleSubmit\(\)[\s\S]*?\r?\n  \}\r?\n')
if (-not $submitMatch.Success -or $submitMatch.Value -notlike '*_renamedNotice(*') {
  throw 'handleSubmit must call _renamedNotice( for the toast (E-01).'
}
foreach ($gone in @('conflictCtx', 'setConflictCtx', 'onConflicts', 'PackRenameForm', "'cancelled'", 'renameImpact', 'resolvableSpellKeys')) {
  if ($dialog -like "*$gone*") {
    throw "pack-import-dialog.jsx must not contain $gone after E-01 (import has no rename prompt)."
  }
}
foreach ($forbidden in @('localStorage', 'persistCharacters', 'persistBookmarks', 'hifi_bookmarks_v1', 'hifi_chars_v1')) {
  if ($dialog -like "*$forbidden*") {
    throw "pack-import-dialog.jsx must never touch character/bookmark storage - found $forbidden (D-13)."
  }
}

# ── Cobertura dos seis motivos de rejeicao (5 codigos de PACK_ERROR_CODES + unknown) ──

$packErrKeys = @(
  'packErr.malformedJson',
  'packErr.blockedKey',
  'packErr.tooLarge',
  'packErr.schemaInvalid',
  'packErr.fetchFailed',
  'packErr.unknown'
)
foreach ($key in $packErrKeys) {
  if ($dialog -notlike "*$key*") {
    throw "pack-import-dialog.jsx does not reference $key"
  }
  $count = ([regex]::Matches($i18n, [regex]::Escape("'$key'"))).Count
  if ($count -lt 2) {
    throw "i18n.jsx is missing $key in one of the ptbr/en blocks (found $count occurrence(s), need >= 2)"
  }
}

# ── Paridade i18n das chaves de fluxo (import.*) ──

$importKeys = @(
  'import.open', 'import.title', 'import.close', 'import.emptyHeading', 'import.emptyBody',
  'import.docsPrefix', 'import.docsLink', 'import.or', 'import.chooseFile',
  'import.urlLabel', 'import.urlPlaceholder', 'import.sizeHint', 'import.installPack',
  'import.installing', 'import.success', 'import.successCount', 'import.sanitizedNote',
  'import.renamed.one', 'import.renamed.other', 'import.renamedMore'
)
foreach ($key in $importKeys) {
  $count = ([regex]::Matches($i18n, [regex]::Escape("'$key'"))).Count
  if ($count -lt 2) {
    throw "i18n.jsx is missing $key in one of the ptbr/en blocks (found $count occurrence(s), need >= 2)"
  }
}

# ── Sem cor hardcoded — precisa renderizar corretamente nos 6 temas x claro/escuro ──

if ($dialog -match '#[0-9a-fA-F]{3}\b' -or $dialog -match '#[0-9a-fA-F]{6}\b') {
  throw 'pack-import-dialog.jsx has a hardcoded hex color - this breaks rendering across the 6 themes x light/dark, use var(--...) instead.'
}

# ── Sem string visivel fora do i18n ──
# Regex conservadora: casa nó de texto JSX ">algumas letras<" sem chaves,
# outras tags, quebra de linha nem pontuação de código (;()=) no meio - isso
# evita falso positivo em comparações JS (`a > 0` ... `b < 1`) fora de JSX,
# que também usam os caracteres > e <. Não pega TODOS os casos (ex.: texto
# dentro de um {' '} literal, ou concatenado com expressões), só o caso comum
# de texto puro esquecido direto entre tags.
$rawTextMatches = [regex]::Matches($dialog, '>([^<>{}\n;()=]*[A-Za-zÀ-ÿ]{2,}[^<>{}\n;()=]*)<')
$offenders = @()
foreach ($m in $rawTextMatches) {
  $text = $m.Groups[1].Value.Trim()
  if ($text.Length -gt 0) { $offenders += $text }
}
if ($offenders.Count -gt 0) {
  throw "pack-import-dialog.jsx has visible text outside tt(...): $($offenders -join ' | ')"
}

# ── Exclusividade de modo (arquivo OU url, sem botoes de alternar) ──

if ($dialog -match 'import.mode(File|Url)') {
  throw 'pack-import-dialog.jsx still has the file/URL toggle strings - both options are shown at once now.'
}
if ($dialog -notmatch 'setMode\(') {
  throw 'pack-import-dialog.jsx has no mode-state assignment (setMode) - file/URL mode exclusivity requires one.'
}

# ── WR-09: falha de armazenamento (quota) detectada FORA do enum de
# PACK_ERROR_CODES e mapeada pra sua propria mensagem, nao empilhada em
# packErr.unknown. QuotaExceededError acontece DEPOIS da validacao (na
# escrita do IndexedDB), entao nao tem como vir num dos 5 codigos do
# pipeline de import.
if ($dialog -notmatch 'QuotaExceededError') {
  throw "WR-09: packErrKeyFor() must detect a storage-quota failure (err.name === 'QuotaExceededError', or legacy code 22) and map it to packErr.quota - otherwise it collapses into packErr.unknown, which reads as a generic/unexplained failure to the user."
}
if ($dialog -notlike '*packErr.quota*') {
  throw 'WR-09: pack-import-dialog.jsx does not reference packErr.quota.'
}
$quotaCount = ([regex]::Matches($i18n, [regex]::Escape("'packErr.quota'"))).Count
if ($quotaCount -lt 2) {
  throw "i18n.jsx is missing packErr.quota in one of the ptbr/en blocks (found $quotaCount occurrence(s), need >= 2)"
}

# ── WR-04: o botão de submit deve desabilitar na tela de sucesso ───
# O botão do rodapé fica FORA do `result ? ... : ...` que decide o conteúdo -
# na tela de sucesso ele continua visível. WR-08 só reseta o formulário
# quando o diálogo REABRE, então clicar de novo na tela de sucesso reenvia
# o mesmo file/url e instala um pack duplicado (freeIdentifier dá um id novo).
if ($dialog -notmatch 'submitDisabled\s*=\s*busy\s*\|\|\s*!hasValue\s*\|\|\s*!!result') {
  throw "WR-04: submitDisabled must also be true when `result` is set (busy || !hasValue || !!result) - otherwise the install button stays live on the success screen and a second click installs a duplicate pack."
}

# ── IN-08: makeT()'s STRINGS lookup guarda contra chave de prototipo ──
# STRINGS continua um objeto literal comum (nao Object.create(null) — o
# dicionario e grande demais pra reescrever sem risco). O guard barato e no
# PONTO DE LEITURA: hasOwnProperty antes de indexar, tanto no dict do idioma
# quanto no fallback STRINGS.ptbr. Nao alcancavel hoje (todo call site de
# tt() usa chave literal/prefixada), mas e a unica tabela que uma chave
# dinamica futura cairia.
if ($i18n -notmatch "hasOwnProperty\.call\(dict,\s*key\)") {
  throw "IN-08: makeT()'s t(key) must guard the dict[key] read with Object.prototype.hasOwnProperty.call(dict, key) - STRINGS is a plain object literal, so an inherited key ('constructor', 'toString', ...) would otherwise return a function instead of undefined."
}
if ($i18n -notmatch "hasOwnProperty\.call\(STRINGS\.ptbr,\s*key\)") {
  throw "IN-08: makeT()'s t(key) must guard the STRINGS.ptbr[key] fallback read the same way as the primary dict read."
}

$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
  $nodeScript = @'
const fs = require('fs');
const src = fs.readFileSync('i18n.jsx', 'utf8');
const cut = src.indexOf('// Helper bilíngue');
if (cut < 0) { console.error('nao achei o corte pos-makeT/tt'); process.exit(1); }
const body = src.slice(0, cut);
const sandbox = { console };
sandbox.globalThis = sandbox;
const vm = require('vm');
vm.createContext(sandbox);
vm.runInContext(body + '\nthis.__makeT = makeT;', sandbox);
const t = sandbox.__makeT('ptbr');
const out = t('constructor');
if (typeof out !== 'string') {
  console.error('IN-08 FAIL: t("constructor") returned ' + typeof out + ' (' + out + '), expected the literal key string back (missing-key fallback)');
  process.exit(1);
}
console.log('IN-08 ok: makeT() dict lookup does not leak inherited prototype values.');
'@
  $tmp = Join-Path ([System.IO.Path]::GetTempPath()) "check-pack-import-dialog-$([guid]::NewGuid()).cjs"
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
      throw "IN-08 runtime proof failed: $nodeOut"
    }
  } finally {
    if (Test-Path -LiteralPath $tmp) { Remove-Item -LiteralPath $tmp -Force }
  }
} else {
  Write-Warning 'node nao encontrado - prova de execucao do IN-08 pulada (assercoes estruturais ja rodaram).'
}

# ── Prova de execucao do aviso de renomeacao (E-01): _renamedNotice extraida do
# arquivo real e rodada contra tt/i18nPlural reais de i18n.jsx.
if ($node) {
  $nodeScript2 = @'
const fs = require('fs');
const vm = require('vm');
const dialogSrc = fs.readFileSync('pack-import-dialog.jsx', 'utf8');
const i18nSrc = fs.readFileSync('i18n.jsx', 'utf8');

const capMatch = dialogSrc.match(/const RENAMED_NOTICE_CAP = \d+;/);
const fnMatch = dialogSrc.match(/function _renamedNotice\(lang, renamed\)[\s\S]*?\n\}/);
if (!capMatch || !fnMatch) { console.error('nao achei RENAMED_NOTICE_CAP/_renamedNotice em pack-import-dialog.jsx'); process.exit(1); }

const sandbox = { console };
sandbox.globalThis = sandbox;
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(i18nSrc, sandbox);
vm.runInContext(capMatch[0] + '\n' + fnMatch[0] + '\nthis.__notice = _renamedNotice;', sandbox);
const notice = sandbox.__notice;
const tt = sandbox.tt;

let failures = 0;
function check(label, cond, detail) {
  if (!cond) { console.error('FAIL: ' + label + (detail ? ' - ' + detail : '')); failures++; }
}

check('_renamedNotice([]) vazio', notice('ptbr', []) === '');
check('_renamedNotice(undefined) vazio', notice('ptbr', undefined) === '');

const one = notice('ptbr', [{ from: 'fireball', to: 'fireball-qa' }]);
check('1 item usa import.renamed.one', one === tt('ptbr', 'import.renamed.one', { n: 1, list: 'fireball → fireball-qa' }), one);

const five = Array.from({ length: 5 }, (_, i) => ({ from: 'a' + i, to: 'b' + i }));
const noticePt = notice('ptbr', five);
check('5 itens: exatamente 3 setas', noticePt.split(' → ').length - 1 === 3, noticePt);
check('5 itens (ptbr): termina com import.renamedMore n=2', noticePt.endsWith(tt('ptbr', 'import.renamedMore', { n: 2 })), noticePt);
check('5 itens (en): termina com "and 2 more"', notice('en', five).endsWith('and 2 more'), notice('en', five));
const list5 = 'a0 → b0, a1 → b1, a2 → b2 ' + tt('ptbr', 'import.renamedMore', { n: 2 });
check('5 itens usa import.renamed.other com n=5 e a lista cortada', noticePt === tt('ptbr', 'import.renamed.other', { n: 5, list: list5 }), noticePt);

const long = notice('ptbr', [{ from: 'x'.repeat(100), to: 'y' }]);
check('nome antigo cortado em 64', long.includes('x'.repeat(64)) && !long.includes('x'.repeat(65)), long);

if (failures > 0) { console.error(failures + ' verificacao(oes) do aviso falharam.'); process.exit(1); }
console.log('_renamedNotice: vazio/1/muitos, teto de 3 + "e mais N", corte em 64, PT/EN.');
'@
  $tmp2 = Join-Path ([System.IO.Path]::GetTempPath()) "check-pack-import-dialog-notice-$([guid]::NewGuid()).cjs"
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
      throw "Renamed-notice runtime proof failed: $nodeOut2"
    }
  } finally {
    if (Test-Path -LiteralPath $tmp2) { Remove-Item -LiteralPath $tmp2 -Force }
  }
}

# ── Sem catch vazio ──

if ($dialog -match 'catch\s*\([^)]*\)\s*\{\s*\}') {
  throw 'pack-import-dialog.jsx has an empty catch block - errors must always reach the UI.'
}

Write-Output 'Import dialog covers every rejection reason and speaks both languages.'
