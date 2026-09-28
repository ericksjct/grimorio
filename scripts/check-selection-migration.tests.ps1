$ErrorActionPreference = 'Stop'

# Fase 8 (Task 2): troca de estado — seleção crua persistida pelo loader,
# migração do versionKey legado, `?v=` em lista, pendência/poda por item e
# toast de fallback (D-01, D-04, D-07, D-23, D-24). Molde de
# check-migration-version-fallback.tests.ps1: asserções estruturais + prova de
# execução em Node contra o arquivo de produção real, um contexto `vm` NOVO
# por cenário (a seleção inicial é lida na avaliação do módulo).

$repoRoot = Split-Path -Parent $PSScriptRoot
$loaderPath = Join-Path $repoRoot 'spells-data-loader.jsx'
$loader = Get-Content -Raw -LiteralPath $loaderPath

# ── Asserções estruturais ──────────────────────────────────────────
foreach ($needle in @(
  'function _initialSelection(',
  'function _persistSelection(',
  'function setSelectedVersionKeys(',
  'window.getSelectedVersionKeys = getSelectedVersionKeys;',
  'window.getResolvedVersionKeys = getResolvedVersionKeys;',
  'window.setSelectedVersionKeys = setSelectedVersionKeys;',
  'window.invalidateSpellVersion = invalidateSpellVersion;',
  'window.normalizeSelection = normalizeSelection;',
  'menu.toastFallbackToDefault'
)) {
  if (-not $loader.Contains($needle)) {
    throw "Missing spells-data-loader.jsx selection-state detail: $needle"
  }
}

foreach ($forbidden in @('_currentVersion', '_wantedVersionKey', 'function setCurrentVersion', 'hasPendingSpellVersion', 'toast.versionSwitchedAway')) {
  if ($loader.Contains($forbidden)) {
    throw "spells-data-loader.jsx must no longer contain: $forbidden - the single-active-version model was replaced by a persisted selection list (D-01)."
  }
}

# ── index.html: sem estado de versão (Task 3, D-07) ─────────────────
$indexPath = Join-Path $repoRoot 'index.html'
$index = Get-Content -Raw -LiteralPath $indexPath
foreach ($forbidden in @('versionKey', 'hasPendingSpellVersion', 'getCurrentSpellVersion', 'hifi-spells-source-changed')) {
  if ($index.Contains($forbidden)) {
    throw "index.html must no longer contain: $forbidden - the loader owns the package selection AND its persistence end to end (D-07); index.html only persists theme/mode/character/language."
  }
}

# ── Prova de execução real (Node), um vm novo por cenário ──────────
$nodeScript = @'
const fs = require('fs');
const vm = require('vm');
const src = fs.readFileSync('spells-data-loader.jsx', 'utf8');

const cut = src.indexOf('function buildSpellsFromRealData');
if (cut < 0) { console.error('nao achei buildSpellsFromRealData para cortar'); process.exit(1); }
const body = src.slice(0, cut);

function makeSandbox(opts) {
  opts = opts || {};
  const store = {};
  if (opts.prefsRaw !== undefined) {
    store['spellbook-ui-prefs'] = opts.prefsRaw;
  } else if (opts.prefs !== undefined) {
    store['spellbook-ui-prefs'] = JSON.stringify(opts.prefs);
  }
  const listeners = {};
  const events = [];
  class CustomEvent {
    constructor(type, init) { this.type = type; this.detail = init && init.detail; }
  }
  const win = {
    location: { href: opts.href || 'http://localhost/' },
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    dispatchEvent(evt) { events.push(evt); (listeners[evt.type] || []).forEach(fn => fn(evt)); return true; },
    tt: (lang, key) => key,
    pluginStore: opts.pluginStore || undefined,
  };
  const sandbox = {
    window: win,
    localStorage: {
      getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
    },
    navigator: {
      language: opts.language || 'en-US',
      languages: opts.languages || [opts.language || 'en-US'],
    },
    URL,
    console,
    CustomEvent,
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(
    body + '\nthis.__x = { getSelectedVersionKeys, getResolvedVersionKeys, setSelectedVersionKeys, refreshPluginVersions, resolveSelection, normalizeSelection, _isFallback, _readPrefs, _browserDefaultKey };',
    sandbox
  );
  return { x: sandbox.__x, win, events, store };
}

let failures = 0;
function check(label, cond) {
  if (!cond) { console.error('FAIL: ' + label); failures++; }
}
function arrEq(a, b) {
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => v === b[i]);
}
function readPrefsBlob(store) {
  return JSON.parse(store['spellbook-ui-prefs']);
}

// 1. prefs { versionKey: 'srd-2014-en' } -> selectedVersionKeys, no versionKey field.
{
  const { x, store } = makeSandbox({ prefs: { versionKey: 'srd-2014-en' } });
  check("prefs.versionKey='srd-2014-en' -> getSelectedVersionKeys() === ['srd-2014-en']",
    arrEq(x.getSelectedVersionKeys(), ['srd-2014-en']));
  const blob = readPrefsBlob(store);
  check("blob.selectedVersionKeys === ['srd-2014-en'] and blob.versionKey is gone",
    arrEq(blob.selectedVersionKeys, ['srd-2014-en']) && !('versionKey' in blob));
}

// 2. prefs { versionKey: 'spells-5E-2024-PTBR' } -> legacy fallback to srd-2024-ptbr.
{
  const { x, win } = makeSandbox({ prefs: { versionKey: 'spells-5E-2024-PTBR' } });
  check("legacy versionKey 'spells-5E-2024-PTBR' -> getSelectedVersionKeys() === ['srd-2024-ptbr']",
    arrEq(x.getSelectedVersionKeys(), ['srd-2024-ptbr']));
  check('window.__legacyVersionFallback === { from, to }',
    win.__legacyVersionFallback
    && win.__legacyVersionFallback.from === 'spells-5E-2024-PTBR'
    && win.__legacyVersionFallback.to === 'srd-2024-ptbr');
}

// 3. prefs { versionKey: 'plugin-meupack' } -> raw stays, resolved falls to default, blob keeps raw.
{
  const { x, store } = makeSandbox({ prefs: { versionKey: 'plugin-meupack' }, language: 'en-US' });
  check("unresolvable versionKey 'plugin-meupack' -> raw selection stays ['plugin-meupack']",
    arrEq(x.getSelectedVersionKeys(), ['plugin-meupack']));
  check('unresolvable versionKey -> resolved falls back to default (srd-2024-en for en-US)',
    arrEq(x.getResolvedVersionKeys(), ['srd-2024-en']));
  const blob = readPrefsBlob(store);
  check('blob.selectedVersionKeys stores the RAW pending key, not the resolved default',
    arrEq(blob.selectedVersionKeys, ['plugin-meupack']));
}

// 4. ?v=srd-2024-en,plugin-x (comma list) and single-value back-compat.
{
  const { x } = makeSandbox({ href: 'http://localhost/?v=srd-2024-en,plugin-x' });
  check("?v=srd-2024-en,plugin-x -> raw ['srd-2024-en','plugin-x'], resolved ['srd-2024-en']",
    arrEq(x.getSelectedVersionKeys(), ['srd-2024-en', 'plugin-x']) && arrEq(x.getResolvedVersionKeys(), ['srd-2024-en']));
}
{
  const { x } = makeSandbox({ href: 'http://localhost/?v=srd-2024-en' });
  check('?v=srd-2024-en (single value, back-compat) -> [srd-2024-en]',
    arrEq(x.getSelectedVersionKeys(), ['srd-2024-en']));
}

// 5. ?v=srd-2014-en,srd-2024-en -> last SRD in the list wins its edition (A-01).
{
  const { x } = makeSandbox({ href: 'http://localhost/?v=srd-2014-en,srd-2024-en' });
  check('?v=srd-2014-en,srd-2024-en -> [srd-2024-en] (A-01: last SRD wins)',
    arrEq(x.getSelectedVersionKeys(), ['srd-2024-en']));
}

// 6. Pitfall 1: prefs.selectedVersionKeys === [] stays [] (never rewritten to the default).
{
  const { x, store } = makeSandbox({ prefs: { selectedVersionKeys: [] }, language: 'en-US' });
  check('empty persisted selection stays [] (raw)', arrEq(x.getSelectedVersionKeys(), []));
  check('empty persisted selection resolves to [default]', arrEq(x.getResolvedVersionKeys(), ['srd-2024-en']));
  const blob = readPrefsBlob(store);
  check('Pitfall 1: blob.selectedVersionKeys stays [] on re-persist, never [defaultKey]', arrEq(blob.selectedVersionKeys, []));
}

// 7. selectedVersionKeys present + legacy versionKey also present -> no re-migration.
{
  const { x } = makeSandbox({ prefs: { selectedVersionKeys: ['srd-2014-en'], versionKey: 'srd-2024-en' } });
  check('selectedVersionKeys takes priority over a stale versionKey (no re-migration)',
    arrEq(x.getSelectedVersionKeys(), ['srd-2014-en']));
}

// 8. No prefs, no URL -> browser-language default.
{
  const { x } = makeSandbox({ language: 'pt-BR', languages: ['pt-BR'] });
  check('fresh install, pt-BR navigator -> [srd-2024-ptbr]', arrEq(x.getSelectedVersionKeys(), ['srd-2024-ptbr']));
}
{
  const { x } = makeSandbox({ language: 'en-US', languages: ['en-US'] });
  check('fresh install, en-US navigator -> [srd-2024-en]', arrEq(x.getSelectedVersionKeys(), ['srd-2024-en']));
}

// 9. IN-01: corrupted prefs blob + valid ?v= must not be discarded.
{
  const { x } = makeSandbox({ prefsRaw: '{', href: 'http://localhost/?v=srd-2014-en' });
  check('IN-01: corrupted prefs blob + ?v=srd-2014-en -> [srd-2014-en] (not discarded)',
    arrEq(x.getSelectedVersionKeys(), ['srd-2014-en']));
}

// 10. setSelectedVersionKeys([]) from a non-empty selection -> fallback toast + change event.
{
  const { x, store, events } = makeSandbox({ prefs: { selectedVersionKeys: ['srd-2024-en'] } });
  x.setSelectedVersionKeys([]);
  const blob = readPrefsBlob(store);
  check('setSelectedVersionKeys([]) persists [] in the blob', arrEq(blob.selectedVersionKeys, []));
  const sourceChanged = events.find(e => e.type === 'hifi-spells-source-changed');
  check('setSelectedVersionKeys([]) dispatches hifi-spells-source-changed', !!sourceChanged && arrEq(sourceChanged.detail, []));
  const toast = events.find(e => e.type === 'hifi-toast');
  check('setSelectedVersionKeys([]) dispatches hifi-toast with menu.toastFallbackToDefault (D-04)',
    !!toast && toast.detail && toast.detail.msg === 'menu.toastFallbackToDefault');
}

// 11. Pending-per-item: a plugin key not yet enumerated resolves once refreshPluginVersions() sees it.
async function pendingPerItemScenario() {
  const pluginStore = { listPacks: async () => [{ source: 'x', name: 'X', lang: 'en' }] };
  const { x, events } = makeSandbox({ prefs: { selectedVersionKeys: ['srd-2024-en', 'plugin-x'] }, pluginStore });
  check('before enumeration, plugin-x is pending (resolved drops it)',
    arrEq(x.getResolvedVersionKeys(), ['srd-2024-en']));
  await x.refreshPluginVersions();
  check('after refreshPluginVersions() enumerates pack "x", plugin-x resolves too',
    arrEq(x.getResolvedVersionKeys(), ['srd-2024-en', 'plugin-x']));
  const sourceChanged = events.find(e => e.type === 'hifi-spells-source-changed');
  check('resolving a previously-pending item dispatches hifi-spells-source-changed', !!sourceChanged);
}

// 12. Pruning: a ghost key survives before the first enumeration, gets pruned by an explicit
// change AFTER the first enumeration (D-24).
async function pruningScenario() {
  const pluginStore = { listPacks: async () => [] };
  const { x } = makeSandbox({ pluginStore, language: 'en-US' });
  x.setSelectedVersionKeys(['plugin-ghost']);
  check('before any enumeration, setSelectedVersionKeys keeps an unresolved plugin key (D-24)',
    arrEq(x.getSelectedVersionKeys(), ['plugin-ghost']));
  await x.refreshPluginVersions();
  x.setSelectedVersionKeys(['plugin-ghost', 'srd-2024-en']);
  check('after the first enumeration, an explicit change prunes ghost keys',
    arrEq(x.getSelectedVersionKeys(), ['srd-2024-en']));
}

Promise.all([pendingPerItemScenario(), pruningScenario()]).then(() => {
  if (failures > 0) {
    console.error(failures + ' verificacao(oes) de migracao de selecao falharam.');
    process.exit(1);
  }
  console.log('Selection migration (D-04/D-07/D-23/D-24) verified end to end: legacy versionKey -> list, ?v= comma list, per-item pending/pruning, fallback toast.');
}).catch((e) => {
  console.error('FAIL (exception): ' + (e && e.stack || e));
  process.exit(1);
});
'@

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  Write-Warning 'node nao encontrado - prova de execucao da migracao de selecao pulada (assercoes estruturais ja rodaram).'
} else {
  $tmp = Join-Path ([System.IO.Path]::GetTempPath()) "check-selection-migration-$([guid]::NewGuid()).cjs"
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
      throw "Selection migration runtime proof failed: $nodeOut"
    }
    Write-Output $nodeOut
  } finally {
    if (Test-Path -LiteralPath $tmp) { Remove-Item -LiteralPath $tmp -Force }
  }
}

Write-Output 'Selection state migration contract present (raw list persisted by the loader, legacy versionKey migration, ?v= comma list, per-item pending/pruning, D-04 fallback toast).'
