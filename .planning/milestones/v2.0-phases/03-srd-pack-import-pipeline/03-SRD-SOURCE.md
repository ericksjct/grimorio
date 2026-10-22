# Fontes do SRD — proveniência e licença

**Data da investigação:** 2026-08-10

## Regra travada (D-05)

Nenhum byte de texto de descrição dos arquivos `spells-5E-2014-EN.json`, `spells-5E-2014-PTBR.json`, `spells-5E-2024-EN.json` ou `spells-5E-2024-PTBR.json` entra nos pacotes SRD — a proveniência do texto dessas descrições é incerta/mista (confirmado pelo usuário na discussão da Fase 3) e filtrar por nome de magia não torna o texto CC-BY. Os pacotes SRD nascem de uma fonte separada, com licença verificada de forma independente, nunca dos JSONs atuais do app.

## SRD 5.1 (2014, EN)

| Candidato | URL | Licença declarada | URL da declaração | Veredito | Razão |
|---|---|---|---|---|---|
| 5e-bits/5e-database (dados por trás de `dnd5eapi.co`) | https://github.com/5e-bits/5e-database | Open Gaming License 1.0a (código MIT, dados OGL) | https://raw.githubusercontent.com/5e-bits/5e-database/main/README.md | REJEITADA | README declara verbatim: "The underlying material is released using the Open Gaming License Version 1.0a" — não é CC-BY. |
| Open5e (`api.open5e.com`) | https://open5e.com | Open Gaming License | https://api.open5e.com/v1/documents/ (registro `wotc-srd`) | REJEITADA | O endpoint de documentos retorna `"license":"Open Gaming License"` para o registro `wotc-srd` (SRD 5.1) — mesmo problema do 5e-bits. Não há registro de SRD 5.2 na lista (17 documentos, nenhum é `srd-5.2`), confirmando que o ecossistema Open5e ainda não cobre 2024. |
| BTMorton/dnd-5e-srd | https://github.com/BTMorton/dnd-5e-srd | Open Gaming License 1.0a | https://raw.githubusercontent.com/BTMorton/dnd-5e-srd/master/LICENSE | REJEITADA | Arquivo `LICENSE` do repositório declara OGL 1.0a explicitamente ("D&D 5E SRD License... released using the Open Gaming License Version 1.0a"). |
| soryy708/dnd5-srd (fork de adrpadua/5e-database) | https://github.com/soryy708/dnd5-srd | Open Gaming License 1.0a (herdada) | https://raw.githubusercontent.com/5e-bits/5e-database/main/README.md | REJEITADA | `adrpadua/5e-database` é a mesma linhagem de dados do 5e-bits (mesmo texto de licença no README) — dados OGL, não CC-BY. |
| Tabyltop/CC-SRD | https://github.com/Tabyltop/CC-SRD | Creative Commons Attribution 4.0 International (CC-BY-4.0) | https://raw.githubusercontent.com/Tabyltop/CC-SRD/main/README.md | ACEITA (licença) / INSUFICIENTE (forma) | README declara CC-BY-4.0 explicitamente e reproduz o texto de atribuição exigido verbatim (idêntico ao registrado em `FEATURES.md`). Porém o arquivo de dados (`SRD5.1-CCBY4.0License-TT.json`, 13,8 MB) é um **dump do documento inteiro** — sequência de nós `paragraph`/`h2`/`h3`/`h4`/`table` extraídos do PDF, não um registro estruturado por magia (sem campos `level`/`school`/`range`/`components` etc.). A seção "Spell Descriptions" tem 323 headings `h4` (nomes de magia, incluindo alguma repetição por quebra de página) sobre ~2.315 parágrafos — ou seja, a extração de texto já foi feita (sem ruído de OCR), mas a estruturação por magia ainda precisa ser escrita, tarefa equivalente à de estruturar uma saída de OCR. |

**Rota recomendada:** (b) OCR do PDF oficial — com uma variação: usar como entrada o dump de texto do Tabyltop/CC-SRD (`SRD5.1-CCBY4.0License-TT.json`) em vez de rodar OCR do zero, já que ele é (i) licenciado CC-BY-4.0 de forma explícita e verificável e (ii) já extraído sem erro de reconhecimento de caractere — restando "só" escrever o parser de heading→campos de magia. Se esse dump se mostrar problemático na prática (formatação inconsistente, texto fora de ordem), o fallback é a extração via ferramenta de OCR nomeada pelo usuário sobre o PDF oficial `SRD_CC_v5.1.pdf`, confirmado acessível em https://media.wizards.com/2023/downloads/dnd/SRD_CC_v5.1.pdf (3,16 MB, `Content-Type: application/pdf`, verificado em 2026-08-10). Licença declarada no PDF/página oficial: CC-BY-4.0 (ver https://www.dndbeyond.com/srd). Volume estimado: ~319-323 magias.

## SRD 5.2 (2024, EN)

| Candidato | URL | Licença declarada | URL da declaração | Veredito | Razão |
|---|---|---|---|---|---|
| `dnd5eapi.co` / 5e-bits (variante 2024) | https://www.dnd5eapi.co/api/2024/spells | — | https://www.dnd5eapi.co/api/2024/spells/acid-arrow | REJEITADA | Endpoint retorna `404 Not Found` — o dataset 5e-bits ainda não cobre a edição 2024. Confirma a suposição de D-06 de que o ecossistema 5.2 é mais novo e imaturo. |
| Open5e | https://open5e.com | — | https://api.open5e.com/v1/documents/ | REJEITADA | Nenhum documento SRD 5.2/2024 na lista de 17 documentos publicados pela API (verificado 2026-08-10). |
| dmcb / `srd-5.2-spells.json` (usado em `5e-spellbook.app`) | https://gist.github.com/dmcb/4b67869f962e3adaa3d0f7e5ca8f4912 | Creative Commons Attribution 4.0 International (CC-BY-4.0) | https://5e-spellbook.app/ (rodapé do site, link direto para a licença) | ACEITA | O gist contém 339 magias já estruturadas por campo (`name`, `level`, `school`, `classes`, `range`, `components`, `duration`, `description`, `higherLevelSlot` — forma muito próxima do schema-alvo do app). O rodapé de `5e-spellbook.app` (mesmo autor do gist, app que consome esse arquivo) declara "Includes D&D SRD data under CC-BY-4.0" com link direto para `https://creativecommons.org/licenses/by/4.0/deed.en` e para a fonte oficial `https://www.dndbeyond.com/srd`. Satisfaz o critério travado: URL alcançável hoje, identificador de licença explícito, e a fonte declarada aponta para a página oficial da WotC/D&D Beyond. Ressalva: é um projeto pessoal/pequeno, não um dataset comunitário estabelecido como o 5e-bits — não há histórico de manutenção de longo prazo garantido; recomenda-se ao plano 03-04 baixar e versionar uma cópia local do gist em vez de depender do fetch ao vivo. |

**Rota recomendada:** (a) dataset público — o gist `srd-5.2-spells.json` (339 magias estruturadas), convertido para o formato do app por script one-shot. É a única fonte estruturada encontrada para 5.2 com licença CC-BY declarada de forma verificável; nenhum dos datasets comunitários maduros (5e-bits, Open5e) cobre a edição 2024 ainda. Licença oficial confirmada também na página `https://www.dndbeyond.com/srd`: "The System Reference Document (SRD) contains D&D rules content you can use and reference to publish content under Creative Commons." PDF oficial de fallback, caso o gist se revele inadequado na prática: `SRD_CC_v5.2.pdf`, confirmado acessível em https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.pdf (5,95 MB, verificado em 2026-08-10).

## Texto de atribuição por edição

Copiado verbatim de `.planning/research/FEATURES.md` §"SRD CC-BY-4.0 Attribution Requirements (Concrete)" — fonte autoritativa indicada pelo plano.

**SRD 5.1 (2014):**

> This work includes material taken from the System Reference Document 5.1 ("SRD 5.1") by Wizards of the Coast LLC and available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.

**SRD 5.2 (2024):**

> This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. Licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.

As duas strings são diferentes entre si (documento-fonte, URL de referência, e leve variação de fraseado) — não reutilizar uma no lugar da outra.

Regra adicional herdada da seção legal do SRD 5.1, aplicável às duas edições: "Please do not include any other attribution regarding Wizards other than that provided above." Uma afirmação de compatibilidade ("5E compatible") é permitida separadamente, mas não faz parte do texto de atribuição CC-BY.

## Nota de modificação (D-04)

Nota genérica única, para `meta.license.modifications` dos dois pacotes:

> "Texto reformatado para JSON e HTML estrutural; conteúdo da magia não foi alterado."

## Consequências para o plano 03-04

- **SRD 5.1:** rota (b) recomendada — parser sobre o dump de texto oficialmente licenciado do Tabyltop/CC-SRD (ou, em segundo lugar, OCR do PDF oficial `SRD_CC_v5.1.pdf`). URL de dados: https://raw.githubusercontent.com/Tabyltop/CC-SRD/main/SRD5.1-CCBY4.0License-TT.json. URL de fallback (PDF oficial): https://media.wizards.com/2023/downloads/dnd/SRD_CC_v5.1.pdf.
- **SRD 5.2:** rota (a) recomendada — script one-shot sobre o gist estruturado `srd-5.2-spells.json`. URL de dados: https://gist.github.com/dmcb/4b67869f962e3adaa3d0f7e5ca8f4912. URL de fallback (PDF oficial): https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.pdf.

### Aprovação do usuário (2026-08-10)

**Decisão registrada:** texto livre, reconhecendo a inversão 5.1/5.2 encontrada nesta investigação — nenhuma das quatro opções pré-formuladas descreve exatamente o cenário achado, porque as opções assumiam que uma rota (a) madura existiria para 5.1 e não para 5.2. A investigação encontrou o oposto: 5.2 tem dataset estruturado CC-BY, 5.1 não. A opção estruturalmente mais próxima é **`route-a-51-b-52`, invertida**: aqui a rota (a) vale para **5.2**, e a rota (b) vale para **5.1** — o oposto do nome literal dessa opção (que descreve (a) para 5.1 e (b) OCR para 5.2). Registrar isso explicitamente para que nenhuma automação futura leia `route-a-51-b-52` como "rota (a) para 5.1" sem checar esta nota.

Rota aprovada por edição:

- **SRD 5.1 (2014) → rota (b):** parser próprio sobre o dump CC-BY-4.0 do `Tabyltop/CC-SRD` (`SRD5.1-CCBY4.0License-TT.json`, https://raw.githubusercontent.com/Tabyltop/CC-SRD/main/SRD5.1-CCBY4.0License-TT.json) — texto já extraído do PDF oficial, sem ruído de OCR. O PDF oficial (`SRD_CC_v5.1.pdf`, https://media.wizards.com/2023/downloads/dnd/SRD_CC_v5.1.pdf) NÃO é usado como fonte primária de OCR — fica reservado como referência de conferência/auditoria caso o parser produza resultado suspeito.
- **SRD 5.2 (2024) → rota (a):** script one-shot sobre o dataset estruturado de 339 magias do gist `dmcb` (https://gist.github.com/dmcb/4b67869f962e3adaa3d0f7e5ca8f4912), com **cópia local versionada no repositório** (ex.: `scripts/srd-sources/srd-5.2-spells.json` ou caminho equivalente escolhido em 03-04) — nada de fetch ao vivo em runtime nem em tempo de build. O PDF oficial (`SRD_CC_v5.2.pdf`, https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.pdf) fica como fallback caso o gist se mostre inadequado.

**Justificativa registrada pelo usuário:** é a combinação com licença CC-BY-4.0 verificada nas duas pontas e o menor trabalho total; a ressalva de que o dataset 5.2 vem de um projeto pessoal (não um dataset comunitário estabelecido) é mitigada pela cópia local versionada, que remove a dependência de disponibilidade contínua do gist.

**Consequência de escopo:** nenhum arquivo de pacote SRD (`srd-2014-en.json` / `srd-2024-en.json` ou nomes equivalentes) foi criado por este plano — a geração em si é trabalho do plano 03-04, que deve ler este documento em vez de reinvestigar a licença.

## Achado do plano 03-04: overlap de descrições com spells-5E-*.json (2026-08-10)

O plano 03-04 tentou provar D-05 ("nenhum byte de texto de descrição dos arquivos `spells-5E-*.json` entra nos pacotes SRD") com um diff textual: comparar o conjunto de `description` dos pacotes gerados contra o conjunto de `description` dos quatro `spells-5E-*.json`, exigindo interseção zero. Essa prova encontrou uma interseção **não-zero**, gerou um checkpoint de decisão, e o usuário resolveu o checkpoint redefinindo como D-05 deve ser aplicada. Este registro existe para que uma automação futura não reabra a mesma investigação.

**Números encontrados:**

- `srd-2014-en.json`: 319 magias geradas, **46 descrições** idênticas byte-a-byte a uma entrada de `spells-5E-*.json`.
- `srd-2024-en.json`: 339 magias geradas, **77 descrições** idênticas byte-a-byte a uma entrada de `spells-5E-*.json`.
- Total: **123 de 658** descrições geradas (~19%) coincidem exatamente com o conjunto de 1.751 descrições únicas dos quatro `spells-5E-*.json`.
- As descrições que colidem são sistematicamente mais curtas (comprimento médio 248 caracteres) do que as que não colidem (comprimento médio 850 caracteres) — consistente com "magias simples, texto-padrão do SRD" e não com cópia de conteúdo elaborado.
- A maior colisão (`programmed-illusion`, 1.454 caracteres, 4 parágrafos) foi inspecionada manualmente: texto de regras comum, sem qualquer indício de adulteração.

**Comando de reprodução** (raiz do repo, após `node scripts/generate-srd-pack.mjs`):

```js
node -e "
const fs=require('fs');
const oldFiles=['spells-5E-2014-EN.json','spells-5E-2014-PTBR.json','spells-5E-2024-EN.json','spells-5E-2024-PTBR.json'];
const oldDescs=new Set();
for(const f of oldFiles){ JSON.parse(fs.readFileSync(f,'utf8')).spells.forEach(s=>{ if(s.description) oldDescs.add(s.description); }); }
for(const f of ['srd-2014-en.json','srd-2024-en.json']){
  const j=JSON.parse(fs.readFileSync(f,'utf8'));
  const matched=j.spells.filter(s=>oldDescs.has(s.description));
  console.log(f, 'total', j.spells.length, 'matched', matched.length, matched.map(s=>s.name));
}
"
```

**Ruling do usuário (resolução do checkpoint, 2026-08-10):**

D-05, como escrito neste documento, é uma regra de **proveniência** — "os pacotes SRD nascem de uma fonte separada, com licença verificada de forma independente, nunca dos JSONs atuais do app". O plano 03-04 traduziu isso para um diff textual de zero interseção. Esse proxy falha nas duas direções: dá falso-positivo em transcrições fiéis e independentes do mesmo texto oficial (este caso — o gerador nunca lê `spells-5E-*.json`, verificado por inspeção de código), e passaria silenciosamente um arquivo genuinamente copiado após qualquer reformatação cosmética. A aplicação de D-05 passa a ser por **proveniência do gerador** (verificável por inspeção, resistente a reformatação), não por diff de bytes.

**O que este achado prova e o que NÃO prova:** as 123 entradas coincidentes confirmam que essa fração específica dos `spells-5E-*.json` atuais é texto puro do SRD (sem alteração). Isso **não diz nada** sobre a proveniência das entradas restantes desses quatro arquivos — o texto delas continua não-confiável por D-05, exatamente como antes.

**Consequência para a aplicação de D-05:** `scripts/check-srd-packs.tests.ps1` (plano 03-04, Task 3) verifica que `scripts/generate-srd-pack.mjs` nunca referencia nenhum dos quatro `spells-5E-*.json` (nem por nome literal, nem por padrão/glob), em vez de comparar texto de descrição. Os pacotes `srd-2014-en.json`/`srd-2024-en.json` foram commitados completos e sem alteração (319 + 339 magias) — nenhuma magia foi removida para forçar diferença de bytes.

## Emenda a D-06: listas por classe do SRD 5.1 (2026-09-05)

**Decisão do usuário, ciente de que reverte parcialmente a rejeição registrada acima.**

**Problema.** Os pacotes gerados pela rota (b) traziam **0 de 319** magias do 5.1 com o campo `class` — o painel de detalhe mostrava a seção CLASSES vazia. Causa: no SRD 5.1 a lista por classe vive num apêndice separado do PDF ("Spell Lists"), fora da descrição de cada magia, e `parseSrd51` percorre o fluxo de descrições. O SRD 5.2 não é afetado (339 de 339 já trazem `class`, o gist do dmcb é estruturado por magia).

**Por que o apêndice da Tabyltop não serve.** Foi tentado primeiro, por ser a fonte já aprovada. A extração do PDF colapsa as duas colunas da página e perde perto de metade das entradas — medido: Bardo com 54 entradas (o SRD real tem ~110), Mago com 153 (~200+), e 31 magias do pacote não aparecem em lista nenhuma (Cloudkill, Flame Strike, Divine Word entre elas). Casos concretos errados: `Cure Wounds` sem Bardo, `Bless` sem Clérigo. O defeito está na extração do PDF, **antes** da serialização — os três formatos publicados pela Tabyltop (`.json`, `.html`, `.txt`) herdam o mesmo dano, verificado nos três. Gerar classes daí produziria dado errado com aparência de autoritativo, que num app de consulta de regras é pior que não mostrar nada.

**Fonte adotada, e em que qualidade.** `5e-bits/5e-database`, arquivo `src/2014/en/5e-SRD-Spells.json` (https://raw.githubusercontent.com/5e-bits/5e-database/main/src/2014/en/5e-SRD-Spells.json). Usada **exclusivamente como transcrição das associações magia→classe** — nenhum byte de descrição, nome, nível, escola ou qualquer outro campo vem dela.

**Fundamento da licença.** A rejeição original de D-06 continua correta quanto ao fato: o README do 5e-bits declara a compilação sob OGL 1.0a, não CC-BY. O que muda o veredito para este uso estreito é que a WotC **dual-licenciou** o SRD 5.1 em janeiro de 2023 (OGL 1.0a **e** CC-BY-4.0). A associação "Fireball está nas listas de Feiticeiro e Mago" é fato do SRD, obtenível sob CC-BY-4.0 diretamente da fonte original; o que a OGL cobre é a compilação do 5e-bits, e não é a compilação deles que entra no pacote. Por isso `meta.license` do `srd-2014-en.json` permanece CC-BY-4.0 com atribuição à WotC, e o 5e-bits é registrado aqui como procedência auditável, não como licenciante.

**Ressalva honesta:** esta é uma leitura de licenciamento feita sem assessoria jurídica. A rota que remove qualquer ambiguidade é a que D-06 já nomeava como fallback — extrair as listas do `SRD_CC_v5.1.pdf` oficial (CC-BY-4.0, primeira parte). Se essa extração for feita algum dia, esta fonte pode ser aposentada sem tocar em mais nada: o join vive isolado em `applyClassLists()`.

**Garantias de integridade.** O join é por nome normalizado e cobre **319 de 319** magias. `applyClassLists()` **aborta a geração** se qualquer magia ficar sem par, em vez de escrever um pacote com classe faltando — classe ausente é o tipo de erro silencioso que leva o usuário a preparar magia errada. Conferido contra fatos conhecidos: `Fireball` → Feiticeiro/Mago, `Cure Wounds` → Bardo/Clérigo/Druida/Paladino/Patrulheiro, `Bless` → Clérigo/Paladino, `Vicious Mockery` → Bardo, `Hunter's Mark` → Patrulheiro. As 8 classes conjuradoras do SRD aparecem; nenhuma magia ficou sem classe.

**D-05 permanece intacta:** o gerador continua sem ler qualquer `spells-5E-*.json`, e o gate `check-srd-packs.tests.ps1` continua verificando isso por inspeção de código.

## SRD 5.2 (2024, PT-BR) — Fase 7

**Fonte adotada**

| Candidato | URL | Licença declarada | URL da declaração | Veredito | Razão |
|---|---|---|---|---|---|
| Heróis Anônimos, "Livro do Jogador (SRD Traduzido e organizado) 2024", versão 07/03/2025 | https://6x.work/heroisanonimos | Creative Commons Attribution 4.0 International (CC-BY-4.0) declarada no próprio documento | https://creativecommons.org/licenses/by/4.0/deed.pt_BR | ACEITA POR MAGIA (D-01) | O documento é o Player's Handbook 2024 inteiro traduzido (392 magias, 4 subclasses por classe, prefácio, créditos do PHB), então o selo CC-BY não se sustenta para o documento inteiro; vale magia a magia, porque o texto EN de cada uma das 339 do SRD 5.2 é CC-BY e a tradução é declarada CC-BY-4.0 pelos tradutores. Formato: Markdown, arquivo local `docs/superpowers/herois_anonimos/D&D 5.5 - Livro do Jogador (2024) 5.3.7.md` (1,4 MB), pasta no `.gitignore` — nunca versionado. Data de captura: 2026-09-26. |

**Fontes rejeitadas ou adiadas**

- SRD 5.1 pt-BR "DRS" dos Aventureiros dos Reinos (https://aventureirosdosreinos.com/documento-de-referencia-de-sistema-drs/) — REJEITADA: OGL 1.0a + autorização WotC nº 180618-000578 + Fan Content Policy, não CC-BY, e provável origem do texto dos JSONs PT-BR removidos na Fase 6.
- Artifício RPG SRD 5.2 pt-BR (https://artificiorpg.com/blog/srd-52-portugues-artificio-rpg-traducao/) — PREFERÍVEL mas INDISPONÍVEL (PDF 404 em 2026-09-26), parte do próprio SRD e não do PHB; trocar para ela se reaparecer é ideia adiada da Fase 7.
- WotC não publicou SRD em português (https://www.dndbeyond.com/srd lista fr/it/de/es).
- Consequência (D-03): só a edição 5.2 tem pack pt-BR.

**O que foi tomado** (D-17)

A seção "Licença" (linhas 3-76, de `## Licença` até antes de `# Prefácio`), verbatim; os blocos das 339 magias do SRD 5.2, pareados ao slug EN de `srd-2024-en.json` — 322 pela ponte de nomes do legado, 17 pela tabela manual `scripts/srd-sources/srd-5.2-ptbr-pairing.json`. Recorte versionado em `scripts/srd-sources/srd-5.2-ptbr-source.json`, produzido por `scripts/extract-ptbr-source.mjs`; o gerador lê só o recorte.

**O que NÃO foi tomado**

As 52 magias fora do SRD 5.2 (391 blocos nomeados no Markdown menos 339 mantidas — número exato do `07-01-SUMMARY.md`), incluindo as "Invocar X" e "Caldeirão Borbulhante de Tasha"; as 33 legendas de ilustração do PHB dentro dos blocos, descartadas por posição (D-18); os nomes próprios do PHB nas 17 magias renomeadas (D-16); classes, subclasses, talentos, equipamento, prefácio e demais capítulos do PHB.

**Relação com o JSON legado** (D-11, D-19, D-09, D-10)

`spells-5E-2024-PTBR.json` (removido na Fase 6) é parse anterior desta mesma fonte — resolve a "origem incerta" do D-05 da Fase 3 para esse arquivo. É regenerado localmente em formato de pack por `scripts/build-legacy-fixtures.mjs` em `.cache/legacy-fixtures/`, protegido só pelo `.gitignore` (decisão do usuário, D-10), e usado só para parear (nome, slug) e como oráculo do extrator (303/322 magias pareadas confirmadas, `07-01-SUMMARY.md`); nenhum byte dele entra no pack.

**Divergências fonte × SRD 5.2 EN** (medidas; como o pack resolve)

- Escola de `resilient-sphere` (tradução: Abjuração; SRD: evocation) — o pack segue o SRD.
- `call-lightning` sem a cláusula de tempestade e sem a seção de círculo superior na tradução — corrigido por errata (`PTBR_ERRATA` em `generate-srd-pack.mjs`, commit `384849b`): os dois trechos foram traduzidos do SRD 5.2 EN; declarado em `MODIFICATION_NOTE_PTBR`.
- `forcecage`: a tradução marcava concentração, o SRD 5.2 não — corrigido pela mesma errata (duração "1 hora", sem concentração).
- `glyph-of-warding`: o erro estava no pack EN (flag de concentração vindo do gist) — corrigido no lado EN do gerador; os dois packs concordam.
- Círculo e classes: 0 divergências.

**Atribuição e nota de modificação** (D-02, D-04)

`meta.license.attribution` = atribuição verbatim do SRD 5.2 (a mesma da seção "Texto de atribuição por edição" acima) + linha em branco + a seção Licença verbatim do Heróis Anônimos. A nota de modificação pt-BR (`MODIFICATION_NOTE_PTBR` em 07-02) é transcrita exatamente, e a nota única da Fase 3 continua valendo só para os dois packs EN.

**Tensão registrada**

A seção Licença verbatim (exigida por D-02) inclui créditos da equipe da WotC, aviso de marcas e o título "Caldeirão de Todas as Coisas de Tasha"; a regra do SRD citada acima ("Please do not include any other attribution regarding Wizards other than that provided above") pede que não se inclua outra atribuição à Wizards além da oficial. A decisão do usuário (D-02) prevalece; o gate `check-srd-ptbr-pack.tests.ps1` isenta `meta.license.attribution` da varredura de nomes próprios por esse motivo. Revisitar se a fonte for trocada.
