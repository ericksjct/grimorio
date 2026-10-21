---
phase: 08-composicao-aditiva-de-pacotes
verified: 2026-10-21T23:45:51Z
status: human_needed
score: 9/9 must-haves verified
behavior_unverified: 0
overrides_applied: 0
gaps: []
warnings:
  - id: "W-01"
    requirement: "MGMT-07"
    file: "pack-docs.html:227, pack-docs.html:418-426"
    issue: "Author docs still say a reserved/installed slug 'abre, no import, um prompt para renomear antes de gravar' / 'gets a rename prompt on import'. E-01 and MGMT-07 say import renames automatically, installs without a prompt, and warns. The docs also do not say that a role:\"base\" pack is never renamed (E-07)."
  - id: "W-02"
    requirement: "PKG-07"
    file: "pack-import.jsx:621"
    issue: "No gate in npm test covers the role:\"base\" no-rename branch in _install. The verifier proved it with a one-off vm spot-check only."
  - id: "W-03"
    requirement: "SRD-05"
    file: "spells-data-loader.jsx:784-790"
    issue: "normalizeSelection doc comment still describes the old per-edition exclusivity (srd-2024-en and srd-2024-ptbr 'sobrevivem juntas'). The code (L803-816) does one base at a time (E-06). Only the comment is wrong."
  - id: "W-04"
    requirement: "MGMT-09"
    file: "scripts/check-pack-composition.tests.ps1:294-298"
    issue: "Gate message says 'desktop bar + mobile drawer'. Since Phases 9-11 the second mount is the 'Mais' sheet (v10-hifi.jsx:2525). The count (2) is still correct, only the label is stale."
human_verification:
  - test: "Install your own pack with meta.role \"base\" (it repeats SRD slugs, for example fireball). Then install an additional with meta.base set to the source of that base. Open the pack menu. Mark the own base, then mark SRD 5.2 (EN)."
    expected: "Import shows no rename for the base pack. The own base shows in 'Pacotes base'. Marking it clears the SRD base. When SRD 5.2 is marked, the tied additional is removed from the selection, shows greyed out and disabled, and shows 'Requer o pacote base: <name>' (EN: 'Requires base pack: <name>')."
    why_human: "PKG-07 / E-07 / E-09 came after the 08-07 script. The 08-12 checkpoint used no role:base fixture and did not look at the disabled 'Requer o pacote base' card. The logic is proven (tests + spot-check), but nobody has seen the menu render it."
  - test: "Decide if packs/srd-2024-adicionais.json can ship as a built-in. It has 69 non-SRD PHB 2024 spells (for example leomunds-secret-chest, armor-of-agathys), meta.license.id 'proprietary', attribution 'Conteúdo do Livro do Jogador 2024 (Wizards of the Coast) traduzido por Heróis Anônimos. Uso pessoal.'"
    expected: "Owner decision: keep it (accept the risk), or move it out of packs/ and make it a pack the user imports."
    why_human: "Licensing decision, not code. packs/ is published (github.com/ericksjct/grimorio, .nojekyll) and sw.js precaches it for every visitor. This is against the SRD-only/CC-BY content position from Phases 3/6/7. No Phase 8 requirement forbids it, so it is not a gap."
---

# Phase 8: Composição aditiva de pacotes Verification Report

**Phase Goal:** O usuário mantém um pacote base ativo (ex.: SRD 5.2) e empilha pacotes
homebrew por cima: as magias dos pacotes empilhados SOMAM à lista da versão ativa em vez
de substituí-la, com a origem de cada magia visível e sem quebrar preparadas/favoritas.
(Read with amendments E-01..E-09 of `08-CONTEXT.md`: E-06 brings back "base × adicional",
E-07 `meta.role`, E-08 `packs/` folder + generated manifest, E-09 `meta.base`.)
**Verified:** 2026-10-21T23:45:51Z
**Status:** human_needed (all 9 requirements verified in code and gates; 2 items need a human, see below)
**Re-verification:** No. This is the initial verification (no earlier 08-VERIFICATION.md).

**Context applied per orchestrator note:**
- Phases 9-11 (commits `60f9b61`..`74cf173`) replaced the mobile drawer with a tab bar. The
  mobile pack-menu chip now lives in the "Mais" sheet (`v10-hifi.jsx:2525`). That is
  superseded by a later phase, not a gap. The MGMT-09 entry point still works on both
  surfaces: desktop bar `v10-hifi.jsx:1443` and the "Mais" sheet `v10-hifi.jsx:2525`, both
  `<window.PackMenuChip lang={uiLang}>`, and the gate counts exactly 2 mounts.
- Verified against the working tree. The uncommitted edits (`v10-hifi.jsx` HifiLangToggle
  as a segmented control, `hifi-tokens.css` +4 lines, `scripts/check-ui-lang-toggle.tests.ps1`)
  are UI-language-toggle work. They do not touch Phase 8 code paths.
- `packs/index.js` shows as ` M` in git with no content diff (line endings only,
  `core.autocrlf=true`). The `check-packs-index` gate rewrites the file on each run. Same
  side effect as recorded in 08-12-SUMMARY.

## Goal Achievement

### Observable Truths (ROADMAP goal + requirements, post-amendment wording)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Spells of stacked packs SUM to the base's list (union, not replace) | ✓ VERIFIED | `unionSpells` (spells-data-loader.jsx:845-875) concatenates all resolved keys in selection order, deduping only on an identical `hifiSpellKey`. `buildSpellsFromRealData` (L881-912) unions every resolved key. Gate "Pack composition core ... verified end to end" passes. 08-12 item 1: 340 cards = 339 SRD + 1 QA |
| 2 | Only one base at a time; additionals never deselected by that rule; last base in `?v=` wins | ✓ VERIFIED | `normalizeSelection` L803-816 keeps only `lastBase`. Additionals are filtered only by E-09 `meta.base`. All 3 SRD builtins have `role:"base"` (packs/index.js). Gate checks `['srd-2024-en','srd-2024-ptbr'] → ['srd-2024-ptbr']` (check-pack-composition.tests.ps1:113). 08-12 items 3 and 9 |
| 3 | Each spell's origin is visible and in its own pack's language | ✓ VERIFIED | `adaptSpell` stamps `lang` and `_versionKey` (L463-464). E-04: a spell with no `source` gets the pack name. Gates "Content-language ownership", "Detail FONTE line ... never an orphan separator". 08-12 items 1-2 |
| 4 | Prepared/bookmarked never rewritten; identity by slug | ✓ VERIFIED | `_install` renames only the pack that comes in (pack-import.jsx:615-639) and writes once. `renameImpact` is read-only (gate: 0 writes/events). 08-12 item 7 |
| 5 | Empty selection allowed → default pack + notice, persists empty | ✓ VERIFIED | `resolveSelection` falls back to `_browserDefaultKey()` (L823-826). `_persistSelection` writes the raw list (L550-557). `menu.toastFallbackToDefault` PT/EN in i18n.jsx:256/515. 08-12 item 4 |
| 6 | Legacy `versionKey` → one-item list; `?v=` comma list; per-item pending | ✓ VERIFIED | `_initialSelection` L512-544 (URL list → `selectedVersionKeys` → legacy with `LEGACY_VERSION_FALLBACK` before conversion → pending). Share: `p.set('v', versionKeys.join(','))` v10-hifi.jsx:101. Gate check-selection-migration passes. 08-12 item 9 |
| 7 | One pack menu with base/additional sections, checkbox, import, remove, license, reserved slugs; chip "first + count" | ✓ VERIFIED | pack-manager.jsx: sections L683/702 (`manager.sectionBuiltin`="pacotes base", `sectionInstalled`="pacotes adicionais"), checkbox L343, license `<details>` L408-420, reserved slugs L733-750, remove L518, `_chipLabel` L778-785 (`short + ' +N'`). 08-12 item 8 ("SRD 5.2 +1") |
| 8 | Import auto-renames colliding slugs without a prompt and warns; selection keeps the prompt | ✓ VERIFIED (docs warning W-01) | Code + gate check-slug-rename (funnel cases 1-9) + 08-12 items 5-6. The author docs (`pack-docs.html`) still describe a prompt on import. See W-01 |
| 9 | `meta.image`: data: raster ≤200 KB or https ≤2048; no referrer; placeholder on failure | ✓ VERIFIED | `IMAGE_SRC` pack-import.jsx:47 is the single allowlist. Schema pattern is the same (gate checks parity). `<img referrerPolicy="no-referrer" onError>` pack-manager.jsx:311-312. 08-12 item 8 (CDP: no Referer) |
| 10 | `meta.role` base\|additional; base not renamed on import; `meta.base` ties additional to its base | ✓ VERIFIED (UI half → human item 1) | Validator META_FIELDS pack-import.jsx:85-86. `_install` skips the rename for base (L621). `_packToVersion` maps role/base (spells-data-loader.jsx:126-127). `normalizeSelection` drops a tied additional when another base wins (gate L123-126). Menu disables it with `manager.requiresBase` (pack-manager.jsx:613-619, 717). Verifier spot-check below |
| 11 | Builtins live in `packs/`; `packs/index.js` is generated (`npm run packs`) and gated | ✓ VERIFIED | `scripts/build-packs-index.mjs` reads every `packs/*.json`, finds optional `.png/.webp/.jpg` thumbnails. package.json `"packs"` script. Gate `check-packs-index.tests.ps1` regenerates and diffs, and checks `index.html:130` loads it. Loader reads `globalThis.BUILTIN_PACKS` (L47, sync-XHR fallback L39-46). `sw.js:24` `importScripts('./packs/index.js')`, PRECACHE comes from it (L55), `CACHE_VERSION='grimorio-v8'`. No SRD JSON left at the repo root |

**Score:** 9/9 requirements verified (0 present-but-behavior-unverified). 2 human items: one UI render check (PKG-07) and one owner decision (licensing).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| MGMT-06 | 08-01, 08-03, 08-05, 08-06, 08-09, 08-12 | One base + any number of additionals; grid = union; each spell in its pack's language; no silent hiding among additionals | ✓ SATISFIED | Truths 1-3. `unionSpells` drops only exact-key duplicates (A-04 safety net). Import rename + selection prompt stop real collisions before that. Gates check-pack-composition, check-content-lang-ownership. 08-12 items 1-2 PASS |
| MGMT-07 | 08-02, 08-04, 08-08, 08-11, 08-12 | Slug is identity; import auto-renames (`slug-<pack>`, -2/-3), no prompt, toast + success line; selection prompts, cancel = not marked; no prepared/fav rewrite; export renamed; reserved list published + in menu | ✓ SATISFIED (with W-01) | `_install` pack-import.jsx:615-646. `import.renamed.one/other` + `renamedMore` i18n.jsx:202-204/461-463. `_selectionConflicts` → `PackRenameDialog` pack-manager.jsx:841-878, 943. `srd-reserved-slugs.json` + pack-docs.html `#pd-reserved` + menu `<details>`. Gate check-slug-rename. 08-12 items 5-7 PASS. **W-01:** pack-docs.html:227 and :418-426 still say import "abre ... um prompt para renomear", which is not true now |
| MGMT-08 | 08-01, 08-02, 08-05, 08-12 | Empty selection allowed; grid shows the default pack, never empty; UI-language notice | ✓ SATISFIED | Truth 5. 08-12 item 4 PASS (339 cards, PT/EN toast, persists after reload) |
| MGMT-09 | 08-02, 08-05, 08-06, 08-10, 08-12 | One pack menu (cards with image/title/description, checkbox, base/additional sections, import, remove, license, reserved slugs) replaces the version selector; opened by chip "first + count" | ✓ SATISFIED | Truth 7. Old selector gone (gate "No reader of a single active version remains"). Chip mounted at v10-hifi.jsx:1443 (desktop bar) and :2525 ("Mais" sheet, Phases 9-11, superseded location, not a gap). 08-12 item 8 PASS. UI-SPEC token check in all 6 themes was not done (only default light/dark); the user approved without it (08-12 "Não conferido") |
| PKG-06 | 08-02, 08-05, 08-08, 08-10, 08-12 | `meta.image` optional: data: raster ≤200 KB or https ≤2048; validated without fetch; clear, localized rejection before write; `<img>` without referrer; never http; placeholder on failure | ✓ SATISFIED | Truth 9. Size cap before regex (pack-import.jsx:226-236). Codes `image-invalid`/`image-too-large`. Builtins skip `_safeImage` (our own files). Gate meta.image (accepts/rejects, schema parity). 08-12 item 8 PASS |
| SRD-05 | 08-01, 08-03, 08-05, 08-12 | Bases exclusive (5.1×5.2 and EN×PT-BR too); last base in `?v=` wins; additionals never deselected by this rule | ✓ SATISFIED (W-03 comment only) | Truth 2. 08-12 items 3, 9 PASS (`?v=srd-2024-en,srd-2024-ptbr` → last wins). The doc comment at spells-data-loader.jsx:784-790 still describes the old per-edition rule |
| MIGR-04 | 08-01, 08-06, 08-12 | `versionKey` → one-item list (legacy fallback first); persists in `selectedVersionKeys`; `?v=` comma list, backward compatible; per-item pending | ✓ SATISFIED | Truth 6. `_persistSelection` deletes `versionKey` in the same write. Pruning only after the first enumeration (`setSelectedVersionKeys` L577-581). Gate check-selection-migration. 08-12 item 9 PASS |
| PKG-07 | none (E-07/E-09; no SUMMARY lists it) | `meta.role` (base\|additional, default additional) optional; own base pack not renamed on import; `meta.base` ties additional to a base, selectable only with it | ✓ SATISFIED (code + spot-check); menu render → human item 1 | Schema pack.schema.json:47-56; validator enum/pattern pack-import.jsx:85-86; docs pack-docs.html:158-167; no-rename branch pack-import.jsx:621; registry pack-manager.jsx:83/111 and spells-data-loader.jsx:126-127; selection rule normalizeSelection L810-816 (gate-tested). Verifier spot-check: role base → `renamed=[]`, slug `fireball` kept; additional/default → `fireball-meu-base`; `role:'primary'` and `base:'Not A Slug'` → `schema-invalid`, 0 writes. **W-02:** no permanent gate for the base no-rename branch |
| SRD-06 | none (E-08; no SUMMARY lists it) | Builtins in `packs/` (single source); menu shows `packs/` + installed; `packs/index.js` generated by `npm run packs`, gate `check-packs-index`; add a builtin = copy JSON (+ optional thumbnail) and regenerate | ✓ SATISFIED | Truth 11. Builtin rows come only from `SPELL_VERSIONS` with `source==='fetch'` (= BUILTIN_PACKS) (pack-manager.jsx:95-119). Thumbnails `packs/<name>.png` exist for the 3 SRD packs and are precached. Gate passes ("packs/index.js em dia com a pasta packs/") |

**Orphaned requirements:** none. REQUIREMENTS.md traceability (L112-120) maps all 9 IDs to Phase 8. PKG-07 and SRD-06 are in no PLAN `requirements` field and no SUMMARY `requirements-completed`. They were verified directly against the code above.

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `spells-data-loader.jsx` | `normalizeSelection`/`resolveSelection`/`unionSpells`, `selectedVersionKeys`, migration, `lang`/`_versionKey` | ✓ VERIFIED | All present and wired (exported on `window` L980-993) |
| `pack-manager.jsx` | Single menu, sections, `PackMenuChip`, `_selectionConflicts`, image fallback | ✓ VERIFIED | Substantive (~950 lines), mounted via `window.__openPackManager` |
| `pack-import.jsx` | `IMAGE_SRC`, role/base validation, auto-rename funnel | ✓ VERIFIED | One `putPack` per install |
| `pack-rename-dialog.jsx` | Selection-path rename prompt (E-02) | ✓ VERIFIED | Precached in sw.js; gate checks single dialog + single putPack |
| `packs/index.js` + `scripts/build-packs-index.mjs` | Generated manifest (E-08) | ✓ VERIFIED | Matches the folder (gate) |
| `srd-reserved-slugs.json` + `pack-docs.html` | Published reserved list | ⚠️ VERIFIED, stale text | List is rendered from the JSON. The text around it is stale (W-01) |
| `pack.schema.json` | `image`, `role`, `base` | ✓ VERIFIED | Gate: schema ↔ docs ↔ validator parity |
| `sw.js` | PRECACHE from manifest, cache bump | ✓ VERIFIED | `grimorio-v8`, `importScripts('./packs/index.js')` |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `index.html` | `packs/index.js` | `<script src>` before the loader (L130) | ✓ WIRED | Gate checks it |
| `packs/index.js` | loader registry | `globalThis.BUILTIN_PACKS` → `BUILTIN_VERSIONS` | ✓ WIRED | spells-data-loader.jsx:47 |
| `packs/index.js` | `sw.js` PRECACHE | `importScripts` + `flatMap` of `file`/`image` | ✓ WIRED | sw.js:24, 55 |
| `PackMenuChip` | `PackMenu` | `window.__openPackManager({anchor})` | ✓ WIRED | Desktop bar + "Mais" sheet |
| `PackMenu` toggle | loader selection | `normalizeSelection` → `_selectionConflicts` → `setSelectedVersionKeys` | ✓ WIRED | pack-manager.jsx:560-583 |
| `_install` | `pluginStore.putPack` | auto-rename then one write | ✓ WIRED | pack-import.jsx:642-644 |
| share view | `?v=` list | `hifiShareViewUrl({versionKeys})` | ✓ WIRED | v10-hifi.jsx:101 |
| `adaptSpell` | card/detail render | `s.lang`, `_versionKey`, `sourceFull` | ✓ WIRED | Gates content-lang + also-in |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| Spell grid | `spells` (useSpellVersions) | `buildSpellsFromRealData` → `_cache[k]` from `packs/*.json` fetch / IndexedDB | Yes (339 + N cards in 08-12 QA) | ✓ FLOWING |
| Pack menu | `builtinRows` + `installedRows` | `SPELL_VERSIONS` + `pluginStore.listPacks()` | Yes | ✓ FLOWING |
| Reserved slugs section | `reserved` | `packImport.loadReservedSlugs()` → `srd-reserved-slugs.json` | Yes | ✓ FLOWING |
| Chip label | `resolved` | `getResolvedVersionKeys()` + events | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Full test suite (once) | `pwsh scripts/run-tests.ps1` | "All test scripts passed.", exit 0 | ✓ PASS |
| PKG-07: base pack not renamed; additional/default renamed; bad role/base rejected before write | `node` vm harness on `pack-import.jsx` (scratchpad `spot-pkg07.js`, same sandbox shape as check-slug-rename) | base: `renamed=[]`, slug `fireball`; additional: `fireball → fireball-meu-base`, `meta.base` stored; `role:'primary'`/`base:'Not A Slug'` → `schema-invalid`, `puts=0` | ✓ PASS |
| E-09 builtin additional does not collide with any base | `node` set intersection over `packs/*.json` | `srd-2024-adicionais`: 69 spells, 0 overlap with srd-2024-ptbr / srd-2024-en / srd-2014-en | ✓ PASS |
| SUMMARY commit hashes exist | `git cat-file -e` on every 7-hex in 08-*-SUMMARY.md | all resolve | ✓ PASS |

### Probe Execution

No `scripts/*/tests/probe-*.sh` convention in this project. The gate mechanism is `scripts/*.tests.ps1` via `scripts/run-tests.ps1`, run in full once above.

### Anti-Patterns Found

No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` markers in phase-touched files. The only hits are the Portuguese word "TODOS" in comments/docs.

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `pack-docs.html` | 227, 418-426 | Stale behavior claim ("prompt para renomear" on import) | ⚠️ Warning (W-01) | Pack authors are told the wrong import behavior. E-01 is the contract and the code follows it |
| `pack-import.jsx` | 621 | Behavior branch with no permanent gate | ⚠️ Warning (W-02) | A regression in the role:base no-rename path would not fail `npm test` |
| `spells-data-loader.jsx` | 784-790 | Stale doc comment (old per-edition rule) | ℹ️ Info (W-03) | Misleads a reader. The code is correct |
| `scripts/check-pack-composition.tests.ps1` | 294-298 | Stale gate label ("mobile drawer") | ℹ️ Info (W-04) | Count is still correct |
| `packs/srd-2024-adicionais.json` | meta.license | `id: "proprietary"`, non-SRD PHB content shipped as built-in and precached | ⚠️ Warning, owner decision (human item 2) | Licensing exposure on a public repo/site. Not a Phase 8 requirement |

### Human Verification Required

#### 1. PKG-07 / E-09 menu render with your own base pack

**Test:** Install a pack with `meta.role: "base"` that repeats SRD slugs (for example `fireball`).
Then install an additional with `meta.base` set to that base's `meta.source`. Open the
pack menu. Mark the own base, then mark SRD 5.2 (EN).
**Expected:** No renamed slugs when the base imports. The own base shows under "Pacotes
base". Marking it clears the SRD base, and marking the SRD clears it. With SRD marked, the
tied additional leaves the selection and shows greyed out and disabled with "Requer o pacote
base: <nome>" (EN: "Requires base pack: <name>").
**Why human:** The 08-12 checkpoint ran before any role:base fixture existed, and it did
not render the disabled "requires base" card. The logic is proven by gate + spot-check.
Nobody has seen the menu render it.

#### 2. Owner decision: proprietary PHB pack shipped as a built-in

**Test:** Look at `packs/srd-2024-adicionais.json` (commit `07ddbbd`, "Add: pacote adicional"):
69 non-SRD PHB 2024 spells, `license.id: "proprietary"`, "Uso pessoal".
**Expected:** Keep it (accept the risk), or remove it from `packs/` and make it a pack
the user imports.
**Why human:** This is a licensing decision, not code. `packs/` is published (public GitHub
repo, GitHub Pages) and `sw.js` precaches it for every visitor. This is against the
SRD-only/CC-BY position from Phases 3/6/7.

### Gaps Summary

No blocking gaps. All 9 requirements (including PKG-07 and SRD-06 from amendments E-07..E-09)
are in the code and wired end to end. `npm test` passes in full. The re-done human
checkpoint (08-12, 10/10) agrees with the code-level findings for the 7 original IDs.

Status is `human_needed` for two items. (1) The PKG-07/E-09 menu UI was never seen
rendered with a user-installed base pack or a disabled "requires base" card. (2) An owner
licensing decision about the proprietary built-in additional pack.

Recommended small fixes, none blocking: W-01, update `pack-docs.html:227` and `:418-426` to
describe auto-rename on import and that role:"base" packs are never renamed. W-02, add the
role:base case to the funnel block of `scripts/check-slug-rename.tests.ps1`. W-03/W-04,
refresh the stale comment and gate label.

---

_Verified: 2026-10-21T23:45:51Z_
_Verifier: Claude (gsd-verifier)_
