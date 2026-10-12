# Roadmap: Grimório do Jogador

## Overview

v2.0 "Plugins BYOD" turns the app from "app with embedded data" into "shell + plugins": the four copyrighted spell JSONs stop shipping with the app, replaced by a free CC-BY SRD pack plus a bring-your-own-data plugin engine (file/URL import, IndexedDB storage, sanitized HTML, dynamic version selector). The five phases below follow the dependency chain the data itself imposes: storage must exist before anything can be imported into it, a validated/sanitized import pipeline must exist before the loader can trust IndexedDB as a source, the loader must dispatch across sources before a manager UI has anything real to manage, and the old copyrighted datasets can only be decommissioned once the SRD replacement + import path are proven end-to-end (irreversible step, deliberately last).

## Milestones

- ✅ **Pre-milestone maintenance** — Phase 1 (animation verification, closed 2026-07-17)
- 🚧 **v2.0 Plugins BYOD** — Phases 2-6 (in progress)

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Animation Verification & Polish** - Confirm the already-implemented menu/filter/panel animations work correctly everywhere they were built for
- [x] **Phase 2: Plugin Storage Foundation** - IndexedDB persistence layer for spell packs, with persistent-storage request and export/backup (completed 2026-07-18)
- [x] **Phase 3: SRD Pack & Import Pipeline** - Users install a validated, sanitized pack from file or URL; SRD content exists as a real pack (completed 2026-08-11)
- [x] **Phase 4: Loader Integration (Source-Dispatch)** - The loader natively reads SRD + any installed packs through one dispatch point, no hardcoded 4-dataset list (completed 2026-08-17)
- [x] **Phase 04.1: Desacoplar o idioma da interface do idioma do pacote** (INSERIDA) - uiLang vira estado proprio; pre-requisito da Fase 6, que remove as unicas entradas em portugues (completed 2026-08-24)
- [x] **Phase 5: Plugin Manager UI & Version Selector** - Install/list/remove UI, dynamic version selector, duplicate-spell notes, empty state, CC-BY attribution (completed 2026-08-30)
- [x] **Phase 6: Decommissioning & Migration** - Remove the 4 protected JSONs from site/repo; migrate existing users without silently dropping references (completed 2026-09-27)
- [x] **Phase 7: Tradução dos SRDs para pt-BR** - Pacote SRD 5.2 pt-BR embutido, a partir da tradução CC-BY do Heróis Anônimos recortada às 339 magias do SRD (completed 2026-09-27)
- [ ] **Phase 8: Composição aditiva de pacotes** - Pacote base + pacotes homebrew empilhados que adicionam magias em vez de substituir a versão ativa
- [x] **Phase 9: Mobile: toque e safe-area** - Alvos de toque >=44px, pílulas acessíveis, gaveta clicável, safe-area (auditoria mobile, alta) (completed 2026-10-12, via protótipo: drawer virou tab bar)
- [x] **Phase 10: Mobile: legibilidade e hover em touch** - Hover só em mouse, título, tamanhos de fonte, contraste, paisagem (auditoria mobile, média) (completed 2026-10-12)
- [x] **Phase 11: Mobile: acabamento** - Modo sessão, copy, escola por extenso, ícones (auditoria mobile, baixa) (completed 2026-10-12)

## Phase Details

<details>
<summary>✅ Pre-milestone maintenance (Phase 1) - CLOSED 2026-07-17</summary>

### Phase 1: Animation Verification & Polish

**Goal**: The menu/filter/panel/editor open-close animations shipped from the ingested SPEC work correctly on every surface they were built for — every desktop and mobile interaction, every theme, reduced-motion users, and keyboard-only users.
**Depends on**: Nothing (first phase)
**Requirements**: ANIM-01, ANIM-02, ANIM-03, ANIM-04
**Success Criteria** (what must be TRUE):

  1. User can open/close the desktop character menu, filter dropdowns, "+ mais" filter menu, character editor, and side detail panel and see smooth, glitch-free animations in every one of the 6 themes (light/dark)
  2. User can open/close the mobile character sheet, fullscreen editor, and spell detail screen and see smooth, glitch-free animations in every theme
  3. A user with `prefers-reduced-motion: reduce` enabled sees all of the above happen instantly, with no flicker or flash of mid-transition state
  4. A keyboard-only user can open every animated menu/dropdown/panel/editor, close it with Escape, and see focus return correctly to the triggering element

**Plans**: Ad hoc (10 implementation tasks shipped in git history `e733b1c`..`463fb7d`, no formal PLAN.md tracked)
**UI hint**: yes
**Status**: Complete — manual cross-theme/reduced-motion/keyboard verification confirmed by user 2026-07-17.

</details>

### Phase 2: Plugin Storage Foundation

**Goal**: Spell packs (bundled or user-imported) persist reliably in the browser across reloads and restarts, with best-effort protection against silent data loss.
**Depends on**: Nothing new (first phase of this milestone; no functional dependency on Phase 1)
**Requirements**: STOR-01, STOR-02, STOR-03
**Success Criteria** (what must be TRUE):

  1. A pack written to storage is still present, unchanged, after a full page reload or browser restart (STOR-01)
  2. The app requests persistent storage on load, visible as a granted/requested persistent quota in the browser's storage devtools panel (STOR-02)
  3. An installed pack can be exported back to a downloaded JSON file, content-identical to what's stored (STOR-03)
  4. A storage write that fails (e.g., quota exceeded) fails cleanly — no partial writes, no crash, no silent data loss

**Plans**: 2/2 plans executed
Plans:
**Wave 1**

- [x] 02-01-PLAN.md — `plugin-store.jsx`: CRUD IndexedDB (`grimorio-plugins` v1 / store `packs`), falha limpa em escrita, wiring em `index.html` + PRECACHE do `sw.js` (STOR-01)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 02-02-PLAN.md — `navigator.storage.persist()` no boot + `exportPack()` como download JSON, e verificação humana dos 4 critérios da fase (STOR-02, STOR-03)

**Planning route**: PLAN DIRETO (sem discuss). IDB schema + wrapper de ~40 linhas + export-como-download já especificados em `research/ARCHITECTURE.md` e `STACK.md`. Nenhuma decisão de produto em aberto. Research do plan: NÃO.

### Phase 3: SRD Pack & Import Pipeline

**Goal**: Users can install a spell pack of their choosing — their own file or a compatible URL — into the app, with every pack validated and its HTML sanitized before anything renders; the built-in SRD content exists as a real, importable pack.
**Depends on**: Phase 2
**Requirements**: PKG-01, PKG-02, PKG-03, PKG-04, PKG-05, SRD-01
**Success Criteria** (what must be TRUE):

  1. A pack author can read a published JSON Schema + docs page describing the manifest and spell format, and validate their own pack file against it before sharing it (PKG-01)
  2. User can pick a pack JSON file from their device and have it installed into the app (PKG-02)
  3. User can enter a compatible URL (raw.githubusercontent/Gist/jsDelivr) and have the pack fetched and installed, with CORS limitations explained in the UI (PKG-03)
  4. Malformed JSON, oversized files, schema-invalid content, or `__proto__`/`constructor`/`prototype` keys are all rejected with a clear message before anything is written to storage (PKG-04). A duplicate `source` value is NOT rejected — per D-09 it resolves to a free identifier (`srd-2014-en` → `srd-2014-en-2`), so an existing pack is never overwritten and two versions of the same pack can coexist.
  5. Every spell description from an imported pack passes through DOMPurify sanitization before it can reach any `dangerouslySetInnerHTML` sink — raw imported HTML is never rendered (PKG-05)
  6. A generated SRD pack (CC-BY EN subset) exists as a file conforming to the same pack schema and installs cleanly through the same pipeline (SRD-01)

**Plans**: 8/8 plans executed
Plans:
**Wave 1**

- [x] 03-01-PLAN.md — `pack.schema.json` na raiz + `pack-docs.html`: o contrato do formato publicado para autores (PKG-01)
- [x] 03-02-PLAN.md — investigação de licença das fontes SRD 5.1/5.2 com evidência verificável, correção do texto de SRD-01 em REQUIREMENTS.md, e checkpoint de decisão da rota (SRD-01, D-05/D-06/D-07)

**Wave 2** *(bloqueada na Wave 1)*

- [x] 03-03-PLAN.md — `pack-import.jsx`: validador escrito à mão, bloqueio de `__proto__`/`constructor`/`prototype` no reviver do parse, teto de 10 MB e `freeIdentifier` (PKG-04)
- [x] 03-04-PLAN.md — `scripts/generate-srd-pack.mjs` + `srd-2014-en.json` / `srd-2024-en.json`, com prova de não-reuso do texto dos JSONs atuais (SRD-01)

**Wave 3** *(bloqueada na Wave 2)*

- [x] 03-05-PLAN.md — funil de instalação: leitura de arquivo, fetch por URL com bytes limitados, DOMPurify e gravação única com sufixo (PKG-02, PKG-03, PKG-05)
- [x] 03-06-PLAN.md — `pack-import-dialog.jsx` + chaves `import.*`/`packErr.*` no `i18n.jsx`: superfície mínima de import (PKG-02, PKG-03)

**Wave 4** *(bloqueada na Wave 3)*

- [x] 03-07-PLAN.md — wiring: DOMPurify com SRI e versão fixada, ordem de carga no `index.html`, montagem do gatilho e `PRECACHE` do `sw.js`

**Wave 5** *(bloqueada na Wave 4)*

- [x] 03-08-PLAN.md — CSP de escopo mínimo com a rota de saída de D-10 registrada, e verificação humana da fase (6 temas × claro/escuro + impressão + payload hostil)

**UI hint**: yes
**Planning route**: PLAN DIRETO após 2 decisões de produto resolvidas em chat antes do plan: (a) qual SRD embutir — 5.1/2014, 5.2/2024, ou ambos (afeta subconjunto de magias + texto de atribuição da Fase 5); (b) teto de tamanho do import. Pipeline (validação, DOMPurify, formato) já especificada em research. Research do plan: NÃO — **corrigido em 2026-07-26 (D-07):** a nota original subestimou o escopo. A validação de licença das fontes SRD é investigação real e virou o plano 03-02, com checkpoint de decisão bloqueante antes de qualquer geração de pacote. Não é pesquisa de framework; é verificação de fonte de dados + licença.

### Phase 4: Loader Integration (Source-Dispatch)

**Goal**: The app's spell-loading engine natively supports both the bundled SRD pack and any number of user-installed packs from one dispatch point, with no hardcoded 4-dataset list.
**Depends on**: Phase 3
**Requirements**: SRD-03
**Success Criteria** (what must be TRUE):

  1. On first launch, with zero prior installs, the SRD pack is already loaded and its spells are immediately browsable — first open is never empty (SRD-03)
  2. The SRD pack and any packs already sitting in IndexedDB (installed via Phase 3's pipeline) both load at boot through the same dispatch path, with no separate per-source logic
  3. A previously-selected version preference that no longer resolves (e.g., points at a pack that's gone) still boots into a working version instead of a blank or broken state

**Plans**: 4/4 plans executed
Plans:
**Wave 1**

- [x] 04-01-PLAN.md — registro de versões declarativo (`BUILTIN_VERSIONS` com `source`/`edition`, 2 packs SRD à frente dos 4 legados) e dispatch por origem em `loadVersion`, com fallback de chave desconhecida (SRD-03)

**Wave 2** *(bloqueada na Wave 1)*

- [x] 04-02-PLAN.md — enumeração dos packs de IndexedDB no boot (`refreshPluginVersions`, evento `hifi-plugins-changed`), dono único da resolução de versão inicial e derivação de idioma a partir da versão ativa (SRD-03)
- [x] 04-03-PLAN.md — packs SRD no `PRECACHE` do `sw.js`, comparador de edições casando por `edition`, e fixture de QA com payload hostil commitado (SRD-03)

**Wave 3** *(bloqueada na Wave 2)*

- [x] 04-04-PLAN.md — verificação humana dos 3 critérios da fase e fechamento da dívida herdada do teste 5 do `03-UAT.md` (payload hostil pelos 4 sinks de render)

**Planning route**: PLAN DIRETO (sem discuss). Ponto de integração único (`source: 'fetch'|'idb'` em `loadVersion`) já desenhado em `research/ARCHITECTURE.md`, ancorado no código real de `spells-data-loader.jsx`. Maior risco TÉCNICO do milestone (mexe em código load-bearing) — mitigado por plano bom + verificação, não por discuss. Research do plan: NÃO.

### Phase 04.1: Desacoplar o idioma da interface do idioma do pacote (INSERTED)

**Goal**: O idioma da interface e uma preferencia propria do usuario, persistida e trocavel a qualquer momento, independente de qual pacote de magias esta selecionado — de modo que um usuario brasileiro possa ler magias em ingles com a interface em portugues.
**Depends on**: Phase 4
**Requirements**: I18N-01, I18N-02, I18N-03
**Success Criteria** (what must be TRUE):

  1. O idioma da interface e um estado proprio, persistido em `spellbook-ui-prefs`, e sobrevive a recarga independente da versao ativa
  2. Trocar de versao de magias NAO troca o idioma da interface
  3. `HifiLangToggle` troca o idioma da interface, e nao a versao ativa — e continua funcionando quando nenhuma versao no registro tem `lang: 'ptbr'`
  4. Na primeira visita, o idioma da interface vem do navegador (`detectLang()`), nao da versao resolvida
  5. Um usuario com a interface em portugues lendo um pacote em ingles ve a UI toda em portugues e o conteudo das magias em ingles, sem estado inconsistente

**Plans**: 5/5 plans executed
**UI hint**: yes
**Planning route**: DISCUSS antes de planejar. Reverte deliberadamente a decisao original de i18n ACOPLADO (versao = fonte unica de verdade do idioma, sem toggle separado), entao a discussao precisa registrar o que substitui aquela decisao. Research do plan: NAO — o dicionario central ja existe (`i18n.jsx` com blocos `ptbr:`/`en:`, `makeT(lang)`, `tt(lang, key)` e checagem de paridade); o trabalho e fiacao de estado, nao traducao.

**Por que e pre-requisito da Fase 6** (levantado no checkpoint 04-04, ver `.planning/todos/pending/desacoplar-idioma-ui-da-versao.md`):
`HifiLangToggle` (`v10-hifi.jsx:436`) nao e um seletor de idioma — e um seletor de VERSAO disfarcado: faz `versions.find(v => v.lang === 'ptbr' && ...)` e chama `onSwitch(pt.key)`. O criterio 3 da Fase 6 remove os 4 JSONs protegidos e deixa so o SRD no precache, e os packs SRD sao `lang: 'en'`. Sem nenhuma entrada `ptbr` no registro, o `find` retorna `undefined`, o botao PT fica inerte e `defaultVersionKeyForLang('ptbr')` cai no fallback `vs[0]`. A Fase 6 entregaria um app monolingue em ingles para publico brasileiro, contrariando seu proprio criterio 4.

Plans:
**Wave 1**

- [x] 04.1-01-PLAN.md — Wave 1: secao I18N em REQUIREMENTS.md (D-20) + estado uiLang proprio em index.html, `window.__setUiLang`, effect de acoplamento removido (I18N-01)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 04.1-02-PLAN.md — Wave 2: HifiLangToggle reescrito (2 estados, sempre habilitado, `lang` nos botoes), montado no desktop e no mobile, VersionSelector no idioma da UI (I18N-02)
- [x] 04.1-03-PLAN.md — Wave 2: CharacterEditor deriva o idioma do pack localmente e usa nele os nomes de magia e a busca (I18N-03)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 04.1-04-PLAN.md — Wave 3: nome/descricao/niveis superiores seguem o pack, `lang` por regiao nos 5 sinks + nome (WCAG 3.1.2), ficha impressa com dois idiomas (I18N-03)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 04.1-05-PLAN.md — Wave 4: rotulos de filtro, escola, classe e Sim/Nao seguem a UI; remapeamento morto removido; scripts em risco corrigidos; checkpoint humano da fase (I18N-03)

### Phase 5: Plugin Manager UI & Version Selector

**Goal**: Users can see and manage everything they've installed in one place, the version selector reflects reality instead of a fixed list, and the built-in SRD content carries correct legal attribution.
**Depends on**: Phase 4
**Requirements**: MGMT-01, MGMT-02, MGMT-03, MGMT-04, MGMT-05, SRD-02
**Success Criteria** (what must be TRUE):

  1. User can see a list of installed packs with name, version, spell count, and source (MGMT-01)
  2. User can remove an installed pack; prepared/bookmarked spells that referenced it disappear from the active list without crashing, and come back if the pack is reinstalled (MGMT-02)
  3. The version selector enumerates whatever packs actually exist in storage at that moment, growing and shrinking as packs are installed/removed, instead of a fixed list of 4 (MGMT-03)
  4. When two installed packs share a spell, the UI shows an informative note (e.g., "2 versões de Bola de Fogo: SRD, MeuPack") instead of blocking install or silently merging (MGMT-04)
  5. With zero packs installed, the empty state explains what a pack is and links directly to import (MGMT-05)
  6. The app displays the verbatim CC-BY attribution text matching the exact SRD edition bundled (5.1 or 5.2), including notes on any modifications to the source text (SRD-02)

**Plans**: 5/5 plans executed
**UI hint**: yes
**Planning route**: DISCUSS antes de planejar. Decisões de UX genuínas: onde o gerenciador vive (drawer/tela própria), desktop vs mobile, onde a atribuição aparece. Candidata a sketch de mockup (como no modo sessão). Research do plan: NÃO — é design de UI, não pesquisa técnica.

Plans:
**Wave 1**

- [x] 05-01-PLAN.md — Wave 1: `pack-manager.jsx` novo (modal `PackManager` + `PackManagerRoot` + `window.__openPackManager`), lista de packs instalados, linhas SRD embutidas com atribuição CC-BY verbatim, estado vazio, `window.getVersionMeta` no loader, script de teste novo (MGMT-01, MGMT-05, SRD-02)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 05-02-PLAN.md — Wave 2: montagem em `index.html` + PRECACHE em `sw.js`, remoção do gatilho flutuante provisório de import (D-03), realinhamento dos dois scripts de teste que o exigiam (MGMT-05)
- [x] 05-03-PLAN.md — Wave 2: `window.packSpellIndex()` (índice de magias memoizado), contagem agregada de duplicatas por linha, remoção com confirmação inline e impacto concreto sem tocar em dado de personagem (MGMT-02, MGMT-04)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 05-04-PLAN.md — Wave 3: item "Gerenciar pacotes…" no `VersionSelector` + guarda de lista vazia (D-19), linha de gerenciar na seção VERSÃO do drawer mobile, nota "Também em:" no detalhe da magia (MGMT-03, MGMT-04)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 05-05-PLAN.md — Wave 4: checkpoint humano dos seis critérios do ROADMAP (390×844 nos dois temas, ciclo preparar→remover→reinstalar, fidelidade da atribuição) e fechamento do todo do botão flutuante

### Phase 6: Decommissioning & Migration

**Goal**: The four copyrighted spell datasets are fully removed from the live site and repo HEAD, and every existing user's prepared/bookmarked spells transition safely with nothing silently lost.
**Depends on**: Phase 5
**Requirements**: MIGR-01, MIGR-02, MIGR-03
**Success Criteria** (what must be TRUE):

  1. An existing user's prepared/bookmarked spells that still resolve (against SRD or their installed packs) work exactly as before after the update (MIGR-01)
  2. An existing user's prepared/bookmarked spells that no longer resolve against any installed pack are flagged as unresolved in the UI, never silently dropped (MIGR-01)
  3. The 4 protected JSON files are gone from the deployed site and repo HEAD, and the service worker precache list contains only the SRD file (MIGR-02)
  4. An existing user's first visit after the update shows clear, actionable guidance on how to import their own pack to restore full spell content (MIGR-03)

**Plans**: 7/7 plans executed

Plans:
**Wave 1**

- [x] 06-01-PLAN.md — Wave 1: loader — mapa de fallback de versão por edição (D-04), `window.resolvableSpellKeys()`, nome legível EN e conversão mínima de markdown no adaptador SRD (todo `srd-pack-nomes-slug-e-markdown-cru`), 2 gates novos (MIGR-01)
- [x] 06-02-PLAN.md — Wave 1: `peekBookmarks()` de leitura pura em `v11-character-editor.jsx`, `pack-manager.jsx` migrado para ele, gate que prova a pureza por execução (WR-01 do review da Fase 5) (MIGR-01)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 06-03-PLAN.md — Wave 2: `hifiOrphanFromKey()` e a seção de magias órfãs ao final das abas `prepared`/`bookmarked` do editor, com contagem, explicação e toggle individual (D-10/D-11/D-12) (MIGR-01)
- [x] 06-04-PLAN.md — Wave 2: `transition-banner.jsx` novo, chaves `migration.*` em `i18n.jsx`, montagem em `index.html`, entrada em `PRECACHE`, dispensa em `spellbook-ui-prefs` (D-05..D-08, D-13) (MIGR-03)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 06-05-PLAN.md — Wave 3: commit atômico único — `git rm` dos 4 JSONs, remoção das 4 entradas de `BUILTIN_VERSIONS` e das 4 linhas de `PRECACHE`, bump de `CACHE_VERSION`, realinhamento de 4 gates legados e gate de descomissionamento novo (D-14..D-17) (MIGR-02)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 06-06-PLAN.md — Wave 4: checkpoint humano dos 4 critérios de sucesso (390×844 nos dois temas, dado do usuário comparado byte a byte antes/depois, Cache Storage conferido) e fechamento dos dois todos incorporados ao escopo (MIGR-01, MIGR-02, MIGR-03)

**Wave 5** *(gap closure — os 2 defeitos que a UAT reprovou; o checkpoint de 06-06 tem de ser RE-EXECUTADO depois deste plano)*

- [x] 06-07-PLAN.md — Wave 5: `peekCharacters()` de leitura pura em `v11-character-editor.jsx` e banner consumindo ele (banner aparecia em instalação nova, D-06), escrita de migração de `loadBookmarks()` condicionada a haver algo a migrar (`hifi_bookmarks_v1` nascia vazia no boot), 4 provas de execução acrescentadas aos 2 gates existentes (MIGR-03)

**UI hint**: yes
**Planning route**: DISCUSS antes de planejar. Decisões delicadas: como o usuário existente vivencia a transição (aviso/tela de boas-vindas, como as órfãs aparecem), sequência do deploy. Research marcou a detecção de migração como território novo do codebase. Fase IRREVERSÍVEL — discutir sai mais barato que corrigir. Research do plan: possível research LEVE na lógica de detecção/preservação de referências órfãs (novidade no codebase), a confirmar no discuss.

### Phase 7: Tradução dos SRDs para pt-BR

**Goal:** O usuário brasileiro volta a ler as magias em português sem configurar nada,
com conteúdo de procedência registrada — a tradução CC-BY-4.0 do Heróis Anônimos
recortada às 339 magias do SRD 5.2 — sem reintroduzir nenhum byte dos 4 datasets que a
Fase 6 removeu.

**Requirements**: SRD-01, SRD-02, SRD-03, SRD-04
**Depends on:** Phase 6
**Success Criteria** (what must be TRUE):

  1. Um navegador em português, na primeira visita, abre no pacote embutido "SRD 5.2 (PT-BR)" e lê as 339 magias do SRD 5.2 em português (D-05, D-06)
  2. Quem tinha salvo uma chave legada `*-PTBR` volta sozinho ao português, e as preparadas/favoritas continuam resolvendo porque `name` é o slug EN (D-07, D-08, D-13)
  3. O pacote pt-BR carrega a atribuição verbatim da WotC (SRD 5.2) e do Heróis Anônimos, com nota de modificação própria, visível no gerenciador de pacotes (D-02, D-04, SRD-02)
  4. O pacote tem exatamente as 339 magias de `srd-2024-en.json`, com círculo/escola batendo, sem nome próprio do PHB e sem legenda de ilustração (D-01, D-14, D-16, D-18)
  5. O documento completo do Heróis Anônimos e os fixtures legados nunca entram no repositório — só o recorte versionado (D-02, D-09, D-10, D-17)

**Plans:** 5/5 plans complete

**Nota:** a descrição original desta fase (tradução própria de 658 descrições, 5.1 e
5.2, decisões em aberto) foi substituída pela discussão de 2026-09-05, revisada em
2026-09-26 — ver `.planning/phases/07-traducao-srd-ptbr/07-CONTEXT.md` (D-01..D-19). Só a
edição 5.2 tem pack pt-BR (D-03).

Plans:
**Wave 1**

- [x] 07-01-PLAN.md — Wave 1: fonte versionada — fixtures legados em formato de pack só em `.cache/` (D-09/D-10), tabela das 17 renomeadas e extrator one-shot que grava o recorte com a Licença verbatim e as 339 magias do SRD 5.2, sem legendas nem nomes próprios, validado contra o EN e o oráculo legado (SRD-01, SRD-04)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 07-02-PLAN.md — Wave 2: gate `check-srd-ptbr-pack.tests.ps1` (RED) e rota pt-BR no gerador (`parsePtbr52`, nota de modificação por pacote) que gera `srd-2024-ptbr.json` (GREEN), packs EN intactos (SRD-01, SRD-02, SRD-04)
- [x] 07-03-PLAN.md — Wave 2: SRD-04 promovido em `REQUIREMENTS.md` e seção de proveniência pt-BR em `03-SRD-SOURCE.md` (SRD-01, SRD-02, SRD-04)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 07-04-PLAN.md — Wave 3: strip do rótulo pt-BR de 45 caracteres; registro `srd-2024-ptbr`, fallback do D-08, precache e bump `grimorio-v4` num commit com os 3 gates realinhados; texto do banner de transição (SRD-02, SRD-03, SRD-04)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 07-05-PLAN.md — Wave 4: checkpoint humano — ~10 magias na tela (D-15), primeira visita pt-BR, chave legada, identidade pt↔en, atribuição e Cache Storage (SRD-02, SRD-03, SRD-04)

### Phase 8: Composição aditiva de pacotes

**Goal:** O usuário mantém um pacote base ativo (ex.: SRD 5.2) e empilha pacotes homebrew por cima: as magias dos pacotes empilhados SOMAM à lista da versão ativa em vez de substituí-la, com a origem de cada magia visível e sem quebrar preparadas/favoritas.
**Requirements**: MGMT-06, MGMT-07, MGMT-08, MGMT-09, PKG-06, SRD-05, MIGR-04
**Depends on:** Phase 7
**Plans:** 11/12 plans executed

**Nota:** o objetivo acima foi escrito antes do discuss; o `08-CONTEXT.md` (D-01) tirou a
ideia de "pacote base" — todo pacote marcado soma, e seleção vazia cai no pacote padrão (D-04).
**Emenda 2026-10-12 (E-06..E-08):** voltou o conceito de base — o menu separa "Pacotes base" (concorrem, um por vez; `meta.role`) de "Pacotes adicionais" (somam), e os embutidos passaram a viver na pasta `packs/` com manifesto gerado. Ver `08-CONTEXT.md`.

Plans:
**Wave 1**

- [x] 08-01-PLAN.md — Wave 1: seleção de pacotes em lista no loader — `normalizeSelection`/`resolveSelection`/`unionSpells`, `lang`/`_versionKey` por magia, migração do `versionKey` e `?v=` em lista com pendência por item, persistência em `selectedVersionKeys`, `index.html` sem estado de versão (MGMT-06, MGMT-08, SRD-05, MIGR-04)
- [x] 08-02-PLAN.md — Wave 1: chaves i18n novas (menu, renomear, plural de personagem), `meta.image` no schema/validador e `srd-reserved-slugs.json` gerado + `pack-docs.html` (PKG-06, MGMT-07, MGMT-08, MGMT-09)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 08-03-PLAN.md — Wave 2: conteúdo no idioma de cada magia em v10/v11; "Também em" e comparador ancorados em `_versionKey` (MGMT-06, SRD-05)
- [x] 08-04-PLAN.md — Wave 2: colisão de slug e prompt de renomear — detecção/sugestão/validação no funil de import, `pack-rename-dialog.jsx`, import integrado (MGMT-07)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 08-05-PLAN.md — Wave 3: menu de pacotes único — cartões com imagem/título/descrição, checkbox, remoção, licença, slugs reservados, chip e renomeação na seleção (MGMT-06..09, PKG-06, SRD-05)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 08-06-PLAN.md — Wave 4: chip na barra e no drawer, `?v=` em lista no compartilhar, remoção do seletor antigo e das compatibilidades, chaves mortas, `sw.js` v5 (MGMT-06, MGMT-09, MIGR-04)

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 08-07-PLAN.md — Wave 5: QA automatizado + checkpoint humano em 390×844 e desktop; fecha o todo `i18n-toast-versao-e-pluralizacao`

**Wave 6** *(gap closure — checkpoint 08-07 reprovado: GAP-1..GAP-4; o roteiro de 10 itens é refeito no 08-12)*

- [x] 08-08-PLAN.md — Wave 6: emendas datadas E-01..E-05 no `08-CONTEXT.md` (import sem prompt, seleção com prompt por decisão do usuário, `meta.image` https, origem da magia, copy de imagem) e PKG-06/MGMT-07 reescritos e `Pending` (MGMT-07, PKG-06)

**Wave 7** *(blocked on Wave 6 completion — o registro das decisões entra antes do código que as implementa)*

- [x] 08-09-PLAN.md — Wave 7: GAP-1 — magia sem `source` herda o nome do pacote em `adaptSpell` (ponto único), FONTE do detalhe sem separador órfão (MGMT-06)
- [x] 08-10-PLAN.md — Wave 7: GAP-3 + GAP-4 — allowlist única `IMAGE_SRC` (`data:` raster ≤ 200 KB ou `https://`), `<img>` sem referrer com fallback ao placeholder, docs com aviso de privacidade, mensagens de imagem reescritas (PKG-06, MGMT-09)

**Wave 8** *(blocked on Wave 7 completion — compartilha `pack-import.jsx`/`i18n.jsx` com o 08-10)*

- [x] 08-11-PLAN.md — Wave 8: GAP-2 — import renomeia slug em colisão sozinho e avisa (toast + tela de sucesso), seleção mantém o prompt, código do prompt no import removido, `sw.js` `grimorio-v6` (MGMT-07)

**Wave 9** *(blocked on Wave 8 completion)*

- [ ] 08-12-PLAN.md — Wave 9: checkpoint humano refeito (10 itens ajustados aos gaps, cobrindo os UNVERIFIED 1, 2, 3, 4, 6, 7, 9, 10); fecha o todo dobrado só se itens 4 e 8 passarem e marca só os requisitos aprovados (MGMT-06..09, PKG-06, SRD-05, MIGR-04)

## Planning Routes (resumo)

Registrado 2026-07-18. Regra: discuss só quando há decisão de produto/UX que o planner não pode tomar sozinho.

| Fase | Rota | Research no plan? |
|------|------|-------------------|
| 2 Storage | Plan direto | Não |
| 3 SRD + Import | Plan direto (após 2 decisões em chat: qual SRD, teto de tamanho) | Não |
| 4 Loader | Plan direto | Não |
| 5 Manager UI | Discuss (+ possível sketch) | Não |
| 6 Migração | Discuss | Talvez leve (detecção de órfãs) |

**Research de plano:** nenhuma fase precisa do research pesado de framework — a pesquisa de milestone já cobriu stack/arquitetura/pitfalls com código real. A única candidata a research LEVE é a Fase 6 (lógica de preservação de referências órfãs, que é novidade neste codebase), e mesmo assim só se o discuss revelar necessidade.

## Progress

**Execution Order:**
Phases execute in numeric order: 1 (done) → 2 → 3 → 4 → 5 → 6. Decommissioning (Phase 6) is deliberately last — irreversible, and gated on the SRD pack + import path (Phases 3-5) working end-to-end first.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|-----------------|--------|-----------|
| 1. Animation Verification & Polish | Pre-milestone | ad hoc | Complete | 2026-07-17 |
| 2. Plugin Storage Foundation | v2.0 | 2/2 | Complete    | 2026-07-18 |
| 3. SRD Pack & Import Pipeline | v2.0 | 8/8 | Complete    | 2026-08-11 |
| 4. Loader Integration (Source-Dispatch) | v2.0 | 4/4 | Complete    | 2026-08-17 |
| 04.1. Desacoplar o idioma da interface | v2.0 | 5/5 | Complete    | 2026-08-24 |
| 5. Plugin Manager UI & Version Selector | v2.0 | 5/5 | Complete    | 2026-08-30 |
| 6. Decommissioning & Migration | v2.0 | 7/7 | Complete    | 2026-09-27 |
| 7. Tradução dos SRDs para pt-BR | v2.0 | 5/5 | Complete    | 2026-09-27 |
| 8. Composição aditiva de pacotes | v2.0 | 11/12 | In Progress|  |

### Phase 9: Mobile: toque e safe-area (auditoria alta prioridade)

**Status:** Done 2026-10-12. Implemented outside /gsd-plan-phase, from the prototype in ../grimorio-prototipo-mobile, together with phases 9-11: the drawer was replaced by a bottom tab bar (Buscar, Filtros, Preparadas, Sessão, Mais) with an expanding search field, and a single mobile control canon (44/40px, radius 10-12, system sans) replaced the 25px canon. See design.md sections 4 and 6.

**Goal:** Every primary mobile control is reachable by touch and assistive tech, and the layout respects device safe areas.
**Source:** `docs/audits/2026-10-12-auditoria-mobile.md` (itens 1-4)
**Scope:**
  1. Collapsed search drawer: whole 56px bar opens it (today only the 390x12 handle does)
  2. `HifiPill` becomes `<button type="button" aria-pressed>` with a touch-sized hit area
  3. Icon buttons keep the 25px visual but get a >=44px hit area on coarse pointers (header, detail, drawer tools, "preparar", prepared ribbon)
  4. `env(safe-area-inset-*)` applied: top/side padding of the mobile shell, drawer height + bottom inset
**Success criteria:** Playwright pass at 390x844 / 320x568 / 844x390 reports no interactive target < 44px on its short side (except documented exceptions); filters operable with keyboard/VoiceOver; no content under notch/home indicator.
**Requirements**: TBD
**Depends on:** Nothing (independent of Phase 8; mobile UI only)
**Plans:** 0 plans

Plans:

- [ ] TBD (run /gsd-plan-phase 9 to break down)

### Phase 10: Mobile: legibilidade e hover em touch (auditoria media prioridade)

**Goal:** Mobile reading is comfortable and touch interactions leave no stuck visual state.
**Source:** `docs/audits/2026-10-12-auditoria-mobile.md` (itens 5-10)
**Scope:**
  5. All `:hover` rules gated by `@media (hover: hover)`
  6. Mobile header title: character name on one line (ellipsis, ~18px), caret never orphaned
  7. Mobile type sizes up: card description 14-15px, V/S/M and level chips legible
  8. Mobile card description clamped (~4 lines + fade) - confirm with user, it reverses a deliberate choice
  9. WCAG AA contrast: cantrip "○" and "·" >= 3:1, drawer placeholder >= 4.5:1 in light and dark
  10. Landscape: card text max ~70ch or 2 columns above ~700px
**Success criteria:** contrast script reports no AA failures on meaningful text; header fits in 1-2 clean lines at 320px; no stuck hover after tap.
**Requirements**: TBD
**Depends on:** Phase 9
**Plans:** 0 plans

Plans:

- [ ] TBD (run /gsd-plan-phase 10 to break down)

### Phase 11: Mobile: acabamento (auditoria baixa prioridade)

**Goal:** Finishing touches on mobile-only surfaces.
**Source:** `docs/audits/2026-10-12-auditoria-mobile.md` (itens 11-14)
**Scope:**
  11. Session mode stat row fits 390px without clipping the info icon
  12. Remove em-dash from session empty-state copy (PT and EN)
  13. Mobile list shows full school name instead of abbreviation
  14. Replace 🎲/☀️ emoji icons with a single SVG icon family
**Success criteria:** session mode screenshot at 390/320 shows no clipping; i18n parity check passes.
**Requirements**: TBD
**Depends on:** Phase 10
**Plans:** 0 plans

Plans:

- [ ] TBD (run /gsd-plan-phase 11 to break down)
