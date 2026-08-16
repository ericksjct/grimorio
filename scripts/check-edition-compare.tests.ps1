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

Write-Output 'Edition comparator matches by declared edition, and every builtin version declares one.'
