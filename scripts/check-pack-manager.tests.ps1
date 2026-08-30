$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$managerPath = Join-Path $repoRoot 'pack-manager.jsx'
$loaderPath = Join-Path $repoRoot 'spells-data-loader.jsx'
$i18nPath = Join-Path $repoRoot 'i18n.jsx'
$manager = Get-Content -Raw -LiteralPath $managerPath
$loader = Get-Content -Raw -LiteralPath $loaderPath
$i18n = Get-Content -Raw -LiteralPath $i18nPath

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

Write-Output 'Pack manager surface is wired, attributed and parity-checked.'
