---
phase: 03-srd-pack-import-pipeline
plan: 04
subsystem: legal-provenance
tags: [srd, cc-by, licensing, pack-generation, node, json-parsing]

requires:
  - phase: 03-srd-pack-import-pipeline
    provides: "03-SRD-SOURCE.md's approved D-06 route per edition (5.1: Tabyltop/CC-SRD text-dump parser; 5.2: dmcb structured gist, locally versioned) and pack.schema.json's published contract (03-01)"
provides:
  - "scripts/generate-srd-pack.mjs: one-shot Node ESM generator for both SRD packs, with a hand-rolled schema validator and no third-party dependencies"
  - "scripts/srd-sources/srd-5.2-spells.json: locally versioned copy of the dmcb CC-BY-4.0 gist (339 spells), committed per D-06's no-live-fetch requirement"
  - "srd-2014-en.json (319 spells) / srd-2024-en.json (339 spells): the two embedded SRD packs, installable through the same pipeline as any third-party pack"
  - "scripts/check-srd-packs.tests.ps1: permanent regression check, D-05 enforced via generator provenance"
  - "03-SRD-SOURCE.md: records the D-05 overlap evidence and the checkpoint ruling for future readers"
affects: [03-05, 03-06, 03-07, 03-08, 04-loader-integration]

tech-stack:
  added: []
  patterns:
    - "Hand-rolled recursive JSON-Schema-subset validator (object/array/string/integer/boolean, required, additionalProperties, pattern, minLength/minItems, enum, minimum/maximum) driven directly by pack.schema.json — no schema-validation dependency, matches D-13's 'no dependency, no runtime schema compile' convention already used for pack-import.jsx's validator"
    - "PDF-text-dump-to-structured-record parser: boundary detection via 'does the next paragraph match a known field-start pattern', not 'every heading is a new record' — needed because Tabyltop/CC-SRD's dump nests true sub-headings (spell sub-tables) inside a single h4/paragraph/table stream with no explicit nesting marker"
    - "Provenance-based licence-reuse check: verify a generator script never references a forbidden source file (literal string or glob), instead of diffing generated output against that source's content — a diff proxy false-positives on faithful independent transcriptions of the same public text and false-negatives on a cosmetically-reformatted copy"

key-files:
  created:
    - scripts/generate-srd-pack.mjs
    - scripts/srd-sources/srd-5.2-spells.json
    - srd-2014-en.json
    - srd-2024-en.json
    - scripts/check-srd-packs.tests.ps1
  modified:
    - .gitignore
    - .planning/phases/03-srd-pack-import-pipeline/03-SRD-SOURCE.md

key-decisions:
  - "SRD 5.1's approved 'route (b)' (03-SRD-SOURCE.md) is a parser over Tabyltop/CC-SRD's already-extracted CC-BY-4.0 text dump, NOT OCR of the official PDF - confirmed via prior_wave_context instruction to trust 03-SRD-SOURCE.md over the plan's literal escalation-gate wording ('(b) OCR do PDF oficial'), which described a different scenario than what was actually approved."
  - "SRD 5.2's dmcb gist copy is committed at scripts/srd-sources/srd-5.2-spells.json (not in the plan's files_modified list) because 03-SRD-SOURCE.md's approved route explicitly requires a locally versioned copy with no live fetch, ever - added per Rule 2."
  - "D-05 enforcement redefined at a blocking checkpoint: the plan's literal acceptance criterion (zero-byte-diff between generated descriptions and spells-5E-*.json) was replaced with a provenance check (generator never references spells-5E-*.json, by inspection) after the byte-diff proof found 123/658 genuine, licensed, independently-sourced overlaps. Both packs ship complete (319 + 339 spells) - no spell was dropped to force byte-inequality."
  - "toSpell()'s per-pack name uniqueness reuses the same freeIdentifier('-2', '-3', ...) suffix rule as pack-import.jsx's D-09 dedup, kept as a small shared helper rather than duplicating slug logic per edition."

patterns-established:
  - "Generation scripts that must stay in sync with pack.schema.json load the schema file directly at run time and validate against it programmatically, instead of hand-copying the field list into the generator - same anti-drift principle as scripts/check-pack-format.tests.ps1 (03-01), applied to code instead of docs."

requirements-completed: [SRD-01]

coverage:
  - id: D1
    description: "scripts/generate-srd-pack.mjs exists, passes node --check, EDITIONS carries two editions with distinct non-empty attribution strings, no third-party imports, only node: builtins"
    requirement: "SRD-01"
    verification:
      - kind: unit
        ref: "node --check scripts/generate-srd-pack.mjs (exit 0); node -e importing the module and inspecting EDITIONS (exit 0, attributions differ and are non-empty); grep confirms literal strings srd-2014-en/srd-2024-en/MODIFICATION_NOTE/pack.schema.json present and no non-node: import"
        status: pass
    human_judgment: false
  - id: D2
    description: "Both SRD packs generated (319 + 339 spells), validated against the hand-rolled pack.schema.json checker before being written, committed complete and unmodified, and satisfy every Task 2 schema-shape acceptance check"
    requirement: "SRD-01"
    verification:
      - kind: unit
        ref: "node scripts/generate-srd-pack.mjs (exit 0, wrote 319 + 339 spells); node -e per-file shape assertions from the plan's Task 2 acceptance criteria (meta.source/lang/license fields, spellCount===spells.length, distinct attributions) - all pass"
        status: pass
    human_judgment: false
  - id: D3
    description: "D-05 provenance proof: scripts/generate-srd-pack.mjs never references any of the four spells-5E-*.json files, and scripts/check-srd-packs.tests.ps1 enforces this permanently"
    requirement: "SRD-01"
    verification:
      - kind: unit
        ref: "pwsh -NoProfile -File scripts/check-srd-packs.tests.ps1 (exit 0, single success line); fail-first #1: injecting a readFile('spells-5E-2014-EN.json') call into the generator flips exit 0->1 citing the D-05 message, reverted, back to exit 0; fail-first #2: zeroing meta.license.modifications on a pack flips exit 0->1, reverted, back to exit 0"
        status: pass
    human_judgment: false
  - id: D4
    description: "scripts/check-srd-packs.tests.ps1 permanent regression check: schema shape, distinct attributions, per-spell required fields (name/school/description/level 0-9), name uniqueness within each pack, D-05 provenance"
    requirement: "SRD-01"
    verification:
      - kind: unit
        ref: "pwsh -NoProfile -File scripts/check-srd-packs.tests.ps1 (exit 0)"
        status: pass
    human_judgment: false

duration: ~3h45min (research-heavy: SRD 5.1's parser required reverse-engineering an undocumented PDF-extraction node stream with no field-level schema of its own; paused mid-plan for a checkpoint decision)
completed: 2026-08-10
status: complete
---

# Phase 3 Plan 04: SRD Pack Generation Summary

**Generated and shipped both embedded SRD packs (319 SRD 5.1 spells parsed from Tabyltop/CC-SRD's text dump, 339 SRD 5.2 spells mapped from dmcb's structured gist), with D-05 provenance enforced by verifying the generator never reads the app's current spell JSONs — not by a byte-level description diff, which a checkpoint decision found to be the wrong proxy.**

## Performance

- **Duration:** ~3h45min (includes a mid-plan checkpoint pause for a policy decision)
- **Completed:** 2026-08-11T00:15Z
- **Tasks:** 3/3 complete
- **Files modified:** 7 (5 created, 2 modified)

## Accomplishments

- `scripts/generate-srd-pack.mjs`: one-shot Node ESM generator, zero third-party dependencies, hand-rolled recursive validator that loads `pack.schema.json` directly and aborts before writing on any type/requiredness violation.
- SRD 5.1 parser reverse-engineers Tabyltop/CC-SRD's 13,353-node PDF-extraction stream: isolates the "Spell Descriptions" section, distinguishes true spell headings from in-spell sub-headings (e.g. "Control Weather"'s three sub-tables: Precipitation/Temperature/Wind; "Animate Objects"'s stat table), converts embedded tables to sanitizer-whitelisted `<table>` HTML, splits metadata lines (Casting Time/Range/Components/Duration) from body text even when the source glues them together with no separating whitespace, and merges two confirmed page-break label splits ("At" / "Higher Levels...", "Casting " / "Time:1 action").
- SRD 5.2 mapper converts dmcb's clean 339-spell structured gist directly: derives `castTime` from `actionType`/`castingTime`/`castingTrigger`, `components` from the `components` array + `material`, and `duration` by re-attaching the "Concentration, " prefix when `concentration: true` and the source string doesn't already carry it.
- `srd-2014-en.json` (319 spells) and `srd-2024-en.json` (339 spells) committed complete and unmodified — both pass schema validation and every shape/attribution check.
- `scripts/srd-sources/srd-5.2-spells.json`: the dmcb gist's raw content, committed verbatim as the locally versioned copy 03-SRD-SOURCE.md's approved route requires (no live fetch, ever, for this edition).
- `scripts/check-srd-packs.tests.ps1`: permanent regression check — schema shape, distinct attributions between editions, per-spell required fields, name uniqueness, and D-05 enforced via generator-provenance inspection. Fail-first proven twice.
- `03-SRD-SOURCE.md` updated with the full overlap evidence (counts, length skew, reproduction command) and the checkpoint ruling, so the finding is not re-investigated by a future reader.

## Task Commits

1. **Task 1: Ler a rota aprovada e escrever o script de geração** - `16231b1` (feat)
2. **Task 2: Gerar e commitar os dois pacotes SRD** - `5123b7c` (feat)
3. **Task 3: Checagem de regressão dos pacotes SRD** - `6496652` (test)

**Plan metadata:**
- `eee3e2a` (docs: checkpoint escalation, before resolution)
- `07b0248` (docs: record D-05 overlap evidence and provenance ruling in 03-SRD-SOURCE.md)
- this SUMMARY.md commit (docs)

## Files Created/Modified

- `scripts/generate-srd-pack.mjs` - SRD pack generator (both editions).
- `scripts/srd-sources/srd-5.2-spells.json` - Locally versioned copy of the dmcb gist (SRD 5.2 source).
- `srd-2014-en.json` - SRD 5.1 pack, 319 spells.
- `srd-2024-en.json` - SRD 5.2 pack, 339 spells.
- `scripts/check-srd-packs.tests.ps1` - Regression check for both packs.
- `.gitignore` - Added `.cache/` for the SRD 5.1 live-fetch cache (never committed).
- `.planning/phases/03-srd-pack-import-pipeline/03-SRD-SOURCE.md` - Added the D-05 overlap-evidence section and provenance ruling.

## Decisions Made

- Trusted `03-SRD-SOURCE.md`'s "Consequências para o plano 03-04" section over the plan's literal Task 1 escalation-gate text, per the explicit `prior_wave_context` instruction — the plan's gate describes stopping for OCR of the official PDF, but the actual approved SRD 5.1 route is a parser over an already-extracted, OCR-free text dump. Proceeded with writing a real parser instead of escalating.
- `scripts/srd-sources/srd-5.2-spells.json` added outside the plan's `files_modified` list (Rule 2) because the approved D-06 route for SRD 5.2 explicitly mandates a locally versioned copy with no live fetch at any time.
- Kept SRD 5.1's fetch live (with a gitignored `.cache/` fallback) rather than also vendoring a local copy, since 03-SRD-SOURCE.md's approved route only mandates a versioned local copy for 5.2, not 5.1.
- **D-05 enforcement redefined at a blocking checkpoint** (see Deviations below for the full finding and ruling).

## Deviations from Plan

### Auto-fixed Issues (Rule 1/2/3 — no permission needed)

**1. [Rule 1 - Bug] Merged two page-break-split metadata labels in the SRD 5.1 source stream**
- **Found during:** Task 1 — validated against the full 319-spell corpus before finalizing.
- **Issue:** Tabyltop/CC-SRD's PDF-extraction stream splits a label word across a page break in two places: `Counterspell`'s "At Higher Levels." paragraph is split into a standalone `"At "` paragraph followed by `"Higher Levels.When you cast..."`; `Reverse Gravity`'s "Casting Time:" line is split into `"Casting "` followed by `"Time:1 action"`. Left unhandled, `Counterspell`'s upgrade text would have been misclassified as body text and `Reverse Gravity` would have been missing `castTime` entirely.
- **Fix:** Added a `mergeDanglingLabels()` pre-pass that detects a lone paragraph whose entire trimmed text is one of the five known label words with nothing else, and merges it with the immediately following paragraph before classification runs.
- **Verification:** Re-ran the full 319-spell extraction after the fix — 0 missing `castTime`/`components`/`duration`/`range`/body content anywhere in the corpus.
- **Committed in:** `16231b1`.

**2. [Rule 1 - Bug] Made the "Components:" label regex accept the source's singular typo**
- **Found during:** Task 1, same validation pass.
- **Issue:** `Contagion`'s metadata line reads `"Component:V, S"` (singular — the source document's own typo). The original regex only matched plural `"Components:"`.
- **Fix:** Changed `COMPONENTS_RE` to `/^Components?\s*:\s*/i`.
- **Verification:** `Contagion.components === 'V, S'` after the fix.
- **Committed in:** `16231b1`.

**3. [Rule 2 - Missing critical functionality] Added `scripts/srd-sources/srd-5.2-spells.json`**
- See "Decisions Made" above — required by the approved D-06 route, not optional.
- **Committed in:** `16231b1`.

### Escalated and resolved (Rule 4 — human decision required, checkpoint returned and resolved)

**[Rule 4 - Architectural/policy] D-05's literal zero-intersection criterion is the wrong proxy for D-05's actual provenance rule**

- **Found during:** Task 2's mandatory non-reuse proof.
- **What was found:** Comparing the generated packs' 658 total descriptions against the four `spells-5E-*.json` files' 1,751 unique descriptions found **123 exact byte-for-byte matches** (46/319 in `srd-2014-en.json`, 77/339 in `srd-2024-en.json`) — see `03-SRD-SOURCE.md`'s "Achado do plano 03-04" section for the full number breakdown, the length-skew evidence (matched avg. 248 chars vs. non-matched avg. 850 chars), and the reproduction command.
- **Why escalated instead of auto-fixed:** `scripts/generate-srd-pack.mjs` never reads any `spells-5E-*.json` file (verifiable by inspection), so this wasn't a copy bug — but D-05 is recorded as a locked, copyright-risk-motivated policy in `03-CONTEXT.md`, and this executor does not have standing to unilaterally reinterpret a locked policy. Returned a `checkpoint:decision` (gate: blocking-human) with four options rather than deciding.
- **Resolution (user, at the checkpoint):** D-05 as written in `03-SRD-SOURCE.md` is a **provenance** rule ("os pacotes SRD nascem de uma fonte separada... nunca dos JSONs atuais do app"), and the plan's byte-diff was only ever a proxy for that rule — a proxy that false-positives on faithful independent transcriptions of the same official SRD text (this case) and would false-negative on a genuinely laundered file after any cosmetic reformat. Enforcement was redefined to key off **generator provenance** (verifiable by inspection, resistant to reformatting) instead of textual difference.
- **What changed as a result:**
  1. Both packs shipped **complete and unmodified** (319 + 339 spells) — no spell dropped to force byte-inequality, no cosmetic text alteration.
  2. `scripts/check-srd-packs.tests.ps1`'s D-05 block asserts `scripts/generate-srd-pack.mjs` never holds a string-literal reference to `spells-5E` and never uses `readdir`/`readdirSync`/`glob(` (which could indirectly resolve to those files) — instead of diffing description sets.
  3. `03-SRD-SOURCE.md` records the full evidence and ruling, with an explicit note that the 123 matches confirm ONLY that fraction of the current JSONs is plain SRD text — the remaining entries in those four files stay untrusted per D-05, unchanged.
- **Deviation from the plan's literal acceptance criteria:** the plan's Task 2 (`"Zero interseção exata é o critério"`) and Task 3 (`"para cada descrição de cada pacote SRD, throw no primeiro acerto exato"`) both specify a textual zero-intersection check as the literal implementation of D-05. That literal check was replaced by the checkpoint decision above with a provenance check that serves the same underlying rule without the false-positive/false-negative failure modes of a byte diff. This is the one place this plan's shipped behavior differs from its literal written acceptance criteria, and it happened via an explicit user decision at a blocking checkpoint, not a unilateral executor choice.

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 missing-critical-functionality) + 1 escalated-and-resolved (architectural/policy, user decision).
**Impact on plan:** Auto-fixes were necessary for parser correctness against real source data. The escalated item changed how D-05 is enforced (provenance instead of byte-diff) but did not change what ships — both packs are complete, unmodified, and licensed exactly as investigated in 03-02.

## Known Stubs

None — no UI/rendering stubs; this plan produces backend data files, a generation script, and a regression check only.

## Threat Flags

None beyond what `03-04-PLAN.md`'s own `<threat_model>` already anticipated. T-03-14 ("reuso acidental de texto de proveniência incerta") materialized as a real finding during Task 2's proof; its resolution (provenance-based enforcement, recorded above and in `03-SRD-SOURCE.md`) is the mitigation now in force, replacing the plan's originally-specified byte-diff mitigation.

## Issues Encountered

- Tabyltop/CC-SRD's text-dump JSON has no field-level schema of its own (a flat PDF-extraction node stream: `h1`/`h2`/`h3`/`h4`/`paragraph`/`table` nodes with `subelements` carrying raw text runs). Reverse-engineering the spell-boundary rule and the metadata/body split required direct inspection of the 13,353-node array rather than relying on documented structure — matches the risk flagged in `03-02-SUMMARY.md`'s "Next Phase Readiness" note.
- `Counterspell`'s `castTime` field is genuinely truncated in the Tabyltop source itself (missing the real spell's trailing clause "that is harmful to you or that targets you"). Source-fidelity gap, not a parser bug; per D-05's spirit, fabricating the missing words was not attempted — left as extracted verbatim from the licensed source.
- `Fireball`'s body text is split into two `<p>` tags mid-sentence due to a page break in the source stream. Content is complete and correct, just an extra paragraph boundary — cosmetic, not data loss. Not fixed; consistent with the plan's own `<flagged_assumptions>` note about acceptable extraction-fidelity gaps.
- Cross-validation against `pack-import.jsx`'s `validatePack()` (mentioned in Task 2's `<read_first>`) was not possible: `pack-import.jsx` is produced by plan 03-03, a sibling wave-2 plan not merged into this worktree. The hand-rolled schema validator embedded in `scripts/generate-srd-pack.mjs` (loading `pack.schema.json` directly) covers the same contract this plan is responsible for; `pack-import.jsx`'s validator should be re-run against both packs once 03-03 merges, as a cheap confirmation, not a blocker.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Both SRD packs exist as real, installable files at the repo root, in the same format and pipeline as any third-party pack — SRD-01 / ROADMAP criterion 6 is met.
- `scripts/generate-srd-pack.mjs` is ready to be re-run if the SRD text is ever updated (WotC errata) or a source URL moves.
- Recommend re-validating both packs against `pack-import.jsx`'s `validatePack()` once 03-03 merges (see Issues Encountered) — expected to pass without changes, since both packs already satisfy the same schema this plan's own validator enforces.
- Pre-installing these packs at boot and adding them to `sw.js`'s `PRECACHE` is explicitly out of scope here (SRD-03, Phase 4) — not started, not needed for this plan's completion.

---
*Phase: 03-srd-pack-import-pipeline*
*Completed: 2026-08-10*

## Self-Check: PASSED

- FOUND: scripts/generate-srd-pack.mjs
- FOUND: scripts/srd-sources/srd-5.2-spells.json
- FOUND: srd-2014-en.json
- FOUND: srd-2024-en.json
- FOUND: scripts/check-srd-packs.tests.ps1
- FOUND: .planning/phases/03-srd-pack-import-pipeline/03-04-SUMMARY.md
- FOUND commit: 16231b1
- FOUND commit: 5123b7c
- FOUND commit: 6496652
- FOUND commit: eee3e2a
- FOUND commit: 07b0248
