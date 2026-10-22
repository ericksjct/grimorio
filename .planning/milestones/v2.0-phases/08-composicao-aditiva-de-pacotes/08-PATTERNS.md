# Phase 8: Composição aditiva de pacotes - Pattern Map

**Mapped:** 2026-09-27
**Files analyzed:** 11 (new/modified)
**Analogs found:** 11 / 11 (all are modifications of, or new siblings to, existing files — no greenfield module in this phase)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `spells-data-loader.jsx` (modify: `_currentVersion`→`selectedVersionKeys`, `adaptSpell`, union, `resolveSelection`, D-23 migration) | service/store (in-memory registry + cache) | CRUD + transform | itself (existing functions being replaced in place) | exact |
| `pack-manager.jsx` → renamed/absorbed into pack menu (D-16) | component | request-response (checkbox/CRUD UI over IndexedDB) | itself (`PackManager`/`PackManagerRoot`) | exact |
| `pack-rename-dialog.jsx` (new file, per RESEARCH's recommended structure) | component (modal form) | request-response | `pack-import-dialog.jsx` (dialog chrome, `useDialogA11y`, submit/cancel flow) | role-match |
| Slug-collision detection helper (`detectSlugCollisions`, likely added to `pack-import.jsx` or a shared helper) | utility | transform (pure computation over two spell lists) | `pack-manager.jsx`'s `packSpellIndex()`/`_computeDupCounts()` (index-building over all versions) — explicitly NOT `freeIdentifier()` | role-match |
| `pack-import.jsx` (modify: `META_FIELDS` + `meta.image` validation, wire rename prompt before `putPack()`) | utility (hand-rolled validator) | transform + file-I/O (reads File/text, validates) | itself (`META_FIELDS`, `_checkObject`, `_install`) | exact |
| `plugin-store.jsx` (modify: rename write path via `putPack()`) | service (IndexedDB CRUD) | CRUD | itself (`putPack`) | exact |
| `v10-hifi.jsx` (modify: `~30` call sites `versionLang`→`s.lang`, `hifiSpellKey` unchanged, "Também em:", `useEditionCompare`) | component (grid/detail) | transform (render) | itself | exact |
| `v11-character-editor.jsx` (modify: `initialVersionKey` derivation, orphan-spells section unchanged in shape, D-13 destination) | component | CRUD (character storage) | itself + F6 orphans section (already handles unresolved keys) | exact |
| `index.html` (modify: `versionKey`→list, `?v=` comma-list parse, D-23 migration write) | config/bootstrap | request-response (URL/localStorage read-write) | itself (~L395-495 `versionKey` init/persist block) | exact |
| `i18n.jsx` (modify: add `menu.*`, `rename.*`, `packErr.image*`, `noun.character.*` keys) | config (dictionary) | CRUD (static key-value) | itself (existing `manager.*`/`noun.spell.*` key blocks) | exact |
| `pack.schema.json` (modify: add `meta.image` optional field) | config (schema) | transform | itself (existing `meta.source`/`meta.edition` field entries) | exact |
| `pack-docs.html` (modify: reserved-slugs table) | static doc | transform | itself (existing license/field docs) | exact |
| `scripts/generate-srd-pack.mjs` (modify: emit reserved-slugs JSON) | utility (Node build script) | batch/file-I/O | itself (existing per-SRD JSON emission) | exact |
| `sw.js` (modify: `CACHE_VERSION` bump, add reserved-slugs JSON to `PRECACHE`) | config | file-I/O (cache manifest) | itself | exact |
| `scripts/check-pack-composition.tests.ps1` (new) | test | batch (source-assertion) | `scripts/check-migration-version-fallback.tests.ps1` | exact |
| `scripts/check-slug-rename.tests.ps1` (new) | test | batch | `scripts/check-pack-import-dialog.tests.ps1` (dialog-shape assertions) + `check-pack-validator.tests.ps1` (field-validation assertions) | role-match |
| `scripts/check-pack-menu.tests.ps1` (new, likely renames `check-pack-manager.tests.ps1`) | test | batch | `scripts/check-pack-manager.tests.ps1` | exact |
| `scripts/check-selection-migration.tests.ps1` (new) | test | batch | `scripts/check-migration-version-fallback.tests.ps1` | exact |
| `scripts/check-pack-validator.tests.ps1` (extend, PKG-06) | test | batch | itself | exact |
| `scripts/check-loader-hardening.tests.ps1` / `check-edition-compare.tests.ps1` (extend, MGMT-08/SRD-05) | test | batch | itself | exact |

## Pattern Assignments

### `spells-data-loader.jsx` — selection model, union, per-spell lang stamping

**Analog:** itself (functions being replaced in place — read the existing shape before touching it)

**Registry/mutation convention** (lines 38-44):
```javascript
// SPELL_VERSIONS é o registro VIVO — extensível em runtime (packs de
// IndexedDB). REGRA DURA: só pode ser mutado IN PLACE (push/splice); NUNCA
// reatribuído. window.SPELL_VERSIONS, os leitores em index.html e
// v10-hifi.jsx seguram a MESMA referência de array.
const SPELL_VERSIONS = BUILTIN_VERSIONS.slice();
function _versionByKey(key) {
  return SPELL_VERSIONS.find(v => v.key === key) || null;
}
```
Apply this same "never reassign, only mutate in place" discipline to the new `selectedVersionKeys` array if it is exposed as a shared reference (it should instead be plain persisted state in `index.html`'s App, not a shared-reference global — but any new shared array must follow this convention).

**Default/empty-selection fallback** (lines 66-68, D-04's exact existing mechanism):
```javascript
function _defaultVersion() {
  return SPELL_VERSIONS[0];
}
```
`resolveSelection([])` must call this, not reinvent a default.

**Legacy-key migration pattern to mirror for D-23** (lines 70-90, 483-520):
```javascript
const LEGACY_VERSION_FALLBACK = Object.assign(Object.create(null), {
  'spells-5E-2024-PTBR': 'srd-2024-ptbr',
  'spells-5E-2024-EN': 'srd-2024-en',
  'spells-5E-2014-PTBR': 'srd-2014-en',
  'spells-5E-2014-EN': 'srd-2014-en',
});
window.__legacyVersionFallback = null; // initialized before _initialVersionKey() runs

function _initialVersionKey() {
  try {
    const urlV = new URL(window.location.href).searchParams.get('v');
    let prefs = {};
    try { prefs = JSON.parse(localStorage.getItem('spellbook-ui-prefs') || '{}') || {}; } catch (e) {}
    _wantedVersionKey = urlV || prefs.versionKey || null;
    if (urlV && _versionByKey(urlV)) return urlV;
    if (prefs.versionKey && _versionByKey(prefs.versionKey)) return prefs.versionKey;
    if (prefs.versionKey && LEGACY_VERSION_FALLBACK[prefs.versionKey]) {
      const fallbackTo = LEGACY_VERSION_FALLBACK[prefs.versionKey];
      window.__legacyVersionFallback = { from: prefs.versionKey, to: fallbackTo };
      _wantedVersionKey = null;
      return fallbackTo;
    }
    // ...browser-language detection fallback...
  } catch (e) {}
  return _defaultVersion().key;
}
```
D-23's single→list migration is this exact shape: apply `LEGACY_VERSION_FALLBACK` FIRST (as this function already does), THEN wrap the resolved single key in `[key]` for the new persisted shape. Do not invert the order.

**`adaptSpell`/`adaptSpells` — the exact function to extend with `lang`/`_versionKey`** (lines 372-462):
```javascript
function adaptSpell(s, versionLang, edition) {
  // ...
  return {
    en: enName, pt: ptName, /* ...existing fields unchanged... */
    edition: edition || '',
    // NEW for Phase 8 (Pattern 2 in RESEARCH.md):
    // lang: versionLang,
    // _versionKey: versionKey,
  };
}
function adaptSpells(json, versionLang, edition) {
  const list = Array.isArray(json) ? json : (json?.spells || []);
  return list.map(s => adaptSpell(s, versionLang, edition));
}
```
Call site to update in the same wave (line 595): `loadVersion()` already has `ver.key` in scope when it calls `adaptSpells(json, ver.lang, ver.edition)` — passing `ver.key` through is the one-line change RESEARCH.md's Pattern 2 describes.

**Fetch/cache dedup — reuse verbatim, do not reimplement for multi-pack loading** (lines 569-623):
```javascript
async function loadVersion(key) {
  if (_cache[key]) return _cache[key];
  if (_pending[key]) return _pending[key];
  // ... ver = _versionByKey(key); dispatch by ver.source ('idb' vs 'fetch') ...
}
```
Loading N packs for the union is `await Promise.all(resolvedKeys.map(loadVersion))` — no new fetch/cache layer needed.

**Resolvable-keys precedent for D-13's impact count** (lines 641-670): `resolvableSpellKeys()` already loads ALL `SPELL_VERSIONS` (not just active) and builds a `Set` of `hifiSpellKey` — reuse this exact function for computing "how many prepared/bookmarked entries would orphan after this rename," by comparing the set before/after the slug rename.

**Toast dispatch on load failure — chrome language convention** (lines 605-613):
```javascript
window.dispatchEvent(new CustomEvent('hifi-toast', {
  detail: { msg: window.tt ? window.tt(_uiLang(), 'toast.loadFailed') : 'falha ao carregar as magias', kind: 'err' },
}));
```
The new `menu.toastFallbackToDefault` (UI-SPEC) must follow this exact `_uiLang()`-not-pack-lang convention — `_uiLang()` (lines 56-64) is the existing helper to reuse verbatim.

---

### `pack-manager.jsx` → pack menu (absorbs `PackManager`, D-16)

**Analog:** itself

**Index-building pattern to extend for reserved-slugs (D-15) and slug-collision detection (D-08/D-09)** (lines 159-164):
```javascript
function packSpellIndex() {
  return _indexPromise || (_indexPromise = _buildSpellIndex());
}
window.addEventListener('hifi-plugins-changed', () => { _indexPromise = null; });
window.packSpellIndex = packSpellIndex;
```
The reserved-slugs section (D-15, "slug → subitem per pack containing it") and the slug-collision detector both need an index shaped like `packSpellIndex()`'s existing `byName`/`byKey`/`corpusOf` maps — extend or query this index, do not build a parallel one.

**Impact-count pattern — the exact analog for D-13's rename-impact warning** (lines 196-223):
```javascript
function _removalImpact(versionKey, index) {
  const impact = { prepared: 0, characters: 0, bookmarked: 0 };
  if (!index || !index.byKey) return impact;
  const staleKey = (key) => {
    const sources = index.byKey.get(key);
    return !!sources && sources.size === 1 && sources.has(versionKey);
  };
  const chars = window.loadCharacters ? window.loadCharacters() : [];
  (chars || []).forEach((c) => {
    let charAffected = false;
    (Array.isArray(c.prepared) ? c.prepared : []).forEach((key) => {
      if (staleKey(key)) { impact.prepared += 1; charAffected = true; }
    });
    if (charAffected) impact.characters += 1;
  });
  const bookmarks = window.peekBookmarks ? window.peekBookmarks() : [];
  (bookmarks || []).forEach((key) => { if (staleKey(key)) impact.bookmarked += 1; });
  return impact;
}
```
D-13's rename-impact count is this same shape with the staleness predicate changed from "does this key still resolve after removal" to "does this key still resolve after the slug rename" — **read-only**, never writes to `prepared`/`bookmarked`/`hifi_bookmarks_v1` (proven pure by `check-bookmarks-read-purity.tests.ps1` — the new count must preserve that purity guarantee).

**Duplicate-detection exemption to mirror for D-03's EN×PT non-conflict rule** (line ~66, `_countsAsDuplicate`, referenced not fully read — grep confirms it special-cases SRD↔SRD): the existing function already has a `!(corpusA === 'srd' && corpusB === 'srd')`-style exemption; the new slug-collision detector needs an analogous "this SRD EN/PT-BR pair is not a conflict" branch, evaluated the same way (by `corpus`/`lang`, not by hardcoded key names).

---

### `pack-import.jsx` — `meta.image` field + slug-collision entry point (PKG-06, D-09/D-10)

**Analog:** itself

**Field-table validation pattern — the exact table to extend** (lines 50-59):
```javascript
const META_FIELDS = [
  { key: 'source', type: 'string', required: true, pattern: /^[a-z0-9][a-z0-9-]{0,63}$/ },
  { key: 'name', type: 'string', required: true, minLength: 1 },
  { key: 'version', type: 'string', required: true, minLength: 1 },
  { key: 'author', type: 'string', required: true, minLength: 1 },
  { key: 'lang', type: 'string', required: true, enum: ['ptbr', 'en'] },
  { key: 'edition', type: 'string', required: false },
  { key: 'spellCount', type: 'integer', required: false },
  { key: 'license', type: 'object', required: true },
  // NEW: { key: 'image', type: 'string', required: false, pattern: /^data:image\/(png|jpeg|webp|gif);base64,/, maxLength: 200*1024 }
];
```
`meta.source`'s `pattern` field is the exact slug-format regex (`/^[a-z0-9][a-z0-9-]{0,63}$/`) UI-SPEC's `rename.errorFormat` reuses for spell-slug live validation — do not write a second regex.

**The mechanism the new rename prompt must NOT reuse** (lines 232-239):
```javascript
function freeIdentifier(base, existingIds) {
  if (existingIds.indexOf(base) === -1) return base;
  let n = 2;
  while (existingIds.indexOf(`${base}-${n}`) !== -1) { n += 1; }
  return `${base}-${n}`;
}
```
This solves pack-id (`meta.source`) collisions silently — correct there, forbidden for spell slugs (D-09 requires an interactive prompt, never silent). The new `detectSlugCollisions()` is a sibling function, not an extension of this one. Its *suggestion* shape (`base` + `-${n}` suffix) is a fine visual precedent for the rename dialog's suggested slug, but the *auto-apply-without-asking* behavior must not carry over.

---

### `pack-rename-dialog.jsx` (new) — dialog chrome, focus/ESC, submit/cancel

**Analog:** `pack-import-dialog.jsx`

Read `pack-import-dialog.jsx` in full for: `useDialogA11y` usage (focus trap + ESC), the `role="dialog"` shell markup, submit-disabled-until-valid pattern, and the live-validation-under-input convention (`var(--red)` error text, per UI-SPEC's `rename.errorFormat`/`errorReserved`/`errorDuplicate`). The new dialog's submit handler follows Pattern 4 from RESEARCH.md: call `plugin-store.jsx`'s `putPack()` only on the *incoming* pack's record, never touching character storage.

---

### `v10-hifi.jsx` — per-spell `lang`, `hifiSpellKey`, "Também em:", `useEditionCompare`

**Analog:** itself

**Identity function — unchanged, do not touch the formula** (line 9):
```javascript
function hifiSpellKey(s) { return `${s.school}-${s.lvl}-${s.en}`; }
```
D-08's entire uniqueness requirement exists because this has no pack component — keep it exactly as-is.

**Call-site migration:** every `spellName(s, versionLang)` → `spellName(s, s.lang)`; every `hifiHtmlLang(versionLang)` → `hifiHtmlLang(s.lang)`. Aggregate concerns (sort `localeCompare` locale, filter-label language) switch to `uiLang` instead — grep every `versionLang` occurrence before editing (RESEARCH.md counts ~30 call sites) and classify each as per-spell (→ `s.lang`) or aggregate (→ `uiLang`).

**`getCurrentSpellVersion()` call sites — audit before deleting** (RESEARCH.md Pitfall 5): `useEditionCompare` and the "Também em:" effect (~lines 1019-1040) both currently call `window.getCurrentSpellVersion()`; both need `s._versionKey`-derived lookups instead of a global "current version" once selection is a list.

---

## Shared Patterns

### i18n key addition — dictionary + parity convention
**Source:** `i18n.jsx` (existing `manager.*`/`noun.spell.*` blocks, read for exact key-naming shape — not fully re-quoted here since UI-SPEC's Copywriting Contract already enumerates every new key verbatim: `menu.sectionReserved`, `menu.reservedHint`, `menu.reservedSubitem`, `menu.cardMeta`, `menu.authorUnknown`, `menu.toastFallbackToDefault`, `rename.title`/`intro`/`rowIncoming`/`rowExisting`/`suggestion`/`applyAllSuffix`/`impactWarning`/`cancel`/`submit`/`submitDisabledHint`/`errorFormat`/`errorReserved`/`errorDuplicate`, `packErr.imageTooLarge`/`imageInvalid`, `noun.character.one`/`.other`).
**Apply to:** `i18n.jsx` — add every key to BOTH `ptbr:` and `en:` blocks in the same commit; `i18nParityCheck()` is the enforcement gate, run it after editing.

### Read-only impact counting (never writes to character/bookmark storage)
**Source:** `pack-manager.jsx` `_removalImpact()` (lines 196-223), proven pure by `scripts/check-bookmarks-read-purity.tests.ps1`.
**Apply to:** D-13's rename-impact count — same `window.loadCharacters()`/`window.peekBookmarks()` read path, never a write.

### Chrome-language toasts (never the pack's own language)
**Source:** `spells-data-loader.jsx` `_uiLang()` (lines 56-64) + its use in the load-failure toast (lines 605-613).
**Apply to:** `menu.toastFallbackToDefault` and any other new toast this phase adds — always `tt(_uiLang(), ...)` / `tt(uiLang, ...)`, never a pack-language string.

### Hand-rolled field-table validation (no schema library)
**Source:** `pack-import.jsx` `META_FIELDS`/`SPELL_FIELDS` tables + `_checkObject`/`_checkField` (lines 50-79, `validatePack` at line 197).
**Apply to:** `meta.image`'s format/size validation (PKG-06) — one new table entry with a `pattern` regex + `maxLength`, not a new validator function or library.

### In-place mutation of shared registry arrays (never reassign)
**Source:** `spells-data-loader.jsx` `SPELL_VERSIONS` (lines 38-44).
**Apply to:** Any new shared-reference array this phase introduces must follow the same "push/splice only" discipline if other modules hold the same reference.

## No Analog Found

None — every file this phase touches is a modification of an existing module, or (in the case of `pack-rename-dialog.jsx`) a new sibling file with a very close structural analog (`pack-import-dialog.jsx`) already identified above.

## Metadata

**Analog search scope:** repo root `.jsx`/`.html`/`.json`/`.mjs` files listed in CONTEXT.md's `canonical_refs`, plus `scripts/*.tests.ps1` for gate-style precedent.
**Files scanned:** `spells-data-loader.jsx`, `pack-manager.jsx`, `pack-import.jsx`, `pack-import-dialog.jsx`, `plugin-store.jsx`, `v10-hifi.jsx` (targeted), `v11-character-editor.jsx` (targeted), `i18n.jsx` (targeted, per UI-SPEC), `index.html` (targeted), `pack.schema.json`, `scripts/check-migration-version-fallback.tests.ps1`, `scripts/check-pack-manager.tests.ps1` (listed, style precedent).
**Pattern extraction date:** 2026-09-27
