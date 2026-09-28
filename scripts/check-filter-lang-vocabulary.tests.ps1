$ErrorActionPreference = 'Stop'

# Fase 04.1 plano 05 (D-02/D-03/D-04): o vocabulario que o APP deriva (rotulos
# de filtro, nome de escola, rotulo de classe, Sim/Nao de conc/rit) segue o
# idioma da INTERFACE; os VALORES de filtro continuam os do pack (ou, para
# conc/rit, um literal canonico imune a troca de idioma). As POSITIVAS provam
# que o vocabulario migrou para uiLang; as NEGATIVAS provam que nenhum call
# site regrediu para o idioma do pack nem sobrou codigo morto de remapeamento.

$repoRoot = Split-Path -Parent $PSScriptRoot
$uiPath = Join-Path $repoRoot 'v10-hifi.jsx'
$ui = Get-Content -Raw -LiteralPath $uiPath

# ── POSITIVAS ────────────────────────────────────────────────────────────

# 1. hifiClassFilterLabel declarada e chamada nos dois call sites com uiLang.
if ($ui -notmatch 'function\s+hifiClassFilterLabel\(') {
  throw 'Missing hifiClassFilterLabel(value, uiLang) (D-04).'
}
if ($ui -notmatch "key:\s*'class'[\s\S]*?formatValue:\s*v\s*=>\s*hifiClassFilterLabel\(v,\s*uiLang\)") {
  throw 'Desktop class filter must call hifiClassFilterLabel(v, uiLang).'
}
if (([regex]::Matches($ui, 'hifiClassFilterLabel\(v,\s*uiLang\)')).Count -lt 2) {
  throw 'hifiClassFilterLabel(v, uiLang) must be called at both the desktop and mobile call sites.'
}

# 2. hifiFilterConfig chamada com o idioma da interface nas duas montagens de UI.
if (([regex]::Matches($ui, 'hifiFilterConfig\(uiLang\)')).Count -lt 2) {
  throw 'hifiFilterConfig(uiLang) must be called at both the desktop and mobile filterCfg mounts (D-02).'
}

# 3. hifiSchoolFilterLabel chamada com uiLang nos dois call sites (desktop + mobile).
if (([regex]::Matches($ui, 'hifiSchoolFilterLabel\(v,\s*uiLang\)')).Count -lt 2) {
  throw 'hifiSchoolFilterLabel(v, uiLang) must be called at both the desktop and mobile call sites (D-02).'
}

# 4. conc/rit produzem os literais canonicos e declaram formatValue.
if ($ui -notmatch "conc:\s*\{[^}]*get:\s*s\s*=>\s*\[s\.conc\s*\?\s*'yes'\s*:\s*'no'\][^}]*values:\s*\['yes',\s*'no'\][^}]*formatValue:\s*bool") {
  throw "The 'conc' filter definition must produce canonical 'yes'/'no' literals and declare formatValue (D-02/T-04.1-16)."
}
if ($ui -notmatch "rit:\s*\{[^}]*get:\s*s\s*=>\s*\[s\.rit\s*\?\s*'yes'\s*:\s*'no'\][^}]*values:\s*\['yes',\s*'no'\][^}]*formatValue:\s*bool") {
  throw "The 'rit' filter definition must produce canonical 'yes'/'no' literals and declare formatValue (D-02/T-04.1-16)."
}

# 5. hifiFilterConfig ainda retorna Object.assign(Object.create(null), ...).
if ($ui -notmatch 'function hifiFilterConfig\([^)]*\)\s*\{[\s\S]*?return\s+Object\.assign\(\s*Object\.create\(null\)') {
  throw 'hifiFilterConfig must still return Object.assign(Object.create(null), {...}) (CR-01).'
}

# 6. 08-03: hifiFilterValues('class', ...) passa a ordenar/rotular pelo
#    idioma da INTERFACE (uiLang) - o Set de classe em si continua guardando
#    sempre o valor CANONICO do pack (classesEn, D-03/D-04); so o collator de
#    ordenacao e o idioma-alvo do rotulo mudam de "idioma de uma versao ativa"
#    (que deixou de existir, 08-01) pro idioma da interface.
if ($ui -notmatch "hifiFilterValues\('class',\s*allSpells,\s*uiLang\)") {
  throw "hifiFilterValues('class', allSpells, uiLang) must be called - sorting/labeling follows the interface language now (08-03)."
}

# 7. formatValue e passado na montagem dos filtros extras (desktop) e aplicado
#    na pill mobile com fallback ao valor cru.
if ($ui -notmatch 'formatValue=\{filterCfg\[key\]\.formatValue\}') {
  throw 'Desktop extra-filter FilterChipDropdown mount must pass formatValue={filterCfg[key].formatValue}.'
}
if ($ui -notmatch '\{filterCfg\[key\]\.formatValue \? filterCfg\[key\]\.formatValue\(v\) : v\}') {
  throw 'Mobile extra-filter pill must apply filterCfg[key].formatValue with a fallback to the raw value.'
}

# ── NEGATIVAS ────────────────────────────────────────────────────────────

# 8. Nenhuma declaracao nem chamada do helper de remapeamento de classe morto.
if ($ui -match 'function\s+remapClassFilter') {
  throw 'remapClassFilter must have been removed - the class filter Set always holds the pack value now, nothing to remap (D-04).'
}
if ($ui -match 'remapClassFilter\(') {
  throw 'No call site may reference remapClassFilter anymore (D-04).'
}

# 9. Nenhum call site de hifiSchoolFilterLabel regrediu para o idioma do pack.
if ($ui -match 'hifiSchoolFilterLabel\(v,\s*versionLang\)') {
  throw 'No hifiSchoolFilterLabel( call site may use versionLang anymore - school labels always follow uiLang (D-02).'
}

# 10. Nenhum get: dentro de hifiFilterConfig chama bool( - so formatValue pode.
$filterConfigBody = [regex]::Match($ui, 'function hifiFilterConfig\([^)]*\)\s*\{[\s\S]*?\n\}')
if (-not $filterConfigBody.Success) {
  throw 'Could not locate hifiFilterConfig function body for the get:/bool( assertion.'
}
if ($filterConfigBody.Value -match 'get:\s*s\s*=>\s*\[bool\(') {
  throw 'No get: inside hifiFilterConfig may call bool( - conc/rit must produce canonical yes/no literals, not translated strings (T-04.1-16).'
}

# 11. 08-03: hifiFilterConfig NAO e mais chamada com um idioma de "versao
#     ativa" - nem o motor de filtro (useHifiAppState) nem as montagens de UI
#     tem esse conceito; todas usam uiLang (assercao 2 acima).
$packLangCalls = ([regex]::Matches($ui, 'hifiFilterConfig\(versionLang\)')).Count
if ($packLangCalls -ne 0) {
  throw "Expected zero calls to hifiFilterConfig(versionLang) - versionLang (a global active-version language) no longer exists (08-03); found $packLangCalls."
}

Write-Output 'Filter vocabulary (labels, school name, class label, yes/no) follows the interface language; filter values follow the pack or are canonical.'
