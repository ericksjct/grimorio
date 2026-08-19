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
foreach ($entry in $entryLines) {
  if ($entry.Value -notmatch "corpus:\s*'[^']+'") {
    throw "WR-07: a BUILTIN_VERSIONS entry is missing a non-empty `corpus` field (used to prefer SRD<->SRD / PHB<->PHB pairs): $($entry.Value)"
  }
}

# ── CR-02 / WR-07: um ÚNICO helper de seleção, usado por AMBOS os call sites ──
# Round 2 corrigiu só useEditionCompare (WR-07). Round 3 achou o mesmo defeito
# em HifiLangToggle (CR-02) porque os dois tinham cópias separadas da lógica
# de preferência de corpus. Structural: hifiSiblingVersion() existe, checa
# `v.corpus === cur.corpus`, e AMBOS HifiLangToggle e useEditionCompare
# chamam por ela — se qualquer um dos dois voltar a usar `versions.find(...)`
# cru, esta asserção falha (o que WR-03 aponta que não existia antes).
$helperMatch = [regex]::Match($ui, 'function hifiSiblingVersion\([\s\S]{0,600}?\n\}')
if (-not $helperMatch.Success) {
  throw 'CR-02: could not locate the shared hifiSiblingVersion() helper in v10-hifi.jsx.'
}
$helperBody = $helperMatch.Value
if ($helperBody -notmatch 'v\.corpus\s*===\s*cur\.corpus') {
  throw "CR-02: hifiSiblingVersion() must prefer a same-`corpus` match (v.corpus === cur.corpus) before falling back to any other match."
}

$toggleMatch = [regex]::Match($ui, 'function HifiLangToggle\([\s\S]{0,3000}?\n\}')
if (-not $toggleMatch.Success) {
  throw 'CR-02: could not locate HifiLangToggle in v10-hifi.jsx.'
}
if ($toggleMatch.Value -notmatch 'hifiSiblingVersion\(') {
  throw 'CR-02: HifiLangToggle must select its pt/en siblings through hifiSiblingVersion() - the same helper useEditionCompare uses. A separate ad-hoc find() is how round 2 introduced CR-02 (WR-06 got the corpus fix, the sibling call site did not).'
}
if ($fnBody -notmatch 'hifiSiblingVersion\(') {
  throw 'CR-02/WR-07: useEditionCompare must select `other` through hifiSiblingVersion() too, not its own inline corpus logic.'
}

# ── WR-02: prova de execução real, não uma reimplementação da lógica ────────
# A versão anterior desta prova reimplementava a expressão de seleção em vez
# de ler a função de produção — testava a si mesma e continuava verde mesmo
# se `useEditionCompare`/`HifiLangToggle` fossem revertidos. Agora ela extrai
# hifiSiblingVersion() de v10-hifi.jsx via regex e faz eval nela mesma.
$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
  $nodeScript = @'
const fs = require('fs');
const src = fs.readFileSync('spells-data-loader.jsx', 'utf8');
const m = src.match(/const BUILTIN_VERSIONS = (\[[\s\S]*?\n\]);/);
if (!m) { console.error('nao achei BUILTIN_VERSIONS'); process.exit(1); }
const BUILTIN_VERSIONS = eval(m[1]);

const ui = fs.readFileSync('v10-hifi.jsx', 'utf8');
const helperMatch = ui.match(/function hifiSiblingVersion\([\s\S]*?\n\}/);
if (!helperMatch) { console.error('nao achei hifiSiblingVersion() em v10-hifi.jsx'); process.exit(1); }
// WR-02: eval na funcao de PRODUCAO de verdade, nao numa copia da logica.
eval(helperMatch[0]);

// WR-07: PHB 2024 (EN) deve comparar com PHB 2014 (EN), nao com a SRD que
// ocupa o indice 0 do registro.
const curPHB = BUILTIN_VERSIONS.find(v => v.key === 'spells-5E-2024-EN');
const other = hifiSiblingVersion(BUILTIN_VERSIONS, curPHB, v => v.lang === curPHB.lang && v.edition && v.edition !== curPHB.edition);
if (!other || other.key !== 'spells-5E-2014-EN') {
  console.error('WR-07 FAIL: PHB 2024 (EN) compared against ' + (other ? other.key : 'null') + ', expected spells-5E-2014-EN (PHB 2014)');
  process.exit(1);
}

// CR-02: PHB 2024 (PT-BR) -> alternar para EN deve ir para PHB 2024 (EN), nao
// para srd-2024-en (indice 0, mesmo lang+edicao, corpus diferente).
const curPTBR = BUILTIN_VERSIONS.find(v => v.key === 'spells-5E-2024-PTBR');
const en = hifiSiblingVersion(BUILTIN_VERSIONS, curPTBR, v => v.lang === 'en' && v.edition === curPTBR.edition);
if (!en || en.key !== 'spells-5E-2024-EN') {
  console.error('CR-02 FAIL: PHB 2024 (PT-BR) lang-toggle-EN resolved to ' + (en ? en.key : 'null') + ', expected spells-5E-2024-EN (PHB 2024 EN)');
  process.exit(1);
}
console.log('WR-07/CR-02 ok: hifiSiblingVersion() prefers same-corpus pairs for both useEditionCompare and HifiLangToggle.');
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
      throw "WR-07/CR-02 runtime proof failed: $nodeOut"
    }
  } finally {
    if (Test-Path -LiteralPath $tmp) { Remove-Item -LiteralPath $tmp -Force }
  }
} else {
  Write-Warning 'node nao encontrado - prova de execucao do WR-07/CR-02 pulada (assercoes estruturais ja rodaram).'
}

Write-Output 'Edition comparator matches by declared edition, and every builtin version declares one.'
