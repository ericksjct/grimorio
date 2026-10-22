---
phase: 03-srd-pack-import-pipeline
plan: 03
subsystem: pack-import
tags: [validation, security, prototype-pollution, byod, hand-written-validator]

requires:
  - phase: 03-srd-pack-import-pipeline
    provides: "pack.schema.json (03-01) — the published JSON Schema contract that pack-import.jsx's field tables must mirror"
  - phase: 02-plugin-storage-foundation
    provides: "plugin-store.jsx (putPack/listPacks) — the storage layer this plan's validator gates but does not call"
provides:
  - "pack-import.jsx (validation half) — parsePackText, validatePack, freeIdentifier, MAX_PACK_BYTES, PACK_ERROR_CODES, exposed on window.packImport"
  - "scripts/check-pack-validator.tests.ps1 — permanent regression check enforcing schema<->validator field parity and validate-before-write ordering"
affects: [03-05, 03-06]

tech-stack:
  added: []
  patterns:
    - "JSON.parse(text, reviver) as the prototype-pollution gate — reviver throws on __proto__/constructor/prototype before object construction completes, not a post-parse scan"
    - "Declarative field tables (META_FIELDS/LICENSE_FIELDS/SPELL_FIELDS) as the single source of truth for the hand-written validator, mirroring pack.schema.json instead of scattered if-checks"
    - "Fail-fast validation: first violation throws immediately with .code + field-path message, never accumulates a report"

key-files:
  created:
    - pack-import.jsx
    - scripts/check-pack-validator.tests.ps1
  modified: []

key-decisions:
  - "meta.license validated as a separate _checkObject call under path meta.license, while META_FIELDS still declares license as type:'object' so the top-level unknown-key scan on meta allows it — avoids a special-case branch in _checkObject itself"
  - "_checkField's 'object' type case only checks presence/shape (non-array object), never recurses — recursion into license fields is validatePack's explicit second call, keeping _checkObject a flat, single-level primitive"
  - "check-pack-validator.tests.ps1's validate-before-putPack ordering assertion is written to no-op until pluginStore.putPack literally appears in the file (03-05 adds it) — it activates as a permanent gate from that point forward rather than failing prematurely on this plan's validation-only file"

patterns-established:
  - "Two-way schema<->code parity check via regex-extracted key: 'literal' values compared against JSON-Schema-parsed property names, in both directions (missing field, extra field)"

requirements-completed: [PKG-04]

coverage:
  - id: D1
    description: "JSON with __proto__/constructor/prototype at any nesting level is rejected during JSON.parse itself, via reviver, before the object finishes constructing"
    requirement: "PKG-04"
    verification:
      - kind: unit
        ref: "node -e harness: parsePackText('{\"a\":{\"__proto__\":{\"x\":1}}}') throws with .code === 'blocked-key'"
        status: pass
    human_judgment: false
  - id: D2
    description: "A pack that does not match the schema is rejected whole, with the offending field path in the message; nothing is written and no field is auto-corrected"
    requirement: "PKG-04"
    verification:
      - kind: unit
        ref: "node -e harness: validatePack rejects meta.lang='fr', unknown meta key, empty spells, spells[3].level=12 — each with .code 'schema-invalid' and the exact field path in the message; JSON.stringify before/after validatePack is identical (no mutation)"
        status: pass
    human_judgment: false
  - id: D3
    description: "freeIdentifier resolves the documented suffix sequence and pluginStore.putPack is never called directly by this plan's file"
    requirement: "PKG-04"
    verification:
      - kind: unit
        ref: "node -e harness: freeIdentifier('meu-homebrew', []) -> 'meu-homebrew'; ['meu-homebrew'] -> 'meu-homebrew-2'; ['meu-homebrew','meu-homebrew-2'] -> 'meu-homebrew-3'; ['meu-homebrew','meu-homebrew-3'] -> 'meu-homebrew-2' (gap-fill)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Code and published schema list exactly the same fields, enforced by script in both directions"
    requirement: "PKG-04"
    verification:
      - kind: unit
        ref: "pwsh -File scripts/check-pack-validator.tests.ps1 (exit 0); fail-first proof in both directions — see Deviations"
        status: pass
    human_judgment: false

duration: ~35min
completed: 2026-08-10
status: complete
---

# Phase 3 Plan 03: Pack Validator (Schema Rejection + Prototype-Pollution Gate) Summary

**Hand-written schema validator in `pack-import.jsx` that rejects malformed JSON, prototype-pollution keys, and schema-invalid packs before any storage write — synced with `pack.schema.json` via a two-way parity script.**

## Performance

- **Duration:** ~35 min
- **Completed:** 2026-08-10T23:44:55Z
- **Tasks:** 3
- **Files modified:** 2 (both new)

## Accomplishments

- `pack-import.jsx` created at the repo root, `type="text/babel"`, no build step, no `import`/`export` — header comment declares scope (owns read/validate; explicitly does NOT open IndexedDB or normalize spells) and load-order placement (after `plugin-store.jsx`, after DOMPurify).
- `parsePackText(text)`: the file's single `JSON.parse` call, with a reviver that throws `.code === 'blocked-key'` the instant `__proto__`, `constructor`, or `prototype` appears as a key at any nesting depth — rejection happens during object construction, not a post-parse scan (D-13, mitigates T-03-08). Other parse failures become `.code === 'malformed-json'`; a non-object/array/primitive parse result becomes `.code === 'schema-invalid'`.
- Three declarative field tables — `META_FIELDS`, `LICENSE_FIELDS`, `SPELL_FIELDS` — mirror `pack.schema.json`'s `meta`, `meta.license`, and `spells[]` properties exactly (name, type, required, pattern/enum/min/max/minLength qualifiers).
- `validatePack(pack)`: `_checkObject`/`_checkField` generic engine walks the tables, rejecting the first violation with `packImport.validate: ` + exact field path (e.g. `spells[3].level`) and `.code === 'schema-invalid'`. Rejects unknown top-level keys (tolerating `id` per A-02), unknown keys within `meta`/`meta.license`/each spell (equivalent to the schema's `additionalProperties: false`), and enforces `spells.length >= 1`. Never mutates, coerces, or defaults — confirmed by `JSON.stringify` identity before/after.
- `freeIdentifier(base, existingIds)`: pure function resolving `D-09`'s duplicate-`source` suffix sequence (`base`, `base-2`, `base-3`, ...), gap-aware, case-sensitive, no I/O. Documented with a `ponytail:` comment tying it to `pluginStore.putPack()`'s upsert-without-dedup behavior.
- `window.packImport = { MAX_PACK_BYTES, PACK_ERROR_CODES, parsePackText, validatePack, freeIdentifier }` — the exact five-key interface contract for plan 03-05 to extend.
- `scripts/check-pack-validator.tests.ps1`: structural presence, single-parse-with-reviver assertion, a validate-before-`putPack` ordering gate (dormant until 03-05 adds `putPack`, then permanent), two-way field parity against `pack.schema.json` (missing field in either direction fails), byte-cap literal parity (`10 * 1024 * 1024` in code, `10485760` in schema), no-empty-catch, and `window.packImport` exposure check.

## Task Commits

Each task was committed atomically:

1. **Task 1: Criar pack-import.jsx com parse defensivo e as tabelas de campos** - `e389acc` (feat)
2. **Task 2: Implementar validatePack e freeIdentifier** - `068142e` (feat)
3. **Task 3: Checagem de regressão do validador e da paridade com o schema** - `e3645ca` (test)

**Plan metadata:** commit pending (this SUMMARY.md)

## Files Created/Modified

- `pack-import.jsx` - Validation layer: parsePackText, validatePack, freeIdentifier, field tables, error codes
- `scripts/check-pack-validator.tests.ps1` - Regression check enforcing schema<->validator field parity and structural invariants

## Decisions Made

- `meta.license` is declared in `META_FIELDS` as `type: 'object'` (shape-only check) so the top-level unknown-key scan on `meta` tolerates the `license` key, while its sub-fields are validated separately via a second `_checkObject('meta.license', LICENSE_FIELDS, ...)` call — keeps `_checkObject` a flat, non-recursive primitive with no special-casing.
- The ordering gate in the check script (`validatePack` before `pluginStore.putPack`) is written to no-op on this plan's file (which never calls `putPack`) and only activates once 03-05 introduces that call — it becomes a permanent regression gate from that point, per the plan's own instruction.

## Deviations from Plan

None - plan executed exactly as written.

**Fail-first proof transcript (Task 3 acceptance criteria, both directions):**
1. Added a temporary `testFieldXyz` property to `pack.schema.json`'s `meta` object. Ran `pwsh -File scripts/check-pack-validator.tests.ps1` → exited 1: `pack-import.jsx is missing schema meta field: testFieldXyz`. Reverted; reran → exited 0.
2. Added a temporary `{ key: 'testFieldXyz', ... }` entry to `pack-import.jsx`'s `META_FIELDS`. Ran the script → exited 1: `pack-import.jsx META_FIELDS has extra field not in pack.schema.json meta: testFieldXyz`. Reverted; reran → exited 0.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `window.packImport`'s five-key contract (`MAX_PACK_BYTES`, `PACK_ERROR_CODES`, `parsePackText`, `validatePack`, `freeIdentifier`) is ready for plan 03-05 to extend with `sanitizePack`, `installFromFile`, and `installFromUrl` on the same object — names are locked, do not rename.
- 03-05 is the plan that introduces `pluginStore.putPack()` calls; `scripts/check-pack-validator.tests.ps1`'s validate-before-write ordering assertion will activate automatically at that point (it currently no-ops because `putPack` doesn't appear in `pack-import.jsx` yet).
- No blockers.

---
*Phase: 03-srd-pack-import-pipeline*
*Completed: 2026-08-10*

## Self-Check: PASSED

- FOUND: pack-import.jsx
- FOUND: scripts/check-pack-validator.tests.ps1
- FOUND: .planning/phases/03-srd-pack-import-pipeline/03-03-SUMMARY.md
- FOUND commit: e389acc
- FOUND commit: 068142e
- FOUND commit: e3645ca
