---
gsd_state_version: 1.0
milestone: v2.1
milestone_name: Simplificação e Manutenção
status: planning
last_updated: "2026-10-24T00:19:20.075Z"
last_activity: 2026-10-23
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-10-21)

**Core value:** Players can quickly find, prepare, and reference the right spells for their character, fully offline, with zero setup.
**Current focus:** Planning next milestone (/gsd-new-milestone)

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-10-23 — Milestone v2.1 started

## Performance Metrics

**Velocity:**

- Total plans completed: 48 (v2.0)
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
| Phase 08 P11 | 25min | 3 tasks | 11 files |
| Phase 08 P12 | ~40min (QA headless) | 3 tasks | 0 code files |

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
- [Phase 08-12]: Checkpoint refeito aprovado (10/10, QA headless no Chrome a pedido do usuario); MGMT-06..09, PKG-06, SRD-05, MIGR-04 Complete; todo i18n-toast-versao-e-pluralizacao fechado
- [Phase ?]: 08-11: import auto-renomeia slug em colisao (suffix do pack final, ocupados acumulados) e avisa por toast + tela de sucesso; selecao mantem prompt (E-01/E-02)

### Pending Todos

- `i18n-import-successcount-plural` — "1 magias." no import e ramo morto do "Também em" (achados do 08-12)

`.planning/codebase/CONCERNS.md` holds candidate future maintenance items not yet promoted to a requirement or phase.

### Blockers/Concerns

- REQUIREMENTS.md's original "16 total" coverage count was stale/incorrect — the actual v2.0 requirement list has 19 items (PKG×5, STOR×3, MGMT×5, SRD×3, MIGR×3). Corrected during roadmap creation (2026-07-18); traceability table now reflects all 19, mapped 1:1 to Phases 2-6.
- Research flags Phase 6 (Decommissioning & Migration) as needing a deeper pass during planning: the migration-detection logic for existing `localStorage` character data is novel to this codebase (no prior versioned-migration pattern to copy).
- Research flags Phase 3 as needing a concrete file-size cap decided during planning (no byte threshold proposed yet) and a scoping call on whether to add a CSP as defense-in-depth alongside DOMPurify.
- No automated frontend test suite exists — all phase verification will be manual browser QA, consistent with the rest of the project.

### Roadmap Evolution

- Phase 8 added (2026-09-27): Composição aditiva de pacotes — pacote base + homebrew empilhado que adiciona magias em vez de substituir; entra antes de fechar o marco v2.0
- Phase 04.1 inserted after Phase 4: Desacoplar o idioma da interface do idioma do pacote - pre-requisito da Fase 6, levantado no checkpoint 04-04 (URGENT)

## Quick Tasks Completed

| Date | Slug | Result |
|------|------|--------|
| 2026-08-10 | spell-card-stale-index | Spell cards opened the wrong spell after filtering — memo'd card kept a stale index closure. Callbacks made identity-stable + spell-argument based; static check added. |

## Deferred Items

Items acknowledged and deferred at milestone close on 2026-10-21:

| Category | Item | Status |
|----------|------|--------|
| verification | Phase 08: 08-VERIFICATION.md | human_needed |
| todo | bandeiras-do-toggle-nao-renderizam-no-windows | pending |
| todo | i18n-import-successcount-plural | pending |
| todo | review-04-1-warnings | pending |
| todo | review-05-warnings | pending |

Known verification overrides: 5. Phases 09-11 were done outside GSD (no PLAN/SUMMARY/VERIFICATION).

## Session Continuity

Last session: 2026-10-04T22:38:01.147Z
Stopped at: Completed 08-11-PLAN.md
Resume file: None

## Operator Next Steps

- Start the next milestone with /gsd-new-milestone
