$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$packImportPath = Join-Path $repoRoot 'pack-import.jsx'
$schemaPath = Join-Path $repoRoot 'pack.schema.json'

$packImport = Get-Content -Raw -LiteralPath $packImportPath
$schema = Get-Content -Raw -LiteralPath $schemaPath | ConvertFrom-Json

# ── Presença estrutural ──

foreach ($needle in @(
  'function parsePackText',
  'function validatePack',
  'function freeIdentifier',
  'function _fail',
  'function _checkField',
  'function _checkObject',
  'MAX_PACK_BYTES',
  'BLOCKED_KEYS',
  'PACK_ERROR_CODES',
  'packImport.validate: '
)) {
  if ($packImport -notlike "*$needle*") {
    throw "Missing pack-import.jsx implementation detail: $needle"
  }
}

# ── Uma só chamada de parse, com reviver ──

$parseCalls = [regex]::Matches($packImport, 'JSON\.parse\(')
if ($parseCalls.Count -ne 1) {
  throw "Expected exactly 1 JSON.parse( call in pack-import.jsx, found $($parseCalls.Count)."
}
if ($packImport -notmatch 'JSON\.parse\(\s*\w+\s*,') {
  throw 'JSON.parse call must pass a reviver (D-13 requires blocking __proto__/constructor/prototype during parse, not in a later scan).'
}

# ── Ordem validar-antes-de-gravar ──
# putPack ainda não existe em pack-import.jsx neste plano (03-05 acrescenta) -
# este bloco só assere quando há o que asserir, e vira gate permanente a
# partir de então.

if ($packImport -like '*pluginStore.putPack*') {
  $validateIdx = $packImport.IndexOf('validatePack')
  $putPackIdx = $packImport.IndexOf('pluginStore.putPack')
  if ($validateIdx -lt 0 -or $putPackIdx -lt 0 -or -not ($validateIdx -lt $putPackIdx)) {
    throw 'validatePack must appear before pluginStore.putPack - nothing may be written before validation completes.'
  }
}

# ── Paridade com o schema: schema -> validador ──

$metaFieldNames = $schema.properties.meta.properties.PSObject.Properties.Name
foreach ($field in $metaFieldNames) {
  if ($packImport -notlike "*$field*") {
    throw "pack-import.jsx is missing schema meta field: $field"
  }
}

$licenseFieldNames = $schema.properties.meta.properties.license.properties.PSObject.Properties.Name
foreach ($field in $licenseFieldNames) {
  if ($packImport -notlike "*$field*") {
    throw "pack-import.jsx is missing schema license field: $field"
  }
}

$spellFieldNames = $schema.properties.spells.items.properties.PSObject.Properties.Name
foreach ($field in $spellFieldNames) {
  if ($packImport -notlike "*$field*") {
    throw "pack-import.jsx is missing schema spell field: $field"
  }
}

# ── Paridade inversa: validador -> schema ──

function Get-TableBlock([string]$src, [string]$tableName) {
  $m = [regex]::Match($src, "const $tableName = \[[\s\S]*?\n\];")
  if (-not $m.Success) {
    throw "Could not locate table block: $tableName"
  }
  return $m.Value
}

$metaBlock = Get-TableBlock $packImport 'META_FIELDS'
$licenseBlock = Get-TableBlock $packImport 'LICENSE_FIELDS'
$spellBlock = Get-TableBlock $packImport 'SPELL_FIELDS'

$metaKeys = [regex]::Matches($metaBlock, "key:\s*'([^']+)'") | ForEach-Object { $_.Groups[1].Value }
foreach ($key in $metaKeys) {
  if ($metaFieldNames -notcontains $key) {
    throw "pack-import.jsx META_FIELDS has extra field not in pack.schema.json meta: $key"
  }
}

$licenseKeys = [regex]::Matches($licenseBlock, "key:\s*'([^']+)'") | ForEach-Object { $_.Groups[1].Value }
foreach ($key in $licenseKeys) {
  if ($licenseFieldNames -notcontains $key) {
    throw "pack-import.jsx LICENSE_FIELDS has extra field not in pack.schema.json meta.license: $key"
  }
}

$spellKeys = [regex]::Matches($spellBlock, "key:\s*'([^']+)'") | ForEach-Object { $_.Groups[1].Value }
foreach ($key in $spellKeys) {
  if ($spellFieldNames -notcontains $key) {
    throw "pack-import.jsx SPELL_FIELDS has extra field not in pack.schema.json spells[]: $key"
  }
}

# ── Teto de tamanho: código e schema publicado precisam concordar ──

if ($packImport -notlike '*10 * 1024 * 1024*') {
  throw 'pack-import.jsx is missing the 10 * 1024 * 1024 byte cap literal.'
}
if ($schemaPath -and (Get-Content -Raw -LiteralPath $schemaPath) -notlike '*10485760*') {
  throw 'pack.schema.json is missing the 10485760 byte cap literal - code and published docs would diverge.'
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
foreach ($fn in @('parsePackText', 'validatePack', 'freeIdentifier', 'MAX_PACK_BYTES', 'PACK_ERROR_CODES')) {
  if ($exposedBlock -notlike "*$fn*") {
    throw "window.packImport block is missing exposed member: $fn"
  }
}

Write-Output 'Pack validator matches the published schema.'
