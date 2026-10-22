---
phase: 04-loader-integration-source-dispatch
plan: 04
subsystem: verification
tags: [checkpoint, human-verify, xss, dompurify, boot-order, playwright, uat-debt]

requires:
  - phase: 04-loader-integration-source-dispatch
    provides: "04-01 source dispatch, 04-02 IndexedDB enumeration + single-owner resolution, 04-03 SW precache + hostile-html QA fixture"
provides:
  - "Phase 3 verification debt closed: 03-UAT.md test 5 (carried_to_phase: 4) executed by direct observation, not by substitution"
  - "Boot-order regression found and fixed: index.html now loads plugin-store.jsx before spells-data-loader.jsx (commit 0f55fa6)"
  - "Playwright harness precedent: the three prior plans all substituted browser checks with Node proofs; this checkpoint established that playwright + chromium are already installed in this repo and can drive real-browser state verification"
affects: [04.1, 05, 06]

tech-stack:
  added: []
  patterns:
    - "A silent-degradation guard (`if (!window.dep) return []`) at the top of a boot function is invisible to every structural test and to the agent's own self-check: nothing throws, nothing warns, the list is merely empty. Script load order in index.html is therefore a load-bearing contract and must be asserted, not assumed."
    - "Verifying an override that must be active DURING boot requires intercepting at assignment (Object.defineProperty setter), not polling with setInterval: Babel standalone executes all text/babel scripts in one synchronous pass, so any macrotask-scheduled patch lands after the boot code has already run."

key-files:
  created: []
  modified:
    - index.html
    - scripts/check-source-dispatch.tests.ps1
    - scripts/check-plugin-store.tests.ps1

key-decisions:
  - "FA-3 (first-visit default for English browsers moves from legacy PHB 2024 to SRD 5.2) accepted explicitly by the product owner. Rationale is not preference but roadmap alignment: Phase 6 success criterion 3 removes the 4 protected JSONs and leaves only SRD in the SW precache, so pointing the English default at the PHB would create a default that must be undone two phases later."
  - "Task 2 steps 7 and 9 (control spell renders; no console errors during sinks 3-7) were approved by a blanket 'tá tudo ok' from the product owner rather than itemized observation. Recorded as approved-by-affirmation, not as itemized human observation, because the SUMMARY is the durable record."
  - "Task 3 was executed by the orchestrator via Playwright at the product owner's explicit instruction ('vc testa tudo, toca daí'), not by the human. This substitutes state-level verification (loader API spell counts, IndexedDB reads, console capture) for visual verification. The four render sinks of Task 2 remain human-observed and were NOT re-verified this way."

requirements-completed: [SRD-03]

coverage:
  - id: D1
    description: "First open with zero installs is never empty; the version registry exposes 6 builtin entries; both SRD packs and the legacy datasets all load; class filter empty on SRD 5.1 degrades without breaking the UI"
    requirement: "SRD-03"
    verification:
      - kind: manual
        ref: "04-04 Task 1 steps 2-7, human in a private Chromium window against http://127.0.0.1:8791"
        status: pass
    human_judgment: true
    rationale: "Observed by the product owner: grid filled unaided on D&D 5.5E 2024 with pt interface; window.SPELL_VERSIONS.length returned 6; all six entries listed; SRD 5.1 and 5.2 both loaded with no perceptible latency difference; class filter empty on SRD 5.1 with the rest of the UI intact (FA-4 confirmed as degradation, not defect); all legacy datasets opened normally."
  - id: D2
    description: "An installed IndexedDB pack appears in the selector without reload, renders spells, reports source:'idb' with a packId, and survives a page reload"
    requirement: "SRD-03"
    verification:
      - kind: manual
        ref: "04-04 Task 1 steps 8-12, human observation"
        status: pass
      - kind: integration
        ref: "Playwright: install via installFromFile, reload, assert SPELL_VERSIONS gains a source:'idb' entry and getCurrentSpellVersion().key === the pack key (Task 3 scenario A)"
        status: pass
    human_judgment: true
    rationale: "Step 12 FAILED on first observation - the installed entry vanished from the selector after reload. Root-caused to a boot-order race (see Deviations) and fixed in commit 0f55fa6; the product owner re-verified persistence in the browser afterwards. Scenario A of the Playwright run independently reconfirms the fix at boot."
  - id: D3
    description: "Offline: the app opens with spells, the import dialog opens, and an IndexedDB pack remains selectable with the network down"
    requirement: "SRD-03"
    verification:
      - kind: manual
        ref: "04-04 Task 1 steps 13-15, DevTools Network Offline + reload"
        status: pass
    human_judgment: true
    rationale: "Reported passing by the product owner. Not re-verified by the Playwright harness; SW-offline behavior was left to the human observation that already covered it."
  - id: D4
    description: "Hostile HTML payload does not execute through any of the four dangerouslySetInnerHTML render sinks (card, side panel, detail screen, print sheet)"
    requirement: "PKG-05 (Phase 3 debt), SRD-03"
    verification:
      - kind: manual
        ref: "04-04 Task 2 steps 3-6; product owner reported 'aprovado — 4 sinks limpos', naming all four"
        status: pass
    human_judgment: true
    rationale: "This is 03-UAT.md test 5, formally carried to Phase 4 with the instruction that it be the first thing tested once an imported pack became selectable. Closed by direct human observation of all four sinks. NOT verifiable by the Playwright harness, which checks state rather than render."
  - id: D5
    description: "Sanitization happens at import, before the write: the HTML read back out of IndexedDB carries no payload"
    requirement: "PKG-05 (Phase 3 debt)"
    verification:
      - kind: integration
        ref: "Playwright: window.packImport.installFromFile(hostile-html.json) then window.pluginStore.getPack(id) - see Verification for literal stored values"
        status: pass
    human_judgment: false
    rationale: "Executed in a real Chromium with the real production funnel (installFromFile -> _install: read, validate, sanitize, write) and real DOMPurify. This closes 04-03's explicitly flagged gap, where the strip-actually-happens claim rested on DOMPurify's documented semantics rather than an executed sanitize() call."
  - id: D6
    description: "A dead, orphaned, or unresolvable version preference never yields a blank screen; the selector always reflects the version actually on screen; a broken IndexedDB enumeration degrades to the builtin list"
    requirement: "SRD-03"
    verification:
      - kind: integration
        ref: "Playwright Task 3 scenarios B (deleted pack), C (invented key), D (listPacks rejects at boot), E (two simultaneous tabs)"
        status: pass
    human_judgment: false
    rationale: "All four scenarios opened non-empty with 391 spells on the builtin default, selector consistent with the rendered version, zero uncaught page errors. Scenario D confirms FA-1's failure branch: with listPacks rejecting during boot, the loader warns and degrades to the 6 builtin entries instead of failing."

---

# 04-04: Checkpoints de verificação humana

## O que foi verificado

Os três checkpoints da fase, mais o fechamento da dívida herdada da Fase 3.

A fase existia para provar três garantias em navegador real, porque o projeto não tem suíte de
testes de comportamento — os 23 scripts `check-*.tests.ps1` provam estrutura, não render. Os três
planos anteriores (04-01, 04-02, 04-03) convergiram na mesma limitação e substituíram toda
verificação de navegador por prova em Node, cada um marcando `human_judgment: true` e adiando para
cá.

## Regressão encontrada e corrigida

**O passo 12 do Task 1 falhou:** um pack instalado sumia do seletor após recarregar. Instalar
funcionava, aparecer sem recarga funcionava, renderizar funcionava — só não sobrevivia ao reload.

Causa raiz: `index.html` carregava `spells-data-loader.jsx` **antes** de `plugin-store.jsx`.
O loader chama `refreshPluginVersions()` no boot, e essa função abre com

```js
if (!window.pluginStore || typeof window.pluginStore.listPacks !== 'function') return [];
```

O Babel standalone executa os scripts `text/babel` em ordem de documento no `DOMContentLoaded`,
então `document.readyState` já não é `'loading'` quando o loader roda: ele cai no ramo `else` e
chama `refreshPluginVersions()` imediatamente, com `plugin-store.jsx` ainda não executado. A guarda
disparava **em silêncio** — sem warn, sem erro, sem sintoma no console — e nenhum pack entrava no
registro.

Instalar funcionava porque `pack-import-dialog.jsx` chama `refreshPluginVersions()` explicitamente,
minutos depois, com tudo carregado.

Diagnóstico confirmado antes do conserto: após recarregar, rodar `await window.refreshPluginVersions()`
manualmente no console fazia a entrada reaparecer — provando que o `pluginStore` existia naquele
momento, só não existia no boot.

Corrigido em `0f55fa6`: as duas tags trocadas de lugar. `plugin-store.jsx` não tem nenhuma
referência ao loader (é folha) e atribui `window.pluginStore` sincronamente no topo, então a troca
é segura.

Dois testes acompanharam:
- `check-source-dispatch.tests.ps1` — assertion nova travando a ordem, escrita para falhar antes do
  conserto e confirmada RED
- `check-plugin-store.tests.ps1` — a assertion de 02-01 exigia a ordem antiga (`loader < store`).
  Invertida, e reancorada em `src="..."` porque o comentário novo do `index.html` cita os nomes dos
  arquivos e um `IndexOf` do nome solto passaria a casar o comentário em vez da tag.

**Por que nada automatizado pegou:** a guarda degrada em silêncio. Nenhum dos três executores, nenhum
self-check e nenhum dos 22 scripts então existentes executa o boot em ordem real de navegador.

## Task 1 — primeira abertura, as duas origens, offline

Observado pelo dono do produto, janela privativa do Chromium, `http://127.0.0.1:8791`.

| Passo | Observado |
|-------|-----------|
| 2 | Grade abre preenchida sozinha, em `D&D 5.5E 2024`, interface em pt |
| 3 | `window.SPELL_VERSIONS.length` → `6` |
| 4 | 6 entradas no seletor |
| 5 | SRD 5.1 e SRD 5.2 carregam; sem lentidão perceptível; trocar para SRD muda o idioma da UI |
| 6 | Filtro de classe vazio no SRD 5.1, UI intacta — FA-4 confirmada como degradação |
| 7 | Todos os datasets legados abrem normalmente |
| 8 | `srd-2014-en.json` instalado, sucesso nomeando o identificador |
| 9 | Entrada nova no seletor sem recarregar |
| 10 | Magias renderizam; detalhe da magia normal |
| 11 | `filter(v => v.source === 'idb')` → `[{…}]`; `filter(v => v.source === 'fetch').length` → `6` |
| 12 | **Falhou** → corrigido em `0f55fa6` → re-verificado: persiste |
| 13-15 | Offline: app abre, grade preenchida, import abre; pack do IndexedDB acessível; volta ao online |

**FA-3 — aceita explicitamente.** O default de primeira visita para navegador em inglês passou do
PHB 2024 legado (411 magias) para o SRD 5.2 (339). Justificativa registrada pelo dono do produto:
a Fase 6 remove os 4 JSONs protegidos e deixa apenas o SRD no precache, então apontar o default de
inglês para o PHB criaria um default a ser desfeito duas fases depois.

Um ponto de vocabulário que gerou confusão e vale registrar: `D&D 5.5E 2024` (o dataset PT-BR
legado, 391 magias) **não** é o `SRD 5.2` (`srd-2024-en.json`, 339 magias, inglês). Os rótulos se
parecem; os arquivos e idiomas não.

Uma ocorrência foi reportada como falha no passo 7 e investigada: `Pack does not match the schema`
ao apontar `spells-5E-2024-PTBR.json` para a caixa de import. Não é regressão — a mensagem é
`packErr.schemaInvalid`, do pipeline de import, e o arquivo legado tem só `spells` enquanto o
`pack.schema.json` exige `["meta","spells"]`. Recusar um dataset legado como pacote é o
comportamento correto. O `loadVersion()` no caminho `fetch` não chama `validatePack` e portanto não
consegue emitir essa mensagem.

## Task 2 — payload hostil pelos 4 sinks (dívida da Fase 3)

`03-UAT.md` teste 5, marcado `carried_to_phase: 4` com a instrução de ser a primeira coisa a testar
quando um pack importado ficasse selecionável.

Fixture: `scripts/qa-fixtures/hostile-html.json`, criado em 04-03.
- `qa-hostile-description.description` — `<img src="x" onerror="alert(1)">` + `<script>alert(document.cookie)</script>` entre parágrafos benignos
- `qa-hostile-description.upgradeDescription` — `<p onclick="alert(1)">`, handler inline em elemento permitido
- `qa-benign-control` — controle

**Os quatro sinks reportados limpos pelo dono do produto**, nomeados explicitamente: card, painel
lateral, tela de detalhe e folha de impressão. Nenhum `alert` disparou.

Os passos 7 (controle renderiza) e 9 (console sem erro nos passos 3-7) foram cobertos por um
"tá tudo ok" geral, não item a item. Registrado como tal.

**Passo 8 — provado por execução, não por dedução.** Uma primeira tentativa de provar a sanitização
em Node falhou e o payload apareceu intacto; isso não era defeito, era limitação do harness:
`sanitizePack` é estágio separado, chamado por `installFromFile` depois de parse+validate, e usa
DOMPurify, que não existe fora do navegador. A função aliás **falha fechado** nesse caso (recusa o
import em vez de instalar conteúdo não sanitizado).

Rodado então em Chromium real, pelo funil de produção. Valores literais lidos de volta do IndexedDB:

```
changedFields:      2
description:        <p>Benign paragraph before the payload.</p><p>Benign paragraph after the payload.</p>
upgradeDescription: <p>At higher levels this field carries an inline event-handler attribute on an allowed element.</p>
```

`<img>`, `<script>` e `onclick` ausentes. Consistente com a whitelist: `ALLOWED_TAGS` não inclui
`img` nem `script`, e `ALLOWED_ATTR: []` derruba todo atributo. A sanitização acontece no import,
antes da gravação — não é o render escondendo o payload.

**Dívida da Fase 3 fechada.**

## Task 3 — preferência morta, pendente e corrida de boot

Executado pelo orquestrador via Playwright, a pedido explícito do dono do produto. Verificação em
nível de estado (contagem de magias pela API do loader, leitura do IndexedDB, captura de console),
não visual.

| Cenário | Resultado |
|---------|-----------|
| A. Preferência pendente | 7 versões, entrada `idb` presente no boot, `current` = chave do pack — honrada |
| B. Preferência órfã (pack apagado) | Abre com 391 magias, seletor bate com o exibido, 0 erro |
| C. Preferência inventada | Abre na padrão, 391 magias, 0 erro |
| D. Enumeração quebrada | Degrada para as 6 builtin, 391 magias, warn presente, 0 fatal |
| E. Duas abas simultâneas | Ambas 391 magias, 0 `pageerror` |

O cenário A vale por dois: reconfirma independentemente que o conserto de ordem de boot funciona.

O cenário D confirma o ramo de falha da FA-1: com `listPacks` rejeitando durante o boot, o loader
avisa e degrada, sem tela em branco e sem erro fatal.

## Desvios

**1. Cenário B não emitiu o `console.warn` esperado.** O plano dizia que um warn nomeando a chave
que não resolveu seria esperado e correto. Ele não apareceu. O comportamento está correto — sem
tela vazia, sem erro, seletor consistente — porque o dono único de resolução valida a chave antes de
chamar `loadVersion()`, então o caminho do warn (`'[spells-data-loader] Versão desconhecida:'`) não
é atingido nesse cenário. Registrado como desvio observado, não defeito.

**2. Primeira execução do cenário D não testou nada, e quase virou falso verde.** O override de
`window.pluginStore.listPacks` usava `setInterval`, que é macrotask: o Babel executa todos os
scripts `text/babel` numa passada síncrona, então o patch só entrava depois de
`refreshPluginVersions()` já ter rodado com o `listPacks` real. A ausência de warn foi lida
inicialmente como resultado quando era artefato. Refeito interceptando na atribuição via
`Object.defineProperty`, o que é síncrono; só então `listPacks` foi confirmadamente sabotado
(`SIM - rejeita com: teste-enumeracao-quebrada`) e o warn apareceu.

**3. Escopo do que o Playwright cobre.** O harness verifica estado, não pixel. Os quatro sinks de
render do Task 2 continuam apoiados na observação humana e não foram re-verificados por automação.

## Observações que não são defeitos

**Aviso de CSP em todo boot:** `The Content Security Policy directive 'frame-ancestors' is ignored
when delivered via a <meta> element.` Pré-existente, introduzido na Fase 3 (`dd9d6bc`,
`feat(03-08)`), e `check-csp.tests.ps1` linha 24 **exige** `frame-ancestors 'none'` entre as
diretivas. É o navegador informando que essa diretiva só vale via header HTTP; a diretiva fica no
lugar para quando o site for servido com headers. Não é violação nem defeito desta fase.

## Levantado durante o checkpoint, roteado para fora da fase

**Desacoplar o idioma da interface do idioma do pacote** — pedido pelo dono do produto durante este
checkpoint, revertendo deliberadamente a decisão original de i18n acoplado. Registrado em
`.planning/todos/pending/desacoplar-idioma-ui-da-versao.md` (commit `9c79523`) e destinado a uma
Fase 4.1 a ser inserida entre a 4 e a 5.

Não é preferência de design, é pré-requisito da Fase 6: `HifiLangToggle` (`v10-hifi.jsx:436`) não é
um seletor de idioma, é um seletor de **versão** disfarçado — faz `versions.find(v => v.lang === 'ptbr' && ...)`
e chama `onSwitch(pt.key)`. Quando a Fase 6 remover os 4 legados não sobra nenhuma entrada
`lang: 'ptbr'`, o `find` retorna `undefined` e o botão PT fica inerte. A Fase 6 entregaria um app
monolíngue em inglês para público brasileiro, contrariando seu próprio critério 4.

O trabalho é fiação, não tradução: `i18n.jsx` já tem os blocos `ptbr:` e `en:` com `makeT(lang)`,
`tt(lang, key)` e checagem de paridade.

**Traduzir o SRD 2024 para português** foi mencionado como intenção e não tem dono em nenhuma fase
do roadmap. É o que devolveria conteúdo em português depois da Fase 6.

## Verification

Pré-voo de cada task, todos exit 0:
- Task 1 e Task 3: os 23 `scripts/check-*.tests.ps1`
- Task 2: harness Node do plano provando o fixture aceito pelo validador real (`qa-hostile-html`, 2 magias)

Suíte completa após o conserto de ordem de boot: **23/23 verdes**.

Servidor local `127.0.0.1:8791` de pé durante os três checkpoints.

## Self-Check: PASSED

- [x] Task 1: 15 passos observados em navegador real, FA-3 decidida explicitamente
- [x] Task 2: 4 sinks nomeados pelo humano; passo 8 provado por execução em Chromium real
- [x] Task 3: 5 cenários executados via Playwright, incluindo o ramo de falha da FA-1
- [x] Dívida da Fase 3 (`03-UAT.md` teste 5) fechada por observação direta
- [x] Regressão encontrada no passo 12 corrigida, com teste RED→GREEN, e re-verificada em navegador
- [x] Desvios registrados, incluindo um erro de harness próprio que quase produziu falso verde
- [x] Item fora de escopo roteado para fora da fase em vez de absorvido nela
