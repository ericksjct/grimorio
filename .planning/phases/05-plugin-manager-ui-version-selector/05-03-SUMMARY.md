---
phase: 05-plugin-manager-ui-version-selector
plan: 03
subsystem: ui
tags: [react, i18n, pack-manager, spell-index, indexeddb]

# Dependency graph
requires:
  - phase: 05-plugin-manager-ui-version-selector
    provides: "05-01: PackManager modal, PackManagerRow model (_installedRows/_builtinRows), window.getVersionMeta"
  - phase: 04-loader-source-dispatch
    provides: "window.loadSpellVersion()/refreshPluginVersions()/hifi-plugins-changed live registry sync"
  - phase: 02-plugin-storage-foundation
    provides: "plugin-store.jsx deletePack(id)"
provides:
  - "window.packSpellIndex() — memoized byName/byKey spell index covering installed packs + SRD builtins, invalidated on hifi-plugins-changed"
  - "Aggregate duplicate-count line per pack row (D-10), informative only"
  - "Inline remove confirmation (Remover?/Sim/Não) with concrete prepared/bookmarked impact, never a second overlay (D-05/D-06)"
  - "scripts/check-pack-manager.tests.ps1 extended with removal/duplicate/P-01 gates"
affects: ["05-04"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Row model carries both `id` (pluginStore id, used for deletePack) and `versionKey` (SPELL_VERSIONS key 'plugin-'+id, used for the spell index) as separate fields — the two never share a value for installed packs"
    - "Single confirmingId state (not per-row) enforces D-05's 'only one row in confirmation at a time' without extra bookkeeping"

key-files:
  created: []
  modified:
    - pack-manager.jsx
    - i18n.jsx
    - scripts/check-pack-manager.tests.ps1

key-decisions:
  - "byName and byKey are Map instances, never object literals — a pack-supplied spell name of 'constructor' or '__proto__' cannot reach an inherited property (T-05-05), matching the Object.create(null) convention already used in spells-data-loader.jsx"
  - "SRD 5.1 vs SRD 5.2 never count as duplicates of each other (A-05) — only a pair where BOTH entries are corpus:'srd' is excluded; a pack vs SRD pair counts normally"
  - "The duplicate-count line renders symmetrically on any row (installed or builtin) that has a match elsewhere, not only on the installed pack's row — nothing in the plan's must_haves forbids this and it is the simplest reading of D-10 applied per-row"

patterns-established:
  - "_removalImpact(versionKey, index) is a pure function reading only window.loadCharacters()/loadBookmarks() — a 'stale' key is one where the index's only source is the version being removed (length===1 match)"

requirements-completed: [MGMT-02, MGMT-04]

coverage:
  - id: D1
    description: "packSpellIndex() builds a byName/byKey Map index covering installed packs and the two SRD builtins, short-circuiting to empty maps (no loadSpellVersion calls) when no source:'idb' version exists"
    requirement: MGMT-04
    verification:
      - kind: other
        ref: "scripts/check-pack-manager.tests.ps1 (blocks 11-13: index structure, A-05 same-work rule, cost short-circuit)"
        status: pass
    human_judgment: true
    rationale: "No frontend test runner exists in this project; the script proves the static wiring/guards but actual browser behavior (await window.packSpellIndex() resolving with correct byName.size, no network request for SRD JSONs with zero packs) needs a manual browser pass."
  - id: D2
    description: "Each pack row (installed or builtin) shows an aggregate 'N spells also present in other packs' line when N>0, never enumerating the spells, computed from packSpellIndex() and the A-05 same-work rule"
    requirement: MGMT-04
    verification:
      - kind: other
        ref: "scripts/check-pack-manager.tests.ps1 (block 11: hifiSpellKey reuse, no redefinition; block 12: A-05 corpus check)"
        status: pass
    human_judgment: true
    rationale: "Aggregate counting logic (_computeDupCounts) needs a browser check with a real installed pack sharing names with SRD to confirm the on-screen count and that zero-pack/builtin-only states show no duplicate line."
  - id: D3
    description: "Clicking Remove on an installed pack's row swaps the button for an inline 'Remover?/Sim/Não' confirmation in the same row (no second overlay), showing concrete prepared/bookmarked impact derived at render time"
    requirement: MGMT-02
    verification:
      - kind: other
        ref: "scripts/check-pack-manager.tests.ps1 (block 16: exactly one role=\"dialog\"; block 14: removal wiring present)"
        status: pass
    human_judgment: true
    rationale: "Inline confirm-in-row UI interaction (click Remove -> see Sim/Não + impact -> click Não closes, click Sim removes) needs a live browser click-through; no automated UI test runner exists in this project."
  - id: D4
    description: "Confirming removal calls pluginStore.deletePack(id), fires a success hifi-toast, and calls refreshPluginVersions() without awaiting it; never writes to localStorage/persistCharacters/persistBookmarks/togglePreparedFor/toggleBookmarkedFor (P-01/D-07)"
    requirement: MGMT-02
    verification:
      - kind: other
        ref: "scripts/check-pack-manager.tests.ps1 (block 15: P-01 negative assertion, proven to have teeth via temporary 'const x = localStorage;' break/restore cycle)"
        status: pass
    human_judgment: true
    rationale: "The byte-for-byte localStorage equality check before/after removal (hifi_chars_v1, hifi_bookmarks_v1) and the reinstall-restores-prepared-spells cycle both require a live browser session with IndexedDB and localStorage."
  - id: D5
    description: "If deletePack rejects, an error toast appears and the row stays in the list; removing the currently-active version triggers the loader's existing fallback-with-toast, never a new silent-switch path"
    verification: []
    human_judgment: true
    rationale: "Both the rejection path and the active-version-removed fallback require simulating an IndexedDB failure and an active-pack removal in a live browser session — no automated harness exists for either."

duration: ~7min
completed: 2026-08-30
status: complete
---

# Phase 5 Plan 03: Pack Manager Spell Index & Removal Summary

**`window.packSpellIndex()` memoized Map-based spell index (MGMT-04) plus inline row-level pack removal with concrete prepared/bookmarked impact and zero writes to character data (MGMT-02).**

## Performance

- **Duration:** ~7 min
- **Completed:** 2026-08-30T22:32:22Z
- **Tasks:** 4/4
- **Files modified:** 3

## Accomplishments

- `packSpellIndex()` builds `byName`/`byKey` `Map` indexes over installed packs plus the two SRD builtins, short-circuiting to empty maps with zero `loadSpellVersion` calls when no `source:'idb'` version exists — the default zero-pack user pays no parse cost for the SRD JSONs.
- Duplicate identity for `byName` is exact-lowercase-string equality on `spell.en` (no Unicode normalization); `byKey` reuses `window.hifiSpellKey` from `v10-hifi.jsx` instead of redefining the `${school}-${lvl}-${en}` formula.
- SRD 5.1 and SRD 5.2 never count as duplicates of each other (A-05, `_countsAsDuplicate`) — only pairs where both sides are `corpus:'srd'` are excluded; a pack vs SRD pair counts normally, and the count renders on any row (installed or builtin) that has a cross-source match, as an informative-only line (D-11/P-04: never affects ordering, never disables anything, never changes which source is active).
- Removing an installed pack is a two-step, single-row action (D-05): the Remove button swaps in place for "Remover?" + Sim/Não, with a `_removalImpact()`-derived line showing exactly how many prepared spells (across how many characters) and bookmarks would stop resolving — computed fresh at render time from `window.loadCharacters()`/`window.loadBookmarks()`, never persisted.
- Confirming calls `pluginStore.deletePack(id)`, dispatches a success `hifi-toast`, then fire-and-forgets `refreshPluginVersions()` (same pattern as `pack-import-dialog.jsx`); on rejection, an error toast appears and the row stays. The module never touches `localStorage`, `persistCharacters`, `persistBookmarks`, `togglePreparedFor`, or `toggleBookmarkedFor` — proven by a negative grep gate with a temporary break/restore cycle.
- `scripts/check-pack-manager.tests.ps1` gained 8 new gate blocks (index structure, A-05 rule, cost short-circuit, removal wiring, P-01 prohibition, single-overlay count, i18n parity for the 10 new keys, and a tone check against "perder"/"lose"/"lost").

## Task Commits

Each task was committed atomically:

1. **Task 1: Chaves i18n de remoção e duplicata** - `70da5fa` (feat)
2. **Task 2: Índice de magias e contagem agregada de duplicatas** - `72b84b6` (feat)
3. **Task 3: Remoção com confirmação inline e impacto concreto** - `b204ae1` (feat)
4. **Task 4: Estender scripts/check-pack-manager.tests.ps1 com remoção e duplicata** - `e221a2e` (test)

Plus one in-scope follow-up fix surfaced while reviewing Task 3's own code before commit:

5. **Fix: clear stale removal-impact numbers on confirmation target change** - `4e2cc78` (fix)

**Plan metadata:** committed alongside this SUMMARY (see final commit).

## Files Created/Modified

- `pack-manager.jsx` - Added `_countsAsDuplicate`, `_buildSpellIndex`/`packSpellIndex` (memoized, module-level, invalidated on `hifi-plugins-changed`), `_computeDupCounts`, `_removalImpact`; extended `_installedRows`/`_builtinRows` with a `versionKey` field distinct from `id`; extended `PackManagerRow` with the duplicate-count line and inline remove/confirm UI; extended `PackManager` with `dupCounts`/`confirmingId`/`impact` state and the remove handlers.
- `i18n.jsx` - 10 new `manager.*` keys in both `ptbr`/`en` blocks (remove/removeConfirm/yes/no/impactPrepared/impactBookmarked/impactNone/removed/removeFailed/duplicates).
- `scripts/check-pack-manager.tests.ps1` - 8 new gate blocks (11-18) covering the index, A-05, cost short-circuit, removal wiring, P-01, single-overlay, i18n parity, and message tone.

## Decisions Made

- Introduced a `versionKey` field on row objects, separate from `id`: `id` is the pluginStore id (what `deletePack` takes), `versionKey` is the `SPELL_VERSIONS` key (`'plugin-' + id` for installed packs, identical to `id` for builtins). These two diverge for installed packs and conflating them would have made `dupCounts`/`_removalImpact` silently look up the wrong key.
- The duplicate-count line is symmetric — it renders on whichever row (pack or builtin) has a cross-source match, not only on the "newer" installed pack. Nothing in the plan's must_haves restricts this to one side, and per-row symmetric counting is the plainest reading of "the pack item shows the aggregate count."
- `impact` is a single piece of `PackManager` state (not keyed per row) because D-05 already guarantees only one row can be in confirmation at a time — a per-row impact map would have been unused complexity.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Cleared stale removal-impact numbers when the confirmation target changes**
- **Found during:** Task 3, self-review before commit (not surfaced by the plan's own automated verify command, which only greps static structure)
- **Issue:** The impact-calculation effect only called `setImpact(null)` when `confirmingId` became falsy; switching the confirmation directly from pack A to pack B (without closing in between) would briefly render pack A's stale prepared/bookmarked counts on pack B's row until the new async calculation resolved.
- **Fix:** Moved `setImpact(null)` to run unconditionally at the top of the effect, before the early returns, so any confirmation-target change clears stale numbers immediately.
- **Files modified:** `pack-manager.jsx`
- **Verification:** `pwsh scripts/run-tests.ps1` exits 0 with all scripts passing after the change.
- **Committed in:** `4e2cc78`

---

**Total deviations:** 1 auto-fixed (Rule 1 bug fix)
**Impact on plan:** No scope creep — a correctness fix to code written in this same plan, caught during required self-review, not a new feature.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `window.packSpellIndex()` and `window.pluginStore.deletePack` are both wired and reachable; plan 05-04 (if it exists) can build on either without rework.
- **Pending manual browser verification** (per this plan's `<verification>` section — no automated frontend test runner exists in this project, consistent with all prior phases):
  - Zero packs installed: `await window.packSpellIndex()` resolves with `byName.size === 0`/`byKey.size === 0`, and the Network tab shows no request for `srd-2024-en.json`/`srd-2014-en.json` triggered by that call.
  - Install a pack sharing at least one spell name with SRD 5.2: `(await window.packSpellIndex()).byName.get('<name>')` returns an array with two elements, and that pack's row in the manager shows the aggregate duplicate count.
  - With a pack installed and at least one of its spells prepared on a character: open the manager, click Remove on that pack's row -> confirms inline with Sim/Não and a nonzero impact count, no second overlay; note `localStorage.getItem('hifi_chars_v1')`/`hifi_bookmarks_v1'`; click Sim -> success toast, row disappears without page reload, the two localStorage strings stay byte-identical, and the prepared spell disappears from the active list without a console exception; reinstall the same pack via the manager's import button -> the spell resolves as prepared again with no extra user action.
  - Remove the pack that was selected in the version selector -> the loader's existing version-switched-away toast fires (no new/silent switch).
