# Grimório do Jogador

## What This Is

A no-build, offline-first single-page web app for browsing and filtering D&D 5e spells (2014/2024 editions, PT-BR/EN), managing player characters (classes, spell slots, prepared/bookmarked spells), and printing spell sheets. Runs entirely client-side (React + Babel via CDN, no bundler) as an installable PWA — works on `file://`, any static host, or GitHub Pages, fully offline after first load.

## Core Value

Players can quickly find, prepare, and reference the right spells for their character, fully offline, with zero setup.

## Requirements

### Validated

<!-- Shipped and confirmed working — inferred from existing codebase (.planning/codebase/) and git history. -->

- ✓ Spell browsing/filtering by class, level, school, ritual, concentration, components, casting time, range, and source, with search — desktop grid + mobile list layouts
- ✓ Character management: create/edit/delete characters, class levels, spellcasting stats, manual and auto-computed spell slots, per-character accent color
- ✓ Prepared-spell and bookmark tracking per character, persisted to `localStorage`
- ✓ Print prepared spells to a formatted sheet (`hifi-print-request` → print portal)
- ✓ Share a character build via URL (base64-encoded `?build=` parameter)
- ✓ Offline-first PWA via service worker — precaches app shell + all 4 spell datasets
- ✓ 6 visual themes (Catppuccin, Nord, Monokai, Solarized, Parchment, Daylight) × light/dark, with PT-BR/EN localization tied to spell version
- ✓ Menu/filter/panel open-close micro-animations — desktop character menu, filter dropdowns, "+ mais" filter menu, character editor, side detail panel; mobile character sheet, fullscreen editor, spell detail screen. Implemented per `docs/superpowers/specs/2026-07-05-animacoes-menus-filtros-design.md` and its companion plan (commits `e733b1c`..`463fb7d`). Code is shipped; the plan's manual cross-theme / reduced-motion / keyboard-focus verification pass (its Task 11) was never explicitly confirmed done — see Active.

### Active

<!-- Current scope. Building toward these. -->

- [ ] Formally verify the already-shipped menu/filter/panel animations (cross-theme, `prefers-reduced-motion`, keyboard focus/Escape) — carried over from the ingested SPEC as the first available backlog item, not because it's the top priority
- [ ] Track and resolve ongoing bugfixes, UX polish, and small features as they're identified during use — this project has no fixed v1 feature set right now; work gets scoped and appended to ROADMAP.md as it comes up, via `/gsd-phase`

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- New animation library or JS-driven motion — CSS-only is a locked constraint from the ingested SPEC (keeps the app dependency-light and build-step-free)
- Backend, database, or user accounts — app is intentionally local-only and offline-first; no server component wanted
- Large speculative rewrites (TypeScript migration, framework swap, build tooling) — not requested; project explicitly prioritizes incremental polish over rearchitecture right now

## Context

- Brownfield project. Existing single-page app, no build step: React 18.3.1 + ReactDOM + Babel standalone loaded from CDN (pinned versions, SRI hashes), JSX transpiled in-browser. Module load order in `index.html` is strict (`grimorio-helpers.jsx` → `i18n.jsx` → `spells-data-loader.jsx` → `v11-character-editor.jsx` → `v10-hifi.jsx`).
- No automated frontend test suite exists (confirmed in `.planning/codebase/TESTING.md`); verification is manual browser testing. `openspec`/`playwright` packages are present but not wired to any test flow.
- Recent commit history (`175aac9`..`27543ff`) shows the project already operates in a continuous small-fix cadence — auto-filled class levels, auto spell slots, mobile input fixes, select-arrow theming, link/UX fixes — reinforcing that "general maintenance and polish" is the natural mode for this codebase, not a gap to fill.
- `.planning/codebase/CONCERNS.md` catalogs known tech debt, bugs, security notes, and performance bottlenecks (silent error handling, localStorage quota exhaustion, monolithic JSX files, unvalidated `?build=` payload, etc.). These are candidate future maintenance items — not yet promoted to requirements or phases. Pull from there when scoping new work.
- The ingested SPEC (`docs/superpowers/specs/2026-07-05-animacoes-menus-filtros-design.md`) and its implementation plan describe the only concretely-specified piece of work in this ingest batch. Its 10 implementation tasks are already committed; only its final manual-verification task is open.

## Constraints

- **Tech stack**: No build step — plain React 18 + Babel standalone via CDN, JSX transpiled in-browser. Module load order in `index.html` is strict and must not change without updating all dependents.
- **No animation library**: Pure CSS animations only, no JS animation dependency — locked by the ingested SPEC's nfr constraint.
- **Accessibility**: All animated components must respect `prefers-reduced-motion: reduce` (zeroing animation/transition) and must preserve existing `useDialogA11y` focus-trap/Escape behavior — locked by the ingested SPEC.
- **No automated tests**: No frontend test runner is configured; all verification is manual browser QA across the 6 themes × light/dark.
- **Offline-first**: Service worker precaches the app shell and all 4 spell JSON datasets (~2.4MB); must keep working on `file://` and any static host with no server-side code.

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

No ADR-locked decisions from this ingest batch (`decisions.md` is a placeholder — 0 ADRs found). Add decisions here as they're made.

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| — | — | — |

---
*Last updated: 2026-07-17 after initial project setup (ingest of animations SPEC/DOC + codebase map)*
