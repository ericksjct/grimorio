---
phase: 06-decommissioning-migration
plan: 06
subsystem: migration
tags: [checkpoint, uat, human-verify, decommissioning, migration-banner]

# Dependency graph
requires:
  - phase: 06-decommissioning-migration
    provides: "06-01 (fallback D-04 + resolvableSpellKeys + nome/markdown do adaptador), 06-02 (peekBookmarks), 06-03 (secao de orfas), 06-04 (transition-banner), 06-05 (remocao atomica dos 4 JSONs + bump grimorio-v2), 06-07 (peekCharacters, fechamento dos gaps 1 e 2 do teste 5)"
provides:
  - "Veredito humano registrado dos 4 criterios de sucesso do ROADMAP para a Fase 6 (MIGR-01, MIGR-02, MIGR-03)"
  - "Contabilidade encerrada dos dois todos incorporados ao escopo da fase"
affects: [encerramento-fase-06, milestone-v2.0]

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - .planning/todos/pending/srd-pack-nomes-slug-e-markdown-cru.md
    - .planning/todos/completed/srd-pack-nomes-slug-e-markdown-cru.md
    - .planning/todos/pending/review-05-warnings.md

key-decisions:
  - "O veredito do checkpoint humano (Task 1) ja estava integralmente registrado em 06-UAT.md antes desta execucao — nao foi refeito, apenas consolidado e citado aqui teste a teste, conforme o objetivo desta plan"
  - "srd-pack-nomes-slug-e-markdown-cru fechado por mudanca de status + mudanca de diretorio (pending/ -> completed/), seguindo a convencao ja em uso no repositorio (ha precedente em .planning/todos/completed/)"
  - "review-05-warnings NAO foi fechado — WR-01 foi marcada resolvida com gate e SHA citaveis, WR-02 e as demais Warning/Info permanecem inalteradas e o todo continua status: pending"

patterns-established: []

requirements-completed: [MIGR-01, MIGR-02, MIGR-03]

coverage:
  - id: D1
    description: "Criterio 1 do ROADMAP — o que ainda resolve funciona exatamente como antes (MIGR-01)"
    requirement: "MIGR-01"
    verification:
      - kind: manual_procedural
        ref: ".planning/phases/06-decommissioning-migration/06-UAT.md#1-o-que-ainda-resolve-funciona-como-antes-migr-01-critério-1"
        status: pass
    human_judgment: true
    rationale: "Criterio de sucesso de fase que exige olho humano em 390x844 nos dois temas (banner, legibilidade, ausencia de markdown cru) — ja coletado e registrado em 06-UAT.md, nao redelegavel a gate estatico."
  - id: D2
    description: "Criterio 2 do ROADMAP — o que nao resolve mais e sinalizado, dado do usuario intacto byte a byte (MIGR-01)"
    requirement: "MIGR-01"
    verification:
      - kind: manual_procedural
        ref: ".planning/phases/06-decommissioning-migration/06-UAT.md#2-o-que-não-resolve-mais-é-sinalizado-migr-01-critério-2"
        status: pass
    human_judgment: true
    rationale: "Exige comparacao byte a byte de hifi_chars_v1/hifi_bookmarks_v1 antes/depois de uma atualizacao real e conferencia visual da secao de orfas — coletado em 06-UAT.md teste 2, com as 5 orfas semeadas todas presentes e os dois blobs identicos."
  - id: D3
    description: "Criterio 3 do ROADMAP — os 4 JSONs protegidos saem do site publicado e do HEAD, precache lista so os 2 SRD (MIGR-02)"
    requirement: "MIGR-02"
    verification:
      - kind: unit
        ref: "scripts/check-decommission.tests.ps1 (executado via npm test nesta sessao — All test scripts passed.)"
        status: pass
      - kind: manual_procedural
        ref: ".planning/phases/06-decommissioning-migration/06-UAT.md#3-os-arquivos-saíram-migr-02-critério-3"
        status: pass
    human_judgment: true
    rationale: "A parte estrutural (git ls-files, PRECACHE, BUILTIN_VERSIONS) e travada por gate estatico, mas a troca real do Cache Storage do navegador (grimorio-v1 ausente, grimorio-v2 presente, sem os 4 JSONs, zero requisicoes de rede) so e observavel em DevTools — coletado em 06-UAT.md teste 3."
  - id: D4
    description: "Criterio 4 do ROADMAP — orientacao clara e acionavel na primeira visita pos-atualizacao (MIGR-03)"
    requirement: "MIGR-03"
    verification:
      - kind: manual_procedural
        ref: ".planning/phases/06-decommissioning-migration/06-UAT.md#4-orientação-na-primeira-visita---conteúdo-e-comportamento-migr-03-critério-4"
        status: pass
      - kind: manual_procedural
        ref: ".planning/phases/06-decommissioning-migration/06-UAT.md#6-clareza-do-texto-do-banner-teste-de-aceitação-informal-de-06-context"
        status: pass
    human_judgment: true
    rationale: "Compreensibilidade de texto por uma pessoa que nao conhece o projeto e o proprio teste de aceitacao informal do 06-CONTEXT — nao automatizavel. Coletado em 06-UAT.md testes 4 e 6; teste 6 teve uma rodada de ajuste visual (botao 'Entendi' pouco evidente, corrigido em 45c6570) e foi reaprovado pelo usuario em 2026-09-27 ('Sim, deu pra entender.')."

duration: ~15min
completed: 2026-09-27
status: complete
---

# Phase 06 Plan 06: Checkpoint Humano de Encerramento da Fase Summary

**Os 4 criterios de sucesso do ROADMAP para a Fase 6 (MIGR-01, MIGR-02, MIGR-03) foram conferidos e aprovados pelo usuario — veredito consolidado aqui a partir de `06-UAT.md` — e os dois todos incorporados ao escopo da fase tiveram seu desfecho registrado (um fechado, um reduzido e ainda aberto).**

## Performance

- **Duration:** ~15 min (consolidacao do veredito + Task 2 + `npm test`)
- **Completed:** 2026-09-27
- **Tasks:** 2/2
- **Files modified:** 2 todos (1 fechado/movido, 1 atualizado)

## Veredito do Checkpoint Humano (Task 1)

Esta plan e o checkpoint humano da Fase 6. A verificacao dos 4 criterios ja foi
integralmente executada e registrada em
`.planning/phases/06-decommissioning-migration/06-UAT.md` (status: complete,
7/7 testes com `result: pass`). Este SUMMARY consolida o veredito, criterio a
criterio, citando a evidencia ja coletada:

**Criterio 1 — o que ainda resolve funciona como antes (MIGR-01).**
`06-UAT.md` teste 1: pass. `spellbook-ui-prefs.versionKey` migrou de
`spells-5E-2024-PTBR` para `srd-2024-en` (mesma edicao, D-04); preparadas
sobreviventes renderizadas em Title Case, sem slug, descricoes sem markdown
cru.

**Criterio 2 — o que nao resolve mais e sinalizado (MIGR-01).**
`06-UAT.md` teste 2: pass. Secoes de orfas presentes em `preparadas` e
`favoritas` com contagem e explicacao; as 5 orfas semeadas todas presentes;
`hifi_chars_v1` e `hifi_bookmarks_v1` identicos byte a byte antes/depois.

**Criterio 3 — os arquivos sairam (MIGR-02).**
`06-UAT.md` teste 3: pass. `grimorio-v1` ausente, `grimorio-v2` presente sem
nenhum dos 4 JSONs; `git ls-files | grep -c 'spells-5E'` = 0. Confirmado
nesta sessao: `npm test` roda `scripts/check-decommission.tests.ps1` e
termina `All test scripts passed.`

**Criterio 4 — orientacao na primeira visita (MIGR-03).**
`06-UAT.md` testes 4 e 6: pass. O banner renderiza as tres partes de D-08 com
a contagem correta de D-13, e nao e modal. O teste 6 (clareza de texto, o
teste de aceitacao informal do 06-CONTEXT) teve uma rodada de ajuste: o
usuario reportou o botao "Entendi" pouco evidente (`hifi-btn-ghost`, a
afordancia mais fraca do design system para a unica saida de um banner que
ocupa ~40% da viewport mobile); corrigido em `45c6570` trocando para
`hifi-btn-secondary`. O usuario reaprovou em 2026-09-27: **"Sim, deu pra
entender."**, respondendo as tres perguntas do roteiro (o que mudou, o que
continua salvo, o que fazer) sobre o texto atual do banner.

**Contraprovas.** Instalacao nova (`06-UAT.md` teste 5): pass apos correcao —
a primeira rodada falhou (banner aparecia, `hifi_bookmarks_v1` era criada com
`"[]"`) por dois defeitos em `loadCharacters()`/`loadBookmarks()`, ambos
fechados em 06-07 (`peekCharacters()` + guarda de escrita); reverificado
headless em perfil/origem virgens: banner nao aparece,
`hifi_bookmarks_v1` ausente. Import de orfa (`06-UAT.md` teste 7, D-12): pass
— a magia migra sozinha da secao de orfas para a lista normal apos o import,
sem acao do usuario sobre o dado salvo.

**Veredito final: os 4 criterios do ROADMAP aprovados.** 7/7 testes com
`result: pass` em `06-UAT.md` (teste 5 precisou de uma correcao em 06-07;
teste 6 precisou de um ajuste visual, ambos ja fechados e reverificados antes
desta plan).

## Nota de contexto (nao e desvio desta plan)

A Fase 7, ja concluida, alterou o comportamento do D-08 depois que este
checkpoint foi originalmente roteirizado: as chaves legadas PT-BR agora
redirecionam por **idioma** em vez de por edicao
(`spells-5E-2014-PTBR` -> `srd-2014-en`, `spells-5E-2024-PTBR` ->
`srd-2024-ptbr`), e o banner agora menciona o SRD 5.2 em portugues. Essa
mudanca e posterior a 06-05/06-06 e nao faz parte do escopo desta fase — e
citada aqui apenas como contexto para quem ler este SUMMARY depois e comparar
com o texto do banner atualmente em producao.

## Task Commits

1. **Task 1: Checkpoint humano dos 4 criterios de sucesso** - nenhum arquivo
   alterado (veredito ja registrado em `06-UAT.md` por execucoes anteriores
   desta fase e do checkpoint corretivo)
2. **Task 2: Fechar a contabilidade dos dois todos incorporados ao escopo** -
   `a67c310` (docs)

## Files Created/Modified

- `.planning/todos/completed/srd-pack-nomes-slug-e-markdown-cru.md` - todo
  fechado; registra o desfecho (06-01 Task 2, commit `8719d21`), o gate que
  trava a regressao (`scripts/check-srd-name-and-markdown.tests.ps1`) e o que
  NAO entrou (pipeline de import BYOD nao redesenhado)
- `.planning/todos/pending/review-05-warnings.md` - WR-01 reescrita como
  resolvida na Fase 6 (06-02, commit `8ec6b5a`), citando
  `scripts/check-bookmarks-read-purity.tests.ps1`; cabecalho atualizado de
  "5 Warning e 4 Info" para "4 Warning e 4 Info"; WR-02 e a secao "Demais"
  inalteradas; `status: pending` mantido

## Decisions Made

- O checkpoint humano (Task 1) foi tratado como ja satisfeito: a verificacao
  ocorreu em sessoes anteriores (registrada em `06-UAT.md`, incluindo a
  correcao de 06-07 para o teste 5 e o ajuste visual de `45c6570` para o
  teste 6) e o usuario aprovou explicitamente o texto do banner hoje
  (2026-09-27). Nao havia necessidade de reabrir o cenario de navegador para
  refazer uma verificacao ja concluida e aprovada.
- `srd-pack-nomes-slug-e-markdown-cru` foi fechado por `status: done` +
  movimentacao de diretorio (`pending/` -> `completed/`), replicando a
  convencao ja usada por `desacoplar-idioma-ui-da-versao.md` e
  `mobile-botao-instalar-cobre-drawer.md` em `.planning/todos/completed/`.

## Deviations from Plan

None - plan executada exatamente como escrita. O checkpoint humano da Task 1
ja tinha sido cumprido fora desta execucao (conforme o objetivo declarado
desta tarefa: consolidar um veredito ja coletado, nao coletar um novo); a
Task 2 seguiu a acao descrita ao pe da letra.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Fase 6 (Decommissioning & Migration) encerrada: os 4 criterios de sucesso
  do ROADMAP aprovados, MIGR-01/MIGR-02/MIGR-03 completos.
- Nenhum bloqueio para o proximo milestone. `review-05-warnings.md` continua
  pendente por WR-02 e as demais Warning/Info da Fase 5 — nao bloqueia a
  Fase 6, mas deve ser revisitado antes da proxima mudanca em
  `pack-manager.jsx`.

## Self-Check: PASSED

- FOUND: `.planning/todos/completed/srd-pack-nomes-slug-e-markdown-cru.md`
- FOUND: `.planning/todos/pending/review-05-warnings.md` (atualizado)
- CONFIRMADA AUSENTE (esperado — e o ponto do fechamento):
  `.planning/todos/pending/srd-pack-nomes-slug-e-markdown-cru.md`
- FOUND commit `a67c310` em `git log --oneline`
- FOUND commits citados no SUMMARY: `8719d21`, `8ec6b5a`, `45c6570`, `98740fe`
  (todos resolvem via `git cat-file -e`)
- `npm test` executado nesta sessao: `All test scripts passed.`

---
*Phase: 06-decommissioning-migration*
*Completed: 2026-09-27*
