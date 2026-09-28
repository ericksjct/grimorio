$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$indexPath = Join-Path $repoRoot 'index.html'
$index = Get-Content -Raw -LiteralPath $indexPath

# ── Positivas: o estado de idioma nasce de prefs.lang -> detectLang() ──────

if ($index -notmatch 'React\.useState\(\s*initial\.lang\s*\|\|\s*detectLang\(\)\s*\)') {
  throw 'uiLang state must initialize from initial.lang || detectLang(), not from the active spell version.'
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

if ($index -match 'function\s+defaultVersionKeyForLang') {
  throw 'defaultVersionKeyForLang must not be declared anymore (Fase 8) - index.html no longer resolves an initial spell-package selection at all; the loader owns it end to end (D-07).'
}

if ($index -notmatch 'window\.__setUiLang = null;') {
  throw 'window.__setUiLang must be reset to null on unmount cleanup.'
}

# ── Negativas: nenhum caminho volta a acoplar idioma <-> versão ───────────

if ($index -match 'function\s+langOfVersionKey') {
  throw 'langOfVersionKey must be removed - it has no call sites after the language state was decoupled from the active version.'
}

if ($index -match 'hifi-spells-source-changed') {
  throw 'index.html must not subscribe to hifi-spells-source-changed anymore (Fase 8) - it holds no package-selection state to update, and the UI language must never react to a package-selection change (criterio 2).'
}

if ($index -match "searchParams\.(get|has)\('lang'\)") {
  throw 'The UI language must not be read from a URL query parameter (D-15).'
}

Write-Output 'UI language state is decoupled from the active spell version.'
