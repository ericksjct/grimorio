---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Plugins BYOD
current_phase: 08
current_phase_name: composicao-aditiva-de-pacotes
current_plan: 3
status: executing
stopped_at: Completed 08-10-PLAN.md
last_updated: "2026-10-04T22:30:14.213Z"
last_activity: 2026-10-04
last_activity_desc: Phase 08 execution started
progress:
  total_phases: 8
  completed_phases: 7
  total_plans: 48
  completed_plans: 46
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-17)

**Core value:** Players can quickly find, prepare, and reference the right spells for their character, fully offline, with zero setup.
**Current focus:** Phase 08 — composicao-aditiva-de-pacotes

## Current Position

Phase: 08 (composicao-aditiva-de-pacotes) — EXECUTING
Current Plan: 3
Total Plans in Phase: 12
Status: Ready to execute
Last activity: 2026-10-04 — Phase 08 execution started

Progress: [██████████] 96%

## Performance Metrics

**Velocity:**

- Total plans completed: 36
- Average duration: -
- Total execution time: -

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Animation Verification & Polish | ad hoc | - | - |
| 02 | 2 | - | - |
| 03 | 8 | - | - |
| 04 | 4 | - | - |
| 04.1 | 5 | - | - |
| 05 | 5 | - | - |
| 07 | 5 | - | - |
| 06 | 7 | - | - |

**Recent Trend:**

- Last 5 plans: -
- Trend: -

*Updated after each plan completion*
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 02 P01 | 3min | 3 tasks | 4 files |
| Phase 02 P02 | 12min | 3 tasks | 3 files |
| Phase 07 P01 | 45min | 2 tasks | 5 files |
| Phase 07 P02 | 40min | 2 tasks | 3 files |
| Phase 07 P03 | 20min | 2 tasks | 2 files |
| Phase 07 P04 | 15min | 3 tasks | 8 files |
| Phase 07 P05 | 25min | 2 tasks | 0 files |
| Phase 06 P06 | ~15min | 2 tasks | 3 files |
| Phase 08 P07 | ~15min (continuação; Task 1 rodou em sessão anterior) | 2 de 3 (Task 3 não executada por gate próprio) tasks | 0 files |
| Phase 08 P09 | ~10min | 2 tasks | 3 files |
| Phase 08 P10 | ~25min | 3 tasks | 10 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table. Four decisions locked for this milestone (all "Pending — milestone v2.0" until phases execute):

- BYOD completo para dados de magias — copyright protection, app embeds only SRD/CC-BY, user imports own JSONs
- Plugin format = existing spell schema + `meta` manifest header
- Imported packs stored in IndexedDB (localStorage quota too small for ~600KB+ packs)
- Mandatory HTML sanitization on import (DOMPurify) — `description` renders via `dangerouslySetInnerHTML`, BYOD makes that an XSS vector without it
- [Phase ?]: plugin-store.jsx putPack/deletePack resolve only on tx.oncomplete (durability proof), not on request onsuccess
- [Phase ?]: IndexedDB errors propagate unwrapped (name/message intact) from plugin-store.jsx; caller decides UI messaging
- [Phase ?]: sw.js CACHE_VERSION left unchanged when adding plugin-store.jsx to PRECACHE to avoid re-downloading cached spell JSONs
- [Phase ?]: A-02: exportPack() serializa o registro armazenado VERBATIM, incluindo a chave de topo id - Fase 3 deve tolerar/remover essa chave no import
- [Phase ?]: A-03 aplicada: navigator.storage.persist() solicitado no boot (ROADMAP/REQUIREMENTS autoritativos sobre nota de research desatualizada)
- [Phase ?]: Extrator pt-BR (07-01): noise filtering (letra/*** dividers) aplicado em todo chunk de um bloco, não só antes da metadado — cobre os 16 blocos SRD onde o divisor cai no fim do bloco anterior
- [Phase ?]: Extrator pt-BR (07-01): oráculo D-19 lê description do fixture legado só dentro da função de comparação, nunca grava no recorte de saída — preserva D-05 da Fase 3
- [Phase ?]: [Phase 07-02] toSpell() usa raw.name || slugify(raw.displayName) — D-13: pack pt-BR mantem name=slug EN, displayName=nome pt-BR, sem tocar as rotas EN
- [Phase ?]: [Phase 07-02] ritual/concentration do pack pt-BR vem do texto pt-BR exibido (regex em castTime/duration), nunca copiado da flag EN — gate codifica 2 excecoes de concentracao (forcecage, glyph-of-warding) e 1 de upgradeDescription (call-lightning)
- [Phase ?]: [Phase 07-02] circulo/escola/classes do pack pt-BR vem do SRD EN recem-gerado por slug (factsFrom), nunca do texto traduzido — resolve resilient-sphere (traducao diz Abjuracao, SRD diz evocation)
- [Phase ?]: 07-01's executor had already promoted SRD-04 out of Future Requirements (61b5014) as an unplanned side-effect; 07-03 reconciled instead of duplicating, replacing only the SRD-04 wording/promotion-note spans
- [Phase ?]: [Phase 07-04] D-08 (Fase 7) reverte em parte o D-04 (Fase 6): chaves legadas PT-BR redirecionam por idioma (para srd-2024-ptbr), nao por edicao
- [Phase ?]: [Rule 1 - Phase 07-05] mdTableToHtml empilha tabela de atributo de criatura (>8 celulas/linha) em 4 colunas - achado de overflow (450px em painel de 350px) no checkpoint humano D-15, corrigido no mesmo commit com gate reforcado
- [Phase ?]: [Phase 06-06] Checkpoint humano aprovado: os 4 criterios de sucesso do ROADMAP (MIGR-01/02/03) confirmados via 06-UAT.md 7/7; banner reaprovado pelo usuario apos ajuste visual do botao Entendi (45c6570)
- [Phase ?]: [Phase 06-06] Fase 6 encerrada (7/7 plans); todo srd-pack-nomes-slug-e-markdown-cru fechado (todos/completed/), review-05-warnings WR-01 marcada resolvida (todo continua pending por WR-02 e demais)
- [Phase ?]: Checkpoint 08-07 (Fase 8) reprovado: item 8 (menu de pacotes) falhou, 8/10 itens do roteiro ficaram sem verificação visual, item 5 passou parcialmente. 4 gaps (GAP-1..GAP-4) abertos para /gsd-plan-phase 8 --gaps.
- [Phase ?]: Todo dobrado i18n-toast-versao-e-pluralizacao NÃO foi movido para completed — seu gate (itens 4 e 8 do checkpoint 08-07) não foi satisfeito.
- [Phase ?]: [Phase 08-09] GAP-1: fallback de fonte em adaptSpell via ver.labelEn (packName); so preenche ausencia, FONTE do detalhe mostra sourceFull sem separador orfao (E-04)
- [Phase ?]: [Phase 08-10] GAP-3/GAP-4: meta.image aceita data: raster ou https:// por uma allowlist so (IMAGE_SRC) usada no import, render e schema; img com no-referrer e fallback ao marcador; mensagens em linguagem simples

### Pending Todos

None yet. `.planning/codebase/CONCERNS.md` holds candidate future maintenance items not yet promoted to a requirement or phase.

### Blockers/Concerns

- REQUIREMENTS.md's original "16 total" coverage count was stale/incorrect — the actual v2.0 requirement list has 19 items (PKG×5, STOR×3, MGMT×5, SRD×3, MIGR×3). Corrected during roadmap creation (2026-07-18); traceability table now reflects all 19, mapped 1:1 to Phases 2-6.
- Research flags Phase 6 (Decommissioning & Migration) as needing a deeper pass during planning: the migration-detection logic for existing `localStorage` character data is novel to this codebase (no prior versioned-migration pattern to copy).
- Research flags Phase 3 as needing a concrete file-size cap decided during planning (no byte threshold proposed yet) and a scoping call on whether to add a CSP as defense-in-depth alongside DOMPurify.
- No automated frontend test suite exists — all phase verification will be manual browser QA, consistent with the rest of the project.
- Fase 8 bloqueada até resolver GAP-1..GAP-4 (checkpoint 08-07 reprovado): rodar /gsd-plan-phase 8 --gaps antes de considerar a fase 8 encerrada. PKG-06 já está marcado [x] Complete em REQUIREMENTS.md mas GAP-3 contradiz seu texto vigente ('nunca URL externa').

### Roadmap Evolution

- Phase 8 added (2026-09-27): Composição aditiva de pacotes — pacote base + homebrew empilhado que adiciona magias em vez de substituir; entra antes de fechar o marco v2.0
- Phase 04.1 inserted after Phase 4: Desacoplar o idioma da interface do idioma do pacote - pre-requisito da Fase 6, levantado no checkpoint 04-04 (URGENT)

## Quick Tasks Completed

| Date | Slug | Result |
|------|------|--------|
| 2026-08-10 | spell-card-stale-index | Spell cards opened the wrong spell after filtering — memo'd card kept a stale index closure. Callbacks made identity-stable + spell-argument based; static check added. |

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

## Session Continuity

Last session: 2026-10-04T22:30:14.199Z
Stopped at: Completed 08-10-PLAN.md
Resume file: None
