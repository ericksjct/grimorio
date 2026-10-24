# Auditoria de codigo morto — milestone v2.1

**Escopo:** app (index.html, 11 JSX, hifi-tokens.css, sw.js, pack-docs.html, packs/index.js).
**Metodo:** leitura completa dos arquivos + scripts Node (em scratchpad) que cruzam
todos os arquivos do app e `scripts/*.ps1|mjs`. Comentarios foram removidos antes de
contar usos. Arquivos tem fim de linha CRLF (cuidado ao fazer grep/regex com `$`).
**Data:** 2026-10-23. Nenhum codigo foi alterado.

Legenda de confianca: **HIGH** = sem nenhum uso (provado por busca em todos os arquivos).
**MEDIUM** = provavelmente morto, ha um teste ou uma suposicao que precisa de olhar.
**LOW** = precisa de checagem em tempo de execucao ou de decisao do dono.
Coluna **Teste** = script em `scripts/` que trava o codigo morto (precisa editar junto).

---

## 1. Resumo

- Total estimado removivel: **~630 a ~710 linhas** (JS ~370, CSS ~250, i18n ~25, comentarios ~90). Ver secao 9.
  Base: ~11.000 linhas de app (JSX ~9.000, CSS 1.393, html/js ~600).
- **Maior ganho unico:** o seletor de temas foi removido da UI, mas o app ainda carrega
  4 temas mortos (`nord`, `monokai`, `solarized`, `parchment`) em CSS (102 linhas) e em
  `THEME_PALETTES` (41 linhas), mais o parametro `theme` passado por 8 componentes.
  `theme` e sempre `'daylight'`: nenhum codigo chama `__setTheme`/`__setThemePreset`.
- **Segundo ganho:** caminho de impressao de uma magia so (`hifiPrint`, `hifiPrintList`,
  `hifiShare`, modos `single`/`list`, ~70 linhas JS+CSS). So `hifiPrintPrepared` (modo
  `pack`) e chamado.
- **Armadilha:** varios itens mortos sao **travados por testes** (`_isSrdBuiltin`,
  `hifiShare`, `toggleBookmarkedFor`, 5 chaves `manager.*`, `exportPack`,
  `hifiSiblingVersion`). Remover o codigo sem editar o teste quebra
  `pwsh scripts/run-tests.ps1`.
- **Todo "Tambem em":** confirmado. O ramo (2) de `alsoIn` e inalcancavel (DC-12).
  O ramo (1) esta vivo.
- Nenhum item exige mudanca visivel, exceto os marcados "DECISAO" (secao 5).

---

## 2. Inventario — codigo JS/JSX morto

### 2.1 Funcoes, componentes, constantes e exports sem nenhum uso (HIGH)

| ID | Local (arquivo:linha) | O que e | Evidencia | Teste | Linhas |
|----|----------------------|---------|-----------|-------|--------|
| DC-01 | v10-hifi.jsx:118-133 | `hifiShare()` | 0 chamadores em todo o repo. Unico uso e a propria definicao. Todo `review-04-1-warnings` WR-06 ja pedia isto | **check-content-lang-ownership.tests.ps1:87-93** exige a assinatura — apagar junto | 16 |
| DC-02 | v10-hifi.jsx:135-141 | `hifiPrint()` | 0 chamadores | nenhum | 7 |
| DC-03 | v10-hifi.jsx:143-146 | `hifiPrintList()` | 0 chamadores | nenhum | 4 |
| DC-04 | v10-hifi.jsx:2772-2779 + export 2781 | `HifiMobilePhone` (usa `IOSDevice`) | `IOSDevice` nao existe em nenhum arquivo; 0 usos de `HifiMobilePhone` | nenhum | 9 |
| DC-05 | v10-hifi.jsx:2170, 2227, 2287-2289 | props `drawerOpen: initialDrawerOpen`, `detailIdx` de `HifiMobile` + `useEffect` de `detailIdx` | Unico chamador e `<HifiMobile lang dark theme character>` em index.html:557. So `HifiMobilePhone` (morto) passava esses props | nenhum | 5 |
| DC-06 | v10-hifi.jsx:739,786 | parametro `initialFilters` de `useHifiAppState` | Os 2 chamadores (1147, 2189) passam `undefined` | nenhum | 2 |
| DC-07 | grimorio-helpers.jsx:41 + export 102 | `levelKey()` | 0 usos | nenhum | 2 |
| DC-08 | v11-character-editor.jsx:317-318 + export 1207 | `charHasPrepared`, `charHasBookmarked` | 0 usos fora da definicao/export | nenhum | 3 |
| DC-09 | v11-character-editor.jsx:328-335 + export 1202 | `toggleBookmarkedFor()` | 0 usos. Favoritas viraram lista global (`toggleBookmark`) | **check-pack-menu.tests.ps1:169** lista o nome em um array de exports | 9 |
| DC-10 | v11-character-editor.jsx:105-106 + export 1197 | `HIFI_PALETTE` ("Legado — alguns componentes ainda importam") | 0 usos; ninguem importa | nenhum | 3 |
| DC-11 | spells-data-loader.jsx:748-751, 761-763 | `_isSrdBuiltin()` | 0 usos no app | **check-pack-composition.tests.ps1:18,92** (exige `function _isSrdBuiltin(` e o expoe no harness) | 8 |
| DC-12 | v10-hifi.jsx:967-981 | Ramo (2) do efeito `alsoIn` em `HifiDetailContent` (SRD mesma edicao, outro idioma, dentro da selecao resolvida) | `normalizeSelection` (loader:791-818) mantem **so o ultimo pacote base**; os 3 SRD sao `role:'base'`. Nao existe selecao com 2 SRD. Ja descrito em `todos/pending/i18n-import-successcount-plural.md` §2 | check-pack-composition (secao "Tambem em") pode travar `getResolvedVersionKeys`; conferir | 16 |
| DC-13 | v10-hifi.jsx:315-322 | objeto `fallback` em `HifiPrintCard` | `HifiPrintCard` so e renderizado com `chunk` (linha 243). `chunk || fallback` nunca usa `fallback` | check-content-lang-ownership.tests.ps1 conta `HifiPrintCard` (4 refs); conferir | 8 |
| DC-14 | v10-hifi.jsx:187-194, 205-207, 242 | Caminhos "legacy `lang`", magia unica (`spell`) e modo `list` em `HifiPrintRoot` | Unico despachante vivo (`hifiPrintPrepared`, linha 160) manda `spells` + `mode:'pack'`. Os outros 2 despachantes sao DC-02/DC-03 | check-content-lang-ownership.tests.ps1 | ~15 |
| DC-15 | plugin-store.jsx:181-223, 166-168, 127-128 | `exportPack()`, `_packFileName()`, `getPersistenceState()`, `_persistState` | 0 chamadores no app. Nao existe botao de exportar em nenhum JSX. So testes usam. **Requisito STOR-03 consta como "Validated" em PROJECT.md** | **check-plugin-store-persistence-export**, **check-plugin-store**, **check-source-dispatch** | ~52 |
| DC-16 | spells-data-loader.jsx:916,926,970 | estado `loaded`/`setLoaded` de `useSpellVersions` | `useHifiAppState` repassa `loaded` (v10:745,901) mas Desktop e Mobile nunca desestruturam | nenhum | 6 |
| DC-17 | spells-data-loader.jsx:957-961, 971 | `setSelectedKeys` retornado por `useSpellVersions` | 0 consumidores (pack-manager chama `window.setSelectedVersionKeys` direto) | nenhum | 6 |
| DC-18 | v10-hifi.jsx:901 | `resolvedKeys` no retorno de `useHifiAppState` | usado dentro do hook (assinatura), nunca desestruturado fora | nenhum | 1 |
| DC-19 | index.html:491-494, 522-524 | `window.__setDark`, `__setTheme`, `__setThemePreset` | 0 chamadores em qualquer arquivo ou teste (so definidos e zerados) | nenhum | 8 |
| DC-20 | spells-data-loader.jsx:404,414,415,418,465-468 | campos de `adaptSpell` nunca lidos: `name_pt`, `compNote`, `castTimeNote`, `known`, `url`, `ritual`, `concentration`, `castTime` | Leitura de propriedade (`.campo`) = 0 em todo o app. O app le `conc`/`rit`/`time` | testes leem `ritual`/`concentration`/`castTime`/`url` (loader-hardening, source-dispatch) | 8 |
| DC-21 | packs/index.js (4x), scripts/build-packs-index.mjs:33, spells-data-loader.jsx:11,129 | campo `labelPt` | Escrito em 3 lugares, **lido em nenhum**. Todo codigo usa `labelEn` | testes so usam como fixture sintetica (edition-compare) | 6 |
| DC-22 | spells-data-loader.jsx:47,55 | `BUILTIN_VERSIONS` | copia dupla: `BUILTIN_VERSIONS = BUILTIN_PACKS.slice()` e logo `SPELL_VERSIONS = BUILTIN_VERSIONS.slice()`. Mais nenhum uso | nenhum | 2 |
| DC-23 | v10-hifi.jsx:2273-2285 | ramo `!drawerOpen && dy < -40` de `onDrawerTouchEnd` | O handler so existe no `<div>` que renderiza quando `drawerOpen` e true; `!drawerOpen` nunca vale ali. Comentario 2260-2263 ("Fechado: arrastar pra cima abre") esta errado | nenhum | 2 |
| DC-24 | v10-hifi.jsx:466-471 | 2o `find(predicate)` de `hifiSiblingVersion` | O unico chamador de producao (`useEditionCompare`) ja filtra `corpus === 'srd'` e `cur.corpus === 'srd'`, entao os 2 `find` dao o mesmo resultado | **check-edition-compare** e **check-ui-lang-toggle** travam a funcao e o corpus preferido | 1 |
| DC-25 | v11-character-editor.jsx:730; v10-hifi/index.html:583 | ternarios com os dois lados iguais: `mode === 'fullscreen' ? 22 : 22`, `isMobile ? 0 : 0` | trivial | nenhum | 2 |
| DC-26 | v10-hifi.jsx:1623, 2342, 2680 | `: ''`/`: (x.mounted ? ...)` dentro de bloco que so renderiza quando `x.mounted` e true | ramo morto (`mounted` ja garantido pelo `&&` externo) | nenhum | 0 (so simplifica) |

### 2.2 Plumbing de tema (HIGH — um requisito so)

Fato: `theme` em `App` (index.html:396) comeca `'daylight'` e so mudaria via `setTheme`,
que so e chamado por DC-19 (sem chamador). `spellbook-ui-prefs.theme` e gravado mas **nunca lido**
por index.html (so por pack-docs.html:453). Logo o app roda sempre com `hifi-theme-daylight`.

| ID | Local | O que remover | Linhas |
|----|-------|---------------|--------|
| DC-30 | v11-character-editor.jsx:22-62 | `THEME_PALETTES` de `nord`, `monokai`, `solarized`, `parchment` (e `catppuccin` 12-21, ver DC-31) | 41 (+10) |
| DC-31 | v11:89-106 | defaults `theme = 'catppuccin'` em `paletteFor`/`paletteForTheme`/`accentOf` e fallback `THEME_PALETTES.catppuccin` | ~6 |
| DC-32 | index.html:262,396,462; v10:1122,1260,2170,2327; v11:561,698; pack-manager:605; transition-banner:112; pack-import-dialog:90; pack-rename-dialog:225 | prop/variavel `theme` e o ternario `theme && theme !== 'catppuccin' ? ' hifi-theme-' + theme : ''` (9 copias identicas). Vira constante `hifi-theme-daylight` | ~25 |
| DC-33 | hifi-tokens.css:114-219 | blocos `.hifi-theme-solarized/nord/monokai/parchment` (claro e escuro) | 106 |
| DC-34 | hifi-tokens.css:84-112 | base Catppuccin `.hifi-light`/`.hifi-dark` — sobrescrita **inteira** por daylight (todas as 40+ variaveis estao definidas la). **MEDIUM:** pack-docs.html (body sem classe de tema quando `prefs.theme` nao existe) ainda cai na base | 29 |
| DC-35 | hifi-tokens.css (vars `--rosewater`, `--flamingo`, `--sky`, `--sapphire`, `--lavender`) | 5 custom properties definidas em todos os blocos e **nunca usadas** (`var(--x)` = 0; sem uso dinamico em JS) | ~5 |

Teste: nenhum script referencia `hifi-theme-*`, `THEME_PALETTES` ou nomes dos temas
(so `sync-vscode-peacock-catppuccin.*`, que e ferramenta de VS Code, fora do app).

### 2.3 Guardas de ordem de carga que nunca falham (MEDIUM)

Em producao `index.html` carrega tudo em ordem fixa e o React so renderiza depois do
ultimo script. Estas guardas protegem contra ordem errada que nao existe. Cada uma tem um
ramo `else` morto. **Cuidado:** alguns testes avaliam um arquivo isolado (sem os outros)
e podem depender do `else` — rodar a suite apos cada remocao.

| Local | Guarda |
|-------|--------|
| v10-hifi.jsx:79,123,258-261,316-319,500,502,740,936-940,972,1835,2050 | `window.v8Description ? ... : ''`, `window.v8*Html ?`, `window.spellName ?`, `window.useSpellVersions ?`, `window.getResolvedVersionKeys ?`, `window.hifiCasterStats ?` (~25 ocorrencias) |
| v10-hifi.jsx:955,1443,2525 | `typeof window.packSpellIndex === 'function'`, `window.PackMenuChip &&` |
| index.html:215,225,226,227,263,498,504,545 | `typeof loadCharacters/persistCharacters/loadBookmarks === 'function'`, `window.useDialogA11y?.`, `normLang ?`, `typeof window.accentOf` |
| spells-data-loader.jsx:240,591,678 | `window.tt ? window.tt(...) : 'texto pt fixo'` (3 textos de fallback) |
| spells-data-loader.jsx:908 / 847-853 | `keyOf = ... : null` e o ramo "concatenacao pura" de `unionSpells` (so teste: check-pack-composition tem 12 refs) |
| v11-character-editor.jsx:124,552,616,654,869 | `typeof window.makeT`, `window.v7BuildSpells ?`, `window.bilingual ?`, `window.tt ?` |
| pack-manager.jsx:268,280,445; pack-rename-dialog.jsx:41,48,221; pack-import-dialog.jsx:76,128,136; transition-banner.jsx:31,33,53,54,74 | `window.loadCharacters ?`, `window.peek* ?`, `window.useDialogA11y?.`, `typeof window.refreshPluginVersions`, `window.packImport && ...` |
| v11:482,503; i18n.jsx:606; plugin-store.jsx:173; spells-data-loader.jsx:1000 | `typeof window/document !== 'undefined'` em script que so roda em navegador |

Estimativa: pouca reducao de linhas (~25), grande ganho de leitura.

### 2.4 Superficie `window.*` exportada e nao usada por outro arquivo (LOW)

Em script classico, `function` top-level ja vira global; `Object.assign(window, {...})`
so e necessario para `const`/`let` acessados como `window.X`. Exports sem **nenhum** leitor
fora do arquivo de origem (confirmado por `exp.cjs`):

`grimorio-helpers`: `SCHOOL_NAMES_PT`, `SCHOOL_NAMES_EN`, `V8_DESCRIPTIONS_PT`.
`i18n`: `STRINGS`, `i18nParityCheck` (so testes).
`spells-data-loader`: `adaptSpell`, `adaptSpells` (so testes).
`v11`: `ACCENT_SLOTS`, `THEME_PALETTES`, `paletteForTheme`, `normalizeAccentId`,
`HIFI_DEFAULT_CHARS`, `_normSlots`, `CASTER_CLASSES`, `_normClassLevels`,
`hifiSuggestedSlots`, `ABILITY_KEYS`, `CASTING_ABILITY`, `_normAbilities`,
`hifiAbilityMod`, `hifiProfBonus`, `hifiOrphanFromKey`.
`v10`: `hifiAccentsFor`. `pack-manager`: `PackMenu`. `transition-banner`: `TransitionBanner`.
`pack-import` (`window.packImport.*`): `MAX_PACK_BYTES`, `PACK_ERROR_CODES`, `parsePackText`,
`validatePack`, `freeIdentifier`, `sanitizePack`, `SLUG_PATTERN`.

Varios testes leem esses nomes (bookmarks-read-purity usa `_normSlots`, `_normClassLevels`,
`_normAbilities`, `HIFI_DEFAULT_CHARS`; orphan-spells usa `hifiOrphanFromKey`; pack-menu confere
`PackMenu`). **Nao remover sem decidir o contrato de teste.** Ganho: ~10 linhas.

---

## 3. Inventario — CSS (hifi-tokens.css e style inline)

### 3.1 Seletores/regras sem uso (HIGH)

| ID | Linhas | Regra | Evidencia | Linhas |
|----|--------|-------|-----------|--------|
| DC-40 | 276-281 | `.hifi-paper-noise::before` | classe em 0 arquivos JS/HTML | 7 |
| DC-41 | 291 | `.hifi-text` | idem | 1 |
| DC-42 | 783-789 | `.hifi-panel-action-bar` | idem | 7 |
| DC-43 | 814-817, 834, 1227 | `@keyframes hifi-slide-down`, `.hifi-slide-down`, entrada na lista reduced-motion | classe/keyframe sem uso em JS | 8 |
| DC-44 | 792-795 | `@keyframes hifi-slide-in` | 1 ocorrencia em todo repo (so a definicao); o que se usa e `hifi-slide-in-right` | 4 |
| DC-45 | 524 | `.hifi-btn-primary.active` | nenhum `btn-primary` recebe `active` | 1 |
| DC-46 | 1035-1038 | `.hifi-print-flow.is-two-col` | so e emitido para modo `list` (DC-14) | 4 |
| DC-47 | 1046-1050 | `#hifi-print-sheet[data-mode="list"] ...` | modo `list` morto | 5 |
| DC-48 | 1072-1087, 1106, 1130-1133, 1152-1155, 1166-1169, 1189 | todas as regras `[data-mode="single"]` | modo `single` morto (DC-14). Ficam so as de `pack` | ~34 |

### 3.2 Declaracoes sobrescritas por regra posterior (MEDIUM — duplicacao, nao codigo morto puro)

Mesmo seletor, mesma especificidade; a regra mais tarde vence, a antiga nunca aplica.

| Linhas mortas | Sobrescrita em | Detalhe |
|---------------|----------------|---------|
| 335-336 (`.compact .hifi-card-desc {overflow:visible}`, `::after{display:none}`) | 1251-1252 | `overflow:hidden` + `display:block` vencem |
| 636-638 (`.hifi-input::placeholder{color:overlay2}`) | 1254 | vence `--subtext0` |
| 472 (`.hifi-card-meta-sep` cor) | 1256 | idem |
| 1283 (`border` e `background` de `.hifi-tabbar-search`) | 1346 | `border:0; background:crust` |
| 1299 (`width/height:36px` de `-search-close`) | 1347 | 32px vence |
| 1238 (`.hifi-pill` `font-size/family` repete 487) | — | duplicado |

### 3.3 Verificado como VIVO (nao remover)

`.hifi-card-open`, `.hifi-rich`, `.od-boot*`/`.od-fallback`/`#root`/`body.hifi` (inline do index.html),
`.hifi-onboarding-*` (index.html), `.hifi-spark*`, `.hifi-slot-sq*`, `.hifi-cast-pulse`,
`.hifi-link-action`, `.hifi-segmented*`, `.hifi-tab*`, `.hifi-more-*`, todos `.hifi-print-*`
de modo `pack`, `.hifi-theme-daylight .hifi-card` (textura), `.pd-*` de pack-docs.html (todas usadas).
`@keyframes hifi-toast-in` (usado inline em v10:72). Fontes Texturina/JetBrains/Marauder Text
(todas declaradas e usadas). `Marauder Display` so aparece como fallback depois de Texturina
(LOW: pode ser nunca baixado, mas e fallback de glifo).

---

## 4. Inventario — i18n.jsx

### 4.1 Chaves sem nenhum uso (HIGH) — apagar em PT e EN

| Chave | Linhas PT/EN | Evidencia |
|-------|--------------|-----------|
| `filter.searchFilterShort` | 73 / 333 | 0 refs (nem literal nem dinamico) |
| `filter.searchFilterAria` | 75 / 335 | idem |
| `section.tools` | 89 / 349 | idem |
| `section.actions` | 90 / 350 | idem |

### 4.2 Chaves usadas **so por teste** (HIGH no app; editar teste junto)

`manager.originBuiltin` (234/493), `manager.originInstalled` (235/494), `manager.spellCount`
(245/504), `manager.spellCountUnknown` (246/505), `manager.versionLabel` (248/507).
Nenhum JSX le essas chaves. **check-pack-menu.tests.ps1:117-118** exige presenca. O cartao
usa `menu.cardMeta` no lugar.

### 4.3 Chaves que morrem junto com DC-01..DC-03 (HIGH, transitivo)

`print.preparing` (56/316): so linhas 139 e 144 (dentro de `hifiPrint`/`hifiPrintList`).
`toast.shared` (64/324): so linha 126 (dentro de `hifiShare`).

### 4.4 Outros

- `i18nParityCheck()` (594-604) e `window.i18nParityCheck`: 0 usos no app; 2 testes usam
  (i18n-pack-menu, transition-banner). MEDIUM: mover para o teste ou manter como utilitario.
- `import.successCount` sem forma `.one/.other`: bug do todo, nao codigo morto.
- Verificado vivo (uso dinamico): `stats.*Title/Formula/Text`, `ability.*`, `*.one/.other`
  (`noun.*`, `import.renamed.*`, `manager.impact*`, `rename.impactWarning.*`), `packErr.*`.
- `title.designStudy` (rodape desktop "Spellbook — design study") **e visivel**: nao e codigo
  morto, mas e texto de prototipo. DECISAO (secao 5).

---

## 5. Inventario — comentarios e documentacao desatualizados

### 5.1 Comentarios que descrevem codigo que nao existe mais (HIGH)

| Local | Texto desatualizado |
|-------|---------------------|
| i18n.jsx:3-13 | "GERADO/MANTIDO junto da migracao do v10"; "o idioma do chrome segue a VERSAO de magias ativa — sem toggle separado. Ver index.html (estado `lang`)". **Falso desde a Fase 04.1** |
| spells-data-loader.jsx:1-5 | "carrega os 4 JSONs", "Substitui os mocks (WF_SPELLS) por dados do simpleskans / wikidot", "Uso: antes dos componentes que usam v7BuildSpells()" |
| spells-data-loader.jsx:49-54 | cita "tres leitores em index.html (defaultVersionKeyForLang, langOfVersionKey, derivacao de versao inicial)" — **nenhum existe** (grep = so o comentario) |
| spells-data-loader.jsx:105, 766 | `_initialVersionKey()` — nome antigo; hoje `_initialSelection()` |
| spells-data-loader.jsx:599-601 | "usado pelo rename de pack de um plano futuro" — ja existe (pack-rename-dialog:70) |
| pack-import-dialog.jsx:18-20 | "Os cinco valores" — sao sete |
| pack-import-dialog.jsx:122-123 | menciona `setCurrentVersion()` — nao existe mais |
| pack-import.jsx:510 | "observadas nos quatro spells-5E-*.json atuais" |
| plugin-store.jsx:5 | "na mesma forma dos arquivos spells-5E-*.json" |
| pack-manager.jsx:17-19 | diz que v10 "vai consumir `window.__openPackManager`" — quem consome e `PackMenuChip`/banner |
| pack-manager.jsx:90-92, 133-148 | "legadas PHB/PT-BR saem na Fase 6", "os quatro builtins PHB" |
| grimorio-helpers.jsx:1-11, 101 | historia do prototipo (wf-data.jsx, v7-ac-prototype.jsx, v8-spell-detail.jsx: nenhum existe) |
| v11-character-editor.jsx:3, 299, 424 | "artboard", "design canvas" |
| v10-hifi.jsx:1-7 | "Paleta Catppuccin (Latte/Mocha Mocha dark)" — tema real e daylight; "Sem icones" falso |
| v10-hifi.jsx:2772 | "Wrappers for the canvas: ... IOSDevice" (morto, DC-04) |
| v10-hifi.jsx:459-465, 189-192 | `hifiSiblingVersion` "usado por HifiLangToggle" (nao usa mais); "sem call site hoje" |
| v10-hifi.jsx:11-13 | refere "index.html:511" (linha mudou) |
| v10-hifi.jsx:2224-2226, 2260-2263 | "Protótipo: drawer unico virou tab bar"; "Swipe pra abrir/fechar o drawer" |
| index.html:109-129 | bloco longo de ordem de carga com historico de fases |

### 5.2 Referencias a planos arquivados no codigo (MEDIUM)

`.planning/phases/03-.../03-UI-SPEC.md` e `.planning/phases/05-.../05-01-PLAN.md`
(i18n.jsx:190,221,449,480) — esses caminhos **nao existem mais** (movidos para
`.planning/milestones/v2.0-phases/`). Outras: `06-03-PLAN.md` (v11:508), `06-UAT` (v11:388),
`RESEARCH Pitfall 4` (pack-import:292,596).

Ruido de IDs de plano em comentarios (D-xx, WR-xx, CR-xx, E-xx, T-xx, A-xx), por arquivo:
pack-manager 42, spells-data-loader 35, pack-import 27, v10-hifi 17, i18n 10,
transition-banner 7, pack-import-dialog 4, pack-rename-dialog 4, index.html 3, v11 3.
Sugestao: manter o **porque** (invariante) e tirar o ID; o ID so tem sentido com `.planning/` aberto.

### 5.3 Documentacao visivel desatualizada (DECISAO — muda o texto da pagina)

pack-docs.html:420 diz que homebrew em colisao "recebe, no import, um prompt para renomear".
O import **renomeia sozinho** e so mostra aviso (E-01, pack-import.jsx:613-639). O prompt so
existe ao **marcar** um pacote ja instalado. Texto errado em PT (linha 420) e EN (425).

---

## 6. Compat/migracao que parece morta mas **deve ficar** (MUST-KEEP)

| Item | Local | Por que manter |
|------|-------|----------------|
| `LEGACY_VERSION_FALLBACK` (4 chaves `spells-5E-*`) + ramo `prefs.versionKey` | spells-data-loader.jsx:96-101, 526-541, 554 | Usuario v1.x tem `versionKey` antigo salvo. Sem isso perde a edicao certa (e as preparadas somem). Testes: migration-version-fallback, selection-migration |
| `window.__legacyVersionFallback` | loader:107, 535 ← transition-banner:30 | Sinal "usuario existente" do banner |
| `TransitionBanner` inteiro + chaves `migration.*` (9) | transition-banner.jsx; i18n 119-128 | Feature v2.0 entregue; mudaria UX. Remover so com decisao do dono (pode virar sunset) |
| `peekCharacters()`, `peekBookmarks()` | v11:271, 366 | Leitores puros usados por banner, pack-manager, rename-dialog; gates bookmarks-read-purity |
| `loadBookmarks()` migracao por personagem → lista global | v11:376-398 | Usuario antigo com favoritas dentro de `hifi_chars_v1[].bookmarked` |
| `_normChar` campo `bookmarked` por personagem + `accentId \|\| 'mauve'` | v11:251-263 | Dado antigo no localStorage; migracao le `c.bookmarked` |
| `LEGACY_ACCENT_MAP` (mauve, peach, sky, maroon, lavender, rosewater) | v11:76-80 | `accentId` salvo com nomes Catppuccin |
| Chaves de localStorage: `hifi_chars_v1`, `hifi_bookmarks_v1`, `spellbook-ui-prefs`, `spellbook-onboarding-v1`, `hifi_session_v1`, `hifi_session_view_v1` | v10:1764-1765, v11:114,358, index.html:145-146, loader | Dados do usuario. Nao renomear |
| `spellbook-ui-prefs.theme` (gravado) | index.html:453 → pack-docs.html:453 | pack-docs aplica `hifi-theme-<theme>`. Se DC-32 for feito, trocar pack-docs para classe fixa **no mesmo passo** |
| `decodeSharedBuildPayload` troca ` ` por `+` | index.html:177-185 | Links `?build=` antigos sem `encodeURIComponent` |
| `?v=` aceito em lista e valor unico | loader:517-521 | Links compartilhados antigos |
| `SOURCE_CODE` (PHB, "Livro do Jogador", XGE, TCE, FTD) | loader:294-300 | O pacote embutido `srd-2024-adicionais` usa "Livro do Jogador". XGE/TCE/FTD cobrem o usuario que **reimporta o proprio arquivo** dos JSONs removidos |
| `SCHOOL_INDEX`/`CLASS_PT`/`CLASS_EN` com chaves PT e abreviacoes | loader:257-288 | Packs BYOD em PT e dados de usuario; `Object.create(null)` e defesa CR-03 |
| `validatePack` tolera chave de topo `id` | pack-import.jsx:247-255 | Round trip de pack exportado (so se `exportPack` ficar; ver DC-15) |
| Cadeia de fallback `_fetchVersionJson` (`../`) | loader:622 | LOW; cobre `file://` e subpasta. Nao tocar sem teste de navegador |
| `DB_NAME='grimorio-plugins'`, `DB_VERSION=1`, store `packs` | plugin-store.jsx:15-17 | Dados instalados dos usuarios |
| `CACHE_VERSION = 'grimorio-v8'` e logica `activate()` | sw.js:26, 73-79 | **Subir para v9 ao mover/renomear/remover qualquer arquivo do PRECACHE** (comentario sw.js:11-14: remocao exige bump) |
| `PRECACHE` lista cada `.jsx`, `pack-docs.html`, `pack.schema.json`, `srd-reserved-slugs.json`, 4 fontes | sw.js:31-61 | Renomear JSX = editar aqui + ordem em index.html:130-141 |
| XHR sincrono para `packs/index.js` | loader:39-46 | MEDIUM: rede de seguranca de deploy (index.html velho em cache). Pode sair apos 1 ciclo de release; manter por ora |
| `statBlock`, `castTimeNote`, `componentsNote`, `classNote`, `url` no schema | pack.schema.json, pack-import SPELL_FIELDS | Contrato publico de packs BYOD (aceitos, sanitizados, mas nao exibidos). Nao e codigo morto do app |
| `i18n.makeT` e `tt` (2 APIs) | i18n.jsx:552, 575 | Ambas usadas (v10 usa `window.makeT(lang)(...)` e `tt`) — duplicacao, nao morto |
| `hifiOrphanFromKey` e `useResolvableKeys` | v11:516, 542 | Secao de orfas no editor (MIGR-01) |

---

## 7. Itens que precisam de DECISAO do dono (podem mudar o visivel)

1. **Rodape "Spellbook — design study"** (v10:1596, `title.designStudy`): texto de prototipo visivel. Remover muda a UI.
2. **Banner de transicao** (secao 6): manter ou programar sunset.
3. **Base Catppuccin** (DC-34): remover exige pack-docs.html com classe de tema fixa. Muda a pagina de docs para quem nunca abriu o app (hoje cai na paleta Catppuccin; arguivel como bug).
4. **`exportPack`** (DC-15): STOR-03 consta "Validated" mas nao tem botao. Apagar codigo ou criar o botao?
5. **Texto de pack-docs.html:420/425** (secao 5.3).
6. **XHR de `packs/index.js`** (secao 6): sair agora ou depois.
7. **Exports `window.*` so de teste** (2.4): manter como contrato de teste ou reescrever testes.

---

## 8. Agrupamento sugerido (para requisitos/fases)

Ordem recomendada: menor risco primeiro; cada grupo termina com `pwsh scripts/run-tests.ps1` verde.

| Grupo | IDs | Linhas | Risco | Testes a editar |
|-------|-----|--------|-------|-----------------|
| A. i18n morto | 4.1, 4.2, 4.3 | ~25 | baixo | check-pack-menu (117-118) |
| B. CSS sem uso e keyframes | DC-40..46 | ~28 | baixo | nenhum |
| C. JS sem chamador | DC-01..03, 04..10, 16..19, 21, 22, 25, 26 | ~120 | baixo | content-lang-ownership, pack-menu |
| D. Impressao: modos single/list | DC-13, 14, 47, 48 | ~70 | medio | content-lang-ownership |
| E. Plumbing de tema | DC-30..33, 35 (+34 se aprovado) | ~190 | medio (toca 8 componentes + CSS + pack-docs) | nenhum |
| F. `adaptSpell` e hook do loader | DC-11, 20, 21 (build-packs-index + regenerar index.js), 22 | ~25 | medio | pack-composition, loader-hardening, source-dispatch |
| G. Ramos inalcancaveis | DC-12, 23, 24 | ~20 | medio | check-edition-compare, ui-lang-toggle, pack-composition |
| H. Overrides CSS (3.2) | 3.2 | ~10 | medio (visual) | QA headless |
| I. plugin-store: exportar | DC-15 | ~52 | depende da DECISAO 4 | 3 testes |
| J. Guardas de ordem de carga | 2.3 | ~25 | medio | pode quebrar testes isolados |
| K. Comentarios | 5.1, 5.2 | ~90 | baixo | nenhum |

Dependencia: DC-01..03 → apagar `print.preparing`/`toast.shared` (A depende de C).
DC-14 e 48 andam juntos (JS+CSS). DC-32 e DC-33 andam juntos. DC-21 exige regenerar `packs/index.js`
com `node scripts/build-packs-index.mjs` e **bump do CACHE_VERSION** se o conteudo de arquivo do precache mudar.

---

## 9. Estimativa de linhas removiveis

| Categoria | Linhas |
|-----------|--------|
| JS/JSX funcoes/exports/props mortos (2.1, sem DC-15) | ~210 |
| `plugin-store` exportar/persistencia (DC-15) | ~52 |
| Plumbing de tema JS (DC-30..32) | ~80 |
| CSS temas + base (DC-33, 34, 35) | ~140 |
| CSS regras sem uso + modos de impressao (3.1) | ~70 |
| CSS declaracoes sobrescritas (3.2) | ~10 |
| i18n (4.1-4.3) | ~25 |
| Guardas/export surface (2.3, 2.4) | ~35 |
| Comentarios desatualizados (5.1, 5.2) | ~90 |
| **Total** | **~710** (sem DC-34 e DC-15: ~630) |

(~6% do app. Estimativa por contagem de linhas dos blocos; o numero final depende da forma dos diffs.)

---

## 10. Fora do app (observado de passagem; outro pesquisador cobre limpeza do repo)

- `capture-scroll.js` (raiz): ignorado no `.gitignore`, nao rastreado, usa `require('playwright')`
  (nao esta em `package.json`) e abre `v10-hifi.jsx` como pagina. Morto.
- `package.json`: 4 dependencias `openspec*` sem uso no app ou nos testes.
- `marauder/webfonts/Marauder-Display-BoldItalic.woff2`: nenhum `@font-face` o referencia.
- `scripts/build-legacy-fixtures.mjs`, `scripts/sync-vscode-peacock-catppuccin.*`: ferramentas
  fora do app (ultima gera fixtures locais dos JSONs removidos; a segunda mexe em tema do VS Code).
- `.claude/skills/*`, `skills-lock.json`, `openspec/`, `.superpowers/`: ja listados no escopo de limpeza.

---

## 11. Notas de metodo e limites

- Todos os testes de `scripts/*.tests.ps1` foram consultados por nome de simbolo. Onde "Teste" esta
  vazio, nenhum script cita o simbolo.
- `grep` com `$` falha em CRLF; os scripts de analise usam `split(/\r?\n/)`.
- Nao ha execucao em navegador nesta auditoria. Itens "LOW/MEDIUM" que dependem de runtime:
  guardas de ordem de carga (2.3), overrides CSS (3.2), base Catppuccin (DC-34), XHR de `packs/index.js`.
- Scripts de apoio (nao versionados): `…/scratchpad/an.cjs`, `exp.cjs`, `css.cjs`, `fields.cjs`.
