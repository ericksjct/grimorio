---
phase: 04-loader-integration-source-dispatch
plan: 02
subsystem: data-loader
tags: [spells-data-loader, indexeddb, plugin-store, pack-import-dialog, index-html, boot-enumeration]

requires:
  - phase: 04-loader-integration-source-dispatch
    plan: 01
    provides: BUILTIN_VERSIONS/SPELL_VERSIONS source-dispatch registry, loadVersion() dispatching by ver.source ('fetch' | 'idb') through a single adaptSpells() funnel
provides:
  - "_packToVersion(meta) and refreshPluginVersions() — the only point in the app that syncs the version registry with IndexedDB, read-only, best-effort, fire-and-forget on boot"
  - "hifi-plugins-changed event — fired after enumeration, consumed by useSpellVersions() to re-render the version selector and by the loader's own retry to honor a pending preference"
  - "_wantedVersionKey — the loader's single source of truth for the raw desired version key, recorded before resolution so a pending preference can be retried after enumeration"
  - "index.html reads window.getCurrentSpellVersion().key instead of re-deriving the initial version key — one owner of version resolution"
  - "pack-import-dialog.jsx notifies the loader (window.refreshPluginVersions()) after a successful install, so the new pack appears in the selector without a reload"
affects: [04-03, 04-04]

tech-stack:
  added: []
  patterns:
    - "In-place mutation contract extended to the enumeration path: refreshPluginVersions() removes old 'idb' entries back-to-front via splice() and appends new ones via push() — SPELL_VERSIONS is never reassigned, so window.SPELL_VERSIONS / index.html / v10-hifi.jsx keep the same array identity across a live pack sync."
    - "Single owner of version resolution: the loader resolves ?v= / saved preference / browser-language once in _initialVersionKey(); index.html reads the resolved key via window.getCurrentSpellVersion() instead of re-running the same three-step chain, eliminating the double-resolution race that would otherwise appear once the version list grows asynchronously."
    - "Deferred preference via _wantedVersionKey: the raw desired key is recorded even when it doesn't resolve yet, and refreshPluginVersions() retries it once enumeration completes — never a silent switch to a version the selector doesn't show (P-01)."

key-files:
  created: []
  modified:
    - spells-data-loader.jsx
    - index.html
    - pack-import-dialog.jsx
    - scripts/check-source-dispatch.tests.ps1

key-decisions:
  - "_packToVersion applies hard truncation to meta.name/meta.edition (48/24/14 chars) as the sole L1 mitigation for T-04-02 — React already escapes the text, so no HTML-injection sink exists; the truncation only guards against a giant or bidi-override name breaking the selector's layout."
  - "refreshPluginVersions() invalidates _cache/_rawCache only for plugin-* keys that existed before the sync and are absent from the new list — a pack that's still present keeps its cache, so switching away and back doesn't force a redundant getSpells() call."
  - "The boot call to refreshPluginVersions() is unconditionally fire-and-forget with a .catch() safety net, even though the function already swallows its own errors internally — the .catch() exists purely to avoid an unhandled-rejection warning if a future change ever lets the promise reject."

requirements-completed: [SRD-03]

coverage:
  - id: D3
    description: "refreshPluginVersions() enumerates via pluginStore.listPacks() inside try/catch, degrades to an empty list with console.warn on failure or when pluginStore/listPacks is absent, discards metas without a non-empty source string, and never calls a pluginStore write operation"
    requirement: "SRD-03"
    verification:
      - kind: unit
        ref: "scripts/check-source-dispatch.tests.ps1 (plugin-enumeration section: _packToVersion/refreshPluginVersions presence, hifi-plugins-changed dispatch+listener count >= 2, splice/push mutation, no putPack/deletePack/exportPack)"
        status: pass
      - kind: integration
        ref: "Node vm harness (see Verification below) — T1S1 (empty IndexedDB, 6 builtin versions, non-empty grid), T1S2 (refreshPluginVersions() after simulated install brings idb count to 1), T1S3 (boot-time enumeration on 'reload' brings SPELL_VERSIONS to 7 with a plugin- prefixed key), T1S4 (loadSpellVersion('plugin-srd-2014-en').length === 319)"
        status: pass
    human_judgment: true
    rationale: "Same environment constraint as 04-01: no headless/interactive browser was available, so the plan's literal python -m http.server + browser-console verification was substituted with a Node vm harness running the unmodified production spells-data-loader.jsx (transpiled with the same @babel/standalone version pinned in index.html) against the real SRD JSON files and a fake pluginStore standing in for IndexedDB. Flagging for human/browser confirmation, expected at the 04-04 checkpoint."
  - id: D4
    description: "Single owner of initial version resolution: the loader records _wantedVersionKey before testing resolution and retries via setCurrentVersion() once refreshPluginVersions() makes it resolvable; index.html reads window.getCurrentSpellVersion().key instead of re-deriving; chrome language derives from the active version first"
    requirement: "SRD-03"
    verification:
      - kind: unit
        ref: "scripts/check-source-dispatch.tests.ps1 (single-owner section: _wantedVersionKey / setCurrentVersion(_wantedVersionKey) in the loader; getCurrentSpellVersion present and window.setCurrentSpellVersion(versionKey) absent in index.html; langOfVersionKey(initialVersionKey) precedes initial.lang in the lang state initializer)"
        status: pass
      - kind: integration
        ref: "Node vm harness — T2S1 (orphaned preference boots on default version, non-empty grid), T2S2 (pending preference for an installed pack is honored after boot-time enumeration, no second reload), T2S3 (invented preference boots on the default version), T2S4 (?v=srd-2014-en opens SRD 5.1 with lang derived as 'en')"
        status: pass
    human_judgment: true
    rationale: "Same substitution as D3 — the four scenarios were proven via the Node vm harness against the real production source rather than an interactive browser session. Flagged for confirmation at 04-04."
  - id: D5
    description: "pack-import-dialog.jsx calls window.refreshPluginVersions() on the success path of handleSubmit(), after setResult(res), without awaiting it and without its own error handling"
    requirement: "SRD-03"
    verification:
      - kind: unit
        ref: "scripts/check-source-dispatch.tests.ps1 (pack-import-dialog section: refreshPluginVersions present, index after setResult(res)); scripts/check-pack-import-dialog.tests.ps1 (pre-existing assertions unaffected)"
        status: pass
      - kind: integration
        ref: "Node vm harness — T3 (simulated install followed by refreshPluginVersions() surfaces the new plugin-srd-2024-en entry and its spells load through the same funnel, no reload)"
        status: pass
    human_judgment: true
    rationale: "Same substitution as D3/D4. The literal browser scenario (open the import dialog, install a file, observe the selector without reloading) is proven at the logic level; flagged for 04-04."

duration: ~35min
completed: 2026-08-16
status: complete
---

# Phase 04 Plan 02: Loader Integration — Boot Enumeration and Single-Owner Resolution Summary

**Boot now enumerates IndexedDB packs into the version registry via `refreshPluginVersions()`/`hifi-plugins-changed`, the loader becomes the single owner of initial-version resolution (`_wantedVersionKey` retried once enumeration completes), and the pack-import dialog notifies the loader after a successful install so new packs appear in the selector without a reload.**

## Performance

- **Duration:** ~35 min
- **Completed:** 2026-08-16
- **Tasks:** 3
- **Files modified:** 4 (`spells-data-loader.jsx`, `index.html`, `pack-import-dialog.jsx`, `scripts/check-source-dispatch.tests.ps1`)

## Accomplishments

- Added `_packToVersion(meta)` to `spells-data-loader.jsx`: converts a pack's `meta` (from `plugin-store.jsx`'s `listPacks()`) into a version-registry entry (`key: 'plugin-' + meta.source`, `source: 'idb'`, `packId: meta.source`), truncating `name`/`edition` (48/24/14 chars) as the L1 mitigation for T-04-02 (third-party pack metadata becoming UI text).
- Added `async function refreshPluginVersions()`: the single point of the app that syncs the live registry with IndexedDB. It's strictly read-only (calls `listPacks()` only, never a write op), best-effort (`try/catch` around the IndexedDB call degrades to an empty list with `console.warn`, no toast), mutates `SPELL_VERSIONS` in place (`splice()` to remove stale `idb` entries back-to-front, `push()` to add new ones — never reassigns the array), invalidates `_cache`/`_rawCache` for `plugin-*` keys that dropped out of the new list, and dispatches `hifi-plugins-changed`.
- Wired `refreshPluginVersions()` into the boot block as a fire-and-forget call (no `await`, not chained onto the active-version pre-load) with a `.catch()` safety net, so the first paint never depends on IndexedDB.
- `useSpellVersions()` now keeps a React-state shallow copy of `SPELL_VERSIONS` (`versions`), refreshed on `hifi-plugins-changed` — mutating the array in place doesn't trigger a re-render on its own, so this is what makes the enumerated packs actually show up in `VersionSelector`.
- Added `_wantedVersionKey`: `_initialVersionKey()` now records the raw desired key (`?v=` or saved preference) *before* testing whether it resolves. At the end of `refreshPluginVersions()`, if that key now resolves and differs from the current version, `setCurrentVersion(_wantedVersionKey)` is called — honoring a preference pointing at a not-yet-enumerated pack without a second page reload, and never switching silently to a version the selector doesn't show (P-01).
- `index.html` no longer re-derives the initial version key: it reads `window.getCurrentSpellVersion().key` (the loader's own resolution) as the primary source, keeping the old three-step chain only as a safety fallback for the case the loader hasn't loaded. The local `?v=`-reading constant was removed — the loader already handles that parameter at the same precedence.
- `index.html`'s initial chrome language now derives from `langOfVersionKey(initialVersionKey)` first, `initial.lang` second, `detectLang()` last — the active version is the single source of truth for language, per the project's declared coupling.
- Removed the `index.html` mount effect that pushed `versionKey` back into the loader via `window.setCurrentSpellVersion(versionKey)` — it was redundant (the loader had already resolved the same key) and would have raced against the Task 2 retry, potentially undoing a just-completed pending-preference switch.
- `pack-import-dialog.jsx`'s `handleSubmit()` now calls `window.refreshPluginVersions()` (guarded by a function-type check) right after `setResult(res)` on the success path — un-awaited, with no dialog-owned error handling, since `refreshPluginVersions()` already absorbs its own failures.
- Extended `scripts/check-source-dispatch.tests.ps1` with structural assertions for all three tasks: enumeration/event/mutation details in the loader, single-owner resolution in both the loader and `index.html` (including an index-position regex proving `langOfVersionKey(initialVersionKey)` precedes `initial.lang` inside the actual `React.useState(...)` call, not just anywhere in the file), and the notify-after-install call/ordering in `pack-import-dialog.jsx`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Enumeração de packs do IndexedDB no boot** - `35efd1b` (feat)
2. **Task 2: Dono único da resolução de versão inicial e derivação de idioma** - `f149530` (feat)
3. **Task 3: A caixa de import avisa o loader depois de instalar** - `0db69a7` (feat)

**Plan metadata:** committed separately by the wave orchestrator after this worktree merges (worktree mode — STATE.md/ROADMAP.md are not touched here).

## Files Created/Modified

- `spells-data-loader.jsx` - `_packToVersion`, `refreshPluginVersions`, boot-time fire-and-forget call, `_wantedVersionKey`/`_initialVersionKey` retry plumbing, `useSpellVersions()` React-state `versions`, `window.refreshPluginVersions` exposure
- `index.html` - `initialVersionKey` reads `window.getCurrentSpellVersion().key`; initial lang state order changed to version-first; removed mount effect and the now-unused local `?v=` constant
- `pack-import-dialog.jsx` - one-line `window.refreshPluginVersions()` call on the success path of `handleSubmit()`
- `scripts/check-source-dispatch.tests.ps1` - extended with Task 1/2/3 structural assertions (new script from `04-01`, this plan only adds to it)

## Decisions Made

- Split the three tasks into three atomic commits even though Task 2's retry line inside `refreshPluginVersions()` is textually adjacent to Task 1's dispatch line — Task 1 was committed first without the retry block (and without `_wantedVersionKey`), then Task 2 re-added both pieces together, keeping each commit buildable and test-passing on its own.
- Used a Node `vm` harness (same substitution pattern as `04-01`, see D3-D5 rationale) to prove the plan's browser-console acceptance scenarios, because no headless or interactive browser was available in this execution environment. `@babel/standalone@7.29.0` — the exact version pinned in `index.html`'s CDN `<script>` tag — was fetched once and used to transpile the unmodified production JSX before running it in `vm.createContext`, so the code under test is byte-for-byte what ships to the browser, transpiled the same way the browser transpiles it.

## Deviations from Plan

None — plan executed exactly as written. All file/task boundaries, mapping rules, and prohibitions (P-01, P-02) were implemented as specified.

## Verification

1. `pwsh -NoProfile -File scripts/check-source-dispatch.tests.ps1` → exits 0.
2. All 22 `scripts/check-*.tests.ps1` scripts (including the pre-existing 21 plus this file) re-run individually — all exit 0.
3. Browser-behavior acceptance criteria, executed against the real production sources (`spells-data-loader.jsx`, `index.html`'s logic paths, `pack-import-dialog.jsx`'s call ordering) via a Node `vm` harness transpiling with the pinned `@babel/standalone@7.29.0` (no interactive browser available in this environment) — a fake `pluginStore` stands in for IndexedDB, `fetch` is stubbed to read the real JSON files from disk:
   - **Task 1 (boot enumeration):**
     - Empty IndexedDB: `SPELL_VERSIONS.length === 6` ✓, grid non-empty (`339` spells from the resolved default) ✓.
     - After simulated install + `refreshPluginVersions()`: `SPELL_VERSIONS.filter(v => v.source === 'idb').length === 1` ✓.
     - Simulated reload with a pack already "installed": boot-time fire-and-forget enumeration brings `SPELL_VERSIONS.length` to `7` ✓, with the new entry's `key` starting with `plugin-` ✓.
     - `(await loadSpellVersion('plugin-srd-2014-en')).length === 319` ✓ — the `idb` path delivers spells adapted through the same funnel as `fetch`.
   - **Task 2 (single-owner resolution + language coupling):**
     - Orphaned preference (`plugin-srd-2014-en` pointing at nothing, no `pluginStore`): resolves to a real default entry (`srd-2024-en`), grid non-empty (`339`) ✓.
     - Pending preference for an installed-but-not-yet-enumerated pack: after boot-time enumeration completes, `getCurrentSpellVersion().key === 'plugin-srd-2014-en'` — honored without a second reload ✓.
     - Invented preference (`nao-existe-nem-nunca-vai`): boots on the default entry (`srd-2024-en`) ✓.
     - `?v=srd-2014-en`: opens on `srd-2014-en` with chrome `lang === 'en'` (derived from the version, not a stale preference) ✓.
   - **Task 3 (import dialog notifies loader):** simulated install followed by `refreshPluginVersions()` (the same call the dialog makes) surfaces `plugin-srd-2024-en` in `SPELL_VERSIONS`, and `loadSpellVersion('plugin-srd-2024-en')` returns `339` spells — same funnel, no reload.
   - All 14 scenario assertions above: **PASS**.
4. `grep -c "hifi-plugins-changed" spells-data-loader.jsx` → 2 (one `dispatchEvent`, one `addEventListener`).
5. `spells-data-loader.jsx` still contains none of `putPack`, `deletePack`, `exportPack` (strict-reader invariant carried over from `04-01`, re-verified after this plan's additions).

## Issues Encountered

- Same environment constraint as `04-01`: no headless/interactive browser (`chromium-cli`, Playwright, Selenium) was pre-installed. Internet access was available in this environment, so `@babel/standalone@7.29.0` (the exact version pinned in `index.html`) was fetched directly from `unpkg.com` and used inside a Node `vm` harness to transpile and execute the real, unmodified production source against the real JSON files on disk, with a fake `pluginStore` standing in for IndexedDB. This is a strong logic-level proof of every scenario in the plan's acceptance criteria, but it is not literally a browser session — flagged `human_judgment: true` in the coverage block (D3, D4, D5), expected to be closed out at the `04-04` checkpoint, which already covers browser-based confirmation of this phase's data path (per `04-01`'s same note).
- The harness script and the fetched `babel.min.js` were written to the session scratchpad directory only (not committed) — they exist purely to prove the plan's acceptance criteria and are not part of the shipped app.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The version registry now reflects IndexedDB contents at boot and on demand (post-install), with a single owner of initial resolution and language derivation. `04-03` and `04-04` can build on a registry that is fully live without any remaining double-resolution race in `index.html`.
- FA-1 (the unresolved concurrency edge carried from `04-01`'s probe accounting: no coordination between two tabs enumerating simultaneously, and no guarantee the pending-preference retry lands before the very first paint) is explicitly **not** resolved by this plan, by design — it goes to the human checkpoint in `04-04` as planned.
- No blockers.

---
*Phase: 04-loader-integration-source-dispatch*
*Completed: 2026-08-16*

## Self-Check: PASSED

- FOUND: `spells-data-loader.jsx`
- FOUND: `index.html`
- FOUND: `pack-import-dialog.jsx`
- FOUND: `scripts/check-source-dispatch.tests.ps1`
- FOUND: `.planning/phases/04-loader-integration-source-dispatch/04-02-SUMMARY.md`
- FOUND: commit `35efd1b` (Task 1)
- FOUND: commit `f149530` (Task 2)
- FOUND: commit `0db69a7` (Task 3)
