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

# O default de versão de magias na primeira visita (spells-data-loader.jsx)
# precisa usar a MESMA regra do detectLang(): qualquer candidato pt* -> ptbr.
# Só languages[0] dava UI em português com SRD em inglês (WR-02, fase 07).
$loader = Get-Content -Raw -LiteralPath (Join-Path $repoRoot 'spells-data-loader.jsx')
if ($loader -match 'navigator\.languages\s*&&\s*navigator\.languages\[0\]') {
  throw 'spells-data-loader.jsx still picks the default spell version from navigator.languages[0] only.'
}
if ($loader -notmatch 'navigator\.languages[\s\S]*?Array\.from|Array\.from\(navigator\.languages' -or
    $loader -notmatch 'candidates\.some\(l\s*=>\s*l\.startsWith\(''pt''\)\)') {
  throw 'spells-data-loader.jsx default spell version does not use the detectLang() candidate rule (any pt* candidate -> ptbr).'
}

Write-Output 'Browser language detection uses all browser language candidates (UI language and default spell version).'
