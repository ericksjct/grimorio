# Project Research Summary

**Project:** Grimório do Jogador, milestone v2.1 "Simplificação e Manutenção"
**Domain:** Pure refactor (zero user-visible change) of a no-build React 18 + Babel-standalone PWA
**Researched:** 2026-10-23
**Overall confidence:** HIGH for inventories and locations; MEDIUM for line savings and cascade-dependent CSS items

## Executive Summary

v2.1 is a codebase audit with four inputs: dead code, duplication, structure and naming, and repo clutter plus tests. The app is a classic-script, no-build site. Every `.jsx` file loads through a `<script src>` in `index.html`, all files share one global scope, and load order is strict. So a file move is safe only when `index.html`, the `sw.js` PRECACHE and the test suite move with it.

Dead code is about 630 to 710 removable lines. Duplication is about 550 to 650 lines; the two overlap and are not additive. Structure work splits 16 source files (8 over 500 lines) into about 43 JSX and 6 CSS files under `src/<layer>/`. Repo cleanup removes about 2.2 MB of agent tooling and OpenSpec leftovers from git. The 44 PowerShell test scripts consolidate into 12 files plus 2 helpers.

The main risk is the test suite. Most gates grep one named file's source text, or load one `.jsx` in a Node `vm` with a stub `window`. Moves and dedupes either fail a gate loudly or pass while checking nothing. Several gates pin dead code, so each deletion must edit its gate in the same commit. Recommended path: clean the repo, build path-agnostic test helpers and a safety net, remove dead code, dedupe, and move files last, running gates after every step.

## Key Findings

### Dead code (DEAD-CODE.md)

- Counts: 26 JS/JSX items (DC-01..26), 6 theme-plumbing items (DC-30..35), dead CSS rule groups (DC-40..48) plus 6 overridden declarations (3.2), 4 unused i18n keys plus 5 test-only and 2 transitive keys, about 25 dead load-order guards, about 30 stale comments.
- Top items: the theme selector is gone from the UI, but 4 themes (`nord`, `monokai`, `solarized`, `parchment`) still ship in CSS (~102 lines) and `THEME_PALETTES` (~41 lines); `theme` is passed to 8 components and is always `'daylight'`. Single-entry print path (`hifiPrint`, `hifiPrintList`, `hifiShare`, modes `single`/`list`, ~70 lines). `HifiMobilePhone` uses undefined `IOSDevice`. `exportPack()` has no button, yet STOR-03 is marked Validated.
- Test-locked dead code: `hifiShare`, `_isSrdBuiltin`, `toggleBookmarkedFor`, 5 `manager.*` keys, `exportPack`, `hifiSiblingVersion` second `find`.
- Confidence: HIGH for "no reference" items; MEDIUM for load guards and CSS overrides; LOW for Marauder Display fallback use.

### Duplication (DUPLICATION.md)

- 17 clusters (D1..D17), ~550 to 650 lines. Most duplication is in `v10-hifi.jsx`.
- Top clusters: D3 theme class string (9 copies, low risk); D6 sort/collator/query/labels (low); D7 slug normalization (low; keep `slugify` in `generate-srd-pack.mjs` and runtime `hifiSpellSlug` separate); D8 `v8*` accessors into `spellTexts()` (low); D5 toast dispatch (13 copies, low); D14 CSS patch layers, reduced-motion blocks, keyframes, font stacks (low-medium); D1 desktop vs mobile in `v10-hifi.jsx` (~170 lines, medium; keep the three clear-all semantics and memo callback identity); D2 modal shell and `useDialogA11y` (~80 lines, medium, visual; move `useDialogA11y` out of the editor).
- Do-not-merge (16 items): runtime palettes vs CSS tokens (different colors); the 11 CSS palette blocks; pack schema mirrors (deliberate no-dependency design); Node slugify; School filter order; concentration/ritual literals (visible text differs by screen); test-sandbox `window.tt ?` guards.
- Confidence: HIGH for locations; MEDIUM for line savings.

### Structure and naming (STRUCTURE.md)

- Today: 16 source files, 8 over 500 lines. `v10-hifi.jsx` (2781 lines) has 14 jobs; `v11-character-editor.jsx` (1211) has 7; `spells-data-loader.jsx` (1010) has 9; `index.html` holds ~490 lines of app code. 278 top-level names, 0 duplicates at baseline.
- Target: `src/` with layers `core`, `spells`, `characters`, `ui`, `pack-system`, `spellbook`, `app`, plus 6 CSS files. Root keeps only URL/location contracts: `index.html`, `pack-docs.html`, `sw.js`, `manifest.json`, `favicon.svg`, `pack.schema.json`, `srd-reserved-slugs.json`, `.nojekyll`, `design.md`, and the `packs/`, `fonts/`, `marauder/`, `scripts/`, `docs/` folders.
- Naming: kebab-case, base name unique repo-wide, `<domain>-<thing>`, closed suffixes (`-store`, `-rules`, `-state`, `-hooks`, UI kinds). Ban `helpers`, `utils`, `v7`–`v11`, `hifi`, `prototype`, `canon` in file names.
- Folders work under Babel-standalone and shared globals (tested in headless Chrome, 2026-10-23).
- Confidence: HIGH for map and layout; MEDIUM for Firefox/Safari `file://` (untested); LOW for boot-time impact of 12 to 43 requests (unmeasured).

### Repo and tests (REPO-AND-TESTS.md)

- Clutter: 110 tracked files (2.2 MB) under `.claude/` (19 skill folders, 6 OpenSpec commands); nothing reads them. Untrack and gitignore. `openspec/config.yaml` is the only file there: delete. Delete the 4 `openspec*` npm deps and `package-lock.json`; keep `package.json` scripts `test` and `packs`. Untrack `skills-lock.json` and `*.code-workspace`. Delete one-shots `scripts/extract-ptbr-source.mjs` and `scripts/build-legacy-fixtures.mjs` (inputs not in repo). Peacock tool (`sync-vscode-peacock-catppuccin.ps1` + test) is personal: delete. Delete `marauder/webfonts/Marauder-Display-BoldItalic.woff2` (no `@font-face`). `.nojekyll` means Pages publishes all tracked paths. Untrack 10 `.planning/**/.cache/*.json` files.
- Tests: baseline `pwsh scripts/run-tests.ps1` PASSES (~18 s). 44 scripts (PROJECT.md says 50; stale). 19 write temp `.cjs` and run Node. Target 12 files + `scripts/lib/test-helpers.ps1` + `scripts/lib/node-harness.cjs` (~45% of lines; estimate).
- Side effect: `check-packs-index.tests.ps1` rewrites `packs/index.js` every run. Fix: compare in memory.
- Confidence: HIGH (grep or file read behind each item); 45% size estimate MEDIUM.

## Cross-cutting Risks

1. **Gates that grep named files.** Renames and splits break gates by name. Gates scanning "all `*.jsx` in root" are non-recursive and silently check nothing after a move. Fix: `src-map.json`, `Find-DefiningFile`, recursive `Get-AppSource` asserting a minimum file count.
2. **vm single-file cuts.** Gates cut `spells-data-loader.jsx` at `function buildSpellsFromRealData`, `v11-character-editor.jsx` at `function useCharacters`, `i18n.jsx` at comment `// Helper bilíngue`; others regex-extract bodies closing with `}` at column 0. Fix: load whole JSX-free files; anchor on function names, not comments.
3. **Exact counts.** Gates pin 5 `dangerouslySetInnerHTML` sinks, 2 `const uiLang = lang;`, 2 `<HifiLangToggle>` mounts, `NEW_KEYS.length === 28`, 339 pt-BR spells, 10 filter keys, `JSON.parse(` once. Keep counts in one owned table; update in the same commit as any dedupe.
4. **Comment anchors and bounded windows** (`{0,N}` around `HifiSpellCard`, `useEditionCompare`, `HifiLangToggle`) break when `v10-hifi.jsx` is split.
5. **sw.js:** any PRECACHE add/remove/rename/content change needs a `CACHE_VERSION` bump (now `grimorio-v8`). Index script order must match PRECACHE (gated). Non-precached deletions need no bump.
6. **Load-time statements:** `window.__legacyVersionFallback = null` before `_initialSelection()`; boot preload last in last spell-data file; `SPELL_VERSIONS` mutated in place; duplicate top-level names silently override (gate G4).
7. **file:// already broken.** Default Chrome blocks XHR for root `.jsx` over `file://` (CORS). PROJECT.md still claims support; correct it. Verify with `npx http-server -p 8123` and GitHub Pages.
8. **CRLF.** All app files are CRLF; use `split(/\r?\n/)`; use `git mv`; case-only renames fail on NTFS.
9. **Deploy skew.** Pages caches ~10 min; an old `index.html` may request a deleted file briefly. No stub files.
10. **User data and contracts.** Do not rename storage keys (`hifi_chars_v1`, `hifi_bookmarks_v1`, `spellbook-ui-prefs`, `spellbook-onboarding-v1`, `hifi_session_v1`, `hifi_session_view_v1`), IndexedDB `grimorio-plugins`, events `hifi-*`, `.hifi-*` CSS classes, public URLs. Keep legacy migration code (`LEGACY_VERSION_FALLBACK`, `loadBookmarks` migration, `LEGACY_ACCENT_MAP`, `+` fix in `decodeSharedBuildPayload`, `SOURCE_CODE`).

## Implications for Roadmap

Order: repo cleanup, then tests (path-agnostic helpers + safety net), then dead code and dedupe, file moves last.

**Phase A. Repo cleanup (no app change).** Untrack `.claude/skills/`, `.claude/commands/`, `skills-lock.json`, `*.code-workspace`, `openspec/`; extend `.gitignore`; keep `.claude/launch.json`. Delete `openspec/config.yaml`, the 4 openspec deps, `package-lock.json`, BoldItalic font, one-shots, Peacock tool. Untrack `.planning` cache files. Fix `check-packs-index` write. Gate: suite green.

**Phase B. Test helpers, safety net, consolidation.** Add `scripts/lib/test-helpers.ps1`, `scripts/lib/node-harness.cjs`, `scripts/lib/src-map.json`. Safety net: G2 boot smoke (headless, zero console errors), G3 shell parity (`index.html` / PRECACHE / disk), G4 symbol preservation, G6 screenshots (desktop/mobile, light/dark; baseline captured here). Port tests to 12 area files; delete old scripts as content lands; a `retired-identifiers` table lists every deletion. Coverage check: each old `throw` message appears in a new script.

**Phase C. Dead code removal (one commit per group, leaf-first).** i18n dead keys; CSS dead rules/keyframes; JS with no caller; print single/list modes; theme plumbing; `adaptSpell` and loader dead fields; unreachable branches (incl. dead `alsoIn` branch); CSS overrides (visual check); `exportPack`; load-order guards; stale comments. Each group edits its gates in the same commit.

**Phase D. Deduplication.** Low-risk helpers first (D3, D6, D7, D8, D5, D4, D11), then CSS (D14), then D9, D16, D12, D13, D17, then D2 (dialog shell + `useDialogA11y` into a `ui` file) and D1 (desktop/mobile twins). Keep the 16 do-not-merge items. Screenshot diff for D1, D2, D14.

**Phase E. File moves (last; `git mv` where possible).** Recursive-scan assertion; CSS split into `src/styles/` (fix `url()` paths; update `<link>` in `index.html` and `pack-docs.html`; bump SW); whole-file moves; peel foundations (`core/prefs-store`, `ui/overlay-hooks`, `ui/toast`, `spells/*`, `characters/*`); move inline `index.html` app to `src/app/*`; split `v10-hifi.jsx` leaf-first; split `v11-character-editor.jsx`; split pack files; `spells-data-loader.jsx` last. Close: final load order, SW bump, rewrite `design.md`, regenerate `.planning/codebase/`, all gates, boot-time before/after.

Optional later (not v2.1): split inside `HifiDesktop`, `HifiMobile`, `CharacterEditor`.

**Pending todos:**

- `bandeiras-do-toggle-nao-renderizam-no-windows`: owner decision; any change is visible.
- `i18n-import-successcount-plural`: dead `alsoIn` branch goes in Phase C; `1 magias.` plural is a visible text fix.
- `review-04-1-warnings`: WR-06 closes in Phase C; WR-01..05 are behavior/text fixes.
- `review-05-warnings`: WR-01 already resolved (commit `8ec6b5a`); WR-02 is a behavior change; read `05-REVIEW.md` before touching `pack-manager.jsx`.

## Open Decisions for Owner

Decided 2026-10-23: remove dead themes (incl. Catppuccin base, fix `pack-docs.html`); remove `exportPack`, print single/list modes + `hifiShare`, transition banner, and "design study" footer; layout `src/<layer>/`; keep `Hifi*` identifiers and `.hifi-*` classes.

Still open (see requirements step): visible fixes in pending todos (flags, plural, 04.1 WR-01..05, 05 WR-02), `pack-docs.html:420/425` text, `packs/index.js` XHR fallback, `pluginStore` rename (recommended out), Tier B merges (recommended no), test-only `window.*` exports, one-shot scripts, Peacock tool, Marauder Display fonts, `docs/` location, `.planning` cache untrack, `hostile-html.json`, `file://` claim in PROJECT.md.

## Confidence Assessment

| Area | Confidence | Notes |
|---|---|---|
| Dead code | HIGH items / MEDIUM lines | Grep-verified; load guards and CSS overrides need runtime check |
| Duplication | HIGH locations / MEDIUM lines | Read in source; overlaps dead code |
| Structure | HIGH map / MEDIUM cross-browser | Chrome headless only; boot cost unmeasured |
| Repo and tests | HIGH | Baseline suite passes; 45% estimate MEDIUM |
| Todos | HIGH | Read in full except `05-REVIEW.md` (not read) |

Gaps: `05-REVIEW.md` unread; no browser run of app during audit; no visual baseline yet (capture before dead-code removal); boot time unmeasured; PROJECT.md test count (50) is stale vs 44.

## Sources

- `.planning/research/DEAD-CODE.md`, `DUPLICATION.md`, `STRUCTURE.md`, `REPO-AND-TESTS.md`
- `.planning/PROJECT.md`
- `.planning/todos/pending/*.md` (4 files)
