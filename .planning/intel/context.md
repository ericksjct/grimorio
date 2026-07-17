# Context

## Animations implementation plan — architecture and file structure
- source: docs/superpowers/plans/2026-07-05-animacoes-menus-filtros-plan.md
- Tech stack: React puro, JSX via Babel/browser, CSS em `hifi-tokens.css` (no bundler identified).
- File structure: `hifi-tokens.css` (keyframes + reusable transition classes), `v11-character-editor.jsx` (defines and exposes `useHifiTransition` on `window`), `v10-hifi.jsx` (applies animations to components currently missing transitions).
- 11 tasks total, task-by-task with commit steps per task (git add + git commit per task).

## Known gap — Task 10 (mobile spell detail screen) needs refactor
- source: docs/superpowers/plans/2026-07-05-animacoes-menus-filtros-plan.md
- The mobile detail screen is currently an early `return` inside `if (sel)` in `HifiMobile`, which is incompatible with `useHifiTransition`'s mount/unmount coordination as-is. Plan flags this as unresolved: the implementer must decide between extracting a `HifiMobileDetailScreen` component or using an inline wrapper (`showDetail = !!sel`) to correctly coordinate exit animation. Plan explicitly calls this "esta alteração é maior; considere extrair `HifiMobileDetailScreen`."

## No automated frontend test suite
- source: docs/superpowers/plans/2026-07-05-animacoes-menus-filtros-plan.md
- Project has no configured frontend test suite (only openspec/playwright present in package.json per plan's self-review). Verification for this animation work is manual only (Task 11: browser checks for desktop/mobile animations, reduced-motion emulation, focus/Escape behavior, and all 6 themes).

## Animation baseline prior to this work
- source: docs/superpowers/specs/2026-07-05-animacoes-menus-filtros-design.md
- Existing animations before this spec: card hover, toast (`hifi-toast-in`), editor slide-in (`hifi-slide-in`), and side-panel width transition. Interactions identified as missing animation: desktop character menu, filter dropdowns, "+ mais" filter menu, desktop editor exit, side detail panel content, mobile character sheet, mobile fullscreen editor, mobile spell detail screen.
