# File Responsibilities and Naming (v2.1 audit)

**Researched:** 2026-10-23
**Mode:** Codebase audit (no web research). Evidence = repo reads + 3 small Chrome experiments.
**Overall confidence:** HIGH for the map and the layout. MEDIUM for Firefox/Safari `file://` (not tested).

## 1. Summary

- 16 source files, 8 of them over 500 lines. Four carry more than one job: `v10-hifi.jsx`, `v11-character-editor.jsx`, `spells-data-loader.jsx`, `pack-import.jsx` / `pack-manager.jsx`. `index.html` also holds ~490 lines of app code.
- Names `v10`, `v11`, `hifi`, `grimorio-helpers`, `plugin-store` (vs `pack-*`), `transition-banner` do not say what the file does. Three of them are historical only.
- **Folders are safe.** Babel standalone loads `src/a/b.jsx` exactly like a root file. The shared global scope still works across folders (tested). `file://` is **already broken today** in default Chrome, flat layout included (tested, see section 6). So folders add no new limit.
- Recommended layout: root keeps only entry points and public-URL files. Everything else goes in `src/<layer>/`. File names are kebab-case, unique repo-wide, `<domain>-<thing>`.
- Code moves are **cut-and-paste of whole top-level blocks**. No body edits. Safety net first: a boot smoke gate, a shell-files parity gate, a duplicate-name gate, and a test path map. Then moves, leaf-first.
- Hard "do not rename" list (user data and public contracts): storage keys, IndexedDB name, event names, CSS class names, `pack.schema.json` (its `$id` is a public URL), `pack-docs.html`, `srd-reserved-slugs.json`, `sw.js` location.

## 2. Current map (responsibilities with line ranges)

### 2.1 `index.html` (636 lines)

| Lines | Content | Responsibility |
|-------|---------|----------------|
| 1-27 | meta, CSP, favicon, manifest | page shell |
| 28 | `<link hifi-tokens.css>` | styles |
| 29-73 | boot-screen CSS + DOM (`.od-boot`) | boot screen (keep inline; needed before any file loads) |
| 75-98 | plain `<script>`: 12 s watchdog + SW register | boot safety net |
| 100-141 | CDN scripts + 11 Babel `src` tags + load-order comments | script manifest |
| 145-158 | `loadPrefs/savePrefs/hasSeenOnboarding/markOnboardingSeen` | UI prefs store |
| 160-176 | `browserLanguageCandidates`, `detectLang` | language detection (belongs with i18n) |
| 177-230 | `decodeSharedBuild*`, `uniqueImportedCharacterName`, `importSharedBuildUrl` | share-build import (pair of `__shareBuild` encode at 499-518) |
| 232-251 | `useViewport` | viewport hook |
| 253-386 | `OnboardingModal` | first-visit modal |
| 388-606 | `App` (prefs sync, theme, lang, `window.__*` setters, share encode, layout switch) | app root |
| 608-631 | `ErrorBoundary` | render crash screen |
| 633 | `ReactDOM.createRoot(...)` | mount |

### 2.2 `v10-hifi.jsx` (2781 lines) - the main UI file, 14 jobs

| Lines | Content | Real responsibility |
|-------|---------|---------------------|
| 1-8 | header comment | stale (mentions canvas/artboards) |
| 9 | `hifiSpellKey` | spell identity key. **Used by loader, editor, pack-manager, pack-import, rename dialog.** Wrong layer. |
| 14 | `hifiHtmlLang` | i18n helper |
| 16-21 | `hifiFooterLink` | desktop footer style (only used from line 1599) |
| 23-25 | `TIER_SYMBOLS`, `tierSymbol` | spell level display (used by card 499 and session 2059) |
| 27-35 | `hifiAccentsFor` | character accent (pair of editor L1-107) |
| 37-75 | `useHifiToast`, `HifiToast` | toast (also fed by events from 5 files) |
| 77-136 | slug, `buildSpellLink`, `hifiShareViewUrl`, `hifiCopyLink`, `hifiShare` | spell link/share actions |
| 138-161 | `hifiPrint`, `hifiPrintList`, `hifiPrintPrepared` | emit `hifi-print-request` |
| 163-373 | `HifiPrintRoot`, `chunkSpellForPrint`, `HifiPrintCard` | print sheet (listener of the event above) |
| 375-493 | `HifiPill/Mono/SectionLabel/SpellName`, icons, `HifiThemeToggle` 438, `hifiSiblingVersion` 459, `HifiLangToggle` 473 | shared UI primitives + header toggles + one misplaced edition helper |
| 495-641 | `HifiSpellCard` | spell card |
| 643-665 | `HIFI_FULL/HALF_CASTERS`, `hifiMaxCircle` | spellcasting rule (duplicates editor domain, see 3.4) |
| 668-737 | `hifiFilterConfig/Values/*Label` | filter configuration + labels |
| 739-903 | `useHifiAppState` | screen state: query, filters, selection, URL params, sorting |
| 905-930 | `HifiEmptyState` | shared component |
| 932-1048 | `HifiDetailContent` (+ `HifiStat` at 1110) | spell detail |
| 1050-1117 | `useEditionCompare`, `HifiCompareButton` | 2014/2024 compare |
| 1119-1651 | `HifiDesktop` | desktop layout |
| 1653-1759 | `FilterChipDropdown`, `HifiAddFilter` | desktop filter controls |
| 1761-2165 | `HifiSessionMode` + spark/pulse FX + `HIFI_ROMAN`, `hifiFmtMod` | session mode screen |
| 2167-2770 | `HifiMobile` | mobile layout |
| 2772-2781 | `HifiMobilePhone` (uses `IOSDevice`, never defined) + window exports | dead wrapper (hand to dead-code phase) |

### 2.3 `v11-character-editor.jsx` (1211 lines) - 7 jobs

| Lines | Content | Real responsibility |
|-------|---------|---------------------|
| 1-107 | `ACCENT_SLOTS`, `THEME_PALETTES`, `paletteFor`, `accentOf`, `HIFI_PALETTE` | character accent palettes |
| 108-131 | default char, keys, `hifiCharName` | character defaults |
| 133-235 | `CASTER_CLASSES`, slot tables, `hifiSuggestedSlots`, ability, `hifiCasterStats` | spellcasting rules (pure) |
| 237-352 | `_normSlots/_normChar`, peek/load/persist/`useCharacters`, toggles, slot ops | character store |
| 354-419 | bookmarks store (`peekBookmarks`... `useBookmarks`) | global favorites store |
| 421-503 | `useDialogA11y`, `useHifiTransition` | **generic overlay hooks used by every modal** (editor, v10, pack dialogs, onboarding) |
| 505-559 | `hifiOrphanFromKey`, `useResolvableKeys` | orphan/resolvable spell keys |
| 561-1194 | `CharacterEditor` | editor UI (one component, 633 lines) |
| 1196-1211 | window exports | |

### 2.4 `spells-data-loader.jsx` (1010 lines) - 9 jobs

| Lines | Content | Real responsibility |
|-------|---------|---------------------|
| 7-107 | `BUILTIN_VERSIONS`, `SPELL_VERSIONS` (live array), `_uiLang`, `LEGACY_VERSION_FALLBACK` | pack registry (+ legacy map) |
| 109-249 | `_packToVersion`, `refreshPluginVersions` | sync registry with IndexedDB |
| 250-300 | `SCHOOL_INDEX`, `CLASS_PT/EN`, `SOURCE_CODE` | vocabulary tables (pair of helpers L27-41) |
| 302-367 | `stripHtml`, `normalizeComponents`, `mdToHtml`... | text cleaners (pair of helpers L43-100) |
| 369-476 | `adaptSpell(s)` | raw JSON -> app schema |
| 477-611 | `_cache`, `_readPrefs`, `_initialSelection`, `_persistSelection`, get/set selection | selection state + prefs persistence |
| 612-697 | `_fetchVersionJson`, `loadVersion`, `getVersionMeta` | fetch + cache |
| 698-737 | `resolvableSpellKeys` | resolvable keys (pair of editor 505-559, banner `_countOrphans`) |
| 739-877 | `normalizeSelection`, `resolveSelection`, `unionSpells` | selection rules (pure) + union |
| 878-973 | `buildSpellsFromRealData`, `useSpellVersions` | "what spells show now" + React hook |
| 975-1010 | window exports + **boot preload at load time** | wiring |

### 2.5 Other JSX files

| File (lines) | Content | Verdict |
|--------------|---------|---------|
| `grimorio-helpers.jsx` (102) | spell field accessors, school/level tables, description fallbacks | one job, bad name ("helpers"). Joins loader vocabulary. |
| `i18n.jsx` (614) | `STRINGS.ptbr` 16-277, `STRINGS.en` 278-538, API 539-614 | one job (translations). Keep whole. Receives `detectLang` and `hifiHtmlLang`. |
| `plugin-store.jsx` (231) | IndexedDB CRUD, persistence request, export | one job. Name says "plugin", rest of code says "pack". |
| `pack-import.jsx` (679) | 27-120 constants + field tables; 131-270 parse/validate; 271-430 slug identity + reserved slugs; 431-505 file/URL readers; 506-579 sanitize; 580-679 install + `window.packImport` | 5 jobs |
| `pack-import-dialog.jsx` (292) | error-code map 26-48, notice 50-63, dialog 65-292 | one job (UI) |
| `pack-rename-dialog.jsx` (296) | `renameImpact` 28-55 and `renameInstalledPackSlugs` 56-73 (logic), form 74-214, dialog 215-288 | UI + slug logic. Logic moves to slugs file. |
| `pack-manager.jsx` (959) | 21-120 row/card meta; 121-287 spell index, dup counts, removal impact; 288-430 `PackThumb`, `PackCard`; 430-772 `PackMenu`; 772-830 `PackMenuChip`; 830-880 `_selectionConflicts`; 880-959 `PackManagerRoot` | 4 jobs. Name `manager` vs component `PackMenu` also confuses. |
| `transition-banner.jsx` (174) | existing-user signal, orphan count, banner | one job. Name is vague: it is the v1->v2 migration notice. |
| `hifi-tokens.css` (1393) | 1-84 fonts; 85-264 theme tokens (light/dark + 5 themes); 266-312 base type + level colors; 314-790 components (card, rich text, pills, buttons, inputs, focus, filter chips, control size canon); 792-876 keyframes + transitions + onboarding anim; 877-935 session mode; 936-1235 print; 1236-1393 mobile (tab bar, canon mobile) | 6 jobs in file order. Cut points are clean: each starts at a banner comment. |
| `sw.js` (108) | cache strategy + PRECACHE list | one job. Must stay at root (SW scope). |
| `pack-docs.html` (491) | public docs page. Uses `hifi-tokens.css` (needs `.hifi-rich`, `.hifi-display`, `.hifi-section-label`, theme vars). | stays at root |

## 3. Responsibilities split across files (join these)

| # | Split job | Today | Join into |
|---|-----------|-------|-----------|
| 3.1 | UI prefs blob (`spellbook-ui-prefs`) | read/write in `index.html` 147-152, loader (`_uiLang`, `_readPrefs`, `_persistSelection`), banner (`_peekUiPrefsBlob`, write at 95). Banner comment says it copies the code **because of load order**. | `core/prefs-store.jsx`, loaded first |
| 3.2 | Overlay behavior (focus trap, enter/exit transition) | defined in the character editor, used by 6 files. Editor must load before the pack dialogs only for this reason. | `ui/overlay-hooks.jsx` |
| 3.3 | Spell identity key `hifiSpellKey` | defined in top UI file, used by 5 low-level files | `spells/spell-fields.jsx` |
| 3.4 | Spellcasting rules | `hifiMaxCircle` + caster lists in v10 (643-665); `CASTER_CLASSES`, slots, stats in editor (133-235) | `characters/spellcasting-rules.jsx` |
| 3.5 | Accent | `hifiAccentsFor` (v10 27-35) + palettes (editor 1-107) | `characters/character-accent.jsx` |
| 3.6 | Orphan / resolvable keys | loader 698-737, editor 505-559, banner `_countOrphans`, pack-manager `packSpellIndex` (parallel index) | `spells/spell-keys.jsx` (first three). `packSpellIndex` stays in packs (different question: duplicates) but must be reviewed for overlap by the dedupe phase. |
| 3.7 | Spell vocabulary | `SCHOOL_KEYS/NAMES` + `levelKey` (helpers), `SCHOOL_INDEX/CLASS_*/SOURCE_CODE` (loader), `TIER_SYMBOLS` (v10) | `spells/spell-vocabulary.jsx` |
| 3.8 | Description text processing | helpers 43-100 (fallbacks, HTML variants) + loader 302-367 (cleaners) | cleaners -> `spell-adapter.jsx`; fallbacks stay in `spell-fields.jsx`. Two files, two clear jobs (write-side vs read-side). |
| 3.9 | Share build | decode/import in `index.html` 177-230 + encode in `App` 499-518 | `app/share-build.jsx` |
| 3.10 | Print | emitters v10 138-161 + listener/render v10 163-373 | `spellbook/print-sheet.jsx` |
| 3.11 | Pack slug identity | `pack-import` 271-430 + `pack-rename-dialog` 28-73 | `pack-system/pack-slugs.jsx` |
| 3.12 | Language detection | `index.html` 160-176 + `hifiHtmlLang` v10:14 | `core/i18n.jsx` |
| 3.13 | Edition sibling lookup | `hifiSiblingVersion` sits in primitives (v10 459-475), only edition compare uses it | `spellbook/edition-compare.jsx` |

Evidence of reverse dependency today: the editor (loaded 5th) renders `HifiMono`, `HifiSectionLabel`, `HifiBookmarkIcon` defined in v10 (loaded last). It works only because it is call-time. The new layout fixes the direction.

## 4. Target layout

Root keeps only files whose **location or URL is a contract**: `index.html`, `pack-docs.html`, `sw.js` (SW scope), `manifest.json`, `favicon.svg`, `pack.schema.json` (`$id` = public URL), `srd-reserved-slugs.json` (fetched by URL, linked in docs), `.nojekyll`, `design.md` (update text), plus unchanged asset/data/tool folders `packs/`, `fonts/`, `marauder/`, `scripts/`, `docs/`.

```
src/
  styles/   tokens.css  components.css  motion.css  session-mode.css  print.css  mobile.css
  core/     prefs-store.jsx  i18n.jsx
  spells/   spell-vocabulary.jsx  spell-fields.jsx  spell-adapter.jsx
            spell-source.jsx  spell-keys.jsx  spell-library.jsx
  ui/       overlay-hooks.jsx  toast.jsx  primitives.jsx  header-toggles.jsx
  characters/ character-accent.jsx  spellcasting-rules.jsx  character-store.jsx
            bookmark-store.jsx  character-editor.jsx
  pack-system/ pack-store.jsx  pack-registry.jsx  pack-selection.jsx
            pack-validate.jsx  pack-slugs.jsx  pack-sanitize.jsx  pack-install.jsx
            pack-spell-index.jsx  pack-card.jsx  pack-menu.jsx  pack-manager.jsx
            pack-import-dialog.jsx  pack-rename-dialog.jsx
  spellbook/ spell-share.jsx  print-sheet.jsx  spell-card.jsx  spell-detail.jsx
            edition-compare.jsx  filter-config.jsx  filter-controls.jsx
            spellbook-state.jsx  session-mode.jsx
            spellbook-desktop.jsx  spellbook-mobile.jsx
  app/      share-build.jsx  onboarding-modal.jsx  migration-banner.jsx  app.jsx  main.jsx
```

Counts: 43 `.jsx` + 6 `.css` (was 16 + 1). Average ~150 lines per JSX file. Folder `src/pack-system/` (not `src/packs/`) on purpose: root `packs/` holds built-in pack **data** and its URLs must not change.

### 4.1 Old section -> new file

| Old file / lines | New file | Notes |
|------------------|----------|-------|
| `hifi-tokens.css` 1-312 | `styles/tokens.css` | fonts, theme tokens, base type, level colors. `url()` paths become `../../fonts/...` and `../../marauder/...` |
| `hifi-tokens.css` 314-790 | `styles/components.css` | |
| `hifi-tokens.css` 792-876 | `styles/motion.css` | keyframes, transitions, reduced-motion |
| `hifi-tokens.css` 877-935 | `styles/session-mode.css` | |
| `hifi-tokens.css` 936-1235 | `styles/print.css` | keep unconditional `<link>` (no `media="print"`) |
| `hifi-tokens.css` 1236-1393 | `styles/mobile.css` | drop "Protótipo:" labels in comments |
| `index.html` 145-158 (+ 3 copies in loader/banner) | `core/prefs-store.jsx` | |
| `index.html` 160-176, `v10` 14 | `core/i18n.jsx` | added to file, rest unchanged |
| `i18n.jsx` | `core/i18n.jsx` | pure move |
| `grimorio-helpers.jsx` 13-19, 79-100 + `v10` 9 | `spells/spell-fields.jsx` | `spellName`, `hifiNorm`, `hifiSpellKey`, `v8*` |
| `grimorio-helpers.jsx` 27-41 + loader 250-300 + `v10` 23-25 | `spells/spell-vocabulary.jsx` | |
| loader 302-476 | `spells/spell-adapter.jsx` | |
| loader 612-697 + `_cache/_metaCache` + `invalidateSpellVersion` | `spells/spell-source.jsx` | |
| loader 698-737 + editor 505-559 + banner 29-62 (`_countOrphans`) | `spells/spell-keys.jsx` | |
| loader 845-973 + 975-1010 | `spells/spell-library.jsx` | `unionSpells`, build, hook, window exports, **boot preload (must load last of the spell data group)** |
| loader 7-107 + 109-249 | `pack-system/pack-registry.jsx` | |
| loader 477-611 (selection part) + 739-844 | `pack-system/pack-selection.jsx` | `window.__legacyVersionFallback = null` must run before `_selectedKeys = _initialSelection()` |
| `plugin-store.jsx` | `pack-system/pack-store.jsx` | file rename only; keep `window.pluginStore` and DB name `grimorio-plugins` |
| `pack-import.jsx` 27-270 | `pack-system/pack-validate.jsx` | |
| `pack-import.jsx` 271-430 + rename dialog 28-73 | `pack-system/pack-slugs.jsx` | |
| `pack-import.jsx` 506-579 | `pack-system/pack-sanitize.jsx` | fail-closed gate, keep alone for audit |
| `pack-import.jsx` 431-505, 580-679 | `pack-system/pack-install.jsx` | keeps `window.packImport` |
| `pack-manager.jsx` 121-287 | `pack-system/pack-spell-index.jsx` | |
| `pack-manager.jsx` 21-59, 288-430 | `pack-system/pack-card.jsx` | |
| `pack-manager.jsx` 60-120, 430-880 | `pack-system/pack-menu.jsx` | `PackMenu`, `PackMenuChip`, rows, `_selectionConflicts` |
| `pack-manager.jsx` 880-959 | `pack-system/pack-manager.jsx` | `PackManagerRoot` only |
| `pack-import-dialog.jsx` | `pack-system/pack-import-dialog.jsx` | pure move |
| `pack-rename-dialog.jsx` 74-296 | `pack-system/pack-rename-dialog.jsx` | UI only |
| editor 1-107 + `v10` 27-35 | `characters/character-accent.jsx` | |
| editor 133-235 + `v10` 643-665 | `characters/spellcasting-rules.jsx` | |
| editor 108-131, 237-352 | `characters/character-store.jsx` | |
| editor 354-419 | `characters/bookmark-store.jsx` | |
| editor 561-1194 | `characters/character-editor.jsx` | |
| editor 421-503 | `ui/overlay-hooks.jsx` | |
| `v10` 37-75 | `ui/toast.jsx` | |
| `v10` 375-437, 905-930 | `ui/primitives.jsx` | pills, mono, labels, icons, empty state |
| `v10` 438-457, 473-490 | `ui/header-toggles.jsx` | |
| `v10` 77-136 | `spellbook/spell-share.jsx` | |
| `v10` 138-373 | `spellbook/print-sheet.jsx` | |
| `v10` 495-641 | `spellbook/spell-card.jsx` | |
| `v10` 932-1048, 1110-1117 | `spellbook/spell-detail.jsx` | `HifiStat` goes here |
| `v10` 459-471, 1050-1109 | `spellbook/edition-compare.jsx` | |
| `v10` 668-737 | `spellbook/filter-config.jsx` | |
| `v10` 1653-1759 | `spellbook/filter-controls.jsx` | |
| `v10` 739-903 | `spellbook/spellbook-state.jsx` | |
| `v10` 1761-2165 | `spellbook/session-mode.jsx` | |
| `v10` 16-21 + 1119-1651 | `spellbook/spellbook-desktop.jsx` | |
| `v10` 2167-2770 | `spellbook/spellbook-mobile.jsx` | |
| `v10` 2772-2779 | delete | dead (`IOSDevice` undefined) |
| `index.html` 177-230, 499-518 | `app/share-build.jsx` | |
| `index.html` 253-386 | `app/onboarding-modal.jsx` | |
| `transition-banner.jsx` | `app/migration-banner.jsx` | rest after `_countOrphans` moved out |
| `index.html` 232-251, 388-606 | `app/app.jsx` | `useViewport` stays here (single user) |
| `index.html` 608-633 | `app/main.jsx` | ErrorBoundary + mount |
| `index.html` 29-98 | stays inline | boot CSS + watchdog must work before anything loads |

### 4.2 Tier B (optional merges if the roadmapper wants fewer files)

`spell-source` + `spell-library`; `pack-sanitize` -> `pack-install`; `pack-card` -> `pack-menu`; `filter-controls` -> `spellbook-desktop`; `header-toggles` -> `primitives`; `bookmark-store` -> `character-store`. Floor ~37 JSX files. Do **not** merge the three stores into one or the editor with the store.

### 4.3 Deliberately not split

- `i18n.jsx` (614): 520 lines of data, one job. A per-language split is possible later; tests parse it (7 refs in pack-menu test alone).
- `CharacterEditor`, `HifiDesktop` (~530), `HifiMobile` (~600): each is one composed screen. Splitting inside needs a read of the JSX to find seams. **Research flag** for a later optional phase. Likely seams: desktop character menu vs mobile character sheet (also a dedupe candidate).

## 5. Naming scheme

1. kebab-case, lowercase. `.jsx` for every Babel file. `.css` for styles. **No new `.js`** for browser code: `sw.js` `SHELL_RE` is `/\.(html|css|jsx)$/`. A `.js` file would be served stale-while-revalidate (`packs/index.js` is one on purpose).
2. Base name **unique repo-wide** (no module system, so grep and editor tabs rely on it). Keep the domain word in the name even inside a folder: `pack-menu.jsx`, not `menu.jsx`.
3. `<domain>-<thing>`. Domains: `spell`, `pack`, `character`, `bookmark`, `filter`, `print`, `session`, `spellbook` (screen), `app`.
4. Closed suffix set: `-store` (persistence + hook + change event), `-rules` (pure functions, no React, no I/O), `-state` (React hook for one screen), `-hooks`, and UI kind (`-card`, `-menu`, `-dialog`, `-banner`, `-modal`). Do not use: `helpers`, `utils`, `common`, `misc`.
5. Banned name parts: `v7/v8/v10/v11`, `hifi`, `prototype`, `canon`. Also the identifiers `v7BuildSpells`, `v8Description*` carry old era names (cleanup is a separate, optional rename phase).
6. Folder = layer/domain bucket, max 7 folders in `src/`. Load order is by layer: `core` -> `spells`/`pack-system` data -> `characters` -> `ui` -> `pack-system` UI -> `spellbook` -> `app`.
7. File header (3 lines, already the style of `pack-import-dialog.jsx`): **Owns / Does not own / Loads after**.
8. Each file ends with its own `Object.assign(window, {...})` only for names read as `window.X`. Bare references need no export (tested).
9. **Never rename (data or contract):** storage keys `hifi_chars_v1`, `hifi_bookmarks_v1`, `hifi_session_v1`, `hifi_session_view_v1`, `spellbook-ui-prefs`, `spellbook-onboarding-v1`; IndexedDB `grimorio-plugins`; events `hifi-*`; CSS classes `.hifi-*` (120 classes); `window.pluginStore`/`packImport` names (tests use them). **Identifier prefix `Hifi`/`hifi`** (56 distinct names, 707 uses, 28 test files mention it): recommend **out of scope for v2.1 file work**. State it as an explicit decision for the requirements writer. If kept, file names say `spell-card.jsx` while the component is `HifiSpellCard`; accept this and record it in file headers.

## 6. Folders vs flat under no-build Babel (cost/benefit)

**Evidence (run 2026-10-23, Chrome headless, Babel standalone 7.29.0):**

| Test | Result |
|------|--------|
| App `index.html` over `file://`, default flags | **Fails today.** XHR for `grimorio-helpers.jsx` (root file!) blocked by CORS "origin 'null'". Also `manifest.json`. Boot screen stays. |
| Mini page, `<script type="text/babel" src="src/ui/a.jsx">` + `src/b.jsx`, `file://`, default flags | Fails (same cause: file:// XHR). Same as root files. |
| Same mini page with `--allow-file-access-from-files` | Works. Nested folder works. A `const` declared in `src/ui/a.jsx` is visible by bare name in `src/b.jsx`. |

Findings:

- `file://` support in default Chrome is already gone in the flat layout. `PROJECT.md` still claims "works on file://". Dev server is `npx http-server -p 8123` (`.claude/launch.json`) and Live Server 5501. **Do not make `file://` an acceptance criterion.** Use: "same behavior as before under http-server and GitHub Pages". Firefox/Safari `file://` not tested (MEDIUM).
- Folders add no new CORS or path limit. Relative URLs in code (`fetch('srd-reserved-slugs.json')`, `packs/index.js` XHR fallback) resolve against the **document**, not the script, so they keep working.
- CSS is different: `url()` resolves against the **stylesheet**. Moving CSS into `src/styles/` needs `../../fonts/` and `../../marauder/` (10 `@font-face` urls). Gate: `document.fonts.check` for the 3 families in the smoke test.
- Babel standalone fetches each `src` script by XHR and runs them in document order. 12 -> 43 requests. Over HTTP/2 (Pages) and SW cache this is small; **measure boot time before/after** (zero visible change includes load time). Transpile cost depends on bytes, not file count.
- `sw.js` stays at root (scope). PRECACHE paths become `./src/...`. `SHELL_RE` already matches any depth.

| | Flat root (43 files + 9 entry files) | Flat `src/` | `src/<layer>/` (recommended) |
|---|---|---|---|
| Tests/sw/index edits | one path per file | same + prefix | same + prefix |
| Discoverability | poor (50+ entries) | OK by prefix sort | best, mirrors load layers |
| Risk | none | none | none (tested) |
| Extra cost vs flat `src/` | | | 5 more folder names in paths |

Cost of choosing folders is the same as choosing a rename (every path changes anyway). Benefit is discovery and a visible layer order. Fallback if the user dislikes folders: flat `src/` with the same names.

## 7. Side-updates checklist (per move)

| Touch point | What must change | Count today |
|-------------|------------------|-------------|
| `index.html` | `<script src>` list + order; CSS `<link>`s (6); header comments naming old files (22 mentions) | 12 Babel tags |
| `sw.js` | PRECACHE entries; **bump `CACHE_VERSION`** (`grimorio-v8` -> v9...) in every commit that touches PRECACHE. Rule in file: removal needs a bump; content change of a listed file needs a bump. `check-pack-wiring` parses `grimorio-vN` and requires >= v6. | 12 mentions |
| `pack-docs.html` | `<link rel=stylesheet>` -> same 6 CSS files, **same order** (it uses `.hifi-rich`, `.hifi-display`, `.hifi-section-label`; do not trim without a visual check) | 1 |
| `scripts/*.tests.ps1` + `.mjs` | 45 files, 392 mentions of source names: `v10-hifi` 50, `spells-data-loader` 60, `pack-manager` 49, `pack-import` 42, `v11` 29, `pack-import-dialog` 27, `index.html` 56, `sw.js` 28, `plugin-store` 21, `i18n` 22, `transition-banner` 14, `pack-rename-dialog` 17, `grimorio-helpers` 3, `hifi-tokens` 3. Many tests also embed `fs.readFileSync('v11-character-editor.jsx')` inside Node here-strings and **regex-extract function bodies from one named file**. Splits break these even when the name is kept. | see left |
| `design.md` (root) | load-order line 151, token/file paths | 7 mentions |
| Code comments in JSX/CSS | references like `v10-hifi.jsx:511`, "carrega ANTES do bloco inline" | ~100 |
| `.planning/codebase/*.md` | stale already (5 files listed). Regenerate with `/gsd-map-codebase` at the end. | |
| `docs/superpowers/*`, `docs/audits/*` | historical specs. Do not rewrite. | |
| `.gitignore` | `capture-scroll.js` listed, root file is dev-only (other phase) | |
| Not affected | CSP test (policies only), `manifest.json`, `pack.schema.json`, `packs/*`, `build-packs-index.mjs` | |

Deploy-skew risk: GitHub Pages caches ~10 min. A visitor with an old `index.html` can request a deleted file name for a short time. Boot watchdog message appears after 12 s; reload fixes it. SW is network-first for shell, so this is transient. Accept; do not keep stub files.

## 8. Safe move order (app works after every step)

**Gate set (run at the end of every step):**
- G1 `pwsh scripts/run-tests.ps1` passes.
- G2 boot smoke: serve root with `npx http-server`, headless Chrome `--dump-dom`: `#root` no longer has `.od-boot`; zero console errors; `document.fonts.check` true for Texturina, Marauder Text, JetBrains Mono. (Technique proven above.)
- G3 shell parity: every local `src=`/`href=` in `index.html` and `pack-docs.html` exists on disk and is in PRECACHE; every PRECACHE entry exists.
- G4 symbol-preservation: sorted list of top-level declaration names + body hash of all JSX before vs after the step is equal (moves only). Also **no duplicate top-level names** across files (baseline today: 278 names, 0 duplicates). Matters because a re-declared `function` in a second classic script silently overrides, and a re-declared `const` throws.
- G5 for CSS steps: concatenation of new files in link order is byte-equal to the old file (minus the changed `url()` lines).
- G6 headless screenshots (desktop + mobile, 2 themes) before/after identical at the end of each phase.

**Order:**

0. **Do other v2.1 work first** (dead code removal, dedupe, test consolidation). Fewer lines to move, fewer tests to patch. This research assumes it finished, or it runs per file before that file moves.
1. **Safety net, no file moves.** Add G2, G3, G4 scripts. Add `scripts/lib/src-map.json` (logical name -> path) read by PowerShell (`ConvertFrom-Json`) and Node (`require`). Refactor tests to use the map (and a "find symbol in any src file" helper for the body-extraction tests). After this, a rename is one edit in one file. Gate: G1-G4 green, behavior unchanged.
2. **CSS split** (independent of JS, lowest risk): cut by the line ranges in 4.1, 6 `<link>`s in `index.html` and `pack-docs.html`, fix `url()`, bump SW. Gates G1, G2, G3, G5, G6.
3. **Whole-file moves, no splitting** (git rename, zero content edit): `i18n.jsx`, `plugin-store.jsx` -> `pack-store.jsx`, `pack-import-dialog.jsx`, `transition-banner.jsx` -> `app/migration-banner.jsx`, `grimorio-helpers.jsx` -> `spells/spell-fields.jsx`. Update `index.html`, sw, map, comments. Do renames in a commit **without** content edits so git tracks history.
4. **Peel foundations out of the big files** (new leaf files that others call at call-time; load them before the old files in `index.html`):
   `core/prefs-store` (then point the 3 users at it: this is also the dedupe), `ui/overlay-hooks`, `ui/toast`, `spells/spell-fields` (+ `hifiSpellKey`), `spells/spell-vocabulary`, `characters/character-accent`, `characters/spellcasting-rules`.
5. **`index.html` inline script -> `src/app/*`.** `main.jsx` last in the list. Tests that read `index.html` for onboarding/lang (8 files) switch to the map. Inline boot CSS/watchdog stay.
6. **`v10-hifi.jsx` peeled top-down**, one commit per block, leaf-first: `session-mode`, `print-sheet`, `spell-share`, `edition-compare`, `spell-detail`, `spell-card`, `filter-config`, `spellbook-state`, `primitives` + `header-toggles`, `filter-controls`. The remainder is renamed `spellbook-desktop.jsx`; `HifiMobile` goes to `spellbook-mobile.jsx`. Delete `HifiMobilePhone`. New files load **before** the remaining v10 file until it is gone.
7. **`v11-character-editor.jsx`**: `character-store`, `bookmark-store`, `spell-keys` (orphan part), remainder renamed `character-editor.jsx`.
8. **Packs import side**: split `pack-import.jsx` into validate / slugs / sanitize / install; move rename logic from the dialog to `pack-slugs`. Then `pack-manager.jsx` into index / card / menu / root. Tests: `check-pack-validator`, `check-pack-import`, `check-slug-rename`, `check-pack-menu` (56 refs), `check-pack-wiring` (29 refs) need map updates.
9. **`spells-data-loader.jsx` last (highest risk)**: order of cuts = `spell-adapter` (pure) -> `pack-selection` (pure rules first, then state) -> `pack-registry` -> `spell-source` -> `spell-keys` -> remainder becomes `spell-library` (with boot preload). Load-time rules:
   - `BUILTIN_PACKS` is read when `pack-registry` loads: `packs/index.js` first.
   - `window.__legacyVersionFallback = null` before `_initialSelection()` runs.
   - `pack-store` before the boot preload (it enumerates IndexedDB). The preload block runs **immediately** at script execution (readyState is not `loading` when Babel runs), so it must be the last statement of the last spell-data file.
   - `React.memo` / `Object.assign(window, ...)` run at load; keep each next to its definition.
10. **Close:** final `index.html` list in the order below, bump SW, rewrite `design.md`, regenerate `.planning/codebase/`, full gates G1-G6, boot-time measurement.

**Final script order (index.html):** `packs/index.js` -> `core/prefs-store`, `core/i18n` -> `spells/spell-vocabulary`, `spell-fields`, `spell-adapter` -> `pack-system/pack-store`, `pack-registry`, `pack-selection` -> `spells/spell-source`, `spell-keys`, `spell-library` -> `characters/character-accent`, `spellcasting-rules`, `character-store`, `bookmark-store` -> `ui/overlay-hooks`, `toast`, `primitives`, `header-toggles` -> `characters/character-editor` -> `pack-system/pack-validate`, `pack-slugs`, `pack-sanitize`, `pack-install`, `pack-spell-index`, `pack-card`, `pack-menu`, `pack-import-dialog`, `pack-rename-dialog`, `pack-manager` -> `app/migration-banner` -> `spellbook/*` (`spell-share`, `print-sheet`, `spell-card`, `spell-detail`, `edition-compare`, `filter-config`, `filter-controls`, `spellbook-state`, `session-mode`, `spellbook-desktop`, `spellbook-mobile`) -> `app/share-build`, `onboarding-modal`, `app`, `main`. Only load-time statements constrain this order; everything else resolves at call time.

## 9. Pitfalls specific to this refactor

| Pitfall | Why | Prevention |
|---------|-----|------------|
| Silent function override | Classic scripts share one scope. Two `function _x` in different files: last wins, no error. | Gate G4 duplicate check. |
| `const` re-declared | Throws at load: whole file dead. Loader comment already records one such near miss (`UI_PREFS_KEY`). | Same gate. |
| Private `_name` is not private | `_` is a convention, not scope. | Treat all 278 names as global. |
| Moving a load-time statement | Boot preload and selection init run on load. | Rules in step 9. |
| `SPELL_VERSIONS` reassigned | Must be mutated in place; several modules hold the same array. | Keep definition and mutation in `pack-registry`. |
| Old SW cache | Content or name change without bump leaves stale offline copies. | Bump in every PRECACHE commit. |
| Test false green | Tests that grep a whole file for a pattern keep passing after the code moved to a file they no longer read. | Symbol-based helper (step 1) and G4. |
| Case-only renames on Windows | Git on NTFS | All new names differ by more than case; use `git mv`. |

## 10. Open decisions for requirements writer

1. `Hifi*` identifier rename: in or out of v2.1. Recommendation: out.
2. Folder layout vs flat `src/`. Recommendation: folders.
3. Tier B merges: yes or no. Recommendation: apply the floor only if file count worries the user.
4. Split inside `HifiDesktop`/`HifiMobile`/`CharacterEditor`: later optional phase, needs its own read.
5. Rename global `pluginStore` -> `packStore`: out (50 tests); only the file name changes.
6. `file://` claim in `PROJECT.md`: correct it (Chrome default blocks it already).

## Sources

- Repo reads: `index.html`, `sw.js`, `v10-hifi.jsx`, `v11-character-editor.jsx`, `spells-data-loader.jsx`, `pack-*.jsx`, `plugin-store.jsx`, `transition-banner.jsx`, `grimorio-helpers.jsx`, `i18n.jsx`, `hifi-tokens.css`, `pack-docs.html`, `scripts/*.tests.ps1`, `.claude/launch.json`, `.planning/PROJECT.md`, `.planning/codebase/*.md` (HIGH).
- Chrome headless experiments on this machine, 2026-10-23 (HIGH for Chrome; Firefox/Safari untested).
- Counts from Node scans of the repo (HIGH).
