---
phase: 06-decommissioning-migration
plan: 07
subsystem: ui
tags: [localstorage, migration, react, transition-banner, jest-free-node-gates]

requires:
  - phase: 06-decommissioning-migration
    provides: peekBookmarks() pure reader (06-02), transition-banner.jsx / MIGR-03 (06-04), CACHE_VERSION bump (06-05)
provides:
  - "peekCharacters() pure reader for hifi_chars_v1, mirroring peekBookmarks()"
  - "loadCharacters() rewritten on top of peekCharacters(), same observable default behavior"
  - "loadBookmarks() write suppressed when nothing to migrate"
  - "transition-banner.jsx signal 2 and _countOrphans() consuming peekCharacters()"
  - "execution-proof test coverage for both gaps in the two existing gates"
affects: [06-06-PLAN.md re-run, any future module reading hifi_chars_v1 for existing-user evidence]

tech-stack:
  added: []
  patterns:
    - "Pure peek*()/mutating load*() pair per localStorage-backed store — peekBookmarks() (06-02) now mirrored by peekCharacters()"
    - "Gate execution proofs run the real production function (regex-extracted + eval'd) against an instrumented fake localStorage, never grep-only"

key-files:
  created: []
  modified:
    - v11-character-editor.jsx
    - transition-banner.jsx
    - scripts/check-bookmarks-read-purity.tests.ps1
    - scripts/check-transition-banner.tests.ps1

key-decisions:
  - "peekCharacters() mirrors peekBookmarks() line-for-line (try/getItem/null-check/JSON.parse/Array.isArray), never returns HIFI_DEFAULT_CHARS"
  - "loadCharacters() rewritten as peekCharacters() + default fallback, preserving byte-identical behavior for null/empty-string/'null'-string/corrupted-JSON/legit-empty-array inputs"
  - "loadBookmarks()'s migration write is now conditioned on migrated.size > 0 — the null-check entry condition and the four callers are untouched"
  - "transition-banner.jsx header/D-06/D-13 comments refer to accessors without the window. prefix, per the existing gate's text-scan rule"

requirements-completed: [MIGR-03]

coverage:
  - id: D1
    description: "peekCharacters() exists, is exported on window, and is proven to never return the default character even when hifi_chars_v1 is absent"
    requirement: MIGR-03
    verification:
      - kind: unit
        ref: "scripts/check-bookmarks-read-purity.tests.ps1 (peekCharacters scenarios 1-3, executed via npm test)"
        status: pass
    human_judgment: false
  - id: D2
    description: "loadCharacters() keeps opening the app with a default character on a fresh install (non-regression)"
    requirement: MIGR-03
    verification:
      - kind: unit
        ref: "scripts/check-bookmarks-read-purity.tests.ps1 (loadCharacters scenarios 1-2, executed via npm test)"
        status: pass
    human_judgment: false
  - id: D3
    description: "loadBookmarks() no longer writes hifi_bookmarks_v1 on a fresh install with nothing to migrate, while still migrating real per-character favorites exactly once"
    requirement: MIGR-03
    verification:
      - kind: unit
        ref: "scripts/check-bookmarks-read-purity.tests.ps1 (loadBookmarks Gap-2 + migratory scenarios, executed via npm test)"
        status: pass
    human_judgment: false
  - id: D4
    description: "_hasExistingUserSignal() is false on a virgin install (D-06) and true for a real existing user via saved character, saved bookmark, or legacyVersionFallback (MIGR-03 non-regression)"
    requirement: MIGR-03
    verification:
      - kind: unit
        ref: "scripts/check-transition-banner.tests.ps1 (block 7, scenarios a-d, executed via npm test)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Manual browser contraprova on a never-visited profile/origin: banner does not render and hifi_bookmarks_v1 stays absent"
    verification: []
    human_judgment: true
    rationale: "Requires a virgin Chrome profile/origin, out of scope for this automated execution session — deferred to the 06-06-PLAN.md re-run the plan's own sequencing notes require."

duration: 6min
completed: 2026-09-04
status: complete
---

# Phase 6 Plan 07: Gap Closure (Migration Banner + Bookmarks Key) Summary

**Added `peekCharacters()` mirroring `peekBookmarks()` to stop `loadCharacters()`'s synthesized default character from tripping the migration-banner's existing-user signal, and stopped `loadBookmarks()` from writing `hifi_bookmarks_v1` on a fresh install with nothing to migrate — both proven by execution, not grep.**

## Performance

- **Duration:** ~6 min (task commits 23:07:37 → 23:13:30)
- **Tasks:** 3/3 completed
- **Files modified:** 4

## Accomplishments
- `peekCharacters()` added to `v11-character-editor.jsx`, exported on `window`, proven pure (never writes, never removes) and proven to never substitute `HIFI_DEFAULT_CHARS` for an absent/corrupted/legitimately-empty `hifi_chars_v1`.
- `loadCharacters()` rewritten on top of `peekCharacters()`, preserving today's observable default-fallback behavior (app still opens with a character on a fresh install) — verified by execution against every edge case (missing key, corrupted JSON, legitimately-empty saved array).
- `transition-banner.jsx`'s `_hasExistingUserSignal()` signal 2 and `_countOrphans()` now read through `window.peekCharacters()` instead of `window.loadCharacters()`, closing the Gap 1 defect where every fresh install saw the migration banner (violating D-06).
- `loadBookmarks()`'s one-time per-character-bookmarks migration now only writes `hifi_bookmarks_v1` when the migrated `Set` is non-empty, closing Gap 2 (the key no longer appears as `"[]"` after a fresh-install read); the real migration path (users with per-character favorites) is untouched and still writes exactly once.
- Both existing gates (`check-bookmarks-read-purity.tests.ps1`, `check-transition-banner.tests.ps1`) extended — no new test files — with execution proofs of all four UAT-required guarantees, running the real production functions against an instrumented fake `localStorage`.
- Mutation check performed manually for both gaps: reverting each fix independently made `npm test` fail; restoring each brought the suite back to green (see "Mutation Check Results" below).

## Task Commits

Each task was committed atomically:

1. **Task 1: peekCharacters() pure reader and banner consuming it (Gap 1)** - `83d000b` (feat)
2. **Task 2: loadBookmarks() no longer creates the key when nothing to migrate (Gap 2)** - `f4d66b2` (fix)
3. **Task 3: the four guarantees proven by execution in the two existing gates** - `3fe7429` (test)

**Plan metadata:** pending (this SUMMARY's own commit, made by the orchestrator/final-commit step)

## Files Created/Modified
- `v11-character-editor.jsx` - Added `peekCharacters()`, rewrote `loadCharacters()` on top of it, added `peekCharacters` to the `Object.assign(window, {...})` footer, conditioned `loadBookmarks()`'s migration write on `migrated.size > 0`
- `transition-banner.jsx` - `_hasExistingUserSignal()` signal 2 and `_countOrphans()` now call `window.peekCharacters()`; header/D-06/D-13 comments corrected to name the current accessors without the `window.` prefix
- `scripts/check-bookmarks-read-purity.tests.ps1` - Added execution-proof scenarios for `peekCharacters()` (3), `loadCharacters()` (2), and `loadBookmarks()` Gap-2 write-suppression (2); widened header/closing message to the expanded scope
- `scripts/check-transition-banner.tests.ps1` - Added block 7: execution proof of `_hasExistingUserSignal()` across 4 scenarios (D-06 false-on-virgin, MIGR-03 true-on-character/bookmark/legacyFallback)

## Decisions Made
- `peekCharacters()` mirrors `peekBookmarks()`'s exact contract (try → `getItem` → `null`-check → `JSON.parse` → `Array.isArray` guard → `catch` degrades to `[]`), returning the RAW array with no normalization — callers needing normalized characters still use `loadCharacters()`.
- `loadCharacters()`'s edge cases were verified byte-for-byte against the original implementation before rewriting: `null`, empty string, the string `"null"`, corrupted JSON, and a legitimately-saved empty array all still fall through to `HIFI_DEFAULT_CHARS.map(_normChar)` because `peekCharacters()` returns `[]` in every one of those cases and `loadCharacters()` checks `chars.length`.
- `loadBookmarks()`'s migration entry condition (`localStorage.getItem(...) === null`) and its `Set`-of-`c.bookmarked` collection logic are unchanged — only the persistence step is now gated behind `arr.length > 0`. The accepted, expected consequence (documented in-code) is that a fresh install re-evaluates this branch on every call instead of writing once; the first real favorite still persists via `persistBookmarks()`.
- `index.html`, `pack-manager.jsx`, and `v10-hifi.jsx` were deliberately left untouched — they call `loadCharacters()` to *operate* on the list (append an imported build, count removal impact, pick the next character after deleting), never as evidence of "existing user," so they still need the default-carrying behavior.
- Comment text in `transition-banner.jsx` was written without the `window.` prefix on accessor names (e.g., `peekCharacters()` not `window.peekCharacters()`), per the plan's warning that a text-scan gate rejects the qualified form anywhere in the file including comments.

## Deviations from Plan

None - plan executed exactly as written. All four `must_haves.truths`, all five `must_haves.prohibitions`, and all four `must_haves.artifacts` are satisfied; the two `key_links` patterns (`window\.peekCharacters` in transition-banner.jsx, `_hasExistingUserSignal` in the gate) are both present and were exercised during the mutation check.

## Mutation Check Results

Both required negative proofs (Task 3 acceptance criteria) were performed manually, not just implied:

**Gap 1 negative proof:** Reverted `transition-banner.jsx` signal 2 from `window.peekCharacters()` back to `window.loadCharacters()`, ran `npm test` → **failed** (`check-transition-banner.tests.ps1`, scenario (b) "personagem salvo de verdade" no longer returned `true`, because the test harness only wires the pure readers onto `global.window`, and the mutated code called an accessor the harness didn't provide — the gate caught the regression). Restored the fix, ran `npm test` → **all tests passed** again.

**Gap 2 negative proof:** Reverted `loadBookmarks()`'s migration write back to unconditional (`localStorage.setItem(...)` always called inside the `null`-key branch), ran `npm test` → **failed** (`check-bookmarks-read-purity.tests.ps1`, the two new Gap-2 scenarios asserting `setItem === 0` on an empty/no-favorites install both failed). Restored the fix, ran `npm test` → **all tests passed** again.

Both mutations were restored immediately after confirming the failure, and the final `npm test` run (post Task 3 commit) shows `All test scripts passed.`

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All three tasks committed; `npm test` green on the final commit (`3fe7429`).
- Per the plan's sequencing notes, `06-06-PLAN.md` must be RE-EXECUTED after this plan merges, with UAT test 5 (fresh-install contraprova) redone on a genuinely virgin browser profile/origin — that is out of scope for this plan and is the one item left as `human_judgment: true` in the coverage table above (D5).
- No blockers for that re-run: both fixes are self-contained in `v11-character-editor.jsx` / `transition-banner.jsx`, and no other file in the phase was touched.

## Self-Check: PASSED

All 4 modified files confirmed present on disk; all 4 commits (`83d000b`, `f4d66b2`, `3fe7429`, `8fd5cd8`) confirmed present in `git log`.

---
*Phase: 06-decommissioning-migration*
*Completed: 2026-09-04*
