---
id: review-05-warnings
status: pending
created: 2026-08-30
source: 05-REVIEW.md (code review da Fase 5)
area: pack-manager.jsx
---

# Warnings e Infos abertas do code review da Fase 5

O code review da Fase 5 achou 11 itens. As duas Critical (CR-01, CR-02) e a WR-01
foram corrigidas e fixadas em gate estático antes de fechar a fase — commits
`918809f` (fix) e `1acae8e` (gates 27 e 28). Restam **5 Warning e 4 Info** abertas,
todas registradas em
`.planning/phases/05-plugin-manager-ui-version-selector/05-REVIEW.md`.

Nenhuma é alcançável pelos caminhos de escrita atuais do app e nenhuma contradiz
uma verdade verificada — foi por isso que a fase passou 6/6. Mas duas merecem
atenção antes de mexer de novo nesse código:

## WR-01 — a garantia P-01 é externa, não local

O comentário já foi corrigido para dizer a verdade, mas o fato permanece:
`pack-manager.jsx` não escreve nada, porém `window.loadBookmarks()`
(`v11-character-editor.jsx`) tem um ramo que persiste — a migração única de
favoritas por personagem para a lista global, disparada quando `hifi_bookmarks_v1`
ainda não existe. Hoje esse ramo já rodou no boot (`useBookmarks`), então chamar
o acessor de dentro do gerenciador é leitura pura. Mas a garantia P-01/D-07 de
bytes idênticos depende desse **fato de ordem de boot em outro módulo**, não de
uma propriedade local.

O gate do bloco 8 não consegue ver isso: ele procura a chamada de armazenamento
no texto de `pack-manager.jsx`, e uma chamada indireta via `window.*` é invisível
para um gate de texto. Se um dia o gerenciador puder abrir antes do boot completo,
a garantia cai sem nenhum teste falhar.

Encaminhamento: ou separar um acessor de leitura pura em
`v11-character-editor.jsx` (`peekBookmarks()`, sem o ramo de migração), ou tornar
a migração idempotente e explícita no boot, de modo que nenhum leitor posterior
possa dispará-la.

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
