---
id: i18n-toast-versao-e-pluralizacao
status: completed
closed: 2026-10-21
closed_by: "08-12 (checkpoint aprovado; itens 4 e 8 passaram)"
created: 2026-08-30
source: checkpoint 05-05 (QA headless da Fase 5)
area: pack-manager.jsx / spells-data-loader.jsx / i18n.jsx
---

# Toast de troca de versão sai em inglês, e contagens não pluralizam

Dois furos de i18n observados durante o QA automatizado do checkpoint da Fase 5
(Chromium headless, Playwright). Nenhum é critério do ROADMAP da fase — os seis
critérios passaram — mas ambos são visíveis ao usuário.

## 1. Toast de troca de versão não traduzido

Com a interface em **pt-br**, remover o pacote que estava ativo emite dois toasts.
O primeiro traduz certo (`manager.removed`):

```
Pacote "QA Test Pack" removido.
```

O segundo vem cru em inglês, independentemente do idioma da interface:

```
the pack you were viewing was removed — switched back to SRD 5.2 (EN)
```

Esse segundo toast é justamente o que impede a troca silenciosa de versão
(D-08) — é uma mensagem importante, e é a única do fluxo que ignora `uiLang`.
Provavelmente uma string literal em vez de uma chave em `i18n.jsx`.

## 2. Contagens sem pluralização

As chaves de contagem interpolam `{n}` num texto fixo no plural, então `n = 1`
sai errado nos dois idiomas:

- `manager.duplicates` → `1 magias também presentes em outros pacotes`
- `manager.impactBookmarked` → `1 favoritas deixam de resolver`
- `manager.impactPrepared` → `3 preparadas em 1 personagem(ns) deixam de resolver`

O `(ns)` de `personagem(ns)` também é uma solução de contorno visível.

Vale notar que o app já tem chaves com forma de plural em outros lugares
(`noun.spell.other`), então pode existir convenção a seguir em vez de inventar
uma nova.

## Encaminhamento

O item 1 é uma correção pequena e de valor claro (mensagem de estado importante,
no idioma errado). O item 2 é cosmético e mais amplo — mexer nele provavelmente
significa decidir uma convenção de plural para o dicionário inteiro, não só para
estas três chaves.

## Resolução (Fase 8)

Fechado no checkpoint 08-12 (2026-10-21), cujo gate exigia os itens 4 e 8 aprovados.

- **Item 1 (toast em inglês):** o toast antigo saiu junto com o fluxo que o
  disparava (seletor de versão único, removido na 08-06). O aviso que o substitui,
  `menu.toastFallbackToDefault`, sai via `tt(_uiLang(), ...)` e segue a interface —
  conferido em pt e en no item 4 do checkpoint.
- **Item 2 (plural):** `manager.impactPrepared` e `manager.impactBookmarked` viraram
  pares `.one`/`.other` com `noun.character.*` (fim do `personagem(ns)`);
  `manager.duplicates` usa `{nounSpell}`; as contagens novas
  (`rename.impactWarning.*`, `import.renamed.*`) nasceram com plural. O resto do
  dicionário não foi varrido (fora do mandato, conforme CONTEXT). Resto conhecido:
  `import.successCount` ("1 magias.") — registrado em
  `todos/pending/i18n-import-successcount-plural.md`.
