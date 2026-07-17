# Constraints

## Motion tokens (easing and duration)
- source: docs/superpowers/specs/2026-07-05-animacoes-menus-filtros-design.md
- type: nfr
- content: Standard easing `cubic-bezier(.2,.7,.3,1)` (already used in the project). Short duration `180ms` for menus, dropdowns, chips. Medium duration `240ms` for panels, modals, editor. All transition classes must use `animation-fill-mode: both` to avoid flashes of initial/final state.

## CSS-only, no animation library
- source: docs/superpowers/specs/2026-07-05-animacoes-menus-filtros-design.md
- type: nfr
- content: Project must remain lightweight — pure CSS animations only, no animation library may be added. Confirmed as a global constraint in the companion implementation plan (docs/superpowers/plans/2026-07-05-animacoes-menus-filtros-plan.md).

## Reduced-motion and accessibility preservation
- source: docs/superpowers/specs/2026-07-05-animacoes-menus-filtros-design.md
- type: nfr
- content: Must respect `@media (prefers-reduced-motion: reduce)`, zeroing `animation`/`transition` (`!important`) for all new transition classes. Must preserve existing `useDialogA11y` behavior, focus handling, and Escape-to-close across all animated modals/panels. Animations are purely visual and must not affect screen readers. No visual regression permitted across any of the 6 existing themes (light/dark, Catppuccin/Nord/Monokai/Solarized/Parchment/Daylight).

## Reusable transition class contract
- source: docs/superpowers/specs/2026-07-05-animacoes-menus-filtros-design.md
- type: api-contract
- content: Reusable CSS classes to be added to `hifi-tokens.css`: `.hifi-fade-in` (opacity 0→1), `.hifi-fade-out` (opacity 1→0), `.hifi-slide-up` (translateY(12px)→0 + fade), `.hifi-slide-down` (translateY(-12px)→0 + fade), `.hifi-scale-in` (scale(0.96)→1 + fade), `.hifi-slide-in-right` (translateX(24px)→0 + fade), `.hifi-slide-out-right` (translateX(0)→24px + fade).

## useHifiTransition helper contract
- source: docs/superpowers/specs/2026-07-05-animacoes-menus-filtros-design.md
- type: api-contract
- content: `useHifiTransition(open, duration)` React helper, defined in `v11-character-editor.jsx` and exposed on `window` for reuse between `v10-hifi.jsx` and `v11-character-editor.jsx`. When `open` becomes `true`: returns `{ mounted: true, cls: 'hifi-fade-in' }` (or desired entry class). When `open` becomes `false`: returns `{ mounted: true, cls: 'hifi-fade-out' }` and schedules unmount after `duration`. Exposes empty `cls` when not mounted. Concrete signature per implementation plan: `function useHifiTransition(open, duration = 180)` returning `{ mounted: boolean, cls: string }`, attached as `window.useHifiTransition`.

## Components requiring open/close animation
- source: docs/superpowers/specs/2026-07-05-animacoes-menus-filtros-design.md
- type: nfr
- content: Desktop — character menu (backdrop fade, content scale-in/fade-out), filter dropdowns (`FilterChipDropdown`, slide-up/fade-out), "+ mais" filter menu (`HifiAddFilter`, slide-up/fade-out), character editor (backdrop fade, panel slide-in-right/slide-out-right), side detail panel (content slide-in-right on open only, width transition untouched). Mobile — character sheet bottom sheet (backdrop fade, sheet slide-up/slide-down), fullscreen editor (fade or scale-in), spell detail screen (slide-in-right/slide-out-right).
