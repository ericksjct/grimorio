# Animações em menus, filtros e painéis — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar animações de abertura/fechamento sutis (CSS puro) nos menus, dropdowns de filtro, painéis e telas modais do Grimório que ainda não possuem transição.

**Architecture:** Criar classes CSS reutilizáveis de transição em `hifi-tokens.css` e um helper React `useHifiTransition` em `v11-character-editor.jsx`. Aplicar o helper nos componentes React para animar montagem/desmontagem, preservando acessibilidade e respeitando `prefers-reduced-motion`.

**Tech Stack:** React puro, JSX via Babel/browser, CSS em `hifi-tokens.css`.

## Global Constraints

- Sem bibliotecas de animação — CSS puro.
- Easing padrão: `cubic-bezier(.2,.7,.3,1)`.
- Duração curta: `180ms`; duração média: `240ms`.
- Respeitar `prefers-reduced-motion` desativando animações.
- Preservar `useDialogA11y`, foco e Escape.
- Não quebrar nenhum dos 6 temas existentes.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `hifi-tokens.css` | Adicionar keyframes e classes de transição reutilizáveis. |
| `v11-character-editor.jsx` | Adicionar e expor `useHifiTransition` em `window`. |
| `v10-hifi.jsx` | Aplicar animações nos componentes sem transição. |

---

## Task 1: Adicionar classes de transição no CSS

**Files:**
- Modify: `hifi-tokens.css`

**Interfaces:**
- Produces: classes CSS `.hifi-fade-in`, `.hifi-fade-out`, `.hifi-slide-up`, `.hifi-slide-down`, `.hifi-scale-in`, `.hifi-slide-in-right`, `.hifi-slide-out-right`.

- [ ] **Step 1: Abrir `hifi-tokens.css` e localizar a seção de keyframes existentes**

  Busque por `@keyframes hifi-slide-in` (linha ~755). As novas animações serão inseridas logo após os keyframes existentes, antes do bloco de print.

- [ ] **Step 2: Adicionar keyframes de transição**

  Insira o seguinte bloco após o `@keyframes hifi-toast-in`:

  ```css
  @keyframes hifi-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes hifi-fade-out {
    from { opacity: 1; }
    to   { opacity: 0; }
  }
  @keyframes hifi-slide-up {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes hifi-slide-down {
    from { opacity: 0; transform: translateY(-12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes hifi-scale-in {
    from { opacity: 0; transform: scale(0.96); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes hifi-slide-in-right {
    from { opacity: 0; transform: translateX(24px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes hifi-slide-out-right {
    from { opacity: 1; transform: translateX(0); }
    to   { opacity: 0; transform: translateX(24px); }
  }
  ```

- [ ] **Step 3: Adicionar classes utilitárias de transição**

  Insira o seguinte bloco após o keyframe recém-adicionado (antes do print):

  ```css
  .hifi-fade-in { animation: hifi-fade-in 180ms cubic-bezier(.2,.7,.3,1) both; }
  .hifi-fade-out { animation: hifi-fade-out 180ms cubic-bezier(.2,.7,.3,1) both; }
  .hifi-slide-up { animation: hifi-slide-up 180ms cubic-bezier(.2,.7,.3,1) both; }
  .hifi-slide-down { animation: hifi-slide-down 180ms cubic-bezier(.2,.7,.3,1) both; }
  .hifi-scale-in { animation: hifi-scale-in 180ms cubic-bezier(.2,.7,.3,1) both; }
  .hifi-slide-in-right { animation: hifi-slide-in-right 240ms cubic-bezier(.2,.7,.3,1) both; }
  .hifi-slide-out-right { animation: hifi-slide-out-right 240ms cubic-bezier(.2,.7,.3,1) both; }
  ```

- [ ] **Step 4: Adicionar regra de reduced motion**

  No final do arquivo, após `@media print`, adicione:

  ```css
  @media (prefers-reduced-motion: reduce) {
    .hifi-fade-in,
    .hifi-fade-out,
    .hifi-slide-up,
    .hifi-slide-down,
    .hifi-scale-in,
    .hifi-slide-in-right,
    .hifi-slide-out-right {
      animation: none !important;
      transition: none !important;
    }
  }
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add hifi-tokens.css
  git commit -m "feat: add reusable transition animation classes"
  ```

---

## Task 2: Criar helper React `useHifiTransition`

**Files:**
- Modify: `v11-character-editor.jsx`

**Interfaces:**
- Produces: `function useHifiTransition(open, duration = 180)` exposto em `window.useHifiTransition`, retornando `{ mounted: boolean, cls: string }`.
- Consumes: nenhum.

- [ ] **Step 1: Localizar o final do arquivo, antes de `Object.assign(window, { ... })`**

  O helper será definido após a função `useDialogA11y` e antes do `Object.assign` final.

- [ ] **Step 2: Implementar `useHifiTransition`**

  Adicione o seguinte código:

  ```jsx
  function useHifiTransition(open, duration = 180) {
    const [state, setState] = React.useState({ mounted: open, cls: open ? 'hifi-fade-in' : '' });
    const timerRef = React.useRef(null);

    React.useEffect(() => {
      if (open) {
        if (timerRef.current) clearTimeout(timerRef.current);
        setState({ mounted: true, cls: 'hifi-fade-in' });
      } else {
        setState(prev => ({ ...prev, cls: 'hifi-fade-out' }));
        timerRef.current = setTimeout(() => {
          setState({ mounted: false, cls: '' });
        }, duration);
      }
      return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, [open, duration]);

    return state;
  }
  ```

- [ ] **Step 3: Expor `useHifiTransition` no `window`**

  Atualize o `Object.assign` final para incluir `useHifiTransition`:

  ```js
  Object.assign(window, {
    HIFI_PALETTE, ACCENT_SLOTS, THEME_PALETTES,
    paletteFor, paletteForTheme, accentOf, normalizeAccentId,
    HIFI_DEFAULT_CHARS,
    loadCharacters, persistCharacters, useCharacters,
    loadBookmarks, persistBookmarks, useBookmarks,
    togglePreparedFor, toggleBookmarkedFor,
    charHasPrepared, charHasBookmarked,
    CharacterEditor,
    useHifiTransition,
  });
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add v11-character-editor.jsx
  git commit -m "feat: add useHifiTransition helper for mount/unmount animations"
  ```

---

## Task 3: Animar menu de personagem (desktop)

**Files:**
- Modify: `v10-hifi.jsx` (região do menu de personagem, linhas ~1006-1060)

**Interfaces:**
- Consumes: `window.useHifiTransition` (Task 2).
- Produces: nenhum (efeito visual apenas).

- [ ] **Step 1: Localizar o render condicional do menu de personagem**

  O código atual é:

  ```jsx
  {charMenuOpen && (
    <div onClick={() => setCharMenuOpen(false)} style={{
      position: 'fixed', inset: 0, zIndex: 70,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.4)',
    }}>
      <div
        ref={charMenuRef}
        role="dialog" aria-modal="true"
        aria-label={tt(lang, 'char.switch')}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()} style={{
        background: 'var(--mantle)', border: '1px solid var(--surface1)', borderRadius: 8,
        minWidth: 280, padding: '4px 0',
        boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
      }}>
        ...
      </div>
    </div>
  )}
  ```

- [ ] **Step 2: Aplicar `useHifiTransition` no componente `HifiDesktop`**

  Antes do `return`, adicione:

  ```jsx
  const charMenuTransition = window.useHifiTransition(charMenuOpen, 240);
  ```

  Substitua `{charMenuOpen && (` por `{charMenuTransition.mounted && (`.

- [ ] **Step 3: Adicionar classes de animação ao backdrop e ao conteúdo**

  No `div` de backdrop (externo), adicione a classe `hifi-fade-in`/`hifi-fade-out`:

  ```jsx
  <div onClick={() => setCharMenuOpen(false)} className={charMenuTransition.cls} style={{
    position: 'fixed', inset: 0, zIndex: 70,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.4)',
  }}>
  ```

  No `div` de conteúdo interno, adicione `hifi-scale-in` para entrada e `hifi-fade-out` para saída. Como a classe de saída é global, use uma classe condicional:

  ```jsx
  <div
    ref={charMenuRef}
    role="dialog" aria-modal="true"
    aria-label={tt(lang, 'char.switch')}
    tabIndex={-1}
    onClick={(e) => e.stopPropagation()}
    className={charMenuOpen ? 'hifi-scale-in' : charMenuTransition.cls}
    style={{ ... }}
  >
  ```

  Nota: durante a saída, `charMenuOpen` é `false` e `charMenuTransition.cls` será `'hifi-fade-out'`, então o conteúdo fadeia. Durante a entrada, `charMenuOpen` é `true` e a classe `hifi-scale-in` é aplicada.

- [ ] **Step 4: Commit**

  ```bash
  git add v10-hifi.jsx
  git commit -m "feat: animate desktop character menu open/close"
  ```

---

## Task 4: Animar dropdowns de filtro (desktop)

**Files:**
- Modify: `v10-hifi.jsx` (componente `FilterChipDropdown`, linhas ~1327-1383)

**Interfaces:**
- Consumes: `window.useHifiTransition`.
- Produces: nenhum.

- [ ] **Step 1: Adicionar transição no `FilterChipDropdown`**

  No início do componente, adicione:

  ```jsx
  const dropdownTransition = window.useHifiTransition(open, 180);
  ```

- [ ] **Step 2: Substituir o render condicional do menu**

  Onde está `{open && (` para o menu dropdown, substitua por `{dropdownTransition.mounted && (`.

- [ ] **Step 3: Aplicar classe ao menu dropdown**

  No `div` do menu (o que tem `position: 'absolute', top: '100%', left: 0, ...`), adicione:

  ```jsx
  className={open ? 'hifi-slide-up' : dropdownTransition.cls}
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add v10-hifi.jsx
  git commit -m "feat: animate filter dropdown open/close"
  ```

---

## Task 5: Animar menu "+ mais" de filtros (desktop)

**Files:**
- Modify: `v10-hifi.jsx` (componente `HifiAddFilter`, linhas ~1387-1422)

**Interfaces:**
- Consumes: `window.useHifiTransition`.
- Produces: nenhum.

- [ ] **Step 1: Adicionar transição no `HifiAddFilter`**

  No início do componente, adicione:

  ```jsx
  const addMenuTransition = window.useHifiTransition(open, 180);
  ```

- [ ] **Step 2: Substituir o render condicional do menu**

  Onde está `{open && (`, substitua por `{addMenuTransition.mounted && (`.

- [ ] **Step 3: Aplicar classe ao menu dropdown**

  No `div` do menu (com `position: 'absolute', top: '100%', left: 0, ...`), adicione:

  ```jsx
  className={open ? 'hifi-slide-up' : addMenuTransition.cls}
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add v10-hifi.jsx
  git commit -m "feat: animate add-filter dropdown open/close"
  ```

---

## Task 6: Animar painel de detalhes lateral (desktop)

**Files:**
- Modify: `v10-hifi.jsx` (painel lateral dentro de `HifiDesktop`, linhas ~1191-1251)

**Interfaces:**
- Consumes: `window.useHifiTransition`.
- Produces: nenhum.

- [ ] **Step 1: Adicionar transição para o conteúdo do painel**

  Após a definição de `open = !!sel`, adicione:

  ```jsx
  const detailTransition = window.useHifiTransition(open, 240);
  ```

- [ ] **Step 2: Aplicar classe no conteúdo interno do painel**

  O conteúdo interno do painel é renderizado quando `open` é true. Substitua `{open && (` por `{detailTransition.mounted && (`.

  No `div` interno que envolve `<>` (linha ~1201), adicione:

  ```jsx
  className={open ? 'hifi-slide-in-right' : detailTransition.cls}
  ```

  Importante: este `div` deve envolver todo o conteúdo do painel (header, body, footer) sem afetar o `div` pai que controla o width.

- [ ] **Step 3: Commit**

  ```bash
  git add v10-hifi.jsx
  git commit -m "feat: animate detail panel content on desktop"
  ```

---

## Task 7: Animar editor de personagem (desktop) na saída

**Files:**
- Modify: `v10-hifi.jsx` (editor slide-in dentro de `HifiDesktop`, linhas ~1291-1320)

**Interfaces:**
- Consumes: `window.useHifiTransition`.
- Produces: nenhum.

- [ ] **Step 1: Adicionar transição para o editor**

  No início de `HifiDesktop`, adicione:

  ```jsx
  const editorTransition = window.useHifiTransition(!!editor, 240);
  ```

- [ ] **Step 2: Substituir o render condicional do editor**

  Substitua `{editor && (` por `{editorTransition.mounted && (`.

- [ ] **Step 3: Aplicar classes ao backdrop e ao painel**

  No `div` de backdrop (com `background: 'rgba(0,0,0,0.35)'`), adicione:

  ```jsx
  className={editor ? 'hifi-fade-in' : editorTransition.cls}
  ```

  No `div` do painel (com `animation: 'hifi-slide-in 240ms cubic-bezier(.2,.7,.3,1)'`), remova o `animation` inline e adicione:

  ```jsx
  className={editor ? 'hifi-slide-in-right' : (editorTransition.cls || 'hifi-slide-out-right')}
  ```

  Se `editorTransition.cls` for `'hifi-fade-out'` na saída, a animação de saída à direita deve ser `hifi-slide-out-right`. Para garantir isso, o helper pode ser usado com classe base diferente, ou simplifique usando sempre `hifi-slide-out-right` quando `!editor && editorTransition.mounted`.

  Ajuste final:

  ```jsx
  className={editor ? 'hifi-slide-in-right' : (editorTransition.mounted ? 'hifi-slide-out-right' : '')}
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add v10-hifi.jsx
  git commit -m "feat: animate character editor open/close on desktop"
  ```

---

## Task 8: Animar character sheet (mobile)

**Files:**
- Modify: `v10-hifi.jsx` (character sheet mobile dentro de `HifiMobile`, linhas ~1832-1892)

**Interfaces:**
- Consumes: `window.useHifiTransition`.
- Produces: nenhum.

- [ ] **Step 1: Adicionar transição para o character sheet**

  No início de `HifiMobile`, adicione:

  ```jsx
  const charSheetTransition = window.useHifiTransition(charSheetOpen, 240);
  ```

- [ ] **Step 2: Substituir o render condicional**

  Substitua `{charSheetOpen && (` por `{charSheetTransition.mounted && (`.

- [ ] **Step 3: Aplicar classes ao backdrop e ao bottom sheet**

  No `div` de backdrop (com `background: 'rgba(0,0,0,0.45)'`), adicione:

  ```jsx
  className={charSheetOpen ? 'hifi-fade-in' : charSheetTransition.cls}
  ```

  No `div` do bottom sheet (filho direto com `width: '100%', background: 'var(--mantle)', ...`), adicione:

  ```jsx
  className={charSheetOpen ? 'hifi-slide-up' : 'hifi-slide-down'}
  ```

  Nota: `hifi-slide-down` é uma animação de entrada. Para saída, é melhor usar `hifi-fade-out` no conteúdo. Ajuste:

  ```jsx
  className={charSheetOpen ? 'hifi-slide-up' : (charSheetTransition.mounted ? 'hifi-fade-out' : '')}
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add v10-hifi.jsx
  git commit -m "feat: animate mobile character sheet open/close"
  ```

---

## Task 9: Animar editor fullscreen (mobile)

**Files:**
- Modify: `v10-hifi.jsx` (editor fullscreen mobile dentro de `HifiMobile`, linhas ~1895-1913)

**Interfaces:**
- Consumes: `window.useHifiTransition`.
- Produces: nenhum.

- [ ] **Step 1: Adicionar transição para o editor mobile**

  No início de `HifiMobile`, já adicionado na Task 8, aproveite ou adicione:

  ```jsx
  const mobileEditorTransition = window.useHifiTransition(!!editor, 240);
  ```

- [ ] **Step 2: Substituir o render condicional**

  Substitua `{editor && (` por `{mobileEditorTransition.mounted && (`.

- [ ] **Step 3: Aplicar classe ao contêiner**

  No `div` com `position: 'absolute', inset: 0, zIndex: 30`, adicione:

  ```jsx
  className={editor ? 'hifi-fade-in' : mobileEditorTransition.cls}
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add v10-hifi.jsx
  git commit -m "feat: animate mobile fullscreen editor open/close"
  ```

---

## Task 10: Animar tela de detalhe da magia (mobile)

**Files:**
- Modify: `v10-hifi.jsx` (tela de detalhe dentro de `HifiMobile`, linhas ~1538-1581)

**Interfaces:**
- Consumes: `window.useHifiTransition`.
- Produces: nenhum.

- [ ] **Step 1: Adicionar transição para a tela de detalhe**

  No início da condição `if (sel)`, adicione antes do `return`:

  ```jsx
  const detailScreenTransition = window.useHifiTransition(true, 240);
  ```

  **Correção:** como a tela é renderizada condicionalmente quando `sel` existe, a animação de saída precisa ser coordenada. Uma abordagem melhor é envolver a tela em um wrapper controlado por `useHifiTransition(!!sel, 240)`.

  Refatore: extraia a tela de detalhe para uma variável ou componente e envolva com transição.

  Simplificação: no `if (sel)`, crie:

  ```jsx
  const detailTransition = window.useHifiTransition(true, 240);
  ```

  Não funciona bem para saída. A solução correta é mover a transição para quem controla `selectedIdx`.

  **Abordagem recomendada:** no corpo principal de `HifiMobile`, envolva o bloco `if (sel) { return (...) }` em uma transição. Como isso afeta o retorno antecipado, a melhor solução é transformar o `if (sel)` em um render condicional dentro do mesmo `return`, permitindo `useHifiTransition`.

  Para evitar grandes refatorações, use um wrapper inline:

  ```jsx
  const showDetail = !!sel;
  const detailScreenTransition = window.useHifiTransition(showDetail, 240);
  ```

  E no `return` principal, renderize:

  ```jsx
  {detailScreenTransition.mounted && (
    <div className={showDetail ? 'hifi-slide-in-right' : (detailScreenTransition.mounted ? 'hifi-slide-out-right' : '')} style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
      ...conteúdo da tela de detalhe...
    </div>
  )}
  ```

  Essa alteração é maior; considere extrair `HifiMobileDetailScreen`.

- [ ] **Step 2: Commit (após refatoração e teste visual)**

  ```bash
  git add v10-hifi.jsx
  git commit -m "feat: animate mobile spell detail screen open/close"
  ```

---

## Task 11: Testes e verificação manual

**Files:**
- Nenhum arquivo novo.

**Interfaces:**
- Nenhuma.

- [ ] **Step 1: Abrir `index.html` no navegador**

  Inicie um servidor local se necessário (ex: `npx serve` ou `python -m http.server`) e abra `index.html`.

- [ ] **Step 2: Verificar desktop**

  - Clique no nome do personagem no header: menu deve aparecer com fade + scale, fechar com fade.
  - Clique em filtros (Nível, Escola, Classe): dropdown deve deslizar para cima na abertura.
  - Clique em "+ mais": menu deve deslizar para cima.
  - Clique em um card de magia: painel lateral deve expandir e o conteúdo deve deslizar da direita.
  - Clique em "Editar" no menu de personagem: editor deve deslizar da direita; fechar deve deslizar para a direita.

- [ ] **Step 3: Verificar mobile**

  - Use modo mobile do navegador (largura < 768px) ou abra no celular.
  - Toque no nome do personagem: bottom sheet deve deslizar de baixo.
  - Toque em um card: tela de detalhe deve deslizar da direita.
  - Toque em "Editar": editor fullscreen deve fade in/out.

- [ ] **Step 4: Verificar reduced motion**

  No DevTools, emular `prefers-reduced-motion: reduce`. Todas as animações novas devem desaparecer instantaneamente (sem flicker).

- [ ] **Step 5: Verificar foco e Escape**

  - Navegue por teclado (Tab) até o botão do menu de personagem e pressione Enter.
  - Pressione Escape: menu deve fechar.
  - O foco deve voltar ao botão que abriu o menu.
  - Repetir para dropdowns de filtro e editor.

- [ ] **Step 6: Verificar temas**

  Troque entre os temas claro/escuro e as variantes (Catppuccin, Nord, Monokai, Solarized, Parchment, Daylight). Confirme que não há quebras visuais.

- [ ] **Step 7: Commit de ajustes se necessário**

  Se houver ajustes, commit separado:

  ```bash
  git add .
  git commit -m "fix: animation polish after manual testing"
  ```

---

## Self-Review

### Spec coverage

- Classes CSS reutilizáveis → Task 1
- Helper `useHifiTransition` → Task 2
- Menu de personagem desktop → Task 3
- Dropdowns de filtro → Task 4
- Menu "+ mais" → Task 5
- Painel de detalhes desktop → Task 6
- Editor desktop → Task 7
- Character sheet mobile → Task 8
- Editor fullscreen mobile → Task 9
- Tela de detalhe mobile → Task 10
- Testes manuais → Task 11

### Placeholder scan

Nenhum TBD/TODO. Todos os passos incluem código ou comando concreto.

### Type consistency

- `useHifiTransition(open, duration)` usado consistentemente em todos os tasks.
- Retorno `{ mounted, cls }` aplicado em todos os pontos.

### Gaps conhecidos

- Task 10 requer pequena refatoração do `if (sel)` em `HifiMobile`. O plano aponta a abordagem, mas o implementador deve decidir se extrai componente ou usa wrapper inline.
- Não há testes automatizados porque o projeto não possui suite de testes frontend configurada (apenas openspec/playwright no package.json). A verificação é manual.
