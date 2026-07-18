---
phase: 02-plugin-storage-foundation
plan: 02
subsystem: storage
tags: [indexeddb, navigator.storage, blob-download, byod, no-build]

requires:
  - phase: 02-01
    provides: "window.pluginStore: openDB/putPack/getPack/getSpells/listPacks/deletePack, grimorio-plugins IndexedDB (v1, packs store)"
provides:
  - "window.pluginStore.requestPersistence()/getPersistenceState() — best-effort navigator.storage.persist() request at boot, deduplicated and idempotent"
  - "window.pluginStore.exportPack(id) — downloads an installed pack as a content-identical grimorio-<slug>.json file"
affects: [03-plugin-import-sanitization, 05-plugin-manager-ui]

tech-stack:
  added: []
  patterns:
    - "In-flight Promise dedup for navigator.storage.persist() (same _pending pattern family as spells-data-loader.jsx's loader dedup)"
    - "Best-effort browser API wrapping: single deliberate catch that never rejects, console.warn only, result observable via a getter instead of thrown"
    - "Blob + createObjectURL + anchor.click() + revokeObjectURL(after click) for client-side file download, no server round-trip"

key-files:
  created:
    - scripts/check-plugin-store-persistence-export.tests.ps1
  modified:
    - plugin-store.jsx
    - scripts/check-plugin-store.tests.ps1

key-decisions:
  - "A-02: exportPack() serializa o registro armazenado VERBATIM, incluindo a chave de topo id — o validador/schema de import da Fase 3 tem de TOLERAR ou remover essa chave, senão um arquivo exportado por este app não reinstala nele mesmo."
  - "A-03 applied as written in the plan: navigator.storage.persist() is requested at boot (ROADMAP/REQUIREMENTS authoritative), not at first pack install as the stale ARCHITECTURE.md research note suggested."
  - "requestPersistence() never caches a negative result permanently — only the in-flight Promise is deduplicated, so a denial today can retry successfully after a later user action (e.g. PWA install)."
  - "_packFileName() reduces meta.name to [a-z0-9-] with fallback to id then the literal 'pack' — mitigates T-02-06 (untrusted content reaching the DOM download attribute)."

patterns-established:
  - "Best-effort browser API surfaces return a three-field object (supported/persisted/requested) instead of a boolean, so callers can never collapse 'unsupported' and 'denied' into a false 'safe' signal (T-02-08 mitigation, binding on Phase 5 UI copy)."

requirements-completed: [STOR-02, STOR-03]

coverage:
  - id: D1
    description: "navigator.storage.persist() is requested once at boot via requestPersistence(), result observable via getPersistenceState(), idempotent when already granted, deduplicated under concurrent calls, never blocks boot or gates any feature (STOR-02)"
    requirement: "STOR-02"
    verification:
      - kind: other
        ref: "powershell -NoProfile -ExecutionPolicy Bypass -File scripts/check-plugin-store-persistence-export.tests.ps1"
        status: pass
      - kind: manual_procedural
        ref: "Orchestrator-run real-browser verification (Chrome via automation, npx http-server -p 8123), approved by user at the 02-02 Task 3 checkpoint"
        status: pass
    human_judgment: true
    rationale: "Idempotency/dedup/best-effort-degradation of a real browser Storage API can only be proven by exercising it in a live browser (getPersistenceState() readback, Promise.all identity check, quota estimate); the PowerShell script only proves the static source shape. Verified this session by orchestrator-driven browser automation, reviewed and approved by the user."
  - id: D2
    description: "exportPack(id) downloads a .json file whose parsed content is deeply equal to getPack(id), rejects clearly on unknown id with no file downloaded, and derives a path-traversal-safe filename from meta.name (STOR-03)"
    requirement: "STOR-03"
    verification:
      - kind: other
        ref: "powershell -NoProfile -ExecutionPolicy Bypass -File scripts/check-plugin-store-persistence-export.tests.ps1"
        status: pass
      - kind: manual_procedural
        ref: "Orchestrator-run real-browser verification: click() intercepted, Blob content read back and JSON.parse'd, deep-equal to getPack('teste-1'); path-traversal meta.name sanitized to grimorio-etc-passwd.json; approved by user at the 02-02 Task 3 checkpoint"
        status: pass
    human_judgment: true
    rationale: "Byte-identical round-trip through a real Blob/anchor download and DOM-safe filename derivation can only be proven in a live browser; the PowerShell script proves the source contains the right calls in the right order, not that the download actually produces the claimed bytes. Verified this session by orchestrator-driven browser automation, reviewed and approved by the user."
  - id: D3
    description: "Phase 2 success criterion 1 (STOR-01 durability across full page reload) and success criterion 4 (a failed write fails cleanly — invalid shape, non-cloneable payload, and a ~60MB oversized write all reject without partial writes or unhandled rejections)"
    requirement: "STOR-01"
    verification:
      - kind: manual_procedural
        ref: "Orchestrator-run real-browser verification: putPack/reload(F5)/getPack byte-identical round-trip plus direct IndexedDB inspection; empty-id TypeError with zero new keys; non-cloneable value DataCloneError with zero partial keys; exportPack('nao-existe') clear rejection; ~60MB pack (30000 spells) wrote in 126ms with zero unhandled rejections; teste-1 stayed intact throughout — approved by user at the 02-02 Task 3 checkpoint"
        status: pass
    human_judgment: true
    rationale: "This is Phase 2's own success criteria 1 and 4 (not a Plan 02-02 deliverable), re-verified end-to-end as part of the phase's mandatory Task 3 human checkpoint. Real IndexedDB durability and transaction-rollback behavior across a real browser reload cannot be proven by any static script; confirmed this session by orchestrator-driven browser automation, reviewed and approved by the user."

duration: 12min
completed: 2026-07-18
status: complete
---

# Phase 2 Plan 2: Persistent Storage Request & Pack Export Summary

**`navigator.storage.persist()` requested at boot with idempotent short-circuit and in-flight dedup, plus `exportPack()` downloading a content-identical, path-traversal-safe JSON backup of any installed pack**

## Performance

- **Duration:** ~12 min (commit-to-commit across Tasks 1-2; Task 3 was a human checkpoint, approved by the orchestrator's real-browser verification)
- **Started:** 2026-07-18T19:39:31-03:00
- **Completed:** 2026-07-18
- **Tasks:** 3 completed (2 auto + 1 checkpoint)
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments
- `requestPersistence()` added to `plugin-store.jsx`: async, never throws, resolves `{supported, persisted, requested}`; deduplicates concurrent calls via `_persistPromise`; short-circuits via `navigator.storage.persisted()` before ever calling `.persist()`, so a second call after grant reports `requested:false` with no second browser request
- `getPersistenceState()` exposes the last-known result synchronously for future UI (Phase 5)
- Boot-time call registered on `DOMContentLoaded` (mirrors `spells-data-loader.jsx`'s init pattern), never awaited, never blocks or gates any app feature
- `exportPack(id)` added: reuses `getPack()`, serializes the stored record VERBATIM via `JSON.stringify(record, null, 2)`, triggers a Blob download via `createObjectURL`/anchor `click()`/`revokeObjectURL` (revoke strictly after click), and returns the JSON text for console-level verification
- `_packFileName(record)` reduces `meta.name` to `[a-z0-9-]`, collapses/trims hyphens, truncates to 60 chars, falls back to `id` then the literal `pack` — mitigates T-02-06 path-traversal-via-filename
- `scripts/check-plugin-store-persistence-export.tests.ps1` created: static verification of both surfaces plus the A-02 SUMMARY-durability regression gate (guarded by `Test-Path`, intentionally a no-op until this SUMMARY exists)
- `scripts/check-plugin-store.tests.ps1` (from 02-01) updated: `navigator.storage` removed from its scope-boundary denylist, since STOR-02 now requires that exact string inside `plugin-store.jsx`

## Task Commits

Each task was committed atomically:

1. **Task 1: Solicitação de armazenamento persistente no boot (STOR-02)** - `123faac` (feat)
2. **Task 2: Exportar um pacote instalado para arquivo JSON baixado (STOR-03)** - `b873152` (feat)
3. **Task 3: Verificação humana dos 4 critérios de sucesso da Fase 2** - checkpoint, no code change; approved

## Files Created/Modified
- `plugin-store.jsx` - added `requestPersistence`, `getPersistenceState`, `_persistPromise`/`_persistState`, boot-time `DOMContentLoaded` call, `exportPack`, `_packFileName`; both added to `window.pluginStore`
- `scripts/check-plugin-store-persistence-export.tests.ps1` - new: static verification of persistence + export surfaces, ordering assertions (persisted-before-persist, click-before-revoke), and the A-02 SUMMARY-durability gate
- `scripts/check-plugin-store.tests.ps1` - `navigator.storage` removed from the scope-boundary denylist (see Deviations below)

## Decisions Made
- Followed the plan's locked design exactly: three-field best-effort result object (never a bare boolean), in-flight-only dedup (no permanent negative caching), verbatim serialization for export (A-02), post-click URL revocation.
- A-03 applied per the plan's own resolution: persistence requested at boot (ROADMAP/REQUIREMENTS authoritative), not deferred to first pack install as a stale `ARCHITECTURE.md` note suggested.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `check-plugin-store.tests.ps1`'s scope-boundary denylist blocked the very string STOR-02 requires**
- **Found during:** Task 1 (writing `requestPersistence()`/boot call)
- **Issue:** `scripts/check-plugin-store.tests.ps1`, authored in plan 02-01, forbade the literal substring `navigator.storage` anywhere in `plugin-store.jsx` as a scope-boundary check. Plan 02-02 Task 1 explicitly requires `navigator.storage.persist()`/`.persisted()` in that exact file for STOR-02. The 02-01 denylist encoded an assumption (no `navigator.storage` usage yet) that this plan's own `<planner_assumptions>` A-03 supersedes: ROADMAP/REQUIREMENTS are authoritative over the stale `ARCHITECTURE.md` research note, and STOR-02 requires the call at boot.
- **Fix:** Removed `'navigator.storage'` from the denylist array in `check-plugin-store.tests.ps1`, with an inline comment explaining the supersession and pointing at A-03 in `02-02-PLAN.md`.
- **Files modified:** `scripts/check-plugin-store.tests.ps1`
- **Verification:** `scripts/check-plugin-store.tests.ps1` exits 0 after the edit; `scripts/check-plugin-store-persistence-export.tests.ps1` (new, Task 1) also exits 0.
- **Committed in:** `123faac` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 — blocking issue: a prior plan's test assumption directly contradicted this plan's explicit requirement)
**Impact on plan:** No scope creep. The fix only removed an obsolete assertion from a sibling test script; it did not add new checks or touch application code beyond what the plan specified.

## Issues Encountered
None beyond the deviation above.

**Forward-looking observation for Phase 5 (not a defect in this plan, not fixed here):** `listPacks()` (from plan 02-01) returns only `meta` (`{name, lang, spellCount}`) per pack and omits the pack's `id`. Confirmed during Task 3 browser verification. The Phase 5 Plugin Manager UI will need the `id` to let a user select or remove a specific pack — `listPacks()` will need to either include `id` alongside `meta` or `getPack()`/a new lookup will need to be called per-pack. Recording here per this plan's `<output>` sequencing (Phase 3/5 planners load SUMMARY/LEARNINGS, not PLAN.md).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `window.pluginStore` now exposes nine functions total (`openDB`, `putPack`, `getPack`, `getSpells`, `listPacks`, `deletePack`, `requestPersistence`, `getPersistenceState`, `exportPack`) — the complete Phase 2 storage contract Phases 3-5 build on.
- Phase 3's import/sanitization pipeline can call `putPack()` directly; its schema/validator must tolerate or strip the top-level `id` key on any re-imported file, per A-02 above (this is the binding constraint this SUMMARY exists to carry forward).
- Phase 5's Plugin Manager UI can read `getPersistenceState()` for a persistence indicator and wire `exportPack(id)` to an "Export" button — but per this plan's locked prohibitions, any UI text derived from persistence state must never claim storage is "guaranteed" or "safe" (T-02-08), and persistence state must never gate/degrade any feature.
- Phase 5 will also need `listPacks()` extended to include `id` (see forward-looking observation above) before an install/remove UI can target a specific pack.
- All four Phase 2 success criteria (STOR-01 durability, STOR-02 boot request, STOR-03 export, clean-failure-on-bad-write) were verified end-to-end in a real browser (Chrome, via orchestrator-run automation against `npx http-server`) and approved by the developer at the Task 3 checkpoint. No visual UI regression was observed — scope boundary held.

---
*Phase: 02-plugin-storage-foundation*
*Completed: 2026-07-18*

## Self-Check: PASSED

All created/modified files and both task commits verified present on disk / in git log (see below).
