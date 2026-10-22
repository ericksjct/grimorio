# Phase 7: Tradução dos SRDs para pt-BR - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-05
**Phase:** 07-traducao-srd-ptbr
**Areas discussed:** Origem do texto pt-BR, Packs de teste, Migração de idioma, Fallback da 5.1, Pareamento nome→slug, Critério de aceite

---

## Origem do texto pt-BR

A discussão não começou pelas zonas cinzentas propostas. O usuário interrompeu a
seleção de áreas com uma proposta própria: *"pegar os dois packs que já temos
traduzidos em ptbr e filtrar apenas pelas magias que já existem nos srds"*.

Essa proposta já havia sido avaliada e rejeitada em D-05 da Fase 3, com a
confirmação do próprio usuário na época: a origem do texto das descrições dos 4
JSONs é incerta/mista, então filtrar por nome de magia não garante que o texto
seja CC-BY. O SRD licencia o texto em inglês; uma tradução é obra derivada com
direito próprio, do tradutor. Isso foi apresentado ao usuário junto com a
medição da Fase 6 (322 das 391 magias coincidem; sobrariam 17 magias do SRD sem
texto pt-BR) e com o fato de que os JSONs já saíram do HEAD.

| Option | Description | Selected |
|--------|-------------|----------|
| Verificar SRD pt-BR oficial primeiro | Checar se a WotC publicou SRD 5.1/5.2 em pt-BR sob CC-BY-4.0; se existir, a fase vira só "gerar pack da fonte" | ✓ |
| Tradução própria do texto EN CC-BY | Traduzir as descrições a partir do SRD em inglês; packs antigos só como glossário de nomes | |
| Filtrar os packs pt-BR mesmo assim | Recuperar os JSONs do histórico e filtrar pelas ~322 magias do SRD; reverte D-05 explicitamente | |

**User's choice:** "Veja se encontra esse srd 5.2 traduzido então"

**Notes:** A verificação encontrou três coisas. (1) A WotC não publicou SRD em
português — as traduções oficiais em CC-BY saíram em fr/it/de/es. (2) Existe uma
tradução independente do SRD 5.2 para pt-BR, do Artifício RPG, publicada sob
CC-BY-4.0 — procedência limpa. Só em PDF, e as URLs conhecidas do arquivo dão
404 (o site migrou de WordPress para Astro; o portal `srd.artificiorpg.com` não
resolve mais). (3) O SRD 5.1 pt-BR ("DRS", Aventureiros dos Reinos) é OGL 1.0a +
autorização expressa da WotC + Fan Content Policy, atualizado com a tradução
oficial da Galápagos — não é CC-BY, e é provavelmente a origem do texto dos
JSONs legados.

Isso respondeu sozinha a zona cinzenta "uma edição ou as duas": a 5.2 tem fonte,
a 5.1 não.

**Rota escolhida em seguida:** *"Regenera as packs antigas que temos (só para
testes) e gera essa aí da 5.2 também (essa do artificio entra como pack padrão
para brasileiros)"* — ou seja, Artifício embutido como padrão pt-BR, e os packs
legados regenerados apenas como fixture local.

---

## Packs de teste (proteção contra reintrodução)

| Option | Description | Selected |
|--------|-------------|----------|
| gitignore + gate estático | Pasta ignorada + asserção no `check-decommission.tests.ps1`, que já afirma que os 4 JSONs sumiram; ~5 linhas num gate existente | |
| Só gitignore | Uma entrada no `.gitignore` e disciplina; zero código novo | ✓ |
| Nem gera no repo | Gerador escreve em pasta temporária do sistema; impossível commitar, fixture some entre sessões | |

**User's choice:** Só gitignore

**Notes:** O risco foi apresentado antes da escolha: se alguém rodar `git add -f`
ou mudar o caminho de saída do gerador, nada avisa, e o texto que a v2.0 existe
para remover volta ao repositório. O usuário optou pela via mais barata mesmo
assim. Registrado como aviso em D-10 do CONTEXT.md e como ideia diferida.

---

## Migração de idioma do usuário existente

| Option | Description | Selected |
|--------|-------------|----------|
| Volta automático | Quem tinha chave `*-PTBR` vai para o SRD 5.2 pt-BR; o mapa `LEGACY_VERSION_FALLBACK` da Fase 6 já existe, só troca o destino | ✓ |
| Só primeira visita | pt-BR vira default apenas para navegador pt sem preferência salva; nenhuma preferência existente é sobrescrita | |
| Volta automático + avisa | Igual à primeira, mais texto no banner de transição dizendo que o português voltou | |

**User's choice:** Volta automático

**Notes:** Devolve exatamente o que a Fase 6 tirou, reaproveitando mecanismo
pronto. O usuário não pediu aviso no banner.

---

## Fallback de quem vinha da 5.1 em português

Contexto da pergunta: não existe SRD 5.1 pt-BR com licença compatível, então
`spells-5E-2014-PTBR` não tem para onde ir preservando as duas dimensões.

| Option | Description | Selected |
|--------|-------------|----------|
| SRD 5.1 EN (mantém edição) | Comportamento atual, D-04 da Fase 6: preserva a edição, que é a dimensão que muda estatística de magia; usuário continua sem português | |
| SRD 5.2 pt-BR (mantém idioma) | Preserva o idioma e troca a edição; contradiz D-04 | ✓ |
| Você decide no plan | Deixar para o planner conforme o código do fallback comportar | |

**User's choice:** SRD 5.2 pt-BR (mantém idioma)

**Notes:** A opção foi apresentada já dizendo que contradiz D-04 e que o app tem
`useEditionCompare` justamente porque a diferença 2014/2024 importa. O usuário
escolheu com o conflito à vista. Registrado em D-08 como reversão parcial
explícita, com a tabela completa dos 4 destinos e a nota de realinhar
`check-migration-version-fallback.tests.ps1`.

---

## Pareamento nome PT → slug EN

Problema: o PDF dá "Bola de Fogo", mas `hifiSpellKey` usa o slug EN
(`fireball`). Sem o par correto, toda preparada e favorita salva deixa de
resolver.

| Option | Description | Selected |
|--------|-------------|----------|
| Parear por ordem + conferência | Casar por contagem e ordem, conferindo nível/escola/tempo contra `srd-2024-en.json`; para e lista se divergir | |
| Tabela de nomes explícita | Mapa PT→slug versionado, 339 linhas, revisado à mão; auditável e estável entre versões do PDF | |
| Usar os packs de teste como ponte | Os JSONs legados já têm nome PT e slug EN lado a lado; só o par é lido, nenhuma descrição; ~17 restantes manuais | ✓ |

**User's choice:** Usar os packs de teste como ponte

**Notes:** Compatível com D-05 da Fase 3, que proíbe texto de **descrição** — um
nome usado como chave de correspondência não é o texto protegido por aquela
regra. Registrado em D-11 com o limite explícito: só o par (nome PT, slug),
nenhum outro campo.

---

## Critério de aceite

| Option | Description | Selected |
|--------|-------------|----------|
| Gate automático + amostra humana | Script de gate com asserções de contagem, campos e licença, mais conferência de ~10 magias na tela | ✓ |
| Só gate automático | Sem checkpoint humano; a tradução é revisada na origem, o risco real é de extração | |
| Gate + conferência completa | As 339 conferidas uma a uma contra o PDF | |

**User's choice:** Gate automático + amostra humana

**Notes:** A amostra deve privilegiar magias que exercitam formatação (tabela,
lista, seção de níveis superiores) e ao menos uma das pareadas à mão.

---

## Claude's Discretion

- Técnica de extração do PDF (biblioteca, parser próprio, rota de texto).
- Rótulo da entrada nova no seletor de versão e convivência de três packs
  embutidos.
- Onde aplicar a tabela de pareamento e em que formato versioná-la.
- Redação das strings de i18n acrescentadas pela fase.

## Deferred Ideas

- SRD 5.1 em português, se um dia surgir fonte com licença compatível.
- Atualização automática quando o Artifício publicar versão nova do PDF.
- Gate estático contra pack legado versionado (recusado em D-10; promover se o
  fixture escapar para o repo alguma vez).
- Plataforma de consulta online do Artifício como fonte estruturada, se sair.

## Zonas cinzentas do ROADMAP que a discussão dissolveu

- **"Como a tradução é produzida e revisada"** — moot: a tradução é de terceiro,
  humana e revisada editorialmente na origem. O que resta é fidelidade de
  extração, coberta por D-14/D-15.
- **"Traduzir as duas edições ou só a 5.2"** — respondida pela disponibilidade
  de fonte, não por preferência.
- **"Nomes traduzidos ou mantidos em inglês"** — respondida pelo código:
  `adaptSpell()` já espera `name` = slug EN e `displayName` = nome pt.
- **"Embutido ou BYOD"** — o usuário respondeu ao escolher "pack padrão para
  brasileiros".
- **Pés/metros e terminologia** — decisão editorial do tradutor, não da fase.
