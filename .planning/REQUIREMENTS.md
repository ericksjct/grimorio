# Requirements: Grimório do Jogador — Milestone v2.0 Plugins BYOD

**Defined:** 2026-07-18
**Core Value:** Players can quickly find, prepare, and reference the right spells for their character, fully offline, with zero setup.
**Milestone goal:** Transformar o app de "dados embutidos" em "casca + plugins": o usuário instala os pacotes de magias que quiser (arquivo/URL), o app embute só conteúdo livre (SRD/CC-BY), e os 4 JSONs protegidos saem da distribuição.

## v2.0 Requirements

### PKG — Formato & Import

- [ ] **PKG-01**: Autor de pacote pode descrever seu pack num JSON = schema atual de magias + cabeçalho `meta` (nome, autor, versão, licença, `source` único). O formato é publicado como JSON Schema (`pack.schema.json`) + página de docs para autores — schema é ao mesmo tempo a documentação oficial e o validador do import. `name` de cada magia é documentado como ID estável (qualquer string única dentro do pack; não precisa ser inglês)
- [ ] **PKG-02**: Usuário pode instalar um pacote a partir de um arquivo do dispositivo (`input[type=file]`)
- [ ] **PKG-03**: Usuário pode instalar um pacote a partir de uma URL, com a limitação de CORS explicada na própria UI (hosts compatíveis: raw.githubusercontent, Gist, jsDelivr)
- [ ] **PKG-04**: Import valida o pacote antes de gravar: conformidade com o schema, JSON malformado, tamanho máximo, bloqueio de chaves `__proto__`/`constructor`/`prototype`, unicidade do `source` contra os packs já instalados
- [ ] **PKG-05**: Import sanitiza o HTML das descrições (DOMPurify via CDN+SRI, whitelist explícita de tags) — nenhum conteúdo não-sanitizado chega aos 4 render sinks (`dangerouslySetInnerHTML`) existentes

### STOR — Armazenamento

- [ ] **STOR-01**: Pacotes instalados persistem em IndexedDB como JSON cru sanitizado (mesma forma dos arquivos; `adaptSpells()` continua o único ponto de normalização)
- [ ] **STOR-02**: App solicita armazenamento persistente (`navigator.storage.persist()`) para mitigar a eviction de 7 dias do Safari
- [ ] **STOR-03**: Usuário pode exportar um pacote instalado de volta para arquivo (backup/recuperação — crítico para o cenário de eviction do Safari)

### MGMT — Gerenciamento

- [ ] **MGMT-01**: Usuário vê a lista de pacotes instalados (nome, versão, nº de magias, source)
- [ ] **MGMT-02**: Usuário pode remover um pacote; preparadas/favoritas que referenciam magias do pack removido degradam graciosamente (somem da lista ativa sem crash, voltam se o pack for reinstalado)
- [ ] **MGMT-03**: Seletor de versões enumera os pacotes instalados dinamicamente (substitui as 4 entradas fixas de `SPELL_VERSIONS`)
- [ ] **MGMT-04**: Duplicatas entre pacotes são nota informativa ("2 versões de Bola de Fogo: SRD, MeuPack"), não conflito bloqueante — identidade de magia é `(source, name)`
- [ ] **MGMT-05**: Estado vazio (zero pacotes instalados) explica o que é um pacote e aponta para o import

### SRD — Pacote embutido

- [ ] **SRD-01**: Pacote SRD CC-BY (EN) gerado a partir dos dados atuais, filtrado ao subconjunto licenciado livre
- [ ] **SRD-02**: Atribuição CC-BY visível no app, com o texto verbatim exato da versão de SRD usada (5.1 e 5.2 têm textos distintos; modificações ao texto-fonte anotadas)
- [ ] **SRD-03**: Pacote SRD vem pré-instalado — primeira abertura nunca é vazia

### MIGR — Descomissionamento

- [ ] **MIGR-01**: Migração preserva referências de preparadas/favoritas de usuários existentes; referências que ficarem órfãs são sinalizadas, nunca descartadas em silêncio
- [ ] **MIGR-02**: Os 4 JSONs protegidos saem do site/repo (HEAD) e do precache do service worker (que passa a precachear só o SRD)
- [ ] **MIGR-03**: Usuário existente recebe orientação na primeira visita pós-migração de como importar o próprio pacote

## Future Requirements (v2.x)

- [ ] Checagem manual de atualização de pack por URL (re-fetch + comparação de versão, confirmação explícita antes de sobrescrever)
- [ ] Conversor "formato 5etools → formato do app" no import — destrava o ecossistema de homebrew existente sem adotar o formato complexo do 5etools internamente
- [ ] Pacote SRD PT-BR — bloqueado em tradução própria do texto CC-BY (a tradução oficial é protegida)
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
| — | — | — |

**Coverage:**
- v2.0 requirements: 16 total
- Mapped to phases: 0
- Unmapped: 16 (roadmap pending)

---
*Requirements defined: 2026-07-18 (milestone v2.0)*
*Previous milestone (v1, maintenance mode): ANIM-01..04 verified manually and closed 2026-07-17*
