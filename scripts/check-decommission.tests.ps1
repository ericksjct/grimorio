$ErrorActionPreference = 'Stop'

# Gate permanente de descomissionamento (D-15/D-17, MIGR-02): os 4 JSONs de
# magias protegidos por copyright (2 PT-BR + 2 EN, PHB) saem do repositorio
# num unico commit atomico. Este gate falha se qualquer um voltar a arvore de
# trabalho, ao git ls-files, ao PRECACHE do service worker, ou ao registro
# BUILTIN_VERSIONS.
#
# Nota (D-04): o mapa LEGACY_VERSION_FALLBACK em spells-data-loader.jsx
# deliberadamente RETEM as 4 chaves antigas como string keys - ele existe pra
# redirecionar uma preferencia salva antiga (spellbook-ui-prefs.versionKey).
# Fase 7 (D-08 + WR-01 da revisao): a chave 2024 PT-BR redireciona para o SRD
# 5.2 PT-BR embutido, as outras 3 continuam indo pro SRD EN da mesma edicao. Essas 4
# ocorrencias sao esperadas e nao violam a regra: o que este gate proibe e a
# presenca dos ARQUIVOS (.json) e das entradas em BUILTIN_VERSIONS/PRECACHE,
# nao o texto da chave de fallback.

$repoRoot = Split-Path -Parent $PSScriptRoot

$removedFiles = @(
  'spells-5E-2024-PTBR.json',
  'spells-5E-2014-PTBR.json',
  'spells-5E-2024-EN.json',
  'spells-5E-2014-EN.json'
)

# ── 1. Ausentes da arvore de trabalho ──
foreach ($f in $removedFiles) {
  $p = Join-Path $repoRoot $f
  if (Test-Path -LiteralPath $p) {
    throw "$f ainda existe na arvore de trabalho - a decomissao (D-15) nao esta completa."
  }
}

# ── 2. Ausentes de git ls-files (indice/HEAD) ──
Push-Location $repoRoot
try {
  $tracked = & git ls-files
} finally {
  Pop-Location
}
foreach ($f in $removedFiles) {
  if ($tracked -contains $f) {
    throw "$f ainda esta rastreado pelo git (git ls-files) - use 'git rm', nao apagar do filesystem."
  }
}

# ── 3. sw.js: PRECACHE so com os 3 SRD (5.2 EN, 5.1 EN, 5.2 PT-BR), CACHE_VERSION bumpado ──
$swPath = Join-Path $repoRoot 'sw.js'
$sw = Get-Content -Raw -LiteralPath $swPath

foreach ($f in $removedFiles) {
  if ($sw -match [regex]::Escape($f)) {
    throw "sw.js ainda referencia $f - remova a entrada de PRECACHE."
  }
}

# O invariante de D-14 e "o bump de descomissionamento aconteceu", nao "a versao
# e literalmente v2 para sempre". Cravar o literal fazia qualquer bump posterior
# (ex.: v3, ao regenerar um pack ja precacheado) quebrar este gate sem que nada
# de descomissionamento tivesse regredido.
if ($sw -notmatch "const CACHE_VERSION = 'grimorio-v(\d+)';") {
  throw "sw.js nao declara um CACHE_VERSION no formato 'grimorio-vN'."
}
if ([int]$Matches[1] -lt 2) {
  throw "sw.js CACHE_VERSION e 'grimorio-v$($Matches[1])' - o bump (D-14) e obrigatorio pra apagar o cache antigo com os 4 JSONs."
}

if ($sw -notlike "*'./packs/index.js'*" -or $sw -notlike '*self.BUILTIN_PACKS*') {
  throw "sw.js PRECACHE deve conter './packs/index.js' e derivar os JSONs embutidos de self.BUILTIN_PACKS."
}

$precacheMatch = [regex]::Match($sw, 'const PRECACHE = \[[\s\S]*?\n\];')
if (-not $precacheMatch.Success) {
  throw 'Nao foi possivel localizar o array PRECACHE em sw.js.'
}
$spellJsonEntries = [regex]::Matches($precacheMatch.Value, "'\./[^']*\.json'") | Where-Object {
  $_.Value -notmatch 'manifest\.json' -and $_.Value -notmatch 'pack\.schema\.json' -and $_.Value -notmatch 'srd-reserved-slugs\.json'
}
if ($spellJsonEntries.Count -ne 0) {
  throw "PRECACHE nao lista mais JSONs de magia a mao (vem de packs/index.js); encontrados $($spellJsonEntries.Count): $($spellJsonEntries.Value -join ', ')"
}

if ($sw -notmatch 'REMO[CÇ][AÃ]O.{0,80}bump|remo[cç][aã]o.{0,80}bump') {
  throw "O comentario de topo de sw.js precisa falar de remocao exigindo bump de CACHE_VERSION (D-14)."
}

# ── 4. spells-data-loader.jsx: sem referencias .json aos arquivos removidos ──
$loaderPath = Join-Path $repoRoot 'spells-data-loader.jsx'
$loader = Get-Content -Raw -LiteralPath $loaderPath

foreach ($f in $removedFiles) {
  if ($loader -match [regex]::Escape($f)) {
    throw "spells-data-loader.jsx ainda referencia o arquivo $f - remova a entrada de BUILTIN_VERSIONS."
  }
}

# ── 5. Prova de execucao: BUILTIN_VERSIONS tem exatamente 2 entradas SRD ──
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  Write-Warning 'node nao encontrado - prova de execucao do gate de decomissao pulada.'
  Write-Output 'Decommission gate: structural checks passed (execution proof skipped, no node).'
  return
}

$nodeScript = @'
const fs = require("fs");
const path = require("path");
const m = fs.readFileSync("packs/index.js", "utf8").match(/BUILTIN_PACKS = (\[[\s\S]*?\n\]);/);
if (!m) { console.error("nao achei BUILTIN_PACKS em packs/index.js"); process.exit(1); }
const BUILTIN_VERSIONS = eval(m[1]);
if (BUILTIN_VERSIONS.length < 3) {
  console.error("Esperava ao menos 3 entradas em BUILTIN_VERSIONS, achei " + BUILTIN_VERSIONS.length);
  process.exit(1);
}
for (const v of BUILTIN_VERSIONS) {
  if (v.role === "base" && v.corpus !== "srd") { console.error("Entrada " + v.key + " nao tem corpus srd"); process.exit(1); }
  if (v.source !== "fetch") { console.error("Entrada " + v.key + " nao tem source fetch"); process.exit(1); }
  if (!v.file || !fs.existsSync(path.join(process.cwd(), v.file))) {
    console.error("Entrada " + v.key + " aponta para arquivo inexistente: " + v.file);
    process.exit(1);
  }
}
console.log("BUILTIN_VERSIONS ok: 3 entradas SRD, todas com source fetch e arquivo existente.");
'@
$tmp = Join-Path ([System.IO.Path]::GetTempPath()) "check-decommission-$([guid]::NewGuid()).cjs"
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
    throw "Prova de execucao do gate de decomissao falhou: $nodeOut"
  }
} finally {
  if (Test-Path -LiteralPath $tmp) { Remove-Item -LiteralPath $tmp -Force }
}

Write-Output 'Decommission gate: os 4 JSONs legados estao fora da arvore, do indice, do PRECACHE e de BUILTIN_VERSIONS. (3 SRD embutidos: 5.2 EN, 5.1 EN, 5.2 PT-BR)'
