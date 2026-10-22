---
phase: 07-traducao-srd-ptbr
plan: 01
subsystem: content-pipeline
tags: [markdown-parser, srd, ptbr, cc-by-4.0, build-script, provenance]

# Dependency graph
requires:
  - phase: 03-srd-pack-import-pipeline
    provides: pack.schema.json, generate-srd-pack.mjs helpers (slugify, freeIdentifier, htmlEscape, toSpell, validatePackAgainstSchema), srd-2024-en.json (339-spell EN slug/level/school/class set)
  - phase: 06-decommissioning-migration
    provides: removal of the 4 spells-5E-*.json datasets (commit 98740fe) that this plan regenerates as a local, gitignored test fixture
provides:
  - scripts/srd-sources/srd-5.2-ptbr-source.json — versioned recorte (verbatim license + 339 SRD 5.2 spell blocks in pt-BR, paired to EN slugs, no PHB captions, no PHB proper names)
  - scripts/srd-sources/srd-5.2-ptbr-pairing.json — 17 hand-paired renamed-spell entries (D-16)
  - scripts/extract-ptbr-source.mjs — one-shot extractor, re-runnable if the Heróis Anônimos source is revised
  - scripts/build-legacy-fixtures.mjs — one-shot regenerator of the 4 legacy JSONs as local pack-shaped fixtures (.cache/legacy-fixtures/, gitignored)
  - validatePackAgainstSchema exported from generate-srd-pack.mjs for reuse
affects: [07-02 (pack generator: reads srd-5.2-ptbr-source.json via localSourcePath, writes srd-2024-ptbr.json), 07-03 (provenance doc, precache/version registry wiring)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "One-shot build script reads gitignored full-document source exactly once, writes only a versioned licensed slice — no other script in the pipeline ever reads the full document again (mirrors generate-srd-pack.mjs's own local-source convention)"
    - "Positional (not formatting-based) detection of PHB illustration captions: the first chunk before the metadata line, regardless of bold/plain formatting"
    - "Two-tier name pairing: hand-versioned table takes priority, falls back to an automatic bridge built from a regenerated legacy fixture's (displayName -> slug) pairs"
    - "Fail-closed validation: any missing/duplicate/mismatched pairing throws and aborts before any file is written — never emits a partial recorte"

key-files:
  created:
    - scripts/build-legacy-fixtures.mjs
    - scripts/extract-ptbr-source.mjs
    - scripts/srd-sources/srd-5.2-ptbr-pairing.json
    - scripts/srd-sources/srd-5.2-ptbr-source.json
  modified:
    - scripts/generate-srd-pack.mjs (export line only — added validatePackAgainstSchema)

key-decisions:
  - "Chunk-level noise filtering (single uppercase letter or '***') applied uniformly across every block, not just before the metadata line — handles the 16 SRD blocks where a letter-divider trails the real content before the next '##' heading"
  - "Oracle comparison (D-19) reads legacy fixture `description` only inside the comparison function and only produces a pass/fail count — never stored in the output recorte"
  - "School mismatches are reported, not fatal (only 'resilient-sphere' diverges: Abjuração in the pt-BR source vs. evocation in the EN SRD pack) — level and class-list mismatches abort, per D-11/D-12"

patterns-established:
  - "Markdown-prose extraction is entirely new to this repo (parseSrd51/parseSrd52 both consume already-structured input) — this plan's hand-rolled line/chunk parser is the template 07-02's parsePtbr52() should follow for the HTML-conversion step"

requirements-completed: [SRD-01, SRD-04]

coverage:
  - id: D1
    description: "4 legacy spells-5E-*.json datasets regenerated as local pack-shaped fixtures in .cache/legacy-fixtures/ (gitignored), used as the D-11 pairing bridge and D-19 oracle"
    requirement: SRD-01
    verification:
      - kind: unit
        ref: "node scripts/build-legacy-fixtures.mjs (exit 0, 391/477/411/474 spells) + pwsh scripts/check-srd-packs.tests.ps1"
        status: pass
    human_judgment: false
  - id: D2
    description: "Versioned pt-BR source cut (scripts/srd-sources/srd-5.2-ptbr-source.json): verbatim Licença section + 339 SRD 5.2 spell blocks, paired to EN slugs, no PHB captions, no PHB proper names, D-19 oracle >= 300/322"
    requirement: SRD-04
    verification:
      - kind: unit
        ref: "node scripts/extract-ptbr-source.mjs (exit 0: 339 spells, 303/322 oracle matches, 33 captions discarded, 1 school divergence resilient-sphere) + the plan's inline node verify script"
        status: pass
    human_judgment: false

duration: 45min
completed: 2026-09-26
status: complete
---

# Phase 7 Plan 1: Fonte versionada pt-BR e fixtures legados Summary

**Extrator hand-rolled de Markdown (Heróis Anônimos, CC-BY-4.0) que recorta e pareia as 339 magias do SRD 5.2 pt-BR aos slugs EN, mais os 4 datasets legados regenerados localmente como fixture de teste**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-09-26T15:00:00Z (approx.)
- **Completed:** 2026-09-26T15:22:00Z
- **Tasks:** 2
- **Files modified:** 5 (4 created, 1 export line edited)

## Accomplishments

- `scripts/build-legacy-fixtures.mjs` recovers the 4 `spells-5E-*.json` datasets from git history (`98740fe^`) and reshapes them into `pack.schema.json` form under `.cache/legacy-fixtures/` (gitignored) — exact expected counts (391/477/411/474 spells)
- `scripts/extract-ptbr-source.mjs` parses the "Descrições da Magias" chapter of the gitignored Heróis Anônimos Markdown (391 named blocks), discards the single empty-heading glitch and every letter/`***` divider chunk, positionally strips 33 PHB illustration captions, pairs 322 blocks automatically via the legacy-fixture bridge and 17 renamed spells via a hand-versioned table, filters to exactly the 339-spell SRD 5.2 set, swaps all 12 banned PHB proper names for their generic displayName, validates circle/class-list against `srd-2024-en.json` (aborts on mismatch), and confirms the D-19 oracle at 303/322 (>= 300 required)
- `scripts/srd-sources/srd-5.2-ptbr-source.json` now holds the verbatim "Licença" section (WotC + Heróis Anônimos dual attribution) and 339 spell blocks (`{name, displayName, markdown}`), sorted by `name` — the only versioned artifact touching this fase's translated content
- `generate-srd-pack.mjs` exports `validatePackAgainstSchema` for reuse by the fixture builder, with no other change to the file

## Task Commits

Each task was committed atomically:

1. **Task 1: Fixtures legados regenerados em formato de pack (D-09, D-10)** - `a7254a9` (feat)
2. **Task 2: Tabela de pareamento e extrator do recorte versionado (D-01, D-02, D-11, D-12, D-16, D-17, D-18, D-19)** - `98d7dc3` (feat)

_No TDD tasks in this plan — both are `type="auto"` build-script tasks with `<verify><automated>` node/pwsh proof commands, not a red/green test cycle._

## Files Created/Modified

- `scripts/build-legacy-fixtures.mjs` - One-shot regenerator of the 4 legacy JSONs (git history `98740fe^`) into pack-shaped local fixtures under `.cache/legacy-fixtures/`
- `scripts/extract-ptbr-source.mjs` - One-shot Markdown extractor producing the versioned pt-BR source cut
- `scripts/srd-sources/srd-5.2-ptbr-pairing.json` - 17 hand-paired `{phbName, name, displayName}` entries for the SRD 5.2 renamed spells
- `scripts/srd-sources/srd-5.2-ptbr-source.json` - Versioned recorte: license text + 339 paired spell blocks (generated output, not hand-written)
- `scripts/generate-srd-pack.mjs` - Export line only: `export { EDITIONS, validatePackAgainstSchema };`

## Decisions Made

- Chunk-noise filtering (single uppercase letter or `***`) is applied to every chunk in a block's content span, not only to chunks preceding the metadata line — this is what correctly discards the 16 SRD blocks where a letter-divider trails the real spell content right before the next `##` heading, matching the measured fact in the plan ("Divisores de letra... aparecem DENTRO de 16 blocos SRD, no fim do bloco anterior ao divisor").
- The D-19 oracle function reads the legacy fixture's `description` field, but only inside the comparison itself; the value it contributes to the rest of the program is a boolean/count, never a string that reaches the output recorte — preserves the Fase 3 D-05 rule (no legacy description byte ever enters a published pack) while still using the fixture as a real test oracle.
- School divergence is reported but not fatal (only `resilient-sphere` diverges — pt-BR source calls it Abjuração, SRD EN calls it evocation); level and class-list divergence remain fatal per D-11/D-12, since those indicate a wrong name↔slug pair, not an editorial translation choice.

## Deviations from Plan

None — plan executed exactly as written. Every acceptance criterion in both tasks passed on the first run, and the extractor's printed summary matched the plan's "Fatos medidos no planejamento" numbers exactly (391 blocos, 339 mantidos [322+17], 52 descartados, 33 legendas, 303/322 oráculo, resilient-sphere como única divergência de escola).

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. This plan only touches local build scripts and versioned JSON; `docs/superpowers/herois_anonimos/` and `.cache/` remain untracked exactly as before (confirmed via `git ls-files` and `git status --porcelain` after every task commit).

## Next Phase Readiness

- `scripts/srd-sources/srd-5.2-ptbr-source.json` is ready for 07-02's `generate-srd-pack.mjs` extension (`parsePtbr52`, new `EDITIONS` entry with `localSourcePath` pointing here) — the recorte already carries raw markdown per spell (metadata line inclusive), not yet converted to the HTML/field-split shape `toSpell()` expects. That Markdown -> HTML conversion (tables, lists, upgrade-heading marking) is explicitly out of scope for this plan and is 07-02's job.
- The 4 regenerated legacy fixtures under `.cache/legacy-fixtures/` remain available locally for any further ad-hoc oracle checks in 07-02/07-03, but are not committed and have no static gate (D-10, user-accepted risk).
- No blockers. `npm test` is green (all existing gates, including `check-srd-packs.tests.ps1`, still pass unchanged).

---
*Phase: 07-traducao-srd-ptbr*
*Completed: 2026-09-26*

## Self-Check: PASSED

All created files found on disk (`scripts/build-legacy-fixtures.mjs`, `scripts/extract-ptbr-source.mjs`, `scripts/srd-sources/srd-5.2-ptbr-pairing.json`, `scripts/srd-sources/srd-5.2-ptbr-source.json`, this SUMMARY.md) and both task commits (`a7254a9`, `98d7dc3`) confirmed present in `git log`.
