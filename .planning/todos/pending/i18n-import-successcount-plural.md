---
id: i18n-import-successcount-plural
status: pending
created: 2026-10-21
source: checkpoint 08-12 (QA headless da Fase 8)
area: i18n.jsx / pack-import-dialog.jsx / v10-hifi.jsx
---

# "1 magias." na tela de sucesso do import, e um ramo morto do "Também em"

Dois restos pequenos observados no QA headless do checkpoint 08-12. Nenhum
reprovou item do roteiro.

## 1. `import.successCount` sem forma singular

A tela de sucesso do import mostra `1 magias.` / `1 spells.` quando o pacote tem
uma magia. A chave (`i18n.jsx`, `'import.successCount': '{n} magias.'`) não tem
par `.one`/`.other`. Seguir a convenção já usada em `import.renamed.*`:
`tt(lang, 'import.successCount.' + window.i18nPlural(n), { n })` em
`pack-import-dialog.jsx`.

## 2. Ramo (2) do "Também em" ficou inalcançável

Em `HifiDetailContent` (`v10-hifi.jsx`), o ramo (2) do efeito `alsoIn` procura um
SRD da mesma edição em outro idioma DENTRO da seleção resolvida (caso EN + PT
marcados juntos, D-03/D-22). Desde a emenda E-06 só um pacote base fica marcado
por vez, então esse caso não acontece mais e o ramo nunca adiciona rótulo.
Candidato a remoção (ou a trocar a fonte para "todos os SRD embutidos", se o
"Também em" entre idiomas ainda for desejado).
