$ErrorActionPreference = 'Stop'

# Endurecimento do loader apos a revisao de codigo da Fase 4 (04-REVIEW.md).
# Cobre os blockers CR-01 e CR-03, cada um com uma assercao estrutural e --
# onde da -- uma prova de execucao em Node. CR-02 (preferencia pendente de UM
# item, `_wantedVersionKey`) foi superado pela Fase 8: a pendencia agora e por
# item dentro da propria lista de selecao (ver check-selection-migration.tests.ps1).

$repoRoot = Split-Path -Parent $PSScriptRoot
$loaderPath = Join-Path $repoRoot 'spells-data-loader.jsx'
$loader = Get-Content -Raw -LiteralPath $loaderPath
$hifiPath = Join-Path $repoRoot 'v10-hifi.jsx'
$hifi = Get-Content -Raw -LiteralPath $hifiPath

# ── CR-03: tabelas de lookup sem prototipo ────────────────────────
# adaptSpell() indexa CLASS_PT / CLASS_EN / SOURCE_CODE / SCHOOL_INDEX com
# strings vindas direto do JSON de um pack de terceiro. Com um literal comum,
# a chave 'constructor' (ou 'toString', 'valueOf', ...) devolve uma FUNCAO
# herdada do prototipo -- truthy, entao o `|| c` de fallback nao salva. Ela
# entra em `classes` e explode em v10-hifi.jsx quando alguem chama .charAt().
foreach ($table in @('SCHOOL_INDEX', 'CLASS_PT', 'CLASS_EN', 'SOURCE_CODE')) {
  if ($loader -notmatch "const\s+$table\s*=\s*Object\.assign\(\s*Object\.create\(null\)") {
    throw "CR-03: $table must be built with Object.assign(Object.create(null), {...}) - a plain object literal returns inherited functions for keys like 'constructor', and pack data is untrusted."
  }
}

# ── CR-01: hifiFilterConfig() sem prototipo (mesma classe de defeito do CR-03,
# so que em v10-hifi.jsx) ──────────────────────────────────────────
# useHifiAppState monta filters[key] a partir de qualquer ?f.*= na URL, sem
# whitelist de chave, e depois indexa hifiFilterConfig() com esse key. Com um
# literal comum, ?f.constructor= devolve a funcao Object herdada -- truthy,
# entao o guard `sel && sel.size && def` nao salva e def.get(s) estoura dentro
# do render (ErrorBoundary permanente, o link nunca se recupera sozinho).
if ($hifi -notmatch "function hifiFilterConfig\([^)]*\)\s*\{[\s\S]*?return\s+Object\.assign\(\s*Object\.create\(null\)") {
  throw "CR-01: hifiFilterConfig() must return Object.assign(Object.create(null), {...}) - a plain object literal returns the inherited 'constructor' function for a ?f.constructor= URL param, and that value is truthy where the filter code expects a filter definition or undefined."
}

# ── IN-06: ?f.*= só pode aplicar as chaves que hifiShareViewUrl realmente
# emite (class/level/school) - essas são as únicas com chip visível em
# extraFilters pra desfazer. hifiFilterConfig() conhece 10 chaves; um
# `?f.src=` ou `?f.duration=` à mão aplicava um filtro real e invisível.
# A janela de captura precisa caber o bloco inteiro: ele cresceu com a
# normalizacao pt -> en da classe (CR-01 da Fase 04.1). A assercao abaixo e a
# mesma; so a janela acompanhou o tamanho do bloco.
$urlViewMatch = [regex]::Match($hifi, "if \(key\.startsWith\('f\.'\)\)[\s\S]{0,2000}?\r?\n\s*\}")
if (-not $urlViewMatch.Success) {
  throw "IN-06: could not locate the ?f.*= URL-parsing block in v10-hifi.jsx (key.startsWith('f.'))."
}
if ($urlViewMatch.Value -notmatch "\['class', 'level', 'school'\]\.includes\(k\)") {
  throw "IN-06: the ?f.*= URL parser must narrow accepted keys to ['class', 'level', 'school'] (what hifiShareViewUrl actually emits) - accepting all 10 hifiFilterConfig keys lets a hand-crafted URL apply a real filter with no visible chip to undo it."
}

# ── CR-01: nenhum ciclo de re-render (generalizado pra N chaves, Fase 8) ──
# buildSpellsFromRealData() disparava hifi-spells-source-changed sempre que o
# cache estava vazio; o listener de useSpellVersions chama a funcao de novo.
# Falhas nao sao cacheadas de proposito, e o redirect de chave desconhecida
# cacheia sob a chave DEFAULT -- nos dois casos o cache continua vazio e o
# ciclo nao termina. Generalizado pra composicao aditiva: so avisa quando
# TODAS as chaves resolvidas preencheram o cache (`.every(`), nao so uma.
$buildSpellsMatch = [regex]::Match($loader, 'function buildSpellsFromRealData\(uiLang\)[\s\S]{0,2000}?\r?\n\}')
if (-not $buildSpellsMatch.Success) {
  throw 'CR-01: could not locate buildSpellsFromRealData(uiLang) body in spells-data-loader.jsx.'
}
if ($buildSpellsMatch.Value -notmatch 'keys\.every\(k => _cache\[k\]\)\)\s*\{[\s\S]{0,200}?dispatchEvent') {
  throw 'CR-01: buildSpellsFromRealData() must only dispatch hifi-spells-source-changed when EVERY resolved key (keys.every(k => _cache[k])) is populated - dispatching on a partial cache re-enters through the useSpellVersions listener and loops forever.'
}
# Fase 8: o reparo de "chave pendurada" (uma unica _currentVersion que sumiu
# do registro) generaliza para a composicao inteira - _refreshPluginVersionsInner
# recalcula a selecao resolvida ANTES e DEPOIS do splice/push e so avisa a UI
# se o conjunto resolvido realmente mudou (nunca uma troca silenciosa, P-01).
$innerBodyMatch = [regex]::Match($loader, 'async function _refreshPluginVersionsInner\(\)[\s\S]{0,6000}?\r?\n\}')
if (-not $innerBodyMatch.Success) {
  throw 'CR-01: could not locate _refreshPluginVersionsInner() body in spells-data-loader.jsx.'
}
$innerBody = $innerBodyMatch.Value
$beforeIdx = $innerBody.IndexOf('resolveSelection(_selectedKeys)')
$spliceIdx = $innerBody.IndexOf('SPELL_VERSIONS.splice(')
$afterIdx = $innerBody.IndexOf('resolveSelection(_selectedKeys)', $spliceIdx + 1)
if ($beforeIdx -lt 0 -or $spliceIdx -lt 0 -or $afterIdx -lt 0 -or -not ($beforeIdx -lt $spliceIdx -and $spliceIdx -lt $afterIdx)) {
  throw 'CR-01: _refreshPluginVersionsInner() must call resolveSelection(_selectedKeys) both BEFORE and AFTER the SPELL_VERSIONS splice/push, to detect whether the resolved composition actually changed.'
}
if ($innerBody -notmatch "dispatchEvent\(new CustomEvent\('hifi-spells-source-changed'") {
  throw 'CR-01: _refreshPluginVersionsInner() must dispatch hifi-spells-source-changed when the resolved selection changes after enumeration.'
}

# ── WR-05: nao inventar escola/edicao pra um pack de terceiro ─────
# Um schoolIdx nao reconhecido (SCHOOL_INDEX[chave] === undefined) tinha que
# propagar null (honesto), nao 4/Evocacao. A prova de execucao do CR-03 acima
# usa 'constructor' como escola e so checa `typeof !== 'number' && !== null` -
# isso passa tanto com null quanto com o antigo `: 4` (tambem numero), entao
# nao pega uma reversao. Esta asserção estrutural pega o literal exato.
if ($loader -notmatch "school: typeof schoolIdx === 'number' \? schoolIdx : null") {
  throw "WR-05: adaptSpell() must propagate null for an unrecognized school, not default to 4 (Evocação) - a third-party pack whose school name does not match SCHOOL_INDEX must not silently render as a specific school."
}

# ── Prova de execucao: CR-03 pelo adaptSpell real ─────────────────
# Roda o adaptSpells() de verdade, do arquivo de producao, com uma magia cujo
# class/source usam nomes de propriedade do prototipo.
$nodeScript = @'
const fs = require('fs');
const src = fs.readFileSync('spells-data-loader.jsx', 'utf8');

// Recorta antes de buildSpellsFromRealData: dali pra frente ha hooks React
// (useSpellVersions), que o vm puro nao parseia. As tabelas de lookup e
// adaptSpell/adaptSpells -- o que este teste exercita -- vem todos antes.
const cut = src.indexOf('function buildSpellsFromRealData');
if (cut < 0) { console.error('nao achei buildSpellsFromRealData para cortar'); process.exit(1); }
const body = src.slice(0, cut);

const sandbox = {
  window: { location: { href: 'http://localhost/' }, addEventListener() {}, dispatchEvent() {} },
  localStorage: { getItem: () => '{}', setItem() {} },
  navigator: { language: 'pt-BR', languages: ['pt-BR'] },
  document: undefined,
  URL,
  console,
};
sandbox.globalThis = sandbox;

const vm = require('vm');
vm.createContext(sandbox);
vm.runInContext(body + '\nthis.__adaptSpells = adaptSpells;', sandbox);
const adaptSpells = sandbox.__adaptSpells;

const hostile = {
  spells: [{
    name: 'proto-probe',
    displayName: 'Proto Probe',
    level: 1,
    school: 'constructor',
    class: ['constructor', 'toString', 'valueOf'],
    source: 'constructor',
    description: '<p>ok</p>',
  }],
};

const out = adaptSpells(hostile, 'ptbr', '5e 2024');
const s = out[0];

const bad = [];
for (const c of (s.classes || [])) {
  if (typeof c !== 'string') bad.push('classes item is ' + typeof c);
}
for (const c of (s.classesPt || [])) {
  if (typeof c !== 'string') bad.push('classesPt item is ' + typeof c);
}
for (const c of (s.classesEn || [])) {
  if (typeof c !== 'string') bad.push('classesEn item is ' + typeof c);
}
if (typeof s.src !== 'string') bad.push('src is ' + typeof s.src);
// WR-05: um nome de escola nao reconhecido ('constructor', que nao existe em
// SCHOOL_INDEX) tem que propagar EXATAMENTE null - nao 4 (Evocacao antiga) e
// nao um valor herdado do prototipo (funcao/objeto). Checar so
// "typeof !== 'number' && !== null" nao pegaria uma reversao pro antigo `: 4`,
// que tambem e number.
if (s.school !== null) bad.push('school is ' + JSON.stringify(s.school) + ', expected null for an unrecognized school name');

// O consumidor real em v10-hifi.jsx:991 faz exatamente isto.
try {
  (s.classes || []).map(c => (c ? c.charAt(0).toUpperCase() + c.slice(1) : c)).join(', ');
} catch (e) {
  bad.push('v10-hifi render path throws: ' + e.message);
}

if (bad.length) {
  console.error('CR-03 FAIL: ' + bad.join(' | '));
  process.exit(1);
}
console.log('CR-03 ok: prototype-named keys produce only strings/numbers');
'@

# WR-12: o harness costumava ser escrito na RAIZ DO REPO (a mesma pasta que o
# GitHub Pages publica) e nao estava no .gitignore - uma execucao interrompida
# ou morta pulava o `finally` e deixava o arquivo pra tras, pronto pra um
# `git add .` commitar e publicar por acidente. O temp dir do SO nunca pode
# acabar num deploy. `-Encoding utf8NoBOM` evita o BOM que
# `-Encoding UTF8` emite no Windows PowerShell 5.1 (Node tolera, mas o CR-03
# de cima ja usa a versao sem BOM por consistencia).
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  Write-Warning 'node nao encontrado - prova de execucao do CR-03 pulada (assercoes estruturais ja rodaram).'
} else {
  $tmp = Join-Path ([System.IO.Path]::GetTempPath()) "check-loader-hardening-$([guid]::NewGuid()).cjs"
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
      throw "CR-03 runtime proof failed: $nodeOut"
    }
  } finally {
    if (Test-Path -LiteralPath $tmp) { Remove-Item -LiteralPath $tmp -Force }
  }
}

Write-Output 'Loader hardening contract present (CR-01 loop guard generalized to N resolved keys + hifiFilterConfig prototype-less, CR-03 prototype-less lookup tables).'
