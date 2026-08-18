$ErrorActionPreference = 'Stop'

# useEditionCompare used to pick "other" as the first entry with the same lang
# and a different key — that only made sense while the registry had exactly two
# entries per language. From 04-01 on the EN registry has at least four entries
# (2 SRD + 2 legacy) plus whatever the user installs, so the old heuristic would
# offer a third-party pack as if it were "the other edition". The fix matches by
# the declared `edition` field instead, and hides the button when the current
# version has no `edition` to compare against.

$repoRoot = Split-Path -Parent $PSScriptRoot
$uiPath = Join-Path $repoRoot 'v10-hifi.jsx'
$loaderPath = Join-Path $repoRoot 'spells-data-loader.jsx'
$ui = Get-Content -Raw -LiteralPath $uiPath
$loader = Get-Content -Raw -LiteralPath $loaderPath

# 1. Locate the body of useEditionCompare.
$fnMatch = [regex]::Match($ui, 'function useEditionCompare\([\s\S]{0,2000}?\n\}')
if (-not $fnMatch.Success) {
  throw 'Could not locate the useEditionCompare function body in v10-hifi.jsx.'
}
$fnBody = $fnMatch.Value

# 2. The `other` expression must compare `edition`, not just a different key.
$otherMatch = [regex]::Match($fnBody, 'const other = [\s\S]{0,300}?;\r?\n')
if (-not $otherMatch.Success) {
  throw 'Could not locate the `const other = ...` assignment inside useEditionCompare.'
}
$otherExpr = $otherMatch.Value
if ($otherExpr -notmatch 'edition') {
  throw '`other` selection must compare the `edition` field on version entries, not just the key.'
}
if ($otherExpr -notmatch 'v\.lang === cur\.lang') {
  throw '`other` selection must still match on the same `lang` as the current version.'
}
if ($otherExpr -match 'v\.key !== cur\.key' -and $otherExpr -notmatch 'edition !== cur\.edition') {
  throw 'The old key-only heuristic must not survive as the sole selection criterion — match by edition instead.'
}
if ($otherExpr -notmatch 'edition !== cur\.edition') {
  throw '`other` selection must exclude entries whose `edition` matches the current one (that is not "the other edition").'
}

# 3. Cross-check: every builtin entry in the loader must declare `edition`, or
#    the comparator silently breaks for whichever entry forgets it.
$builtinMatch = [regex]::Match($loader, 'const BUILTIN_VERSIONS = \[[\s\S]{0,2000}?\n\];')
if (-not $builtinMatch.Success) {
  throw 'Could not locate BUILTIN_VERSIONS in spells-data-loader.jsx.'
}
$entryLines = [regex]::Matches($builtinMatch.Value, '\{\s*key:[\s\S]*?\}')
if ($entryLines.Count -lt 1) {
  throw 'Could not parse any BUILTIN_VERSIONS entries.'
}
foreach ($entry in $entryLines) {
  if ($entry.Value -notmatch "edition:\s*'[^']+'") {
    throw "A BUILTIN_VERSIONS entry is missing a non-empty `edition` field: $($entry.Value)"
  }
}

# ── WR-07: PHB deve comparar com PHB, não com a SRD que ordena primeiro ────
# `find` respeita a ordem do registro; a SRD ocupa os índices 0-1, então um
# `find` ingênuo por lang+edição-diferente oferece SRD 5.1 pra quem está
# comparando o PHB 2024. Prova de execução: replica a seleção de `other` de
# verdade contra o BUILTIN_VERSIONS de verdade, pro caso concreto PHB-2024-EN.
foreach ($entry in $entryLines) {
  if ($entry.Value -notmatch "corpus:\s*'[^']+'") {
    throw "WR-07: a BUILTIN_VERSIONS entry is missing a non-empty `corpus` field (used to prefer SRD<->SRD / PHB<->PHB pairs): $($entry.Value)"
  }
}
# Checa o corpo INTEIRO da funcao (nao so a linha `const other = ...`) -
# sameCorpus e definido numa linha separada, e "-match 'corpus'" contra so
# $otherExpr passaria mesmo se sameCorpus() nunca checasse v.corpus (o
# identificador "sameCorpus" sozinho ja contem a substring, case-insensitive).
if ($fnBody -notmatch 'v\.corpus\s*===\s*cur\.corpus') {
  throw "WR-07: useEditionCompare must prefer a same-`corpus` match (v.corpus === cur.corpus) before falling back to any other edition - otherwise registry order (SRD first) picks the wrong pair for PHB entries."
}

$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
  $nodeScript = @'
const fs = require('fs');
const src = fs.readFileSync('spells-data-loader.jsx', 'utf8');
const m = src.match(/const BUILTIN_VERSIONS = (\[[\s\S]*?\n\]);/);
if (!m) { console.error('nao achei BUILTIN_VERSIONS'); process.exit(1); }
const BUILTIN_VERSIONS = eval(m[1]);

const cur = BUILTIN_VERSIONS.find(v => v.key === 'spells-5E-2024-EN'); // PHB 2024 (EN)
const sameCorpus = v => v.lang === cur.lang && v.edition && v.edition !== cur.edition && v.corpus === cur.corpus;
const other = cur && cur.edition
  ? (BUILTIN_VERSIONS.find(sameCorpus) || BUILTIN_VERSIONS.find(v => v.lang === cur.lang && v.edition && v.edition !== cur.edition) || null)
  : null;

if (!other || other.key !== 'spells-5E-2014-EN') {
  console.error('WR-07 FAIL: PHB 2024 (EN) compared against ' + (other ? other.key : 'null') + ', expected spells-5E-2014-EN (PHB 2014)');
  process.exit(1);
}
console.log('WR-07 ok: PHB 2024 (EN) compares against PHB 2014, not SRD 5.1.');
'@
  $tmp = Join-Path ([System.IO.Path]::GetTempPath()) "check-edition-compare-$([guid]::NewGuid()).cjs"
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
      throw "WR-07 runtime proof failed: $nodeOut"
    }
  } finally {
    if (Test-Path -LiteralPath $tmp) { Remove-Item -LiteralPath $tmp -Force }
  }
} else {
  Write-Warning 'node nao encontrado - prova de execucao do WR-07 pulada (assercoes estruturais ja rodaram).'
}

Write-Output 'Edition comparator matches by declared edition, and every builtin version declares one.'
