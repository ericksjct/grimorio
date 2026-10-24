# Repo clutter and test scripts audit (milestone v2.1)

**Researched:** 2026-10-23
**Method:** read the repo (`git ls-files`, grep for references, read all 44 test scripts) and ran `pwsh scripts/run-tests.ps1` once. No web search.
**Confidence:** HIGH (every classification is backed by a grep or a file read).

---

## 1. Summary

**Repo**
- 110 tracked files (2.2 MB) under `.claude/` are agent tooling. Nothing in the app, in `sw.js`, or in a test reads them. `skills-lock.json`, `openspec/`, the `openspec*` npm deps, `package-lock.json`, `grimorio-do-jogador.code-workspace` and the Peacock sync script belong to the same group. All of it can leave the repo.
- Never-used OpenSpec: `openspec/` holds only `config.yaml`. There are no `specs/` or `changes/` files in git. The 6 `openspec-*` skills and the 6 `opsx` commands have nothing to operate on.
- `package.json` is only useful for two scripts (`test`, `packs`). Its four `dependencies` are all OpenSpec tools. Tests need only global `node` and `pwsh`. Remove the deps and delete `package-lock.json`.
- Dead asset: `marauder/webfonts/Marauder-Display-BoldItalic.woff2` has no `@font-face`. The two "Marauder Display" faces are only a fallback behind Texturina in `.hifi-display`. They are almost certainly never painted. Check this with QA before you delete them (see 2.3).
- Dead code protected by a test: `hifiShare()` in `v10-hifi.jsx:121` has no call site. `check-content-lang-ownership` (assertion 7) pins its signature, so the test must change in the same commit that removes it.
- Two scripts are finished one-shots: `scripts/build-legacy-fixtures.mjs` and `scripts/extract-ptbr-source.mjs`. Their outputs are committed. They need the gitignored PHB translation, a local `.cache/`, and git commit `98740fe^`. This is a user decision (see 2.2).
- `generate-srd-pack.mjs`, `build-packs-index.mjs`, and `scripts/srd-sources/*` are real BUILD tools. They regenerate shipped artifacts: `packs/*.json`, `srd-reserved-slugs.json`, `packs/index.js`. Keep them. Tests read their source text.
- GitHub Pages: `.nojekyll` is tracked. With it, GitHub serves every tracked file, including dot-folders. So `/.claude/**`, `/.planning/**`, `/scripts/**` and `/docs/**` are public today. Untracking `.claude/` removes 2.2 MB of public clutter.

**Tests**
- Baseline: **PASS**. `pwsh scripts/run-tests.ps1` ended with `All test scripts passed.` Wall time about 18 s. There are **44** `*.tests.ps1` files (43 `check-*` plus 1 `sync-vscode-*`), 6,392 lines. PROJECT.md says "50"; that number is stale.
- 19 of the 44 embed a Node program in a PowerShell here-string, write it to a temp `.cjs`, and run it. 25 are source-text greps only.
- The same things are asserted many times (see section 4.3): load order in 5 files, the `CACHE_VERSION` floor in 4, the "single active version is gone" idea in 8, the exact count of 5 HTML sinks in 2, the i18n vm load plus `i18nParityCheck()` in 4. Boilerplate (temp `.cjs`, fake `localStorage`, loader vm sandbox, regex function extraction) is copied across files.
- Proposal: **44 files to 12**, plus `scripts/lib/test-helpers.ps1` and `scripts/lib/node-harness.cjs`. Every still-relevant check keeps a new home (section 5). Estimated size is about 45% of today's lines. This is my estimate, not a measurement.
- The main danger for the refactor is rename and move fragility (section 6). Five tests cut a source file at a hard-coded function name or comment (`function buildSpellsFromRealData`, `function useCharacters`, `// Helper bilíngue`). Many assert exact counts. About 13 tests read App code from `index.html` and will break if the inline script moves out. Two tests read `.planning/` documents.
- Side effect found: `check-packs-index.tests.ps1` runs `node scripts/build-packs-index.mjs`. That **rewrites `packs/index.js` in the working tree** on every test run. `git status` shows `M packs/index.js` afterwards. Fix: in the new version, compare in memory.

---

## 2. Repo inventory

Class legend: **RUNTIME** (served or loaded by the app, or in the `sw.js` precache); **BUILD** (regenerates a shipped artifact); **TEST** (gate); **DOCS** (human documentation); **PERSONAL/TOOLING** (editor or agent config); **DEAD** (nothing uses it).

### 2.1 Top-level items

| Item | Class | Evidence (who references it) | Action |
|---|---|---|---|
| `index.html` | RUNTIME | entry point; `sw.js` PRECACHE; many tests | keep |
| `hifi-tokens.css` | RUNTIME | `<link>` in index.html; PRECACHE | keep (split is a separate v2.1 task) |
| `grimorio-helpers.jsx`, `i18n.jsx`, `plugin-store.jsx`, `spells-data-loader.jsx`, `pack-import.jsx`, `v11-character-editor.jsx`, `pack-rename-dialog.jsx`, `pack-import-dialog.jsx`, `pack-manager.jsx`, `transition-banner.jsx`, `v10-hifi.jsx` | RUNTIME | all 11 are `<script type="text/babel" src>` in index.html (lines 131-141) and in PRECACHE | keep (renames update index.html order and PRECACHE) |
| `sw.js` | RUNTIME | registered by index.html | keep |
| `manifest.json` | RUNTIME | `<link rel=manifest>`; PRECACHE | keep |
| `favicon.svg` | RUNTIME | index.html, manifest, PRECACHE | keep |
| `pack.schema.json` | RUNTIME (published asset) | PRECACHE; linked from `pack-docs.html`; `check-pack-validator` and `check-pack-format` compare it to the code | keep |
| `pack-docs.html` | RUNTIME | linked from `pack-import-dialog.jsx:222` and `pack-manager.jsx:706`; PRECACHE; fetches `srd-reserved-slugs.json` | keep |
| `srd-reserved-slugs.json` (118 KB) | RUNTIME | `pack-import.jsx:388` fetch; `pack-docs.html:467` fetch; PRECACHE; generated by `generate-srd-pack.mjs:906` | keep. Must be regenerated whenever an SRD pack changes (a test enforces it). |
| `packs/` (3 SRD json + `srd-2024-adicionais.json` + 3 png + `index.js`) | RUNTIME | index.html loads `packs/index.js`; PRECACHE derives file list from `BUILTIN_PACKS`; png are `image` in the manifest. `index.js` is generated by `build-packs-index.mjs` | keep. `packs/index.js` is a BUILD output. |
| `fonts/` (4 woff2) | RUNTIME | `@font-face` hifi-tokens.css:56-80; PRECACHE | keep |
| `marauder/webfonts/` Text-Regular, Text-Italic, Text-Bold, Text-BoldItalic | RUNTIME | `@font-face` hifi-tokens.css:4-26; "Marauder Text" is used in 15 CSS rules. NOT in PRECACHE (only runtime stale-while-revalidate) | keep |
| `marauder/webfonts/Marauder-Display-Regular.woff2`, `-Bold.woff2` | RUNTIME but near-dead | `@font-face` lines 32-40; used only as 2nd family in `font-family: 'Texturina', 'Marauder Display', Georgia` (css:285; v11-character-editor.jsx:1057, 1116). Texturina is precached and always loads first | **QA decision**: delete 2 files + 2 `@font-face` + the fallback name, or keep. Risk is low but not zero. |
| `marauder/webfonts/Marauder-Display-BoldItalic.woff2` | **DEAD** | `grep` finds no `@font-face` and no reference anywhere | delete |
| `marauder/LICENSE.md` | RUNTIME (license duty) | covers the shipped fonts | keep while any Marauder font ships |
| `.nojekyll` | RUNTIME (hosting) | empty file, keeps Jekyll off | keep (see 2.4) |
| `.gitignore` | TOOLING (needed) | | keep, extend (see 2.5) |
| `design.md` (7.7 KB) | DOCS | only reference: comment in `hifi-tokens.css:1309` ("como manda o design.md"); names `index.html`, `hifi-tokens.css`, `v10-hifi.jsx` | keep; update names after the rename. Optional: move to `docs/`. |
| `docs/` (4 files: 1 audit + 3 superpowers specs/plan) | DOCS (history) | not referenced by the app or tests. Only `.planning/PROJECT.md` and comments cite them. `docs/superpowers/herois_anonimos/` is gitignored | keep, or move under `.planning/` |
| `.planning/` | DOCS (GSD) | | keep (instruction). Note `check-csp` reads `.planning/codebase/CONCERNS.md` (see section 6). |
| `.claude/launch.json` (209 B) | PERSONAL/TOOLING | defines a preview server (`http-server -p 8123`) | **keep tracked** (tiny, documents how to run), or drop. Low value either way. |
| `.claude/skills/**` (19 skill folders incl. `impeccable` with 83 files; about 2.2 MB total for `.claude/`) | PERSONAL/TOOLING | no app, `sw.js`, test or doc reference. Only `skills-lock.json` and impeccable's own `cleanup-deprecated.mjs` point at each other | **untrack + gitignore** (`git rm -r --cached`) |
| `.claude/commands/opsx/*` (6 files) | PERSONAL/TOOLING + DEAD | OpenSpec slash commands; OpenSpec is unused | **untrack + gitignore** |
| `skills-lock.json` | PERSONAL/TOOLING | lockfile of the 13 `Leonxlnx/taste-skill` skills in `.claude/skills` | **untrack + gitignore** |
| `openspec/config.yaml` | **DEAD** | the only tracked file in `openspec/`. The folder has no `specs/` or `changes/`. Referenced only by the `openspec-*` skills and `docs/.../plan.md` prose | delete |
| `package.json` | BUILD/DEV (partly) | scripts `test` (`pwsh -NoProfile -File scripts/run-tests.ps1`) and `packs` (`node scripts/build-packs-index.mjs`) are referenced in comments of `run-tests.ps1`, `build-packs-index.mjs`, `check-packs-index`. The 4 `dependencies` (`openspec`, `openspec-buddy`, `openspec-extensions`, `openspec-playwright`) are used by nothing in the repo | keep file, **delete the `dependencies` block** |
| `package-lock.json` (47 KB) | DEAD after the line above | locks only the OpenSpec deps; local `node_modules/` (ignored) has them | delete, and delete local `node_modules/` |
| `grimorio-do-jogador.code-workspace` | PERSONAL | Peacock colors and `liveServer.settings.port`. Only reader: `sync-vscode-peacock-catppuccin.ps1:93` | **untrack + gitignore** (`*.code-workspace`) |
| `capture-scroll.js` (on disk, not tracked) | untracked | already in `.gitignore:18` | none |

### 2.2 `scripts/` (54 tracked files)

| Item | Class | Evidence | Action |
|---|---|---|---|
| `run-tests.ps1` | TEST runner | globs `scripts/*.tests.ps1`, one `pwsh` process each. `package.json` `test` calls it. PROJECT.md names it as the verification command | keep (keeps the glob; helpers go in `scripts/lib/` so they are not globbed) |
| 43 `check-*.tests.ps1` | TEST | section 4 | consolidate (section 5) |
| `sync-vscode-peacock-catppuccin.ps1` (169 lines) + `.tests.ps1` | PERSONAL | edits `%APPDATA%\Code\User\settings.json` and `*.code-workspace` Peacock colors. Nothing in the app depends on it. The test is in the gate, so a personal tool slows and couples the project gate | **delete both** (or move out of the repo). Remove from the gate either way. |
| `build-packs-index.mjs` | BUILD | writes `packs/index.js`; `npm run packs`; guarded by `check-packs-index` | keep |
| `generate-srd-pack.mjs` (964 lines) | BUILD (rarely run) | writes `packs/srd-2014-en.json`, `srd-2024-en.json`, `srd-2024-ptbr.json` and `srd-reserved-slugs.json`. Tests grep its source for `applyClassLists`, `markUpgradeHeading`, `buildReservedSlugs`, `--reserved-only`, `parsePtbr52`, `modificationNote`, and ban `spells-5E`, `readdir`, `glob(`, `herois_anonimos`, `legacy-fixtures` (provenance rules). Imported by `build-legacy-fixtures.mjs` (`validatePackAgainstSchema`) | keep. If `build-legacy-fixtures.mjs` is deleted, the `export` of `validatePackAgainstSchema` becomes unused. |
| `srd-sources/srd-5.2-spells.json` (354 KB) | BUILD input | read by `generate-srd-pack.mjs` (SRD 5.2 EN) | keep |
| `srd-sources/srd-5.2-ptbr-source.json` (393 KB) | BUILD input | read by the generator for the pt-BR pack; also by `check-srd-ptbr-pack` | keep |
| `srd-sources/srd-5.2-ptbr-pairing.json` (2 KB) | BUILD input | generator; `check-srd-ptbr-pack` | keep |
| `extract-ptbr-source.mjs` (325 lines) | **DEAD one-shot** | header says "one-shot, run by hand ONLY". Input is `docs/superpowers/herois_anonimos/*.md` (gitignored, never in the repo) plus `.cache/legacy-fixtures` (from the next script). Output (`srd-5.2-ptbr-source.json`) is committed. Only a test error message mentions it | **delete** (history keeps it). User decision: only keep if a re-run for a new Heróis Anônimos revision is planned. |
| `build-legacy-fixtures.mjs` (102 lines) | **DEAD one-shot** | rebuilds the 4 deleted copyrighted JSONs from commit `98740fe^` into ignored `.cache/`. Only consumer: `extract-ptbr-source.mjs` | **delete** together with the extractor |
| `qa-fixtures/hostile-html.json` | DEV aid | not loaded by any script. Only reference is a negative test ("sw.js must not precache qa-fixtures"). It is hand-import input for hostile-HTML QA | keep for manual/headless QA, or move to a `tests/fixtures/` folder when tests move. Do not delete without an automated sanitize test. |

### 2.3 Dead code found while auditing tests (feeds the dead-code phase)

| Item | Evidence | Note |
|---|---|---|
| `hifiShare(s, uiLang, versionLang, show)` `v10-hifi.jsx:121` | `grep hifiShare`: only the definition and a comment (line 189). No call. | Test `check-content-lang-ownership` assertion 7 requires this exact signature. Delete both together. |
| `const uiLang = lang;` alias in HifiDesktop and HifiMobile | `check-ui-lang-toggle` assertion 8 demands exactly 2 occurrences | A readability alias protected by a count. Remove only if you remove the assertion. |
| `hifiTitleCaseFilterLabel` | `check-class-filter-labels` pins it as "still used internally" | Verify it is still used before pinning. |
| 6 dead i18n keys (`version.label`, `.labelMobile`, `.switch`, `.manage`, `toast.versionShort`, `toast.versionSwitchedAway`) | already removed; `check-i18n-pack-menu` guards them | Good model: a dead-key list is cheap. The dead-key phase can extend it. |

### 2.4 GitHub Pages implications

- `.nojekyll` is tracked. Jekyll is off, so GitHub publishes **every tracked path**: `/.claude/**` (2.2 MB of skill text), `/.planning/**`, `/scripts/**` (including 750 KB of `srd-sources`), `/docs/**`, `/openspec/config.yaml`, `/package.json`.
- Not a security issue (no secrets seen), but it adds public clutter. Untracking `.claude/`, `openspec/` and `*.code-workspace` removes it. `.planning/` stays public by your instruction.
- PRECACHE is an allow-list in `sw.js`. Deleting a non-precached file (the Marauder BoldItalic, `.claude/`, `scripts/`) needs **no** `CACHE_VERSION` bump. Removing a PRECACHE entry **does** need a bump (comment in `sw.js:10-13`).
- Renaming or splitting any app file: update the `<script>` order in `index.html`, the `PRECACHE` list in `sw.js`, and bump `CACHE_VERSION` (current `grimorio-v8`; the content of already-cached files changes). Tests enforce the floor only (see 4.3).
- `check-pack-wiring` asserts `sw.js` never mentions `qa-fixtures`. Keep that rule if the fixture moves.

### 2.5 `.gitignore` coverage

Already ignored: `node_modules/`, `.vscode/`, `.idea/`, `.superpowers/`, `.cache/`, `.temp/`, `debug-*.png`, `v10-*.png`, `scroll-*.png`, `capture-scroll.js`, `docs/superpowers/herois_anonimos/`. `.claude/settings.local.json` and `.claude/worktrees` are excluded by the global git ignore and `.git/info/exclude`, not by the repo `.gitignore`.

Add to `.gitignore` (so the untrack sticks for every clone):
```
.claude/skills/
.claude/commands/
skills-lock.json
*.code-workspace
openspec/
```
Also decide about `.claude/settings.local.json` and `.claude/worktrees/` (add them so a fresh clone is safe).

Also found: 10 files under `.planning/**/.cache/` are tracked even though `.cache/` is ignored. The git status snapshot shows them renamed to `.planning/milestones/v2.0-research/.cache/`. This is GSD research cache; ask whether to untrack it (a one-line `git rm -r --cached`).

---

## 3. Test baseline

```
pwsh scripts/run-tests.ps1
...
All test scripts passed.
real 0m18.4s
```

- Result: **PASS**, 44 scripts, 0 failures, no warnings (the only output line containing "fail" is the success message of `check-plugin-store`).
- Side effect: working tree shows `M packs/index.js` afterwards (see summary). The diff is empty after normalization (line endings), but the file is rewritten every run.
- Runtime needs: PowerShell 7 (`Join-Path a b c`, `utf8NoBOM`), global `node`, `git` (two tests call `git ls-files`). No npm packages.
- 18 of the 19 node-based scripts have a silent "node not found, skip proof" branch. In the consolidated suite make a missing `node` a hard failure once, in the helper.

---

## 4. Test inventory

Type: **S** = source-text grep only; **R** = also runs production code in Node (vm or `eval` of regex-extracted functions). "History" = guards a finished migration or a past review finding.

### 4.1 Per-script table

| # | Script (lines) | What it checks (one line) | Reads / loads | Type | Dead or one-off? | Overlap |
|---|---|---|---|---|---|---|
| 1 | check-bookmarks-read-purity (222) | `peekBookmarks/peekCharacters` never write; `loadCharacters` never fakes the default; `loadBookmarks` migrates once | `pack-manager.jsx`, `v11-character-editor.jsx` (functions eval'd) | R | live invariant | fake localStorage also in #40, #34 |
| 2 | check-browser-language-detection (31) | `browserLanguageCandidates` + any `pt*` rule in index.html and loader | `index.html`, `spells-data-loader.jsx` | S | past bug WR-02 | loader half is provable at runtime in #33 |
| 3 | check-class-filter-canonical (55) | class filter matches by canonical EN value (`classesEn`) | `v10-hifi.jsx` | S | regression guard CR-01 | #4, #11 |
| 4 | check-class-filter-labels (23) | `hifiClassFilterLabel` wired on desktop and mobile | `v10-hifi.jsx` | S | duplicate | subset of #11 (assertion 1) |
| 5 | check-class-filter-options (18) | old hardcoded caster list gone | `v10-hifi.jsx` | S | History | |
| 6 | check-content-lang-ownership (140) | content follows `s.lang`; chrome follows `uiLang`; 5 sinks have `lang=` | `v10-hifi.jsx` | S | live; **#7 pins dead `hifiShare`** | sink count also in #26 |
| 7 | check-csp (72) | CSP meta equal on 2 pages; no `connect-src`/`img-src`; Babel kept; CONCERNS.md has D-10 | `index.html`, `pack-docs.html`, **`.planning/codebase/CONCERNS.md`** | S | live (except §6) | |
| 8 | check-decommission (143) | 4 legacy JSONs absent; PRECACHE has no hand-listed JSON; loader has no `.json` refs; BUILTIN files exist | `sw.js`, loader, `packs/index.js`, `git ls-files` | R (small) | **History** (MIGR-02 done), partly live | PRECACHE parts overlap #28 |
| 9 | check-edition-compare (215) | `useEditionCompare` matches by edition and SRD corpus; `hifiSiblingVersion` proven by eval | `v10-hifi.jsx`, `packs/index.js` | R | live | `getCurrentSpellVersion` ban dupes #22 |
| 10 | check-editor-version-lang (58) | editor names use `s.lang`; no global active version | `v11-character-editor.jsx` | S | live + History | #22 ban |
| 11 | check-filter-lang-vocabulary (100) | filter labels, school name, class label, yes/no follow `uiLang` | `v10-hifi.jsx` | S | live + History (`remapClassFilter`) | #4, #32 |
| 12 | check-i18n-pack-menu (177) | 28 new Phase-8 keys exist, parity, placeholders, plural, no `(s)`; 6 dead keys gone in all files | `i18n.jsx` in vm; scans all `*.jsx` + index.html | R | live + History | vm and parity also in #24, #26, #40 |
| 13 | check-loader-hardening (202) | proto-less lookup tables (CR-03); hostile pack proof; `?f.*` key allow-list; no re-render loop | loader (cut at `function buildSpellsFromRealData`), `v10-hifi.jsx`, `packs/index.js` | R | regression guards, live | sandbox shared with #14, #22, #33 |
| 14 | check-migration-version-fallback (137) | legacy version-key fallback map; `_initialSelection` returns normalized list | loader (map eval'd) | R | live (users still have old prefs) | #33 |
| 15 | check-onboarding-editor-transition (32) | onboarding to editor CSS classes + reduced motion | `index.html`, `hifi-tokens.css` | S | style pin | #16, #19 |
| 16 | check-onboarding-modal-balance (19) | `minHeight 320`, right panel centered, not 360 | `index.html` | S | one-off UI tweak | #17 |
| 17 | check-onboarding-modal-layout (19) | shared `minHeight 320`, left panel `flex-start` | `index.html` | S | one-off UI tweak | #16 |
| 18 | check-onboarding-modal (29) | OnboardingModal strings, `ONBOARDING_SEEN_KEY`, `persistBookmarks` exists | `index.html`, `v11-character-editor.jsx` | S | live (wording pins) | |
| 19 | check-onboarding-transition-animation (25) | actions animation class + keyframes + reduced motion + `key={mode}` | `index.html`, `hifi-tokens.css` | S | style pin | #15 |
| 20 | check-onboarding-url-input-style (15) | URL textarea `borderRadius: 6` | `index.html` | S | one-off UI tweak | |
| 21 | check-orphan-spells (132) | orphan section structure (no HTML sink, no storage write, no bulk action) + `hifiOrphanFromKey` proof | `v11-character-editor.jsx` (anchored on comments `MIGR-01: secao de orfas` ... `{/* Footer */}`) | R | live | |
| 22 | check-pack-composition (366) | `normalizeSelection`, `resolveSelection`, `unionSpells`, source fallback proofs; UI mounts; filter keys; FONTE line; no `VersionSelector` anywhere | loader (cut), `v10-hifi.jsx`, all `*.jsx` | R | live core; ban list is History | many overlaps (see 4.3) |
| 23 | check-pack-format (118) | `pack.schema.json` fields appear in `pack-docs.html`; table row counts; example pack valid; no `innerHTML` | schema, `pack-docs.html`, `srd-reserved-slugs.json` text | S | live | |
| 24 | check-pack-import-dialog (290) | dialog a11y, 6 rejection reasons, i18n parity, no hex colors, no raw text; `_renamedNotice` proof; `makeT` proto guard | `pack-import-dialog.jsx`, `i18n.jsx` (cut at `// Helper bilíngue`) | R | live; `PackImportRoot`/`conflictCtx` bans are History | #12 vm |
| 25 | check-pack-import (129) | funnel order parse→validate→sanitize→rename→put; one `putPack`; no literal URL; fail closed | `pack-import.jsx` | S | live | #27 exposure block |
| 26 | check-pack-menu (515) | PackMenu/Chip structure, no storage touch, i18n key counts, tone, sink count 5, `_indexPopulation`, Set-based index; card-model proof | `pack-manager.jsx`, loader, `i18n.jsx`, `v10-hifi.jsx`, `packs/*.json` | R | live; replaced `check-pack-manager` | #6 sink count, #12/#24 i18n |
| 27 | check-pack-validator (300) | validator ↔ schema parity, 10 MB cap, `JSON.parse` once with reviver; `meta.image` proof; schema regex ↔ `IMAGE_SRC` | `pack-import.jsx` (whole file in vm), schema, dialog | R | live | #25 |
| 28 | check-pack-wiring (184) | DOMPurify tag pinned; script order; `PackManagerRoot` mount; PRECACHE parity; `CACHE_VERSION ≥ 6`; no `qa-fixtures`; `Response.error()`; `persistCharacters` clamp proof | `index.html`, `sw.js`, `v11-character-editor.jsx` (cut at `function useCharacters`) | R | live (mixed: shell + character data) | #8, #31, #34, #40 |
| 29 | check-packs-index (19) | `packs/index.js` equals build output; index.html loads it | runs `build-packs-index.mjs` (writes the file) | S | live; **mutates tree** | |
| 30 | check-plugin-store-persistence-export (84) | `requestPersistence`, `exportPack`, revoke order, exposed API; optional `02-02-SUMMARY.md` check | `plugin-store.jsx`, `.planning/phases/02-*/02-02-SUMMARY.md` | S | live; the SUMMARY block is already dead (`.planning/phases` is empty) | #31 |
| 31 | check-plugin-store (97) | IndexedDB wiring, `DB_VERSION 1`, no empty catch, WR-04, IN-07, load order, PRECACHE | `plugin-store.jsx`, `index.html`, `sw.js` | S | live | order dupes #28, #35, #40, #34 |
| 32 | check-school-filter-labels (23) | school label formatter wired | `v10-hifi.jsx` | S | duplicate | #11 (assertion 3) |
| 33 | check-selection-migration (271) | selection state: legacy key to list, `?v=` list, pending/prune, fallback toast, 12 scenarios | loader (cut), index.html | R | live | #14, #35 |
| 34 | check-slug-rename (516) | slug conflict/suggest/validate/apply pure functions; auto-rename funnel; rename dialog; `renameImpact`/`renameInstalledPackSlugs` proofs | `pack-import.jsx` (vm), `pack-rename-dialog.jsx` (eval), editor (eval), `index.html` | R | live; ban list History | exposure block dupes #25, #27 |
| 35 | check-source-dispatch (259) | registry, dispatch by source, refresh chain, `_enumerated`, `_readPrefs`, WR-03; index.html free of version state | loader, `index.html`, `packs/index.js`, `pack-import-dialog.jsx` | S | live; bans are History | #33 index bans |
| 36 | check-spell-card-callback-identity (36) | memo'd card gets stable, spell-argument callbacks | `v10-hifi.jsx` | S | past bug | |
| 37 | check-srd-name-and-markdown (168) | readable EN name, `mdToHtml`, adversarial markup proof, slug integrity in 3 packs | loader, helpers, `packs/*.json` | R | live | upgrade literal dupes #43 |
| 38 | check-srd-packs (227) | SRD EN pack shape, distinct attribution, class coverage, known classes; reserved slugs proof; generator provenance | `packs/*.json`, `generate-srd-pack.mjs`, `srd-reserved-slugs.json` | R | live (data gate) | #39, #43 |
| 39 | check-srd-ptbr-pack (313) | pt-BR pack: 339 spells, attribution, banned PHB names, spot checks, not tracked source, generator provenance | `packs/srd-2024-ptbr.json`, `scripts/srd-sources/*`, generator, `git ls-files` | R | live | #38 |
| 40 | check-transition-banner (261) | banner order/mount/PRECACHE, no write path, `migration.*` parity; `_hasExistingUserSignal` proof | `transition-banner.jsx`, `index.html`, `sw.js`, `i18n.jsx` (vm), editor (eval) | R | live feature; one `CACHE_VERSION` floor | #12 i18n, #28 |
| 41 | check-ui-lang-state (50) | `uiLang` independent of the pack; `<html lang>`; no `?lang=` | `index.html` | S | live + History | |
| 42 | check-ui-lang-toggle (111) | `HifiLangToggle` writes only `uiLang`; mounted twice; `PackMenuChip lang=uiLang`; no `VersionSelector` | `v10-hifi.jsx` | S | live + History | #22 |
| 43 | check-upgrade-heading-strip (119) | `stripUpgradeHeading` structure; packs ship the marked heading; generator emits it; strip proof | loader (functions eval'd), `packs/*.json`, generator | R | live | #37 |
| 44 | sync-vscode-peacock-catppuccin.tests (72) | color map for a VS Code setting tool | `scripts/sync-vscode-peacock-catppuccin.ps1` | R | **personal, not project** | |

### 4.2 Test code patterns (what the helper must replace)

1. **Temp `.cjs` boilerplate** (19 files, 21 programs): write here-string to `GetTempPath()`, `Push-Location`, run `node`, `Remove-Item` in `finally`. Identical each time.
2. **Fake `localStorage`** with call counters: copied in #1, #34, #40.
3. **Loader vm sandbox**: three separate `makeSandbox` in #13, #22, #33. All cut `spells-data-loader.jsx` at `function buildSpellsFromRealData` (hooks start there) and load `packs/index.js` first.
4. **Regex function extraction**, `src.match(/function NAME\(...\)[\s\S]*?\n\}/)` then `eval`: #1, #9, #14, #21, #24, #26, #34, #37, #40, #43. It requires the function to close with `}` at **column 0**.
5. **i18n vm load** plus `i18nParityCheck()`: #12, #40, #24, #26.
6. **Structural "X exists"** greps beside a runtime proof that already fails if X is missing (for example `function _packColorIndex(` in #26 before the proof extracts it). These are the cheapest to drop.

### 4.3 Overlaps (assert the same thing more than once)

| Idea | Files |
|---|---|
| `index.html` script load order | #28, #31, #35, #40, #34 (each asserts a different pair) |
| `CACHE_VERSION` floor in `sw.js` (≥2, ≥2, ≥2, ≥6) | #8, #31, #40, #28 |
| single "active version" removed (`getCurrentSpellVersion`, `versionKey`, `VersionSelector`, `switchVersion`, `hasPendingSpellVersion`, `langOfVersionKey`, `hifi-spells-source-changed` in index.html, `_wantedVersionKey`) | #9, #10, #22, #33, #35, #41, #42, and #12 |
| exactly 5 `dangerouslySetInnerHTML` sinks | #6, #26 |
| class/school filter labels | #3, #4, #11, #32 |
| `window.packImport` exposure block checked 3 times with different member lists | #25, #27, #34 |
| `JSON.parse(` count = 1 in `pack-import.jsx` | #25, #27 |
| "empty catch block" regex | #25, #27, #24, #30, #31 |
| `PRECACHE` file presence | #28, #31, #40, #8 |
| i18n key presence and counts | #12, #24, #26, #40 |
| fake storage and sandbox boilerplate | see 4.2 |

---

## 5. Consolidation plan

### 5.1 Target layout

```
scripts/
  run-tests.ps1               (keep; fail loudly if node is missing)
  lib/
    test-helpers.ps1          (dot-sourced)
    node-harness.cjs          (required by node proofs)
  app-shell.tests.ps1
  plugin-store.tests.ps1
  pack-import.tests.ps1
  pack-ui.tests.ps1
  pack-data.tests.ps1
  i18n.tests.ps1
  spell-loader.tests.ps1
  character-data.tests.ps1
  ui-language.tests.ps1
  ui-spell-list.tests.ps1
  onboarding.tests.ps1
  retired-identifiers.tests.ps1
```
12 files plus 2 helpers. `lib/` is not matched by the `scripts/*.tests.ps1` glob, so `run-tests.ps1` needs no change except the node check.

**`test-helpers.ps1`** (shared PowerShell):
- `$Root`, `Read-App <relpath>`, `Get-AppFiles` (the `.jsx` files listed in `index.html` `<script src>`, in load order).
- `Get-AppSource` (all app files concatenated). Use it for "X exists / does not exist somewhere" so tests do not name a file.
- `Find-DefiningFile 'function OnboardingModal'`. A test that cares where a symbol lives asks the repo, not a constant.
- `Get-FunctionBody $src $signature` (the one already duplicated in #34).
- `Assert-Has`, `Assert-Lacks`, `Assert-Count`, `Assert-Before $src $a $b` (order), each with a message.
- `Invoke-NodeProof <file.cjs>`: runs Node, throws with output on non-zero exit. One check for `node` at start. No temp files: node proofs live as real `.cjs` files under `scripts/lib/proofs/` (or inline as today, but through one function).

**`node-harness.cjs`** (shared JS):
- `extractFn(file, name)`, `fakeStorage(initial)` with call counters, `check(label, cond)` / `done()`.
- `loadSandbox({files, window, localStorage, navigator, href})`. Takes a list of files, not a cut marker.
- `loadI18n()` returning `{STRINGS, tt, makeT, i18nPlural, i18nParityCheck}`; `i18nParityCheck()` runs once per suite.

Design rule for the refactor that keeps the harness simple: **put pure logic (no JSX, no hooks, no React) in files of its own**, so a sandbox can load the whole file. Today the hook `useSpellVersions` forces the "cut at function X" trick.

Rule for what to keep as source-grep: only for things execution cannot prove (load order, sink count, "no storage write" in a region, a11y attributes, security tag pins, absence of a retired identifier). Drop "function X exists" greps that a runtime proof already needs.

### 5.2 Per-new-file content and coverage-preservation map

Format: **old check (script / assertion) → new home.** "Drop" means removed on purpose (reason given).

**N1 `app-shell.tests.ps1`** (index.html, sw.js, CSP, manifest, packs index)
- #28 §1 DOMPurify pinned (version, sha384, crossorigin) → N1
- #28 §2, #31 order, #35 order, #40 §1, #34 order → N1 as ONE rule table: `plugin-store < spells-data-loader < v11-character-editor`; `purify < pack-import`; `plugin-store < pack-import`; `v11-character-editor < pack-rename-dialog < pack-import-dialog < pack-manager < transition-banner < v10-hifi`. Read the tags from `index.html`, so a rename edits one table.
- #28 §4 PRECACHE has the pack files; #31 PRECACHE has plugin-store; #40 §4 PRECACHE has transition-banner → N1 as one rule: every local `<script src>`, the stylesheet and `pack-docs.html`, `pack.schema.json`, `srd-reserved-slugs.json` appear in `PRECACHE`
- #28 §5 same DOMPurify URL in index.html and sw.js → N1
- #28 §6, #31, #40, #8 `CACHE_VERSION` floors → N1 as ONE assertion (`≥ 6`)
- #28 §7, #8 §3 `packs/index.js` + `BUILTIN_PACKS` in PRECACHE; no hand-listed spell JSON → N1
- #28 §8 no `qa-fixtures` in sw.js → N1
- #28 §9 `Response.error()` fallback → N1
- #28 §3 one `<PackManagerRoot`, after `<HifiPrintRoot`; no `PackImportRoot` → N1 (the `PackImportRoot` ban goes to N12)
- #8 §5 `BUILTIN_PACKS` entries: source fetch, file exists; #9 §3 every entry has `edition` and `corpus`; #35 `srd-2024-en` before `srd-2014-en`, ≥3 `source: fetch` → N1 (one "builtin manifest shape" block)
- #29 `packs/index.js` up to date → N1, rewritten to compare in memory (no write); `index.html` loads `packs/index.js` → N1
- #7 CSP: meta on both pages, required directives, identical policies, no `connect-src`, no `img-src`, Babel/React/DOMPurify tags present → N1
- #7 §6 CONCERNS.md has D-10 → **drop** (a test of a planning document; couples code gate to `.planning/`)
- #8 sw.js comment must mention "remoção exige bump" → **drop** (pins a comment sentence)

**N2 `plugin-store.tests.ps1`**
- #31 structural list, `DB_VERSION 1`, no empty catch (shared catch rule), WR-04 throw on missing record, IN-07 async revoke, no foreign scope (`adaptSpell`, `DOMPurify`, ...) → N2
- #30 persistence + export + exposed API → N2
- #30 optional `02-02-SUMMARY.md` block → **drop** (already skipped, `.planning/phases` is empty)
- #31 `index.html` has the tag; order → N1

**N3 `pack-import.tests.ps1`**
- #25 funnel order, one `putPack`, no literal URL, fail closed, `MAX_PACK_BYTES` ×3, no empty catch, one `JSON.parse` → N3
- #27 table parity validator ↔ schema both directions, 10 MB literal in code and schema, reviver on `JSON.parse` → N3
- #27 `meta.image` proof (≈45 cases) and schema regex ↔ `IMAGE_SRC` → N3
- #25/#27/#34 exposure blocks → N3 as ONE block (union of members)
- #34 `detectSlugConflicts`, `suggestSlug`, `validateSlugRename`, `applySlugRenames` proofs and the 9 funnel scenarios → N3
- #34 "gone" list (`CANCELLED`, `onConflicts`, `window.adaptSpell`, `localStorage`, ...) → N12 plus N3's "no storage" rule
- #34 `suggestSlug` / `detectSlugConflicts` do not call `freeIdentifier` → N3

**N4 `pack-ui.tests.ps1`** (dialogs, menu, banner UI)
- #24 dialog structure, a11y, no hex colors, no raw text, `submitDisabled`, `QuotaExceededError`, six rejection keys, mode exclusivity, `_renamedNotice` proof → N4
- #24 i18n key presence (`import.*`, `packErr.*`) → N6
- #26 §1-§27 pack menu: structure, no `localStorage`, no `putPack`, `removeEventListener`, CC-BY wiring, one `role=dialog`, `_indexPopulation`, Set index, `PackThumb` referrer, `PackMenuChip` → N4
- #26 card-model proof (`_packColorIndex`, `_safeImage`, `_cardMetaVars`, `_chipLabel`) → N4 (via `extractFn`)
- #26 §6 (SRD 5.1 vs 5.2 attribution differ) → N5 (it is data)
- #26 §21 `spell.alsoIn` / `packSpellIndex` in v10-hifi; §23 no badge on card → N10
- #26 §10, §18 i18n key counts; §19 tone → N6
- #26 §22 sink count 5 → N9 (one place)
- #34 `pack-rename-dialog` structure, exposed names, `renameImpact` + `renameInstalledPackSlugs` proofs → N4
- #40 banner: no `loadBookmarks`, no `setTimeout`/`setInterval`, `target=_blank` with `rel=noopener noreferrer`; `TransitionBannerRoot` gets `lang={uiLang}`; prefs effect does not write `migrationNoticeDismissed` → N4
- #1 §1 `pack-manager.jsx` reads through `peekBookmarks` → N4

**N5 `pack-data.tests.ps1`** (data + schema + generator provenance)
- #23 schema ↔ docs field and table parity, example valid, no `innerHTML`, no hex, required strings → N5
- #38 SRD EN packs shape, attribution differs, required fields, unique names → N5
- #38 class coverage + 4 known spells → N5
- #38 reserved-slugs proof → N5
- #38 generator provenance (`spells-5E`, `readdir`, `glob(`) and `applyClassLists`, `--reserved-only`, `buildReservedSlugs` → N5 (these read generator source; keep)
- #39 pt-BR pack: all sections (339 spells, attribution, banned names, spot checks, `git ls-files` not tracked) → N5
- #43 packs ship marked heading; generator has `markUpgradeHeading` → N5
- #37 slug integrity in 3 packs; `**` gone from `srd-2024-en.json` descriptions → N5
- #26 §6 attribution differs 5.1 vs 5.2 → N5 (duplicate of #38; keep one)
- #8 §1-2 4 legacy JSON files absent from tree and `git ls-files` → N5 (keep; it is the copyright guard)

**N6 `i18n.tests.ps1`**
- #12 28 new keys, parity (`i18nParityCheck()` once), placeholders, plural, no `(s)`, no loss tone, image messages → N6
- #12 6 dead keys absent in every file → N12 (generalize: `deadKeys` list)
- #40 §6 `migration.*` keys → N6
- #24 `import.*` and `packErr.*` key presence in both languages → N6
- #26 `manager.*` key counts, `.one/.other` suffix, no old non-suffixed keys → N6
- #24 IN-08 `makeT('constructor')` is a string → N6 (needs the harness to load i18n without the `// Helper bilíngue` cut: `loadI18n()` runs the whole file)
- Rule: key presence is checked at runtime from `STRINGS`, never by counting quoted occurrences in the source text

**N7 `spell-loader.tests.ps1`** (one loader sandbox for all)
- #13 CR-03 proto-less tables + hostile-pack proof; WR-05 `school null`; loop guard (`keys.every`) and `_refreshPluginVersionsInner` before/after → N7
- #14 `LEGACY_VERSION_FALLBACK` map proof + `_initialSelection` branch → N7
- #33 12 scenarios + structural list → N7
- #22 `normalizeSelection`, `resolveSelection`, `unionSpells`, `adaptSpells` stamping, source fallback → N7; `hifi_chars_v1` etc. not referenced in loader → N7
- #35 registry, `_fetchVersionJson`, one `adaptSpells(` call, refresh chain, `_enumerated`, `_readPrefs`, WR-03 → N7
- #37 `adaptSpell` name/`en`/`name_en`/`descHtml`/`upgradeHtml` order, `mdToHtml` proof → N7
- #43 `stripUpgradeHeading` structure + proof → N7
- #2 loader half → N7 as a runtime scenario (`languages: ['en-US','pt-BR']` yields pt-BR pack); the grep is dropped
- #35 `refreshPluginVersions` called after `setResult(res)` in the dialog → N4

**N8 `character-data.tests.ps1`**
- #1 all fake-storage proofs → N8
- #21 orphan section structure (no sink, no `setItem`, no bulk) + `hifiOrphanFromKey` proof → N8 (anchor by function, not by comment)
- #40 §7 `_hasExistingUserSignal` proof → N8
- #28 CR-03 `persistCharacters` clamp proof → N8
- #18 `persistBookmarks` exists → N8

**N9 `ui-language.tests.ps1`**
- #41 `uiLang` state rules → N9
- #42 `HifiLangToggle` rules, two mounts, `PackMenuChip lang=uiLang` → N9
- #6 content ownership → N9 (**drop assertion 7**, `hifiShare`, with the function)
- #11 vocabulary (`hifiFilterConfig(uiLang)`, `bool(`, `remapClassFilter` ban) → N9; #4, #32 are subsets → drop as separate checks
- #10 editor uses `s.lang`, one `hifi-spells-source-changed` listener → N9
- #2 `browserLanguageCandidates` in index.html → N9
- 5-sink count (#6 and #26) → N9 once

**N10 `ui-spell-list.tests.ps1`**
- #36 stable card callbacks → N10
- #3 class filter canonical → N10
- #9 `useEditionCompare` rules + `hifiSiblingVersion` proof + homebrew never compared → N10
- #13 `hifiFilterConfig` proto-less and `?f.*` allow-list (IN-06) → N10
- #22 `HifiDetailContent` also-in, 2 `PackMenuChip` mounts, share link `?v=` list, 10 filter keys, FONTE line → N10
- #26 `spell.alsoIn`, `packSpellIndex`, no badge on card → N10
- #5 hardcoded class list gone → N12

**N11 `onboarding.tests.ps1`**
- #18, #15, #19, #16, #17, #20 → N11. Merge the three overlapping style pins (#16/#17/#20) into one block; keep the reduced-motion and `key={mode}` rules. Resolve the source with `Find-DefiningFile 'function OnboardingModal'` and the CSS with `hifi-tokens.css` (or the future CSS file that holds `.hifi-onboarding-*`), so moving the modal out of `index.html` does not break them.

**N12 `retired-identifiers.tests.ps1`**
- One table: `(scope, forbidden string)`, scope = whole app source unless named.
- From #9, #10, #22, #33, #35, #41, #42: `getCurrentSpellVersion`, `VersionSelector`, `switchVersion`, `hasPendingSpellVersion`, `langOfVersionKey`, `defaultVersionKeyForLang`, `_wantedVersionKey`, `_currentVersion`, `setCurrentVersion`, `toast.versionShort`, `toast.versionSwitchedAway`; `versionKey` and `hifi-spells-source-changed` in `index.html`
- From #12: six `version.*` dead keys. From #24, #34, #1: `PackImportRoot`, `conflictCtx`, `onConflicts`, `PackRenameForm` in the dialog, `window.loadBookmarks` in `pack-manager`/`transition-banner`
- From #5: the six-class caster literal list. From #11: `remapClassFilter`. From #8 §4: the four legacy file names in the loader
- The v2.1 dead-code phase appends to this table. It is the right place to lock each deletion.

**Deleted outright**: #44 (sync-vscode tests, with the script). Dropped duplicates and comment pins are listed above.

### 5.3 What is gone and why (coverage notes)

| Removed check | Reason |
|---|---|
| #44 whole file | personal tool, not project behavior |
| #7 §6 CONCERNS.md D-10 | tests a planning doc |
| #30 `02-02-SUMMARY.md` block | dead branch (`.planning/phases` is empty) |
| #8 sw.js comment wording | pins prose |
| #4, #32, #31 order, #28 order, #35 order, #40 order (as separate checks) | folded into N1 / N9 |
| "function X exists" greps next to runtime proofs (#26, #34, #37, #22, #14) | the proof already fails if X is absent |
| #6 assertion 7 | pins dead `hifiShare` |

Every other assertion keeps a home above. When the new files exist, do a mechanical coverage check: for each old script, grep its `throw '...'` messages and confirm each message string (or a merged equivalent) appears in a new script.

### 5.4 Suggested sequencing inside the milestone

1. Add `lib/test-helpers.ps1` + `lib/node-harness.cjs` and port ONE area (for example N8, which has the fake storage), while all old scripts still run. Compare pass/fail.
2. Port the rest, deleting each old script as its content lands. The gate stays green at every commit.
3. Do the **file moves/renames of the app after** the new suite exists, because the new suite resolves files from `index.html` and by defining function (section 6). Doing the app refactor first means editing 44 old scripts.
4. Fix N1 (`check-packs-index`) to stop writing the tree.

---

## 6. Rename-fragile tests (will break when files move, or helpers move)

### 6.1 Hard-coded cut markers (a vm sandbox loads only part of a file)

| Test | File and marker | Breaks if |
|---|---|---|
| #13, #22, #33 | `spells-data-loader.jsx`, `src.indexOf('function buildSpellsFromRealData')`; everything before it is loaded in a vm | the loader is split, the function is renamed or moves, or hook code moves above it. Anything non-pure before the marker (JSX, React) fails parsing |
| #28 | `v11-character-editor.jsx`, `src.indexOf('function useCharacters')` | editor is split, or `useCharacters` is renamed/moved above the pure code |
| #24 | `i18n.jsx`, `src.indexOf('// Helper bilíngue')` | a **comment** is edited, or `i18n.jsx` is split per language or per area |
| #27, #34 (first proof), #12, #40, #26 | whole file in a vm: `pack-import.jsx` (no JSX), `i18n.jsx` | the file gains JSX, imports another file, or `STRINGS` / `i18nParityCheck` / `tt` / `makeT` / `i18nPlural` move to a different file. #12/#40 append `this.__STRINGS = STRINGS;` and need those names in one script |

### 6.2 Regex-extracted functions (need a column-0 closing brace)

`src.match(/function NAME\(...\)[\s\S]*?\n\}/)` then `eval`:
`peekBookmarks`, `loadBookmarks`, `peekCharacters`, `loadCharacters` (#1, #34, #40), `hifiOrphanFromKey` (#21), `_hasExistingUserSignal` (#40), `hifiSiblingVersion` and the `const other = ...;` line inside `useEditionCompare` (#9), `mdToHtml` (#37), `stripHtml`, `UPGRADE_HEADING`, `stripUpgradeHeading` (#43), `LEGACY_VERSION_FALLBACK = ...\n});` (#14), `_packColorIndex`, `_safeImage`, `_cardMetaVars`, `_chipLabel` (#26), `renameImpact`, `renameInstalledPackSlugs` (#34), `applySlugRenames` (#34), `_renamedNotice`, `RENAMED_NOTICE_CAP` (#24). Constants: `HIFI_CHARS_KEY`, `HIFI_BOOKMARKS_KEY`, `HIFI_DEFAULT_CHARS`, `MAX_IMAGE_CHARS`, `IMAGE_SRC`.

Breaks if: the function is nested, indented, wrapped in an IIFE, renamed, converted to an arrow, or moved to another file. Also breaks if a helper it calls (for example `_normChar`, `SCHOOL_KEYS`) moves out of scope; #1 and #21 stub those by hand.

### 6.3 Reads `index.html` for App code (inline `<script type="text/babel">`)

If the inline App moves to a `.jsx`, all of these break: #2 (`browserLanguageCandidates`), #15, #16, #17, #18, #19, #20 (onboarding), #28 §3 (`PackManagerRoot`, `HifiPrintRoot` order), #35 and #33 (no `versionKey` etc. in index.html), #40 §2-§3 (`TransitionBannerRoot lang={uiLang}`, prefs effect with deps `[dark, theme, character, uiLang]`), #41 (`uiLang` state, `window.__setUiLang`, `<html lang>`, og:locale), #34 (order). Script-order checks that rely on `src="x.jsx"` strings also assume every file is a `src` tag; a new inline block is invisible to them.

### 6.4 Hard-coded file names in assertions

Exact names: `v10-hifi.jsx` (#3, #4, #5, #6, #9, #11, #13, #26, #32, #36, #42 and others), `v11-character-editor.jsx` (#1, #10, #21, #28, #34, #40), `spells-data-loader.jsx` (#2, #9, #13, #14, #22, #26, #33, #35, #37, #43), `pack-manager.jsx` (#1, #26), `pack-import.jsx` (#25, #27, #34), `pack-import-dialog.jsx`, `pack-rename-dialog.jsx`, `transition-banner.jsx`, `plugin-store.jsx`, `i18n.jsx`, `grimorio-helpers.jsx` (#37), `hifi-tokens.css` (#15, #19, #23), `pack-docs.html`, `sw.js`, `packs/index.js`, `scripts/srd-sources/*`, `scripts/generate-srd-pack.mjs`. In a prefix rename (`v10-hifi` to a neutral name), most of them are still one `Join-Path` away from fixing, but #12, #22 and #35 also scan "all `*.jsx` in the root". If `.jsx` files move into a subfolder, those scans silently cover nothing: `Get-ChildItem -LiteralPath $repoRoot -Filter '*.jsx'` (#22) and `fs.readdirSync('.')` (#12) are not recursive. A passing test would then check nothing.

### 6.5 Exact counts and exact shapes (break on dedupe / simplification, even when behavior is the same)

| Assertion | Where |
|---|---|
| exactly **5** `dangerouslySetInnerHTML` lines, each with `lang={hifiHtmlLang(versionLang)}` | #6, #26 |
| exactly **2** `const uiLang = lang;` | #42 |
| exactly **2** `<HifiLangToggle ... />` mounts; **2** `<window.PackMenuChip lang={uiLang}` | #42, #22 |
| exactly **2** `spellName(s, s.lang)` and **1** `hifi-spells-source-changed` listener in the editor | #10 |
| `hifiFilterConfig` keeps exactly 10 keys in a fixed order; `hifiFilterConfig(uiLang)` ≥2 calls | #22, #11 |
| `adaptSpells(` exactly **2** times in the loader; `JSON.parse(` exactly **1** in `pack-import.jsx`; `pluginStore.putPack(` exactly **1** | #35, #25, #27 |
| `NEW_KEYS.length === 28`; `339` spells in pt-BR; `≥3` builtin packs | #12, #39, #8 |
| regexes tied to exact code text: `Object.assign(Object.create(null)`, `keys.every(k => _cache[k]))`, `school: typeof schoolIdx === 'number' ? schoolIdx : null`, `class: { label: tt(lang, 'spell.class'), base: true, get: s => (s.classesEn || ...` | #13, #3 |

When the dead-code phase de-duplicates these call sites (for example a shared HTML-sink component), the number changes and the test must be updated in the same commit. Put such counts in one place (N9 for sinks).

### 6.6 Comment- and region-anchored regexes (editing a comment breaks the test)

- #21: region between the comment `MIGR-01: secao de orfas` and `{/* Footer */}` in `v11-character-editor.jsx`.
- #22: region between `{/* Source */}` and `alsoIn.length` in `v10-hifi.jsx`.
- #24: `// Helper bilíngue` in `i18n.jsx`.
- #8: the `sw.js` header must contain the word "remoção ... bump". (Dropped in the plan.)
- Bounded windows `[\s\S]{0,N}?` (for example `{0,3000}` after `function useEditionCompare`, `{0,2000}` in #13, `{0,8000}` for `HifiSpellCard`): they pass today by margin. If the code is moved, re-ordered, or grows, the window misses and the test throws "could not locate".
- Region tests that scan a function body (`HifiLangToggle` `{0,3000}`, `useEditionCompare`, `HifiSpellCard`, `HifiDetailContent`) need the function to stay in one piece. Splitting `v10-hifi.jsx` (2,781 lines) is exactly where these windows fail.

### 6.7 Tests coupled to non-code files

- #7 reads `.planning/codebase/CONCERNS.md` (must contain `D-10` and `Content-Security-Policy`). Archive or rewrite of `.planning/` fails the gate.
- #30 reads `.planning/phases/02-plugin-storage-foundation/02-02-SUMMARY.md` if present (it is not).
- #8, #39 call `git ls-files`: need a git work tree.
- #29 runs a generator and writes `packs/index.js`.

### 6.8 Recommended mitigations (all inside the N1-N12 plan)

1. Resolve files through `index.html` and `Find-DefiningFile`, never by a constant, except for fixed public names (`sw.js`, `manifest.json`, `pack.schema.json`, `pack-docs.html`).
2. Use `Get-AppSource` for "exists / absent anywhere" checks. Make the "scan all app files" scan **recursive** and assert it found at least N files.
3. Make the sandbox load a list of whole files. Keep pure logic in JSX-free files so no cut marker is needed.
4. Put every count in one table with a comment on who owns it.
5. Make tests anchor on function names, never on comments. When a test must find a region, add a one-line code marker, not a prose comment.
6. Do the app file moves after the new suite exists (sequencing in 5.4).
7. Keep `scripts/run-tests.ps1` glob, command line and exit-code contract (`pwsh scripts/run-tests.ps1`, `npm test`), because PROJECT.md uses it as the verification command.

---

## 7. Decisions the requirements writer should put to the user

1. Delete `extract-ptbr-source.mjs` + `build-legacy-fixtures.mjs`? Recommended yes. Reason: one-shots, inputs not in the repo. Keep only if a new revision of the Heróis Anônimos PHB will be re-extracted.
2. Drop "Marauder Display" (2 woff2, 2 `@font-face`, the fallback name in 3 places)? Recommended yes after one headless screenshot compare across the 6 themes. The BoldItalic file goes without any check.
3. Keep `.claude/launch.json` tracked? Recommended keep. Everything else under `.claude/` goes.
4. Keep `docs/` and `design.md` at the root (public on Pages) or move them under `.planning/`/`docs/`? Low priority.
5. Remove the `Marauder-*` fonts from the precache gap? Out of scope (Marauder is not precached, so the first offline visit shows fallback fonts). Note only.
6. Untrack the 10 `.planning/**/.cache/*.json` files? Recommended yes.
7. `qa-fixtures/hostile-html.json`: keep as manual QA input, or turn into an automated sanitize test (needs DOMPurify in Node, which does not exist today). Recommend keep as is.

## 8. Sources

- `git ls-files` (110 `.claude`, 54 `scripts`, 4 `docs`, 8 `packs`, 8 `marauder`, 4 `fonts`), `sw.js`, `index.html` script tags, `hifi-tokens.css` `@font-face`, `package.json`, `skills-lock.json`, `.gitignore`.
- All 44 `scripts/*.tests.ps1` read in full; `scripts/*.mjs` headers read.
- `pwsh scripts/run-tests.ps1` run on 2026-10-23 (PASS, ~18 s).
- Confidence: HIGH. No external sources.
