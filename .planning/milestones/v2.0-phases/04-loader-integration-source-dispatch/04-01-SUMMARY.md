---
phase: 04-loader-integration-source-dispatch
plan: 01
subsystem: data-loader
tags: [spells-data-loader, indexeddb, source-dispatch, srd, adaptSpells]

requires:
  - phase: 03-srd-pack-import-pipeline
    provides: srd-2024-en.json / srd-2014-en.json embedded packs (D-01/D-02), pack-import.jsx write path with DOMPurify sanitization (PKG-05), plugin-store.jsx IndexedDB CRUD contract
provides:
  - BUILTIN_VERSIONS declarative registry (2 SRD packs + 4 legacy datasets, all source 'fetch')
  - SPELL_VERSIONS mutable live registry (in-place mutation only, never reassigned)
  - loadVersion() dispatching by ver.source ('fetch' | 'idb') through a single adaptSpells() funnel
  - Unknown-version-key fallback to _defaultVersion() instead of throwing
  - _fetchVersionJson(ver), _versionByKey(key), _defaultVersion() private helpers
affects: [04-02-loader-integration-source-dispatch (refreshPluginVersions, _packToVersion), 04-03, 04-04]

tech-stack:
  added: []
  patterns:
    - "Version registry entries are data, not code: BUILTIN_VERSIONS declares source/edition/labels; loadVersion() reads the entry to decide the fetch strategy instead of branching on file-name heuristics."
    - "Single normalization funnel: both source branches (fetch vs idb) converge on the same adaptSpells() call — verified structurally by a check script asserting exactly 2 occurrences of adaptSpells( in the file (definition + call site)."

key-files:
  created:
    - scripts/check-source-dispatch.tests.ps1
  modified:
    - spells-data-loader.jsx

key-decisions:
  - "SRD packs occupy BUILTIN_VERSIONS[0] and [1] (srd-2024-en, srd-2014-en) — index 0 is the fallback chain's last link and the first 'en' entry is the first-visit default for English browsers, per plan ordering requirement tied to P-03 (SRD label must never be mistaken for the full PHB)."
  - "detectEdition() keeps its one remaining caller (a defensive edition||detectEdition('') fallback inside adaptSpell) instead of being deleted — loadVersion() no longer calls it, but the plan's removal condition ('if no callers remain') doesn't apply since one still exists."
  - "Unknown version keys redirect via a one-level recursive call to loadVersion(_defaultVersion().key) rather than an inline duplicate of the load logic — the default entry is builtin and always resolves, so no infinite recursion risk."

requirements-completed: [SRD-03]

coverage:
  - id: D1
    description: "BUILTIN_VERSIONS/SPELL_VERSIONS declarative registry: 2 SRD entries (srd-2024-en, srd-2014-en) ahead of the 4 legacy entries, all declaring source/edition, SPELL_VERSIONS built via .slice() and never reassigned"
    requirement: "SRD-03"
    verification:
      - kind: unit
        ref: "scripts/check-source-dispatch.tests.ps1 (registry section)"
        status: pass
    human_judgment: false
  - id: D2
    description: "loadVersion() dispatches by ver.source through a single adaptSpells() funnel; unknown key redirects to default instead of throwing; edition comes from the registry, not the file name"
    requirement: "SRD-03"
    verification:
      - kind: unit
        ref: "scripts/check-source-dispatch.tests.ps1 (dispatch section)"
        status: pass
      - kind: integration
        ref: "Node vm harness running the real spells-data-loader.jsx source against real srd-2024-en.json / srd-2014-en.json / spells-5E-2014-PTBR.json files (see Verification section below) — no browser available in this environment"
        status: pass
    human_judgment: true
    rationale: "The plan's acceptance criteria explicitly calls for a real-browser console verification (python -m http.server + window.loadSpellVersion() calls). No headless/interactive browser was available in this execution environment, so the dispatch logic was proven via a Node vm harness executing the unmodified production source against the real JSON files instead. This is a strong logic-level proof but is not literally 'in the navigator' — flagging for human confirmation per the plan's own wording, likely satisfied at the 04-04 checkpoint which already covers browser-based confirmation of this phase's data path."

duration: ~25min
completed: 2026-08-12
status: complete
---

# Phase 04 Plan 01: Loader Integration — Source-Dispatch Registry Summary

**`spells-data-loader.jsx` gets a declarative BUILTIN_VERSIONS/SPELL_VERSIONS registry (2 embedded SRD packs + 4 legacy datasets, each tagged `source`/`edition`) and `loadVersion()` now dispatches by `ver.source` through one shared `adaptSpells()` funnel, with unknown keys redirecting to the default version instead of throwing.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-08-12T01:20:16Z
- **Tasks:** 2
- **Files modified:** 2 (`spells-data-loader.jsx`, `scripts/check-source-dispatch.tests.ps1`)

## Accomplishments

- Replaced the fixed 4-entry `SPELL_VERSIONS` array with a two-part registry: `BUILTIN_VERSIONS` (source of truth, 2 SRD + 4 legacy entries, all `source: 'fetch'`) and `SPELL_VERSIONS = BUILTIN_VERSIONS.slice()` as the live, in-place-mutable registry that `window.SPELL_VERSIONS`/`index.html`/`v10-hifi.jsx` all still reference by the same array identity.
- Added `_versionByKey(key)` / `_defaultVersion()` helpers and replaced every inline `SPELL_VERSIONS.find(v => v.key === ...)` lookup in `getCurrentVersion()` and `_initialVersionKey()` with them.
- Extracted the fetch-retry loop out of `loadVersion()` into `_fetchVersionJson(ver)` — a single point of fetch-error handling shared by both source branches.
- `loadVersion()` now dispatches on `ver.source === 'idb'` (reads `window.pluginStore.getSpells(ver.packId)`) vs the default `fetch` path (`_fetchVersionJson(ver)`), and from the JSON-obtained point onward both branches share one `adaptSpells(json, ver.lang, ver.edition)` call, one `_cache`/`_rawCache` write, one return — no parallel normalization path.
- Edition now comes from the registry entry (`ver.edition`) instead of being derived from the file name at load time; unknown version keys log a warning and redirect to `_defaultVersion().key` instead of throwing `Unknown version: ...`.
- Fixed a one-line cosmetic bug in `adaptSpell()`: the `SOURCE_CODE` fallback (`(s.source || '').slice(0, 4).toUpperCase()`) produced a trailing space for `"SRD 5.1"`/`"SRD 5.2"` sources (`"SRD "` → UI showed `"SRD  · 5e 2014"` with a double space); added `.trim()`.
- Extended `scripts/check-source-dispatch.tests.ps1` to structurally prove both the registry contract (Task 1) and the dispatch contract (Task 2), including the negative assertions required by P-02 (no `putPack`/`deletePack`/`exportPack` in the loader) and the single-`adaptSpells(`-call-site invariant.

## Task Commits

Each task was committed atomically:

1. **Task 1: Registro de versões declarativo e discriminado por origem** - `6de5642` (feat)
2. **Task 2: Dispatch por origem em loadVersion, com fallback de chave desconhecida** - `36893a4` (feat)

**Plan metadata:** committed separately by the wave orchestrator after this worktree merges (worktree mode — STATE.md/ROADMAP.md are not touched here).

## Files Created/Modified

- `spells-data-loader.jsx` - BUILTIN_VERSIONS/SPELL_VERSIONS registry, `_versionByKey`/`_defaultVersion`/`_fetchVersionJson` helpers, source-dispatching `loadVersion()`, trimmed `SOURCE_CODE` fallback
- `scripts/check-source-dispatch.tests.ps1` - new structural check script (registry + dispatch contract)

## Decisions Made

- Kept `detectEdition()` in the file (one remaining caller as a defensive fallback in `adaptSpell`) rather than deleting it, since the plan's removal condition only applies "if no callers remain."
- Verified the browser-console acceptance criterion via a Node `vm` harness running the actual (unmodified) `spells-data-loader.jsx` source against the real SRD/legacy JSON files, because no headless or interactive browser was available in this execution environment. Results matched the plan's expected numbers exactly (see Verification below). Flagged as `human_judgment: true` in the coverage block since this isn't literally the browser session the plan describes.

## Deviations from Plan

None — plan executed exactly as written. The `.trim()` fix and the `detectEdition` retention were both explicitly anticipated by the plan's own action text (Task 2 item 4, and the read_first/action guidance about not removing `detectEdition()` prematurely), not unplanned discoveries.

## Verification

1. `pwsh -NoProfile -File scripts/check-source-dispatch.tests.ps1` → exits 0, prints exactly one success line.
2. All 21 pre-existing `scripts/check-*.tests.ps1` scripts re-run individually after both tasks — all still exit 0 (22 total including the new script).
3. Browser-behavior acceptance criterion (`window.loadSpellVersion(...)` calls), executed against the real production source via a Node `vm` harness (fetch stub reads the actual files on disk, no network) instead of an interactive browser (none available in this environment):
   - `loadSpellVersion('srd-2024-en').length` → **339** (expected 339) ✓
   - `loadSpellVersion('srd-2014-en').length` → **319** (expected 319) ✓
   - `loadSpellVersion('nao-existe')` → no exception, redirected and resolved to **339** (the default entry, `srd-2024-en`) ✓
   - `loadSpellVersion('spells-5E-2014-PTBR').length` → **477** (> 0, legacy path not regressed) ✓
   - `grep -c "source: 'fetch'" spells-data-loader.jsx` → 6
   - `grep -c "adaptSpells("` (regex-based, via the check script) → 2 (definition + single call site)

## Issues Encountered

- No headless/interactive browser (no `chromium-cli`, no Playwright/Selenium install, no network install performed) was available to run the plan's literal browser-console verification steps. Substituted a Node `vm`-based harness that runs the unmodified production module against the real JSON files on disk — proves the same code path and the same JSON inputs, just without an actual browser process. Recorded as `human_judgment: true` in the coverage block (D2) so a human/browser confirmation can still happen at the 04-04 checkpoint, which already covers this phase's browser-based data-path confirmation.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The registry is now extensible in place (`push`/`splice`) — plan `04-02` can append IndexedDB-backed entries (`_packToVersion`, `refreshPluginVersions()`) without touching this plan's code.
- `loadVersion()`'s `idb` branch already reads via `window.pluginStore.getSpells(ver.packId)`; `04-02` only needs to populate entries with `source: 'idb'` and a valid `packId` for the dispatch to work end to end.
- No blockers. FA-1 (the one unresolved concurrency edge from the phase's probe accounting) still applies unchanged — this plan does not resolve it, by design.

---
*Phase: 04-loader-integration-source-dispatch*
*Completed: 2026-08-12*

## Self-Check: PASSED

- FOUND: `spells-data-loader.jsx`
- FOUND: `scripts/check-source-dispatch.tests.ps1`
- FOUND: `.planning/phases/04-loader-integration-source-dispatch/04-01-SUMMARY.md`
- FOUND: commit `6de5642` (Task 1)
- FOUND: commit `36893a4` (Task 2)
- FOUND: commit `0d7ec49` (docs: SUMMARY)
