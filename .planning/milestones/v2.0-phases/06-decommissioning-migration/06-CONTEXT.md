# Phase 6: Decommissioning & Migration - Context

**Gathered:** 2026-09-01
**Status:** Ready for planning
**Discussion mode:** delegado — o usuário pediu "decide tudo pra mim". Todas as
decisões abaixo foram tomadas pelo Claude com base no ROADMAP, no código real e
nas medições registradas em `<code_context>`. Nenhuma foi escolhida pelo usuário.

<domain>
## Phase Boundary

Remover os 4 JSONs de magias protegidos por copyright do site publicado, do
registro de versões e do precache do service worker, e garantir que os dados já
salvos de usuários existentes (personagens, preparadas, favoritas) atravessem a
mudança sem perda silenciosa.

**Dentro do escopo:** remoção dos arquivos e das entradas de versão; bump de
cache do service worker; fallback da versão ativa salva; sinalização das magias
que deixam de resolver; orientação de primeira visita pós-migração.

**Fora do escopo:** qualquer capacidade nova de import/gerenciamento (fases 3 e
5 já entregaram); tradução de conteúdo; purga do histórico do git; pack PT-BR
embarcado de qualquer origem.

</domain>

<decisions>
## Implementation Decisions

### Perda do conteúdo PT-BR embarcado

Fato que força a decisão: os dois SRD embutidos (`srd-2014-en.json`,
`srd-2024-en.json`) são **só em inglês**. Removidos os 4 legados, não sobra
nenhuma magia em português no repositório.

- **D-01:** O idioma da **interface** não muda. A Fase 04.1 já desacoplou UI de
  pacote (I18N-01/02/03) — um usuário com UI em PT continua com UI em PT, só o
  conteúdo das magias passa a ser EN. Nada a implementar aqui além de não
  regredir: a fase não pode reintroduzir acoplamento idioma-versão.
- **D-02:** O app **não** embarca nem sugere nenhum pack PT-BR. Restaurar
  conteúdo em português é caminho BYOD — o usuário importa o próprio pacote. É
  literalmente a razão de existir do milestone; qualquer atalho aqui recria o
  problema de copyright que a v2.0 resolve.
- **D-03:** A comunicação dessa perda acontece **uma vez só**, no aviso de
  transição (D-05), e não em toast por sessão nem em rodapé permanente.

### Versão ativa salva que deixa de existir

- **D-04:** `spellbook-ui-prefs.versionKey` apontando para uma chave removida cai
  para o SRD **da mesma edição**, não para o default cego:
  `spells-5E-2024-PTBR` e `spells-5E-2024-EN` → `srd-2024-en`;
  `spells-5E-2014-PTBR` e `spells-5E-2014-EN` → `srd-2014-en`.
  Motivo: um usuário de 2014 caindo em 5.2 vê magias com estatísticas diferentes
  e lê isso como bug, não como migração. O mapeamento preserva a edição, que é a
  única dimensão que o SRD consegue honrar.
  O ponto de aplicação é o resolvedor de preferência já existente em
  `spells-data-loader.jsx` (~L389-395) e/ou a guarda "Versao ativa sumiu do
  registro" (~L179) — o planner escolhe qual, mas o comportamento é este.

### Aviso de transição (MIGR-03)

- **D-05:** **Banner dispensável no topo**, não modal bloqueante. O conteúdo SRD
  continua funcionando no primeiro segundo — bloquear a tela pune quem só quer
  consultar uma magia. O banner **não** some sozinho por timeout: fica até
  dispensa explícita.
- **D-06:** O banner aparece **só para usuário existente**. Sinal de "existente"
  = qualquer um destes presentes no boot: `spellbook-ui-prefs.versionKey` com uma
  das 4 chaves removidas, `hifi_chars_v1` não vazio, ou `hifi_bookmarks_v1` não
  vazio. Instalação nova nunca vê o banner.
- **D-07:** Dispensa persistida em `spellbook-ui-prefs` (chave nova, ex.
  `migrationNoticeDismissed`), não em chave de localStorage própria — o app já
  tem um blob de prefs e não precisa de mais um.
- **D-08:** Conteúdo do banner, nessa ordem: (1) o que mudou — os pacotes
  D&D 5E/5.5E saíram do app; (2) o que continua — SRD 5.1/5.2 embutido, e as
  suas preparadas/favoritas continuam salvas; (3) ação — botão que abre o
  gerenciador de pacotes (`window.__openPackManager`), mais link para
  `pack-docs.html`. Texto bilíngue via `i18n.jsx`, seguindo o padrão da Fase 04.1.

### Magias órfãs (MIGR-01)

Fato medido: a chave é `hifiSpellKey(s) = ${school}-${lvl}-${en}` e `en` é o
**slug** (`acid-splash`), idêntico entre os JSONs legados e os SRD. Das 391
magias de `spells-5E-2024-PTBR.json`, **322 resolvem** contra o SRD 5.2 e **69
ficam órfãs**.

- **D-09:** **Nenhuma escrita destrutiva.** A fase não reescreve, filtra nem
  "limpa" `hifi_chars_v1` ou `hifi_bookmarks_v1`. As chaves órfãs ficam exatamente
  como estão. Isto é uma proibição, não uma preferência: é o único jeito de a
  órfã voltar a resolver sozinha quando o usuário importar um pack que a contenha.
- **D-10:** Renderização da órfã não precisa de dado nenhum do pack — a própria
  chave carrega escola, nível e slug. Exibir o slug em Title Case
  (`acid-splash` → `Acid Splash`) mais nível e escola derivados da chave.
- **D-11:** As órfãs aparecem numa **seção ao final** das abas `prepared` e
  `bookmarked` do editor (`v11-character-editor.jsx`, `filteredSpells` ~L539-550),
  com cabeçalho contando quantas são e uma linha explicando que elas estão em
  pacotes não instalados. Não misturar com as resolvidas na mesma lista — o
  usuário precisa distinguir "tenho" de "tinha".
- **D-12:** Sem botão de "limpar todas". Remoção continua sendo o toggle
  individual que já existe. Uma órfã sai da seção sozinha quando um pack a
  resolve — esse é o desfecho esperado, não o descarte.
- **D-13:** A contagem de órfãs também alimenta o banner (D-08): quando > 0, o
  banner cita o número concreto. Um número é acionável; "algumas magias" não é.

### Remoção e deploy (MIGR-02)

- **D-14:** `CACHE_VERSION` **bumpa** de `grimorio-v1` para `grimorio-v2`.
  Obrigatório, não opcional: `activate()` só apaga caches cujo nome difere de
  `CACHE_VERSION`. Sem o bump, o PWA de todo usuário existente continua com os 4
  JSONs no Cache Storage e continua servindo-os — a remoção não seria efetiva
  justamente para quem já usava o app. O comentário `ponytail:` no topo de
  `sw.js` só vale para **acréscimo** a PRECACHE; esta é uma remoção e o comentário
  precisa ser atualizado para dizer isso.
- **D-15:** Um único commit/deploy atômico faz: `git rm` dos 4 JSONs, remoção das
  4 entradas de `BUILTIN_VERSIONS`, remoção das 4 linhas de PRECACHE e o bump de
  `CACHE_VERSION`. Sem deploy faseado — qualquer estado intermediário tem entrada
  de versão apontando para arquivo 404.
- **D-16:** **Não purgar o histórico do git.** O critério do ROADMAP é "gone from
  the deployed site and repo HEAD" — `git rm` atende ao pé da letra. Reescrever o
  histórico (`filter-repo` + force-push) troca todos os SHAs, invalida os
  referenciados nos SUMMARY/REVIEW das fases 1-5 e quebra qualquer clone. Se
  exigência legal pedir a purga, é decisão própria, fora desta fase.
- **D-17:** `BUILTIN_VERSIONS` fica com as 2 entradas SRD. A regra dura de
  `SPELL_VERSIONS` (mutação in place, nunca reatribuir) continua valendo — a
  remoção é na literal de `BUILTIN_VERSIONS`, antes do `.slice()`, não em runtime.

### Folded Todos

- **`srd-pack-nomes-slug-e-markdown-cru`** (`.planning/todos/pending/`) — **entra
  no escopo**. Confirmado no código: `adaptSpell()` (`spells-data-loader.jsx`
  L304-306) faz `enName = s.name`, que é o slug, e ignora `s.displayName`, que os
  packs SRD **têm** preenchido (`"name": "acid-splash", "displayName": "Acid
  Splash"`). Com UI em EN, `spellName(s,'en')` devolve o slug. `stripHtml()`
  (L258) remove tags HTML mas não converte `**negrito**` de markdown, que os SRD
  usam. Depois desta fase o SRD é o **único** conteúdo embutido: sem essa
  correção, o critério de sucesso 4 ("conteúdo restaurável e utilizável") é
  entregue com `acid-splash` e `**Weather Sensor.**` na tela de todo mundo.
  Escopo do fold: só o caminho SRD/adaptador. Não redesenhar o pipeline de import.
- **`review-05-warnings` — só a WR-01** — **entra no escopo**. A WR-01 diz que a
  garantia de leitura-pura do `pack-manager.jsx` depende de `window.loadBookmarks()`
  (que tem um ramo de migração que **escreve**) já ter rodado no boot. Esta fase
  mexe em boot e em migração; é exatamente onde essa garantia implícita cai sem
  nenhum teste falhar. Encaminhamento já registrado no todo: separar um
  `peekBookmarks()` de leitura pura, ou tornar a migração idempotente e explícita
  no boot. A WR-02 (corrida no botão de confirmação) **não** entra — nada nesta
  fase toca esse caminho.

### Claude's Discretion

O usuário delegou integralmente. Além das decisões acima, ficam à escolha do
planner/executor, desde que não contradigam D-01..D-17:

- Posição exata e estilo visual do banner (respeitando os tokens de
  `hifi-tokens.css` e o alvo 390×844 usado nos checkpoints anteriores).
- Onde exatamente aplicar o mapa de fallback de D-04 dentro de
  `spells-data-loader.jsx`.
- Como converter markdown para HTML no adaptador (o app já carrega DOMPurify no
  boot; a conversão deve ser mínima — negrito/itálico e pouco mais, não um parser
  de markdown completo).
- Nomes das chaves de i18n novas e a redação final dos textos.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requisitos e escopo da fase
- `.planning/ROADMAP.md` §"Phase 6: Decommissioning & Migration" (L218-232) — goal, 4 critérios de sucesso, rota de planejamento
- `.planning/REQUIREMENTS.md` §MIGR (L39-43) — texto normativo de MIGR-01/02/03
- `.planning/PROJECT.md` — decisões travadas do milestone v2.0 (BYOD, formato de pack, IndexedDB, sanitização)

### Todos incorporados ao escopo
- `.planning/todos/pending/srd-pack-nomes-slug-e-markdown-cru.md` — slug e markdown cru no adaptador; onde investigar
- `.planning/todos/pending/review-05-warnings.md` §WR-01 — garantia de leitura pura dependente de ordem de boot

### Contexto das fases anteriores
- `.planning/phases/05-plugin-manager-ui-version-selector/05-REVIEW.md` — as 5 Warning e 4 Info abertas; ler antes de tocar em `pack-manager.jsx`
- `.planning/phases/04.1-desacoplar-o-idioma-da-interface-do-idioma-do-pacote/` — decisões de i18n (D-05/D-18) que a fase não pode regredir
- `.planning/codebase/CONCERNS.md`, `.planning/codebase/ARCHITECTURE.md` — mapa vivo do codebase

### Contrato de pacote e documentação do usuário
- `pack.schema.json` — schema do pack; define `meta` e a forma de `spells[]`
- `pack-docs.html` — página que o banner de transição linka (D-08)

</canonical_refs>

<code_context>
## Existing Code Insights

### Fatos medidos durante o scout (não re-derivar)

- `hifiSpellKey(s) = \`${s.school}-${s.lvl}-${s.en}\`` (`v10-hifi.jsx:9`), e `s.en`
  vem de `adaptSpell()` como `s.name`, que é **slug** em todos os JSONs — legados
  e SRD. As chaves de preparadas/favoritas são portanto compatíveis entre pacotes.
- Overlap medido por `(school, level, name)`: **322 de 391** magias de
  `spells-5E-2024-PTBR.json` existem no `srd-2024-en.json` (339 magias). ~69 órfãs.
- Os JSONs SRD **já trazem** `displayName` legível (`"Acid Splash"`). O adaptador
  simplesmente não usa para o caminho EN.

### Reusable Assets
- `spells-data-loader.jsx` L169-185 — já existe a guarda "Versao ativa sumiu do
  registro: ... voltando para a padrao" e o mecanismo `_wantedVersionKey`. D-04 é
  um refinamento desse caminho, não um mecanismo novo.
- `spells-data-loader.jsx` L389-395 — resolvedor de `prefs.versionKey` com parse
  defensivo (IN-01). Ponto natural para o mapa de fallback por edição.
- `window.__openPackManager` (`pack-manager.jsx`, Fase 5) — o CTA do banner (D-08)
  chama isso; nada novo a construir.
- `i18n.jsx` / `window.bilingual(lang)` — mecanismo central de strings bilíngues.
- `pluginStore.listPacks()` (`plugin-store.jsx`) e `window.packSpellIndex()`
  (Fase 5) — enumeram o que está instalado; úteis para calcular órfãs.
- `stripHtml()` (`spells-data-loader.jsx:258`) — já é o ponto de limpeza de texto
  do adaptador, e já convive com o `check-upgrade-heading-strip`.

### Established Patterns
- **Mutação in place de `SPELL_VERSIONS`** — regra dura documentada em
  `spells-data-loader.jsx` L40-46. Vários leitores seguram a mesma referência.
- **Store em localStorage + CustomEvent** — `hifi-chars-changed`,
  `hifi-bookmarks-changed`, `hifi-spells-source-changed`, `hifi-plugins-changed`.
  Estado novo desta fase segue o mesmo padrão.
- **`spellbook-ui-prefs` é o blob único de preferências** — não criar chave de
  localStorage nova para a dispensa do banner (D-07).
- **Sem suíte de teste de framework** — o projeto usa scripts de gate estático e
  QA manual/headless. Continuar nessa linha.

### Integration Points
- `sw.js` L14 (`CACHE_VERSION`) e L19-45 (`PRECACHE`) — D-14, D-15.
- `spells-data-loader.jsx` L31-38 (`BUILTIN_VERSIONS`) — D-17.
- `spells-data-loader.jsx` L295-330 (`adaptSpell`) — fold do todo de slug/markdown.
- `v11-character-editor.jsx` L539-550 (`filteredSpells`) e L985 (estado vazio) —
  seção de órfãs (D-11).
- `v11-character-editor.jsx` L347-378 (`loadBookmarks` e o ramo de migração) —
  WR-01 (D, folded).
- `index.html` — montagem do banner de transição e leitura de `UI_PREFS_KEY` (L136).

</code_context>

<specifics>
## Specific Ideas

- A frase de valor do projeto ("encontrar, preparar e consultar magias, totalmente
  offline, sem configuração") é o teste de aceitação informal do banner: se depois
  de dispensá-lo o usuário não souber o que fazer, o texto falhou.
- O ROADMAP marca esta fase como **irreversível**. Em caso de dúvida entre duas
  opções, preferir a que preserva dado do usuário — D-09 é o exemplo canônico.

</specifics>

<deferred>
## Deferred Ideas

- **Purga do histórico do git** dos 4 JSONs (D-16). Se virar exigência, é decisão
  e fase próprias — reescreve todos os SHAs do repositório.
- **Pack PT-BR oficial ou curado** para restaurar conteúdo em português. Contraria
  a premissa BYOD do milestone; se um dia houver fonte licenciável, é milestone
  novo.
- **Migração de chave de magia para algo mais robusto que `school-lvl-slug`.** A
  chave atual funciona porque todos os packs usam o mesmo slug; um pack de
  terceiro com slug divergente gera órfã falsa. Vale um requisito futuro, não uma
  mudança dentro de uma fase irreversível.

### Reviewed Todos (not folded)
- `review-05-warnings` §WR-02 (corrida no botão de confirmação destrutiva) e as
  demais 3 Warning / 4 Info — nada nesta fase toca esses caminhos.
- `review-04-1-warnings` — warnings da Fase 04.1 em `index.html`, `v10-hifi.jsx`,
  `v11-character-editor.jsx`; sem relação com a remoção/migração.
- `i18n-toast-versao-e-pluralizacao` — a fase adiciona strings novas, mas corrigir
  a pluralização existente é limpeza de i18n, não migração. Fica pendente.
- `bandeiras-do-toggle-nao-renderizam-no-windows` — bug de renderização de emoji
  de bandeira no toggle de idioma; sem relação.

</deferred>

---

*Phase: 6-decommissioning-migration*
*Context gathered: 2026-09-01*
