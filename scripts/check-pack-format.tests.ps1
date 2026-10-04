$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$schemaPath = Join-Path $repoRoot 'pack.schema.json'
$docsPath = Join-Path $repoRoot 'pack-docs.html'

$schemaRaw = Get-Content -Raw -LiteralPath $schemaPath
$docs = Get-Content -Raw -LiteralPath $docsPath
$schema = $schemaRaw | ConvertFrom-Json

# ── Paridade schema -> docs: todo campo do schema precisa aparecer na página ──

$metaFieldNames = $schema.properties.meta.properties.PSObject.Properties.Name
foreach ($field in $metaFieldNames) {
  if ($field -eq 'license') { continue }
  if ($docs -notlike "*$field*") {
    throw "pack-docs.html is missing meta field: $field"
  }
}

$licenseFieldNames = $schema.properties.meta.properties.license.properties.PSObject.Properties.Name
foreach ($field in $licenseFieldNames) {
  $needle = "license.$field"
  if ($docs -notlike "*$needle*") {
    throw "pack-docs.html is missing license field: $needle"
  }
}

$spellFieldNames = $schema.properties.spells.items.properties.PSObject.Properties.Name
foreach ($field in $spellFieldNames) {
  if ($docs -notlike "*$field*") {
    throw "pack-docs.html is missing spell field: $field"
  }
}

# ── Paridade inversa: contagem de <tr> das tabelas precisa bater com o schema ──
# (não é verificável linha a linha de forma barata; contagem total detecta
# campo extra ou campo faltante em qualquer direção.)

$manifestFieldCount = ($metaFieldNames | Where-Object { $_ -ne 'license' }).Count + $licenseFieldNames.Count
$spellFieldCount = $spellFieldNames.Count

$tableMatches = [regex]::Matches($docs, '<table class="pd-table">[\s\S]*?</table>')
if ($tableMatches.Count -ne 2) {
  throw "Expected exactly 2 pd-table tables in pack-docs.html, found $($tableMatches.Count)."
}

$manifestTrCount = ([regex]::Matches($tableMatches[0].Value, '<tr>')).Count
$expectedManifestTr = $manifestFieldCount + 1
if ($manifestTrCount -ne $expectedManifestTr) {
  throw "Manifest table <tr> count mismatch: got $manifestTrCount, expected $expectedManifestTr (schema fields=$manifestFieldCount + 1 header row)."
}

$spellTrCount = ([regex]::Matches($tableMatches[1].Value, '<tr>')).Count
$expectedSpellTr = $spellFieldCount + 1
if ($spellTrCount -ne $expectedSpellTr) {
  throw "Spell table <tr> count mismatch: got $spellTrCount, expected $expectedSpellTr (schema fields=$spellFieldCount + 1 header row)."
}

# ── Contrato de conteúdo da página ──

foreach ($needle in @(
  'raw.githubusercontent.com',
  'gist.githubusercontent.com',
  'cdn.jsdelivr.net',
  '10485760',
  'pack.schema.json',
  'hifi-tokens.css',
  'spellbook-ui-prefs',
  'overflow-x: auto',
  'srd-reserved-slugs.json',
  'id="pd-reserved"',
  'no-referrer',
  'endereço IP',
  'IP address'
)) {
  if ($docs -notlike "*$needle*") {
    throw "pack-docs.html is missing required content: $needle"
  }
}

# ── D-15 (08-02): a pagina nunca usa innerHTML - o preenchimento do <ul id="pd-reserved">
# via fetch() so pode usar createElement + textContent (T-08-12).
if ($docs -match 'innerHTML') {
  throw 'pack-docs.html uses innerHTML - the reserved-slugs list must be built with createElement + textContent only (T-08-12).'
}

# ── Sem cor hardcoded (a página usa só custom properties do tema) ──

if ($docs -match '#[0-9a-fA-F]{3}\b' -or $docs -match '#[0-9a-fA-F]{6}\b') {
  throw 'pack-docs.html contains a hardcoded hex color literal - use only var(--...) theme custom properties.'
}

# ── Exemplo válido: o primeiro <pre> precisa ser um pacote de 1 magia válido ──

$preMatch = [regex]::Match($docs, '<pre>([\s\S]*?)</pre>')
if (-not $preMatch.Success) {
  throw 'Could not locate an example <pre> block in pack-docs.html.'
}
$exampleText = $preMatch.Groups[1].Value -replace '&lt;', '<' -replace '&gt;', '>' -replace '&quot;', '"' -replace '&amp;', '&'
$example = $exampleText | ConvertFrom-Json
if ($example.spells.Count -ne 1) {
  throw "Example pack must have exactly 1 spell, found $($example.spells.Count)."
}
if ([string]::IsNullOrEmpty($example.meta.license.attribution)) {
  throw 'Example pack meta.license.attribution must be a non-empty string.'
}

# ── Invariantes do schema ──

if ($schema.properties.spells.minItems -ne 1) {
  throw 'pack.schema.json: properties.spells.minItems must be 1.'
}
if ($schema.properties.meta.required -notcontains 'license') {
  throw 'pack.schema.json: properties.meta.required must contain license.'
}

Write-Output 'Pack schema and author docs are in parity.'
