$ErrorActionPreference = 'Stop'

# Fase 8, Plano 05 — menu único de pacotes (D-16). Este gate SUBSTITUI
# scripts/check-pack-manager.tests.ps1 (apagado no Plano 05 Task 2): as seções
# herdadas do gerenciador antigo continuam aqui, exceto as que falavam do
# VersionSelector/drawer (essas saem com a remoção do VersionSelector, 08-06).
#
# Task 1: só o modelo puro do cartão (_packColorIndex/_safeImage/_cardMetaVars)
# e a pluralização das contagens existentes (i18n). Tasks 2/3 estendem este
# arquivo com as seções portadas e as novas de PackMenu/PackMenuChip.

$repoRoot = Split-Path -Parent $PSScriptRoot
$managerPath = Join-Path $repoRoot 'pack-manager.jsx'
$loaderPath = Join-Path $repoRoot 'spells-data-loader.jsx'
$i18nPath = Join-Path $repoRoot 'i18n.jsx'
$hifiPath = Join-Path $repoRoot 'v10-hifi.jsx'
$manager = Get-Content -Raw -LiteralPath $managerPath
$loader = Get-Content -Raw -LiteralPath $loaderPath
$i18n = Get-Content -Raw -LiteralPath $i18nPath
$hifi = Get-Content -Raw -LiteralPath $hifiPath

# ── 1. Estrutura mínima do modelo do cartão ──

foreach ($needle in @('function _packColorIndex(', 'function _safeImage(', 'function _cardMetaVars(')) {
  if ($manager -notlike "*$needle*") {
    throw "Missing pack-manager.jsx card-model implementation detail: $needle"
  }
}

# ── 2. Estrutura do módulo (Task 2 — PackMenu substitui PackManager) ──

foreach ($needle in @(
  'function PackMenu(',
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

# ── 3. Contrato com o storage — leitura sempre vem do store, nunca de cópia local ──

if ($manager -notlike '*pluginStore.listPacks*') {
  throw "pack-manager.jsx must read the installed-packs list via window.pluginStore.listPacks() - never a locally persisted copy."
}
if ($manager -like '*pluginStore.putPack*') {
  throw "pack-manager.jsx must not write packs (pluginStore.putPack) - selection/removal only, install stays in PackImportDialog."
}

# ── 4. Reatividade — re-render a partir do evento, com cleanup ──

if ($manager -notlike '*hifi-plugins-changed*') {
  throw "pack-manager.jsx must subscribe to hifi-plugins-changed and re-run listPacks() - it must never keep its own copy of the packs list."
}
if ($manager -notmatch 'removeEventListener') {
  throw "pack-manager.jsx's hifi-plugins-changed subscription is missing a removeEventListener cleanup."
}

# ── 5. Atribuição CC-BY (SRD-02/D-13/D-14) — texto verbatim, nunca HTML bruto ──

foreach ($needle in @('getVersionMeta', '<details', '<summary', 'license.attribution')) {
  if ($manager -notlike "*$needle*") {
    throw "Missing CC-BY attribution wiring in pack-manager.jsx: $needle"
  }
}
if ($manager -like '*dangerouslySetInnerHTML*') {
  throw "pack-manager.jsx must not use dangerouslySetInnerHTML - D-14 requires the CC-BY attribution to render verbatim as a React text child; introducing this sink would recreate the HTML-sanitization surface D-14 exists to avoid."
}

# ── 6. Prova de fidelidade legal — 5.1 e 5.2 carregam textos distintos ──

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

# ── 7. Estado vazio (MGMT-05) — só a seção de instalados fica vazia ──

foreach ($needle in @('manager.emptyHeading', 'manager.emptyBody', 'pack-docs.html', 'import.open')) {
  if ($manager -notlike "*$needle*") {
    throw "Missing empty-state wiring in pack-manager.jsx: $needle"
  }
}

# ── 8. Guarda D-19 — nenhuma dereferência de lista sem checar comprimento ──

if ($manager -like '*|| versions[0]*') {
  throw "D-19: pack-manager.jsx repeats the guardless '|| versions[0]' pattern - dereferencing the result without a length check first."
}
if ($manager -like '*|| packs[0]*') {
  throw "D-19: pack-manager.jsx repeats the guardless '|| packs[0]' pattern - dereferencing the result without a length check first."
}

# ── 9. Proibição P-01 — nunca escreve em dado de personagem ──

if ($manager -like '*localStorage*') {
  throw "P-01: pack-manager.jsx must never touch localStorage (character prepared/bookmarked data) - removing/renaming a pack must never destroy the user's authored data."
}

# ── 10. Paridade i18n das chaves manager.* ──

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

# ── 11. Loader — meta dos builtins alcançável em runtime ──

foreach ($needle in @('window.getVersionMeta', '_metaCache')) {
  if ($loader -notlike "*$needle*") {
    throw "Missing loader wiring for pack manager in spells-data-loader.jsx: $needle"
  }
}

# ── 12. Índice de magias (MGMT-04) ──

foreach ($needle in @('function packSpellIndex', 'window.packSpellIndex', 'new Map(', 'window.hifiSpellKey')) {
  if ($manager -notlike "*$needle*") {
    throw "Missing spell index wiring in pack-manager.jsx: $needle"
  }
}
if ($manager -like '*s.school}-*') {
  throw "pack-manager.jsx redefines the hifiSpellKey formula ('`${s.school}-...') instead of reusing window.hifiSpellKey from v10-hifi.jsx - this would create a second, divergent concept of preparation-key identity."
}

# ── 13. Regra de mesma obra (A-05) ──

if ($manager -notmatch "corpus.{0,40}'srd'") {
  throw "A-05: pack-manager.jsx is missing a corpus comparison against 'srd' - without it, every SRD spell would count as a duplicate of the other edition, drowning the MGMT-04 signal in noise."
}

# ── 14. Curto-circuito de custo ──

if ($manager -notmatch "'idb'") {
  throw "Missing cost short-circuit in pack-manager.jsx: a user with zero installed packs must not pay the parse cost of both SRD JSONs just to build the spell index."
}

# ── 15. Remoção (MGMT-02) ──

foreach ($needle in @('pluginStore.deletePack', 'refreshPluginVersions', 'hifi-toast', 'manager.removeConfirm', 'manager.impactPrepared')) {
  if ($manager -notlike "*$needle*") {
    throw "Missing pack removal wiring in pack-manager.jsx: $needle"
  }
}

# ── 16. Proibição P-01 (D-07) — remoção nunca escreve em dado de personagem ──

foreach ($needle in @('localStorage', 'persistCharacters', 'persistBookmarks', 'togglePreparedFor', 'toggleBookmarkedFor')) {
  if ($manager -like "*$needle*") {
    throw "P-01: pack-manager.jsx must never write character data ($needle) - removing a pack must never destroy the user's authored data; this is what lets prepared spells resolve again on reinstall."
  }
}

# ── 17. Um nível de overlay (D-05) ──

$dialogCount = ([regex]::Matches($manager, 'role="dialog"')).Count
if ($dialogCount -ne 1) {
  throw "D-05: pack-manager.jsx must contain exactly 1 role=`"dialog`" - found $dialogCount. The inline remove confirmation must never become a second stacked dialog."
}

# ── 18. Paridade i18n das chaves de remoção/duplicata (Task 1: agora com sufixo .one/.other) ──

$removalKeys = @(
  'manager.remove', 'manager.removeConfirm', 'manager.yes', 'manager.no', 'manager.impactPrepared.one',
  'manager.impactPrepared.other', 'manager.impactBookmarked.one', 'manager.impactBookmarked.other',
  'manager.impactNone', 'manager.removed', 'manager.removeFailed', 'manager.duplicates'
)
foreach ($key in $removalKeys) {
  $count = ([regex]::Matches($i18n, [regex]::Escape("'$key'"))).Count
  if ($count -ne 2) {
    throw "i18n.jsx does not have exactly 2 occurrences of $key (one per ptbr/en block) - found $count"
  }
}

# ── 19. Tom das mensagens — nada é "perdido", só deixa de resolver (D-07) ──

foreach ($needle in @('perder', 'perdida', 'lose', 'lost')) {
  $badLines = ($i18n -split "`n") | Where-Object { $_ -like "*manager.impact*" -and $_ -like "*$needle*" }
  if ($badLines) {
    throw "Tone violation in i18n.jsx: a manager.impact* line contains '$needle' - nothing is lost when a pack is removed (D-07), the keys stay intact and resolve again on reinstall."
  }
}

# ── 20. Motor de enumeração intacto (D-18) ──

if ($loader -notmatch 'const SPELL_VERSIONS\s*=\s*BUILTIN_VERSIONS\.slice\(\)') {
  throw "D-18: spells-data-loader.jsx's SPELL_VERSIONS registry initialization changed - this plan's work is surface only, the Phase 4 enumeration engine must not be rewritten."
}
if ($loader -notmatch 'function refreshPluginVersions') {
  throw "D-18: spells-data-loader.jsx is missing refreshPluginVersions - this plan's work is surface only, the Phase 4 enumeration engine must not be rewritten."
}

# ── 21. Nota de duplicata no detalhe (MGMT-04/D-09) ──

if ($hifi -notlike '*spell.alsoIn*') {
  throw "MGMT-04/D-09: v10-hifi.jsx's spell detail is missing the 'Também em: ...' note."
}
if ($hifi -notlike '*packSpellIndex*') {
  throw "MGMT-04/D-09: v10-hifi.jsx's spell detail does not consume window.packSpellIndex() for the duplicate note."
}

# ── 22. Sem sink novo de HTML bruto (contagem travada em 5) ──
# planner-discipline-allow: dangerouslySetInnerHTML

$sinkLines = [regex]::Matches($hifi, '(?m)^.*dangerouslySetInnerHTML.*$')
if ($sinkLines.Count -ne 5) {
  throw "v10-hifi.jsx must contain exactly 5 dangerouslySetInnerHTML sinks - found $($sinkLines.Count). The duplicate note is plain text and must not introduce a 6th sink."
}

# ── 23. Sem badge de duplicata no grid (D-09) ──

$cardMatch = [regex]::Match($hifi, 'const HifiSpellCard = React\.memo\(function HifiSpellCard[\s\S]{0,8000}?\r?\n\);')
if (-not $cardMatch.Success) {
  throw "Could not locate HifiSpellCard's body in v10-hifi.jsx to check for a duplicate badge."
}
if ($cardMatch.Value -like '*alsoIn*' -or $cardMatch.Value -like '*packSpellIndex*') {
  throw "D-09: HifiSpellCard must not render a duplicate badge/marker - the grid has hundreds of items and a per-duplicate marker becomes constant visual noise."
}

# ── 24. CR-01 — byKey indexa TODA versão, não só idb + srd ──

if ($manager -notlike '*function _indexPopulation*') {
  throw "CR-01: pack-manager.jsx must split the index population - _indexPopulation() separates the resolution set (every version, PHB included) from the display set (idb + srd only)."
}
$popMatch = [regex]::Match($manager, 'function _indexPopulation\(\)[\s\S]{0,1200}?\r?\n\}')
if (-not $popMatch.Success) {
  throw "Could not locate _indexPopulation's body in pack-manager.jsx."
}
if ($popMatch.Value -notlike '*resolution: versions*') {
  throw "CR-01: _indexPopulation must expose the UNFILTERED version list as resolution - filtering it is what made removal impact overstate the damage."
}
if ($popMatch.Value -notlike "*v.source === 'idb' || v.corpus === 'srd'*") {
  throw "CR-01: _indexPopulation must still restrict the DISPLAY set to idb + srd (A-01) - widening it would make every SRD row announce ~322 duplicates."
}

$buildMatch = [regex]::Match($manager, 'async function _buildSpellIndex\(\)[\s\S]{0,4000}?\r?\n\}')
if (-not $buildMatch.Success) {
  throw "Could not locate _buildSpellIndex's body in pack-manager.jsx."
}
if ($buildMatch.Value.Contains('SPELL_VERSIONS || []).filter')) {
  throw "CR-01: _buildSpellIndex must not re-filter SPELL_VERSIONS inline - the resolution/display split belongs in _indexPopulation()."
}

# ── 25. CR-02 — byName e byKey guardam Set, nunca array ──

if ($buildMatch.Value -notlike '*byName.set(nameKey, new Set())*') {
  throw "CR-02: byName entries must be Set, not array - array entries let a pack listing a spell twice defeat the single-source test in staleKey."
}
if ($buildMatch.Value -notlike '*byKey.set(k, new Set())*') {
  throw "CR-02: byKey entries must be Set, not array - array entries let a pack listing a spell twice defeat the single-source test in staleKey."
}
if ($buildMatch.Value -like '*.push(v.key)*') {
  throw "CR-02: _buildSpellIndex must add to the index with Set.add, not Array.push - push is what allowed duplicate sources."
}

$impactMatch = [regex]::Match($manager, 'function _removalImpact\([\s\S]{0,2000}?\r?\n\}')
if (-not $impactMatch.Success) {
  throw "Could not locate _removalImpact's body in pack-manager.jsx."
}
if ($impactMatch.Value -notlike '*sources.size === 1*' -or $impactMatch.Value -notlike '*sources.has(versionKey)*') {
  throw "CR-02: staleKey must test sources.size === 1 and sources.has(versionKey) on a Set - the old length===1 array form silently mis-reported duplicated entries."
}

# ── 26. PackMenu novo (D-16): seleção por checkbox, seção de reservados, limites de layout ──

foreach ($needle in @(
  'type="checkbox"',
  'window.setSelectedVersionKeys',
  'window.normalizeSelection',
  'window.getSelectedVersionKeys',
  'loadReservedSlugs',
  'menu.sectionReserved',
  'menu.reservedSubitem',
  'menu.cardMeta',
  'var(--level-',
  '_safeImage(',
  'min(72vh, 640px)',
  '80vh',
  "overflowWrap: 'anywhere'",
  "textOverflow: 'ellipsis'",
  "aria-label={tt(lang, 'manager.remove')}"
)) {
  if ($manager -notlike "*$needle*") {
    throw "Missing PackMenu implementation detail in pack-manager.jsx: $needle"
  }
}
if ($manager -like '*function PackManager(*') {
  throw "pack-manager.jsx must not keep the old function PackManager( - the single pack menu (PackMenu) replaces it entirely (D-16)."
}

# ── 27. Chip do topo, raiz com âncora/sheet e renomeação disparada na seleção (D-10/D-12/D-13/D-18) ──

foreach ($needle in @(
  'function PackMenuChip(',
  'aria-haspopup="dialog"',
  'getBoundingClientRect',
  '▾',
  'async function _selectionConflicts(',
  'detectSlugConflicts',
  'slugOwnersOf',
  'renameInstalledPackSlugs',
  'window.PackRenameDialog',
  'renameImpact',
  "'rename'"
)) {
  if ($manager -notlike "*$needle*") {
    throw "Missing PackMenuChip/rename wiring in pack-manager.jsx: $needle"
  }
}
if ($manager -notmatch 'opts\s*&&\s*opts\.anchor') {
  throw "MGMT-09/D-18: window.__openPackManager must keep accepting a call with no argument (opts && opts.anchor guard) - transition-banner.jsx calls it with zero args."
}

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  Write-Warning 'node nao encontrado - provas de execucao puladas.'
  Write-Output 'check-pack-menu structural skip: node not found.'
  return
}

# ── 2. Prova de execução real das 3 funções puras + comportamento i18n ──
# Extrai as funções de PRODUÇÃO por regex (o .jsx tem JSX e não roda inteiro no
# node — mesmo molde de scripts/check-edition-compare.tests.ps1), monta um
# window.packImport a partir das constantes REAIS de pack-import.jsx (nunca uma
# cópia hardcoded do teto/regex) e usa tt/i18nPlural reais de i18n.jsx.

$nodeScript = @'
const fs = require('fs');
const vm = require('vm');

const managerSrc = fs.readFileSync('pack-manager.jsx', 'utf8');
const importSrc = fs.readFileSync('pack-import.jsx', 'utf8');
const i18nSrc = fs.readFileSync('i18n.jsx', 'utf8');

let failures = 0;
function check(label, cond) {
  if (!cond) { console.error('FAIL: ' + label); failures++; }
}

// Constantes reais de pack-import.jsx — nunca reimplementadas aqui.
const maxImageMatch = importSrc.match(/const MAX_IMAGE_CHARS = ([^;]+);/);
const imageUriMatch = importSrc.match(/const IMAGE_DATA_URI = (\/[\s\S]*?\/);/);
if (!maxImageMatch || !imageUriMatch) {
  console.error('nao encontrei MAX_IMAGE_CHARS/IMAGE_DATA_URI em pack-import.jsx');
  process.exit(1);
}
const MAX_IMAGE_CHARS = eval(maxImageMatch[1]);
const IMAGE_DATA_URI = eval(imageUriMatch[1]);

// i18n real, rodado em vm — captura tt() e window.i18nPlural (plural).
const sandbox = { console };
sandbox.globalThis = sandbox;
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(i18nSrc, sandbox);
const tt = sandbox.tt;
const i18nPlural = sandbox.i18nPlural;
if (typeof tt !== 'function' || typeof i18nPlural !== 'function') {
  console.error('nao consegui capturar tt()/i18nPlural de i18n.jsx');
  process.exit(1);
}

// Extrai as 3 funções puras de pack-manager.jsx (sem JSX) e as avalia contra
// um window sintético que expõe packImport (real) e tt/i18nPlural (real).
function extractFn(name) {
  const re = new RegExp('function ' + name + '\\([\\s\\S]*?\\n\\}');
  const m = managerSrc.match(re);
  if (!m) { console.error('nao encontrei function ' + name + '() em pack-manager.jsx'); process.exit(1); }
  return m[0];
}

const fnSandbox = {
  window: { packImport: { MAX_IMAGE_CHARS, IMAGE_DATA_URI }, i18nPlural },
  tt,
  console,
};
vm.createContext(fnSandbox);
vm.runInContext(extractFn('_packColorIndex') + '\nthis.__packColorIndex = _packColorIndex;', fnSandbox);
vm.runInContext(extractFn('_safeImage') + '\nthis.__safeImage = _safeImage;', fnSandbox);
vm.runInContext(extractFn('_cardMetaVars') + '\nthis.__cardMetaVars = _cardMetaVars;', fnSandbox);
const _packColorIndex = fnSandbox.__packColorIndex;
const _safeImage = fnSandbox.__safeImage;
const _cardMetaVars = fnSandbox.__cardMetaVars;

// ── _packColorIndex ──
const idx1 = _packColorIndex('srd-2024-en');
const idx2 = _packColorIndex('srd-2024-en');
check('_packColorIndex devolve inteiro 0..9', Number.isInteger(idx1) && idx1 >= 0 && idx1 <= 9);
check('_packColorIndex e determinístico (mesma entrada, mesma saida)', idx1 === idx2);
const idxEmpty = _packColorIndex('');
check("_packColorIndex('') e 0..9", Number.isInteger(idxEmpty) && idxEmpty >= 0 && idxEmpty <= 9);

// ── _safeImage ──
const validPng = 'data:image/png;base64,iVBORw0KGgo=';
check('_safeImage aceita data: URI raster valido', _safeImage(validPng) === validPng);
check('_safeImage rejeita URL externa', _safeImage('https://x/a.png') === null);
check('_safeImage rejeita SVG', _safeImage('data:image/svg+xml;base64,PHN2Zz4=') === null);
check('_safeImage rejeita nao-string', _safeImage(42) === null);
const tooLong = 'data:image/png;base64,' + 'A'.repeat(MAX_IMAGE_CHARS);
check('_safeImage rejeita string maior que MAX_IMAGE_CHARS', _safeImage(tooLong) === null);

// ── _cardMetaVars ──
const vars1 = _cardMetaVars({ author: '', version: '1.0', lang: 'ptbr', edition: '2024', count: 1 }, 'ptbr');
check('_cardMetaVars author vira menu.authorUnknown quando vazio', vars1.author === tt('ptbr', 'menu.authorUnknown'));
check("_cardMetaVars lang vira 'PT' pra ptbr", vars1.lang === 'PT');
check("_cardMetaVars edition vira ' · 2024'", vars1.edition === ' · 2024');
check('_cardMetaVars n = 1', vars1.n === 1);
check('_cardMetaVars nounSpell singular em n=1', vars1.nounSpell === tt('ptbr', 'noun.spell.one'));

const vars2 = _cardMetaVars({ author: 'Fulano', version: '2.0', lang: 'en', count: 3 }, 'en');
check('_cardMetaVars sem edition vira string vazia', vars2.edition === '');
check("_cardMetaVars lang vira 'EN' pra en", vars2.lang === 'EN');

const vars3 = _cardMetaVars({ author: 'Fulano', version: '2.0', lang: 'en', count: 'not-a-number' }, 'en');
check("_cardMetaVars count nao numerico vira n = '?'", vars3.n === '?');
check('_cardMetaVars count nao numerico usa nounSpell plural', vars3.nounSpell === tt('en', 'noun.spell.other'));

// ── _chipLabel (Task 3, D-18) — contra o BUILTIN_VERSIONS real do loader ──
const loaderSrc = fs.readFileSync('spells-data-loader.jsx', 'utf8');
const builtinMatch = loaderSrc.match(/const BUILTIN_VERSIONS = (\[[\s\S]*?\n\]);/);
if (!builtinMatch) { console.error('nao encontrei BUILTIN_VERSIONS em spells-data-loader.jsx'); process.exit(1); }
const BUILTIN_VERSIONS = eval(builtinMatch[1]);

vm.runInContext(extractFn('_chipLabel') + '\nthis.__chipLabel = _chipLabel;', fnSandbox);
const _chipLabel = fnSandbox.__chipLabel;

check("_chipLabel(['srd-2024-en'], versions) === 'SRD 5.2'", _chipLabel(['srd-2024-en'], BUILTIN_VERSIONS) === 'SRD 5.2');
check("_chipLabel(['srd-2024-en','srd-2024-ptbr','plugin-x'], versions) === 'SRD 5.2 +2'",
  _chipLabel(['srd-2024-en', 'srd-2024-ptbr', 'plugin-x'], BUILTIN_VERSIONS) === 'SRD 5.2 +2');
check("_chipLabel([], versions) === ''", _chipLabel([], BUILTIN_VERSIONS) === '');
check("_chipLabel(['chave-desconhecida'], versions) === '' (D-19, sem desreferenciar undefined)", _chipLabel(['chave-desconhecida'], BUILTIN_VERSIONS) === '');

// ── i18n.jsx: chaves novas de pluralizacao (behavior do Plano 05 Task 1) ──
const i18nSandbox = { console };
i18nSandbox.globalThis = i18nSandbox;
vm.createContext(i18nSandbox);
vm.runInContext(i18nSrc + '\nthis.__STRINGS = STRINGS;', i18nSandbox);
const STRINGS = i18nSandbox.__STRINGS;

['ptbr', 'en'].forEach((lang) => {
  ['manager.impactPrepared.one', 'manager.impactPrepared.other', 'manager.impactBookmarked.one', 'manager.impactBookmarked.other'].forEach((key) => {
    check(`STRINGS.${lang}['${key}'] existe`, typeof STRINGS[lang][key] === 'string' && STRINGS[lang][key].length > 0);
  });
  check(`STRINGS.${lang}['manager.impactPrepared.one'] contem {n},{c},{nounChar}`,
    ['{n}', '{c}', '{nounChar}'].every((ph) => STRINGS[lang]['manager.impactPrepared.one'].includes(ph)));
  check(`STRINGS.${lang}['manager.duplicates'] contem {nounSpell}`, STRINGS[lang]['manager.duplicates'].includes('{nounSpell}'));
  check(`STRINGS.${lang}['manager.duplicates'] nao contem "presentes"/"present"`,
    !/presentes|present/i.test(STRINGS[lang]['manager.duplicates']));
});
check("STRINGS.ptbr nao tem mais 'manager.impactPrepared' sem sufixo", !Object.prototype.hasOwnProperty.call(STRINGS.ptbr, 'manager.impactPrepared'));
check("STRINGS.ptbr nao tem mais 'manager.impactBookmarked' sem sufixo", !Object.prototype.hasOwnProperty.call(STRINGS.ptbr, 'manager.impactBookmarked'));
check("STRINGS.en nao tem mais 'manager.impactPrepared' sem sufixo", !Object.prototype.hasOwnProperty.call(STRINGS.en, 'manager.impactPrepared'));
check("STRINGS.en nao tem mais 'manager.impactBookmarked' sem sufixo", !Object.prototype.hasOwnProperty.call(STRINGS.en, 'manager.impactBookmarked'));

if (failures > 0) {
  console.error(failures + ' verificacao(oes) falharam.');
  process.exit(1);
}
console.log('Modelo puro do cartao (_packColorIndex/_safeImage/_cardMetaVars) e pluralizacao das contagens existentes ok.');
'@

$tmp = Join-Path ([System.IO.Path]::GetTempPath()) "check-pack-menu-$([guid]::NewGuid()).cjs"
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
    throw "Pack menu card-model proof failed: $nodeOut"
  }
  Write-Output $nodeOut
} finally {
  if (Test-Path -LiteralPath $tmp) { Remove-Item -LiteralPath $tmp -Force }
}
