# Phase 3: SRD Pack & Import Pipeline - Pattern Map

**Mapped:** 2026-07-25
**Files analyzed:** 9 (new) + 3 (modified)
**Analogs found:** 8 / 9

## Correction to orchestrator assumption

CONTEXT.md's claim "Sem suite de testes automatizados: verificação é QA manual no navegador" is **incomplete**. Phase 2 established a repeatable, repo-committed regression-check pattern: `scripts/check-*.tests.ps1`. These are NOT a unit-test framework (no Jest/Vitest, no assertion library) — they are plain PowerShell scripts that `Get-Content -Raw` the source files under test and assert on **string/regex presence, ordering, and absence** (`-like`, `-notlike`, `-match`, `IndexOf` ordering checks), throwing on failure and printing one `Write-Output` success line at the end. `$ErrorActionPreference = 'Stop'` at the top makes any thrown error abort the script non-zero.

Concretely, per file, this phase should add scripts following the two existing analogs:
- `scripts/check-plugin-store.tests.ps1` — full-feature check (structural presence, script-tag ordering in `index.html`, PRECACHE membership in `sw.js`, "no empty catch block", "does not cross scope boundary" negative checks).
- `scripts/check-plugin-store-persistence-export.tests.ps1` — incremental-task check on the same file (ordering assertions like "X must appear before Y", cross-references a `*-SUMMARY.md` file once it exists as a durability gate).

Planner should specify one or more `scripts/check-<feature>.tests.ps1` per plan (e.g. `check-pack-import.tests.ps1`, `check-pack-validator.tests.ps1`, `check-csp.tests.ps1`, `check-pack-docs-page.tests.ps1`) instead of defaulting to "manual QA only." Manual browser QA (6 themes × light/dark) remains the verification method for **visual** aspects (per D-10, D-12), but structural/behavioral aspects (schema validator rejects `__proto__`, suffix applied before `putPack`, DOMPurify script tag + SRI + precache entry, script load order, CSP meta tag presence) should get a `.tests.ps1` check, matching Phase 2's convention.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `pack-import.jsx` (new — import pipeline: read file/URL → validate → sanitize → `putPack`) | service/controller (UI-bound) | request-response + file-I/O | `plugin-store.jsx` (storage API shape, error propagation) + `spells-data-loader.jsx` (`loadVersion` fetch-with-fallback-paths pattern) | role-match |
| `pack-import.jsx` — hand-written schema validator (`validatePack`, parse-time reviver blocking `__proto__`/`constructor`/`prototype`) | utility (validation) | transform | `plugin-store.jsx:72-85` `_assertPackShape()` (shape-check style, throw `TypeError` with prefixed message) | role-match |
| `pack-import-dialog.jsx` (new — file/URL UI, `role="dialog"`, success/error, suffix identifier) | component | request-response (form submit) | `v10-hifi.jsx` sheet dialog around line 2020-2030 (`role="dialog" aria-modal="true"`, scrim + slide transition) and `useHifiToast`/`HifiToast` (lines 35-69) | exact (dialog shell) / role-match (form) |
| `pack-docs.html` or `pack-docs.jsx` (new — static docs page, PKG-01) | component (static content) | request-response (page render, no data binding) | No close analog — no existing standalone doc page in repo | none |
| `pack.schema.json` (new, repo root) | config | transform (schema doc, not runtime-executed by app) | No analog — first JSON Schema file in repo; author per D-14 to standard JSON Schema draft, referenced by docs page | none |
| `scripts/generate-srd-pack-5.1.js` / `-5.2.js` (new, one-shot, run outside app runtime) | utility (batch/transform) | batch | No direct analog in `scripts/` (those are all `.ps1` checks); closest process analog is the existing 4 `spells-5E-*.json` static data files themselves (target output shape) plus `spells-data-loader.jsx:83-145` `adaptSpell`/`adaptSpells` for field-shape reference (NOT reused at runtime — SRD packs are generated once, offline) | role-match (weak) |
| `index.html` (modified — add DOMPurify `<script>` + SRI, add pack-import entry point, possibly CSP `<meta>`) | config | request-response (page bootstrap) | `index.html:102-117` existing CDN script block (React/ReactDOM/Babel with `integrity=` + `crossorigin="anonymous"`) | exact |
| `sw.js` (modified — add DOMPurify + any new files to `PRECACHE`) | config | batch (cache priming) | `sw.js:15-38` `PRECACHE` array; `sw.js:22` shows the exact comment convention for "why this entry doesn't bump `CACHE_VERSION`" | exact |
| `scripts/check-pack-import.tests.ps1` (new) | test | transform (static string assertions) | `scripts/check-plugin-store.tests.ps1` (full-file structural check) + `scripts/check-plugin-store-persistence-export.tests.ps1` (incremental/ordering check) | exact |

## Pattern Assignments

### `pack-import.jsx` (service, request-response + file-I/O)

**Analog:** `plugin-store.jsx`

**Module-level config/comment convention** (`plugin-store.jsx:1-11`):
```javascript
// Plugin Store — camada de persistência IndexedDB para pacotes de magias BYOD.
//
// Schema: banco 'grimorio-plugins' (v1), um único object store 'packs' com
// keyPath 'id'. ...
//
// Uso: incluir este arquivo no HTML depois de spells-data-loader.jsx e antes
// dos componentes que consultam window.pluginStore.
```
Follow this doc-comment shape: what the file owns, what it explicitly does NOT own (scope boundary), and where in `index.html` load order it goes.

**Shape validation, throw-before-write pattern** (`plugin-store.jsx:72-85`):
```javascript
function _assertPackShape(pack) {
  if (!pack || typeof pack !== 'object') {
    throw new TypeError('pluginStore.putPack: pack precisa ser um objeto.');
  }
  if (typeof pack.id !== 'string' || pack.id === '') {
    throw new TypeError('pluginStore.putPack: pack.id precisa ser uma string não-vazia.');
  }
  ...
}
```
Copy this exact style for the schema validator: prefixed error messages (`packImport.validate: ...`), thrown (not returned) `TypeError`, called before any write. Per D-13, the `__proto__`/`constructor`/`prototype` block must happen in the `JSON.parse` reviver — a new pattern not present in this codebase, write it as the second parameter to `JSON.parse(text, reviver)`, rejecting keys before object construction completes.

**Error propagation convention** (`plugin-store.jsx:49-51` comment + throughout):
```javascript
// ponytail: esta camada propaga o erro ORIGINAL do IndexedDB (name, message
// intactos) em vez de engolir ou envolver em um Error genérico — quem decide
// o toast/mensagem de UI é o chamador (Fase 3/5). Nenhum catch vazio aqui.
```
`pack-import.jsx` is exactly that promised caller — it's the layer allowed to translate raw errors into user-facing PT/EN strings (per D-11 rejection reasons and the UI-SPEC error-copy table). Never swallow an error silently (`scripts/check-plugin-store.tests.ps1:34-36` enforces "no empty catch block" — new check should assert the same for `pack-import.jsx`).

**Suffix-before-write requirement (D-09):** `plugin-store.jsx` has no dedup logic — `putPack` is a raw `store.put` (upsert), confirmed by CONTEXT.md's own note at line 40. `pack-import.jsx` must call `pluginStore.listPacks()` first, compute a free `source`-derived id/suffix, THEN call `pluginStore.putPack()`. No existing analog for suffix-computation; write it as a small pure function (`_freeIdentifier(base, existingIds)`), same naming convention as `_packFileName` (`plugin-store.jsx:180-192`, private underscore-prefixed helper, single responsibility, `reduce`-style char sanitization).

**Fetch-with-fallback pattern** (`spells-data-loader.jsx:192-200`, for the URL-import path):
```javascript
async function loadVersion(key) {
  if (_cache[key]) return _cache[key];
  if (_pending[key]) return _pending[key];
  const ver = SPELL_VERSIONS.find(v => v.key === key);
  if (!ver) throw new Error('Unknown version: ' + key);
  _pending[key] = (async () => {
    // Tenta carregar do path relativo (funciona no GitHub Pages / local)
    const paths = [ver.file, './' + ver.file, '../' + ver.file];
```
For URL-based import (PKG-03), reuse the async-fetch-with-friendly-error shape — but this phase's CORS failure needs a **specific** user-facing message (per UI-SPEC copy table: "baixe o arquivo e importe por upload"), not a generic throw.

**Size cap (D-08):** No existing analog (nothing today reads `Content-Length` or limits bytes). New code — read `Content-Length` header when present, and independently cap actual bytes read (e.g. via a `ReadableStream` reader loop or by slicing after `.text()` — but note `.text()` already buffers full body, so for a hard cap the stream must be read incrementally and aborted early, since 10MB is small enough that buffering first then checking is also acceptable given this app's own JSON files are 580-750KB per D-08's own reference point — planner's call on strictness vs. simplicity).

---

### `pack-import-dialog.jsx` (component, request-response)

**Analog:** `v10-hifi.jsx` (dialog shell + toast hook)

**Dialog shell pattern** (`v10-hifi.jsx:2020-2030`):
```javascript
{sheetTransition.mounted && (
  <>
    <div className={sheetOpen ? 'hifi-fade-in' : 'hifi-fade-out'} onClick={closeSheet} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 20 }}/>
    <div
      ref={sheetRef}
      role="dialog" aria-modal="true" tabIndex={-1}
      aria-label={...}
      className={sheetOpen ? 'hifi-slide-up' : 'hifi-fade-out'}
      style={{ ... maxHeight: '70%', overflowY: 'auto', ... }}
    >
```
Reuse: scrim `<div>` with `onClick` to close, `role="dialog" aria-modal="true"`, transition class swap on open/close state, `overflowY: 'auto'` body scroll (matches UI-SPEC's `max-height: 80vh` + `overflow-y: auto` requirement).

**Toast hook** (`v10-hifi.jsx:35-69`, verbatim reusable):
```javascript
function useHifiToast() {
  const [toast, setToast] = React.useState(null);
  React.useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(t => (t?.id === toast.id ? null : t)), 2400);
    return () => clearTimeout(id);
  }, [toast]);
  const show = React.useCallback((msg, kind = 'ok') => setToast({ msg, kind, id: Date.now() + Math.random() }), []);
  React.useEffect(() => {
    function onGlobal(e) { show(e.detail?.msg || '', e.detail?.kind); }
    window.addEventListener('hifi-toast', onGlobal);
    return () => window.removeEventListener('hifi-toast', onGlobal);
  }, [show]);
  return { toast, show };
}
```
Already global-event-driven (`window.dispatchEvent(new CustomEvent('hifi-toast', {detail:{msg,kind}}))`) — this is the exact mechanism UI-SPEC references for "transient fetch/CORS failures also fire the existing toast." `pack-import-dialog.jsx` should call `useHifiToast()` locally for inline field errors AND may dispatch the global `hifi-toast` event for transient CORS failures, matching existing convention — no new toast system needed.

**Bilingual copy pattern:** `tt(lang, 'key')` used throughout `v10-hifi.jsx` (e.g. `tt(lang, 'nav.back')`, `tt(lang, 'spell.concentration')`) — new copy strings from UI-SPEC's Copywriting Contract table must be added to the i18n dictionary in `i18n.jsx` (not read directly here, but this is the established lookup convention) and referenced via `tt(lang, 'import.installPack')` etc., never hardcoded strings in JSX.

**Button/input classes (from UI-SPEC, already established in `hifi-tokens.css`):** `.hifi-btn-primary`, `.hifi-btn-secondary`, `.hifi-input` — reuse verbatim, do not invent new classes.

---

### `pack.schema.json` + docs page (config + static component)

**No analog found.** First JSON Schema file and first static docs page in the repo. Planner should:
- Author `pack.schema.json` as standard JSON Schema (draft matching whatever the hand-written validator's field list is derived from — D-13 requires validator and schema to stay in sync; consider generating one from the other, or a shared field-list constant both reference).
- Docs page has no code analog; build using the same no-build-step convention (plain `.html` or `.jsx` component loaded via existing script pipeline), `.hifi-rich` prose class (referenced in UI-SPEC), and the spacing/typography scale from UI-SPEC directly (already fully specified there — no additional codebase pattern needed).

---

### `scripts/generate-srd-pack-*.js` (one-shot generation script)

**No analog found** in `scripts/` (all existing scripts there are `.ps1` regression checks, not data-generation scripts). Reference `spells-data-loader.jsx:83-145` only for target **field shape** (what a spell object looks like after adaptation) — the SRD generation script produces the **raw pre-adaptation** shape matching `spells-5E-*.json`'s existing structure (since `pluginStore` stores raw JSON, never adapted — `plugin-store.jsx` header comment line 4-7 confirms `spells` is "o JSON cru na mesma forma dos arquivos spells-5E-*.json"). Use one of the 4 existing `spells-5E-*.json` files as the literal shape template for spell objects; do not invent a new per-spell schema.

---

### `index.html` (modified)

**Analog:** existing CDN script block, `index.html:102-104`
```html
<script src="https://unpkg.com/react@18.3.1/umd/react.production.min.js" integrity="sha384-..." crossorigin="anonymous"></script>
```
DOMPurify script tag must follow this exact shape: pinned version in URL, `integrity=` SRI hash, `crossorigin="anonymous"`. Placement in the `<script type="text/babel">` sequence (`index.html:112-117`) must respect existing strict order — `pack-import.jsx` goes after `plugin-store.jsx` (needs `window.pluginStore`) and likely before or alongside `v11-character-editor.jsx`/`v10-hifi.jsx` depending on which components mount the import dialog. DOMPurify itself (a non-JSX vendor script) loads in the CDN block (lines 102-104), not the babel block.

### `sw.js` (modified)

**Analog:** `sw.js:15-38` `PRECACHE` array, with the exact "why no version bump" comment convention at line 22:
```javascript
'./plugin-store.jsx', // ponytail: CACHE_VERSION não muda — install() reabre o mesmo cache e só adiciona este arquivo, sem re-baixar os JSONs de magias já cacheados
```
Add DOMPurify CDN URL to `PRECACHE` (same list as the unpkg React/Babel entries at lines 35-37), add new `.jsx`/`.html` files, add the two SRD pack static files if they ship as top-level JSON like the current 4. Keep `CACHE_VERSION` unchanged unless the SRD JSONs are large enough to warrant discussion — follow existing precedent of not bumping for additive-only precache changes.

---

## Shared Patterns

### Storage write funnel
**Source:** `plugin-store.jsx` (`putPack`, `listPacks`, durability via `tx.oncomplete`)
**Apply to:** `pack-import.jsx` only — never opens IndexedDB directly, always goes through `window.pluginStore`.

### Error-message translation boundary
**Source:** `plugin-store.jsx:49-51` comment (raw error propagation) + UI-SPEC's per-reason error copy table
**Apply to:** `pack-import.jsx` (catches raw errors, produces PT/EN user strings) and `pack-import-dialog.jsx` (renders them inline in `var(--red)`).

### Toast / transient notification
**Source:** `v10-hifi.jsx:35-69` (`useHifiToast`, `hifi-toast` CustomEvent)
**Apply to:** `pack-import-dialog.jsx` for CORS/fetch failures per UI-SPEC.

### Regression-check-as-test
**Source:** `scripts/check-plugin-store.tests.ps1`, `scripts/check-plugin-store-persistence-export.tests.ps1`
**Apply to:** every non-trivial new file in this phase (validator, import pipeline, index.html/sw.js wiring, CSP). One `.tests.ps1` per plan/feature, following the `$ErrorActionPreference='Stop'` + `Get-Content -Raw` + `-notlike`/`-notmatch` throw pattern, ending in one `Write-Output` success line.

### Sanitize-before-write, never sanitize-at-render
**Source:** CONTEXT.md Integration Points + the 4 existing `dangerouslySetInnerHTML` sinks in `v10-hifi.jsx` (lines 333, 340, 649, 970, 979 — confirmed 5 call sites, not 4 as CONTEXT.md states — verify exact count in implementation, all read `descHtml`/`upgradeHtml` with no sanitization call today)
**Apply to:** `pack-import.jsx` only runs DOMPurify; `v10-hifi.jsx` sinks are NOT touched this phase (data enters already clean, per D-13/Integration Points).

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `pack-docs.html`/`.jsx` | component (static) | request-response | No standalone docs page exists yet in repo; build directly from UI-SPEC's typography/spacing tables |
| `pack.schema.json` | config | transform | First JSON Schema file in repo |
| `scripts/generate-srd-pack-*.js` | utility | batch | No data-generation script exists in `scripts/` (only `.ps1` checks); use `spells-5E-*.json` as raw shape template instead |
| CSP `<meta>` tag (D-10) | config | request-response | No existing CSP anywhere in `index.html`; must be authored from scratch, scoped to script-src self + already-pinned CDN origins, with an explicit escape hatch (D-10's "falls out of scope if it breaks Babel standalone") |

## Metadata

**Analog search scope:** repo root (`*.jsx`, `index.html`, `sw.js`), `scripts/*.ps1`
**Files scanned:** `plugin-store.jsx`, `spells-data-loader.jsx`, `v10-hifi.jsx`, `index.html`, `sw.js`, `scripts/check-plugin-store.tests.ps1`, `scripts/check-plugin-store-persistence-export.tests.ps1`
**Pattern extraction date:** 2026-07-25
