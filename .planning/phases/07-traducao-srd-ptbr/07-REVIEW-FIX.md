---
phase: 07-traducao-srd-ptbr
fixed_at: 2026-09-27T12:00:00Z
review_path: .planning/phases/07-traducao-srd-ptbr/07-REVIEW.md
iteration: 1
findings_in_scope: 10
fixed: 9
skipped: 1
status: partial
---

# Phase 07: Code Review Fix Report

**Fixed at:** 2026-09-27
**Source review:** .planning/phases/07-traducao-srd-ptbr/07-REVIEW.md
**Iteration:** 1
**Scope:** all findings (Critical, Warning and Info), with the user's decisions ("corrija tudo")

**Summary:**
- Findings in scope: 10
- Fixed: 9
- Skipped: 1 (the IN-04 slug part, which was skipped on purpose; its glyph-of-warding part is fixed under WR-04)

`npm test` ended with `All test scripts passed.` after the last fix. `srd-2014-en.json` is byte-identical to HEAD before the fixes. The only change to `srd-2024-en.json` is the glyph-of-warding concentration fix: the `"concentration": true` line is removed and `duration` loses its `Concentration, ` prefix. `sw.js` stays at `grimorio-v4`.

## Fixed Issues

### CR-01: `zone-of-truth` shipped PHB Appendix A text

**Files modified:** `scripts/extract-ptbr-source.mjs`, `scripts/srd-sources/srd-5.2-ptbr-source.json`, `srd-2024-ptbr.json`, `scripts/check-srd-ptbr-pack.tests.ps1`
**Commit:** 140e001
**Applied fix:**
- The extractor now also ends the chapter at a `^Apêndice [A-Z]` line.
- I re-ran the extractor and the generator. `zone-of-truth` now ends at "...mas deve ser verdadeira."
- The gate fails if `Apêndice X -` or `Este apêndice` appears in any pack spell or in any recorte block. Five spells legitimately say "veja o apêndice B", so the pattern cannot be the bare word.
- I checked the gate against the old pack. It fails on `zone-of-truth` there, and passes on the new pack.

**Note on the recorte licence:** the local source Markdown was modified at 2026-09-27 00:37, which is after the original capture. In its "Créditos" block, `***` followed by a blank line became a lone `*`. Re-running the extractor picked that change up. I kept the committed, audited `license` text and the original `capturedAt` (2026-09-26). The only recorte change in this commit is the `zone-of-truth` block. Someone should check whether the edit to the local `.md` was intentional.

### WR-01: the 2014 PT-BR legacy key was hiding prepared spells

**Files modified:** `spells-data-loader.jsx`, `scripts/check-migration-version-fallback.tests.ps1`, `scripts/check-decommission.tests.ps1`, `i18n.jsx` (comments only)
**Commit:** 24f30b9
**Applied fix:**
- Option 1: `spells-5E-2014-PTBR` now maps to `srd-2014-en` again, which restores Phase 6 D-04. `spells-5E-2024-PTBR` still maps to `srd-2024-ptbr`.
- I rewrote the loader comment at L78-81. It no longer claims the comparator is available.
- I updated the runtime cases and the messages in the fallback gate, and the decommission gate comment.
- The visible banner copy (`migration.kept`) is still true, so only the i18n comments changed.

**This supersedes 07-CONTEXT D-08 for the 2014 key.** Only the 2024 PT-BR key switches language now.

### WR-02: default spell version ignored non-primary pt browser languages

**Files modified:** `spells-data-loader.jsx`, `scripts/check-browser-language-detection.tests.ps1`
**Commit:** 25c3f59
**Applied fix:**
- On first visit, `_initialVersionKey()` now uses the same candidate list as `detectLang()`: `navigator.languages`, `language`, `userLanguage` and `browserLanguage`. If any candidate starts with `pt`, it picks ptbr.
- The language-detection gate now also fails if the loader goes back to reading only `navigator.languages[0]`.
- I kept the new comment to one line because `check-source-dispatch` only allows `_initialVersionKey()` to be 2000 characters long.

### WR-03: pt-BR attribution rendered as raw Markdown

**Files modified:** `scripts/generate-srd-pack.mjs`, `scripts/check-srd-ptbr-pack.tests.ps1`, `srd-2024-ptbr.json`
**Commit:** 436505b
**Applied fix:**
- New `stripLicenseMarkdown()` step at generation time:
  - `[![alt](img)](url)` becomes `alt (url)`, and `[text](url)` becomes `text (url)`.
  - `**` and `*` emphasis markers, leading `#` and `***` lines are removed.
  - Runs of 3 or more newlines collapse to one blank line.
- The words stay verbatim.
- The gate compares against the same normalisation and also fails if any `*`, `](`, leading `#` or `***` line is left.

### WR-04: the gate allow-listed rules errors

**Files modified:** `scripts/generate-srd-pack.mjs`, `scripts/check-srd-ptbr-pack.tests.ps1`, `srd-2024-ptbr.json`, `srd-2024-en.json`
**Commit:** 384849b
**Applied fix:**
- **`PTBR_ERRATA` in `parsePtbr52`:**
  - Each patch replaces one exact Markdown excerpt. If the excerpt is missing or appears more than once, the generator throws. It also throws if an errata key has no spell in the recorte.
  - `forcecage`: `Concentração, até 1 hora` becomes `1 hora`, matching the SRD 5.2 EN, so the spell is no longer concentration.
  - `call-lightning`: I translated the storm clause and the higher-level section from the SRD 5.2 EN entry. The upgrade uses the pack's label `<p><strong><em>Usando um Espaço de Magia de Círculo Superior.</em></strong> O dano aumenta em 1d10 para cada círculo de espaço de magia acima de 3.</p>`.
- `MODIFICATION_NOTE_PTBR` now names both errata.
- **`glyph-of-warding` (EN side):** `SRD52_SOURCE_FIXES` in `parseSrd52` is a documented fix to the dmcb gist. It sets `concentration: false` because the SRD 5.2 gives only "Until dispelled or triggered". The EN and pt-BR packs now agree.
- I removed `CONCENTRATION_EXCEPTIONS` and `UPGRADE_EXCEPTIONS` from the gate. I replaced the `call-lightning` spot check, which expected no upgrade, and added a `forcecage` spot check.

**Needs human verification:** these are rules-text and translation changes, so someone should review the pt-BR wording.

### WR-05: attribution could silently become `undefined`

**Files modified:** `scripts/generate-srd-pack.mjs`, `scripts/check-srd-ptbr-pack.tests.ps1`
**Commit:** 9843363
**Applied fix:**
- The `attribution` builder throws if `source.license` is not a string or does not contain "Heróis Anônimos". I tested it with `{}` and with `{license: "x"}`, and it threw both times.
- The gate fails if `recorte.license` is missing or lacks "Heróis Anônimos", and if the attribution contains `undefined`. The `endsWith` check only runs when the licence is a string.

### IN-01: stale gate messages and comments

**Files modified:** `scripts/check-decommission.tests.ps1`, `scripts/check-migration-version-fallback.tests.ps1`, `scripts/check-upgrade-heading-strip.tests.ps1`
**Commit:** c50f561 (the loader D-04/D-08 comment was rewritten in 24f30b9)
**Applied fix:**
- The comments now say "3 SRD" instead of "2 SRD".
- The static marked-heading check in the upgrade-heading gate now covers `srd-2024-ptbr.json` with `{1,60}`, while the EN packs keep `{1,40}`. It also rejects an unmarked pt-BR heading, and the gate's final message now says "all 3 SRD packs".
- After WR-01, the fallback gate's "same edition" message is true again.

### IN-02: gate claimed a content proof it skipped

**Files modified:** `scripts/check-srd-ptbr-pack.tests.ps1`
**Commit:** 13ddbcc
**Applied fix:** when node is missing, the gate now prints only the "skipped" line.

### IN-03: `parsePtbr52` silent field overwrite and weak count check

**Files modified:** `scripts/generate-srd-pack.mjs`
**Commit:** e5778a3
**Applied fix:**
- A second field chunk (for example a second `**Alcance:**`) now throws.
- The final check compares the set of slugs as well as the count, so a duplicate slug plus a missing one no longer passes.
- I tested both cases with an in-memory mutated recorte. Both threw, and the real recorte still passes.

### IN-04 (glyph-of-warding part): EN concentration flag

Fixed as part of WR-04 (commit 384849b), on the EN generator side, as the user decided.

## Skipped Issues

### IN-04 (slug part): broken 2014 slugs `see-i-nvisibility` / `arcanist-s-magic-aura`

**File:** `srd-2014-en.json`
**Reason:** skipped by user decision. Prepared-spell keys are `${school}-${lvl}-${en}`, so renaming these slugs would orphan users' saved preparations and bookmarks. A fix needs its own key migration.
**Original issue:** `srd-2014-en.json` has the broken slugs `see-i-nvisibility` and `arcanist-s-magic-aura`.

---

_Fixed: 2026-09-27_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
