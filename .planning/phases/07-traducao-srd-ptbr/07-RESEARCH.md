# Phase 7: Tradução dos SRDs para pt-BR - Research

**Researched:** 2026-09-26
**Domain:** Extração de conteúdo estruturado de Markdown em prosa (não JSON), geração de
pack de magias pt-BR, realinhamento de gates estáticos existentes
**Confidence:** HIGH (quase todo achado abaixo vem de leitura direta do arquivo-fonte, do
código do app e dos gates `.tests.ps1` nesta sessão — não de treinamento)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01 (revisado):** Fonte = tradução do **Heróis Anônimos**, **recortada às 339 magias
  do SRD 5.2**. Licença é por magia (texto EN de cada uma é CC-BY do SRD 5.2; tradução é
  CC-BY-4.0 declarada pelos tradutores). Nenhuma magia fora do conjunto de
  `srd-2024-en.json` entra no pack. Nenhum outro conteúdo do PHB completo (classes,
  talentos, equipamento) é tocado.
- **D-02 (resolvido):** Fonte em mãos em
  `docs/superpowers/herois_anonimos/D&D 5.5 - Livro do Jogador (2024) 5.3.7.md` (1,4 MB),
  pasta no `.gitignore` (confirmado nesta pesquisa — a entrada já existe). Atribuição
  transcrita verbatim da seção "Licença" (linhas 3-76, antes de `# Prefácio` — confirmado:
  `# Prefácio` está exatamente na linha 77). Dois detentores a creditar: WotC (SRD 5.2) e
  Heróis Anônimos (tradução).
- **D-03:** Só edição 5.2. SRD 5.1 pt-BR não tem fonte com licença compatível — fora de
  escopo.
- **D-04:** `MODIFICATION_NOTE` passa a ser **por pacote**, não constante única. A nota do
  pack pt-BR declara: tradução (Heróis Anônimos), recorte às 339 magias do SRD 5.2,
  extração de Markdown, e a troca dos nomes próprios (D-16).
- **D-16:** As 17 magias que o SRD 5.2 renomeou (tirando nomes próprios) entram com
  `name` = slug EN do SRD, `displayName` = tradução do nome GENÉRICO — nunca o nome do PHB.
  Lista de partida com os 17 pares: `acid-arrow` Flecha Ácida, `arcane-hand` Mão Arcana,
  `arcane-sword` Espada Arcana, `arcanists-magic-aura` Aura Mágica do Arcanista,
  `black-tentacles` Tentáculos Negros, `faithful-hound` Cão Fiel, `floating-disk` Disco
  Flutuante, `freezing-sphere` Esfera Congelante, `hideous-laughter` Gargalhada Nefasta,
  `instant-summons` Invocação Instantânea, `irresistible-dance` Dança Irresistível,
  `magnificent-mansion` Mansão Magnífica, `private-sanctum` Santuário Particular,
  `resilient-sphere` Esfera Resiliente, `secret-chest` Arca Secreta, `telepathic-bond`
  Ligação Telepática, `tiny-hut` Pequeno Refúgio. Menções a esses nomes DENTRO do texto de
  outras magias também são trocadas. Nomes próprios a banir: Bigby, Tasha, Otiluke,
  Mordenkainen, Melf, Leomund, Rary, Evard, Drawmij, Tenser, Nystul, Otto.
- **D-17:** Versiona-se um **recorte**, não o documento completo. Um passo one-shot lê o
  Markdown completo (ignorado) e grava em `scripts/srd-sources/` só a seção "Licença" e os
  blocos das 339 magias do SRD. O gerador lê o recorte, nunca o documento completo. Nome e
  formato exatos do recorte ficam a critério do planner.
- **D-18:** Legendas de ilustração do PHB aparecem no meio dos blocos de magia — o extrator
  descarta. O gate do D-14 ganha duas checagens: nenhum nome próprio do D-16 aparece em
  nenhum campo do pack; nenhuma magia fora do conjunto de `srd-2024-en.json`.
- **D-19:** `spells-5E-2024-PTBR.json` legado (recuperável via
  `git show 98740fe^:spells-5E-2024-PTBR.json`) é parse anterior da MESMA fonte. Serve de
  oráculo local para validar o extrator nas 322 magias pareadas por slug. Continua sendo
  fixture ignorada — texto publicado sai só do recorte do D-17.
- **D-05 (distribuição):** Pack embutido `srd-2024-ptbr.json` na raiz, entrada em
  `BUILTIN_VERSIONS`, linha em `PRECACHE`, bump de `CACHE_VERSION`. Não é BYOD.
- **D-06:** Nenhum código novo necessário para virar o pacote padrão de navegador pt-BR —
  `_initialVersionKey()` já procura `lang === 'ptbr'`.
- **D-07/D-08:** Chave legada `*-PTBR` salva volta ao pt-BR (não mais ao EN da mesma
  edição). Tabela fechada:
  `spells-5E-2024-PTBR`→`srd-2024-ptbr`, `spells-5E-2014-PTBR`→`srd-2024-ptbr`,
  `spells-5E-2024-EN`→`srd-2024-en` (inalterado),
  `spells-5E-2014-EN`→`srd-2014-en` (inalterado). Isso reverte parcialmente o D-04 da
  Fase 6. `scripts/check-migration-version-fallback.tests.ps1` trava o mapa atual e precisa
  ser realinhado.
- **D-09/D-10:** Os 4 JSONs legados são regenerados no formato de pack só como fixture
  local de teste, protegidos apenas por `.gitignore` (decisão consciente do usuário, sem
  gate estático adicional).
- **D-11/D-12/D-13:** Os fixtures (D-09) servem de tabela de pareamento nome-PT↔slug-EN
  para ~322 magias; só o par (nome, slug) é lido, nunca descrição. As 17 do D-16 (mais
  qualquer coisa extra) são pareadas à mão e o resultado versionado. `name` = slug EN,
  `displayName` = nome pt — `adaptSpell()` já trata isso corretamente para
  `versionLang === 'ptbr'`.
- **D-14 (aceitação):** Gate automático mínimo: 339 magias; nenhuma `description` vazia;
  todo `name` existente em `srd-2024-en.json`; `level`/`school` batendo com o pack EN magia
  a magia; `meta.license.attribution`/`meta.license.modifications` não vazios;
  `meta.lang === 'ptbr'`.
- **D-15:** Conferência humana de ~10 magias na tela: tabela, lista, `upgradeDescription`,
  e ao menos uma das ~17 pareadas à mão.

### Claude's Discretion

- Técnica de extração do Markdown (parser de `##`, bloco por magia) — rota nova, sem
  precedente no `generate-srd-pack.mjs` atual (que só lê JSON estruturado).
- Rótulo da entrada no seletor (`labelPt`/`labelEn`/`short`) e como três packs embutidos
  convivem sem ambiguidade.
- Onde exatamente aplicar a tabela de pareamento e em que formato versioná-la.
- Redação das strings de i18n que a fase acrescentar.

### Deferred Ideas (OUT OF SCOPE)

- SRD 5.1 em português — sem fonte com licença compatível.
- Trocar a fonte para o Artifício RPG se o PDF reaparecer (procedência mais limpa, parte
  do próprio SRD 5.2 e não do PHB).
- Atualização automática quando o Heróis Anônimos publicar versão nova — refazer o recorte
  à mão é a resposta de hoje; automatizar é requisito v2.x separado.
- Gate estático contra pack legado versionado (D-10 recusou).
- Plataforma de consulta online do Artifício como fonte estruturada.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Descrição | Suporte da pesquisa |
|----|-----------|----------------------|
| SRD-01 | Pacote embutido, conteúdo de fonte com licença verificada e registrada, nunca dos `spells-5E-*.json`; `meta.license` com atribuição verbatim + nota de modificação | Seção "Fonte e licença" abaixo confirma linhas 3-76 do Markdown como texto de atribuição-base; "Standard Stack"/"Code Examples" mostram como compor o objeto de duas atribuições (WotC + Heróis Anônimos) no mesmo `meta.license.attribution` |
| SRD-02 | Atribuição CC-BY visível no app, texto verbatim, modificações anotadas | `MODIFICATION_NOTE` por pacote (D-04) — texto sugerido na seção "Code Examples" |
| SRD-03 | Pacote SRD vem pré-instalado | D-05/D-06 — `BUILTIN_VERSIONS`/`PRECACHE`/`_initialVersionKey()`, todos já existentes; só falta a entrada nova (ver "Architecture Patterns" → Integration Points) |
| **Novo (v2.x → ativo)** — "Pacote SRD PT-BR" | A linha em `REQUIREMENTS.md` §"Future Requirements (v2.x)" precisa ser promovida a requisito ativo com ID próprio (ex.: `SRD-04`) nesta fase — ver nota abaixo | Todo o corpo desta pesquisa |

**Nota sobre o novo ID:** `REQUIREMENTS.md` ainda lista "Pacote SRD PT-BR — bloqueado em
tradução própria..." em Future Requirements (v2.x), sem ID formal. O `ROADMAP.md` marca
`Requirements: TBD` para a Fase 7. Esta pesquisa recomenda `SRD-04` (próximo ID livre na
família SRD) para a linha "Pacote SRD embutido em pt-BR, recortado às 339 magias do SRD
5.2, fonte Heróis Anônimos CC-BY-4.0" — mas a numeração final e a promoção de fato em
`REQUIREMENTS.md`/`ROADMAP.md` é decisão do planner/discuss, não desta pesquisa.
`[ASSUMED]`
</phase_requirements>

## Summary

Esta fase troca de natureza duas vezes antes de chegar ao planner: primeiro deixou de ser
"traduzir 658 descrições" e virou "ingerir uma tradução de terceiro já publicada"; depois
trocou a fonte de um PDF do Artifício RPG (que seria estruturado, parecido com o gist do
5.2 que `generate-srd-pack.mjs` já sabe ler) para um Markdown de prosa do PHB inteiro do
Heróis Anônimos, que exige uma rota de extração **inteiramente nova**: nenhum parser
existente no projeto lê Markdown com cabeçalhos `##`/negrito/itálico — os dois parsers de
`generate-srd-pack.mjs` leem JSON estruturado (`parseSrd52`) ou um dump de nós de PDF
(`parseSrd51`), não texto Markdown solto.

A boa notícia, confirmada por leitura direta do arquivo de 21.813 linhas nesta sessão: a
gramática do Markdown é **extremamente regular e mecânica**. Cada magia é
`## Nome` → (legenda opcional, ver pitfall) → `*Círculo, Escola (Classes)*` → quatro campos
`**Rótulo:**` → corpo em parágrafos/listas/tabelas → seção opcional
`**Usando um Espaço de Magia de Círculo Superior.**` ou `**Aprimoramento de Truque.**`. Os
339 divisores estão isolados por letras soltas (`A`, `B`, `C`...) + `***`. O parser pode ser
inteiramente hand-rolled (regex linha a linha), reaproveitando `slugify()`,
`freeIdentifier()`, `htmlEscape()`, `toSpell()` e o validador de schema já existentes em
`generate-srd-pack.mjs` — nenhuma dependência nova é necessária ou justificável.

Três achados NÃO estavam na lista de fatos pré-medidos do orquestrador e mudam decisões de
implementação:

1. **A legenda de ilustração NÃO é sempre negrito.** Uma legenda real (`Flecha Ácida de
   Melf`, linha 14422) é texto puro, sem `**`. A detecção correta é **posicional** (a
   primeira linha não-vazia depois de `## Nome` e antes da linha `*Círculo...*`), não por
   padrão de negrito ou nome próprio.
2. **6 das 7 magias com sub-cabeçalho `###` (bloco de estatísticas de criatura) estão FORA
   do recorte do SRD 5.2** — `summon-aberration`, `summon-construct`, `summon-fiend`,
   `summon-undead` e as outras "Invocar X" não existem em `srd-2024-en.json`; só
   `giant-insect` ("Inseto Gigante") está no conjunto de 339. O filtro de pareamento
   (D-11/D-12 contra `srd-2024-en.json`) já exclui as 6 de fora automaticamente — não
   precisa de lógica especial, só não deixar o parser confundir o `###` com um novo
   cabeçalho de magia.
3. **O campo `statBlock` do `pack.schema.json` não é lido por nenhum componente de UI** —
   `grep` em `v10-hifi.jsx`/`spells-data-loader.jsx` não encontra nenhuma leitura de
   `s.statBlock`. Gravar ali o bloco de "Inseto Gigante" o deixaria invisível. A
   recomendação é embutir a tabela de estatísticas como `<table>` dentro de `description`
   (mesma rota dos outros ~14 outros exemplos de tabela em corpo de magia).

Um quarto achado, de terminologia: a tradução usa **"Guardião"** para a classe Ranger (0
ocorrências de "patrulheiro" no documento inteiro), enquanto o app usa **"patrulheiro"**
(`CLASS_PT`/`CLASS_EN` em `spells-data-loader.jsx`). O gerador precisa mapear
`Guardião → ranger` explicitamente — nunca gravar a palavra "Guardião" no campo `class[]`
do pack, porque o filtro de classe casa pelo valor **canônico em inglês**
(`check-class-filter-canonical.tests.ps1`, ver "Common Pitfalls").

**Primary recommendation:** Escrever um extrator hand-rolled, linha a linha, sobre o
recorte versionado do D-17 (não sobre o Markdown completo), reaproveitando os helpers já
existentes em `generate-srd-pack.mjs`; filtrar SEMPRE pelo conjunto de nomes de
`srd-2024-en.json` antes de emitir qualquer magia; e no mesmo commit da geração do pack
realinhar os quatro gates que hoje travam "exatamente 2 pacotes SRD"
(`check-decommission.tests.ps1`, `check-migration-version-fallback.tests.ps1`) e criar um
gate novo e dedicado para as regras específicas do pt-BR (D-14/D-16/D-18), em vez de inchar
`check-srd-packs.tests.ps1`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Extração do Markdown → JSON estruturado | Build-time (script Node, fora do runtime) | — | `generate-srd-pack.mjs` já é a convenção: script one-shot, nunca carregado pelo navegador, nunca com acesso à rede em produção |
| Recorte versionado (D-17) | Build-time (script Node) | — | Mesmo motivo — lê o PHB completo (ignorado) só nesta etapa isolada, produz artefato committável |
| Distribuição/precache do pack | CDN/Static (arquivo estático `srd-2024-ptbr.json` + `sw.js`) | — | Idêntico aos 2 packs SRD EN já embutidos |
| Registro de versões / seleção de idioma | Browser/Client (`spells-data-loader.jsx`) | — | Roda 100% no navegador; sem SSR neste projeto |
| Normalização classe/escola PT↔EN | Browser/Client (`adaptSpell()`) | Build-time (gerador precisa gravar `class[]` já em inglês) | O runtime só traduz EN→PT para exibição; a fonte de verdade em inglês tem que nascer correta no pack, ver pitfall "Guardião" |
| Atribuição de licença visível na UI | Browser/Client (componente de créditos existente) | — | Mesmo padrão dos 2 packs SRD EN — `meta.license` já é lido e exibido, nenhum componente novo necessário |
| Fallback de chave legada (D-07/D-08) | Browser/Client (`spells-data-loader.jsx`) | — | `LEGACY_VERSION_FALLBACK` e `_initialVersionKey()` já existem; só o valor de destino muda |
| Gates de aceitação (D-14/D-16/D-18) | Build-time / CI (`.tests.ps1`) | — | Convenção do projeto — nenhuma suíte de framework, tudo é gate estático + prova de execução via `node` |

## Standard Stack

### Core

Nenhuma biblioteca nova. `package.json` (verificado nesta pesquisa) só declara
`openspec`/`openspec-buddy`/`openspec-extensions`/`openspec-playwright` como dependências —
nenhum parser de Markdown, HTML ou YAML já instalado. O projeto não tem passo de build; a
regra de topo de `generate-srd-pack.mjs` proíbe introduzir um.

| Ferramenta | Versão | Propósito | Por que é o padrão aqui |
|---|---|---|---|
| Node.js `fs`/`path`/`url` (stdlib) | Node 24.15.0 instalado (verificado: `node --version`) | Ler o recorte versionado, escrever o pack | Já é o que `generate-srd-pack.mjs` usa — zero dependência |
| Regex linha a linha (mão) | — | Parser do Markdown (heading, campos negrito, itálico, listas, tabelas) | Ladder do projeto: gramática é fixa e conhecida (medida nesta pesquisa), 339 blocos — um parser de Markdown completo (remark/markdown-it) resolveria um problema mais genérico do que este exige |
| `validatePackAgainstSchema()` (já existe em `generate-srd-pack.mjs`) | — | Validação contra `pack.schema.json` | D-13 da Fase 3 já decidiu não usar `ajv`/similar — reaproveitar, não recriar |

### Supporting

| Ferramenta | Versão | Propósito | Quando usar |
|---|---|---|---|
| `pwsh` | 7.6.6 instalado (verificado: `pwsh -v`) | Rodar os gates `.tests.ps1` novos/realinhados | Mesma convenção de todo o projeto (`scripts/run-tests.ps1`) |
| `spells-5E-2024-PTBR.json` recuperado (`git show 98740fe^:...`) | — | Oráculo de validação (D-19) e tabela de pareamento (D-11) | Só leitura de `name`+`displayName`; nunca vira bytes publicados |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Parser hand-rolled linha a linha | `remark`/`markdown-it` (AST completo) | Resolveria table/list/emphasis de forma genérica, mas é dependência nova sem justificativa — a gramática do documento é regular o bastante para regex, e o projeto já rejeitou dependências de parsing (`validatePackAgainstSchema` é hand-rolled pelo mesmo motivo, D-13 da Fase 3) |
| Gravar `statBlock` como campo dedicado | Dobrar a tabela de "Inseto Gigante" dentro de `description` | `statBlock` existe no schema mas não é lido por nenhum componente hoje (verificado) — usar `description` garante que o conteúdo aparece na tela sem depender de trabalho de UI fora de escopo |

**Installation:** nenhuma — sem `npm install` nesta fase.

**Version verification:** não aplicável (nenhum pacote de terceiro é adicionado).

## Package Legitimacy Audit

**Não aplicável.** Esta fase não instala nenhum pacote de terceiro — nem em produção, nem
como dependência de build. `package.json` foi inspecionado nesta sessão e permanece
inalterado (só as dependências de `openspec` já existentes, sem relação com esta fase). O
gate de legitimidade de pacotes (`gsd-tools query package-legitimacy check`) não tem
insumo: nenhum nome de pacote novo aparece no código ou nesta pesquisa.

## Architecture Patterns

### System Architecture Diagram

```
   [PHB completo, .md, ignorado]
              │
              │ (1) script one-shot de recorte (D-17) — lê o documento inteiro,
              │     grava só a seção Licença + os 339 blocos de magia do SRD
              ▼
   [scripts/srd-sources/srd-5.2-ptbr-source.json]  (versionado, committável)
              │
              │ (2) generate-srd-pack.mjs, nova rota `extract: parsePtbr52`
              │     (parser de Markdown: heading → campos → corpo →
              │      filtro contra srd-2024-en.json → toSpell())
              ▼
   [srd-2024-ptbr.json]  (pack embutido, raiz do repo)
              │
              │ (3) sw.js PRECACHE + CACHE_VERSION bump
              │     spells-data-loader.jsx BUILTIN_VERSIONS (nova entrada)
              ▼
   [navegador: fetch → adaptSpell() → UI]
              │
              │ (4) LEGACY_VERSION_FALLBACK (D-07/D-08) redireciona
              │     `spellbook-ui-prefs.versionKey` legado pra esta entrada
              ▼
   [usuário brasileiro lê magias em pt-BR sem configurar nada]
```

### Recommended Project Structure

```
scripts/
├── extract-ptbr-source.mjs      # NOVO — one-shot, roda só à mão (D-17):
│                                 #   lê docs/superpowers/herois_anonimos/*.md (ignorado),
│                                 #   escreve o recorte abaixo. Nunca chamado por
│                                 #   generate-srd-pack.mjs nem pelo runtime.
├── srd-sources/
│   ├── srd-5.2-spells.json      # já existe (fonte EN 5.2)
│   └── srd-5.2-ptbr-source.json # NOVO — recorte versionado (D-17): seção "Licença" +
│                                 #   os blocos `## Nome` ... corpo das 339 magias
│                                 #   (formato exato a critério do planner — ver nota)
├── ptbr-name-pairing.json       # NOVO — tabela de pareamento à mão (D-12) para as
│                                 #   17 magias renomeadas + qualquer excedente
├── generate-srd-pack.mjs        # ESTENDIDO — novo item em EDITIONS (ou array irmão),
│                                 #   extract: parsePtbr52(), MODIFICATION_NOTE por pack
└── check-srd-ptbr-pack.tests.ps1 # NOVO — gate dedicado (D-14/D-16/D-18)
```

**Nota sobre o formato do recorte (D-17, discrição do planner):** o padrão já usado no
projeto para fonte versionada é JSON (`srd-5.2-spells.json`). Recomenda-se manter o recorte
em JSON também — ex.: `{ "license": "<texto das linhas 3-76>", "blocks": ["## Nome\n\n*Círculo...*\n\n...", ...] }`
(um array de strings, cada uma o texto Markdown crú de um bloco de magia) — em vez de
Markdown puro, para que o parser da etapa (2) trabalhe sobre um array já delimitado por
magia e não precise re-detectar os limites de bloco a cada execução. Isso é uma
recomendação, não uma decisão travada.

### Pattern 1: Detecção de heading de magia vs. divisor vs. ruído

**What:** nem toda linha `## algumacoisa` é uma magia. Confirmado por medição direta sobre
as linhas 11293–18929 do Markdown-fonte:
- 392 headings `## ` genuínos de magia.
- 1 heading vazio anômalo (`## ` sem texto, linha 11373/relativa 5081) seguido da linha
  divisora `N` e `***` — um glitch de formatação único no documento, não um padrão a
  replicar.
- 20 divisores de letra (`A`, `B`, `C`, ... `Z` presentes) no formato:
  ```
  B

  ***

  ## Badalar Fúnebre
  ```
  (o primeiro divisor, `A`, não tem `***` antes — vem direto depois da frase de abertura do
  capítulo).

**When to use:** todo passo de "encontrar o próximo cabeçalho de magia" precisa ignorar
heading com texto vazio (`.trim().length === 0`) e linhas de uma letra maiúscula sozinha.

**Example (recorte ilustrativo, poucas linhas):**
```
## 

N

***

## Nevasca
```

### Pattern 2: Grão de um bloco de magia (campos fixos)

**What:** todo bloco de magia segue esta ordem exata (medida sobre múltiplas amostras):
```
## <Nome>

[legenda opcional — ver Pitfall 1]

*<Nº>º Círculo, <Escola> (<Classe1>, <Classe2>)*      ← ou "*Truque de <Escola> (<Classes>)*"

**Tempo de Conjuração:** <valor>                       ← "Ação", "Ação Bônus", "Reação, ...",
                                                          "1 minuto ou Ritual", etc.

**Alcance:** <valor>

**Componentes:** <V, S, M (nota opcional entre parênteses)>

**Duração:** <valor>                                   ← "Concentração, até 1 minuto" é
                                                          UMA string só, igual ao padrão já
                                                          usado nos packs EN (durationOf());
                                                          NÃO separar como o JSON legado fez.

<corpo em parágrafos / listas `-   item` / tabelas markdown>

**Usando um Espaço de Magia de Círculo Superior.** <texto>   ← magias com círculo
**Aprimoramento de Truque.** <texto>                           ← truques (21 ocorrências
                                                                  confirmadas no recorte)
```

**When to use:** parser principal — cada linha do bloco casa contra um destes rótulos fixos
antes de cair em "corpo".

**Example (bloco real completo, curto o bastante para citar):**
```
## Acalmar Emoções

*2º Círculo, Encantamento (Bardo, Clérigo)*

**Tempo de Conjuração:** Ação

**Alcance:** 18 metros

**Componentes:** V, S

**Duração:** Concentração, até 1 minuto

Cada Humanoide em uma Esfera de 6 metros de raio... (escolha um para cada criatura):

-   A criatura tem Imunidade às condições Amedrontado e Enfeitiçado...
-   A criatura se torna Indiferente às criaturas à sua escolha...
```

### Pattern 3: Truque (cantrip) vs. magia com círculo

**What:** a linha itálica de metadado tem duas formas mutuamente exclusivas:
- `*<N>º Círculo, <Escola> (<Classes>)*` — magia normal, nível 1–9.
- `*Truque de <Escola> (<Classes>)*` — truque, nível 0. Confirmado: "Truque de Necromancia
  (Clérigo, Druida)", "Truque de Encantamento (...)", "Truque de Transmutação (...)", etc.

**When to use:** `level = 0` quando a linha casa `/^\*Truque de /`; senão
`level = Number(match[1])` do padrão `/^\*(\d+)º Círculo, /`.

### Pattern 4: Ritual embutido no campo Tempo de Conjuração

**What:** não há marcador `(ritual)` separado como no SRD 5.1 (`parseSrd51`'s
`LEVEL_SCHOOL_RE`). O ritual aparece DENTRO do valor de `**Tempo de Conjuração:**`, ex.:
`1 minuto ou Ritual`, `Ação ou Ritual` (10+ ocorrências confirmadas).

**When to use:** `ritual = /\bRitual\b/i.test(castTimeRaw)`. Decidir se o texto "ou Ritual"
permanece no `castTime` publicado (como no `parseSrd52` do EN, que não separa) ou é
removido — os packs EN 5.2 mantêm o texto completo em `castTime` e não expõem um booleano
separado a partir dele; para consistência, manter o texto completo é a rota de menor
atrito (mesma forma nos dois idiomas), mas isso é decisão do planner. `[ASSUMED: qual das
duas rotas o planner escolhe]`

### Pattern 5: Tabelas e listas markdown → HTML

**What:** o EN 2024 pack (`srd-2024-en.json`) **não tem nenhum exemplo** de `<table>` ou
`<ul>` em `description` (confirmado: 0 ocorrências) — o parser `parseSrd52()` do gerador
atual só escreve `<p>${htmlEscape(text)}</p>`, um parágrafo plano. A fonte pt-BR, ao
contrário, tem:
- **22 magias com tabela markdown genuína** dentro do recorte de 339 (incluindo as 7
  "Invocar/Inseto" — mas só `giant-insect` está dentro do conjunto SRD 5.2, ver Pitfall 3):
  `Animar Objetos`, `Augúrio`, `Confusão`, `Controlar o Clima`, `Convocar Celestial`,
  `Convocar Elemental`, `Convocar Feérico`, `Convocar Montaria`, `Criação`, `Inseto
  Gigante`, e outras.
- **8 magias com lista `-   item`**: `Acalmar Emoções`, `Círculo Mágico`, `Comunhão com a
  Natureza`, `Proteger Fortaleza`, `Restauração Maior`, `Rogar Maldição`, `Santuário
  Particular de Mordenkainen` (uma das 17 do D-16 — bom candidato pro D-15, satisfaz duas
  exigências de amostra ao mesmo tempo), `Teleporte`.

**When to use:** o gerador precisa de DOIS conversores novos (nenhum existe hoje para essa
forma de entrada — o `tableToHtml()` do parser SRD 5.1 opera sobre nós de PDF já
estruturados, não sobre texto pipe-delimitado):
- lista: linha que casa `/^-\s{2,}/` → agrupar linhas consecutivas em `<ul><li>...</li></ul>`.
- tabela: linhas que casam `/^\|.*\|\s*$/`, primeira linha = cabeçalho, segunda linha
  `|---|---|` = separador (descartar), demais = corpo → `<table><tbody>...</tbody></table>`.

**Example (síntese, sem citar a tabela real completa):**
```
-   A criatura tem Imunidade às condições Amedrontado e Enfeitiçado...
-   A criatura se torna Indiferente às criaturas à sua escolha...
```
vira
```html
<ul><li>A criatura tem Imunidade...</li><li>A criatura se torna Indiferente...</li></ul>
```

### Anti-Patterns to Avoid

- **Detectar legenda de ilustração por "é negrito" ou "contém nome próprio":** confirmado
  que ao menos uma legenda real (a de "Flecha Ácida de Melf", linha 14422) é texto puro sem
  `**`, e contém apenas o nome do MAGO ("Mago Melf"), não da magia. A detecção correta é
  posicional (ver Pitfall 1).
- **Reescrever o validador de schema ou o `slugify()`:** ambos já existem em
  `generate-srd-pack.mjs` e cobrem exatamente esta forma de pack (`meta.lang: 'ptbr'` já é
  aceito pelo enum do `pack.schema.json` e pelo hand-rolled validator).
- **Gravar o campo `class[]` do pack em português:** ver Pitfall 4 — quebra o filtro de
  classe canônico entre pacotes.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| Validação do pack contra o schema | Um novo validador (ex.: rodar `ajv`) | `validatePackAgainstSchema()` já existente em `generate-srd-pack.mjs` | D-13 da Fase 3 já rejeitou dependência de validação; o hand-rolled atual já entende `additionalProperties`, `enum`, `pattern`, arrays |
| Slug/ID único de magia | Nova função de slugify | `slugify()` + `freeIdentifier()` já existentes | Mesma lógica de colisão (`-2`, `-3`...) que o EN já usa; reimplementar arrisca divergir do padrão dos outros dois packs |
| Escape de HTML no corpo | Nova função de escape | `htmlEscape()` já existente | Trata só `&`/`<`/`>` — suficiente pro texto que entra aqui (sem atributos, sem HTML de terceiro não-confiável nesta etapa de build) |
| Montagem final do objeto de magia (`spells[]`) | Novo mapeamento campo a campo | `toSpell(raw, usedNames)` já existente | Já decide quais campos opcionais entram (`if (raw.ritual) ...`) — o extrator pt-BR só precisa produzir o mesmo formato intermediário (`raw.displayName`, `raw.level`, etc.) que os outros dois extratores produzem |

**Key insight:** o pipeline de `generate-srd-pack.mjs` já resolveu "registro estruturado →
pack válido" duas vezes (5.1 e 5.2). O trabalho novo desta fase é estritamente
"Markdown de prosa → registro estruturado" (uma função `parsePtbr52(source)` que devolve o
mesmo formato intermediário que `parseSrd51`/`parseSrd52` já produzem) — todo o resto do
pipeline (validação, escrita, contagem, `meta`) é reuso direto.

## Runtime State Inventory

> Esta fase muda o destino do `LEGACY_VERSION_FALLBACK` (D-07/D-08), que se qualifica como
> mudança "tipo migração" para usuários existentes — segue o inventário completo.

| Categoria | Itens encontrados | Ação necessária |
|-----------|--------------------|-------------------|
| Dados armazenados | `localStorage['spellbook-ui-prefs'].versionKey` pode conter uma das 4 chaves legadas (`spells-5E-2024-PTBR` etc.) em navegadores de usuários que nunca abriram o app desde a Fase 6. O VALOR gravado no storage do usuário não muda — só o CÓDIGO que o interpreta (o mapa `LEGACY_VERSION_FALLBACK`) muda de destino. | Edição de código apenas (`spells-data-loader.jsx`); nenhuma migração de dados armazenados é necessária — a chave legada continua string idêntica, resolvendo pra um destino novo |
| Configuração de serviço externo ativo | Nenhum — projeto é local-only, sem backend, sem serviço externo com estado próprio (confirmado: `PROJECT.md`/`REQUIREMENTS.md` travam "sem backend, sem contas") | Nenhuma |
| Estado registrado no SO | Nenhum — app web puro, sem processo em background, sem tarefa agendada, sem serviço systemd/launchd/Task Scheduler | Nenhuma |
| Segredos/env vars | Nenhum — nenhuma chave de API, nenhum `.env`, nenhum segredo SOPS neste projeto (confirmado: nenhuma referência em `package.json`/scripts) | Nenhuma |
| Artefatos de build / pacotes instalados | O `.cache/srd-sources/` do gerador (ignorado) pode conter um fetch antigo cacheado dos OUTROS dois packs (5.1/5.2 EN) — não é tocado por esta fase, já que a fonte pt-BR é lida de arquivo local (`docs/superpowers/herois_anonimos/...`), nunca de rede. Nenhum artefato de build fica desatualizado por esta fase. | Nenhuma |

**Achado adicional relevante a esta categoria:** o Service Worker (`sw.js`) mantém em cache
os JSONs de magia por `CACHE_VERSION`. Um usuário com o app já instalado (PWA/offline) só
verá o pack pt-BR novo depois que `CACHE_VERSION` for incrementado — isso já está coberto
pelo padrão existente (comentário de topo do `sw.js`: "MUDAR O CONTEÚDO de um arquivo já
listado no PRECACHE também exige bump"), não é um item de estado órfão, é o mecanismo já
desenhado para este caso.

## Common Pitfalls

### Pitfall 1: Legenda de ilustração não é sempre "negrito" — detectar por posição, não por padrão
**What goes wrong:** um extrator que procura por `**...**` para achar e descartar legendas
de ilustração (D-18) vai deixar passar pelo menos uma legenda real: a de "Flecha Ácida de
Melf" (linha 14422) é texto puro, sem asteriscos, contendo só um nome de spell em itálico
(`*Flecha Ácida de Melf*`) embutido na frase — não um `**parágrafo em negrito**` inteiro.
**Why it happens:** a maioria das 38 legendas confirmadas (sobre 392 headings) É negrito
inteiro (`**O Mago Bigby usa...**`), então um padrão "linha que começa e termina com `**`"
parece cobrir o caso até faltar num exemplo real.
**How to avoid:** detectar por POSIÇÃO estrutural: a primeira linha não-vazia depois de
`## Nome` e ANTES da linha itálica `*Círculo/Truque...*` — se essa linha existir e não for
ela mesma a linha `*Círculo...*`, é legenda e é descartada, seja negrito, texto puro, ou
qualquer outra formatação. Confirmado por leitura: em TODOS os exemplos encontrados
("Arma Espiritual", "Mão de Bigby", "Flecha Ácida de Melf") a legenda ocupa exatamente essa
posição, sempre uma única linha, sempre entre o heading e a linha de círculo/escola.
**Warning signs:** se o extrator produzir uma `displayName` ou `description` começando com
"O Mago X usa...", "Um Golias Clérigo conjura...", "O ousado Mago Melf mira...", a detecção
posicional falhou.

### Pitfall 2: "Guardião" ≠ "patrulheiro" — a fonte usa um termo de classe diferente do app
**What goes wrong:** o app traduz a classe Ranger como "patrulheiro" em toda parte
(`CLASS_PT`/`CLASS_EN` em `spells-data-loader.jsx`; 0 outra grafia usada no código). A
tradução do Heróis Anônimos usa **"Guardião"** para a mesma classe — confirmado: 0
ocorrências de "patrulheiro" em todo o documento de 21.813 linhas; 114 ocorrências de
"Guardião", incluindo o próprio título do capítulo de classe
(`## Características de Classe de Guardião`) e nas linhas de círculo/escola das magias
(ex.: `*1º Círculo, Abjuração (Guardião, Mago)*`). Se o extrator só faz
`.toLowerCase()`/copia o texto da lista de classes direto pro campo `class[]` do pack, o
pack sairia com `"class": ["Guardião", "Mago"]` em vez de `["Ranger", "Wizard"]`.
**Why it happens:** o extrator do 5.2 EN (`parseSrd52`) já recebe `classes` em inglês
direto do JSON-fonte — não existe precedente no código para "traduzir nome de classe PT →
slug EN" dentro do gerador. Essa etapa é inteiramente nova.
**How to avoid:** o gerador precisa de uma tabela PT→EN de nomes de classe (pode ser a
inversa de `CLASS_PT`/`CLASS_EN`, mas ESTENDIDA com pelo menos `guardião: 'ranger'`, já que
o par canônico do app usa "patrulheiro"). Recomenda-se manter essa tabela DENTRO de
`generate-srd-pack.mjs` (não em `spells-data-loader.jsx`) — mudar `CLASS_PT`/`CLASS_EN` no
runtime alteraria a palavra que o app mostra hoje pra "patrulheiro" (afetando o pack EN e
qualquer link compartilhado com `?f.class=patrulheiro`), o que está fora do escopo desta
fase.
**Warning signs:** o gate de classe canônico (`check-class-filter-canonical.tests.ps1`,
que trava `s.classesEn` como o valor usado pelo filtro) não testa o CONTEÚDO do pack — uma
falha aqui só aparece manualmente: selecionar "Patrulheiro"/"Ranger" no filtro de classe com
o pack pt-BR ativo e ver zero resultados mesmo havendo magias de Guardião no pack.

### Pitfall 3: Nem toda magia com sub-cabeçalho `###` está dentro do recorte SRD 5.2
**What goes wrong:** dos 7 blocos de magia que têm um `### <Nome>` (bloco de estatísticas
de criatura, tabela de atributos) dentro do corpo, só **1** (`giant-insect` / "Inseto
Gigante") existe em `srd-2024-en.json`. Os outros 6 —`Invocar Aberração`, `Invocar
Constructo`, `Invocar Dragão`, `Invocar Fera`, `Invocar Ínfero`, `Invocar Morto-Vivo` (as
magias "Summon X" de Tasha's Cauldron) — **não estão no conjunto de 339 magias do SRD 5.2**
(confirmado: nenhum dos slugs `summon-aberration`/`summon-construct`/`summon-beast`/
`summon-fiend`/`summon-undead` existe em `srd-2024-en.json`).
**Why it happens:** parecem candidatos óbvios de inclusão porque têm bloco de magia
completo e regular no Markdown-fonte — só o pareamento contra `srd-2024-en.json` (D-01, já
uma exigência travada) revela que são conteúdo fora do SRD.
**How to avoid:** o filtro "só emitir se o nome existir em `srd-2024-en.json`" (que já
precisa existir por causa de D-01) resolve isso automaticamente — não precisa de lista de
exclusão adicional. O único cuidado é: o parser de blocos NÃO deve tratar `### Nome` como
início de uma NOVA magia (só `## ` inicia magia) — senão o parser criaria uma magia
fantasma "Inseto Gigante" duplicada ou cortaria o bloco de "Invocar Aberração" no meio.
**Warning signs:** contagem de blocos extraídos maior que 339 antes do filtro, ou um nome
de magia aparecendo duas vezes com conteúdo diferente.

### Pitfall 4: `statBlock` do schema existe mas não é renderizado por nada
**What goes wrong:** gravar a tabela de atributos de "Inseto Gigante" no campo
`spell.statBlock` (que existe em `pack.schema.json`) produziria um pack "correto" pelo
schema mas com esse conteúdo **invisível no app** — `grep -r statBlock` em
`v10-hifi.jsx`/`spells-data-loader.jsx` não encontra nenhuma leitura desse campo; ele só é
sanitizado no import (`pack-import.jsx`) e mencionado no schema, nunca lido no caminho de
exibição.
**Why it happens:** o campo foi desenhado na Fase 3 para um caso de uso que nunca ganhou UI
correspondente.
**How to avoid:** embutir a tabela de "Inseto Gigante" como `<table>` HTML dentro do próprio
`description` (mesma técnica do Pattern 5), igual às outras ~14 magias do recorte que têm
tabela em corpo. Isso é recomendação (`Claude's Discretion` do CONTEXT.md cobre "técnica de
extração"), não decisão travada.
**Warning signs:** QA manual (D-15) abrindo a magia "Inseto Gigante" na tela e não vendo a
tabela de atributos em lugar nenhum.

### Pitfall 5: Formato de `duration` — não repetir o corte que o JSON legado fez
**What goes wrong:** o `spells-5E-2024-PTBR.json` legado (oráculo do D-19) guarda
`duration: "até 1 minuto"` e `concentration: true` SEPARADOS — removeu o prefixo
"Concentração, " do texto. Os packs EN 5.2 (`durationOf()` em `generate-srd-pack.mjs`) fazem
o oposto: mantêm `duration: "Concentration, up to 1 minute"` como uma string só. Se o
extrator pt-BR copiar o padrão do JSON legado (por ser o "oráculo"), o campo `duration` do
pack pt-BR ficaria estruturalmente diferente do padrão dos outros dois packs embutidos.
**Why it happens:** D-19 diz para usar o JSON legado como oráculo de TEXTO (valida se a
descrição bate) — é fácil estender esse uso, por engano, ao FORMATO dos campos auxiliares
também.
**How to avoid:** a fonte Markdown já entrega `**Duração:** Concentração, até 1 minuto` como
uma frase só — o caminho de menor esforço (e o mais consistente com os dois packs EN
existentes) é preservar essa string inteira em `duration` e SÓ ADICIONALMENTE setar
`concentration = /^Concentração/i.test(durationRaw)`, sem cortar o prefixo do texto.
**Warning signs:** comparar `duration` do pack pt-BR com o pack EN da mesma magia e ver que
um tem "Concentration, ..." e o outro só "...", uma assimetria visível na comparação de
edição/idioma da UI.

### Pitfall 6: Quatro gates `.tests.ps1` travam "exatamente 2 pacotes SRD" e vão falhar sem realinhamento
**What goes wrong:** além de `check-migration-version-fallback.tests.ps1` (já citado no
CONTEXT.md e no ROADMAP como algo a realinhar), esta pesquisa confirmou por leitura direta
mais dois gates com contagem hardcoded que quebram ao adicionar um terceiro pack embutido:
- `scripts/check-decommission.tests.ps1`: a prova de execução via `node` lança erro se
  `BUILTIN_VERSIONS.length !== 2`, e a asserção estrutural exige exatamente 2 entradas
  `.json` de magia dentro de `PRECACHE` (`if ($spellJsonEntries.Count -ne 2)`).
- `scripts/check-srd-packs.tests.ps1`: itera sobre um array `$editions` hardcoded com só
  `srd-2014-en.json`/`srd-2024-en.json` — não quebra por CONTAGEM, mas não vai testar o pack
  novo a menos que seja estendido (ou, mais seguro, deixado como está e coberto por um gate
  irmão dedicado — ver recomendação abaixo).
**Why it happens:** esses gates foram escritos na Fase 6 para travar exatamente o estado
"decomissionado com 2 SRD embutidos" — não previam uma terceira entrada legítima.
**How to avoid:** no MESMO commit que adiciona `srd-2024-ptbr.json`/`BUILTIN_VERSIONS`/
`PRECACHE`, atualizar `check-decommission.tests.ps1` (trocar as constantes `2` por `3` nos
dois pontos citados) e `check-migration-version-fallback.tests.ps1` (os 4 casos de teste do
mapa, conforme a tabela do D-08). Recomenda-se NÃO estender `check-srd-packs.tests.ps1`
(que assume exatamente 2 edições e compara atribuições 5.1 vs 5.2 — um terceiro item ali
mudaria a forma do script para pouco ganho) e em vez disso criar
`scripts/check-srd-ptbr-pack.tests.ps1` dedicado, cobrindo D-14 (339 magias, campos
obrigatórios, `level`/`school` batendo com o EN), D-16 (nenhum nome próprio banido em
nenhum campo) e D-18 (nenhuma magia fora do conjunto de `srd-2024-en.json`).
**Warning signs:** `npm test` (que roda `scripts/run-tests.ps1`, descobre todo
`*.tests.ps1` automaticamente) falhando em `check-decommission` ou
`check-migration-version-fallback` depois de a feature estar "pronta".

### Pitfall 7: CRLF e encoding do arquivo-fonte
**What goes wrong:** o arquivo-fonte usa terminadores `CRLF` (confirmado via `file`:
"Unicode text, UTF-8 text, with very long lines (1525), with CRLF line terminators"). Um
parser que faz correspondência de linha por regex com `$` (fim de string) sem cuidado pode
deixar um `\r` sobrando no fim de cada valor extraído (visível como um caractere invisível
no JSON final, ou como falha de `===` em comparações exatas contra o pareamento do D-11).
**Why it happens:** `String.split('\n')` no Node preserva o `\r` residual de cada linha
quando o arquivo é CRLF; ferramentas Unix (`grep`, `sed`, esta própria pesquisa) lidam com
isso automaticamente, mas um script Node ingênuo não.
**How to avoid:** normalizar o texto lido com `.replace(/\r\n/g, '\n')` (ou `\r?\n` nos
splits) logo na leitura do recorte, antes de qualquer parsing.
**Warning signs:** strings no pack final com comprimento "estranho" ou testes de igualdade
contra o oráculo (D-19) falhando por 1 caractere invisível.

## Code Examples

### Divisor de letra (skip, não é magia)
```
B

***

## Badalar Fúnebre
```

### Truque com "Aprimoramento de Truque"
```
## Rajada de Fogo

*Truque de Evocação (Feiticeiro, Mago)*

**Tempo de Conjuração:** Ação
...
**Aprimoramento de Truque.** O dano aumenta em 1d8 quando você atinge os níveis 5 (2d8), 11 (3d8) e 17 (4d8).
```

### Magia renomeada pelo SRD (D-16) — heading traz o nome do PHB, `displayName` não pode
```
## Mão de Bigby

*5º Círculo, Evocação (Feiticeiro, Mago)*
```
→ pack deve gravar `{ "name": "arcane-hand", "displayName": "Mão Arcana", ... }`, nunca
`"displayName": "Mão de Bigby"`.

### Trecho de referência do gerador atual (reuso direto, sem mudança)
```javascript
// Source: scripts/generate-srd-pack.mjs (já no repo)
function toSpell(raw, usedNames) {
  const base = slugify(raw.displayName);
  const name = freeIdentifier(base, usedNames);
  usedNames.add(name);
  const spell = { name, displayName: raw.displayName, level: raw.level, school: raw.school, description: raw.description };
  if (raw.ritual) spell.ritual = true;
  if (raw.concentration) spell.concentration = true;
  // ...demais campos opcionais, sem mudança necessária para a rota pt-BR
  return spell;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Fonte estruturada em JSON (gist do dmcb, dump de nós do Tabyltop) | Fonte em Markdown de prosa contínua (PHB inteiro traduzido) | Nesta fase (troca de fonte em 2026-09-26, dentro da própria discussão da Fase 7) | Exige um parser de gramática textual novo — os dois parsers existentes (`parseSrd51`/`parseSrd52`) não são reaproveitáveis para ESTA etapa, só o pipeline downstream (`toSpell`, validação, escrita) é |
| `duration`/`components` como campos separados e "limpos" (padrão do JSON legado `spells-5E-*.json`) | `duration`/`components` como string única, fiel ao texto-fonte (padrão dos 2 packs EN atuais) | Fase 3 (packs EN) — este pack pt-BR deve seguir o padrão ATUAL, não o legado | Consistência de formato entre os 3 packs embutidos; evita que o comparador de edição/idioma mostre divergência estrutural |

**Deprecated/outdated:** nenhum — não há versão anterior do pack pt-BR embutido a
substituir (os 4 JSONs legados nunca foram um "pack" no formato de `pack.schema.json`).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|----------------|
| A1 | ID de requisito recomendado (`SRD-04`) para a linha "Pacote SRD PT-BR" promovida em `REQUIREMENTS.md` | Phase Requirements | Baixo — é só rotulagem; o planner/discuss pode escolher outro ID sem impacto técnico |
| A2 | Manter o texto "ou Ritual" dentro de `castTime` (em vez de removê-lo depois de setar o booleano `ritual`) é a rota de menor atrito | Architecture Patterns → Pattern 4 | Baixo/médio — se o planner preferir remover o texto, é só uma troca de regex a mais no extrator, não afeta nenhum outro campo |
| A3 | Formato recomendado do recorte do D-17 (JSON com array de strings de bloco Markdown crú) | Recommended Project Structure | Baixo — D-17 deixa o formato a critério do planner; esta é só uma sugestão de partida |
| A4 | Recomendação de dobrar a tabela de "Inseto Gigante" dentro de `description` em vez de usar `statBlock` | Common Pitfalls → Pitfall 4 | Médio — se o planner preferir usar `statBlock` mesmo sem UI, o conteúdo fica presente no pack mas invisível ao usuário até uma fase de UI futura tratar esse campo |

**Se esta tabela estivesse vazia:** não está — as 4 linhas acima são recomendações de
design, não fatos verificados; todos os fatos numéricos/estruturais deste documento (contagens,
posições de linha, nomes de arquivo, conteúdo de gates) vêm de leitura direta do
Markdown-fonte, do código do app e dos `.tests.ps1` nesta sessão, e estão marcados
implicitamente como `[VERIFIED: leitura direta nesta sessão]` ao longo do texto.

## Open Questions (RESOLVED)

1. **Formato exato do recorte do D-17**
   - What we know: precisa conter a seção "Licença" (linhas 1-76) e os 339 blocos de magia,
     nunca o documento completo; vive em `scripts/srd-sources/`.
   - What's unclear: JSON vs. Markdown puro vs. um arquivo por magia.
   - Recommendation: JSON com array de blocos crus (ver "Recommended Project Structure") —
     decisão final do planner.
   - RESOLVED (07-01): JSON `scripts/srd-sources/srd-5.2-ptbr-source.json` com blocos crus.

2. **Tratamento final de `castTime` com "ou Ritual"**
   - What we know: o padrão hoje nos packs EN não separa esse texto do campo.
   - What's unclear: se o planner prefere manter fiel ao padrão EN (recomendado, A2) ou
     limpar o texto já que o booleano `ritual` existe.
   - Recommendation: manter fiel ao padrão EN por consistência entre os 3 packs.
   - RESOLVED (07-02): `castTime` mantém "ou Ritual", fiel ao padrão EN.

3. **`statBlock` vs. tabela embutida em `description` para "Inseto Gigante"**
   - What we know: `statBlock` não é lido por nenhum componente hoje.
   - What's unclear: se uma fase de UI futura vai consumir esse campo, o que tornaria
     melhor já popular `statBlock` mesmo sem exibição imediata.
   - Recommendation: usar `description` (visível já nesta fase) — é a única magia do
     recorte de 339 afetada por esta escolha, então o custo de trocar depois é baixíssimo.
   - RESOLVED (07-02): tabela de stat de `giant-insect` e `summon-dragon` vai em `description`, nunca em `statBlock`.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Rodar `generate-srd-pack.mjs` e o extrator novo | ✓ | v24.15.0 (verificado: `node --version`) | — |
| PowerShell (`pwsh`) | Rodar os gates `.tests.ps1` (`scripts/run-tests.ps1`) | ✓ | 7.6.6 (verificado: `pwsh -v`) | — |
| Arquivo-fonte Heróis Anônimos | Extração de todo o conteúdo pt-BR | ✓ | Local, `.gitignore`d (verificado: arquivo presente, 21.813 linhas, 1,4 MB) | — |
| `spells-5E-2024-PTBR.json` legado | Oráculo (D-19) e tabela de pareamento (D-11) | ✓ | Recuperável via `git show 98740fe^:spells-5E-2024-PTBR.json` (verificado nesta sessão — 9.852 linhas, comando funcionou) | — |

**Missing dependencies with no fallback:** nenhuma.

**Missing dependencies with fallback:** nenhuma.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Nenhum framework de testes — gates estáticos `.tests.ps1` (convenção do projeto, confirmada em todas as fases anteriores) |
| Config file | Nenhum — `scripts/run-tests.ps1` descobre todo `scripts/*.tests.ps1` automaticamente via `Get-ChildItem` |
| Quick run command | `pwsh -NoProfile -File scripts/check-srd-ptbr-pack.tests.ps1` (gate novo desta fase, uma vez criado) |
| Full suite command | `npm test` (= `pwsh -NoProfile -File scripts/run-tests.ps1`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|---------------------|--------------|
| D-14 | Pack tem 339 magias, nenhuma `description` vazia, todo `name` existe em `srd-2024-en.json`, `level`/`school` batendo, `meta.license.*`/`meta.lang` corretos | static gate + node proof | `pwsh -NoProfile -File scripts/check-srd-ptbr-pack.tests.ps1` | ❌ Wave 0 (gate novo) |
| D-16 | Nenhum nome próprio banido (Bigby, Tasha, Otiluke, Mordenkainen, Melf, Leomund, Rary, Evard, Drawmij, Tenser, Nystul, Otto) aparece em nenhum campo do pack pt-BR | static gate | mesmo arquivo acima | ❌ Wave 0 |
| D-18 | Nenhuma magia fora do conjunto de `srd-2024-en.json` entra no pack | static gate | mesmo arquivo acima | ❌ Wave 0 |
| D-08 | `LEGACY_VERSION_FALLBACK` resolve as 4 chaves legadas conforme a tabela nova | static gate + node proof (padrão já existente) | `pwsh -NoProfile -File scripts/check-migration-version-fallback.tests.ps1` (realinhar, não criar) | ✅ (existe, precisa de edição) |
| SRD-01/SRD-03 (decomissão continua válida) | `BUILTIN_VERSIONS` tem N entradas SRD válidas (N passa de 2 para 3), `PRECACHE` tem N JSONs de magia | static gate + node proof | `pwsh -NoProfile -File scripts/check-decommission.tests.ps1` (realinhar, não criar) | ✅ (existe, precisa de edição) |
| D-15 | Conferência humana de ~10 magias (tabela, lista, upgrade, uma das 17 renomeadas) | manual-only | QA manual no navegador — sem comando automatizável (é revisão de conteúdo traduzido) | N/A — manual por natureza |

### Sampling Rate

- **Per task commit:** rodar o(s) gate(s) tocado(s) diretamente (`pwsh -NoProfile -File scripts/check-<nome>.tests.ps1`).
- **Per wave merge:** `npm test` (suíte completa).
- **Phase gate:** suíte completa verde + QA manual do D-15 antes de `/gsd-verify-work`.

### Wave 0 Gaps

- [ ] `scripts/check-srd-ptbr-pack.tests.ps1` — cobre D-14/D-16/D-18 (gate novo).
- [ ] Edição de `scripts/check-decommission.tests.ps1` — trocar as constantes de contagem
  "2" por "3" nos dois pontos identificados (estrutural + prova de execução `node`).
- [ ] Edição de `scripts/check-migration-version-fallback.tests.ps1` — atualizar os 4 casos
  de teste do mapa `LEGACY_VERSION_FALLBACK` conforme a tabela do D-08.
- [ ] Nenhuma edição necessária em `scripts/check-srd-packs.tests.ps1` (mantido como gate
  específico dos 2 packs EN; o pack pt-BR ganha gate próprio).

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | não | projeto não tem contas/autenticação (restrição travada do projeto) |
| V3 Session Management | não | idem |
| V4 Access Control | não | idem |
| V5 Input Validation | sim, mas indireta | o pack pt-BR é gerado por script de build a partir de uma fonte local de confiança (não é entrada de usuário em tempo de execução) — a validação real de HTML malicioso já existe na camada de IMPORT de pacotes de terceiro (`pack-import.jsx`/DOMPurify, Fase 3), que os 3 packs embutidos NÃO atravessam hoje (mesmo comportamento dos 2 packs EN já existentes) |
| V6 Cryptography | não | não aplicável a este pipeline |

### Known Threat Patterns for este stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|-----------------------|
| HTML malformado/malicioso entrando no pack embutido via erro do extrator (ex.: `htmlEscape()` esquecido em algum campo) | Tampering | `htmlEscape()` já existente aplicado a todo texto solto antes de virar HTML — mesma disciplina do gerador EN; o gate novo (D-14) deve incluir uma checagem de que nenhum campo contém `<script` ou `on\w+=` crú, espelhando a preocupação de XSS mesmo que a fonte seja "confiável" (defesa em profundidade, já que o texto final chega ao mesmo sink `dangerouslySetInnerHTML` que packs BYOD usam) |
| Reintrodução acidental de texto protegido (os 4 `spells-5E-*.json`) através do extrator novo | Tampering / regra de proveniência (D-05 da Fase 3) | O extrator NUNCA lê `spells-5E-*.json` — só lê o recorte do D-17 e (para pareamento, nunca descrição) os fixtures de teste regenerados; o gate `check-srd-packs.tests.ps1` já prova ausência de referência literal a `spells-5E` no gerador — o gate novo (D-14/D-16) deve repetir essa mesma prova para o extrator pt-BR |

## Sources

### Primary (HIGH confidence — leitura direta nesta sessão)
- `docs/superpowers/herois_anonimos/D&D 5.5 - Livro do Jogador (2024) 5.3.7.md` — gramática
  de bloco de magia, seção de licença, divisores, legendas, tabelas/listas, terminologia de
  classe. Todos os números e trechos citados vêm de `grep`/`sed`/`python3` sobre este
  arquivo nesta sessão.
- `scripts/generate-srd-pack.mjs` — pipeline existente, helpers reutilizáveis, formato
  intermediário produzido pelos dois extratores atuais.
- `pack.schema.json` — forma exigida de `meta`/`spells[]`, confirmação de que `lang: 'ptbr'`
  já é aceito e de que `statBlock` existe no schema.
- `spells-data-loader.jsx` — `BUILTIN_VERSIONS`, `LEGACY_VERSION_FALLBACK`,
  `_initialVersionKey()`, `adaptSpell()`, `CLASS_PT`/`CLASS_EN`/`SCHOOL_INDEX`, `mdToHtml()`.
- `sw.js` — `CACHE_VERSION`, `PRECACHE`, regra de bump.
- `scripts/check-decommission.tests.ps1`, `scripts/check-migration-version-fallback.tests.ps1`,
  `scripts/check-srd-packs.tests.ps1`, `scripts/check-pack-wiring.tests.ps1`,
  `scripts/check-content-lang-ownership.tests.ps1`, `scripts/check-srd-name-and-markdown.tests.ps1`,
  `scripts/check-class-filter-canonical.tests.ps1` — leitura completa nesta sessão.
- `git show 98740fe^:spells-5E-2024-PTBR.json` — recuperação e inspeção do JSON legado
  (oráculo D-19, tabela de pareamento D-11).
- `srd-2024-en.json` — verificação de quais spells existem no conjunto de 339 (Pitfall 3),
  formato de `components`/`duration`/`class` (Pitfall 5, Pitfall 2), ausência de
  `<table>`/`<ul>` no pack EN atual.
- `.gitignore`, `package.json` — confirmação da entrada já existente para a fonte pt-BR e
  ausência de dependências novas.

### Secondary (MEDIUM confidence)
- `.planning/phases/03-srd-pack-import-pipeline/03-SRD-SOURCE.md` — convenção de seção por
  fonte (URL, licença, data, o que foi tomado), usada como molde para a seção nova que esta
  fase deve acrescentar ali (não escrita nesta pesquisa, é tarefa do planner/execução).
- `.planning/phases/07-traducao-srd-ptbr/07-CONTEXT.md` — decisões travadas do usuário
  (fonte primária de todas as decisões D-01 a D-19 citadas acima).

### Tertiary (LOW confidence)
- Nenhuma — esta pesquisa não usou WebSearch/Context7; todo achado técnico vem de leitura
  direta de arquivos locais (fonte, código, gates) nesta sessão.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — nenhuma dependência nova, reuso confirmado por leitura do código existente.
- Architecture: HIGH — pipeline e pontos de integração lidos diretamente; gramática do Markdown-fonte medida com grep/sed/python sobre o arquivo real, não estimada.
- Pitfalls: HIGH — todos os 7 pitfalls vêm de medição direta (contagens, posições de linha, comparação de packs), não de suposição sobre como Markdown "normalmente" se comporta.

**Research date:** 2026-09-26
**Valid until:** a fonte-Markdown pode ser revisada pelo Heróis Anônimos (documento em
"revisão contínua", per CONTEXT.md) — esta pesquisa vale enquanto a versão 07/03/2025 do
arquivo local não mudar. Recomenda-se validade de 30 dias ou até a próxima leitura do
arquivo-fonte, o que vier primeiro.
