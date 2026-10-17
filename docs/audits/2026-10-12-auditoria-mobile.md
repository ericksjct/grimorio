# Auditoria mobile — 2026-10-12

Skill: `design-taste-frontend` (modo auditoria).

> **Status (2026-10-16): resolvida.** Os 14 itens foram implementados no commit `60f9b61`
> (fases 9-11 do roadmap), a partir de um protótipo validado. O item 1 (gaveta) deixou de
> existir: o drawer foi trocado por uma tab bar. A faixa clara entre a busca e o teclado do
> Android foi corrigida em `145f620`. Teclado, notch e safe-area foram confirmados em
> aparelho real. O texto abaixo é o registro original da auditoria.

**Método:** site servido localmente e renderizado no Playwright (Chromium) em 390×844, 320×568
e paisagem 844×390, nos temas claro e escuro. Alvos de toque e contraste WCAG medidos no DOM
renderizado.

**Leitura do design:** app de produto (consulta de magias + editor) para jogadores de D&D, com
visual de grimório manuscrito. No mobile: lista de 1 coluna, gaveta de busca/filtros embaixo e
detalhe em tela cheia. As regras da skill para landing page (hero, CTA, bento) não se aplicam;
o foco foi toque, legibilidade e adaptação ao celular.

Sem overflow horizontal em nenhuma largura e sem erros de JS.

## Alta prioridade

1. **A gaveta só abre por um alvo de 12px de altura.** O botão de abrir é só o tracinho de
   390×12 (`v10-hifi.jsx` ~2549). A linha "buscar, filtrar… / 339 magias" (~2556) não responde a
   toque, só ao arrastar, e é o controle principal do app.
   *Correção:* tornar clicável a barra recolhida inteira, de 56px.
2. **Os filtros (pílulas) são `<span onClick>`** (`HifiPill`, `v10-hifi.jsx` ~378). Não funcionam
   por teclado nem por leitor de tela, e cada um tem ~20px de altura.
   *Correção:* usar `<button type="button" aria-pressed>` e `min-height: 32px` em telas de toque.
3. **Os botões de ícone têm 25×25** (`.hifi-icon-btn`, `hifi-tokens.css` ~546). O mínimo
   recomendado é 44px (Apple) / 48dp (Android). Afeta:
   - "só preparadas" e "modo sessão" no header;
   - voltar, favoritar e copiar link no detalhe;
   - tema, PT/EN, imprimir e exportar na gaveta;
   - o botão "preparar" do detalhe (358×25);
   - a fita de "preparada" no card (18×26).

   *Correção:* manter o visual de 25px e aumentar a área de toque com `::before { inset: -10px }`,
   ou usar 40px dentro de `@media (pointer: coarse)`.
4. **`viewport-fit=cover` sem nenhum `env(safe-area-inset-*)`** no projeto. Em iPhone com notch,
   em paisagem, o notch cobre o conteúdo da esquerda, e o home indicator fica por cima da gaveta
   recolhida. O `paddingTop: 24` fixo do container mobile (~2408) é um valor chutado.
   *Correção:*
   - `padding-top: max(12px, env(safe-area-inset-top))`;
   - padding esquerdo/direito com os insets laterais;
   - altura da gaveta recolhida = `56px + env(safe-area-inset-bottom)`.

## Média prioridade

5. **O `:hover` não é protegido em telas de toque.** No celular, o hover "gruda" depois de um
   toque: os cards ficam com a borda escura e as pílulas presas em `translateY(-2px)`
   (`hifi-tokens.css` ~337, ~489, ~513 e outros).
   *Correção:* envolver os hovers em `@media (hover: hover)`.
6. **O título do header quebra mal.** "Grimório de Aventureiro Desconhecido" em 22px vira 2
   linhas desalinhadas em 390px e 4 linhas em 320px, com o "▾" sozinho numa linha
   (~2461–2471).
   *Correção:* no mobile, o nome do personagem fica em 1 linha com `text-overflow: ellipsis` e
   fonte de ~18px, ou "Grimório" pequeno empilhado acima do nome.
7. **Os textos são pequenos demais para leitura no celular:**

   | Elemento | Tamanho atual |
   |---|---|
   | Descrição no card | 11.5px |
   | Chips V/S/M | 9px |
   | Nível | 11px |

   *Correção:* subir a descrição para 14–15px.
8. **Os cards mostram a descrição inteira.** "Arte Druídica" ocupa ~1 tela sozinho, o que
   dificulta ler a lista por cima. É uma decisão deliberada (comentário em `hifi-tokens.css` ~331).
   *Sugestão:* limitar a ~4 linhas com fade, já que tocar no card abre o detalhe.
9. **Contraste abaixo do mínimo AA:**

   | Elemento | Contraste medido | Mínimo |
   |---|---|---|
   | "○" de truque (nível 0) | 2.5:1 (claro), 2.08:1 (escuro) | 3:1 |
   | Separador "·" | 2.5:1 | 3:1 |
   | Placeholder "buscar, filtrar…" | 4.05:1 | 4.5:1 |

   O "○" carrega informação, por isso precisa de pelo menos 3:1. O "M" apagado é intencional e
   está ok.
10. **Em paisagem, as linhas da descrição chegam a ~180 caracteres.**
    *Correção:* `max-width: 70ch` no conteúdo do card, ou 2 colunas acima de ~700px de largura.

## Baixa prioridade

11. **Modo sessão:** a fileira de stats (CD/Ataque/Conjuração/Prof.) empurra o ícone ⓘ para a
    borda direita, onde ele fica cortado.
12. **Texto vazio do modo sessão:** "nenhuma magia preparada — marque…" usa travessão, que a
    skill proíbe. Trocar por ponto ou vírgula.
13. **Escola abreviada na lista** ("necr", "trans", "evoc"), enquanto o detalhe escreve por
    extenso. No mobile há espaço para o nome completo.
14. **Emoji 🎲 e ☀️ usados como ícone** aparecem diferentes em cada sistema. Considerar ícones
    SVG de uma única família.

## O que está bom

- Sem scroll horizontal em 320px.
- O input da gaveta tem 16px, então o iOS não dá zoom ao focar.
- A altura da gaveta usa `min()` e cabe em paisagem.
- O dark mode é coerente.
- `prefers-reduced-motion` é respeitado.
- O detalhe em tela cheia, com header e ação fixos, funciona bem.

## Próximos passos

Os itens 1–5 são correções mecânicas de poucas linhas cada; aplicar primeiro.
