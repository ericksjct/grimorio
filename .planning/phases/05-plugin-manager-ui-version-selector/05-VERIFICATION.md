---
phase: 05-plugin-manager-ui-version-selector
verified: 2026-08-31T02:43:36Z
status: passed
score: 6/6 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 5: Plugin Manager UI & Version Selector Verification Report

**Phase Goal:** Users can see and manage everything they've installed in one place, the version
selector reflects reality instead of a fixed list, and the built-in SRD content carries correct
legal attribution.
**Verified:** 2026-08-31T02:43:36Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can see a list of installed packs with name, version, spell count, and source (MGMT-01) | ✓ VERIFIED | `_installedRows`/`PackManagerRow` in `pack-manager.jsx` render `pluginStore.listPacks()` results (name/version/spellCount/origin badge). Static gates §1–3, §6 confirm structure + reactive re-render on `hifi-plugins-changed`. Runtime: checkpoint item 3, 7/7 assertions, real import produced a row with correct name/version/spell count/"instalado" badge (05-05-SUMMARY.md). |
| 2 | User can remove an installed pack; prepared/bookmarked spells referencing it disappear without crashing, and come back if reinstalled (MGMT-02) | ✓ VERIFIED | This is a state-transition/cleanup truth — presence of code is not sufficient. Behavioral evidence: checkpoint item 7 (20/20 assertions) drove a real prepare→remove→reinstall cycle through the actual UI (card ribbon + detail bookmark button), captured `hifi_chars_v1`/`hifi_bookmarks_v1` before removal, confirmed them **byte-identical** after removal (P-01/D-07 held at runtime, not just in source shape), confirmed prepared spells vanish from the active list with no console exception, and confirmed all three prepared spells + the bookmark return with `aria-pressed="true"` on reinstall with zero extra user action. This directly targeted the two Critical defects (CR-01/CR-02, see below) that would otherwise have made the impact numbers and stale-key resolution wrong. |
| 3 | The version selector enumerates whatever packs actually exist in storage, growing/shrinking with install/removal, not a fixed list of 4 (MGMT-03) | ✓ VERIFIED | `VersionSelector` (spells-data-loader.jsx:589) reads `SPELL_VERSIONS`/`versions` prop populated by `refreshPluginVersions()` (Phase 4), not a hardcoded array; `if (!currentVer) return null` guard (D-19) confirmed present at line 594-595, gate §7/§20. "Gerenciar pacotes…" item wired to `window.__openPackManager` on both desktop dropdown branches (lines 653/715) and the mobile drawer VERSÃO row (v10-hifi.jsx:2608). Runtime: checkpoint item 4, 12/12 assertions across desktop dropdown and 390×844 drawer. |
| 4 | When two installed packs share a spell, the UI shows an informative note instead of blocking install or silently merging (MGMT-04) | ✓ VERIFIED | `packSpellIndex()`/`_computeDupCounts()`/`_removalImpact()` in `pack-manager.jsx` build the cross-pack index; "Também em:" note wired in `v10-hifi.jsx:1088` reading the same index. A code review found two Critical defects here (CR-01: index silently dropped the 4 PHB builtins from resolution, causing wrong removal-impact and undercounted duplicates; CR-02: `byKey`/`byName` stored arrays instead of Sets, letting a pack listing a spell twice defeat the single-source test) — **both were fixed in commit `918809f`** and pinned with new static gates §27/§28, confirmed present in the current source (`_indexPopulation()` splits `resolution`/`display`; `byName`/`byKey` now use `Set`, `staleKey` tests `size === 1 && has(versionKey)`). No badge in grid/mobile list confirmed by gate §25. Runtime: checkpoint item 6, 8/8 assertions, plus A-05 (SRD 5.1≠5.2 not counted as mutual duplicate) independently confirmed at runtime. |
| 5 | With zero packs installed, the empty state explains what a pack is and links directly to import (MGMT-05) | ✓ VERIFIED | Empty-state branch confirmed in `pack-manager.jsx` (gate §6); floating provisional import trigger (`PackImportRoot`) fully removed from `pack-import-dialog.jsx` and `index.html` (grep confirms zero references) — import is now reachable only through the manager, per D-03. Runtime: checkpoint item 1, 8/8 assertions — empty state showed explanation + primary import CTA + docs link, SRD builtin rows still listed (zero packs = zero *user* packs, never zero versions), spell grid behind the modal remained usable. |
| 6 | The app displays verbatim CC-BY attribution matching the exact SRD edition bundled (5.1 or 5.2), including modification notes (SRD-02) | ✓ VERIFIED | `getVersionMeta()`/`_metaCache` in `spells-data-loader.jsx` (lines 372, 476, 509-510) feed `_builtinRows`' `<details>`/`<summary>` disclosure in `pack-manager.jsx`, rendered as a plain React text child (`whiteSpace: 'pre-wrap'`, no truncation) — confirmed by code review and gates §4/§5 (5.1 and 5.2 load textually distinct license bodies). Runtime: checkpoint item 2, 12/12 assertions — SRD 5.1 and 5.2 attribution texts differ, each cites its own edition, rendered as plain text (no bold/markdown), modification note present below, nothing truncated. |

**Score:** 6/6 truths verified (0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `pack-manager.jsx` | `PackManager`, `PackManagerRoot`, `packSpellIndex`, `_removalImpact`, `_indexPopulation`, globals on `window` | ✓ VERIFIED | All symbols present; `window.PackManager`/`PackManagerRoot`/`__openPackManager`/`packSpellIndex` confirmed via `Object.assign(window` pattern and grep. |
| `spells-data-loader.jsx` | `window.getVersionMeta(key)`, `_metaCache`, `VersionSelector` empty-list guard, "Gerenciar pacotes…" item | ✓ VERIFIED | `getVersionMeta` (line 509), `_metaCache` (line 372), guard `if (!currentVer) return null` (line 594), menu item wired to `__openPackManager` (lines 653, 715). |
| `i18n.jsx` | `manager.*`, `version.manage`, `spell.alsoIn` keys in both language blocks | ✓ VERIFIED | `i18nParityCheck()` function present; gate §9/§17/§26 assert exact key-count parity (2 occurrences each). `pwsh scripts/run-tests.ps1` passes, which exercises these gates. |
| `index.html` | `<script src="pack-manager.jsx">` tag + `<PackManagerRoot>` mount, `PackImportRoot` removed | ✓ VERIFIED | Line 131 (script tag), line 568 (`<PackManagerRoot lang={uiLang} dark={dark} theme={theme} />`); zero `PackImportRoot` references remain. |
| `sw.js` | `./pack-manager.jsx` in PRECACHE, `CACHE_VERSION` unchanged | ✓ VERIFIED | Line 31 confirms PRECACHE entry; gate §"Import pipeline is wired, pinned and precached" / wiring script passes. |
| `v10-hifi.jsx` | "Gerenciar pacotes" drawer row, "Também em:" duplicate note, no new raw-HTML sink | ✓ VERIFIED | Line 2608/2611 (drawer trigger), line 1088 (`spell.alsoIn` note fed by `packSpellIndex()` at line 1026-1030). Gate §24 pins the raw-HTML sink count at 5 (unchanged). |
| `scripts/check-pack-manager.tests.ps1` | Static gates covering structure, storage contract, CC-BY, empty state, index, removal, triggers, CR-01/CR-02 pins | ✓ VERIFIED | 28 numbered gate sections (§1-§28) confirmed present, including §27/§28 added specifically to pin the CR-01/CR-02 fixes. |
| `.planning/todos/completed/mobile-botao-instalar-cobre-drawer.md` | Folded todo closed with D-03 resolution note | ✓ VERIFIED | File exists in `completed/`, absent from `pending/`; content cites D-03 and 390×844 confirmation (per 05-05-SUMMARY.md and file listing). |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `PackManager` | `window.pluginStore.listPacks()` | sole source of installed-pack list | ✓ WIRED | Gate §2 confirms `listPacks` present and `putPack` absent (read-only surface per 05-01 scope). |
| `PackManagerRoot` | `window.__openPackManager` | contract consumed by VersionSelector + mobile drawer | ✓ WIRED | Confirmed both consumers call `window.__openPackManager?.()`. |
| `hifi-plugins-changed` event | `PackManager` re-render + index invalidation | reactive refresh, no stale local copy | ✓ WIRED | Gate §3 confirms subscription + `removeEventListener` cleanup; `_indexPromise = null` on event confirmed in `pack-manager.jsx`. |
| `PackManager` remove button | `pluginStore.deletePack(id)` → `window.refreshPluginVersions()` | removal + version-registry refresh | ✓ WIRED | Confirmed via code review and runtime checkpoint item 7 (toast + list update without page reload). |
| detail view "Também em:" | `window.packSpellIndex()` | same index feeds both the manager's duplicate count and the detail note | ✓ WIRED | `v10-hifi.jsx:1026-1030` calls `packSpellIndex()` directly. |
| `VersionSelector` / mobile drawer | `window.__openPackManager` | discoverability of the manager from both platforms | ✓ WIRED | Confirmed at lines 653/715 (desktop) and 2608 (mobile); runtime checkpoint item 4. |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|-----------------|--------------|--------|----------|
| MGMT-01 | 05-01 | Installed-pack list with name/version/count/source | ✓ SATISFIED | Truth #1 above. |
| MGMT-02 | 05-03 | Remove pack; prepared/bookmarked degrade gracefully, restore on reinstall | ✓ SATISFIED | Truth #2 above (runtime-proven). |
| MGMT-03 | 05-04 | Dynamic version selector, no fixed 4-item list | ✓ SATISFIED | Truth #3 above. |
| MGMT-04 | 05-03, 05-04 | Duplicate-spell informative note, never blocking | ✓ SATISFIED | Truth #4 above (post CR-01/CR-02 fix). |
| MGMT-05 | 05-01, 05-02 | Empty state explains + links to import | ✓ SATISFIED | Truth #5 above. |
| SRD-02 | 05-01 | Verbatim CC-BY attribution per edition | ✓ SATISFIED | Truth #6 above. |

**Note:** `.planning/REQUIREMENTS.md`'s checkbox/status table still shows MGMT-01, MGMT-02,
MGMT-05, and SRD-02 as `Pending` (only MGMT-03/MGMT-04 marked `Complete`). This is a stale
tracking artifact, not a codebase gap — the table is conventionally synced at phase-completion
time, which has not yet run for Phase 5. Flagged here so it gets updated alongside this
verification, not treated as a functional deficiency.

### Prohibitions (must_haves.prohibitions, judgment-tier)

| ID | Statement | Status | Evidence |
|----|-----------|--------|----------|
| P-01 (D-07) | No code in this phase writes to prepared/bookmarked lists or `hifi_bookmarks_v1` | ✓ Resolved, runtime-verified — **with one documented latent risk** | Checkpoint item 7 confirmed `hifi_chars_v1`/`hifi_bookmarks_v1` byte-identical before/after removal. However, the code review (WR-01) found `_removalImpact` calls `window.loadBookmarks()`, which has a one-time migration branch that *does* write `hifi_bookmarks_v1` if the key doesn't exist yet — the invariant currently holds only because `useBookmarks()` already ran that migration at boot, not because `pack-manager.jsx` is provably read-only. This was NOT fixed (only the code comment was corrected to state the caveat honestly). See Anti-Patterns/Warnings below. |
| P-02 | No silent version switch as a side effect | ✓ Resolved, runtime-verified | Checkpoint item 7: a second toast explicitly announces the fallback switch when removal drops the active version. |
| P-03 (D-14) | Attribution is verbatim text, never markdown/HTML, never truncated, never paired with the wrong edition | ✓ Resolved, runtime-verified | Checkpoint item 2 + code review (plain text child, `pre-wrap`, no truncation). |
| P-04 (D-11) | Duplicate info is informative only — never blocks install, merge, or reorders active source | ✓ Resolved | Code review confirms no gating logic tied to duplicate count; checkpoint item 6 confirms install proceeded normally. |
| P-05 (D-17) | Empty state informs, never pressures; never invades the grid | ✓ Resolved, runtime-verified | Checkpoint item 1. |

### Anti-Patterns Found

No debt markers (`TBD`/`FIXME`/`XXX`) or `TODO`/`HACK`/placeholder patterns found in any file
touched by this phase (`pack-manager.jsx`, `index.html`, `sw.js`, `spells-data-loader.jsx`,
`v10-hifi.jsx`, `pack-import-dialog.jsx`, `i18n.jsx`).

An independent code review (`05-REVIEW.md`) found 2 Critical defects, both fixed and pinned with
new static gates before this verification ran (see Truth #4/#2 evidence above: CR-01, CR-02,
commits `918809f` + `1acae8e`). 5 Warning and 4 Info findings remain open by the reviewer's own
disposition ("remaining Warning/Info findings untouched"). None of them contradict a verified
truth above — they are edge cases outside the paths the checkpoint exercised:

| Finding | Severity | Impact | Blocks a truth? |
|---------|----------|--------|------------------|
| WR-01 | Warning | P-01/D-07's "never writes" guarantee depends on `useBookmarks()` having already run its one-time localStorage migration at boot — an external fact, not a local invariant of `pack-manager.jsx`. Static gate can't see the indirect `window.*` call. | No — verified true today at runtime, but fragile to future boot-order changes. |
| WR-02 | Warning | "Sim" (confirm-remove) is clickable before `_removalImpact` resolves on a cold/slow index load; a fast or unlucky click could remove a pack with the impact area showing nothing. | No — normal-speed use (as tested in checkpoint item 7) shows impact correctly before confirmation. |
| WR-03 | Warning | Builtin/installed pack license fields render without the same type-coercion applied to name/version; a record written outside the current import funnel with non-string `license.attribution`/`modifications` could crash the whole UI (no error boundary). | No — current import funnel (`pack-import.jsx`) enforces string-typed license fields; not reachable via any shipped write path. |
| WR-04 | Warning | If a builtin SRD JSON fails to load, its attribution silently and permanently disappears from view instead of showing an explicit "unavailable" state. | No — normal load path (tested in checkpoint item 2) succeeds; only affects offline-before-precache/404 edge cases. |
| WR-05 | Warning | `_installedRows` doesn't apply the same `source`-must-be-non-empty-string filter that `refreshPluginVersions()` applies, so a malformed record (unreachable via the current import funnel) would render an undeletable, unidentifiable row. | No — current write path guarantees a valid `source`. |
| IN-01..04 | Info | Untruncated toast name interpolation; a plain-object lookup table inconsistent with the phase's prototype-less-lookup pattern; "Também em:" note doesn't live-refresh while a spell detail is open during a pack change; and a minor UX inconsistency between the two manager-open triggers. | No. |

Also noted in `05-05-SUMMARY.md` (non-blocking, outside ROADMAP scope): the pack-removed→
fallback toast is not translated when the UI is in pt-br; `manager.duplicates`/`manager.impact*`
lack pluralization; and English spell names show the raw slug rather than the display name (this
last one predates Phase 5 and touches neither function this phase modified).

### Behavioral Spot-Checks / Probe Execution

No conventional `scripts/*/tests/probe-*.sh` exist in this repo, and none are declared in any
Phase 5 PLAN/SUMMARY. This project has no frontend test runner — every `scripts/*.tests.ps1` file
is a static source-text assertion, confirmed by running the full suite once:

```
pwsh scripts/run-tests.ps1
→ "Pack manager surface is wired, attributed and parity-checked." (and 32 other scripts)
→ "All test scripts passed."
```

This proves code shape only. The actual runtime behavior for all 6 ROADMAP truths — the thing
the static gates structurally cannot prove — was exercised in Phase 5's own blocking human
checkpoint (Plan 05-05, `autonomous: false`), driven mechanically via Playwright/Chromium against
a locally served build at the user's explicit request, and approved by the user: **81/81
assertions passing** across all 8 checkpoint items (see item-by-item table under Truth #1-#6
above and in `05-05-SUMMARY.md`). This verifier did not re-execute that Playwright suite (per
instruction — the scripts live outside the repo, in a session scratchpad) but did independently
re-run the static suite and independently re-inspect the fixed source for CR-01/CR-02, confirming
the review's fix claims against actual `pack-manager.jsx` content rather than trusting the
review's or SUMMARY's prose alone.

### Human Verification Required

None. The phase's designated blocking human checkpoint (Plan 05-05) already covered all 6 ROADMAP
success criteria at runtime and was approved by the developer on 2026-08-30/31, including the two
hardest-to-fake checks: byte-identical `hifi_chars_v1`/`hifi_bookmarks_v1` before/after removal
(MGMT-02/P-01), and side-by-side verbatim comparison of the SRD 5.1 vs 5.2 attribution text
(SRD-02/P-03). No new must-have introduced since that checkpoint requires a fresh human pass.

### Gaps Summary

No gaps block the phase goal. Both Critical defects a code review found in the shared spell index
(CR-01, CR-02 — which specifically undermined MGMT-02's removal-impact accuracy and MGMT-04's
duplicate-count accuracy) were fixed in commit `918809f` and pinned with two new static gates
(§27, §28) before this verification, and independently re-confirmed present in the current
`pack-manager.jsx` source by this verifier (not merely trusted from the review's prose). All 6
ROADMAP success criteria have both static (code-shape) and runtime (Playwright checkpoint,
human-approved) evidence. 5 Warning + 4 Info findings remain open in `05-REVIEW.md`; they describe
real edge-case defects worth fixing but none are reachable via the app's current write paths or
contradict a verified truth — recommended as follow-up cleanup, not phase-blocking.

---

_Verified: 2026-08-31T02:43:36Z_
_Verifier: Claude (gsd-verifier)_
