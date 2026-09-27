---
id: review-05-warnings
status: pending
created: 2026-08-30
updated: 2026-09-27
source: 05-REVIEW.md (code review da Fase 5)
area: pack-manager.jsx
---

# Warnings e Infos abertas do code review da Fase 5

O code review da Fase 5 achou 11 itens. As duas Critical (CR-01, CR-02) e a WR-01
foram corrigidas e fixadas em gate estático antes de fechar a fase — commits
`918809f` (fix) e `1acae8e` (gates 27 e 28). A WR-01 foi reaberta em substância pelo
próprio texto abaixo (a garantia continuava externa) e fechada de novo, desta vez
por leitura pura, na Fase 6 (06-02). Restam **4 Warning e 4 Info** abertas, todas
registradas em `.planning/phases/05-plugin-manager-ui-version-selector/05-REVIEW.md`.

Nenhuma é alcançável pelos caminhos de escrita atuais do app e nenhuma contradiz
uma verdade verificada — foi por isso que a fase passou 6/6. Mas a WR-02 merece
atenção antes de mexer de novo nesse código:

## WR-01 — RESOLVIDA na Fase 6 (06-02, commit `8ec6b5a`)

A garantia P-01/D-07 (bytes idênticos de `hifi_bookmarks_v1` antes/depois de uma
operação do gerenciador de pacotes) deixou de depender de um fato de ordem de boot
em outro módulo. `v11-character-editor.jsx` ganhou `peekBookmarks()` — um acessor
de leitura pura (getItem/JSON.parse/Array.isArray, zero `setItem`/`removeItem`,
inclusive quando a chave ainda não existe) — e `pack-manager.jsx`'s
`_removalImpact()` foi migrada de `window.loadBookmarks()` (que tem o ramo de
migração que escreve) para `window.peekBookmarks()`. A garantia agora é local ao
próprio arquivo: não há mais nenhum caminho de escrita alcançável, direto ou via
`window.*`, a partir do gerenciador de pacotes.

Isso é exatamente um dos dois encaminhamentos que este todo propunha (o acessor de
leitura pura, em vez de tornar a migração idempotente no boot).

Prova por execução, não por grep de texto (que foi a limitação original apontada
abaixo): `scripts/check-bookmarks-read-purity.tests.ps1` executa a função de
produção real contra um `localStorage` falso instrumentado e conta chamadas de
`setItem`/`removeItem` em 3 cenários de `peekBookmarks` (chave ausente, JSON
válido, JSON corrompido) — nenhum gera escrita — mais o espelho de migração de
`loadBookmarks()`.

**Nota histórica** (o problema original, preservado para quem chegar aqui pelo
link do 05-REVIEW.md): o comentário já tinha sido corrigido para dizer a verdade,
mas o fato permanecia — `pack-manager.jsx` não escrevia nada, porém
`window.loadBookmarks()` tinha um ramo que persiste (a migração única de
favoritas por personagem para a lista global, disparada quando
`hifi_bookmarks_v1` ainda não existe), e a garantia dependia de esse ramo já ter
rodado no boot em outro módulo — um fato de ordem de boot, não uma propriedade
local. O gate de texto do bloco 8 não conseguia ver isso porque uma chamada
indireta via `window.*` é invisível para um gate que procura a chamada de
armazenamento no texto de `pack-manager.jsx`.

## WR-02 — corrida no botão de confirmação destrutiva

O botão de confirmar remoção fica clicável antes de os dados de impacto
resolverem. Na prática o índice já está memoizado quando o usuário chega lá, mas
o caminho existe: confirmar sem ver os números é exatamente o que a confirmação
inline foi desenhada para impedir (MGMT-02/D-06).

Encaminhamento: desabilitar "Sim" enquanto `impact` for `null`, ou não renderizar
o par Sim/Não até o impacto ter resolvido.

## Demais

As outras 3 Warning e as 4 Info estão no relatório. Vale reler o
`05-REVIEW.md` inteiro antes da próxima mudança em `pack-manager.jsx`.
