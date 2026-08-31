---
phase: 05-plugin-manager-ui-version-selector
reviewed: 2026-08-31T02:30:10Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - i18n.jsx
  - index.html
  - pack-import-dialog.jsx
  - pack-manager.jsx
  - scripts/check-pack-import-dialog.tests.ps1
  - scripts/check-pack-manager.tests.ps1
  - scripts/check-pack-wiring.tests.ps1
  - spells-data-loader.jsx
  - sw.js
  - v10-hifi.jsx
findings:
  critical: 2
  warning: 5
  info: 4
  total: 11
status: issues_found
---

# Phase 5: Code Review Report

**Reviewed:** 2026-08-31T02:30:10Z
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

The surface work is solid: i18n parity is exact (190 keys in each block, `i18nParityCheck()`
returns `{}`), the `sw.js` PRECACHE list matches the nine `text/babel` scripts in `index.html`
with no drift, `PackImportRoot` is fully retired from both `pack-import-dialog.jsx` and
`index.html`, the CC-BY text is rendered as a plain React text child inside `<details>` with
`whiteSpace: 'pre-wrap'` and no truncation (P-03/D-14 holds), hook order in `PackManager` is
stable (every hook precedes the `if (!open) return null`), and `_installedRows`/`PackManagerRow`
correctly coerce and slice third-party `name`/`version` before they reach the DOM. All 33 static
gate scripts pass.

The defects are concentrated in one place the gates cannot see: the spell index that both
MGMT-04 (duplicate counts, "Também em:") and MGMT-02 (removal impact) are derived from. Two
independent bugs there make the numbers shown in a **destructive confirmation dialog** wrong in
both directions — proven with a runnable harness against the actual source, not inferred. A
third finding shows the P-01/D-07 "never writes to `hifi_bookmarks_v1`" invariant is asserted by
a comment and by a grep-based gate, but is actually only held up by an accident of boot ordering
in a different module.

No security vulnerabilities were found. Pack-supplied strings reach the DOM only as React text
children (`toast.msg`, row name/version, license text) — no `dangerouslySetInnerHTML` was added
(the v10-hifi sink count is still pinned at 5), no `eval`, no injection sink, no hardcoded
secret. The prototype-pollution posture from T-05-05 mostly holds (`Map` for the index,
`Object.create(null)` for `PACK_ERR_KEY_BY_CODE` and `SCHOOL_INDEX`), with two new plain-object
lookup tables noted as Info because their key space is not attacker-reachable.

## Critical Issues

### CR-01: Spell index silently excludes the four PHB builtins — removal impact over-reports and MGMT-04 duplicate counts under-report

**File:** `pack-manager.jsx:71`
**Issue:**

```js
const all = (window.SPELL_VERSIONS || []).filter((v) => v.source === 'idb' || v.corpus === 'srd');
```

This predicate is the same one `_builtinRows` (line 42) uses to decide which builtins get a
*display row*, where it is justified by A-01 ("the legacy PHB/PT-BR entries have no licence
manifest"). Reusing it for the *index* is unjustified and unsound: the index is keyed by
`window.hifiSpellKey`, which is `` `${s.school}-${s.lvl}-${s.en}` `` (`v10-hifi.jsx:9`) —
version-independent, and `adaptSpell` normalises `school` to a numeric index and `en` to the raw
English `s.name`, so PT-BR and EN builtins produce **identical keys**. The four
`corpus: 'phb'` builtins (`spells-5E-2024-PTBR`, `spells-5E-2014-PTBR`, `spells-5E-2024-EN`,
`spells-5E-2014-EN`) are therefore dropped from both `byName` and `byKey`, and:

1. `_removalImpact` (line 148) declares a key stale when `sources.length === 1`. A prepared spell
   served by both the pack *and* a PHB builtin has `sources === ['plugin-x']`, so the confirmation
   claims it "deixa de resolver" when it will keep resolving after removal — a **false alarm in a
   destructive confirmation**, which is exactly the concrete-impact contract MGMT-02/D-06 exists
   to honour.
2. `_computeDupCounts` (line 129) and the `spell.alsoIn` note in `v10-hifi.jsx:1030-1038` never
   see PHB overlaps at all. A pack that republishes standard 5e spells reports
   `manager.duplicates` = 0 and shows no "Também em:" note — the MGMT-04 signal is blind to the
   four largest corpora in the app.

Reproduced against the real functions (registry: one SRD builtin, one PHB builtin, one pack;
pack and PHB both contain `Fireball` lvl 3 evocation, which the character has prepared):

```
byKey: [ ['0-1-Shield', ['srd-2024-en']],
         ['4-3-Fireball', ['plugin-meupack']],        <- PHB copy missing
         ['0-1-Bless', ['plugin-meupack','plugin-meupack']] ]
impacto ao remover plugin-meupack: { prepared: 1, characters: 1, bookmarked: 0 }
dupCounts: { 'srd-2024-en': 0, 'plugin-meupack': 0 }  <- Fireball overlap invisible
```

`prepared: 1` is Fireball, which survives removal via the PHB builtin. `dupCounts` reports 0
duplicates for a pack that genuinely duplicates a builtin spell.

**Fix:** index every version in the registry; keep the cost short-circuit and the A-05 corpus
rule, which are orthogonal to which corpora get indexed.

```js
// Index EVERY version: hifiSpellKey (school-lvl-en) is version-independent, so a
// prepared key served by a legacy PHB builtin must be visible here or _removalImpact
// over-reports and _computeDupCounts under-reports. A-01's corpus:'srd' filter is a
// *display-row* rule (licence manifest), not an index rule.
const all = (window.SPELL_VERSIONS || []);
```

`_countsAsDuplicate` already handles the SRD↔SRD exemption (A-05); PHB↔PHB and PHB↔SRD are
genuine cross-corpus overlaps and should count. If SRD↔SRD-style pairing is also wanted for
PHB 2014↔PHB 2024, widen `_countsAsDuplicate` to `corpusA === corpusB` rather than narrowing the
index.

---

### CR-02: `byKey` stores a non-deduplicated array, so `staleKey`'s `length === 1` test silently under-reports removal impact

**File:** `pack-manager.jsx:106-110`, `pack-manager.jsx:152-155`
**Issue:** `byKey` accumulates one entry **per spell**, not per version:

```js
const k = window.hifiSpellKey(spell);
if (!byKey.has(k)) byKey.set(k, []);
byKey.get(k).push(v.key);            // pushes v.key once per spell
```

and `staleKey` treats that array as a set of sources:

```js
const sources = index.byKey.get(key);
return !!sources && sources.length === 1 && sources[0] === versionKey;
```

Two entries in the *same* pack that collapse to the same `school-lvl-en` key (a repeated spell, a
variant listing, or two spells whose school string the app does not recognise — `adaptSpell`
sets `school: null` for unknown schools, `spells-data-loader.jsx:369`) produce
`['plugin-x','plugin-x']`. `length === 1` is false, so the key is reported as **not** impacted.
The confirmation then shows `manager.impactNone` ("nothing prepared or bookmarked depends on this
pack alone") for a pack that is the sole source of prepared *and* bookmarked spells.

In the harness above, `Bless` is prepared and bookmarked and is served *only* by the pack, yet
`bookmarked: 0` and Bless contributes nothing to `prepared` — the entire true impact was dropped
because the pack listed it twice.

Note the asymmetry that hides this: `_computeDupCounts` (line 134) *does* dedupe with
`[...new Set(keys)]`. `_removalImpact` does not.

**Fix:** make the index store sets, so the invariant is structural instead of relying on every
consumer remembering to dedupe:

```js
const byName = new Map();   // nameKey  -> Set<versionKey>
const byKey  = new Map();   // spellKey -> Set<versionKey>
...
if (!byName.has(nameKey)) byName.set(nameKey, new Set());
byName.get(nameKey).add(v.key);
...
if (!byKey.has(k)) byKey.set(k, new Set());
byKey.get(k).add(v.key);
```

then in `_removalImpact`:

```js
const staleKey = (key) => {
  const sources = index.byKey.get(key);
  return !!sources && sources.size === 1 && sources.has(versionKey);
};
```

Consumers become `[...keys]` in `_computeDupCounts` (line 134) and `[...(index.byName.get(nameKey) || [])]`
in `v10-hifi.jsx:1033`. Both already spread through `new Set(...)`, so the change is mechanical.

## Warnings

### WR-01: `_removalImpact` is documented as strictly read-only, but `window.loadBookmarks()` writes to `hifi_bookmarks_v1`

**File:** `pack-manager.jsx:143-147`, `pack-manager.jsx:169`
**Issue:** The header comment claims "estritamente de leitura via `window.loadCharacters()`/
`window.loadBookmarks()`" and "Nada aqui é persistido". `loadBookmarks()` is not a pure read —
`v11-character-editor.jsx:350-370` takes a migration branch when the key is absent and calls
`localStorage.setItem(HIFI_BOOKMARKS_KEY, ...)` (line 365). Opening the remove confirmation can
therefore write to `hifi_bookmarks_v1`, which P-01/D-07 declares off-limits for this phase
("removal must leave `hifi_chars_v1` and `hifi_bookmarks_v1` byte-identical").

In practice the invariant survives only because `useBookmarks()` runs at app boot
(`v10-hifi.jsx:1171`, `2216`) and has already performed the migration before the manager can be
opened. That is an accident of module load order in a different file, not a property of this code.

The static gate cannot catch it: `scripts/check-pack-manager.tests.ps1:96` and `:155` grep
`pack-manager.jsx` for the literal strings `localStorage`, `persistBookmarks`, etc. An indirect
write through a `window.*` call is invisible to a text gate, so §8/§15 currently give false
assurance on the phase's hardest prohibition.

**Fix:** read the store without the migration side effect, and drop the false claim from the
comment:

```js
// P-01/D-07: NÃO usa window.loadBookmarks() — ele grava hifi_bookmarks_v1 no ramo de
// migração (v11-character-editor.jsx:365). Leitura crua, zero escrita.
function _readBookmarks() {
  try {
    const parsed = JSON.parse(localStorage.getItem('hifi_bookmarks_v1') || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) { return []; }
}
```

If keeping `pack-manager.jsx` free of the literal `localStorage` (so gate §8/§15 stays green)
matters, expose a read-only `window.peekBookmarks()` from `v11-character-editor.jsx` instead and
call that. Either way, extend the gate to assert the indirect path — e.g. fail if
`pack-manager.jsx` matches `loadBookmarks`.

---

### WR-02: "Sim" is clickable before the removal impact has been computed

**File:** `pack-manager.jsx:202-221`, `pack-manager.jsx:300-312`
**Issue:** `setImpact(null)` runs synchronously when the confirmation opens, and the real value
arrives only after `packSpellIndex()` resolves — which, on a cold index, awaits
`loadSpellVersion()` for both SRD JSONs (~770 KB combined) plus every installed pack,
sequentially (`for...of` with `await`, line 90). Meanwhile the confirmation renders with all three
impact branches false (`impact` is `null`), so the impact area is an empty `<div>` — not even
`manager.impactNone` — while `manager.yes` at line 218 is fully enabled.

A user who clicks through quickly, or who is on a cold/slow load, commits the destructive removal
having been shown **no impact statement at all**. MGMT-02/D-06 requires the confirmation to carry
concrete impact; right now that is best-effort.

**Fix:** gate the confirm on a resolved impact.

```js
{impact === null ? (
  <div>{tt(lang, 'manager.loading')}</div>
) : (
  <>
    {impact.prepared > 0 && <div>{tt(lang, 'manager.impactPrepared', { n: impact.prepared, c: impact.characters })}</div>}
    {impact.bookmarked > 0 && <div>{tt(lang, 'manager.impactBookmarked', { n: impact.bookmarked })}</div>}
    {impact.prepared === 0 && impact.bookmarked === 0 && <div>{tt(lang, 'manager.impactNone')}</div>}
  </>
)}
...
<button type="button" className="hifi-btn-primary" disabled={impact === null} onClick={onConfirmRemove}>
  {tt(lang, 'manager.yes')}
</button>
```

("Não" must stay enabled — the user can always back out.)

---

### WR-03: License text is rendered without the type coercion applied to every other third-party field

**File:** `pack-manager.jsx:235`, `pack-manager.jsx:239`
**Issue:** `PackManagerRow` is explicit that pack-supplied strings must be coerced before they
reach React (line 183-185: `String(row.name || '').slice(0, 64)`, per T-05-01), but two lines
later renders the license fields raw:

```jsx
{row.license.attribution}
...
{row.license.modifications}
```

For an installed pack, `row.license` comes straight off the IndexedDB record via
`pluginStore.listPacks()` (`pack-manager.jsx:33`). `pluginStore.putPack`'s `_assertPackShape`
(`plugin-store.jsx:72-85`) validates only `id`/`meta` is-an-object/`spells` is-an-array — it does
**not** validate `meta.license` shape. Only the import funnel enforces
`attribution: { type: 'string' }` (`pack-import.jsx:63`). Any record reaching the store by another
route — a future importer, a restore/sync path, a partially migrated record — with an object or
array there makes React throw "Objects are not valid as a React child". There is no error boundary
in this app, so that blanks the entire UI, not just the row.

Same class of defense-in-depth the file already applies one screen up; the inconsistency is the
defect.

**Fix:**

```jsx
{String(row.license.attribution || '')}
...
<strong>{tt(lang, 'manager.modifications')}: </strong>
{String(row.license.modifications)}
```

(No `.slice()` — P-03/D-14 forbids truncating the attribution. Coercion alone is enough.)

---

### WR-04: A builtin SRD row renders with no attribution at all when its JSON fails to load, silently and permanently

**File:** `pack-manager.jsx:343-354`, `pack-manager.jsx:228`
**Issue:** The builtin license only exists once `loadSpellVersion(v.key)` has populated
`_metaCache` (`spells-data-loader.jsx:471-473`). `loadVersion` swallows fetch failures — it
`console.warn`s, fires a `toast.loadFailed`, returns `[]`, and never caches meta
(`spells-data-loader.jsx:484-497`). `getVersionMeta` then returns `null`, `_builtinRows` sets
`license: null`, and line 228's `{row.license && ...}` drops the whole "Licença e atribuição"
disclosure.

The row itself still renders — name, version, "embutido" — so the manager presents the SRD 5.1 /
5.2 editions as available with zero CC-BY attribution attached, no visible signal that anything is
missing, and no retry. `setLicenses` is only driven by the `[open]` effect, so reopening the
manager does retry, but a persistently failing fetch (first visit offline before the SW precache
lands, a 404 after a bad deploy) leaves the attribution permanently absent. SRD-02/P-03 make that
text mandatory wherever the edition is presented, so a silent empty state is the wrong failure
mode.

**Fix:** make the absence visible rather than invisible — track the load outcome and render an
explicit state:

```js
.catch((e) => {
  console.warn('[pack-manager] falha ao carregar licença builtin:', v.key, e);
  setLicenses((prev) => ({ ...prev, [v.key]: 'error' }));
});
```

and in `PackManagerRow`, render a short "attribution unavailable — reopen when online" line for
the `'error'` sentinel instead of omitting the `<details>` entirely. (Needs one new i18n key in
both blocks.)

---

### WR-05: The manager and the version registry apply different validity filters to the same `listPacks()` records

**File:** `pack-manager.jsx:25-35`, `pack-manager.jsx:423-432`
**Issue:** `refreshPluginVersions()` drops metas whose `source` is not a non-empty string before
building version entries (`spells-data-loader.jsx:130-132`):

```js
.filter(m => m && typeof m.source === 'string' && m.source !== '')
```

`_installedRows` applies no such filter. A record the version registry rejects still gets a manager
row, with `id: undefined` and `versionKey: 'plugin-undefined'`. Consequences:
`key={row.id}` (line 425) is `undefined`, so two such records collide as React keys and reconcile
against each other; `dupCounts['plugin-undefined']` is always `undefined`; `_removalImpact` always
returns zeroes; and "Remover" → `deletePack(undefined)` fails in the IndexedDB transaction, so the
row is undeletable and always shows the generic `manager.removeFailed`. The user sees a permanently
stuck, uninformative row.

The current import funnel guarantees `meta.source` is a non-empty string
(`pack-import.jsx:402-410` sets `pack.meta.source = identifier` and uses the same value as the
record `id`), so this needs a record written outside that funnel — but two consumers disagreeing
about what a valid record is, over the same store, is a latent divergence worth closing while it
is cheap.

**Fix:** reuse the registry's predicate.

```js
function _installedRows(metas) {
  return (metas || [])
    // Mesmo filtro de refreshPluginVersions() (spells-data-loader.jsx): um meta sem
    // `source` string não-vazia não vira entrada de versão, então também não pode
    // virar linha — deletePack(undefined) falharia e a linha ficaria presa.
    .filter((m) => m && typeof m.source === 'string' && m.source !== '')
    .map((meta) => ({ /* ... */ }));
}
```

## Info

### IN-01: Removal toast interpolates the pack name un-truncated

**File:** `pack-manager.jsx:325`
**Issue:** `tt(lang, 'manager.removed', { name: row.name })` uses the raw meta value, while the
row itself slices to 64 chars precisely because the name is third-party (T-05-01, line 184). The
schema does not bound `meta.name`'s length, so a multi-KB name renders whole inside the
fixed-position toast (`v10-hifi.jsx:56-75`, `pointerEvents: 'none'`), which will overflow the
viewport for 2.4 s with no way to dismiss it. Not a security issue — the toast renders
`{toast.msg}` as a text child, so it is escaped.
**Fix:** `{ name: String(row.name || '').slice(0, 64) }`, matching line 184.

---

### IN-02: `_metaCache` is a plain object literal, against the phase's own prototype-less convention

**File:** `spells-data-loader.jsx:372`, `spells-data-loader.jsx:509`
**Issue:** `const _metaCache = {};` is a new lookup table indexed by version key. The codebase
established the opposite convention for exactly this shape — `SCHOOL_INDEX`
(`spells-data-loader.jsx:207`, "CR-03: sem protótipo") and `PACK_ERR_KEY_BY_CODE`
(`pack-import-dialog.jsx:23`, "WR-09: sem prototipo") both use `Object.assign(Object.create(null), …)`.
`getVersionMeta('constructor')` returns the inherited `Object` function instead of `null`,
breaking the "sempre null, nunca undefined" contract stated in its own comment (line 507-508).
Currently unreachable — `_builtinRows` only passes hardcoded builtin keys and `loadVersion` gates
writes behind `_versionByKey(key)` — but it is the same pattern two prior review rounds opened
findings for. `_computeDupCounts`'s `const counts = {}` (`pack-manager.jsx:130`) is the same shape
and is likewise unreachable (keys are `'plugin-'`-prefixed or hardcoded, and readers guard with
`typeof dupCount === 'number'`).
**Fix:** `const _metaCache = Object.create(null);`

---

### IN-03: The "Também em:" note does not refresh when packs change while a spell detail is open

**File:** `v10-hifi.jsx:1021-1042`
**Issue:** The effect's deps are `[s, versionKey]`. `packSpellIndex()`'s memo is invalidated on
`hifi-plugins-changed` (`pack-manager.jsx:122`), but this consumer never subscribes to that event,
so installing or removing a pack from the manager while the detail panel is open leaves a stale
note until the spell or the active version changes. `PackManager` subscribes correctly for both
`reload` and `reloadDupCounts` (lines 273-291); this is the one consumer that does not.
**Fix:** add a `hifi-plugins-changed` listener that bumps a counter included in the effect deps,
mirroring the `reloadDupCounts` pattern.

---

### IN-04: Both manager triggers fail silently, and the D-19 guard removes the desktop trigger with the selector

**File:** `spells-data-loader.jsx:594`, `spells-data-loader.jsx:653`, `spells-data-loader.jsx:715`, `v10-hifi.jsx:2604-2607`
**Issue:** Two related edges in the trigger wiring:

1. `window.__openPackManager?.()` / `window.__openPackManager && window.__openPackManager()` are
   both no-ops when the global is absent. The mobile row closes the drawer first
   (`setDrawerOpen(false)` then the call), so the user sees the drawer dismiss and nothing happen —
   a dead click with no console trace. `PackManagerRoot`'s effect (`pack-manager.jsx:464-470`)
   installs the global on mount, and `App` returns `null` before mounting it when `!character`
   (`index.html:559`), so the window is small but non-empty.
2. The new D-19 guard `if (!currentVer) return null;` (`spells-data-loader.jsx:594`) unmounts the
   entire `VersionSelector` — including the "Gerenciar pacotes…" entry added just below it — when
   the version list is empty. That is precisely the state in which the manager's empty state is
   most useful, and on desktop the selector is the only route to it. Unreachable today
   (`SPELL_VERSIONS` always starts from six builtins and `refreshPluginVersions` only splices
   `source === 'idb'` entries), but the guard and the trigger now have coupled lifetimes that the
   D-19 rationale did not anticipate.

**Fix:** for (1), `console.warn` on the miss so it is diagnosable; for (2), leave a note on the
guard that the manager trigger is inside the early return, so a future empty-registry path needs a
separate entry point.

---

_Reviewed: 2026-08-31T02:30:10Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
