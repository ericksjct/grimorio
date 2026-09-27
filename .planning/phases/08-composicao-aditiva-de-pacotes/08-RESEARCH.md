# Phase 8: Composição aditiva de pacotes - Research

**Researched:** 2026-09-27
**Domain:** Client-only React (no build step) — data-layer refactor from single-active-version to multi-selection union, plus a UI surface that merges two existing dialogs. No new external dependency.
**Confidence:** HIGH (every claim below is grounded in the actual files this phase touches — read in full during this session — not in generic framework knowledge)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Modelo de composição**
- D-01: Não existe mais "base". Todo pacote selecionado soma. O estado ativo é uma **lista** de chaves de `SPELL_VERSIONS`, não uma chave. Substitui `_currentVersion`/`setCurrentVersion` como fonte da grade.
- D-02: Qualquer número de pacotes pode estar selecionado ao mesmo tempo.
- D-03: SRD embutidos entram no mesmo modelo, selecionáveis junto com outros, sujeitos às mesmas regras de colisão (D-08..D-11), com duas regras próprias: SRD 5.1 e SRD 5.2 são **mutuamente exclusivos** (marcar um desmarca o outro); SRD da mesma edição em idiomas diferentes (`srd-2024-en`/`srd-2024-ptbr`) podem coexistir — numa colisão de slug entre eles, vence o pacote no idioma da interface (`uiLang`); não é conflito, não abre o prompt de renomear.
- D-04: Seleção vazia é permitida no menu; com ela a grade mostra o pacote padrão de hoje (mesma resolução de `_initialVersionKey()`/`_defaultVersion()`: SRD 5.2 no idioma do navegador). A grade nunca fica vazia por falta de seleção (mantém F5 D-17).
- D-05: `meta.edition` continua opcional e só informativo; não restringe combinações de homebrew. A exclusividade de edição do D-03 vale só entre os SRD embutidos.
- D-06: Pacotes em idiomas diferentes combinam livremente. Cada magia continua no idioma do seu pacote, com `lang` por região já marcado (Fase 04.1, WCAG 3.1.2).
- D-07: A seleção é global no dispositivo, persistida em `spellbook-ui-prefs`. Não é por personagem; `hifi_chars_v1` e `?build=` não mudam.

**Colisão e slugs reservados**
- D-08: O slug (`name` do pack, que alimenta `en` e portanto `hifiSpellKey = school-lvl-slug`) é identidade única obrigatória entre os pacotes selecionados. Sem prioridade/merge/"uma vence a outra" entre homebrews (exceção: D-03).
- D-09: Slugs reservados = slugs dos pacotes SRD embutidos. Um pack importado que traz slug reservado ou que colide com outro pack já instalado abre um prompt de renomear na UI. A mensagem nomeia cada magia em conflito (nome no pack que entra, nome no pack que já tem o slug, e o slug).
- D-10: O mesmo prompt aparece em dois momentos: no import (antes de gravar no IndexedDB) e na seleção (marcar um pack instalado colide com outro já marcado). Em ambos, quem é renomeado é sempre o pacote que está **entrando**, nunca o que já estava ativo.
- D-11: O prompt sugere um slug com sufixo do pack (`fireball` + `meu-homebrew` → `fireball-meu-homebrew`), editável, com validação ao vivo (formato, não reservado, único entre instalados). Oferece "aplicar o sufixo a todas as conflitantes".
- D-12: Cancelar o prompt aborta a operação: no import, nada é gravado; na seleção, o pack não é marcado. Estado nunca fica ambíguo.
- D-13: Renomear o slug de um pack instalado faz preparadas/favoritas que apontavam pro slug antigo deixarem de resolver. O prompt avisa quantas (mesma contagem derivada da F5 D-06). Proibição mantida (F5 D-07, F6 D-09): nenhum código desta fase escreve em `prepared`/`bookmarked` de personagem nem em `hifi_bookmarks_v1`. Elas viram órfãs e usam a seção de órfãs já existente (F6 D-10/D-11).
- D-14: A renomeação é gravada no pack armazenado. Export devolve a versão renomeada — o que está armazenado, coerente com STOR-03.
- D-15: Slugs reservados consultáveis em dois lugares: docs de autor (`pack-docs.html` + JSON público gerado por `scripts/generate-srd-pack.mjs`, mesma fonte usada pelo app); no menu de pacotes (seção por slug com subitens "pacote → nome da magia naquele pacote").

**Menu de pacotes (substitui seletor + gerenciador)**
- D-16: Um menu remodelado substitui o `VersionSelector` (chip dropdown desktop, bottom sheet mobile) e absorve o `PackManager`: seleção (checkbox), importar, remover (fluxo inline F5 D-05/D-06), licença/atribuição (F5 D-12..D-14) e slugs reservados (D-15) numa superfície só. Revoga F5 D-01/D-02/D-04 no ponto em que tratavam seletor e gerenciador como coisas separadas; as regras de conteúdo daquelas decisões (remoção sem purga, atribuição verbatim) seguem.
- D-17: Cada pacote aparece como cartão com imagem, título e descrição. Imagem: campo novo opcional `meta.image`, só `data:` URI (formatos raster, teto de tamanho); sem imagem: placeholder gerado com cor derivada (D-19); builtins SRD podem ter arte própria. Descrição: derivada automaticamente (autor, versão, idioma, edição, contagem de magias), sem campo novo no schema.
- D-18: O chip do topo mostra primeiro pacote + contagem (`SRD 5.2 +2`). Mobile pode compactar.
- D-19: Cor derivada por pacote (hash do identificador sobre a paleta do tema) aparece só no menu (placeholder/cartão). Não tinge nada na grade.

**Origem da magia na grade**
- D-20: Nenhum selo novo. O rodapé do card/linha já mostra `src`; F5 D-09 (sem badge no grid) segue valendo.
- D-21: Sem filtro por pacote na barra de filtros. Para ver só um pacote, o usuário desmarca os outros no menu.
- D-22: A nota "Também em:" do detalhe (F5 D-09) continua, refletindo o caso SRD EN×PT (D-03). Entre homebrews selecionados não deveria mais ocorrer (D-08 impede slug duplicado).

**Migração e links**
- D-23: `spellbook-ui-prefs.versionKey` existente vira seleção de um item (`[versionKey]`) na primeira carga. O fallback legado (`LEGACY_VERSION_FALLBACK`) é aplicado **antes** da conversão. Nada muda visualmente para quem atualiza.
- D-24: `?v=` passa a aceitar lista separada por vírgula (`?v=srd-2024-en,plugin-meupack`). `?v=` antigo, de um item, continua válido. Chaves de pack não instalado seguem o comportamento pendente atual (`_wantedVersionKey`, CR-01/WR-05), agora por item.

### Claude's Discretion
- `useEditionCompare`: ajustar ao modelo multi-pacote sem mudar comportamento visível — magia de um SRD continua comparável com a outra edição do SRD; homebrew continua sem comparador (`corpus: 'pack'`).
- Layout exato dos cartões do menu, ordem da lista, teto de tamanho de `meta.image` e formatos aceitos, algoritmo de hash de cor, copy de todos os textos (via `i18n.jsx`, paridade PT/EN obrigatória com `i18nParityCheck`).
- Nome e formato da chave nova em `spellbook-ui-prefs` e do JSON de slugs reservados.
- Como carregar vários packs em paralelo (`loadVersion` por chave já deduplica e cacheia) e como mesclar sem custo perceptível na grade.

*(Note: the UI-SPEC, already approved, has resolved most of the visual/copy discretion items above — size cap 200 KB, PNG/JPEG/WebP/GIF, `--level-N` hash placeholder, and the full i18n key list. Treat UI-SPEC as authoritative for those; this document does not re-litigate them.)*

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

No REQ-IDs are mapped yet (ROADMAP.md lists "TBD"). Proposed new IDs, following the existing family/format and next-available number per family in `REQUIREMENTS.md`:

| ID (proposed) | Description | Research Support |
|----------------|-------------|-------------------|
| **MGMT-06** | Usuário pode marcar múltiplos pacotes (SRD + homebrew) simultaneamente no menu; a grade mostra a união das magias de todos os marcados, sem prioridade nem ocultação silenciosa | D-01/D-02 — union-of-selection model in "Architecture Patterns" below; replaces the single-`_currentVersion` reads enumerated in "Blast Radius" |
| **MGMT-07** | Identidade de magia (slug) é única entre os pacotes selecionados; import e seleção detectam colisão e abrem prompt de renomeação (nunca ocultam, mesclam ou dão prioridade silenciosa) | D-08..D-13 — "Slug Collision & Rename" pattern; `hifiSpellKey` mechanics documented below |
| **MGMT-08** | Seleção vazia no menu é permitida; a grade cai no pacote padrão atual (mesma resolução de `_initialVersionKey`/`_defaultVersion`) — nunca mostra grade vazia | D-04 — reuses existing `_defaultVersion()` fallback, see Pitfall 1 |
| **MGMT-09** | Um menu de pacotes único (cartões com imagem/título/descrição, seção de slugs reservados) substitui o seletor de versão e absorve o gerenciador de pacotes | D-16/D-17 — UI-SPEC is authoritative for the visual contract; file-structure recommendation below |
| **PKG-06** | `meta.image` é campo opcional do schema de pack, aceito só como `data:` URI de imagem raster com teto de tamanho; import valida formato/tamanho | D-17 — extends `pack.schema.json` + `pack-import.jsx` META_FIELDS the same way every other PKG-04 rule works |
| **SRD-05** | SRD 5.1 e SRD 5.2 são mutuamente exclusivos na seleção; SRD da mesma edição em idiomas diferentes coexistem, com colisão de slug decidida por `uiLang` (sem abrir o prompt de renomear) | D-03 |
| **MIGR-04** | `spellbook-ui-prefs.versionKey` migra de chave única para lista na primeira carga pós-fase (fallback legado aplicado antes); `?v=` aceita lista separada por vírgula, retrocompatível com um único valor | D-23/D-24 |

The planner should register these in `REQUIREMENTS.md`'s traceability table when Phase 8 plans are created; renumber if a discuss-phase pass already assigned different IDs.
</phase_requirements>

## Summary

This phase is a data-model refactor wrapped in a UI-merge, not a greenfield feature. Every file in `canonical_refs` was read in full this session; the actual blast radius is larger than the CONTEXT.md code_context section states, in one specific way that changes how the planner should scope Wave 1: **the app currently assumes the entire active spell dataset is one language** (`versionLang`, a single value threaded through ~30 call sites in `v10-hifi.jsx` for `spellName()`, `hifiHtmlLang()`, sort collators, and filter-value labels). D-06 already locks "cada magia continua no idioma do seu pacote" — but today no spell object carries its own `lang`; `adaptSpell()` receives a `versionLang` parameter and uses it internally (to decide `name_en` vs slug, `classesPt` vs `classesEn`) without ever storing it on the returned spell. Once two packs of different languages are selected simultaneously (SRD EN + a PT-BR homebrew, or SRD 5.2 PT-BR + an EN homebrew — explicitly allowed by D-06), a single global `versionLang` picks the wrong display name/HTML-lang-attribute for every spell from the "other" pack. This is not a hypothetical edge case — it is the literal thing D-06 promises. Fixing it means adding a `lang` (and `_versionKey`, for "Também em:"/rename-impact bookkeeping) field to the object `adaptSpell()` returns, and re-pointing every per-spell rendering call site at `s.lang` instead of the hook-level `versionLang`. Aggregate-level concerns (sort-collator locale, filter-label language) can safely keep using `uiLang` (chrome language) instead — that is a simplification, not a regression, and consistent with the I18N-01..03 chrome/content split already in the codebase.

Everything else is comparatively mechanical: `_currentVersion` (a string) becomes a selected-keys array; `SPELL_VERSIONS` (the registry of *available* versions) does not change shape at all — union is computed by loading N versions instead of 1 and concatenating their already-cached spell arrays, filtering out inactive candidates for D-03's SRD-exclusivity/tiebreak rule. Slug collision detection is a second, independent axis from the pack-level `meta.source` collision that `pack-import.jsx`'s `freeIdentifier()` already handles silently — the new prompt operates on the *spell* `name` field (which feeds `hifiSpellKey`), not the *pack* `source` field, and must never be confused with the existing mechanism during planning.

**Primary recommendation:** Rewrite `spells-data-loader.jsx`'s selection/union layer first (Wave 1, TDD against a `.tests.ps1` gate mirroring `check-loader-hardening.tests.ps1`'s style) — stamp `lang`/`_versionKey` onto every adapted spell as part of that same wave, since every downstream consumer (grid, detail panel, editor, rename-impact count, "Também em:") depends on it. Only after that foundation is green should the pack-menu UI (absorbing `PackManager`+`VersionSelector`) and the rename-conflict dialog be built on top, per UI-SPEC.

## Architectural Responsibility Map

This is a single-tier client app: React 18 + Babel Standalone via pinned CDN `<script>` tags (no bundler, no SSR, no backend, no accounts — confirmed unchanged by UI-SPEC's shadcn-gate note and by `sw.js`'s PRECACHE list). "Database/Storage" below means client-side IndexedDB, not a server database.

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Package selection state (list of keys) | Browser/Client | Database/Storage (persisted in `localStorage` via `spellbook-ui-prefs`) | Pure client state; `index.html`'s App component owns `versionKey`/prefs today, will own the selection list |
| Spell union / merge across selected packs | Browser/Client | — | `spells-data-loader.jsx`, in-memory, no network round-trip beyond the existing per-key fetch/cache |
| Per-spell `lang`/origin-pack stamping | Browser/Client | — | `adaptSpell()` — must happen at adapt time, once, not re-derived per render |
| Slug collision detection (import-time + selection-time) | Browser/Client | Database/Storage (reads `pluginStore.listPacks()`/registry to know what's installed) | Pure computation over already-loaded data; no new persistence primitive |
| Slug rename write | Database/Storage | Browser/Client (triggers the write from a dialog) | `plugin-store.jsx putPack()` — the only place a rename is durably recorded |
| Reserved-slugs JSON (author docs + app) | Build-time Static artifact | Browser/Client (app fetches it) | Generated once by `scripts/generate-srd-pack.mjs` (Node, run by hand, never in the browser); consumed both by `pack-docs.html` (static page) and the app (fetch + cache) |
| Pack menu UI (cards, checkboxes, rename dialog) | Browser/Client | — | React components; no server round-trip |
| `meta.image` validation | Browser/Client | — | Hand-rolled MIME/size check in `pack-import.jsx`, same pattern as every other PKG-04 rule — no image-processing library |
| Service-worker precache of new artifacts | Browser/Client (SW is client-side) | — | `sw.js` PRECACHE array + `CACHE_VERSION` bump |

No capability in this phase touches a server, an SSR layer, or a CDN edge rule — flag any plan step that proposes one as out of scope for this milestone's "no backend, no accounts" constraint (see REQUIREMENTS.md "Out of Scope").

## Standard Stack

**No new external dependency.** This phase is a refactor of existing hand-rolled modules (React + vanilla JS, no state-management library, no image library, no schema-validation library beyond the hand-written tables in `pack-import.jsx`). The UI-SPEC's "Registry Safety" section already confirms this explicitly ("This phase adds no new external dependency"). The existing pinned CDN dependencies (unchanged, already in `sw.js` PRECACHE) are:

| Library | Version (pinned in `sw.js`/index.html) | Purpose |
|---------|------------------------------------------|---------|
| React | 18.3.1 (UMD, unpkg) | UI |
| React DOM | 18.3.1 (UMD, unpkg) | UI |
| @babel/standalone | 7.29.0 (unpkg) | In-browser JSX transpile — no build step |
| DOMPurify | 3.4.13 (unpkg) | HTML sanitization on pack import (PKG-05), unchanged by this phase |

**Installation:** none required. Do not add `npm install` steps to this phase's plan — any task that proposes a new dependency (a color-hashing library, an image-validation library, a state-management library) should be rejected per the ponytail ladder: rung 2 ("already in this codebase") and rung 4 ("native platform feature") both resolve every new need this phase has (see "Don't Hand-Roll" below).

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled hash → `--level-N` swatch (D-19, UI-SPEC-locked) | A color library (e.g. a HSL-generation package) | Rejected by UI-SPEC already — zero new palette, reuses the existing 10-step level-color ramp; a new dependency for a single hash function would violate this project's zero-new-dependency posture for a decorative, non-critical feature |
| Hand-rolled `_checkField`/`_checkObject` extension for `meta.image` | A JSON-Schema validator library (ajv, etc.) | The project deliberately hand-rolls schema validation today (`pack-import.jsx`'s comment: "validador escrito à mão... espelhando pack.schema.json") specifically to avoid a new dependency for a browser-only, no-build-step app; adding one new optional field is a 5-10 line extension, not a case for a new validator |

## Package Legitimacy Audit

Not applicable — this phase installs no new package (confirmed by the UI-SPEC Registry Safety section and by the Standard Stack analysis above). Skip the Package Legitimacy Gate; do not run `package-legitimacy check` for a phase with zero new packages.

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│  spellbook-ui-prefs (localStorage)                                  │
│  { versionKey: [...] , lang, dark, theme, characterName, ... }      │
└───────────────┬───────────────────────────────────────────────────────┘
                │ read on boot (D-23 migration: single→list, legacy
                │ fallback applied FIRST) / write on every selection change
                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ index.html (App)  ──  owns `selectedVersionKeys: string[]`          │
│   ?v=a,b,c  (D-24, comma list, back-compat with single value)       │
└───────────────┬───────────────────────────────────────────────────────┘
                │ selectedVersionKeys
                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ spells-data-loader.jsx                                              │
│                                                                      │
│  SPELL_VERSIONS (registry, unchanged shape — builtin + idb entries) │
│         │                                                            │
│         ▼                                                            │
│  resolveSelection(selectedKeys)                                      │
│    · empty selection → [_defaultVersion().key]           (D-04)     │
│    · SRD 5.1 ∧ SRD 5.2 both present → keep the most-recently-checked │
│      one, drop the other                                  (D-03)    │
│         │                                                            │
│         ▼                                                            │
│  for each resolved key: loadVersion(key)  (existing dedup+cache)     │
│         │                                                            │
│         ▼                                                            │
│  adaptSpells(json, ver.lang, ver.edition, ver.key)                   │
│    → each spell gains  lang, _versionKey  (NEW fields — see below)  │
│         │                                                            │
│         ▼                                                            │
│  unionSpells(perVersionArrays)                                       │
│    · dedup by hifiSpellKey; D-08 guarantees no unresolved collision  │
│      reaches this point among homebrews (rename happened earlier)   │
│    · D-03 EN×PT tiebreak: on a genuine SRD EN/PT-BR slug match,      │
│      keep the uiLang-matching one, drop the other silently          │
│         │                                                            │
│         ▼                                                            │
│  window.v7BuildSpells() → union array (replaces single-version array)│
└───────────────┬───────────────────────────────────────────────────────┘
                │ hifi-spells-source-changed / new selection-changed signal
                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ v10-hifi.jsx grid / detail panel / editor (v11)                     │
│   · per-spell rendering uses s.lang, NOT a global versionLang        │
│   · aggregate concerns (sort collator, filter labels) use uiLang     │
│   · hifiSpellKey(s) unchanged: school-lvl-slug — now the ONLY thing  │
│     that must be globally unique across the selection (D-08)        │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ Slug collision path (two entry points, same core function)          │
│                                                                      │
│  import (pack-import.jsx, before putPack)  ──┐                      │
│  selection (menu checkbox handler)         ──┼──▶ detectSlugCollisions(
│                                                │      incomingSpells,
│                                                │      alreadyActiveSlugs,
│                                                │      reservedSlugs)
│                                                │        │
│                                                │        ▼ conflicts[]
│                                                │   RenameConflictDialog
│                                                │     (D-09..D-12)
│                                                │        │ confirm
│                                                │        ▼
│                                                │   plugin-store.jsx
│                                                │     putPack() — rewrites
│                                                │     the incoming pack's
│                                                │     spell.name fields
│                                                │        │
│                                                └────────┴──▶ never touches
│                                                              prepared/
│                                                              bookmarked
└─────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure

No new files are structurally required — this app has no build step, and every new file added must also be added to `sw.js`'s `PRECACHE` array (see Pitfall 2). Two defensible options for where the new UI lives:

1. **Reuse `pack-manager.jsx` as the new combined module** (recommended — smallest diff, smallest `PRECACHE`/`sw.js` churn). Rename its exported component from `PackManager`/`PackManagerRoot` to something like `PackMenu`/`PackMenuRoot` (or keep the names and change behavior — the planner's call), delete `VersionSelector` and its exports from `spells-data-loader.jsx`, and move the rename-conflict dialog into a new sibling file `pack-rename-dialog.jsx` (small, single-purpose, mirrors how `pack-import-dialog.jsx` is split out from `pack-manager.jsx` today).
2. Alternative: a brand-new `pack-menu.jsx` file replacing `pack-manager.jsx` outright. More files to add/remove from `PRECACHE`, more churn, no clear benefit — not recommended unless the planner has a specific reason (e.g. wanting `pack-manager.jsx` to disappear entirely for git-history clarity).

Either way, `pack-rename-dialog.jsx` (or equivalent) needs `useDialogA11y` (defined in `v11-character-editor.jsx`, already used by both existing dialogs) and must load after `pack-import.jsx`/`plugin-store.jsx` (for `freeIdentifier`-style suggestion logic and the write) and before `v10-hifi.jsx` (which needs the menu's `window.__openPackManager`-equivalent global).

### Pattern 1: Selection as an array, resolved (not stored) into a final key-list

**What:** `_currentVersion` (a string) is replaced by a persisted `selectedVersionKeys` (array). A pure `resolveSelection()` function applies D-03 (SRD 5.1/5.2 mutual exclusion) and D-04 (empty→default) to produce the actual list of keys to load — this resolved list is what gets unioned, not the raw persisted array. Keeping the raw array separate from the resolved list matters: the checkbox UI must show the *raw* selection state (so unchecking SRD 5.1 after selecting both is a meaningful click), while the grid consumes the *resolved* list.

**When to use:** Every reader of the old `_currentVersion`/`getCurrentSpellVersion()` singular API.

**Example (based on the existing `_defaultVersion()`/`_versionByKey()` helpers already in `spells-data-loader.jsx`):**
```javascript
// Source: pattern derived from existing spells-data-loader.jsx helpers (this exact
// function does not exist yet — this is the shape to add)
function resolveSelection(rawKeys) {
  if (!rawKeys || rawKeys.length === 0) return [_defaultVersion().key]; // D-04
  const srd51 = 'srd-2014-en', srd52en = 'srd-2024-en', srd52ptbr = 'srd-2024-ptbr';
  let keys = rawKeys.filter(k => _versionByKey(k)); // drop keys that no longer resolve
  // D-03: SRD 5.1 and SRD 5.2 (either language) are mutually exclusive.
  const has51 = keys.includes(srd51);
  const has52 = keys.includes(srd52en) || keys.includes(srd52ptbr);
  if (has51 && has52) {
    // keep whichever the user checked LAST — requires the raw array to preserve
    // insertion order, not a Set; see Pitfall 3.
    keys = keys.filter(k => k !== (rawKeys.indexOf(srd51) > rawKeys.lastIndexOf(srd52en) && rawKeys.indexOf(srd51) > rawKeys.lastIndexOf(srd52ptbr) ? srd52en : srd51))
               .filter(k => k !== (/* symmetric case */ srd52ptbr));
  }
  return keys.length ? keys : [_defaultVersion().key];
}
```
This sketch is illustrative, not prescriptive about the exact tie-break bookkeeping — the planner should design the actual "which one was checked last" mechanism explicitly (e.g. the checkbox `onChange` handler for SRD 5.1/5.2 always uncheck-the-sibling synchronously, per UI-SPEC's "partial" state row: *"checking SRD 5.1 unchecks SRD 5.2 in the same state update... not even mid-click"* — this makes the tie-break moot, since both can never be simultaneously true in the persisted array in the first place if the checkbox handler enforces it at the source).

### Pattern 2: Per-spell `lang` and origin key, stamped once at adapt time

**What:** `adaptSpell(s, versionLang, edition)` gains a fourth parameter (`versionKey`) and the returned object gains two new fields: `lang: versionLang` and `_versionKey: versionKey` (leading underscore, matching this file's existing internal-field convention — cf. `_pending`, `_cache`).

**When to use:** Every per-spell rendering call site in `v10-hifi.jsx` that currently reads the hook-level `versionLang` — `spellName(s, versionLang)` → `spellName(s, s.lang)`; `hifiHtmlLang(versionLang)` → `hifiHtmlLang(s.lang)`. Aggregate call sites (sort `localeCompare` locale, `hifiFilterValues(..., versionLang)` label formatting) should switch to `uiLang` instead — that's a *simplification* the union model licenses, not a workaround.

**Example:**
```javascript
// Source: spells-data-loader.jsx, existing function signature (today it discards
// versionLang after using it internally — this is the minimal diff to fix that)
function adaptSpell(s, versionLang, edition, versionKey) {
  // ...unchanged body...
  return {
    // ...all existing fields unchanged...
    lang: versionLang,        // NEW — per-spell content language (D-06)
    _versionKey: versionKey,  // NEW — origin pack key, for "Também em:"/rename-impact
  };
}
function adaptSpells(json, versionLang, edition, versionKey) {
  const list = Array.isArray(json) ? json : (json?.spells || []);
  return list.map(s => adaptSpell(s, versionLang, edition, versionKey));
}
```
`loadVersion()` already knows `ver.key` when it calls `adaptSpells(json, ver.lang, ver.edition)` — passing `ver.key` through is a one-line change at that single call site.

### Pattern 3: Slug collision detection — two distinct axes, do not conflate

**What:** This codebase already has ONE collision mechanism: `pack.meta.source` (the *pack's* own identifier) collisions are resolved *silently* by `freeIdentifier()` in `pack-import.jsx` (`meu-homebrew` → `meu-homebrev-2`, no prompt, per `pack.schema.json`'s own description of `source`). This phase adds a SECOND, independent mechanism: `spell.name` (the *slug*, which becomes `s.en` and feeds `hifiSpellKey`) collisions, which require an interactive rename prompt (D-09), never silent renaming. **Do not let the planner reuse or extend `freeIdentifier()` for the new prompt** — it solves a different problem (pack-id uniqueness, always auto-resolves) from the one D-08 requires (spell-slug uniqueness, always requires user confirmation). The new function should live in `pack-import.jsx` or a shared helper, and both entry points (import-time, selection-time) call the *same* detection function against the *same* two inputs: reserved slugs (SRD) ∪ slugs already covered by the *other currently-selected/installed* packs, filtered by the D-03 exception (SRD EN×PT same-slug is not a conflict).

**When to use:** Both at import (`pack-import.jsx`, before `putPack()`) and at selection time (the new menu's checkbox handler, before adding a key to the selection array).

### Pattern 4: Rename writes only the incoming pack, never touches character data

**What:** D-13 requires counting impact (how many prepared/bookmarked entries will orphan) using the exact same read-only mechanism `pack-manager.jsx`'s `_removalImpact()`/`resolvableSpellKeys()` already use — `peekBookmarks()` (a pure accessor, proven side-effect-free by `check-bookmarks-read-purity.tests.ps1`) and `window.loadCharacters()`. The rename write itself is a single `plugin-store.jsx putPack()` call against the *incoming* pack's record, mutating its `spells[].name` fields before the write — never a write to any character-list storage key.

**When to use:** The rename-conflict dialog's submit handler.

### Anti-Patterns to Avoid
- **Silent slug renaming (auto-suffix, no prompt):** This is what `freeIdentifier()` already does for `pack.meta.source` — correct there, explicitly forbidden for spell slugs by D-09/D-12 ("cancelar aborta a operação" implies the user must always see and approve the rename).
- **A single global "active version" object surviving anywhere in the new code:** Any new code that calls `getCurrentSpellVersion()` (singular) instead of reading the resolved-selection array is a regression to the pre-Phase-8 model. `getCurrentSpellVersion()` should either be deleted or repurposed as "the version namely used for X" with an explicit, narrow justification (e.g. `useEditionCompare` genuinely needs *a* single reference spell's origin version — but that's `s._versionKey`-derived, per-spell, not global).
- **Reintroducing a global `versionLang` for per-spell display after this phase ships:** Any future phase's diff that adds a new `spellName(s, someGlobalLang)` call site instead of `spellName(s, s.lang)` re-breaks D-06.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| Color placeholder for pack cards | A new color-generation/hashing library | Hash the pack's `source` string to an index into the existing 10 `--level-N` CSS custom properties (already used for spell-level bars) | UI-SPEC already locked this exact approach — zero new palette, zero new dependency; a `String → number` hash is `Array.from(str).reduce((h,c)=>(h*31+c.charCodeAt(0))|0, 0)` — one line, stdlib |
| `meta.image` format/size validation | An image-processing library (`sharp`-in-browser, canvas-based decoders, etc.) | MIME-prefix check on the `data:` URI string (`data:image/(png|jpeg|webp|gif);base64,...`) + string-length check against the 200 KB cap (UI-SPEC) | Exactly the same pattern `pack-import.jsx` already uses for every other field — a regex + `.length`, no decoding needed since nothing renders the image server-side |
| Reserved-slugs lookup structure | A new indexing library | A plain `Map`/`Object.create(null)` built once per `packSpellIndex()` call (the codebase already avoids prototype-chain literals for third-party-keyed data — see `SCHOOL_INDEX`/`CLASS_PT`'s `Object.assign(Object.create(null), ...)` convention) | Matches existing CR-03-style hardening already used three times in `spells-data-loader.jsx` |
| JSON-Schema validation for `meta.image` | ajv or any schema library | Extend the existing hand-written `META_FIELDS` table in `pack-import.jsx` with one new optional entry | The project already deliberately hand-rolls this (see comment atop `pack-import.jsx`) specifically to avoid a new dependency in a build-step-free app |

**Key insight:** Every "new" mechanical need in this phase (hashing, format-sniffing, indexing) already has a same-shaped precedent somewhere in this exact codebase. The research task here was archaeology, not library selection — there is no library to select.

## Runtime State Inventory

Triggered because this phase renames stored data (spell slugs, D-13/D-14) and changes the shape of persisted preferences (D-23).

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `spellbook-ui-prefs.versionKey` (localStorage) — currently a single string, D-23 requires it become a list on first load post-phase. `plugin-store.jsx` IndexedDB records (`packs` store, keyPath `id`) — a slug rename mutates `record.spells[i].name` for the *incoming* pack's record only; `record.meta.source` (the pack's own id/`id` field) is untouched by a slug rename. | Code edit for `versionKey` migration (read old shape, wrap in array, write once — mirrors the existing `LEGACY_VERSION_FALLBACK` pattern already in `spells-data-loader.jsx`, applied *before* the array-wrap per D-23). Code edit (not a data migration) for the rename write path — this is new functionality, not existing data to migrate. |
| Live service config | None — this is a fully offline, no-backend app (confirmed by REQUIREMENTS.md's "Out of Scope: Backend, database, ou contas de usuário — restrição permanente"). No n8n/Datadog/Tailscale/Cloudflare-style external service holds any of this app's state. | None. |
| OS-registered state | None — a static web app with a service worker; no Task Scheduler, pm2, launchd, or systemd registration exists anywhere in this repo. | None. |
| Secrets/env vars | None — this app has no secrets, no `.env`, no CI/CD env vars referencing pack/version names (confirmed by `grep`-level familiarity with the repo across Phases 2-7; no `.env*` files exist at the repo root). | None. |
| Build artifacts | `scripts/generate-srd-pack.mjs` currently emits `srd-2014-en.json`, `srd-2024-en.json`, `srd-2024-ptbr.json` — this phase adds a **new** generated artifact (the reserved-slugs JSON, D-15) that must be (a) written by the same script, (b) added to `sw.js`'s `PRECACHE` array, and (c) referenced by `pack-docs.html`. Any content change to `spells-data-loader.jsx`, `pack-manager.jsx`/its replacement, `v10-hifi.jsx`, `i18n.jsx` — all already in `PRECACHE` — requires a `CACHE_VERSION` bump in `sw.js` (see Pitfall 2), or returning users keep serving stale cached JS indefinitely. | Code edit: extend `generate-srd-pack.mjs`'s output step; add the new file to `PRECACHE`; bump `CACHE_VERSION` (`grimorio-v4` → `grimorio-v5`) in the same commit that changes any already-precached file's content. |

**Nothing found in category:** Live service config, OS-registered state, and Secrets/env vars — verified by this app's confirmed architecture (static site + service worker, zero backend, zero CI secrets referencing pack/version identifiers) and by direct inspection of `sw.js`, `plugin-store.jsx`, and the repo root for `.env*`/CI config files.

## Common Pitfalls

### Pitfall 1: Treating "empty selection" and "default version" as the same object identity
**What goes wrong:** D-04 says empty selection shows "the default pack" — but the *persisted* selection array must stay empty (`[]`), not get silently rewritten to `[_defaultVersion().key]`. If the resolved-list value leaks back into what gets saved to `spellbook-ui-prefs`, the user's next visit shows the default as if they'd explicitly chosen it — and unchecking-then-rechecking a pack behaves inconsistently (there is no "nothing checked" state left to detect).
**Why it happens:** The existing `setCurrentVersion()` conflates "what's persisted" and "what's active" because there was only ever one value; the union model needs the raw persisted array and the resolved-for-rendering list to be two different variables.
**How to avoid:** Persist the raw checkbox state; only resolve-to-default at the point of computing what to load/render (per Pattern 1 above).
**Warning signs:** A `.tests.ps1` gate that unchecks every pack, reloads, and asserts the persisted `versionKey` array is still `[]` (not `[defaultKey]`) — write this gate in Wave 1.

### Pitfall 2: Forgetting the service-worker `CACHE_VERSION` bump
**What goes wrong:** `sw.js`'s own comment (already in the file, lines 11-20) states plainly: adding a *new* file to `PRECACHE` needs no bump, but changing the *content* of an already-listed file does — because `install()` only downloads what's missing from the existing cache, and browsers only reinstall the service worker when `sw.js` itself changes. This phase changes the content of `spells-data-loader.jsx`, `i18n.jsx`, `v10-hifi.jsx`, and `pack-manager.jsx` (or its replacement) — all four are already in `PRECACHE`. Shipping this phase without bumping `CACHE_VERSION` means every returning user with an existing Cache Storage entry keeps serving the *pre-Phase-8* code indefinitely, with no error and no visible symptom until support requests arrive.
**Why it happens:** The bump is easy to forget because the app runs fine locally (no service worker on `file://`/localhost-without-HTTPS in some setups, or a dev browser without a stale cache).
**How to avoid:** Bump `CACHE_VERSION` (e.g. `grimorio-v4` → `grimorio-v5`) in the same commit/wave that ships the data-loader rewrite; add the new reserved-slugs JSON to `PRECACHE` in the same edit.
**Warning signs:** `check-decommission.tests.ps1` and `check-transition-banner.tests.ps1` (from Phase 6/7) both likely assert something about `CACHE_VERSION` bump discipline — grep them before writing Phase 8's own gate to match style, and add a new gate asserting the version string changed vs. the previous phase's committed value.

### Pitfall 3: Losing checkbox click-order when D-03's tiebreak needs "most recently checked"
**What goes wrong:** If the persisted selection is stored as a `Set` (or de-duplicated in a way that loses insertion order), there is no way to know which of SRD 5.1/SRD 5.2 the user checked *last* when both somehow end up in the array (e.g. from a `?v=` link or a race in prefs-loading). The safer design (and the one UI-SPEC's "partial" state row already implies — *"checking SRD 5.1 unchecks SRD 5.2 in the same state update"*) is to make the checkbox `onChange` handler itself enforce mutual exclusion synchronously, so the *invariant* holds in the persisted array at all times, and `resolveSelection()` never needs a tiebreak for this pair at all.
**Why it happens:** It's tempting to implement D-03 as a filter applied later (at resolve time) instead of as an invariant enforced at the point of state mutation.
**How to avoid:** Enforce the SRD 5.1/5.2 exclusivity inside the same `setState` call that toggles either checkbox — not as a downstream filter. This also sidesteps the "which was checked last" bookkeeping problem entirely.
**Warning signs:** Any code path that reaches `resolveSelection()` with both `srd-2014-en` and (`srd-2024-en` or `srd-2024-ptbr`) simultaneously present indicates the invariant was violated upstream — that path is a bug, not a case to handle gracefully.

### Pitfall 4: Conflating the two collision mechanisms (pack-id vs. spell-slug)
**What goes wrong:** A planner or implementer skimming `pack-import.jsx` sees `freeIdentifier()` already solving "a collision" and reuses/extends it for the new D-09 prompt — producing silent pack-id-style renaming for spell slugs, which directly violates D-09's "always prompt, never silent" requirement.
**Why it happens:** Both are called "collision" in casual conversation; the codebase's own naming (`meta.source` vs `spell.name`) doesn't scream the distinction unless you've read both files closely (see Pattern 3 above).
**How to avoid:** Treat these as two independent features in the plan's task breakdown — never a single "handle collisions" task.
**Warning signs:** A task titled generically "collision handling" without specifying pack-id vs. spell-slug in its acceptance criteria.

### Pitfall 5: `useEditionCompare`/"Também em:" reading a single global version after the model changes
**What goes wrong:** `useEditionCompare(sel, versionKey, versions, lang, showToast)` and `HifiDetailContent`'s "Também em:" effect (`v10-hifi.jsx` lines ~1019-1040) both currently call `window.getCurrentSpellVersion()` to get a *single* active version's key/corpus/edition. Once selection is a list, this call either breaks (returns something arbitrary/stale) or silently keeps comparing against whatever `_defaultVersion()` degrades to. Both call sites need to switch to `sel._versionKey`/`s._versionKey` (the SPELL's own origin key, from Pattern 2) — deriving `cur`/`activeVersion` from the spell being viewed, not from a global "current version".
**Why it happens:** These two functions predate multi-selection and were written when "the active version" was an unambiguous, well-defined singular concept.
**How to avoid:** Grep every call site of `getCurrentSpellVersion` before starting the UI wave; each one is a decision point requiring "which version, for what purpose" — most should become `s._versionKey`-derived.
**Warning signs:** Any new code calling `window.getCurrentSpellVersion()` without an explicit comment justifying why *a single* version is the right answer for that specific call site.

## Code Examples

### Existing identity mechanism this phase depends on (unchanged, do not modify the formula)
```javascript
// Source: v10-hifi.jsx line 9 — hifiSpellKey is the SOLE cross-pack identity.
// D-08's entire slug-uniqueness requirement exists because this function has
// NO pack/version component in it — two spells from different packs with the
// same (school, level, slug) are, by construction, the SAME key.
function hifiSpellKey(s) { return `${s.school}-${s.lvl}-${s.en}`; }
```

### Existing silent-rename mechanism this phase must NOT reuse for slugs (Pattern 3)
```javascript
// Source: pack-import.jsx — freeIdentifier resolves PACK-ID collisions
// (meta.source), always silently, never with a user prompt. This is correct
// for pack IDs; wrong for spell slugs (D-09 requires an interactive prompt).
function freeIdentifier(base, existingIds) {
  if (existingIds.indexOf(base) === -1) return base;
  let n = 2;
  while (existingIds.indexOf(`${base}-${n}`) !== -1) { n += 1; }
  return `${base}-${n}`;
}
```

### Existing read-only impact-count mechanism to reuse for D-13 (Pattern 4)
```javascript
// Source: pack-manager.jsx _removalImpact — read-only, proven side-effect-free
// by check-bookmarks-read-purity.tests.ps1. The rename-impact count (D-13)
// should call the SAME peekBookmarks()/loadCharacters() read path, just with
// "does this slug still resolve after the rename" as the staleness predicate
// instead of "does this slug still resolve after this pack is removed".
function _removalImpact(versionKey, index) {
  const impact = { prepared: 0, characters: 0, bookmarked: 0 };
  const staleKey = (key) => {
    const sources = index.byKey.get(key);
    return !!sources && sources.size === 1 && sources.has(versionKey);
  };
  // ...iterates window.loadCharacters() and window.peekBookmarks(), never writes.
}
```

## State of the Art

| Old Approach | Current Approach (this phase) | When Changed | Impact |
|--------------|-------------------------------|---------------|--------|
| `_currentVersion` — single active key | `selectedVersionKeys` — persisted array, resolved to a load-list at render time | Phase 8 | Every direct reader of `_currentVersion`/`getCurrentSpellVersion()` needs review (11+ call sites across `v10-hifi.jsx`, `v11-character-editor.jsx`, `index.html`) |
| `versionLang` — one language for the whole active dataset | `s.lang` — per-spell language, stamped by `adaptSpell()` at load time | Phase 8 | ~30 call sites in `v10-hifi.jsx` switch from a hook-level variable to a per-spell field; sort/filter-label call sites switch to `uiLang` instead |
| `VersionSelector` + `PackManager` — two separate dialogs | One pack menu (checkboxes, cards, reserved-slugs section) | Phase 8 (D-16) | `window.__openPackManager` global and `VersionSelector`'s compact/desktop dropdown code are retired; a new combined component replaces both |
| Pack-level collision only (`meta.source`, silent auto-suffix) | Pack-level collision (unchanged) **+** spell-slug collision (new, interactive prompt) | Phase 8 (D-08/D-09) | Two independent detection paths must coexist without being merged into one function |

**Deprecated/outdated:**
- `window.VersionSelector` (the compact/desktop dropdown component in `spells-data-loader.jsx`) — replaced by the new pack-menu component (D-16). Do not keep it around "for compatibility" — nothing else references it once the menu ships.
- `toast.versionSwitchedAway` (i18n key) — the flow it served (active pack silently disappears from the registry, forcing a fallback) is rewritten by this phase into a selection-based fallback (UI-SPEC's `menu.toastFallbackToDefault`); the old key becomes dead once that rewrite lands. Confirm via `i18nParityCheck()`-adjacent dead-key audit whether to delete it or leave it (harmless either way, but do not duplicate the same user-facing message under two keys).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|----------------|
| A1 | `resolveSelection()`/`unionSpells()`/`detectSlugCollisions()` as named/shaped in "Architecture Patterns" are illustrative sketches, not an existing API — no such functions exist in the codebase today under any name. `[ASSUMED]` naming/shape; `[VERIFIED]` that no prior art exists (confirmed by reading `spells-data-loader.jsx` and `pack-manager.jsx` in full). | Architecture Patterns 1-3 | Low — the planner is expected to design the exact function boundaries; this research documents the *invariants* they must satisfy (D-01..D-24), not a mandatory API surface |
| A2 | Recommending `pack-manager.jsx` be reused/renamed rather than replaced by a new file is a `[ASSUMED]` judgment call (ponytail: smallest diff), not something CONTEXT.md or UI-SPEC mandates — UI-SPEC is silent on the target filename. | Recommended Project Structure | Low — either choice satisfies D-16; wrong choice only costs a slightly larger `PRECACHE`/`sw.js` diff |
| A3 | The exact mechanism for D-03's "most recently checked" tiebreak (enforcing exclusivity inside the checkbox handler vs. a downstream filter) is `[ASSUMED]` best-practice, informed by UI-SPEC's own "partial" state row but not spelled out by CONTEXT.md as a specific implementation. | Pattern 1, Pitfall 3 | Low — UI-SPEC's stated behavior ("checking SRD 5.1 unchecks SRD 5.2 in the same state update") already implies this exact mechanism; low risk of being wrong |
| A4 | `_countsAsDuplicate()`'s existing SRD-5.1↔5.2 exemption in `pack-manager.jsx` (`!(corpusA === 'srd' && corpusB === 'srd')`) is `[VERIFIED]` (read directly) to already special-case SRD↔SRD, but whether the NEW "Também em:" behavior for the D-03 EN×PT case should reuse this exact function or a new one is `[ASSUMED]` — CONTEXT.md's D-22 says the note "continues", not which function computes it. | Pitfall 5 | Low — functionally equivalent either way; a wrong reuse choice is a refactor, not a behavior bug |

## Open Questions

1. **Does the D-03 tiebreak need a persisted "which was checked last" timestamp, or does enforcing mutual exclusion at the checkbox handler make the question moot?**
   - What we know: UI-SPEC states the checkbox handler enforces exclusivity synchronously ("not even mid-click").
   - What's unclear: Whether a `?v=srd-2014-en,srd-2024-en` link (both in one URL, no click history) needs its own explicit fallback rule, since "last checked" has no meaning for a URL-supplied list.
   - Recommendation: For the `?v=` case specifically, apply a fixed priority (e.g. "later item in the comma list wins," mirroring how the comma-separated list already has a natural left-to-right order) rather than trying to simulate click history. Flag for `discuss-phase` confirmation if the planner wants a locked rule here instead of an implementation default.

2. **Should `getCurrentSpellVersion()` be deleted outright, or kept as a narrower "reference version for X" helper?**
   - What we know: Several call sites (Pitfall 5) need per-spell origin instead. `index.html`'s `initialVersionKey` derivation (v11-character-editor.jsx line ~409) also calls it.
   - What's unclear: Whether any call site has a legitimate remaining need for "the version most associated with the current chrome session" as opposed to "this specific spell's origin version."
   - Recommendation: Audit all call sites in Wave 1 planning (before writing tasks) and decide per-site; do not blanket-delete or blanket-keep without checking each of the ~5-8 call sites individually.

## Environment Availability

Skipped — this phase has no new external dependency and no new tool/runtime/service requirement beyond what Phases 2-7 already established (Node.js for the one-shot `generate-srd-pack.mjs` script, a browser with IndexedDB/`localStorage`/Service Worker support, all already verified in prior phases).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None (no Jest/Vitest/Playwright test runner wired into `npm test` for app logic) — this project verifies via hand-written PowerShell string/regex assertion scripts against source files (`scripts/*.tests.ps1`), plus manual/agent-driven headless-Chromium QA at 390×844 (mobile) and a desktop viewport for the human-checkpoint pass. `package.json`'s `test` script (`pwsh -NoProfile -File scripts/run-tests.ps1`) runs the full `.tests.ps1` suite. |
| Config file | none — `scripts/run-tests.ps1` is the runner; individual gates are plain `.ps1` files under `scripts/`, one per feature area (e.g. `check-pack-manager.tests.ps1`, `check-loader-hardening.tests.ps1`) |
| Quick run command | `pwsh -NoProfile -File scripts/check-<new-gate-name>.tests.ps1` (single gate, fast — string/regex assertions against source, no browser) |
| Full suite command | `npm test` (runs `scripts/run-tests.ps1`, which runs every `*.tests.ps1`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|---------------------|--------------|
| MGMT-06 | Union of selected packs renders in the grid, no duplicate/hidden spells | static (source-assertion `.ps1`, checks the loader source for the union function + tests it against a small fixture pack) | `pwsh -NoProfile -File scripts/check-pack-composition.tests.ps1` | ❌ Wave 0 — new gate |
| MGMT-07 | Slug collision at import/selection opens the rename prompt; cancel aborts cleanly | static (source-assertion, mirrors `check-pack-import-dialog.tests.ps1`'s style) + manual headless-Chromium checkpoint (visual prompt, live validation) | `pwsh -NoProfile -File scripts/check-slug-rename.tests.ps1` | ❌ Wave 0 — new gate |
| MGMT-08 | Empty selection falls back to default version, grid never empty | static — extend `check-loader-hardening.tests.ps1`-style assertions | (extend existing loader gate, or a new one) | ❌ Wave 0 — new gate or extend existing |
| MGMT-09 | Pack menu shows cards with image/title/description, absorbs manager functionality | static (mirrors `check-pack-manager.tests.ps1`) + manual headless-Chromium checkpoint (visual, per UI-SPEC's 6-dimension check) | `pwsh -NoProfile -File scripts/check-pack-menu.tests.ps1` | ❌ Wave 0 — new gate, likely renames/absorbs `check-pack-manager.tests.ps1` |
| PKG-06 | `meta.image` validated (format, size cap), rejected with actionable error, never written on failure | static — extend `check-pack-validator.tests.ps1` | (extend existing gate) | ❌ Wave 0 — extend existing |
| SRD-05 | SRD 5.1/5.2 mutually exclusive; SRD EN×PT coexist with uiLang tiebreak | static — extend `check-edition-compare.tests.ps1` or a new gate | (extend or new) | ❌ Wave 0 |
| MIGR-04 | `versionKey` migrates single→list; `?v=` accepts comma list, back-compat with single value | static — mirrors `check-migration-version-fallback.tests.ps1`'s style | `pwsh -NoProfile -File scripts/check-selection-migration.tests.ps1` | ❌ Wave 0 — new gate |

### Sampling Rate
- **Per task commit:** the single relevant `.tests.ps1` gate for that task (fast, source-level, no browser)
- **Per wave merge:** `npm test` (full `.tests.ps1` suite) + a headless-Chromium pass at 390×844 and desktop, per this project's established checkpoint pattern (Phases 5-7 all used this)
- **Phase gate:** Full suite green + human checkpoint sign-off on the pack menu and rename dialog visuals (UI-SPEC's 6 dimensions), before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `scripts/check-pack-composition.tests.ps1` — covers MGMT-06 (union logic, per-spell `lang`/`_versionKey` stamping)
- [ ] `scripts/check-slug-rename.tests.ps1` — covers MGMT-07 (collision detection + rename write, both entry points)
- [ ] `scripts/check-pack-menu.tests.ps1` — covers MGMT-09 (menu structure, likely absorbs/replaces `check-pack-manager.tests.ps1`)
- [ ] `scripts/check-selection-migration.tests.ps1` — covers MIGR-04 (`versionKey` single→list, `?v=` comma-list)
- [ ] Extend `scripts/check-pack-validator.tests.ps1` — covers PKG-06 (`meta.image`)
- [ ] Extend `scripts/check-loader-hardening.tests.ps1` and/or `scripts/check-edition-compare.tests.ps1` — covers MGMT-08 and SRD-05
- [ ] No new test framework/runner needed — the existing `.ps1`-gate + headless-Chromium-checkpoint pattern from Phases 3/5/6/7 fully covers this phase's verification needs

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|----------------|---------|---------------------|
| V2 Authentication | No | No accounts, no auth — permanent project constraint |
| V3 Session Management | No | No sessions — `spellbook-ui-prefs` is client-local preference storage, not a session |
| V4 Access Control | No | Single-user local app, no access boundaries |
| V5 Input Validation | Yes | Hand-rolled field-table validation in `pack-import.jsx` (`META_FIELDS`/`SPELL_FIELDS`), extended for `meta.image` (MIME-prefix + length check, PKG-06); the rename-prompt's slug input needs the SAME live validation the pack-slug pattern already uses (`/^[a-z0-9][a-z0-9-]{0,63}$/`, per `pack.schema.json`'s `meta.source` pattern — reuse this exact regex for spell-slug format validation, per UI-SPEC's `rename.errorFormat`) |
| V6 Cryptography | No | No cryptographic operations in this phase (the color-hash for pack placeholders is a display hash, not a security control — do not conflate with a cryptographic requirement) |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|-----------------------|
| XSS via `meta.image` `data:` URI rendered in an `<img src>` | Tampering / Elevation of Privilege | MIME-prefix allowlist (`image/png`, `image/jpeg`, `image/webp`, `image/gif` only) rejects `data:text/html,...` or `javascript:`-style payloads before the string ever reaches an `<img>` tag; this is the same "validate at the trust boundary, never render unchecked third-party strings" pattern `pack-import.jsx` already applies to every other field. Size cap (200 KB) additionally bounds a decompression/memory-exhaustion vector from an oversized base64 blob. |
| Untrusted spell-name strings (from a third-party pack) rendered raw in the rename-conflict dialog | Tampering | Same T-05-01 convention already used by `PackManagerRow` — render as React text children (auto-escaped), sliced to a fixed length, `overflow-wrap: anywhere` — UI-SPEC already locks this for the rename dialog |
| Prototype pollution via a crafted pack JSON reaching the new `meta.image`/rename-suggestion code paths | Tampering | The existing `BLOCKED_KEYS` reviver in `parsePackText()` (blocks `__proto__`/`constructor`/`prototype` at parse time, any nesting depth) already covers any new field added to the schema — no new code needed here, just confirm the new `meta.image` field flows through the *same* `parsePackText()` call, never a second `JSON.parse()` |
| A pack with thousands of spells all colliding on reserved slugs, used to make the rename-conflict dialog unusably large (a DoS-shaped nuisance, not a security breach) | Denial of Service (nuisance-tier) | UI-SPEC already covers this as an "overflow" state (dialog body scrolls, footer pinned) — no additional mitigation needed beyond what UI-SPEC specifies |

## Sources

### Primary (HIGH confidence — read in full this session)
- `spells-data-loader.jsx` — full file read; `BUILTIN_VERSIONS`, `SPELL_VERSIONS`, `_currentVersion`/`setCurrentVersion`, `_initialVersionKey`, `LEGACY_VERSION_FALLBACK`, `_wantedVersionKey`, `refreshPluginVersions`, `adaptSpell`/`adaptSpells`, `useSpellVersions`, `VersionSelector`, `resolvableSpellKeys`
- `pack-manager.jsx` — full file read; `PackManager`, `PackManagerRoot`, `packSpellIndex`, `_removalImpact`, `_computeDupCounts`, `_countsAsDuplicate`
- `plugin-store.jsx` — full file read; `putPack`/`getPack`/`getSpells`/`listPacks`/`deletePack`, `exportPack`, `requestPersistence`
- `pack-import.jsx` — full file read; `META_FIELDS`/`SPELL_FIELDS` tables, `validatePack`, `freeIdentifier`, `sanitizePack`, `_install`
- `pack-import-dialog.jsx` — full file read
- `pack.schema.json` — full file read; `meta.source` pattern and its "collision auto-suffixes silently" description
- `v10-hifi.jsx` — targeted read of every `hifiSpellKey`/`versionKey`/`versionLang`/`useEditionCompare`/`hifiSiblingVersion`/"Também em:" call site (~50 matches across the file)
- `v11-character-editor.jsx` — targeted read of `versionKey` init/persistence, `useResolvableKeys`, orphan-spells section
- `grimorio-helpers.jsx` — full file read; `spellName`, `v8Description`/`v8Upgrade`/HTML variants, confirms the `pt`/`en`/`name_en` lang-selection mechanism
- `index.html` (lines 395-495) — `versionKey` init/persistence, `?v=` resolution, `hasPendingSpellVersion`
- `i18n.jsx` — targeted read of `noun.spell.*`, `plural()`, `i18nParityCheck()`, existing `manager.*`/`toast.*` keys
- `scripts/generate-srd-pack.mjs` — read header + slug/`freeIdentifier` helpers + output-write call sites
- `sw.js` — full file read; `CACHE_VERSION`/`PRECACHE` bump-discipline comment (this file's own comment is the authoritative source for Pitfall 2)
- `.planning/phases/08-composicao-aditiva-de-pacotes/08-CONTEXT.md`, `08-UI-SPEC.md` — both read in full
- `.planning/todos/pending/i18n-toast-versao-e-pluralizacao.md` — read in full, cross-checked against `spells-data-loader.jsx`'s current `toast.versionSwitchedAway` call site
- `scripts/check-pack-manager.tests.ps1` — read as a representative example of this project's `.tests.ps1` gate style

### Secondary (MEDIUM confidence)
- `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md` — read for phase history, requirement-ID numbering, and prior-phase decisions this phase must not contradict
- `scripts/` directory listing (`ls scripts/*.tests.ps1`) — used to confirm naming convention and infer likely new-gate names; individual gate *contents* beyond `check-pack-manager.tests.ps1` were not read in full

### Tertiary (LOW confidence)
None — no WebSearch/external-web source was needed for this phase; every claim traces to this repository's own source files.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependency exists to be uncertain about; confirmed by direct reading of `sw.js` PRECACHE and UI-SPEC's Registry Safety section
- Architecture: HIGH — every pattern above is grounded in a specific, quoted line range of an actual file read this session, not inferred from framework conventions
- Pitfalls: HIGH — Pitfall 2 (`CACHE_VERSION`) is verbatim from the file's own comment; Pitfall 5 (`versionLang`) was discovered by tracing ~30 call sites directly, not assumed

**Research date:** 2026-09-27
**Valid until:** No external expiry — this research is entirely internal-codebase-derived (no third-party API/library version to go stale). Re-validate only if another phase lands on top of these same files before Phase 8 executes.
