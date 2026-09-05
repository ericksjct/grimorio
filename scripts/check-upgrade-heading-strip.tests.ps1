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

# The bundled SRD JSON carries the heading; assert the pattern still matches it.
$sample = Get-Content -Raw -LiteralPath (Join-Path $repoRoot 'srd-2024-en.json')
if ($sample -notmatch '<strong><em>[^<]{1,40}[.:]</em></strong>') {
  throw 'Bundled spell data no longer carries the embedded upgrade heading — revisit stripUpgradeHeading.'
}

Write-Output 'Upgrade heading is stripped once, at the data adapter.'

# ── Execução: as DUAS formas de cabeçalho precisam sair ────────────────────
# O 5.2 marca o cabeçalho (`<strong><em>`) e o 5.1 NÃO marca
# (`<p>At Higher Levels. …`). O gate acima só amostrava o 5.2, e por isso as 92
# magias do 5.1 que imprimiam o título duas vezes passaram despercebidas.
# Aqui as funções reais são extraídas do loader e executadas.

$sample2014 = Get-Content -Raw -LiteralPath (Join-Path $repoRoot 'srd-2014-en.json')
if ($sample2014 -notmatch '<p>At Higher Levels\.') {
  throw 'srd-2014-en.json no longer carries the UNMARKED upgrade heading — revisit UPGRADE_HEADING_LABELS.'
}
if ($loader -notmatch 'const\s+UPGRADE_HEADING_LABELS\s*=') {
  throw 'Missing UPGRADE_HEADING_LABELS in spells-data-loader.jsx — the unmarked 5.1 heading would render twice.'
}

$node = @'
const fs = require('fs');
const src = fs.readFileSync(process.argv[2], 'utf8');
const grab = (re, what) => { const m = src.match(re); if (!m) throw new Error('nao achei ' + what); return m[0]; };
const body = [
  grab(/function stripHtml\(s\)[\s\S]*?\n}/, 'stripHtml'),
  grab(/const UPGRADE_HEADING = [^\n]*/, 'UPGRADE_HEADING'),
  grab(/const UPGRADE_HEADING_LABELS = [^\n]*/, 'UPGRADE_HEADING_LABELS'),
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

// 5.2 — cabecalho MARCADO
check('5.2 marcado', '<p><strong><em>At Higher Levels.</em></strong> The damage increases by 1d4.</p>',
      'At Higher Levels', 'The damage increases by 1d4.');
// 5.1 — cabecalho SEM marcacao (a regressao que este bloco existe pra travar)
check('5.1 sem marcacao', '<p>At Higher Levels. When you cast this spell using a higher slot, it hurts more.</p>',
      'At Higher Levels', 'When you cast this spell');
check('5.1 truque', '<p>Cantrip Upgrade. The damage increases at level 5.</p>',
      'Cantrip Upgrade', 'The damage increases at level 5.');
check('pt sem marcacao', '<p>Em Niveis Superiores. O dano aumenta 1d4.</p>',
      'Em Niveis Superiores', 'O dano aumenta 1d4.');

// NAO pode comer a primeira frase de um texto legitimo — a lista e fechada de proposito.
const legit = '<p>The damage increases by 1d4. When you cast this spell using a higher slot, it hurts more.</p>';
if (!strip(legit).includes('The damage increases by 1d4.')) {
  console.error('FALHA [conteudo legitimo]: primeira frase foi removida indevidamente'); fails++;
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
console.log('  upgrade heading: marcado e nao-marcado removidos, conteudo legitimo preservado, 2 SRD limpos.');
'@

$tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("upgrade-heading-" + [guid]::NewGuid().ToString('N') + ".cjs")
Set-Content -LiteralPath $tmp -Value $node -Encoding UTF8
try {
  & node $tmp (Join-Path $repoRoot 'spells-data-loader.jsx') $repoRoot
  if ($LASTEXITCODE -ne 0) { throw 'Upgrade heading strip failed its execution proof.' }
} finally { Remove-Item -LiteralPath $tmp -ErrorAction SilentlyContinue }

Write-Output 'Upgrade heading is stripped once for BOTH the marked (5.2) and unmarked (5.1) forms.'
