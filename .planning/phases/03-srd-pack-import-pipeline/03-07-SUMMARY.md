---
phase: 03-srd-pack-import-pipeline
plan: 07
subsystem: infra
tags: [dompurify, sri, service-worker, precache, index-html, wiring]

# Dependency graph
requires:
  - phase: 03-srd-pack-import-pipeline (planos 03-01, 03-05, 03-06)
    provides: pack-import.jsx (validação/sanitização/instalação), pack-import-dialog.jsx (PackImportRoot), pack.schema.json, pack-docs.html
provides:
  - DOMPurify carregado via CDN com SRI (sha384) e versão literal fixada
  - pack-import.jsx e pack-import-dialog.jsx ligados na ordem de carga estrita do index.html
  - PackImportRoot montado no App, ao lado de HifiPrintRoot
  - PRECACHE do sw.js cobrindo os 4 arquivos novos + a URL do DOMPurify, com CACHE_VERSION intacto
  - scripts/check-pack-wiring.tests.ps1 (regressão de ordem/SRI/paridade PRECACHE)
affects: [phase-04-srd-integration, phase-05-import-ui-placement]

# Tech tracking
tech-stack:
  added: ["dompurify@3.4.13 (CDN, cure53 oficial)"]
  patterns: ["Regression-check-as-test para wiring de index.html/sw.js"]

key-files:
  created: [scripts/check-pack-wiring.tests.ps1]
  modified: [index.html, sw.js]

key-decisions:
  - "DOMPurify 3.4.13 (npm view dompurify version na hora da execução) fixado por versão literal na URL, com integrity sha384 calculado sobre os bytes reais buscados de https://unpkg.com/dompurify@3.4.13/dist/purify.min.js — nunca copiado de outra fonte."
  - "Procedência confirmada antes de fixar: npm view dompurify repository.url homepage maintainers aponta para git://github.com/cure53/DOMPurify.git, https://github.com/cure53/DOMPurify, mantido por cure53 <mario@cure53.de> — o repositório oficial do projeto."
  - "PackImportRoot montado com um comentário ponytail: é o gatilho provisório de D-12; a Fase 5 decide onde o import vive na UI final e apaga esta linha."
  - "srd-2014-en.json e srd-2024-en.json permanecem fora do PRECACHE nesta fase — escopo de SRD-03 na Fase 4."

patterns-established:
  - "check-pack-wiring.tests.ps1 usa a posição da TAG de script (src=\"...\") em vez de IndexOf bruto no nome do arquivo, para não ser enganado por menções ao nome do arquivo em comentários que antecedem a tag real."

requirements-completed: [PKG-02, PKG-03, PKG-05]

coverage:
  - id: D1
    description: "DOMPurify carrega no index.html com versão literal fixada, integrity sha384 calculado sobre os bytes reais e crossorigin anonymous"
    requirement: "PKG-05"
    verification:
      - kind: unit
        ref: "scripts/check-pack-wiring.tests.ps1 (bloco 1 — formato da tag)"
        status: pass
    human_judgment: false
  - id: D2
    description: "pack-import.jsx carrega depois de plugin-store.jsx e do DOMPurify; pack-import-dialog.jsx carrega depois de v11-character-editor.jsx"
    requirement: "PKG-02"
    verification:
      - kind: unit
        ref: "scripts/check-pack-wiring.tests.ps1 (bloco 2 — ordem de carga)"
        status: pass
    human_judgment: false
  - id: D3
    description: "PackImportRoot montado exatamente uma vez no App, depois de HifiPrintRoot, tornando o gatilho de import alcançável no app renderizado"
    requirement: "PKG-02"
    verification:
      - kind: unit
        ref: "scripts/check-pack-wiring.tests.ps1 (bloco 3 — montagem)"
        status: pass
    human_judgment: true
    rationale: "A checagem estática confirma que a tag está no JSX; abrir o diálogo de fato num navegador real (clicar no botão, ver o modal renderizar) não foi exercitado nesta execução (sem browser disponível) — precisa de UAT visual."
  - id: D4
    description: "PRECACHE do sw.js inclui pack-import.jsx, pack-import-dialog.jsx, pack-docs.html, pack.schema.json e a URL do DOMPurify; CACHE_VERSION permanece 'grimorio-v1'; app continua funcionando offline"
    requirement: "PKG-05"
    verification:
      - kind: unit
        ref: "scripts/check-pack-wiring.tests.ps1 (blocos 4, 5, 6, 7)"
        status: pass
    human_judgment: true
    rationale: "A checagem estática prova a paridade de string; o comportamento real offline (abrir o app sem rede após uma visita, incluindo o diálogo de import e pack-docs.html) exige um teste manual em navegador com DevTools offline, não executado aqui."

duration: 6min
completed: 2026-08-10
status: complete
---

# Phase 3 Plan 07: Wire DOMPurify, pack-import scripts and PackImportRoot Summary

**DOMPurify 3.4.13 carregado via CDN com SRI (sha384 calculado sobre os bytes reais), pack-import.jsx e pack-import-dialog.jsx ligados na ordem de carga estrita do index.html, PackImportRoot montado no App, e PRECACHE do sw.js atualizado para manter o app 100% offline.**

## Performance

- **Duration:** 6 min (commits) — leitura de contexto e verificação adicionaram mais tempo de execução total
- **Started:** 2026-08-10T22:16:44-03:00
- **Completed:** 2026-08-10T22:22:12-03:00
- **Tasks:** 3
- **Files modified:** 2 (index.html, sw.js) + 1 arquivo novo (scripts/check-pack-wiring.tests.ps1)

## Accomplishments
- DOMPurify 3.4.13 carrega a partir de `https://unpkg.com/dompurify@3.4.13/dist/purify.min.js`, com `integrity="sha384-ZuC+DIACqSIZTsp+7YF57cR5Y+6qXa7YFbEKdA/EHA/R0T+41dtorqucYl71Zp+t"` (recalculado e confirmado idêntico duas vezes a partir dos bytes reais) e `crossorigin="anonymous"` — mesmo formato dos três scripts de CDN pré-existentes.
- `pack-import.jsx` carrega logo depois de `plugin-store.jsx` (e depois do DOMPurify); `pack-import-dialog.jsx` carrega logo depois de `v11-character-editor.jsx`.
- `<PackImportRoot lang={lang} dark={dark} theme={theme} />` montado no `App`, imediatamente depois de `<HifiPrintRoot />` — o gatilho de import agora é alcançável no app renderizado.
- `sw.js` PRECACHE ganhou `./pack-import.jsx`, `./pack-import-dialog.jsx`, `./pack-docs.html`, `./pack.schema.json` e a URL exata do DOMPurify; `CACHE_VERSION` permanece `'grimorio-v1'`.
- `scripts/check-pack-wiring.tests.ps1` criado seguindo o padrão de `check-plugin-store.tests.ps1`, com 8 blocos de asserção e prova de fail-first em duas frentes (versão flutuante do DOMPurify; entrada removida do PRECACHE).

## Task Commits

Each task was committed atomically:

1. **Task 1: Carregar DOMPurify com SRI e ligar os dois arquivos novos no index.html** - `b46c68d` (feat)
2. **Task 2: Atualizar o PRECACHE do sw.js** - `122bda3` (feat)
3. **Task 3: Checagem de regressão do wiring** - `3b8227b` (test)

**Fix commit (deviation, ver abaixo):** `e828960` (fix)

_Nota: o commit de metadados (SUMMARY/STATE/ROADMAP) é responsabilidade do orquestrador nesta wave — não criado por este executor per as instruções do prompt._

## Files Created/Modified
- `index.html` - Script do DOMPurify com SRI, ordem de carga de `pack-import.jsx`/`pack-import-dialog.jsx`, montagem de `PackImportRoot`
- `sw.js` - PRECACHE com os 4 arquivos novos e a URL do DOMPurify; `CACHE_VERSION` inalterado
- `scripts/check-pack-wiring.tests.ps1` - Checagem de regressão de ordem/SRI/paridade PRECACHE (novo)

## Decisions Made
- Versão do DOMPurify resolvida em tempo de execução via `npm view dompurify version` (3.4.13) — não copiada de memória/documentação, para evitar fixar uma versão que já não corresponde ao pacote real.
- Procedência do pacote conferida via `npm view dompurify repository.url homepage maintainers` antes de fixar a versão — aponta para o repositório oficial cure53/DOMPurify.
- Hash `integrity` calculado duas vezes, via `node -e "fetch(...).then(r=>r.arrayBuffer())..."`, e confirmado idêntico nas duas rodadas, sobre os bytes reais servidos pela URL pinada — nunca copiado de outra fonte.
- O comentário de extensão da ordem de carga em `index.html` foi escrito para NÃO conter a substring literal `plugin-store.jsx` antes da tag real (ver Deviations) — evita falsos positivos/negativos em checagens que usam `IndexOf` bruto sobre nomes de arquivo.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Comentário novo quebrava a checagem de ordem de `check-plugin-store.tests.ps1`**
- **Found during:** Verificação final (rodada completa da suíte de testes existente, antes de encerrar)
- **Issue:** O comentário de extensão da Task 1 mencionava a string literal `plugin-store.jsx` numa frase ("it loads right after plugin-store.jsx") ANTES da tag de script real. `check-plugin-store.tests.ps1` usa `$index.IndexOf('plugin-store.jsx')` bruto para checar ordem, então essa menção em comentário — que aparece mais cedo no arquivo do que a tag real — fazia a checagem de ordem `spells-data-loader.jsx < plugin-store.jsx < v11-character-editor.jsx` falhar (a posição "vista" era a do comentário, não da tag).
- **Fix:** Reescrita a frase do comentário para "it loads right after the plugin store script", removendo a substring literal do nome do arquivo antes da tag real. Nenhuma mudança de comportamento, apenas texto de comentário.
- **Files modified:** `index.html`
- **Verification:** `pwsh -File scripts/check-plugin-store.tests.ps1` volta a sair 0; `pwsh -File scripts/check-pack-wiring.tests.ps1` continua saindo 0; suíte completa (20 scripts `scripts/*.tests.ps1`) roda 0 em todos.
- **Committed in:** `e828960`

---

**Total deviations:** 1 auto-fixed (1 Rule 1 - bug em checagem existente causado por texto de comentário novo)
**Impact on plan:** Correção pontual de texto de comentário, sem mudança de comportamento ou de superfície. Nenhum scope creep.

## Issues Encountered
- Ao construir `scripts/check-pack-wiring.tests.ps1`, a primeira versão usava `IndexOf` bruto no nome do arquivo (`'pack-import.jsx'`) para checar ordem, e essa mesma armadilha apareceu: o comentário da Task 1 menciona `pack-import.jsx` numa frase ANTES da tag real. Corrigido trocando para `IndexOf('src="plugin-store.jsx"')` etc. (posição da TAG, não do nome em prosa) antes mesmo de rodar a suíte completa — registrado aqui porque motivou o padrão documentado em `patterns-established`.

## User Setup Required
None - no external service configuration required. DOMPurify é servido por CDN (unpkg), sem chave/conta necessária.

## Next Phase Readiness
- PKG-02, PKG-03 e PKG-05 agora são alcançáveis de ponta a ponta no navegador: o botão de import (provisório, `ponytail:` D-12) abre o diálogo, que chama `window.packImport.installFromFile`/`installFromUrl`, que por sua vez usa `window.DOMPurify.sanitize` (agora carregado) e `window.pluginStore` para gravar.
- **Não verificado nesta execução:** abrir o app num navegador real e instalar um pacote de ponta a ponta (clique, upload de arquivo, toast de sucesso) — esta execução não teve acesso a um navegador; toda a verificação foi estática (grep/regex sobre `index.html`/`sw.js` + suíte `.tests.ps1`). Recomenda-se UAT visual antes de fechar a fase.
- **Também não verificado:** comportamento offline real (DevTools "offline", reload, abrir o diálogo de import e `pack-docs.html` sem rede) — apenas a paridade de string entre `index.html` e o `PRECACHE` do `sw.js` foi provada estaticamente.
- A Fase 5 (D-12) precisa decidir onde o gatilho de import vive na UI final e remover a linha `<PackImportRoot .../>` provisória marcada com `ponytail:` em `index.html:552`.
- A Fase 4 (SRD-03) é responsável por acrescentar `srd-2014-en.json`/`srd-2024-en.json` ao PRECACHE junto do dispatch que os consome — deliberadamente fora de escopo aqui.

---
*Phase: 03-srd-pack-import-pipeline*
*Completed: 2026-08-10*
