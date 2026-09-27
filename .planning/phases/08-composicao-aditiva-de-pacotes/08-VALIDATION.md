---
phase: 8
slug: composicao-aditiva-de-pacotes
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-27
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | none (no JS test runner) — PowerShell source-assertion gates `scripts/*.tests.ps1` + headless-Chromium checkpoint at 390×844 and desktop |
| **Config file** | none — `scripts/run-tests.ps1` runs every `scripts/*.tests.ps1` |
| **Quick run command** | `pwsh -NoProfile -File scripts/check-<gate>.tests.ps1` (single gate for the task) |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run the single `.tests.ps1` gate that covers the task
- **After every plan wave:** Run `npm test` + headless-Chromium pass (390×844 and desktop)
- **Before `/gsd-verify-work`:** Full suite must be green + human checkpoint on pack menu and rename dialog (UI-SPEC)
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| {filled by planner per task} | | | | | | | | | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Proposed by RESEARCH.md (planner confirms gate names and requirement IDs):

- [ ] `scripts/check-pack-composition.tests.ps1` — union of selection, per-spell `lang`/`_versionKey` stamping
- [ ] `scripts/check-slug-rename.tests.ps1` — slug collision detection + rename write, import and selection entry points, cancel aborts
- [ ] `scripts/check-pack-menu.tests.ps1` — unified pack menu (absorbs/replaces `check-pack-manager.tests.ps1` assertions)
- [ ] `scripts/check-selection-migration.tests.ps1` — `versionKey` single→list, `?v=` comma list, legacy fallback before conversion
- [ ] Extend `scripts/check-pack-validator.tests.ps1` — `meta.image` (`data:` URI, raster MIME allowlist, size cap)
- [ ] Extend `scripts/check-loader-hardening.tests.ps1` / `scripts/check-edition-compare.tests.ps1` — empty-selection fallback, SRD 5.1/5.2 exclusivity, EN×PT uiLang tiebreak

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pack menu cards (image, title, description, derived color), chip `SRD 5.2 +2` | menu (D-16..D-19) | Visual layout / UI-SPEC 6 dimensions | Headless Chromium 390×844 + desktop; open menu, select 2+ packs, compare with UI-SPEC |
| Rename prompt live validation, "apply suffix to all", cancel aborts | rename (D-09..D-12) | Interactive dialog flow | Import a pack with a reserved slug; check suggestion, validation errors, cancel writes nothing |
| Grid shows union with per-spell language (`lang`) and `src` footer | union (D-01, D-06, D-20) | Rendered output across languages | Select SRD 5.2 EN + a PT homebrew; inspect cards and `lang` attributes |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
