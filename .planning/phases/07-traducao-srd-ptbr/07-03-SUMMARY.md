---
phase: 07-traducao-srd-ptbr
plan: 03
subsystem: content-pipeline
tags: [requirements, provenance, srd, ptbr, cc-by-4.0, documentation]

# Dependency graph
requires:
  - phase: 07-traducao-srd-ptbr
    plan: 01
    provides: measured extractor numbers (391 blocks, 339 kept [322+17], 52 discarded, 33 captions, 303/322 oracle, resilient-sphere school divergence)
  - phase: 07-traducao-srd-ptbr
    plan: 02
    provides: measured generator divergences (call-lightning upgradeDescription absence, forcecage/glyph-of-warding concentration), MODIFICATION_NOTE_PTBR text
provides:
  - .planning/REQUIREMENTS.md — SRD-04 active requirement, richer wording matching this plan's spec; single traceability row; Coverage 23/23
  - .planning/phases/03-srd-pack-import-pipeline/03-SRD-SOURCE.md §"SRD 5.2 (2024, PT-BR) — Fase 7" — pt-BR source provenance, same discipline as the EN sections
affects: [07-04, 07-05 (SRD-04 completion: registry/precache/migration wiring still pending)]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - .planning/REQUIREMENTS.md
    - .planning/phases/03-srd-pack-import-pipeline/03-SRD-SOURCE.md

key-decisions:
  - "07-01's executor had already promoted SRD-04 out of Future Requirements (commit 61b5014) as an unplanned side-effect. Reconciled instead of duplicating: replaced only the SRD-04 list item and its italic promotion note with this plan's specified (richer) wording; left the already-correct traceability row, Future Requirements removal, and Coverage block (23 total) from 07-01 untouched."

requirements-completed: []

coverage:
  - id: D-reconcile
    description: "REQUIREMENTS.md ends in the exact state this plan's must_haves demand: exactly one SRD-04 list item (with this plan's wording), one italic promotion note (with this plan's wording and date), one traceability row (SRD-04 | Phase 7 | Pending), Future Requirements down to 3 items, Coverage at 23 total/23 mapped/0 unmapped"
    requirement: SRD-04
    verification:
      - kind: unit
        ref: "node -e verify script from the plan (exit 0); grep -n SRD-04 shows exactly 1 list item + 1 italic note + 1 traceability row + 1 coverage mention"
        status: pass
    human_judgment: false
  - id: D-provenance
    description: "03-SRD-SOURCE.md new section cites the pt-BR source URL, license, version, capture date, 339-spell count, both rejected/deferred sources, all 4 measured divergences, the recorte and legacy-fixture paths — no spell description text transcribed"
    requirement: SRD-01
    verification:
      - kind: unit
        ref: "node -e verify script from the plan (exit 0, all 12 required substrings present); git diff shows 0 deletion lines (append-only)"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-09-26
status: complete
---

# Phase 7 Plan 3: Requisito SRD-04 e proveniência da fonte pt-BR Summary

**Reconciliação do requisito SRD-04 já promovido por 07-01 com a redação deste plano, mais a seção nova de proveniência da fonte pt-BR (Heróis Anônimos, CC-BY-4.0) em `03-SRD-SOURCE.md`, com a mesma disciplina das seções 5.1/5.2 EN**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-09-26
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `.planning/REQUIREMENTS.md`: SRD-04 confirmado como requisito ativo da seção "SRD — Pacote embutido", com a redação mais detalhada especificada por este plano (recorte que nunca inclui conteúdo fora do SRD 5.2, `name` = slug EN, atribuição dupla verbatim, padrão para navegador pt-BR, destino das chaves legadas); nota itálica de promoção atualizada com data e motivo (troca de fonte, de tradução própria para a tradução CC-BY do Heróis Anônimos)
- `.planning/phases/03-srd-pack-import-pipeline/03-SRD-SOURCE.md`: seção nova `## SRD 5.2 (2024, PT-BR) — Fase 7` registrando fonte adotada (tabela no formato das seções EN), fontes rejeitadas/adiadas (DRS dos Aventureiros dos Reinos, Artifício RPG), o que foi e não foi tomado, a relação com o JSON legado (oráculo/ponte de pareamento), as 4 divergências fonte×SRD medidas, a atribuição dupla e a tensão entre a seção Licença verbatim e a regra do SRD de não incluir outra atribuição à Wizards

## Task Commits

Each task was committed atomically:

1. **Task 1: Promover o Pacote SRD PT-BR a requisito ativo SRD-04** - `49beaae` (docs)
2. **Task 2: Seção de proveniência da fonte pt-BR em 03-SRD-SOURCE.md** - `51928ff` (docs)

_No TDD tasks — both are `type="auto"` documentation edits with `<verify><automated>` node proof commands._

## Files Created/Modified

- `.planning/REQUIREMENTS.md` - SRD-04 list item and its italic promotion note replaced with this plan's wording; traceability row, Future Requirements removal, and Coverage (23/23) were already correct from 07-01 and left untouched
- `.planning/phases/03-srd-pack-import-pipeline/03-SRD-SOURCE.md` - New section appended at the end (append-only, zero deletion lines)

## Decisions Made

- Reconciled rather than duplicated the 07-01 overlap (commit 61b5014): that commit had already promoted SRD-04, removed the Future Requirements line, added the traceability row, and bumped Coverage to 23 — all functionally correct and matching this plan's `<verify>` script and `must_haves`. Only the SRD-04 list item and its italic note carried this plan's more detailed wording, so only those two spans were replaced via `Edit`, not rewritten wholesale.
- Kept the new `03-SRD-SOURCE.md` section in the same inline-bold-subsection style as the file's pre-existing sections (e.g. `**Rota recomendada:**`, `**Números encontrados:**`) rather than Markdown headings, for stylistic consistency with the rest of the document. This trips a few cosmetic `MD036`/`MD034` linter warnings (emphasis-as-heading, bare URLs) that pre-exist elsewhere in the same file and are not enforced by any project gate.

## Deviations from Plan

### Auto-fixed Issues

None — this is a documentation-only plan; no code, no tests, no build gates touched.

**Reconciliation (not a Rule 1-4 deviation, but flagged per orchestrator instructions):** Task 1's `<action>` describes adding SRD-04 as if it did not yet exist. It already existed, added by 07-01's executor as an unplanned side-effect of that plan's own REQUIREMENTS.md touch. Verified via `git show 61b5014 -- .planning/REQUIREMENTS.md` before editing. Resolved by editing only the two spans (SRD-04 line + italic note) that carried different wording than this plan specifies, leaving the already-correct traceability row, Future Requirements removal, and Coverage block untouched. End state matches this plan's `<verify>` script and `must_haves` exactly — confirmed by running the plan's own `node -e` proof and by `grep -n SRD-04` showing exactly one list item, one italic note, one traceability row, and one coverage mention.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required. This plan only touches two Markdown documents (`.planning/REQUIREMENTS.md`, `.planning/phases/03-srd-pack-import-pipeline/03-SRD-SOURCE.md`); no code, no schema, no generated pack changed. `npm test` remains green (`All test scripts passed.`), confirming no gate reads these documents. The user's own uncommitted changes (`favicon.svg`, `srd-2024-en.json`) were left untouched — `git status --short` shows only those two files modified after both task commits, exactly as before this plan started.

## Next Phase Readiness

- SRD-04 remains `Pending` in Traceability (not marked complete) — 07-04/07-05 still owe the registry wiring (`BUILTIN_VERSIONS` entry in `spells-data-loader.jsx`), the `sw.js` `PRECACHE`/`CACHE_VERSION` bump, and the `scripts/check-migration-version-fallback.tests.ps1` realignment for the D-08 legacy-key redirect. This plan is documentation-only and does not touch any of those.
- `03-SRD-SOURCE.md` now has the full pt-BR provenance trail that 07-04's registry-wiring work (and any future audit) can cite without re-investigating the license or re-deriving the extractor's measured numbers.
- No blockers. `npm test` is green.

---
*Phase: 07-traducao-srd-ptbr*
*Completed: 2026-09-26*

## Self-Check: PASSED

Both modified files confirmed present and updated on disk (`.planning/REQUIREMENTS.md`, `.planning/phases/03-srd-pack-import-pipeline/03-SRD-SOURCE.md`), both task commits (`49beaae`, `51928ff`) confirmed present in `git log --oneline --all`, and `npm test` confirmed green after both commits.
