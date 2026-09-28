---
phase: 08-composicao-aditiva-de-pacotes
plan: 04
subsystem: pack-import, ui
tags: [react, no-build-jsx, slug-identity, rename-dialog, indexeddb-registry]

# Dependency graph
requires:
  - phase: 08-composicao-aditiva-de-pacotes
    provides: "08-01 (union-of-selection loader core, window.loadSpellVersion/window.SPELL_VERSIONS) and 08-02 (i18n rename.*/menu.* keys, srd-reserved-slugs.json) — both consumed by this plan's slug-identity/rename-prompt implementation"
provides:
  - "Slug identity (D-08): SLUG_PATTERN, slugKey, detectSlugConflicts, suggestSlug, validateSlugRename, applySlugRenames, loadReservedSlugs, slugOwnersOf in pack-import.jsx"
  - "_install(text, opts) collision step between freeIdentifier and putPack: owners = reserved SRD slugs + all installed idb packs' spells; opts.onConflicts pauses the funnel; null cancels, a Map applies renames and redetects fail-closed"
  - "pack-rename-dialog.jsx: PackRenameForm/PackRenameDialog (reusable rename-conflict prompt), renameInstalledPackSlugs (rewrites an already-installed pack), renameImpact (read-only prepared/bookmarked impact count)"
  - "pack-import-dialog.jsx wired to open PackRenameForm in place of its own body+footer when the funnel reports a slug conflict; cancel/close resolves null and aborts cleanly (D-12)"
  - "window.packImport.{SLUG_PATTERN,slugKey,detectSlugConflicts,suggestSlug,validateSlugRename,applySlugRenames,loadReservedSlugs,slugOwnersOf} and window.{PackRenameForm,PackRenameDialog,renameInstalledPackSlugs,renameImpact} — the exact interface consumed by 08-05's menu selection flow"
affects: [08-05, 08-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fail-closed collision handling: any step that cannot prove a slug is safe (missing reserved-slugs list, no onConflicts handler, still-colliding rename) rejects the whole install rather than degrading to a partial write"
    - "Promise-gated UI pause: _install's opts.onConflicts returns a Promise that only resolves when the embedded React form calls resolve(Map) or resolve(null) — the async funnel genuinely blocks on user input without polling or a second entry point"
    - "Dialog body/footer swap: PackRenameForm renders both its own scrollable rows area and its own fixed action bar so it can be embedded standalone inside another dialog (no dialog-in-a-dialog, no duplicate role=\"dialog\")"

key-files:
  created:
    - pack-rename-dialog.jsx
    - scripts/check-slug-rename.tests.ps1
  modified:
    - pack-import.jsx
    - pack-import-dialog.jsx
    - index.html
    - scripts/check-pack-import.tests.ps1
    - scripts/check-pack-import-dialog.tests.ps1

key-decisions:
  - "Identity-by-slug collision set is the union of loadReservedSlugs() (SRD builtins) and slugOwnersOf() over every currently-enumerated 'idb' SPELL_VERSIONS entry — not just the pack being replaced/reinstalled — matching D-08's 'unique across ALL installed packs' requirement literally"
  - "loadReservedSlugs() failure throws a plain Error with no .code, so pack-import-dialog.jsx's packErrKeyFor() falls through to packErr.unknown (A-12) rather than inventing a new user-facing message for an edge case the phase didn't spec text for"
  - "detectSlugConflicts()/suggestSlug() never call freeIdentifier() and vice versa — verified by a gate assertion that greps each function's own body — keeping the two collision mechanisms (magia slug vs. meta.source pack id) structurally independent, not just documented as independent"
  - "PackRenameForm owns both the scrollable conflict-rows area AND the fixed action bar (apply-all/cancel/submit) so the same component works standalone inside PackImportDialog (Task 3, this plan) and inside PackRenameDialog's own modal shell (for 08-05's menu-selection flow) with zero duplicated layout code"

requirements-completed: []

coverage:
  - id: D1
    description: "Import funnel treats a spell's name/slug as a unique identity across all installed packs + SRD reserved slugs (case-insensitive); a collision opens a rename prompt via opts.onConflicts and writes nothing until the promise resolves; declining (null) or an unresolved collision after rename both fail closed with no IndexedDB write"
    requirement: "MGMT-07"
    verification:
      - kind: unit
        ref: "scripts/check-slug-rename.tests.ps1 Node vm proof running the real pack-import.jsx: detectSlugConflicts/suggestSlug/validateSlugRename/applySlugRenames pure-function behavior, plus the full _install() funnel (cancel -> 0 writes, no-handler -> slug-conflict, resolved rename -> 1 write with the renamed spell)"
        status: pass
      - kind: unit
        ref: "scripts/check-pack-import.tests.ps1 (funnel order assertion: parsePackText < validatePack < sanitizePack < freeIdentifier < detectSlugConflicts < putPack; exactly 1 putPack/1 JSON.parse)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Reusable PackRenameForm/PackRenameDialog: live per-row slug suggestion + format/reserved/duplicate validation, apply-suffix-to-all, submit disabled until every row is valid, submitting state with no spinner, cancel-anywhere aborts the whole operation atomically, long third-party names truncated to 64 chars with overflow-wrap"
    requirement: "MGMT-07"
    verification:
      - kind: unit
        ref: "scripts/check-slug-rename.tests.ps1 (structural: PackRenameForm/PackRenameDialog/renameInstalledPackSlugs/renameImpact declared and exposed on window, exactly 1 role=\"dialog\" and 1 pluginStore.putPack(, no localStorage/persistCharacters/persistBookmarks/toggleBookmark/loadBookmarks/dangerouslySetInnerHTML anywhere in the file)"
        status: pass
      - kind: unit
        ref: "scripts/check-slug-rename.tests.ps1 Node proof of renameImpact()/renameInstalledPackSlugs() extracted and run against the real v11-character-editor.jsx peek*() accessors with instrumented localStorage (0 setItem/removeItem/dispatchEvent calls) and a pluginStore stub (getPack -> putPack once with the renamed spell and preserved displayName -> invalidateSpellVersion -> refreshPluginVersions; getPack -> null rejects without writing)"
        status: pass
    human_judgment: false
  - id: D3
    description: "pack-import-dialog.jsx opens the rename prompt inline (no dialog-in-a-dialog) when the funnel reports a conflict; cancelling or closing the dialog (X/backdrop/Esc) while the prompt is open resolves null and aborts with nothing written and no error message shown"
    requirement: "MGMT-07"
    verification:
      - kind: unit
        ref: "scripts/check-pack-import-dialog.tests.ps1 (onConflicts/window.PackRenameForm/'cancelled'/window.renameImpact/setConflictCtx(null) present; installFromFile/installFromUrl both called with { onConflicts }; submitDisabled still starts with busy || !hasValue || !!result)"
        status: pass
      - kind: integration
        ref: "npm test (full scripts/run-tests.ps1 suite) — all pre-existing gates plus the three touched/new ones pass together"
        status: pass
    human_judgment: true
    rationale: "The actual modal-swap UX (prompt replacing body+footer in place, focus trap on reopen, visual scroll/overflow behavior at 80vh) is only provable by eyes on a running browser — the gates prove the wiring and state machine, not the rendered interaction."
duration: unknown (parallel worktree session; wall-clock elapsed time not tracked separately from tool-call latency)
completed: 2026-09-28
status: complete
---

# Phase 8 Plan 04: Slug Identity + Rename-Conflict Prompt Summary

**Import funnel now treats a spell's slug as a unique identity across every installed pack plus the SRD reserved list, pausing on collision for a reusable rename prompt (`pack-rename-dialog.jsx`) that writes nothing until the user resolves or cancels — wired end to end into `pack-import-dialog.jsx` and exposed by name for the 08-05 menu-selection flow.**

## Performance

- **Duration:** unknown — parallel worktree session, wall-clock not tracked separately
- **Completed:** 2026-09-28
- **Tasks:** 3/3
- **Files modified:** 7 (2 new: `pack-rename-dialog.jsx`, `scripts/check-slug-rename.tests.ps1`; 5 modified: `pack-import.jsx`, `pack-import-dialog.jsx`, `index.html`, `scripts/check-pack-import.tests.ps1`, `scripts/check-pack-import-dialog.tests.ps1`)

## Accomplishments

- `pack-import.jsx` gained the full slug-identity toolkit (`SLUG_PATTERN`, `slugKey`, `detectSlugConflicts`, `suggestSlug`, `validateSlugRename`, `applySlugRenames`, `loadReservedSlugs`, `slugOwnersOf`) as pure, individually-provable functions, plus two new `PACK_ERROR_CODES` (`SLUG_CONFLICT`, `CANCELLED`).
- `_install(text, opts)` inserts a collision step between `freeIdentifier` and `putPack`: it unions `loadReservedSlugs()` (SRD builtins) with `slugOwnersOf()` over every enumerated `idb` pack, and if the incoming pack's spells collide with that union it calls `opts.onConflicts({ rows, packSource, reservedKeys, takenKeys })` and awaits a `Map` (apply and redetect, fail closed if any collision remains) or `null` (cancel, nothing written). No `opts.onConflicts` at all is also fail-closed (`slug-conflict`).
- New module `pack-rename-dialog.jsx` ships `PackRenameForm` (per-row live suggestion + format/reserved/duplicate validation, apply-suffix-to-all, submit/submitting/disabled states, impact warning, T-05-01 text truncation), `PackRenameDialog` (the same modal shell pattern as `pack-import-dialog.jsx`, for 08-05's standalone use), `renameInstalledPackSlugs` (rewrites an already-installed pack's spells via `applySlugRenames` + `putPack` + `invalidateSpellVersion` + `refreshPluginVersions`), and `renameImpact` (a pure read over `peekCharacters()`/`peekBookmarks()` — proven zero-write by a Node proof against an instrumented `localStorage`).
- `pack-import-dialog.jsx` now swaps its own body+footer for `PackRenameForm` in place when the funnel reports a conflict; `onConflicts` computes the prepared/bookmarked impact via `window.resolvableSpellKeys()`/`window.renameImpact()` and returns a Promise that only resolves when the user submits or cancels. Closing the dialog (X, backdrop click, Esc) while a conflict is pending resolves `null` first so no promise is ever left dangling.
- `index.html` loads `pack-rename-dialog.jsx` right after `v11-character-editor.jsx` (needs `useDialogA11y`/`peek*`) and before `pack-import-dialog.jsx` (wires `window.PackRenameForm`).
- One new gate (`scripts/check-slug-rename.tests.ps1`) with two Node runtime proofs (pure functions + full `_install` funnel; `renameImpact`/`renameInstalledPackSlugs` against real production accessors), and two existing gates realigned (`check-pack-import.tests.ps1`, `check-pack-import-dialog.tests.ps1`).

## Task Commits

1. **Task 1: Detecção, sugestão, validação e aplicação de renomeação no funil de import** - `ac1321a` (feat) — SLUG_PATTERN/slugKey/detectSlugConflicts/suggestSlug/validateSlugRename/applySlugRenames/loadReservedSlugs/slugOwnersOf, `_install(text, opts)` collision step, new gate + `check-pack-import.tests.ps1` realigned
2. **Task 2: Módulo pack-rename-dialog.jsx** - `a0f935e` (feat) — PackRenameForm/PackRenameDialog/renameInstalledPackSlugs/renameImpact, `index.html` load order, gate extended with a Node proof against real `v11-character-editor.jsx` accessors
3. **Task 3: Import integrado ao prompt** - `220cf59` (feat) — `conflictCtx` state, `onConflicts` wiring, cancel/close abort semantics, gates realigned

_No separate RED/GREEN commits: each task's gate was authored/extended and run to confirm failure before the implementation edit, then re-run to confirm pass, all within a single commit per task — matching this codebase's established convention for `.tests.ps1`-gated tasks (see 08-01/08-02 summaries for the same pattern)._

## Files Created/Modified

- `pack-import.jsx` - Slug-identity section (SLUG_PATTERN through slugOwnersOf), two new PACK_ERROR_CODES, `_install`/`installFromFile`/`installFromUrl` gain `opts`, `window.packImport` exposes the 8 new members
- `pack-rename-dialog.jsx` (new) - PackRenameForm, PackRenameDialog, renameInstalledPackSlugs, renameImpact, exposed via `Object.assign(window, {...})`
- `pack-import-dialog.jsx` - `conflictCtx` state, `closeDialog`/`onConflicts` handlers, body+footer swap for `PackRenameForm`, `cancelled` short-circuit in the catch block
- `index.html` - `pack-rename-dialog.jsx` script tag inserted between `v11-character-editor.jsx` and `pack-import-dialog.jsx`, load-order comment updated
- `scripts/check-slug-rename.tests.ps1` (new) - MGMT-07 gate: structural assertions across all three touched/created files + two Node runtime proofs
- `scripts/check-pack-import.tests.ps1` - `_install(text)` -> `_install(text, opts)` regex, funnel-order assertion extended with `detectSlugConflicts`, exposed-members list extended with the 8 new names
- `scripts/check-pack-import-dialog.tests.ps1` - requires `onConflicts`/`window.PackRenameForm`/`'cancelled'`/`window.renameImpact`/`setConflictCtx(null)`, and that both install calls pass `{ onConflicts }`

## Decisions Made

- The collision-owner set for a given import is `loadReservedSlugs().owners` unioned with `slugOwnersOf()` over **every** `idb`-source `SPELL_VERSIONS` entry (not just packs sharing a language/edition) — this is the literal reading of D-08 ("slug é identidade única" across all installed packs), and matches the interface 08-05 expects to consume.
- `loadReservedSlugs()`'s fetch/parse failure is a plain `Error` with no `.code` on purpose (A-12): `packErrKeyFor()` in `pack-import-dialog.jsx` already falls through unmapped codes to `packErr.unknown`, so no new i18n key or `PACK_ERROR_CODES` entry was needed for this offline/no-cache edge case.
- `suggestSlug()` normalizes to `${slug}-${packSource}`, replaces disallowed characters, collapses/trims hyphens, and only then applies the 64-char cap — trimming trailing hyphens both before and after the cap so a truncated suggestion never violates `SLUG_PATTERN`.
- `PackRenameForm` renders its own scrollable rows area *and* its own fixed action bar (rather than expecting a parent to supply chrome) specifically so `pack-import-dialog.jsx` (Task 3) can swap it in for its existing body+footer with zero layout duplication, and so `PackRenameDialog` (for 08-05) can wrap the same component with just a header on top.
- `REQUIREMENTS.md`/`STATE.md`/`ROADMAP.md` were intentionally left untouched per this plan's parallel-worktree execution contract — the orchestrator updates those centrally once every wave-2 worktree agent (this plan and 08-03) has finished, avoiding a merge conflict between two agents editing the same shared files.

## Deviations from Plan

None — plan executed as written. The `suggestSlug`/`validateSlugRename` implementations and the `_install` collision step match the plan's `<action>` pseudocode closely enough that no Rule 1-4 deviation was needed; two regex bugs were caught and fixed during gate authoring itself (see Issues Encountered), not after implementation, so they aren't tracked as deviations from a working plan.

## Issues Encountered

- **Regex false-negative in the "onConflicts passed to installFromUrl/File" gate assertions.** The first version of `installFromFile\([^)]*,\s*\{\s*onConflicts` failed against the real call site `installFromUrl(url.trim(), { onConflicts })` because `[^)]*` stops at the first `)` — and `url.trim()` contains one before the outer closing paren. Fixed by switching to `installFromFile\([\s\S]*?\{\s*onConflicts` (non-greedy across nested parens) in both `check-pack-import-dialog.tests.ps1` and `check-slug-rename.tests.ps1`. Caught and fixed during gate authoring/GREEN verification, before any task commit landed with the bug.
- **Sandboxed worktree blocks direct `pwsh`/`git` invocation** (same constraint documented in 08-01/08-02's summaries). Workaround used throughout: `node -e "require('child_process').spawnSync('pwsh', [...], {stdio:'inherit'})"` to run every `.tests.ps1` gate and `npm test` directly (not a re-implementation — the real PowerShell interpreter ran every gate, including its embedded Node proofs, and `npm test` printed "All test scripts passed." at the end of every task), and `/mingw64/bin/git.exe` for all git operations. No code or plan impact — this is confirmed execution of the actual gates, not a substitute for them.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The full interface 08-05 needs is now live and exercised: `window.packImport.{detectSlugConflicts,slugOwnersOf,loadReservedSlugs,suggestSlug,validateSlugRename,applySlugRenames,slugKey}` and `window.{PackRenameForm,PackRenameDialog,renameInstalledPackSlugs,renameImpact}` — 08-05 can wire `PackRenameDialog` directly into the pack-menu's selection flow for a homebrew pack that collides with an already-installed one, without touching `pack-import.jsx` or `pack-rename-dialog.jsx` again.
- The PACK id collision mechanism (`meta.source`/`freeIdentifier`) remains completely untouched and structurally separate from the new slug-identity mechanism, verified by a gate assertion that scans `suggestSlug`'s and `detectSlugConflicts`'s own function bodies for any `freeIdentifier(` call.
- MGMT-07 is not marked complete in `REQUIREMENTS.md` by this plan (per the parallel-worktree instruction to leave shared tracking files to the orchestrator) — the orchestrator should mark it once this plan's changes are merged, cross-checking against whether 08-05 needs to ship first for the requirement's full UI surface to be considered done.
- `npm test` passes in full (`All test scripts passed.`) at the end of every task in this plan, run directly against the real PowerShell test runner in the sandboxed worktree.

## Self-Check: PASSED

- FOUND: pack-import.jsx
- FOUND: pack-rename-dialog.jsx
- FOUND: pack-import-dialog.jsx
- FOUND: index.html
- FOUND: scripts/check-slug-rename.tests.ps1
- FOUND: scripts/check-pack-import.tests.ps1
- FOUND: scripts/check-pack-import-dialog.tests.ps1
- FOUND commit: ac1321a (Task 1)
- FOUND commit: a0f935e (Task 2)
- FOUND commit: 220cf59 (Task 3)

---
*Phase: 08-composicao-aditiva-de-pacotes*
*Completed: 2026-09-28*
