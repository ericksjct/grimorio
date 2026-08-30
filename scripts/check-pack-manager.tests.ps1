$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$managerPath = Join-Path $repoRoot 'pack-manager.jsx'
$loaderPath = Join-Path $repoRoot 'spells-data-loader.jsx'
$i18nPath = Join-Path $repoRoot 'i18n.jsx'
$hifiPath = Join-Path $repoRoot 'v10-hifi.jsx'
$manager = Get-Content -Raw -LiteralPath $managerPath
$loader = Get-Content -Raw -LiteralPath $loaderPath
$i18n = Get-Content -Raw -LiteralPath $i18nPath
$hifi = Get-Content -Raw -LiteralPath $hifiPath

# ── 1. Estrutura do módulo ──

foreach ($needle in @(
  'function PackManager(',
  'function PackManagerRoot(',
  'role="dialog"',
  'aria-modal="true"',
  'useDialogA11y',
  'window.__openPackManager',
  'Object.assign(window'
)) {
  if ($manager -notlike "*$needle*") {
    throw "Missing pack-manager.jsx implementation detail: $needle"
  }
}

# ── 2. Contrato com o storage — leitura sempre vem do store, nunca de cópia local ──

if ($manager -notlike '*pluginStore.listPacks*') {
  throw "pack-manager.jsx must read the installed-packs list via window.pluginStore.listPacks() - never a locally persisted copy."
}
if ($manager -like '*pluginStore.putPack*') {
  throw "pack-manager.jsx must not write packs (pluginStore.putPack) - this plan (05-01) is read-only surface."
}

# ── 3. Reatividade — re-render a partir do evento, com cleanup ──

if ($manager -notlike '*hifi-plugins-changed*') {
  throw "pack-manager.jsx must subscribe to hifi-plugins-changed and re-run listPacks() - it must never keep its own copy of the packs list."
}
if ($manager -notmatch 'removeEventListener') {
  throw "pack-manager.jsx's hifi-plugins-changed subscription is missing a removeEventListener cleanup."
}

# ── 4. Atribuição CC-BY (SRD-02/D-13/D-14) — texto verbatim, nunca HTML bruto ──

foreach ($needle in @('getVersionMeta', '<details', '<summary', 'license.attribution')) {
  if ($manager -notlike "*$needle*") {
    throw "Missing CC-BY attribution wiring in pack-manager.jsx: $needle"
  }
}
if ($manager -like '*dangerouslySetInnerHTML*') {
  throw "pack-manager.jsx must not use dangerouslySetInnerHTML - D-14 requires the CC-BY attribution to render verbatim as a React text child; introducing this sink would recreate the HTML-sanitization surface D-14 exists to avoid."
}

# ── 5. Prova de fidelidade legal — 5.1 e 5.2 carregam textos distintos ──

$srd2014 = Get-Content -Raw -LiteralPath (Join-Path $repoRoot 'srd-2014-en.json') | ConvertFrom-Json
$srd2024 = Get-Content -Raw -LiteralPath (Join-Path $repoRoot 'srd-2024-en.json') | ConvertFrom-Json
$attr2014 = $srd2014.meta.license.attribution
$attr2024 = $srd2024.meta.license.attribution
if ([string]::IsNullOrWhiteSpace($attr2014)) {
  throw "srd-2014-en.json meta.license.attribution is empty."
}
if ([string]::IsNullOrWhiteSpace($attr2024)) {
  throw "srd-2024-en.json meta.license.attribution is empty."
}
if ($attr2014 -eq $attr2024) {
  throw "srd-2014-en.json and srd-2024-en.json report the SAME meta.license.attribution - SRD 5.1 and 5.2 carry distinct legal text, so equality means the extraction is wrong."
}

# ── 6. Estado vazio (MGMT-05) ──

foreach ($needle in @('manager.emptyHeading', 'manager.emptyBody', 'pack-docs.html', 'import.open')) {
  if ($manager -notlike "*$needle*") {
    throw "Missing empty-state wiring in pack-manager.jsx: $needle"
  }
}

# ── 7. Guarda D-19 — nenhuma dereferência de lista sem checar comprimento ──
# VersionSelector desreferencia currentVer.lang logo depois de
# `versions.find(...) || versions[0]`; nenhuma superfície nova pode repetir
# esse padrão sem checar length === 0 antes.

if ($manager -like '*|| versions[0]*') {
  throw "D-19: pack-manager.jsx repeats the guardless '|| versions[0]' pattern that crashes VersionSelector on an empty list - dereferencing the result without a length check first."
}
if ($manager -like '*|| packs[0]*') {
  throw "D-19: pack-manager.jsx repeats the guardless '|| packs[0]' pattern - dereferencing the result without a length check first."
}

# ── 8. Proibição P-01 — nunca escreve em dado de personagem ──

if ($manager -like '*localStorage*') {
  throw "P-01: pack-manager.jsx must never touch localStorage (character prepared/bookmarked data) - removing a pack must never destroy the user's authored data."
}

# ── 9. Paridade i18n das chaves manager.* ──

$managerKeys = @(
  'manager.title', 'manager.sectionInstalled', 'manager.sectionBuiltin', 'manager.originInstalled',
  'manager.originBuiltin', 'manager.spellCount', 'manager.spellCountUnknown', 'manager.versionLabel',
  'manager.license', 'manager.modifications', 'manager.emptyHeading', 'manager.emptyBody', 'manager.loading'
)
foreach ($key in $managerKeys) {
  $count = ([regex]::Matches($i18n, [regex]::Escape("'$key'"))).Count
  if ($count -ne 2) {
    throw "i18n.jsx does not have exactly 2 occurrences of $key (one per ptbr/en block) - found $count"
  }
}

# ── 10. Loader — meta dos builtins alcançável em runtime ──

foreach ($needle in @('window.getVersionMeta', '_metaCache')) {
  if ($loader -notlike "*$needle*") {
    throw "Missing loader wiring for pack manager in spells-data-loader.jsx: $needle"
  }
}

# ── 11. Índice de magias (MGMT-04) ──

foreach ($needle in @('function packSpellIndex', 'window.packSpellIndex', 'new Map(', 'window.hifiSpellKey')) {
  if ($manager -notlike "*$needle*") {
    throw "Missing spell index wiring in pack-manager.jsx: $needle"
  }
}
if ($manager -like '*s.school}-*') {
  throw "pack-manager.jsx redefines the hifiSpellKey formula ('`${s.school}-...') instead of reusing window.hifiSpellKey from v10-hifi.jsx - this would create a second, divergent concept of preparation-key identity."
}

# ── 12. Regra de mesma obra (A-05) ──

if ($manager -notmatch "corpus.{0,40}'srd'") {
  throw "A-05: pack-manager.jsx is missing a corpus comparison against 'srd' - without it, every SRD spell would count as a duplicate of the other edition, drowning the MGMT-04 signal in noise."
}

# ── 13. Curto-circuito de custo ──

if ($manager -notmatch "'idb'") {
  throw "Missing cost short-circuit in pack-manager.jsx: a user with zero installed packs must not pay the parse cost of both SRD JSONs just to build the spell index."
}

# ── 14. Remoção (MGMT-02) ──

foreach ($needle in @('pluginStore.deletePack', 'refreshPluginVersions', 'hifi-toast', 'manager.removeConfirm', 'manager.impactPrepared')) {
  if ($manager -notlike "*$needle*") {
    throw "Missing pack removal wiring in pack-manager.jsx: $needle"
  }
}

# ── 15. Proibição P-01 (D-07) — remoção nunca escreve em dado de personagem ──

foreach ($needle in @('localStorage', 'persistCharacters', 'persistBookmarks', 'togglePreparedFor', 'toggleBookmarkedFor')) {
  if ($manager -like "*$needle*") {
    throw "P-01: pack-manager.jsx must never write character data ($needle) - removing a pack must never destroy the user's authored data; this is what lets prepared spells resolve again on reinstall."
  }
}

# ── 16. Um nível de overlay (D-05) ──

$dialogCount = ([regex]::Matches($manager, 'role="dialog"')).Count
if ($dialogCount -ne 1) {
  throw "D-05: pack-manager.jsx must contain exactly 1 role=`"dialog`" - found $dialogCount. The inline remove confirmation must never become a second stacked dialog."
}

# ── 17. Paridade i18n das 10 chaves novas de remoção/duplicata ──

$removalKeys = @(
  'manager.remove', 'manager.removeConfirm', 'manager.yes', 'manager.no', 'manager.impactPrepared',
  'manager.impactBookmarked', 'manager.impactNone', 'manager.removed', 'manager.removeFailed', 'manager.duplicates'
)
foreach ($key in $removalKeys) {
  $count = ([regex]::Matches($i18n, [regex]::Escape("'$key'"))).Count
  if ($count -ne 2) {
    throw "i18n.jsx does not have exactly 2 occurrences of $key (one per ptbr/en block) - found $count"
  }
}

# ── 18. Tom das mensagens — nada é "perdido", só deixa de resolver (D-07) ──

foreach ($needle in @('perder', 'perdida', 'lose', 'lost')) {
  $badLines = ($i18n -split "`n") | Where-Object { $_ -like "*manager.impact*" -and $_ -like "*$needle*" }
  if ($badLines) {
    throw "Tone violation in i18n.jsx: a manager.impact* line contains '$needle' - nothing is lost when a pack is removed (D-07), the keys stay intact and resolve again on reinstall."
  }
}

# ── 19. Gatilho desktop (MGMT-03/D-02) — VersionSelector, ambos os ramos ──

$verManageInLoader = ([regex]::Matches($loader, 'version\.manage')).Count
if ($verManageInLoader -lt 2) {
  throw "MGMT-03/D-02: spells-data-loader.jsx must render the 'Gerenciar pacotes...' item in both VersionSelector branches (compact and desktop) - found $verManageInLoader occurrences of version.manage."
}
if ($loader -notlike '*__openPackManager*') {
  throw "MGMT-03/D-02: spells-data-loader.jsx's VersionSelector is missing the window.__openPackManager trigger."
}

# ── 20. Guarda D-19 ──

if ($loader -notlike '*if (!currentVer) return null;*') {
  throw "D-19: spells-data-loader.jsx must guard VersionSelector with 'if (!currentVer) return null;' - versions[0] is undefined for an empty list and currentVer.lang is dereferenced right after."
}

# ── 21. Motor de enumeração intacto (D-18) ──

if ($loader -notmatch 'const SPELL_VERSIONS\s*=\s*BUILTIN_VERSIONS\.slice\(\)') {
  throw "D-18: spells-data-loader.jsx's SPELL_VERSIONS registry initialization changed - MGMT-03's remaining work is surface only, the Phase 4 enumeration engine must not be rewritten."
}
if ($loader -notmatch 'function refreshPluginVersions') {
  throw "D-18: spells-data-loader.jsx is missing refreshPluginVersions - MGMT-03's remaining work is surface only, the Phase 4 enumeration engine must not be rewritten."
}

# ── 22. Gatilho mobile (D-02) — drawer VERSÃO ──

if ($hifi -notlike '*version.manage*') {
  throw "D-02: v10-hifi.jsx's drawer VERSÃO section is missing the 'Gerenciar pacotes' row."
}
if ($hifi -notlike '*__openPackManager*') {
  throw "D-02: v10-hifi.jsx's drawer VERSÃO row is missing the window.__openPackManager trigger."
}

# ── 23. Nota de duplicata no detalhe (MGMT-04/D-09) ──

if ($hifi -notlike '*spell.alsoIn*') {
  throw "MGMT-04/D-09: v10-hifi.jsx's spell detail is missing the 'Também em: ...' note."
}
if ($hifi -notlike '*packSpellIndex*') {
  throw "MGMT-04/D-09: v10-hifi.jsx's spell detail does not consume window.packSpellIndex() for the duplicate note."
}

# ── 24. Sem sink novo de HTML bruto (contagem travada em 5) ──
# planner-discipline-allow: dangerouslySetInnerHTML

$sinkLines = [regex]::Matches($hifi, '(?m)^.*dangerouslySetInnerHTML.*$')
if ($sinkLines.Count -ne 5) {
  throw "v10-hifi.jsx must contain exactly 5 dangerouslySetInnerHTML sinks - found $($sinkLines.Count). The duplicate note is plain text and must not introduce a 6th sink."
}

# ── 25. Sem badge de duplicata no grid (D-09) ──

$cardMatch = [regex]::Match($hifi, 'const HifiSpellCard = React\.memo\(function HifiSpellCard[\s\S]{0,8000}?\r?\n\);')
if (-not $cardMatch.Success) {
  throw "Could not locate HifiSpellCard's body in v10-hifi.jsx to check for a duplicate badge."
}
if ($cardMatch.Value -like '*alsoIn*' -or $cardMatch.Value -like '*packSpellIndex*') {
  throw "D-09: HifiSpellCard must not render a duplicate badge/marker - the grid has hundreds of items and a per-duplicate marker becomes constant visual noise."
}

# ── 26. Paridade i18n — version.manage e spell.alsoIn ──

foreach ($key in @('version.manage', 'spell.alsoIn')) {
  $count = ([regex]::Matches($i18n, [regex]::Escape("'$key'"))).Count
  if ($count -ne 2) {
    throw "i18n.jsx does not have exactly 2 occurrences of $key (one per ptbr/en block) - found $count"
  }
}

Write-Output 'Pack manager surface is wired, attributed and parity-checked.'
