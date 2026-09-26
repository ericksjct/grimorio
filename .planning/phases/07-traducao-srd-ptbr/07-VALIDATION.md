---
phase: 7
slug: traducao-srd-ptbr
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
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
| 7-XX-XX | — | — | — | — | filled by planner | — | — | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/check-srd-ptbr-pack.tests.ps1` — new gate covering D-14, D-16, D-18 (+ no `<script`/`on*=` in fields, no `spells-5E` reference in the pt-BR extractor)
- [ ] `scripts/check-decommission.tests.ps1` — realign builtin SRD count 2 → 3 (structural + node proof)
- [ ] `scripts/check-migration-version-fallback.tests.ps1` — realign the 4 legacy-key cases to the D-08 table

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| ~10 spells read correctly on screen (table, list, upcast section, one of the 17 renamed) | D-15 | Translated-content review; no automatable oracle for rendering quality | Open app with pt-BR browser language, pick the 10 spells, compare against the source Markdown |
| First visit in pt-BR browser lands on `srd-2024-ptbr` without configuration | D-06 | Browser-language detection end to end | Fresh profile, `navigator.language = pt-BR`, load app, confirm active version |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
