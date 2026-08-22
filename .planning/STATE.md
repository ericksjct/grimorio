---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Plugins BYOD
current_phase: 04.1
current_phase_name: desacoplar-o-idioma-da-interface-do-idioma-do-pacote
status: executing
stopped_at: Phase 04.1 context gathered
last_updated: "2026-08-22T02:33:33.070Z"
last_activity: 2026-08-21
last_activity_desc: Phase 04.1 execution started
progress:
  total_phases: 4
  completed_phases: 3
  total_plans: 19
  completed_plans: 14
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-17)

**Core value:** Players can quickly find, prepare, and reference the right spells for their character, fully offline, with zero setup.
**Current focus:** Phase 04.1 — desacoplar-o-idioma-da-interface-do-idioma-do-pacote

## Current Position

Phase: 04.1 (desacoplar-o-idioma-da-interface-do-idioma-do-pacote) — EXECUTING
Plan: 1 of 5
Status: Executing Phase 04.1
Last activity: 2026-08-21 — Phase 04.1 execution started

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**

- Total plans completed: 14
- Average duration: -
- Total execution time: -

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Animation Verification & Polish | ad hoc | - | - |
| 02 | 2 | - | - |
| 03 | 8 | - | - |
| 04 | 4 | - | - |

**Recent Trend:**

- Last 5 plans: -
- Trend: -

*Updated after each plan completion*
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 02 P01 | 3min | 3 tasks | 4 files |
| Phase 02 P02 | 12min | 3 tasks | 3 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table. Four decisions locked for this milestone (all "Pending — milestone v2.0" until phases execute):

- BYOD completo para dados de magias — copyright protection, app embeds only SRD/CC-BY, user imports own JSONs
- Plugin format = existing spell schema + `meta` manifest header
- Imported packs stored in IndexedDB (localStorage quota too small for ~600KB+ packs)
- Mandatory HTML sanitization on import (DOMPurify) — `description` renders via `dangerouslySetInnerHTML`, BYOD makes that an XSS vector without it
- [Phase ?]: plugin-store.jsx putPack/deletePack resolve only on tx.oncomplete (durability proof), not on request onsuccess
- [Phase ?]: IndexedDB errors propagate unwrapped (name/message intact) from plugin-store.jsx; caller decides UI messaging
- [Phase ?]: sw.js CACHE_VERSION left unchanged when adding plugin-store.jsx to PRECACHE to avoid re-downloading cached spell JSONs
- [Phase ?]: A-02: exportPack() serializa o registro armazenado VERBATIM, incluindo a chave de topo id - Fase 3 deve tolerar/remover essa chave no import
- [Phase ?]: A-03 aplicada: navigator.storage.persist() solicitado no boot (ROADMAP/REQUIREMENTS autoritativos sobre nota de research desatualizada)

### Pending Todos

None yet. `.planning/codebase/CONCERNS.md` holds candidate future maintenance items not yet promoted to a requirement or phase.

### Blockers/Concerns

- REQUIREMENTS.md's original "16 total" coverage count was stale/incorrect — the actual v2.0 requirement list has 19 items (PKG×5, STOR×3, MGMT×5, SRD×3, MIGR×3). Corrected during roadmap creation (2026-07-18); traceability table now reflects all 19, mapped 1:1 to Phases 2-6.
- Research flags Phase 6 (Decommissioning & Migration) as needing a deeper pass during planning: the migration-detection logic for existing `localStorage` character data is novel to this codebase (no prior versioned-migration pattern to copy).
- Research flags Phase 3 as needing a concrete file-size cap decided during planning (no byte threshold proposed yet) and a scoping call on whether to add a CSP as defense-in-depth alongside DOMPurify.
- No automated frontend test suite exists — all phase verification will be manual browser QA, consistent with the rest of the project.

### Roadmap Evolution

- Phase 04.1 inserted after Phase 4: Desacoplar o idioma da interface do idioma do pacote - pre-requisito da Fase 6, levantado no checkpoint 04-04 (URGENT)

## Quick Tasks Completed

| Date | Slug | Result |
|------|------|--------|
| 2026-08-10 | spell-card-stale-index | Spell cards opened the wrong spell after filtering — memo'd card kept a stale index closure. Callbacks made identity-stable + spell-argument based; static check added. |

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

## Session Continuity

Last session: 2026-08-22T01:11:48.294Z
Stopped at: Phase 04.1 context gathered
Resume file: .planning/phases/04.1-desacoplar-o-idioma-da-interface-do-idioma-do-pacote/04.1-CONTEXT.md
