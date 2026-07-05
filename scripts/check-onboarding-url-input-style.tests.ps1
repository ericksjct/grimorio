$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$indexPath = Join-Path $repoRoot 'index.html'
$index = Get-Content -Raw -LiteralPath $indexPath

if ($index -notmatch 'id="onboarding-build-url"') {
  throw 'Missing onboarding build URL textarea.'
}

if ($index -notmatch 'id="onboarding-build-url"[\s\S]*?borderRadius:\s*6') {
  throw 'Onboarding build URL textarea does not override the pill-shaped input radius.'
}

Write-Output 'Onboarding build URL textarea uses a subtle border radius.'
