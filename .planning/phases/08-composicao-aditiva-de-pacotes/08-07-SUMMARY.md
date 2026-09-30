---
phase: 08-composicao-aditiva-de-pacotes
plan: 07
subsystem: verification
tags: [checkpoint, human-verify, pack-composition, i18n, meta-image, gap-planning]

# Dependency graph
requires:
  - phase: 08-composicao-aditiva-de-pacotes
    plan: "08-06"
    provides: "Composição aditiva completa na UI (PackMenu/PackMenuChip, seleção em lista, meta.image, migração de versionKey, sw.js grimorio-v5) pronta para verificação visual"
provides:
  - "Veredito humano por item (1-10) e por requisito para o checkpoint de composição aditiva da Fase 8 — NOT APPROVED"
  - "4 gaps (GAP-1..GAP-4) documentados para consumo por /gsd-plan-phase 8 --gaps"
  - "Decisão explícita de NÃO fechar o todo i18n-toast-versao-e-pluralizacao (gate items 4+8 não satisfeito)"
affects: [gap-planning-fase-8, MGMT-06, MGMT-07, MGMT-08, MGMT-09, PKG-06, SRD-05, MIGR-04]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified: []

key-decisions:
  - "Checkpoint 08-07 (Task 2) reprovado: item 8 FALHOU (mensagem de imagem inválida confusa, GAP-4); item 5 passou parcialmente (mecânica de colisão confirmada, passo de exportação/D-14 não confirmado); itens 1, 2, 3, 4, 6, 7, 9, 10 permanecem UNVERIFIED por declaração explícita do usuário — nenhum foi marcado como aprovado sem confirmação visual"
  - "Todo i18n-toast-versao-e-pluralizacao NÃO foi movido para completed — a Task 3 do plano só executa se os itens 4 E 8 passarem; item 4 está UNVERIFIED e item 8 FALHOU, então o gate da própria Task 3 bloqueia a execução (não é um desvio, é a lógica condicional do plano operando como projetado)"
  - "GAP-2 propõe substituir o fluxo de prompt de renomeação no import (D-09..D-12) por auto-rename silencioso + toast de aviso ('Sem prompt, com aviso', escolha do usuário) — se o caminho de colisão na SELEÇÃO (D-10/A-14, PackRenameDialog via pack-manager._selectionConflicts) também deve virar auto-rename fica em aberto, registrado como pergunta para o planejador de gaps, não decidido aqui"
  - "GAP-3 propõe mudar a decisão D-17/PKG-06 para aceitar também URL externa https:// em meta.image, além do data: URI atual — isso contradiz o texto vigente de PKG-06 ('nunca URL externa') em REQUIREMENTS.md, que já está marcado [x] Complete desde 08-02; o planejador de gaps deve tratar isso como revisão de requisito, não só como correção de bug, e cobrir CSP img-src, cache do service worker e implicações de privacidade"
  - "Nenhum requirement (MGMT-06, MGMT-07, MGMT-08, MGMT-09, PKG-06, SRD-05, MIGR-04) foi marcado como completo nesta execução — o checkpoint que os confirmaria reprovou; requirements.mark-complete não foi chamado"

requirements-completed: []  # Checkpoint reprovado (Task 2) — nenhum dos 7 requisitos do plano foi confirmado. Ver "## Veredito por Requisito" abaixo. PKG-06 já aparece [x] Complete em REQUIREMENTS.md desde 08-02; esta execução não altera esse estado, mas sinaliza que GAP-3 contradiz o texto vigente do requisito.

coverage:
  - id: D1
    description: "Soma aditiva: SRD 5.2 + homebrew marcados somam magias na grade, cada uma com o src do seu pacote no rodapé (MGMT-06, D-01/D-02/D-20)"
    requirement: "MGMT-06"
    verification:
      - kind: manual_procedural
        ref: "Checkpoint 08-07 Task 2, item 1"
        status: unknown
    human_judgment: true
    rationale: "Item 1 explicitmente listado como não verificado pelo usuário. GAP-1 (bug de exibição de fonte/src em magias de pack sem src por magia) foi encontrado incidentalmente durante a checagem de outro item e afeta diretamente esta verdade — mas o roteiro completo do item 1 não foi executado."
  - id: D2
    description: "Idioma por magia e mútua exclusão SRD 5.1/5.2, com 'Também em' no detalhe (SRD-05, D-03/D-06/D-22)"
    requirement: "SRD-05"
    verification:
      - kind: manual_procedural
        ref: "Checkpoint 08-07 Task 2, itens 2 e 3"
        status: unknown
    human_judgment: true
    rationale: "Itens 2 e 3 explicitamente não verificados pelo usuário."
  - id: D3
    description: "Seleção vazia mantém a grade cheia com o pacote padrão e mostra aviso no idioma da interface (MGMT-08, D-04)"
    requirement: "MGMT-08"
    verification:
      - kind: manual_procedural
        ref: "Checkpoint 08-07 Task 2, item 4"
        status: unknown
    human_judgment: true
    rationale: "Item 4 explicitamente não verificado pelo usuário — e é justamente um dos dois itens que condicionam o fechamento do todo dobrado na Task 3."
  - id: D4
    description: "Import com slug reservado abre prompt de renomeação com sugestão de sufixo; cancelar não instala; aplicar sufixo instala com o slug novo (MGMT-07, D-09..D-12)"
    requirement: "MGMT-07"
    verification:
      - kind: manual_procedural
        ref: "Checkpoint 08-07 Task 2, item 5"
        status: pass
      - kind: manual_procedural
        ref: "Checkpoint 08-07 Task 2, itens 6 e 7"
        status: unknown
    human_judgment: true
    rationale: "Mecânica do prompt de colisão no import (item 5) confirmada pelo usuário: linha `fireball`, os 3 donos SRD, sugestão `fireball-qa-reservado`, erro inline de formato/slug reservado. O passo de exportação (D-14, confirmar que o pack exportado carrega o slug renomeado) e os itens 6/7 (colisão na seleção, preparadas órfãs) não foram confirmados. Além disso, GAP-2 propõe substituir esse fluxo de prompt por auto-rename silencioso — supersedendo D-09..D-12 como decisão vigente, independente da confirmação visual."
  - id: D5
    description: "Menu único de pacotes: cartões com imagem/marcador, descrição truncada, seção de slugs reservados, chip 'primeiro + N', mensagem de imagem inválida (MGMT-09, PKG-06, D-15..D-19)"
    requirement: "MGMT-09"
    verification:
      - kind: manual_procedural
        ref: "Checkpoint 08-07 Task 2, item 8"
        status: fail
    human_judgment: true
    rationale: "Sub-partes confirmadas: marcador colorido + inicial em cartões sem imagem, descrição truncada numa linha, chip mostrando 'QA PT-BR', grade com 1 resultado ao marcar só o pacote QA. FALHOU: a mensagem de rejeição de imagem inválida foi reportada como confusa/ruim (GAP-4). GAP-1 (fonte/src não exibida corretamente) também foi observado nesta mesma rodada de verificação, embora pertença conceitualmente ao item 1."
  - id: D6
    description: "versionKey legado migra para seleção em lista na primeira carga; ?v= com lista abre com os itens marcados (MIGR-04, D-23/D-24)"
    requirement: "MIGR-04"
    verification:
      - kind: manual_procedural
        ref: "Checkpoint 08-07 Task 2, item 9"
        status: unknown
    human_judgment: true
    rationale: "Item 9 explicitamente não verificado pelo usuário."
  - id: D7
    description: "Todo dobrado i18n-toast-versao-e-pluralizacao movido para completed com a resolução registrada"
    verification:
      - kind: other
        ref: "Task 3 do plano — gate: só executa se itens 4 E 8 do checkpoint passarem"
        status: fail
    human_judgment: false
    rationale: "Determinístico, não julgamento humano: o arquivo permanece em .planning/todos/pending/i18n-toast-versao-e-pluralizacao.md. Item 4 está UNVERIFIED e item 8 FALHOU, então a pré-condição da Task 3 não foi satisfeita — Task 3 não foi executada, por design do plano."

duration: "~15min nesta sessão (registro do veredito, decisão da Task 3, SUMMARY); a Task 1 (suíte verde, fixtures, servidor, fumaça) rodou numa sessão anterior e não foi re-cronometrada aqui"
completed: 2026-09-30
status: blocked
---

# Phase 8 Plan 07: Checkpoint de composição aditiva — NOT APPROVED, 4 gaps abertos Summary

**Checkpoint humano da Fase 8 reprovado: item 8 (menu de pacotes/mensagem de imagem inválida) falhou e 8 dos 10 itens do roteiro ficaram sem verificação visual; a mecânica de colisão de import (item 5) foi confirmada em parte. Quatro gaps (GAP-1..GAP-4) documentados para `/gsd-plan-phase 8 --gaps`; o todo dobrado `i18n-toast-versao-e-pluralizacao` permanece em `pending` porque seu próprio gate (itens 4 e 8 do checkpoint) não foi satisfeito.**

## Performance

- **Tasks:** 2 de 3 (Task 1 executada em sessão anterior sem commit — não altera arquivos do repositório; Task 2 concluída com veredito registrado; Task 3 corretamente NÃO executada por gate próprio do plano)
- **Files modified:** 0 (além deste SUMMARY.md)
- **Completed:** 2026-09-30

## Accomplishments

- Veredito por item (1-10) e por requisito registrado abaixo, com base no texto literal do usuário — nenhum critério foi declarado passado sem confirmação visual explícita.
- 4 gaps concretos extraídos e formatados para o planejador de gaps da Fase 8.
- Decisão de manter o todo dobrado em `pending` documentada e justificada pelo próprio gate da Task 3 (não é uma omissão — é a lógica condicional do plano operando corretamente).
- `git status --porcelain` confirmado limpo de artefatos de QA ao retomar esta sessão (única modificação pré-existente e não relacionada: `favicon.svg`, `grimorio-do-jogador.code-workspace`, ambos fora do escopo deste plano e não tocados).

## Task Commits

1. **Task 1: Preparar o checkpoint** — sem commit (nenhum arquivo do repositório modificado, conforme o próprio plano)
2. **Task 2: Checkpoint humano** — sem commit de código (veredito registrado neste SUMMARY)
3. **Task 3: Fechar o todo dobrado** — NÃO EXECUTADA (gate: itens 4 e 8 precisam passar; item 4 UNVERIFIED, item 8 FAIL)

**Plan metadata:** commit deste SUMMARY.md (docs)

## Files Created/Modified

Nenhum arquivo de código ou de dados foi criado ou modificado por este plano. Único artefato: este `08-07-SUMMARY.md`.

## Veredito por Item (Task 2, roteiro `how-to-verify`)

| # | Item | Veredito | Evidência / nota |
|---|------|----------|-------------------|
| 1 | Soma (D-01, D-02, D-20 — MGMT-06) | **UNVERIFIED** | Não conferido pelo usuário. GAP-1 (fonte/src não exibida corretamente) foi observado incidentalmente e afeta este item, mas o roteiro completo não rodou. |
| 2 | Idioma por magia (D-06) | **UNVERIFIED** | Não conferido pelo usuário. |
| 3 | SRD mútua exclusão + "Também em" (D-03) | **UNVERIFIED** | Não conferido pelo usuário. |
| 4 | Seleção vazia (D-04 — MGMT-08) | **UNVERIFIED** | Não conferido pelo usuário. Condiciona a Task 3 (junto com o item 8). |
| 5 | Import com colisão (D-09..D-12 — MGMT-07) | **PASS (parcial)** | Confirmado: linha `fireball`, os 3 donos SRD, sugestão `fireball-qa-reservado`, erro inline de slug reservado. Não confirmado: exportação pós-renomeação (D-14), fluxo completo "aplicar sufixo a todas → instalado". GAP-2 propõe substituir este fluxo inteiro por auto-rename silencioso, supersedendo D-09..D-12 independentemente deste veredito. |
| 6 | Seleção com colisão (D-10, A-14) | **UNVERIFIED** | Não conferido pelo usuário. |
| 7 | Preparadas órfãs (D-13) | **UNVERIFIED** | Não conferido pelo usuário. Condiciona a verificação da proibição WR-relacionada a D-13 no frontmatter do plano, que permanece `unverified`. |
| 8 | Menu de pacotes (D-15..D-19 — MGMT-09, PKG-06) | **FAIL** | Confirmado: marcador colorido + inicial (cartões sem imagem), descrição truncada numa linha, chip "QA PT-BR", grade com 1 resultado ao marcar só o pacote QA. Falhou: mensagem de imagem inválida confusa/ruim (GAP-4). Não confirmado: exibição da imagem do `qa-reservado` (cartão COM imagem). |
| 9 | Migração (D-23, D-24 — MIGR-04) | **UNVERIFIED** | Não conferido pelo usuário. |
| 10 | Cache (`grimorio-v5`) | **UNVERIFIED** | Não conferido pelo usuário. |

## Veredito por Requisito

| Requisito | Status | Nota |
|-----------|--------|------|
| MGMT-06 | UNVERIFIED | Item 1 não conferido; GAP-1 é bug direto sobre a verdade "src do pacote no rodapé". |
| MGMT-07 | UNVERIFIED + AFETADO POR GAP-2 | Item 5 passou parcialmente, itens 6/7 não conferidos; GAP-2 supersede o fluxo de prompt (D-09..D-12) por auto-rename silencioso — mudança de decisão, não só de implementação. |
| MGMT-08 | UNVERIFIED | Item 4 não conferido. |
| MGMT-09 | FAIL | Item 8 falhou (GAP-4); sub-partes do menu passaram. |
| PKG-06 | AFETADO POR GAP-3 e GAP-4 | REQUIREMENTS.md já marca PKG-06 como `[x]` Complete desde 08-02. GAP-3 pede aceitar URL externa https:// em `meta.image`, o que contradiz o texto vigente do requisito ("nunca URL externa") — o planejador de gaps deve tratar isso como revisão do requisito, não apenas correção de bug. GAP-4 (mensagem de rejeição ruim) também toca este requisito. |
| SRD-05 | UNVERIFIED | Itens 2 e 3 não conferidos. |
| MIGR-04 | UNVERIFIED | Item 9 não conferido. |

**Nenhum requisito foi marcado como completo nesta execução** (`requirements.mark-complete` não foi chamado).

## Gaps para `/gsd-plan-phase 8 --gaps`

### GAP-1 (bug) — Fonte da magia ("fonte") não exibida corretamente

No painel de detalhe, o campo FONTE renderiza `· 2024` — o nome da fonte está ausente e o
separador fica órfão. No rodapé do card aparece `V S M · —`. Afeta magias instaladas via
pack sem `src` por magia (ex.: `qa-ptbr`). Pacotes instalados devem exibir o nome do
pacote/fonte, e o separador (`·`) não deve renderizar quando uma das partes está vazia.

### GAP-2 (mudança de UX, supersede D-09..D-12) — Sem prompt no import, com aviso

Ao colidir slug durante o import, NÃO mostrar o prompt de renomeação. Aplicar
automaticamente o sufixo (ex.: `fireball` → `fireball-qa-reservado`), instalar, e mostrar um
toast listando quais slugs foram renomeados. Escolha do usuário: "Sem prompt, com aviso".

**Pergunta aberta para o planejador de gaps:** se o caminho de colisão na SELEÇÃO
(`pack-manager._selectionConflicts` → `PackRenameDialog`, D-10/A-14) também deve virar
auto-rename — não decidido aqui, registrar como questão em aberto.

### GAP-3 (mudança de decisão, supersede D-17/PKG-06) — `meta.image` deve aceitar URL externa https://

`meta.image` deve aceitar também uma URL de imagem externa `https://` (não só `data:` URI).
O planejador precisa tratar: CSP `img-src`, cache/service-worker, validação (só `https`,
raster), e implicações de privacidade. Contradiz o texto vigente de PKG-06 ("nunca URL
externa") — é revisão de requisito, não só de implementação.

### GAP-4 (UX) — Mensagem de erro de imagem inválida é ruim

A mensagem atual ("Imagem do pacote precisa ser um data: URI de imagem
(PNG/JPEG/WebP/GIF).") é confusa. Reescrever, e ajustar às novas regras do GAP-3.

## Decisions Made

Ver `key-decisions` no frontmatter — resumo: checkpoint reprovado, todo dobrado não
fechado (gate próprio não satisfeito), GAP-2 e GAP-3 são mudanças de decisão que
supersedem D-09..D-12 e D-17 respectivamente e devem ser tratadas como tal pelo
planejador de gaps, não como simples correções.

## Deviations from Plan

None - plan executado exatamente como escrito. A Task 3 não foi executada porque seu
próprio gate condicional (itens 4 e 8 do checkpoint) não foi satisfeito — isso é o
plano funcionando como projetado, não um desvio.

## Issues Encountered

- Checkpoint (Task 2) reprovado: ver veredito por item acima. Item 8 falhou (GAP-4);
  8 dos 10 itens permanecem sem verificação visual.
- Prohibição do frontmatter do plano ("MUST NOT escrever em prepared/bookmarked... por
  outro caminho que não os toggles do usuário", D-13) tinha como método de verificação
  "conferido no item 7 do checkpoint" — item 7 não foi conferido pelo usuário, então essa
  prohibição permanece **unverified**, não confirmada.
- `git status --porcelain` no início desta sessão mostrou apenas `favicon.svg` e
  `grimorio-do-jogador.code-workspace` modificados (mudanças do usuário, não relacionadas
  a este plano, não tocadas) e um `.gitkeep` não rastreado na pasta da fase — nenhum
  artefato de QA vazou para o repositório (confirma a proibição WR-12 do plano).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Fase 8 NÃO está pronta para fechar. Próximo passo: `/gsd-plan-phase 8 --gaps` com
  GAP-1..GAP-4 acima, incluindo a pergunta em aberto do GAP-2 sobre o caminho de seleção.
- Depois dos gaps resolvidos e implementados, um novo checkpoint (ou a repetição deste
  roteiro de 10 itens) precisa confirmar os itens ainda UNVERIFIED (1, 2, 3, 4, 6, 7, 9, 10)
  e a correção dos itens 5 (parte não confirmada) e 8 (GAP-4).
- O todo dobrado `i18n-toast-versao-e-pluralizacao` continua em
  `.planning/todos/pending/` — só pode fechar quando os itens 4 e 8 do checkpoint
  passarem.

---
*Phase: 08-composicao-aditiva-de-pacotes*
*Completed: 2026-09-30 (checkpoint reprovado — ver gaps)*

## Self-Check: PASSED

- FOUND: `.planning/phases/08-composicao-aditiva-de-pacotes/08-07-SUMMARY.md` (este arquivo)
- FOUND: `.planning/todos/pending/i18n-toast-versao-e-pluralizacao.md` (confirmado ainda em pending, como declarado)
- CONFIRMED: `.planning/todos/completed/i18n-toast-versao-e-pluralizacao.md` NÃO existe (todo corretamente não movido)
- CONFIRMED: `git status --porcelain` sem artefatos de QA (apenas `favicon.svg`,
  `grimorio-do-jogador.code-workspace` pré-existentes e um `.gitkeep` não rastreado, nenhum
  relacionado a este plano)

O veredito do checkpoint (item 8 FAIL, 8 itens UNVERIFIED) está registrado como NOT
APPROVED, não como sucesso — isso não é uma falha do self-check, é o resultado real e
esperado documentado com precisão.
