$ErrorActionPreference = 'Stop'

# useEditionCompare used to pick "other" as the first entry with the same lang
# and a different key — that only made sense while the registry had exactly two
# entries per language. From 04-01 on the EN registry has at least four entries
# (2 SRD + 2 legacy) plus whatever the user installs, so the old heuristic would
# offer a third-party pack as if it were "the other edition". The fix matches by
# the declared `edition` field instead, and hides the button when the current
# version has no `edition` to compare against.
#
# Fase 8 plano 03 (D-22/Claude's Discretion): o comparador agora parte do
# pacote de ORIGEM da magia SELECIONADA (`sel._versionKey`), não de uma
# "versão ativa" global (essa deixou de existir na composição aditiva, 08-01).
# Homebrew (`corpus: 'pack'`) nunca ganha comparador — só faz sentido comparar
# edições dentro do SRD.

$repoRoot = Split-Path -Parent $PSScriptRoot
$uiPath = Join-Path $repoRoot 'v10-hifi.jsx'
$loaderPath = Join-Path $repoRoot 'spells-data-loader.jsx'
$ui = Get-Content -Raw -LiteralPath $uiPath
$loader = Get-Content -Raw -LiteralPath $loaderPath

# 1. Locate the body of useEditionCompare.
$fnMatch = [regex]::Match($ui, 'function useEditionCompare\([\s\S]{0,3000}?\n\}')
if (-not $fnMatch.Success) {
  throw 'Could not locate the useEditionCompare function body in v10-hifi.jsx.'
}
$fnBody = $fnMatch.Value

# 2. The `other` expression must compare `edition`, not just a different key.
$otherMatch = [regex]::Match($fnBody, 'const other = [\s\S]{0,300}?;\r?\n')
if (-not $otherMatch.Success) {
  throw 'Could not locate the `const other = ...` assignment inside useEditionCompare.'
}
$otherExpr = $otherMatch.Value
if ($otherExpr -notmatch 'edition') {
  throw '`other` selection must compare the `edition` field on version entries, not just the key.'
}
if ($otherExpr -notmatch 'v\.lang === cur\.lang') {
  throw '`other` selection must still match on the same `lang` as the current version.'
}
if ($otherExpr -match 'v\.key !== cur\.key' -and $otherExpr -notmatch 'edition !== cur\.edition') {
  throw 'The old key-only heuristic must not survive as the sole selection criterion — match by edition instead.'
}
if ($otherExpr -notmatch 'edition !== cur\.edition') {
  throw '`other` selection must exclude entries whose `edition` matches the current one (that is not "the other edition").'
}

# 2b. 08-03 (D-22): a assinatura perdeu o parametro `versionKey` - `cur` vem
#     do pacote de ORIGEM da magia selecionada (`sel._versionKey`), e o
#     comparador so ativa pra `corpus: 'srd'` (homebrew nunca ganha
#     comparador, Claude's Discretion).
if ($fnMatch.Value -notmatch 'function useEditionCompare\(\s*sel\s*,\s*versions\s*,\s*lang\s*,\s*showToast\s*\)') {
  throw '08-03: useEditionCompare signature must be function useEditionCompare(sel, versions, lang, showToast) - versionKey was removed.'
}
if ($fnBody -notmatch 'sel\._versionKey') {
  throw "08-03: useEditionCompare must derive `cur` from the selected spell's own package (sel._versionKey), not a global active version."
}
if ($fnBody -notmatch "cur\.corpus === 'srd'") {
  throw "08-03/D-22: useEditionCompare must gate `other` on cur.corpus === 'srd' - homebrew (corpus 'pack') never gets a comparator."
}

# 2c. 08-03: nao ha mais uma "versao ativa" global no arquivo inteiro.
if ($ui -match 'getCurrentSpellVersion') {
  throw '08-03: v10-hifi.jsx must not call window.getCurrentSpellVersion anymore - there is no single "active version" in the composition model (08-01).'
}

# 3. Cross-check: every builtin entry in the loader must declare `edition`, or
#    the comparator silently breaks for whichever entry forgets it.
$builtinMatch = [regex]::Match((Get-Content -Raw -LiteralPath (Join-Path $repoRoot 'packs/index.js')), 'BUILTIN_PACKS = \[[\s\S]*?\n\];')
if (-not $builtinMatch.Success) {
  throw 'Could not locate BUILTIN_VERSIONS in spells-data-loader.jsx.'
}
$entryLines = [regex]::Matches($builtinMatch.Value, '\{\s*"key":[\s\S]*?\}')
if ($entryLines.Count -lt 1) {
  throw 'Could not parse any BUILTIN_VERSIONS entries.'
}
foreach ($entry in $entryLines) {
  if ($entry.Value -notmatch "`"edition`":\s*`"[^`"]+`"") {
    throw "A BUILTIN_VERSIONS entry is missing a non-empty `edition` field: $($entry.Value)"
  }
}

# ── WR-07: PHB deve comparar com PHB, não com a SRD que ordena primeiro ────
foreach ($entry in $entryLines) {
  if ($entry.Value -notmatch "`"corpus`":\s*`"[^`"]+`"") {
    throw "WR-07: a BUILTIN_VERSIONS entry is missing a non-empty `corpus` field (used to prefer SRD<->SRD / PHB<->PHB pairs): $($entry.Value)"
  }
}

# ── CR-02 / WR-07: hifiSiblingVersion() continua declarado e continua sendo
# usado por useEditionCompare (Fase 04.1 plano 02 desmontou HifiLangToggle do
# registro de versoes: D-09 - o toggle agora so escreve uiLang via
# window.__setUiLang e nao consulta mais `versions`/hifiSiblingVersion. O
# guarda de nao-regressao que sobra e: o helper compartilhado continua vivo e
# useEditionCompare continua chamando-o - se qualquer um dos dois sumir, esta
# asserção falha.
$helperMatch = [regex]::Match($ui, 'function hifiSiblingVersion\([\s\S]{0,600}?\n\}')
if (-not $helperMatch.Success) {
  throw 'CR-02: could not locate the shared hifiSiblingVersion() helper in v10-hifi.jsx.'
}
$helperBody = $helperMatch.Value
if ($helperBody -notmatch 'v\.corpus\s*===\s*cur\.corpus') {
  throw "CR-02: hifiSiblingVersion() must prefer a same-`corpus` match (v.corpus === cur.corpus) before falling back to any other match."
}

$toggleMatch = [regex]::Match($ui, 'function HifiLangToggle\([\s\S]{0,3000}?\n\}')
if (-not $toggleMatch.Success) {
  throw 'Could not locate HifiLangToggle in v10-hifi.jsx.'
}
# Fase 04.1 plano 02, D-09: HifiLangToggle NAO consulta mais o registro de
# versoes nem hifiSiblingVersion() - controla so uiLang via
# window.__setUiLang. Uma chamada a hifiSiblingVersion aqui seria a fiacao
# antiga voltando por engano.
if ($toggleMatch.Value -match 'hifiSiblingVersion\(') {
  throw 'D-09: HifiLangToggle must not call hifiSiblingVersion() anymore - it no longer looks up the version registry; it only writes uiLang via window.__setUiLang.'
}
if ($toggleMatch.Value -match 'versions\.find\(') {
  throw 'D-09: HifiLangToggle must not consult `versions` at all - sibling/registry lookups belong to useEditionCompare only.'
}
if ($fnBody -notmatch 'hifiSiblingVersion\(') {
  throw 'CR-02/WR-07: useEditionCompare must select `other` through hifiSiblingVersion() too, not its own inline corpus logic.'
}

# ── WR-02: prova de execução real, não uma reimplementação da lógica ────────
# A versão anterior desta prova reimplementava a expressão de seleção em vez
# de ler a função de produção — testava a si mesma e continuava verde mesmo
# se `useEditionCompare`/`HifiLangToggle` fossem revertidos. Agora ela extrai
# hifiSiblingVersion() de v10-hifi.jsx via regex e faz eval nela mesma.
$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
  $nodeScript = @'
const fs = require('fs');
const m = fs.readFileSync('packs/index.js', 'utf8').match(/BUILTIN_PACKS = (\[[\s\S]*?\n\]);/);
if (!m) { console.error('nao achei BUILTIN_VERSIONS'); process.exit(1); }
const BUILTIN_VERSIONS = eval(m[1]);

const ui = fs.readFileSync('v10-hifi.jsx', 'utf8');
const helperMatch = ui.match(/function hifiSiblingVersion\([\s\S]*?\n\}/);
if (!helperMatch) { console.error('nao achei hifiSiblingVersion() em v10-hifi.jsx'); process.exit(1); }
// WR-02: eval na funcao de PRODUCAO de verdade, nao numa copia da logica.
eval(helperMatch[0]);

// WR-07: par preferencial por corpus, edicao diferente. Com a decomissao de
// 06-05 o registro so tem 2 entradas SRD - o par preferencial srd-2024-en
// deve resolver para srd-2014-en (mesmo corpus 'srd', edicao diferente).
const curSrd2024 = BUILTIN_VERSIONS.find(v => v.key === 'srd-2024-en');
const other = hifiSiblingVersion(BUILTIN_VERSIONS, curSrd2024, v => v.lang === curSrd2024.lang && v.edition && v.edition !== curSrd2024.edition);
if (!other || other.key !== 'srd-2014-en') {
  console.error('WR-07 FAIL: srd-2024-en compared against ' + (other ? other.key : 'null') + ', expected srd-2014-en');
  process.exit(1);
}

// CR-02: alternancia de idioma preferindo o mesmo corpus, agora com um pack
// BYOD sintetico no lugar do par PHB PT-BR/EN removido em 06-05. O registro
// e uma COPIA de BUILTIN_VERSIONS acrescida de uma entrada de pack; o irmao
// em lang 'en' da mesma edicao deve resolver pro SRD (mesmo corpus), nao
// para o pack (corpus diferente).
const withPack = BUILTIN_VERSIONS.concat([
  { key: 'plugin-teste', source: 'idb', lang: 'ptbr', edition: '5e 2024', corpus: 'pack', labelPt: 'Pack de teste', labelEn: 'Test pack', short: 'teste' },
]);
const curPack = withPack.find(v => v.key === 'plugin-teste');
const en = hifiSiblingVersion(withPack, curPack, v => v.lang === 'en' && v.edition === curPack.edition);
if (!en || en.key !== 'srd-2024-en') {
  console.error('CR-02 FAIL: pack BYOD (PT-BR) lang-toggle-EN resolved to ' + (en ? en.key : 'null') + ', expected srd-2024-en');
  process.exit(1);
}
console.log('WR-07/CR-02 ok: hifiSiblingVersion() prefers same-corpus pairs for both useEditionCompare and HifiLangToggle.');

// D-22/Claude's Discretion (08-03): extrai a expressao REAL de `const other =
// ...` de dentro de useEditionCompare via regex (nao uma reescrita) e avalia
// contra um `cur` de pacote homebrew (corpus 'pack') - deve dar null, mesmo
// tendo `edition` declarado.
const compareMatch = ui.match(/function useEditionCompare\([\s\S]*?\n\}/);
if (!compareMatch) { console.error('nao achei useEditionCompare() em v10-hifi.jsx'); process.exit(1); }
const otherExprMatch = compareMatch[0].match(/const other = ([\s\S]*?);\r?\n/);
if (!otherExprMatch) { console.error('nao achei "const other = ..." dentro de useEditionCompare()'); process.exit(1); }
const otherExprSrc = otherExprMatch[1];

const versionsWithHomebrew = BUILTIN_VERSIONS.concat([
  { key: 'plugin-homebrew', source: 'idb', lang: 'en', edition: '2024', corpus: 'pack', labelPt: 'Homebrew', labelEn: 'Homebrew', short: 'hb' },
]);
{
  // Escopo local: `cur`/`versions` sao lidos pela expressao extraida via eval.
  const versions = versionsWithHomebrew;
  const cur = versions.find(v => v.key === 'plugin-homebrew');
  const other = eval(otherExprSrc);
  if (other !== null) {
    console.error('D-22 FAIL: homebrew (corpus pack, com edition) ganhou comparador - other=' + JSON.stringify(other));
    process.exit(1);
  }
}
console.log('D-22 ok: homebrew (corpus pack) nunca ganha comparador de edicao, mesmo com `edition` declarado.');
'@
  $tmp = Join-Path ([System.IO.Path]::GetTempPath()) "check-edition-compare-$([guid]::NewGuid()).cjs"
  try {
    Set-Content -LiteralPath $tmp -Value $nodeScript -Encoding utf8NoBOM
    Push-Location $repoRoot
    try {
      $nodeOut = & node $tmp 2>&1
      $nodeExit = $LASTEXITCODE
    } finally {
      Pop-Location
    }
    if ($nodeExit -ne 0) {
      throw "WR-07/CR-02 runtime proof failed: $nodeOut"
    }
  } finally {
    if (Test-Path -LiteralPath $tmp) { Remove-Item -LiteralPath $tmp -Force }
  }
} else {
  Write-Warning 'node nao encontrado - prova de execucao do WR-07/CR-02 pulada (assercoes estruturais ja rodaram).'
}

Write-Output 'Edition comparator matches by declared edition, and every builtin version declares one.'
