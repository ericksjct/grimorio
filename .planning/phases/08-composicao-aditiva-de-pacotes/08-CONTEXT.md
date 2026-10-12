# Phase 8: Composição aditiva de pacotes - Context

**Gathered:** 2026-09-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Hoje o app mostra **uma** versão ativa por vez (`_currentVersion`, uma chave de
`SPELL_VERSIONS`). Esta fase troca isso por uma **seleção de pacotes**: o
usuário marca quantos pacotes quiser (SRD embutidos e packs importados) e as
magias de todos eles **somam** na grade. A identidade de magia passa a exigir
**slug único** entre os pacotes selecionados. Conflitos são resolvidos por
renomeação de slug na UI, nunca por ocultação ou prioridade silenciosa. O
seletor de versão e o gerenciador de pacotes (Fase 5) viram **uma superfície
só**: um menu novo de pacotes, com imagem, título e descrição por pacote.

Fica fora: qualquer escrita nas listas de preparadas/favoritas dos personagens,
seleção por personagem, e filtro de pacote na barra de filtros.

</domain>

<decisions>
## Implementation Decisions

### Modelo de composição

- **D-01:** **Não existe mais "base".** Todo pacote selecionado soma. O estado
  ativo é uma **lista** de chaves de `SPELL_VERSIONS`, não uma chave. Isso
  substitui `_currentVersion`/`setCurrentVersion` como fonte da grade.
- **D-02:** Qualquer número de pacotes pode estar selecionado ao mesmo tempo.
- **D-03:** SRD embutidos entram no mesmo modelo: também são selecionáveis
  junto com outros, sujeitos às mesmas regras de colisão (D-08..D-11), com duas
  regras próprias:
  - **SRD 5.1 e SRD 5.2 são mutuamente exclusivos**: marcar um desmarca o
    outro (mesmos slugs, edições diferentes, sem regra de desempate que faça
    sentido).
  - **SRD da mesma edição em idiomas diferentes** (hoje `srd-2024-en` e
    `srd-2024-ptbr`) podem coexistir: numa colisão de slug entre eles, **vence
    o pacote no idioma da interface** (`uiLang`). Não é conflito e não abre o
    prompt de renomear.
- **D-04:** **Seleção vazia é permitida** no menu, e com ela a grade mostra o
  **pacote padrão de hoje** (a mesma resolução de `_initialVersionKey()` /
  `_defaultVersion()`: SRD 5.2 no idioma do navegador). O app nunca mostra
  grade vazia por falta de seleção (mantém F5 D-17).
- **D-05:** `meta.edition` continua **opcional e só informativo**. Não restringe
  combinações de homebrew. A exclusividade de edição do D-03 vale apenas entre
  os SRD embutidos.
- **D-06:** Pacotes em idiomas diferentes combinam livremente. Cada magia
  continua no idioma do seu pacote, com `lang` por região já marcado (Fase
  04.1, WCAG 3.1.2).
- **D-07:** A seleção é **global no dispositivo**, persistida em
  `spellbook-ui-prefs`. Não é por personagem; `hifi_chars_v1` e `?build=` não
  mudam.

### Colisão e slugs reservados

- **D-08:** O slug (`name` do pack, que alimenta `en` e portanto
  `hifiSpellKey = school-lvl-slug`) é **identidade única obrigatória** entre os
  pacotes selecionados. Não há prioridade, merge nem "uma vence a outra" entre
  homebrews. (Exceção única: D-03, SRD mesma edição em idiomas diferentes.)
- **D-09:** **Slugs reservados** = slugs dos pacotes SRD embutidos. Um pack
  importado que traz slug reservado **ou** que colide com outro pack já
  instalado abre um **prompt na UI para renomear** os slugs conflitantes. A
  mensagem nomeia cada magia em conflito (nome no pack que entra, nome no pack
  que já tem o slug, e o slug).
- **D-10:** O mesmo prompt aparece em dois momentos:
  - **No import**, antes de gravar no IndexedDB.
  - **Na seleção**, quando marcar um pack instalado colide com outro já
    marcado (dois homebrews com o mesmo slug).
  Em ambos, **quem é renomeado é sempre o pacote que está entrando** (o que está
  sendo importado ou marcado agora), nunca o que já estava ativo.
- **D-11:** O prompt **sugere** um slug com sufixo do pack (ex.: `fireball` do
  pack `meu-homebrew` → `fireball-meu-homebrew`), editável, com validação ao
  vivo (formato de slug, não reservado, único entre instalados). Oferece
  **"aplicar o sufixo a todas as conflitantes"** para resolver o lote de uma vez.
- **D-12:** **Cancelar o prompt aborta a operação:** no import, nada é gravado;
  na seleção, o pack não é marcado. O estado nunca fica ambíguo.
- **D-13:** Renomear o slug de um pack já instalado faz as preparadas/favoritas
  que apontavam para o slug antigo deixarem de resolver. O prompt **avisa
  quantas** (mesma contagem derivada da F5 D-06). **Proibição mantida (F5 D-07,
  F6 D-09):** nenhum código desta fase escreve em `prepared`/`bookmarked` de
  personagem nem em `hifi_bookmarks_v1`. Elas viram órfãs e usam a seção de
  órfãs que já existe (F6 D-10/D-11).
- **D-14:** A renomeação é gravada no pack armazenado. **Export devolve a
  versão renomeada**, o que está armazenado, coerente com STOR-03.
- **D-15:** Slugs reservados são consultáveis em **dois lugares**:
  - **Docs de autor:** `pack-docs.html` + um JSON público de slugs reservados
    gerado pelo mesmo script dos packs SRD (`scripts/generate-srd-pack.mjs`),
    para o autor validar antes de publicar. O app usa o mesmo arquivo como
    fonte da lista.
  - **No menu de pacotes:** seção que lista cada **slug** e, abaixo dele como
    subitem, **cada pacote que contém a magia** daquele slug com o **nome que a
    magia tem naquele pacote** (ex.: `fireball` → SRD 5.2 (EN): Fireball;
    SRD 5.2 (PT-BR): Bola de Fogo).

### Menu de pacotes (substitui seletor + gerenciador)

- **D-16:** Um **menu remodelado** substitui o `VersionSelector` (chip
  dropdown no desktop, bottom sheet no mobile) **e absorve** o `PackManager`:
  seleção (checkbox), importar, remover (fluxo de confirmação inline da F5
  D-05/D-06), licença e atribuição (F5 D-12..D-14) e a seção de slugs
  reservados (D-15) ficam numa superfície só. Revoga F5 D-01/D-02/D-04 no
  ponto em que tratavam seletor e gerenciador como coisas separadas; as regras
  de conteúdo daquelas decisões (remoção sem purga, atribuição verbatim) seguem.
- **D-17:** Cada pacote aparece como cartão com **imagem, título e
  descrição**:
  - **Imagem:** campo novo **opcional** `meta.image`, aceito **só como
    `data:` URI** (formatos de imagem raster, com teto de tamanho). Nada de URL
    externa: funciona offline e não vaza IP do usuário a host de terceiro. O
    import valida esse campo. Sem imagem: **placeholder gerado** com a cor
    derivada do pacote (D-19). Builtins SRD podem ter arte própria.
  - **Descrição:** **derivada automaticamente**, sem campo novo no schema
    (autor, versão, idioma, edição, contagem de magias).
- **D-18:** O chip do topo (gatilho do menu) mostra **primeiro pacote +
  contagem** (ex.: `SRD 5.2 +2`). Mobile pode compactar.
- **D-19:** **Cor derivada por pacote** (estável, hash do identificador sobre
  a paleta do tema) aparece **só no menu** (placeholder de imagem / marcação
  do cartão). Não tinge nada na grade.

### Origem da magia na grade

- **D-20:** **Nenhum selo novo.** O rodapé do card/linha já mostra `src`
  (código derivado do campo `source` da própria magia) e continua sendo a
  indicação de origem. F5 D-09 (sem badge no grid) segue valendo.
- **D-21:** **Sem filtro por pacote** na barra de filtros. Para ver só um
  pacote, o usuário desmarca os outros no menu.
- **D-22:** A nota "Também em:" do detalhe (F5 D-09) continua, agora
  refletindo o caso SRD EN×PT (D-03). Entre homebrews selecionados ela não
  deveria mais ocorrer, porque D-08 impede slug duplicado.

### Migração e links

- **D-23:** `spellbook-ui-prefs.versionKey` existente vira **seleção de um
  item** (`[versionKey]`) na primeira carga. O fallback legado
  (`LEGACY_VERSION_FALLBACK`, F6 D-04 / F7 D-08) é aplicado **antes** da
  conversão. Nada muda visualmente para quem atualiza.
- **D-24:** `?v=` passa a aceitar **lista separada por vírgula**
  (`?v=srd-2024-en,plugin-meupack`). `?v=` antigo, de um item, continua
  válido. Chaves de pack não instalado seguem o comportamento pendente atual
  (`_wantedVersionKey`, CR-01/WR-05), agora por item.

### Claude's Discretion

- **Comparador de edição (`useEditionCompare`)**: o usuário delegou. Ajustar ao
  modelo multi-pacote sem mudar comportamento visível: a magia vinda de um SRD
  continua comparável com a outra edição do SRD; homebrew continua sem
  comparador (`corpus: 'pack'`).
- Layout exato dos cartões do menu, ordem da lista, teto de tamanho de
  `meta.image` e formatos aceitos, algoritmo de hash de cor, copy de todos os
  textos (via `i18n.jsx`, paridade PT/EN obrigatória com `i18nParityCheck`).
- Nome e formato da chave nova em `spellbook-ui-prefs` e do JSON de slugs
  reservados.
- Como carregar vários packs em paralelo (`loadVersion` por chave já deduplica
  e cacheia) e como mesclar sem custo perceptível na grade.

### Folded Todos

- **`i18n-toast-versao-e-pluralizacao`** (`.planning/todos/pending/`) — **entra
  no escopo** por escolha do usuário. (1) O toast "the pack you were viewing
  was removed — switched back to …" sai em inglês ignorando `uiLang`: a fase
  reescreve exatamente esse fluxo (remover pack ativo agora significa tirá-lo
  da seleção), então a string nova nasce em `i18n.jsx`. (2) Contagens sem
  plural (`manager.duplicates`, `manager.impactBookmarked`,
  `manager.impactPrepared`, `personagem(ns)`): seguir a convenção existente de
  `noun.spell.other`; como o menu novo reescreve essas strings, corrigir nelas
  e em qualquer contagem nova da fase (ex.: aviso de impacto de D-13, "+N" do
  D-18). Não é mandato para varrer o dicionário inteiro.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Formato de pack e import
- `pack.schema.json` — schema publicado; ganha `meta.image` opcional (D-17)
- `pack-docs.html` — docs de autor; ganha tabela de slugs reservados (D-15)
- `pack-import.jsx` — validador escrito à mão, `freeIdentifier`, teto de tamanho; ponto de entrada do prompt de rename no import (D-09/D-10)
- `pack-import-dialog.jsx` — superfície de import atual
- `plugin-store.jsx` — CRUD IndexedDB; rename grava aqui (D-14)
- `scripts/generate-srd-pack.mjs` — gerador SRD; passa a emitir o JSON de slugs reservados (D-15)

### Registro, carga e seleção
- `spells-data-loader.jsx` — `BUILTIN_VERSIONS`, `SPELL_VERSIONS` (mutação só in place), `_packToVersion`, `loadVersion`, `_initialVersionKey`, `LEGACY_VERSION_FALLBACK`, `_wantedVersionKey`, `useSpellVersions`, `VersionSelector`, `resolvableSpellKeys`
- `pack-manager.jsx` — `PackManager`, `packSpellIndex` (`byName`/`byKey`), contagens de impacto e duplicatas; absorvido pelo menu novo (D-16)
- `index.html` — leitores de `SPELL_VERSIONS` e gravação de `spellbook-ui-prefs.versionKey` (~L400-490)
- `v10-hifi.jsx` — `hifiSpellKey` (L9), nota "Também em:" (~L1021-1035), rodapé com `src`, drawer mobile seção VERSÃO
- `v11-character-editor.jsx` — seção de órfãs (F6 D-10/D-11), destino das preparadas que D-13 deixa de resolver
- `i18n.jsx` — dicionário central, `i18nParityCheck`, convenção de plural `noun.spell.other`

### Decisões anteriores que continuam valendo
- `.planning/phases/05-plugin-manager-ui-version-selector/05-CONTEXT.md` — D-05..D-14 (remoção inline, sem purga, atribuição verbatim), D-09 (sem badge no grid), D-17 (grade nunca vazia), D-19 (guarda de lista vazia)
- `.planning/phases/06-decommissioning-migration/06-CONTEXT.md` — D-04 (fallback legado), D-09..D-12 (órfãs, nenhuma escrita destrutiva)
- `.planning/phases/07-traducao-srd-ptbr/07-CONTEXT.md` — D-08 (mapa legado atual), D-13 (`name` = slug EN é identidade)
- `.planning/todos/pending/i18n-toast-versao-e-pluralizacao.md` — todo incorporado

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `loadVersion(key)`: já deduplica fetch em voo e cacheia por chave; carregar N pacotes é chamar N vezes.
- `packSpellIndex()` (`pack-manager.jsx`): índice por nome/chave sobre todas as versões; base natural para detectar colisão de slug e para a seção de reservados (D-15).
- `resolvableSpellKeys()`: já carrega todas as versões para calcular órfãs; serve para a contagem de impacto do rename (D-13).
- `freeIdentifier` (`pack-import.jsx`): padrão de sufixo para identificador livre; mesmo espírito da sugestão de slug (D-11).
- `useDialogA11y` + chrome de diálogo de `pack-import-dialog.jsx`: foco/ESC do menu novo e do prompt de rename.
- Confirmação inline de remoção e bloco "Licença e atribuição" do `PackManager`: migram para o cartão do menu novo.

### Established Patterns
- `SPELL_VERSIONS` só é mutado in place (push/splice), nunca reatribuído.
- Eventos `hifi-spells-source-changed` e `hifi-plugins-changed` sincronizam React com o registro; a seleção nova precisa de sinal equivalente.
- Toasts em chrome seguem `uiLang`, nunca o idioma do pack.
- Nenhuma escrita em listas de personagem fora dos toggles do usuário.
- Sem runner de frontend: verificação por scripts `.tests.ps1` + checkpoint humano / Chromium headless em 390×844 e desktop.

### Integration Points
- `useSpellVersions()` devolve `spells` de uma versão; passa a devolver a união da seleção (com o desempate de idioma do D-03).
- `buildSpellsFromRealData()` / `window.v7BuildSpells`: consumidores da lista de magias.
- `adaptSpell` já anota cada magia com `lang`/`edition` do pacote; a magia precisa carregar também a chave do pacote de origem (para "Também em", comparador e rename).
- `index.html` grava `versionKey` em prefs; passa a gravar a lista (D-23).

</code_context>

<specifics>
## Specific Ideas

- Menu de pacotes em cartões com imagem, título e descrição (pedido explícito do usuário).
- Seção de reservados organizada por slug, com subitens "pacote → nome da magia naquele pacote".
- Prompt de conflito sugere sufixo e oferece aplicá-lo a todas as conflitantes de uma vez.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

<amendments>
## Emendas pós-checkpoint 08-07 (2026-09-30)

As decisões D-01..D-24 acima ficam como estavam. As emendas abaixo valem no lugar das partes que citam; o que elas não citam continua valendo.

- **E-01 (GAP-2 — substitui, SÓ no caminho de import, a frase "abre um prompt na UI para renomear" de D-09, o 1º item de D-10, D-11 e D-12):** no import, slug em colisão (reservado do SRD ou de pack instalado) é renomeado automaticamente com `suggestSlug` (`<slug>-<identificador do pack>`, `-2`/`-3` se ocupado, sempre `SLUG_PATTERN`). O pack é instalado sem prompt e o usuário vê, no idioma da interface, um toast e uma linha na tela de sucesso com as renomeações (até 3, depois "e mais N"). D-08 (identidade por slug), D-13 (nenhuma escrita em `prepared`/`bookmarked`/`hifi_bookmarks_v1`) e D-14 (export devolve o renomeado) continuam valendo. O aviso de impacto do D-13 sai do import: o pacote que entra ainda não está instalado, então renomear os slugs dele não deixa nenhuma preparada/favorita órfã nova; órfãs que já existiam continuam na seção de órfãs (F6 D-10/D-11).
- **E-02 (decisão do usuário, 2026-09-30 — caminho de SELEÇÃO mantém o prompt):** `pack-manager._selectionConflicts` → `PackRenameDialog` fica como está; D-10 2º item, A-14 (o SRD nunca é renomeado), D-11 (sugestão e validação ao vivo), D-12 (cancelar não marca) e D-13 (aviso de impacto) seguem valendo ali. Motivo: o import já compara contra TODOS os instalados + reservados, então colisão na seleção só acontece com pack instalado antes da Fase 8; renomear pack já instalado pode deixar preparadas órfãs e por isso exige consentimento explícito.
- **E-03 (GAP-3 — substitui a cláusula de imagem de D-17 e o texto "nunca URL externa" de PKG-06):** `meta.image` aceita `data:` URI raster (PNG/JPEG/WebP/GIF, base64) de até 204800 caracteres OU URL absoluta `https://` de até 2048 caracteres; `http:`, `javascript:`, protocolo relativo e qualquer outro esquema são rejeitados. Uma allowlist só, a constante `IMAGE_SRC` de `pack-import.jsx`, usada pelo validador do import e pela revalidação de render (T-08-23) — nada de segunda regex. O import não busca a URL. O cartão usa `<img>` (nunca fundo CSS) com `referrerPolicy="no-referrer"` e cai no placeholder do D-19 quando a imagem não carrega (offline, 404, host bloqueado). O `sw.js` já ignora requisição de outra origem (exceto unpkg), então imagem externa não é cacheada; a CSP não declara `img-src` e continua sem declarar. Privacidade: o host da imagem vê o IP de quem abre o menu; `pack-docs.html` documenta isso e recomenda `data:` para uso offline e privacidade.
- **E-04 (GAP-1 — esclarece D-20):** magia sem `source` próprio herda o nome do pacote (`meta.name`, ou `meta.source` sem nome) como fonte, no ponto único de derivação (`adaptSpell`). O campo FONTE do detalhe mostra o nome completo; o rodapé do card continua com o código curto (`src`); o separador ` · ` só aparece entre partes não vazias. Efeito colateral aceito: o filtro extra "Fonte" passa a listar o código desses pacotes, como já lista o de packs com `source` por magia — não é o filtro por pacote vetado pelo D-21. Nenhum selo novo (D-20 segue).
- **E-05 (GAP-4 — substitui a copy de `packErr.imageInvalid`/`packErr.imageTooLarge` do UI-SPEC):** a mensagem diz, em linguagem simples, que o pacote não foi instalado e o que é aceito (link `https://` ou imagem PNG/JPEG/WebP/GIF embutida de até 200 KB), com paridade PT/EN. A fonte da copy passa a ser `i18n.jsx`.

## Emenda pós-fase: pacotes base e adicionais (2026-10-12)

Decisão do usuário depois do checkpoint 08-07; vale no lugar de D-01, D-03, D-05 e D-22 onde eles dizem "não existe base", "SRD mutuamente exclusivos por edição" e "SRD EN + PT coexistem". O resto continua valendo.

- **E-06 (volta o conceito de "base"):** o menu separa **Pacotes base** e **Pacotes adicionais**. Bases concorrem entre si — **só um base fica marcado por vez** (marcar outro desmarca o anterior, mesmo da mesma edição; SRD 5.2 EN + PT-BR deixam de poder coexistir; num `?v=` com vários bases vence o último da lista). Adicionais somam magias ao base marcado, em qualquer número. Seleção só com adicionais continua válida; seleção vazia continua caindo no pacote padrão (D-04).
- **E-07 (`meta.role`):** campo opcional do schema do pacote, `"base"` | `"additional"` (padrão `additional`), validado em `pack-import.jsx` e documentado em `pack-docs.html`. É assim que o usuário traz um pacote base próprio. Na instalação, pacote `base` NÃO tem slugs renomeados contra o SRD/instalados (repetir slug do SRD é esperado); a colisão é resolvida na seleção, onde o adicional é quem cede (`_selectionConflicts`, A-14 generalizado de "o SRD nunca é renomeado" para "o base nunca é renomeado").
- **E-08 (pasta `packs/` é a fonte dos embutidos):** os 3 SRD saíram da raiz para `packs/`. O menu só mostra o que está em `packs/` + o que o usuário instala. `packs/index.js` (manifesto gerado por `scripts/build-packs-index.mjs`, `npm run packs`; teste `check-packs-index`) define `globalThis.BUILTIN_PACKS`, lido de forma síncrona pelo loader e via `importScripts` pelo `sw.js` (PRECACHE derivado dele; `CACHE_VERSION` `grimorio-v7`). Cada embutido é base por padrão; papel, edição, idioma e rótulo saem do `meta` do JSON; miniatura opcional = `packs/<mesmo-nome>.png|webp|jpg`.
- Texto do menu: seções `manager.sectionBuiltin` = "pacotes base" e `manager.sectionInstalled` = "pacotes adicionais", com dicas `manager.baseHint`/`manager.additionalHint`.

</amendments>

---

*Phase: 08-composicao-aditiva-de-pacotes*
*Context gathered: 2026-09-27*
