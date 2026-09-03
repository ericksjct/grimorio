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
