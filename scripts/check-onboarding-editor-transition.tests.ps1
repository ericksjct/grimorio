$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$indexPath = Join-Path $repoRoot 'index.html'
$cssPath = Join-Path $repoRoot 'hifi-tokens.css'
$index = Get-Content -Raw -LiteralPath $indexPath
$css = Get-Content -Raw -LiteralPath $cssPath

foreach ($needle in @(
  '.hifi-onboarding-editor-backdrop',
  '.hifi-onboarding-editor-shell',
  '@keyframes hifi-onboarding-backdrop-in',
  '@keyframes hifi-onboarding-editor-in'
)) {
  if ($css -notlike "*$needle*") {
    throw "Missing onboarding editor transition CSS: $needle"
  }
}

if ($css -notmatch 'prefers-reduced-motion:\s*reduce[\s\S]*?hifi-onboarding-editor-shell') {
  throw 'Onboarding editor transition does not respect reduced motion.'
}

if ($index -notmatch 'className="hifi-onboarding-editor-backdrop"') {
  throw 'Onboarding editor backdrop does not use the transition class.'
}

if ($index -notmatch 'className="hifi-onboarding-editor-shell"') {
  throw 'Onboarding editor shell does not use the transition class.'
}

Write-Output 'Onboarding-to-editor transition classes are wired.'
