# Roadmap: Grimório do Jogador

## Overview

This is a maintenance-mode roadmap, not a linear build-out toward a fixed v1. There's no single big feature driving the project right now — the goal is to keep shipping bugfixes, UX polish, and small features as they're identified, the way recent commit history already shows (auto spell slots, mobile input fixes, link/UX cleanup, etc.).

Phase 1 exists because it's the one piece of work that arrived fully specified in this ingest (the menus/filters/panels animation SPEC). Its 10 implementation tasks are already shipped in git history — what's left is closing the loop with the SPEC's own manual verification pass. It is **not** positioned first because it's the top priority; it's first because it's the only phase currently scoped. Additional phases get appended here via `/gsd-phase` as new maintenance work is identified — pull candidates from `.planning/codebase/CONCERNS.md` (known bugs, tech debt, performance notes) or from whatever the user raises next.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: Animation Verification & Polish** - Confirm the already-implemented menu/filter/panel animations work correctly everywhere they were built for

## Phase Details

### Phase 1: Animation Verification & Polish
**Goal**: The menu/filter/panel/editor open-close animations shipped from the ingested SPEC work correctly on every surface they were built for — every desktop and mobile interaction, every theme, reduced-motion users, and keyboard-only users.
**Depends on**: Nothing (first phase)
**Requirements**: ANIM-01, ANIM-02, ANIM-03, ANIM-04
**Success Criteria** (what must be TRUE):
  1. User can open/close the desktop character menu, filter dropdowns, "+ mais" filter menu, character editor, and side detail panel and see smooth, glitch-free animations in every one of the 6 themes (light/dark)
  2. User can open/close the mobile character sheet, fullscreen editor, and spell detail screen and see smooth, glitch-free animations in every theme
  3. A user with `prefers-reduced-motion: reduce` enabled sees all of the above happen instantly, with no flicker or flash of mid-transition state
  4. A keyboard-only user can open every animated menu/dropdown/panel/editor, close it with Escape, and see focus return correctly to the triggering element
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 01-01: TBD (scoped during `/gsd-plan-phase 1`)

## Progress

**Execution Order:**
Phase 1 is the only currently-scoped phase. Future phases will be added via `/gsd-phase` and executed as scoped — this roadmap grows incrementally rather than being fully planned up front.

| Phase | Plans Complete | Status | Completed |
|-------|-----------------|--------|-----------|
| 1. Animation Verification & Polish | 0/TBD | Not started | - |
