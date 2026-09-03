---
phase: 06-decommissioning-migration
plan: 03
subsystem: ui
tags: [v11-character-editor, migration, orphan-spells, react-hooks]

# Dependency graph
requires:
  - phase: 06-decommissioning-migration (plan 01)
    provides: window.resolvableSpellKeys() — the resolvable-keys index this plan renders orphans against
provides:
  - hifiOrphanFromKey(key) — pure key parser, never returns null, derives {key, school, lvl, title} from a hifiSpellKey() string
  - useResolvableKeys(spellVersion) — hook wrapping window.resolvableSpellKeys(), null-as-indeterminate
  - orphanSpells — memoized per-tab derivation (prepared/bookmarked) of preparted/bookmarked keys that no longer resolve
  - A rendered "orphan spells" section at the end of the prepared/bookmarked tabs, with count, explanation, and the existing per-key toggle
affects: [06-04-transition-banner, 06-05-decommission-legacy-jsons]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Key-parsing via first-two-hyphens split (school-lvl-slug), never returning null, degrading to the raw (truncated) string when the shape is unexpected — reusable for any future hifiSpellKey-derived display need"
    - "Render-only derivation memo disjoint from the primary filtered list (orphanSpells vs filteredSpells) — same tab/query inputs, never writes storage"

key-files:
  created:
    - scripts/check-orphan-spells.tests.ps1
  modified:
    - v11-character-editor.jsx

key-decisions:
  - "useResolvableKeys(spellVersion) takes the existing spellVersion counter as a parameter instead of re-listening to hifi-spells-source-changed itself — reuses the effect wiring CharacterEditor already has, one fewer window listener"
  - "Orphan rows reuse the resolved-list's exact visual structure (level bar, Texturina name, subinfo line, HifiBookmarkIcon/star toggle) rather than a new component, so the affordance is visually identical minus the dimmed (opacity 0.65) text block"
  - "hifiOrphanFromKey never throws and never returns null by construction (no branch returns null) — a malformed key degrades to itself, truncated to 64 chars, rather than disappearing from render (T-06-03-03)"

requirements-completed: [MIGR-01]

coverage:
  - id: D1
    description: "hifiOrphanFromKey(key) parses a hifiSpellKey()-shaped string into {key, school, lvl, title} using the first two hyphens only (so multi-hyphen slugs like melf-s-acid-arrow survive intact), degrading school/lvl to null and title to a 64-char-capped fallback on any unexpected shape"
    requirement: "MIGR-01"
    verification:
      - kind: unit
        ref: "scripts/check-orphan-spells.tests.ps1 (Node runtime proof: acid-splash, melf-s-acid-arrow internal-hyphen slug, null-3-foo WR-05 null school, no-hyphen key, 300-char truncation, never-null on null/undefined/empty)"
        status: pass
    human_judgment: false
  - id: D2
    description: "useResolvableKeys()/orphanSpells: prepared and bookmarked tabs each derive their own orphan list (keys present in that tab's Set but absent from window.resolvableSpellKeys()), returning [] whenever the resolvable index is indeterminate (null) instead of ever declaring a spell lost"
    requirement: "MIGR-01"
    verification:
      - kind: unit
        ref: "scripts/check-orphan-spells.tests.ps1 structural assertions (orphanSpells.length > 0 gate, hifiOrphanFromKey present)"
        status: pass
    human_judgment: true
    rationale: "No browser/runtime harness exists to exercise the real React render + resolvableSpellKeys() async lifecycle end-to-end (requires an actual DOM/fetch environment); the manual verification scenario in 06-03-PLAN.md's <verification> block (forge a bookmark key that doesn't exist in any pack, confirm it appears in a separate counted section, confirm it migrates back on pack install) is the natural human check."
  - id: D3
    description: "Orphan section renders at the end of the prepared/bookmarked tab list, with a concrete count heading (singular/plural), an explanatory line, one row per orphan (level bar + title + school/level derived only from the key, no pack data), and the same individual toggle affordance as the resolved list — no bulk-clear action (D-12), title always rendered as a React text child (never dangerouslySetInnerHTML), no direct localStorage write in the render region (only the pre-existing setPrepared/toggleBookmark)"
    requirement: "MIGR-01"
    verification:
      - kind: unit
        ref: "scripts/check-orphan-spells.tests.ps1 (region-scoped assertions: no dangerouslySetInnerHTML, no setItem/removeItem, no bulk-action label)"
        status: pass
      - kind: manual_procedural
        ref: "06-03-PLAN.md acceptance criteria — manual verification at 390x844 in both themes with a forged hifi_bookmarks_v1 key"
        status: unknown
    human_judgment: true
    rationale: "Visual/theme verification (390x844, light/dark) and the localStorage-only-changes-on-toggle assertion require a real browser session; no frontend test runner exists in this project (confirmed in .planning/codebase/TESTING.md)."

# Metrics
duration: ~25min
completed: 2026-09-03
status: complete
---

# Phase 06 Plan 03: Orphaned prepared/bookmarked spells Summary

**Prepared and bookmarked spell keys that stop resolving after a pack removal get their own counted, explained, never-destructive section at the end of the `prepared`/`bookmarked` tabs in the character editor — signal, never discard.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-09-03T00:50:52Z
- **Tasks:** 2
- **Files modified:** 1 (v11-character-editor.jsx)
- **Files created:** 1 (scripts/check-orphan-spells.tests.ps1)

## Accomplishments

- `hifiOrphanFromKey(key)`: a pure, never-null parser that desmounts a `hifiSpellKey()` string (`${school}-${lvl}-${en}`) using only the first two hyphens, so a multi-hyphen slug like `melf-s-acid-arrow` keeps its internal hyphens (`Melf S Acid Arrow`); a `null` school (from the WR-05 unknown-school case) or an unexpected key shape degrades gracefully to a readable, 64-char-capped title instead of vanishing.
- `useResolvableKeys(spellVersion)`: a hook wrapping `window.resolvableSpellKeys()` with the same `cancelled`-guard pattern as `packSpellIndex()` in `v10-hifi.jsx` — starts at `null` (indeterminate), reacts to the existing `spellVersion` counter plus its own `hifi-plugins-changed` listener, and a fetch failure lands back on `null`, never on an empty `Set` (which would falsely declare every prepared spell orphaned).
- `orphanSpells`: a memoized, per-tab derivation (`prepared`/`bookmarked` only — `all` and the indeterminate state both yield `[]`) disjoint from `filteredSpells`, which was not touched.
- A rendered orphan section at the end of the tab's spell list: count heading (singular/plural), a calm explanatory line ("still saved, comes back on its own"), one row per orphan with level bar/school/level derived purely from the key, and the exact same individual toggle (star / prepare icon) as the resolved list — no bulk-clear action, title always a React text child.
- `scripts/check-orphan-spells.tests.ps1`: new gate collected automatically by `run-tests.ps1`, combining structural assertions (section gated on `orphanSpells.length > 0`, no `dangerouslySetInnerHTML`, no `setItem`/`removeItem`, no bulk-action label in the render region) with a real Node runtime proof of `hifiOrphanFromKey` covering all 5 cases named in the plan plus a never-null check on `null`/`undefined`/`''`.

## Task Commits

Both tasks were committed atomically:

1. **Task 1: Parser de chave órfã e derivação das órfãs por aba** - `c5137f6` (feat)
2. **Task 2: Seção de órfãs no render das abas prepared e bookmarked** - `a0d9425` (feat)

_No plan-metadata commit is created by this worktree agent — the orchestrator commits this SUMMARY.md and shared docs after the wave completes._

## Files Created/Modified

- `v11-character-editor.jsx` - `hifiOrphanFromKey()` + `useResolvableKeys()` module-level functions, `orphanSpells` memo inside `CharacterEditor`, the orphan-section JSX block appended to the spell-list container, `hifiOrphanFromKey` added to the footer `Object.assign(window, {...})`
- `scripts/check-orphan-spells.tests.ps1` - new gate: structural region assertions + Node runtime proof of `hifiOrphanFromKey`

## Decisions Made

- `useResolvableKeys(spellVersion)` takes `CharacterEditor`'s existing `spellVersion` state as a parameter rather than adding its own `hifi-spells-source-changed` listener — one fewer duplicate listener, same invalidation semantics.
- Orphan rows are visually identical to resolved rows (same level bar, name typography, subinfo line, same `HifiBookmarkIcon`/star icon) with only the text block dimmed to `opacity: 0.65` — the plan asked for the affordance to be "idêntica", so only unavailable-content signaling (not the toggle) is muted.
- Kept `hifiOrphanFromKey`'s "no valid key shape" fallback narrow: only "fewer than two hyphens" triggers the whole-string fallback; a school or level segment that fails its own number check falls back to `null` independently, so `null-3-foo` still yields a real `lvl: 3` even though `school` is `null` — exactly the WR-05 case the plan calls out.

## Deviations from Plan

None - plan executed exactly as written. Both `<read_first>` regions matched the actual file (line numbers had drifted slightly since 06-01/06-02 landed, but the described code shapes — `filteredSpells` memo, `hifiSpellKey`, `SCHOOL_KEYS`/`schoolKey`, `resolvableSpellKeys()`, the `packSpellIndex()` cancelled-effect pattern, `pack-manager.jsx`'s defensive `.slice(0, 64)` — were all found as described and reused verbatim).

## Issues Encountered

- `pwsh` is blocked as a direct invocation in this sandboxed worktree (consistent with 06-01's note) — verification used `npm test` throughout, which spawns `pwsh` through npm's child-process layer and is unaffected.

## Next Phase Readiness

- `hifiOrphanFromKey` and `orphanSpells` are exercised by an automated gate and structurally proven; the one open item (D3's manual browser/theme verification) is exactly the kind of check 06-03-PLAN.md's own `<verification>` block defers to a human pass, not a gap introduced by this plan.
- 06-04 (transition banner) can read the same `window.resolvableSpellKeys()` this plan already consumes for its own orphan-count signal, with no further loader changes needed.
- No blockers.

## Self-Check: PASSED

All created/modified files and both commit hashes referenced above were verified present on disk and in `git log` after commit (`c5137f6`, `a0d9425`); `npm test` ran the full suite green after each task, including the two new gate assertions and the pre-existing 30+ gates.

---
*Phase: 06-decommissioning-migration*
*Completed: 2026-09-03*
