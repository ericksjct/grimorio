# Gate: packs/index.js (manifesto dos pacotes embutidos) tem que refletir exatamente
# os JSONs de packs/. Pra adicionar um pacote embutido: copie o JSON pra packs/ e
# rode `npm run packs`.
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$indexPath = Join-Path $repoRoot 'packs/index.js'
$before = Get-Content -Raw -LiteralPath $indexPath
Push-Location $repoRoot
try { node scripts/build-packs-index.mjs | Out-Null } finally { Pop-Location }
$after = Get-Content -Raw -LiteralPath $indexPath
if ($before -ne $after) {
  throw 'packs/index.js estava desatualizado (ja foi regenerado agora) - commite o novo packs/index.js.'
}
foreach ($f in 'index.html') {
  if (-not (Get-Content -Raw -LiteralPath (Join-Path $repoRoot $f)).Contains('<script src="packs/index.js"></script>')) {
    throw "$f precisa carregar packs/index.js antes do loader."
  }
}
Write-Output 'packs/index.js em dia com a pasta packs/.'
