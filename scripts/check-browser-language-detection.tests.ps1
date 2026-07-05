$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$indexPath = Join-Path $repoRoot 'index.html'
$index = Get-Content -Raw -LiteralPath $indexPath

if ($index -notmatch 'function\s+browserLanguageCandidates') {
  throw 'Missing browserLanguageCandidates helper.'
}

if ($index -notmatch 'navigator\.languages[\s\S]*?Array\.from') {
  throw 'Language detection does not inspect the full navigator.languages list.'
}

if ($index -notmatch 'candidates\.some\(l\s*=>\s*l\.startsWith\(''pt''\)\)') {
  throw 'Language detection does not choose pt-BR when any browser language candidate starts with pt.'
}

Write-Output 'Browser language detection uses all browser language candidates.'
