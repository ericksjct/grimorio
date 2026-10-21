---
phase: 08-composicao-aditiva-de-pacotes
plan: 12
subsystem: checkpoint
tags: [checkpoint, qa, headless, playwright, gap-closure]
requires:
  - phase: 08-08
    provides: emendas E-01..E-05, PKG-06/MGMT-07 reescritos
  - phase: 08-09
    provides: GAP-1 (origem da magia sem source)
  - phase: 08-10
    provides: GAP-3/GAP-4 (meta.image https, no-referrer, fallback)
  - phase: 08-11
    provides: GAP-2 (import renomeia sozinho e avisa)
provides:
  - "veredito por item (1-10) e por requisito do checkpoint refeito"
affects: [milestone v2.0]
key-files:
  created:
    - .planning/phases/08-composicao-aditiva-de-pacotes/08-12-SUMMARY.md
    - .planning/todos/pending/i18n-import-successcount-plural.md
  modified:
    - .planning/REQUIREMENTS.md
    - .planning/ROADMAP.md
    - .planning/STATE.md
    - .planning/todos/completed/i18n-toast-versao-e-pluralizacao.md (movido de pending/)
requirements-completed: [MGMT-06, MGMT-07, MGMT-08, MGMT-09, PKG-06, SRD-05, MIGR-04]
completed: 2026-10-21
---

# 08-12 — Checkpoint refeito da Fase 8

**Veredito: aprovado.** O usuário respondeu "aprovado" (2026-10-21) depois de ler o
relatório do QA abaixo. Os 10 itens passaram; nenhum item ficou UNVERIFIED como um
todo. Um sub-item ficou sem conferência (ver "Não conferido").

## Como foi verificado

Task 1 e o roteiro da Task 2 rodaram automatizados, a pedido do usuário ("testa os
gaps aí com chrome headless"): Playwright com o Chrome instalado (`channel: 'chrome'`,
headless), servidor estático local na porta 8123, perfil limpo a cada execução,
desktop 1280×800 e mobile 390×844 (claro e escuro). Fixtures (7 packs, validados pelo
`validatePack` em `vm`: 5 aceitos, `qa-imagem-http` → `image-invalid`,
`qa-imagem-grande` → `image-too-large`), script e screenshots ficaram só no
scratchpad da sessão — nada no repositório (WR-12). `npm test` → `All test scripts
passed.` O gate `check-packs-index` regravou `packs/index.js` só com troca de fim de
linha; restaurado com `git checkout`. O usuário confirmou o resultado.

Os itens foram lidos com as emendas E-06..E-09 (nota de 2026-10-12 no topo do plano).

## Veredito por item

| Item | Veredito | Evidência (saída do QA) |
|------|----------|-------------------------|
| 1 Soma e origem | PASS | SRD 5.2 EN + QA PT-BR: 340 cards; rodapé "V S M · 18 metros · QA P" e "V S M · 150 feet · SRD"; FONTE "QA PT-BR · 2024" e "SRD 5.2 · 5e 2024", sem "·" solto |
| 2 Idioma por magia | PASS | UI pt: `lang="en"` em Fireball, `lang="pt-br"` em Raio Único QA |
| 3 Base único (E-06) | PASS | marcar 5.1 desmarca os outros bases; marcar 5.2 PT-BR desmarca o 5.2 EN; "Bola de Fogo" x1; detalhe de Fireball mostra "Também em: QA Legado". O "Também em" entre SRD EN e PT-BR deixou de existir por E-06 (ver Observações) |
| 4 Seleção vazia | PASS | tudo desmarcado → 339 cards do padrão; toast "Pacote removido da seleção — mostrando o pacote padrão." e, em EN, "Pack removed from selection — showing the default pack."; recarregar mantém a seleção vazia |
| 5 Import sem prompt | PASS | nenhum prompt; tela e toast "Instalado com 1 magia renomeada para evitar conflito: fireball → fireball-qa-reservado"; export com `fireball-qa-reservado` e sem `"name": "fireball"`; `qa-muitos` lista 3 + "e mais 2"; EN: "Installed with 2 spells renamed to avoid conflicts: …" |
| 6 Seleção com prompt | PASS | 6a: prompt "Conflito de slugs" para `qa-legado`, linha `qa-unique-bolt`; "Fire Ball" → "Slug inválido — …", envio desabilitado; cancelar não marca. 6b: propõe renomear o `fireball` do `qa-legado` ("Este slug é reservado pelo pacote SRD"); cancelar não marca o SRD |
| 7 Preparadas (D-13) | PASS | `4-1-qa-unique-bolt` preparada; depois do rename continua em `prepared`; remover `qa-reservado` mostra o impacto "1 preparada em 1 personagem deixa de resolver" e, no editor, "1 magia em um pacote que você não tem … Qa Unique Bolt"; nada apagado |
| 8 Menu e imagem | PASS | `data:` e `https://` carregam com `referrerpolicy="no-referrer"`; nenhuma requisição à imagem externa com `Referer` (CDP: `policy=no-referrer`); URL quebrada e offline+cache desabilitado → marcador; `http://` e imagem grande recusadas com `packErr.imageInvalid`/`imageTooLarge` exatos, em pt e en, nada instalado; descrição nowrap/ellipsis com `title` completo; slugs reservados "SRD 5.2 (EN): Fireball" / "SRD 5.2 (PT-BR): Bola de Fogo"; chip "SRD 5.2 +1"; painel ancorado no chip no desktop, sheet de baixo (inset 12px) no mobile; remover pack marcado tira ele da seleção |
| 9 Migração | PASS | `versionKey: 'srd-2014-en'` → `["srd-2014-en"]`; `spells-5E-2024-PTBR` → `["srd-2024-ptbr"]` com banner "O Grimório mudou"; `?v=srd-2024-ptbr,srd-2024-ptbr-adicionais` → os dois; `?v=srd-2024-en,srd-2024-ptbr` → vence o último (E-06); compartilhar visão gera `?v=srd-2024-ptbr%2Csrd-2024-ptbr-adicionais` |
| 10 Cache | PASS | só `grimorio-v8` (valor atual do `sw.js`; plano dizia v6, nota E-08 dizia v7), com `srd-reserved-slugs.json`, `pack-rename-dialog.jsx` e `packs/index.js`; nenhuma imagem externa em cache |

## Veredito por requisito

| Requisito | Itens | Veredito |
|-----------|-------|----------|
| MGMT-06 | 1, 2 | Complete |
| SRD-05 | 3 | Complete |
| MGMT-08 | 4 | Complete |
| MGMT-07 | 5, 6, 7 | Complete |
| MGMT-09 | 8 | Complete |
| PKG-06 | 8 | Complete |
| MIGR-04 | 9 | Complete |

## O que a Task 3 fez

- Todo `i18n-toast-versao-e-pluralizacao` movido para `todos/completed/` (gate: itens
  4 e 8 passaram), com a seção "Resolução (Fase 8)".
- Os 7 requisitos acima marcados `[x]` e `Complete` em REQUIREMENTS.md.
- ROADMAP: 08-12 e Fase 8 marcados concluídos (12/12, 2026-10-21).

## Não conferido

- Item 8, sub-item UI-SPEC: cores só de tokens nos 6 temas, tipografia e espaçamento
  4/8/16. O QA só capturou o tema padrão claro e o escuro. O usuário aprovou mesmo
  assim.

## Observações (não reprovam item)

- **"1 magias."** — `import.successCount` não tem forma singular. Resto do todo de
  plural; aberto `todos/pending/i18n-import-successcount-plural.md`.
- **Ramo morto do "Também em"** — o ramo (2) do `alsoIn` em `HifiDetailContent`
  (SRD mesma edição, outro idioma, dentro da seleção) não dispara mais desde E-06.
  No mesmo todo.
- **Item 7 do roteiro estava impreciso** — a chave de preparada não leva o pacote,
  então depois do rename ela continua resolvendo pelo `qa-reservado` (impacto 0
  no prompt, correto). A órfã só aparece quando nenhum pacote tem mais o slug.
- Num perfil com chave legada, o banner de transição e o diálogo de primeira visita
  aparecem juntos. Cosmético.
