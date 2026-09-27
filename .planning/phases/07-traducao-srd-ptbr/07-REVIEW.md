---
phase: 07-traducao-srd-ptbr
reviewed: 2026-09-27T04:32:52Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - i18n.jsx
  - scripts/build-legacy-fixtures.mjs
  - scripts/check-decommission.tests.ps1
  - scripts/check-migration-version-fallback.tests.ps1
  - scripts/check-source-dispatch.tests.ps1
  - scripts/check-srd-ptbr-pack.tests.ps1
  - scripts/check-upgrade-heading-strip.tests.ps1
  - scripts/extract-ptbr-source.mjs
  - scripts/generate-srd-pack.mjs
  - scripts/srd-sources/srd-5.2-ptbr-pairing.json
  - scripts/srd-sources/srd-5.2-ptbr-source.json
  - spells-data-loader.jsx
  - srd-2024-ptbr.json
  - sw.js
  - transition-banner.jsx
findings:
  critical: 1
  warning: 5
  info: 4
  total: 10
status: issues_found
---

# Phase 07: Code Review Report

**Reviewed:** 2026-09-27T04:32:52Z
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

I reviewed the phase diff `c64cc9d..HEAD`: the pt-BR generator route (`parsePtbr52`, `mdInline`, `mdTableToHtml`), the one-shot extractor, the fixture builder, the loader, service worker and i18n wiring, and the five gates. I did not read the two generated data files whole. I sampled them with node against the local Heróis Anônimos source and against `srd-2024-en.json`. All five gates pass with `pwsh`.

**HTML safety is fine.** Every tag in `srd-2024-ptbr.json` is one of `p strong em table tbody tr th td ul li h5`, and none has an attribute. `mdInline` escapes `&`, `<` and `>` before it adds any markup. There is no residual `*`, `#`, `|`, `_`, image or link syntax, and no stray `&`.

**Content scope is broken.** The last spell of the source chapter pulled in text from outside the spell chapter, and neither the extractor nor the gate caught it (CR-01). The D-08 migration also has two effects the decision did not account for (WR-01).

## Critical Issues

### CR-01: `zone-of-truth` ships PHB Appendix A text — the extractor only stops the chapter at a `# ` heading

**File:** `scripts/extract-ptbr-source.mjs:151-155` (root cause); data at `scripts/srd-sources/srd-5.2-ptbr-source.json:1705` and `srd-2024-ptbr.json:5916`; missing check in `scripts/check-srd-ptbr-pack.tests.ps1`

**Issue:** The chapter only ends at a line that matches `/^# /`. In the source Markdown (line 18927), the appendix title `Apêndice A - O Multiverso` is a plain line, not a `# ` heading. The next `# ` heading is `# Os Reinos Materiais`, a few lines further down. As a result, the last `## ` block ("Zona da Verdade") picks up the appendix title and its intro paragraph. Both end up in the versioned recorte and in the shipped pack:

```
...Tal criatura pode ser evasiva, mas deve ser verdadeira.</p><p>Apêndice A - O Multiverso</p><p>Este apêndice oferece uma visão geral do multiverso, ... no <em>Livro do Mestre</em>, junto com outros planos como o Reino Distante, o Plano Negativo e o Plano Positivo.</p>
```

This causes three problems:
1. Players see a wrong spell description.
2. `MODIFICATION_NOTE_PTBR` becomes false. It says "nenhum outro conteúdo do documento de origem foi incluído".
3. It breaks the licence reasoning in `03-SRD-SOURCE.md`. That document says CC-BY holds only spell by spell, so non-spell PHB prose is not covered.

All five gates pass, so nothing currently detects this kind of leak.

**Fix:** End the chapter at the appendix line too. Then re-run the extractor, the generator and the gates. Also add a scope assertion to the gate. `sw.js` is already at `grimorio-v4` and has not shipped, so regenerating before release does not need another bump.

```js
// extract-ptbr-source.mjs
for (let i = chapStart + 1; i < lines.length; i++) {
  if (/^# /.test(lines[i]) || /^Ap[êe]ndice [A-Z]\b/.test(lines[i].trim())) { chapEnd = i; break; }
}
```
```js
// check-srd-ptbr-pack.tests.ps1, inside the per-spell loop
if (/Ap[êe]ndice [A-Z] -|Este ap[êe]ndice/.test(JSON.stringify(spell))) fail(`'${spell.name}': texto de apêndice do PHB vazou para a magia.`);
```

## Warnings

### WR-01: D-08 (2014 PT-BR → SRD 5.2 PT-BR) hides prepared spells, and the "you can compare back to 5.1" premise is false

**File:** `spells-data-loader.jsx:78-87`, `v10-hifi.jsx:9` and `:1121-1123`, `transition-banner.jsx:29-36` and `:51-62`

**Issue:** The loader comment says "o comparador de edição/seletor seguem disponíveis pra voltar ao 5.1" (the edition comparator and the selector stay available to go back to 5.1). The comparator part is wrong. `useEditionCompare` requires `v.lang === cur.lang`, and no pt-BR 2014 version exists, so `other` is `null` for `srd-2024-ptbr` and the compare button never renders.

A second problem is that `hifiSpellKey` is `${school}-${lvl}-${en}`. I measured this against the local legacy fixture. For 24 of the 2014 PT-BR user's spells, the key no longer exists in `srd-2024-ptbr` because school or level changed in 2024. Examples: `cure-wounds`, `healing-word`, `mass-cure-wounds`, `heal`, `goodberry`, `sending`, `divine-favor`. These spells disappear from the sheet and from the "only prepared" filter. `_countOrphans` still counts them as resolvable, because `srd-2014-en` is in `SPELL_VERSIONS`, so the banner reports 0 orphans. The banner also never tells the user that their edition changed: `__legacyVersionFallback.to` and `.from` are written but nothing reads them. This is the exact confusion that D-04 was written to prevent.

**Fix:** Choose one of these:
- Map `spells-5E-2014-PTBR` back to `srd-2014-en`.
- Keep D-08, but when `from` and `to` differ in edition, show a banner line saying the edition changed. Count orphans only against the active version for that user.

Either way, correct the comment at L78-81.

### WR-02: The D-06 "pt browser gets SRD 5.2 PT-BR" default disagrees with how the UI detects language

**File:** `spells-data-loader.jsx:505-507` vs `index.html:158-171`

**Issue:** On first visit the loader picks the pack from `navigator.languages[0]` only. `detectLang()` in `index.html`, which sets `uiLang`, checks every candidate language. A browser reporting `['en-US', 'pt-BR']` is common in Brazil. It gets a Portuguese UI but the English SRD 5.2 pack, and `index.html` then saves that `versionKey` for good. D-06 says "nenhum código novo é necessário" (no new code needed), but the existing path does not do what D-06 intends.

**Fix:** Use the same candidate logic in both places. For example, in the loader:
```js
const cands = [...(navigator.languages || []), navigator.language].filter(Boolean).map(l => String(l).toLowerCase());
const lang = cands.some(l => l.startsWith('pt')) ? 'ptbr' : 'en';
```

### WR-03: The pt-BR attribution renders as raw Markdown in the pack manager

**File:** `scripts/generate-srd-pack.mjs:608`; rendered at `pack-manager.jsx:278-283`

**Issue:** `attribution` is the WotC text plus `source.license`, which is lines 3-76 of the source Markdown copied as-is. `PackRow` renders it as plain text with `white-space: pre-wrap`, inside a 200px scroll box. Users therefore see Markdown syntax: `## Licença`, `[![Licença CC-BY-4.0](https://licensebuttons.net/l/by/4.0/88x31.png)](http://creativecommons.org/licenses/by/4.0/)`, `**Designer Principal:**`, `***`, and about 5 KB of PHB credits and cover blurbs. This is XSS-safe because React escapes text, but it reads as broken output.

**Fix:** Keep the words verbatim but remove the Markdown syntax when generating the pack. Replace `[![alt](img)](url)` with `alt (url)`, replace `[text](url)` with `text (url)`, and drop `**`, `#` and `***`. Then update the gate's `attr.endsWith(recorte.license)` check to compare against the same normalisation.

### WR-04: The gate allow-lists rules errors instead of resolving them

**File:** `scripts/check-srd-ptbr-pack.tests.ps1:117-118`; data in `srd-2024-ptbr.json` for `forcecage`, `glyph-of-warding` and `call-lightning`

**Issue:**
- **`call-lightning`:** The pt-BR entry is missing the storm clause ("If you're outdoors in a storm…") and the whole higher-level section (+1d10 per slot level above 3). Players on the PT pack get an incomplete rule.
- **`forcecage`:** PT shows "Concentração, até 1 hora" with a concentration badge. The EN SRD source says `1 hour`, no concentration.
- **`glyph-of-warding`:** The disagreement goes the other way here.

The gate allow-lists all three, so in each case one of the two embedded packs is silently wrong.

**Fix:** Add a small, documented errata map in `parsePtbr52`. It should patch the pt-BR duration text and restore the missing call-lightning text from the SRD 5.2 PDF. Mention it in `MODIFICATION_NOTE_PTBR` and remove the gate exceptions.

### WR-05: The attribution can silently become the literal `undefined`, and the gate cannot detect it

**File:** `scripts/generate-srd-pack.mjs:608`, `scripts/check-srd-ptbr-pack.tests.ps1:97`

**Issue:** `(source) => \`${SRD52_ATTRIBUTION}\n\n${source.license}\`` has no guard. If `license` is missing from the recorte, the attribution ends in `undefined`, and the schema accepts it because it is a string. The gate check `attr.endsWith(recorte.license)` becomes `endsWith(undefined)`, which JS coerces to `"undefined"` and returns `true`. That means the D-02 check can pass on the exact failure it should catch. This is a licence-compliance path.

**Fix:**
```js
attribution: (source) => {
  if (typeof source.license !== 'string' || !source.license.includes('Heróis Anônimos')) throw new Error('recorte sem seção Licença (D-02).');
  return `${SRD52_ATTRIBUTION}\n\n${source.license}`;
},
```
In the gate, add: `if (typeof recorte.license !== "string" || !recorte.license) fail("recorte.license ausente.");`

## Info

### IN-01: Stale gate messages and comments that now say something false

**File:** `scripts/check-migration-version-fallback.tests.ps1:64-67,131`; `scripts/check-upgrade-heading-strip.tests.ps1:39` and its final `Write-Output`; `scripts/check-decommission.tests.ps1:47`; `spells-data-loader.jsx:70-75`

**Issue:**
- `check-migration-version-fallback.tests.ps1:131` still prints "resolves to the SRD of the same edition", which is false for the PT keys now.
- `check-migration-version-fallback.tests.ps1:67` still says "só declara as 2 entradas SRD".
- `check-upgrade-heading-strip.tests.ps1` prints "both SRD packs", and its static marked-heading check (L39, `{1,40}`) only covers the two EN packs.
- `check-decommission.tests.ps1:47` still says "PRECACHE so com os 2 SRD".
- The D-04 rationale at `spells-data-loader.jsx:70-75` is now contradicted by D-08 directly below it.

**Fix:** Update the messages and comments. Add `srd-2024-ptbr.json` with `{1,60}` to the static check.

### IN-02: When node is missing, the gate prints a success claim it did not verify

**File:** `scripts/check-srd-ptbr-pack.tests.ps1:71-74`

**Issue:** When node is not found, the gate skips the whole content proof. It still prints "conjunto do SRD 5.2, atribuicao dupla verbatim, sem nomes proprios do PHB".

**Fix:** Print only the "skipped" line in that branch.

### IN-03: `parsePtbr52` overwrites fields silently, and its count check is weak

**File:** `scripts/generate-srd-pack.mjs:465-473,535`

**Issue:** The field patterns match any chunk. A second `**Alcance:**` chunk would overwrite `range` with no error; the current data has exactly one of each, which I checked. `records.length !== facts.size` does not detect a duplicate plus a missing slug. `freeIdentifier` would rename the duplicate to `x-2`, and only the gate would catch it.

**Fix:** Throw when a field is already set. Check that the set of `records.map(r => r.name)` equals `facts.keys()`.

### IN-04: Existing EN-pack defects found while checking this phase's exception lists (out of phase scope)

**File:** `srd-2024-en.json` (`glyph-of-warding`), `srd-2014-en.json`

**Issue:**
- The dmcb gist sets `concentration: true` on Glyph of Warding, so `durationOf` produces "Concentration, Until dispelled or triggered".
- `srd-2014-en.json` has broken slugs `see-i-nvisibility` and `arcanist-s-magic-aura`. The slugs are identity keys, so fixing them means migrating saved prepared and bookmarked keys.

**Fix:** Track as a separate follow-up.

---

_Reviewed: 2026-09-27T04:32:52Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
