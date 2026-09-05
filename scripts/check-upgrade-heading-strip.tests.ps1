$ErrorActionPreference = 'Stop'

# The source JSONs embed their own heading inside upgradeDescription
# (`<p><strong><em>Em Níveis Superiores.</em></strong> …`) while the detail panel
# and the print sheet render their own section label — leaving it in printed the
# title twice. adaptSpell() must strip it before exposing upgrade/upgradeHtml.

$repoRoot = Split-Path -Parent $PSScriptRoot
$loader = Get-Content -Raw -LiteralPath (Join-Path $repoRoot 'spells-data-loader.jsx')

if ($loader -notmatch 'const\s+UPGRADE_HEADING\s*=') {
  throw 'Missing UPGRADE_HEADING pattern in spells-data-loader.jsx.'
}
if ($loader -notmatch 'function\s+stripUpgradeHeading') {
  throw 'Missing stripUpgradeHeading() in spells-data-loader.jsx.'
}

# Both the flat text and the HTML variant must go through it.
if ($loader -notmatch 'upgrade:\s*\{[\s\S]{0,200}?stripHtml\(stripUpgradeHeading\(s\.upgradeDescription\)\)') {
  throw 'adaptSpell().upgrade must be stripHtml(stripUpgradeHeading(s.upgradeDescription)).'
}
if ($loader -notmatch 'upgradeHtml:\s*\{[\s\S]{0,200}?stripUpgradeHeading\(s\.upgradeDescription\)') {
  throw 'adaptSpell().upgradeHtml must be stripUpgradeHeading(s.upgradeDescription).'
}

# Raw upgradeDescription must never reach the adapted spell untouched.
if ($loader -match 'upgrade(Html)?:\s*\{[^}]*(pt|en):\s*(stripHtml\()?s\.upgradeDescription\s*(\|\||,|\))') {
  throw 'adaptSpell() still passes raw s.upgradeDescription through — the heading would render twice.'
}

# ── O contrato vive no PACK, não no código do site ────────────────────────
# O SRD 5.1 vem de um dump de texto do PDF, que não carrega ênfase. Sem
# normalizar na geração, o cabeçalho saía como texto solto e 92 das 319 magias
# imprimiam o título duas vezes. A correção certa é o pack entregar a mesma
# forma marcada que o 5.2 já entrega (scripts/generate-srd-pack.mjs), e NÃO uma
# lista de rótulos por idioma dentro do loader — assim o strip do app continua
# casando por ESTRUTURA e segue valendo para packs BYOD em qualquer idioma.

foreach ($pack in @('srd-2024-en.json', 'srd-2014-en.json')) {
  $raw = Get-Content -Raw -LiteralPath (Join-Path $repoRoot $pack)
  if ($raw -notmatch '<strong><em>[^<]{1,40}[.:]</em></strong>') {
    throw "$pack no longer carries the MARKED upgrade heading — regenerate with scripts/generate-srd-pack.mjs."
  }
  if ($raw -match '<p>At Higher Levels\.') {
    throw "$pack carries an UNMARKED 'At Higher Levels.' heading — the app would print the title twice. Regenerate the pack; do not add a per-language label list to the loader."
  }
}

# O gerador precisa continuar emitindo a forma marcada.
$gen = Get-Content -Raw -LiteralPath (Join-Path $repoRoot 'scripts' 'generate-srd-pack.mjs')
if ($gen -notmatch 'function\s+markUpgradeHeading') {
  throw 'generate-srd-pack.mjs lost markUpgradeHeading() — a regeneration would reintroduce the unmarked 5.1 heading.'
}

# ── Prova por execução ────────────────────────────────────────────────────
$node = @'
const fs = require('fs');
const src = fs.readFileSync(process.argv[2], 'utf8');
const grab = (re, what) => { const m = src.match(re); if (!m) throw new Error('nao achei ' + what); return m[0]; };
const body = [
  grab(/function stripHtml\(s\)[\s\S]*?\n}/, 'stripHtml'),
  grab(/const UPGRADE_HEADING = [^\n]*/, 'UPGRADE_HEADING'),
  grab(/function stripUpgradeHeading\(html\)[\s\S]*?\n}/, 'stripUpgradeHeading'),
].join('\n');
const strip = new Function(body + '\nreturn stripUpgradeHeading;')();

let fails = 0;
const check = (nome, entrada, deveSumir, devePermanecer) => {
  const out = strip(entrada);
  if (deveSumir && out.toLowerCase().includes(deveSumir.toLowerCase())) {
    console.error('FALHA [' + nome + ']: cabecalho sobreviveu -> ' + out.slice(0, 90)); fails++;
  } else if (devePermanecer && !out.includes(devePermanecer)) {
    console.error('FALHA [' + nome + ']: conteudo perdido -> ' + JSON.stringify(out.slice(0, 90))); fails++;
  }
};

check('marcado en', '<p><strong><em>At Higher Levels.</em></strong> The damage increases by 1d4.</p>',
      'At Higher Levels', 'The damage increases by 1d4.');
check('marcado pt', '<p><strong><em>Em Niveis Superiores.</em></strong> O dano aumenta 1d4.</p>',
      'Em Niveis Superiores', 'O dano aumenta 1d4.');

// A primeira frase de um texto legitimo NAO pode ser comida. A regra casa por
// estrutura justamente pra nunca precisar adivinhar isso.
const legit = '<p>The damage increases by 1d4. When you cast this spell using a higher slot, it hurts more.</p>';
if (strip(legit) !== legit) {
  console.error('FALHA [conteudo legitimo]: texto sem cabecalho foi alterado -> ' + strip(legit).slice(0, 90)); fails++;
}

// Dados reais: nenhuma magia dos dois SRD pode sobrar com o cabecalho.
for (const f of ['srd-2024-en.json', 'srd-2014-en.json']) {
  const j = JSON.parse(fs.readFileSync(process.argv[3] + '/' + f, 'utf8'));
  const arr = Array.isArray(j) ? j : (j.spells || j.data || []);
  const ruins = arr.filter(s => s.upgradeDescription &&
    /^(\s*<p[^>]*>)?\s*(at higher levels|cantrip upgrade)/i.test(strip(s.upgradeDescription)));
  if (ruins.length) {
    console.error('FALHA [' + f + ']: ' + ruins.length + ' magia(s) ainda imprimem o cabecalho, ex.: ' + ruins[0].name);
    fails++;
  }
}
if (fails) process.exit(1);
console.log('  upgrade heading: os 2 SRD chegam marcados, o strip remove por estrutura, conteudo legitimo intacto.');
'@

$tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("upgrade-heading-" + [guid]::NewGuid().ToString('N') + ".cjs")
Set-Content -LiteralPath $tmp -Value $node -Encoding UTF8
try {
  & node $tmp (Join-Path $repoRoot 'spells-data-loader.jsx') $repoRoot
  if ($LASTEXITCODE -ne 0) { throw 'Upgrade heading strip failed its execution proof.' }
} finally { Remove-Item -LiteralPath $tmp -ErrorAction SilentlyContinue }

Write-Output 'Upgrade heading: both SRD packs ship it marked up, and the adapter strips it structurally.'
