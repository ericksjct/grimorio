---
phase: 03-srd-pack-import-pipeline
plan: 01
subsystem: docs
tags: [json-schema, pack-format, byod, static-html]

requires:
  - phase: 02-plugin-storage-foundation
    provides: "plugin-store.jsx IndexedDB layer (putPack/getPack/listPacks/exportPack) and the A-02 decision that exportPack() serializes the stored record verbatim, including the top-level id key"
provides:
  - "pack.schema.json — JSON Schema draft 2020-12 contract for the BYOD pack format, published at the repo root with a public GH Pages $id"
  - "pack-docs.html — static, no-build author-facing documentation of the same format, theme-aware via spellbook-ui-prefs"
  - "scripts/check-pack-format.tests.ps1 — permanent regression check keeping schema and docs field lists in parity"
affects: [03-02, 03-03, 05-pack-manager]

tech-stack:
  added: []
  patterns:
    - "JSON Schema (draft 2020-12) as the published contract for a data format, with $id pointing at the GH Pages URL so external validators can target it directly"
    - "Schema<->docs parity enforced by counting <tr> rows against schema property counts, rather than hand-maintained line-by-line assertions — catches drift in either direction with one check"

key-files:
  created:
    - pack.schema.json
    - pack-docs.html
    - scripts/check-pack-format.tests.ps1
  modified: []

key-decisions:
  - "Example pack in pack-docs.html uses an original placeholder spell ('Faísca Arcana' / faisca-arcana), not verbatim SRD/PHB text — avoids embedding third-party spell text in documentation shipped before the licensing-verification work in 03-02/03-03"
  - "pack.schema.json.properties.id carries an explicit description tying it to plugin-store.jsx's exportPack() (A-02) so the schema itself documents why an id field exists despite import ignoring it"
  - "check-pack-format.tests.ps1 verifies table-row-count parity (fields + 1 header) instead of asserting every literal table row string — a smaller, harder-to-desync check that still fails on added/removed/renamed fields in either file"

patterns-established:
  - "Regression-check-as-test for static content: PowerShell script loads schema JSON + parses HTML as text, asserts field-name presence and structural counts, no test framework"

requirements-completed: [PKG-01]

coverage:
  - id: D1
    description: "pack.schema.json published at repo root, JSON Schema draft 2020-12, meta+spells required, spells.minItems=1, meta.license required id+attribution"
    requirement: "PKG-01"
    verification:
      - kind: unit
        ref: "node -e schema shape assertions (minItems, meta fields, spell fields) — see Task 1 acceptance criteria"
        status: pass
      - kind: unit
        ref: "scripts/check-pack-format.tests.ps1 — schema invariants block (minItems=1, meta.required contains license)"
        status: pass
    human_judgment: false
  - id: D2
    description: "pack-docs.html documents meta fields, spell fields, one-spell example, CORS host allowlist, and links to pack.schema.json, using only theme custom properties (no hardcoded hex)"
    requirement: "PKG-01"
    verification:
      - kind: unit
        ref: "scripts/check-pack-format.tests.ps1 — content-contract and no-hex-color blocks"
        status: pass
      - kind: unit
        ref: "node -e example <pre> block extraction, HTML-entity decode, JSON.parse, spells.length===1, meta.required satisfied"
        status: pass
    human_judgment: true
    rationale: "Visual rendering across the 6 themes x light/dark and actual browser appearance (typography scale, 48px section rhythm, horizontal scroll behavior on narrow viewports) requires a human to open pack-docs.html and look at it — string/structural checks cannot confirm visual correctness."
  - id: D3
    description: "scripts/check-pack-format.tests.ps1 enforces schema<->docs field parity and fails when a schema field is renamed without updating the docs"
    requirement: "PKG-01"
    verification:
      - kind: unit
        ref: "pwsh -File scripts/check-pack-format.tests.ps1 (exit 0); fail-first proof: renaming meta.author to authorX in pack.schema.json, rerunning the script (exit 1, error names 'authorX'), reverting, rerunning again (exit 0) — see Deviations/Task Commits for the exact transcript"
        status: pass
    human_judgment: false

duration: ~20min
completed: 2026-08-10
status: complete
---

# Phase 3 Plan 01: SRD Pack Format Contract Summary

**Published `pack.schema.json` (JSON Schema draft 2020-12) and `pack-docs.html` as the authoritative, browser-openable contract for the BYOD pack format, with a PowerShell regression check keeping both in parity.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-08-10T23:24:27Z
- **Tasks:** 3
- **Files modified:** 3 (all new)

## Accomplishments
- `pack.schema.json` at the repo root: draft 2020-12, public `$id`, `meta`+`spells` required, `spells.minItems: 1`, `meta.license` requires `id`+`attribution`, `meta.source` pattern-locked, byte cap (10485760) and A-02 `id`-passthrough documented inline via `description` fields.
- `pack-docs.html`: standalone, no-build, bilingual (PT/EN) static page — manifest field table (11 rows), spell field table (19 rows), one-spell example that validates against the schema, CORS-host allowlist, limits/rejections list, and a link to `pack.schema.json`. Mirrors the app's saved theme (`spellbook-ui-prefs`) instead of carrying its own theme state. Zero hardcoded hex colors — all `var(--...)` custom properties.
- `scripts/check-pack-format.tests.ps1`: permanent regression check — every schema field must appear in the docs, table `<tr>` counts must match field-count+1-header in both directions, page must contain the CORS hosts/byte-cap/link/no-hex invariants, and the embedded example must parse and satisfy `meta.required`. Fail-first proven (see Deviations).

## Task Commits

Each task was committed atomically:

1. **Task 1: Publicar pack.schema.json na raiz do repositório** - `189814a` (feat)
2. **Task 2: Criar pack-docs.html — documentação do formato para autores** - `7a6a358` (feat)
3. **Task 3: Checagem de regressão da paridade schema ↔ docs** - `972dcf1` (test)

**Plan metadata:** commit pending (this SUMMARY.md + phase docs)

## Files Created/Modified
- `pack.schema.json` - JSON Schema draft 2020-12 contract for the pack format (meta + spells)
- `pack-docs.html` - Static author-facing documentation of the same format
- `scripts/check-pack-format.tests.ps1` - Regression check enforcing schema<->docs field parity

## Decisions Made
- Example pack in the docs uses an original placeholder spell instead of verbatim SRD/PHB text, since spell-source licensing is resolved in later plans (03-02/03-03) of this phase, not this one.
- `pack.schema.json.properties.id` documents its link to `plugin-store.jsx`'s `exportPack()` (Fase 2, A-02) directly in the schema description, so the schema is self-explanatory about a field the import path ignores.
- The regression check asserts row-count parity rather than per-row literal strings — smaller script, still catches added/removed/renamed fields in either file.

## Deviations from Plan

None - plan executed exactly as written. One planned verification step (Task 3's fail-first proof) was executed as specified:

**Fail-first proof transcript (Task 3 acceptance criteria):**
1. Renamed `pack.schema.json`'s `meta.properties.author` to `authorX`.
2. Ran `pwsh -File scripts/check-pack-format.tests.ps1` → exited 1 with `pack-docs.html is missing meta field: authorX`.
3. Reverted `authorX` back to `author`.
4. Ran the script again → exited 0, printed `Pack schema and author docs are in parity.`

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `pack.schema.json` and `pack-docs.html` are ready to be linked from the import UI built in 03-02 (`pack-import.jsx`, `pack-import-dialog.jsx`).
- The hand-written validator planned for 03-02/03-03 (D-13) must stay in sync with `pack.schema.json`'s field list — `scripts/check-pack-format.tests.ps1` only checks schema<->docs parity, not schema<->validator parity; a future plan should add an analogous check once the validator exists.
- No blockers. SRD source licensing/generation (D-05..D-07) is untouched by this plan and remains open for whichever plan in this phase covers `scripts/generate-srd-pack.mjs`.

---
*Phase: 03-srd-pack-import-pipeline*
*Completed: 2026-08-10*

## Self-Check: PASSED

- FOUND: pack.schema.json
- FOUND: pack-docs.html
- FOUND: scripts/check-pack-format.tests.ps1
- FOUND: .planning/phases/03-srd-pack-import-pipeline/03-01-SUMMARY.md
- FOUND commit: 189814a
- FOUND commit: 7a6a358
- FOUND commit: 972dcf1
