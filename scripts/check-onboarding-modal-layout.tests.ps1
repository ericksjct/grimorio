$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$indexPath = Join-Path $repoRoot 'index.html'
$index = Get-Content -Raw -LiteralPath $indexPath

if ($index -notmatch 'minHeight:\s*320') {
  throw 'Onboarding dialog does not define a shared minimum height for both modes.'
}

if ($index -notmatch "justifyContent:\s*'flex-start'") {
  throw 'Onboarding left panel is not aligned to the top.'
}

if ($index -match "justifyContent:\s*'center'[\s\S]{0,180}<h2 className=`"hifi-display`"") {
  throw 'Onboarding left panel still centers its text vertically.'
}

Write-Output 'Onboarding modal keeps consistent height and top-aligns the left panel.'
