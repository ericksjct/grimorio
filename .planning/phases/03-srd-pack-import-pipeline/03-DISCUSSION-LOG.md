# Phase 3: SRD Pack & Import Pipeline - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-25
**Phase:** 3-SRD Pack & Import Pipeline
**Areas discussed:** Edição do SRD, Geração do pack SRD, Limites e rejeições do import, Superfície de UI + docs do autor

---

## Edição do SRD

**Q: Qual SRD o app vai embutir como pack pré-instalado?**

| Option | Description | Selected |
|--------|-------------|----------|
| Ambos (5.1 + 5.2) | Dois packs embutidos, um por edição; preserva dual-edition e exercita o dispatch multi-pack da Fase 4. Custo: dois subconjuntos + duas atribuições | ✓ |
| Só SRD 5.2 (2024) | Um pack, uma atribuição, metade do trabalho de dados; usuário de 2014 sem conteúdo embutido | |
| Só SRD 5.1 (2014) | Um pack, texto de atribuição mais corroborado; ancora o app na edição antiga | |

**User's choice:** Ambos (5.1 + 5.2)
**Notes:** Consequência já travada em REQUIREMENTS e reconfirmada: ambos são EN-only (SRD PT-BR bloqueado por tradução, v2.x).

**Q: Onde mora o texto de atribuição CC-BY — no pack ou no app?**

| Option | Description | Selected |
|--------|-------------|----------|
| No `meta` do pack | Verbatim dentro do `meta`; Fase 5 renderiza o que o pack declara; entra no schema publicado | ✓ |
| Hardcoded no app | Strings no código da Fase 5 casadas por `source`; terceiros não declaram licença própria | |
| Você decide | Delegado ao planner | (inicial) |

**User's choice:** inicialmente "Você decide", corrigido em seguida pelo usuário para **"no pack!"**
**Notes:** A correção veio como mensagem livre durante a execução — decisão explícita do usuário, não discrição do Claude.

---

## Geração do pack SRD

**Q: De onde veio o texto das descrições dos 4 JSONs atuais?**

| Option | Description | Selected |
|--------|-------------|----------|
| Dataset comunitário | Se for SRD-derivado e CC-BY, filtrar por nome bastaria | |
| Copiado do PHB/livro | Filtrar por nome não resolveria; pack teria de nascer do documento SRD | |
| Não sei / misto | Origem incerta → tratar como não-confiável | ✓ |

**User's choice:** Não sei / misto (seguido de "melhor....", confirmando a rota cautelosa)
**Notes:** Esta resposta invalida a redação atual de SRD-01 ("gerado a partir dos dados atuais, filtrado ao subconjunto licenciado livre"). Registrado como D-05 no CONTEXT.md, com REQUIREMENTS.md pendente de correção.

**Q: De qual fonte CC-BY os dois packs SRD serão gerados?**

| Option | Description | Selected |
|--------|-------------|----------|
| Dataset SRD pronto (JSON) | Dataset público SRD-derivado e CC-BY, convertido por script one-shot | ✓ (preferência) |
| PDFs oficiais da WotC | Fonte primária; parsing trabalhoso, extração falhou na pesquisa do milestone | ✓ (fallback) |
| Híbrido | PDF define a lista, dataset fornece o texto, conferência por amostragem | |
| Você decide no plan | Vira tarefa de investigação do planner | |

**User's choice (free text):** "se houver alguem na web que parseou os SRD para versões mais processáveis, vamos com elas se não vamos optar pelos pdfs e usar o unlimited ocr para parsear"
**Notes:** Cria necessidade de investigação leve no plan (localizar/validar licença dos datasets de 5.1 e 5.2), contrariando a nota "Research do plan: NÃO" do ROADMAP para esta fase.

**Q: Como anotar as modificações exigidas pela CC-BY?**

| Option | Description | Selected |
|--------|-------------|----------|
| Nota genérica no `meta` | Uma linha fixa exibida junto da atribuição | ✓ |
| Changelog detalhado | Lista o que o script fez; mais transparente, mais manutenção | |
| Você decide | Delegado ao planner | |

**User's choice:** Nota genérica no `meta`

---

## Limites e rejeições do import

**Q: Qual o teto de tamanho de um pack importado (arquivo e URL)?**

| Option | Description | Selected |
|--------|-------------|----------|
| 5 MB | ~7x folga sobre os JSONs atuais (580–750 KB) | |
| 10 MB | Margem confortável; parse de 10 MB é perceptível no mobile | ✓ |
| 20 MB | Só barra abuso grosseiro; risco de travar aba e estourar quota | |

**User's choice:** 10 MB

**Q: O que acontece quando o `source` do pack já existe instalado?**

| Option | Description | Selected |
|--------|-------------|----------|
| Barrar com mensagem | Literal do PKG-04; atualizar o próprio pack vira remover+importar | |
| Perguntar se substitui | Melhor UX para autor; adiciona diálogo nesta fase | |
| (proposta do usuário) Sufixo | Não barra nem substitui — instala com identificador sufixado | ✓ |

**User's choice (free text):** "nem remove nem substitui. sobe com um sufixo diferente."
**Notes:** O usuário primeiro respondeu "não entendi" às duas perguntas desta rodada; foram reexplicadas em linguagem simples (o que é `source`, o que é CSP) e refeitas. A opção escolhida não estava na lista — foi proposta pelo usuário. Coerente com MGMT-04 (duplicata é nota informativa, não conflito).

**Q: Adicionar CSP como defesa em profundidade nesta fase?**

| Option | Description | Selected |
|--------|-------------|----------|
| Sim, nesta fase | É quando HTML não-confiável entra; risco de quebrar Babel standalone | ✓ |
| Não, fica fora | DOMPurify já é a proteção exigida; CSP vira item próprio depois | |
| Você decide | Planner avalia viabilidade | |

**User's choice:** Escrever agora
**Notes:** Condição de saída registrada em D-10 — se não fechar sem quebrar o Babel inline com esforço razoável, cai fora e vira item separado.

---

## Superfície de UI + docs do autor

**Q: Quanta interface de import nasce nesta fase?**

| Option | Description | Selected |
|--------|-------------|----------|
| Mínima e funcional | Arquivo, URL, mensagens claras, aviso de CORS; sem acabamento visual | ✓ |
| Já na forma final | Menos retrabalho, mas puxa decisões de UX reservadas ao discuss da Fase 5 | |

**User's choice:** Mínima e funcional

**Q: Onde ficam o `pack.schema.json` e a página de docs?**

| Option | Description | Selected |
|--------|-------------|----------|
| Schema na raiz + página no site | Schema com URL pública + página HTML linkada do import; literal do PKG-01 | (escolha do Claude) |
| Schema na raiz + doc em markdown | Menos trabalho; menos acessível para quem só usa o site | |
| Você decide | Delegado ao planner | ✓ |

**User's choice:** Você decide → resolvido como "schema na raiz + página estática simples" (D-14)

**Q: Como validar o pack contra o schema, num app sem build step?**

| Option | Description | Selected |
|--------|-------------|----------|
| Validador escrito à mão | Zero dependência nova; risco de dessincronizar com o schema | ✓ |
| Biblioteca via CDN (Ajv) | Schema vira o validador de verdade; mais uma dependência de CDN + precache | |

**User's choice (free text):** "o que for mais performático" → validador à mão
**Notes:** Vence por performance total — sem download de biblioteca, sem compilação de schema em runtime, sem peso no precache offline.

---

## Claude's Discretion

- Onde ficam schema e página de docs (resolvido como `pack.schema.json` na raiz + página estática simples linkada do import)
- Nomes de arquivo e valores de `source` dos packs SRD (sugestão: `srd-5.1-en` / `srd-5.2-en`)
- Onde vive o script de geração dos packs SRD (recomendação: script commitado, rodado manualmente fora do runtime)

## Deferred Ideas

- Pack SRD PT-BR — bloqueado em tradução própria do texto CC-BY (v2.x, já em REQUIREMENTS)
- Atualização manual de pack por URL (re-fetch + comparação de versão) — v2.x
- UX final do import (onde vive, desktop vs mobile) — Fase 5
- CSP como trabalho próprio — só se D-10 esbarrar no Babel standalone
