$ErrorActionPreference = 'Stop'

# D-04: uma preferência salva (`spellbook-ui-prefs.versionKey`) apontando pra
# uma das 4 chaves legadas de versão de magias (removidas em 06-05) precisa
# cair numa versão resolvível, não no default cego. Este gate trava o mapa de
# fallback e o índice de chaves resolvíveis que 06-03 (órfãs) e 06-04 (banner
# de transição) vão consumir.
# Fase 7, D-08: a chave 2024 PT-BR redireciona pro SRD 5.2 PT-BR embutido
# (mesma edição, mesmo idioma). A chave 2014 PT-BR continua no D-04 e cai no
# SRD 5.1 EN (revisão da fase 07, WR-01: não há 5.1 em português, e trocar a
# edição em silêncio sumia com magias preparadas). As chaves EN continuam na
# mesma edição.

$repoRoot = Split-Path -Parent $PSScriptRoot
$loaderPath = Join-Path $repoRoot 'spells-data-loader.jsx'
$loader = Get-Content -Raw -LiteralPath $loaderPath

# 1. LEGACY_VERSION_FALLBACK declarado.
if ($loader -notmatch 'const\s+LEGACY_VERSION_FALLBACK\s*=') {
  throw 'Missing LEGACY_VERSION_FALLBACK declaration in spells-data-loader.jsx.'
}

# 2. window.__legacyVersionFallback inicializado (existe sempre) e gravado no
#    ramo de fallback.
if (([regex]::Matches($loader, '__legacyVersionFallback')).Count -lt 2) {
  throw 'window.__legacyVersionFallback must appear at least twice: initialization + write inside the fallback branch.'
}
if ($loader -notmatch 'window\.__legacyVersionFallback\s*=\s*null') {
  throw 'window.__legacyVersionFallback must be initialized to null before _initialVersionKey() runs.'
}
if ($loader -notmatch 'window\.__legacyVersionFallback\s*=\s*\{\s*from:') {
  throw 'window.__legacyVersionFallback must be written as { from, to } inside the fallback branch.'
}

# 3. window.resolvableSpellKeys exposto.
if ($loader -notmatch 'window\.resolvableSpellKeys\s*=') {
  throw 'Missing window.resolvableSpellKeys export in spells-data-loader.jsx.'
}

# 4. Listener novo de hifi-plugins-changed que invalida o índice de chaves
#    resolvíveis (o dispatch já existente em refreshPluginVersions() conta um).
if (([regex]::Matches($loader, 'hifi-plugins-changed')).Count -lt 2) {
  throw 'Expected an additional hifi-plugins-changed listener invalidating the resolvable-keys cache.'
}

# 5. _initialVersionKey() deve consultar LEGACY_VERSION_FALLBACK e zerar
#    _wantedVersionKey dentro do próprio ramo de fallback — senão
#    hasPendingSpellVersion() fica armado pra sempre e o efeito de
#    persistência de index.html nunca reescreve prefs.versionKey.
$fnMatch = [regex]::Match($loader, 'function _initialVersionKey\(\)[\s\S]{0,2500}?\n\}')
if (-not $fnMatch.Success) {
  throw 'Could not locate _initialVersionKey() in spells-data-loader.jsx.'
}
$fnBody = $fnMatch.Value
if ($fnBody -notmatch 'LEGACY_VERSION_FALLBACK') {
  throw '_initialVersionKey() must consult LEGACY_VERSION_FALLBACK for a prefs.versionKey that no longer resolves.'
}
$fallbackBranchMatch = [regex]::Match($fnBody, 'LEGACY_VERSION_FALLBACK\[[\s\S]{0,600}?\n\s*\}')
if (-not $fallbackBranchMatch.Success) {
  throw 'Could not locate the LEGACY_VERSION_FALLBACK branch inside _initialVersionKey().'
}
if ($fallbackBranchMatch.Value -notmatch '_wantedVersionKey\s*=\s*null') {
  throw '_wantedVersionKey must be zeroed inside the LEGACY_VERSION_FALLBACK branch of _initialVersionKey() (D-04): a legacy key will never resolve from any pack, so leaving it pending arms hasPendingSpellVersion() forever.'
}

# 6. Pós-06-05: as 4 chaves legadas saíram de BUILTIN_VERSIONS (D-15/D-17) -
#    LEGACY_VERSION_FALLBACK continua vivo (é o que resolve uma preferência
#    salva apontando pra uma delas), mas o registro embutido agora só declara
#    as 2 entradas SRD.
if ($loader -match "key:\s*'spells-5E-2024-PTBR'") {
  throw 'BUILTIN_VERSIONS ainda declara uma chave legada - a decomissao (06-05) deveria te-la removido.'
}

# ── Prova de execução real: extrai o mapa de produção via regex e faz eval ──
$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
  $nodeScript = @'
const fs = require('fs');
const src = fs.readFileSync('spells-data-loader.jsx', 'utf8');

const m = src.match(/const LEGACY_VERSION_FALLBACK = ([\s\S]*?\n\}\);)/);
if (!m) { console.error('nao achei LEGACY_VERSION_FALLBACK'); process.exit(1); }
let LEGACY_VERSION_FALLBACK;
eval('LEGACY_VERSION_FALLBACK = ' + m[1]);

const cases = {
  'spells-5E-2024-PTBR': 'srd-2024-ptbr',
  'spells-5E-2024-EN': 'srd-2024-en',
  'spells-5E-2014-PTBR': 'srd-2014-en',
  'spells-5E-2014-EN': 'srd-2014-en',
};
for (const [from, to] of Object.entries(cases)) {
  if (LEGACY_VERSION_FALLBACK[from] !== to) {
    console.error('FAIL: ' + from + ' -> ' + LEGACY_VERSION_FALLBACK[from] + ', expected ' + to);
    process.exit(1);
  }
}
if (LEGACY_VERSION_FALLBACK['srd-2024-en'] !== undefined) {
  console.error('FAIL: srd-2024-en must not have a fallback entry (it is already a valid target).');
  process.exit(1);
}
if (LEGACY_VERSION_FALLBACK['srd-2024-ptbr'] !== undefined) {
  console.error('FAIL: srd-2024-ptbr must not have a fallback entry (it is a valid target, not an origin).');
  process.exit(1);
}
if (LEGACY_VERSION_FALLBACK['some-unknown-key'] !== undefined) {
  console.error('FAIL: an unrelated key must not resolve through the fallback map.');
  process.exit(1);
}
console.log('D-04/D-08 ok: a chave 2024 PT-BR cai no SRD 5.2 PT-BR (Fase 7), as outras 3 no SRD EN da mesma edicao, chaves desconhecidas nao casam.');
'@
  $tmp = Join-Path ([System.IO.Path]::GetTempPath()) "check-migration-version-fallback-$([guid]::NewGuid()).cjs"
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
      throw "D-04 runtime proof failed: $nodeOut"
    }
    Write-Output $nodeOut
  } finally {
    if (Test-Path -LiteralPath $tmp) { Remove-Item -LiteralPath $tmp -Force }
  }
} else {
  Write-Warning 'node nao encontrado - prova de execucao do D-04 pulada (assercoes estruturais ja rodaram).'
}

Write-Output 'Legacy version fallback map resolves to the SRD of the same edition.'
