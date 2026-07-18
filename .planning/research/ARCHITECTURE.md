# Architecture Research

**Domain:** BYOD plugin system for a no-build React SPA (D&D 5e spellbook PWA)
**Researched:** 2026-07-18
**Confidence:** HIGH (grounded directly in `spells-data-loader.jsx`, `sw.js`, `v10-hifi.jsx` source; standard web-platform APIs, no novel tech)

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          spells-data-loader.jsx                          │
│  (MODIFIED — becomes source-agnostic; version list is dynamic)           │
├────────────────────────────────────────────────────────────────────────┤
│  SPELL_VERSIONS (mutable array, built at boot)                           │
│    ├─ 1 static entry: SRD pack (fetch './spells-srd-en.json')            │
│    └─ N dynamic entries: one per installed IDB pack (source: 'idb')      │
│                                                                            │
│  loadVersion(key) ── dispatch by ver.source ──┐                          │
│                       'fetch' → fetch(ver.file)│                         │
│                       'idb'   → pluginStore.getSpells(ver.packId)        │
│                                       ↓                                  │
│                              adaptSpells(json, lang, edition)  (SHARED,  │
│                              unmodified — same schema in, same out)      │
│                                       ↓                                  │
│                              _cache[key] (in-memory, same as today)      │
└──────────────────────────┬─────────────────────────────────────────────┘
                            │
        ┌───────────────────┴────────────────────┐
        ▼                                         ▼
┌──────────────────────┐              ┌────────────────────────────┐
│   plugin-store.jsx    │              │   plugin-import.jsx         │
│   (NEW)                │              │   (NEW)                     │
│                        │              │                              │
│  IndexedDB wrapper:    │◄────write────│  Import pipeline:            │
│  - openDB()            │              │  1. read file / fetch URL    │
│  - putPack(meta,spells)│              │  2. parse JSON                │
│  - getPack(id)          │              │  3. validate manifest        │
│  - getSpells(id)        │              │  4. sanitize HTML (DOMPurify)│
│  - listPacks()          │              │  5. adaptSpells() dry-run    │
│  - deletePack(id)        │              │     (catch malformed rows)  │
└──────────┬─────────────┘              │  6. putPack() to IDB          │
           │                             │  7. register version, notify │
           │                             └────────────────────────────┘
           ▼
┌──────────────────────┐
│  IndexedDB            │
│  db: grimorio-plugins  │
│  store: packs (keyPath: id)                                          │
│    { id, meta: {name, lang, edition, source, license, attribution,   │
│            importedAt, spellCount}, spells: [...sanitized adapted    │
│            or raw-normalized spell rows] }                            │
└──────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│  sw.js (MODIFIED — precache list drops the 4 removed JSONs,          │
│  keeps only the SRD file; IDB packs are NEVER touched by the SW —    │
│  IndexedDB already survives offline, no caching layer needed)        │
└────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `spells-data-loader.jsx` (modified) | Owns `SPELL_VERSIONS`, dispatches fetch-vs-IDB by version's `source` field, keeps existing in-memory `_cache`/`_pending` dedup logic untouched | Add a `source: 'fetch'\|'idb'` field per version entry; branch inside `loadVersion()` |
| `plugin-store.jsx` (new) | Thin promise-wrapped IndexedDB CRUD for packs; no external dependency | ~80-120 lines, one `openDB()` + CRUD functions, mirrors `localStorage` helper style already used for characters (`loadCharacters`/`persistCharacters`) |
| `plugin-import.jsx` (new) | Import pipeline: fetch/read → parse → validate → sanitize → dry-adapt → persist → register version | Runs entirely client-side; reuses `adaptSpell`/`adaptSpells` from the loader (don't fork the adapter) |
| `PluginManager` UI (new, in `v10-hifi.jsx` or new file) | Install (file picker / URL field) / list / remove packs; surfaces `meta` (name, count, license) | Modal or panel, same pattern as `CharacterEditor` — inline-rendered sibling in App, own open/close state |
| `sw.js` (modified) | Precache SRD JSON only; drop the 4 copyrighted spell JSONs from `PRECACHE` | One-line list edit; no new SW logic — IndexedDB is browser-persistent and doesn't need SW caching |
| `hifiSpellKey()` (unmodified, in `v10-hifi.jsx`) | Spell identity for prepared/bookmark sets | `${school}-${lvl}-${en}` — already pack-agnostic (uses English name, not pack ID) — **this is the load-bearing fact that makes cross-pack identity work** |

## Recommended Project Structure

```
grimorio-do-jogador/
├── spells-data-loader.jsx     # MODIFIED: SPELL_VERSIONS becomes mutable,
│                               #   source-dispatch in loadVersion()
├── plugin-store.jsx            # NEW: IndexedDB CRUD (no dependency)
├── plugin-import.jsx           # NEW: import pipeline (fetch/file → sanitize → store)
├── plugin-manager.jsx          # NEW: install/list/remove UI (or inline in v10-hifi.jsx
│                               #   if small enough — match existing file-per-concern size)
├── spells-srd-en.json          # NEW: replaces the 4 removed JSONs; CC-BY SRD subset
├── sw.js                       # MODIFIED: PRECACHE drops 4 files, keeps SRD only
└── index.html                  # MODIFIED: script tag for plugin-store.jsx +
                                 #   plugin-import.jsx, load order after loader,
                                 #   before v10-hifi.jsx (needs hifiSpellKey unaffected)
```

### Structure Rationale

- **`plugin-store.jsx` split from the loader:** IndexedDB access is a different concern (async, versioned schema, own error modes) than the fetch/cache logic already in `spells-data-loader.jsx`. Keeping it separate matches the existing pattern of one concern per file (`v11-character-editor.jsx` for character CRUD, `i18n.jsx` for strings) and keeps the loader diff small — reduces risk of breaking the existing 4-version behavior during the migration.
- **`plugin-import.jsx` split from `plugin-store.jsx`:** import is a pipeline with validation/sanitization steps that only run once (at import time); storage is a dumb CRUD layer reused on every app boot. Splitting means the sanitizer (and any future DOMPurify CDN dependency) is only loaded/invoked by the import path, not on every read.
- **No new folder structure** — this is a flat-file, no-build project (11 top-level `.jsx`/`.js`/`.css` files today). Two new files matches that convention; don't introduce `src/`, `lib/`, or nested dirs.

## Architectural Patterns

### Pattern 1: Source-Dispatch in the Existing Loader (extend, don't replace)

**What:** `SPELL_VERSIONS` becomes a runtime-built array: the static SRD entry (hardcoded, like today's 4) plus N entries appended from `plugin-store.listPacks()` at boot. Each entry gets a `source: 'fetch' | 'idb'` discriminator. `loadVersion(key)` branches on it but funnels both paths through the **same** `adaptSpells()` call.

**When to use:** This is the only integration point that matters — every other component (`VersionSelector`, `useSpellVersions`, `HifiDesktop`/`HifiMobile`) already consumes `SPELL_VERSIONS` and `loadVersion()` generically. If the dispatch stays inside `loadVersion()`, zero downstream components need to change.

**Trade-offs:** Version list is no longer a compile-time constant — anything that assumed `SPELL_VERSIONS` is static (e.g. `_initialVersionKey()` reading `SPELL_VERSIONS[0].key` as an ultimate fallback) must tolerate an empty/short list on first boot before IDB packs are enumerated (async). Mitigate: keep the SRD entry as `SPELL_VERSIONS[0]` always, and load pack metadata from IDB synchronously-ish before first render (IDB open + one read is fast, but is inherently async — see Pattern 3).

**Example:**
```js
// spells-data-loader.jsx — loadVersion(), extended
async function loadVersion(key) {
  if (_cache[key]) return _cache[key];
  if (_pending[key]) return _pending[key];
  const ver = SPELL_VERSIONS.find(v => v.key === key);
  if (!ver) throw new Error('Unknown version: ' + key);

  _pending[key] = (async () => {
    try {
      const json = ver.source === 'idb'
        ? await window.pluginStore.getSpells(ver.packId)   // NEW branch
        : await fetchJsonWithFallbackPaths(ver.file);       // existing logic, extracted
      _rawCache[key] = json;
      const adapted = adaptSpells(json, ver.lang, ver.edition);
      _cache[key] = adapted;
      return adapted;
    } catch (e) {
      // same toast/error handling as today
    }
  })();
  try { return await _pending[key]; } finally { delete _pending[key]; }
}
```

### Pattern 2: Import-Time Sanitization (not render-time)

**What:** HTML in `description`/`upgradeDescription` gets sanitized with an allowlist sanitizer (DOMPurify) exactly once, during `plugin-import.jsx`'s pipeline, before the pack is written to IndexedDB. Render-time (`dangerouslySetInnerHTML` call sites in `v10-hifi.jsx`) stays untouched — it trusts whatever is in IndexedDB/cache, same as it trusts the 4 bundled JSONs today.

**When to use:** Always, for any pack whose `source !== 'srd-builtin'`. The SRD pack ships from the repo (trusted, same footing as today's bundled JSONs) and does not need runtime sanitization — sanitize it once at build/generation time instead, not on every load.

**Trade-offs:**
- *Import-time* (chosen): sanitize once, pay the cost once, every render path stays fast and unchanged, no risk of a call site forgetting to sanitize. Con: a bug in the sanitizer config only surfaces at import, not retroactively — need a "re-sanitize on read" escape hatch if the allowlist changes later (see Pitfalls doc / migration note below).
- *Render-time*: would require finding and wrapping every `dangerouslySetInnerHTML` call site (3 locations across `v10-hifi.jsx`) and remembering to do it for every future one. Rejected — violates DRY, and the existing pitfall doc already flags `dangerouslySetInnerHTML` as a known concern (`.planning/codebase/CONCERNS.md`); centralizing at one pipeline stage is the safer surface.

**Example:**
```js
// plugin-import.jsx
function sanitizeSpellHtml(rawSpell) {
  const cfg = {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'span'],
    ALLOWED_ATTR: ['class'], // no href/src/style — spell descriptions don't need them
  };
  return {
    ...rawSpell,
    description: window.DOMPurify.sanitize(rawSpell.description || '', cfg),
    upgradeDescription: window.DOMPurify.sanitize(rawSpell.upgradeDescription || '', cfg),
  };
}

async function importPack(rawJson, meta) {
  const list = Array.isArray(rawJson) ? rawJson : (rawJson.spells || []);
  const sanitized = list.map(sanitizeSpellHtml);
  // Dry-run through adaptSpells to catch malformed rows before commit (fail loud, not silent)
  const adapted = window.adaptSpells(sanitized, meta.lang, meta.edition);
  if (adapted.length === 0) throw new Error('empty or unparseable pack');
  await window.pluginStore.putPack({ id: meta.id, meta, spells: sanitized }); // store SANITIZED RAW, not adapted — adaptSpell() re-runs on every load, same as fetch path
  return adapted.length;
}
```
Note: store the **sanitized raw** JSON (same shape as the bundled JSONs), not the already-adapted app-schema objects. This keeps `adaptSpells()` as the single normalization point for both fetch and IDB paths — if the app schema evolves later, IDB packs re-adapt automatically on next load instead of needing a migration script.

### Pattern 3: IndexedDB as a Promise-Wrapped Flat Store (no library)

**What:** One object store (`packs`, `keyPath: 'id'`) holding `{ id, meta, spells }` records. A ~15-line promise wrapper around the raw `indexedDB.open()`/transaction API — no `idb` npm package, since this project has no build step and no bundler to tree-shake it; a CDN UMD build would be an unjustified new dependency for what's a handful of methods.

**When to use:** Any client-side persistence of data too large for `localStorage`'s ~5MB quota (confirmed pain point: `.planning/PROJECT.md` decision log — "Arquivos de ~600KB+ estouram a quota do localStorage"). IndexedDB has no practical size ceiling for this use case (browser-dependent, but far above what a spell pack needs).

**Trade-offs:** Raw IndexedDB API is callback-based and verbose to hand-write correctly (transaction lifecycle, error propagation) — but the surface this app needs is small (put/get/getAll/delete on one store), so a thin wrapper is ~1 hour of work and zero new dependencies. Ladder-wise: stdlib/native platform feature (rung 4) beats adding `idb` as a dependency (rung 5) for a surface this small.

**Example:**
```js
// plugin-store.jsx
const DB_NAME = 'grimorio-plugins';
const DB_VERSION = 1;
const STORE = 'packs';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function putPack(pack) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(pack);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function listPacks() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result.map(p => p.meta)); // metas only — don't load spell blobs for the selector
    req.onerror = () => reject(req.error);
  });
}

async function getSpells(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result ? req.result.spells : []);
    req.onerror = () => reject(req.error);
  });
}

async function deletePack(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

window.pluginStore = { putPack, listPacks, getSpells, deletePack };
```

## Data Flow

### Request Flow: Import a Plugin (File)

```
User picks file / pastes URL in PluginManager
    ↓
plugin-import.jsx: read File via FileReader, or fetch(url)
    ↓
JSON.parse → validate manifest shape (meta.name, meta.lang required;
    reject if spells[] missing/empty — fail loud, one toast, no partial import)
    ↓
sanitizeSpellHtml() per spell (DOMPurify, allowlist)
    ↓
adaptSpells() dry-run — confirms the pack parses to a non-empty app-schema list
    (catches silently-malformed packs before they're persisted)
    ↓
pluginStore.putPack({ id: uuid, meta, spells: sanitizedRaw })
    ↓
Append to in-memory SPELL_VERSIONS (source: 'idb', packId: id, key: `plugin-${id}`)
    ↓
dispatch 'hifi-plugins-changed' (new event, mirrors 'hifi-chars-changed' pattern)
    ↓
VersionSelector / PluginManager re-render with new pack in the list
```

### Request Flow: App Boot with Installed Packs

```
index.html loads → spells-data-loader.jsx script executes
    ↓
SPELL_VERSIONS initialized with SRD entry only (sync, same as today's 4-entry array)
    ↓
plugin-store.jsx: listPacks() (async, IDB read)
    ↓
   .then(packs => SPELL_VERSIONS.push(...packs.map(toVersionEntry)))
    ↓
dispatch 'hifi-plugins-changed' (in case current version resolution needs a pack
    that just became available — e.g. saved prefs.versionKey pointed at an
    IDB pack from last session)
    ↓
useSpellVersions hook re-derives version list on the event → VersionSelector updates
```

**Boot-order gotcha:** `_initialVersionKey()` reads `localStorage['spellbook-ui-prefs'].versionKey` synchronously and may return a `plugin-*` key before IDB packs have loaded. Loader must handle "unknown version key at loadVersion() call time" by falling back to the SRD entry AND retrying once packs finish loading — don't throw and strand the user on a blank screen. This is the same class of problem the existing `?v=` URL-param handling has (it already tolerates unknown keys by falling through to preference/language detection) — extend that fallback chain, don't invent a new one.

### Key Data Flows

1. **Pack removal with active prepared spells:** `hifiSpellKey(s) = ${school}-${lvl}-${en}` is already pack-agnostic — it keys on the normalized English name, level, and school index, not on any pack/version identifier. This means: if a user has SRD's "Fireball" prepared, then installs a third-party pack that also contains "Fireball" (same `lvl`/`school`/English name), the prepared flag **transfers automatically** — no migration code needed for same-spell-different-pack. The only failure mode is a spell that existed in a *removed* pack and exists in *no remaining* pack: it stays in `character.prepared[]`/`bookmarked[]` (dead reference) but simply never matches any `hifiSpellKey()` from the active spell list, so it silently disappears from prepared/bookmark UI — no crash, no orphan record needs active cleanup. This matches the app's existing "graceful degradation" error strategy (see `.planning/codebase/ARCHITECTURE.md` Error Handling section) — no new error-handling pattern required, just confirm it during testing.
2. **Version selector growth:** `VersionSelector` (existing component in `spells-data-loader.jsx`, lines 301-414) already renders `versions.map(...)` generically — it needs zero changes to display 1 SRD + N plugin entries, as long as each entry has `label`/`labelPt`/`labelEn`/`lang`/`key`. Plugin `meta` must supply these at import time (derive `label` from `meta.name`, `lang` from `meta.lang`).
3. **Character `versionKey` reference decay:** characters don't store `versionKey` today (confirmed: character schema in `.planning/codebase/ARCHITECTURE.md` is `{ id, name, accentId, prepared[], bookmarked[], classes[], slots{} }` — no version field). Only the global UI pref (`spellbook-ui-prefs.versionKey`) references a version key. So pack removal only needs to fix **one** stored reference (global prefs), not per-character — fall back to the SRD key if the saved `versionKey` no longer resolves.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1-5 installed packs (expected normal use) | Current design as-is: `listPacks()` metadata-only read on boot, full `spells[]` blob loaded lazily on `loadVersion()`/version switch — matches today's "only active version fetched" behavior |
| 10-20 packs | Still fine — IDB `getAll()` on metadata is cheap (KBs, not the multi-hundred-KB spell blobs). No change needed. |
| 50+ packs / power users with huge community packs | Only then consider: paginating the PluginManager list UI, and/or a size cap + warning at import time (some browsers throttle IDB around tens of MB without a persistent-storage grant — call `navigator.storage.persist()` at first pack install to reduce eviction risk, not before) |

### Scaling Priorities

1. **First bottleneck:** none at expected scale (single user, local device, a handful of packs). This is a BYOD hobbyist feature, not a multi-tenant system — don't build for scale that won't happen (matches project's own "Out of Scope: large speculative rewrites" constraint).
2. **Second bottleneck:** if it ever matters, it's storage-quota eviction risk on low-disk devices — mitigated by requesting persistent storage (`navigator.storage.persist()`), not by re-architecting.

## Anti-Patterns

### Anti-Pattern 1: Forking `adaptSpell()`/`adaptSpells()` for plugin data

**What people do:** Write a separate normalization path for IDB-sourced packs "because they're different" (different source, need validation, etc.), duplicating the school/class/component mapping logic.

**Why it's wrong:** `adaptSpell()` is already tolerant (school EN/PT/abbreviation, classes both languages) per the existing audit noted in `.planning/PROJECT.md`'s Key Decisions ("auditoria aprovou o schema de spells existente"). Forking it means every future fix to school/class mapping has to happen twice, and the two paths silently drift.

**Do this instead:** Every pack — SRD, file-imported, URL-imported — funnels through the **same** `adaptSpells(json, lang, edition)` call inside `loadVersion()`, regardless of `source`. Validation/sanitization at import time operates on the *raw* JSON shape (before adaptation), same shape the bundled JSONs already have.

### Anti-Pattern 2: Sanitizing on every render instead of once at import

**What people do:** Wrap every `dangerouslySetInnerHTML` call site with a sanitizer call "to be safe everywhere."

**Why it's wrong:** Three call sites today (`v10-hifi.jsx` print sheet, spell card, detail panel) — a future fourth call site is easy to add and easy to forget to wrap. Also wastes CPU sanitizing the same trusted bundled/already-sanitized data on every render, on a low-power mobile device at the table.

**Do this instead:** Sanitize once in `plugin-import.jsx` before writing to IndexedDB. Trust IDB-read data at render time, same as the app already trusts fetched JSON today.

### Anti-Pattern 3: Storing adapted (app-schema) spells in IndexedDB instead of raw

**What people do:** Run `adaptSpells()` at import time and persist the *adapted* objects to IDB, to "save the adaptation cost on every load."

**Why it's wrong:** Couples the persisted format to the current app-schema version. Any future change to `adaptSpell()`'s output shape (new field, renamed field) requires a data migration for every installed pack. Adaptation cost is trivial (~600KB JSON, single pass, already done today on every fetch-path load with no perf complaint on record).

**Do this instead:** Persist the sanitized **raw** JSON (same shape as `spells-5E-*.json` files today); call `adaptSpells()` on every `loadVersion()` read, for both `fetch` and `idb` sources alike. One normalization point, no migration surface.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| DOMPurify (CDN, UMD) | `<script src="https://unpkg.com/dompurify@.../purify.min.js" integrity="sha384-..." crossorigin="anonymous">` in `index.html`, before `plugin-import.jsx` | Matches the exact pattern already used for React/ReactDOM/Babel (pinned version + SRI hash). Only ~9KB gzipped — negligible vs. the 2.4MB of spell JSON this milestone is removing from precache. This is the **only** new external dependency needed for this milestone. |
| URL-based plugin import (user-supplied URL) | `fetch(url)` from the browser, same-origin or CORS-permitting only | No CORS proxy — if the target server doesn't send CORS headers, the fetch fails and the app should show a clear toast ("this URL doesn't allow browser fetches"), not attempt a workaround server. Matches "no backend" constraint. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `spells-data-loader.jsx` ↔ `plugin-store.jsx` | Direct function call (`window.pluginStore.getSpells()`), same pattern as today's `window.v8DescriptionHtml` cross-file globals | No event needed for the read path — `loadVersion()` already returns a promise; IDB read just becomes one more `await` branch |
| `plugin-import.jsx` ↔ `spells-data-loader.jsx` | New custom event `hifi-plugins-changed` (mirrors existing `hifi-spells-source-changed` / `hifi-chars-changed`) — fired after a pack is installed/removed so `SPELL_VERSIONS` gets rebuilt and `VersionSelector`/`useSpellVersions` re-render | Follows the codebase's established cross-component communication pattern (custom events over prop drilling) — see `.planning/codebase/ARCHITECTURE.md` Entry Points / Event Broadcast Listeners section |
| `PluginManager` UI ↔ `plugin-import.jsx` | Direct call (`await importPack(json, meta)`), UI awaits and shows toast/error, same as `CharacterEditor`'s save flow | New UI component, inline-rendered in App per the existing "No Global Modal Manager" anti-pattern note (each dialog owns its open/close state) |
| `sw.js` ↔ everything else | No new boundary — SW precache list shrinks (4 JSONs → 1 SRD JSON); IndexedDB is **not** mediated by the service worker at all, it's a separate browser storage API that Just Works offline without SW involvement | Common point of confusion: don't add IDB packs to `PRECACHE` or try to cache them via the Cache API — they're already durable browser-side storage |

## Suggested Build Order

Dependency-ordered; each step is independently testable before the next starts.

1. **`plugin-store.jsx`** (IndexedDB CRUD, no dependents yet) — testable standalone via browser devtools console (`pluginStore.putPack(...)`, inspect Application > IndexedDB)
2. **SRD pack generation** (`spells-srd-en.json`) — extract CC-BY subset from existing data, independent of all plugin code; can happen in parallel with step 1
3. **`spells-data-loader.jsx` modification** — add `source` dispatch in `loadVersion()`, wire SRD as the new static `SPELL_VERSIONS[0]` replacing today's 4 entries, append `plugin-store.listPacks()` results on boot. Depends on step 1 (needs `pluginStore.getSpells`) and step 2 (needs the SRD file to exist). This is the highest-risk step — it touches the most load-bearing existing code; verify existing version-switch behavior (cache, `hifi-spells-source-changed` event) still works with zero packs installed before adding import.
4. **`plugin-import.jsx`** (sanitization + validation pipeline) — depends on step 1 (storage) and DOMPurify CDN script tag added to `index.html`. Testable via a manual "import this JSON file" test before any UI exists.
5. **`PluginManager` UI** (install/list/remove) — depends on step 4. Last, since it's the thinnest layer — pure UI wiring to already-tested `importPack()`/`pluginStore` functions.
6. **`sw.js` precache list update + old JSON removal** — do this **last**, after steps 1-5 are verified working end-to-end with the SRD pack. Removing the 4 bundled JSONs from precache and repo is the irreversible/decommission step; sequence it after the replacement path is proven, not before.
7. **Migration handling for existing users** (stale `versionKey` in `spellbook-ui-prefs` pointing at a removed bundled version) — small fallback-chain addition to `_initialVersionKey()`/`loadVersion()` error path, do this alongside or immediately after step 6 since it's only exercisable once old versions are actually gone.

## Sources

- `spells-data-loader.jsx` (read in full — grounds all integration points, HIGH confidence, primary source)
- `sw.js` (read in full — grounds service worker interplay, HIGH confidence, primary source)
- `v10-hifi.jsx` (grepped for `hifiSpellKey`, `dangerouslySetInnerHTML` — grounds identity-stability and sanitization-placement claims, HIGH confidence, primary source)
- `.planning/PROJECT.md`, `.planning/codebase/ARCHITECTURE.md`, `.planning/REQUIREMENTS.md` (project context and prior decisions, HIGH confidence, primary source)
- [MDN: IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) — confirms structured-clone semantics and promise-wrapper pattern, MEDIUM-HIGH confidence (official docs)
- [DOMPurify — GitHub (cure53)](https://github.com/cure53/DOMPurify) and [Default TAGs/ATTRIBUTEs allow list wiki](https://github.com/cure53/DOMPurify/wiki/Default-TAGs-ATTRIBUTEs-allow-list-&-blocklist) — confirms allowlist-based sanitization API shape, MEDIUM-HIGH confidence (official project docs)
- General web search confirming DOMPurify as the standard client-side sanitizer for `dangerouslySetInnerHTML` and current no-wrapper IndexedDB best practices, MEDIUM confidence (aggregated web search, cross-referenced against MDN/official docs above)

---
*Architecture research for: BYOD plugin system integration*
*Researched: 2026-07-18*
