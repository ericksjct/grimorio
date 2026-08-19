$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$indexPath = Join-Path $repoRoot 'index.html'
$swPath = Join-Path $repoRoot 'sw.js'
$index = Get-Content -Raw -LiteralPath $indexPath
$sw = Get-Content -Raw -LiteralPath $swPath

# 1. Formato da tag do DOMPurify: versao literal, integrity sha384, crossorigin anonymous.
$purifyMatch = [regex]::Match($index, '<script[^>]*purify\.min\.js[^>]*>')
if (-not $purifyMatch.Success) {
  throw 'index.html is missing the DOMPurify <script> tag (purify.min.js).'
}
$purifyTag = $purifyMatch.Value
if ($purifyTag -notmatch 'dompurify@\d+\.\d+\.\d+') {
  throw 'DOMPurify script src is not pinned to a literal version (dompurify@X.Y.Z) - sanitizacao e a unica tranca contra XSS armazenado e uma dependencia de CDN sem versao fixa a anula.'
}
if ($purifyTag -notlike '*integrity="sha384-*') {
  throw 'DOMPurify script tag is missing integrity="sha384-..." - sanitizacao e a unica tranca contra XSS armazenado e uma dependencia de CDN sem verificacao de integridade a anula.'
}
if ($purifyTag -notlike '*crossorigin="anonymous"*') {
  throw 'DOMPurify script tag is missing crossorigin="anonymous".'
}

# 2. Ordem de carga. Usa a posicao da TAG de script (src="..."), nao de qualquer
# mencao ao nome do arquivo em comentario, que poderia aparecer antes da tag real.
$pluginStoreIdx = $index.IndexOf('src="plugin-store.jsx"')
$packImportIdx = $index.IndexOf('src="pack-import.jsx"')
$purifyIdx = $purifyMatch.Index
$editorIdx = $index.IndexOf('src="v11-character-editor.jsx"')
$dialogIdx = $index.IndexOf('src="pack-import-dialog.jsx"')

if (-not ($pluginStoreIdx -lt $packImportIdx)) {
  throw 'plugin-store.jsx must appear before pack-import.jsx in index.html.'
}
if (-not ($purifyIdx -lt $packImportIdx)) {
  throw 'purify.min.js must appear before pack-import.jsx in index.html.'
}
if (-not ($editorIdx -lt $dialogIdx)) {
  throw 'v11-character-editor.jsx must appear before pack-import-dialog.jsx in index.html.'
}

# 3. Montagem: PackImportRoot montado exatamente uma vez, depois de HifiPrintRoot.
$rootMatches = [regex]::Matches($index, '<PackImportRoot')
if ($rootMatches.Count -ne 1) {
  throw "Expected exactly one <PackImportRoot mount in index.html, found $($rootMatches.Count) - o gatilho tem de estar montado dentro do App para o import ser alcancavel."
}
$hifiPrintIdx = $index.IndexOf('<HifiPrintRoot')
$packImportRootIdx = $index.IndexOf('<PackImportRoot')
if (-not ($hifiPrintIdx -lt $packImportRootIdx)) {
  throw '<PackImportRoot must be mounted after <HifiPrintRoot in the App render tree.'
}

# 4. Paridade PRECACHE: os quatro arquivos novos precisam estar no sw.js.
foreach ($needle in @('./pack-import.jsx', './pack-import-dialog.jsx', './pack-docs.html', './pack.schema.json')) {
  if ($sw -notlike "*'$needle'*") {
    throw "sw.js is missing $needle from PRECACHE - a ausencia quebra o modo offline."
  }
}

# 5. URL do vendor identica nos dois arquivos.
$purifyUrlMatch = [regex]::Match($index, 'https://unpkg\.com/dompurify@[\d\.]+/dist/purify\.min\.js')
if (-not $purifyUrlMatch.Success) {
  throw 'Could not extract the DOMPurify URL from index.html.'
}
$purifyUrl = $purifyUrlMatch.Value
if ($sw -notlike "*$purifyUrl*") {
  throw "sw.js does not contain the exact DOMPurify URL from index.html. index.html: $purifyUrl"
}

# 6. CACHE_VERSION intacto.
if ($sw -notlike "*const CACHE_VERSION = 'grimorio-v1';*") {
  throw "sw.js CACHE_VERSION changed - acrescimo puro ao PRECACHE nao justifica bump e bumpar re-baixaria os JSONs de magias ja cacheados."
}

# 7. Pacotes SRD agora obrigatorios no PRECACHE (Fase 4, SRD-03).
if ($sw -notlike '*srd-2014-en.json*' -or $sw -notlike '*srd-2024-en.json*') {
  throw 'sw.js must precache srd-2014-en.json and srd-2024-en.json - a ausencia quebra o modo offline do pack embutido (SRD-03).'
}

# 8. Fixtures de QA nunca entram no app shell offline.
if ($sw -like '*qa-fixtures*') {
  throw 'sw.js must not reference qa-fixtures in PRECACHE - payload de teste nao entra no app shell offline de ninguem.'
}

# ── CR-03: um `?build=` compartilhado com slots.total inflado nao pode
# travar a aba. persistCharacters() e o unico choke point de escrita/
# broadcast (localStorage.setItem + dispatchEvent) - useCharacters()'s
# listener faz setChars(e.detail) DIRETO do evento, entao normalizar so em
# loadCharacters()/update() nao bastava (importSharedBuildUrl grava e
# emite sem passar por nenhum dos dois).
$editorPath = Join-Path $repoRoot 'v11-character-editor.jsx'
$editor = Get-Content -Raw -LiteralPath $editorPath
$persistMatch = [regex]::Match($editor, 'function persistCharacters\(chars\)[\s\S]{0,900}?\r?\n\}')
if (-not $persistMatch.Success) {
  throw 'CR-03: could not locate persistCharacters(chars) body in v11-character-editor.jsx.'
}
if ($persistMatch.Value -notmatch '\(chars \|\| \[\]\)\.map\(_normChar\)') {
  throw 'CR-03: persistCharacters() must map every character through _normChar() before writing to localStorage / broadcasting hifi-chars-changed - otherwise a raw shared-build character (unbounded slots.total) reaches HifiSlotTracker and hangs the tab.'
}
if ($persistMatch.Value -match 'JSON\.stringify\(chars\)' -or $persistMatch.Value -match 'detail:\s*chars\s*\}') {
  throw 'CR-03: persistCharacters() must write/broadcast the normalized (safe) array, not the raw `chars` parameter.'
}

$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
  $nodeScript = @'
const fs = require('fs');
const src = fs.readFileSync('v11-character-editor.jsx', 'utf8');
const cut = src.indexOf('function useCharacters');
if (cut < 0) { console.error('nao achei useCharacters para cortar'); process.exit(1); }
const body = src.slice(0, cut);

function FakeCustomEvent(type, init) { this.type = type; this.detail = init && init.detail; }
const sandbox = {
  localStorage: { setItem() {}, getItem: () => null },
  window: { dispatchEvent(e) { sandbox.__lastEvent = e; } },
  CustomEvent: FakeCustomEvent,
  console,
};
sandbox.globalThis = sandbox;
const vm = require('vm');
vm.createContext(sandbox);
vm.runInContext(body + '\nthis.__persistCharacters = persistCharacters;', sandbox);

const hostile = [{ id: 'x', name: 'Evil', slots: { total: { 1: 1e9 }, used: {} } }];
sandbox.__persistCharacters(hostile);
const broadcast = sandbox.__lastEvent && sandbox.__lastEvent.detail;
if (!broadcast || !broadcast[0] || broadcast[0].slots.total[1] > 9) {
  console.error('CR-03 FAIL: persistCharacters() broadcast an unclamped slots.total: ' + JSON.stringify(broadcast));
  process.exit(1);
}
console.log('CR-03 ok: persistCharacters() clamps slots.total through _normChar before broadcasting.');
'@
  $tmp = Join-Path ([System.IO.Path]::GetTempPath()) "check-pack-wiring-$([guid]::NewGuid()).cjs"
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
      throw "CR-03 runtime proof failed: $nodeOut"
    }
  } finally {
    if (Test-Path -LiteralPath $tmp) { Remove-Item -LiteralPath $tmp -Force }
  }
} else {
  Write-Warning 'node nao encontrado - prova de execucao do CR-03 pulada (assercoes estruturais ja rodaram).'
}

Write-Output 'Import pipeline is wired, pinned and precached.'
