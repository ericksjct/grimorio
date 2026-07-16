# Especificação — Animações sutis em menus, filtros e painéis

## Objetivo

Adicionar animações de abertura e fechamento sutis em todos os menus, filtros, painéis e telas modais do Grimório do Jogador que atualmente não possuem transição, mantendo o projeto leve (CSS puro) e respeitando acessibilidade.

## Contexto

O projeto usa React puro (sem bundler identificado), JSX carregado diretamente no navegador, e um design system próprio baseado em `hifi-tokens.css`. As animações existentes são poucas: hover de cards, toast (`hifi-toast-in`), slide-in do editor (`hifi-slide-in`) e transição de width do painel lateral.

Interações sem animação identificadas:

- Menu de personagem (desktop) — abre/fecha sem transição
- Dropdowns de filtro (desktop) — abrem/fecham sem transição
- Menu "+ mais" de filtros (desktop) — abre/fecha sem transição
- Editor de personagem (desktop) — tem animação de entrada, mas não de saída
- Painel de detalhes lateral (desktop) — width animado, mas conteúdo aparece seco
- Character sheet (mobile) — abre/fecha sem transição
- Editor fullscreen (mobile) — abre/fecha sem transição
- Tela de detalhe da magia (mobile) — entra/sai sem transição

## Decisões

- Manter **CSS puro**, sem adicionar bibliotecas de animação.
- Criar um pequeno sistema de transições reutilizáveis via classes CSS.
- Usar um helper React para coordenar animação de saída antes da desmontagem do componente.
- Respeitar `prefers-reduced-motion`.
- Preservar acessibilidade existente (`useDialogA11y`, foco, Escape).

## Tokens de movimento

| Propriedade | Valor |
|-------------|-------|
| Easing      | `cubic-bezier(.2,.7,.3,1)` (já usado no projeto) |
| Curto       | `180ms` (menus, dropdowns, chips) |
| Médio       | `240ms` (painéis, modais, editor) |
| Reduced motion | `animation: none; transition: none;` |

## Classes de transição reutilizáveis

| Classe | Efeito |
|--------|--------|
| `.hifi-fade-in` | Opacidade 0 → 1 |
| `.hifi-fade-out` | Opacidade 1 → 0 |
| `.hifi-slide-up` | translateY(12px) → 0 + fade |
| `.hifi-slide-down` | translateY(-12px) → 0 + fade |
| `.hifi-scale-in` | scale(0.96) → 1 + fade |
| `.hifi-slide-in-right` | translateX(24px) → 0 + fade |
| `.hifi-slide-out-right` | translateX(0) → 24px + fade |

Todas as classes devem usar `animation-fill-mode: both` para manter o estado inicial/final sem flashes.

## Helper React

Criar `useHifiTransition(open, duration)` em `v11-character-editor.jsx` (já é o arquivo de utilidades compartilhadas) ou em local equivalente.

Comportamento:

- Quando `open` vira `true`: retorna `{ mounted: true, cls: 'hifi-fade-in' }` (ou classe desejada).
- Quando `open` vira `false`: retorna `{ mounted: true, cls: 'hifi-fade-out' }` e agenda desmontagem após `duration`.
- Expõe `cls` vazio quando não está montado.

Uso típico:

```jsx
const { mounted, cls } = useHifiTransition(charMenuOpen, 240);
return mounted ? (
  <div className={`hifi-modal-backdrop ${cls}`}>...</div>
) : null;
```

## Componentes a animar

### Desktop

1. **Menu de personagem**
   - Backdrop: `.hifi-fade-in` / `.hifi-fade-out`
   - Conteúdo do modal: `.hifi-scale-in` / `.hifi-fade-out`

2. **Dropdowns de filtro (`FilterChipDropdown`)**
   - Menu dropdown: `.hifi-slide-up` / `.hifi-fade-out`
   - Itens internos: já existem; nenhuma mudança adicional.

3. **Menu "+ mais" (`HifiAddFilter`)**
   - Menu dropdown: `.hifi-slide-up` / `.hifi-fade-out`

4. **Editor de personagem (desktop)**
   - Backdrop: `.hifi-fade-in` / `.hifi-fade-out`
   - Painel: `.hifi-slide-in-right` / `.hifi-slide-out-right`

5. **Painel de detalhes lateral**
   - Conteúdo interno (header + body): `.hifi-slide-in-right` ao abrir.
   - Não animar o width, que já possui transição.

### Mobile

1. **Character sheet (seletor de personagem)**
   - Backdrop: `.hifi-fade-in` / `.hifi-fade-out`
   - Bottom sheet: `.hifi-slide-up` / `.hifi-slide-down`

2. **Editor fullscreen**
   - Contêiner: `.hifi-fade-in` / `.hifi-fade-out` (ou `.hifi-scale-in` suave)

3. **Tela de detalhe da magia**
   - Contêiner: `.hifi-slide-in-right` / `.hifi-slide-out-right`

## Acessibilidade

- Animações puramente visuais; não afetam leitores de tela.
- Manter `useDialogA11y` funcionando sem alterações de comportamento.
- Aplicar `@media (prefers-reduced-motion: reduce)` zerando animações e transições para os novos elementos.

## Critérios de aceitação

- [ ] Todas as interações listadas acima possuem animação de abertura e fechamento.
- [ ] Nenhuma biblioteca de animação foi adicionada.
- [ ] `prefers-reduced-motion` desativa as novas animações.
- [ ] Foco e Escape continuam funcionando em todos os modais/painéis.
- [ ] Não há regressão visual em nenhum tema (claro/escuro, variantes Catppuccin/Nord/Monokai/Solarized/Parchment/Daylight).

## Notas de implementação

- As classes CSS devem ser adicionadas a `hifi-tokens.css`.
- O helper `useHifiTransition` deve ser exposto em `window` para reutilização entre `v10-hifi.jsx` e `v11-character-editor.jsx`.
- Aplicar as classes condicionalmente nos componentes React, substituindo apenas o render condicional quando necessário.
- Para elementos que já usam `animation` inline (editor slide-in), preferir a nova classe de transição para unificar o comportamento.
