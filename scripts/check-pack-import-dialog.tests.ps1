$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$dialogPath = Join-Path $repoRoot 'pack-import-dialog.jsx'
$i18nPath = Join-Path $repoRoot 'i18n.jsx'
$dialog = Get-Content -Raw -LiteralPath $dialogPath
$i18n = Get-Content -Raw -LiteralPath $i18nPath

# ── Estrutura do diálogo ──

foreach ($needle in @(
  'function PackImportDialog',
  'function PackImportRoot',
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

# ── Contrato com o pipeline (planos 03-03/03-05) ──

foreach ($needle in @('packImport.installFromFile', 'packImport.installFromUrl')) {
  if ($dialog -notlike "*$needle*") {
    throw "Missing pipeline contract call in pack-import-dialog.jsx: $needle (nomes fixados pelos planos 03-03/03-05)"
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
  'import.docsPrefix', 'import.docsLink', 'import.modeFile', 'import.modeUrl', 'import.chooseFile',
  'import.urlLabel', 'import.urlPlaceholder', 'import.sizeHint', 'import.installPack',
  'import.installing', 'import.success', 'import.successCount', 'import.sanitizedNote'
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

# ── Exclusividade de modo ──

if ($dialog -notlike '*import.modeFile*' -or $dialog -notlike '*import.modeUrl*') {
  throw 'pack-import-dialog.jsx is missing the file/URL mode toggle strings.'
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

# ── Sem catch vazio ──

if ($dialog -match 'catch\s*\([^)]*\)\s*\{\s*\}') {
  throw 'pack-import-dialog.jsx has an empty catch block - errors must always reach the UI.'
}

Write-Output 'Import dialog covers every rejection reason and speaks both languages.'
