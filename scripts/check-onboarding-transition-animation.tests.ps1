$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$indexPath = Join-Path $repoRoot 'index.html'
$cssPath = Join-Path $repoRoot 'hifi-tokens.css'
$index = Get-Content -Raw -LiteralPath $indexPath
$css = Get-Content -Raw -LiteralPath $cssPath

if ($css -notmatch '\.hifi-onboarding-actions') {
  throw 'Missing onboarding actions animation class.'
}

if ($css -notmatch '@keyframes\s+hifi-onboarding-actions-in') {
  throw 'Missing onboarding actions keyframes.'
}

if ($css -notmatch 'prefers-reduced-motion:\s*reduce[\s\S]*?\.hifi-onboarding-actions') {
  throw 'Onboarding animation does not respect reduced motion.'
}

if ($index -notmatch 'key=\{mode\}[\s\S]*?className="hifi-onboarding-actions"') {
  throw 'Onboarding mode content is not keyed and animated.'
}

Write-Output 'Onboarding mode transitions use a quick reduced-motion-aware animation.'
