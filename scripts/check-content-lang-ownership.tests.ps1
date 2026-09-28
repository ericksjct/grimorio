$ErrorActionPreference = 'Stop'

# Fase 04.1 plano 04 (D-01/D-03/D-05/D-06/D-16), realinhado na Fase 8 plano 03
# (D-06/D-22): quem e dono de cada string em v10-hifi.jsx. Regra geral: chrome
# derivado pelo app segue uiLang; conteudo vindo do pack (nome, descricao,
# bloco "em niveis superiores") segue o idioma da PROPRIA magia (s.lang) - nao
# existe mais uma "versao ativa" global desde a composicao aditiva (08-01),
# que mistura pacotes de idiomas diferentes na mesma grade. Os componentes de
# conteudo (HifiSpellCard/HifiDetailContent/HifiPrintCard) continuam com a
# prop `versionLang` - so os CALL SITES mudaram, de um `versionLang` de
# useHifiAppState pra `s.lang`/`shownSpell.lang`/`detailSpell.lang` por magia.
# Cada regiao de conteudo declara o proprio idioma via atributo lang (WCAG
# 3.1.1 + 3.1.2). Este script prova as duas metades ao mesmo tempo: as
# assercoes POSITIVAS provam que o conteudo segue o pacote de origem da
# magia e que a marcacao de regiao existe; as NEGATIVAS provam que nenhum
# call site ficou preso no idioma da interface nem sobrou o idioma global
# antigo (regressao de D-01/D-06/D-07/08-03).

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
#    os 5 sinks deste arquivo sao de uma linha so). `versionLang` aqui e a
#    PROP do componente (HifiSpellCard/HifiDetailContent/HifiPrintCard) -
#    quem alimenta essa prop em cada call site e s.lang (08-03), nao mais um
#    idioma global.
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

# 4. Assinaturas com as props de idioma de conteudo - continuam declarando
#    `versionLang` (o NOME da prop nao mudou em 08-03, so quem a alimenta).
if ($ui -notmatch 'function\s+HifiSpellCard\(\{[^}]*\bversionLang\b[^}]*\}\)') {
  throw 'HifiSpellCard signature must declare versionLang.'
}
if ($ui -notmatch 'function\s+HifiDetailContent\(\{[^}]*\bversionLang\b[^}]*\}\)') {
  throw 'HifiDetailContent signature must declare versionLang.'
}
if ($ui -notmatch 'function\s+HifiPrintCard\(\{[^}]*\buiLang\b[^}]*\bversionLang\b[^}]*\}\)') {
  throw 'HifiPrintCard signature must declare uiLang and versionLang (D-06).'
}

# 4b. 08-03: HifiSessionMode NAO declara mais `versionLang` - cada magia
#     preparada ja carrega o proprio `s.lang`, nao ha "idioma da sessao".
if ($ui -match 'function\s+HifiSessionMode\(\{[^}]*\bversionLang\b[^}]*\}\)') {
  throw '08-03: HifiSessionMode must NOT declare versionLang anymore - it derives content language per-spell (s.lang), not from a session-wide prop.'
}
if ($ui -notmatch 'function\s+HifiSessionMode\(\{[^}]*\}\)') {
  throw 'Could not locate the HifiSessionMode function signature in v10-hifi.jsx.'
}

# 5. buildSpellLink com exatamente um parametro (D-16 - parametro morto saiu).
if ($ui -notmatch 'function\s+buildSpellLink\(\s*s\s*\)\s*\{') {
  throw 'buildSpellLink must declare exactly one parameter (D-16).'
}

# 6. 08-03: busca e ordenacao passam a seguir o idioma da PROPRIA magia
#    (s.lang), nao mais um `versionLang` derivado de uma "versao ativa" unica
#    (essa deixou de existir na composicao aditiva, 08-01).
if ($ui -notmatch [regex]::Escape('hifiNorm(spellName(s, s.lang))')) {
  throw 'Search call site must use spellName(s, s.lang) - the name follows the spell''s OWN package (08-03).'
}
if (([regex]::Matches($ui, 'spellName\(([ab]), \1\.lang\)')).Count -lt 2) {
  throw 'Sort comparator call sites must use spellName(a, a.lang) / spellName(b, b.lang) - each spell sorts by its own package''s name (08-03).'
}

# 7. Assinatura (nao call site) de hifiShare com uiLang E versionLang na
#    lista de parametros - a unica forma estatica de pegar referencia a
#    variavel nao declarada num helper sem chamador (ver <inventory> do
#    plano 04.1-04). Sem call site hoje (08-03 nao muda isso).
if ($ui -notmatch 'function\s+hifiShare\s*\(\s*s\s*,\s*uiLang\s*,\s*versionLang\s*,\s*show\s*\)') {
  throw 'hifiShare declaration must be function hifiShare(s, uiLang, versionLang, show).'
}

# 8. Lista branca do comparador de React.memo de HifiSpellCard inclui
#    versionLang (a prop, agora alimentada por s.lang em todo call site).
if ($ui -notmatch 'prev\.versionLang\s*===\s*next\.versionLang') {
  throw "HifiSpellCard's React.memo comparator must compare prev.versionLang === next.versionLang."
}

# 9. 08-03: nenhum call site sobrou preso no `versionLang` de useHifiAppState
#    (essa variavel/memo foi removida - o idioma de conteudo agora e por
#    magia) nem no `const versionLang =` que a produzia.
if ($ui -match 'versionLang=\{versionLang\}') {
  throw '08-03: no versionLang={versionLang} call site may remain in v10-hifi.jsx - content language comes from the spell itself (s.lang/shownSpell.lang/detailSpell.lang).'
}
if ($ui -match 'const versionLang\s*=') {
  throw "08-03: v10-hifi.jsx must not declare a global 'const versionLang =' anymore - useHifiAppState's memo was removed; HifiPrintRoot's own payload fallback uses a differently-named local."
}

# ── NEGATIVAS ────────────────────────────────────────────────────────────

# 10. Nenhuma chamada spellName( com segundo argumento lang (regressao de
#     D-01 - nome deixaria de seguir o pack).
if ($ui -match 'spellName\([^)]*,\s*lang\s*\)') {
  throw 'No spellName( call site may pass lang as the second argument anymore (D-01).'
}

# 11. Nenhuma chamada as quatro funcoes v8* com segundo argumento lang
#     (regressao de D-01/D-03 - descricao/niveis superiores seguiriam a UI).
foreach ($fn in @('v8Description', 'v8DescriptionHtml', 'v8Upgrade', 'v8UpgradeHtml')) {
  if ($ui -match "$fn\([^)]*,\s*lang\s*\)") {
    throw "No $fn( call site may pass lang as the second argument anymore (D-01/D-03)."
  }
}

# 12. Nenhum rotulo de chrome no idioma do pack (D-07/T-04.1-13 - um
#     container declarando lang errado seria regressao de a11y, nao melhoria).
if ($ui -match 'tt\(versionLang,') {
  throw 'No tt(...) chrome lookup may use versionLang - labels always follow uiLang, never the pack (D-02/D-07).'
}

# 13. 08-03: idem para o idioma de uma magia especifica - chrome nunca le
#     s.lang (a mistura de pacotes de 08-01 tornaria isso ainda mais errado
#     que o antigo versionLang: cada magia teria seu proprio "chrome").
if ($ui -match 'tt\(s\.lang,') {
  throw 'No tt(...) chrome lookup may use s.lang - labels always follow uiLang, never a single spell''s package (D-02/D-07/08-03).'
}

Write-Output 'Content-language ownership: pack content follows each spell''s own package (s.lang), chrome follows uiLang, and each content region declares its own lang.'
