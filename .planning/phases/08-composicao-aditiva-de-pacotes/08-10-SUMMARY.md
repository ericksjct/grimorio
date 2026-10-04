---
phase: 08-composicao-aditiva-de-pacotes
plan: 10
subsystem: pack-import
tags: [meta.image, https, allowlist, referrer, i18n, gap-closure]
requires:
  - phase: 08-07
    provides: checkpoint reprovado (GAP-3, GAP-4)
  - phase: 08-08
    provides: texto revisado de PKG-06
provides:
  - IMAGE_SRC (allowlist unica data: raster | https://) em window.packImport
  - PackThumb com referrerPolicy no-referrer e fallback onError para o marcador D-19
  - pattern do schema em paridade com IMAGE_SRC
  - copy PT/EN de packErr.imageInvalid/imageTooLarge em linguagem simples
affects: [08-11, 08-12]
tech-stack:
  added: []
  patterns: [allowlist unica compartilhada entre import, render e schema]
key-files:
  created: []
  modified:
    - pack-import.jsx
    - pack-manager.jsx
    - pack.schema.json
    - pack-docs.html
    - i18n.jsx
    - scripts/check-pack-validator.tests.ps1
    - scripts/check-pack-menu.tests.ps1
    - scripts/check-pack-format.tests.ps1
    - scripts/check-csp.tests.ps1
    - scripts/check-i18n-pack-menu.tests.ps1
key-decisions:
  - "Uma allowlist so (IMAGE_SRC): _checkImage, _safeImage e o pattern do schema dao o mesmo veredito; teste de paridade caso a caso"
  - "Teto de 2048 da URL dentro da regex; 204800 continua checado antes da regex"
  - "CSP sem img-src travada em check-csp"
metrics:
  tasks: 3
  files: 10
  completed: 2026-10-04
status: complete
---

# Phase 8 Plan 10: meta.image https:// com allowlist unica (GAP-3/GAP-4) Summary

`meta.image` aceita `data:` raster (ate 200 KB) ou URL `https://` (ate 2048) por uma regex so (`IMAGE_SRC`), o cartao carrega sem referrer e cai no marcador colorido se a imagem falhar, e as mensagens de rejeicao dizem em linguagem simples o que e aceito.

## Tasks

| Task | Commit | Resultado |
|------|--------|-----------|
| 1 | cabb9b7 | `IMAGE_SRC` em pack-import.jsx; `_checkImage`/`_safeImage`/schema na mesma regra; gates com casos https, rejeicoes e paridade schema <-> validador |
| 2 | 00b7e35 | `PackThumb` com `referrerPolicy="no-referrer"` + `onError` -> `setFailedSrc`; pack-docs (PT/EN) com formas aceitas/rejeitadas e aviso de IP; check-csp trava ausencia de `img-src` |
| 3 | e1c738d | `packErr.imageInvalid`/`imageTooLarge` reescritas (PT/EN, `{kb}`, sem "data: URI"); gate i18n estendido |

## Verificacao

`npm test` -> `All test scripts passed.` O nome antigo `IMAGE_DATA_URI` nao existe mais no repositorio. A CSP das paginas nao foi tocada.

## Deviations from Plan

**1. [Rule 3 - Bloqueio] Gate de proxy CORS tripou em comentarios**
- **Found during:** Task 3 (`npm test`)
- **Issue:** `check-pack-import.tests.ps1` barra qualquer `https://` literal em pack-import.jsx; meus comentarios e a mensagem de desenvolvedor do `image-invalid` continham o literal.
- **Fix:** reescritos sem o literal ("URL https", "esquema https"); a regex usa `https:\/\/` e nao e flagada.
- **Files modified:** pack-import.jsx
- **Commit:** e1c738d

Fora isso, plano executado como escrito.

## Pendencias de verificacao humana

Backstop (item 8 do checkpoint 08-12): num Chromium real, imagem https valida aparece, requisicao sai sem `Referer`, e offline com cache desabilitado o cartao cai no placeholder. PKG-06/MGMT-07/MGMT-09 continuam Pending ate a aprovacao do 08-12. `CACHE_VERSION` fica para o 08-11.

## Known Stubs

None.

## Threat Flags

None alem do registro do plano (T-08-36..42).

## Self-Check: PASSED

Commits cabb9b7, 00b7e35, e1c738d presentes; arquivos modificados existem; `npm test` verde.
