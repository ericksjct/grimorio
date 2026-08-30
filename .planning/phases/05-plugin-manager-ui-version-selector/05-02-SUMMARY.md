---
phase: 05-plugin-manager-ui-version-selector
plan: 02
subsystem: ui
tags: [pack-manager, service-worker, index-html, test-gates]

# Dependency graph
requires:
  - phase: 05-plugin-manager-ui-version-selector
    plan: 01
    provides: "pack-manager.jsx (PackManager modal + PackManagerRoot mount contract), window.__openPackManager"
provides:
  - "PackManagerRoot mounted once in the App tree, right after HifiPrintRoot"
  - "pack-manager.jsx wired into index.html load order and sw.js PRECACHE"
  - "PackImportDialog as a standalone sibling dialog (floating trigger retired, D-03)"
  - "check-pack-import-dialog.tests.ps1 / check-pack-wiring.tests.ps1 realigned to guard the new mount instead of the retired trigger"
affects: ["05-03", "05-04"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Negative-assertion test gates: a positive 'X exists' assertion becomes a positive 'Y exists' + negative 'X never comes back' pair when a symbol is retired, so future regressions of the deleted trigger are caught, not just absence of the new one"

key-files:
  created: []
  modified:
    - pack-import-dialog.jsx
    - index.html
    - sw.js
    - scripts/check-pack-import-dialog.tests.ps1
    - scripts/check-pack-wiring.tests.ps1

key-decisions:
  - "Reworded the WR-08 code comment in PackImportDialog (previously referencing PackImportRoot by name describing its never-unmount behavior) instead of leaving it as dead prose, since the plan's negative-assertion test gate treats ANY occurrence of the identifier in the file as a regression, not just the header comment"

patterns-established:
  - "Test gates that retire a symbol should always pair the removed positive needle with an added negative assertion (grep for the old name, throw if found) rather than simply deleting the needle silently"

requirements-completed: [MGMT-05]

coverage:
  - id: D1
    description: "PackManagerRoot mounted exactly once in index.html, right after HifiPrintRoot, receiving uiLang/dark/theme"
    requirement: MGMT-05
    verification:
      - kind: other
        ref: "scripts/check-pack-wiring.tests.ps1 (block 3: single-mount + position-after-HifiPrintRoot + negative PackImportRoot check)"
        status: pass
    human_judgment: true
    rationale: "No frontend test runner exists in this project; the script proves the DOM/JSX text contract, not actual browser rendering."
  - id: D2
    description: "pack-manager.jsx loads after pack-import-dialog.jsx and before v10-hifi.jsx, and is present in sw.js PRECACHE with CACHE_VERSION unchanged"
    requirement: MGMT-05
    verification:
      - kind: other
        ref: "scripts/check-pack-wiring.tests.ps1 (block 2: load order; block 4: PRECACHE parity; block 6: CACHE_VERSION intact)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Floating provisional import trigger (PackImportRoot) removed from pack-import-dialog.jsx and index.html; import remains reachable only from inside the manager/empty state"
    requirement: MGMT-05
    verification:
      - kind: other
        ref: "scripts/check-pack-import-dialog.tests.ps1 (negative PackImportRoot assertion) + scripts/check-pack-wiring.tests.ps1 (negative PackImportRoot assertion in index.html)"
        status: pass
    human_judgment: true
    rationale: "Gate proven to have teeth by temporarily reintroducing `function PackImportRoot() {}` and confirming check-pack-import-dialog.tests.ps1 fails (exit 1), then reverting — file confirmed byte-identical to the committed version afterward. Actual on-screen confirmation that no fixed element covers the mobile drawer needs a browser pass."

duration: ~20min
completed: 2026-08-30
status: complete
---

# Phase 5 Plan 02: Mount Pack Manager & Retire Floating Import Trigger Summary

**`PackManagerRoot` now mounts once in the App tree after `HifiPrintRoot`, `pack-manager.jsx` is wired into `index.html` load order and `sw.js` PRECACHE, and the floating provisional import trigger (`PackImportRoot`, D-03) is gone — with both wiring test gates migrated from guarding the old trigger to guarding the new mount plus a negative assertion against its return.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-08-30
- **Tasks:** 3/3
- **Files modified:** 5

## Accomplishments

- `pack-import-dialog.jsx` no longer contains `PackImportRoot` anywhere in the file (function body, header comment, or inline code comments) — `PackImportDialog` is untouched and now lives as the sibling dialog `PackManagerRoot` opens (D-04).
- `index.html` mounts `<PackManagerRoot lang={uiLang} dark={dark} theme={theme} />` exactly once, immediately after `<HifiPrintRoot />`, with the `pack-manager.jsx` script tag inserted between `pack-import-dialog.jsx` and `v10-hifi.jsx` — the exact load-order contract `pack-manager.jsx` needs (it references `PackImportDialog`) and that `v10-hifi.jsx` needs (`window.__openPackManager`).
- `sw.js` PRECACHE gained `'./pack-manager.jsx'` in the same relative order as the script tags; `CACHE_VERSION` stayed at `'grimorio-v1'` (pure PRECACHE addition doesn't justify a bump and a bump would re-download all cached spell JSONs for every user).
- `scripts/check-pack-import-dialog.tests.ps1` dropped the `'function PackImportRoot'` needle and gained a negative assertion: if the identifier ever reappears in `pack-import-dialog.jsx`, the gate fails with a message pointing at D-03.
- `scripts/check-pack-wiring.tests.ps1` migrated its "Montagem" block from asserting `<PackImportRoot` to asserting exactly one `<PackManagerRoot` mounted after `<HifiPrintRoot`, added a negative `PackImportRoot` check, extended the load-order block with `pack-import-dialog.jsx < pack-manager.jsx < v10-hifi.jsx`, and added `'./pack-manager.jsx'` to the PRECACHE parity needles.
- The mobile drawer todo (`mobile-botao-instalar-cobre-drawer.md`) is resolved at the root per D-03 — the floating button no longer exists anywhere in the app, so it cannot cover the drawer's VERSÃO section. The todo file itself was left in `.planning/todos/pending/` (moving it is outside this plan's declared `files_modified` and the worktree wave boundary) — flagging it for the orchestrator/next session to move to `.planning/todos/completed/`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Remover a raiz provisória de import de pack-import-dialog.jsx** - `cc419d7` (feat)
2. **Task 2: Montar PackManagerRoot em index.html e pré-cachear pack-manager.jsx** - `99e471f` (feat)
3. **Task 3: Realinhar os dois scripts de teste que exigiam o gatilho provisório** - `778d5e6` (test)

**Plan metadata:** committed alongside this SUMMARY (see final commit).

## Files Created/Modified

- `pack-import-dialog.jsx` - `PackImportRoot` and its `ponytail:` marker comment removed; module header rewritten to describe only `PackImportDialog`; a stale WR-08 comment that named the removed function reworded to describe the same behavior by concept.
- `index.html` - `<script src="pack-manager.jsx">` inserted; `<PackManagerRoot ... />` replaces the old floating-trigger mount, still positioned right after `<HifiPrintRoot />`.
- `sw.js` - `'./pack-manager.jsx'` added to `PRECACHE`; `CACHE_VERSION` unchanged.
- `scripts/check-pack-import-dialog.tests.ps1` - Removed the `PackImportRoot` structural needle, added a negative assertion against its return; `'import.open'` kept in the required i18n key list (still in use as the manager's primary "Importar pacote" label).
- `scripts/check-pack-wiring.tests.ps1` - "Montagem" block retargeted to `PackManagerRoot` (count + position + negative check); "Ordem de carga" block extended with `pack-manager.jsx` position checks; "Paridade PRECACHE" block extended with `'./pack-manager.jsx'`.

## Decisions Made

- Reworded (rather than deleted) the WR-08 code comment in `PackImportDialog` that explained why the effect resets `result`/`file`/`url`/`error` on reopen — the underlying behavior (whoever mounts this dialog never unmounts it, `open` only toggles `return null`) is still true and still explains real code, but the comment previously named `PackImportRoot` by identifier, which the plan's hygiene rule (and the new negative test assertion) forbids anywhere in the file, not just the header.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Stale comment referencing the removed identifier outside the header**
- **Found during:** Task 1, running the plan's own verification command (`grep -c PackImportRoot pack-import-dialog.jsx` expected 0)
- **Issue:** The plan's `<read_first>`/`<action>` for Task 1 only called out lines 1-14 (header) and 277-293 (the function itself) as needing edits, but a WR-08 explanatory comment at line 55 also named `PackImportRoot` directly. Removing only the header and function left this reference behind, which would have made the file fail its own acceptance criterion (`grep -c PackImportRoot` returns 0) and later made Task 3's negative test gate fail on a stale comment rather than real code.
- **Fix:** Reworded the comment to describe the behavior by concept ("quem monta este diálogo nunca o desmonta") instead of naming the removed function.
- **Files modified:** `pack-import-dialog.jsx`
- **Verification:** Re-ran the plan's Task 1 verification command; `grep -c PackImportRoot` returns 0 across the whole file, and `pwsh scripts/check-pack-import-dialog.tests.ps1` passes.
- **Committed in:** `cc419d7` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1, surfaced by the plan's own mandated verification command)
**Impact on plan:** No scope creep — the fix is a one-line comment correction needed to satisfy the plan's own stated acceptance criterion.

## Issues Encountered

- None beyond the deviation above. The "prove the gate has teeth" acceptance step (temporarily reintroduce `function PackImportRoot() {}` at the end of `pack-import-dialog.jsx`, confirm `check-pack-import-dialog.tests.ps1` fails, then revert) was executed and confirmed: the gate failed with exit code 1 on the reintroduced text, and the file was restored to be byte-identical to its committed state afterward (verified with `cmp`).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `PackManagerRoot` is now reachable from the running app (`window.__openPackManager()` in the console opens it) — plans 05-03 (removal/duplicate-count) and 05-04 (version-selector trigger wiring) can build directly on this mount without any further scaffolding.
- The floating import trigger is fully retired; no code path in the app renders a fixed element that could cover mobile UI. The `mobile-botao-instalar-cobre-drawer.md` todo's root cause is resolved — someone with repo write access outside this plan's file scope should move it from `.planning/todos/pending/` to `.planning/todos/completed/`.
- **Pending manual browser verification** (per this plan's `<verification>` section — no automated frontend test runner exists in this project, consistent with all prior phases):
  - Open the app; confirm no console errors and no fixed floating element appears over the layout at any viewport.
  - Run `window.__openPackManager()` in the console — confirm it opens the manager modal.
  - Reload with DevTools → Network → Offline — confirm the app still opens and `window.__openPackManager()` still works (proves `pack-manager.jsx` is actually served from the service worker cache, not just declared in PRECACHE).
  - Inspect the drawer at 390×844 in both light and dark themes — confirm no element overlaps the VERSÃO section pills (closes the folded todo).

## Self-Check: PASSED

- FOUND: `pack-import-dialog.jsx`
- FOUND: `index.html`
- FOUND: `sw.js`
- FOUND: `scripts/check-pack-import-dialog.tests.ps1`
- FOUND: `scripts/check-pack-wiring.tests.ps1`
- FOUND: commit `cc419d7` (Task 1)
- FOUND: commit `99e471f` (Task 2)
- FOUND: commit `778d5e6` (Task 3)

---
*Phase: 05-plugin-manager-ui-version-selector*
*Completed: 2026-08-30*
