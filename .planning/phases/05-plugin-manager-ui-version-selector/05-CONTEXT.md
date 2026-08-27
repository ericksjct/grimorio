# Phase 5: Plugin Manager UI & Version Selector - Context

**Gathered:** 2026-08-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Uma superfície única de gerenciamento onde o usuário vê os pacotes que instalou (nome, versão,
número de magias, origem), remove um pacote sem quebrar nada, entende quando duas fontes trazem a
mesma magia, encontra o caminho para importar quando não tem nenhum pacote, e lê a atribuição
CC-BY verbatim do conteúdo SRD embutido.

**O que esta fase NÃO é:** não é o pipeline de import (Fase 3, pronto), não é a fiação do loader
(Fase 4, pronta), não é a remoção dos JSONs protegidos nem a migração de usuários existentes
(Fase 6). Não introduz formato de pack novo, rota nova, nem biblioteca nova.

**Estado herdado que reduz o escopo real:**

- **MGMT-03 está majoritariamente entregue pela Fase 4.** `refreshPluginVersions()`
  (`spells-data-loader.jsx:104-190`) já sincroniza `SPELL_VERSIONS` com o IndexedDB por mutação in
  place, invalida cache de packs removidos, dispara `hifi-plugins-changed`, e faz fallback com
  toast quando a versão ativa some. O `VersionSelector` (`spells-data-loader.jsx:573`) e as pills
  do drawer mobile (`v10-hifi.jsx:2549-2572`) já renderizam `versions` dinamicamente. O trabalho
  restante de MGMT-03 é de superfície, não de motor.
- `plugin-store.jsx:112,118` já expõe `listPacks()` e `deletePack()`.
- `meta.attribution` e `meta.modifications` já são campos validados e sanitizados no import
  (`pack-import.jsx:63,327`) — o texto CC-BY já chega ao storage; falta lugar para exibi-lo.
- Dívida explicitamente endereçada a esta fase: `pack-import-dialog.jsx:280-289` carrega um botão
  flutuante provisório com o comentário *"a Fase 5 decide onde o import vive na UI final. Apagar
  esta tag na Fase 5."*

</domain>

<decisions>
## Implementation Decisions

Todas as decisões abaixo foram tomadas por Claude a pedido do usuário ("decide tudo pra mim").
São recomendações fundamentadas no código existente, não preferências declaradas — o planner deve
tratá-las como decididas, e o usuário pode revisar este arquivo antes de planejar.

### Onde o gerenciador vive

- **D-01:** O gerenciador é **um único componente montado como modal** (`PackManager`), reusando o
  chrome de diálogo já existente em `pack-import-dialog.jsx`, não uma tela/rota nova. O app é uma
  SPA sem router; introduzir navegação para esta feature seria a maior mudança estrutural da fase
  para o menor ganho.
- **D-02:** Dois gatilhos, uma superfície:
  - **Desktop:** último item do dropdown do `VersionSelector` — separador seguido de
    "Gerenciar pacotes…". O seletor já é o lugar onde o usuário pensa sobre "de onde vêm minhas
    magias"; o gerenciamento é a continuação natural dessa lista.
  - **Mobile:** uma linha "Gerenciar pacotes" na seção **VERSÃO** do drawer
    (`v10-hifi.jsx:2548-2572`), logo abaixo das pills, seguindo o padrão `HifiSectionLabel` +
    conteúdo já usado nas outras seções.
- **D-03:** O botão flutuante provisório de `pack-import-dialog.jsx:280-289` é **removido nesta
  fase** (junto do comentário `ponytail:` que o marca). O import passa a ser alcançado de dentro do
  gerenciador ("Importar pacote", ação primária) e do empty state — nunca mais por um elemento
  fixo sobre o layout.
- **D-04:** Import e gerenciamento são **dois diálogos irmãos**, não abas de um só. O
  `PackImportDialog` já existe, já tem alternador de modo próprio e já é testado; transformá-lo em
  aba de um contêiner novo mexe em código que funciona. O gerenciador abre o import; o import ao
  concluir volta para o gerenciador.

### Fluxo de remoção

- **D-05:** Confirmação **inline no próprio item da lista** — o botão "Remover" vira
  "Remover? Sim / Não" na mesma linha. Sem segundo diálogo empilhado sobre o modal (dois níveis de
  overlay são um problema real de foco/ESC no mobile, e `useDialogA11y` já gerencia um nível).
- **D-06:** Antes de confirmar, o item mostra o **impacto concreto**: quantas magias preparadas e
  favoritadas, em quantos personagens, deixam de resolver com a remoção. Contagem derivada no
  momento do render, não persistida.
- **D-07:** Remover um pacote **nunca purga** as chaves de preparadas/favoritas dos personagens.
  Elas permanecem intactas em `localStorage` e simplesmente deixam de resolver contra o registro
  ativo. É isso que faz o critério "voltam se o pacote for reinstalado" (MGMT-02) funcionar sem
  nenhuma máquina de undo. **Proibição:** nenhum código desta fase pode escrever nas listas
  `prepared`/`bookmarked` de personagem.
- **D-08:** Sem undo. Feedback é o toast já existente (`hifi-toast`), no padrão dos outros toasts
  do app. O caminho de volta é reinstalar o pacote, que o próprio gerenciador oferece.

### Nota de duplicatas

- **D-09:** A nota vive no **detalhe da magia**, como linha discreta abaixo de "Fonte":
  "Também em: SRD 5.2, MeuPack". É onde o usuário está olhando uma magia específica e onde a
  ambiguidade importa. **Não** vai badge no card do grid nem na lista mobile — a grade tem
  centenas de itens e um marcador por duplicata vira ruído visual constante.
- **D-10:** O item do pacote no gerenciador mostra a **contagem agregada**
  ("12 magias também presentes em outros pacotes"), sem enumerar.
- **D-11:** Duplicata é **informativa e nada mais**: nunca bloqueia install, nunca faz merge, nunca
  reordena. O pacote ativo continua sendo a única fonte do conteúdo exibido.

### Atribuição CC-BY

- **D-12:** A atribuição é **por pacote, dentro do item do gerenciador**, em bloco recolhível
  ("Licença e atribuição"). Exibe `meta.attribution` verbatim e, quando presente,
  `meta.modifications`. Sem página "Sobre" nova.
- **D-13:** O conteúdo SRD embutido aparece na mesma lista, como item de origem `builtin`, com o
  texto CC-BY verbatim da edição realmente empacotada (5.1 ou 5.2) — inclusive as notas de
  modificação do texto-fonte. O usuário não deve precisar distinguir "pacote instalado" de
  "conteúdo que já vinha" para achar a licença.
- **D-14:** O texto de atribuição é renderizado **verbatim como texto**, não como markdown. É
  requisito legal de fidelidade e evita reintroduzir a superfície de sanitização de HTML.

### Empty state

- **D-15:** "Zero pacotes" significa **zero pacotes instalados pelo usuário** (nenhum registro
  `source: 'idb'`), não "zero versões". As duas entradas SRD `BUILTIN_VERSIONS`
  (`spells-data-loader.jsx:32-33`) sobrevivem à Fase 6, então o registro de versões nunca fica
  vazio e o app nunca fica sem magias.
- **D-16:** Nessa condição, o gerenciador abre já no estado vazio: explica em duas frases o que é
  um pacote, e oferece "Importar pacote" como ação primária, com link para `pack-docs.html`
  (documentação de formato já escrita) como ação secundária.
- **D-17:** O empty state **não** invade a grade de magias. Com o SRD embutido presente, a grade
  tem conteúdo — anunciar vazio ali seria falso. O convite a instalar vive no gerenciador e no
  seletor de versão.

### Seletor de versão (MGMT-03, resto)

- **D-18:** O trabalho restante é: acrescentar o item "Gerenciar pacotes…" ao fim do dropdown
  (desktop) e à seção VERSÃO (mobile), e revisar os rótulos derivados de `_packToVersion`
  (`spells-data-loader.jsx:64-78`) para que um pack de terceiro se leia bem ao lado das entradas
  builtin. Nenhuma reescrita do motor de enumeração.
- **D-19 (risco a cobrir no plano):** `VersionSelector` faz
  `versions.find(v => v.key === current) || versions[0]` e desreferencia `currentVer.lang` em
  seguida (`spells-data-loader.jsx:574,578`). Com `versions` vazio isso lança. Hoje é inalcançável
  porque há builtins, mas o gerenciador vai renderizar listas que podem ser vazias (lista de packs
  instalados) — o plano deve garantir que nenhuma superfície nova repita esse padrão sem guarda.

### Claude's Discretion

O usuário delegou integralmente. Ficam à discrição do planner/executor, dentro das decisões acima:
copy exato de todos os textos de UI (via `i18n.jsx`, com paridade PT/EN obrigatória —
`i18nParityCheck`), ordenação da lista de pacotes, ícones, e o detalhamento visual dos itens.

### Folded Todos

- **Mobile: botão "Instalar pacote de magias" cobre o conteúdo do drawer**
  (`.planning/todos/pending/mobile-botao-instalar-cobre-drawer.md`) — em 390×844 o botão flutuante
  sobrepõe a seção VERSÃO do drawer nos dois temas. **D-03 resolve na raiz:** o botão flutuante
  deixa de existir. O plano deve fechar este todo explicitamente e confirmar o layout do drawer
  nessa viewport após a remoção.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Escopo e requisitos
- `.planning/ROADMAP.md` §"Phase 5: Plugin Manager UI & Version Selector" — goal, os 6 critérios de
  sucesso, e a nota de rota ("DISCUSS antes de planejar", "UI hint: yes", "Research: NÃO").
- `.planning/REQUIREMENTS.md` — MGMT-01..05 e SRD-02, todos mapeados a esta fase.

### Contrato de pacote e import
- `pack-docs.html` — documentação de formato de pack voltada ao usuário; é o destino do link
  secundário do empty state (D-16).
- `pack-import.jsx` §schema de meta (linha 63) e `META_LICENSE_TEXT_FIELDS` (linha 327) — define
  que `attribution` é obrigatório e como os campos de licença são tratados na sanitização.

### Fiação de idioma (não regredir)
- `.planning/phases/04.1-desacoplar-o-idioma-da-interface-do-idioma-do-pacote/04.1-CONTEXT.md` —
  D-01/D-02: chrome derivado pelo app segue `uiLang`; conteúdo vindo do pack segue `versionLang`.
  Todo texto novo do gerenciador é chrome e segue `uiLang`. Exceção: nomes de magia em listas de
  duplicata seguem `versionLang`, como já fazem em todo o resto do app.
- `i18n.jsx` — dicionário central; toda string nova entra nos dois blocos (`ptbr`/`en`) ou a
  checagem de paridade quebra.

### Convenções do codebase
- `.planning/codebase/CONVENTIONS.md` — padrões de componente, estilo inline e nomenclatura.
- `.planning/codebase/ARCHITECTURE.md` — arquitetura no-build (React + Babel via CDN, globais em
  `window`, sem bundler); qualquer proposta de dependência nova é incompatível com ela.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `plugin-store.jsx:112,118` — `listPacks()` e `deletePack()`: o CRUD de que MGMT-01/MGMT-02
  precisam já existe e é testado (Fase 2).
- `pack-import-dialog.jsx:44` — `PackImportDialog`: chrome de modal, tratamento de foco e padrão
  de abertura/fechamento a serem espelhados pelo `PackManager` (D-01).
- `v10-hifi.jsx:389` — `HifiSectionLabel`, e `HifiPill` — usados na seção VERSÃO do drawer; a
  entrada mobile do gerenciador (D-02) segue o mesmo vocabulário visual.
- `window.useDialogA11y` (`v10-hifi.jsx:2260`) — foco e ESC de diálogo, já em uso pelo drawer.
- Evento `hifi-toast` — canal de feedback padrão do app, usado por D-08.

### Established Patterns
- Registro vivo por mutação in place: `SPELL_VERSIONS` **nunca** é reatribuído, só `push`/`splice`
  (`spells-data-loader.jsx:40-46`). O gerenciador lê o registro; não o reconstrói.
- Escritas no pluginStore vêm de um único ponto. `refreshPluginVersions()` é estritamente de
  leitura (proibição P-02 da Fase 4). A remoção de pacote é a **primeira** escrita disparada pela
  UI de fora do import — o plano deve dizer explicitamente quem chama `deletePack()` e que
  `refreshPluginVersions()` roda logo depois (a fila `_refreshChain` já serializa).
- Nenhuma troca silenciosa de versão (proibição P-01 da Fase 4): se remover o pacote ativo derruba
  a versão em uso, o fallback com toast já implementado em `spells-data-loader.jsx` é o
  comportamento correto e deve ser exercitado, não contornado.

### Integration Points
- `spells-data-loader.jsx:573` `VersionSelector` — ganha o item "Gerenciar pacotes…" (D-02).
- `v10-hifi.jsx:2548-2572` seção VERSÃO do drawer — ganha a entrada mobile (D-02).
- `pack-import-dialog.jsx:280-289` — gatilho flutuante removido (D-03).
- `index.html:128-130` — ordem de carga dos scripts; um arquivo novo de gerenciador entra depois de
  `pack-import-dialog.jsx`.
- Evento `hifi-plugins-changed` — o gerenciador se re-renderiza a partir dele em vez de manter
  cópia própria da lista de packs.

</code_context>

<specifics>
## Specific Ideas

- O SRD embutido deve aparecer na lista como um item de primeira classe (origem "embutido"), não
  como caso especial escondido. É o que torna a atribuição CC-BY encontrável sem tela nova (D-13).
- O gerenciador é a resposta à pergunta "de onde vêm as minhas magias?" — por isso mora ao lado do
  seletor de versão nas duas plataformas, e não num menu de configurações genérico.

</specifics>

<deferred>
## Deferred Ideas

- **Edição/renomeação de pacote instalado** — não está em MGMT-01..05; seria capacidade nova.
- **Atualizar pacote no lugar (reimportar por cima)** — o fluxo atual é remover + importar. Uma
  atualização versionada é sua própria fase.
- **Página "Sobre" do app** — D-12/D-13 tornam desnecessária para SRD-02.

### Reviewed Todos (not folded)

- **SRD pack: nomes slug e markdown cru**
  (`.planning/todos/pending/srd-pack-nomes-slug-e-markdown-cru.md`) — casou por palavra-chave
  (score 0.6) mas é bug do adaptador de conteúdo (`spells-data-loader.jsx`, `adaptSpell`), não de
  gerenciamento de pacotes. Corrigi-lo dentro desta fase misturaria dois domínios. Candidato a
  `/gsd-quick` ou à Fase 6, que já mexe no conteúdo SRD.
- **Bandeiras do toggle não renderizam no Windows** e **warnings do review 04.1** — score 0.2,
  sem relação com o domínio desta fase. Permanecem pendentes.

</deferred>

---

*Phase: 5-plugin-manager-ui-version-selector*
*Context gathered: 2026-08-27*
