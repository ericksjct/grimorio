---
phase: 02-plugin-storage-foundation
plan: 01
subsystem: storage
tags: [indexeddb, plugin-store, byod, no-build]

requires: []
provides:
  - "window.pluginStore: openDB/putPack/getPack/getSpells/listPacks/deletePack — the storage contract Phases 3, 4, 5 build on"
  - "grimorio-plugins IndexedDB database (v1), packs object store (keyPath id, record shape { id, meta, spells })"
  - "plugin-store.jsx wired into boot order (index.html) and offline precache (sw.js)"
affects: [03-plugin-import-sanitization, 04-loader-source-dispatch, 05-plugin-manager-ui]

tech-stack:
  added: []
  patterns:
    - "Raw IndexedDB promise wrapper (no idb/Dexie dependency) — memoized openDB(), transaction-commit-only resolution"
    - "Fail-loud validation before any transaction opens (_assertPackShape) — no partial writes possible"
    - "Errors propagate original IndexedDB error object (name/message intact) — caller decides UI messaging, no swallowing"

key-files:
  created:
    - plugin-store.jsx
    - scripts/check-plugin-store.tests.ps1
  modified:
    - index.html
    - sw.js

key-decisions:
  - "putPack()/deletePack() resolve only on tx.oncomplete, never on the individual request's onsuccess — this is what proves the write survived a rollback-eligible transaction"
  - "getSpells()/getPack() return the raw stored spells/record unmodified — normalization stays exclusively in the loader's adapter (STOR-01 boundary)"
  - "sw.js CACHE_VERSION left unchanged — install() re-adds only the new file to the existing cache, avoiding a ~2.6MB re-download of already-cached spell JSONs"

patterns-established:
  - "Storage-layer error propagation: never wrap/replace IndexedDB errors, let name (e.g. QuotaExceededError) reach the caller unchanged"

requirements-completed: [STOR-01]

coverage:
  - id: D1
    description: "plugin-store.jsx exposes window.pluginStore with putPack/getPack/getSpells/listPacks/deletePack backed by IndexedDB (grimorio-plugins v1, packs store, keyPath id)"
    requirement: "STOR-01"
    verification:
      - kind: other
        ref: "powershell -NoProfile -ExecutionPolicy Bypass -File scripts/check-plugin-store.tests.ps1"
        status: pass
    human_judgment: true
    rationale: "The PowerShell script proves static schema/surface/error-semantics facts (constants, function names, onabort present, no empty catch, no scope-boundary leaks). It cannot prove IndexedDB write-durability across a real page reload or that a failed write leaves zero partial state in the browser's actual IDB engine — the plan's own <verify><human-check> block requires opening the app and exercising putPack/getPack/reload in a real browser, which no tool available to this executor can perform."
  - id: D2
    description: "plugin-store.jsx is wired into app boot (index.html script tag, correct load order) and offline precache (sw.js PRECACHE) without disturbing existing script order or the 4 spell JSON cache entries"
    requirement: "STOR-01"
    verification:
      - kind: other
        ref: "powershell -NoProfile -ExecutionPolicy Bypass -File scripts/check-plugin-store.tests.ps1"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-07-18
status: complete
---

# Phase 2 Plan 1: Plugin Storage Foundation Summary

**IndexedDB CRUD layer (`window.pluginStore`) for plugin spell packs — raw promise wrapper over `grimorio-plugins` v1/`packs`, no library, fail-loud validation before any transaction, errors propagated unwrapped.**

## Performance

- **Duration:** ~3 min (commit-to-commit)
- **Started:** 2026-07-18T19:30:30-03:00
- **Completed:** 2026-07-18T19:32:13-03:00
- **Tasks:** 3 completed
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments
- `plugin-store.jsx` created: `openDB`, `putPack`, `getPack`, `getSpells`, `listPacks`, `deletePack`, private `_tx`/`_assertPackShape` helpers, all exposed via `window.pluginStore`
- Writes resolve only on transaction commit (never on request `onsuccess`), so a caller awaiting `putPack()` has a durability guarantee, not just an in-flight-request guarantee
- `_assertPackShape()` rejects malformed records with `TypeError` before any transaction opens — no partial writes are structurally possible
- `index.html` and `sw.js` wired: script tag inserted in the exact required position, PRECACHE entry added, `CACHE_VERSION` deliberately left unchanged
- `scripts/check-plugin-store.tests.ps1` created and passing, including a negative-proof pass (renamed file → non-zero exit, restored → exit 0)

## Task Commits

Each task was committed atomically:

1. **Task 1: Criar plugin-store.jsx com CRUD IndexedDB e semântica de falha limpa** - `49d901f` (feat)
2. **Task 2: Ligar plugin-store.jsx ao boot (index.html) e ao offline (sw.js)** - `b107a25` (feat)
3. **Fix (found while writing Task 3's verification script)** - `f1533c4` (fix)
4. **Task 3: Criar scripts/check-plugin-store.tests.ps1** - `3df448a` (test)

_Note: task 3's acceptance criteria caught two scope-boundary/positioning bugs in tasks 1-2's output; fixed and committed separately before the test-script commit landed._

## Files Created/Modified
- `plugin-store.jsx` - IndexedDB CRUD layer, `window.pluginStore` surface
- `index.html` - script tag for `plugin-store.jsx` after `spells-data-loader.jsx`, before `v11-character-editor.jsx`; ORDER MATTERS comment updated
- `sw.js` - `./plugin-store.jsx` added to `PRECACHE`; `CACHE_VERSION` unchanged (ponytail comment explains why)
- `scripts/check-plugin-store.tests.ps1` - static verification of schema, exported surface, failure semantics, scope boundaries, and load order

## Decisions Made
- Followed the plan's locked design exactly (Pattern 3 in `ARCHITECTURE.md`): raw IndexedDB, no `idb`/Dexie dependency, one object store, transaction-commit-only resolution.
- No new npm/CDN dependency added — `package.json` confirmed byte-identical (`git diff --stat package.json` empty).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `plugin-store.jsx` comments referenced the literal identifier `adaptSpell`, violating the task's own scope-boundary acceptance criterion**
- **Found during:** Task 3 (writing and running the verification script's scope-boundary check)
- **Issue:** The header comment and a `getSpells()` inline comment used the substring `adaptSpell` (in "o adaptador de magias" spirit, but written as `adaptSpells()`), which the plan explicitly disallows anywhere in the file (`<!-- planner-discipline-allow: adaptSpell -->` marks it as a deliberately-checked exclusion, not an oversight to skip).
- **Fix:** Reworded both comments to describe the normalization boundary without using the literal function name (e.g., "o adaptador de magias (no loader) continua o único ponto de normalização").
- **Files modified:** `plugin-store.jsx`
- **Verification:** `scripts/check-plugin-store.tests.ps1` scope-boundary loop passes.
- **Committed in:** `f1533c4`

**2. [Rule 1 - Bug] `index.html`'s ORDER MATTERS comment mentioned `plugin-store.jsx` by filename ahead of the actual `spells-data-loader.jsx` script tag, breaking the load-order positional check**
- **Found during:** Task 3 (writing and running the verification script's load-order check)
- **Issue:** `IndexOf('plugin-store.jsx')` on the full `index.html` content matched the comment text (which sits above the script-tag block) before it matched `IndexOf('spells-data-loader.jsx')`, making the positional assertion (`loaderIdx < storeIdx < editorIdx`) fail even though the real script tags were correctly ordered.
- **Fix:** Reworded the comment to reference "the plugin store (see below)" instead of the literal filename, so the only occurrence of `plugin-store.jsx` in the file precedes/follows correctly relative to the script tags.
- **Files modified:** `index.html`
- **Verification:** `scripts/check-plugin-store.tests.ps1` load-order check passes.
- **Committed in:** `f1533c4`

---

**Total deviations:** 2 auto-fixed (both Rule 1 — bugs in the executor's own output caught by the task's own acceptance criteria, not pre-existing plan defects)
**Impact on plan:** No scope creep; both fixes are wording-only corrections that keep the delivered code inside the plan's explicit scope boundaries.

## Issues Encountered
- PowerShell (Windows PowerShell 5.1, not pwsh 7) mis-parsed an em dash (`—`) character inside single-quoted `throw` strings in the new test script, producing a parser error unrelated to the string's meaning. Replaced the three em dashes in `check-plugin-store.tests.ps1`'s throw messages with plain ASCII hyphens. No other project script had this exact character in a throw string, so this is new information for future PowerShell scripts in this repo — prefer ASCII punctuation in string literals headed to `Write-Output`/`throw` on Windows PowerShell 5.1.
- No browser MCP/preview tool was available to this executor to perform the plan's `<human-check>` steps (opening the app, running `pluginStore.putPack()`/`getPack()` in the console, inspecting Application > IndexedDB). The automated PowerShell script covers every criterion that can be verified statically from source; the browser-only checks are flagged in `coverage` (D1) as requiring human judgment and are not yet performed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `window.pluginStore` contract (six functions, exact names/signatures) is locked and ready for Phase 3 (import/sanitization pipeline) to call `putPack()`, and Phase 4 (loader source-dispatch) to call `getSpells()`/`listPacks()`.
- Before Phase 3 writes real user-supplied data, a human should complete the plan's `<human-check>` step in a real browser (open the app, `putPack`/`getPack`/reload round-trip, malformed-record rejection, Application > IndexedDB inspection) to confirm live-browser durability beyond what the static PowerShell check proves.
- `plugin-store.jsx` deliberately does not touch `navigator.storage`, sanitization, or the loader — those remain fully owned by later phases per the plan's scope boundary.

---
*Phase: 02-plugin-storage-foundation*
*Completed: 2026-07-18*

## Self-Check: PASSED

All created/modified files and all four task commits verified present on disk / in git log.
