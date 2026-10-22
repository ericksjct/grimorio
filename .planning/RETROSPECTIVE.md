# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v2.0 — Plugins BYOD

**Shipped:** 2026-10-21
**Phases:** 10 (2–8 with GSD, 9–11 outside GSD) | **Plans:** 48 | **Tasks:** 112

### What Was Built
- IndexedDB pack storage, persistent-storage request and pack export (Phase 2)
- Validated and sanitized import by file/URL, with a published schema and docs page (Phase 3)
- Source-dispatch loader, pack manager, UI language decoupled from pack language (Phases 4, 04.1, 5)
- Removal of the 4 protected JSONs with non-destructive migration of existing users (Phase 6)
- SRD 5.2 pt-BR pack and additive composition (1 base + additional packs, single pack menu) (Phases 7, 8)
- Mobile audit closed: bottom tab bar, 44px touch targets, safe-area, AA contrast (Phases 9–11)

### What Worked
- Dependency-ordered phases (storage → import → loader → UI → decommission) kept the irreversible step last.
- Executable gates (50 scripts in `scripts/run-tests.ps1`) replaced grep-only checks and caught regressions between phases.
- Headless Chrome QA for human checkpoints when visual review in a real browser was not practical.

### What Was Inefficient
- Phase 8 checkpoint 08-07 failed (4 gaps) and needed 5 more plans (08-08..08-12).
- Requirements added by amendments (PKG-07, SRD-06) were missing from Traceability until the milestone audit.
- Phases 9–11 were done outside GSD, so they have no PLAN/SUMMARY/VERIFICATION and no REQ-IDs.
- Some SUMMARY one-liners are deviation notes, not accomplishments, so automatic extraction gave noisy output.

### Patterns Established
- Pack = existing spell schema + `meta`; built-in packs live only in `packs/` and `packs/index.js`.
- Slug is the unique spell identity across selected packs; collisions are resolved by rename at import.
- Read accessors with zero writes (`peekBookmarks`, `peekCharacters`) for detection logic.
- Bump `CACHE_VERSION` in `sw.js` when precache contents change.

### Key Lessons
1. Add amended requirements to the Traceability table in the same commit as the amendment.
2. Do work that changes the product (mobile redesign) as GSD phases, or record it as a quick task, so the audit can verify it.
3. Check the milestone goal, not only REQ-IDs: the audit found a goal conflict (non-SRD built-in pack) that no requirement covered. At close the user accepted it as a scope change.

### Cost Observations
- Model mix: planning/discuss opus, research/execution/verification sonnet (balanced profile)
- Notable: gap-closure plans in Phase 8 cost more than the original 7 plans of the phase.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Key Change |
|-----------|--------|------------|
| v2.0 | 10 | First full GSD milestone; executable gates as verification |

### Cumulative Quality

| Milestone | Test scripts | Zero-Dep Additions |
|-----------|--------------|--------------------|
| v2.0 | 50 | DOMPurify via CDN+SRI is the only new runtime dependency |

### Top Lessons (Verified Across Milestones)

1. (Fill after the next milestone.)
