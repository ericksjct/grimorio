---
phase: 08-composicao-aditiva-de-pacotes
plan: 11
subsystem: pack-import
tags: [slug, auto-rename, import, notice, i18n, service-worker, gap-closure]
requires:
  - phase: 08-10
    provides: allowlist unica de meta.image; CACHE_VERSION adiado para este plano
  - phase: 08-08
    provides: texto revisado de MGMT-07 (E-01/E-02)
provides:
  - "_install(text) com auto-renomeacao via suggestSlug e campo renamed no resultado"
  - "_renamedNotice(lang, renamed) + RENAMED_NOTICE_CAP no PackImportDialog (toast e tela de sucesso)"
  - "chaves import.renamed.one/.other e import.renamedMore (PT/EN)"
  - "sw.js em grimorio-v6"
affects: [08-12]
tech-stack:
  added: []
  patterns: ["import resolve colisao de slug sozinho e avisa; renomear pack instalado continua so com prompt"]
key-files:
  created: []
  modified:
    - pack-import.jsx
    - pack-import-dialog.jsx
    - pack-rename-dialog.jsx
    - i18n.jsx
    - index.html
    - sw.js
    - scripts/check-slug-rename.tests.ps1
    - scripts/check-pack-import.tests.ps1
    - scripts/check-pack-import-dialog.tests.ps1
    - scripts/check-i18n-pack-menu.tests.ps1
    - scripts/check-pack-wiring.tests.ps1
key-decisions:
  - "Ocupados de cada sugestao = reservados + instalados + slugs do proprio pack + sugestoes ja escolhidas; sufixo usa o identificador FINAL (pos freeIdentifier)"
  - "Calculo de impacto sai do import (E-01): o pack que entra nao esta instalado, nada vira orfao novo"
  - "PackRenameForm sai de window; so PackRenameDialog, renameInstalledPackSlugs e renameImpact ficam expostos (E-02)"
  - "Teto de 3 nomes no aviso, o resto vira 'e mais N'; nome antigo cortado em 64"
metrics:
  tasks: 3
  files: 11
  completed: 2026-10-04
status: complete
---

# Phase 8 Plan 11: Auto-renomeacao de slug no import com aviso (GAP-2) Summary

O import agora renomeia sozinho o slug em colisao (reservado SRD, pack instalado ou outro slug do proprio pack) com o sufixo do pack que entra, instala sem prompt e mostra `antigo -> novo` no toast e na tela de sucesso, no idioma da interface; a selecao no menu segue com o prompt.

## Tasks

| Task | Commit | Resultado |
|------|--------|-----------|
| 1 | 5710b3d | `_install(text)`: `detectSlugConflicts` -> `suggestSlug` por linha com `taken` acumulado -> `applySlugRenames` -> redeteccao falha fechada -> 1 `putPack`; resultado com `renamed`; `installFromFile/Url` sem 2o parametro; `CANCELLED` e o calculo de impacto removidos; 9 casos de funil no gate |
| 2 | 9ed35b4 | `_renamedNotice` (teto 3 + "e mais N", corte em 64) no toast e na tela de sucesso; 3 chaves i18n PT/EN; dialogo sem estado/fiacao de conflito; prova node do aviso |
| 3 | 7e2e3b2 | exposicao de `pack-rename-dialog.jsx` reduzida a 3 nomes; comentarios de `index.html`/`pack-rename-dialog.jsx`; `grimorio-v6`; `check-pack-wiring` piso 6 |

## Verificacao

`npm test` -> `All test scripts passed.` `check-pack-menu` passou sem nenhuma edicao (selecao intacta).

## Deviations from Plan

**1. [Ordem] Asserção de exposicao do prompt adiada da Task 1 para a Task 3**
- **Issue:** a asserção "exatamente 3 nomes em window" faria o commit da Task 1 ficar vermelho (a exposicao so muda na Task 3).
- **Fix:** escrita junto com a Task 1, retirada antes do commit e recolocada no commit da Task 3. Nenhuma mudanca de escopo.

**2. [Gate] Regex de `handleSubmit` tolerante a CRLF** (`\r?\n`) em `check-pack-import-dialog`, porque o arquivo e CRLF.

Fora isso, plano executado como escrito.

## Pendencias de verificacao humana

Backstop (item 5 do checkpoint 08-12): num navegador real, importar `qa-reservado.json` instala sem prompt e toast + tela de sucesso mostram `fireball -> fireball-qa-reservado` no idioma da interface. MGMT-07 continua Pending ate a aprovacao do 08-12.

## Known Stubs

None.

## Threat Flags

None alem do registro do plano (T-08-43..48).

## Self-Check: PASSED

Commits 5710b3d, 9ed35b4, 7e2e3b2 presentes; arquivos modificados existem; `npm test` verde.
