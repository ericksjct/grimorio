---
phase: 03-srd-pack-import-pipeline
verified: 2026-08-11T23:52:24Z
status: passed
score: 6/6 must-haves structurally+behaviorally verified; 6 items outstanding for human browser verification
behavior_unverified: 0
overrides_applied: 0
human_verification:

  - test: "Open the app and pack-docs.html across the 6 themes (Catppuccin, Solarized, Nord, Monokai, Parchment, Daylight) × light/dark (12 combinations), confirming no CSP console violation, legible import dialog, and pack-docs.html tables scrolling horizontally instead of clipping."
    expected: "App boots clean in all 12 combos, import dialog and pack-docs.html render correctly, no console errors."
    why_human: "Visual rendering across theme/mode combinations cannot be verified by grep/static analysis; 03-08-PLAN.md Task 3 steps 1-4 were explicitly deferred by the human for time, not run."

  - test: "Trigger print with a prepared spell and confirm output matches pre-phase behavior."
    expected: "Print sheet renders unchanged from before the phase."
    why_human: "Visual/print-context check; 03-08-PLAN.md step 4, deferred."

  - test: "After a rejected import (bad JSON / schema-invalid / blocked-key), confirm the form fields stay filled and the inline error clears on the next input change."
    expected: "Form retains user input; error message disappears on field touch."
    why_human: "Interactive form-state behavior in a live browser; 03-08-PLAN.md step 10, deferred."

  - test: "Paste a URL from a host without permissive CORS and confirm the specific CORS rejection message (packErr.fetchFailed) appears inline and the global toast also fires."
    expected: "User sees a specific 'could not fetch — download and upload instead' message, not a generic error, plus a toast."
    why_human: "The underlying fetch-failed code path was verified with a Node harness (simulated CORS TypeError -> .code === 'fetch-failed'), but the actual on-screen message/toast rendering in a real browser was not observed; 03-08-PLAN.md step 12, deferred."

  - test: "Open a spell whose description carries a hostile payload (img onerror + inline script) in the card, side panel, and detail screen, and print it, confirming no alert fires and the console shows no execution in any of the four dangerouslySetInnerHTML sinks."
    expected: "No alert fires in any of the 4 render contexts."
    why_human: "There is no UI path to render a spell from an imported pack yet in this phase — spells-data-loader.jsx still has a hardcoded 4-entry SPELL_VERSIONS and no pluginStore reference (that dispatch is Phase 4 / SRD-03 scope). Steps 15-16 of 03-08-PLAN.md could not be executed for this reason. Step 17 (reading the stored HTML back from IndexedDB) WAS run by the human and confirmed the stored description is already sanitized (script and onerror stripped before write), which covers the underlying risk by substitution — but the render-sink path itself remains genuinely unexercised, and that should not be silently counted as equivalent to actually watching the 4 sinks not execute a payload."

  - test: "Confirm REQUIREMENTS.md checkboxes and Traceability table are updated to reflect Phase 3 completion (PKG-02, PKG-03, PKG-04, PKG-05, SRD-01 currently still show '[ ]' / 'Pending', only PKG-01 shows 'Complete')."
    expected: "Requirement tracking metadata matches actual implementation status."
    why_human: "Not a functional defect — the code is complete, tested, and behaviorally verified for all 6 IDs — but it is a documentation/bookkeeping gap a human (not this verifier) should decide whether to close before shipping, since flipping requirement checkboxes is a product-tracking decision, not a code fact this verifier can programmatically resolve without risk of overstepping the phase's own PLAN/SUMMARY record."
---

# Phase 3: SRD Pack & Import Pipeline Verification Report

**Phase Goal:** Users can install a spell pack of their choosing — their own file or a compatible URL — into the app, with every pack validated and its HTML sanitized before anything renders; the built-in SRD content exists as a real, importable pack.
**Verified:** 2026-08-11T23:52:24Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

All 6 ROADMAP success criteria were checked against the actual codebase — not against SUMMARY.md prose — using direct code inspection, `node`/`vm` behavioral harnesses that actually invoke the shipped functions, and the human's own reported browser observations (never treated as self-approved).

| # | Truth (ROADMAP SC) | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Pack author can read a published JSON Schema + docs page and validate a pack against it before sharing (PKG-01) | ✓ VERIFIED | `pack.schema.json` exists at repo root, draft 2020-12, `meta`+`spells` required, `spells.minItems=1`, `meta.license` requires `id`+`attribution` — confirmed by direct `node -e` inspection. `pack-docs.html` exists, links to the schema, documents CORS hosts/byte-cap/tag whitelist. `scripts/check-pack-format.tests.ps1` (schema↔docs parity) passes. Visual polish across themes not verified (see Human Verification). |
| 2 | User can pick a pack file and install it (PKG-02) | ✓ VERIFIED | `installFromFile` exercised directly via a `vm` harness: a fake `File{size, text()}` flows through `parsePackText → validatePack → sanitizePack → freeIdentifier → pluginStore.putPack`, returns `{identifier, spellCount, changedFields}`. Human independently installed `srd-2014-en.json` by file picker and confirmed success (03-08-SUMMARY, step 5). |
| 3 | User can enter a compatible URL and have the pack fetched/installed, CORS limitations explained in UI (PKG-03) | ✓ VERIFIED (fetch path); ⚠️ see Human Verification (on-screen message) | `_fetchText` harness-tested: `fetch` throwing `TypeError` (real CORS-block shape) rejects with `.code === 'fetch-failed'`, original message preserved. `Content-Length` over cap and streamed-over-cap both reject `too-large` via `reader.cancel()` before buffering (verified by harness, not just grep). Human independently installed a pack by URL (step 11) and confirmed it appears in `listPacks()`. The CORS-rejection *message and toast* in a live browser (step 12) was not observed by the human — deferred. |
| 4 | Malformed JSON / oversized / schema-invalid / prototype-pollution keys rejected before any write; duplicate `source` resolves to a free identifier, never overwrites (PKG-04) | ✓ VERIFIED | Harness: `parsePackText('{"a":{"__proto__":...}}}')` → `.code === 'blocked-key'`; truncated JSON → `.code === 'malformed-json'`; array input → `.code === 'schema-invalid'`; `validatePack` on `meta.lang:'fr'` → `.code === 'schema-invalid'` naming `meta.lang`. `freeIdentifier('meu-homebrew', ['meu-homebrew'])` → `'meu-homebrew-2'`; gap-fill case verified. Full `_install` harness run with a duplicate `meta.source` confirms `putPack` is called exactly once, with `record.id === 'meu-homebrew-2'`, never with the original identifier. Human independently confirmed re-installing the same file produced `srd-2014-en-2` and 6 total records in `listPacks()`, nothing overwritten (step 6). |
| 5 | Every imported description passes DOMPurify before reaching any `dangerouslySetInnerHTML` sink — raw HTML never renders (PKG-05) | ✓ VERIFIED (storage-layer guarantee); render-sink path itself genuinely unexercised — see Human Verification | Harness: `sanitizePack` throws before any write when `window.DOMPurify` is absent (fail-closed, zero `putPack` calls). With a fake DOMPurify, `<p onclick="x()">a</p><script>y()</script>` sanitizes to `<p>a</p>`, `changedFields===1`, input object unmutated (`JSON.stringify` identity). Order of `_install` (`parsePackText < validatePack < sanitizePack < freeIdentifier < putPack`) verified both by `check-pack-import.tests.ps1`'s `IndexOf` assertions and independently by tracing the source. Human's own storage read (step 17) confirmed the *actual stored* HTML for a hostile payload came back as `"<p>Texto normal antes.</p><p>Texto normal depois.</p>"` — img/onerror and inline script were stripped before write. **Caveat, not a defect:** there is no UI path yet to render a spell from an imported pack (`spells-data-loader.jsx` has a hardcoded 4-entry `SPELL_VERSIONS`, no `pluginStore` reference) — that dispatch is Phase 4 (SRD-03) scope, so the "reaches no sink" half of this criterion is currently true by the absence of any render path for imported content, not by having watched all 4 sinks refuse a live payload. |
| 6 | Generated SRD pack exists as a file conforming to the pack schema and installs through the same pipeline (SRD-01) | ✓ VERIFIED | `srd-2014-en.json` (319 spells) and `srd-2024-en.json` (339 spells) exist, `meta.source` correct, `meta.lang==='en'`, `meta.spellCount === spells.length`, distinct `license.attribution` strings. **Both packs pass the actual shipped `validatePack()` from `pack-import.jsx`** (cross-validated directly in this verification — 03-04-SUMMARY.md itself flagged this cross-check as not yet done at merge time; it is now done and passes with zero exceptions). `scripts/generate-srd-pack.mjs` reads only `scripts/srd-sources/srd-5.2-spells.json` (vendored copy) and a Tabyltop text-dump fetch/cache for 5.1 — grep confirms zero references to any `spells-5E-*.json` file (D-05 provenance rule intact). Human independently installed both real SRD packs via the file picker and confirmed no overwrite behavior across repeated installs. |

**Score:** 6/6 ROADMAP success criteria structurally and behaviorally verified (via direct code execution in Node `vm` harnesses, not just grep/presence checks). All 8 phase plans' `must_haves.truths` were checked against this same evidence; none failed. 6 specific verification steps remain open for a human in a live browser (see Human Verification Required) — none of them contradict what has been verified; they are visual/interactive checks that cannot be settled by static analysis, plus one documentation-bookkeeping item.

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `pack.schema.json` | JSON Schema draft 2020-12 pack contract | ✓ VERIFIED | Exists, valid JSON, `spells.minItems=1`, `meta.required` = `[source,name,version,author,lang,license]`, `license.required` = `[id,attribution]` — confirmed by direct parse, not by trusting the SUMMARY. |
| `pack-docs.html` | Author-facing static docs | ✓ VERIFIED | Exists, links `pack.schema.json`, lists CORS hosts/byte cap; `check-pack-format.tests.ps1` (schema↔docs parity) passes. |
| `pack-import.jsx` | Validation + sanitization + install funnel, `window.packImport` | ✓ VERIFIED, WIRED | All 8 exposed members present and independently exercised via `vm` harness (see truths table); no empty catches; no absolute URLs (no CORS-bypass proxy) confirmed by regex scan returning zero matches. |
| `pack-import-dialog.jsx` | `PackImportDialog`/`PackImportRoot` | ✓ VERIFIED, WIRED | Present in `index.html`'s babel block after `v11-character-editor.jsx`; `<PackImportRoot lang={lang} dark={dark} theme={theme} />` mounted once in `App`, after `<HifiPrintRoot />` (confirmed by grep); no hardcoded hex colors. |
| `srd-2014-en.json` / `srd-2024-en.json` | Two real, installable SRD packs | ✓ VERIFIED | 319 / 339 spells, pass the actual `validatePack()`, distinct attribution text, D-05 provenance confirmed by inspecting the generator's file reads. |
| `scripts/generate-srd-pack.mjs` | One-shot regeneration script | ✓ VERIFIED | `node --check` passes; reads only the schema and the vendored/cached source, never `spells-5E-*.json`. |
| `index.html`, `sw.js` | Wiring: SRI'd DOMPurify, load order, PRECACHE | ✓ VERIFIED, WIRED | CSP meta present and byte-identical across `index.html`/`pack-docs.html`; DOMPurify SRI + pinned version present; `PRECACHE` includes all 4 new files + DOMPurify URL; `CACHE_VERSION` unchanged; SRD packs correctly excluded from PRECACHE (Phase 4 scope, confirmed absent). |
| `.planning/codebase/CONCERNS.md` | D-10 exit-route record | ✓ VERIFIED | Contains a full, honest "Content Security Policy — Partial Closure (D-10)" entry with real measured console messages, the corrected `unsafe-inline`-only finding, and the `frame-ancestors`-via-`<meta>` no-op caveat. |
| 8× `scripts/check-*.tests.ps1` (phase-specific) | Regression gates | ✓ VERIFIED | All 8 phase-specific scripts, plus all 13 pre-existing scripts (21 total matching `check-*.tests.ps1`), exit 0 when run individually in this verification session. |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `pack-docs.html` | `pack.schema.json` | `<a href="pack.schema.json">` | WIRED | Confirmed present; `check-pack-format.tests.ps1` enforces parity. |
| `pack-import.jsx` | `pack.schema.json` | `META_FIELDS`/`LICENSE_FIELDS`/`SPELL_FIELDS` mirror schema properties | WIRED | Two-way parity enforced by `check-pack-validator.tests.ps1`; independently confirmed both SRD packs pass the real `validatePack()`. |
| `pack-import.jsx` | `plugin-store.jsx` | `pluginStore.listPacks()` then single `pluginStore.putPack()` | WIRED | Order and single-write verified both by the regression script's `IndexOf` assertions and by direct harness execution of `_install`. |
| `pack-import.jsx` | `window.DOMPurify` | `DOMPurify.sanitize(...)` before write, fail-closed if absent | WIRED | Harness-confirmed: absence throws before any write; presence sanitizes and returns `changedFields`. |
| `pack-import-dialog.jsx` | `pack-import.jsx` | `packImport.installFromFile`/`installFromUrl` | WIRED | Present exactly once each in the dialog; interface names match the contract exactly (no renaming across 03-03→03-05→03-06). |
| `pack-import-dialog.jsx` | `i18n.jsx` | `tt(lang, 'import.*'/'packErr.*')` | WIRED | `i18nParityCheck()` returns `{}`; spot-checked `tt('ptbr','import.success',{identifier:'test-2'})` and `tt('en','packErr.fetchFailed')` both return correct interpolated strings. |
| `index.html` | `pack-import.jsx`/`pack-import-dialog.jsx` | Load order after `plugin-store.jsx`/DOMPurify and after `v11-character-editor.jsx` | WIRED | Confirmed by tag position in `index.html`; `check-pack-wiring.tests.ps1` passes. |
| `sw.js` | `index.html` | PRECACHE parity for every new script/vendor URL | WIRED | Confirmed the DOMPurify URL is byte-identical between the two files; `srd-*.json` correctly absent from both (Phase 4 scope). |

### Behavioral Spot-Checks (run directly in this verification, not taken from SUMMARY claims)

| Behavior | Command/Harness | Result | Status |
| -------- | --------------- | ------ | ------ |
| Prototype-pollution key rejected during parse | `vm` harness: `parsePackText('{"a":{"__proto__":{"x":1}}}')` | `.code === 'blocked-key'` | ✓ PASS |
| Malformed JSON rejected | `parsePackText('{"a":1')` | `.code === 'malformed-json'` | ✓ PASS |
| Non-object top-level rejected | `parsePackText('[1,2,3]')` | `.code === 'schema-invalid'` | ✓ PASS |
| Schema-invalid field rejected with path | `validatePack({...meta.lang:'fr'...})` | `.code === 'schema-invalid'`, message names `meta.lang` | ✓ PASS |
| `freeIdentifier` suffix sequence, gap-aware | `freeIdentifier('meu-homebrew', [...])` variants | `meu-homebrew` / `-2` / gap-fill `-2` | ✓ PASS |
| Fail-closed sanitization | `sanitizePack(pack)` with `window.DOMPurify` absent | throws, no write | ✓ PASS |
| Sanitize strips hostile HTML, doesn't mutate input | `sanitizePack` on `<p onclick>...<script>` | stripped to `<p>a</p>`, `changedFields===1`, input `JSON.stringify`-identical before/after | ✓ PASS |
| Full install funnel + D-09 suffix | `installFromFile(fakeFile)` with `listPacks()→[{source:'meu-homebrew'}]` | `identifier==='meu-homebrew-2'`, `putPack` called once with suffixed id | ✓ PASS |
| CORS-block fetch path | `installFromUrl` with `fetch` throwing `TypeError` | `.code==='fetch-failed'`, original message preserved | ✓ PASS |
| Byte-cap on URL fetch (Content-Length) | `installFromUrl` with fake `Content-Length: 20000000` | `.code==='too-large'` before body read | ✓ PASS |
| SRD packs pass the real shipped validator | Both `srd-2014-en.json`/`srd-2024-en.json` through `pack-import.jsx`'s `validatePack()` | Zero exceptions | ✓ PASS — closes the cross-validation gap 03-04-SUMMARY.md itself flagged as not yet done |
| Generator provenance (D-05) | grep for `spells-5E` and `readFile(` calls in `generate-srd-pack.mjs` | Only comments reference the forbidden name; actual reads are schema + vendored/cached source only | ✓ PASS |
| i18n parity for all new keys | `i18nParityCheck()` after loading `i18n.jsx` | `{}` (no gaps) | ✓ PASS |
| Full regression suite | All 21 `scripts/check-*.tests.ps1` run individually | 21/21 exit 0 | ✓ PASS |

### Requirements Coverage

Phase-declared requirement IDs (union across all 8 plans' frontmatter): PKG-01, PKG-02, PKG-03, PKG-04, PKG-05, SRD-01 — this is an **exact match** to the phase's declared requirement set; no orphaned requirements.

| Requirement | Source Plan(s) | Description | Status | Evidence |
| ----------- | --------------- | ------------ | ------ | -------- |
| PKG-01 | 03-01 | Pack format published as schema + docs | ✓ SATISFIED | Schema+docs exist, parity enforced, cross-checked directly. |
| PKG-02 | 03-05, 03-06, 03-07 | File install | ✓ SATISFIED | Full funnel harness-tested; human-confirmed in browser. |
| PKG-03 | 03-05, 03-06, 03-07 | URL install with CORS explained | ✓ SATISFIED (fetch logic); on-screen CORS message not human-observed | See truths table row 3. |
| PKG-04 | 03-03, 03-05 | Validation + rejection + dedup-by-suffix | ✓ SATISFIED | Harness-tested all 4 rejection paths + suffix logic; human-confirmed no-overwrite. |
| PKG-05 | 03-05, 03-07, 03-08 | Sanitization before any sink | ✓ SATISFIED at storage layer; render-sink path unexercised (no render integration yet) | See truths table row 5. |
| SRD-01 | 03-02, 03-04 | Two real SRD packs, licensed provenance, requirement text corrected | ✓ SATISFIED | Packs exist, pass real validator, provenance verified by inspection; `REQUIREMENTS.md` SRD-01 text corrected (confirmed, no obsolete phrase remains). |

**Note on REQUIREMENTS.md bookkeeping (not a functional gap):** `.planning/REQUIREMENTS.md`'s checkboxes and Traceability table still show PKG-02/03/04/05 and SRD-01 as `[ ]`/`Pending`, with only PKG-01 marked `[x]`/`Complete`. The phase's actual implementation satisfies all 6 IDs per the evidence above — this is a stale tracking artifact, not evidence the work is incomplete. Flagged under Human Verification for a product-tracking decision rather than silently fixed by this verifier, since flipping requirement status is a milestone-tracking call, not a code fact.

### Anti-Patterns Found

None. Scanned every file this phase modified (`pack.schema.json`, `pack-docs.html`, `pack-import.jsx`, `pack-import-dialog.jsx`, `scripts/generate-srd-pack.mjs`, `index.html`, `sw.js`, `i18n.jsx`) for `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER`/"not yet implemented"/empty catch blocks/hardcoded hex colors/absolute URLs. Zero blocker-grade hits. The only regex hit (`pack-docs.html` line 233, "TODOS os atributos HTML") is Portuguese for "ALL attributes" — a false positive, not a debt marker. `ponytail:` comments present (documenting deliberate, in-scope simplifications like the mount-point placeholder and the old-browser buffering fallback) are the intended convention, not debt.

### Deviations Evaluated (per execution_state, not re-litigated)

- **D-05 enforcement by generator provenance instead of byte-diff:** independently confirmed correct — `generate-srd-pack.mjs` never reads any `spells-5E-*.json` file (grep of actual `readFile(` call sites, not just the check script's own assertion).
- **`script-src` deliberately absent:** independently confirmed the measurement is real (headless-Chrome console messages transcribed in `CONCERNS.md`, matching the SUMMARY's claim) and the reasoning is sound (`'unsafe-inline'` alone still defeats the `onerror=`/`onload=` vector the phase's own threat model targets).
- **ROADMAP SC4 edited to match D-09 (duplicate `source` → suffix, not rejection):** confirmed already present in the current `ROADMAP.md` (not part of the pending uncommitted diff, which only touches plan-completion checkbox counts).

## Human Verification Required

The following 6 items need a human with a browser (or a product decision) and cannot be settled by static analysis or code execution. None of them contradict anything verified above; the underlying logic for each has independent automated/behavioral evidence — what's missing is the live, eyes-on browser confirmation the phase's own `03-08-PLAN.md` checkpoint asked for and the human explicitly deferred for time.

### 1. CSP + 6 themes × light/dark + print (03-08-PLAN.md steps 1-4)

**Test:** Open the app and `pack-docs.html`, cycle all 12 theme/mode combinations, open the import dialog in each, trigger print.
**Expected:** No console CSP violation or script error in any combination; import dialog legible with correct contrast in every theme; `pack-docs.html` tables scroll horizontally instead of clipping; print output unchanged from before the phase.
**Why human:** Visual rendering and print-context checks are not verifiable by grep or code execution. The automated CSP measurement (headless Chrome, transcribed in `CONCERNS.md`) confirms the *shipped policy* produces zero violations at boot, but that measurement did not sweep all 12 theme combinations or trigger print.

### 2. Form-state retention after rejection (03-08-PLAN.md step 10)

**Test:** Trigger any of the 4 rejection paths, then check that the form fields remain filled and the error clears on the next input change.
**Expected:** No re-typing required; error message disappears as soon as the user touches a field.
**Why human:** Interactive DOM state behavior in a live browser session.

### 3. CORS-refused URL — on-screen message + toast (03-08-PLAN.md step 12)

**Test:** Paste a URL from a host without permissive CORS headers.
**Expected:** The specific `packErr.fetchFailed` message appears inline, and the global toast also fires.
**Why human:** The underlying code path (`fetch` throwing → `.code === 'fetch-failed'` → mapped to `packErr.fetchFailed`) was independently verified by this verifier's own Node harness. What's unverified is the actual on-screen rendering and toast firing in a real browser against a real CORS-refusing host.

### 4. Hostile payload across the 4 render sinks (03-08-PLAN.md steps 15-16)

**Test:** Open a spell whose description carries `<img onerror=...>` + inline `<script>` in the card, side panel, detail screen, and print sheet.
**Expected:** No `alert` fires in any of the 4 contexts; console shows no execution.
**Why human:** Cannot be run at all right now — there is no UI path to render a spell from an imported pack yet (`spells-data-loader.jsx` has a hardcoded `SPELL_VERSIONS` and no `pluginStore` reference; that dispatch is Phase 4/SRD-03 scope). The human's own storage-layer check (step 17, already run) confirms the stored HTML is clean before write, which covers the underlying risk by substitution, but this item should stay open and be re-run once Phase 4 wires the render dispatch — it is real outstanding verification debt, not a defect, and should not be silently marked equivalent to having watched the 4 sinks in a browser.

### 5. Theme/table overflow on `pack-docs.html` specifically (03-08-PLAN.md step 3)

**Test:** Narrow the browser window on `pack-docs.html` and confirm both reference tables scroll horizontally instead of clipping or reflowing into cards.
**Expected:** Horizontal scroll, no silent truncation.
**Why human:** Visual layout behavior at a specific viewport width.

### 6. REQUIREMENTS.md tracking metadata (documentation, not code)

**Test:** Decide whether to flip PKG-02/03/04/05 and SRD-01 from `[ ]`/`Pending` to `[x]`/`Complete` in `.planning/REQUIREMENTS.md`, given the evidence in this report.
**Expected:** A deliberate decision, not an automated flip by this verifier.
**Why human:** This is a milestone-tracking judgment call about when to mark a requirement "done" (e.g. some teams wait for ship, not just phase-verify) — not a fact this verifier can resolve by reading code.

## Gaps Summary

No functional gaps found. Every artifact this phase was supposed to produce exists, is substantive, is wired, and — beyond static checks — was independently exercised with direct code-execution harnesses in this verification session that confirm the exact behaviors the plans specified (prototype-pollution blocking during parse, fail-closed sanitization, single-write funnel ordering, D-09 suffix resolution, D-05 provenance, and the real SRD packs passing the real shipped validator). All 21 `scripts/check-*.tests.ps1` in the repository pass individually.

What remains is exactly what the phase's own final plan (03-08) flagged as deferred: a set of visual/interactive browser checks the human explicitly chose to skip for time (not because anything failed), plus one genuinely-unexercised item (rendering a hostile payload through the 4 live sinks) that is correctly out of reach until Phase 4 wires the loader's plugin-store dispatch, and one documentation-bookkeeping item (REQUIREMENTS.md status flags) that reflects a tracking gap, not an implementation gap.

---

_Verified: 2026-08-11T23:52:24Z_
_Verifier: Claude (gsd-verifier)_
