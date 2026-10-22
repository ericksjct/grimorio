# Phase 7: Tradução dos SRDs para pt-BR - Pattern Map

**Mapped:** 2026-09-26
**Files analyzed:** 10
**Analogs found:** 10 / 10

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `scripts/extract-ptbr-source.mjs` (novo, D-17) | utility (one-shot build script) | file-I/O (parse Markdown → JSON) | `scripts/generate-srd-pack.mjs` (fetchSource/cache pattern) | role-match |
| `scripts/srd-sources/srd-5.2-ptbr-source.json` (novo, D-17) | config/data (fonte versionada) | file-I/O | `scripts/srd-sources/srd-5.2-spells.json` | exact |
| `scripts/ptbr-name-pairing.json` (novo, D-12) | config/data (tabela de pareamento) | file-I/O | (nenhum equivalente — ver "No Analog Found") | none |
| `scripts/generate-srd-pack.mjs` (modificado — nova rota `parsePtbr52`/EDITIONS entry, `MODIFICATION_NOTE` por pacote) | utility (build-time generator) | transform (Markdown/JSON → pack) | ele mesmo (`parseSrd51`/`parseSrd52`, `EDITIONS`, `buildPack`) | exact (auto-analog) |
| `srd-2024-ptbr.json` (gerado, não escrito à mão) | model/data (pack embutido) | CRUD (leitura estática pelo app) | `srd-2024-en.json` / `srd-2014-en.json` (formato) | exact |
| `spells-data-loader.jsx` (modificado — `BUILTIN_VERSIONS`, `LEGACY_VERSION_FALLBACK`) | store/provider (registro de versões, client-side) | request-response (fetch + cache) | ele mesmo (padrão já existente, mutação in-place) | exact (auto-analog) |
| `sw.js` (modificado — `CACHE_VERSION`, `PRECACHE`) | config (service worker) | file-I/O (precache) | ele mesmo | exact (auto-analog) |
| `scripts/check-srd-ptbr-pack.tests.ps1` (novo) | test (gate estático) | batch (validação de pack) | `scripts/check-srd-packs.tests.ps1` | exact |
| `scripts/check-decommission.tests.ps1` (modificado — 2→3) | test (gate estático) | batch | ele mesmo | exact (auto-analog) |
| `scripts/check-migration-version-fallback.tests.ps1` (modificado — tabela D-08) | test (gate estático) | batch | ele mesmo | exact (auto-analog) |
| `.gitignore` | config | — | já contém a entrada (D-02 confirmado nesta pesquisa) — nenhuma edição necessária | n/a |
| `.planning/phases/03-srd-pack-import-pipeline/03-SRD-SOURCE.md` (nova seção pt-BR) | docs | — | seções existentes "SRD 5.1"/"SRD 5.2" no mesmo arquivo | exact |
| `.planning/REQUIREMENTS.md` (novo SRD-04) | docs | — | linhas SRD-01/02/03 existentes | exact |

## Pattern Assignments

### `scripts/extract-ptbr-source.mjs` (novo utility, file-I/O)

**Analog:** `scripts/generate-srd-pack.mjs` (cabeçalho + `fetchSource`/cache)

**Cabeçalho de convenção do projeto** (`scripts/generate-srd-pack.mjs` linhas 1-36): todo gerador one-shot abre com um comentário que declara (a) como rodar (`node scripts/...`), (b) que nunca é carregado pelo navegador/sw.js, (c) a fonte exata com URL/licença, (d) a regra D-05 ("nenhum byte de `spells-5E-*.json` entra aqui"). O novo script de recorte deve seguir a MESMA forma de cabeçalho, citando:
- a fonte é `docs/superpowers/herois_anonimos/D&D 5.5 - Livro do Jogador (2024) 5.3.7.md` (pasta `.gitignore`d, nunca lida por `generate-srd-pack.mjs`);
- roda só à mão (D-17), nunca invocado por `generate-srd-pack.mjs` nem pelo runtime;
- grava a licença (linhas 3-76) + os 339 blocos de magia do SRD 5.2 em `scripts/srd-sources/srd-5.2-ptbr-source.json`.

**Imports pattern** (linhas 38-40):
```javascript
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
```
Reaproveitar tal qual — nenhuma dependência nova (nenhum parser Markdown de terceiro; ver RESEARCH.md "Don't Hand-Roll").

**Normalização CRLF (Pitfall 7 do RESEARCH.md)** — não há precedente direto no gerador atual (a fonte 5.2 já vem em JSON), mas a disciplina de "normalizar antes de parsear" é a mesma do padrão de leitura de arquivo já usado:
```javascript
const raw = await readFile(sourcePath, 'utf8');
const text = raw.replace(/\r\n/g, '\n');
```

**Entry point pattern** (linhas 610-615, reaproveitar a forma, não o conteúdo):
```javascript
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
```

---

### `scripts/generate-srd-pack.mjs` (modificado — nova rota pt-BR)

**Analog:** ele mesmo — o arquivo já resolve "registro estruturado → pack válido" duas vezes; a única peça nova é um terceiro extrator (`parsePtbr52`) que produz o MESMO formato intermediário que `parseSrd51`/`parseSrd52` já produzem.

**Formato intermediário a produzir** (contrato implícito consumido por `toSpell`, linhas 82-104):
```javascript
{
  displayName, level, school, ritual, concentration,
  castTime, range, components, duration,
  description,            // HTML: '<p>...</p>' ou '<ul>...</ul>'/'<table>...</table>'
  upgradeDescription,     // string HTML ou null
  source,                 // ex.: 'SRD 5.2'
  class,                  // array de nomes EM INGLÊS (Pitfall 2 — nunca 'Guardião')
}
```

**MODIFICATION_NOTE por pacote (D-04)** — hoje é uma constante única (linha 46-47):
```javascript
const MODIFICATION_NOTE =
  'Texto reformatado para JSON e HTML estrutural; conteúdo da magia não foi alterado.';
```
Passa a ser um campo por item de `EDITIONS`, análogo ao já existente `attribution` (linhas 367-368, 394-395) — mesma forma de string longa registrada na entrada da edição, consumida em `buildPack()` (linha 559-578) em vez da constante de topo.

**Registro de edição — modelo a copiar (5.2 EN, linhas 387-397)**:
```javascript
{
  file: 'srd-2024-en.json',
  source: 'srd-2024-en',
  edition: '2024',
  srdVersion: '5.2',
  sourceUrl: 'https://gist.github.com/dmcb/4b67869f962e3adaa3d0f7e5ca8f4912',
  localSourcePath: 'scripts/srd-sources/srd-5.2-spells.json',
  attribution: '...',
  extract: parseSrd52,
}
```
A entrada pt-BR usa o mesmo formato de `localSourcePath` apontando para `scripts/srd-sources/srd-5.2-ptbr-source.json`, `extract: parsePtbr52`, `lang: 'ptbr'` propagado até `buildPack()` (hoje hardcoded `lang: 'en'` na linha 566 — vira parametrizado por edição).

**`buildPack()` atual (linhas 559-578) — extensão necessária**:
```javascript
function buildPack(edition, spells) {
  return {
    meta: {
      source: edition.source,
      name: `SRD ${edition.srdVersion} (EN)`,   // precisa virar `(PT-BR)` condicional
      version: edition.srdVersion,
      author: 'Wizards of the Coast LLC',        // pt-BR tem DOIS detentores (D-02)
      lang: 'en',                                 // precisa vir de edition.lang
      edition: edition.edition,
      spellCount: spells.length,
      license: {
        id: 'CC-BY-4.0',
        attribution: edition.attribution,
        modifications: edition.modificationNote,  // por pacote (D-04), não a constante
        url: 'https://creativecommons.org/licenses/by/4.0/legalcode',
      },
    },
    spells,
  };
}
```

**Erro em vez de pacote parcial (padrão `applyClassLists`, linhas 405-431)** — o extrator pt-BR deve seguir a MESMA disciplina: se alguma das 339 magias do SRD não parear (D-11/D-12), `throw new Error(...)` listando as faltantes em vez de escrever pack incompleto — não silenciar.

**Reuso direto, sem mudança:** `slugify()` (51-59), `freeIdentifier()` (64-69), `htmlEscape()` (71-73), `toSpell()` (82-104), `validatePackAgainstSchema()` (471-555).

---

### Extrator pt-BR — helpers novos necessários (sem analog interno, técnica nova)

Não há função de lista/tabela Markdown → HTML no gerador atual (`parseSrd51` opera sobre nós de PDF já estruturados, `tableToHtml` linha 170-185 recebe `tableNode.rows`, não texto pipe-delimitado). Usar como MOLDE DE FORMA (não de implementação) o `tableToHtml` existente — mesma saída `<table><tbody>...</tbody></table>`, `<th>` só quando a célula for cabeçalho:
```javascript
// scripts/generate-srd-pack.mjs linhas 170-185 — forma de saída a replicar
function tableToHtml(tableNode) {
  const rows = tableNode.rows.map((row) => {
    const cells = row.map((cell) => {
      const t = htmlEscape(textOf(cell).trim());
      const tag = isHeader ? 'th' : 'td';
      return `<${tag}>${t}</${tag}>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');
  return `<table><tbody>${rows}</tbody></table>`;
}
```
Para o pt-BR, a entrada é texto Markdown pipe-delimitado (`|...|`), então o parser precisa dividir em linhas, descartar a linha separadora `|---|---|`, e mapear cabeçalho/corpo — mas a FORMA da saída HTML deve casar com este padrão.

**`markUpgradeHeading()` (linhas 137-143)** — mesma técnica se aplica ao rótulo pt-BR `**Usando um Espaço de Magia de Círculo Superior.**` / `**Aprimoramento de Truque.**`: emitir `<strong><em>Rótulo.</em></strong> resto`, espelhando a forma já usada pelos dois packs EN (consistência entre os 3 packs, ver RESEARCH.md "State of the Art").

---

### `spells-data-loader.jsx` (modificado — D-05/D-06/D-07/D-08)

**Analog:** o próprio arquivo — regra dura de mutação in-place, já documentada.

**`BUILTIN_VERSIONS` — entrada a acrescentar** (linhas 29-32, ANTES do `.slice()` da linha 40):
```javascript
const BUILTIN_VERSIONS = [
  { key: 'srd-2024-en', source: 'fetch', file: 'srd-2024-en.json', lang: 'en', edition: '5e 2024', corpus: 'srd', labelPt: 'SRD 5.2 (EN)', labelEn: 'SRD 5.2 (EN)', short: 'SRD 5.2' },
  { key: 'srd-2014-en', source: 'fetch', file: 'srd-2014-en.json', lang: 'en', edition: '5e 2014', corpus: 'srd', labelPt: 'SRD 5.1 (EN)', labelEn: 'SRD 5.1 (EN)', short: 'SRD 5.1' },
  // NOVA (D-05): { key: 'srd-2024-ptbr', source: 'fetch', file: 'srd-2024-ptbr.json', lang: 'ptbr', edition: '5e 2024', corpus: 'srd', labelPt: '...', labelEn: '...', short: '...' }
];
```
Nota de ordem (comentário linhas 19-24): a ordem é semântica — índice 0 é o último elo do fallback e a primeira entrada `lang: 'en'` é o default de navegador EN. Colocar a entrada pt-BR SEM quebrar essas duas garantias (ex.: acrescentar ao final, não no índice 0).

**`LEGACY_VERSION_FALLBACK` — tabela fechada a trocar (linhas 74-79, D-08)**:
```javascript
// ANTES (Fase 6, D-04 daquela fase):
const LEGACY_VERSION_FALLBACK = Object.assign(Object.create(null), {
  'spells-5E-2024-PTBR': 'srd-2024-en',
  'spells-5E-2024-EN': 'srd-2024-en',
  'spells-5E-2014-PTBR': 'srd-2014-en',
  'spells-5E-2014-EN': 'srd-2014-en',
});
// DEPOIS (D-08 desta fase — só as 2 chaves PTBR mudam de destino):
const LEGACY_VERSION_FALLBACK = Object.assign(Object.create(null), {
  'spells-5E-2024-PTBR': 'srd-2024-ptbr',
  'spells-5E-2024-EN': 'srd-2024-en',
  'spells-5E-2014-PTBR': 'srd-2024-ptbr',
  'spells-5E-2014-EN': 'srd-2014-en',
});
```
Mecanismo de leitura intocado — `_initialVersionKey()` (linhas 468-497), especialmente o bloco 482-490, já lê `LEGACY_VERSION_FALLBACK[prefs.versionKey]` e grava `window.__legacyVersionFallback`; nenhuma mudança de código ali, só o valor da tabela acima.

**`_initialVersionKey()` — detecção pt-BR (linhas 491-494)** — já pronta, nenhuma mudança:
```javascript
const nav = (navigator.languages && navigator.languages[0]) || navigator.language || '';
const lang = String(nav).toLowerCase().startsWith('pt') ? 'ptbr' : 'en';
const v = SPELL_VERSIONS.find(x => x.lang === lang);
if (v) return v.key;
```

**`adaptSpell()` — já trata `versionLang === 'ptbr'` corretamente (linhas 357-442), NENHUMA mudança**:
```javascript
const nameEn = versionLang === 'en' ? (s.displayName || s.name || '') : (s.name || '');
...
classes: versionLang === 'ptbr' ? classesPt : classesEn,
```

**Pitfall 2 (Guardião ≠ patrulheiro) — tabela existente a NÃO tocar, mas a espelhar dentro do gerador**:
```javascript
// spells-data-loader.jsx linhas 262-277 — NÃO editar (mudaria a palavra
// exibida hoje pro pack EN). O gerador precisa de uma tabela PRÓPRIA,
// dentro de generate-srd-pack.mjs, com pelo menos `guardião: 'ranger'`
// além dos pares já existentes aqui (inversos de CLASS_PT/CLASS_EN).
const CLASS_EN = Object.assign(Object.create(null), {
  bardo: 'bard', 'clérigo': 'cleric', druida: 'druid', feiticeiro: 'sorcerer',
  bruxo: 'warlock', mago: 'wizard', patrulheiro: 'ranger', paladino: 'paladin',
  artífice: 'artificer', monge: 'monk', bárbaro: 'barbarian', guerreiro: 'fighter', ladino: 'rogue',
});
```

---

### `sw.js` (modificado — D-05)

**Analog:** ele mesmo.

**`CACHE_VERSION` — bump obrigatório** (linha 21):
```javascript
const CACHE_VERSION = 'grimorio-v3';   // → 'grimorio-v4' (regra do comentário linhas 16-20:
                                         // acrescentar entrada a PRECACHE cujo conteúdo é novo
                                         // exige bump, senão quem já tem o SW instalado nunca
                                         // baixa o pack novo)
```

**`PRECACHE` — nova linha** (após linha 48-49):
```javascript
  './srd-2024-en.json',
  './srd-2014-en.json',
  './srd-2024-ptbr.json',   // NOVA (D-05)
```

---

### `scripts/check-srd-ptbr-pack.tests.ps1` (novo gate — D-14/D-16/D-18)

**Analog:** `scripts/check-srd-packs.tests.ps1` (estrutura geral) + `scripts/check-decommission.tests.ps1` (padrão de prova de execução via `node`).

**Estrutura de carregamento e campos obrigatórios (D-14)** — copiar a forma das linhas 1-25 e 34-47 de `check-srd-packs.tests.ps1`:
```powershell
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$pack = Get-Content -Raw -LiteralPath (Join-Path $repoRoot 'srd-2024-ptbr.json') | ConvertFrom-Json
$en = Get-Content -Raw -LiteralPath (Join-Path $repoRoot 'srd-2024-en.json') | ConvertFrom-Json

if ($pack.spells.Count -ne 339) { throw "srd-2024-ptbr.json: esperava 339 magias, achei $($pack.spells.Count)." }
if ($pack.meta.lang -ne 'ptbr') { throw "meta.lang esperado 'ptbr'." }
if ([string]::IsNullOrWhiteSpace($pack.meta.license.attribution)) { throw 'meta.license.attribution vazio.' }
if ([string]::IsNullOrWhiteSpace($pack.meta.license.modifications)) { throw 'meta.license.modifications vazio.' }

$enNames = @{}
foreach ($s in $en.spells) { $enNames[$s.name] = $s }
foreach ($s in $pack.spells) {
  if ([string]::IsNullOrWhiteSpace($s.description)) { throw "'$($s.name)': description vazia." }
  if (-not $enNames.ContainsKey($s.name)) { throw "'$($s.name)': nao existe em srd-2024-en.json (D-18)." }
  $enSpell = $enNames[$s.name]
  if ($s.level -ne $enSpell.level) { throw "'$($s.name)': level $($s.level) != EN $($enSpell.level)." }
  if ($s.school -ne $enSpell.school) { throw "'$($s.name)': school '$($s.school)' != EN '$($enSpell.school)'." }
}
```

**Checagem de nomes próprios banidos (D-16)** — padrão análogo à busca por string literal em `check-srd-packs.tests.ps1` linhas 68-73:
```powershell
$banned = @('Bigby', 'Tasha', 'Otiluke', 'Mordenkainen', 'Melf', 'Leomund', 'Rary', 'Evard', 'Drawmij', 'Tenser', 'Nystul', 'Otto')
$packJson = Get-Content -Raw -LiteralPath (Join-Path $repoRoot 'srd-2024-ptbr.json')
foreach ($nome in $banned) {
  if ($packJson -match [regex]::Escape($nome)) {
    throw "srd-2024-ptbr.json contem o nome proprio banido '$nome' (D-16) — a troca pelo nome generico do SRD falhou em algum campo."
  }
}
```

**Prova de execução via `node` (padrão de `check-decommission.tests.ps1` linhas 96-140)** — mesmo esqueleto `$nodeScript` heredoc + `Set-Content`/`node $tmp`/`Remove-Item`, adaptado para validar `EDITIONS` do gerador contra o pack escrito.

---

### `scripts/check-decommission.tests.ps1` (modificado)

**Trocar as duas constantes de contagem** (linhas 78 e 111):
```powershell
# linha 78 — de:
if ($spellJsonEntries.Count -ne 2) { throw "PRECACHE deve listar exatamente 2 JSONs..." }
# para:
if ($spellJsonEntries.Count -ne 3) { throw "PRECACHE deve listar exatamente 3 JSONs..." }
```
```javascript
// dentro do $nodeScript heredoc, linha 111 — de:
if (BUILTIN_VERSIONS.length !== 2) { ... }
// para:
if (BUILTIN_VERSIONS.length !== 3) { ... }
```
Nota: a checagem de `v.source !== 'fetch'` e existência de arquivo (linhas 116-121) já cobre a entrada nova automaticamente — nenhuma outra mudança.

---

### `scripts/check-migration-version-fallback.tests.ps1` (modificado)

**Tabela de casos a atualizar dentro do `$nodeScript` heredoc (linhas 81-86)**:
```javascript
// ANTES:
const cases = {
  'spells-5E-2024-PTBR': 'srd-2024-en',
  'spells-5E-2024-EN': 'srd-2024-en',
  'spells-5E-2014-PTBR': 'srd-2014-en',
  'spells-5E-2014-EN': 'srd-2014-en',
};
// DEPOIS (D-08):
const cases = {
  'spells-5E-2024-PTBR': 'srd-2024-ptbr',
  'spells-5E-2024-EN': 'srd-2024-en',
  'spells-5E-2014-PTBR': 'srd-2024-ptbr',
  'spells-5E-2014-EN': 'srd-2014-en',
};
```
Nota (linha 93-96 do script): `LEGACY_VERSION_FALLBACK['srd-2024-en']` deve continuar `undefined` — acrescentar também `LEGACY_VERSION_FALLBACK['srd-2024-ptbr']` como `undefined` esperado, já que a nova chave também é alvo válido, não origem.

---

## Shared Patterns

### Extração build-time isolada (D-06 da Fase 3 + D-17 desta fase)
**Source:** cabeçalho de `scripts/generate-srd-pack.mjs` (linhas 1-36)
**Apply to:** `scripts/extract-ptbr-source.mjs`, rota nova dentro de `generate-srd-pack.mjs`
Regra: nenhum script de build lê fonte "ao vivo" fora de uma etapa isolada e documentada; o artefato produzido é sempre versionado antes do próximo passo do pipeline o consumir. `extract-ptbr-source.mjs` lê o PHB (ignorado); `generate-srd-pack.mjs` só lê o recorte já versionado.

### Reuso de helpers do pipeline (D-13 da Fase 3)
**Source:** `slugify()`, `freeIdentifier()`, `htmlEscape()`, `toSpell()`, `validatePackAgainstSchema()` — todos em `scripts/generate-srd-pack.mjs` linhas 51-104 e 471-555
**Apply to:** o novo extrator `parsePtbr52` — produz o mesmo formato intermediário; nenhuma dessas funções é reescrita.

### Falha explícita em vez de pacote parcial
**Source:** `applyClassLists()`, `scripts/generate-srd-pack.mjs` linhas 405-431 (`throw` listando magias sem par)
**Apply to:** filtro D-01/D-18 (magia fora do conjunto `srd-2024-en.json`) e pareamento D-11/D-12 (magia sem par nome↔slug) dentro do extrator pt-BR — mesmo padrão: `throw new Error` com a lista de nomes problemáticos, nunca gravar pack incompleto silenciosamente.

### Gate estático + prova de execução via node
**Source:** `scripts/check-decommission.tests.ps1` linhas 96-140, `scripts/check-migration-version-fallback.tests.ps1` linhas 69-122
**Apply to:** `scripts/check-srd-ptbr-pack.tests.ps1` (novo) — mesmo esqueleto de heredoc `$nodeScript` + arquivo temporário + `node $tmp` + `Remove-Item -Force` no `finally`.

### Mutação in-place de `SPELL_VERSIONS`/`BUILTIN_VERSIONS`
**Source:** `spells-data-loader.jsx` linhas 19-40 (comentário + `const SPELL_VERSIONS = BUILTIN_VERSIONS.slice()`)
**Apply to:** a entrada `srd-2024-ptbr` entra na literal de `BUILTIN_VERSIONS`, nunca por reatribuição do array — mesma regra dura já documentada no arquivo.

### Bump de `CACHE_VERSION` ao tocar `PRECACHE`
**Source:** `sw.js` linhas 16-21 (comentário + constante)
**Apply to:** qualquer adição/mudança de arquivo listado em `PRECACHE` — o pack pt-BR novo exige bump `v3 → v4`.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `scripts/ptbr-name-pairing.json` | config/data | file-I/O | Nenhum arquivo do projeto hoje representa uma tabela de pareamento nome↔slug versionada à mão; usar `scripts/srd-sources/srd-5.2-spells.json` (estrutura de fonte JSON simples) como referência de FORMATO geral (objeto/array plano, sem metadata desnecessária), não de conteúdo. RESEARCH.md deixa o formato exato a critério do planner. |
| Parser Markdown de prosa → registro estruturado (`parsePtbr52` interno) | transform | transform | Técnica inteiramente nova no projeto — `parseSrd51` opera sobre nós de PDF já estruturados, `parseSrd52` sobre JSON já estruturado; nenhum dos dois lê texto Markdown solto. RESEARCH.md "Architecture Patterns" (Patterns 1-5) e "Common Pitfalls" (1-7) são a referência primária aqui, não um analog de código. |

## Metadata

**Analog search scope:** `scripts/*.mjs`, `scripts/*.tests.ps1`, `spells-data-loader.jsx`, `sw.js`, `.gitignore`, `.planning/phases/03-srd-pack-import-pipeline/03-SRD-SOURCE.md`, `.planning/REQUIREMENTS.md`
**Files scanned:** 7 arquivos de código lidos por completo (`generate-srd-pack.mjs`, `check-decommission.tests.ps1`, `check-migration-version-fallback.tests.ps1`, `check-srd-packs.tests.ps1`, `sw.js`, `.gitignore`) + seções específicas de `spells-data-loader.jsx` (linhas 1-140, 246-290, 355-520, 873-874)
**Pattern extraction date:** 2026-09-26
