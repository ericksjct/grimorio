---
phase: 05-plugin-manager-ui-version-selector
plan: 01
subsystem: ui
tags: [react, i18n, pack-manager, cc-by, indexeddb]

# Dependency graph
requires:
  - phase: 04-loader-source-dispatch
    provides: "refreshPluginVersions()/hifi-plugins-changed live registry sync, single-dispatch loadVersion()"
  - phase: 03-srd-pack-import-pipeline
    provides: "PackImportDialog modal (chrome/a11y to mirror), pack-import.jsx meta/license schema"
  - phase: 02-plugin-storage-foundation
    provides: "plugin-store.jsx listPacks()/deletePack() CRUD"
provides:
  - "PackManager modal (installed-pack list + builtin SRD rows + empty state)"
  - "PackManagerRoot mount point exposing window.__openPackManager contract"
  - "window.getVersionMeta(key) — builtin pack meta/license reachable at runtime"
  - "manager.* i18n key block (ptbr/en)"
  - "scripts/check-pack-manager.tests.ps1 automated gate"
affects: ["05-02", "05-03", "05-04"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Sibling-dialog composition via a single 'view' state enum (closed|manager|import) instead of nested overlay booleans"
    - "Module-level _metaCache alongside _cache in spells-data-loader.jsx, populated only for source:'fetch' (idb path returns a raw array by contract)"

key-files:
  created:
    - pack-manager.jsx
    - scripts/check-pack-manager.tests.ps1
  modified:
    - i18n.jsx
    - spells-data-loader.jsx

key-decisions:
  - "Only the two corpus:'srd' BUILTIN_VERSIONS entries render as builtin rows (flagged assumption A-01 from the plan) — the four legacy PHB/PT-BR entries have no license manifest and are out of scope until Phase 6"
  - "PackManagerRow extracted as a real component (capitalized, no leading underscore) rather than following the plan's _installedRows/_builtinRows underscore convention, since underscore-prefixed identifiers are reserved in this codebase for pure helper functions, not JSX component references"

patterns-established:
  - "getVersionMeta(key) returns null (never undefined) for unknown/unfetched keys, matching the project's null-not-undefined convention"

requirements-completed: [MGMT-01, MGMT-05, SRD-02]

coverage:
  - id: D1
    description: "PackManager lists installed packs (name/version/spellCount/origin) read live from pluginStore.listPacks(), re-rendering on hifi-plugins-changed"
    requirement: MGMT-01
    verification:
      - kind: other
        ref: "scripts/check-pack-manager.tests.ps1 (structure + storage-read-only + reactivity blocks)"
        status: pass
    human_judgment: true
    rationale: "No frontend test runner exists in this project (manual browser QA is the established verification mode per PROJECT.md); the automated script proves wiring/contracts but not actual browser rendering of the list."
  - id: D2
    description: "The two builtin SRD entries (srd-2014-en, srd-2024-en) appear in the same list as origin 'builtin', each with its own edition's verbatim CC-BY attribution text in a collapsible block"
    requirement: SRD-02
    verification:
      - kind: other
        ref: "scripts/check-pack-manager.tests.ps1 (block 5: ConvertFrom-Json inequality proof between srd-2014-en.json and srd-2024-en.json meta.license.attribution)"
        status: pass
    human_judgment: true
    rationale: "Script proves the two source files carry distinct legal text and that pack-manager.jsx wires <details>/getVersionMeta/license.attribution; actual on-screen rendering and expand/collapse behavior needs a browser pass."
  - id: D3
    description: "Zero installed packs opens the empty state (explanation + primary Import action + pack-docs.html link), while builtin SRD rows remain visible"
    requirement: MGMT-05
    verification:
      - kind: other
        ref: "scripts/check-pack-manager.tests.ps1 (block 6: manager.emptyHeading/emptyBody/pack-docs.html/import.open presence)"
        status: pass
    human_judgment: true
    rationale: "Empty-state branching logic (isEmpty = packs !== null && installedRows.length === 0) needs a browser check with an empty IndexedDB to confirm the visual layout and that builtin rows still render below it."
  - id: D4
    description: "Opening the import dialog from within the manager hides the manager and shows PackImportDialog; closing the import dialog returns to the manager"
    verification: []
    human_judgment: true
    rationale: "Pure UI interaction (view state machine in PackManagerRoot) — needs a live click-through in the browser to confirm; no automated UI test runner exists in this project."

duration: ~15min
completed: 2026-08-30
status: complete
---

# Phase 5 Plan 01: Pack Manager Read Surface Summary

**New `pack-manager.jsx` modal listing installed packs and builtin SRD entries with verbatim CC-BY attribution, plus `window.getVersionMeta()` runtime access to builtin license text and 13 new `manager.*` i18n keys.**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-08-30T22:19:27Z
- **Tasks:** 4/4
- **Files modified/created:** 4 (2 modified, 2 created)

## Accomplishments

- `PackManager` modal reads the installed-pack list exclusively from `window.pluginStore.listPacks()` (never a local copy), re-running on `hifi-plugins-changed`, and degrading to an empty array + error toast on rejection instead of throwing.
- The two SRD builtin entries (`srd-2024-en`, `srd-2014-en`) always render as first-class `builtin`-origin rows, each with a native `<details>` disclosure exposing that edition's verbatim `meta.license.attribution` (5.1 text ≠ 5.2 text, proven distinct by the test gate).
- Empty state (MGMT-05/D-15/D-16): zero packs with `source: 'idb'` — never "zero versions" — opens the empty explanation with a primary "Install pack" action and a `pack-docs.html` link, while the builtin rows stay visible underneath.
- `PackManagerRoot` implements the sibling-dialog contract (D-04): a single `view` enum (`closed|manager|import`) ensures only one overlay is ever mounted, and registers `window.__openPackManager` for plans 05-02/05-04 to consume.
- `spells-data-loader.jsx` gained `_metaCache`/`window.getVersionMeta(key)` so the builtin pack's `meta.license` (previously discarded after `adaptSpells()`) is reachable at runtime — the only path SRD-02's attribution text has to the UI.
- `scripts/check-pack-manager.tests.ps1` gates structure, storage-read-only contract, reactivity cleanup, CC-BY wiring, empty state, the D-19 guard, the P-01 prohibition, i18n parity, and loader wiring — verified to have teeth via a temporary function-rename break/restore cycle.

## Task Commits

Each task was committed atomically:

1. **Task 1: Chaves i18n do gerenciador nos dois idiomas** - `1a8b39c` (feat)
2. **Task 2: Expor o meta dos packs builtin no loader (window.getVersionMeta)** - `6f57ec6` (feat)
3. **Task 3: Criar pack-manager.jsx — modal, lista, atribuição e estado vazio** - `6136dd6` (feat)
4. **Task 4: Criar scripts/check-pack-manager.tests.ps1** - `2ad01eb` (test)

**Plan metadata:** committed alongside this SUMMARY (see final commit).

## Files Created/Modified

- `pack-manager.jsx` - New module: `PackManager` (list/attribution/empty-state), `PackManagerRoot` (view state machine + `window.__openPackManager`)
- `spells-data-loader.jsx` - `_metaCache` + `getVersionMeta(key)`, exported as `window.getVersionMeta`
- `i18n.jsx` - 13 new `manager.*` keys in both `ptbr` and `en` blocks
- `scripts/check-pack-manager.tests.ps1` - New automated gate, discovered by `scripts/run-tests.ps1` glob

## Decisions Made

- Only `corpus: 'srd'` entries become builtin rows (plan's flagged assumption A-01) — the four legacy PHB/PT-BR `BUILTIN_VERSIONS` entries have no license manifest and are explicitly out of scope until Phase 6.
- The per-row component is named `PackManagerRow` (capitalized, no leading underscore) rather than matching the plan's `_installedRows`/`_builtinRows` underscore style, because this codebase's underscore-prefixed identifiers are reserved for pure non-JSX helper functions — using one as a JSX tag risked ambiguity with Babel's lowercase-vs-identifier tag-name rule and had no existing precedent to copy.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Reworded a code comment that accidentally broke an unrelated test's exact-count regex**
- **Found during:** Task 4 (running `scripts/run-tests.ps1` after adding the new gate)
- **Issue:** Task 2's `_metaCache` comment in `spells-data-loader.jsx` contained the literal substring `adaptSpells()`, which `scripts/check-source-dispatch.tests.ps1` counts via `[regex]::Matches($loader, 'adaptSpells\(')` and asserts equals exactly 2 (definition + the one real call site in `loadVersion`). The comment pushed the count to 3, failing that pre-existing, out-of-scope test.
- **Fix:** Reworded the comment to say "o adaptador de magias" instead of literally writing `adaptSpells()`. No code/behavior change — purely comment text.
- **Files modified:** `spells-data-loader.jsx`
- **Verification:** `pwsh scripts/run-tests.ps1` exits 0 with all 30 scripts passing, including `check-source-dispatch.tests.ps1`.
- **Committed in:** `2ad01eb` (Task 4 commit, since the collision was only surfaced by that task's full-suite run)

**2. [Rule 1 - Bug] Tightened `check-pack-manager.tests.ps1`'s own function-name needles to have real teeth**
- **Found during:** Task 4, while running the plan-mandated "prove the test has teeth" step (temporarily rename `function PackManager` to `function PackManagerX`, confirm the check fails)
- **Issue:** The first draft used the needle `'function PackManager'` (no trailing `(`), which is a substring of `'function PackManagerRoot('` — so even with `PackManager` itself renamed away, the check kept passing because it matched the unrelated `PackManagerRoot` declaration instead.
- **Fix:** Changed the needles to `'function PackManager('` and `'function PackManagerRoot('` (with the opening parenthesis), which disambiguates the two declarations.
- **Files modified:** `scripts/check-pack-manager.tests.ps1`
- **Verification:** Re-ran the rename/restore proof — the tightened check now fails on the rename and passes once restored.
- **Committed in:** `2ad01eb` (Task 4 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 bug fixes surfaced by the plan's own required verification steps)
**Impact on plan:** No scope creep — both fixes are corrections to test/comment text discovered while running the plan's own mandated verification commands.

## Issues Encountered

- Task 3's `<verify>` command (`pwsh scripts/check-pack-manager.tests.ps1`) referenced a script that Task 4 creates — an inherent ordering quirk in the plan (the test gate for Task 3's deliverable is written one task later). Handled by manually running the equivalent grep-based acceptance checks from Task 3's `<acceptance_criteria>` at Task 3 commit time, then retroactively confirming the automated script (once it existed) also passes clean against the already-committed `pack-manager.jsx`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `window.__openPackManager` is live and ready for plan 05-02 (VersionSelector "Gerenciar pacotes…" item + drawer VERSÃO row) to wire trigger call sites into.
- `window.getVersionMeta` and `_metaCache` are available for any future surface needing builtin pack metadata.
- Plan 05-03 (removal, duplicate-count index) builds directly on `PackManager`'s row model (`_installedRows`/`_builtinRows`) — no rework needed, only additive changes (a remove button + inline confirm per D-05).
- **Pending manual browser verification** (per this plan's `<verification>` section — no automated frontend test runner exists in this project, consistent with all prior phases):
  - Open the app, run `window.PackManagerRoot` in the console — confirm it is a function.
  - `await window.loadSpellVersion('srd-2014-en'); window.getVersionMeta('srd-2014-en').license.attribution` — confirm it contains "System Reference Document 5.1".
  - With the plan mounted (or the component rendered by hand in console), confirm: with zero packs in IndexedDB the empty state renders alongside both SRD rows; expanding "Licença e atribuição" on the SRD 5.2 row shows text starting with "This work includes material from the System Reference Document 5.2"; clicking "Instalar pacote de magias" swaps to the import dialog and closing it returns to the manager.
  - No mount point exists yet in `index.html`/`v10-hifi.jsx`/`VersionSelector` — `PackManagerRoot` is not reachable from the running app until plan 05-02 wires a trigger and mounts it. This is expected per this plan's explicit scope boundary ("NÃO montar nada em index.html neste plano").

---
*Phase: 05-plugin-manager-ui-version-selector*
*Completed: 2026-08-30*
