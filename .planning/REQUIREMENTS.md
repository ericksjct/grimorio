# Requirements: Grimório do Jogador

**Defined:** 2026-07-17
**Core Value:** Players can quickly find, prepare, and reference the right spells for their character, fully offline, with zero setup.

## v1 Requirements

This project runs in ongoing maintenance mode (no single large feature push). The only concretely-specified work from the current ingest batch is closing out the animations SPEC. Future bugfixes, UX polish, and small features get scoped and added here directly as they're identified — this list is not meant to be a fixed, exhaustive backlog.

### Animation Polish

<!-- Carried over from the ingested SPEC (docs/superpowers/specs/2026-07-05-animacoes-menus-filtros-design.md) and its implementation plan. All 10 implementation tasks are already shipped (commits e733b1c..463fb7d, confirmed by grep + git log). What's left is the plan's Task 11: manual verification. These requirements exist to close that loop, not to re-spec already-built code. -->

- [ ] **ANIM-01**: User can open and close the desktop character menu, filter dropdowns, "+ mais" filter menu, character editor, and side detail panel and see smooth, glitch-free animations in every one of the 6 themes (Catppuccin, Nord, Monokai, Solarized, Parchment, Daylight) × light/dark
- [ ] **ANIM-02**: User can open and close the mobile character sheet, fullscreen editor, and spell detail screen and see smooth, glitch-free animations in every theme
- [ ] **ANIM-03**: User with `prefers-reduced-motion: reduce` enabled sees all of the above interactions happen instantly, with no flicker or flash of unstyled/mid-transition state
- [ ] **ANIM-04**: Keyboard-only user can open every animated menu/dropdown/panel/editor, close it with Escape, and see focus return correctly to the element that triggered it

## v2 Requirements

None defined. This project doesn't pre-populate a v2 backlog — new requirements are scoped and added directly to v1 as they're identified (bugfixes, UX polish, small features), rather than queued speculatively. `.planning/codebase/CONCERNS.md` holds candidate future work (tech debt, known bugs, performance notes) to pull from when scoping the next phase.

## Out of Scope

| Feature | Reason |
|---------|--------|
| New animation library / JS-driven motion engine | CSS-only is a locked constraint from the ingested SPEC — keeps the app dependency-light and build-step-free |
| Backend, database, or user accounts | App is intentionally local-only and offline-first; no server component wanted |
| Automated frontend test suite (immediate) | Not currently prioritized; manual QA has been sufficient so far — revisit if regressions increase |
| Large speculative rewrites (TypeScript migration, framework swap, build tooling) | Not requested; incremental polish is the current priority, not rearchitecture |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ANIM-01 | Phase 1 | Pending |
| ANIM-02 | Phase 1 | Pending |
| ANIM-03 | Phase 1 | Pending |
| ANIM-04 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 4 total
- Mapped to phases: 4
- Unmapped: 0 ✓

---
*Requirements defined: 2026-07-17*
*Last updated: 2026-07-17 after initial definition*
