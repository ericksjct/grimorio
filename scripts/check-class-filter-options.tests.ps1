$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$uiPath = Join-Path $repoRoot 'v10-hifi.jsx'
$ui = Get-Content -Raw -LiteralPath $uiPath

$knownMissingClasses = @('patrulheiro', 'paladino', 'artífice')
$hardcodedClassLists = [regex]::Matches(
  $ui,
  "\[\s*'mago'\s*,\s*'clérigo'\s*,\s*'druida'\s*,\s*'bardo'\s*,\s*'feiticeiro'\s*,\s*'bruxo'\s*\]"
)

if ($hardcodedClassLists.Count -gt 0) {
  $missing = $knownMissingClasses -join ', '
  throw "Class filters are still limited to the original hardcoded caster list; expected data-derived options including: $missing."
}

Write-Output 'Class filter options are not limited by the old hardcoded class list.'
