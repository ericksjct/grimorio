# Phase 6: Decommissioning & Migration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-01
**Phase:** 6-decommissioning-migration
**Areas discussed:** Todos no escopo, Conteúdo PT-BR desaparece, Apresentação da transição, Magias órfãs, Sequência de deploy e cache

**Como a discussão correu:** uma única rodada de perguntas foi apresentada. O
usuário respondeu **"Decide tudo pra mim"**, delegando integralmente. Todas as
seleções abaixo foram feitas pelo Claude, com base no ROADMAP, no código lido
durante o scout e nas medições registradas em CONTEXT.md — não são escolhas do
usuário.

---

## Todos pendentes no escopo da fase

| Option | Description | Selected |
|--------|-------------|----------|
| srd-pack: slug + markdown cru | `adaptSpell` entrega slug como nome EN e markdown cru na descrição; depois da fase o SRD é o único conteúdo embutido | ✓ |
| review-05-warnings (WR-01/WR-02) | WR-01: garantia de leitura pura do pack-manager depende de ordem de boot; WR-02: corrida no botão de confirmação | ✓ (só WR-01) |
| i18n-toast-versao-e-pluralizacao | Strings de toast de versão/pluralização | |
| Nenhum — manter Fase 6 estrita | Só MIGR-01/02/03 | |

**Escolha:** dois folds, um deles parcial.
**Notas:** o fold do slug/markdown foi confirmado no código antes de decidir —
`adaptSpell()` faz `enName = s.name` (slug) enquanto os JSONs SRD já trazem
`displayName` legível. Sem isso, o único conteúdo restante do app renderiza
`acid-splash`. A WR-01 entrou porque esta fase mexe justamente em boot e migração,
onde a garantia implícita que ela descreve cai sem nenhum teste falhar. A WR-02
ficou fora porque nada na fase toca o caminho de confirmação destrutiva.

---

## Conteúdo PT-BR desaparece

| Option | Description | Selected |
|--------|-------------|----------|
| UI continua PT, conteúdo vira EN, comunicado uma vez | Aproveita o desacoplamento da Fase 04.1; a perda é dita no aviso de transição e não repetida | ✓ |
| Embarcar algum conteúdo PT-BR alternativo | Restauraria português por padrão | |
| Não mencionar — deixar o usuário descobrir | Menor superfície de código | |

**Escolha:** UI em PT, conteúdo EN, comunicado uma vez (D-01, D-02, D-03).
**Notas:** embarcar conteúdo PT-BR recriaria exatamente o problema de copyright
que o milestone v2.0 existe para resolver. Silêncio foi descartado porque o
usuário PT-BR abriria o app e veria tudo mudado sem explicação.

---

## Apresentação da transição (MIGR-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Banner dispensável, persistente até dispensa explícita | Não bloqueia consulta; fica visível até o usuário agir | ✓ |
| Modal bloqueante na primeira visita | Garante que ninguém perde o aviso | |
| Toast temporário | Menos intrusivo ainda | |

**Escolha:** banner dispensável (D-05, D-06, D-07, D-08, D-13).
**Notas:** o conteúdo SRD continua funcionando desde o primeiro segundo, então
bloquear a tela pune quem só quer consultar uma magia. Toast foi descartado pelo
motivo oposto: some sozinho e leva junto a única explicação. O banner só aparece
para usuário existente (versão legada salva, personagens ou favoritas presentes) e
cita o número concreto de magias órfãs quando houver.

---

## Magias órfãs (MIGR-01)

| Option | Description | Selected |
|--------|-------------|----------|
| Seção separada ao final das abas, sem limpeza em massa | Distingue "tenho" de "tinha"; a órfã volta sozinha quando um pack a resolve | ✓ |
| Item fantasma misturado na lista com selo | Menos código de layout | |
| Só uma contagem agregada | Mais simples ainda | |

**Escolha:** seção separada, chaves intactas, sem "limpar todas" (D-09..D-13).
**Notas:** a decisão dura é D-09 — nenhuma escrita destrutiva em `hifi_chars_v1`
ou `hifi_bookmarks_v1`. É o que permite a órfã voltar a resolver quando o usuário
importar o pack certo, e é o que o critério de sucesso 2 do ROADMAP exige. Item
fantasma misturado foi descartado porque o usuário precisa conseguir distinguir o
que ainda tem do que perdeu. A renderização da órfã não precisa de dado nenhum:
a própria chave (`school-lvl-slug`) carrega escola, nível e nome.

---

## Sequência de deploy e cache (MIGR-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Commit atômico + bump de CACHE_VERSION, sem purga de histórico | Remoção efetiva no dispositivo do usuário; HEAD limpo; SHAs preservados | ✓ |
| Deploy faseado | Menos risco por passo | |
| Purgar o histórico do git também | Remoção total do repositório | |

**Escolha:** atômico com bump de cache, sem purga (D-14..D-17).
**Notas:** o bump de `CACHE_VERSION` é a parte não-negociável — `activate()` só
apaga caches com nome diferente do atual, então sem o bump o PWA de todo usuário
existente continuaria servindo os 4 JSONs do Cache Storage, e a remoção não teria
efeito justamente para quem já usava o app. O comentário `ponytail:` no topo de
`sw.js` vale só para acréscimo a PRECACHE e precisa ser corrigido. Deploy faseado
foi descartado porque todo estado intermediário tem entrada de versão apontando
para arquivo 404. A purga de histórico ficou fora: reescreve todos os SHAs,
invalida os citados nos SUMMARY/REVIEW das fases 1-5 e quebra clones — se virar
exigência legal, é decisão própria.

---

## Claude's Discretion

O usuário delegou a fase inteira ("Decide tudo pra mim"). Além das decisões
registradas em CONTEXT.md, ficam abertas ao planner/executor: posição e estilo
visual do banner; ponto exato de aplicação do mapa de fallback dentro de
`spells-data-loader.jsx`; estratégia de conversão de markdown no adaptador; nomes
das chaves de i18n e redação final dos textos.

## Deferred Ideas

- Purga do histórico do git dos 4 JSONs — decisão e fase próprias.
- Pack PT-BR oficial ou curado — contraria a premissa BYOD; milestone novo.
- Chave de magia mais robusta que `school-lvl-slug` — um pack de terceiro com
  slug divergente gera órfã falsa; requisito futuro, não mudança dentro de uma
  fase irreversível.
- Todos não incorporados: `review-05-warnings` §WR-02 e demais, `review-04-1-warnings`,
  `i18n-toast-versao-e-pluralizacao`, `bandeiras-do-toggle-nao-renderizam-no-windows`.
