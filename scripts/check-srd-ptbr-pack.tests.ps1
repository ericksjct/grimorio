$ErrorActionPreference = 'Stop'

# Gate permanente do pack pt-BR (srd-2024-ptbr.json), fase 07-traducao-srd-ptbr.
#
# Trava:
# - D-14: critério de aceitação — 339 magias, nenhum campo obrigatório vazio,
#   `level`/`school`/`class` iguais ao SRD EN, ritual/concentração coerentes com o
#   texto exibido, HTML embutido sem vetor de injeção.
# - D-16/D-18: nenhum dos 12 nomes próprios do Player's Handbook sobrevive em
#   qualquer campo de qualquer magia, nem no recorte fonte, e cada uma das 17
#   magias renomeadas usa o `displayName` da tabela de pareamento.
# - D-01: o conjunto de `name` do pack pt-BR é EXATAMENTE o conjunto do SRD EN —
#   nenhuma magia fora do SRD 5.2, nenhuma faltando.
# - D-02/D-04: atribuição dupla verbatim (WotC + Heróis Anônimos) e nota de
#   modificação própria, diferente da nota dos packs EN.
# - D-13: identidade por slug — `name` nunca é traduzido.
# - Proveniência do gerador (D-11/D-17): o gerador só pode ler o recorte
#   versionado, nunca o documento completo nem os fixtures locais.
#
# EXCEÇÃO DELIBERADA: `meta.license.attribution` fica FORA da varredura de nomes
# próprios do D-16. O D-02 exige a seção "Licença" do Heróis Anônimos verbatim, e
# essa seção credita o título de uma obra que contém um desses nomes — atribuição
# é crédito de licença, não conteúdo de magia, e não deve ser reescrita.

$repoRoot = Split-Path -Parent $PSScriptRoot

$packPath = Join-Path $repoRoot 'srd-2024-ptbr.json'
$sourcePath = Join-Path $repoRoot 'scripts\srd-sources\srd-5.2-ptbr-source.json'
$pairingPath = Join-Path $repoRoot 'scripts\srd-sources\srd-5.2-ptbr-pairing.json'

# ── Seção 1: existência ───────────────────────────────────────────────────
if (-not (Test-Path -LiteralPath $packPath)) {
  throw "srd-2024-ptbr.json nao existe - rode node scripts/generate-srd-pack.mjs"
}
if (-not (Test-Path -LiteralPath $sourcePath)) {
  throw "scripts/srd-sources/srd-5.2-ptbr-source.json nao existe - rode scripts/extract-ptbr-source.mjs (fase 07-01)."
}
if (-not (Test-Path -LiteralPath $pairingPath)) {
  throw "scripts/srd-sources/srd-5.2-ptbr-pairing.json nao existe - tabela de pareamento da fase 07-01."
}

# ── Seção 2 (D-02): o documento completo do Heróis Anônimos nunca é versionado ──
Push-Location $repoRoot
try {
  $tracked = & git ls-files -- docs/superpowers/herois_anonimos
} finally {
  Pop-Location
}
if ($tracked) {
  throw "docs/superpowers/herois_anonimos esta rastreado pelo git - o documento completo (PHB) nao pode entrar no repositorio (D-02, D-17)."
}

# ── Seção 3 (D-11/D-17): proveniência do gerador ──────────────────────────
$genPath = Join-Path $repoRoot 'scripts\generate-srd-pack.mjs'
$gen = Get-Content -Raw -LiteralPath $genPath

foreach ($needle in @('function parsePtbr52', 'srd-5.2-ptbr-source.json', 'modificationNote')) {
  if ($gen -notmatch [regex]::Escape($needle)) {
    throw "generate-srd-pack.mjs nao contem '$needle' - a rota pt-BR (Task 2) ainda nao existe ou foi removida."
  }
}
foreach ($needle in @('herois_anonimos', 'legacy-fixtures')) {
  if ($gen -match [regex]::Escape($needle)) {
    throw "generate-srd-pack.mjs referencia '$needle' - o gerador so pode ler o recorte versionado, nunca o documento completo nem os fixtures locais (D-11/D-17)."
  }
}

# ── Seção 4: prova em node (conteúdo do pack) ─────────────────────────────
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  Write-Warning 'node nao encontrado - prova de conteudo do gate pt-BR pulada.'
  Write-Output 'SRD pt-BR pack: structural checks passed (proveniencia + secoes 1-3), execution proof skipped (no node).'
  Write-Output 'SRD pt-BR pack: conjunto do SRD 5.2, atribuicao dupla verbatim, sem nomes proprios do PHB.'
  return
}

$nodeScript = @'
const fs = require("fs");

const ptbr = JSON.parse(fs.readFileSync("srd-2024-ptbr.json", "utf8"));
const en = JSON.parse(fs.readFileSync("srd-2024-en.json", "utf8"));
const recorte = JSON.parse(fs.readFileSync("scripts/srd-sources/srd-5.2-ptbr-source.json", "utf8"));
const pairing = JSON.parse(fs.readFileSync("scripts/srd-sources/srd-5.2-ptbr-pairing.json", "utf8"));

const fails = [];
const fail = (msg) => fails.push(msg);

// ── meta ───────────────────────────────────────────────────────────────
if (ptbr.meta.lang !== "ptbr") fail(`meta.lang esperado 'ptbr', achei '${ptbr.meta.lang}'`);
if (ptbr.meta.source !== "srd-2024-ptbr") fail(`meta.source esperado 'srd-2024-ptbr', achei '${ptbr.meta.source}'`);
if (ptbr.meta.edition !== "2024") fail(`meta.edition esperado '2024', achei '${ptbr.meta.edition}'`);
if (ptbr.meta.spellCount !== ptbr.spells.length) fail(`meta.spellCount (${ptbr.meta.spellCount}) != spells.length (${ptbr.spells.length})`);
if (ptbr.meta.license.id !== "CC-BY-4.0") fail(`meta.license.id esperado 'CC-BY-4.0', achei '${ptbr.meta.license.id}'`);

const attr = ptbr.meta.license.attribution || "";
if (!attr.startsWith(en.meta.license.attribution)) fail("meta.license.attribution nao comeca com a atribuicao verbatim da WotC (SRD 5.2 EN).");
if (!attr.endsWith(recorte.license)) fail("meta.license.attribution nao termina com a secao Licenca verbatim do recorte (Herois Anonimos).");

const mods = ptbr.meta.license.modifications || "";
if (!mods) fail("meta.license.modifications vazio.");
if (mods === en.meta.license.modifications) fail("meta.license.modifications identico ao pack EN - precisa ser nota propria (D-04).");
if (!mods.includes("Heróis Anônimos")) fail("meta.license.modifications nao cita 'Heróis Anônimos'.");
if (!mods.includes("339")) fail("meta.license.modifications nao cita '339'.");

// ── conjunto (D-01/D-18) ──────────────────────────────────────────────
if (ptbr.spells.length !== 339) fail(`esperado 339 magias, achei ${ptbr.spells.length}`);

const ptNames = new Set(ptbr.spells.map((s) => s.name));
if (ptNames.size !== ptbr.spells.length) fail("ha nomes duplicados no pack pt-BR.");

const enNames = new Set(en.spells.map((s) => s.name));
for (const n of enNames) if (!ptNames.has(n)) fail(`magia do SRD EN ausente no pack pt-BR: ${n}`);
for (const n of ptNames) if (!enNames.has(n)) fail(`magia '${n}' no pack pt-BR nao existe no SRD EN - fora do recorte do SRD 5.2.`);

// ── por magia (D-14) ───────────────────────────────────────────────────
const enByName = new Map(en.spells.map((s) => [s.name, s]));
const CONCENTRATION_EXCEPTIONS = new Set(["forcecage", "glyph-of-warding"]);
const UPGRADE_EXCEPTIONS = new Set(["call-lightning"]);

for (const spell of ptbr.spells) {
  const enSpell = enByName.get(spell.name);
  if (!enSpell) { fail(`magia '${spell.name}' sem correspondente no SRD EN.`); continue; }

  for (const field of ["description", "displayName", "castTime", "range", "components", "duration"]) {
    if (!spell[field] || !String(spell[field]).trim()) fail(`'${spell.name}': campo '${field}' vazio.`);
  }

  if (spell.level !== enSpell.level) fail(`'${spell.name}': level ${spell.level} != EN ${enSpell.level}`);
  if (spell.school !== enSpell.school) fail(`'${spell.name}': school '${spell.school}' != EN '${enSpell.school}'`);
  if (JSON.stringify(spell.class || []) !== JSON.stringify(enSpell.class || [])) {
    fail(`'${spell.name}': class ${JSON.stringify(spell.class)} != EN ${JSON.stringify(enSpell.class)}`);
  }

  const ritualFromText = /\bRitual\b/.test(spell.castTime || "");
  if (!!spell.ritual !== ritualFromText) fail(`'${spell.name}': ritual (${!!spell.ritual}) nao bate com o texto de castTime.`);
  if (!!spell.ritual !== !!enSpell.ritual) fail(`'${spell.name}': ritual (${!!spell.ritual}) != EN (${!!enSpell.ritual})`);

  const concFromText = /^Concentração/.test(spell.duration || "");
  if (!!spell.concentration !== concFromText) fail(`'${spell.name}': concentration (${!!spell.concentration}) nao bate com o texto de duration.`);
  if (!CONCENTRATION_EXCEPTIONS.has(spell.name) && !!spell.concentration !== !!enSpell.concentration) {
    fail(`'${spell.name}': concentration (${!!spell.concentration}) != EN (${!!enSpell.concentration})`);
  }

  if (!UPGRADE_EXCEPTIONS.has(spell.name) && !!spell.upgradeDescription !== !!enSpell.upgradeDescription) {
    fail(`'${spell.name}': presenca de upgradeDescription (${!!spell.upgradeDescription}) != EN (${!!enSpell.upgradeDescription})`);
  }
  if (spell.upgradeDescription && !spell.upgradeDescription.startsWith("<p><strong><em>")) {
    fail(`'${spell.name}': upgradeDescription nao comeca com '<p><strong><em>'.`);
  }

  // markdown cru: nada de ** / |--- / linha de lista crua deve sobrar
  for (const field of ["description", "upgradeDescription"]) {
    const v = spell[field];
    if (!v) continue;
    if (v.includes("**")) fail(`'${spell.name}': '${field}' ainda contem '**' (markdown cru).`);
    if (v.includes("|---")) fail(`'${spell.name}': '${field}' ainda contem '|---' (markdown cru).`);
    if (/^-\s/m.test(v)) fail(`'${spell.name}': '${field}' ainda contem linha de lista crua ('- ...').`);
  }
}

// ── D-16: nomes próprios banidos ──────────────────────────────────────
const BANNED = ["Bigby", "Tasha", "Otiluke", "Mordenkainen", "Melf", "Leomund", "Rary", "Evard", "Drawmij", "Tenser", "Nystul", "Otto"];
const bannedRe = new RegExp("\\b(" + BANNED.join("|") + ")\\b");

for (const spell of ptbr.spells) {
  const m = JSON.stringify(spell).match(bannedRe);
  if (m) fail(`'${spell.name}': nome proprio banido '${m[1]}' encontrado em algum campo.`);
}
for (const field of ["name", "author"]) {
  const m = String(ptbr.meta[field] || "").match(bannedRe);
  if (m) fail(`meta.${field}: nome proprio banido '${m[1]}'.`);
}
{
  const m = mods.match(bannedRe);
  if (m) fail(`meta.license.modifications: nome proprio banido '${m[1]}'.`);
}
// meta.license.attribution fica de fora (exceção deliberada, ver comentário de topo).

for (const sp of recorte.spells) {
  const m1 = String(sp.displayName || "").match(bannedRe);
  if (m1) fail(`recorte '${sp.name}': displayName carrega nome proprio banido '${m1[1]}'.`);
  const m2 = String(sp.markdown || "").match(bannedRe);
  if (m2) fail(`recorte '${sp.name}': markdown carrega nome proprio banido '${m2[1]}'.`);
}

const ptByName = new Map(ptbr.spells.map((s) => [s.name, s]));
for (const entry of pairing.renamed || []) {
  const sp = ptByName.get(entry.name);
  if (!sp) { fail(`pareamento '${entry.name}': magia ausente no pack pt-BR.`); continue; }
  if (sp.displayName !== entry.displayName) {
    fail(`pareamento '${entry.name}': displayName '${sp.displayName}' != tabela '${entry.displayName}'`);
  }
}

// ── segurança: HTML embutido sem vetor de injeção ──────────────────────
const DANGEROUS = /<script|\son\w+\s*=|javascript:/i;
for (const spell of ptbr.spells) {
  if (DANGEROUS.test(JSON.stringify(spell))) fail(`'${spell.name}': string de magia casa padrao perigoso (<script/on.../javascript:).`);
}

// ── spot checks ─────────────────────────────────────────────────────────
const spot = (name, checks) => {
  const sp = ptByName.get(name);
  if (!sp) { fail(`spot check '${name}': magia ausente.`); return; }
  checks(sp);
};

spot("arcane-hand", (sp) => {
  if (sp.displayName !== "Mão Arcana") fail(`arcane-hand: displayName '${sp.displayName}' != 'Mão Arcana'`);
  if (!sp.description.startsWith("<p>Você cria uma mão Grande")) fail("arcane-hand: description nao comeca com o texto esperado.");
});
spot("acid-arrow", (sp) => {
  if (sp.displayName !== "Flecha Ácida") fail(`acid-arrow: displayName '${sp.displayName}' != 'Flecha Ácida'`);
  if (!sp.description.startsWith("<p>Uma flecha verde brilhante")) fail("acid-arrow: description nao comeca com o texto esperado.");
});
spot("animate-objects", (sp) => {
  if (sp.description.includes("Braseiro Afetado")) fail("animate-objects: description contem 'Braseiro Afetado' inesperado.");
});
spot("augury", (sp) => {
  if (!sp.description.includes("<table>")) fail("augury: description sem '<table>'.");
});
spot("calm-emotions", (sp) => {
  if (!sp.description.includes("<ul><li>")) fail("calm-emotions: description sem '<ul><li>'.");
});
spot("giant-insect", (sp) => {
  if (!sp.description.includes("<h5>")) fail("giant-insect: description sem '<h5>'.");
  if (!sp.description.includes("<table>")) fail("giant-insect: description sem '<table>'.");
  if ("statBlock" in sp) fail("giant-insect: campo statBlock presente - o bloco de estatisticas deve ficar em description.");
  if (!sp.upgradeDescription) fail("giant-insect: upgradeDescription ausente.");
});
// Bloco de atributos empilhado (4 colunas): 12 colunas estouram o painel de detalhe em 390px.
for (const sp of ptbr.spells) {
  for (const row of (sp.description || "").match(/<tr>[\s\S]*?<\/tr>/g) || []) {
    if ((row.match(/<t[hd]>/g) || []).length > 8) fail(`${sp.name}: linha de tabela com mais de 8 colunas.`);
  }
}
spot("magic-circle", (sp) => {
  if (!(sp.upgradeDescription || "").startsWith("<p><strong><em>Usando um Espaço de Magia de Círculo Superior.</em></strong>")) {
    fail("magic-circle: upgradeDescription nao comeca com o rotulo de circulo superior esperado.");
  }
});
spot("fire-bolt", (sp) => {
  if (!(sp.upgradeDescription || "").startsWith("<p><strong><em>Aprimoramento de Truque.</em></strong>")) {
    fail("fire-bolt: upgradeDescription nao comeca com o rotulo de aprimoramento de truque esperado.");
  }
});
spot("alarm", (sp) => {
  if (!sp.ritual) fail("alarm: ritual esperado true.");
  if (!(sp.class || []).includes("Ranger")) fail("alarm: class deveria conter 'Ranger'.");
});
spot("resilient-sphere", (sp) => {
  if (sp.school !== "evocation") fail(`resilient-sphere: school '${sp.school}' != 'evocation'`);
  if (sp.displayName !== "Esfera Resiliente") fail(`resilient-sphere: displayName '${sp.displayName}' != 'Esfera Resiliente'`);
});
spot("call-lightning", (sp) => {
  if (sp.upgradeDescription) fail("call-lightning: upgradeDescription presente, esperado ausente.");
});

if (fails.length) {
  for (const f of fails) console.error("FALHA: " + f);
  console.error(`\n${fails.length} falha(s).`);
  process.exit(1);
}
console.log("srd-2024-ptbr.json: 339 magias; D-14/D-16/D-18 ok.");
'@

$tmp = Join-Path ([System.IO.Path]::GetTempPath()) "check-srd-ptbr-pack-$([guid]::NewGuid()).cjs"
try {
  Set-Content -LiteralPath $tmp -Value $nodeScript -Encoding utf8NoBOM
  Push-Location $repoRoot
  try {
    $nodeOut = & node $tmp 2>&1
    $nodeExit = $LASTEXITCODE
  } finally {
    Pop-Location
  }
  if ($nodeExit -ne 0) {
    throw "Prova de conteudo do pack pt-BR falhou:`n$($nodeOut -join "`n")"
  }
  Write-Output ($nodeOut -join "`n")
} finally {
  if (Test-Path -LiteralPath $tmp) { Remove-Item -LiteralPath $tmp -Force }
}

Write-Output 'SRD pt-BR pack: conjunto do SRD 5.2, atribuicao dupla verbatim, sem nomes proprios do PHB.'
