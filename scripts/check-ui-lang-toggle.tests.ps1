$ErrorActionPreference = 'Stop'

# Fase 04.1 plano 02 (D-09/D-10/D-13/D-14): HifiLangToggle deixa de ser um
# seletor de VERSAO disfarcado e vira o unico controle do idioma da
# INTERFACE. Este script prova que o toggle: (1) so escreve uiLang via
# window.__setUiLang, (2) nao consulta mais o registro de versoes, (3) esta
# montado nas duas telas (desktop + mobile), e (4) o VersionSelector fala o
# idioma da interface, nao o do pack.

$repoRoot = Split-Path -Parent $PSScriptRoot
$uiPath = Join-Path $repoRoot 'v10-hifi.jsx'
$ui = Get-Content -Raw -LiteralPath $uiPath

# 1. Assinatura: recebe uiLang, nao recebe versions/versionKey/onSwitch.
$toggleMatch = [regex]::Match($ui, 'function HifiLangToggle\([\s\S]{0,3000}?\n\}')
if (-not $toggleMatch.Success) {
  throw 'Could not locate HifiLangToggle in v10-hifi.jsx.'
}
$toggleBody = $toggleMatch.Value

$sigMatch = [regex]::Match($toggleBody, 'function HifiLangToggle\(\{[^)]*\}\)')
if (-not $sigMatch.Success) {
  throw 'Could not parse the HifiLangToggle signature.'
}
$sig = $sigMatch.Value
if ($sig -notmatch 'uiLang') {
  throw 'HifiLangToggle signature must accept uiLang.'
}
if ($sig -match 'versions|versionKey|onSwitch') {
  throw 'HifiLangToggle signature must not accept versions, versionKey or onSwitch anymore (D-09).'
}

# 2. As duas chamadas ao setter global, uma por idioma.
if ($toggleBody -notmatch "window\.__setUiLang\([^)]*'ptbr'\)") {
  throw "HifiLangToggle must call window.__setUiLang('ptbr') from its PT button."
}
if ($toggleBody -notmatch "window\.__setUiLang\([^)]*'en'\)") {
  throw "HifiLangToggle must call window.__setUiLang('en') from its EN button."
}

# 3. Atributos lang="pt-br" / lang="en" nos botoes (D-13, WCAG 3.1.2).
if ($toggleBody -notmatch 'lang="pt-br"') {
  throw 'HifiLangToggle PT button must carry lang="pt-br" (D-13).'
}
if ($toggleBody -notmatch 'lang="en"') {
  throw 'HifiLangToggle EN button must carry lang="en" (D-13).'
}

# 4. Bandeiras preservadas (D-14 - escolha explicita do usuario).
$brFlag = [System.Char]::ConvertFromUtf32(0x1F1E7) + [System.Char]::ConvertFromUtf32(0x1F1F7)
$usFlag = [System.Char]::ConvertFromUtf32(0x1F1FA) + [System.Char]::ConvertFromUtf32(0x1F1F8)
if ($toggleBody -notmatch [regex]::Escape($brFlag)) {
  throw 'HifiLangToggle must keep the 🇧🇷 flag (D-14).'
}
if ($toggleBody -notmatch [regex]::Escape($usFlag)) {
  throw 'HifiLangToggle must keep the 🇺🇸 flag (D-14).'
}

# 5. Nenhuma chamada a hifiSiblingVersion nem find() cru por idioma DENTRO do
#    corpo de HifiLangToggle - assercao com ESCOPO DE REGIAO (so o corpo do
#    toggle), para nao colidir com a chamada legitima em useEditionCompare.
if ($toggleBody -match 'hifiSiblingVersion\(') {
  throw 'HifiLangToggle must not call hifiSiblingVersion() - it no longer resolves sibling versions (D-09).'
}
if ($toggleBody -match 'versions\.find\(') {
  throw 'HifiLangToggle must not read the versions registry at all (D-09).'
}

# 6. hifiSiblingVersion continua declarada no arquivo (useEditionCompare
#    depende dela) - checagem no ARQUIVO INTEIRO, fora do escopo acima.
if ($ui -notmatch 'function\s+hifiSiblingVersion') {
  throw 'hifiSiblingVersion must still be declared - useEditionCompare depends on it.'
}
if ($ui -notmatch 'function\s+useEditionCompare\([\s\S]{0,2000}?hifiSiblingVersion\(') {
  throw 'useEditionCompare must still call hifiSiblingVersion() - it must not have gone dead.'
}

# 7. Montagem: HifiLangToggle so no desktop; no mobile o idioma vive na folha
#    "Mais" como seletor segmentado PT | EN (D-10 continua: os dois layouts tem
#    seletor). Nenhum dos dois passa onSwitch nem le o registro de versoes.
$mounts = [regex]::Matches($ui, '<HifiLangToggle\b[^/]*/>')
if ($mounts.Count -ne 1) {
  throw "HifiLangToggle must be mounted exactly once (desktop; mobile uses the segmented control, D-10) - found $($mounts.Count)."
}
$segmented = [regex]::Match($ui, 'className="hifi-segmented"[\s\S]{0,600}?</div>')
if (-not $segmented.Success) {
  throw 'Mobile language selector (hifi-segmented) not found (D-10).'
}
if ($segmented.Value -notmatch 'window\.__setUiLang') {
  throw 'Mobile language selector must switch only uiLang via window.__setUiLang (D-09).'
}
if ($segmented.Value -match 'versions|onSwitch') {
  throw 'Mobile language selector must not touch the versions registry nor onSwitch (D-09).'
}
foreach ($mount in $mounts) {
  if ($mount.Value -match 'onSwitch') {
    throw 'No HifiLangToggle mount may pass onSwitch anymore (D-09).'
  }
}

# 8. Alias de legibilidade `const uiLang = lang;` em HifiDesktop e HifiMobile.
$aliasCount = ([regex]::Matches($ui, 'const uiLang = lang;')).Count
if ($aliasCount -ne 2) {
  throw "Expected exactly 2 occurrences of 'const uiLang = lang;' (HifiDesktop + HifiMobile) - found $aliasCount."
}

# 9. O chip do menu de pacotes fala o idioma da interface (D-02); o antigo
#    VersionSelector nao pode ter sobrevivido a fase 08-06.
if ($ui -notmatch 'window\.PackMenuChip[\s\S]{0,120}?lang=\{uiLang\}') {
  throw 'window.PackMenuChip mount must receive lang={uiLang} (D-02).'
}
if ($ui -match 'window\.VersionSelector') {
  throw 'window.VersionSelector must not appear in v10-hifi.jsx anymore (08-06 removes the old selector).'
}

Write-Output 'HifiLangToggle controls the interface language, mounts in both screens, and does not consult the version registry.'
