$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$indexPath = Join-Path $repoRoot 'index.html'
$index = Get-Content -Raw -LiteralPath $indexPath

# ── Positivas: o estado de idioma nasce de prefs.lang -> detectLang() ──────

if ($index -notmatch 'React\.useState\(\s*initial\.lang\s*\|\|\s*detectLang\(\)\s*\)') {
  throw 'uiLang state must initialize from initial.lang || detectLang(), not from the active spell version.'
}

$sourceChangedMatch = [regex]::Match($index, "const onSourceChanged = \(e\) => \{[\s\S]{0,200}?\};")
if (-not $sourceChangedMatch.Success) {
  throw 'Could not locate the hifi-spells-source-changed handler in index.html.'
}
$sourceChangedBody = $sourceChangedMatch.Value
if ($sourceChangedBody -notmatch 'setVersionKey\(') {
  throw 'hifi-spells-source-changed handler must call setVersionKey.'
}

if ($index -notmatch 'window\.__setUiLang = \(v\) => setUiLang\(normLang \? normLang\(v\) : v\);') {
  throw 'window.__setUiLang must be registered and route its argument through normLang before calling setUiLang.'
}

if ($index -notmatch "document\.documentElement\.setAttribute\('lang', uiLang === 'ptbr' \? 'pt-br' : 'en'\)") {
  throw 'The <html lang> effect must derive from uiLang, not from the version-coupled state.'
}
if ($index -notmatch "og\.setAttribute\('content', uiLang === 'ptbr' \? 'pt_BR' : 'en_US'\)") {
  throw 'The og:locale effect must derive from uiLang, not from the version-coupled state.'
}

if ($index -notmatch 'lang:\s*uiLang') {
  throw "savePrefs() must still write the 'lang' key, fed by uiLang (D-17: contract unchanged, source renamed)."
}

if ($index -notmatch 'function\s+defaultVersionKeyForLang') {
  throw 'defaultVersionKeyForLang must still be declared - D-12 is a deliberate no-op for initial VERSION resolution.'
}

if ($index -notmatch 'window\.__setUiLang = null;') {
  throw 'window.__setUiLang must be reset to null on unmount cleanup.'
}

# ── Negativas: nenhum caminho volta a acoplar idioma <-> versão ───────────

if ($index -match 'function\s+langOfVersionKey') {
  throw 'langOfVersionKey must be removed - it has no call sites after the language state was decoupled from the active version.'
}

if ($sourceChangedBody -match 'setLang\(|setUiLang\(') {
  throw 'hifi-spells-source-changed handler must not call any language setter - switching the active version must never change the UI language (criterio 2).'
}

if ($index -match "searchParams\.(get|has)\('lang'\)") {
  throw 'The UI language must not be read from a URL query parameter (D-15).'
}

Write-Output 'UI language state is decoupled from the active spell version.'
