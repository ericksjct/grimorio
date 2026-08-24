$ErrorActionPreference = 'Stop'

# Fase 04.1 plano 04 (D-01/D-03/D-05/D-06/D-16): quem e dono de cada string em
# v10-hifi.jsx. Regra geral: chrome derivado pelo app segue uiLang; conteudo
# vindo do pack (nome, descricao, bloco "em niveis superiores") segue
# versionLang; cada regiao de conteudo declara o proprio idioma via atributo
# lang (WCAG 3.1.1 + 3.1.2). Este script prova as duas metades ao mesmo tempo:
# as assercoes POSITIVAS provam que o conteudo migrou para versionLang e que
# a marcacao de regiao existe; as NEGATIVAS provam que nenhum call site ficou
# preso no idioma da interface (regressao de D-01/D-06/D-07).

$repoRoot = Split-Path -Parent $PSScriptRoot
$uiPath = Join-Path $repoRoot 'v10-hifi.jsx'
$ui = Get-Content -Raw -LiteralPath $uiPath

# ── POSITIVAS ────────────────────────────────────────────────────────────

# 1. Helper de conversao de idioma -> atributo HTML declarado.
if ($ui -notmatch 'function\s+hifiHtmlLang\s*\(') {
  throw 'Missing hifiHtmlLang(lang) helper (D-05).'
}

# 2. Exatamente 5 sinks dangerouslySetInnerHTML, cada um com
#    lang={hifiHtmlLang(versionLang)} no MESMO elemento (mesma linha - todos
#    os 5 sinks deste arquivo sao de uma linha so).
$sinkLines = [regex]::Matches($ui, '(?m)^.*dangerouslySetInnerHTML.*$')
if ($sinkLines.Count -ne 5) {
  throw "Expected exactly 5 dangerouslySetInnerHTML sinks (no new sink introduced) - found $($sinkLines.Count)."
}
foreach ($line in $sinkLines) {
  if ($line.Value -notmatch 'lang=\{hifiHtmlLang\(versionLang\)\}') {
    throw "A dangerouslySetInnerHTML sink is missing lang={hifiHtmlLang(versionLang)} on the same element: $($line.Value.Trim())"
  }
}

# 3. HifiSpellName declara a prop lang.
if ($ui -notmatch 'function\s+HifiSpellName\(\{[^}]*\blang\b[^}]*\}\)') {
  throw 'HifiSpellName must declare a lang prop (D-05, 6th content region).'
}

# 4. Assinaturas com as props de idioma novas.
if ($ui -notmatch 'function\s+HifiSpellCard\(\{[^}]*\bversionLang\b[^}]*\}\)') {
  throw 'HifiSpellCard signature must declare versionLang.'
}
if ($ui -notmatch 'function\s+HifiDetailContent\(\{[^}]*\bversionLang\b[^}]*\}\)') {
  throw 'HifiDetailContent signature must declare versionLang.'
}
if ($ui -notmatch 'function\s+HifiSessionMode\(\{[^}]*\bversionLang\b[^}]*\}\)') {
  throw 'HifiSessionMode signature must declare versionLang.'
}
if ($ui -notmatch 'function\s+HifiPrintCard\(\{[^}]*\buiLang\b[^}]*\bversionLang\b[^}]*\}\)') {
  throw 'HifiPrintCard signature must declare uiLang and versionLang (D-06).'
}

# 5. buildSpellLink com exatamente um parametro (D-16 - parametro morto saiu).
if ($ui -notmatch 'function\s+buildSpellLink\(\s*s\s*\)\s*\{') {
  throw 'buildSpellLink must declare exactly one parameter (D-16).'
}

# 6. Busca e ordenacao continuam em versionLang (template de D-01, nao pode
#    regredir).
if ($ui -notmatch "hifiNorm\(spellName\(s,\s*versionLang\)\)") {
  throw 'Search call site must still use spellName(s, versionLang).'
}
if (([regex]::Matches($ui, "spellName\([ab],\s*versionLang\)")).Count -lt 2) {
  throw 'Sort comparator call sites must still use spellName(a|b, versionLang).'
}

# 7. Assinatura (nao call site) de hifiShare com uiLang E versionLang na
#    lista de parametros - a unica forma estatica de pegar referencia a
#    variavel nao declarada num helper sem chamador (ver <inventory> do
#    plano 04.1-04).
if ($ui -notmatch 'function\s+hifiShare\s*\(\s*s\s*,\s*uiLang\s*,\s*versionLang\s*,\s*show\s*\)') {
  throw 'hifiShare declaration must be function hifiShare(s, uiLang, versionLang, show).'
}

# 8. Lista branca do comparador de React.memo de HifiSpellCard inclui
#    versionLang.
if ($ui -notmatch 'prev\.versionLang\s*===\s*next\.versionLang') {
  throw "HifiSpellCard's React.memo comparator must compare prev.versionLang === next.versionLang."
}

# ── NEGATIVAS ────────────────────────────────────────────────────────────

# 9. Nenhuma chamada spellName( com segundo argumento lang (regressao de
#    D-01 - nome deixaria de seguir o pack).
if ($ui -match 'spellName\([^)]*,\s*lang\s*\)') {
  throw 'No spellName( call site may pass lang as the second argument anymore (D-01).'
}

# 10. Nenhuma chamada as quatro funcoes v8* com segundo argumento lang
#     (regressao de D-01/D-03 - descricao/niveis superiores seguiriam a UI).
foreach ($fn in @('v8Description', 'v8DescriptionHtml', 'v8Upgrade', 'v8UpgradeHtml')) {
  if ($ui -match "$fn\([^)]*,\s*lang\s*\)") {
    throw "No $fn( call site may pass lang as the second argument anymore (D-01/D-03)."
  }
}

# 11. Nenhum rotulo de chrome no idioma do pack (D-07/T-04.1-13 - um
#     container declarando lang errado seria regressao de a11y, nao melhoria).
if ($ui -match 'tt\(versionLang,') {
  throw 'No tt(...) chrome lookup may use versionLang - labels always follow uiLang, never the pack (D-02/D-07).'
}

Write-Output 'Content-language ownership: pack content follows versionLang, chrome follows uiLang, and each content region declares its own lang.'
