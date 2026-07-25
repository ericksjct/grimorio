# Phase 3: SRD Pack & Import Pipeline - Context

**Gathered:** 2026-07-25
**Status:** Ready for planning

<domain>
## Phase Boundary

O usuário instala um pack de magias de sua escolha — arquivo do dispositivo ou URL compatível — e todo pack passa por validação + sanitização de HTML antes de qualquer gravação em storage. Em paralelo, o conteúdo SRD passa a existir como pack(s) real(is), no mesmo formato, instalável pelo mesmo pipeline.

Requisitos cobertos: PKG-01, PKG-02, PKG-03, PKG-04, PKG-05, SRD-01.

**Não é desta fase:** o gerenciador de packs (listar/remover), o seletor de versões dinâmico e a exibição da atribuição na UI (Fase 5); a integração do loader com dispatch por `source` (Fase 4); a remoção dos 4 JSONs protegidos (Fase 6).

</domain>

<decisions>
## Implementation Decisions

### Edição do SRD

- **D-01:** Embutir **os dois SRDs** — 5.1 (2014) e 5.2 (2024) — como dois packs separados, um por edição. Preserva a identidade dual-edition do app e já exercita o dispatch multi-pack da Fase 4 com conteúdo real.
- **D-02:** Ambos são **EN-only**. Consequência já travada em REQUIREMENTS (SRD PT-BR está bloqueado por tradução, é v2.x): o seletor pós-Fase 6 fica com 2 entradas EN embutidas + o que o usuário importar.
- **D-03:** O texto verbatim de atribuição CC-BY vive **no `meta` do pack**, não hardcoded no app. A Fase 5 renderiza o que o pack declara. Isso vale para os dois SRDs (textos legais distintos — ver `.planning/research/FEATURES.md` §"SRD CC-BY-4.0 Attribution Requirements") e permite que packs de terceiros declarem a própria licença. O campo entra no schema publicado (PKG-01).
- **D-04:** A indicação de modificação exigida pela CC-BY é uma **nota genérica no `meta`** (do tipo "texto reformatado para JSON e HTML estrutural; conteúdo não alterado"), exibida junto da atribuição. Sem changelog detalhado.

### Geração do pack SRD

- **D-05:** **CORREÇÃO DE REQUISITO — SRD-01.** O requisito hoje diz "Pacote SRD CC-BY (EN) gerado a partir dos dados atuais, filtrado ao subconjunto licenciado livre". Isso **não se sustenta**: a origem do texto das descrições dos 4 JSONs atuais é incerta/mista (confirmado pelo usuário nesta discussão), então filtrar por nome de magia não garante que o texto seja CC-BY. **Regra travada: nenhum byte de descrição dos JSONs atuais entra nos packs SRD.** REQUIREMENTS.md precisa ser atualizado para refletir isso.
- **D-06:** Fonte dos packs SRD, nesta ordem de preferência:
  1. **Dataset público já parseado e explicitamente CC-BY** (SRD-derivado), convertido para o formato do app por script one-shot — preferido se existir para a edição em questão;
  2. **Fallback:** PDFs oficiais da WotC (`SRD_CC_v5.1.pdf`, `SRD_CC_v5.2.pdf`) parseados com **unlimited OCR** (ferramenta nomeada pelo usuário).
  A escolha por edição é resolvida no plan — 5.1 e 5.2 podem acabar em rotas diferentes (o ecossistema 5.2 é mais novo e pode não ter dataset maduro).
- **D-07:** **Isso cria necessidade de investigação leve no plan**, contrariando a nota do ROADMAP ("Fase 3 — Research do plan: NÃO"): localizar e validar a licença dos datasets candidatos para 5.1 e 5.2 antes de escolher a rota. Não é pesquisa de framework; é verificação de fonte de dados + licença.

### Limites e rejeições do import

- **D-08:** **Teto de 10 MB** por pack, aplicado tanto ao arquivo local quanto ao fetch por URL (checar `Content-Length` quando presente e limitar os bytes lidos de qualquer forma). Referência: os JSONs atuais têm 580–750 KB para ~500 magias.
- **D-09:** **`source` duplicado não barra nem substitui — instala com sufixo diferente** (ex.: `meu-homebrew` → `meu-homebrew-2`). A mensagem de sucesso **deve dizer com qual identificador o pack entrou**; instalação silenciosa com nome alterado não é aceitável. Isso é coerente com MGMT-04 (duplicata é nota informativa, não conflito) e com `hifiSpellKey()` sendo pack-agnóstico — magias preparadas não se perdem na troca.
  - Nota de implementação: `pluginStore.putPack()` usa `store.put` (upsert) — a regra de sufixo tem de ser aplicada **antes** da chamada, no pipeline de import; a camada de storage não protege contra sobrescrita.
- **D-10:** **CSP entra nesta fase**, como segunda tranca junto do DOMPurify. Escopo mínimo viável (`script-src` self + as origens de CDN já pinadas), cobrindo também o portal de impressão, que roda em outro contexto. **Condição de saída:** se não for possível fechar uma CSP sem quebrar o Babel standalone / scripts inline com esforço razoável, ela cai fora e vira item de manutenção próprio — não se entrega CSP quebrada, e não se remove o Babel para acomodá-la. Verificação obrigatória: app carrega nos 6 temas × light/dark + impressão funciona.
- **D-11:** Rejeições exigidas pelo PKG-04 continuam valendo: JSON malformado, acima do teto, inválido contra o schema, e chaves `__proto__`/`constructor`/`prototype` — todas antes de qualquer gravação.

### Superfície de UI e docs do autor

- **D-12:** UI de import **mínima e funcional** nesta fase: escolher arquivo, colar URL, mensagem clara de erro/sucesso (incluindo o identificador aplicado por D-09) e o aviso de CORS do PKG-03. Sem acabamento visual — a Fase 5 reaproveita a lógica e dá a forma final. Decisões de "onde vive / desktop vs mobile" permanecem reservadas ao discuss da Fase 5.
- **D-13:** Validação do schema com **validador escrito à mão** (critério do usuário: "o que for mais performático"). Vence por performance total: sem download de biblioteca, sem compilação de schema em runtime, sem peso extra no precache offline. A rejeição de `__proto__`/`constructor`/`prototype` deve acontecer **durante o parse** (reviver do `JSON.parse`), não numa varredura posterior — mais rápido e mais seguro. O `pack.schema.json` publicado continua sendo a documentação oficial e serve para validadores externos; o plan precisa prever como manter código e schema em sincronia.

### Claude's Discretion

- **Onde ficam schema e docs (D-14):** decisão delegada. Rota escolhida: `pack.schema.json` na **raiz do repositório** (ganha URL pública, então um autor aponta validador online direto para ela, ao lado dos JSONs) + uma **página estática simples** de docs do formato, linkada do ponto de import. Atende o PKG-01 ao pé da letra ("JSON Schema + página de docs") sem exigir build. Conteúdo mínimo: campos do `meta`, formato de uma magia, exemplo de pack de 1 magia, e o aviso de CORS/hosts compatíveis.
- **Nomes de arquivo e valores de `source` dos packs SRD:** delegado ao planner (sugestão: `srd-5.1-en` / `srd-5.2-en`, arquivos estáticos na raiz como os JSONs atuais).
- **Onde vive o script de geração dos packs SRD:** delegado. Recomendação: script commitado, rodado manualmente fora do runtime do app (o app não tem build step e não deve ganhar um) — regenerar quando o SRD for atualizado é barato assim.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Arquitetura do plugin engine
- `.planning/research/ARCHITECTURE.md` — desenho do pipeline: onde a sanitização entra, dispatch `source: 'fetch'|'idb'`, funil único via `adaptSpells()`, layout de arquivos previsto. §"SRD pack generation" e §"sanitization" são os trechos diretos desta fase.
- `.planning/research/SUMMARY.md` — resumo do milestone; confirma que o risco dominante é segurança/integridade de dados, não escolha de tecnologia.

### Segurança e validação
- `.planning/research/PITFALLS.md` — Pitfall 1 (4 sinks de `dangerouslySetInnerHTML` sem sanitização hoje, incluindo o portal de impressão que roda em outro contexto), Pitfall 3 (arquivos gigantes, prototype pollution), e a tabela de riscos com a linha de CSP.
- `.planning/codebase/CONCERNS.md` — dívida conhecida, incluindo a ausência de CSP.

### Licença e atribuição
- `.planning/research/FEATURES.md` §"SRD CC-BY-4.0 Attribution Requirements (Concrete)" — textos verbatim de 5.1 e 5.2, regra de que são documentos separados com strings distintas, e a exigência de indicar modificações. **Fonte autoritativa para D-03/D-04.**

### Requisitos e escopo
- `.planning/REQUIREMENTS.md` — PKG-01..05, SRD-01 (ver D-05: precisa de correção), e a tabela Out of Scope.
- `.planning/ROADMAP.md` §"Phase 3" — critérios de sucesso da fase (ver D-07: a nota "Research do plan: NÃO" precisa de correção).

### Código existente
- `plugin-store.jsx` — API de storage da Fase 2 (`putPack`, `getPack`, `getSpells`, `listPacks`, `deletePack`, `exportPack`).
- `spells-data-loader.jsx` — `SPELL_VERSIONS`, `loadVersion()`, `adaptSpells()`; ponto de integração da Fase 4.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `plugin-store.jsx` (Fase 2, completo): `putPack`/`getPack`/`getSpells`/`listPacks`/`deletePack`/`exportPack` expostos em `window.pluginStore`. O import desta fase **grava por aqui** e não deve abrir IndexedDB por conta própria.
- `_assertPackShape()` em `plugin-store.jsx:72` — validação mínima de forma (`id` string não-vazia, `meta` objeto, `spells` array), lançada **antes** de qualquer transação. É o piso, não o teto: a validação de schema do PKG-04 é uma camada acima, no pipeline de import.
- `adaptSpells(json, lang, edition)` em `spells-data-loader.jsx:142` — normalizador único de magias. Packs importados são gravados **crus e sanitizados**, e só passam por `adaptSpells()` no load (Fase 4).

### Established Patterns
- **Durabilidade:** escritas resolvem só no `tx.oncomplete`, nunca no `onsuccess` de request isolado (`plugin-store.jsx:61-63`). Nada de "gravou" otimista.
- **Erros:** erros de IndexedDB propagam sem embrulho (name/message intactos); quem chama decide a mensagem de UI. O import é quem traduz erro em texto para o usuário.
- **Sem build step:** React + Babel standalone via CDN com SRI, JSX transpilado no navegador; a ordem de carga em `index.html` é estrita. Qualquer dependência nova é `<script>` com SRI + entrada no precache do `sw.js`. É a razão de D-13 (validador à mão) e a principal restrição de D-10 (CSP).
- **Sem suite de testes automatizados:** verificação é QA manual no navegador, 6 temas × light/dark.

### Integration Points
- **Escrita:** pipeline de import → `pluginStore.putPack()`. O sufixo de D-09 é resolvido antes dessa chamada (`putPack` faz upsert e sobrescreveria).
- **`meta` é o contrato de listagem:** `listPacks()` retorna **apenas os `meta`** dos registros (`plugin-store.jsx:106-109`). Portanto `meta` precisa carregar identificador (`source`), nome, versão, licença/atribuição, `lang` e contagem de magias — senão a Fase 5 não consegue mapear de volta ao registro nem preencher o seletor de versões.
- **Compatibilidade com o export da Fase 2 (decisão A-02):** `exportPack()` serializa o registro **verbatim, incluindo a chave `id` de topo**. O import precisa aceitar um arquivo assim (tolerar/normalizar `id`), senão o ciclo exportar→reimportar quebra.
- **Sanitização:** DOMPurify (CDN + SRI, whitelist explícita) roda no import, antes da gravação. Os 4 sinks de `dangerouslySetInnerHTML` em `v10-hifi.jsx` — card, painel lateral, tela de detalhe e folha de impressão — não devem ganhar sanitização em runtime; o dado já entra limpo.

</code_context>

<specifics>
## Specific Ideas

- "se houver alguém na web que parseou os SRD para versões mais processáveis, vamos com elas; se não, vamos optar pelos PDFs e usar o **unlimited OCR** para parsear" — ferramenta de fallback nomeada pelo usuário para extrair os PDFs oficiais.
- Duplicata de `source`: "nem remove nem substitui, sobe com um sufixo diferente" — o usuário rejeitou explicitamente tanto barrar quanto sobrescrever.
- Validador: "o que for mais performático" — critério de desempate declarado pelo usuário para essa escolha.

</specifics>

<deferred>
## Deferred Ideas

- **Pack SRD PT-BR** — bloqueado em tradução própria do texto CC-BY (a oficial é protegida). Já registrado em REQUIREMENTS §Future Requirements (v2.x), reconfirmado aqui como consequência de D-02.
- **Atualização manual de pack por URL** (re-fetch + comparação de versão + confirmação antes de sobrescrever) — v2.x. D-09 (sufixo) resolve o caso "reimportei meu pack editado" sem construir fluxo de update.
- **UX final do import** (onde vive, desktop vs mobile, integração com o gerenciador) — Fase 5, por decisão explícita em D-12.
- **CSP como trabalho próprio** — só se D-10 esbarrar no Babel standalone; nesse caso vira item de manutenção separado, não fica esquecido.

</deferred>

---

*Phase: 3-SRD Pack & Import Pipeline*
*Context gathered: 2026-07-25*
