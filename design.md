# Design System — Grimório do Jogador

> Consulta de magias de D&D 5e + editor de personagem.
> SPA React (sem build): `index.html` + módulos `.jsx` transpilados no browser via Babel standalone.
> Tokens em `hifi-tokens.css`. Layout em `v10-hifi.jsx` (desktop + mobile compartilham componentes).

---

## 1. Filosofia

Um **grimório** — livro de magias. A linguagem é manuscrito / heritage: serifa para o
conteúdo (nomes e descrições das magias, como num livro), e sans-serif do sistema para o
**chrome** da interface (busca, filtros, botões), que precisa ser neutro e legível.

A regra-chave (definida em `hifi-tokens.css`, bloco final de tipografia):

- **Conteúdo** (magias) → serifa (`Marauder Text`, fallback Georgia).
- **Display / títulos** → `Texturina` (small-caps, 700).
- **Chrome da UI** (input, chips, botões, ícones) → `ui-sans-serif, system-ui, …`.
- **Numéricos / rótulos técnicos / rodapé** → `JetBrains Mono` (maiúsculas, espaçado).

Tudo é temável: o app não tem uma paleta fixa, e sim tokens semânticos que cada tema preenche.

---

## 2. Tipografia

| Papel | Fonte | Uso |
|------|-------|-----|
| Display | `Texturina` 700, `font-variant: small-caps` | "Grimório", nome da magia, títulos de impressão |
| Conteúdo | `Marauder Text` (400/700, itálico) | descrições, nomes, texto rico das magias |
| Chrome | `ui-sans-serif / system-ui` | busca, filtros, botões, menus |
| Mono | `JetBrains Mono` | contagem de resultados, rodapé, V/S/M, flags, rótulos `uppercase` |

`Texturina` e `JetBrains Mono` são **self-hosted** (`fonts/*.woff2`, fontes variáveis,
`@font-face` com `font-weight: 400 800`). `Marauder` também é self-hosted (`marauder/webfonts`).
Não há `<link>` para o Google Fonts (evita render-blocking, vazamento de IP e funciona offline).

---

## 3. Cor — tokens semânticos + temas

Toda cor vem de variáveis CSS, nunca hex direto nos componentes. Escala de superfície
(do fundo ao topo) + texto + acentos:

```
--base → --mantle → --crust          (fundos)
--surface0 → --surface1 → --surface2 (superfícies / bordas)
--overlay0..2                        (elementos sutis)
--subtext0 → --subtext1 → --text     (texto, do fraco ao forte)
--accent                             (cor do personagem ativo; trava por página)
--level-0..9                         (codificação do NÍVEL da magia — dado, não decoração)
```

`--level-N` é uma rampa de 10 cores que codifica o nível da magia (truque → 9). É uma
**exceção legítima** à regra de "1 acento só": é informação, não enfeite.

### Temas (em `hifi-tokens.css`)
Cada tema é uma classe sobre `.hifi-light` / `.hifi-dark`:

- **daylight** ("Claro (carta)") — tema canônico/default. Claro = papel quase-branco;
  escuro = Monokai Pro (Filter Octagon).
- **catppuccin** (Latte/Mocha), **nord**, **monokai**, **solarized** — paletas reais, creditadas no rodapé.
- **parchment** ("Pergaminho") — papel sépia, autoral, só claro.

O tema é **travado por página** (uma página = um tema; seções não invertem). O modo
claro/escuro alterna pela vela (`HifiThemeToggle`) e é persistido em `localStorage`.

---

## 4. Componentes

- **Card de magia** (`HifiSpellCard`, compartilhado): nome (display) + escola·nível + descrição
  (com fade-out no corte) + rodapé mono (V/S/M, alcance, fonte, C/R). Fita de "preparada"
  clicável no topo; estrela de "favorita" sobreposta. Hover neutro (borda + sombra); acento
  reservado ao card selecionado.
- **Painel de detalhe** (desktop): desliza da direita; header e action-bar sticky.
- **Filtros**: chips com dropdown (nível/escola/classe + extras via "+ mais"); canon de altura.
- **Estado vazio** (`HifiEmptyState`, compartilhado): quando busca/filtros retornam 0, mostra
  mensagem composta + botão "limpar filtros".

### Canon de tamanho
- **Desktop** (`.hifi-desktop`): todos os controles da faixa (chips, filtros, botões,
  ícones, busca) têm altura fixa de 30px.
- **Mobile** (`.hifi-mobile`, bloco "CANON MOBILE" no fim de `hifi-tokens.css`): três
  tamanhos, todos em sans do sistema e com rótulo em frase com maiúscula inicial.
  - **Ação** (primária / secundária / ghost): 44px, raio 12.
  - **Campo e seleção** (input, pill, bloco de filtro, segmentado): 40–44px, raio 10–12.
  - **Ícone de header**: 36px visíveis, área de toque de 44px (`::before` em `pointer: coarse`).

  Filtros do mobile são grade de blocos iguais (`.hifi-filter-grid`), não pílulas de
  largura variável. Estados vazios usam sempre `HifiEmptyState` (ícone, título, frase e
  uma ação), com a mensagem do motivo real.

### Forma e elevação
- Raio: pills `999px`; cards `6px`; dropdowns `4px`. (consistente)
- Sombras **tingidas e suaves**, nunca preto-puro duro; mais fortes no modo escuro.

---

## 5. Escala do grid (`--z`)

O grid de cards do desktop escala 20% via custom property **`--z`** (`v10-hifi.jsx`):
o grid seta `--z: 1.2`, que cascateia pros cards, e cada dimensão é `calc(Npx * var(--z, 1))`.
Largura (coluna `minmax`) e altura escalam pelo mesmo fator → **aspect ratio preservado** e
**colunas refluem**. O mobile não seta `--z` → fallback `1` (tamanhos originais).
(Substituiu o antigo `zoom: 1.2`, que era CSS não-padrão.)

---

## 6. Responsividade

- Layout decidido pela **menor** dimensão da viewport (`Math.min(w, h) < 768` → mobile),
  pra um celular usar layout mobile em retrato E paisagem.
- Desktop: grid de cards + painel lateral. Mobile: lista (1 coluna; 2 em paisagem) +
  **tab bar** fixa embaixo (Buscar · Filtros · Preparadas · Sessão · Mais) + tela de
  detalhe full-screen.
  - **Buscar** estica a própria barra num campo de texto (animação de `clip-path`); o
    campo fica sempre montado para o `focus()` rodar no mesmo toque (teclado do iOS).
  - **Filtros** e **Mais** abrem uma folha acima da barra; **Mais** é uma lista agrupada
    de linhas de 48px (pacotes, tema, idioma, imprimir, compartilhar).
  - Safe-area: shell, barra e barra de ação do detalhe usam `env(safe-area-inset-*)`.
  - Hover só existe em `@media (hover: hover)` — no toque não "gruda".
  - Teclado (Android): o viewport usa `interactive-widget=resizes-content`, então o teclado
    encolhe a página e a tab bar encosta nele. O `<html>` é pintado com `--mantle` do tema
    ativo, então nenhuma folga (teclado, overscroll) aparece em outra cor.
  - A tela principal não mostra espaços de magia; eles são gastos e recuperados no modo sessão.

---

## 7. Acessibilidade

- Botões só-ícone têm `aria-label` (glifos `×`, `‹`, `★`, etc. ficam `aria-hidden`).
- Toggles usam `aria-pressed` (preparadas, favorita, tema).
- `prefers-reduced-motion` respeitado (ex.: dots de boot).
- Contraste WCAG AA é meta em todos os temas × modos (testar ao adicionar tema novo).

---

## 8. Impressão

`@media print` dedicado (`hifi-tokens.css`): folha `#hifi-print-sheet` com 3 modos —
`list` (compacto), `pack` (2 colunas, "imprimir preparadas") e `single` (uma magia por página).
Tudo forçado a P&B; tracker de slots de magia no topo.

---

## 9. Stack

- React 18 + ReactDOM + Babel standalone (UMD via unpkg, fixados com SRI). Sem build step.
- Ordem de carga importa: `grimorio-helpers` → `spells-data-loader` → `v11-character-editor` → `v10-hifi`.
- Dados: `spells-5E-{2014,2024}-{EN,PTBR}.json`. Persistência: `localStorage`
  (prefs de tema/modo/personagem, preparadas por personagem, favoritas globais).
- Roda em `file://`, no preview e no GitHub Pages sem alterações.
</content>
</invoke>
