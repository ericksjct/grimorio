---
phase: 03-srd-pack-import-pipeline
plan: 02
subsystem: legal-provenance
tags: [srd, cc-by, licensing, requirements]

requires: []
provides:
  - "03-SRD-SOURCE.md: license evidence and approved generation route for both SRD packs"
  - "REQUIREMENTS.md SRD-01 rewritten to match D-05 (no current-JSON text in SRD packs)"
affects: [03-03, 03-04]

tech-stack:
  added: []
  patterns: []

key-files:
  created:
    - .planning/phases/03-srd-pack-import-pipeline/03-SRD-SOURCE.md
  modified:
    - .planning/REQUIREMENTS.md

key-decisions:
  - "SRD 5.1: no parsed CC-BY dataset exists (5e-bits/dnd5eapi.co, Open5e, BTMorton, soryy708 all declare OGL 1.0a) — route (b): parser over Tabyltop/CC-SRD's CC-BY-4.0 text dump, official PDF OCR only as fallback"
  - "SRD 5.2: dmcb's structured 339-spell gist (used by 5e-spellbook.app) is the only CC-BY-4.0-declared dataset found — route (a), with a locally versioned copy instead of live fetch"
  - "User approved the inverse of every pre-formulated checkpoint option (investigation found 5.2 has the parsed dataset, not 5.1) — recorded as free text, explicitly flagging that route-a-51-b-52's literal name is inverted from what was approved"

requirements-completed: [SRD-01]

coverage:
  - id: D1
    description: "03-SRD-SOURCE.md documents license evidence for SRD 5.1 and 5.2 candidates, with verdict/reason per candidate and a recommended route per edition"
    requirement: "SRD-01"
    verification:
      - kind: other
        ref: "node -e read 03-SRD-SOURCE.md and check required headings + >=4 URLs (Task 1 <verify>)"
        status: pass
    human_judgment: false
  - id: D2
    description: "REQUIREMENTS.md SRD-01 text corrected to match D-05, obsolete claim removed, all other requirements untouched"
    requirement: "SRD-01"
    verification:
      - kind: other
        ref: "node -e check REQUIREMENTS.md for absence of obsolete phrase + presence of D-05 note (Task 2 <verify>); git diff --stat confirms single-file, 3-line diff"
        status: pass
    human_judgment: false
  - id: D3
    description: "User approved per-edition SRD generation route (D-06); choice recorded in 03-SRD-SOURCE.md before any pack file was generated"
    requirement: "SRD-01"
    verification:
      - kind: other
        ref: "node -e grep for route id in 03-SRD-SOURCE.md (Task 3 <verify>); confirmed srd-2014-en.json/srd-2024-en.json do not exist"
        status: pass
    human_judgment: false

duration: 35min
completed: 2026-08-10
status: complete
---

# Phase 3 Plan 02: SRD Source Investigation & Requirement Correction Summary

**Investigated SRD 5.1/5.2 dataset licenses (all mainstream 5.1 datasets are OGL not CC-BY; found one CC-BY-4.0 structured 5.2 dataset), corrected SRD-01's obsolete claim, and recorded the user's per-edition route decision.**

## Performance

- **Duration:** ~35 min
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments

- Checked 5 candidate parsed datasets for SRD 5.1 (5e-bits/dnd5eapi.co, Open5e, BTMorton/dnd-5e-srd, soryy708/dnd5-srd, Tabyltop/CC-SRD) via live HTTP fetch of their own license declarations — 4 are OGL 1.0a, 1 (Tabyltop) is CC-BY-4.0 but not structured per-spell.
- Checked SRD 5.2 candidates — confirmed `dnd5eapi.co` and Open5e do not cover the 2024 edition yet (404 / absent document) — found a single structured, CC-BY-4.0-declared 339-spell dataset (dmcb's gist, backing `5e-spellbook.app`).
- Corrected `REQUIREMENTS.md` SRD-01, which claimed the SRD pack was "generated from current data, filtered to the freely-licensed subset" — an assumption D-05 invalidated.
- Recorded the user's approved route per edition in `03-SRD-SOURCE.md`, explicitly flagging that it inverts the assumption baked into the pre-formulated checkpoint options.

## Task Commits

1. **Task 1: Investigar e registrar a licença das fontes candidatas de SRD 5.1 e 5.2** - `13b633e` (docs)
2. **Task 2: Corrigir o texto de SRD-01 em REQUIREMENTS.md para refletir D-05** - `aaa81be` (docs)
3. **Task 3: Aprovar a rota de geração dos pacotes SRD por edição** - `50e5b23` (docs)

## Files Created/Modified

- `.planning/phases/03-srd-pack-import-pipeline/03-SRD-SOURCE.md` - License evidence table per edition, verbatim attribution text, D-04 modification note, and the approved generation route with source URLs for plan 03-04 to consume directly.
- `.planning/REQUIREMENTS.md` - SRD-01 rewritten to describe two edition-specific packs sourced from a verified license (never the current `spells-5E-*.json` files); dated correction note added pointing to `03-CONTEXT.md`.

## Decisions Made

- **SRD 5.1 → route (b):** parse the CC-BY-4.0 text dump from `Tabyltop/CC-SRD` (`SRD5.1-CCBY4.0License-TT.json`) instead of running OCR from scratch — it's already extracted from the official PDF with no OCR noise, just needs a heading→field parser. Official PDF OCR is fallback only, not primary source.
- **SRD 5.2 → route (a):** one-shot script over dmcb's structured 339-spell gist, with a locally versioned copy checked into the repo (no live fetch at runtime or build time) — mitigates the risk of depending on a single hobbyist's gist staying online.
- This is the inverse of every one of the four pre-formulated checkpoint options (all assumed a mature route (a) dataset for 5.1, none existed; the mature dataset turned out to be for 5.2). The approval is recorded as free text in `03-SRD-SOURCE.md`, with an explicit warning against any future automation reading `route-a-51-b-52`'s literal name (which says the opposite) without reading the inversion note first.

## Deviations from Plan

None - plan executed exactly as written. Task 1's `<read_first>` pointed at `.planning/research/FEATURES.md` for verbatim attribution text (used as-is) and named specific candidate sources to investigate (5e-bits, dnd5eapi.co, VTT mirrors) — all were checked, plus additional candidates found via search (Tabyltop/CC-SRD, dmcb's gist) since the plan said "no mínimo, mas não se limite a eles."

## Issues Encountered

- GitHub's unauthenticated REST/search API hit its rate limit partway through investigation (60 req/hr). Worked around it by fetching `raw.githubusercontent.com` files directly and using DuckDuckGo's HTML search endpoint instead of `api.github.com/search/repositories` — did not block or degrade the investigation, just changed the tool used.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 03-04 (SRD pack generation) can proceed directly from `03-SRD-SOURCE.md` without re-investigating licenses: both source URLs, both fallback PDF URLs, both verbatim attribution texts, and the D-04 modification note are recorded there.
- Flag for 03-04: SRD 5.1's route (b) is genuinely more work than a one-shot script (heading→field parser over Tabyltop's document-stream JSON) — budget accordingly, consistent with the plan's own warning that route (b) may need to escalate to its own sub-phase.
- Flag for 03-04: verify the dmcb gist's 339 spells and field shapes against the app's spell schema before committing to the conversion script; the source is a small independent project, not an established community dataset, so cross-check row counts/fields rather than assuming 5e-bits-level maturity.

---
*Phase: 03-srd-pack-import-pipeline*
*Completed: 2026-08-10*
