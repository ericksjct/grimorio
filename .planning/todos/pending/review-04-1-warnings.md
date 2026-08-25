---
id: review-04-1-warnings
status: pending
created: 2026-08-24
source: 04.1-REVIEW.md (code review da Fase 04.1)
area: index.html, v10-hifi.jsx, v11-character-editor.jsx
---

# Warnings do code review da Fase 04.1 (o Critical já foi corrigido)

O code review da Fase 04.1 levantou 1 Critical, 7 Warnings e 7 Info. O Critical
(CR-01, filtro de classe órfão na troca de idioma do pack) foi reproduzido,
corrigido e travado por script na própria fase — ver a seção "Resolução do CR-01"
em `.planning/phases/04.1-desacoplar-o-idioma-da-interface-do-idioma-do-pacote/04.1-REVIEW.md`.

Os warnings abaixo ficaram em aberto. Detalhe completo, com file:line e correção
proposta, está no REVIEW.md; este todo existe para que não se percam.

- **WR-01** `index.html:406` — `defaultVersionKeyForLang(initial.lang || detectLang())`.
  `initial.lang` deixou de ser o idioma do pack e passou a ser a preferência de
  interface, então uma interface PT pode forçar um pack PT: o acoplamento que a
  fase removeu, rodando ao contrário. Alcançável quando o effect de preferências
  persiste `versionKey: ''` junto de `lang`.
- **WR-02** `index.html:412` — `uiLang` inicia sem normalizar, e `<html lang>` /
  `og:locale` usam `=== 'ptbr'` estrito, sem passar por `normLang`. Um valor
  gravado como `'pt-BR'` renderiza interface em português dentro de `lang="en"`.
  A dispensa da D-19 cobre só as buscas no dicionário.
- **WR-03** — o filtro de círculo no desktop é o único filtro base sem
  `formatValue`, então mostra o literal `truque` numa interface em inglês; o
  mobile traduz inline. A varredura da D-02 pegou escola e concentração/ritual e
  passou batido nesse irmão.
- **WR-04 / WR-05** — só o ramo `descHtml` de cada ternário recebeu `lang`; os
  fallbacks em `<p>` de texto puro, os valores de `HifiStat` e o rodapé do card
  (`s.range` / `s.src`) seguem sem marcação, sendo conteúdo do pack. E
  `v11-character-editor.jsx:957` recebeu a metade `versionLang` da D-05 sem a
  metade `lang`.
- **WR-06** — `hifiShare`, `hifiPrint` e `hifiPrintList` não têm nenhum chamador
  no repositório (já estavam mortos em `8a9b5a2`). A fase reescreveu as três
  assinaturas, e `check-content-lang-ownership.tests.ps1:73` hoje trava a
  assinatura de código morto. Decidir: apagar as três funções e a asserção, ou
  ligar de volta o que deveria chamá-las.

## Como retomar

`/gsd-code-review 04.1 --fix` aplica as correções a partir do REVIEW.md, ou
tratar como fase de polimento se preferir revisar cada uma antes.
