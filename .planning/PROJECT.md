# Grimório do Jogador

## What This Is

A no-build, offline-first single-page web app for browsing and filtering D&D 5e spells from installable spell packs (built-in SRD 5.1 EN, SRD 5.2 EN and pt-BR, plus user-imported packs), managing player characters (classes, spell slots, prepared/bookmarked spells), and printing spell sheets. Runs entirely client-side (React + Babel via CDN, no bundler) as an installable PWA — works on `file://`, any static host, or GitHub Pages, fully offline after first load.

## Core Value

Players can quickly find, prepare, and reference the right spells for their character, fully offline, with zero setup.

## Requirements

### Validated

<!-- Shipped and confirmed working — inferred from existing codebase (.planning/codebase/) and git history. -->

- ✓ Spell browsing/filtering by class, level, school, ritual, concentration, components, casting time, range, and source, with search — desktop grid + mobile list layouts
- ✓ Character management: create/edit/delete characters, class levels, spellcasting stats, manual and auto-computed spell slots, per-character accent color
- ✓ Prepared-spell and bookmark tracking per character, persisted to `localStorage`
- ✓ Print prepared spells to a formatted sheet (`hifi-print-request` → print portal)
- ✓ Share a character build via URL (base64-encoded `?build=` parameter)
- ✓ Offline-first PWA via service worker — precaches app shell + the built-in packs in `packs/`
- ✓ 6 visual themes (Catppuccin, Nord, Monokai, Solarized, Parchment, Daylight) × light/dark, with PT-BR/EN localization. **Nota (Fase 04.1):** a localização deixou de ser derivada da versão de magias — o idioma da interface é preferência própria do usuário
- ✓ Menu/filter/panel open-close micro-animations — desktop character menu, filter dropdowns, "+ mais" filter menu, character editor, side detail panel; mobile character sheet, fullscreen editor, spell detail screen. Implemented per `docs/superpowers/specs/2026-07-05-animacoes-menus-filtros-design.md` (commits `e733b1c`..`463fb7d`). Manual verification pass (cross-theme, reduced-motion, keyboard focus) confirmed done by the user on 2026-07-17.
- ✓ Session mode (mobile): dedicated in-game screen with derived caster stats (spell DC / attack / modifier / proficiency from class+level+ability scores), compact BG3-style slot tracker, prepared-spells list (cards/list views), cast action with school-colored spark animation and upcast sheet. Spec: `docs/superpowers/specs/2026-07-17-modo-sessao-mobile-design.md`.
- ✓ Plugin storage foundation (STOR-01/02/03) — `plugin-store.jsx`: IndexedDB CRUD (`grimorio-plugins` v1, store `packs`, records `{id, meta, spells}`), persistent-storage request at boot, and verbatim pack export to a downloaded JSON file. Writes fail cleanly: shape validated before any transaction opens, transactions resolve only on `oncomplete`, no partial state on error. Validated in Phase 2: Plugin Storage Foundation.
- ✓ Pipeline de import de pack (Fase 3, verificação `passed`, 6/6 must-haves) — o usuário instala um pack de magias por arquivo ou URL compatível, com validação contra o schema publicado e sanitização do HTML antes de qualquer escrita. Pendem 6 itens de verificação humana em navegador (ver `03-UAT.md`)
- ✓ Loader com despacho por fonte (Fase 4, verificação `passed`, 18/18 must-haves) — um único ponto de despacho serve tanto o pack SRD embutido quanto qualquer número de packs instalados pelo usuário, sem caminho especial embutido
- ✓ Gerenciador de pacotes e seletor de versão dinâmico (Fase 5, verificação `passed`, 6/6 critérios, MGMT-01..05 + SRD-02) — `pack-manager.jsx`: modal alcançável do dropdown do seletor no desktop e de uma linha na seção VERSÃO do drawer no mobile. Lista os packs instalados com nome, versão, contagem e origem; lista as duas edições SRD embutidas com o texto CC-BY verbatim de cada uma e sua nota de modificações; mostra contagem agregada de magias duplicadas e uma nota "Também em:" no detalhe; remove um pack com confirmação inline e impacto concreto, sem tocar nas listas de preparadas e favoritas (comprovado por comparação byte a byte de `hifi_chars_v1`/`hifi_bookmarks_v1` antes e depois, com as marcações voltando na reinstalação); e abre em estado vazio com convite ao import. O gatilho flutuante provisório de import foi removido (D-03) e o import só é alcançado de dentro do gerenciador. Verificado por checkpoint humano com os 8 itens do roteiro dirigidos em Chromium headless (81/81), já que o projeto não tem runner de frontend
- ✓ Idioma da interface desacoplado do pacote (Fase 04.1, verificação `passed`, 5/5 critérios, I18N-01/02/03) — `uiLang` é estado próprio persistido em `spellbook-ui-prefs`, semeado pelo navegador na primeira visita e trocável a qualquer momento; o chrome segue a interface, o conteúdo das magias segue o pack, com `lang` marcado por região (WCAG 3.1.2). Um usuário brasileiro pode ler magias em inglês com a interface em português. Pré-requisito da Fase 6, que remove os JSONs PT-BR e deixaria o app monolíngue
- ✓ Pacote SRD 5.2 embutido em pt-BR (Fase 7, verificação `passed`, SRD-04) — `srd-2024-ptbr.json`: tradução CC-BY-4.0 do Heróis Anônimos recortada às 339 magias do SRD 5.2, identidade por slug EN, atribuição dupla (WotC + tradutores) e nota de modificação com errata declarada; padrão para navegador em pt-BR (qualquer idioma pt na lista) e destino da chave legada `spells-5E-2024-PTBR` (a `spells-5E-2014-PTBR` volta ao SRD 5.1 EN para não esconder magias preparadas). Procedência em `milestones/v2.0-phases/03-srd-pack-import-pipeline/03-SRD-SOURCE.md`; o documento completo da tradução fica fora do git. Verificado por checkpoint humano + varredura em Chrome headless

- ✓ Composição aditiva de pacotes (Fase 8, MGMT-06..09, PKG-06/07, SRD-05/06, MIGR-04) — v2.0: um pacote base + pacotes adicionais empilhados num menu único de pacotes; slug é identidade única, com renomeação no import em caso de colisão
- ✓ Auditoria mobile (Fases 9–11, fora do GSD) — v2.0: tab bar inferior, alvos de toque ≥44px, safe-area, hover só em mouse, contraste AA

### Active

<!-- Next milestone scope. Defined by /gsd-new-milestone. -->

Candidates (from v2.0 Future Requirements and deferred items):
- [ ] Checagem manual de atualização de pack por URL (re-fetch + comparação de versão, confirmação explícita)
- [ ] Conversor "formato 5etools → formato do app" no import
- [ ] Página de docs listando packs conhecidos da comunidade
- [ ] Todos pendentes: bandeiras do toggle no Windows, plural "1 magias", warnings dos reviews 04.1 e 05
- [ ] Verificação humana pendente da Fase 8 (`08-VERIFICATION.md`, human_needed)

## Current State

**Shipped:** v2.0 Plugins BYOD (2026-10-21). O app é casca + pacotes: import por arquivo/URL com validação e sanitização, IndexedDB, menu único de pacotes com composição aditiva, SRD 5.1 EN / 5.2 EN / 5.2 pt-BR embutidos, idioma da interface independente, mobile com tab bar. Os 4 JSONs protegidos saíram do HEAD. `packs/srd-2024-adicionais.json` (conteúdo não-SRD, uso pessoal) segue embutido por decisão do usuário. 50 scripts de teste em `pwsh scripts/run-tests.ps1`, todos passam.

## Next Milestone Goals

Não definido. Rodar `/gsd-new-milestone`.

<details>
<summary>Previous milestone: v2.0 Plugins BYOD (shipped 2026-10-21)</summary>

**Goal:** Transformar o Grimório de "app com dados embutidos" em "casca + plugins": o usuário instala os pacotes de magias que quiser (arquivo/URL), o app embute só conteúdo livre (SRD/CC-BY), e os 4 JSONs protegidos saem da distribuição.

**Ajuste no fechamento:** a parte "embute só conteúdo livre" foi relaxada para aceitar `packs/srd-2024-adicionais.json` (ver Key Decisions).

</details>

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- New animation library or JS-driven motion — CSS-only is a locked constraint from the ingested SPEC (keeps the app dependency-light and build-step-free)
- Backend, database, or user accounts — app is intentionally local-only and offline-first; no server component wanted
- Large speculative rewrites (TypeScript migration, framework swap, build tooling) — not requested; project explicitly prioritizes incremental polish over rearchitecture right now
- Marketplace/catálogo central de packs, auto-update silencioso, plugins executáveis — v2.0 Out of Scope, razões ainda válidas (sem backend; BYOD = dados do usuário; packs são só dados)

## Context

- Brownfield project. Existing single-page app, no build step: React 18.3.1 + ReactDOM + Babel standalone loaded from CDN (pinned versions, SRI hashes), JSX transpiled in-browser. Module load order in `index.html` is strict (`grimorio-helpers.jsx` → `i18n.jsx` → `spells-data-loader.jsx` → `v11-character-editor.jsx` → `v10-hifi.jsx`).
- No frontend test runner. v2.0 added 50 PowerShell/Node gate scripts (`pwsh scripts/run-tests.ps1`); visual checks run as human checkpoints or headless Chrome QA.
- Recent commit history (`175aac9`..`27543ff`) shows the project already operates in a continuous small-fix cadence — auto-filled class levels, auto spell slots, mobile input fixes, select-arrow theming, link/UX fixes — reinforcing that "general maintenance and polish" is the natural mode for this codebase, not a gap to fill.
- `.planning/codebase/CONCERNS.md` catalogs known tech debt, bugs, security notes, and performance bottlenecks (silent error handling, localStorage quota exhaustion, monolithic JSX files, unvalidated `?build=` payload, etc.). These are candidate future maintenance items — not yet promoted to requirements or phases. Pull from there when scoping new work.
- The ingested SPEC (`docs/superpowers/specs/2026-07-05-animacoes-menus-filtros-design.md`) and its implementation plan describe the only concretely-specified piece of work in this ingest batch. Its 10 implementation tasks are already committed; only its final manual-verification task is open.

## Constraints

- **Tech stack**: No build step — plain React 18 + Babel standalone via CDN, JSX transpiled in-browser. Module load order in `index.html` is strict and must not change without updating all dependents.
- **No animation library**: Pure CSS animations only, no JS animation dependency — locked by the ingested SPEC's nfr constraint.
- **Accessibility**: All animated components must respect `prefers-reduced-motion: reduce` (zeroing animation/transition) and must preserve existing `useDialogA11y` focus-trap/Escape behavior — locked by the ingested SPEC.
- **No frontend test runner**: Static/Node gates in `scripts/run-tests.ps1`; visual verification is manual or headless browser QA across the 6 themes × light/dark.
- **Offline-first**: Service worker precaches the app shell and the built-in packs listed in `packs/index.js`; must keep working on `file://` and any static host with no server-side code.

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| BYOD completo para dados de magias (v2.0) | Proteção de copyright: a plataforma não distribui conteúdo protegido — usuário importa os próprios JSONs; app embute apenas SRD/CC-BY com atribuição | ✓ Good — v2.0 (4 JSONs fora do HEAD; ver ajuste abaixo) |
| Formato de plugin = schema atual + manifest `meta` | Auditoria (2026-07-17) aprovou o schema de spells existente (adaptador tolerante já normaliza escola/nível/classes); só falta cabeçalho de metadados | ✓ Good — v2.0 |
| Armazenamento de plugins importados em IndexedDB | Arquivos de ~600KB+ estouram a quota do localStorage (~5MB); Cache API não serve pra dados sem URL | ✓ Good — v2.0 |
| Sanitização obrigatória de HTML no import | `description` é renderizado via `dangerouslySetInnerHTML`; com BYOD isso vira vetor de XSS — whitelist de tags no ingest | ✓ Good — v2.0 |
| Pacote embutido `srd-2024-adicionais.json` com conteúdo não-SRD (fechamento v2.0, 2026-10-21) | Decisão do usuário: manter as 69 magias do Livro do Jogador 2024 como pacote adicional embutido para uso pessoal, apesar da auditoria apontar conflito com a meta "só SRD/CC-BY" | ⚠️ Revisit — repo e site são públicos |
| Composição aditiva: 1 pacote base + adicionais (Fase 8) | Homebrew adiciona magias em vez de substituir a versão ativa; slug é identidade única | ✓ Good — v2.0 |
| Idioma da UI independente do pacote (Fase 04.1) | Fase 6 removeu os JSONs PT-BR; app ficaria monolíngue | ✓ Good — v2.0 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-10-21 after v2.0 milestone*
