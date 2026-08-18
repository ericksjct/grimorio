$ErrorActionPreference = 'Stop'

# Endurecimento do loader apos a revisao de codigo da Fase 4 (04-REVIEW.md).
# Cobre os tres blockers CR-01, CR-02 e CR-03, cada um com uma assercao
# estrutural e -- onde da -- uma prova de execucao em Node.

$repoRoot = Split-Path -Parent $PSScriptRoot
$loaderPath = Join-Path $repoRoot 'spells-data-loader.jsx'
$loader = Get-Content -Raw -LiteralPath $loaderPath

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

# ── CR-02: preferencia pendente nao pode ser reaplicada para sempre ─
# _wantedVersionKey era atribuido uma vez na carga do modulo e nunca limpo, e
# refreshPluginVersions() o reaplicava a cada chamada -- importar um pack fazia
# o app voltar sozinho para a versao do boot (proibicao P-01).
if ($loader -notmatch '_wantedVersionKey\s*=\s*null;[^\n]*\n?[^\n]*' ) {
  throw 'CR-02: _wantedVersionKey is never cleared - a pending preference must be consumed once, not re-applied on every refreshPluginVersions() call.'
}
$clearCount = ([regex]::Matches($loader, '_wantedVersionKey\s*=\s*null')).Count
if ($clearCount -lt 2) {
  throw "CR-02: expected at least 2 assignments of _wantedVersionKey = null (the initial declaration plus at least one clear-after-consume), found $clearCount."
}
if ($loader -notmatch 'function setCurrentVersion\([^)]*\)\s*\{[^}]*_wantedVersionKey\s*=\s*null') {
  throw 'CR-02: setCurrentVersion() must clear _wantedVersionKey - any effective version change cancels a pending preference (P-01).'
}

# ── CR-01: nenhum ciclo de re-render ──────────────────────────────
# buildSpellsFromRealData() disparava hifi-spells-source-changed sempre que o
# cache estava vazio; o listener de useSpellVersions chama a funcao de novo.
# Falhas nao sao cacheadas de proposito, e o redirect de chave desconhecida
# cacheia sob a chave DEFAULT -- nos dois casos o cache continua vazio e o
# ciclo nao termina.
if ($loader -notmatch 'loadVersion\(key\)\.then\(\s*\(\)\s*=>\s*\{[^}]*if\s*\(_cache\[key\]\)') {
  throw 'CR-01: buildSpellsFromRealData() must only dispatch hifi-spells-source-changed when _cache[key] was actually populated - dispatching unconditionally re-enters through the useSpellVersions listener and loops forever.'
}
# Raiz do caso da chave pendurada: refreshPluginVersions() pode remover a
# entrada idb que estava selecionada, deixando _currentVersion sem resolver.
if ($loader -notmatch '!_versionByKey\(_currentVersion\)[\s\S]{0,400}?setCurrentVersion\(_defaultVersion\(\)\.key\)') {
  throw 'CR-01: refreshPluginVersions() must repair a dangling _currentVersion after splicing idb entries out - otherwise the selected key resolves to nothing and every render retries forever.'
}

# ── Prova de execucao: CR-03 pelo adaptSpell real ─────────────────
# Roda o adaptSpells() de verdade, do arquivo de producao, com uma magia cujo
# class/source usam nomes de propriedade do prototipo.
$nodeScript = @'
const fs = require('fs');
const src = fs.readFileSync('spells-data-loader.jsx', 'utf8');

// Recorta antes de buildSpellsFromRealData: dali pra frente ha hooks React e
// JSX (VersionSelector), que o vm puro nao parseia. As tabelas de lookup e
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
if (typeof s.school !== 'number') bad.push('school is ' + typeof s.school);

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

$tmp = Join-Path $repoRoot '_check_loader_hardening.cjs'
try {
  Set-Content -LiteralPath $tmp -Value $nodeScript -Encoding UTF8
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

Write-Output 'Loader hardening contract present (CR-01 loop guard, CR-02 pending-preference consume, CR-03 prototype-less lookup tables).'
