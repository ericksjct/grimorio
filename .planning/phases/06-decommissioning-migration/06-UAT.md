---
status: diagnosed
phase: 06-decommissioning-migration
source: [06-01-SUMMARY.md, 06-02-SUMMARY.md, 06-03-SUMMARY.md, 06-04-SUMMARY.md, 06-05-SUMMARY.md]
started: 2026-09-05T01:32:03Z
updated: 2026-09-05T01:32:03Z
---

## Current Test

number: 6
name: [testing complete]
expected: |
  Os 4 critérios de sucesso do ROADMAP mais as 2 contraprovas do plano 06-06.
awaiting: nenhuma — 4 passaram, 2 falharam e já estão diagnosticadas abaixo

## Method

Verificação executada em **Chrome headless via CDP**, não por conferência visual humana.

O cenário de "usuário existente atravessa a atualização" foi montado servindo o worktree
`grimorio-baseline` (commit `15efdf8`, pré-remoção) e o HEAD **na mesma porta/origem**
(`http://127.0.0.1:8123`) — trocando apenas o diretório servido. Origem única é o que
permite `localStorage` e Cache Storage sobreviverem à atualização; portas diferentes
teriam invalidado os critérios 2 e 3.

Dados semeados a partir dos pacotes reais: das 391 magias do `spells-5E-2024-PTBR`,
322 existem no `srd-2024-en` e 69 não. O personagem de teste recebeu 3 preparadas
sobreviventes + 3 preparadas órfãs, e 2 favoritas sobreviventes + 2 favoritas órfãs
(5 órfãs no total).

Limite do método: nenhum julgamento humano de clareza de texto foi feito. O teste
6 abaixo está registrado como coberto só na parte mecânica.

## Tests

### 1. O que ainda resolve funciona como antes (MIGR-01, critério 1)
expected: app abre no SRD da MESMA edição da preferência salva; preparadas que existem no SRD aparecem na lista normal com nome legível em Title Case; descrição sem `**` cru
result: pass
evidence: |
  `spellbook-ui-prefs.versionKey` migrou de `spells-5E-2024-PTBR` para `srd-2024-en`
  — mesma edição (2024), não caiu no 5.1. É o mapa de fallback de D-04.
  Sobreviventes renderizadas na lista normal: Alarm, Calm Emotions, Spare the Dying,
  Enhance Ability, Imprisonment — Title Case, sem slug. Descrições em prosa limpa.

### 2. O que não resolve mais é sinalizado (MIGR-01, critério 2)
expected: seção ao final das abas `preparadas` e `favoritas` com contagem e explicação; todas as órfãs presentes; dado do usuário intacto
result: pass
evidence: |
  Aba preparadas: "3 magias em pacotes que você não tem / Continuam salvas. Voltam
  sozinhas quando você instalar um pacote que as tenha." + Friends,
  Leomunds Secret Chest, Swift Quiver.
  Aba favoritas: "2 magias em pacotes que você não tem" + Mordenkainens Faithful
  Hound, Tashas Bubbling Cauldron.
  As 5 órfãs semeadas estão todas presentes; nenhuma perdida.
  `hifi_chars_v1` e `hifi_bookmarks_v1` comparados byte a byte antes/depois da
  atualização: IDÊNTICOS.

### 3. Os arquivos saíram (MIGR-02, critério 3)
expected: `grimorio-v1` não existe; `grimorio-v2` existe sem nenhum dos 4 JSONs; nenhuma requisição aos 4 arquivos; `git ls-files | grep -c 'spells-5E'` = 0
result: pass
evidence: |
  Cache Storage antes da atualização: ["grimorio-v1"]. Depois: ["grimorio-v2"].
  `grimorio-v2` tem 31 entradas, zero JSONs legados; os únicos dados são
  `srd-2024-en.json` e `srd-2014-en.json`. `transition-banner.jsx` precacheado.
  `BUILTIN_VERSIONS` reduzido a ["srd-2024-en","srd-2014-en"].
  `git ls-files | grep -c 'spells-5E'` = 0.

### 4. Orientação na primeira visita — conteúdo e comportamento (MIGR-03, critério 4)
expected: banner no topo, dispensável, não modal, com as três partes de D-08 e a contagem concreta de D-13; dispensa persiste
result: pass
evidence: |
  Banner renderiza as três partes de D-08 na ordem, com a contagem correta de D-13:
  "5 das suas magias estão em pacotes que você não tem instalados. Elas aparecem
  marcadas na ficha; não foram apagadas." — bate com as 5 órfãs semeadas.
  Botões "Gerenciar pacotes" / "Como montar um pacote" / "Entendi" presentes.
  Não modal: app rolável e clicável por baixo. Dispensa grava
  `migrationNoticeDismissed: true` no blob de preferências (D-07) e o banner não
  volta após reload.

### 5. Contraprova de instalação nova (D-06)
expected: em instalação nova o banner NÃO aparece, e depois da visita a chave `hifi_bookmarks_v1` continua ausente
result: issue
reported: "Verificado em perfil de Chrome e origem virgens (porta 8199, nunca visitada). Banner aparece: true (esperado false). hifi_bookmarks_v1: \"[]\" (esperado ausente)."
severity: major
test: 5

### 6. Clareza do texto do banner (teste de aceitação informal de 06-CONTEXT)
expected: uma pessoa que não conhece o projeto entende o que mudou, o que continua salvo e o que fazer
result: skipped
reason: exige julgamento humano; nenhum gate nem automação decide isso. O texto renderizado e o screenshot em 390×844 estão disponíveis para a conferência.

### 7. Contraprova do desfecho esperado (D-12)
expected: importar um pack que contenha uma órfã faz ela migrar sozinha para a lista normal, sem ação sobre o dado salvo
result: skipped
reason: exige montar um pacote válido conforme `pack.schema.json`; não coberto nesta rodada.

## Summary

total: 7
passed: 4
issues: 1
pending: 0
skipped: 2
blocked: 0

## Gaps

- truth: "Numa instalação nova o banner de transição não aparece (D-06)"
  status: failed
  reason: "User reported: banner aparece em perfil e origem virgens — verificado isolando os três sinais de _hasExistingUserSignal(): __legacyVersionFallback=null (não dispara), peekBookmarks().length=0 (não dispara), loadCharacters().length=1 (dispara), devolvendo o personagem sintetizado 'aventureiro'."
  severity: major
  test: 5
  root_cause: "`loadCharacters()` (v11-character-editor.jsx:265-274) nunca devolve lista vazia: sem nada em `hifi_chars_v1` ela retorna `HIFI_DEFAULT_CHARS.map(_normChar)`. O sinal 2 de `_hasExistingUserSignal()` (transition-banner.jsx:27-28) testa `chars.length > 0`, que passa a ser permanentemente verdadeiro. O banner tratou um default sintetizado como evidência de usuário existente — a mesma classe de erro que o uso obrigatório de `peekBookmarks()` evita no sinal 3, por outra via."
  artifacts: [v11-character-editor.jsx, transition-banner.jsx]
  missing: ["acessor de leitura pura para personagens (espelho de peekBookmarks) que distinga 'nenhum personagem salvo' de 'personagem default', e uso dele no sinal 2 de _hasExistingUserSignal"]
  debug_session: ""

- truth: "Numa instalação nova a chave hifi_bookmarks_v1 continua ausente no Local Storage após a visita"
  status: failed
  reason: "User reported: hifi_bookmarks_v1 = \"[]\" após a primeira carga em perfil e origem virgens; esperado null."
  severity: minor
  test: 5
  root_cause: "`useBookmarks()` (v11-character-editor.jsx:394-395) inicializa com `React.useState(loadBookmarks)`. `loadBookmarks()` (linha 365) tem o ramo de migração que ESCREVE `hifi_bookmarks_v1` quando a chave é null, mesmo quando não há nada a migrar (Set vazio). 06-02 migrou `pack-manager.jsx` para `peekBookmarks()` mas não este call site, então o resíduo da WR-01 continua criando a chave no boot."
  artifacts: [v11-character-editor.jsx]
  missing: ["condicionar a escrita de migração em loadBookmarks() a haver de fato chaves migradas (migrated.size > 0), preservando a migração para quem tem favoritas por personagem"]
  debug_session: ""
