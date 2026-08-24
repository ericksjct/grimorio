$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$editorPath = Join-Path $repoRoot 'v11-character-editor.jsx'
$editor = Get-Content -Raw -LiteralPath $editorPath

# ── Positivas: versionLang deriva localmente do pack ativo, sem plumbing novo ──

if ($editor -notmatch "React\.useMemo\(\s*\(\)\s*=>\s*window\.getCurrentSpellVersion\?\.\(\)\?\.lang \|\| 'ptbr',\s*\[spellVersion\]\s*\)") {
  throw 'versionLang must be a React.useMemo reading window.getCurrentSpellVersion()?.lang with spellVersion as its only dependency (D-08).'
}

if ($editor -notmatch 'spellName\(s,\s*versionLang\)') {
  throw 'spellName must be called with versionLang, not the interface lang prop (D-01).'
}
$spellNameVersionLangCount = ([regex]::Matches($editor, 'spellName\(s,\s*versionLang\)')).Count
if ($spellNameVersionLangCount -ne 2) {
  throw "Expected exactly 2 spellName(s, versionLang) call sites (search filter + rendered name), found $spellNameVersionLangCount."
}

if ($editor -notmatch "function CharacterEditor\(\{\s*lang = 'ptbr'") {
  throw 'CharacterEditor signature must still declare the lang prop with default ptbr - it keeps governing interface chrome.'
}

if ($editor -notmatch 'window\.bilingual \? window\.bilingual\(lang\)') {
  throw 'window.bilingual must still be called with lang (interface language), not versionLang - chrome must not migrate by accident.'
}

# ── Negativas: nenhum call site velho, nenhum listener novo ────────────────

if ($editor -match 'spellName\(s,\s*lang\)') {
  throw 'No spellName call should still pass the interface lang prop - both call sites must use versionLang (D-01).'
}

$listenerCount = ([regex]::Matches($editor, "addEventListener\('hifi-spells-source-changed'")).Count
if ($listenerCount -ne 1) {
  throw "Expected exactly 1 hifi-spells-source-changed listener (the pre-existing one) but found $listenerCount - versionLang must not add a new listener (D-08)."
}

Write-Output 'CharacterEditor derives pack-language spell names locally, reusing the existing version listener.'
