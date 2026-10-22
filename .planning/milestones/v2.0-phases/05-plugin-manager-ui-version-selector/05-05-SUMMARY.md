---
phase: 05-plugin-manager-ui-version-selector
plan: 05
subsystem: verification
tags: [checkpoint, uat, playwright, mgmt, srd, todo-closure]

# Dependency graph
requires:
  - phase: 05-plugin-manager-ui-version-selector
    plan: 04
    provides: "Complete pack manager surface: modal, triggers on both platforms, duplicate note, removal flow"
provides:
  - "Human-approved confirmation of the six ROADMAP success criteria for Phase 5 (MGMT-01..05, SRD-02)"
  - ".planning/todos/completed/mobile-botao-instalar-cobre-drawer.md — folded todo closed with root-cause resolution recorded"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Headless-browser checkpoint verification: the eight-item manual script was executed as Playwright/Chromium assertions instead of by hand, at the user's explicit request. Scripts live outside the repo (session scratchpad) — no new repo dependency, no new test-suite surface."

key-files:
  created: []
  modified:
    - .planning/todos/completed/mobile-botao-instalar-cobre-drawer.md

key-decisions:
  - "The checkpoint's eight-item script was executed via Playwright + Chromium (already present in node_modules via openspec-playwright, with browsers already cached) rather than by hand. The plan forbids *inventing a frontend test suite as new scope*; it does not forbid driving the documented manual script mechanically. Nothing was added to the repo: the five scripts and the pack fixture live in the session scratchpad, and scripts/run-tests.ps1 gained no new file."
  - "'Covers' was asserted with document.elementFromPoint over a point grid across the VERSÃO section, not with bounding-box intersection. Rect intersection produced false positives (spell cards painted *behind* the drawer, and the drawer's own scrim) — elementFromPoint respects paint order, which is what 'covers' actually means."
  - "The CC-BY 'no rendered markup' assertion (P-03) excludes the app's own 'Modificações:' <strong> label, which is chrome around the JSON's modifications string, not the attribution text. The attribution body itself was asserted to be plain text and byte-identical to meta.license.attribution in the packaged srd-2024-en.json / srd-2014-en.json."

patterns-established: []

interfaces-changed: []
---

# Plan 05-05: Human checkpoint — six ROADMAP criteria confirmed

## What was verified

All eight items of the checkpoint script, 81/81 assertions passing in headless
Chromium against a locally served build. The user approved the result.

| Item | Criterion | Assertions |
|------|-----------|-----------|
| 1 | Empty state (MGMT-05) | 8/8 |
| 2 | CC-BY attribution (SRD-02) | 12/12 |
| 3 | Installed list (MGMT-01) | 7/7 |
| 4 | Dynamic version selector, desktop + 390×844 (MGMT-03) | 12/12 |
| 5 | No floating element over the drawer's VERSÃO section (D-03) | 6/6 |
| 6 | Duplicate count and detail note (MGMT-04) | 8/8 |
| 7 | Removal and reinstallation (MGMT-02) | 20/20 |
| 8 | UI-language parity | 7/7 |

Item 7 is the one the static suite could never reach. Three pack-exclusive spells
were prepared and one bookmarked **through the real UI** (card ribbon, detail
bookmark button); `hifi_chars_v1` and `hifi_bookmarks_v1` were captured, the pack
removed through the inline confirmation, and both keys compared string-identical
afterwards. Reinstalling the same pack brought all three back with
`aria-pressed="true"` and the bookmark restored, with no further user action.
That is P-01 (D-07) proven at runtime, not just in source shape.

## Flagged assumptions, resolved

- **A-01** — only the two `corpus: 'srd'` entries become builtin rows; the legacy
  PHB/PT-BR versions stay out of the manager list. Confirmed.
- **A-05** — SRD 5.1 and 5.2 do not count as duplicates of each other. With one
  shared spell installed from a pack, all three rows report exactly `1`, which is
  only possible if the SRD-vs-SRD pair is excluded. Confirmed.
- **A-06** — `hifi_bookmarks_v1` is a global list, not per-character, and the
  bookmark survived the remove/reinstall cycle. Confirmed.

## Folded todo closed

`mobile-botao-instalar-cobre-drawer` moved from `pending/` to `completed/` with a
resolution note: Phase 5 did not reposition the floating button or pad the drawer,
it removed the floating trigger entirely (D-03). `PackImportRoot` no longer exists;
import is reachable only from inside the manager. The 390×844 confirmation in both
themes is recorded in the note.

## Findings outside the ROADMAP criteria

None of these block the phase; none are regressions introduced by Phase 5.

1. **Version-change toast is not translated.** With the UI in pt-br, removing the
   active pack emits `"the pack you were viewing was removed — switched back to
   SRD 5.2 (EN)"` in English. The removal toast (`manager.removed`) translates
   correctly; this second one does not.
2. **Pluralisation.** `manager.duplicates` and `manager.impact*` render `"1 magias
   também presentes"`, `"1 favoritas deixam de resolver"`, `"em 1 personagem(ns)"`.
3. **Pre-existing, outside Phase 5's scope:** every English version displays the
   spell *slug* (`acid-splash`) rather than the display name (`Acid Splash`). This
   affects SRD 5.2, SRD 5.1, PHB 2024/2014 and installed packs alike —
   `spellName()` reads `s.en`, which `adaptSpell()` fills from `name` (the slug)
   rather than `displayName`. Phase 5 touched neither function.

## Self-Check: PASSED

- `pwsh scripts/run-tests.ps1` exits 0 (30 scripts).
- Plan verification block passes: the todo is gone from `pending/`, present in
  `completed/`, and its resolution note contains both `D-03` and `390`.
- `git status` shows the todo as renamed (`R`), not deleted + created.
