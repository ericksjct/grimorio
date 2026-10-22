---
phase: 07-traducao-srd-ptbr
plan: 04
subsystem: content-pipeline
tags: [srd, ptbr, service-worker, i18n, version-registry, gate]

# Dependency graph
requires:
  - phase: 07-traducao-srd-ptbr
    plan: 02
    provides: srd-2024-ptbr.json (339 spells, embedded pt-BR SRD 5.2 pack, meta.lang ptbr)
provides:
  - "spells-data-loader.jsx BUILTIN_VERSIONS third entry: srd-2024-ptbr (source fetch, lang ptbr, corpus srd)"
  - "LEGACY_VERSION_FALLBACK D-08 redirect: spells-5E-2024-PTBR / spells-5E-2014-PTBR -> srd-2024-ptbr"
  - "sw.js precache of srd-2024-ptbr.json, CACHE_VERSION bumped grimorio-v3 -> v4"
  - "UPGRADE_HEADING label ceiling widened 40 -> 60 chars (pt-BR 45-char label strips structurally)"
  - "migration.kept i18n copy (pt/en) acknowledges the built-in pt-BR pack"
affects: [07-05 (human verification of the pt-BR pack end-to-end)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "BUILTIN_VERSIONS stays append-only at index 2+ - index 0 (EN default) and the const binding itself are never touched when adding a new builtin pack"
    - "Legacy-key fallback can redirect by language rather than edition when a phase's decision explicitly reverses a prior phase's fallback rule (D-08 partially reverses Phase 6's D-04) - the map entry changes, the resolution code in _initialVersionKey() does not"

key-files:
  created: []
  modified:
    - spells-data-loader.jsx
    - sw.js
    - scripts/check-upgrade-heading-strip.tests.ps1
    - scripts/check-decommission.tests.ps1
    - scripts/check-source-dispatch.tests.ps1
    - scripts/check-migration-version-fallback.tests.ps1
    - i18n.jsx
    - transition-banner.jsx

key-decisions:
  - "UPGRADE_HEADING's label quantifier widened from {1,40} to {1,60} - the only regex change; anchor ^ + <strong><em> requirement do the actual safety work, unchanged"
  - "srd-2024-ptbr registered as BUILTIN_VERSIONS[2] (after both EN entries), never index 0 - preserves the EN browser default and the existing fallback chain's last link"
  - "D-08 (Phase 7) partially reverses D-04 (Phase 6): PT-BR legacy keys now redirect by LANGUAGE to srd-2024-ptbr instead of by EDITION to the EN pack of the same edition; EN legacy keys are unchanged"
  - "_initialVersionKey() code body untouched - only its D-04 branch comment now cites the D-08 map; the map value change alone is what changes runtime behavior"

requirements-completed: []

coverage:
  - id: D1
    description: "stripUpgradeHeading() accepts the pt-BR 45-char upper-slot heading label without eating legitimate text; both EN packs and the pt-BR pack ship with the marked-up structural form"
    requirement: SRD-04
    verification:
      - kind: unit
        ref: "pwsh scripts/check-upgrade-heading-strip.tests.ps1 (exit 0, 'os 3 SRD chegam marcados')"
        status: pass
    human_judgment: false
  - id: D2
    description: "srd-2024-ptbr registered in BUILTIN_VERSIONS (index 2, source fetch, lang ptbr, corpus srd), LEGACY_VERSION_FALLBACK redirects the 2 PT-BR legacy keys to it (D-08), sw.js precaches the pack and bumps CACHE_VERSION to v4, and the 3 gates that encoded the prior 2-SRD state are realigned in the same commit"
    requirement: SRD-04
    verification:
      - kind: unit
        ref: "node execution proof in Task 2 <verify> (BUILTIN_VERSIONS.length===3, index 0 intact, LEGACY_VERSION_FALLBACK D-08 mapping) — exit 0"
        status: pass
      - kind: unit
        ref: "npm test — all suites pass, including check-decommission/check-source-dispatch/check-migration-version-fallback"
        status: pass
    human_judgment: false
  - id: D3
    description: "pack-manager.jsx already enumerates built-in SRD packs generically via source==='fetch' && corpus==='srd' — no code change needed for the pt-BR pack to appear with its attribution (SRD-02)"
    requirement: SRD-02
    verification:
      - kind: unit
        ref: "pwsh scripts/check-pack-manager.tests.ps1 (unchanged, still passes)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Transition banner copy (migration.kept, pt/en) and the code comments in i18n.jsx/transition-banner.jsx no longer claim the app has no Portuguese pack; the D-02 (Phase 6) prohibition is documented as superseded by D-08 (Phase 7), not silently dropped"
    requirement: SRD-04
    verification:
      - kind: unit
        ref: "pwsh scripts/check-transition-banner.tests.ps1 (10/10 migration.* keys parity) + inline node string-presence check — both exit 0"
        status: pass
    human_judgment: false

duration: 15min
completed: 2026-09-26
status: complete
---

# Phase 7 Plan 4: Registro, fallback D-08, precache e banner do pack pt-BR Summary

**Pack pt-BR ligado ao app: terceira entrada em `BUILTIN_VERSIONS`, redirect D-08 das chaves PT-BR legadas, precache `sw.js` v4, e o strip estrutural do rótulo pt-BR de 45 caracteres — tudo com os 3 gates que travavam o estado de "2 SRD" realinhados no mesmo commit do registro**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-09-26
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- `UPGRADE_HEADING` em `spells-data-loader.jsx` aceita rótulos de até 60 caracteres (era 40) — o rótulo pt-BR "Usando um Espaço de Magia de Círculo Superior." (45 caracteres) agora é removido por estrutura, sem duplicar o título na UI; `stripUpgradeHeading()` continua casando pela âncora `^` + `<strong><em>`, sem lista de rótulos por idioma
- `BUILTIN_VERSIONS` ganha `srd-2024-ptbr` como terceiro item (`source: 'fetch'`, `file: 'srd-2024-ptbr.json'`, `lang: 'ptbr'`, `corpus: 'srd'`) — índice 0 (`srd-2024-en`, default de navegador EN) intacto, `SPELL_VERSIONS = BUILTIN_VERSIONS.slice()` nunca reatribuído
- `LEGACY_VERSION_FALLBACK`: `spells-5E-2024-PTBR` e `spells-5E-2014-PTBR` agora redirecionam para `srd-2024-ptbr` (D-08 — reverte em parte o D-04 da Fase 6: para chaves PT-BR o idioma vence a edição); as duas chaves `-EN` continuam na mesma edição
- `sw.js`: `CACHE_VERSION` de `grimorio-v3` para `grimorio-v4` (bump obrigatório por mudança de conteúdo do PRECACHE), `'./srd-2024-ptbr.json'` inserido no PRECACHE logo após `srd-2014-en.json`
- Três gates realinhados no MESMO commit do registro (nenhum ponto do histórico com suíte vermelha ou fallback apontando pra chave inexistente): `check-decommission.tests.ps1` (2→3 JSONs de magia em PRECACHE, `BUILTIN_VERSIONS.length===3`), `check-source-dispatch.tests.ps1` (needle `key: 'srd-2024-ptbr'`, contagens `source: 'fetch'` e `edition: '5e 20` 2→3), `check-migration-version-fallback.tests.ps1` (tabela de casos do D-08, checagem de que `srd-2024-ptbr` nunca é origem no mapa)
- `i18n.jsx`: `migration.kept` (pt e en) passa a citar o SRD 5.2 em português; os comentários que citavam o D-02 da Fase 6 ("nunca oferece pack PT-BR") agora documentam que ele foi superado pelo D-08 da Fase 7
- `transition-banner.jsx`: comentário de topo deixa de dizer que o banner não linka/nomeia pack em português — só comentário, nenhuma linha de código

## Task Commits

Each task was committed atomically:

1. **Task 1: stripUpgradeHeading aceita o rótulo pt-BR de 45 caracteres (RED→GREEN)** - `9596873` (feat)
2. **Task 2: Registro, fallback D-08, precache e realinhamento dos 3 gates** - `99bc813` (feat)
3. **Task 3: Texto do banner de transição reconhece o SRD 5.2 em português** - `3764ae2` (docs)

## Files Created/Modified

- `spells-data-loader.jsx` - `UPGRADE_HEADING` limite 40→60; `BUILTIN_VERSIONS` ganha `srd-2024-ptbr`; `LEGACY_VERSION_FALLBACK` redireciona as 2 chaves PT-BR (D-08); comentário do ramo de fallback em `_initialVersionKey()` atualizado (sem mudança de código)
- `sw.js` - `CACHE_VERSION` v3→v4; `PRECACHE` ganha `'./srd-2024-ptbr.json'`; comentário de topo (2→3 JSONs de magia)
- `scripts/check-upgrade-heading-strip.tests.ps1` - caso `marcado pt longo`; laço de dado real estendido a `srd-2024-ptbr.json`; mensagem "os 3 SRD"
- `scripts/check-decommission.tests.ps1` - exigência de `./srd-2024-ptbr.json` no PRECACHE; contagem de JSONs de magia 2→3; prova `node` exige `BUILTIN_VERSIONS.length===3`; comentário do D-04 cita o D-08
- `scripts/check-source-dispatch.tests.ps1` - needle `key: 'srd-2024-ptbr'`; contagens `source: 'fetch'` e `edition: '5e 20` 2→3
- `scripts/check-migration-version-fallback.tests.ps1` - tabela `cases` da prova `node` com o redirect D-08; checagem de que `srd-2024-ptbr` nunca é origem do mapa; comentário de topo cita D-08
- `i18n.jsx` - `migration.kept` (pt/en) cita o SRD 5.2 PT-BR; comentários do D-02 atualizados (superado pela Fase 7)
- `transition-banner.jsx` - comentário de topo não diz mais que o app não tem pack em português (só comentário)

## Decisions Made

- `UPGRADE_HEADING` só teve o quantificador do rótulo ampliado (`{1,40}` → `{1,60}`) — a âncora estrutural que impede comer texto legítimo não mudou, então o mesmo strip serve para qualquer idioma/pack BYOD sem lista de rótulos hardcoded
- `srd-2024-ptbr` entra em `BUILTIN_VERSIONS` no índice 2 (nunca índice 0) — preserva o default de navegador EN e o último elo da cadeia de fallback, sem exigir mudança de código em `_initialVersionKey()`
- D-08 (Fase 7) reverte em parte o D-04 (Fase 6): para as 2 chaves PT-BR legadas, o idioma vence a edição no redirect — um usuário de 2014 em português cai no SRD 5.2 em português, não no SRD EN da mesma edição; o comparador de edição e o seletor continuam disponíveis pra quem quiser voltar ao 5.1
- Os 3 gates (`check-decommission`, `check-source-dispatch`, `check-migration-version-fallback`) foram realinhados no MESMO commit do registro — em nenhum ponto do histórico o mapa de fallback aponta pra uma chave sem entrada correspondente em `BUILTIN_VERSIONS`, nem a suíte fica vermelha
- `pack-manager.jsx` não precisou de nenhuma mudança: já enumera builtins genericamente por `source === 'fetch' && corpus === 'srd'`, então o SRD 5.2 PT-BR aparece na lista de atribuições sem código novo (SRD-02)

## Deviations from Plan

None - plan executed exactly as written. All 3 tasks passed their acceptance criteria on the first attempt: Task 1's RED gate failed for the documented reason (label survives the 40-char limit), Task 2's node execution proof and the 3 realigned gates passed together with `npm test` green in the same commit, and Task 3's banner/i18n checks passed without any code-line change outside comments.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. `favicon.svg` and `srd-2024-en.json` (the user's own pre-existing stat-only uncommitted changes) were left untouched throughout — never staged, never committed, confirmed via `git status --short` after every task commit.

## Next Phase Readiness

- The pt-BR pack is fully wired: registered, precached, the default for a Portuguese-language browser on first visit (D-06, no new code), and the redirect target for both legacy PT-BR preference keys (D-07/D-08).
- `npm test` is green end-to-end (all 3 task commits verified individually plus the final state).
- 07-05 (human verification) is the remaining step before SRD-04 can be marked Complete in REQUIREMENTS.md — left as `Pending` deliberately per this plan's scope (registry/wiring only, not end-user sign-off).
- No blockers.

---
*Phase: 07-traducao-srd-ptbr*
*Completed: 2026-09-26*

## Self-Check: PASSED

All modified files found on disk (`spells-data-loader.jsx`, `sw.js`, `scripts/check-upgrade-heading-strip.tests.ps1`, `scripts/check-decommission.tests.ps1`, `scripts/check-source-dispatch.tests.ps1`, `scripts/check-migration-version-fallback.tests.ps1`, `i18n.jsx`, `transition-banner.jsx`) and all 3 task commits (`9596873`, `99bc813`, `3764ae2`) confirmed present in `git log`.
