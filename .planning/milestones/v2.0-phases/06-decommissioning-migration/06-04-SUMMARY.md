---
phase: 06-decommissioning-migration
plan: 04
subsystem: migration-ux
tags: [i18n, transition-banner, localStorage, MIGR-03, D-05, D-06, D-07, D-08, D-13]

# Dependency graph
requires:
  - phase: 06-decommissioning-migration
    plan: "06-01"
    provides: "window.__legacyVersionFallback (D-04 signal) and window.resolvableSpellKeys() (D-13 orphan resolution) in spells-data-loader.jsx"
  - phase: 06-decommissioning-migration
    plan: "06-02"
    provides: "window.peekBookmarks() — pure read accessor for hifi_bookmarks_v1, required so the banner's existing-user signal never creates the key for a fresh install (WR-01)"
provides:
  - "TransitionBanner + TransitionBannerRoot (transition-banner.jsx) — dismissible, non-modal, existing-user-only migration notice"
  - "10 migration.* i18n keys (STRINGS.ptbr + STRINGS.en), full parity"
  - "scripts/check-transition-banner.tests.ps1 — load-order/mount/PRECACHE/no-write/no-timer/safe-link assertions plus a Node execution-proof of migration.* i18n parity via the real i18nParityCheck()"
affects: [06-05-decommissioning, 06-06-checkpoint]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Root component reads an existing-user signal ONCE via React.useState(fn) initializer, never re-evaluated on render (mirrors dismissed-flag init pattern)"
    - "Inline defensive localStorage parse duplicated per-module instead of a shared import — top-level const/let bindings collide across classic <script> tags that share one global lexical scope, so a module loaded before index.html's own UI_PREFS_KEY declaration cannot bind the same identifier name (same reason spells-data-loader.jsx does its own inline parse instead of calling loadPrefs())"
    - "Execution-proof i18n parity gate: vm.runInContext the real i18n.jsx source, capture STRINGS + i18nParityCheck via a trailing this.__x = x; assignment, then call the REAL production function instead of reimplementing parity logic in the gate (same pattern as check-pack-import-dialog.tests.ps1's makeT capture)"

key-files:
  created:
    - transition-banner.jsx
    - scripts/check-transition-banner.tests.ps1
  modified:
    - i18n.jsx
    - index.html
    - sw.js

key-decisions:
  - "transition-banner.jsx never declares a module-level UI_PREFS_KEY/loadPrefs/savePrefs binding — it duplicates the exact defensive-parse logic inline with the literal string 'spellbook-ui-prefs', because the file loads (in index.html's script order) BEFORE the inline <script> block that declares those names, and top-level `const UI_PREFS_KEY` in two classic <script> tags on the same page would throw a SyntaxError (Identifier already declared) the moment the second one executed — this would have broken the entire app boot, not just the banner"
  - "Orphan-count effect and existing-user signal both live in TransitionBannerRoot (not the presentation component), so the presentation component (TransitionBanner) stays a pure props-in function with zero localStorage/window reads of its own"
  - "zIndex 90 for the banner — below every existing modal overlay (100 in pack-manager.jsx / pack-import-dialog.jsx) and above every non-modal content layer found in v10-hifi.jsx (max 70)"
  - "The gate's i18n-parity proof calls the real production i18nParityCheck() (via vm.runInContext + captured reference) instead of reimplementing the gap-check logic a second time in PowerShell/Node — avoids two implementations of the same rule silently diverging"

requirements-completed: [MIGR-03]

coverage:
  - id: D1
    description: "Banner appears only for an existing user (D-06): window.__legacyVersionFallback != null, OR window.loadCharacters() non-empty, OR window.peekBookmarks() non-empty — evaluated once in a state initializer, never per-render"
    requirement: "MIGR-03"
    verification:
      - kind: unit
        ref: "scripts/check-transition-banner.tests.ps1 (text assertion: window.loadBookmarks absent; window.peekBookmarks present) + manual code review of _hasExistingUserSignal()"
        status: pass
    human_judgment: false
  - id: D2
    description: "Banner never uses window.loadBookmarks() (which has a write branch) for the existing-user signal or the orphan count — only window.peekBookmarks() (WR-01, closed in 06-02)"
    requirement: "MIGR-03"
    verification:
      - kind: unit
        ref: "scripts/check-transition-banner.tests.ps1 grep-equivalent: window.loadBookmarks match count 0, window.peekBookmarks match count >= 1"
        status: pass
    human_judgment: false
  - id: D3
    description: "Banner never auto-dismisses (D-05): no setTimeout/setInterval anywhere in transition-banner.jsx; dismissal is the only way it disappears"
    requirement: "MIGR-03"
    verification:
      - kind: unit
        ref: "scripts/check-transition-banner.tests.ps1 (regex match for setTimeout|setInterval == none)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Dismissal persists into the existing spellbook-ui-prefs blob (migrationNoticeDismissed field) via a defensive read + full-blob rewrite; no new localStorage key created"
    requirement: "MIGR-03"
    verification:
      - kind: unit
        ref: "Manual review of handleDismiss() in transition-banner.jsx: single localStorage.setItem call, writes 'spellbook-ui-prefs' with Object.assign({}, prev, {migrationNoticeDismissed:true})"
        status: pass
    human_judgment: false
  - id: D5
    description: "pack-docs.html link opens in a new tab with rel=\"noopener noreferrer\" (T-06-04-01)"
    requirement: "MIGR-03"
    verification:
      - kind: unit
        ref: "scripts/check-transition-banner.tests.ps1: every <a target=\"_blank\"> tag must contain rel=\"noopener noreferrer\""
        status: pass
    human_judgment: false
  - id: D6
    description: "App's prefs-persistence effect (index.html, keyed on [dark, theme, character, uiLang, versionKey]) does NOT write migrationNoticeDismissed — otherwise a theme change would silently un-write the dismissal (T-06-04-03)"
    requirement: "MIGR-03"
    verification:
      - kind: unit
        ref: "scripts/check-transition-banner.tests.ps1: regex-isolates the persistence effect body and asserts it does not contain 'migrationNoticeDismissed'"
        status: pass
    human_judgment: false
  - id: D7
    description: "All 10 migration.* keys exist in STRINGS.ptbr and STRINGS.en with full parity (i18nParityCheck() returns {}); migration.orphansMany carries the {n} placeholder in both languages, migration.orphansOne carries none"
    requirement: "MIGR-03"
    verification:
      - kind: unit
        ref: "scripts/check-transition-banner.tests.ps1 Node execution-proof: vm.runInContext(i18n.jsx) + real i18nParityCheck() call, plus per-key existence and placeholder checks"
        status: pass
    human_judgment: false
  - id: D8
    description: "Banner language follows the interface language (uiLang), never the active spell-version's language — no reference to getCurrentSpellVersion anywhere in transition-banner.jsx, and <TransitionBannerRoot> is mounted with lang={uiLang}"
    requirement: "MIGR-03"
    verification:
      - kind: unit
        ref: "scripts/check-transition-banner.tests.ps1: mount regex requires lang={uiLang}; grep-equivalent getCurrentSpellVersion count == 0 in transition-banner.jsx"
        status: pass
    human_judgment: false
  - id: D9
    description: "sw.js precaches transition-banner.jsx as a pure PRECACHE addition; CACHE_VERSION stays 'grimorio-v1' (D-14 — the bump belongs to 06-05's atomic JSON-removal commit)"
    requirement: "MIGR-03"
    verification:
      - kind: unit
        ref: "scripts/check-transition-banner.tests.ps1 + pre-existing scripts/check-plugin-store.tests.ps1 (both assert CACHE_VERSION unchanged)"
        status: pass
    human_judgment: false
  - id: D10
    description: "Content order matches D-08 exactly: title, removed, kept, orphan phrase (conditional on count > 0), importCta, action row (openManager button + learnMore link)"
    requirement: "MIGR-03"
    verification:
      - kind: other
        ref: "Manual review of TransitionBanner JSX render order in transition-banner.jsx"
        status: pass
    human_judgment: false
  - id: D11
    description: "After dismissing the banner, the user has a clear path back to full content (Manage Packs button + How-to-build-a-pack link) — text-quality/clarity axis, not mechanically verifiable"
    requirement: "MIGR-03"
    verification:
      - kind: other
        ref: "N/A — flagged as backstop in 06-04-PLAN.md's Flagged Assumptions section"
        status: unknown
    human_judgment: true
    rationale: "The plan itself marks this truth as `backstop`: whether the banner copy actually reads as clear to a real user is a text-quality judgment, not something a grep or execution-proof gate can certify. It closes at the human checkpoint in 06-06 per the plan's own Flagged Assumptions note."
  - id: D12
    description: "Full manual browser verification: 390x844 in both themes with hifi_chars_v1 populated (banner visible, app scrollable/clickable underneath, CTA opens pack manager, link opens pack-docs.html in a new tab, dismissal persists across reload) and with localStorage cleared (banner absent, hifi_bookmarks_v1 stays absent after the visit)"
    requirement: "MIGR-03"
    verification:
      - kind: manual
        ref: "06-04-PLAN.md <verification> section"
        status: unknown
    human_judgment: true
    rationale: "This worktree's Bash tool has no browser automation available (no Playwright/Chromium runner wired to this project, consistent with .planning/codebase/TESTING.md — the app has no automated frontend test suite). All logic-level and text-level assertions were proven via the new PowerShell/Node gate; the actual pixel-level/interactive verification across 390x844 and both themes still needs a human pass or a headless-browser session, same caveat 05-01 recorded for its own manual verification requirement."

# Metrics
duration: ~35min
completed: 2026-09-03
status: complete
---

# Phase 6 Plan 4: Transition Banner Summary

**Dismissible, non-modal top banner that tells an existing user — once, never again — that the D&D 5E/5.5E PT-BR/EN packs left the app, what still works, and how to get full content back via BYOD import; invisible to any fresh install.**

## Performance

- **Duration:** ~35 min
- **Completed:** 2026-09-03
- **Tasks:** 3 completed
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments

- 10 `migration.*` keys added to `i18n.jsx` (`STRINGS.ptbr` + `STRINGS.en`), full parity, singular/plural orphan phrases split into distinct keys instead of concatenation
- `transition-banner.jsx`: `TransitionBannerRoot` decides visibility from a one-time existing-user signal (`__legacyVersionFallback` / `loadCharacters()` / `peekBookmarks()` — never `loadBookmarks()`, closing the WR-01 loop from 06-02) and an async orphan count (`resolvableSpellKeys()`, recomputed on `hifi-plugins-changed`, `null` while indeterminate); `TransitionBanner` is a pure presentation component rendering the D-08 content order with zero direct storage access
- Dismissal writes `migrationNoticeDismissed: true` into the existing `spellbook-ui-prefs` blob via a defensive read + full rewrite — no new `localStorage` key, and the App's own persistence effect was left untouched so a theme/character change can never silently erase the dismissal
- `index.html`: script tag + `<TransitionBannerRoot lang={uiLang} dark={dark} theme={theme} />` mounted right after `<PackManagerRoot ... />`, always receiving the interface language, never a derivation of the active spell version (D-01)
- `sw.js`: pure `PRECACHE` addition (`./transition-banner.jsx`), `CACHE_VERSION` untouched per D-14 (the bump is 06-05's job)
- New `scripts/check-transition-banner.tests.ps1`: load-order + mount assertions, no-write/no-timer/safe-external-link text checks, and a Node execution-proof of `migration.*` i18n parity that calls the REAL `i18nParityCheck()` (via `vm.runInContext`) instead of reimplementing the gap-check logic

## Task Commits

Each task was committed atomically:

1. **Task 1: Chaves migration.* em i18n.jsx** - `3152ba5` (feat)
2. **Task 2: transition-banner.jsx — componente, sinal de usuário existente e dispensa** - `c1acb3a` (feat)
3. **Task 3: Montagem em index.html, PRECACHE em sw.js e gate** - `c61f105` (feat)

_Note: no plan-metadata commit in this run — worktree mode excludes STATE.md/ROADMAP.md; this SUMMARY.md commit follows as a separate docs commit per the worktree protocol._

## Files Created/Modified

- `i18n.jsx` - 10 `migration.*` keys added to both `STRINGS.ptbr` and `STRINGS.en`, right after `toast.versionSwitchedAway`, same relative position in both blocks
- `transition-banner.jsx` - New file: `TransitionBannerRoot`, `TransitionBanner`, `Object.assign(window, {...})`
- `index.html` - Script tag added (after `pack-manager.jsx`, before `v10-hifi.jsx`), order comment extended, `<TransitionBannerRoot .../>` mounted after `<PackManagerRoot .../>`
- `sw.js` - `'./transition-banner.jsx'` added to `PRECACHE`, `CACHE_VERSION` unchanged
- `scripts/check-transition-banner.tests.ps1` - New gate (structural + Node execution-proof)

## Decisions Made

- No module-level `UI_PREFS_KEY`/`loadPrefs`/`savePrefs` binding in `transition-banner.jsx` — duplicated the inline defensive parse instead, because this module's script tag executes before index.html's own inline block declares those names, and a duplicate top-level `const` of the same name across two classic `<script>` tags on the same page throws a `SyntaxError` at the SECOND declaration (they share one global lexical environment) — this would have crashed the entire app boot, not just the banner. `spells-data-loader.jsx` already established this exact precedent for the same reason.
- Existing-user signal and orphan-count effect both live in `TransitionBannerRoot`; `TransitionBanner` stays a pure `props → JSX` function with no storage/window reads, matching `pack-manager.jsx`'s `PackManager`/`PackManagerRoot` split.
- Banner `zIndex: 90` — below every modal overlay in the app (100) and above every non-modal content layer (max 70 found in `v10-hifi.jsx`).
- The new gate's i18n-parity proof calls the real production `i18nParityCheck()` via `vm.runInContext` + a captured reference, instead of re-implementing the gap-check algorithm a second time — avoids two copies of the same rule silently diverging over time (same pattern already used by `check-pack-import-dialog.tests.ps1` for `makeT()`).

## Deviations from Plan

None — plan executed exactly as written. The only adjustment made during Task 3 was cosmetic: the first draft of the index.html script-order comment repeated the literal string `transition-banner.jsx` twice (once in the comment, once in the `<script src>` tag), which would have made `grep -c 'transition-banner.jsx' index.html` return 2 instead of the plan's required 1. Reworded the comment to say "the transition-banner module" in prose instead of repeating the literal filename — same meaning, satisfies the acceptance criterion. This is a same-task self-correction during drafting, not a deviation from the plan's intent, so it is not logged as a numbered Rule 1/2/3 fix.

## Issues Encountered

None. `npm test` (which runs `pwsh -NoProfile -File scripts/run-tests.ps1` as a child process) worked without the `pwsh`-sandbox friction earlier plans in this phase hit when invoking `pwsh` directly — consistent with the runtime note provided for this execution. Full test suite passed after each task, including the new gate and the pre-existing `check-plugin-store.tests.ps1` (`CACHE_VERSION` lock) and `check-pack-wiring.tests.ps1` (load-order assertions unaffected by the new script tag).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- MIGR-03 is closed at the code and gate level. The two items marked `human_judgment: true` (D11: whether the banner copy actually reads as clear, and D12: full manual browser verification at 390×844 in both themes) are exactly the kind of check the plan's own Flagged Assumptions section deferred to the human checkpoint in 06-06 — no automated frontend test runner exists in this project (confirmed in `.planning/codebase/TESTING.md`), so this is consistent with how every prior phase in this milestone closed its "backstop" and manual-verification items.
- 06-05 (decommissioning) can now proceed: it removes the 4 legacy JSONs, the corresponding `BUILTIN_VERSIONS` entries, and the corresponding `PRECACHE` lines in the SAME atomic commit as the `CACHE_VERSION` bump (D-14/D-15) — this plan deliberately left `CACHE_VERSION` untouched so that commit stays the single point where the bump happens.
- The banner's existing-user signal and orphan count are both read-only against `hifi_chars_v1`/`hifi_bookmarks_v1`/`resolvableSpellKeys()` — 06-05's JSON removal does not require touching `transition-banner.jsx` itself; the loader's already-shipped `resolvableSpellKeys()` (06-01) will simply return fewer resolvable keys once the legacy JSONs' fetch entries are gone, which is exactly the input the orphan count expects to react to.

## Self-Check: PASSED

- FOUND: `.planning/phases/06-decommissioning-migration/06-04-SUMMARY.md`
- FOUND: `transition-banner.jsx`
- FOUND: `scripts/check-transition-banner.tests.ps1`
- FOUND: commit `3152ba5` (Task 1: migration.* i18n keys)
- FOUND: commit `c1acb3a` (Task 2: transition-banner.jsx component)
- FOUND: commit `c61f105` (Task 3: mount, PRECACHE, gate)
