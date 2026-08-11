$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$packImportPath = Join-Path $repoRoot 'pack-import.jsx'
$packImport = Get-Content -Raw -LiteralPath $packImportPath

# ── Presença estrutural ──

foreach ($needle in @(
  'function sanitizePack',
  'function _install',
  'function installFromFile',
  'function installFromUrl',
  'function _readFileText',
  'function _fetchText',
  'ALLOWED_TAGS',
  'DOMPurify.sanitize',
  'ALLOWED_ATTR',
  'pluginStore.listPacks',
  'pluginStore.putPack',
  'freeIdentifier',
  'Content-Length',
  'getReader',
  'reader.cancel()'
)) {
  if ($packImport -notlike "*$needle*") {
    throw "Missing pack-import.jsx implementation detail: $needle"
  }
}

# ── Ordem do funil — o coração deste script ──
# gravar antes de validar ou de sanitizar é exatamente a falha que
# PKG-04/PKG-05 existem para impedir.

$installMatch = [regex]::Match($packImport, 'async function _install\(text\)\s*\{[\s\S]*?\r?\n\}\r?\n')
if (-not $installMatch.Success) {
  throw 'Could not locate the _install function block.'
}
$installBlock = $installMatch.Value

function Assert-FunnelOrder([string]$block, [int]$idxA, [string]$nameA, [int]$idxB, [string]$nameB) {
  if ($idxA -lt 0 -or $idxB -lt 0 -or -not ($idxA -lt $idxB)) {
    throw "Funnel order violation inside _install: $nameA must appear before $nameB - writing before validating/sanitizing is exactly the failure PKG-04/PKG-05 exist to prevent."
  }
}

$idxParse = $installBlock.IndexOf('parsePackText(')
$idxValidate = $installBlock.IndexOf('validatePack(')
$idxSanitize = $installBlock.IndexOf('sanitizePack(')
$idxFree = $installBlock.IndexOf('freeIdentifier(')
$idxPut = $installBlock.IndexOf('putPack(')

Assert-FunnelOrder $installBlock $idxParse 'parsePackText' $idxValidate 'validatePack'
Assert-FunnelOrder $installBlock $idxValidate 'validatePack' $idxSanitize 'sanitizePack'
Assert-FunnelOrder $installBlock $idxSanitize 'sanitizePack' $idxFree 'freeIdentifier'
Assert-FunnelOrder $installBlock $idxFree 'freeIdentifier' $idxPut 'putPack'

# ── Gravação única ──
# Conta chamadas reais a pluginStore.putPack( (não menções em comentário -
# freeIdentifier já tem uma nota ponytail citando "putPack()" em prosa, que
# não é uma chamada).

$putPackMatches = [regex]::Matches($packImport, 'pluginStore\.putPack\(')
if ($putPackMatches.Count -ne 1) {
  throw "Expected exactly 1 pluginStore.putPack( call in pack-import.jsx, found $($putPackMatches.Count) - the funnel must write exactly once."
}

# ── Sem contorno de CORS ──
# A única URL que este módulo toca é a que o usuário informou; rotear por
# proxy de terceiro é proibido.

$urlMatches = [regex]::Matches($packImport, 'https?://[^\s''"]+')
if ($urlMatches.Count -gt 0) {
  $found = ($urlMatches | ForEach-Object { $_.Value }) -join ', '
  throw "pack-import.jsx contains a literal absolute URL ($found) - the only URL this module touches is the one the user provided; routing through a third-party CORS-bypass proxy is prohibited."
}

# ── Falha fechada sem sanitizador ──

$noDomPurifyIdx = $packImport.IndexOf('!window.DOMPurify')
$domPurifySanitizeIdx = $packImport.IndexOf('DOMPurify.sanitize')
if ($noDomPurifyIdx -lt 0 -or $domPurifySanitizeIdx -lt 0 -or -not ($noDomPurifyIdx -lt $domPurifySanitizeIdx)) {
  throw 'sanitizePack must check for the absence of window.DOMPurify before ever calling DOMPurify.sanitize - fail closed, never sanitize with a missing sanitizer.'
}

# ── Teto nos dois caminhos ──
# Arquivo local, Content-Length e contagem incremental precisam citar
# MAX_PACK_BYTES.

$maxBytesMatches = [regex]::Matches($packImport, 'MAX_PACK_BYTES')
if ($maxBytesMatches.Count -lt 3) {
  throw "Expected MAX_PACK_BYTES to appear at least 3 times (file size, Content-Length, incremental byte count), found $($maxBytesMatches.Count)."
}

# ── Sem catch vazio ──

if ($packImport -match 'catch\s*\([^)]*\)\s*\{\s*\}') {
  throw 'pack-import.jsx has an empty catch block - errors must always carry a .code.'
}

# ── Bloco de exposição ──

$exposedMatch = [regex]::Match($packImport, 'window\.packImport\s*=\s*\{[\s\S]*?\};')
if (-not $exposedMatch.Success) {
  throw 'Could not locate the window.packImport assignment block.'
}
$exposedBlock = $exposedMatch.Value
foreach ($fn in @('MAX_PACK_BYTES', 'PACK_ERROR_CODES', 'parsePackText', 'validatePack', 'freeIdentifier', 'sanitizePack', 'installFromFile', 'installFromUrl')) {
  if ($exposedBlock -notlike "*$fn*") {
    throw "window.packImport block is missing exposed member: $fn"
  }
}

# ── Parse único preservado ──
# A sanitização usa clone estruturado, não um segundo parse.

$jsonParseMatches = [regex]::Matches($packImport, 'JSON\.parse\(')
if ($jsonParseMatches.Count -ne 1) {
  throw "Expected exactly 1 JSON.parse( call in pack-import.jsx, found $($jsonParseMatches.Count)."
}

Write-Output 'Import funnel reads, validates, sanitizes, then writes once.'
