---
phase: 04-loader-integration-source-dispatch
fixed_at: 2026-08-18T23:18:08Z
review_path: .planning/phases/04-loader-integration-source-dispatch/04-REVIEW.md
iteration: 1
findings_in_scope: 13
fixed: 13
skipped: 0
status: all_fixed
---

# Phase 4: Code Review Fix Report

**Fixed at:** 2026-08-18T23:18:08Z
**Source review:** .planning/phases/04-loader-integration-source-dispatch/04-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 13 (CR-01, WR-01..WR-12 — Info findings IN-01..IN-07 explicitly out of scope per fix instructions)
- Fixed: 13
- Skipped: 0

All 24 `scripts/check-*.tests.ps1` structural tests pass after every commit (verified after each individual fix, not just at the end).

## Fixed Issues

### CR-01: `?f.constructor=` shared link permanently error-screens the app

**Files modified:** `v10-hifi.jsx`, `scripts/check-loader-hardening.tests.ps1`
**Commit:** `a8bad64`
**Applied fix:** `hifiFilterConfig()` now returns `Object.assign(Object.create(null), {...})` instead of a plain object literal, closing the same prototype-pollution class CR-03 already fixed in the loader's lookup tables. Added a belt-and-braces key whitelist at the `?f.*=` URL-parsing site (`useHifiAppState`) so unknown keys never enter `filters` state at all. Added a structural assertion to `check-loader-hardening.tests.ps1` in the same style as the existing CR-03 loop, and verified with a standalone Node harness that `?f.constructor=` no longer yields a truthy inherited value.

### WR-01: Mount-time `savePrefs` destroys a saved pack selection before enumeration can honour it

**Files modified:** `index.html`, `spells-data-loader.jsx`
**Commit:** `231d5e3`
**Applied fix:** Added `window.hasPendingSpellVersion()` in the loader (`() => !!_wantedVersionKey`). The App's persistence effect in `index.html` now skips the `savePrefs` write while a pending preference is still armed, and merges with `loadPrefs()` instead of overwriting the whole object when it does write.

### WR-02: `refreshPluginVersions()` has no concurrency guard, and the CR-01 repair is a silent switch

**Files modified:** `spells-data-loader.jsx`, `i18n.jsx`, `scripts/check-source-dispatch.tests.ps1`
**Commit:** `1d2d018`
**Applied fix:** `refreshPluginVersions()` is now a synchronous wrapper that dedups concurrent calls via `_refreshInFlight` (same idiom as `_pending`/`_dbPromise`); the real work moved to `_refreshPluginVersionsInner()`. The CR-01 repair branch (dangling `_currentVersion`) now dispatches a `hifi-toast` (new i18n key `toast.versionSwitchedAway`, PT+EN) alongside the existing `console.warn`, so the forced version/language switch is explained instead of silently observed. Updated `check-source-dispatch.tests.ps1`'s literal-text assertions to match the new wrapper/inner function split.

### WR-03: Cache invalidation for a removed pack misses `_pending`, resurrecting it

**Files modified:** `spells-data-loader.jsx`
**Commit:** `15bb077`
**Applied fix:** The in-flight load in `loadVersion()` only writes `_cache[key]` (and, at the time, `_rawCache[key]`) if `_versionByKey(key)` still resolves when the fetch/adapt completes — an in-flight load for a pack removed mid-fetch no longer resurrects it in memory.

### WR-04: Missing IndexedDB record produces a silently empty spell list cached as success

**Files modified:** `plugin-store.jsx`
**Commit:** `f4cf1e0`
**Applied fix:** `getSpells(id)` now throws when the record is absent instead of returning `[]`. The loader's existing catch in `loadVersion()` absorbs this exactly like any other load failure (toasts `toast.loadFailed`, does not cache the failure).

### WR-05: Third-party pack metadata coerced into plausible-but-wrong edition/school values

**Files modified:** `spells-data-loader.jsx`, `v10-hifi.jsx`, `scripts/check-loader-hardening.tests.ps1`
**Commit:** `81510dc`
**Applied fix:** `adaptSpell()` now propagates absence instead of inventing it: `edition: edition || ''` (was `edition || detectEdition('')`, which always resolved to `'5e 2014'`) and `school: typeof schoolIdx === 'number' ? schoolIdx : null` (was `: 4`, silently becoming Evocation). Deleted `detectEdition()` — its only call site always passed `''`. Updated the detail-view render site (`v10-hifi.jsx` `{s.src} · {s.edition || '5e 2014'}`) to match the existing honest pattern used elsewhere in the file (`s.edition ? ... : ''`). Updated the CR-03 Node harness in `check-loader-hardening.tests.ps1` to accept `null` for unrecognized school (previously required strictly `'number'`).
**Partial-scope note:** the review's fix text also said "render ... an escola desconhecida chip." I did not extend this to `schoolKey()`/`schoolName()` in `grimorio-helpers.jsx` (an unreviewed, out-of-scope file) — those helpers still silently default an unrecognized/`null` school index to Evocação/Evocation (`SCHOOL_KEYS[idx] || 'evoc'`, `arr[idx] || arr[4]`), including in `hifiFilterConfig`'s `get` accessor used for filtering. So a pack with an unrecognized school name will still visually and filter-wise present as Evocação, even though `s.school` is now honestly `null`. Closing that fully would require a new filter value, chip styling, and i18n across ~5 render sites in `v10-hifi.jsx` plus the shared helper — a larger, more invasive change than this Warning's stated fix scope. Flagging as a fast-follow rather than silently leaving it unmentioned.

### WR-06: `HifiLangToggle` infers edition from a regex on the pack-author-chosen version key

**Files modified:** `v10-hifi.jsx`
**Commit:** `32e4fec`
**Applied fix:** Replaced `const editionOf = (v) => (/2024/.test(v.key) ? '2024' : '2014');` with the declared `v.edition` field, matching the pattern already used in `useEditionCompare`. Without a declared edition the toggle degrades to disabled (buttons already no-op when `pt`/`en` resolve to null) instead of jumping to a wrong dataset/language. Kept the change scoped to the `curEdition`/`pt`/`en` calculation only, per the phase's caution not to redesign this component ahead of Phase 04.1.

### WR-07: Edition comparator offers the first entry of *any* other edition (registry order picks SRD over PHB)

**Files modified:** `spells-data-loader.jsx`, `v10-hifi.jsx`, `scripts/check-edition-compare.tests.ps1`
**Commit:** `be15b44`
**Applied fix:** Added a `corpus` field (`'srd' | 'phb' | 'pack'`) to every `BUILTIN_VERSIONS` entry and to `_packToVersion()`. `useEditionCompare`'s `other` selection now tries a same-corpus match first, falling back to any other edition only if none exists. Extended `check-edition-compare.tests.ps1` with the concrete PHB-2024→PHB-2014 pair the review asked for: a Node runtime proof (written to the OS temp dir, not the repo root — pre-empting the WR-12 pattern) plus a structural assertion on the whole function body (not just the `const other = ...` line, since checking only that line would pass even if `sameCorpus()` never actually compared `v.corpus`).

### WR-08: Import dialog never resets, so reopening shows a stale success and re-installs duplicate the pack

**Files modified:** `pack-import-dialog.jsx`
**Commit:** `2e56930`
**Applied fix:** Added a `React.useEffect` (positioned above the `if (!open) return null;` early return, per the Rules of Hooks) that resets `result`/`error`/`file`/`url`/`mode` whenever `open` becomes true.

### WR-09: Storage failures collapse to `packErr.unknown` through a prototype-bearing lookup

**Files modified:** `pack-import-dialog.jsx`, `i18n.jsx`
**Commit:** `ca1234d`
**Applied fix:** `PACK_ERR_KEY_BY_CODE` now built via `Object.assign(Object.create(null), {...})`. `packErrKeyFor()` was adapted from the review's suggested signature (`packErrKeyFor(err)`) since the actual call site passed only `err.code`, not the full error — updated the call site to pass `err` and added quota detection (`err.name === 'QuotaExceededError' || code === 22`) mapping to a new `packErr.quota` i18n key (PT+EN).

### WR-10: The dialog's `refreshPluginVersions()` call is un-awaited *and* un-caught

**Files modified:** `pack-import-dialog.jsx`
**Commit:** `1e9d161`
**Applied fix:** Added `.catch(e => console.warn(...))` to the fire-and-forget `window.refreshPluginVersions()` call after a successful import, matching the pattern already used by both boot call sites in `spells-data-loader.jsx`.

### WR-11: Four dead symbols in the loader

**Files modified:** `spells-data-loader.jsx`
**Commit:** `39cce8c`
**Applied fix:** Grepped the whole repo (`*.jsx`/`*.html`/`*.js`/`*.ps1`) for each symbol before removing anything. Deleted `_rawCache` (and its now-orphaned read/write/delete sites), `_originalV7BuildSpells`, `loadAllVersions`/`window.loadAllSpellVersions` (plus its unused `_loadingPromise` memo), and `window.setCurrentSpellVersion` (zero callers; `check-source-dispatch.tests.ps1:156` actively forbids re-adding its only historical caller). None of the four had any reader anywhere in the repo.

### WR-12: `check-loader-hardening.tests.ps1` writes its Node harness into the deployed repo root

**Files modified:** `scripts/check-loader-hardening.tests.ps1`
**Commit:** `5b1a9e7`
**Applied fix:** The scratch `.cjs` file is now written to `[System.IO.Path]::GetTempPath()` with a GUID-suffixed name, never the repo root. Added a `Get-Command node` check that degrades to a `Write-Warning` (skip the runtime proof, keep the structural assertions) instead of hard-failing the whole script on a machine without Node on PATH. Switched `-Encoding UTF8` to `-Encoding utf8NoBOM` per the review's note about Windows PowerShell 5.1 BOM emission.

## Skipped Issues

None — all 13 in-scope findings were fixed.

## Verification

All 24 `scripts/check-*.tests.ps1` scripts pass on the final tree:

```
PASS=24 FAIL=0
```

This was re-verified after every individual commit (not just once at the end), and in three cases (WR-02, WR-05, WR-07) a check script's own assertions were extended or adapted because the fix legitimately changed code shape the test was pinning (function signature split for the concurrency guard, `school` type widened to include `null`, and a new corpus-matching proof). Each such test change was itself sanity-checked by temporarily re-introducing the bug and confirming the test fails, then restoring the fix and confirming it passes again.

---

_Fixed: 2026-08-18T23:18:08Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_

---

## Verificação independente do orquestrador

O relatório acima é do agente que aplicou os consertos. O orquestrador verificou
por conta própria, sem confiar na alegação:

**Suíte estrutural:** 24/24 verde, re-executada do zero. Raiz do repositório sem
resíduo — o WR-12 de fato moveu o harness Node para o temp do SO.

**Regressão comportamental em Chromium real** (Playwright, servidor estático fora
do repositório, 16 cenários):

| Cenário | Resultado |
|---------|-----------|
| Boot limpo | 391 magias, 6 versões, 0 pageerror |
| CR-01 `?f.constructor=` | abre com 391 magias, sem ErrorBoundary |
| CR-01 `?f.toString=` / `?f.valueOf=` / `?f.hasOwnProperty=` / `?f.__proto__=` | idem, os quatro |
| Filtro legítimo `?f.level=1` | segue funcionando — a whitelist não matou o caso bom |
| Sanitização no import | HTML armazenado continua limpo |
| Selecionar pack **pela UI real** (clique no VersionSelector) | vai para `plugin-qa-hostile-html` |
| Pack persiste após recarga | `atual=plugin-qa-hostile-html`, 2 magias |
| Pack renderiza | 2 magias (as do pack, não as 391 do dataset) |
| WR-01 preferência de pack sobrevive ao mount | `pref=plugin-qa-hostile-html` |
| Preferência órfã (pack apagado) | volta para builtin, 391 magias, 0 erro |
| Preferência inventada | idem |
| WR-02 importar respeita a escolha do usuário | escolheu `srd-2024-en`, seguiu em `srd-2024-en` |
| Instalação única gera 1 pack (WR-08) | `totalNoStore=1` |

**16/16.** A troca de versão foi feita clicando no `VersionSelector` de verdade,
não por atalho de console — mais fiel que as rodadas anteriores desta fase.

### Nota sobre a remoção de `window.setCurrentSpellVersion` (WR-11)

A remoção está correta e bem justificada (era o chamador que causava a corrida de
boot da 04-02, e `check-source-dispatch.tests.ps1:156` proíbe reintroduzi-lo).
Registrando o efeito colateral para quem planejar a **Fase 5**: não existe mais
nenhum setter público de versão em `window.*` — sobrou só o getter
`getCurrentSpellVersion`. A UI de gerenciamento de plugins da Fase 5, se precisar
trocar de versão programaticamente, terá de usar o `onChange` do `VersionSelector`
ou reintroduzir um setter com guarda contra a corrida de boot. Não é defeito; é
uma consequência a não redescobrir do zero.

### Fast-follow herdado, fora do escopo desta rodada

O WR-05 fez o loader propagar honestamente `edition: ''` / `school: null` quando o
pack de terceiro não declara. Mas `grimorio-helpers.jsx` (não estava em
`files_reviewed_list`) ainda faz `schoolKey()`/`schoolName()` caírem em Evocação
para índice desconhecido/`null` — então um pack com escola não reconhecida ainda
**exibe e filtra** como Evocação, apesar do dado subjacente agora estar correto.
Fechar isso toca um helper compartilhado não revisado, um novo valor de filtro,
estilo de chip e i18n em ~5 pontos de render.
