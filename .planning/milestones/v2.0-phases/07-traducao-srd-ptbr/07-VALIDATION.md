---
phase: 7
slug: traducao-srd-ptbr
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-09-26
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | none — static `.tests.ps1` gates (project convention) |
| **Config file** | none — `scripts/run-tests.ps1` discovers every `scripts/*.tests.ps1` |
| **Quick run command** | `pwsh -NoProfile -File scripts/check-srd-ptbr-pack.tests.ps1` |
| **Full suite command** | `npm test` (= `pwsh -NoProfile -File scripts/run-tests.ps1`) |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run the gate(s) the task touched (`pwsh -NoProfile -File scripts/check-<name>.tests.ps1`)
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green + D-15 manual QA done
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 7-01-01 | 01 | 1 | SRD-04 | T-07-02, T-07-06 | 4 legacy fixtures only under `.cache/legacy-fixtures/` (gitignored) | script + git | `node scripts/build-legacy-fixtures.mjs && git check-ignore -q .cache/legacy-fixtures/spells-5E-2024-PTBR.pack.json && pwsh -NoProfile -File scripts/check-srd-packs.tests.ps1` | ❌ W0 (script created by this task) | ⬜ pending |
| 7-01-02 | 01 | 1 | SRD-01, SRD-04 | T-07-01, T-07-03, T-07-04, T-07-05 | recorte = exactly the 339 SRD 5.2 slugs, license verbatim, no caption/proper name, pairing validated vs EN + D-19 oracle ≥300/322 | script self-assert + node proof | `node scripts/extract-ptbr-source.mjs` (+ node proof in the task's verify) | ❌ W0 (script created by this task) | ⬜ pending |
| 7-02-01 | 02 | 2 | SRD-01, SRD-02, SRD-04 | T-07-07, T-07-09, T-07-10, T-07-11 | gate exists and is RED only because the pack is missing | static gate (RED) | `pwsh -NoProfile -File scripts/check-srd-ptbr-pack.tests.ps1` → expected non-zero, message cites `srd-2024-ptbr.json` | ❌ W0 (gate created by this task) | ⬜ pending |
| 7-02-02 | 02 | 2 | SRD-01, SRD-02, SRD-04 | T-07-07, T-07-08, T-07-09, T-07-10, T-07-11 | pack generated; EN packs byte-identical; gate GREEN | gate + diff | `node scripts/generate-srd-pack.mjs && git diff --quiet -- srd-2014-en.json srd-2024-en.json && pwsh -NoProfile -File scripts/check-srd-ptbr-pack.tests.ps1` | ✅ after 7-02-01 | ⬜ pending |
| 7-03-01 | 03 | 2 | SRD-04 | — | SRD-04 active + traceability | node doc proof | `node -e` proof in task verify | ✅ | ⬜ pending |
| 7-03-02 | 03 | 2 | SRD-01, SRD-02 | T-07-18, T-07-19 | pt-BR provenance recorded, no spell text copied | node doc proof | `node -e` proof in task verify | ✅ | ⬜ pending |
| 7-04-01 | 04 | 3 | SRD-02 | T-07-17 | 45-char pt-BR upgrade label stripped structurally | static gate + node proof (RED→GREEN) | `pwsh -NoProfile -File scripts/check-upgrade-heading-strip.tests.ps1` | ✅ (extended by this task) | ⬜ pending |
| 7-04-02 | 04 | 3 | SRD-03, SRD-04 | T-07-13, T-07-14, T-07-15 | registry + D-08 fallback + precache + v4 bump, same commit as the 3 realigned gates | node proof + full suite | `npm test` (+ registry/map node proof in task verify) | ✅ (3 gates realigned by this task) | ⬜ pending |
| 7-04-03 | 04 | 3 | SRD-02 | — | banner copy parity pt/en | static gate | `pwsh -NoProfile -File scripts/check-transition-banner.tests.ps1` | ✅ | ⬜ pending |
| 7-05-01 | 05 | 4 | SRD-02, SRD-03, SRD-04 | T-07-20, T-07-21 | sample of 11 spells present with expected features; app served | full suite + node proof | `npm test` (+ sample node proof in task verify) | ✅ | ⬜ pending |
| 7-05-02 | 05 | 4 | SRD-02, SRD-03, SRD-04 | T-07-20, T-07-21 | D-15 human review on screen | manual (checkpoint) | — (see Manual-Only) | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/check-srd-ptbr-pack.tests.ps1` — new gate covering D-14, D-16, D-18 (+ D-01 set equality, D-02 double verbatim attribution, D-04 own note, D-13 identity, no `<script`/`on*=`/`javascript:` in fields, generator never reads the full source or the fixtures) — plan 07-02 Task 1 (RED), GREEN in Task 2
- [ ] `scripts/check-decommission.tests.ps1` — realign builtin SRD count 2 → 3 (structural + node proof) — plan 07-04 Task 2
- [ ] `scripts/check-source-dispatch.tests.ps1` — realign `source: 'fetch'` and `edition: '5e 20` counts 2 → 3 (found at planning by simulating the registry change on a scratch copy of HEAD; not in RESEARCH) — plan 07-04 Task 2
- [ ] `scripts/check-migration-version-fallback.tests.ps1` — realign the 4 legacy-key cases to the D-08 table — plan 07-04 Task 2
- [ ] `scripts/check-upgrade-heading-strip.tests.ps1` — add the 45-char pt-BR label case and `srd-2024-ptbr.json` to the real-data proof (`UPGRADE_HEADING` capped labels at 40 chars) — plan 07-04 Task 1

Planning-time measurement: on a scratch copy of HEAD with only the registry/precache/fallback changes and a stand-in pack, `run-tests.ps1` failed exactly `check-decommission`, `check-source-dispatch` and `check-migration-version-fallback`, and passed in full after realigning those three.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| ~10 spells read correctly on screen (table, list, upcast section, one of the 17 renamed) | D-15 | Translated-content review; no automatable oracle for rendering quality | Open app with pt-BR browser language, pick the 10 spells, compare against the source Markdown |
| First visit in pt-BR browser lands on `srd-2024-ptbr` without configuration | D-06 | Browser-language detection end to end | Fresh profile, `navigator.language = pt-BR`, load app, confirm active version |
| Saved legacy `*-PTBR` key lands on `srd-2024-ptbr`; prepared spells survive a pt↔en switch | D-07, D-08, D-13 | Needs a real browser profile with seeded `localStorage` | Plan 07-05 checkpoint items 4-5 |
| pt-BR builtin row shows WotC + Heróis Anônimos attribution and the pt note | SRD-02, D-02, D-04 | Rendering of the licence block in the pack manager | Plan 07-05 checkpoint item 6 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (7-05-02 is the manual D-15 checkpoint; its `<verify>` still re-runs `npm test`)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
