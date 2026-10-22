---
phase: 06-decommissioning-migration
verified: 2026-09-27T00:00:00Z
status: passed
score: 4/4 must-haves verified
behavior_unverified: 0
overrides_applied: 0
notes:
  - "Phase 7 (completed after Phase 6's code, before this verification) intentionally
     changed 2 of Phase 6's implementation details. These are NOT gaps — they are
     superseded-by-phase-7 and the underlying Phase 6 goal (datasets gone, nothing
     silently lost) still holds:
     (a) A third embedded SRD pack (srd-2024-ptbr.json) now exists; sw.js is
         grimorio-v4, not grimorio-v3. Truth in 06-05-PLAN ('BUILTIN_VERSIONS has
         exactly 2 entries') and the ROADMAP wording ('precache list contains only
         the SRD file') are read against the current intended state: 3 SRD packs,
         zero legacy JSONs. Verified: BUILTIN_VERSIONS has exactly 3 entries, all
         corpus:'srd'; PRECACHE lists exactly srd-2024-en.json, srd-2014-en.json,
         srd-2024-ptbr.json; zero legacy spells-5E-* entries anywhere.
     (b) LEGACY_VERSION_FALLBACK now sends spells-5E-2024-PTBR -> srd-2024-ptbr and
         spells-5E-2014-PTBR -> srd-2014-en (07-REVIEW-FIX WR-01), not the Phase-6-era
         2-pack mapping. Both still land on the SAME EDITION as before (D-04's
         invariant), so MIGR-01 criterion 1 is unaffected."
  - "srd-2014-en.json slugs (hunters-mark, see-invisibility, arcanists-magic-aura)
     were corrected in commit 67b5fc6 after Phase 6 shipped. Confirmed via 07-REVIEW-FIX
     addendum: no key migration was needed because these SRD packs were never on
     main with the broken slugs, so no user has prepared/bookmarked spells under
     them — this strengthens MIGR-01's 'nothing silently lost' guarantee rather
     than threatening it."
---

# Phase 6: Decommissioning & Migration Verification Report

**Phase Goal:** The four copyrighted spell datasets are fully removed from the live
site and repo HEAD, and every existing user's prepared/bookmarked spells transition
safely with nothing silently lost.

**Verified:** 2026-09-27
**Status:** passed
**Re-verification:** No — initial verification (no prior 06-VERIFICATION.md existed)

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | An existing user's prepared/bookmarked spells that still resolve work exactly as before after the update (MIGR-01) | VERIFIED | `spellName()`/markdown-conversion fixes confirmed live in `spells-data-loader.jsx`/`grimorio-helpers.jsx`; `LEGACY_VERSION_FALLBACK` (lines 85-90) maps all 4 legacy keys to a same-edition SRD target; 06-UAT test 1 confirms rendered Title Case names + clean prose descriptions; `check-migration-version-fallback.tests.ps1` and `check-srd-name-and-markdown.tests.ps1` pass in `npm test`. |
| 2 | An existing user's prepared/bookmarked spells that no longer resolve are flagged as unresolved, never silently dropped (MIGR-01) | VERIFIED | `hifiOrphanFromKey()` (v11-character-editor.jsx:516) + `orphanSpells` derivation (line 640) render a dedicated end-of-tab section (lines 1097-1130) with count, explanation, and per-key toggle only — no bulk-clear button, confirmed by direct read. 06-UAT test 2 confirms all 5 seeded orphans present, `hifi_chars_v1`/`hifi_bookmarks_v1` byte-identical before/after. `check-orphan-spells.tests.ps1` passes. |
| 3 | The 4 protected JSON files are gone from the deployed site and repo HEAD, and the precache list contains only the SRD file(s) (MIGR-02) | VERIFIED | `git ls-files \| grep spells-5E` returns nothing (confirmed live). Working tree has no `spells-5E-*.json` files. `sw.js` PRECACHE (lines 48-50) lists exactly `srd-2024-en.json`, `srd-2014-en.json`, `srd-2024-ptbr.json` — zero legacy entries. `CACHE_VERSION = 'grimorio-v4'`. `BUILTIN_VERSIONS` (spells-data-loader.jsx:32-36) has exactly 3 entries, all `corpus: 'srd'`. Single atomic commit `98740fe` performed the Phase 6 removal (`git log -- spells-5E-2024-PTBR.json` shows it only in history, never on a later commit). `check-decommission.tests.ps1` passes. The "2 SRD packs" / "grimorio-v3" wording in 06-05-PLAN's must_haves is superseded by Phase 7's addition of a 3rd embedded pack — the underlying criterion (zero legacy JSONs, precache is SRD-only) holds against the current 3-pack state. |
| 4 | An existing user's first visit after the update shows clear, actionable guidance on how to import their own pack (MIGR-03) | VERIFIED | `transition-banner.jsx`: `_hasExistingUserSignal()` (line 29) checks `__legacyVersionFallback`, `peekCharacters()`, `peekBookmarks()` — all pure reads, confirmed live. Banner is dismissible, non-modal, persists dismissal in `spellbook-ui-prefs.migrationNoticeDismissed` (no new localStorage key). 06-UAT test 4 confirms 3-part D-08 content + concrete orphan count; UAT test 6 confirms informal comprehension check passed after CTA-contrast fix (commit 45c6570). Gap closure plan 06-07 fixed a regression where `loadCharacters()`'s synthesized default was misread as "existing user" (banner showing on fresh installs) — re-verified headless in a virgin profile/origin per 06-UAT test 5, now resolved. `check-transition-banner.tests.ps1` and `check-bookmarks-read-purity.tests.ps1` pass. |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `spells-data-loader.jsx` | Fallback map, resolvableSpellKeys, BUILTIN_VERSIONS trimmed | VERIFIED | Present, substantive, wired; confirmed by direct read + passing gates. |
| `grimorio-helpers.jsx` | spellName prefers readable name | VERIFIED | Confirmed by `check-srd-name-and-markdown.tests.ps1` pass. |
| `v11-character-editor.jsx` | peekBookmarks, peekCharacters, orphan section | VERIFIED | All three functions present, pure (no writes), wired into transition-banner.jsx and the render tree; confirmed by direct read. |
| `pack-manager.jsx` | Consumes peekBookmarks | VERIFIED | `_removalImpact` uses `window.peekBookmarks` per 06-02-SUMMARY and gate pass. |
| `transition-banner.jsx` | Banner + detection + dismissal | VERIFIED | Present, wired into `index.html`, consumes pure readers only. |
| `i18n.jsx` | `migration.*` keys, full parity | VERIFIED | `window.i18nParityCheck()` gated in `check-transition-banner.tests.ps1`, passes. |
| `sw.js` | PRECACHE = SRD only, CACHE_VERSION bumped | VERIFIED | `grimorio-v4`, PRECACHE has exactly 3 SRD JSONs, zero legacy entries. |
| 4 legacy JSON files | Absent from working tree and `git ls-files` | VERIFIED | Confirmed absent by direct `git ls-files` and `ls` check. |
| `scripts/check-*.tests.ps1` (6 new gates across the phase) | Present and passing | VERIFIED | All referenced gates run and pass as part of `npm test`. |

### Key Link Verification

| From | To | Via | Status |
|------|----|----|--------|
| `transition-banner.jsx` | `pack-manager.jsx` | `window.__openPackManager()` CTA | WIRED (present in banner button handler, gated) |
| `transition-banner.jsx` | `v11-character-editor.jsx` | `window.peekBookmarks()` / `window.peekCharacters()` | WIRED (confirmed lines 31-33) |
| `transition-banner.jsx` | `spells-data-loader.jsx` | `window.__legacyVersionFallback`, `window.resolvableSpellKeys()` | WIRED (confirmed line 30, 74-80) |
| `pack-manager.jsx` | `v11-character-editor.jsx` | `_removalImpact` via `window.peekBookmarks` | WIRED (06-02-SUMMARY + gate) |
| `v11-character-editor.jsx` | `spells-data-loader.jsx` | `useResolvableKeys()` consumes `window.resolvableSpellKeys()` | WIRED (confirmed line 542) |

### Behavioral Spot-Checks

`npm test` (`pwsh -NoProfile -File scripts/run-tests.ps1`) was run once, full suite — all scripts passed, including every gate specific to this phase: `check-migration-version-fallback`, `check-srd-name-and-markdown`, `check-bookmarks-read-purity`, `check-orphan-spells`, `check-transition-banner`, `check-decommission`, `check-plugin-store`, `check-source-dispatch`, `check-upgrade-heading-strip`, `check-edition-compare`.

`git ls-files | grep -c spells-5E` → 0 (confirmed live, matches 06-UAT evidence).

Human UAT (06-UAT.md) already ran 7/7 mechanical + informal checks in Chrome headless via CDP against a real dual-worktree upgrade scenario (baseline commit `15efdf8` → HEAD, same origin/port), including byte-for-byte `localStorage` comparison and Cache Storage version verification — this is the strongest available evidence for the behavior-dependent truths (migration transitions, cache eviction) and is treated as satisfying those, per the task's stated context that UAT is complete.

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|---|---|---|---|---|
| MIGR-01 | 06-01, 06-02, 06-03, 06-06 | Migration preserves existing users' prepared/bookmarked references; orphans flagged, never silently dropped | SATISFIED | Fallback map, orphan section, byte-identical localStorage before/after per UAT |
| MIGR-02 | 06-05, 06-06 | 4 protected JSONs removed from site/repo HEAD and precache | SATISFIED | `git ls-files` empty, PRECACHE SRD-only, single atomic commit 98740fe |
| MIGR-03 | 06-04, 06-06, 06-07 | Existing user gets first-visit guidance on importing own pack | SATISFIED | Banner wired, D-06 signal fixed in 06-07, UAT tests 4-6 pass |

No orphaned requirement IDs found — all 3 IDs declared across phase plans match REQUIREMENTS.md exactly, and REQUIREMENTS.md marks all 3 Complete.

### Anti-Patterns Found

None. Scanned all phase-6-modified files (`spells-data-loader.jsx`, `grimorio-helpers.jsx`, `v11-character-editor.jsx`, `pack-manager.jsx`, `transition-banner.jsx`, `i18n.jsx`, `index.html`, `sw.js`) for `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER` and stub patterns. The only `placeholder` hits are legitimate HTML input `placeholder=` attributes and one comment describing a fallback-naming last resort — not debt markers.

### Human Verification Required

None. 06-UAT.md already covers this (7/7 pass, including the informal banner-clarity check), and the task context states human UAT is complete. The two gaps UAT originally found (D-06 banner-on-fresh-install regression, minor `hifi_bookmarks_v1` residue write) were closed by gap-closure plan 06-07 and re-verified by the same UAT process in a virgin profile/origin — confirmed here independently by reading `loadCharacters()`/`peekCharacters()`/`loadBookmarks()` and `_hasExistingUserSignal()` source, and by the passing `check-bookmarks-read-purity.tests.ps1` gate (which executes, not just inspects, these guarantees).

### Gaps Summary

None. All 4 ROADMAP success criteria for Phase 6 are verified against the current codebase state. Two implementation-level details from the original Phase 6 plans (2-pack BUILTIN_VERSIONS / grimorio-v3; the pre-Phase-7 fallback-map targets) are superseded by Phase 7's later, intentional changes — documented in the frontmatter `notes` above rather than reported as gaps, since the underlying Phase 6 goal (legacy datasets gone, nothing silently lost) is unaffected and independently verified against the current 3-pack, `grimorio-v4` state.

---

_Verified: 2026-09-27_
_Verifier: Claude (gsd-verifier)_
