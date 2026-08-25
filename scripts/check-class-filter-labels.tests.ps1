$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$uiPath = Join-Path $repoRoot 'v10-hifi.jsx'
$ui = Get-Content -Raw -LiteralPath $uiPath

if ($ui -notmatch 'function\s+hifiTitleCaseFilterLabel') {
  throw 'Missing title-case filter label formatter (still used internally by hifiClassFilterLabel).'
}

if ($ui -notmatch 'function\s+hifiClassFilterLabel\(') {
  throw 'Missing hifiClassFilterLabel(value, uiLang) formatter (D-04).'
}

if ($ui -notmatch "key:\s*'class'[\s\S]*?formatValue:\s*v\s*=>\s*hifiClassFilterLabel\(v,\s*uiLang\)") {
  throw 'Desktop class filter options are not wired through hifiClassFilterLabel(v, uiLang) (D-04).'
}

if ($ui -notmatch 'hifiClassFilterLabel\(v,\s*uiLang\)') {
  throw 'Mobile class filter pills must render through hifiClassFilterLabel(v, uiLang) (D-04).'
}

Write-Output 'Class filter options translate the pack value to the interface language, capitalized.'
