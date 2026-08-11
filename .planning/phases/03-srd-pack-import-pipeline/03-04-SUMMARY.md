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
  - "srd-2014-en.json / srd-2024-en.json generated on disk but NOT committed — blocked pending a D-05 policy decision, see Deviations"
affects: [03-05, 03-06, 03-07, 03-08, 04-loader-integration]

tech-stack:
  added: []
  patterns:
    - "Hand-rolled recursive JSON-Schema-subset validator (object/array/string/integer/boolean, required, additionalProperties, pattern, minLength/minItems, enum, minimum/maximum) driven directly by pack.schema.json — no schema-validation dependency, matches D-13's 'no dependency, no runtime schema compile' convention already used for pack-import.jsx's validator"
    - "PDF-text-dump-to-structured-record parser: boundary detection via 'does the next paragraph match a known field-start pattern', not 'every heading is a new record' — needed because Tabyltop/CC-SRD's dump nests true sub-headings (spell sub-tables) inside a single h4/paragraph/table stream with no explicit nesting marker"

key-files:
  created:
    - scripts/generate-srd-pack.mjs
    - scripts/srd-sources/srd-5.2-spells.json
  modified:
    - .gitignore

key-decisions:
  - "SRD 5.1's approved 'route (b)' (03-SRD-SOURCE.md) is a parser over Tabyltop/CC-SRD's already-extracted CC-BY-4.0 text dump, NOT OCR of the official PDF - confirmed via prior_wave_context instruction to trust 03-SRD-SOURCE.md over the plan's literal escalation-gate wording ('(b) OCR do PDF oficial'), which described a different scenario than what was actually approved. Documented as a deviation below."
  - "SRD 5.2's dmcb gist copy is committed at scripts/srd-sources/srd-5.2-spells.json (not in the plan's files_modified list) because 03-SRD-SOURCE.md's approved route explicitly requires a locally versioned copy with no live fetch, ever - added per Rule 2 (missing critical functionality the approved route itself mandates)."
  - "toSpell()'s per-pack name uniqueness reuses the same freeIdentifier('-2', '-3', ...) suffix rule as pack-import.jsx's D-09 dedup, kept as a small shared helper rather than duplicating slug logic per edition."

patterns-established:
  - "Generation scripts that must stay in sync with pack.schema.json load the schema file directly at run time and validate against it programmatically, instead of hand-copying the field list into the generator - same anti-drift principle as scripts/check-pack-format.tests.ps1 (03-01), applied to code instead of docs."

requirements-completed: []

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
    description: "Both SRD packs generate successfully (319 + 339 spells), validate against the hand-rolled pack.schema.json checker before being written, and satisfy every schema-shape acceptance check from Task 2 (meta.source, meta.lang, license.attribution/modifications present, spellCount matches spells.length, attributions differ between editions)"
    requirement: "SRD-01"
    verification:
      - kind: unit
        ref: "node scripts/generate-srd-pack.mjs (exit 0, wrote 319 + 339 spells); node -e per-file shape assertions from the plan's Task 2 acceptance criteria (all pass, see Task Commits section)"
        status: pass
    human_judgment: false
  - id: D3
    description: "D-05 non-reuse proof: zero-intersection between generated SRD pack descriptions and the four spells-5E-*.json files' descriptions"
    requirement: "SRD-01"
    verification:
      - kind: other
        ref: "node -e set-intersection check (see Deviations) - result: 123 of 658 generated descriptions are byte-identical to an existing spells-5E-*.json description"
        status: fail
    human_judgment: true
    rationale: "The plan requires zero exact-text intersection with the current spells-5E-*.json files (D-05) and explicitly forbids committing the packs if this check fails. The intersection found here is non-zero and is a genuine, reproducible finding, not a parser bug (see Deviations for the full analysis and evidence that this is a real properties of the licensed source, not accidental reuse). Resolving whether D-05's zero-tolerance criterion should apply as literally written, given this evidence, is a locked-policy question the plan's own author flagged as needing a human decision, not something this executor can unilaterally decide."
  - id: D4
    description: "scripts/check-srd-packs.tests.ps1 permanent regression check"
    requirement: "SRD-01"
    verification: []
    human_judgment: true
    rationale: "Not started - Task 3 depends on Task 2's packs being finalized (its D-05 block would immediately fail against the same finding as D3, since it enforces the identical zero-intersection rule). Blocked on the same decision as D3."

duration: ~3h10min (research-heavy: SRD 5.1's parser required reverse-engineering an undocumented PDF-extraction node stream with no field-level schema of its own)
completed: 2026-08-10
status: blocked
---

# Phase 3 Plan 04: SRD Pack Generation Summary

**Built and validated a working two-edition SRD pack generator (319 SRD 5.1 spells parsed from Tabyltop/CC-SRD's text dump, 339 SRD 5.2 spells mapped from dmcb's structured gist) — both packs pass schema validation, but neither is committed: the D-05 non-reuse proof found genuine byte-identical overlap with the current spells-5E-*.json files for the subset of spells that are pure, un-modified SRD content, and a locked-policy decision is needed before shipping.**

## Performance

- **Duration:** ~3h10min
- **Completed:** 2026-08-10T23:58Z (paused at checkpoint, Task 2/3 blocked)
- **Tasks:** 1 of 3 completed and committed; Task 2 executed but blocked at its own verification gate; Task 3 not started
- **Files modified:** 3 committed (scripts/generate-srd-pack.mjs, scripts/srd-sources/srd-5.2-spells.json, .gitignore) + 2 generated-but-uncommitted (srd-2014-en.json, srd-2024-en.json)

## Accomplishments

- `scripts/generate-srd-pack.mjs`: one-shot Node ESM generator, zero third-party dependencies, hand-rolled recursive validator that loads `pack.schema.json` directly and aborts before writing on any type/requiredness violation.
- SRD 5.1 parser reverse-engineers Tabyltop/CC-SRD's 13,353-node PDF-extraction stream: correctly isolates the "Spell Descriptions" section, distinguishes true spell headings from in-spell sub-headings (e.g. "Control Weather"'s three sub-tables: Precipitation/Temperature/Wind; "Animate Objects"'s stat table), converts embedded tables to sanitizer-whitelisted `<table>` HTML, splits metadata lines (Casting Time/Range/Components/Duration) from body text even when the source glues them together with no separating whitespace, and merges two confirmed page-break label splits ("At" / "Higher Levels...", "Casting " / "Time:1 action") that would otherwise have silently corrupted those two spells' fields.
- SRD 5.2 mapper converts dmcb's clean 339-spell structured gist directly: derives `castTime` from `actionType`/`castingTime`/`castingTrigger`, `components` from the `components` array + `material`, and `duration` by re-attaching the "Concentration, " prefix when `concentration: true` and the source string doesn't already carry it.
- Both packs generated successfully (319 + 339 spells) and pass every Task 2 schema-shape acceptance check (`meta.source`, `meta.lang`, `license.attribution`/`modifications` present and non-empty, `meta.spellCount === spells.length`, attributions differ between editions).
- `scripts/srd-sources/srd-5.2-spells.json`: the dmcb gist's raw content, committed verbatim as the locally versioned copy 03-SRD-SOURCE.md's approved route requires (no live fetch, ever, for this edition).

## Task Commits

1. **Task 1: Ler a rota aprovada e escrever o script de geração** - `16231b1` (feat)
2. **Task 2: Gerar e commitar os dois pacotes SRD** - NOT COMMITTED. Packs were generated on disk and pass schema validation, but the D-05 non-reuse proof (required by this task's own acceptance criteria) found non-zero intersection — see Deviations. Per the plan's explicit instruction ("Se qualquer uma das três falhar, NÃO commite os pacotes"), `srd-2014-en.json` and `srd-2024-en.json` remain untracked/uncommitted pending a decision.
3. **Task 3: Checagem de regressão dos pacotes SRD** - NOT STARTED. Blocked on Task 2 (the check would encode and immediately fail on the same D-05 finding).

**Plan metadata:** this SUMMARY.md commit (docs)

## Files Created/Modified

- `scripts/generate-srd-pack.mjs` - SRD pack generator (both editions), committed.
- `scripts/srd-sources/srd-5.2-spells.json` - Locally versioned copy of the dmcb gist (SRD 5.2 source), committed.
- `.gitignore` - Added `.cache/` for the SRD 5.1 live-fetch cache (never committed).
- `srd-2014-en.json`, `srd-2024-en.json` - Generated on disk, present in the worktree, **NOT committed** (untracked). Left in place for inspection; the orchestrator/user can regenerate them any time via `node scripts/generate-srd-pack.mjs`.

## Decisions Made

- Trusted `03-SRD-SOURCE.md`'s "Consequências para o plano 03-04" section over the plan's literal Task 1 escalation-gate text, per the explicit `prior_wave_context` instruction. The plan's gate says to stop if any edition's approved route is "(b) OCR do PDF oficial" — but the actual approved SRD 5.1 route is a parser over Tabyltop/CC-SRD's already-extracted, OCR-free CC-BY-4.0 text dump; 03-SRD-SOURCE.md explicitly says the official PDF is a cross-check reference only, not the primary source. Proceeded with writing a real parser instead of escalating, as directed.
- `scripts/srd-sources/srd-5.2-spells.json` added outside the plan's `files_modified` list (Rule 2) because the approved D-06 route for SRD 5.2 explicitly mandates a locally versioned copy with no live fetch at any time — the generator cannot honor that route without this file existing.
- Kept SRD 5.1's fetch live (with a gitignored `.cache/` fallback) rather than also vendoring a local copy, since 03-SRD-SOURCE.md's approved route only mandates a versioned local copy for 5.2, not 5.1.

## Deviations from Plan

### Auto-fixed Issues (Rule 1/2/3 — no permission needed, documented per protocol)

**1. [Rule 1 - Bug] Merged two page-break-split metadata labels in the SRD 5.1 source stream**
- **Found during:** Task 1 (writing the SRD 5.1 parser) — validated against the full 319-spell corpus before finalizing.
- **Issue:** Tabyltop/CC-SRD's PDF-extraction stream splits a label word across a page break in two places across the entire "Spell Descriptions" section: `Counterspell`'s "At Higher Levels." paragraph is split into a standalone `"At "` paragraph followed by `"Higher Levels.When you cast..."`; `Reverse Gravity`'s "Casting Time:" line is split into `"Casting "` followed by `"Time:1 action"`. Left unhandled, `Counterspell`'s upgrade text would have been misclassified as body text (breaking the At-Higher-Levels/body split) and `Reverse Gravity` would have been missing `castTime` entirely.
- **Fix:** Added a `mergeDanglingLabels()` pre-pass that detects a lone paragraph whose entire trimmed text is one of the five known label words (`At`, `Casting`, `Range`, `Components`/`Component`, `Duration`) with nothing else, and merges it with the immediately following paragraph before classification runs.
- **Files modified:** `scripts/generate-srd-pack.mjs` (part of Task 1's single file).
- **Verification:** Re-ran the full 319-spell extraction after the fix — 0 missing `castTime`, 0 missing `components`, 0 missing `duration`, 0 missing `range`, 0 missing body content (all were previously non-zero for the two affected spells before this fix); manually confirmed `Counterspell.upgradeDescription` now contains the full "At Higher Levels." text and `Reverse Gravity.castTime === '1 action'`.
- **Committed in:** `16231b1` (Task 1 commit — found and fixed during that task's own verification loop, before the file was finalized).

**2. [Rule 1 - Bug] Made the "Components:" label regex accept the source's singular typo**
- **Found during:** Task 1, same validation pass.
- **Issue:** `Contagion`'s metadata line reads `"Component:V, S"` (singular, no "s") — the source document's own typo, not an extraction artifact. The original regex only matched the plural `"Components:"` and would have left `Contagion.components` empty.
- **Fix:** Changed `COMPONENTS_RE` from `/^Components\s*:\s*/i` to `/^Components?\s*:\s*/i`.
- **Files modified:** `scripts/generate-srd-pack.mjs`.
- **Verification:** Re-ran extraction — `Contagion.components === 'V, S'`.
- **Committed in:** `16231b1`.

**3. [Rule 2 - Missing critical functionality] Added `scripts/srd-sources/srd-5.2-spells.json`**
- See "Decisions Made" above — required by the approved D-06 route, not optional.
- **Committed in:** `16231b1`.

### Escalated Issue (Rule 4 — blocking this plan's completion, human decision required)

**[Rule 4 - Architectural/policy] D-05's zero-intersection criterion fails against genuine, licensed, independently-sourced SRD text overlap**

- **Found during:** Task 2's mandatory non-reuse proof.
- **What was found:** Comparing the generated packs' 658 total spell descriptions (319 + 339) against the union of all descriptions in the four `spells-5E-*.json` files (1,751 unique descriptions) found **123 exact byte-for-byte matches** (46 of 319 in `srd-2014-en.json`, 77 of 339 in `srd-2024-en.json`).
- **Why this is very unlikely to be accidental reuse:** The generator (`scripts/generate-srd-pack.mjs`) never reads any `spells-5E-*.json` file — verified by inspection (no reference to that filename pattern anywhere in the script) and by construction (SRD 5.1 comes from the Tabyltop text-dump parser, SRD 5.2 from the dmcb gist mapper; neither pipeline touches the old JSONs at any step). The matched descriptions skew heavily toward short, simple, canonical spells (average matched length 248 characters vs. 850 for non-matched descriptions in the same packs); spot-checking the single longest match (`programmed-illusion`, 1,454 characters, 4 paragraphs) shows ordinary, unremarkable SRD rules text with nothing suggesting tampering or copy-paste. The most plausible explanation: for spells that are pure, unmodified SRD content, there is exactly one official wording, so any two independently-sourced, faithful transcriptions of that spell will match byte-for-byte — this is what "correctly reproducing the licensed text" looks like, not what "laundering uncertain-provenance text" looks like.
- **Why this executor did not decide unilaterally:** D-05 is recorded in `03-CONTEXT.md` as a "Regra travada" (locked rule), and its explicit purpose is copyright-risk mitigation for the whole `PROJECT.md` v2.0 milestone ("a plataforma não distribui conteúdo protegido"). Relaxing or reinterpreting a locked, copyright-relevant policy decision is exactly the class of change Rule 4 reserves for a human call, not an auto-fix. Fabricating cosmetic differences in the licensed text to force a zero-byte-diff result was considered and rejected as a false fix — it would misrepresent CC-BY-licensed content for no licensing benefit and wouldn't actually address whatever concern motivated the zero-tolerance rule.
- **Options for the decision:**
  1. **Accept the overlap as expected/correct for provably-independent, licensed sources**, and redefine D-05's check to key off traceable provenance (does the generator ever read the old JSONs — verifiable by code inspection, already true today) rather than textual difference. Ship both packs as generated; Task 3's regression script would assert the generator's source-independence instead of (or in addition to) a description diff.
  2. **Keep the zero-tolerance textual check exactly as specified**, and drop the 123 overlapping spells from the generated packs (SRD 5.1 would ship 273 of 319 spells; SRD 5.2 would ship 262 of 339) to preserve a literal zero-intersection guarantee at the cost of completeness.
  3. **Audit the four `spells-5E-*.json` files spell-by-spell** to determine which entries are confirmed non-SRD (Tasha's/Xanathar's/other sourcebooks) vs. confirmed-SRD, and only compare against the confirmed-non-SRD subset — likely a separate plan given the ~500-spell-per-file scope, not something to absorb into this plan.
  4. **(Not recommended)** Introduce a cosmetic/structural difference in the generated HTML for matching descriptions purely to break byte-identity. Rejected above as dishonest engineering that doesn't serve D-05's actual purpose.
- **Impact if left unresolved:** `srd-2014-en.json` and `srd-2024-en.json` cannot be committed, Task 3's `scripts/check-srd-packs.tests.ps1` cannot be written in a way that passes (its own D-05 block, as specified, would immediately fail), and this phase's "critério 6 do ROADMAP" (SRD content existing as a real, installable pack) remains unmet.
- **Not fixed. Awaiting decision** — see full evidence and reproduction command below.

**Reproduction (from repo root, after `node scripts/generate-srd-pack.mjs`):**
```js
node -e "
const fs=require('fs');
const oldFiles=['spells-5E-2014-EN.json','spells-5E-2014-PTBR.json','spells-5E-2024-EN.json','spells-5E-2024-PTBR.json'];
const oldDescs=new Set();
for(const f of oldFiles){ JSON.parse(fs.readFileSync(f,'utf8')).spells.forEach(s=>{ if(s.description) oldDescs.add(s.description); }); }
for(const f of ['srd-2014-en.json','srd-2024-en.json']){
  const j=JSON.parse(fs.readFileSync(f,'utf8'));
  const matched=j.spells.filter(s=>oldDescs.has(s.description));
  console.log(f, 'total', j.spells.length, 'matched', matched.length, matched.map(s=>s.name));
}
"
```

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 missing-critical-functionality) + 1 escalated (architectural/policy, blocking).
**Impact on plan:** Auto-fixes were necessary for parser correctness against the real source data and required no judgment call. The escalated item blocks Tasks 2 and 3 entirely — this plan is not complete.

## Known Stubs

None — no UI/rendering stubs; this plan produces backend data files and a generation script only.

## Threat Flags

None beyond what `03-04-PLAN.md`'s own `<threat_model>` already anticipated (T-03-13/14/15/16 are all about exactly this class of risk — the escalated item above is T-03-14 materializing as a real finding, not a new threat surface).

## Issues Encountered

- Tabyltop/CC-SRD's text-dump JSON has no field-level schema of its own (it is a flat PDF-extraction node stream: `h1`/`h2`/`h3`/`h4`/`paragraph`/`table` nodes with `subelements` carrying raw text runs). Reverse-engineering the spell-boundary rule (a heading is a new spell only if the immediately following paragraph matches a level/school pattern; otherwise it's a sub-heading of the current spell) and the metadata/body split (Casting Time/Range/Components/Duration lines, several of which are glued to body text with zero separating whitespace) required direct inspection of the 13,353-node array rather than relying on any documented structure. This is exactly the risk flagged in `03-02-SUMMARY.md`'s "Next Phase Readiness" note ("route (b) is genuinely more work than a one-shot script... budget accordingly").
- Two additional source-data quality issues were found and fixed inline (page-break label splits, a singular/plural label typo) — see Deviations above.
- `Counterspell`'s `castTime` field is genuinely truncated in the Tabyltop source itself (`"1 reaction, which you take when you see a creature within 60 feet of you casting a spell"` — missing the real spell's trailing clause "that is harmful to you or that targets you"). This is a source-fidelity gap, not a parser bug; per D-05's spirit, fabricating the missing words was not attempted. Left as extracted verbatim from the licensed source.
- `Fireball`'s body text is split into two `<p>` tags mid-sentence ("...ignites flammable objects in the area" / "that aren't being worn or carried.") due to a page break in the source stream. Content is complete and correct, just split into an extra paragraph boundary — a cosmetic artifact, not a data-loss issue. Not fixed; documented per the plan's own `<flagged_assumptions>` note about acceptable extraction-fidelity gaps.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**This plan is BLOCKED, not complete.** Before this phase can close out SRD-01 / ROADMAP criterion 6:

1. A human/orchestrator decision is needed on the D-05 zero-intersection question above (four options presented).
2. Once decided, Task 2 needs to either commit the packs as-is (option 1), regenerate them with the overlapping spells removed (option 2), or wait on a separate spell-provenance-audit plan (option 3).
3. Task 3 (`scripts/check-srd-packs.tests.ps1`) needs to be written to match whatever D-05 enforcement shape is decided — its other four checks (schema shape, distinct attributions, per-spell required fields, name uniqueness) are unaffected by this decision and can be written directly from the already-working pack shape.
4. `scripts/generate-srd-pack.mjs`, `scripts/srd-sources/srd-5.2-spells.json`, and the `.gitignore` change are already committed and ready to build on — no rework needed there regardless of which option is chosen.

---
*Phase: 03-srd-pack-import-pipeline*
*Completed: 2026-08-10 (blocked, not complete)*
