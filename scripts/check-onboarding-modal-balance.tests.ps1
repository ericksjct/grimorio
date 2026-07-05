$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$indexPath = Join-Path $repoRoot 'index.html'
$index = Get-Content -Raw -LiteralPath $indexPath

if ($index -notmatch 'minHeight:\s*320') {
  throw 'Onboarding dialog should use the tighter shared minimum height.'
}

if ($index -notmatch "padding:\s*22[\s\S]*?justifyContent:\s*'center'") {
  throw 'Onboarding right action panel is not vertically centered.'
}

if ($index -match 'minHeight:\s*360') {
  throw 'Onboarding dialog still uses the taller minimum height that leaves too much empty space.'
}

Write-Output 'Onboarding modal uses tighter height and vertically centers the right panel.'
