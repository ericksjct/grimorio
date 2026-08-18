---
phase: 04-loader-integration-source-dispatch
reviewed: 2026-08-17T00:00:00Z
depth: standard
files_reviewed: 10
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
  - scripts/qa-fixtures/hostile-html.json
findings:
  critical: 3
  warning: 13
  info: 2
  total: 18
status: issues_found
---

# Phase 4: Code Review Report

**Reviewed:** 2026-08-17
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

The phase does what it set out to do structurally: `SPELL_VERSIONS` is a live registry, mutation is
genuinely in-place (reverse `splice` + `push`, builtins never touched), both origins funnel through the
single `adaptSpells()` call, and the boot-order fix in `index.html` is correct and asserted twice.

Three things I checked and found **clean**, so they are not findings:

- **Builtin key shadowing is impossible.** `_packToVersion` prefixes every pack key with `plugin-`, and
  `refreshPluginVersions` only splices entries whose `source === 'idb'`. No `meta.source` matching
  `^[a-z0-9][a-z0-9-]{0,63}$` can produce a key equal to a builtin, and no builtin can be displaced.
- **No new XSS sink.** `sanitizePack()` remains the only write path into IndexedDB; the loader adds no
  bypass. `spell.url` (unsanitized by `sanitizePack`) never reaches an `href` — it is adapted into
  `spell.url` and rendered nowhere. `descHtml`/`upgradeHtml` reach `dangerouslySetInnerHTML`
  (`v10-hifi.jsx:333,340,649,973,982`) carrying only already-sanitized-at-rest HTML.
- **The DOMPurify fail-closed lock and the `hostile-html.json` fixture line up** with what the pipeline
  actually blocks (`img onerror`, `<script>`, `p onclick`).

What the phase did **not** get right is the error and lifecycle surface it newly exposes. The registry can
now shrink and a version can now fail from IndexedDB, and neither case was traced to the end: two distinct
paths end in an unbounded loop (CR-01), a stale boot preference re-fires on every later refresh and yanks
the user to another dataset and UI language (CR-02), and untrusted pack strings reach prototype-inherited
lookup tables that crash the render (CR-03). All three are consequences of connecting untrusted, mutable
data to code that was previously fed only four fixed repo files.

## Critical Issues

### CR-01: Unbounded retry loop when the active version fails to load or stops resolving — BLOCKER

**File:** `spells-data-loader.jsx:409-418`, `spells-data-loader.jsx:438-445`, `spells-data-loader.jsx:353-364`, `spells-data-loader.jsx:378-388`

**Issue:** `buildSpellsFromRealData()` dispatches `hifi-spells-source-changed` after *every* `loadVersion()`
settle, including settles that did not populate `_cache[key]`. `useSpellVersions`'s listener for that same
event calls `buildSpellsFromRealData()` again. Since failures are deliberately not cached (line 380) and the
unknown-key redirect caches under the *default* key rather than the requested one (line 363), the cache is
still empty on re-entry and the cycle restarts forever. Two reachable variants:

- **Variant A — active key stops resolving (phase-introduced).** A pack that is the active version
  disappears from IndexedDB (Safari eviction, clear-site-data, another tab), `refreshPluginVersions`
  removes its entry and deletes `_cache['plugin-x']` (lines 107-121), but `_currentVersion` is left pointing
  at `plugin-x`. Next `buildSpellsFromRealData()` → `loadVersion('plugin-x')` → unknown → redirect →
  resolves *immediately from the default's cache* → dispatch → listener → build → repeat. This is a
  microtask-speed loop with a React `setSpells(new [])` on every turn: the tab freezes. Before this phase
  `loadVersion` threw `Unknown version: ...` on this input, so the `.then()` never ran and the loop did not
  exist — the redirect added at line 358-364 is what closes the cycle.
- **Variant B — any load failure (pre-existing shape, new failure source).** Offline with an uncached JSON,
  or an `idb` record whose `spells` read rejects. Each turn performs three real `fetch` attempts and
  dispatches one `hifi-toast` error (lines 382-386), forever.

**Fix:** only announce a load that actually produced data, and make the unknown-key redirect move
`_currentVersion` instead of silently serving another version's data under the old key.

```js
function buildSpellsFromRealData() {
  const key = _currentVersion;
  const cached = _cache[key];
  if (cached) return cached;
  loadVersion(key).then(() => {
    // Só anuncia quando o cache foi de fato populado — anunciar um load que
    // falhou reentra neste mesmo caminho e vira laço infinito.
    if (_cache[_currentVersion]) {
      window.dispatchEvent(new CustomEvent('hifi-spells-source-changed', { detail: _currentVersion }));
    }
  });
  return [];
}

// e em loadVersion(), no ramo de chave desconhecida:
const fallback = _defaultVersion().key;
console.warn('[spells-data-loader] Versão desconhecida:', key, '— usando versão padrão.');
setCurrentVersion(fallback); // reconcilia o estado; o seletor passa a dizer a verdade
return loadVersion(fallback);
```

### CR-02: Stale `_wantedVersionKey` silently switches dataset and UI language after any pack import — BLOCKER

**File:** `spells-data-loader.jsx:131-133` (with `:296`, `:298-315`, `:322-327`)

**Issue:** `_wantedVersionKey` is assigned exactly once, at module load, and is never cleared or updated
when the user changes version. The retry at the end of `refreshPluginVersions()` re-applies it on *every*
subsequent call, not only the boot one. Reproduction with builtins only — no packs required for the trigger:

1. Boot with saved pref `versionKey: 'spells-5E-2024-PTBR'` → `_wantedVersionKey = 'spells-5E-2024-PTBR'`.
2. User picks "SRD 5.2 (EN)" in the selector → `_currentVersion = 'srd-2024-en'`; `_wantedVersionKey` untouched.
3. User imports any pack → `pack-import-dialog.jsx:79` calls `refreshPluginVersions()` → line 131 evaluates
   `'spells-5E-2024-PTBR' !== 'srd-2024-en'` and the key resolves → `setCurrentVersion('spells-5E-2024-PTBR')`.
4. The app jumps back to PT-BR 2024, and because chrome language is coupled to the active version
   (`index.html:461-470`), the whole UI flips to Portuguese — after an action that had nothing to do with
   version selection.

This is precisely the silent switch the comment on lines 128-130 claims to prevent (P-01).

**Fix:** consume the pending preference once, and keep it in sync with explicit user choices.

```js
function setCurrentVersion(key) {
  if (_currentVersion === key) return;
  _currentVersion = key;
  _wantedVersionKey = null; // escolha explícita do usuário aposenta a preferência pendente
  window.dispatchEvent(new CustomEvent('hifi-spells-source-changed', { detail: key }));
}

// em refreshPluginVersions(), após honrar:
if (_wantedVersionKey && _wantedVersionKey !== _currentVersion && _versionByKey(_wantedVersionKey)) {
  const wanted = _wantedVersionKey;
  _wantedVersionKey = null;
  setCurrentVersion(wanted);
}
```

### CR-03: Untrusted pack strings hit prototype-inherited lookup tables and crash the render — BLOCKER

**File:** `spells-data-loader.jsx:225` and `spells-data-loader.jsx:268` (crash surfaces at `v10-hifi.jsx:991`)

**Issue:** `CLASS_PT`, `CLASS_EN`, `SOURCE_CODE` and `SCHOOL_INDEX` are plain object literals, so they
inherit `Object.prototype`. Before this phase `adaptSpell` only ever saw repo-owned JSON; the phase routes
third-party pack spells through the same function, and the pack schema allows any string in `class[]` and
`source`:

- `classesPt = rawClasses.map(c => CLASS_PT[c.toLowerCase()] || c)` — a pack spell with
  `"class": ["constructor"]` (or `"tostring"`, `"valueof"`) yields the inherited **function** instead of a
  string. For a `lang: 'ptbr'` pack that array becomes `spell.classes`, and the detail panel renders
  `(s.classes || []).map(c => c ? c.charAt(0).toUpperCase() + ...)` — `c.charAt` is undefined →
  `TypeError` during render → `ErrorBoundary` (`index.html:606-627`) replaces the entire app with the
  "Algo deu errado" screen. Opening any spell of that pack kills the app again.
- `src: SOURCE_CODE[s.source] || ...` — same shape: `"source": "constructor"` puts a function into
  `spell.src`, which is then used as a filter chip value (`v10-hifi.jsx:742`) and printed via `join(', ')`
  at `v10-hifi.jsx:346`, dumping the function source into the printed card.
- `SCHOOL_INDEX[schoolKey]` is the one that is already safe, only because of the `typeof schoolIdx === 'number'`
  guard on line 239 — evidence that the hazard was understood for one map and not the other three.

`sanitizePack()` does not cover `spell.class` or `spell.source` (only `description`/`upgradeDescription`/
`statBlock` and the meta text fields), so nothing upstream removes these values.

**Fix:** give the lookup tables a null prototype — one line each, no call-site changes.

```js
const SCHOOL_INDEX = Object.assign(Object.create(null), { abjuration: 0, /* … */ });
const CLASS_PT     = Object.assign(Object.create(null), { bard: 'bardo', /* … */ });
const CLASS_EN     = Object.assign(Object.create(null), { bardo: 'bard', /* … */ });
const SOURCE_CODE  = Object.assign(Object.create(null), { 'Livro do Jogador': 'PHB', /* … */ });
```

## Warnings

### WR-01: `refreshPluginVersions()` has no concurrency guard — last writer wins with a stale list — WARNING

**File:** `spells-data-loader.jsx:81-136`

**Issue:** Every other async entry point in this codebase dedups in flight (`_pending` at
`spells-data-loader.jsx:332`, `_dbPromise` in `plugin-store.jsx:22`, `_persistPromise` in
`plugin-store.jsx:121`); this one does not. Boot fires it un-awaited (lines 619-624) and every successful
import fires it again un-awaited (`pack-import-dialog.jsx:79`). Two overlapping calls each resume after
their own `await listPacks()` and each rebuild the registry from *its own* snapshot. If the older call's
readonly transaction settles last, its stale snapshot wins: the just-installed pack is spliced back out of
`SPELL_VERSIONS` and, because it is absent from that call's `newKeys`, its `_cache`/`_rawCache` entries are
deleted too. The pack vanishes from the selector until a reload.

**Fix:** memoize like the rest of the file — collapse overlapping calls into one, and let a call that
arrives during a refresh schedule exactly one follow-up.

```js
let _refreshPromise = null;
function refreshPluginVersions() {
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = _refreshPluginVersionsNow().finally(() => { _refreshPromise = null; });
  return _refreshPromise;
}
```

### WR-02: In-flight loads repopulate the cache that `refreshPluginVersions()` just invalidated — WARNING

**File:** `spells-data-loader.jsx:114-121` and `spells-data-loader.jsx:366-389`

**Issue:** The invalidation deletes `_cache[key]`/`_rawCache[key]` but ignores `_pending[key]`. A
`loadVersion('plugin-x')` that was already in flight when the pack was removed still runs its success path
afterwards and writes `_cache['plugin-x'] = adapted`, resurrecting the spells of a pack that is no longer
installed. Combined with WR-01 (which can remove a pack spuriously) the stale data survives for the rest of
the session.

**Fix:** cancel the in-flight entry alongside the caches, and have the inner IIFE not write a cache entry
whose key is no longer registered:

```js
oldIdbKeys.forEach(key => {
  if (!newKeys.has(key)) { delete _cache[key]; delete _rawCache[key]; delete _pending[key]; }
});
// e, no sucesso de loadVersion:
if (_versionByKey(key)) { _rawCache[key] = json; _cache[key] = adapted; }
```

### WR-03: When the active pack disappears, the selector shows a version other than the one in use — WARNING

**File:** `spells-data-loader.jsx:318-320`, `spells-data-loader.jsx:105-112`, `spells-data-loader.jsx:477`

**Issue:** `refreshPluginVersions()` removes the entry but never reconciles `_currentVersion`. From that
moment `getCurrentVersion()` returns `_defaultVersion()` and `VersionSelector` falls back to `versions[0]`
(line 477), so the chrome claims "SRD 5.2 (EN)" while `_currentVersion` is still `plugin-x` and every
`buildSpellsFromRealData()` keys off `plugin-x`. That is exactly the P-01 failure the comment on lines
128-130 forbids, and it is the trigger for CR-01 variant A.

**Fix:** after the splice, if `_versionByKey(_currentVersion)` is null, call
`setCurrentVersion(_defaultVersion().key)` so state, selector and cache all agree (a visible fallback is
honest; a lying selector is not).

### WR-04: A missing IndexedDB record produces a silent empty spell list — WARNING

**File:** `spells-data-loader.jsx:371-377` (via `plugin-store.jsx:100-104`)

**Issue:** `pluginStore.getSpells(id)` returns `[]` — not a rejection — when the record is absent. The
`idb` branch therefore succeeds with an empty array, caches it, and the user gets a blank spell list with no
toast and no console warning. The catch block two lines below exists specifically so the user is never shown
"0 magias em silêncio"; this path walks straight around it. Reachable whenever the record is deleted between
enumeration and load (second tab, eviction), which is the same window the phase already anticipates elsewhere.

**Fix:** treat an empty result from a registered pack as a failure, so the existing toast path runs:

```js
const json = ver.source === 'idb' ? await window.pluginStore.getSpells(ver.packId) : await _fetchVersionJson(ver);
if (ver.source === 'idb' && (!Array.isArray(json) || json.length === 0)) {
  throw new Error('pack sem magias ou registro ausente: ' + ver.packId);
}
```

### WR-05: `_cache`/`_rawCache`/`_pending` are prototype-bearing objects behind a public API — WARNING

**File:** `spells-data-loader.jsx:286-287`, `spells-data-loader.jsx:332`, `spells-data-loader.jsx:354-355`

**Issue:** `loadVersion()` tests `if (_cache[key])` *before* validating the key against the registry, and
these are object literals. `window.loadSpellVersion('constructor')` (or `'toString'`, `'valueOf'`) returns
an inherited function as if it were the adapted spell list, and callers do `.find(...)` on it
(`v10-hifi.jsx:1030-1032`) → TypeError. Not reachable from today's key sources (all keys come from the
registry and are `plugin-`-prefixed or builtin), but `loadSpellVersion` is exported on `window` as public
API and the cost of closing it is one character each.

**Fix:** `const _cache = Object.create(null);` (same for `_rawCache` and `_pending`).

### WR-06: A pack with no `meta.edition` mislabels every one of its spells as "5e 2014" — WARNING

**File:** `spells-data-loader.jsx:270` and `spells-data-loader.jsx:211-214`

**Issue:** `edition` is optional in the pack schema, and `_packToVersion` turns a missing one into `''`
(line 68). `adaptSpell` then falls back to `detectEdition('')`, which — with an empty filename — always
returns `'5e 2014'`. The detail panel prints `{s.src} · {s.edition || '5e 2014'}` (`v10-hifi.jsx:999`), so a
third-party 2024 or homebrew pack is presented to the user as 2014 content with no hedge. Given P-03's
stated concern about users mis-reading which ruleset they are looking at, asserting an edition the pack
never declared is the wrong default. `detectEdition` itself is now dead-parameterized: its only remaining
call site passes a constant `''`.

**Fix:** propagate "unknown" instead of inventing 2014 — `edition: edition || ''` in `adaptSpell`, and let
the renderer show `s.edition` only when non-empty. Delete `detectEdition` once its last caller is gone.

### WR-07: `HifiLangToggle` still derives edition from a regex on the key — the heuristic this phase removed — WARNING

**File:** `v10-hifi.jsx:439-445`

**Issue:** The phase replaced the "first other entry with the same lang" heuristic in `useEditionCompare`
with a match on the declared `edition` field, on the explicit grounds that a growing registry makes
key-shaped guessing wrong. `HifiLangToggle` was left on `editionOf = (v) => (/2024/.test(v.key) ? '2024' : '2014')`
— a pack whose identifier happens to contain `2024` (e.g. `plugin-homebrew-2024`) is classified as a 2024
edition, and any pack without a year is classified as 2014, so the PT/EN footer toggle can send the user to
a builtin of the wrong edition. Two contradictory edition derivations now coexist in the same file.

**Fix:** use the same field the comparator now uses: `const editionOf = (v) => v.edition || '';` and match
`pt`/`en` candidates on `v.edition === curEdition`, falling back to "no counterpart" (button disabled)
rather than guessing.

### WR-08: The import dialog is never unmounted, so a second import shows the previous success screen — WARNING

**File:** `pack-import-dialog.jsx:31-43`, `pack-import-dialog.jsx:241-257`

**Issue:** `PackImportRoot` always renders `<PackImportDialog>`; `open` only makes it return `null`
(line 43), which does **not** unmount it. `result`, `file`, `url` and `mode` therefore survive a close.
Reopening after a successful install renders the success panel (line 136) with no control that returns to
the form — the user cannot import a second pack without reloading. Worse, the footer button stays enabled
(`hasValue` is still true because `file` is retained), so clicking it re-installs the same file, which
`freeIdentifier` happily stores as a duplicate `-2` pack.

**Fix:** reset on open, or mount conditionally from the parent:

```js
// em PackImportRoot — a forma mais curta: só monta quando aberto.
{open && <PackImportDialog lang={lang} dark={dark} theme={theme} open onClose={() => setOpen(false)} />}
```

### WR-09: `refreshPluginVersions()` fired without a `.catch()` from the import dialog — WARNING

**File:** `pack-import-dialog.jsx:79`

**Issue:** The boot call sites wrap the same fire-and-forget call in `.catch()` (`spells-data-loader.jsx:620,624`)
precisely because it is un-awaited; this one does not. `refreshPluginVersions` only guards `listPacks()` —
`_packToVersion`, the splice loop, `dispatchEvent` and the `setCurrentVersion` retry all run outside any
`try`, and a throw there becomes an unhandled rejection while the dialog reports success. The comment on
line 78 ("refreshPluginVersions já absorve as próprias falhas") overstates what the function guards.

**Fix:** `window.refreshPluginVersions()?.catch(e => console.warn('[pack-import-dialog] refresh falhou:', e));`

### WR-10: `sw.js` install comments claim a caching behaviour the code does not have — WARNING

**File:** `sw.js:23`, `sw.js:39`, `sw.js:47-55`

**Issue:** Both added comments assert that keeping `CACHE_VERSION` fixed means "os JSONs de magias já
cacheados não são re-baixados". `cache.add(url)` performs a `fetch` for every entry unconditionally — it
never consults the existing cache. Every install re-requests all ~24 precache entries including the four
legacy spell JSONs and the two new SRD files. The invariant the comment (and
`check-pack-wiring.tests.ps1:71-74`, which enforces the constant on that stated rationale) is protecting
does not exist, so a future maintainer will reason from a false premise.

**Fix:** correct the comments to state what the fixed `CACHE_VERSION` actually buys (activate() does not
purge the old cache, so offline users keep working during the swap), or skip already-present entries:
`cache.match(url).then(hit => hit || cache.add(url))`.

### WR-11: `sw.js` can call `respondWith(undefined)` and turn a normal offline failure into a SW error — WARNING

**File:** `sw.js:77-84`

**Issue:** `.catch(() => cached)` resolves to `undefined` when the request was never cached, so for a
non-shell request that is offline and uncached, `respondWith` receives a promise resolving to `undefined`
and rejects. The shell branch has the same hole (`network.then(res => res || cached)` with both undefined).
The user gets an opaque service-worker failure instead of the browser's normal offline handling — relevant
now that first-visit users may hold an active version whose JSON is not yet in the cache.

**Fix:** re-throw when there is nothing to serve, so the browser produces its standard network error:

```js
.catch(() => cached || Promise.reject(new Error('offline e sem cache: ' + request.url)))
```

### WR-12: `check-source-dispatch.tests.ps1` passes even if the `refreshPluginVersions()` call is deleted — WARNING

**File:** `scripts/check-source-dispatch.tests.ps1:172-179`

**Issue:** `$dialog.IndexOf('refreshPluginVersions')` matches the *comment* on `pack-import-dialog.jsx:78`,
which sits before the call. Deleting line 79 and keeping the comment leaves both assertions green, so the
test does not actually pin the wiring it exists to pin. The same file gets this right elsewhere (lines
159-160 deliberately anchor on `src="..."` to avoid matching comments) — the technique is understood, just
not applied here.

**Fix:** anchor on the call shape:

```powershell
$idxRefresh = $dialog.IndexOf('window.refreshPluginVersions(')
```

### WR-13: `loadAllVersions()` is dead code with a permanently poisoned memo — WARNING

**File:** `spells-data-loader.jsx:400-404`, exposed at `:604`

**Issue:** No caller remains anywhere in the repo (`window.loadAllSpellVersions` has zero references), and
the header comment already says boot no longer uses it. It is also now wrong for the live registry: it
memoizes `_loadingPromise` forever, so a call made before a pack is installed returns a promise that never
covers the new entries, and `_loadingPromise` is never reset. Keeping a broken warm-up helper alive invites
someone to call it.

**Fix:** delete `loadAllVersions`, `_loadingPromise` and the `window.loadAllSpellVersions` export. If a
warm-up is wanted later, `Promise.all(SPELL_VERSIONS.map(v => loadVersion(v.key)))` at the call site is one
line and always current.

## Info

### IN-01: QA fixture with an active XSS payload is published on the production origin

**File:** `scripts/qa-fixtures/hostile-html.json`

**Issue:** This is a no-build static site — the repo root is the deployed site, so the fixture is reachable
at `<origin>/scripts/qa-fixtures/hostile-html.json`. It is served as `application/json`, so it is not
directly executable, and `check-pack-wiring.tests.ps1:81-84` correctly keeps it out of the offline shell.
Worth noting only because it makes `installFromUrl` reachable with a same-origin hostile payload, and
because a future change to how `scripts/` is served would change the exposure.

**Fix:** none required; if it matters later, move QA fixtures under a path excluded from the published
site.

### IN-02: No `script-src` in the CSP behind the `dangerouslySetInnerHTML` sinks

**File:** `index.html:10`

**Issue:** The policy sets `object-src`, `base-uri`, `form-action` and `frame-ancestors` but no
`script-src`, so there is no defense-in-depth layer behind sanitize-at-rest. If a pack ever reaches
IndexedDB without passing `sanitizePack` (a manual write, an older build, a future write path), the HTML
goes straight to `dangerouslySetInnerHTML` with nothing in between. Being honest about the ceiling: with
Babel standalone and inline `text/babel` scripts, any usable policy needs `'unsafe-inline' 'unsafe-eval'`,
which blunts most of the benefit — the residual win is restricting script *origins* and blocking injected
`<script src>`.

**Fix:** optional and cheap to defer; if taken, `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com`
plus removing the `javascript:` reload link at `index.html:87`.

---

_Reviewed: 2026-08-17_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
