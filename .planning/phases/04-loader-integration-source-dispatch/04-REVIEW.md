---
phase: 04-loader-integration-source-dispatch
reviewed: 2026-08-18T00:00:00Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - spells-data-loader.jsx
  - index.html
  - pack-import-dialog.jsx
  - sw.js
  - v10-hifi.jsx
  - scripts/check-source-dispatch.tests.ps1
  - scripts/check-plugin-store.tests.ps1
  - scripts/check-pack-wiring.tests.ps1
  - scripts/check-edition-compare.tests.ps1
  - scripts/check-loader-hardening.tests.ps1
  - scripts/qa-fixtures/hostile-html.json
findings:
  critical: 1
  warning: 12
  info: 7
  total: 20
status: issues_found
---

# Phase 4: Code Review Report (re-review)

**Reviewed:** 2026-08-18
**Depth:** standard
**Files Reviewed:** 11
**Status:** issues_found

## Summary

This is a re-review after `e524116`. Two jobs: independently confirm the three blockers are
closed, then re-assess the 13 warnings / 2 info against current code.

**All three prior blockers are genuinely closed, verified by execution rather than by reading the
fix commit.** I built a Node harness that loads the real `spells-data-loader.jsx` (cut before
`VersionSelector` so the JSX does not need transpiling), wires a fake `window` whose
`dispatchEvent` actually re-enters a `useSpellVersions`-shaped listener, and counts dispatches:

- **CR-01 closed.** With `fetch` permanently failing, current code produces `dispatches=1`
  (the toast) and `builds=0` — the source-changed listener never re-enters. The same harness run
  against a copy with the `if (_cache[key])` guard removed blows the 200-dispatch ceiling
  immediately. The second half of the fix also works: removing a pack while it is the active
  version logs `Versao ativa sumiu do registro` and lands on `srd-2024-en`, not on a dangling key.
- **CR-02 closed, and the specific regression risk this re-review was asked to hunt does not
  exist.** The worry was that clearing `_wantedVersionKey` inside `setCurrentVersion()` could drop
  a preference pointing at a not-yet-enumerated IndexedDB pack. It cannot, because **nothing calls
  `setCurrentVersion` during boot any more**: `window.setCurrentSpellVersion` has zero callers
  repo-wide (grep across `*.jsx` / `*.html` returns only the export line itself — the index.html
  mount effect that used to call it was deleted in this phase and `check-source-dispatch`
  now guards against its return), and the only other callers are `switchVersion` (user click, in
  which case dropping the pending preference is correct) and the CR-01 repair (which can only fire
  after a prior successful enumeration already consumed the preference). Harness scenario 2
  confirms a saved `plugin-foo` preference is honoured on first enumeration. One residual
  asymmetry is filed as IN-02.
- **CR-03 closed.** The four tables are prototype-less, and the consumer that CR-03 was really
  about (`remapClassFilter` in `v10-hifi.jsx:698-706`, which indexes `window.CLASS_PT`/`CLASS_EN`
  with filter values that can come straight from a URL) is now safe as a side effect.

`scripts/check-loader-hardening.tests.ps1` **does what it claims** — it is not a comment-matcher.
I mirrored the repo into a scratch tree and reverted each fix independently; the script exits 1
each time with the right message (CR-01 guard removed → CR-01 assertion; the two
`_wantedVersionKey = null` clears removed → CR-02 count assertion; `Object.assign(Object.create(null)`
removed → CR-03 assertion), and exits 0 on clean code. The old WR-12 defect in
`check-source-dispatch.tests.ps1` is also fixed: deleting the pending-preference block now fails
that script (verified the same way). All five changed scripts pass on the current tree.

That is the good news. The bad news is that the *class* of defect CR-03 named — a prototype-bearing
lookup table indexed with attacker-influenced strings — was fixed in `spells-data-loader.jsx` and
nowhere else. The same pattern in `v10-hifi.jsx` is reachable from a shared link and permanently
error-screens the app; that is CR-01 below. Of the prior 13 warnings, most are still live
verbatim, one (the test-script defect) is fixed, and the blocker fixes introduced one new
interaction (WR-02).

Not re-reported, by explicit scope: script load order, the EN first-visit default, the
`frame-ancestors` meta notice, UI-language/pack-language coupling (Phase 04.1), and the absent
`script-src` — that last one is an on-record accepted decision (D-10) with an exit route recorded
in `CONCERNS.md` and locked by `check-csp.tests.ps1:60-66`, so re-raising it would be
re-litigation, not review.

## Critical Issues

### CR-01: A shared link with `?f.constructor=` permanently error-screens the app — the CR-03 defect class, unfixed in `v10-hifi.jsx`

**File:** `v10-hifi.jsx:790-798` (source), `v10-hifi.jsx:895-901` (crash site), `v10-hifi.jsx:729-744` (the prototype-bearing table)

**Issue:** `useHifiAppState` builds its filter state from arbitrary `f.*` URL parameters with no
key whitelist:

```js
p.forEach((val, key) => {
  if (key.startsWith('f.')) { view.filters[key.slice(2)] = new Set(val.split('|').filter(Boolean)); view.any = true; }
});
```

Those keys become own properties of `filters`. `hifiFilterConfig()` returns a plain object
literal, so indexing it with an inherited name yields a truthy value that is not a filter
definition:

```js
const cfg = hifiFilterConfig(versionLang);
Object.keys(filters).forEach(key => {
  const sel = filters[key];
  const def = cfg[key];                 // cfg['constructor'] === Object  → truthy
  if (sel && sel.size && def) {
    out = out.filter(s => def.get(s).some(v => sel.has(v)));   // Object.get is undefined → TypeError
  }
});
```

Reproduced exactly (replicating lines 790-798 and 895-901 verbatim in Node):

```
Object.keys(filters) = [ 'class', 'level', 'school', 'constructor' ]
 key=constructor sel.size=1 def=function
CRASH: TypeError: def.get is not a function
```

The throw happens inside a `useMemo` during render, so it escapes to `ErrorBoundary` and the user
sees "Algo deu errado ao desenhar a página". The app **never strips `f.*` from the URL** (only
`?build` and `?spell` are removed via `history.replaceState`), so the boundary's own
"Recarregar / Reload" button reloads the same URL and re-crashes. The link is permanently dead for
whoever opens it. `?f.toString=x`, `?f.valueOf=x`, `?f.hasOwnProperty=x` do the same. This is
exactly the failure mode CR-03 described — an inherited function passing a truthiness guard — and
the fix commit closed it only in the loader.

**Fix:** the one-line root-cause fix, identical in shape to what CR-03 already did four times:

```js
function hifiFilterConfig(lang) {
  const bool = b => (b ? (tt(lang, 'value.yes')) : (tt(lang, 'value.no')));
  // Sem prototipo: cfg[key] e indexado com chaves vindas de ?f.* na URL. Num
  // literal comum, 'constructor' devolve a funcao herdada -- truthy, entao o
  // guard `&& def` nao salva e def.get(s) estoura dentro do render.
  return Object.assign(Object.create(null), {
    level:  { /* … unchanged … */ },
    // …
  });
}
```

That single change covers every `cfg[key]` / `filterCfg[key]` site (748, 898, 1219, 1238, 2137,
2156). Belt-and-braces, also drop unknown keys at the source so they never enter state:

```js
if (key.startsWith('f.')) {
  const k = key.slice(2);
  if (!Object.prototype.hasOwnProperty.call(hifiFilterConfig('en'), k)) return;
  view.filters[k] = new Set(val.split('|').filter(Boolean));
  view.any = true;
}
```

Worth adding an assertion to `check-loader-hardening.tests.ps1` in the same style as the existing
CR-03 loop, over `hifiFilterConfig` in `v10-hifi.jsx`.

## Warnings

### WR-01: The mount-time `savePrefs` destroys a saved pack selection before enumeration can honour it

**File:** `index.html:473-475`, interacting with `spells-data-loader.jsx:330-347`

**Issue:** `_initialVersionKey()` cannot resolve `plugin-*` at module load (packs are not
enumerated yet), so it stashes the raw key in `_wantedVersionKey` and returns a builtin. `App`
then seeds `versionKey` from `getCurrentSpellVersion()` — the builtin — and the persistence effect
fires on mount:

```js
React.useEffect(() => {
  savePrefs({ dark, theme, characterName: character ? character.name : null, lang, versionKey });
}, [dark, theme, character, lang, versionKey]);
```

`savePrefs` writes the whole object, so `prefs.versionKey` goes from `plugin-foo` to
`srd-2024-en` before `refreshPluginVersions()` resolves. Normally the retry lands and rewrites it
back. But when `listPacks()` rejects — `openDB()` rejects deterministically on `onblocked`, i.e.
any second tab holding an older DB version (`plugin-store.jsx:36-38`), and also on private-mode /
quota failures — `refreshPluginVersions` returns `[]` at its catch (`spells-data-loader.jsx:89-92`)
without ever touching `_wantedVersionKey`. The preference is then gone from localStorage for good:
the next boot opens on the builtin default even though the pack is still installed. One failed
boot silently un-selects the user's pack.

**Fix:** do not persist `versionKey` until the loader has finished its first enumeration, or
preserve the unresolved key. Smallest version — merge instead of overwrite, and skip the write
while a pending preference is still armed:

```js
React.useEffect(() => {
  if (window.hasPendingSpellVersion?.()) return; // loader still owes us a retry
  savePrefs({ ...loadPrefs(), dark, theme, characterName: character ? character.name : null, lang, versionKey });
}, [dark, theme, character, lang, versionKey]);
```

with a two-line `window.hasPendingSpellVersion = () => !!_wantedVersionKey;` in the loader.

### WR-02: `refreshPluginVersions()` still has no concurrency guard — and the CR-01 repair turned "stale snapshot" into a forced version switch

**File:** `spells-data-loader.jsx:81-152`

**Issue:** the function is `async` with a single `await` and is invoked fire-and-forget from two
places (boot at 664/668, and every successful import at `pack-import-dialog.jsx:79`). Nothing
serialises them: whichever `listPacks()` resolves last writes the registry, so an older snapshot
can overwrite a newer one. The mutation block itself is atomic (no `await` after the enumeration),
and IndexedDB orders transactions by creation, so the stale-wins ordering is unlikely in practice
— that part is honest mitigation, not a fix.

What is new is the consequence. Before `e524116`, a stale snapshot that spliced out the pack the
user was looking at left `_currentVersion` dangling and the list blank. Now the repair added at
lines 146-149 reacts by calling `setCurrentVersion(_defaultVersion().key)`, which dispatches
`hifi-spells-source-changed`, which flips the dataset **and the whole UI language** under the user
with no notice — the exact silent switch P-01 prohibits — and also clears `_wantedVersionKey` on
the way out. The blocker fix traded a hang for a silent switch on this path. Harness scenario 3
reproduces the switch (pack removed while active → `current=srd-2024-en`, no user-visible signal
beyond a `console.warn`).

**Fix:** serialise on the in-flight promise (same dedup idiom already used by `_pending` and
`_dbPromise`), and make the repair audible:

```js
let _refreshInFlight = null;
async function refreshPluginVersions() {
  if (_refreshInFlight) return _refreshInFlight;
  _refreshInFlight = _refreshPluginVersionsInner().finally(() => { _refreshInFlight = null; });
  return _refreshInFlight;
}
```

and in the repair branch, dispatch a `hifi-toast` alongside the `console.warn` so the version and
language change is explained rather than merely observed.

### WR-03: Cache invalidation for a removed pack misses `_pending`, so an in-flight load resurrects it

**File:** `spells-data-loader.jsx:116-121` and `403-412`

**Issue:**

```js
oldIdbKeys.forEach(key => {
  if (!newKeys.has(key)) { delete _cache[key]; delete _rawCache[key]; }
});
```

`_pending[key]` is not cleared. A load already in flight for that pack completes afterwards and
runs `_cache[key] = adapted` (line 413), re-populating the cache the invalidation just emptied.
Since `loadVersion()` returns `_cache[key]` before consulting the registry (line 391), the removed
pack's spells stay servable from memory for the rest of the session. Reachability today is limited
(there is still no uninstall UI, so removal needs eviction or a corrupt record dropped by
`listPacks`'s `r && r.meta` filter) — but it goes live the moment Phase 5 adds a delete button,
which is precisely when nobody will be looking at this function.

**Fix:** track a generation counter, or simply refuse to cache a key that is no longer registered:

```js
const adapted = adaptSpells(json, ver.lang, ver.edition);
if (_versionByKey(key)) { _rawCache[key] = json; _cache[key] = adapted; }
return adapted;
```

### WR-04: A missing IndexedDB record produces a silently empty spell list, cached as a success

**File:** `spells-data-loader.jsx:408-414` and `446-462`, with `plugin-store.jsx:100-104`

**Issue:** `getSpells(id)` returns `[]` for a missing record (`record ? record.spells : []`) —
indistinguishable from a successful read of an empty pack. `loadVersion` then caches `[]` as a
success, and `buildSpellsFromRealData`'s `if (cached) return cached;` treats the empty array as
truthy, so the empty result is served forever with no toast and no retry. The UI falls through to
`HifiEmptyState`, which tells the user to clear their filters — advice that cannot help. Harness
scenario 4 confirms: `current=plugin-bar spells=0`, no error path taken. The import funnel enforces
`minItems: 1`, so an empty array from storage always means a broken or vanished record, never a
legitimate empty pack.

**Fix:** distinguish the two in the store and surface the difference:

```js
async function getSpells(id) {
  const record = await _tx('readonly', (store) => store.get(id));
  if (!record) throw new Error(`pluginStore.getSpells: pacote '${id}' não encontrado.`);
  return record.spells;
}
```

The loader's existing catch already toasts `toast.loadFailed` and deliberately does not cache the
failure, so the throw lands exactly where it should.

### WR-05: Third-party pack metadata is silently coerced into plausible-but-wrong values shown as fact

**File:** `spells-data-loader.jsx:60-73` and `251-307`, rendered at `v10-hifi.jsx:999`

**Issue:** two coercions present guesses as data:

1. `edition` is optional in `pack.schema.json`, so `_packToVersion` yields `edition: ''`, and
   `adaptSpell` turns that into a hard-coded lie: `edition: edition || detectEdition('')`, and
   `detectEdition('')` returns `'5e 2014'` because `''.includes('2024')` is false. Every spell of
   an edition-less pack is then stamped `5e 2014` on the detail screen
   (`{s.src} · {s.edition || '5e 2014'}`). Note `detectEdition` is now only ever called with `''`
   — it is a constant function dressed as a heuristic. The shipped QA fixture
   (`scripts/qa-fixtures/hostile-html.json`) has no `edition`, so this is the default experience
   for the phase's own test pack.
2. `SCHOOL_INDEX[schoolKey]` falls back to `4` (`school: typeof schoolIdx === 'number' ? schoolIdx : 4`),
   so any school name the app does not recognise silently becomes Evocation — a filterable,
   displayed attribute the pack never claimed.

`useEditionCompare` was correctly taught this phase to hide itself when `!cur.edition`; the
adapter directly contradicts that by fabricating one.

**Fix:** propagate absence instead of inventing:

```js
edition: edition || '',           // sem edicao declarada, nao inventamos uma
school: typeof schoolIdx === 'number' ? schoolIdx : null,
```

and render `s.edition || '—'` / an "escola desconhecida" chip. Delete `detectEdition` — its only
call site passes `''`.

### WR-06: `HifiLangToggle` still infers edition from a regex on the version key, so a pack author picks the destination

**File:** `v10-hifi.jsx:436-444`

**Issue:** `const editionOf = (v) => (/2024/.test(v.key) ? '2024' : '2014');` — the exact heuristic
this phase declared unsafe and replaced in `useEditionCompare` (see the comment at 1018-1021),
left standing in the sibling component that shares the same registry. A pack key is
`'plugin-' + meta.source`, and `meta.source` is third-party input matching
`/^[a-z0-9][a-z0-9-]{0,63}$/` — so the pack author decides the inferred edition. Concretely: a
user on an EN pack that declares `edition: '5e 2024'` but is named `mypack` gets `editionOf →
'2014'`, and clicking **PT** in the footer drops them into the 2014 PT-BR legacy dataset. A pack
named `tashas-2024` is classified 2024 by accident of its name. This is a genuine mis-navigation
driven by untrusted metadata, not a cosmetic inconsistency.

**Fix:** use the declared field, matching the comparator:

```js
const curEdition = cur ? cur.edition : null;
const pt = curEdition ? versions.find(v => v.lang === 'ptbr' && v.edition === curEdition) : null;
const en = curEdition ? versions.find(v => v.lang === 'en'   && v.edition === curEdition) : null;
```

The buttons already no-op when `pt`/`en` is missing, so an edition-less pack degrades to a
disabled toggle instead of a wrong jump. (Phase 04.1 will rework this area; the wrong-dataset jump
should not survive until then.)

### WR-07: The edition comparator offers the first entry of *any* other edition, so PHB 2024 now compares against SRD 5.1

**File:** `v10-hifi.jsx:1022-1023`

**Issue:** the fix is directionally right but `find` returns registry order, and this phase put the
SRD entries at indices 0 and 1:

```js
versions.find(v => v.lang === cur.lang && v.edition && v.edition !== cur.edition)
```

For `cur = spells-5E-2024-EN` (PHB 2024, `5e 2024`, `en`), the first EN entry with a different
edition is `srd-2014-en`, not `spells-5E-2014-EN`. The button reads "⇄ ver na SRD 5.1", so it is
not dishonest — but the user comparing a PHB spell gets the 319-spell SRD subset and a
`compare.notFound` toast for anything outside it, when the 474-spell PHB 2014 sits in the same
registry. Packs are never offered (they are pushed after the builtins), which is the intended
behaviour and does hold.

**Fix:** prefer a sibling from the same corpus before falling back to any other edition — e.g.
carry a `corpus` field (`'srd' | 'phb' | 'pack'`) on the builtin entries and match it first:

```js
const sameCorpus = v => v.lang === cur.lang && v.edition && v.edition !== cur.edition && v.corpus === cur.corpus;
const other = cur && cur.edition
  ? (versions.find(sameCorpus) || versions.find(v => v.lang === cur.lang && v.edition && v.edition !== cur.edition) || null)
  : null;
```

`check-edition-compare.tests.ps1` asserts only the shape of the expression, so it will not catch
this either way — extend it with the concrete PHB-2024 → PHB-2014 pair.

### WR-08: The import dialog never resets, so reopening it shows a stale success and re-installing duplicates the pack

**File:** `pack-import-dialog.jsx:31-93` and `241-257`

**Issue:** `PackImportRoot` always renders `<PackImportDialog …/>`; `open` only makes the component
return `null` at line 43. The instance is never unmounted, so `result`, `file`, `url` and `error`
survive close/reopen. Two consequences:

1. Reopening after a successful import lands straight on the previous success screen
   (`Pacote instalado como "foo"`), with no visible way back to the file/URL picker.
2. `file` is never cleared on success, so `hasValue` stays true and the footer button stays
   enabled. Clicking it re-runs `installFromFile(file)` with the same file; `freeIdentifier`
   dutifully allocates `foo-2` and a duplicate pack is written to IndexedDB and shows up as a
   second, identically-labelled entry in all three version pickers.

**Fix:** reset on open, which is one effect and costs nothing:

```js
React.useEffect(() => {
  if (!open) return;
  setResult(null); setError(''); setFile(null); setUrl(''); setMode('file');
}, [open]);
```

(Hook must sit above the `if (!open) return null;` early return.)

### WR-09: Every storage failure reaches the user as `packErr.unknown`, through a prototype-bearing lookup

**File:** `pack-import-dialog.jsx:19-29` and `80-86`

**Issue:** `PACK_ERR_KEY_BY_CODE` covers the five `_fail()` codes, which are all *pre-storage*
failures. Everything thrown after validation has no `.code` in that set: `pluginStore.putPack`'s
`_assertPackShape` TypeErrors, `openDB()`'s `onblocked` Error, and IndexedDB `DOMException`s
(whose legacy `.code` is a *number*, e.g. 22 for `QuotaExceededError`). All of them collapse to
`packErr.unknown` — so the single most likely real-world failure for a 10 MB pack, running out of
quota, tells the user nothing. Separately, `PACK_ERR_KEY_BY_CODE` is a plain object literal
indexed with a value carried by an arbitrary thrown object; `PACK_ERR_KEY_BY_CODE['constructor']`
would return `Object` — truthy, so the `|| 'packErr.unknown'` fallback would not save it — and a
function passed to `tt()` ends up as a React child, which throws. Not reachable from any current
throw site, but it is the same class as CR-03 in a file the fix commit did not touch.

**Fix:**

```js
const PACK_ERR_KEY_BY_CODE = Object.assign(Object.create(null), { /* … */ });

function packErrKeyFor(err) {
  const code = err && err.code;
  if (typeof code === 'string' && PACK_ERR_KEY_BY_CODE[code]) return PACK_ERR_KEY_BY_CODE[code];
  if (err && (err.name === 'QuotaExceededError' || code === 22)) return 'packErr.quota';
  return 'packErr.unknown';
}
```

plus a `packErr.quota` / `packErr.storage` pair in `i18n.jsx`.

### WR-10: The dialog's `refreshPluginVersions()` is un-awaited *and* un-caught, unlike the boot call

**File:** `pack-import-dialog.jsx:79`

**Issue:** `if (typeof window.refreshPluginVersions === 'function') window.refreshPluginVersions();`
— the boot call sites (`spells-data-loader.jsx:664`, `668`) both attach `.catch(...)` for exactly
this reason, so the asymmetry is a slip rather than a decision. The comment justifies dropping the
`await` (correct) but not dropping the `catch`. The function is not rejection-proof: it calls
`setCurrentVersion` and dispatches two custom events, and any future throw inside the enumeration
path (or in a listener invoked synchronously in the same call frame) becomes an unhandled
rejection with no breadcrumb tied to the import that caused it.

**Fix:**

```js
window.refreshPluginVersions().catch(e =>
  console.warn('[pack-import-dialog] refreshPluginVersions falhou após instalar:', e));
```

### WR-11: Four dead symbols in the loader, one of them retaining megabytes and one latently broken

**File:** `spells-data-loader.jsx:319`, `437-441`, `638`, `646`

**Issue:** grep over `*.jsx` / `*.html` confirms all four have no readers:

- `_rawCache` (319) — written at 411, deleted at 119, **never read**. It holds a full second copy
  of every loaded JSON (≈600 KB per version) for the life of the tab, for nothing.
- `_originalV7BuildSpells` (638) — captured and never used; the "fallback to the mock" design it
  documents does not exist.
- `loadAllVersions` / `window.loadAllSpellVersions` (437-441, 648) — zero callers. Worse, its
  `_loadingPromise` memo is never reset, so the first call would freeze the set of versions
  forever; now that `SPELL_VERSIONS` grows at runtime, any future caller gets a snapshot that
  silently excludes every pack installed afterwards. The header comment still describes it as
  "pra aquecer o cache das 4 versões" — there are six builtins plus packs.
- `window.setCurrentSpellVersion` (646) — zero callers since this phase deleted the index.html
  mount effect, and `check-source-dispatch.tests.ps1:144-146` actively forbids re-adding the only
  caller it ever had.

**Fix:** delete `_rawCache`, `_originalV7BuildSpells` and `loadAllVersions`/`loadAllSpellVersions`.
Keep `window.setCurrentSpellVersion` only if it is a deliberate console/debug affordance, and say
so in a one-line comment; otherwise delete it too. Deleting `_rawCache` also removes the dangling
`delete _rawCache[key]` at 119.

### WR-12: `check-loader-hardening.tests.ps1` writes its Node harness into the deployed repo root and hard-fails without Node

**File:** `scripts/check-loader-hardening.tests.ps1:124-139`

**Issue:** `$tmp = Join-Path $repoRoot '_check_loader_hardening.cjs'` drops a scratch file into the
repository root — the same directory GitHub Pages publishes — and `_check_loader_hardening.cjs` is
not in `.gitignore`. A clean run removes it in `finally`, but an interrupted or killed run leaves
an untracked file that a `git add .` will happily commit and deploy. It is also the only one of the
24 check scripts that shells out to `node`; with `$ErrorActionPreference = 'Stop'` a machine
without Node on PATH fails this script hard rather than skipping the runtime proof, so the
structural assertions (which need no Node) are lost with it.

**Fix:**

```powershell
$tmp = Join-Path ([System.IO.Path]::GetTempPath()) "check-loader-hardening-$([guid]::NewGuid()).cjs"
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  Write-Warning 'node nao encontrado - prova de execucao do CR-03 pulada (assercoes estruturais ja rodaram).'
} else {
  # … existing block, using $tmp …
}
```

The script's `Set-Content -Encoding UTF8` also emits a BOM on Windows PowerShell 5.1, which Node
tolerates for `.cjs` but is worth `-Encoding utf8NoBOM` if the suite ever runs under 5.1.

## Info

### IN-01: A corrupt prefs blob silently discards the `?v=` link parameter

**File:** `spells-data-loader.jsx:330-346`

**Issue:** `_wantedVersionKey = urlV || prefs.versionKey || null;` is assigned *after*
`JSON.parse(localStorage.getItem(...))`. If the stored prefs are corrupt, the parse throws, the
empty `catch (e) {}` swallows it, and the function returns the default — so a perfectly valid
`?v=plugin-foo` shared link is dropped because of unrelated local state. `index.html`'s
`loadPrefs()` guards its own parse; the loader does not.

**Fix:** read `urlV` and assign `_wantedVersionKey` before touching localStorage, and parse prefs
in its own `try`. Log in the catch instead of leaving it empty — `check-plugin-store.tests.ps1:34`
already forbids empty catches in the storage layer; the loader is held to a looser standard for no
stated reason.

### IN-02: `setCurrentVersion`'s early return skips the pending-preference clear

**File:** `spells-data-loader.jsx:354-364`

**Issue:** `if (_currentVersion === key) return;` fires before `_wantedVersionKey = null`. So if a
user re-picks the version they are already on while a pending preference is still armed (the boot
window before enumeration lands), the preference survives and the enumeration later moves them off
it. Marginal — re-picking the active entry is a no-op from the user's point of view — but it is the
one asymmetry in the CR-02 fix, and the comment at 356-359 claims "qualquer troca EFETIVA" cancels
it, which reads as if the no-op case was considered rather than fallen through.

**Fix:** clear before the early return, or state in the comment that an idempotent re-pick
deliberately does not count as a choice.

### IN-03: The `window.pluginStore` guard returns silently — no diagnostic for the exact failure the new load order prevents

**File:** `spells-data-loader.jsx:82-84`

**Issue:** `index.html:115-120` explains at length that a wrong script order makes this branch
"enumerate nothing and warn nothing", silently hiding every installed pack. The branch still warns
nothing, so if `plugin-store.jsx` ever fails to load (stale service-worker entry, 404), the symptom
is indistinguishable from "no packs installed".

**Fix:** `console.warn('[spells-data-loader] window.pluginStore ausente — nenhum pack sera enumerado.');`
before the `return []`.

### IN-04: `sw.js` comments are now factually wrong about both the file count and the re-download claim

**File:** `sw.js:1-9`, `23-24`, `39`

**Issue:** the header still says "Os 4 JSONs são pré-cacheados no install" — there are six. And the
two ponytail comments justify not bumping `CACHE_VERSION` with "os JSONs de magias já cacheados não
são re-baixados". `cache.add(url)` performs a `fetch` for every entry on every install regardless
of Cache Storage contents; only the HTTP cache can spare the bytes. The decision not to bump is
still right (a bump would drop the whole cache), but the stated reason is not the reason, and
`check-pack-wiring.tests.ps1:72-74` now locks that reasoning in place.

**Fix:** update the count to six, and restate the rationale: "não bumpar preserva as entradas já
gravadas no Cache Storage; o `install` refaz os requests de qualquer forma, mas o cache HTTP os
serve com 304."

### IN-05: `sw.js` can call `respondWith(undefined)`

**File:** `sw.js:84`

**Issue:** for a shell request that was never cached, offline: `network` rejects, `.catch(() => cached)`
yields `undefined`, and `isShell ? network.then(res => res || cached)` resolves to `undefined`.
`respondWith(undefined)` rejects with a TypeError. Net user-visible effect is the same failed
navigation, plus a console error, so impact is essentially nil — but it is an unhandled edge in a
control path.

**Fix:** `return isShell ? network.then(res => res || cached || Response.error()) : (cached || network);`

### IN-06: The QA hostile fixture is publicly served from the deployed origin

**File:** `scripts/qa-fixtures/hostile-html.json`

**Issue:** the repo root is the published site, so `scripts/qa-fixtures/hostile-html.json` is
fetchable by anyone. It is not dangerous on its own — GitHub Pages serves it as `application/json`,
browsers do not execute script inside a JSON body, `check-pack-wiring.tests.ps1:82-84` keeps it out
of the SW precache, and `sanitizePack` strips both payloads at import, which is exactly what the
fixture exists to prove. The residual is that a same-origin URL import
(`installFromUrl('scripts/qa-fixtures/hostile-html.json')`) lets a link installer seed a pack into
a victim's IndexedDB with attacker-chosen (though sanitized) content.

**Fix:** none required. If you want it off the origin anyway, move it under a directory excluded
from Pages, or rename to `.fixture` so it is not served as JSON.

### IN-07: A pack can impersonate a builtin entry in the version selector

**File:** `spells-data-loader.jsx:60-73`

**Issue:** T-04-02 was mitigated for length only (`slice(0, 48)` / `slice(0, 14)`) on the grounds
that React escapes the text. It does — there is no XSS here — but nothing prevents a pack from
naming itself exactly `SRD 5.2 (EN)`, producing two visually identical rows in all three pickers,
one of which serves attacker-chosen (sanitized) spell text. The user did install the pack, so this
is low, and the mobile drawer's 14-character `short` truncation makes collisions even easier
without an ellipsis or `title` attribute to disambiguate.

**Fix:** mark idb entries visually in the pickers (a badge, or `⚙ ` prefixed to the label) so a
pack can never render identically to a builtin.

---

_Reviewed: 2026-08-18_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
