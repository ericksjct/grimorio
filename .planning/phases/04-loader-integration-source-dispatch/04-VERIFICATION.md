---
phase: 04-loader-integration-source-dispatch
verified: 2026-08-18T00:24:03Z
status: passed
score: 18/18 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 4: Loader Integration (Source-Dispatch) Verification Report

**Phase Goal:** The app's spell-loading engine natively supports both the bundled SRD pack and any
number of user-installed packs from one dispatch point, with no hardcoded 4-dataset list.
**Verified:** 2026-08-18T00:24:03Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | (SC1) First launch, zero installs: SRD already loaded, spells immediately browsable | ✓ VERIFIED | `BUILTIN_VERSIONS[0]` = `srd-2024-en`, source `fetch`; loader pre-fetches `_currentVersion` on `DOMContentLoaded` (`spells-data-loader.jsx:611-626`). Human-observed in 04-04 Task 1 step 2: grid opens filled unaided. |
| 2 | (SC2) SRD pack and IndexedDB packs load at boot through the same dispatch path, no separate per-source logic | ✓ VERIFIED | `loadVersion()` (`spells-data-loader.jsx:353-396`): single ternary picks the raw JSON source (`pluginStore.getSpells` vs `_fetchVersionJson`), then **both** branches funnel through the same `adaptSpells(json, ver.lang, ver.edition)` call and the same `_cache`/`_pending`/toast-on-failure code. No post-processing branch keyed on `ver.source` after that point — confirmed by direct read, adversarially, per orchestrator note. |
| 3 | (SC3) A previously-selected version preference that no longer resolves still boots into a working version | ✓ VERIFIED | `loadVersion()` unknown-key branch redirects to `_defaultVersion().key` instead of throwing (`spells-data-loader.jsx:358-364`); `_initialVersionKey()` falls back through URL → saved pref → browser-lang match → `_defaultVersion()`. Playwright scenarios B (deleted pack) and C (invented key) in 04-04 Task 3 confirm: opens on default, 391 spells, selector consistent, 0 console errors. |
| 4 | `SPELL_VERSIONS` is a runtime-built registry, not a fixed 4-dataset list | ✓ VERIFIED | `BUILTIN_VERSIONS` has 6 entries (2 SRD + 4 legacy); `SPELL_VERSIONS = BUILTIN_VERSIONS.slice()` is mutated in place by `refreshPluginVersions()` via push/splice, never reassigned (`spells-data-loader.jsx:27-42`, `101-112`). Human-observed: `window.SPELL_VERSIONS.length` → 6 pre-install, grows with each installed pack. |
| 5 | Every version entry declares `source` (`fetch`\|`idb`) and `edition` explicitly | ✓ VERIFIED | All 6 `BUILTIN_VERSIONS` entries and `_packToVersion()`'s generated entries carry both fields (`spells-data-loader.jsx:28-33`, `60-73`). |
| 6 | Boot enumerates IndexedDB packs without blocking first paint, and without crashing on enumeration failure | ✓ VERIFIED | `refreshPluginVersions()` called fire-and-forget (no `await`) alongside `loadVersion()` at boot (`spells-data-loader.jsx:616-625`); guarded by `try/catch` returning `[]` with `console.warn` on any `listPacks()` rejection (`spells-data-loader.jsx:86-92`). Playwright scenario D (listPacks rejects) confirms: degrades to 6 builtin entries, warn present, 0 fatal errors. |
| 7 | Version resolution has a single owner (the loader); `index.html` consumes the resolved key instead of re-deriving | ✓ VERIFIED | `index.html:409-411`: `initialVersionKey` reads `window.getCurrentSpellVersion()?.key` first, falls to the old chain only as a safety rung. Comment at `index.html:403-408` documents the single-owner intent explicitly. |
| 8 | A pending preference for an IndexedDB pack is honored after enumeration, via event, without reload | ✓ VERIFIED | `refreshPluginVersions()` checks `_wantedVersionKey` against the freshly-enumerated registry and calls `setCurrentVersion()` if it now resolves (`spells-data-loader.jsx:127-133`); Playwright scenario A confirms: pending preference honored, `current` = pack key, no reload. |
| 9 | Chrome language derives from the effectively active version, not an independent language preference | ✓ VERIFIED | `index.html:174-178` (`langOfVersionKey`) and the `hifi-spells-source-changed` listener (`index.html`, App effect) set `lang` from the resolved version's `lang` field. |
| 10 | Installing a pack via the import dialog updates the selector without a page reload | ✓ VERIFIED | `pack-import-dialog.jsx:79` calls `window.refreshPluginVersions()` post-install; that dispatches `hifi-plugins-changed`, and `useSpellVersions()`'s listener re-reads `SPELL_VERSIONS.slice()` into React state (`spells-data-loader.jsx:451-455`). Human-observed in 04-04 Task 1 step 9. |
| 11 | Both SRD JSON files are in the service worker `PRECACHE` (offline first visit) | ✓ VERIFIED | `sw.js:40-41`: `./srd-2024-en.json`, `./srd-2014-en.json` present in `PRECACHE`. `check-pack-wiring.tests.ps1` assertion 7 requires both files present (inverted from the old assertion that required their *absence*). |
| 12 | `CACHE_VERSION` unchanged — the SRD addition is a pure precache addition, no re-download of already-cached spell JSONs | ✓ VERIFIED | `git show 321cdc6` (04-03 commit): diff touches only `PRECACHE` array (+2 lines), `CACHE_VERSION` line untouched across entire file history (`git log -p -- sw.js \| grep CACHE_VERSION` shows no diff hunk, only the commit-message match). |
| 13 | Edition comparator matches by declared `edition` field, not "the other same-language entry" | ✓ VERIFIED | `useEditionCompare()` (`v10-hifi.jsx:1011-1039`): `other = versions.find(v => v.lang === cur.lang && v.edition && v.edition !== cur.edition)` — requires an explicit, differing `edition`, not positional/heuristic matching. |
| 14 | A QA fixture with a hostile HTML payload exists, valid against `pack.schema.json` | ✓ VERIFIED | `scripts/qa-fixtures/hostile-html.json` present: `meta.source: "qa-hostile-html"`, 2 spells including `<img onerror>` + `<script>` + inline `onclick` payload plus a benign control. `check-pack-wiring.tests.ps1` assertion 8 confirms this fixture is never in `PRECACHE`. |
| 15 | Phase-3 verification debt (hostile payload through the 4 render sinks, `03-UAT.md` test 5) is closed by direct observation | ✓ VERIFIED (documentation gap — see below) | 04-04-SUMMARY.md Task 2 / coverage item D4: product owner named all 4 sinks (card, side panel, detail, print) clean, no `alert` fired; stored-value read-back confirms sanitization happened at import (`<img>`/`<script>`/`onclick` absent from persisted HTML). **However `03-UAT.md` itself was not updated** — test 5 there still reads `result: [blocked]` / `carried_to_phase: 4`. Flagged as a documentation follow-up, not a re-verification failure (see Anti-Patterns/Gaps Summary). |
| 16 | App opens offline with SRD spells after first visit | ✓ VERIFIED | 04-04-SUMMARY.md Task 1 steps 13-15, human-observed with DevTools Network Offline: app opens, grid filled, import dialog opens, IndexedDB pack still selectable. |
| 17 | P-02 prohibition: boot enumeration never writes/mutates IndexedDB | ✓ VERIFIED | `refreshPluginVersions()` calls only `window.pluginStore.listPacks()` (read-only); no `putPack`/`deletePack` call anywhere in the function body. |
| 18 | P-03 prohibition: SRD entries are never labeled as if they were the full legacy dataset | ✓ VERIFIED | `BUILTIN_VERSIONS` SRD entries labeled `'SRD 5.2 (EN)'` / `'SRD 5.1 (EN)'`, distinct from legacy `'PHB 2024'`/`'PHB 2014'` labels. |

**Score:** 18/18 truths verified (0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `spells-data-loader.jsx` | Declarative version registry + source dispatch in `loadVersion`, boot enumeration, single-owner resolution | ✓ VERIFIED | Contains `BUILTIN_VERSIONS`, `refreshPluginVersions`, unified `loadVersion` dispatch. Wired: consumed by `index.html`, `v10-hifi.jsx`, `pack-import-dialog.jsx`. |
| `scripts/check-source-dispatch.tests.ps1` | Structural check of registry + dispatch | ✓ VERIFIED | 181 lines (min 40). Includes the boot-order regression assertion added in 04-04/commit `0f55fa6`. Passes (exit 0). |
| `index.html` | Single-owner initial version resolution + language derivation | ✓ VERIFIED | `getCurrentSpellVersion()` consumed at line 409; `plugin-store.jsx` now loads before `spells-data-loader.jsx` (lines 126-127). |
| `pack-import-dialog.jsx` | Notifies loader after successful install | ✓ VERIFIED | `window.refreshPluginVersions()` called post-install (line 79). |
| `sw.js` | PRECACHE includes both SRD packs | ✓ VERIFIED | Lines 40-41; `CACHE_VERSION` unchanged. |
| `v10-hifi.jsx` | Edition selection by `edition` field | ✓ VERIFIED | `useEditionCompare` at line 1011. |
| `scripts/check-edition-compare.tests.ps1` | Structural check of edition matching | ✓ VERIFIED | Present, part of the 23 green test scripts. |
| `scripts/qa-fixtures/hostile-html.json` | QA fixture with hostile payload | ✓ VERIFIED | `qa-hostile-html` source, schema-valid, contains hostile payload + benign control. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `spells-data-loader.jsx` | `plugin-store.jsx` | `loadVersion()` calls `pluginStore.getSpells(ver.packId)` on `idb` branch | ✓ WIRED | Line 372. |
| `spells-data-loader.jsx` | `srd-2024-en.json`/`srd-2014-en.json` | Builtin `fetch` entries | ✓ WIRED | Lines 28-29; files present on disk (~386KB each). |
| `spells-data-loader.jsx` | `plugin-store.jsx` | `refreshPluginVersions()` calls `pluginStore.listPacks()` | ✓ WIRED | Line 88. |
| `pack-import-dialog.jsx` | `spells-data-loader.jsx` | `window.refreshPluginVersions()` post-install | ✓ WIRED | Line 79. |
| `index.html` | `spells-data-loader.jsx` | `window.getCurrentSpellVersion()` | ✓ WIRED | Line 409. |
| `sw.js` | SRD files | PRECACHE entries mirroring `BUILTIN_VERSIONS` | ✓ WIRED | Lines 40-41. |
| `v10-hifi.jsx` | `spells-data-loader.jsx` | `useEditionCompare` reads `.edition` from `SPELL_VERSIONS` entries | ✓ WIRED | Line 1022-1023. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `loadVersion()` (`idb` branch) | `json` | `window.pluginStore.getSpells(ver.packId)` → `plugin-store.jsx:100-104` reads `record.spells` from IndexedDB, no static fallback | Yes | ✓ FLOWING |
| `loadVersion()` (`fetch` branch) | `json` | `_fetchVersionJson()` → real `fetch()` of the SRD/legacy JSON files on disk | Yes | ✓ FLOWING |
| `refreshPluginVersions()` | `metas` | `window.pluginStore.listPacks()` → real IndexedDB `getAll()`, filtered to records with `meta` | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 23 structural test scripts pass | `pwsh -NoProfile -Command "& 'scripts/check-*.tests.ps1'"` for each of 23 scripts | 0 failures, exit 0 for all | ✓ PASS |
| Boot-order regression fix present | `grep 'src="plugin-store.jsx"' vs `src="spells-data-loader.jsx"` position in `index.html` | plugin-store.jsx (line 126) precedes spells-data-loader.jsx (line 127) | ✓ PASS |
| CACHE_VERSION untouched by 04-03 | `git show 321cdc6 -- sw.js` | Only `PRECACHE` array modified (+2 lines) | ✓ PASS |

Full behavioral verification of runtime state (boot enumeration, dead-preference fallback, hostile-payload sanitization) was executed by the orchestrator via Playwright and by human observation in 04-04, with literal observed values recorded in `04-04-SUMMARY.md` (spell counts, `SPELL_VERSIONS` lengths, `source`/`packId` field values, console-error counts per scenario). This verifier did not re-run a browser session; it independently re-ran the 23 structural tests and re-derived the code-level dispatch/fallback logic that those checkpoints exercised, and cross-checked the specific regression fix (commit `0f55fa6`) called out by the orchestrator.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|--------------|------------|--------------|--------|----------|
| SRD-03 | 04-01, 04-02, 04-03, 04-04 | Pacote SRD vem pré-instalado — primeira abertura nunca é vazia | ✓ SATISFIED | Truths 1, 4, 6, 11, 16 above. `REQUIREMENTS.md` traceability row still reads `Pending` and the checkbox is unchecked — expected at this stage (updated by `phase.complete`, which runs after verification passes, per the same pattern observed for Phase 3's PKG-0x rows in `03-UAT.md` test 6). No orphaned requirement IDs: SRD-03 is the only ID declared across all 4 plans' frontmatter, and it is the only ID mapped to Phase 4 in `REQUIREMENTS.md`'s traceability table. |

No orphaned requirements found for Phase 4.

### Anti-Patterns Found

None. Scanned `spells-data-loader.jsx`, `index.html`, `pack-import-dialog.jsx`, `sw.js`, `v10-hifi.jsx` for `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` and empty-implementation patterns — zero real hits (two `placeholder="..."` input-attribute matches are legitimate UI copy, not debt markers).

### Documentation Follow-Up (non-blocking)

**`03-UAT.md` test 5 is stale.** `04-04-SUMMARY.md` documents, with literal evidence, that the Phase-3-carried debt (hostile payload through the 4 render sinks) was executed and closed. But `.planning/phases/03-srd-pack-import-pipeline/03-UAT.md` itself still shows:
```yaml
result: [blocked]
carried_to_phase: 4
```
This is a bookkeeping gap in a *different* phase's artifact, not a Phase 4 code or truth failure — the underlying verification work was genuinely done. Per the orchestrator's own note, this file has not yet been updated to reflect closure. Recommend updating `03-UAT.md` test 5's `result` and adding a `closed_in: "04-04"` pointer before this milestone is archived, so a future reader of Phase 3's artifacts doesn't re-litigate settled work. Not counted as a gap against Phase 4's truths (none of Phase 4's must-haves reference `03-UAT.md`'s own file content — the must-have was "the test is executed," which it was).

### Human Verification Required

None outstanding. All three roadmap success criteria and all plan-level truths were either verified by direct code inspection (this pass) or already closed via the human-in-browser and Playwright checkpoints executed in `04-04` (`04-04-SUMMARY.md`), which this verifier cross-checked against the actual code rather than trusting narratively.

### Gaps Summary

No gaps blocking the phase goal. One non-blocking documentation follow-up identified above (`03-UAT.md` staleness) — does not require a closure plan, just a metadata update whenever convenient.

---

_Verified: 2026-08-18T00:24:03Z_
_Verifier: Claude (gsd-verifier)_
