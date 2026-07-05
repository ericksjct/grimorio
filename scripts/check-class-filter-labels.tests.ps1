$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$uiPath = Join-Path $repoRoot 'v10-hifi.jsx'
$ui = Get-Content -Raw -LiteralPath $uiPath

if ($ui -notmatch 'function\s+hifiTitleCaseFilterLabel') {
  throw 'Missing title-case filter label formatter.'
}

if ($ui -notmatch "key:\s*'class'[\s\S]*?formatValue:\s*v\s*=>\s*hifiTitleCaseFilterLabel\(v\)") {
  throw 'Desktop class filter options are not wired through title-case formatting.'
}

if ($ui -notmatch 'hifiTitleCaseFilterLabel\(v\)') {
  throw 'Mobile class filter pills still render raw class values.'
}

Write-Output 'Class filter options render with initial uppercase labels.'
