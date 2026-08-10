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
