---
phase: 08-composicao-aditiva-de-pacotes
plan: 09
subsystem: spells-data-loader / v10-hifi
tags: [gap-closure, GAP-1, E-04, source, pack]
requires: ["08-07", "08-08"]
provides:
  - "adaptSpell/adaptSpells com 5º parâmetro packName (fallback de origem = nome do pacote)"
  - "linha FONTE do detalhe sem separador órfão e com o nome completo"
affects: [spells-data-loader.jsx, v10-hifi.jsx, scripts/check-pack-composition.tests.ps1]
key-files:
  modified:
    - spells-data-loader.jsx
    - v10-hifi.jsx
    - scripts/check-pack-composition.tests.ps1
decisions:
  - "Fallback único em adaptSpell via ver.labelEn; só preenche ausência de source, nunca substitui fonte declarada (E-04)"
  - "FONTE do detalhe mostra sourceFull (nome completo) com src de reserva; rodapé do card segue com o código curto"
metrics:
  tasks: 2
  files: 3
  completed: 2026-10-04
status: complete
---

# Phase 8 Plan 09: Fallback de fonte para pack sem `source` (GAP-1) Summary

Magia de pack sem `source` por magia agora herda o nome do pacote como origem (`sourceFull` = nome, `src` = código curto pela regra existente), e a linha FONTE do detalhe junta só as partes não vazias — fim do `· 2024` órfão.

## Tasks

| Task | Nome | Commit | Arquivos |
| ---- | ---- | ------ | -------- |
| 1 | Fallback de fonte em `adaptSpell` (GAP-1, E-04) | 72a8a64 | spells-data-loader.jsx, scripts/check-pack-composition.tests.ps1 |
| 2 | Linha FONTE do detalhe sem separador órfão | b01ec9b | v10-hifi.jsx, scripts/check-pack-composition.tests.ps1 |

## Detalhes

- `adaptSpell` calcula `source` efetivo: `s.source` string não vazia, senão `packName` string, senão `''`. `loadVersion` passa `ver.labelEn`; `adaptSpells(` continua com 2 ocorrências.
- Prova node no gate cobre os 5 casos (pack 'QA PT-BR' -> 'QA P'; 'SRD 5.2' -> 'SRD'; Player's Handbook -> 'PHB'; sem 5º argumento -> vazio; 'constructor' -> 'CONS').
- Gate estrutural novo sobre o bloco `{/* Source */}` de `v10-hifi.jsx` (exige `s.sourceFull`, `.filter(Boolean).join(' · ')`, `'—'`; proíbe a forma antiga).
- Rodapé de impressão, rodapé do card e filtro `src` não foram tocados.
- Efeito visível nos SRD: FONTE passa a 'SRD 5.2 · 5e 2024' (nome completo) em vez de 'SRD · 5e 2024' (registrado em E-04).

## Deviations from Plan

None - plan executed as written. (Pequeno reforço: `typeof s.source === 'string'` no cálculo da fonte efetiva, coerente com o hardening de entradas hostis.)

## Verification

`check-pack-composition`, `check-loader-hardening`, `check-source-dispatch` e `npm test` (All test scripts passed).

## Known Stubs

None.

## Threat Flags

None. T-08-34 mitigado (nome já sanitizado e cortado em 48, filho de texto React, tabela sem protótipo testada com 'constructor').

## Pendente

Truth `backstop`: conferência visual no checkpoint 08-12, item 1 (390x844 e desktop, pack `qa-ptbr`).

## Self-Check: PASSED

Commits 72a8a64 e b01ec9b existem; arquivos modificados presentes.
