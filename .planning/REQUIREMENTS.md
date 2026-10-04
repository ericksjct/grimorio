# Requirements: Grimório do Jogador — Milestone v2.0 Plugins BYOD

**Defined:** 2026-07-18
**Core Value:** Players can quickly find, prepare, and reference the right spells for their character, fully offline, with zero setup.
**Milestone goal:** Transformar o app de "dados embutidos" em "casca + plugins": o usuário instala os pacotes de magias que quiser (arquivo/URL), o app embute só conteúdo livre (SRD/CC-BY), e os 4 JSONs protegidos saem da distribuição.

## v2.0 Requirements

### PKG — Formato & Import

- [x] **PKG-01**: Autor de pacote pode descrever seu pack num JSON = schema atual de magias + cabeçalho `meta` (nome, autor, versão, licença, `source` único). O formato é publicado como JSON Schema (`pack.schema.json`) + página de docs para autores — schema é ao mesmo tempo a documentação oficial e o validador do import. `name` de cada magia é documentado como ID estável (qualquer string única dentro do pack; não precisa ser inglês)
- [x] **PKG-02**: Usuário pode instalar um pacote a partir de um arquivo do dispositivo (`input[type=file]`)
- [x] **PKG-03**: Usuário pode instalar um pacote a partir de uma URL, com a limitação de CORS explicada na própria UI (hosts compatíveis: raw.githubusercontent, Gist, jsDelivr)
- [x] **PKG-04**: Import valida o pacote antes de gravar: conformidade com o schema, JSON malformado, tamanho máximo, bloqueio de chaves `__proto__`/`constructor`/`prototype`, unicidade do `source` contra os packs já instalados
- [x] **PKG-05**: Import sanitiza o HTML das descrições (DOMPurify via CDN+SRI, whitelist explícita de tags) — nenhum conteúdo não-sanitizado chega aos 4 render sinks (`dangerouslySetInnerHTML`) existentes
- [ ] **PKG-06**: `meta.image` é campo opcional do schema de pack, aceito como `data:` URI de imagem raster (PNG/JPEG/WebP/GIF) de até 200 KB ou como URL `https://` absoluta de até 2048 caracteres; o import valida formato e tamanho sem buscar a URL e rejeita, antes de qualquer gravação, com mensagem própria em linguagem simples e no idioma da interface dizendo o que é aceito; a imagem só é exibida por `<img>`, sem enviar referrer, e nunca por `http://` ou outro esquema; imagem externa que não carrega (offline, 404, host bloqueado) cai no placeholder gerado

### STOR — Armazenamento

- [x] **STOR-01**: Pacotes instalados persistem em IndexedDB como JSON cru sanitizado (mesma forma dos arquivos; `adaptSpells()` continua o único ponto de normalização)
- [x] **STOR-02**: App solicita armazenamento persistente (`navigator.storage.persist()`) para mitigar a eviction de 7 dias do Safari
- [x] **STOR-03**: Usuário pode exportar um pacote instalado de volta para arquivo (backup/recuperação — crítico para o cenário de eviction do Safari)

### MGMT — Gerenciamento

- [x] **MGMT-01**: Usuário vê a lista de pacotes instalados (nome, versão, nº de magias, source)
- [x] **MGMT-02**: Usuário pode remover um pacote; preparadas/favoritas que referenciam magias do pack removido degradam graciosamente (somem da lista ativa sem crash, voltam se o pack for reinstalado)
- [x] **MGMT-03**: Seletor de versões enumera os pacotes instalados dinamicamente (substitui as 4 entradas fixas de `SPELL_VERSIONS`)
- [x] **MGMT-04**: Duplicatas entre pacotes são nota informativa ("2 versões de Bola de Fogo: SRD, MeuPack"), não conflito bloqueante — identidade de magia é `(source, name)`
- [x] **MGMT-05**: Estado vazio (zero pacotes instalados) explica o que é um pacote e aponta para o import
- [x] **MGMT-06**: Usuário pode marcar quantos pacotes quiser (SRD embutidos e homebrew) ao mesmo tempo; a grade mostra a união das magias de todos os marcados, cada magia no idioma do seu pacote, sem prioridade nem ocultação silenciosa entre homebrews
- [ ] **MGMT-07**: O slug (`name`) de magia é identidade única entre os pacotes selecionados; o import detecta colisão contra os slugs reservados do SRD e os pacotes instalados, renomeia automaticamente os slugs conflitantes do pacote que entra com o sufixo do pack (`slug-<pack>`, `-2`/`-3` se ocupado), instala sem prompt e avisa no idioma da interface (toast e tela de sucesso) quais slugs foram renomeados; a seleção detecta colisão contra os pacotes marcados e abre um prompt de renomeação do pacote que entra — cancelar aborta sem marcar; nenhuma preparada/favorita é reescrita; o export devolve o pacote renomeado; a lista de slugs reservados é publicada (JSON gerado + `pack-docs.html`) e consultável no menu
- [ ] **MGMT-08**: Seleção vazia é permitida no menu; com ela a grade mostra o pacote padrão (SRD 5.2 no idioma do navegador) e nunca fica vazia, e um aviso no idioma da interface explica a troca
- [ ] **MGMT-09**: Um menu de pacotes único — cartões com imagem, título e descrição derivada, seleção por checkbox, import, remoção, licença/atribuição e seção de slugs reservados — substitui o seletor de versão e absorve o gerenciador de pacotes, aberto por um chip que mostra o primeiro pacote + contagem

### SRD — Pacote embutido

- [x] **SRD-01**: Dois pacotes SRD EN embutidos, um por edição (5.1/2014 e 5.2/2024), com conteúdo vindo de fonte com licença verificada e registrada — nunca dos arquivos `spells-5E-*.json` atuais; cada pacote carrega em `meta.license` o texto de atribuição verbatim da sua edição mais a nota de modificação
- [x] **SRD-02**: Atribuição CC-BY visível no app, com o texto verbatim exato da versão de SRD usada (5.1 e 5.2 têm textos distintos; modificações ao texto-fonte anotadas)
- [x] **SRD-03**: Pacote SRD vem pré-instalado — primeira abertura nunca é vazia
- [x] **SRD-04**: Pacote SRD 5.2 embutido em pt-BR (`srd-2024-ptbr.json`), com as 339 magias do SRD 5.2 na tradução CC-BY-4.0 do Heróis Anônimos — recorte que nunca inclui magia ou conteúdo fora do SRD 5.2 nem byte dos `spells-5E-*.json`; `name` é o slug EN (preparadas/favoritas continuam resolvendo), atribuição dupla verbatim (WotC + Heróis Anônimos) com nota de modificação própria; é o padrão para navegador em português e o destino das chaves legadas `*-PTBR`

- [ ] **SRD-05**: SRD 5.1 e SRD 5.2 são mutuamente exclusivos na seleção (marcar um desmarca o outro; num `?v=` com os dois, vence o que vem por último na lista); SRD da mesma edição em idiomas diferentes coexistem, e numa colisão de slug entre eles vence o pacote no idioma da interface, sem prompt de renomear

*SRD-01 reescrito em 2026-07 pela decisão D-05 da Fase 3 — ver `.planning/phases/03-srd-pack-import-pipeline/03-CONTEXT.md`.*
*SRD-04 promovido de Future Requirements (v2.x) em 2026-09-26 — a fonte deixou de ser tradução própria e passou a ser a tradução CC-BY do Heróis Anônimos recortada ao SRD 5.2; ver .planning/phases/07-traducao-srd-ptbr/07-CONTEXT.md.*
*PKG-06 e MGMT-07 revisados em 2026-09-30 depois do checkpoint 08-07 (GAP-2/GAP-3) — ver emendas E-01..E-03 em `.planning/phases/08-composicao-aditiva-de-pacotes/08-CONTEXT.md`; os dois ficam Pending até o checkpoint 08-12.*

### MIGR — Descomissionamento

- [x] **MIGR-01**: Migração preserva referências de preparadas/favoritas de usuários existentes; referências que ficarem órfãs são sinalizadas, nunca descartadas em silêncio
- [x] **MIGR-02**: Os 4 JSONs protegidos saem do site/repo (HEAD) e do precache do service worker (que passa a precachear só o SRD)
- [x] **MIGR-03**: Usuário existente recebe orientação na primeira visita pós-migração de como importar o próprio pacote
- [ ] **MIGR-04**: `spellbook-ui-prefs.versionKey` existente vira seleção de um item na primeira carga (fallback legado aplicado antes da conversão) e a seleção passa a persistir em `spellbook-ui-prefs.selectedVersionKeys`; `?v=` aceita lista separada por vírgula, retrocompatível com um único valor, e chave de pack ainda não enumerado fica pendente por item

### I18N — Idioma da interface

- [x] **I18N-01**: idioma da interface é estado próprio, persistido em `spellbook-ui-prefs`, independente da versão ativa
- [x] **I18N-02**: o toggle controla a interface e funciona com zero entradas `lang: 'ptbr'` no registro de versões
- [x] **I18N-03**: modo misto coerente — chrome no idioma da UI, conteúdo no idioma do pack, `lang` marcado por região conforme WCAG 3.1.2

## Future Requirements (v2.x)

- [ ] Checagem manual de atualização de pack por URL (re-fetch + comparação de versão, confirmação explícita antes de sobrescrever)
- [ ] Conversor "formato 5etools → formato do app" no import — destrava o ecossistema de homebrew existente sem adotar o formato complexo do 5etools internamente
- [ ] Página de docs listando packs conhecidos da comunidade (documentação, não infraestrutura)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Marketplace/catálogo central de packs | Exige backend, moderação e hosting — viola a restrição travada "sem backend, sem contas" |
| Auto-update silencioso de packs | Reescrever conteúdo importado (possivelmente editado à mão) sem consentimento viola a premissa BYOD "seus dados, seu controle" |
| UI de merge/overwrite estilo Foundry | Namespacing por `(source, name)` já evita colisões reais; merge dialog é complexidade sem benefício num app só de magias |
| Plugins executáveis (JS em packs) | Superfície de segurança enorme para benefício zero — packs são estritamente dados |
| Rewrite do histórico do git | Higiene, não compliance: forks/clones retêm os arquivos de qualquer forma; a proteção real é a mudança de arquitetura. Remoção é só do HEAD |
| Embutir conteúdo não-livre "pra ajudar" | Recria exatamente o problema de copyright que este milestone existe pra resolver |
| Backend, database, ou contas de usuário | Restrição permanente do projeto (local-only, offline-first) |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| STOR-01 | Phase 2 | Complete |
| STOR-02 | Phase 2 | Complete |
| STOR-03 | Phase 2 | Complete |
| PKG-01 | Phase 3 | Complete |
| PKG-02 | Phase 3 | Complete |
| PKG-03 | Phase 3 | Complete |
| PKG-04 | Phase 3 | Complete |
| PKG-05 | Phase 3 | Complete |
| SRD-01 | Phase 3 | Complete |
| SRD-03 | Phase 4 | Complete |
| MGMT-01 | Phase 5 | Complete |
| MGMT-02 | Phase 5 | Complete |
| MGMT-03 | Phase 5 | Complete |
| MGMT-04 | Phase 5 | Complete |
| MGMT-05 | Phase 5 | Complete |
| SRD-02 | Phase 5 | Complete |
| MIGR-01 | Phase 6 | Complete |
| MIGR-02 | Phase 6 | Complete |
| MIGR-03 | Phase 6 | Complete |
| I18N-01 | Phase 04.1 | Complete |
| I18N-02 | Phase 04.1 | Complete |
| I18N-03 | Phase 04.1 | Complete |
| SRD-04 | Phase 7 | Complete |
| MGMT-06 | Phase 8 | Complete |
| MGMT-07 | Phase 8 | Pending |
| MGMT-08 | Phase 8 | Pending |
| MGMT-09 | Phase 8 | Pending |
| PKG-06 | Phase 8 | Pending |
| SRD-05 | Phase 8 | Pending |
| MIGR-04 | Phase 8 | Pending |

**Coverage:**

- v2.0 requirements: 30 total (corrected from a stale "16 total" note in this file's initial draft — the requirement list itself had 5 PKG + 3 STOR + 5 MGMT + 3 SRD + 3 MIGR = 19 items before Phase 04.1 added 3 I18N items; Phase 7 promoted SRD-04 from Future Requirements, +1; Phase 8 added MGMT-06..09, PKG-06, SRD-05, MIGR-04, +7)
- Mapped to phases: 30
- Unmapped: 0

---
*Requirements defined: 2026-07-18 (milestone v2.0)*
*Previous milestone (v1, maintenance mode): ANIM-01..04 verified manually and closed 2026-07-17*
*Roadmap created: 2026-07-18 — Phases 2-6 (see .planning/ROADMAP.md)*
