$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$packImportPath = Join-Path $repoRoot 'pack-import.jsx'
$schemaPath = Join-Path $repoRoot 'pack.schema.json'

$packImport = Get-Content -Raw -LiteralPath $packImportPath
$schema = Get-Content -Raw -LiteralPath $schemaPath | ConvertFrom-Json

# ── Presença estrutural ──

foreach ($needle in @(
  'function parsePackText',
  'function validatePack',
  'function freeIdentifier',
  'function _fail',
  'function _checkField',
  'function _checkObject',
  'MAX_PACK_BYTES',
  'BLOCKED_KEYS',
  'PACK_ERROR_CODES',
  'packImport.validate: '
)) {
  if ($packImport -notlike "*$needle*") {
    throw "Missing pack-import.jsx implementation detail: $needle"
  }
}

# ── Uma só chamada de parse, com reviver ──

$parseCalls = [regex]::Matches($packImport, 'JSON\.parse\(')
if ($parseCalls.Count -ne 1) {
  throw "Expected exactly 1 JSON.parse( call in pack-import.jsx, found $($parseCalls.Count)."
}
if ($packImport -notmatch 'JSON\.parse\(\s*\w+\s*,') {
  throw 'JSON.parse call must pass a reviver (D-13 requires blocking __proto__/constructor/prototype during parse, not in a later scan).'
}

# ── Ordem validar-antes-de-gravar ──
# putPack ainda não existe em pack-import.jsx neste plano (03-05 acrescenta) -
# este bloco só assere quando há o que asserir, e vira gate permanente a
# partir de então.

if ($packImport -like '*pluginStore.putPack*') {
  $validateIdx = $packImport.IndexOf('validatePack')
  $putPackIdx = $packImport.IndexOf('pluginStore.putPack')
  if ($validateIdx -lt 0 -or $putPackIdx -lt 0 -or -not ($validateIdx -lt $putPackIdx)) {
    throw 'validatePack must appear before pluginStore.putPack - nothing may be written before validation completes.'
  }
}

# ── Paridade com o schema: schema -> validador ──

$metaFieldNames = $schema.properties.meta.properties.PSObject.Properties.Name
foreach ($field in $metaFieldNames) {
  if ($packImport -notlike "*$field*") {
    throw "pack-import.jsx is missing schema meta field: $field"
  }
}

$licenseFieldNames = $schema.properties.meta.properties.license.properties.PSObject.Properties.Name
foreach ($field in $licenseFieldNames) {
  if ($packImport -notlike "*$field*") {
    throw "pack-import.jsx is missing schema license field: $field"
  }
}

$spellFieldNames = $schema.properties.spells.items.properties.PSObject.Properties.Name
foreach ($field in $spellFieldNames) {
  if ($packImport -notlike "*$field*") {
    throw "pack-import.jsx is missing schema spell field: $field"
  }
}

# ── Paridade inversa: validador -> schema ──

function Get-TableBlock([string]$src, [string]$tableName) {
  $m = [regex]::Match($src, "const $tableName = \[[\s\S]*?\n\];")
  if (-not $m.Success) {
    throw "Could not locate table block: $tableName"
  }
  return $m.Value
}

$metaBlock = Get-TableBlock $packImport 'META_FIELDS'
$licenseBlock = Get-TableBlock $packImport 'LICENSE_FIELDS'
$spellBlock = Get-TableBlock $packImport 'SPELL_FIELDS'

$metaKeys = [regex]::Matches($metaBlock, "key:\s*'([^']+)'") | ForEach-Object { $_.Groups[1].Value }
foreach ($key in $metaKeys) {
  if ($metaFieldNames -notcontains $key) {
    throw "pack-import.jsx META_FIELDS has extra field not in pack.schema.json meta: $key"
  }
}

$licenseKeys = [regex]::Matches($licenseBlock, "key:\s*'([^']+)'") | ForEach-Object { $_.Groups[1].Value }
foreach ($key in $licenseKeys) {
  if ($licenseFieldNames -notcontains $key) {
    throw "pack-import.jsx LICENSE_FIELDS has extra field not in pack.schema.json meta.license: $key"
  }
}

$spellKeys = [regex]::Matches($spellBlock, "key:\s*'([^']+)'") | ForEach-Object { $_.Groups[1].Value }
foreach ($key in $spellKeys) {
  if ($spellFieldNames -notcontains $key) {
    throw "pack-import.jsx SPELL_FIELDS has extra field not in pack.schema.json spells[]: $key"
  }
}

# ── Teto de tamanho: código e schema publicado precisam concordar ──

if ($packImport -notlike '*10 * 1024 * 1024*') {
  throw 'pack-import.jsx is missing the 10 * 1024 * 1024 byte cap literal.'
}
if ($schemaPath -and (Get-Content -Raw -LiteralPath $schemaPath) -notlike '*10485760*') {
  throw 'pack.schema.json is missing the 10485760 byte cap literal - code and published docs would diverge.'
}

# ── Sem catch vazio ──

if ($packImport -match 'catch\s*\([^)]*\)\s*\{\s*\}') {
  throw 'pack-import.jsx has an empty catch block - errors must always carry a .code.'
}

# ── Bloco de exposição ──

$exposedMatch = [regex]::Match($packImport, 'window\.packImport\s*=\s*\{[\s\S]*?\};')
if (-not $exposedMatch.Success) {
  throw 'Could not locate the window.packImport assignment block.'
}
$exposedBlock = $exposedMatch.Value
foreach ($fn in @('parsePackText', 'validatePack', 'freeIdentifier', 'MAX_PACK_BYTES', 'PACK_ERROR_CODES')) {
  if ($exposedBlock -notlike "*$fn*") {
    throw "window.packImport block is missing exposed member: $fn"
  }
}

# ── meta.image (D-17, PKG-06): schema pattern + validatePack() por execução real ──

$dialogPath = Join-Path $repoRoot 'pack-import-dialog.jsx'
$dialog = Get-Content -Raw -LiteralPath $dialogPath

foreach ($needle in @(
  "'image-invalid': 'packErr.imageInvalid'",
  "'image-too-large': 'packErr.imageTooLarge'"
)) {
  if ($dialog -notlike "*$needle*") {
    throw "pack-import-dialog.jsx is missing PACK_ERR_KEY_BY_CODE entry: $needle"
  }
}

if ($packImport -notlike '*function _checkImage(*') {
  throw 'pack-import.jsx is missing function _checkImage( - meta.image validation (D-17, PKG-06).'
}

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  Write-Warning 'node nao encontrado - prova de execucao de validatePack/meta.image pulada (assercoes estruturais ja rodaram).'
} else {
  $nodeScript = @'
const fs = require('fs');
const vm = require('vm');
const src = fs.readFileSync('pack-import.jsx', 'utf8');

// pack-import.jsx nao tem JSX; roda o arquivo de PRODUCAO inteiro num vm com
// window = {} (mesmo padrao de check-loader-hardening.tests.ps1). window.DOMPurify
// ausente nao importa - validatePack nao sanitiza.
const sandbox = { console };
sandbox.window = {};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(src, sandbox);
const validatePack = sandbox.window.packImport && sandbox.window.packImport.validatePack;
if (typeof validatePack !== 'function') {
  console.error('nao consegui capturar window.packImport.validatePack de pack-import.jsx');
  process.exit(1);
}

function basePack(image) {
  const pack = {
    meta: {
      source: 'meu-homebrew',
      name: 'Meu Pacote',
      version: '1.0.0',
      author: 'Autor',
      lang: 'ptbr',
      license: { id: 'CC-BY-4.0', attribution: 'Atribuicao verbatim.' },
    },
    spells: [
      { name: 'faisca', level: 1, school: 'evocation', description: '<p>ok</p>' },
    ],
  };
  if (image !== undefined) pack.meta.image = image;
  return pack;
}

let failures = 0;
function check(label, cond, detail) {
  if (!cond) { console.error('FAIL: ' + label + (detail ? ' - ' + detail : '')); failures++; }
}

function expectPass(label, image) {
  try {
    validatePack(basePack(image));
    check(label, true);
  } catch (err) {
    check(label, false, 'threw ' + (err && err.code) + ': ' + (err && err.message));
  }
}

function expectFail(label, image, expectedCode) {
  try {
    validatePack(basePack(image));
    check(label, false, 'did not throw');
  } catch (err) {
    check(label, err && err.code === expectedCode, 'got code ' + (err && err.code) + ', expected ' + expectedCode);
  }
}

expectPass('sem meta.image passa (compatibilidade retroativa)', undefined);
expectPass('data:image/png;base64,... passa', 'data:image/png;base64,iVBORw0KGgo=');
expectPass('data:image/jpeg;base64,... passa', 'data:image/jpeg;base64,iVBORw0KGgo=');
expectPass('data:image/webp;base64,... passa', 'data:image/webp;base64,iVBORw0KGgo=');
expectPass('data:image/gif;base64,... passa', 'data:image/gif;base64,iVBORw0KGgo=');

expectPass('URL https simples passa (E-03)', 'https://example.com/a.png');
expectPass('URL https com query e fragmento passa', 'https://raw.githubusercontent.com/x/y/main/a.png?x=1#f');
const url2048 = 'https://a' + 'b'.repeat(2039);
expectPass('URL https de 2048 caracteres passa', url2048);

expectFail('http:// rejeita com image-invalid', 'http://example.com/a.png', 'image-invalid');
expectFail('URL protocol-relative rejeita com image-invalid', '//cdn/x.png', 'image-invalid');
expectFail('javascript: rejeita com image-invalid', 'javascript:alert(1)', 'image-invalid');
expectFail('HTTPS:// em maiusculas rejeita com image-invalid', 'HTTPS://example.com/a.png', 'image-invalid');
expectFail('https:// sem host rejeita com image-invalid', 'https://', 'image-invalid');
expectFail('https:/// sem host rejeita com image-invalid', 'https:///a', 'image-invalid');
expectFail('URL com espaco rejeita com image-invalid', 'https://exa mple.com/a.png', 'image-invalid');
expectFail('URL com aspas duplas rejeita com image-invalid', 'https://a.com/"x', 'image-invalid');
expectFail('URL com aspas simples rejeita com image-invalid', "https://a.com/'x", 'image-invalid');
expectFail('URL com < rejeita com image-invalid', 'https://a.com/<x', 'image-invalid');
expectFail('URL com barra invertida rejeita com image-invalid', 'https://a.com/\\x', 'image-invalid');
expectFail('URL com quebra de linha rejeita com image-invalid', 'https://a.com/\nx', 'image-invalid');
expectFail('URL https de 2049 caracteres rejeita com image-invalid', 'https://a' + 'b'.repeat(2040), 'image-invalid');
expectFail('data:image/svg+xml rejeita com image-invalid (SVG carrega script)', 'data:image/svg+xml;base64,PHN2Zz4=', 'image-invalid');
expectFail('data:text/html rejeita com image-invalid', 'data:text/html;base64,PGI+', 'image-invalid');
expectFail('data:image/png sem base64 rejeita com image-invalid', 'data:image/png,raw', 'image-invalid');
expectFail('base64 invalido rejeita com image-invalid', 'data:image/png;base64,@@@', 'image-invalid');

const huge = 'data:image/png;base64,' + 'A'.repeat(204800);
expectFail('204800+ caracteres rejeita com image-too-large', huge, 'image-too-large');
expectFail('URL https gigante rejeita com image-too-large (teto antes da regex)', 'https://a' + 'b'.repeat(204800), 'image-too-large');

expectFail('meta.image = 42 (tipo errado) rejeita com schema-invalid', 42, 'schema-invalid');

// Paridade schema <-> validador: o pattern do schema, compilado, tem de dar o
// mesmo veredito que window.packImport.IMAGE_SRC (uma allowlist so, E-03).
const IMAGE_SRC = sandbox.window.packImport.IMAGE_SRC;
const schema = JSON.parse(fs.readFileSync('pack.schema.json', 'utf8'));
const schemaRe = new RegExp(schema.properties.meta.properties.image.pattern);
check('IMAGE_SRC exposta em window.packImport', Object.prototype.toString.call(IMAGE_SRC) === '[object RegExp]');
for (const x of [
  'data:image/png;base64,iVBORw0KGgo=', 'data:image/jpeg;base64,iVBORw0KGgo=',
  'data:image/webp;base64,iVBORw0KGgo=', 'data:image/gif;base64,iVBORw0KGgo=',
  'https://example.com/a.png', 'https://raw.githubusercontent.com/x/y/main/a.png?x=1#f', url2048,
  'http://example.com/a.png', '//cdn/x.png', 'javascript:alert(1)', 'HTTPS://example.com/a.png',
  'https://', 'https:///a', 'https://exa mple.com/a.png', 'https://a.com/"x', "https://a.com/'x",
  'https://a.com/<x', 'https://a.com/\\x', 'https://a.com/\nx',
  'data:image/svg+xml;base64,PHN2Zz4=', 'data:text/html;base64,PGI+', 'data:image/png,raw',
  'data:image/png;base64,@@@', 'https://a' + 'b'.repeat(2040),
]) {
  check('paridade schema <-> IMAGE_SRC: ' + JSON.stringify(x.slice(0, 40)), schemaRe.test(x) === IMAGE_SRC.test(x));
}

if (failures > 0) {
  console.error(failures + ' verificacao(oes) de meta.image falharam.');
  process.exit(1);
}
console.log('meta.image: compativel sem o campo, aceita data: URI raster (png/jpeg/webp/gif) e URL https://, rejeita http/protocol-relative/javascript/SVG/base64 invalido/URL malformada (image-invalid), rejeita >200KB (image-too-large), rejeita tipo errado (schema-invalid), pattern do schema em paridade com IMAGE_SRC.');
'@

  $tmp = Join-Path ([System.IO.Path]::GetTempPath()) "check-pack-validator-image-$([guid]::NewGuid()).cjs"
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
      throw "meta.image validatePack() proof failed: $nodeOut"
    }
    Write-Output $nodeOut
  } finally {
    if (Test-Path -LiteralPath $tmp) { Remove-Item -LiteralPath $tmp -Force }
  }
}

Write-Output 'Pack validator matches the published schema.'
