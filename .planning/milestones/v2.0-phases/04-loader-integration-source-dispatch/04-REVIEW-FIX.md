---
phase: 04-loader-integration-source-dispatch
review_path: .planning/phases/04-loader-integration-source-dispatch/04-REVIEW.md
iterations: 2
status: all_fixed
iteration_1:
  findings_in_scope: 13
  fixed: 13
  skipped: 0
  commits: a8bad64..5b1a9e7
iteration_2:
  findings_in_scope: 17
  fixed: 16
  no_change_needed: 1
  commits: 1c95cfa..a4df30f
  plus: 736ff8e (orchestrator, guard strengthening)
---

# Fase 04 — relatório de correções pós-revisão

Duas iterações de `--fix`. A segunda foi invocada com `--all`, então achados
info entraram no escopo.

**Nota sobre este arquivo:** o relatório da iteração 2 escrito pelo agente foi
perdido — ele o escreveu no worktree isolado sem commitar (conforme instruído,
já que o orquestrador é quem commita) e a remoção do worktree levou o arquivo
junto. O conteúdo abaixo referente à iteração 2 foi **reconstruído a partir dos
commits**, que sobreviveram. É a mesma classe de perda que o protocolo de
execução alerta para SUMMARY.md em modo worktree; registrado aqui para não ser
lido como relatório original do agente.

---

## Iteração 1 — 13 achados (Critical + Warning)

1 crítico e 12 warnings da segunda revisão, um commit atômico por achado,
`a8bad64..5b1a9e7`. Detalhe por achado está nas mensagens de commit.

O crítico era `?f.constructor=` num link compartilhado quebrando o app
permanentemente — a mesma classe de defeito do CR-03 da primeira revisão
(`Object.create(null)` nas tabelas de lookup), que tinha sido fechada só no
loader e ficou aberta em `hifiFilterConfig` no `v10-hifi.jsx`.

### O que esta iteração custou

A terceira revisão mostrou que aplicar 13 consertos numa passada **introduziu
dois criticals**:

- Gatear toda a persistência de prefs numa flag de versão pendente (conserto do
  WR-01) suspendia tema, personagem e idioma junto — a flag guardava um campo e
  suprimia cinco.
- Reescrever `HifiLangToggle` (WR-06) sem a preferência de corpus que o WR-07
  acabara de adicionar no chamador irmão, no mesmo pass, mandava leitor de PHB
  para o SRD.

E o sinal de teste era mais fraco do que parecia: **10 dos 13 consertos podiam
ser revertidos por completo com os 24 scripts verdes.** Um dos "testes de
execução" reimplementava a expressão de produção em vez de lê-la do arquivo —
testava a própria cópia.

---

## Iteração 2 — 17 achados (Critical + Warning + Info)

Escopo: `--fix --all`. 16 corrigidos, 1 `no_change_needed`.

Requisito imposto nesta rodada: **mutation testing por conserto** — aplicar,
reverter só a mudança de produção, confirmar que o script guardião falha,
restaurar. A ordem de execução também foi imposta, porque dois achados
interagiam.

| Commit | Achado | Produção | Guarda |
|--------|--------|----------|--------|
| `1c95cfa` | CR-02 + WR-06 + WR-02 | `v10-hifi.jsx` | `check-edition-compare` |
| `163d42c` | CR-01 | `spells-data-loader.jsx` | `check-source-dispatch` |
| `33f4227` | WR-05 | `spells-data-loader.jsx` | `check-source-dispatch` |
| `e7935c3` | WR-03 | — (só cobertura) | 3 scripts |
| `2abe424` | CR-03 | `v11-character-editor.jsx` | — |
| `c85de29` | WR-01 | `spells-data-loader.jsx` | — |
| `58e92f6` | WR-04 | `pack-import-dialog.jsx` | `check-pack-import-dialog` |
| `f8534b5` | IN-01 | `spells-data-loader.jsx` | — |
| `a9880e5` | IN-03, IN-04 | `sw.js` | — |
| `f46be4f` | IN-06 | `v10-hifi.jsx` | — |
| `3f4cccf` | IN-07 | `plugin-store.jsx` | `check-plugin-store` |
| `a4df30f` | IN-08 | `i18n.jsx` | `check-pack-import-dialog` |

O conserto central foi extrair `hifiSiblingVersion()` como helper único usado
por `HifiLangToggle` **e** `useEditionCompare`, para que a preferência de corpus
não possa mais divergir entre os dois — foi a divergência que criou o CR-02.

---

## Verificação independente do orquestrador

O relatório do agente não foi aceito na palavra.

### Suíte estrutural

24/24 verde, re-executada do zero. Raiz do repositório sem resíduo.

### Mutation testing próprio — encontrou um buraco no guarda do CR-02

Espelhando o repo via `git archive` e revertendo o conserto do CR-02:

| Mutação | Pego? |
|---------|-------|
| Revert **completo** (as duas linhas de seleção de irmão) | ✓ `check-edition-compare` |
| **Deriva parcial** (só a linha `pt`, mantendo a `en`) | ✗ passava com 24/24 verde |

Deriva parcial entre dois call sites irmãos é **exatamente a forma do CR-02** —
o guarda cobria o revert completo mas não a forma do próprio bug que guarda.

Corrigido em `736ff8e`: a assertion passa a contar as **duas** chamadas dentro
de `HifiLangToggle` e a proibir seleção de irmão por idioma via `find()` cru.
A proibição é estreita de propósito — `versions.find(v => v.key === versionKey)`
resolve a versão corrente e é legítimo; a primeira versão da assertion proibia
`find()` em bloco e **reprovava o código bom**, o que só apareceu porque a suíte
foi rodada antes de commitar.

Revalidado: deriva parcial → exit 1; variante que mantém duas chamadas ao helper
mas põe um `find()` por idioma ao lado → exit 1; código bom → 24/24.

### Regressão comportamental em Chromium — 16/16

A suíte anterior (16/16 também) **não pegou nenhuma das duas regressões** da
iteração 1, porque nunca exercitou o toggle PT/EN nem a persistência de tema e
personagem. Esta cobre os dois buracos:

| Cenário | Resultado |
|---------|-----------|
| **CR-02** toggle EN a partir do PHB 2024 PT-BR | vai para `spells-5E-2024-EN`, **411 magias** (o bug mandava para `srd-2024-en`, 339) |
| **CR-02** toggle PT de volta | volta para `spells-5E-2024-PTBR` |
| **CR-01** clique no tema grava nas prefs, com preferência apontando a pack inexistente | `dark:false` → `dark:true` |
| **CR-01** tema persiste após recarga nesse mesmo estado | prefs idênticas |
| **CR-01** app não-vazio com preferência pendente morta | 391 magias |
| **CR-03** `?build=` com 3 payloads hostis (comprimento gigante, `toString` objeto, base64 inválido) | aba responsiva nos três |
| Rodada 2: `?f.constructor=` e `?f.__proto__=` | seguem fechados |
| Sanitização no import | HTML armazenado limpo |
| Selecionar pack pela UI real + persistir após recarga | 2 magias, chave correta |
| Preferência inventada | cai na padrão |

---

## Pendências conhecidas, deliberadamente fora de escopo

**`grimorio-helpers.jsx` — escola desconhecida vira Evocação.** O WR-05 fez o
loader propagar `school: null` honestamente quando o pack de terceiro não
declara, mas `schoolKey()`/`schoolName()` ainda caem em Evocação para índice
desconhecido. Um pack com escola não reconhecida **exibe e filtra** como
Evocação. A terceira revisão confirmou que isso **não piorou** com o WR-05 (o
loader já substituía por `4` antes). Fechar toca um helper compartilhado não
revisado, um novo valor de filtro, estilo de chip e i18n em ~5 pontos de render.

**IN-05 — a fixture hostil de QA é servida na origem do deploy.** Marcada
`no_change_needed` ou não corrigida nesta rodada; continua acessível em
`scripts/qa-fixtures/hostile-html.json`. Não é executável por si só (é dado, não
script, e passa pela sanitização no import como qualquer pack), mas vale decidir
se deve sair do que é publicado.

**Sem setter público de versão.** O WR-11 da iteração 1 removeu
`window.setCurrentSpellVersion` — correto, era o causador da corrida de boot, e
um teste proíbe reintroduzi-lo. Sobrou só o getter. A **Fase 5** (Plugin Manager
UI), se precisar trocar de versão programaticamente, usa o `onChange` do
`VersionSelector` ou reintroduz um setter com guarda contra a corrida.
