---
id: desacoplar-idioma-ui-da-versao
status: completed
created: 2026-08-17
source: checkpoint 04-04 (verificação humana da Fase 4)
completed: 2026-08-24
target: Fase 04.1 (INSERIDA no ROADMAP em 2026-08-17, entre a Fase 4 e a Fase 5)
blocks: Phase 6 (MIGR-03)
---

# Desacoplar o idioma da interface do idioma do pacote

## Decisão

O usuário pediu, durante o checkpoint 04-04, que o idioma da interface deixe de
ser derivado da versão de magias ativa. Isso **reverte deliberadamente** a decisão
original de i18n (acoplado: versão = fonte única de verdade do idioma, sem toggle
separado), que era adequada quando existiam exatamente 4 datasets em 2 idiomas x
2 edições, e deixa de ser assim que o conteúdo passa a vir de packs.

Entra como Fase 4.1 (`gsd-phase --insert 4`), imediatamente após a Fase 4.

## Por que é pré-requisito da Fase 6, não preferência

A Fase 6 (Decommissioning & Migration) remove os 4 JSONs protegidos; o critério 3
diz que o precache do service worker deve conter apenas o arquivo SRD. Os packs
SRD são `lang: 'en'`.

Quando os legados saírem, não sobra nenhuma entrada `lang: 'ptbr'` no registro.
Consequências, hoje já verificáveis no código:

- `HifiLangToggle` (v10-hifi.jsx:436) não é um seletor de idioma — é um seletor de
  VERSÃO disfarçado. Ele faz `versions.find(v => v.lang === 'ptbr' && ...)` e chama
  `onSwitch(pt.key)`. Sem nenhuma entrada ptbr, o `find` retorna `undefined` e o
  botão PT fica inerte. O toggle morre junto com os legados.
- `defaultVersionKeyForLang('ptbr')` (index.html) não acha entrada ptbr e cai no
  fallback `vs[0]` = SRD 5.2, em inglês.
- Resultado: a Fase 6 entregaria um app monolíngue em inglês para público
  brasileiro, contrariando o critério 4 da própria Fase 6 (orientação clara e
  acionável para o usuário existente).

## Escopo estimado — fiação, não tradução

O dicionário central já está pronto: `i18n.jsx` tem os blocos `ptbr:` (l.16) e
`en:` (l.187), com `makeT(lang)`, `tt(lang, key)` e checagem de paridade. As
strings da UI já recebem o idioma como argumento explícito.

O que muda:

1. `uiLang` vira estado próprio, persistido em `spellbook-ui-prefs`
2. Remover o effect de acoplamento em `index.html` (~l.461-470), que escuta
   `hifi-spells-source-changed` e faz `setLang(langOfVersionKey(key))`
3. `HifiLangToggle` passa a setar `uiLang` em vez de chamar `onSwitch(versão)`
4. Idioma inicial volta a vir de `detectLang()` (navegador), não da versão

## Decisão de produto embutida

Com o desacoplamento, um brasileiro pode ler magias em inglês (SRD) com a
interface em português. É exatamente o cenário pós-Fase 6 e provavelmente o
desejado, mas hoje o app trata essa combinação como estado inválido. Confirmar
no discuss da 4.1.

## Item relacionado, ainda sem dono no roadmap

Traduzir o SRD 2024 para português foi mencionado pelo usuário como intenção
("eventualmente vamos traduzir esse srd 2024 para português"). Não está na Fase 5
nem na 6. Não é bloqueador da 4.1, mas é o que devolveria conteúdo em português
depois da Fase 6.

## Entregue

Fase 04.1 concluída em 2026-08-24 — 5 planos, verificação `passed` nos 5 critérios
do ROADMAP. O `HifiLangToggle` deixou de ser seletor de versão disfarçado e virou
seletor de idioma da interface; `uiLang` é estado próprio persistido em
`spellbook-ui-prefs`, semeado por `detectLang()` na primeira visita, e continua
funcionando com zero entradas `lang: 'ptbr'` no registro — que era exatamente o
bloqueio da Fase 6.
