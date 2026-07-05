$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$uiPath = Join-Path $repoRoot 'v10-hifi.jsx'
$ui = Get-Content -Raw -LiteralPath $uiPath

if ($ui -notmatch 'function\s+hifiSchoolFilterLabel') {
  throw 'Missing school filter label formatter.'
}

if ($ui -notmatch 'formatValue\s*=\s*\{\s*cat\.formatValue\s*\}') {
  throw 'Desktop school filter options are not wired through a formatter.'
}

if ($ui -notmatch '\{formatValue\(v\)\}') {
  throw 'FilterChipDropdown still renders raw option values.'
}

if ($ui -notmatch 'hifiSchoolFilterLabel\(v,\s*versionLang\)') {
  throw 'Mobile school filter pills still render raw school keys.'
}

Write-Output 'School filter options render formatted labels.'
