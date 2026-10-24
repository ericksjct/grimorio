# Duplication Audit (v2.1 Simplificação e Manutenção)

**Researched:** 2026-10-23
**Scope:** app source at repo root (`index.html`, `grimorio-helpers.jsx`, `i18n.jsx`, `plugin-store.jsx`, `spells-data-loader.jsx`, `pack-*.jsx`, `v11-character-editor.jsx`, `transition-banner.jsx`, `v10-hifi.jsx`, `hifi-tokens.css`, `sw.js`, `pack-docs.html`, `scripts/*.mjs`). Method: full read of every file above plus targeted greps. Line numbers are from the tree at commit `13381d0`.
**Confidence:** HIGH for every location and every "what differs" note (read in the source). MEDIUM for "lines saved" (rough estimates).

## Summary

- Total saving if every cluster is done: about 550-650 lines out of roughly 10,400 lines of app JSX/CSS/HTML (`index.html` 636, helpers 102, `i18n` 614, loader 1010, `pack-*` 2,200, `plugin-store` 231, banner 174, `v10` 2781, `v11` 1211, CSS 1393). The duplication is real but modest. Two clusters carry about half of it: desktop/mobile copies in `v10-hifi.jsx` (D1) and the modal shell (D2).
- Most duplication is NOT in `spells-data-loader.jsx`. The loader has one real internal duplicate (`adaptSpell` builds the same value twice for `{pt, en}`, D12) and two small ones (toast block, D5).
- `pack-import.jsx` vs `pack.schema.json` vs `pack-docs.html` vs `scripts/generate-srd-pack.mjs` are mirrors on purpose. Gates pin them. Do not merge them (see Do-not-merge list).
- **Biggest roadmap risk (applies to almost every cluster):** the 50 gate scripts do two things that break when code moves.
  1. They grep SOURCE TEXT of one named file (example: `function slugKey(` must be in `pack-import.jsx`; `initial.lang || detectLang()` must be in `index.html`; `hifiNorm(spellName(s, s.lang))` must be in `v10-hifi.jsx`; `stripHtml(mdToHtml(s.description))` must be inside the `desc:` literal of `adaptSpell`).
  2. They run ONE jsx file in a Node `vm` sandbox with a stub `window` (example: `check-selection-migration.tests.ps1` runs `spells-data-loader.jsx` with only `window.tt` stubbed). A helper moved to `grimorio-helpers.jsx` and called by bare name from the loader does NOT exist in that sandbox.
  So every "unify X" requirement must list the gate scripts to update in the same plan, and the sandbox harness must also load `grimorio-helpers.jsx` first. The `window.tt ? ... :` and `typeof window.hifiSpellKey` guards in the loader look dead but are test-sandbox seams. Keep them until the harness changes.
- Existing helper files: `grimorio-helpers.jsx` (loads first, no deps, right home for pure helpers) and `i18n.jsx` (loads second). `useDialogA11y` lives in `v11-character-editor.jsx` today. That is the wrong home. D2 moves it.

## Clusters ranked by value / risk

| # | Cluster | Lines saved | Risk | Value/risk |
|---|---------|-------------|------|------------|
| D3 | Theme class string (9 copies) | ~12 | Low | Best |
| D6 | Spell sort / collator / query / comps helpers | ~30 | Low | High |
| D7 | Slug and key-normalize helpers | ~15 | Low | High |
| D8 | `v8*` accessors + `spellTexts()` | ~30 | Low | High |
| D5 | Toast dispatch + fire-and-forget refresh | ~35 | Low | High |
| D14 | CSS: patch layers, reduced-motion, keyframes, font stacks | ~60 | Low-Med | High |
| D1 | Desktop vs mobile in `v10-hifi.jsx` | ~170 | Medium | High value |
| D2 | Modal shell + a11y wiring | ~80 | Medium | High value |
| D4 | UI-prefs I/O + language detection | ~45 | Medium | Medium |
| D9 | Character-store boilerplate in v11 + `useWindowEvent` | ~35 | Low-Med | Medium |
| D11 | `SPELL_VERSIONS` lookups + `_baseIdOf` | ~12 | Low | Medium |
| D16 | i18n call-site duplicates (bilingual `T`, plural) | ~15 | Low | Medium |
| D10 | Saved-key counters (rename / removal / orphans) | ~25 | Medium | Low |
| D12 | `adaptSpell` internal duplicates | ~12 | Medium (gates) | Low |
| D13 | `_checkField` error-prefix repeats | ~10 | Low | Low |
| D17 | Small markup twins (card footer, popover) | ~25 | Low-Med | Low |

Suggested order for the roadmapper: first the pure helpers that many clusters depend on (D3, D6, D7, D8, D5, D4 into `grimorio-helpers.jsx`), then D14 (CSS, independent), then D9/D11/D16, then D2 and D1 (they touch the big files and the file split of `v10-hifi.jsx`; do them before or as part of the split, not after).

---

## D1. Desktop vs mobile copies in `v10-hifi.jsx`

`HifiDesktop` (1122-1651) and `HifiMobile` (2170-2770) repeat the same state wiring and handlers. Sub-clusters:

| Sub | Desktop | Mobile | Diff to keep |
|-----|---------|--------|--------------|
| a. Active character | 1129-1145 (`useCharacters`, `useBookmarks`, `liveChar`, `hifiAccentsFor`, `accent`, `prepared`, `bookmarked`) | 2177-2189 | None. Identical. Make `useActiveCharacter(character, theme, dark)` returning `{chars, update, liveChar, accent, prepared, bookmarked}`. |
| b. Extra filters | 1264-1295 (`extraFilters`, `filterCfg`, `extraValues`, `addExtraFilter`, `removeExtraFilter`, `availableExtras`) | 2198-2222 | Identical. And `extraValues` (1273-1286 / 2200-2213) re-implements `hifiFilterValues` (698-714): same Set + `localeCompare(..., {numeric:true})`. For non-base filters the result is the same. Use `hifiFilterValues` and a shared `useExtraFilters(setFilters, allSpells, uiLang)`. |
| c. Card callbacks | 1227-1258 (`togglePrep`, `toggleBook`, `cardCtxRef`, `onCardOpen`, `onCardPrepare`, `toggleFilter`) | 2292-2320 | `onCardOpen` differs: desktop toggles (`prev === i ? null : i`), mobile only sets (`setSelectedIdx(i)`). Keep as a parameter. `onCardOpen`/`onCardPrepare` MUST keep stable identity (the `React.memo` comparator at 631-641 ignores callbacks; see the comment about the "buscar flame" bug). |
| d. Editor close handler | 1632-1643 | 2752-2762 | Identical. `index.html:596-599` (onboarding) is a subset (only `created`). Make `hifiOnEditorClose(result)`. |
| e. Print prepared | 1385-1389 | 2549-2552 | Identical. Make `hifiPrintPreparedFor(liveChar, allSpells, uiLang, showToast)`. |
| f. Keep last selected during exit animation | 1176-1181 (desktop), 2333-2337 (mobile), 1848-1850 (session) | | Same `useRef` pattern. Make `useRetained(value)`. |
| g. Detail bookmark + copy-link buttons | 1533-1547 | 2346-2358 | Same props. Style differs: desktop buttons add `flexShrink: 0`, mobile copy button adds `display: inline-flex; alignItems/justifyContent: center`. Keep via `style` prop. Desktop adds a close button; mobile has back button in a different place. |
| h. Spell meta line (school · level · conc · ritual) | 1557-1561 | 2091-2095 (session), 2363-2367 | Font size 13 (desktop) vs 14. **Concentration label differs:** desktop uses `tt(lang,'spell.concentration')`, session and mobile use the literal `conc.`. Ritual is the literal `ritual` in all three (not `tt('spell.ritual')`). Preserve both literals as props (see Do-not-merge). |
| i. Character switcher list | 1341-1376 (menu) | 2692-2729 (bottom sheet) | Same rows (switch, Edit, "New character"). Sizes differ: dot 10 vs 12, gap 10 vs 12, padding `8px 12px` vs `12px 18px`, font 15 on mobile only, check size 12 vs 13, plus-circle 14 vs 16. Shared component with a `size` token object. |
| j. Clear-all filters | 854 (`?spell=` reset), 1467-1475 (desktop empty state) | 2321-2325 `clearAllFilters`, used at 2416 and 2581 | **Three different semantics.** Desktop: empties the Set of every existing key, keeps `extraFilters`, also clears query and `onlyPrepared`. Mobile `clearAllFilters`: resets to the 3 base keys, drops `extraFilters`, clears the query, but does NOT touch `onlyPrepared`. The sheet button (2581) calls it as is; the mobile empty state (2416) adds `setOnlyPrepared(false)` on top. Unify only with explicit flags `{ keepExtras, resetPrepared }`. |

Target home: hooks go next to `useHifiAppState` (they depend on it). When `v10-hifi.jsx` is split, put `useActiveCharacter` and `useExtraFilters` in the same file as `useHifiAppState`; put markup twins (g, h, i) in a shared spell-detail file. Existing helper file not a fit (JSX components + React hooks).
Gates likely to read these regions (verify before editing): `check-spell-card-callback-identity.tests.ps1` (identity contract for c), `check-class-filter-*.tests.ps1`, `check-onboarding-editor-transition.tests.ps1` (d), `check-content-lang-ownership.tests.ps1` (lang attrs on g/h).
Risk: **Medium.** Pure refactor of hooks but memo identity and the three clear-all semantics are easy to break. QA must compare desktop and mobile.
Saved: ~170 lines.

## D2. Modal shell and dialog a11y wiring

Copies of "fixed backdrop + `role=dialog` section":

| File:lines | Backdrop | Section | Header |
|------------|----------|---------|--------|
| `pack-import-dialog.jsx:154-192` | `fixed inset 0`, z 100, `rgba(0,0,0,0.55)`, flex center, padding 18, `onClick={onClose}` | `min(560px,100%)`, `maxHeight 80vh`, column flex, `var(--base)`, border `surface1`, radius 8, shadow `0 24px 80px rgba(0,0,0,0.45)`, `stopPropagation` | h2 20px/700 + Close ghost button |
| `pack-rename-dialog.jsx:236-272` | identical, `onClick={onCancel}` | identical | same h2, NO close button |
| `pack-manager.jsx:637-671` (`PackMenu`) | transparent on desktop, `rgba(0,0,0,0.35)` on mobile, no centering, no padding | positioned panel (`panelStyle`), `var(--mantle)`, radius 6 desktop / 8 mobile, same shadow | h2 **18px**/700 + Close |
| `index.html:275-304` (`OnboardingModal`) | same as import, but **no** `onClick` | `min(680px,100%)`, `minHeight 320`, `maxHeight min(720px, calc(100vh - 36px))`, `display: grid` auto-fit columns, `overflow hidden`, `var(--base)` | none |
| `v10-hifi.jsx:2106-2115`, `2436-2456`, `2670-2685` | bottom sheets with scrim `rgba(0,0,0,0.45)`, drag handle 32x4 (drawer) or 40x4 (char sheet) | different (slide-up, no centering) | none |
| `v10-hifi.jsx:1323-1340` (char menu) | scrim `rgba(0,0,0,0.4)`, z 70, transition classes | `var(--mantle)` | none |

Also repeated: `useDialogA11y(dialogRef, open, onClose)` in 9 places (`v11:569`, `v10:1163,1845,2270,2271`, `index.html:263`, `pack-import-dialog:76`, `pack-manager:445`, `pack-rename-dialog:221`). Four of them use the optional-call form `window.useDialogA11y?.(...)` (`index.html:263`, `pack-import-dialog:76`, `pack-manager:445`, `pack-rename-dialog:221`). The `?.` is dead in the app (always defined after `v11` loads) but may be a sandbox seam for the dialog gates; check before removing. `index.html:263` also passes a no-op `() => {}` (onboarding has no close).

Proposal: one `HifiDialogShell` component for the centered-card family (import, rename, onboarding, optionally PackMenu via `panelStyle`/`backdropStyle` props) with props `{ themeClass, label, onBackdropClick, width, maxHeight, extraSectionStyle, header }`. Leave the bottom sheets and the char menu alone (animation classes and positions differ too much). Move `useDialogA11y` out of `v11-character-editor.jsx` into the same file as the shell. No existing file is the right home: put both in a new small file (e.g. `dialog.jsx`) loaded right after `i18n.jsx`, or accept `grimorio-helpers.jsx`. Update `index.html` load order and `sw.js` PRECACHE if a file is added.
Gates that read these sources (by name and grep; read each before editing, I did not read them all): `check-pack-import-dialog.tests.ps1` (290 lines, runs the dialog code), `check-pack-menu.tests.ps1`, `check-slug-rename.tests.ps1`, and the six `check-onboarding-*.tests.ps1` scripts for the onboarding modal.
Risk: **Medium** (visual). Compare screenshots of the 4 dialogs in 2 themes.
Saved: ~80 lines.

## D3. Theme class string

`${dark ? 'hifi-dark' : 'hifi-light'}${theme && theme !== 'catppuccin' ? ' hifi-theme-' + theme : ''}` appears 9 times: `v11:698`, `v10:1260`, `v10:2327`, `transition-banner:112`, `pack-manager:605`, `pack-import-dialog:90`, `pack-rename-dialog:225`, `index.html:262`, `index.html:460-462` (same rule, body `className`).
Differs only by the `hifi ` prefix: `transition-banner`, `pack-manager`, both pack dialogs add `hifi ` inside the string; `v11`, `v10`, `index.html:262` add it at the use site (`className={`hifi ${themeClass}`}`).
Target: `hifiThemeClass(dark, theme)` (no prefix) in `grimorio-helpers.jsx`. Callers add `hifi ` themselves.
Not mergeable: `pack-docs.html:452-453` (static page, plain script, no helpers). Keep.
Gates: none grep this string. Sandboxes that run `pack-manager`/`transition-banner` (check-pack-menu, check-transition-banner) need the helper in the harness.
Risk: Low. Saved: ~12.

## D4. UI-prefs I/O and language detection

**Prefs (`spellbook-ui-prefs`)** read/write copies:
- `index.html:145-152` (`UI_PREFS_KEY`, `loadPrefs`, `savePrefs`): `JSON.parse(...) || {}`, no type check.
- `spells-data-loader.jsx:67-75` (`_uiLang`), `496-503` (`_readPrefs`, validates `typeof === 'object'`), `550-557` (`_persistSelection`, read-modify-write, `delete next.versionKey`).
- `transition-banner.jsx:43-45` (`_peekUiPrefsBlob`), `92-98` (dismiss: read-modify-write).
- `pack-docs.html:451` (static; keep).
The comments at `loader:65` and `banner:38-41` say the copies exist only to avoid a `const UI_PREFS_KEY` name clash in the shared global scope. Moving the key and two functions (`readUiPrefs()`, `writeUiPrefs(patch)`) to `grimorio-helpers.jsx` (loads first) removes the clash. Keep the stricter validation from `_readPrefs` (return `{}` unless a plain object).
Other keys are single-owner: `hifi_chars_v1`/`hifi_bookmarks_v1` (v11 only), `hifi_session_v1`/`hifi_session_view_v1` (v10 only), `spellbook-onboarding-v1` (index.html only). Nothing to merge there.

**Language detection** copies:
- `index.html:163-176`: `browserLanguageCandidates()` + `detectLang()` (any `pt*` => `ptbr`, else `en`).
- `spells-data-loader.jsx:768-781` (`_browserDefaultKey`): repeats the same 4-line candidates array verbatim, same rule, then picks a version.
- `loader:67-75` (`_uiLang`) and `i18n.jsx:539-543` (`normLang`) both collapse a stored value to `ptbr`/`en`. Difference: `_uiLang` also strips `_`/`-` and falls back to `ptbr` for non-pt/non-en; `normLang` falls back to `en` for non-pt. In practice the stored value is always `ptbr`/`en` (written through `normLang`), so `_uiLang` can call `normLang`. Verify with the loader sandbox (it has no `normLang`).
- `hifiHtmlLang(lang)` (`v10:14`) vs `index.html:480-482` (same `'pt-br' : 'en'` ternary; also `pt_BR`/`en_US` for `og:locale`).
Target: `browserLanguageCandidates()` and `detectLang()` to `grimorio-helpers.jsx` (or `i18n.jsx`, which already owns `normLang`); `hifiHtmlLang` to the same place.
Gates (strict): `check-browser-language-detection.tests.ps1` requires `function browserLanguageCandidates` in `index.html`; `check-ui-lang-state.tests.ps1` and `check-source-dispatch.tests.ps1:208` pin `initial.lang || detectLang()` in `index.html`; `check-content-lang-ownership.tests.ps1:26` requires `function hifiHtmlLang(` in `v10-hifi.jsx`; `check-pack-composition.tests.ps1` and `check-selection-migration.tests.ps1` run the loader in `vm` and call `_browserDefaultKey`/`_readPrefs`.
Risk: Medium (many gates, sandbox harness). Saved: ~45.

## D5. Toast dispatch and fire-and-forget refresh

`window.dispatchEvent(new CustomEvent('hifi-toast', { detail: { msg, kind } }))` appears 13 times: `loader:238, 588, 676`; `pack-manager:453, 525, 534, 580, 922`; `pack-import-dialog:118, 139`; `index.html:433, 437, 514`. `kind: 'err'` on 8 of them.
Also inside the loader, the "fallback to default" toast block is copy-pasted at `236-245` and `586-596` (identical, same `window.tt ? ... : 'nenhum pacote ...'` fallback). `loadVersion` has a third variant (`676-679`) with a different key.
Also: `window.refreshPluginVersions().catch(e => console.warn(...))` at `pack-import-dialog:128-131` and `pack-manager:528-529` plus the 2 boot calls at `loader:1004,1008` (also the `if readyState === 'loading' ... else` boot pair is duplicated at `loader:1000-1009` and `plugin-store.jsx:173-179`).
Target: `hifiToast(msg, kind)` in `grimorio-helpers.jsx`. Make `_toastFallbackToDefault()` a local function in the loader (local helper is enough there). Add `onDomReady(fn)` helper for the two boot pairs.
Differences to keep: `index.html:514` toast text is a hard-coded PT string (`'Link da build copiado'`), not a `tt()` key. Keep the string (zero visible change), do not "fix" it in this milestone.
Gates: `check-selection-migration.tests.ps1:204` looks for `hifi-toast` events from the loader in a sandbox where `window.dispatchEvent` is stubbed. If `hifiToast` lives in helpers, the loader sandbox needs it or the loader keeps its own copy. `check-pack-menu.tests.ps1:161` and `check-pack-import-dialog.tests.ps1:23` grep for the literal `hifi-toast` in the dialog sources and will fail if the literal leaves those files.
Risk: Low. Saved: ~35.

## D6. Spell sort, collator, query match, component list, class label

- **Comparator** `(a.lvl - b.lvl) || name(a).localeCompare(name(b), collator)`: `v10:158` (`hifiPrintPrepared`, **no locale argument**), `859-861` (`?spell=` index), `892-894` (`filtered`), `1820-1821` (`HifiSessionMode`, no `|| ''` guard). The comment at 855-857 says the first two must stay identical.
- **Collator** `uiLang === 'ptbr' ? 'pt' : 'en'`: `v10:712, 858, 891, 1282, 1821, 2209`.
- **Query match** `hifiNorm(spellName(s, s.lang)).includes(q) || hifiNorm(s.en).includes(q)`: `v10:867-871`, `v11:624-629`.
- **Component list** `(s.comp || '').split(/\s+/).filter(Boolean)`: `v10:323, 503, 688, 1931`.
- **Class label** capitalize of `CLASS_PT[key]` or key: `v10:1874-1878` (`classLabel` in session) and `v11:782-786` (`label` in editor). Identical. `hifiClassFilterLabel` (`v10:733-737`) is NOT the same (dictionary chosen by target language, title-case); keep it separate.
- **Level label** `s.lvl === 0 ? tt('spell.cantrip') : `${tt('spell.level')} ${lvl}``: `v10:331/333, 581, 1558, 2092, 2364` (and session list uses `session.groupCircle`, different). `levelKey` (`helpers:41`) already exists and is unused; the filter config (`v10:678`) repeats its body.
Targets in `grimorio-helpers.jsx`: `collatorFor(lang)`, `compareSpells(collator)` (or `sortSpells(list, uiLang)`), `spellMatchesQuery(s, q)`, `spellComponents(s)`, `classLabel(key, lang)`, `levelLabel(lvl, lang)`; use the existing `levelKey` in `hifiFilterConfig`.
Differences to keep: print path sorts with the default locale (`localeCompare(b)` with no locale). Passing a collator would change sort for non-pt/en browsers. Keep a `collator` parameter and pass `undefined` there. Session sort has no `|| ''`; `spellName` always returns a string, so adding it is safe.
Gates: `check-content-lang-ownership.tests.ps1:80` pins `hifiNorm(spellName(s, s.lang))` in `v10-hifi.jsx`; edit the pin to the new helper.
Risk: Low. Saved: ~30.

## D7. Slug and key normalization

- `slugKey(s)` = `String(s || '').toLowerCase()` is defined in `pack-import.jsx:298`, and inlined 3 more times: `pack-manager.jsx:204`, `v10-hifi.jsx:949` and `978`. The comment at `pack-import:295` already says it is the "same normalization used by the byName index".
- ASCII slug pipeline `lower -> /[^a-z0-9]+/ -> '-' -> trim '-'`: `v10:78-81` (`hifiSpellSlug`), `pack-import:330-335` (`suggestSlug` base), `plugin-store:187-192` (`_packFileName`). Output is the same for all three (collapse makes the single-hyphen trim equal). Only the caps differ: none / 64 with re-trim and `pack` fallback / 60 **without** re-trim after slice. Helper `asciiSlug(str)` with no cap; callers keep their own cap logic.
Targets: both in `grimorio-helpers.jsx`. `pack-import.jsx` keeps exporting `slugKey` in `window.packImport` (re-export) because `check-pack-import.tests.ps1:114` and `check-slug-rename.tests.ps1:16,35` pin `function slugKey(` and the export list in that file. Change those pins in the same plan.
Do NOT merge: `scripts/generate-srd-pack.mjs:66-74` `slugify` (also strips diacritics and apostrophes, builds pack identity; Node, cannot load helpers) and the runtime `hifiSpellSlug` (existing `?spell=` share links depend on `tasha-s` style output vs pack identity `tashas`). See Do-not-merge.
Risk: Low. Saved: ~15.

## D8. `v8*` accessors and `spellTexts()`

`grimorio-helpers.jsx:58-99`: four functions repeat `typeof x === 'string' ? x : x[lang] || x.pt || x.en || ''`. Add `_pickLang(val, lang)` and keep the four public functions. Fallbacks differ and must stay: `v8Description` falls back to the school placeholder text, `v8Upgrade` to a canned PT/EN sentence, the two `Html` variants to `''`.
Call sites that call all four with the guard `window.v8X ? window.v8X(...) : ''`: `v10:258-261` (`chunkSpellForPrint`), `316-319` (`HifiPrintCard` fallback, the same object `chunkSpellForPrint` returns for a short spell), `500-502` (card: only desc + descHtml), `936-940` (detail), `2050` (session card: desc only). The guards are dead in the app (helpers load first) and live only for `helpers:101` comment compatibility.
Target: `spellTexts(s, lang)` -> `{desc, descHtml, upgrade, upgradeHtml}` in `grimorio-helpers.jsx`; drop the `window.` guards. Cards that need two fields destructure two.
Risk: Low. Saved: ~30.

## D9. Character-store boilerplate and window-event hook

- `peekCharacters` (`v11:271-279`) and `peekBookmarks` (`366-374`) are line-by-line twins (the first comment says "Espelha peekBookmarks() linha a linha"). One `_peekArray(storageKey)`.
- Character id `char-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`: `v11:253`, `v11:678`, `index.html:217`. Make `newCharId()`.
- Subscribe/unsubscribe to a window event inside `useEffect`: `v11:303-307, 413-417, 544-548, 607-611`; `loader:932-939, 951-955`; `pack-manager:457-462, 470-475, 479-485, 791-803`; `transition-banner:70-88`. A `useWindowEvent(name, handler)` hook fits most; the ones that also run an initial `recompute()` or cancel flags keep their body.
- Literal `[1,2,3,4,5,6,7,8,9]` 6 times (`v10:232, 1837, 2120`, `v11:945, 951, 972`) and the clamp `Math.max(a, Math.min(b, parseInt(x,10) || a))` (`v11:141, 241, 819, 986`).
- Dead dev guards that repeat: `typeof loadCharacters === 'function'` and friends in `index.html:215,225,227,504`, `window.bilingual ? ... :` in `v11:654`, `window.tt ?` in `v11:869`.
Target: pure helpers (`newCharId`, `clamp`, `SPELL_CIRCLES`) in `grimorio-helpers.jsx`; `_peekArray` stays inside `v11-character-editor.jsx` (store file); `useWindowEvent` next to `useDialogA11y`.
Gates: `check-bookmarks-read-purity.tests.ps1` (37 hits; instruments `localStorage` and proves reads never write). Keep `peekBookmarks` write-free.
Risk: Low-Med. Saved: ~35.

## D10. Saved-key counters (rename impact, removal impact, orphans)

Three loops over "all `prepared` of all characters + all bookmarks":
- `pack-rename-dialog.jsx:37-54` `renameImpact`: counts each occurrence, uses `window.peekCharacters`.
- `pack-manager.jsx:259-286` `_removalImpact`: counts per occurrence AND number of affected characters, uses `window.loadCharacters` (not `peek`).
- `transition-banner.jsx:51-62` `_countOrphans`: counts DISTINCT keys (Set union of prepared + bookmarks).
Counting rules differ on purpose (occurrence vs distinct vs per-character). Share only the iteration: `forEachSavedKey(cb)` or `savedKeys()` returning `{ perChar: [[charId, keys]], bookmarks }` in `v11-character-editor.jsx` next to `peek*`. Switching `_removalImpact` to `peekCharacters` is equivalent here (the default character has no `prepared`).
Gates: `check-bookmarks-read-purity.tests.ps1`, `check-slug-rename.tests.ps1`, `check-transition-banner.tests.ps1`.
Risk: Medium (purity proof). Saved: ~25. Low priority.

## D11. `SPELL_VERSIONS` lookups and `_baseIdOf`

`_versionByKey(key)` exists only inside the loader (`57-59`, 12 uses). Outside it there are 8 inline `(window.SPELL_VERSIONS || []).find(v => v.key === k)`: `pack-manager:568, 842, 781, 805`, `pack-import:418`, `v10:970, 975, 1064`. `selBaseId` at `pack-manager:614` is `_baseIdOf` from `loader:757-759` copied inline.
Fix: expose `window.getSpellVersion(key)` and `window.baseIdOf(version)` from the loader (it already exposes `window.SPELL_VERSIONS`, same mutable-array rule applies; the helper must read the live array).
Gates: loader sandbox scripts pass an extended list; adding `window.getSpellVersion` is additive.
Risk: Low. Saved: ~12.

## D12. `adaptSpell` internal duplicates (`spells-data-loader.jsx:372-470`)

- `desc.pt`/`desc.en` are the same expression, computed twice; same for `descHtml`, `upgrade`, `upgradeHtml` (`424-447`). Compute once per field.
- Alias fields set to the same value: `pt`/`displayName`/`name_pt` (`ptName`), `conc`/`concentration`, `rit`/`ritual`, `time`/`castTime`. Removing an alias is a dead-code decision (needs a consumer grep); not a pure dedupe.
- Four copies of the "Sem prototipo (CR-03)" comment block (`253-257, 269-272, 280-283, 290-293`) and a `Object.assign(Object.create(null), {...})` wrapper each. A `nullProto(obj)` helper removes ~12 comment/boilerplate lines. `CLASS_EN` (`284-288`) is the exact inverse of `CLASS_PT`; it can be derived, but only if key order and the diacritic keys stay equal (`'clérigo'`, `bárbaro`, `artífice`).
Gates (strict): `check-upgrade-heading-strip.tests.ps1:19,27` and `check-srd-name-and-markdown.tests.ps1:65,79` regex the literal `desc: { ... stripHtml(mdToHtml(s.description))` and `upgrade: { ... stripHtml(stripUpgradeHeading(s.upgradeDescription))` inside `adaptSpell`. The first comment says "must not be edited". Hoisting to a local variable breaks both. Either leave this cluster or change those two gates with intent.
Risk: Medium (gates only; the logic is trivial). Saved: ~12. Low priority.

## D13. `pack-import.jsx` validation repeats

`_checkField` (164-198) writes `_fail(PACK_ERROR_CODES.SCHEMA_INVALID, `packImport.validate: ${path} ...`)` 14 times. A local `_bad(path, msg)` removes the prefix and the code argument.
Do not touch the three mirrors (see Do-not-merge). `check-pack-validator.tests.ps1` pins `packImport.validate: ` text, `function _checkField`, `function _checkObject`, and exactly one `JSON.parse(` call.
Risk: Low. Saved: ~10.

## D14. CSS (`hifi-tokens.css`)

a. **Patch layers that override earlier rules** (collapse each pair into one rule, same specificity, same order):
   - `.hifi-card.compact .hifi-card-desc` 335 (`flex: 0 0 auto; overflow: visible`) and `::after { display: none }` 336, then 1251-1252 (`max-height: 6em; overflow: hidden`, `::after { display: block }`). 336 is fully dead.
   - `.hifi-input::placeholder` 638 (`overlay2`) vs 1254 (`subtext0; opacity: 1`). 638 is dead.
   - `.hifi-card-meta-sep` 472 (`overlay0`) vs 1256 (`subtext0`). 472 color is dead.
   - `.hifi-pill` 484-494 (`font-family`, `font-size: 12px`) vs 1238 (`font: inherit; font-family; font-size: 12px; line-height: 1.3; margin: 0`).
   - `.hifi-tabbar-search` 1280-1288 (`border`, `background: surface0`) vs 1346 (`border: 0; background: crust`); `.hifi-tabbar-search-close` 1297-1301 vs 1347 (`width/height 36 -> 32`, `background: base`).
   - The `font-family` override group at 765-772 re-sets `font-family` for six classes. Five of them already set it a few lines above (`.hifi-btn-primary` 515, `.hifi-btn-secondary` 536, `.hifi-btn-ghost` 551, `.hifi-input` 627, `.hifi-filter-chip` 680); those earlier declarations are dead. `.hifi-icon-btn` sets none above.
b. **`@media (prefers-reduced-motion: reduce)` blocks** at 847-852, 869-875, 931-934, 1223-1234, 1302-1304 (plus the inline boot style in `index.html:60`). Merge the five into one block at the end. Keep `!important` where it is (1223-1234).
c. **Keyframes:** `hifi-slide-in` (792-795) is byte-identical to `hifi-slide-in-right` (822-825) and no `animation:` rule uses it (dead). `hifi-onboarding-backdrop-in` (861-864) is byte-identical to `hifi-fade-in` (802-805); reuse the keyframe, keep the `animation:` shorthand at 855 (180ms ease-out differs from `.hifi-fade-in`'s cubic-bezier). `hifi-onboarding-editor-in` (22px) differs from slide-in-right (24px): keep.
d. **Font stacks repeated:** `'Marauder Text', Georgia, serif` 11x in CSS + 5x in JS inline styles; `'JetBrains Mono', ui-monospace, monospace` 10x CSS + 6x JS + 1 in `pack-docs.html`; `ui-sans-serif, system-ui, ...` 8x CSS + 1x JS. Define `--font-text`, `--font-mono`, `--font-chrome` on `.hifi` and use `var(...)`. Two chrome stacks exist (long at 771, short elsewhere): keep them as two variables.
e. **Level bar classes** `.hifi-level-0..9` (302-311) express `background: var(--level-N)`; JS already writes `var(--level-${n})` inline elsewhere (`v10:583`, `2026`). Only `v11:1055,1114` use the classes. Optional: inline in v11 and delete 10 rules.
f. **Scrim/shadow constants** `rgba(0,0,0,0.45/0.55)` and `0 24px 80px rgba(0,0,0,0.45)` appear 4x in JS inline styles (see D2) and ~10 times in CSS. Fold the JS ones into the D2 shell; leave the CSS ones.
Do not merge: the 11 theme palette blocks (85-251). See Do-not-merge.
Gates: `check-onboarding-*` scripts grep CSS rules for the onboarding animations; `check-csp`, none for CSS. QA: headless screenshot diff across 6 themes x light/dark.
Risk: Low-Med (cascade order). Saved: ~60 lines (a: ~20, b: ~12, c: ~8, e: ~10, d: 0 lines but fewer literals).

## D15. Mirrored lists in `index.html` and `sw.js` (keep, only document)

`sw.js:36-46` PRECACHE lists the same app-shell files as the `<script>` list in `index.html:130-141`; `sw.js:57-60` repeats the four CDN URLs and pinned versions from `index.html:103-107`. They cannot share code (service worker vs page, no build). Not a dedupe target, but the roadmap's file renames will touch both: add one gate that compares them (a small check, not a merge).

## D16. i18n call-site duplicates

- `index.html:254` `const T = (pt, en) => lang === 'ptbr' ? pt : en;` duplicates `window.bilingual(lang)` (`i18n.jsx:583-586`); `v11:654` already uses `bilingual` with a dead fallback. Use `bilingual(lang)` in the onboarding modal. Also `index.html:199-203` has two inline `lang === 'ptbr' ?` ternaries for the same reason.
- Plural noun expression `tt(lang, 'noun.spell.' + window.i18nPlural(n))`: `v10:159`, `pack-manager:56, 380`; mobile does it by hand at `v10:2585` (`n === 1 ? 'noun.spell.one' : 'noun.spell.other'`; same result as `i18nPlural` for numbers). Also `transition-banner:113` uses `migration.orphansOne/Many` (not `.one/.other`). Add `nounSpell(lang, n)` (and `nounCharacter`) next to `plural` in `i18n.jsx`. Do not rename the `migration.orphans*` keys in this milestone unless the tests and both languages move together.
- Exact duplicate values in `STRINGS` (checked by script): PT `spell.cast`/`spell.castTime` ("execução"), `char.label`/`noun.character.one`, `import.installPack`/`import.title` ("Instalar pacote"); EN `char.label`/`noun.character.one`, `import.installPack`/`import.title`. All pairs are different roles (label vs noun; button vs title). Do not merge keys.
- Keys with no literal reference (feed the dead-code researcher): `filter.searchFilterShort`, `filter.searchFilterAria`, `section.tools`, `section.actions`, `manager.originBuiltin`, `manager.originInstalled`, `manager.spellCount`, `manager.spellCountUnknown`, `manager.versionLabel`. (`stats.*`, `ability.*` are built dynamically and are used.)
Gates: `check-i18n-pack-menu.tests.ps1` (parity), `check-pack-menu.tests.ps1` (captures real `tt`/`i18nPlural` in `vm`).
Risk: Low. Saved: ~15.

## D17. Small markup twins

- Card footer (V/S/M chips · range · source · flags): `HifiSpellCard` `v10:604-628` vs session card `2064-2075`. Differences: the card shows `title` tooltips on each chip and a source (`s.src`) block; the session card has no chip titles and no source. Shared `HifiCardFooter({ s, lang, showSource, chipTitles })`. ~25 lines.
- Popover panel: `FilterChipDropdown` `v10:1673-1681` vs `HifiAddFilter` `1734-1742` (same backdrop `fixed inset 0 z 11`, same panel style; `minWidth` 200 vs 180). ~12 lines.
- Print helpers: `hifiPrint`, `hifiPrintList`, `hifiPrintPrepared` (`v10:138-161`) each build the `hifi-print-request` event; `hifiPrint` and `hifiPrintList` have no call site (comment at `v10:189-191`: "sem call site hoje"). Dead-code, not dedupe.
- Share via `navigator.share` -> clipboard -> toast fallback: `v10:106-133` (`hifiCopyLink`, `hifiShare`), `v10:2564-2571` (share view), `index.html:510-517` (share build). Messages differ per site (`toast.linkCopied` with `{url}` vs `toast.linkCopiedShort` vs a raw PT string). A `shareOrCopy({title, url, onCopied, onFail})` would save ~15 lines. Keep the three message sets.
Risk: Low-Med. Saved: ~25-50.

---

## Do-not-merge list (copies that differ on purpose)

1. **`THEME_PALETTES` (`v11:11-74`) vs the CSS accent variables (`hifi-tokens.css`).** Looks like the same hex values, but the JS table is the per-character swatch palette and differs from the CSS tokens in places: Nord dark blue `#81a1c1` vs CSS `--blue: #5e81ac`, Nord pink `#88c0d0` (a "frost" substitute) vs CSS `--pink: #b48ead`, Daylight dark blue `#6aa0f0` vs `#9cd1bb`, red `#f06a6a` vs `#ff657a`. Deriving JS from CSS vars would change swatch colors. Keep both.
2. **The 11 CSS theme palette blocks (`hifi-tokens.css:85-251`).** Same variable names, different data. The `--level-N` values sometimes equal another token in the same theme, but the mapping differs per theme (Solarized light `--level-3` is `--lavender`, Catppuccin light `--level-3` is `--blue`; Daylight dark `--level-2` `#afd583` is in no other token). Rewriting them as aliases saves no lines and adds risk.
3. **`pack-import.jsx` `META_FIELDS`/`SPELL_FIELDS`/`LICENSE_FIELDS` vs `pack.schema.json` vs the tables in `pack-docs.html` vs `scripts/generate-srd-pack.mjs` `validateValue`.** The hand mirror is the design (D-13: no dependency). `check-pack-validator.tests.ps1` proves parity in both directions. `IMAGE_SRC` and `MAX_IMAGE_CHARS` are mirrored by the schema `pattern`/`maxLength` the same way. The Node validator cannot import a browser script. `pack-docs.html` is bilingual prose, hand written.
4. **`generate-srd-pack.mjs` `slugify` and `freeIdentifier`, `extract-ptbr-source.mjs` `CLASS_PT_EN`/`SCHOOL_PT_EN`.** Node scripts; `slugify` strips diacritics and apostrophes (pack identity), runtime `hifiSpellSlug` does not (share links). `CLASS_PT_EN` maps to Capitalized EN and uses `Guardião` for Ranger, unlike the runtime `CLASS_EN` (lowercase, `patrulheiro`). Keep.
5. **`hifiSpellSlug` vs pack identity slug vs `suggestSlug`.** Same family of rules, different caps and different inputs (name_en display vs `name`). Share the pure `asciiSlug` core only (D7). Do not unify the callers' cap/fallback logic.
6. **Character-name duplicate checks:** `v11:660` (trim + lowercase) vs `index.html:201-206` (lowercase only, no trim). Different input sources (typed vs imported).
7. **`role` defaults:** `_packToVersion` (`loader:126`) and `_installedRows` (`pack-manager:83`) default to `additional`; `_builtinRows` (`pack-manager:111`) defaults to `base`. Intentional.
8. **Concentration/ritual labels in the three detail headers:** desktop `tt('spell.concentration')`, session and mobile literal `conc.`, ritual literal `ritual` everywhere, while the print card uses `tt('spell.ritual')`. Visible text differs (case, abbreviation, language). Preserve exactly; any change breaks "zero visible change". A candidate for a later, deliberate i18n fix, not for v2.1.
9. **School filter order** `['evoc','conj','abjur','ench','ilus','div','necr','trans']` (`v10:679`) vs `SCHOOL_KEYS` order (`helpers:28`: abjur, conj, div, ench, evoc, ilus, necr, trans). The UI order is a product choice. Do not derive one from the other.
10. **Print comparator without locale** (`v10:158`). See D6.
11. **`window.tt ?`, `typeof window.hifiSpellKey`, `window.pluginStore` guards in `spells-data-loader.jsx` and `v11:654, 869`.** Test sandbox seams, not dead code, until the harness loads the real helpers.
12. **`pack-docs.html` theme/prefs script (`448-455`)** and its `<style>`. Static page, no module system. Keep its own 4-line script.
13. **`sw.js` PRECACHE vs `index.html` script list and CDN pins.** See D15.
14. **Exact-duplicate i18n values** listed in D16. Different semantic keys.
15. **`desktop` vs `mobile` `onCardOpen` toggle behavior and the three clear-all variants** (D1.c, D1.j).
16. **`hifiClassFilterLabel` vs `classLabel`.** Different job (see D6).

## Sources

- Full read: `index.html`, `grimorio-helpers.jsx`, `i18n.jsx`, `spells-data-loader.jsx`, `plugin-store.jsx`, `pack-import.jsx`, `pack-import-dialog.jsx`, `pack-rename-dialog.jsx`, `pack-manager.jsx`, `transition-banner.jsx`, `v11-character-editor.jsx`, `v10-hifi.jsx` (all sections), `hifi-tokens.css`, `sw.js`, `pack.schema.json`, `pack-docs.html` (head and tail), `scripts/generate-srd-pack.mjs` (helpers + validator), `scripts/extract-ptbr-source.mjs` (tables), `scripts/run-tests.ps1`, parts of `check-pack-validator`, `check-selection-migration`, `check-upgrade-heading-strip`.
- Script check of `STRINGS` for equal values and unreferenced keys (run in the session scratchpad; results quoted in D16).
- Gate coupling counts came from grep of `scripts/*.tests.ps1` (95 hits in 16 files for the identifiers moved by D3-D12).
