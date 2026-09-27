---
id: srd-pack-nomes-slug-e-markdown-cru
status: done
created: 2026-08-24
closed: 2026-09-27
source: checkpoint 04.1-05 (QA headless da Fase 04.1)
closed_by: "06-01 Task 2 (commit 8719d21)"
area: spells-data-loader.jsx (adaptador de pack) / packs SRD EN
---

# Packs SRD EN exibem slug no lugar do nome e markdown cru na descrição

## O que foi observado

Durante o QA automatizado do checkpoint da Fase 04.1 (Chromium headless, Playwright),
com a versão `SRD 5.2 (EN)` ativa, as magias do pack SRD aparecem assim:

- **Nome renderizado como slug**: `acid-splash`, `chill-touch`, `dancing-lights`,
  `druidcraft`, `eldritch-blast`, `elementalism` — em vez de `Acid Splash`,
  `Chill Touch`, etc. Afeta o card, a ficha impressa e a busca do editor.
- **Markdown literal na descrição**: os asteriscos do pack chegam crus à tela, ex.:
  `**Weather Sensor.** You create a Tiny, harmless sensory effect...` em `druidcraft`
  e `**Beckon Air.**` em `elementalism`.

Os packs PT-BR legados (`D&D 5.5E 2024`, `D&D 5E 2014`) não têm nenhum dos dois
problemas — nomes saem formatados (`Acudir os Moribundos`, `Arte Druídica`).

## Não é regressão da Fase 04.1

Confirmado por comparação A/B: um worktree no commit `8a9b5a2` (imediatamente
anterior ao primeiro commit da fase) foi servido em paralelo com o worktree da
fase. Os seis primeiros nomes com `SRD 5.2 (EN)` ativa são **idênticos** nos dois:
`acid-splash, chill-touch, dancing-lights, druidcraft, eldritch-blast, elementalism`.

O defeito vem do conteúdo dos packs SRD ou do adaptador que os normaliza
(introduzidos nas Fases 3/4), não do desacoplamento de idioma.

## Por que importa

A Fase 6 remove os JSONs PT-BR legados e deixa o SRD como único conteúdo
embarcado. Se o adaptador continuar entregando slug e markdown cru, esse passa a
ser o **único** conteúdo que o usuário vê.

## Onde investigar

- `spells-data-loader.jsx` — `adaptSpell()` e o pipeline de importação de pack:
  verificar se o pack SRD traz um campo `name` legível ou só o identificador, e se
  a descrição precisa de conversão de markdown (o app já tem DOMPurify no boot).
- Comparar com `check-upgrade-heading-strip`, que já faz limpeza de heading no
  adaptador — o mesmo ponto provavelmente é o lugar certo para o resto.

## Fechamento (06-01 Task 2, commit `8719d21`)

Ambos os sintomas foram corrigidos no adaptador SRD, dentro de `adaptSpell()`
(`spells-data-loader.jsx`):

- **Nome legível**: `name_en` passou a carregar o `displayName` legível do SRD
  (`"Acid Splash"`) quando a **língua do pack** é `en`, em vez do slug de
  identidade. O campo `en:` (identidade — `hifiSpellKey`, `byName`, links
  `?spell=`) foi mantido intocado; `spellName()` em `grimorio-helpers.jsx` passou
  a preferir `name_en` antes de `en` no ramo não-PT.
- **Markdown convertido**: `mdToHtml()`, um conversor mínimo e seguro contra tags
  (`**bold**`, `*italic*`/`_italic_`, só em nós de texto, nunca dentro de
  markup), aplicado a `desc`/`descHtml`/`upgradeHtml` no adaptador.

Gate de regressão: `scripts/check-srd-name-and-markdown.tests.ps1` (prova de
execução em Node contra `adaptSpell()`/`mdToHtml()` real, incluindo caso
adversarial de injeção de atributo e o corpus inteiro de `srd-2024-en.json`).

**O que NÃO entrou** (fechamento honesto): o escopo do fold foi só o caminho
SRD/adaptador. O pipeline de import de packs BYOD não foi redesenhado — um pack
de terceiros com o mesmo defeito de nome/markdown não é coberto por este
fechamento, só o conteúdo SRD embarcado que motivou o achado.
