$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$indexPath = Join-Path $repoRoot 'index.html'
$editorPath = Join-Path $repoRoot 'v11-character-editor.jsx'
$index = Get-Content -Raw -LiteralPath $indexPath
$editor = Get-Content -Raw -LiteralPath $editorPath

foreach ($needle in @(
  'ONBOARDING_SEEN_KEY',
  'function decodeSharedBuildFromUrl',
  'function importSharedBuildUrl',
  'function OnboardingModal',
  'Crie ou importe um personagem para salvar magias preparadas, favoritas e aparência neste aparelho.',
  'Ela será copiada para este aparelho; mudanças futuras não serão sincronizadas com o link original.',
  'setOnboardingMode(''import'')',
  'setOnboardingEditorOpen(true)',
  'Continuar como aventureiro anônimo'
)) {
  if ($index -notlike "*$needle*") {
    throw "Missing onboarding implementation detail in index.html: $needle"
  }
}

if ($editor -notlike '*persistBookmarks*') {
  throw 'persistBookmarks is not available for build import.'
}

Write-Output 'Onboarding modal and local build import wiring are present.'
