---
phase: 07-traducao-srd-ptbr
plan: 02
subsystem: content-pipeline
tags: [srd, ptbr, cc-by-4.0, build-script, markdown-parser, gate]

# Dependency graph
requires:
  - phase: 07-traducao-srd-ptbr
    plan: 01
    provides: scripts/srd-sources/srd-5.2-ptbr-source.json (339 versioned pt-BR spell blocks, raw Markdown), scripts/srd-sources/srd-5.2-ptbr-pairing.json (17 hand-paired renamed spells)
provides:
  - srd-2024-ptbr.json — embedded SRD 5.2 pt-BR pack, 339 spells, meta.lang ptbr
  - scripts/generate-srd-pack.mjs — pt-BR route (parsePtbr52, mdInline, mdTableToHtml, per-package modificationNote, factsFrom)
  - scripts/check-srd-ptbr-pack.tests.ps1 — permanent gate (D-01/D-02/D-04/D-13/D-14/D-16/D-18 + security + generator provenance)
affects: [07-03 (provenance doc, precache/version registry wiring, migration fallback realignment), 07-04/07-05 (SRD-04 completion)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-package modificationNote/lang/packName/author/attribution on each EDITIONS entry, read generically by buildPack() instead of hardcoded EN shape — a translated pack slots in without special-casing the assembly step"
    - "factsFrom reads a sibling pack already written earlier in the same main() loop iteration (by relative path, from disk) to borrow structured facts (level/school/class) for a translated pack, guaranteeing the two packs can never disagree on those fields"
    - "toSpell() prefers raw.name (pre-set slug) over slugify(raw.displayName) — the one line that makes D-13 (name = EN slug, displayName = pt-BR name) hold without touching the EN routes, which never set raw.name"
    - "mdInline()/mdTableToHtml() mirror the SRD 5.1 parser's htmlEscape-first, non-greedy **/* conversion and <table><tbody> shape — new Markdown-prose extractor, same HTML contract as the two existing structured-JSON extractors"

key-files:
  created:
    - scripts/check-srd-ptbr-pack.tests.ps1
    - srd-2024-ptbr.json
  modified:
    - scripts/generate-srd-pack.mjs

key-decisions:
  - "Upgrade-heading detection classifies by exact bold-label startsWith match (not regex sniffing at higher levels) — matches the plan's measured fact that only 2 exact labels occur, and any chunk AFTER the upgrade chunk is intentionally routed back into description (giant-insect/animate-objects stat blocks never land in a separate statBlock field)"
  - "castTime/range/components/duration stay plain, unescaped strings straight from the source line — no mdInline applied — matching how the EN packs already store these fields verbatim (Concentração/Ritual phrasing preserved whole, never truncated)"
  - "ritual/concentration are derived from the pt-BR displayed text (regex on castTime/duration), not copied from the EN flags — the gate encodes the 2 known concentration exceptions (forcecage, glyph-of-warding) and 1 upgradeDescription-presence exception (call-lightning) instead of forcing agreement"

requirements-completed: [SRD-01, SRD-02]

coverage:
  - id: D14
    description: "srd-2024-ptbr.json: 339 spells, exact name-set match with srd-2024-en.json, level/school/class fidelity to EN, ritual/concentration coherent with displayed text, no empty required field, dual verbatim CC-BY-4.0 attribution, own modification note"
    requirement: SRD-01
    verification:
      - kind: unit
        ref: "pwsh scripts/check-srd-ptbr-pack.tests.ps1 (exit 0, 'srd-2024-ptbr.json: 339 magias; D-14/D-16/D-18 ok.')"
        status: pass
    human_judgment: false
  - id: D02
    description: "meta.license.attribution = WotC SRD 5.2 verbatim text + Heróis Anônimos 'Licença' section verbatim; meta.license.modifications is a pt-BR-specific note distinct from the EN packs' note"
    requirement: SRD-02
    verification:
      - kind: unit
        ref: "node assertion in the gate: attribution.startsWith(en attribution) && attribution.endsWith(recorte.license); modifications !== EN modifications, includes 'Heróis Anônimos' and '339'"
        status: pass
    human_judgment: false
  - id: D05_D17
    description: "EN packs remain byte-for-byte identical after regeneration; generator never references the full Heróis Anônimos document or the legacy fixtures"
    requirement: SRD-01
    verification:
      - kind: unit
        ref: "git diff --quiet -- srd-2014-en.json srd-2024-en.json (exit 0); pwsh scripts/check-srd-packs.tests.ps1 (exit 0)"
        status: pass
    human_judgment: false

duration: 40min
completed: 2026-09-26
status: complete
---

# Phase 7 Plan 2: Rota pt-BR no gerador e pack embutido Summary

**Extrator hand-rolled `parsePtbr52()` que converte o recorte Markdown pt-BR em HTML estrutural (mesmo contrato dos packs EN), com fatos de círculo/escola/classe emprestados do SRD EN por slug, atrás de um gate permanente novo (`check-srd-ptbr-pack.tests.ps1`)**

## Performance

- **Duration:** ~40 min
- **Completed:** 2026-09-26
- **Tasks:** 2
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments

- `scripts/check-srd-ptbr-pack.tests.ps1` — gate permanente novo que trava, num único script: existência dos 3 artefatos, ausência do documento completo do Heróis Anônimos no índice do git, proveniência do gerador (contém `parsePtbr52`/`srd-5.2-ptbr-source.json`/`modificationNote`, nunca `herois_anonimos`/`legacy-fixtures`), e — via uma prova em `node` num arquivo `.cjs` temporário — o critério de aceitação completo: conjunto de 339 nomes idêntico ao EN, `level`/`school`/`class` batendo com o EN magia a magia, `ritual`/`concentration` coerentes com o texto exibido (com as 2 exceções medidas de concentração e 1 de `upgradeDescription`), atribuição dupla verbatim, nota de modificação própria, varredura dos 12 nomes próprios banidos (com a exceção deliberada de `meta.license.attribution`), varredura de segurança contra `<script`/`on...=`/`javascript:`, ausência de markdown cru residual, checagem cruzada da tabela de pareamento, e 11 spot checks nomeados no plano
- `scripts/generate-srd-pack.mjs` ganha uma terceira rota: `parsePtbr52(source, facts)` divide o Markdown de cada magia em blocos por linha em branco e classifica cada um (metadado ignorado, campo de `castTime`/`range`/`components`/`duration` mantido como texto puro, seção de círculo superior/aprimoramento de truque marcada como `<p><strong><em>Rótulo.</em></strong> ...`, tabela via `mdTableToHtml`, lista via `<ul><li>`, sub-cabeçalho `###` via `<h5>`, e o resto como parágrafo genérico) — `mdInline()` faz `htmlEscape` seguido de conversão não gulosa de `**negrito**`/`*itálico*`, no mesmo molde do `tableToHtml` do 5.1
- `srd-2024-ptbr.json` (437.883 bytes; 339 magias; 255.822 caracteres de `description`, contra 227.878 do pack EN) escrito na raiz, com `meta.lang: 'ptbr'`, atribuição WotC+Heróis Anônimos verbatim, e nota de modificação própria citando a tradução, o recorte e a troca de nomes próprios
- `buildPack`/`toSpell`/`main()` generalizados: `MODIFICATION_NOTE` virou `MODIFICATION_NOTE_EN` + `MODIFICATION_NOTE_PTBR` (nota por pacote, D-04); `buildPack` lê `edition.modificationNote`/`lang`/`packName`/`author`/`attribution` (string ou função) em vez de valores fixos do formato EN; `toSpell` usa `raw.name || slugify(raw.displayName)` (D-13); `main()` monta `facts` (`Map` nome→magia) a partir de `edition.factsFrom` lendo o pack EN já escrito no disco na mesma execução
- Os 2 packs EN saem byte a byte iguais aos anteriores (`git diff --quiet` limpo) — a regeneração inteira do pipeline (5.1 + 5.2 + pt-BR) não altera nenhum deles

## Task Commits

Each task was committed atomically:

1. **Task 1: Gate check-srd-ptbr-pack.tests.ps1 (RED)** - `a83bfdb` (test)
2. **Task 2: Rota pt-BR no gerador e geração de srd-2024-ptbr.json (GREEN)** - `5520cc3` (feat)

TDD gate sequence confirmed: `test(07-02)` commit before `feat(07-02)` commit, both present in `git log`.

## Files Created/Modified

- `scripts/check-srd-ptbr-pack.tests.ps1` - Gate permanente novo (descoberto por `scripts/run-tests.ps1`), único ponto que trava D-01/D-02/D-04/D-13/D-14/D-16/D-18 para este pack
- `scripts/generate-srd-pack.mjs` - Rota pt-BR (`parsePtbr52`, `mdInline`, `mdTableToHtml`), nota de modificação por pacote, `SRD52_ATTRIBUTION` extraído, `toSpell`/`buildPack`/`main` generalizados
- `srd-2024-ptbr.json` - Pack embutido gerado, 339 magias em português

## Decisions Made

- Classificação de bloco por `startsWith` do rótulo em negrito exato (`**Usando um Espaço de Magia de Círculo Superior.**` / `**Aprimoramento de Truque.**`), não por regex frouxa — casa com o fato medido no plano de que só esses 2 rótulos ocorrem, e qualquer bloco QUE VEM DEPOIS do bloco de upgrade continua indo para `description` (nunca para um campo `statBlock` separado), resolvendo `giant-insect`/`animate-objects`/`summon-dragon`.
- `castTime`/`range`/`components`/`duration` permanecem string pura, sem `mdInline`, exatamente como os packs EN já armazenam esses campos — preserva `"Concentração, até 1 hora"` e `"1 minuto ou Ritual"` inteiros, sem cortar nada.
- `ritual`/`concentration` são derivados do texto pt-BR exibido (regex em `castTime`/`duration`), nunca copiados da flag EN — o gate codifica as 2 exceções de concentração medidas (`forcecage`, `glyph-of-warding`) e a 1 exceção de presença de `upgradeDescription` (`call-lightning`) em vez de forçar concordância artificial com o EN.
- `mdTableToHtml` despe `**` literal do cabeçalho antes de `mdInline` (em vez de converter para `<strong>` dentro de `<th>`) — evita negrito redundante, já que `<th>` já carrega semântica de cabeçalho.

## Deviations from Plan

None - plan executed exactly as written. Both tasks passed all acceptance criteria on the first run: the RED gate failed for the documented reason (section 1, pack missing), and after Task 2 the gate, `check-srd-packs`, `check-upgrade-heading-strip`, the inline `node -e` meta/statBlock assertion, and `npm test` all passed without any fix-up iteration.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. `docs/superpowers/herois_anonimos/` and `.cache/` remain untracked exactly as before (confirmed via the gate's own `git ls-files` check inside the test run). The user's own uncommitted changes (`favicon.svg`, `srd-2024-en.json` stat-only) were left untouched throughout — `git diff --quiet -- srd-2024-en.json` stayed clean after every commit.

## Next Phase Readiness

- `srd-2024-ptbr.json` exists at the repo root, passes its own gate and the schema validator inside `generate-srd-pack.mjs`, and is ready for 07-03's registry wiring: `BUILTIN_VERSIONS` entry in `spells-data-loader.jsx`, `PRECACHE`/`CACHE_VERSION` bump in `sw.js`, and realigning `scripts/check-migration-version-fallback.tests.ps1` for the D-08 legacy-key redirect (`spells-5E-2024-PTBR`/`spells-5E-2014-PTBR` → `srd-2024-ptbr`).
- No blockers. `npm test` is green (all existing gates, including the two decommission/upgrade-heading gates that read the EN packs, still pass unchanged).

---
*Phase: 07-traducao-srd-ptbr*
*Completed: 2026-09-26*

## Self-Check: PASSED

All created/modified files found on disk (`scripts/check-srd-ptbr-pack.tests.ps1`, `srd-2024-ptbr.json`, `scripts/generate-srd-pack.mjs`) and both task commits (`a83bfdb`, `5520cc3`) confirmed present in `git log`.
