---
phase: 07-traducao-srd-ptbr
verified: 2026-09-27T05:13:27Z
status: passed
score: 13/13 must-haves verified
behavior_unverified: 0
overrides_applied: 0
gaps: []
gaps_closed:
  - "03-SRD-SOURCE.md Divergências atualizado para refletir a errata WR-04 (orquestrador, 2026-09-27)"
---

# Phase 7: Tradução dos SRDs para pt-BR Verification Report

**Phase Goal:** O usuário brasileiro volta a ler as magias em português sem configurar
nada, com conteúdo de procedência registrada — a tradução CC-BY-4.0 do Heróis Anônimos
recortada às 339 magias do SRD 5.2 — sem reintroduzir nenhum byte dos 4 datasets que a
Fase 6 removeu.
**Verified:** 2026-09-27T05:13:27Z
**Status:** passed (gap de documentação fechado pelo orquestrador: 03-SRD-SOURCE.md atualizado para a errata WR-04)
**Re-verification:** No — initial verification

**Important context applied per orchestrator note:** a post-plan code review
(07-REVIEW.md) and its fix pass (07-REVIEW-FIX.md) deliberately changed behavior at the
user's request. WR-01 (`spells-5E-2014-PTBR` → `srd-2014-en`, superseding 07-CONTEXT
D-08 for the 2014 key only) and WR-04 (errata patches for forcecage / call-lightning /
glyph-of-warding) are judged against the REVIEW-FIX decision, not the original PLAN
wording — confirmed correctly wired in code, not counted as gaps.

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Navegador pt-BR na primeira visita abre "SRD 5.2 (PT-BR)" e lê as 339 magias em português (D-05, D-06) | ✓ VERIFIED | `BUILTIN_VERSIONS[2]` = `srd-2024-ptbr` with `lang:'ptbr'` (spells-data-loader.jsx:35); `_initialVersionKey()` (L508-517) checks all browser-language candidates post-WR-02, matches on first `pt*`; `srd-2024-ptbr.json` has 339/339 spells (node-verified, name-set identical to `srd-2024-en.json`); confirmed by human checkpoint item 1 (07-05-SUMMARY.md, PASSED) |
| 2 | Chave legada `*-PTBR` volta ao português sozinha; preparadas/favoritas resolvem pelo slug EN (D-07, D-08, D-13; WR-01 supersedes D-08 for the 2014 key) | ✓ VERIFIED | `LEGACY_VERSION_FALLBACK` (spells-data-loader.jsx L86-89): `'spells-5E-2024-PTBR': 'srd-2024-ptbr'`, `'spells-5E-2014-PTBR': 'srd-2014-en'` (WR-01 fix, in-code comment documents the supersession) — matches REVIEW-FIX decision, not stale PLAN wording; `name` field stays the EN slug in both EN and PT packs (identity preserved); npm test's "D-04/D-08 ok" and "Legacy version fallback map resolves..." gates pass; human checkpoint item 4/5 PASSED |
| 3 | Atribuição verbatim WotC + Heróis Anônimos, nota de modificação, visível no gerenciador de pacotes (D-02, D-04, SRD-02) | ✓ VERIFIED | `srd-2024-ptbr.json` `meta.license.attribution` (5140 chars) contains "Heróis Anônimos", no literal `undefined`, no raw Markdown syntax (`**`, `[...](` both absent — WR-03/WR-05 fixes confirmed by direct inspection); `pack-manager.jsx` L276-289 renders `row.license.attribution` then `row.license.modifications` in that order; human checkpoint item 6 PASSED |
| 4 | Exatamente as 339 magias de `srd-2024-en.json`, círculo/escola batendo, sem nome próprio do PHB nem legenda (D-01, D-14, D-16, D-18) | ✓ VERIFIED | Independently re-derived (not trusting SUMMARY): node script confirms 339/339 spell count, name-set exactly equal to EN pack, 0 level/school mismatches (incl. `resilient-sphere` → `evocation` matching EN despite translation saying Abjuração), 0 matches for any of the 12 banned PHB proper nouns across all spell blocks, 0 matches for the Appendix-A leak pattern (CR-01 fix confirmed fixed) |
| 5 | Documento completo do Heróis Anônimos e fixtures legados nunca entram no repositório — só o recorte versionado (D-02, D-09, D-10, D-17) | ✓ VERIFIED | `.gitignore` has both `.cache/` and `docs/superpowers/herois_anonimos/`; `git ls-files` shows nothing under either path; `git status --ignored` confirms `docs/superpowers/herois_anonimos/` is untracked-and-ignored; `.cache/legacy-fixtures/*.pack.json` exist on disk (4 files) but are absent from the index |

**Score:** 5/5 ROADMAP success criteria verified (0 present-but-behavior-unverified)

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| SRD-01 | 07-01, 07-02, 07-03 | Procedência verificada e registrada para o pack pt-BR | ⚠️ MOSTLY SATISFIED | Source verification is sound and the main provenance record is accurate (fonte adotada, o que foi tomado/não tomado, relação com o JSON legado — all in `03-SRD-SOURCE.md`). One sub-item (the "Divergências" resolution description) is stale post-WR-04 — see gap above. Does not affect the shipped pack's correctness, only the accuracy of the written record. |
| SRD-02 | 07-02, 07-04, 07-05 | Atribuição CC-BY visível, texto verbatim, modificações anotadas | ✓ SATISFIED | Verified structurally (attribution content, order, no raw markdown) and by human checkpoint item 6 |
| SRD-03 | 07-04, 07-05 | Pacote SRD pré-instalado, primeira abertura nunca vazia | ✓ SATISFIED | Unaffected by this phase's changes; `BUILTIN_VERSIONS` always non-empty, pt-BR entry is additive |
| SRD-04 | 07-01..07-05 | Pack SRD 5.2 pt-BR, 339 magias, Heróis Anônimos CC-BY, slug EN, atribuição dupla, chaves legadas | ✓ SATISFIED | This is the phase's primary deliverable — verified end-to-end above; marked Complete in REQUIREMENTS.md (traceability table, line 99), promoted out of Future Requirements (line 39) |

**Orphaned requirements:** none — REQUIREMENTS.md traceability table maps SRD-01/02/03/04 to phases 3/5/4/7 respectively, all four accounted for, no phase-7-only ID left unmapped.

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `scripts/build-legacy-fixtures.mjs` | Regenerate 4 legacy JSONs as packs in `.cache/legacy-fixtures/` (D-09) | ✓ VERIFIED | Exists, contains `98740fe^`; 4 `.pack.json` files present on disk, untracked |
| `scripts/extract-ptbr-source.mjs` | One-shot extractor: PHB Markdown → versioned recorte | ✓ VERIFIED | Exists, contains "Descrições da Magias"; CR-01 fix (Appendix-A boundary) present |
| `scripts/srd-sources/srd-5.2-ptbr-pairing.json` | Manual pairing table for the 17 renamed spells | ✓ VERIFIED | Exists (referenced by generator, gate passes) |
| `scripts/srd-sources/srd-5.2-ptbr-source.json` | Versioned recorte: license section + 339 spell blocks | ✓ VERIFIED | Exists, drives the generator via `localSourcePath` |
| `srd-2024-ptbr.json` | Embedded pack, 339 spells, `meta.lang: 'ptbr'` | ✓ VERIFIED | Exists at repo root, 427.5K, 339/339 spells, all structural checks pass |
| `scripts/generate-srd-pack.mjs` | `parsePtbr52` route + per-pack modification note + `PTBR_ERRATA` | ✓ VERIFIED | `function parsePtbr52` present; `PTBR_ERRATA` present with forcecage/call-lightning patches; `MODIFICATION_NOTE_PTBR` names both errata |
| `scripts/check-srd-ptbr-pack.tests.ps1` | Permanent gate (D-14/16/18 + D-01/02/04/13 + security + provenance) | ✓ VERIFIED | Exists, runs as part of `npm test`, all checks pass including the table-width regression check added in 07-05 |
| `spells-data-loader.jsx` | `BUILTIN_VERSIONS` entry, `LEGACY_VERSION_FALLBACK`, `stripUpgradeHeading` | ✓ VERIFIED | All three present and correct (verified above) |
| `sw.js` | Precache `srd-2024-ptbr.json`, `CACHE_VERSION = 'grimorio-v4'` | ✓ VERIFIED | Both confirmed by direct grep |
| `03-SRD-SOURCE.md` §pt-BR | Provenance record: source, license, what was/wasn't taken, divergences | ⚠️ STALE SUB-SECTION | Section exists, mostly accurate, but "Divergências" sub-section was not updated after WR-04 (see gap) |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `spells-data-loader.jsx BUILTIN_VERSIONS` | `srd-2024-ptbr.json` | `file: 'srd-2024-ptbr.json'`, loaded by fetch | ✓ WIRED | Confirmed by grep, and by the file existing at that path |
| `spells-data-loader.jsx LEGACY_VERSION_FALLBACK` | `BUILTIN_VERSIONS srd-2024-ptbr` / `srd-2014-en` | `_initialVersionKey()` dispatch | ✓ WIRED | Confirmed by reading the function body; matches WR-01 post-fix mapping |
| `sw.js PRECACHE` | Cache Storage `grimorio-v4` | `install()`/`activate()` | ✓ WIRED | `CACHE_VERSION` bump present, old-cache eviction present |
| `scripts/generate-srd-pack.mjs` | `scripts/srd-sources/srd-5.2-ptbr-source.json` | `localSourcePath` | ✓ WIRED | Confirmed structurally (pack builds from recorte, gate passes) |
| `scripts/generate-srd-pack.mjs` | `srd-2024-en.json` | `factsFrom` (level/school/class cross-check) | ✓ WIRED | 0 mismatches found by independent re-derivation |
| `srd-2024-ptbr.json` | `spells-data-loader.jsx stripUpgradeHeading()` | `<p><strong><em>` marker | ✓ WIRED | 0 spells with malformed `upgradeDescription` prefix |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| pt-BR pack has exactly 339 spells matching EN name-set | `node` inline script comparing `srd-2024-en.json`/`srd-2024-ptbr.json` | 339/339, sets equal | ✓ PASS |
| No PHB proper-noun leak in any spell field | `node` scan for 12 banned names across all spell JSON blobs | 0 leaks | ✓ PASS |
| No PHB Appendix-A leak (CR-01 regression) | `node` scan for "Apêndice X -" / "Este apêndice" pattern | 0 matches | ✓ PASS |
| forcecage/call-lightning/glyph-of-warding errata applied (WR-04) | `node` inline inspection of the 3 spell records | forcecage: no concentration, 1 hora; call-lightning: storm clause + upgrade text present; glyph-of-warding: EN and PT both non-concentration | ✓ PASS |
| Attribution never contains literal `undefined`, no raw Markdown syntax (WR-03/WR-05) | `node` string checks on `meta.license.attribution` | no `undefined`, no `**`, no `](` | ✓ PASS |
| Full test suite | `npm test` (`pwsh scripts/run-tests.ps1`) | "All test scripts passed." | ✓ PASS |
| Legacy source/fixtures never tracked by git | `git ls-files` / `git status --ignored` | 0 tracked files under `.cache/` or `docs/superpowers/herois_anonimos/` | ✓ PASS |

### Probe Execution

No `scripts/*/tests/probe-*.sh` convention in this project; the project's gate mechanism is `.tests.ps1` files run via `npm test` (`scripts/run-tests.ps1`), which was executed in full above (Step 7b) rather than skipped.

### Anti-Patterns Found

No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` markers found in any phase-touched file (`spells-data-loader.jsx`, `sw.js`, `pack-manager.jsx`, `scripts/generate-srd-pack.mjs`, `scripts/extract-ptbr-source.mjs`, `scripts/build-legacy-fixtures.mjs`, `scripts/check-srd-ptbr-pack.tests.ps1`, `transition-banner.jsx`, `i18n.jsx`).

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `.planning/phases/03-srd-pack-import-pipeline/03-SRD-SOURCE.md` | §"Divergências fonte × SRD 5.2 EN" | Stale factual claim (describes pre-WR-04 pack state) | ⚠️ Warning | Provenance doc is the SRD-01 "registrada" evidence trail; a reader trusting this doc would believe 3 rule-text divergences still exist when they were patched by errata |

### Human Verification Required

None outstanding. The phase's own D-15 human checkpoint (07-05-SUMMARY.md, Task 2) was already executed and approved for all 7 items, including the ~10-spell on-screen sample against the source Markdown, the fresh pt-BR browser profile, the legacy-key redirects, the prepared-spell identity across pack switches, and the pack-manager license text — with a genuine bug (table overflow, Rule 1) found and fixed live during that session (commit `1acbbd9`). I did not find grounds to reopen any of those items; my independent code-level checks corroborate the checkpoint's structural claims (spell count, name-set, field parity, no leaks, errata applied).

### Gaps Summary

One non-blocking documentation gap: `03-SRD-SOURCE.md`'s "Divergências fonte × SRD 5.2 EN" sub-section (written by 07-03, before the 07-code-review fix pass) still describes forcecage, call-lightning, and glyph-of-warding as open divergences resolved by "following the translation's text." The WR-04 fix (07-REVIEW-FIX.md, commit `384849b`) subsequently closed all three via `PTBR_ERRATA` + an EN-side fix, so this description is now factually wrong and was never updated to match. The in-pack record (`MODIFICATION_NOTE_PTBR`) *was* correctly updated and is accurate — only the standalone provenance document lags behind. This does not affect what ships to users (verified byte-for-byte correct above) and is a small, mechanical fix: replace three bullet points with a note citing the errata commit. Everything else — the 5 ROADMAP success criteria, all requirement IDs (SRD-01/02/03/04), all artifacts, all key links, and the WR-01/WR-04 deliberate post-plan behavior changes — is genuinely wired and verified in the codebase, not just claimed in SUMMARY.md.

---

_Verified: 2026-09-27T05:13:27Z_
_Verifier: Claude (gsd-verifier)_
