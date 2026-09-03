---
phase: 06-decommissioning-migration
plan: 05
subsystem: decommissioning
tags: [MIGR-02, D-14, D-15, D-16, D-17, copyright-removal]
status: complete

# Dependency graph
requires:
  - phase: 06-decommissioning-migration
    plan: "06-01"
    provides: "LEGACY_VERSION_FALLBACK map (D-04) and window.resolvableSpellKeys() in spells-data-loader.jsx — both retained unchanged by this plan"
  - phase: 06-decommissioning-migration
    plan: "06-04"
    provides: "transition-banner.jsx mounted and precached — its PRECACHE line survives the sw.js edit in this plan"
provides:
  - "The 4 copyright-protected PHB spell JSONs (spells-5E-{2024,2014}-{PTBR,EN}.json) removed from the working tree and git ls-files in one atomic commit"
  - "BUILTIN_VERSIONS reduced to the 2 SRD entries (srd-2024-en, srd-2014-en), both corpus: 'srd'"
  - "sw.js PRECACHE with only the 2 SRD JSONs; CACHE_VERSION bumped grimorio-v1 -> grimorio-v2 so activate() purges every existing user's stale cache"
  - "scripts/check-decommission.tests.ps1 — permanent regression gate for the removal"
affects: [06-06-checkpoint]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Permanent decommission gate checks working-tree absence + git ls-files absence + PRECACHE/CACHE_VERSION/BUILTIN_VERSIONS content, with a node eval() execution proof that every remaining registry entry's file actually exists on disk"
    - "Gate scenarios that exercised removed registry keys (WR-07/CR-02 in check-edition-compare) rebuilt on a synthetic BYOD pack entry (corpus: 'pack') concat'd onto BUILTIN_VERSIONS, preserving the same-corpus-pairing guarantee without reviving the deleted PHB keys"

key-files:
  created:
    - scripts/check-decommission.tests.ps1
  modified:
    - spells-data-loader.jsx
    - sw.js
    - scripts/check-plugin-store.tests.ps1
    - scripts/check-source-dispatch.tests.ps1
    - scripts/check-upgrade-heading-strip.tests.ps1
    - scripts/check-edition-compare.tests.ps1
    - scripts/check-migration-version-fallback.tests.ps1
    - scripts/check-pack-wiring.tests.ps1
    - scripts/check-transition-banner.tests.ps1

key-decisions:
  - "LEGACY_VERSION_FALLBACK in spells-data-loader.jsx keeps its 4 old-key string literals ('spells-5E-2024-PTBR' etc.) unchanged — those are D-04's redirection table, not references to the deleted files, and this plan's own <verification> block requires the redirect to keep working after the removal"
  - "check-decommission.tests.ps1 checks for the removed FILENAMES (with .json extension) in sw.js/spells-data-loader.jsx, not a bare 'spells-5E' substring — a bare-substring check would false-positive on the intentional LEGACY_VERSION_FALLBACK keys"
  - "3 gates outside the plan's files_modified list (check-migration-version-fallback, check-pack-wiring, check-transition-banner) also hard-asserted grimorio-v1 / the presence of the 4 legacy keys, as self-scoping guards written by 06-01/06-04 to defer this removal to 06-05. Realigned all 3 in the same commit — D-15 requires the whole suite green with no exceptions, and leaving them unrealigned would have left the suite red exactly as D-15 forbids"

requirements-completed: [MIGR-02]

coverage:
  - id: D-15
    description: "Removal lands as a single atomic commit — no history state has a version entry pointing at a 404'd file"
    requirement: "MIGR-02"
    verification:
      - kind: unit
        ref: "git log -1 --name-only shows all 14 files in one commit; git rev-parse HEAD~1 equals the pre-plan HEAD"
        status: pass
    human_judgment: false
  - id: D-14
    description: "CACHE_VERSION bumped grimorio-v1 -> grimorio-v2 so activate() purges the old cache still holding the 4 JSONs for existing installed users"
    requirement: "MIGR-02"
    verification:
      - kind: unit
        ref: "scripts/check-decommission.tests.ps1 (grimorio-v2 literal + top-comment wording)"
        status: pass
      - kind: manual
        ref: "DevTools Cache Storage check after install under grimorio-v1, listed in plan's <acceptance_criteria> as backstop"
        status: deferred
    human_judgment: true
  - id: D-16
    description: "Git history is never rewritten — git rm only, no filter-repo/filter-branch/force-push"
    requirement: "MIGR-02"
    verification:
      - kind: unit
        ref: "git rm used exclusively; no destructive git commands run this plan"
        status: pass
    human_judgment: false
  - id: D-17
    description: "BUILTIN_VERSIONS literal reduced to 2 SRD entries before .slice(); SPELL_VERSIONS still BUILTIN_VERSIONS.slice(), never reassigned"
    requirement: "MIGR-02"
    verification:
      - kind: unit
        ref: "node eval() proof in check-decommission.tests.ps1 and check-source-dispatch.tests.ps1 (reassignment guard)"
        status: pass
    human_judgment: false

metrics:
  duration: "~35 min"
  completed: "2026-09-03"
---

# Phase 6 Plan 05: Decommission the 4 legacy PHB spell JSONs Summary

One atomic commit removes the 4 copyright-protected PHB spell JSONs (2024/2014 x PT-BR/EN),
shrinks `BUILTIN_VERSIONS` to the 2 SRD entries, bumps `sw.js`'s `CACHE_VERSION` so every
existing install's stale cache gets purged, and realigns 7 test gates (4 named in the plan
plus 3 more discovered mid-execution) so the full suite stays green through the removal.

## What Was Built

**Task 1 — removal without commit.** `git rm` on the 4 JSONs; `spells-data-loader.jsx`'s
`BUILTIN_VERSIONS` literal cut from 6 entries to 2 (both `corpus: 'srd'`, `source: 'fetch'`),
before the `.slice()` so `SPELL_VERSIONS`'s in-place-mutation contract is untouched;
`sw.js`'s `PRECACHE` array dropped the 4 legacy lines, `CACHE_VERSION` went from
`'grimorio-v1'` to `'grimorio-v2'`, and the top-of-file comment now says 2 JSONs (not 6) and
explicitly states that removal — unlike pure addition — requires the bump.

**Task 2 — gate realignment + single commit.** Realigned:
- `check-plugin-store.tests.ps1`: dropped the loop requiring the 4 JSONs in PRECACHE and the
  hard `grimorio-v1` assertion (now expects `grimorio-v2`).
- `check-source-dispatch.tests.ps1`: needle list, `source: 'fetch'`/`edition: '5e 20'` counts
  dropped from 6 to 2; order check now just `srd-2024-en` before `srd-2014-en`.
- `check-upgrade-heading-strip.tests.ps1`: sample file repointed from
  `spells-5E-2024-PTBR.json` to `srd-2024-en.json` (confirmed the embedded-heading pattern
  still matches there).
- `check-edition-compare.tests.ps1`: WR-07 scenario now compares `srd-2024-en` against
  `srd-2014-en` (same corpus, different edition); CR-02 rebuilt on a synthetic BYOD pack
  entry (`corpus: 'pack'`) concatenated onto a copy of `BUILTIN_VERSIONS`, proving the
  same-corpus preference still routes the language-toggle to the SRD sibling rather than the
  pack itself.
- New `scripts/check-decommission.tests.ps1`: permanent gate — 4 files absent from working
  tree and `git ls-files`, `sw.js` has no filename reference to any of the 4, PRECACHE has
  exactly the 2 SRD JSONs, `CACHE_VERSION` is `grimorio-v2`, top comment mentions the
  removal-requires-bump rule, and a node `eval()` proof that `BUILTIN_VERSIONS` has exactly
  2 entries, both `corpus: 'srd'`/`source: 'fetch'`, each pointing at a file that exists.

Staged everything and made the single commit `98740fe` covering all 14 files.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - blocking issue] Kept LEGACY_VERSION_FALLBACK's old-key strings intact instead
of deleting all `spells-5E` occurrences literally**
- **Found during:** Task 1 verification
- **Issue:** Task 1's acceptance criteria says `grep -c 'spells-5E' spells-data-loader.jsx`
  must be `0`. But `spells-data-loader.jsx` also contains `LEGACY_VERSION_FALLBACK` (merged
  in 06-01, D-04) — a lookup table whose 4 keys are literally the old version keys, used to
  redirect a saved `spellbook-ui-prefs.versionKey` to the SRD of the same edition. This
  plan's own `<verification>` section requires that exact redirect to keep working after the
  removal (`window.__legacyVersionFallback` reporting `{from:'spells-5E-2014-PTBR',
  to:'srd-2014-en'}`). The literal grep criterion predates 06-01 landing that map and is
  stale.
- **Fix:** Left `LEGACY_VERSION_FALLBACK` untouched. Wrote `check-decommission.tests.ps1` to
  check for the removed *filenames* (`spells-5E-2024-PTBR.json`, etc.) rather than the bare
  `spells-5E` substring, so the gate can't regress-detect the deleted files without
  false-positiving on the intentional fallback map.
- **Files modified:** `scripts/check-decommission.tests.ps1` (new gate written this way from
  the start; no separate fix commit needed)
- **Commit:** `98740fe`

**2. [Rule 3 - blocking issue] Realigned 3 gates outside the plan's `files_modified` list**
- **Found during:** Task 2, first `npm test` run after writing the new gate
- **Issue:** `scripts/check-migration-version-fallback.tests.ps1` (06-01),
  `scripts/check-pack-wiring.tests.ps1`, and `scripts/check-transition-banner.tests.ps1`
  (06-04) each contained a hard assertion deferring this exact removal to "06-05": one
  required `BUILTIN_VERSIONS` to still declare a legacy key, the other two required
  `CACHE_VERSION` to still equal `'grimorio-v1'`. None of the 3 were listed in this plan's
  `files_modified` frontmatter, but leaving them unrealigned kept the suite red after the
  Task 1 edits — exactly the state D-15 forbids ("nenhum estado intermediário vermelho").
- **Fix:** Updated the `BUILTIN_VERSIONS`-legacy-key assertion in
  `check-migration-version-fallback.tests.ps1` to require the *absence* of a legacy key
  instead, and updated the `CACHE_VERSION` literal in both `check-pack-wiring.tests.ps1` and
  `check-transition-banner.tests.ps1` from `grimorio-v1` to `grimorio-v2`.
- **Files modified:** `scripts/check-migration-version-fallback.tests.ps1`,
  `scripts/check-pack-wiring.tests.ps1`, `scripts/check-transition-banner.tests.ps1`
- **Commit:** `98740fe` (same single commit — required by D-15)

## Issues Encountered

None beyond the deviations above. `npm test` (full 40+ script suite) passed on the final
commit; `scripts/check-srd-packs.tests.ps1` was confirmed unmodified per the plan's
acceptance criteria (it never referenced the legacy filenames).

## Deferred / Manual Verification

The plan's `must_haves.truths` backstop item — "an existing user with the PWA already
installed stops receiving the 4 JSONs from Cache Storage after updating" — requires a
browser DevTools check (Application > Cache Storage: `grimorio-v1` gone, `grimorio-v2`
present, none of the 4 JSONs inside). This is explicitly called out in the plan as closing
at the 06-06 checkpoint, not in this automated plan.

## Self-Check: PASSED

- FOUND: spells-data-loader.jsx (BUILTIN_VERSIONS has 2 entries, both corpus 'srd')
- FOUND: sw.js (CACHE_VERSION = 'grimorio-v2'; PRECACHE has srd-2024-en.json,
  srd-2014-en.json only)
- FOUND: scripts/check-decommission.tests.ps1
- MISSING (intentional — this is the point of the plan): spells-5E-2024-PTBR.json,
  spells-5E-2014-PTBR.json, spells-5E-2024-EN.json, spells-5E-2014-EN.json
- FOUND commit 98740fe in `git log --oneline`
- `npm test` passed on the final commit (40+ scripts, including the new decommission gate)
