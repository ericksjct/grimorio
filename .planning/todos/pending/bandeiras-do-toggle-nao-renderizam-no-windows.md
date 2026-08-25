---
id: bandeiras-do-toggle-nao-renderizam-no-windows
status: pending
created: 2026-08-24
source: checkpoint 04.1-05 (QA headless da Fase 04.1)
area: v10-hifi.jsx — HifiLangToggle
relates: D-13 (afordância de bandeira no seletor de idioma)
---

# Bandeiras 🇧🇷/🇺🇸 do toggle de idioma não renderizam como bandeira no Windows

## O que foi observado

O `HifiLangToggle` usa emoji de bandeira (`🇧🇷 PT` / `🇺🇸 EN`). No Chromium em
Windows, os pares de indicadores regionais caem para as **letras** `BR` e `US` em
caixa alta pequena, porque o Windows não distribui fonte com glifo de bandeira
(`Segoe UI Emoji` não cobre bandeiras nacionais). Confirmado nas capturas do QA
(desktop e mobile, claro e escuro).

O resultado ainda é legível — lê-se `BR PT / US EN` — mas a afordância visual
pretendida em D-13 (bandeira como pista rápida de idioma) não existe na
plataforma onde o app é usado. Em macOS, iOS e Android as bandeiras aparecem
normalmente.

## Não é bug da Fase 04.1

O componente foi reescrito na fase (plano 04.1-02) mantendo deliberadamente a
afordância de bandeira que já existia. O comportamento é da plataforma, não do
código.

## Opções, se valer mexer

- Aceitar como está — `BR PT` / `US EN` é compreensível.
- Trocar por um ícone SVG próprio (bandeira ou globo), consistente em toda
  plataforma e sem depender de fonte de emoji.
- Usar só os códigos de idioma (`PT` / `EN`) com estado ativo bem marcado,
  abrindo mão da pista de cor.
