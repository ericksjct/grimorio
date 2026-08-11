---
phase: 03-srd-pack-import-pipeline
plan: 06
subsystem: ui
tags: [react, i18n, dialog, a11y, hifi-tokens]

# Dependency graph
requires:
  - phase: 03-srd-pack-import-pipeline
    provides: "pack-import.jsx PACK_ERROR_CODES contract (03-03), installFromFile/installFromUrl interface (03-05, running concurrently)"
provides:
  - "PackImportDialog and PackImportRoot components (pack-import-dialog.jsx)"
  - "import.* and packErr.* i18n keys in both ptbr and en"
  - "scripts/check-pack-import-dialog.tests.ps1 regression check"
affects: [phase-05-pack-manager, phase-07-index-html-wiring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fixed-scrim centered dialog (OnboardingModal shape): themeClass wrapper as scrim with onClick=onClose, inner <section role=\"dialog\"> with stopPropagation"
    - "Literal PACK_ERROR_CODES value map (not runtime window.packImport.PACK_ERROR_CODES lookup) to decouple i18n error-key mapping from script load order"

key-files:
  created:
    - pack-import-dialog.jsx
    - scripts/check-pack-import-dialog.tests.ps1
  modified:
    - i18n.jsx

key-decisions:
  - "Body content is either the full form (heading/body/docs-link/mode-toggle/active-field/error/size-hint) or the success block, never both — success replaces the form entirely rather than only the input fields, since D-12's CORS notice must stay visible until success (no state where it's silently dropped mid-fill)"
  - "packErr.* code-to-i18n-key mapping uses hardcoded PACK_ERROR_CODES string literals ('malformed-json', etc.) instead of reading window.packImport.PACK_ERROR_CODES at call time — avoids a script-load-order dependency this plan does not own"

patterns-established:
  - "Dialog shell for centered (non-bottom-sheet) modals mounted outside v10-hifi.jsx: fixed full-viewport scrim div (rgba(0,0,0,0.55), flex-center) wrapping a role=\"dialog\" section with stopPropagation, matching OnboardingModal in index.html"

requirements-completed: [PKG-02, PKG-03]

coverage:
  - id: D1
    description: "PackImportDialog renders the resting-state form (file button, empty URL field, inline CORS notice, size hint, docs link) before any input, both languages"
    requirement: "PKG-03"
    verification:
      - kind: unit
        ref: "scripts/check-pack-import-dialog.tests.ps1 (structural + i18n parity checks)"
        status: pass
    human_judgment: true
    rationale: "Structural/i18n presence is automated, but visual rendering across 6 themes x light/dark is manual browser QA per project convention (no visual test harness) — deferred to phase verification"
  - id: D2
    description: "Submit disabled until exactly one mode has a value; busy state disables both fields and the submit button; no spinner"
    requirement: "PKG-02"
    verification:
      - kind: unit
        ref: "scripts/check-pack-import-dialog.tests.ps1 (mode-exclusivity, 'disabled' presence checks)"
        status: pass
    human_judgment: true
    rationale: "Disabled-state logic is code-inspectable but the actual disable/enable interaction (clicking, typing, submitting) requires a live browser — window.packImport.installFromFile/installFromUrl do not exist yet in this worktree (plan 03-05 running concurrently), so no runtime exercise was possible here"
  - id: D3
    description: "Every PACK_ERROR_CODES rejection maps to an inline var(--red) message under the active field, in both languages; fetch-failure also fires the global hifi-toast"
    requirement: "PKG-02"
    verification:
      - kind: unit
        ref: "scripts/check-pack-import-dialog.tests.ps1 (packErr.* coverage + i18n parity, fail-first proof recorded below)"
        status: pass
    human_judgment: true
    rationale: "Static mapping and i18n coverage are verified; actually triggering each PACK_ERROR_CODES value end-to-end requires the real pipeline (03-05) and a browser session"
  - id: D4
    description: "Success message names the applied identifier (including D-09 suffix) in .hifi-mono with overflow-wrap:anywhere, plus spell count and conditional sanitized-fields note"
    requirement: "PKG-02"
    verification:
      - kind: unit
        ref: "scripts/check-pack-import-dialog.tests.ps1 (overflowWrap, hifi-mono presence checks)"
        status: pass
    human_judgment: true
    rationale: "Message composition is code-verified; whether a long real-world identifier actually wraps correctly on-screen is a visual/manual check"

duration: 25min
completed: 2026-08-10
status: complete
---

# Phase 03 Plan 06: Pack Import Dialog Summary

**Minimal file/URL import dialog (PackImportDialog + PackImportRoot) wired to window.packImport's contract, with all 24 new i18n strings (18 import.*, 6 packErr.*) in PT-BR/EN parity, plus a regression check script proven fail-first on both a missing i18n key and a hardcoded hex color.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-08-10 (session start)
- **Completed:** 2026-08-10T22:09:36-03:00
- **Tasks:** 3
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments
- Added 18 `import.*` and 6 `packErr.*` keys to `i18n.jsx` in both `ptbr` and `en` blocks, additive-only diff, `i18nParityCheck()` returns `{}`
- Built `PackImportDialog` (file/URL mode toggle, mutually-exclusive fields, busy-state disabling, inline error mapped from `err.code`, success message with applied identifier) and `PackImportRoot` (trigger button + dialog, `open` state)
- Wrote `scripts/check-pack-import-dialog.tests.ps1` covering structure, pipeline-contract call names, all six `packErr.*` codes' i18n coverage, no-hardcoded-hex-color, no-visible-string-outside-`tt()`, mode-exclusivity, and no-empty-catch — proven fail-first twice (missing i18n key, hardcoded hex color), reverted, back to exit 0

## Task Commits

Each task was committed atomically:

1. **Task 1: Add import copy keys to i18n.jsx** - `221efe9` (feat)
2. **Task 2: Create pack-import-dialog.jsx** - `61d01f4` (feat)
3. **Task 3: Add check-pack-import-dialog.tests.ps1** - `7b24c64` (test)

_No TDD tasks in this plan; single commit per task._

## Files Created/Modified
- `i18n.jsx` - added 18 `import.*` + 6 `packErr.*` keys, both `ptbr` and `en` blocks, additive-only (52 lines added, 0 removed)
- `pack-import-dialog.jsx` - new file (252 lines), `PackImportDialog` and `PackImportRoot`
- `scripts/check-pack-import-dialog.tests.ps1` - new file (116 lines), structural + i18n-parity + fail-first-proven regression check

## Decisions Made
- **Body content is form OR success, not both.** When `result` is set, the entire form (heading, body, docs link, mode toggle, active field, error, size hint) is replaced by the success block rather than only swapping out the file/URL inputs. Chosen because the plan's "no lugar dos campos" phrasing was ambiguous about scope, and hiding the whole form on success is simpler code with no loss of required behavior (header/footer stay visible per the `maxHeight`/`overflowY` truth either way).
- **`packErr.*` mapping uses hardcoded string literals** (`'malformed-json'`, `'blocked-key'`, etc.) matching the interface contract, instead of reading `window.packImport.PACK_ERROR_CODES` at call time. This removes a script-load-order dependency that plan 03-07 (index.html wiring) hasn't resolved yet — the dialog can be authored and tested independently of load order.
- **Dialog shell follows `OnboardingModal`'s centered-modal shape** (single wrapper div as scrim + flex-center, inner `<section role="dialog">` with `stopPropagation`) rather than `v10-hifi.jsx`'s bottom-sheet sibling-scrim pattern, because this is a centered panel (`width: min(560px, 100%)`), not a bottom sheet — `OnboardingModal` is the closer analog for that shape.

## Deviations from Plan

None - plan executed exactly as written. The "text node without tt()" regex false-positived once during authoring (matched JS comparison operators `>`/`<` in non-JSX code, e.g. `result.changedFields > 0`); fixed by excluding newlines and code punctuation (`;()=`) from the matched span before the first commit of Task 3 — this was self-correction during script authoring, not a deviation from the plan's required checks (all ten checks from the plan's action list are present).

## Issues Encountered

**Parallel-plan constraint (expected, not a defect):** Per the plan's `<parallel_plan_warning>`, `window.packImport.installFromFile`/`installFromUrl` do not exist in this worktree — plan 03-05 (running concurrently in a separate worktree) adds them. The dialog is written against the interface exactly as declared in `<interface_contract>` (function names, return shape `{ identifier, spellCount, changedFields }`, `.code` values), and no runtime exercise of the actual pipeline was possible or attempted from this worktree. Full end-to-end behavior (D1–D4 in `coverage:` above) needs a merged worktree + browser session, hence `human_judgment: true` on all four.

**Verification scope actually run:** `pwsh -File scripts/check-pack-import-dialog.tests.ps1` (exit 0), `i18nParityCheck()` (empty object), `scripts/check-pack-format.tests.ps1` (03-01, exit 0), `scripts/check-pack-validator.tests.ps1` (03-03, exit 0), `scripts/check-browser-language-detection.tests.ps1` and `scripts/check-onboarding-modal.tests.ps1` (pre-existing i18n-touching checks, both exit 0, confirming no parity regression). `scripts/check-pack-import.tests.ps1` (03-05's check) does not exist in this worktree yet — it is owned by the concurrently-running 03-05 plan and could not be run here.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `pack-import-dialog.jsx` is ready to be mounted by plan 03-07 (index.html wiring), alongside `HifiPrintRoot`, per the plan's objective note on mount point discretion.
- Phase 5 can delete the `PackImportRoot` trigger button (marked with a `ponytail:` comment) once it decides where the import surface actually lives in the final UI, per D-12.
- No blockers. The only outstanding coupling is runtime verification against the real `window.packImport.installFromFile`/`installFromUrl` once 03-05 merges — recommend a manual browser QA pass (6 themes x light/dark, per project convention) after all three wave-3 worktrees merge.

## Self-Check: PASSED

- FOUND: i18n.jsx
- FOUND: pack-import-dialog.jsx
- FOUND: scripts/check-pack-import-dialog.tests.ps1
- FOUND: .planning/phases/03-srd-pack-import-pipeline/03-06-SUMMARY.md
- FOUND commit: 221efe9 (Task 1)
- FOUND commit: 61d01f4 (Task 2)
- FOUND commit: 7b24c64 (Task 3)

---
*Phase: 03-srd-pack-import-pipeline*
*Completed: 2026-08-10*
