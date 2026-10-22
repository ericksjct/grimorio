---
phase: 07-traducao-srd-ptbr
plan: 05
subsystem: content-pipeline
tags: [srd, ptbr, checkpoint, human-verify, i18n]

# Dependency graph
requires:
  - phase: 07-traducao-srd-ptbr
    plan: 04
    provides: srd-2024-ptbr.json registrado, precache grimorio-v4, fallback D-08, banner de transição
provides:
  - "Veredito humano registrado para os 7 itens do checkpoint D-15/D-06/D-07/D-08/D-13/SRD-02/D-05"
  - "Veredito por critério de sucesso da Fase 7 (5/5 aprovados)"
  - "SRD-04 fechado em REQUIREMENTS.md"
  - "mdTableToHtml empilha tabelas de atributo de criatura (>8 células) em 4 colunas em vez de 12 lado a lado — corrige overflow em 390px"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "gate scripts/check-srd-ptbr-pack.tests.ps1 falha se alguma linha de tabela tiver mais de 8 células — trava contra regressão do overflow de tabela de atributos"

key-files:
  created: []
  modified:
    - scripts/generate-srd-pack.mjs
    - scripts/check-srd-ptbr-pack.tests.ps1
    - srd-2024-ptbr.json

key-decisions:
  - "[Rule 1] Tabela de atributo de criatura (12 colunas, For/Des/Con lado a lado) empilhada em 4 colunas (um atributo por linha) em mdTableToHtml — 12 colunas a ~450px estourava o painel de detalhe (350px em 390px de viewport, 379px no desktop); achado durante a checagem humana do item D-15 (animate-objects, find-steed, giant-insect, summon-dragon)"
  - "roteiro do checkpoint chamava fire-bolt de 'Rajada de Fogo'; o displayName real da fonte é 'Raio de Fogo' — não é defeito, é erro do roteiro"

requirements-completed: [SRD-04]

coverage:
  - id: D1
    description: "Primeira visita em navegador pt-BR abre no pacote 'SRD 5.2 (PT-BR)', lista em português, sem banner de transição (D-06)"
    requirement: SRD-04
    verification:
      - kind: manual_procedural
        ref: "checkpoint item 1 — perfil novo do Chrome com locale pt-BR"
        status: pass
    human_judgment: true
    rationale: "Renderização visual e comportamento de primeira visita só são verificáveis olhando a tela"
  - id: D2
    description: "Amostra de 11 magias (augury, giant-insect, calm-emotions, magic-circle, private-sanctum, arcane-hand, acid-arrow, fireball, fire-bolt, alarm, resilient-sphere) confere na tela contra o Markdown de origem — tabela, lista, seção de círculo superior, aprimoramento de truque, sem legenda/nome próprio/`**` cru/título duplicado (D-15)"
    requirement: SRD-04
    verification:
      - kind: manual_procedural
        ref: "checkpoint item 2 — 11 magias abertas no painel de detalhe em 390x844 e desktop"
        status: pass
    human_judgment: true
    rationale: "D-15 exige exame visual magia por magia; gates automáticos provam estrutura, não legibilidade na tela"
  - id: D3
    description: "Filtro de classe Patrulheiro mostra Alarme (nome-fonte Guardião)"
    requirement: SRD-04
    verification:
      - kind: manual_procedural
        ref: "checkpoint item 3"
        status: pass
    human_judgment: true
    rationale: "Confirma o mapeamento de classe visualmente na UI"
  - id: D4
    description: "Identidade D-13: Bola de Fogo e Mão Arcana preparadas no pack pt-BR continuam preparadas ao trocar para SRD 5.2 (EN)"
    requirement: SRD-04
    verification:
      - kind: manual_procedural
        ref: "checkpoint item 4"
        status: pass
    human_judgment: true
    rationale: "Comportamento de estado entre trocas de versão, verificado na UI real"
  - id: D5
    description: "Chaves legadas spells-5E-2014-PTBR e spells-5E-2024-PTBR redirecionam para srd-2024-ptbr; spells-5E-2014-EN para srd-2014-en; banner de transição visível (D-07/D-08)"
    requirement: SRD-04
    verification:
      - kind: e2e
        ref: "orquestrador via Chrome headless — 3 chaves legadas testadas, banner 'o SRD 5.2 agora também em português' confirmado"
        status: pass
    human_judgment: false
  - id: D6
    description: "Gerenciador de pacotes mostra a licença da linha SRD 5.2 (PT-BR) na ordem: atribuição WotC -> Licença Heróis Anônimos -> nota de modificação (SRD-02)"
    requirement: SRD-04
    verification:
      - kind: manual_procedural
        ref: "checkpoint item 6"
        status: pass
    human_judgment: true
    rationale: "Ordem e conteúdo verbatim do texto de licença exigem leitura humana"
  - id: D7
    description: "Cache Storage: só grimorio-v4 com srd-2024-en.json, srd-2014-en.json, srd-2024-ptbr.json; sem grimorio-v3 residual (D-05)"
    requirement: SRD-04
    verification:
      - kind: e2e
        ref: "orquestrador via Chrome headless — Application > Cache Storage inspecionado"
        status: pass
    human_judgment: false
  - id: D8
    description: "Bug de overflow encontrado durante o checkpoint: tabela de atributo de criatura (12 colunas) estourava o painel de detalhe — corrigido empilhando em 4 colunas, gate reforçado, sem overflow em 390x844/1440x900 em nenhuma das 14 magias pt-BR com tabela"
    requirement: SRD-04
    verification:
      - kind: unit
        ref: "pwsh scripts/check-srd-ptbr-pack.tests.ps1 (falha em linha de tabela >8 células; passa no pack novo)"
        status: pass
      - kind: e2e
        ref: "orquestrador via Chrome headless — scan das 14 magias pt-BR com tabela em 390x844 e 1440x900, sem overflow"
        status: pass
    human_judgment: false

duration: ~25min
completed: 2026-09-27
status: complete
---

# Phase 7 Plan 5: Checkpoint humano de fechamento — magias em português na tela Summary

**Veredito humano aprovado nos 7 itens do checkpoint (D-15, D-06, D-07/D-08, D-13, SRD-02, D-05); um bug de overflow de tabela de atributos foi achado e corrigido durante a verificação (Rule 1) — SRD-04 fechado**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-09-27
- **Tasks:** 2 (Task 1 automação, Task 2 checkpoint humano)
- **Files modified:** 0 desta plan diretamente; 3 arquivos corrigidos durante o checkpoint (deviation, ver abaixo)

## Accomplishments

- Task 1: `npm test` verde, prova `node` da amostra de 11 magias saiu 0, servidor local em `http://localhost:8123` respondendo 200 — cenário do checkpoint preparado sem intervenção do usuário
- Task 2: usuário conferiu na tela os 7 itens do roteiro (primeira visita D-06, amostra D-15 de 11 magias, filtro de classe, identidade D-13, chaves legadas D-07/D-08, atribuição SRD-02, Cache Storage D-05) — **todos aprovados**
- Durante a checagem da amostra (item 2), o usuário reportou uma tabela de atributos de criatura estourando a tela em 4 magias (animate-objects, find-steed, giant-insect, summon-dragon); corrigido na hora: `mdTableToHtml` agora empilha tabelas de atributo (>8 células por linha) em 4 colunas, e o gate `check-srd-ptbr-pack.tests.ps1` passou a falhar se alguma linha de tabela tiver mais de 8 células
- Os 5 critérios de sucesso da Fase 7 no ROADMAP foram verificados e aprovados (ver seção abaixo)
- `SRD-04` marcado completo em `REQUIREMENTS.md`

## Task Commits

Task 1 não altera arquivos (nenhum commit). Task 2 (checkpoint humano) também não altera arquivos por si só — o único código tocado nesta plan foi o auto-fix aplicado durante a verificação do item 2, já commitado antes desta sessão de fechamento:

1. **Fix de overflow da tabela de atributos (Rule 1, achado no checkpoint)** - `1acbbd9` (fix) — pré-existente ao fechamento desta plan, já no histórico ao iniciar a continuação

**Plan metadata:** ver commit final abaixo (docs: complete plan)

## Files Created/Modified

- `scripts/generate-srd-pack.mjs` - `mdTableToHtml` empilha tabela de atributo de criatura (12 colunas) em 4 colunas quando a linha tem mais de 8 células
- `scripts/check-srd-ptbr-pack.tests.ps1` - gate falha se alguma linha de tabela do pack pt-BR tiver mais de 8 células
- `srd-2024-ptbr.json` - regenerado com as tabelas de atributo empilhadas (animate-objects, find-steed, giant-insect, summon-dragon); EN packs byte-idênticos

## Decisions Made

- Overflow de tabela de atributos resolvido empilhando (1 atributo por linha) em vez de rolagem horizontal ou fonte menor — mantém a tabela legível em 390px sem esconder dado atrás de scroll
- Roteiro do checkpoint tinha um erro de nomenclatura (fire-bolt = "Rajada de Fogo" no roteiro, "Raio de Fogo" na fonte real) — documentado como nota, não como defeito do pack

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Tabela de atributos de criatura estourava o painel de detalhe**
- **Found during:** Task 2 (checkpoint humano, item 2 — amostra D-15)
- **Issue:** A tabela de atributos (12 colunas, For/Des/Con lado a lado) gerada por `mdTableToHtml` em `scripts/generate-srd-pack.mjs` renderizava ~450px de largura, estourando o painel de detalhe (350px em viewport de 390px, 379px no desktop) nas magias animate-objects, find-steed, giant-insect e summon-dragon
- **Fix:** `mdTableToHtml` agora empilha esse tipo de tabela em 4 colunas (um atributo por linha) em vez de 12 colunas lado a lado; `scripts/check-srd-ptbr-pack.tests.ps1` ganhou uma checagem que falha se qualquer linha de tabela tiver mais de 8 células (confirmado: falha no pack antigo, passa no pack novo)
- **Files modified:** `scripts/generate-srd-pack.mjs`, `scripts/check-srd-ptbr-pack.tests.ps1`, `srd-2024-ptbr.json`
- **Verification:** scan headless (Playwright/Chrome) das 14 magias pt-BR com tabela em 390x844 e 1440x900 — sem overflow em nenhuma; EN packs confirmados byte-idênticos
- **Committed in:** `1acbbd9` (fix(07-05): empilha bloco de atributos do pack pt-BR em 4 colunas)

---

**Total deviations:** 1 auto-fixed (1 bug, Rule 1)
**Impact on plan:** Correção necessária para o próprio objetivo do checkpoint (D-15 — legibilidade na tela). Sem scope creep: o fix ficou restrito à função de renderização de tabela e ao gate que a protege.

## Issues Encountered

Nenhum problema além do bug de overflow documentado acima, resolvido durante a própria verificação.

## Checkpoint Verdict (Task 2 — 7 itens)

| # | Item | Veredito |
|---|------|----------|
| 1 | Primeira visita pt-BR (D-06) — versão ativa "SRD 5.2 (PT-BR)", sem banner | **PASSED** (usuário) |
| 2 | Amostra D-15 (11 magias) contra o Markdown de origem | **PASSED** (usuário), com 1 issue achado e corrigido durante a verificação (ver Deviations) |
| 3 | Filtro Patrulheiro mostra Alarme | **PASSED** (usuário) |
| 4 | Identidade D-13 — Fireball/Arcane Hand continuam preparadas ao trocar PT↔EN | **PASSED** (usuário) |
| 5 | Chaves legadas D-07/D-08 (spells-5E-2014-PTBR, spells-5E-2024-PTBR → srd-2024-ptbr; spells-5E-2014-EN → srd-2014-en), banner de transição | **PASSED** (orquestrador, Chrome headless) |
| 6 | Licença SRD-02 na ordem WotC → Licença Heróis Anônimos → nota de modificação | **PASSED** (usuário) |
| 7 | Cache Storage: só grimorio-v4 (srd-2024-en.json, srd-2014-en.json, srd-2024-ptbr.json), sem grimorio-v3 | **PASSED** (orquestrador, Chrome headless) |

**Nota lateral:** o roteiro do checkpoint chamava fire-bolt de "Rajada de Fogo"; o displayName real da fonte é "Raio de Fogo" — erro do roteiro, não do pack.

## Success Criteria da Fase 7 (ROADMAP.md)

| # | Critério | Veredito |
|---|----------|----------|
| 1 | Navegador pt-BR na primeira visita abre "SRD 5.2 (PT-BR)" e lê as 339 magias em português (D-05, D-06) | **PASSED** — checkpoint itens 1 e 7 |
| 2 | Chave legada `*-PTBR` volta ao português sozinha; preparadas/favoritas resolvem pelo slug EN (D-07, D-08, D-13) | **PASSED** — checkpoint itens 4 e 5 |
| 3 | Atribuição verbatim WotC + Heróis Anônimos, nota de modificação, visível no gerenciador de pacotes (D-02, D-04, SRD-02) | **PASSED** — checkpoint item 6 |
| 4 | Exatamente as 339 magias de `srd-2024-en.json`, círculo/escola batendo, sem nome próprio do PHB nem legenda (D-01, D-14, D-16, D-18) | **PASSED** — gates de fases anteriores (07-01/07-02, `npm test` verde) + checkpoint item 2 (amostra na tela) |
| 5 | Documento completo do Heróis Anônimos e fixtures legados nunca entram no repositório — só o recorte versionado (D-02, D-09, D-10, D-17) | **PASSED** — verificado estruturalmente em 07-01 (fixtures em `.cache/`, não versionados); não reexaminado nesta plan por não fazer parte do roteiro do checkpoint |

**5/5 critérios de sucesso da Fase 7 aprovados. SRD-04 fechado.**

## User Setup Required

None - nenhuma configuração de serviço externo necessária. `favicon.svg` e `srd-2024-en.json` (alterações próprias do usuário, pré-existentes e não relacionadas) permaneceram intocados durante toda a execução — nunca staged, nunca commitados.

## Next Phase Readiness

- Fase 7 completa: 5/5 plans executados, 5/5 critérios de sucesso do ROADMAP aprovados, `SRD-04` fechado em `REQUIREMENTS.md`.
- `npm test` verde no momento do fechamento.
- Nenhum gap aberto — todos os 7 itens do checkpoint e os 5 critérios de sucesso foram aprovados sem ressalvas pendentes.
- Sem blockers para o próximo milestone/fase.

---
*Phase: 07-traducao-srd-ptbr*
*Completed: 2026-09-27*

## Self-Check: PASSED

Commit `1acbbd9` confirmado em `git log`. `scripts/generate-srd-pack.mjs`, `scripts/check-srd-ptbr-pack.tests.ps1` e `srd-2024-ptbr.json` confirmados no disco. `npm test` reexecutado nesta sessão de fechamento e terminou com `All test scripts passed.`
