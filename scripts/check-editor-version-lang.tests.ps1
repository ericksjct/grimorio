$ErrorActionPreference = 'Stop'

# Fase 04.1 plano 04 (D-01/D-08), realinhado na Fase 8 plano 03: v11 nao le
# mais uma "versao ativa" global (window.getCurrentSpellVersion) - cada magia
# ja carrega o proprio idioma (s.lang) desde o loader (08-01). O nome exibido
# e usado na busca segue s.lang; window.v7BuildSpells(lang) recebe o idioma da
# INTERFACE so pro desempate EN x PT da uniao (mesmo contrato da grade).

$repoRoot = Split-Path -Parent $PSScriptRoot
$editorPath = Join-Path $repoRoot 'v11-character-editor.jsx'
$editor = Get-Content -Raw -LiteralPath $editorPath

# ── Positivas ────────────────────────────────────────────────────────────

if ($editor -notmatch [regex]::Escape('window.v7BuildSpells(lang)')) {
  throw 'allSpells must be built via window.v7BuildSpells(lang) - the interface language breaks EN x PT union ties (08-03).'
}

if ($editor -notmatch 'spellName\(s,\s*s\.lang\)') {
  throw 'spellName must be called with s.lang (the spell''s own package language), not a global version language (08-03).'
}
$spellNameOwnLangCount = ([regex]::Matches($editor, 'spellName\(s,\s*s\.lang\)')).Count
if ($spellNameOwnLangCount -ne 2) {
  throw "Expected exactly 2 spellName(s, s.lang) call sites (search filter + rendered name), found $spellNameOwnLangCount."
}

if ($editor -notmatch "function CharacterEditor\(\{\s*lang = 'ptbr'") {
  throw 'CharacterEditor signature must still declare the lang prop with default ptbr - it keeps governing interface chrome.'
}

if ($editor -notmatch 'window\.bilingual \? window\.bilingual\(lang\)') {
  throw 'window.bilingual must still be called with lang (interface language) - chrome must not migrate by accident.'
}

# ── Negativas ────────────────────────────────────────────────────────────

if ($editor -match 'spellName\(s,\s*lang\)') {
  throw 'No spellName call may pass the interface lang prop - both call sites must use s.lang (08-03).'
}

if ($editor -match 'spellName\(s,\s*versionLang\)') {
  throw '08-03: no spellName(s, versionLang) call site may remain - versionLang (the global active-version language) was removed.'
}

if ($editor -match 'getCurrentSpellVersion') {
  throw '08-03: v11-character-editor.jsx must not call window.getCurrentSpellVersion anymore - there is no single "active version" in the composition model (08-01).'
}

if ($editor -match 'const versionLang\s*=') {
  throw '08-03: v11-character-editor.jsx must not declare a versionLang memo anymore - each spell already carries its own s.lang.'
}

$listenerCount = ([regex]::Matches($editor, "addEventListener\('hifi-spells-source-changed'")).Count
if ($listenerCount -ne 1) {
  throw "Expected exactly 1 hifi-spells-source-changed listener (the pre-existing one) but found $listenerCount - no new listener should have been added (D-08/08-03)."
}

Write-Output 'CharacterEditor shows each spell in its own package''s language (s.lang), reusing the existing version listener, with no global active-version lookup.'
