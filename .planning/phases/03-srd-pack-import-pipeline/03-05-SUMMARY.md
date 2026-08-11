---
phase: 03-srd-pack-import-pipeline
plan: 05
subsystem: infra
tags: [dompurify, indexeddb, fetch-streams, byod-import]

# Dependency graph
requires:
  - phase: 03-srd-pack-import-pipeline (plan 03)
    provides: parsePackText, validatePack, freeIdentifier, PACK_ERROR_CODES, MAX_PACK_BYTES on window.packImport
provides:
  - "_readFileText/_fetchText: local File and URL reads capped at 10485760 bytes, remote read aborts mid-stream via reader.cancel() instead of buffering"
  - "sanitizePack: DOMPurify whitelist sanitization of spell HTML fields and meta/license text labels, fails closed when window.DOMPurify is absent"
  - "_install/installFromFile/installFromUrl: single funnel — parse, validate, sanitize, resolve free identifier, write once via pluginStore.putPack"
  - "scripts/check-pack-import.tests.ps1: permanent regression gate on funnel order, single-write, no-CORS-proxy, fail-closed sanitization"
affects: [03-06-pack-import-dialog, 03-07-dompurify-csp-wiring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Read-then-cap-then-sanitize-then-write funnel, enforced by IndexOf ordering assertions in a .tests.ps1 (same convention as check-pack-validator.tests.ps1)"
    - "Fail-closed sanitization: presence check of the sanitizer dependency happens before any use of it"

key-files:
  created:
    - scripts/check-pack-import.tests.ps1
  modified:
    - pack-import.jsx

key-decisions:
  - "Scoped the single-write regression check to `pluginStore.putPack(` rather than the plan's literal `putPack(` — a pre-existing ponytail comment on freeIdentifier already contained the bare token in prose, which produced a false-positive double-count unrelated to actual call sites."
  - "Reworded that same comment (pluginStore.putPack() -> pluginStore.putPack faz um store.put) to remove the call-shaped substring entirely once the check was scoped to the real call pattern, so the false positive cannot resurface if the check is ever loosened."

patterns-established:
  - "Deep clone before sanitize: structuredClone with a private recursive fallback, deliberately avoiding a second JSON.parse in a file whose only-one-parse invariant is enforced by check-pack-import.tests.ps1 and check-pack-validator.tests.ps1."

requirements-completed: [PKG-02, PKG-03, PKG-04, PKG-05]

coverage:
  - id: D1
    description: "Local file read and URL fetch both enforce the 10485760-byte cap (File.size, Content-Length, and incremental byte count), aborting mid-read via reader.cancel() instead of buffering the full response"
    requirement: "PKG-02"
    verification:
      - kind: unit
        ref: "node -e harness: fake Content-Length=20000000 -> _fetchText rejects too-large with zero getReader calls"
        status: pass
      - kind: unit
        ref: "node -e harness: fake body chunks summing >10485760 bytes without Content-Length -> _fetchText rejects too-large after reader.cancel()"
        status: pass
      - kind: unit
        ref: "node -e harness: fake File{size:20000000} -> _readFileText rejects too-large without calling .text()"
        status: pass
    human_judgment: false
  - id: D2
    description: "A URL fetch that fails (CORS block, DNS, offline, or non-ok status) rejects uniformly with .code === 'fetch-failed', with the original browser message preserved and no third-party proxy/CORS-bypass endpoint anywhere in the module"
    requirement: "PKG-03"
    verification:
      - kind: unit
        ref: "node -e harness: fake fetch throws TypeError('Failed to fetch') -> _fetchText rejects fetch-failed, message includes 'Failed to fetch'"
        status: pass
      - kind: other
        ref: "scripts/check-pack-import.tests.ps1 — no literal https?:// URL anywhere in pack-import.jsx"
        status: pass
    human_judgment: false
  - id: D3
    description: "Install funnel writes exactly once, only after parse -> validate -> sanitize -> free-identifier resolution, in that order; a duplicate meta.source installs under a suffixed identifier without touching the existing pack, and the identifier returns to the caller"
    requirement: "PKG-04"
    verification:
      - kind: unit
        ref: "node -e harness: fake DOMPurify/pluginStore, listPacks -> [{source:'meu-homebrew'}] — _install returns identifier 'meu-homebrew-2', record.id and record.meta.source both 'meu-homebrew-2', putPack called exactly once, never with 'meu-homebrew'"
        status: pass
      - kind: other
        ref: "scripts/check-pack-import.tests.ps1 — IndexOf ordering parsePackText < validatePack < sanitizePack < freeIdentifier < putPack inside _install; exactly one pluginStore.putPack( call site"
        status: pass
    human_judgment: false
  - id: D4
    description: "sanitizePack fails closed with nothing written when window.DOMPurify is absent; when present, it strips disallowed tags/attributes (onclick, <script>) from spell HTML fields and text-only meta/license fields, leaves the input object untouched, and returns changedFields counting every altered field"
    requirement: "PKG-05"
    verification:
      - kind: unit
        ref: "node -e harness: window.DOMPurify undefined -> sanitizePack throws, pluginStore.putPack never called (0 calls)"
        status: pass
      - kind: unit
        ref: "node -e harness: description '<p onclick=\"x()\">a</p><script>y()</script>' -> sanitized to '<p>a</p>', changedFields === 1, input object unchanged (JSON.stringify before/after equal)"
        status: pass
      - kind: unit
        ref: "node -e harness: meta.name with markup -> sanitized meta.name contains no tags"
        status: pass
      - kind: other
        ref: "scripts/check-pack-import.tests.ps1 — window.DOMPurify absence check (IndexOf '!window.DOMPurify') precedes the first DOMPurify.sanitize call"
        status: pass
    human_judgment: false

duration: 45min
completed: 2026-08-11
status: complete
---

# Phase 03 Plan 05: Pack Import — Read, Cap, Sanitize, Install Funnel Summary

**Single install funnel in `pack-import.jsx` (file/URL read with the 10 MB cap, DOMPurify whitelist sanitization, single `pluginStore.putPack` write with D-09 suffix resolution) plus a permanent order-enforcing regression check.**

## Performance

- **Duration:** ~45 min
- **Completed:** 2026-08-11
- **Tasks:** 3
- **Files modified:** 2 (`pack-import.jsx`, `scripts/check-pack-import.tests.ps1` new)

## Accomplishments
- `_readFileText`/`_fetchText` cap both the local-file and URL-fetch paths at 10485760 bytes; the remote path checks `Content-Length` before touching the body and, independently, aborts an in-flight stream read via `reader.cancel()` the moment accumulated bytes exceed the cap — never buffering the full response first (except the documented old-browser fallback without stream support).
- `sanitizePack` fails closed when `window.DOMPurify` is missing (throws before any write), otherwise deep-clones the pack (via `structuredClone`, no second `JSON.parse`), runs an explicit 17-tag whitelist over the three HTML spell fields and a tags-empty whitelist over the meta/license text labels, and returns `changedFields` so callers can surface how much content was altered.
- `_install` is the single funnel: `parsePackText` → `validatePack` → `sanitizePack` → `freeIdentifier` (against `pluginStore.listPacks()`) → one `pluginStore.putPack` call. A duplicate `meta.source` installs under a suffixed id (`meu-homebrew` → `meu-homebrew-2`) without ever touching the existing record, and any `id` present in the imported file is discarded in favor of the recalculated identifier.
- `installFromFile`/`installFromUrl` wire the read layer into the funnel; both reject with an `Error` whose `.code` is one of `PACK_ERROR_CODES`.
- `scripts/check-pack-import.tests.ps1` is a permanent regression gate: funnel order by `IndexOf`, exactly one real write call site, no literal absolute URL anywhere in the module (no CORS-bypass proxy), fail-closed sanitizer check preceding any `DOMPurify.sanitize` call, `MAX_PACK_BYTES` cited ≥3×, no empty catch block, full 8-member exposure block, exactly one `JSON.parse(` call preserved.

## Task Commits

Each task was committed atomically:

1. **Task 1: Leitura de arquivo e busca por URL, com o teto de 10 MB** - `f12af29` (feat)
2. **Task 2: Sanitização com DOMPurify e a orquestração de instalação** - `ad1afb5` (feat)
3. **Task 3: Checagem de regressão do funil de import** - `706425d` (test)

## Files Created/Modified
- `pack-import.jsx` - Added `_readFileText`, `_fetchText`, `ALLOWED_TAGS`, `sanitizePack`, `_install`, `installFromFile`, `installFromUrl`; extended `window.packImport` from 5 to 8 exposed members.
- `scripts/check-pack-import.tests.ps1` - New regression check for the import funnel (structural presence, order, single-write, no-CORS-proxy, fail-closed sanitization, byte-cap citation count, exposure-block completeness, single-parse invariant).

## Decisions Made
- Scoped the "single write" regression assertion to the literal call pattern `pluginStore.putPack(` rather than the plan-specified bare `putPack(`, because a pre-existing `ponytail:` comment on `freeIdentifier` (written in plan 03-03) already contains the substring `pluginStore.putPack()` in prose, which produced a false-positive count of 2. Rewording that comment (`pluginStore.putPack() é store.put` → `pluginStore.putPack faz um store.put`) further removes the call-shaped substring so the check stays robust even if scoped back to a broader pattern later.
- Kept `_readFileText`/`_fetchText` as `async function` (not plain functions that throw synchronously) so that the size-cap rejection surfaces as a promise rejection at every call site, matching the "rejeita" wording throughout the plan's acceptance criteria and the harness expectations.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed false-positive double-count in the single-write regression check**
- **Found during:** Task 3 (writing `scripts/check-pack-import.tests.ps1`)
- **Issue:** The plan's spec ("conte as ocorrências de `putPack(`... throw se for diferente de 1") counts the bare token `putPack(`, but `pack-import.jsx` already carries a `ponytail:` comment from plan 03-03 (`// ponytail: pluginStore.putPack() é store.put...`) that contains that exact substring in prose, not code. Running the check as specified reported 2 occurrences and failed even with a correct single-write implementation.
- **Fix:** Scoped the regex to `pluginStore\.putPack\(` (the actual call pattern) and reworded the pre-existing comment to `pluginStore.putPack faz um store.put` to eliminate the call-shaped substring from prose entirely, so the check is robust to either scoping choice.
- **Files modified:** `pack-import.jsx` (comment wording only, no behavior change), `scripts/check-pack-import.tests.ps1`
- **Verification:** `pwsh -File scripts/check-pack-import.tests.ps1` exits 0; fail-first proof (swapping `sanitizePack`/`putPack` order) still trips the *order* assertion correctly.
- **Committed in:** `706425d` (Task 3 commit) / comment wording change bundled into Task 2's commit `ad1afb5` since it lives in code introduced/touched by that task's file state at commit time.

---

**Total deviations:** 1 auto-fixed (1 bug fix in test-script scoping, no product-code behavior change).
**Impact on plan:** No scope creep — the fix only tightens a regression check to match its stated intent (catch real double-writes, not prose mentions).

## Issues Encountered
- File uses CRLF line endings; the `_install` function-block extraction regex in `scripts/check-pack-import.tests.ps1` needed `\r?\n` instead of a bare `\n` to match the closing brace boundary. Fixed before first run — not counted as a deviation since it never shipped in a broken state to a commit.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `pack-import.jsx` now fully implements the read → validate → sanitize → write funnel end to end; plan 03-06 (import dialog) can call `installFromFile`/`installFromUrl` directly and map `.code` to bilingual copy.
- `window.DOMPurify` is still not loaded anywhere in `index.html` (that is plan 03-07's job) — `sanitizePack` is written to fail loudly and closed in that gap, and no test in this plan depends on the real DOMPurify library being present.
- No blockers for 03-06 or 03-07.

---
*Phase: 03-srd-pack-import-pipeline*
*Completed: 2026-08-11*

## Self-Check: PASSED

- FOUND: pack-import.jsx
- FOUND: scripts/check-pack-import.tests.ps1
- FOUND: .planning/phases/03-srd-pack-import-pipeline/03-05-SUMMARY.md
- FOUND: f12af29 (Task 1 commit)
- FOUND: ad1afb5 (Task 2 commit)
- FOUND: 706425d (Task 3 commit)
