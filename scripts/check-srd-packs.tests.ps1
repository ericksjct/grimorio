$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot

$editions = @(
  @{ file = 'srd-2014-en.json'; source = 'srd-2014-en' },
  @{ file = 'srd-2024-en.json'; source = 'srd-2024-en' }
)

$packs = @{}
foreach ($ed in $editions) {
  $p = Join-Path $repoRoot $ed.file
  $pack = Get-Content -Raw -LiteralPath $p | ConvertFrom-Json
  $packs[$ed.file] = $pack

  if (-not $pack.meta) { throw "$($ed.file): missing meta." }
  if (-not $pack.spells) { throw "$($ed.file): missing spells." }
  if ($pack.spells.Count -lt 1) { throw "$($ed.file): spells array is empty." }
  if ($pack.meta.source -ne $ed.source) { throw "$($ed.file): meta.source expected '$($ed.source)', got '$($pack.meta.source)'." }
  if ($pack.meta.lang -ne 'en') { throw "$($ed.file): meta.lang expected 'en', got '$($pack.meta.lang)'." }
  if ($pack.meta.spellCount -ne $pack.spells.Count) { throw "$($ed.file): meta.spellCount ($($pack.meta.spellCount)) does not match spells.Count ($($pack.spells.Count))." }
  if ([string]::IsNullOrWhiteSpace($pack.meta.license.id)) { throw "$($ed.file): meta.license.id is empty." }
  if ([string]::IsNullOrWhiteSpace($pack.meta.license.attribution)) { throw "$($ed.file): meta.license.attribution is empty." }
  if ([string]::IsNullOrWhiteSpace($pack.meta.license.modifications)) { throw "$($ed.file): meta.license.modifications is empty." }
}

# ── Atribuições distintas: 5.1 e 5.2 têm textos legais diferentes ──
$attr1 = $packs['srd-2014-en.json'].meta.license.attribution
$attr2 = $packs['srd-2024-en.json'].meta.license.attribution
if ($attr1 -eq $attr2) {
  throw "srd-2014-en.json and srd-2024-en.json have identical meta.license.attribution - SRD 5.1 and 5.2 carry different legal text, equality means extraction is wrong."
}

# ── Campos obrigatórios por magia + unicidade de name ──
foreach ($ed in $editions) {
  $pack = $packs[$ed.file]
  $seenNames = @{}
  for ($i = 0; $i -lt $pack.spells.Count; $i++) {
    $spell = $pack.spells[$i]
    if ([string]::IsNullOrWhiteSpace($spell.name)) { throw "$($ed.file): spell at index $i has an empty name." }
    if ([string]::IsNullOrWhiteSpace($spell.school)) { throw "$($ed.file): spell '$($spell.name)' (index $i) has an empty school." }
    if ([string]::IsNullOrWhiteSpace($spell.description)) { throw "$($ed.file): spell '$($spell.name)' (index $i) has an empty description." }
    if ($spell.level -lt 0 -or $spell.level -gt 9) { throw "$($ed.file): spell '$($spell.name)' (index $i) has level $($spell.level), expected 0-9." }
    if ($seenNames.ContainsKey($spell.name)) { throw "$($ed.file): duplicate spell name '$($spell.name)' - name must be a unique ID within the pack." }
    $seenNames[$spell.name] = $true
  }
}

# ── D-05: proveniência, não diff textual ──
#
# A prova original deste plano comparava o texto de description dos pacotes
# SRD contra os quatro spells-5E-*.json e exigia interseção zero. Essa prova
# provou ser um proxy ruim: ela dá falso-positivo em transcrições fiéis e
# independentes do MESMO texto oficial do SRD (achado real: 123 das 658
# descrições geradas são idênticas a uma entrada de spells-5E-*.json - ver
# .planning/phases/03-srd-pack-import-pipeline/03-SRD-SOURCE.md, seção
# "Achado do plano 03-04"), e passaria licenciosamente um arquivo
# genuinamente copiado após qualquer reformatação cosmética.
#
# A regra travada em 03-SRD-SOURCE.md é de PROVENIÊNCIA ("os pacotes SRD
# nascem de uma fonte separada... nunca dos JSONs atuais do app"), não de
# diferença de bytes. Este bloco verifica proveniência diretamente: o
# gerador nunca pode referenciar nenhum dos quatro spells-5E-*.json, por
# nome literal ou por qualquer padrão/glob que resolvesse para eles.
$genPath = Join-Path $repoRoot 'scripts\generate-srd-pack.mjs'
$gen = Get-Content -Raw -LiteralPath $genPath

# Matches a quoted string literal containing "spells-5E" (an actual code
# reference), not the header comment's prose mention of the D-05 rule.
$quotedSpells5E = '[''"`]spells-5E'
if ($gen -match $quotedSpells5E) {
  throw "generate-srd-pack.mjs has a string literal referencing 'spells-5E' - D-05 requires the SRD pack generator to never read the app's current spell JSONs, by literal filename or by glob."
}
foreach ($needle in @('readdir', 'readdirSync', 'glob(')) {
  if ($gen -like "*$needle*") {
    throw "generate-srd-pack.mjs uses '$needle' - a directory scan could indirectly resolve to spells-5E-*.json, defeating the D-05 provenance guarantee."
  }
}

Write-Output 'SRD packs validate and carry their own licence text.'
