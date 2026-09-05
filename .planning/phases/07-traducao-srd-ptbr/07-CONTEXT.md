# Phase 7: Tradução dos SRDs para pt-BR - Context

**Gathered:** 2026-09-05
**Status:** Ready for planning — **com um pré-requisito bloqueante** (ver D-02)

<domain>
## Phase Boundary

Devolver conteúdo de magia em português ao app, com procedência limpa, sem
reintroduzir nenhum byte dos 4 datasets que a Fase 6 removeu.

A discussão mudou a premissa da fase. O ROADMAP assumia que o app teria de
**produzir** a tradução das 658 descrições (~485 mil caracteres) e que "o método
de tradução e o critério de qualidade" seriam a decisão central. A verificação
feita nesta discussão encontrou uma tradução humana de terceiro já publicada sob
CC-BY-4.0 para a edição 5.2. A fase deixa de ser um projeto de tradução e passa
a ser um projeto de **ingestão de fonte licenciada**: localizar, verificar a
licença, extrair do PDF, parear com os slugs EN e embutir o pack.

**Dentro do escopo:** geração do pack `srd-2024-ptbr` a partir da tradução do
Artifício RPG; entrada no registro de versões e no precache; redirecionamento do
fallback de migração das chaves `*-PTBR`; regeneração local (não versionada) dos
packs legados como fixture de teste; gate de aceitação do pack novo.

**Fora do escopo:** tradução própria de qualquer texto; SRD 5.1 em português
(não existe fonte com licença compatível — ver D-03); qualquer reintrodução de
texto de descrição dos `spells-5E-*.json` no conteúdo publicado; plataforma de
atualização automática de packs.

</domain>

<decisions>
## Implementation Decisions

### Fonte do texto pt-BR

Verificação feita nesta discussão (2026-09-05), com as fontes registradas em
`<canonical_refs>`:

- A **WotC não publicou SRD em português**. As traduções oficiais em CC-BY do
  SRD 5.1 e 5.2 saíram em francês, italiano, alemão e espanhol. Português não
  está na lista e não há data anunciada.
- **SRD 5.2 pt-BR do Artifício RPG** (abril/2025): tradução independente do
  texto CC-BY, publicada pelos tradutores sob **CC-BY-4.0**. É obra derivada
  legítima — procedência limpa, ao contrário do texto que a Fase 6 removeu.
- **SRD 5.1 pt-BR ("DRS", Aventureiros dos Reinos)**: **não serve**. É OGL 1.0a
  + autorização expressa da WotC nº 180618-000578 + Fan Content Policy, e foi
  "atualizado com a tradução oficial da Galápagos". Não é CC-BY. Sendo a base
  da Galápagos e do Baldur's Gate 3, é provavelmente a própria origem do texto
  dos `spells-5E-*-PTBR.json` — a mesma procedência que D-05 rejeitou.

- **D-01:** A fonte do pack pt-BR é a tradução do **Artifício RPG** do SRD 5.2,
  sob CC-BY-4.0. Nenhum outro texto pt-BR entra no conteúdo publicado.
- **D-02 (BLOQUEANTE):** O plano **não pode começar sem o PDF em mãos**. Todas
  as URLs conhecidas do arquivo dão 404 e o site migrou de WordPress para Astro
  (o portal `srd.artificiorpg.com` não resolve mais). O arquivo deve ser obtido
  pelo usuário e colocado em `scripts/srd-sources/`, versionado junto do
  `srd-5.2-spells.json` que já mora lá — a mesma regra do D-06 da Fase 3: o
  gerador nunca busca a fonte ao vivo. **Duas verificações obrigatórias na
  primeira leitura do arquivo, antes de qualquer código:**
  1. O capítulo de magias está **completo**. Os tradutores liberam o PDF por
     partes conforme finalizam. Se as 339 magias não estiverem lá, a rota
     inteira cai e a fase volta à mesa.
  2. A página de licença é transcrita **verbatim**. SRD-02 exige o texto de
     atribuição exato, e este pack tem **dois** detentores a creditar: a WotC
     pelo conteúdo e o Artifício RPG pela expressão linguística, terminologia e
     padronização editorial, que são direito deles.
- **D-03:** **Só a edição 5.2.** A pergunta "uma edição ou as duas" do ROADMAP
  está respondida pela disponibilidade de fonte, não por preferência: 5.1 não
  tem tradução com licença compatível. O usuário de 2014 que quiser português
  usa o pack 5.2 (ver D-08) ou importa o próprio, pela via BYOD.
- **D-04:** `MODIFICATION_NOTE` em `scripts/generate-srd-pack.mjs` é **por
  pacote**, não mais uma constante única. A nota atual ("conteúdo da magia não
  foi alterado") continua correta para os dois packs EN e seria **falsa** no
  pack traduzido. O pack pt-BR declara a tradução e a extração do PDF.

### Distribuição

- **D-05:** O pack pt-BR é **embutido**, como os dois SRD EN: arquivo
  `srd-2024-ptbr.json` na raiz, entrada em `BUILTIN_VERSIONS`, linha em
  `PRECACHE` e bump de `CACHE_VERSION`. Não é um pack BYOD baixável.
  Consequência medida: o precache sai de ~806 KB para ~1,2 MB (o pack EN 5.2
  tem 389.682 bytes; o pt-BR deve ficar na mesma ordem).
- **D-06:** É o **pacote padrão para navegador em português**. Nenhum código
  novo é necessário para isso: `_initialVersionKey()`
  (`spells-data-loader.jsx` ~L491-494) já procura
  `SPELL_VERSIONS.find(x => x.lang === 'ptbr')` e hoje não acha nada. A entrada
  nova no registro é o que resolve — desde que `meta.lang` seja `ptbr` e a
  entrada de `BUILTIN_VERSIONS` traga `lang: 'ptbr'`.

### Migração do usuário existente

- **D-07:** Quem tinha uma chave `*-PTBR` salva **volta sozinho ao português**.
  O mecanismo já existe: `LEGACY_VERSION_FALLBACK` e
  `window.__legacyVersionFallback`, construídos na Fase 6 (D-04 daquela fase).
  É trocar o destino do mapa, não construir caminho novo.
- **D-08:** **Reverte parcialmente o D-04 da Fase 6.** Aquela decisão preservava
  a **edição** (`spells-5E-2014-PTBR` → `srd-2014-en`), com o argumento de que
  um usuário de 2014 caindo em 5.2 vê estatísticas diferentes e lê como bug.
  Com um pack pt-BR disponível, **o idioma passa a vencer a edição**:

  | Chave legada | Destino Fase 6 | Destino desta fase |
  |---|---|---|
  | `spells-5E-2024-PTBR` | `srd-2024-en` | **`srd-2024-ptbr`** |
  | `spells-5E-2014-PTBR` | `srd-2014-en` | **`srd-2024-ptbr`** |
  | `spells-5E-2024-EN` | `srd-2024-en` | `srd-2024-en` (inalterado) |
  | `spells-5E-2014-EN` | `srd-2014-en` | `srd-2014-en` (inalterado) |

  O usuário foi avisado do conflito com D-04 e escolheu assim mesmo. O
  comparador de edição (`useEditionCompare`) e o seletor de versão continuam
  disponíveis para quem quiser voltar à 5.1. O planner deve realinhar
  `scripts/check-migration-version-fallback.tests.ps1`, que trava o mapa atual.

### Packs legados como fixture de teste

- **D-09:** Os 4 JSONs legados são **regenerados no formato de pack** apenas
  como fixture local de teste — nunca como conteúdo publicado. São recuperáveis
  do histórico: `git show 98740fe^:spells-5E-2024-PTBR.json` (a Fase 6 os apagou
  no commit `98740fe`).
- **D-10:** A proteção é **`.gitignore` apenas**. O usuário considerou e
  recusou tanto um gate estático quanto gerar fora da árvore do projeto. Saída
  em pasta ignorada — `.cache/` já é ignorada e já existe para esse fim (cache
  de fonte do gerador). **Aviso registrado, decisão do usuário:** se alguém
  rodar `git add -f` ou mudar o caminho de saída do gerador, nada avisa, e o
  texto que a v2.0 existe para remover volta ao repositório.

### Pareamento nome PT → slug EN

O problema: o PDF dá "Bola de Fogo", mas `hifiSpellKey` usa o slug EN
(`fireball`). Sem o par correto, toda preparada e favorita já salva deixa de
resolver.

- **D-11:** Os fixtures de teste (D-09) servem de **tabela de pareamento**. Os
  JSONs legados trazem nome PT e slug EN lado a lado, cobrindo as ~322 magias
  que coincidem com o SRD 5.2 (medição da Fase 6). Só o **par (nome PT, slug)**
  é lido — **nenhum byte de descrição, e nenhum campo além do nome**. A regra
  de D-05 da Fase 3 continua intacta: ela proíbe texto de descrição, e um nome
  de magia usado como chave de correspondência não é o texto que ela protege.
- **D-12:** As magias que não casarem por essa ponte (~17, mais o que o PDF
  trouxer a mais) são pareadas **à mão** e o resultado fica versionado, para
  que uma regeração futura não repita o trabalho nem mude o resultado em
  silêncio.
- **D-13:** O campo `name` do pack pt-BR é o **slug EN**, e `displayName` é o
  nome em português. Não é escolha estilística: `adaptSpell()`
  (`spells-data-loader.jsx` L366-378) já trata exatamente esse caso — com
  `versionLang === 'ptbr'`, `displayName` alimenta o slot pt e `name` continua
  sendo a identidade. Traduzir `name` invalidaria em silêncio toda preparada e
  favorita de todo usuário.

### Critério de aceitação

- **D-14:** **Gate automático + amostra humana.** O gate (script `.tests.ps1`,
  padrão do projeto) exige, no mínimo: 339 magias; nenhuma `description` vazia;
  todo `name` existente em `srd-2024-en.json`; `level` e `school` batendo com o
  pack EN magia a magia; `meta.license.attribution` e
  `meta.license.modifications` presentes e não vazios; `meta.lang === 'ptbr'`.
- **D-15:** Mais conferência humana de **~10 magias na tela**, escolhidas entre
  as que exercitam formatação: descrição com tabela, com lista, com seção de
  níveis superiores (`upgradeDescription`), e pelo menos uma das ~17 pareadas à
  mão.

### Claude's Discretion

- Técnica de extração do PDF (biblioteca, parser próprio, rota de texto). O
  `generate-srd-pack.mjs` hoje parte de JSON estruturado nas duas edições — esta
  é rota nova, mais próxima do fallback de OCR previsto em D-06 da Fase 3.
- Rótulo da entrada no seletor (`labelPt`/`labelEn`/`short`) e como três packs
  embutidos convivem sem ambiguidade.
- Onde exatamente aplicar a tabela de pareamento e em que formato versioná-la.
- Redação das strings de i18n que a fase acrescentar.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requisitos e escopo da fase
- `.planning/ROADMAP.md` §"Phase 7: Tradução dos SRDs para pt-BR" — goal,
  contexto e restrições. **Desatualizado por esta discussão:** o ROADMAP assume
  tradução própria e trata "traduzir as duas edições ou só a 5.2" como decisão
  aberta. D-01 e D-03 substituem ambos.
- `.planning/REQUIREMENTS.md` §"Future Requirements (v2.x)" — a linha "Pacote
  SRD PT-BR — bloqueado em tradução própria do texto CC-BY (a tradução oficial é
  protegida)" é o requisito que esta fase destrava. Precisa ser promovida a
  requisito ativo com identificador próprio na atualização do roadmap.
- `.planning/REQUIREMENTS.md` §SRD — SRD-01 (procedência verificada e
  registrada), SRD-02 (atribuição verbatim), SRD-03 (pré-instalado).
- `.planning/PROJECT.md` — decisões travadas do milestone v2.0.

### Procedência e licença (regra que a fase não pode violar)
- `.planning/phases/03-srd-pack-import-pipeline/03-SRD-SOURCE.md` — documento de
  proveniência das fontes. **Esta fase acrescenta uma seção nele** para a fonte
  pt-BR, com a mesma disciplina: URL, licença, data de captura, o que foi
  tomado e o que não foi.
- `.planning/phases/03-srd-pack-import-pipeline/03-CONTEXT.md` §D-05 — a regra
  travada: nenhum byte de descrição dos JSONs legados entra num pack publicado.
  Vale integralmente; D-11 opera dentro dela.
- `.planning/phases/06-decommissioning-migration/06-CONTEXT.md` §D-02, §D-04 —
  D-02 ("o app não embarca pack PT-BR") era motivado por copyright e é
  **superado** por uma fonte CC-BY; D-04 é **parcialmente revertido** por D-08.

### Fontes externas verificadas em 2026-09-05
- https://artificiorpg.com/blog/srd-52-portugues-artificio-rpg-traducao/ —
  anúncio da tradução; declara CC-BY-4.0, PDF como formato inicial, e que o
  Artifício RPG detém direito sobre a expressão linguística e a terminologia.
- https://www.dndbeyond.com/srd — SRD 5.2.1 oficial e a lista de idiomas
  localizados (fr/it/de/es; sem português).
- https://aventureirosdosreinos.com/documento-de-referencia-de-sistema-drs/ —
  o DRS 5.1 pt-BR e sua licença OGL 1.0a + Fan Content Policy. Registrado como
  fonte **rejeitada**, com o motivo, para que ninguém a reavalie do zero.

### Contrato de pacote e código de geração
- `pack.schema.json` — forma de `meta` e `spells[]`; `meta.lang` aceita
  `ptbr`; `meta.license` exige `id` e `attribution`.
- `scripts/generate-srd-pack.mjs` — gerador dos packs embutidos, incluindo a
  constante `MODIFICATION_NOTE` que D-04 torna por pacote.
- `scripts/srd-sources/` — onde a fonte versionada mora (hoje só
  `srd-5.2-spells.json`); destino do PDF de D-02.

</canonical_refs>

<code_context>
## Existing Code Insights

### Fatos medidos (não re-derivar)

- `srd-2024-en.json`: 339 magias, 389.682 bytes, 227.878 caracteres de
  descrição. `srd-2014-en.json`: 319 magias, 416.772 bytes, 257.210 caracteres.
- Campos presentes nos packs SRD: `name`, `displayName`, `level`, `school`,
  `description`, `castTime`, `range`, `components`, `duration`,
  `upgradeDescription`, `source`, `class`, `ritual`, `concentration`.
- Overlap medido na Fase 6: **322 das 391** magias de
  `spells-5E-2024-PTBR.json` existem no `srd-2024-en.json`. É a cobertura
  esperada da ponte de pareamento de D-11.
- `sw.js` está em `CACHE_VERSION = 'grimorio-v3'` e precacheia
  `./srd-2024-en.json` (L48) e `./srd-2014-en.json` (L49).
- Os 4 JSONs legados foram apagados no commit `98740fe`; recuperáveis por
  `git show 98740fe^:<arquivo>`.

### Reusable Assets
- `scripts/generate-srd-pack.mjs` — `slugify()`, `freeIdentifier()`,
  `htmlEscape()`, `toSpell()` e a escrita do pack já existem. A rota pt-BR
  acrescenta um extrator; o resto do pipeline é reaproveitado.
- `adaptSpell()` (`spells-data-loader.jsx` L357-443) — já trata pack pt-BR
  corretamente: com `versionLang === 'ptbr'`, `displayName` alimenta o slot pt e
  `name` fica intocado como identidade. Nada a mudar aqui.
- `LEGACY_VERSION_FALLBACK` + `window.__legacyVersionFallback`
  (`spells-data-loader.jsx` ~L482-490) — mecanismo de D-07/D-08 pronto.
- `_initialVersionKey()` (~L491-494) — a detecção de navegador pt-BR já existe
  e já procura `lang === 'ptbr'`.
- `mdToHtml()` / `stripHtml()` / `stripUpgradeHeading()` — limpeza de texto do
  adaptador. O extrator do PDF deve produzir HTML no mesmo feitio dos packs EN
  (`<p>`, `<strong>`, `<em>`), não markdown cru.

### Established Patterns
- **Gerador é one-shot, fora do runtime.** `generate-srd-pack.mjs` nunca é
  carregado pelo navegador e nunca busca fonte ao vivo. A fonte fica versionada
  em `scripts/srd-sources/`.
- **Mutação in place de `SPELL_VERSIONS`** — regra dura
  (`spells-data-loader.jsx` L40-46). A entrada nova vai na literal de
  `BUILTIN_VERSIONS`, antes do `.slice()`.
- **Sem suíte de framework** — verificação é gate estático `.tests.ps1` +
  QA manual. `scripts/run-tests.ps1` roda o conjunto.
- **Filtro de tempo de conjuração é `derive: true`** (`v10-hifi.jsx` L768) — as
  opções do filtro vêm do texto do próprio pack. O pack pt-BR produz opções em
  português automaticamente; nenhum código de filtro muda.
- **Unidades e terminologia vêm da fonte.** Pés/metros, nomes de escola e nomes
  de classe já traduzidos são decisão editorial do Artifício RPG, não desta
  fase. `CLASS_PT`/`CLASS_EN` e `SCHOOL_INDEX` já normalizam ambos os idiomas.

### Integration Points
- `spells-data-loader.jsx` L29-33 (`BUILTIN_VERSIONS`) — entrada nova (D-05).
- `spells-data-loader.jsx` — `LEGACY_VERSION_FALLBACK` (D-07/D-08).
- `sw.js` L21 (`CACHE_VERSION`) e L48-49 (`PRECACHE`) — D-05.
- `scripts/generate-srd-pack.mjs` — `MODIFICATION_NOTE` (D-04) + extrator novo.
- `scripts/check-migration-version-fallback.tests.ps1` — trava o mapa que D-08
  muda; realinhar junto, no mesmo commit.
- `scripts/check-srd-packs.tests.ps1` — gate dos packs embutidos; o gate de
  D-14 é vizinho dele ou extensão dele.
- `.gitignore` — entrada dos fixtures de teste (D-10).

</code_context>

<specifics>
## Specific Ideas

- A verificação de fonte veio antes da discussão de método, e foi ela que
  reduziu a fase de "traduzir 658 magias" para "ingerir uma tradução pronta". A
  lição vale para as próximas: perguntar se o trabalho precisa existir antes de
  decidir como fazê-lo.
- O critério informal de aceite é o mesmo da Fase 6: se o usuário brasileiro
  abrir o app depois da atualização e ler as magias em português sem precisar
  configurar nada, a fase entregou. `_initialVersionKey()` e D-07 são os dois
  caminhos por onde isso acontece — primeira visita e usuário existente.
- D-10 é a única decisão da fase que troca segurança por conveniência, e foi
  escolha explícita do usuário depois do aviso.

</specifics>

<deferred>
## Deferred Ideas

- **SRD 5.1 em português.** Sem fonte com licença compatível hoje. Se a WotC
  publicar SRD em português, ou se alguém traduzir a 5.1 sob CC-BY, é fase
  própria — a rota desta fase serve de molde.
- **Atualização quando o Artifício publicar versão nova do PDF.** Eles mantêm o
  documento em revisão contínua. Hoje a resposta é rodar o gerador de novo à
  mão, como nos packs EN. Automatizar é o requisito v2.x de "checagem manual de
  atualização de pack por URL", não esta fase.
- **Gate estático contra pack legado versionado.** Recusado em D-10. Se o
  fixture escapar para o repo alguma vez, promover a requisito.
- **Plataforma de consulta online do Artifício** como fonte estruturada.
  Anunciada, ainda não existe. Se sair, substitui a extração de PDF por uma
  rota mais barata e mais estável.

</deferred>

---

*Phase: 7-traducao-srd-ptbr*
*Context gathered: 2026-09-05*
