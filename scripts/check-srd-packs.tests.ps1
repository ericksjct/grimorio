$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot

$editions = @(
  @{ file = 'packs/srd-2014-en.json'; source = 'srd-2014-en' },
  @{ file = 'packs/srd-2024-en.json'; source = 'srd-2024-en' }
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
$attr1 = $packs['packs/srd-2014-en.json'].meta.license.attribution
$attr2 = $packs['packs/srd-2024-en.json'].meta.license.attribution
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

# ── Cobertura de classe por magia (emenda a D-06, 2026-09-05) ─────────────
# O 5.1 traz a lista por classe num apêndice do PDF, fora da descrição; sem o
# join de applyClassLists() o pacote saía com 0 de 319 magias com `class` e o
# painel mostrava a seção CLASSES vazia. Classe faltando é erro silencioso que
# leva o usuário a preparar magia errada, então a cobertura é travada aqui.

$genSrc = Get-Content -Raw -LiteralPath (Join-Path $repoRoot 'scripts' 'generate-srd-pack.mjs')
if ($genSrc -notmatch 'function\s+applyClassLists') {
  throw 'generate-srd-pack.mjs lost applyClassLists() — the 5.1 pack would regenerate with no class data.'
}

foreach ($pack in @('packs/srd-2014-en.json', 'packs/srd-2024-en.json')) {
  $j = Get-Content -Raw -LiteralPath (Join-Path $repoRoot $pack) | ConvertFrom-Json
  $total = $j.spells.Count
  $sem = @($j.spells | Where-Object { -not $_.class -or $_.class.Count -eq 0 }).Count
  if ($sem -gt 0) {
    throw "$pack : $sem de $total magias sem `class` — regenere com scripts/generate-srd-pack.mjs."
  }
  Write-Output "  $pack : $total/$total magias com classe."
}

# Fatos conhecidos: um join que casa nomes errados passaria na contagem acima.
$p51 = Get-Content -Raw -LiteralPath (Join-Path $repoRoot 'packs/srd-2014-en.json') | ConvertFrom-Json
$esperado = @{
  'Fireball'        = @('Sorcerer', 'Wizard')
  'Cure Wounds'     = @('Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger')
  'Bless'           = @('Cleric', 'Paladin')
  'Vicious Mockery' = @('Bard')
}
foreach ($nome in $esperado.Keys) {
  $s = $p51.spells | Where-Object { $_.displayName -eq $nome }
  if (-not $s) { throw "srd-2014-en.json: magia de referência '$nome' não encontrada." }
  $got = ($s.class | Sort-Object) -join ','
  $want = ($esperado[$nome] | Sort-Object) -join ','
  if ($got -ne $want) {
    throw "srd-2014-en.json: '$nome' tem classes [$got], esperado [$want] — o join por nome saiu errado."
  }
}
Write-Output '  Classes conferidas contra fatos conhecidos do SRD 5.1.'

# ── srd-reserved-slugs.json (D-09, D-15, 08-02) ───────────────────────────
# O gerador ganha --reserved-only e buildReservedSlugs(); o JSON gerado é a
# fonte única lida tanto pelo app (rename-conflict, 08-04/08-05) quanto pelas
# docs (pack-docs.html).

if ($genSrc -notlike '*--reserved-only*') {
  throw "generate-srd-pack.mjs is missing the --reserved-only CLI flag (D-15, 08-02)."
}
if ($genSrc -notlike '*srd-reserved-slugs.json*') {
  throw "generate-srd-pack.mjs does not reference srd-reserved-slugs.json (D-15, 08-02)."
}
if ($genSrc -notmatch 'function\s+buildReservedSlugs') {
  throw "generate-srd-pack.mjs is missing export function buildReservedSlugs(packs) (D-15, 08-02)."
}

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  Write-Warning 'node nao encontrado - prova de execucao de srd-reserved-slugs.json pulada.'
} else {
  $nodeScript = @'
const fs = require('fs');

const FILES = ['packs/srd-2014-en.json', 'packs/srd-2024-en.json', 'packs/srd-2024-ptbr.json'];
const packs = FILES.map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));

let reserved;
try {
  reserved = JSON.parse(fs.readFileSync('srd-reserved-slugs.json', 'utf8'));
} catch (err) {
  console.error('nao consegui ler srd-reserved-slugs.json: ' + err.message);
  process.exit(1);
}

let failures = 0;
function check(label, cond, detail) {
  if (!cond) { console.error('FAIL: ' + label + (detail ? ' - ' + detail : '')); failures++; }
}

// packs: as 3 fontes na ordem de EDITIONS, com name = meta.name de cada pack.
check('packs tem 3 entradas', Array.isArray(reserved.packs) && reserved.packs.length === 3);
FILES.forEach((f, i) => {
  const p = packs[i];
  const entry = reserved.packs && reserved.packs[i];
  check(`packs[${i}].source == ${p.meta.source}`, entry && entry.source === p.meta.source);
  check(`packs[${i}].name == ${p.meta.name}`, entry && entry.name === p.meta.name);
});

// Cada spells[].name dos 3 packs aparece exatamente 1 vez em slugs[].slug;
// nenhum slug sobra; slugs ordenado por slug (comparacao de string simples).
const expectedSlugs = new Set();
packs.forEach((p) => p.spells.forEach((s) => expectedSlugs.add(s.name)));

const gotSlugs = (reserved.slugs || []).map((s) => s.slug);
check('slugs nao tem duplicata', new Set(gotSlugs).size === gotSlugs.length);
check('slugs cobre todos os spells[].name dos 3 packs (sem sobra, sem falta)',
  gotSlugs.length === expectedSlugs.size && gotSlugs.every((s) => expectedSlugs.has(s)));

const sorted = [...gotSlugs].sort();
check('slugs esta ordenado por slug (string simples)', JSON.stringify(gotSlugs) === JSON.stringify(sorted));

// Para cada slug, in tem 1 entrada por pack que contem a magia, com
// name = displayName || name daquele pack.
let inShapeOk = true;
(reserved.slugs || []).forEach((entry) => {
  const expectedIn = [];
  packs.forEach((p, i) => {
    const spell = p.spells.find((s) => s.name === entry.slug);
    if (spell) expectedIn.push({ source: p.meta.source, name: spell.displayName || spell.name });
  });
  if (JSON.stringify(entry.in) !== JSON.stringify(expectedIn)) inShapeOk = false;
});
check('slugs[].in tem 1 entrada por pack que contem a magia, na ordem dos packs, com name = displayName || name', inShapeOk);

// Caso de referencia: fireball existe nos 3 packs, com displayName traduzido no pt-BR.
const fireball = (reserved.slugs || []).find((s) => s.slug === 'fireball');
check('slugs contem a entrada fireball', !!fireball);
if (fireball) {
  const ptbrEntry = fireball.in.find((e) => e.source === 'srd-2024-ptbr');
  check('fireball.in tem a entrada srd-2024-ptbr com name "Bola de Fogo"', ptbrEntry && ptbrEntry.name === 'Bola de Fogo');
}

if (failures > 0) {
  console.error(failures + ' verificacao(oes) de srd-reserved-slugs.json falharam.');
  process.exit(1);
}
console.log('srd-reserved-slugs.json: 3 packs na ordem de EDITIONS, cobertura total de slugs sem duplicata, ordenado, "in" correto por pack, fireball com Bola de Fogo em pt-BR.');
'@

  $tmp = Join-Path ([System.IO.Path]::GetTempPath()) "check-srd-reserved-slugs-$([guid]::NewGuid()).cjs"
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
      throw "srd-reserved-slugs.json proof failed: $nodeOut"
    }
    Write-Output $nodeOut
  } finally {
    if (Test-Path -LiteralPath $tmp) { Remove-Item -LiteralPath $tmp -Force }
  }
}
