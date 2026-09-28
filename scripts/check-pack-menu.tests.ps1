$ErrorActionPreference = 'Stop'

# Fase 8, Plano 05 — menu único de pacotes (D-16). Este gate SUBSTITUI
# scripts/check-pack-manager.tests.ps1 (apagado no Plano 05 Task 2): as seções
# herdadas do gerenciador antigo continuam aqui, exceto as que falavam do
# VersionSelector/drawer (essas saem com a remoção do VersionSelector, 08-06).
#
# Task 1: só o modelo puro do cartão (_packColorIndex/_safeImage/_cardMetaVars)
# e a pluralização das contagens existentes (i18n). Tasks 2/3 estendem este
# arquivo com as seções portadas e as novas de PackMenu/PackMenuChip.

$repoRoot = Split-Path -Parent $PSScriptRoot
$managerPath = Join-Path $repoRoot 'pack-manager.jsx'
$manager = Get-Content -Raw -LiteralPath $managerPath

# ── 1. Estrutura mínima do modelo do cartão ──

foreach ($needle in @('function _packColorIndex(', 'function _safeImage(', 'function _cardMetaVars(')) {
  if ($manager -notlike "*$needle*") {
    throw "Missing pack-manager.jsx card-model implementation detail: $needle"
  }
}

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  Write-Warning 'node nao encontrado - provas de execucao puladas.'
  Write-Output 'check-pack-menu structural skip: node not found.'
  return
}

# ── 2. Prova de execução real das 3 funções puras + comportamento i18n ──
# Extrai as funções de PRODUÇÃO por regex (o .jsx tem JSX e não roda inteiro no
# node — mesmo molde de scripts/check-edition-compare.tests.ps1), monta um
# window.packImport a partir das constantes REAIS de pack-import.jsx (nunca uma
# cópia hardcoded do teto/regex) e usa tt/i18nPlural reais de i18n.jsx.

$nodeScript = @'
const fs = require('fs');
const vm = require('vm');

const managerSrc = fs.readFileSync('pack-manager.jsx', 'utf8');
const importSrc = fs.readFileSync('pack-import.jsx', 'utf8');
const i18nSrc = fs.readFileSync('i18n.jsx', 'utf8');

let failures = 0;
function check(label, cond) {
  if (!cond) { console.error('FAIL: ' + label); failures++; }
}

// Constantes reais de pack-import.jsx — nunca reimplementadas aqui.
const maxImageMatch = importSrc.match(/const MAX_IMAGE_CHARS = ([^;]+);/);
const imageUriMatch = importSrc.match(/const IMAGE_DATA_URI = (\/[\s\S]*?\/);/);
if (!maxImageMatch || !imageUriMatch) {
  console.error('nao encontrei MAX_IMAGE_CHARS/IMAGE_DATA_URI em pack-import.jsx');
  process.exit(1);
}
const MAX_IMAGE_CHARS = eval(maxImageMatch[1]);
const IMAGE_DATA_URI = eval(imageUriMatch[1]);

// i18n real, rodado em vm — captura tt() e window.i18nPlural (plural).
const sandbox = { console };
sandbox.globalThis = sandbox;
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(i18nSrc, sandbox);
const tt = sandbox.tt;
const i18nPlural = sandbox.i18nPlural;
if (typeof tt !== 'function' || typeof i18nPlural !== 'function') {
  console.error('nao consegui capturar tt()/i18nPlural de i18n.jsx');
  process.exit(1);
}

// Extrai as 3 funções puras de pack-manager.jsx (sem JSX) e as avalia contra
// um window sintético que expõe packImport (real) e tt/i18nPlural (real).
function extractFn(name) {
  const re = new RegExp('function ' + name + '\\([\\s\\S]*?\\n\\}');
  const m = managerSrc.match(re);
  if (!m) { console.error('nao encontrei function ' + name + '() em pack-manager.jsx'); process.exit(1); }
  return m[0];
}

const fnSandbox = {
  window: { packImport: { MAX_IMAGE_CHARS, IMAGE_DATA_URI }, i18nPlural },
  tt,
  console,
};
vm.createContext(fnSandbox);
vm.runInContext(extractFn('_packColorIndex') + '\nthis.__packColorIndex = _packColorIndex;', fnSandbox);
vm.runInContext(extractFn('_safeImage') + '\nthis.__safeImage = _safeImage;', fnSandbox);
vm.runInContext(extractFn('_cardMetaVars') + '\nthis.__cardMetaVars = _cardMetaVars;', fnSandbox);
const _packColorIndex = fnSandbox.__packColorIndex;
const _safeImage = fnSandbox.__safeImage;
const _cardMetaVars = fnSandbox.__cardMetaVars;

// ── _packColorIndex ──
const idx1 = _packColorIndex('srd-2024-en');
const idx2 = _packColorIndex('srd-2024-en');
check('_packColorIndex devolve inteiro 0..9', Number.isInteger(idx1) && idx1 >= 0 && idx1 <= 9);
check('_packColorIndex e determinístico (mesma entrada, mesma saida)', idx1 === idx2);
const idxEmpty = _packColorIndex('');
check("_packColorIndex('') e 0..9", Number.isInteger(idxEmpty) && idxEmpty >= 0 && idxEmpty <= 9);

// ── _safeImage ──
const validPng = 'data:image/png;base64,iVBORw0KGgo=';
check('_safeImage aceita data: URI raster valido', _safeImage(validPng) === validPng);
check('_safeImage rejeita URL externa', _safeImage('https://x/a.png') === null);
check('_safeImage rejeita SVG', _safeImage('data:image/svg+xml;base64,PHN2Zz4=') === null);
check('_safeImage rejeita nao-string', _safeImage(42) === null);
const tooLong = 'data:image/png;base64,' + 'A'.repeat(MAX_IMAGE_CHARS);
check('_safeImage rejeita string maior que MAX_IMAGE_CHARS', _safeImage(tooLong) === null);

// ── _cardMetaVars ──
const vars1 = _cardMetaVars({ author: '', version: '1.0', lang: 'ptbr', edition: '2024', count: 1 }, 'ptbr');
check('_cardMetaVars author vira menu.authorUnknown quando vazio', vars1.author === tt('ptbr', 'menu.authorUnknown'));
check("_cardMetaVars lang vira 'PT' pra ptbr", vars1.lang === 'PT');
check("_cardMetaVars edition vira ' · 2024'", vars1.edition === ' · 2024');
check('_cardMetaVars n = 1', vars1.n === 1);
check('_cardMetaVars nounSpell singular em n=1', vars1.nounSpell === tt('ptbr', 'noun.spell.one'));

const vars2 = _cardMetaVars({ author: 'Fulano', version: '2.0', lang: 'en', count: 3 }, 'en');
check('_cardMetaVars sem edition vira string vazia', vars2.edition === '');
check("_cardMetaVars lang vira 'EN' pra en", vars2.lang === 'EN');

const vars3 = _cardMetaVars({ author: 'Fulano', version: '2.0', lang: 'en', count: 'not-a-number' }, 'en');
check("_cardMetaVars count nao numerico vira n = '?'", vars3.n === '?');
check('_cardMetaVars count nao numerico usa nounSpell plural', vars3.nounSpell === tt('en', 'noun.spell.other'));

// ── i18n.jsx: chaves novas de pluralizacao (behavior do Plano 05 Task 1) ──
const i18nSandbox = { console };
i18nSandbox.globalThis = i18nSandbox;
vm.createContext(i18nSandbox);
vm.runInContext(i18nSrc + '\nthis.__STRINGS = STRINGS;', i18nSandbox);
const STRINGS = i18nSandbox.__STRINGS;

['ptbr', 'en'].forEach((lang) => {
  ['manager.impactPrepared.one', 'manager.impactPrepared.other', 'manager.impactBookmarked.one', 'manager.impactBookmarked.other'].forEach((key) => {
    check(`STRINGS.${lang}['${key}'] existe`, typeof STRINGS[lang][key] === 'string' && STRINGS[lang][key].length > 0);
  });
  check(`STRINGS.${lang}['manager.impactPrepared.one'] contem {n},{c},{nounChar}`,
    ['{n}', '{c}', '{nounChar}'].every((ph) => STRINGS[lang]['manager.impactPrepared.one'].includes(ph)));
  check(`STRINGS.${lang}['manager.duplicates'] contem {nounSpell}`, STRINGS[lang]['manager.duplicates'].includes('{nounSpell}'));
  check(`STRINGS.${lang}['manager.duplicates'] nao contem "presentes"/"present"`,
    !/presentes|present/i.test(STRINGS[lang]['manager.duplicates']));
});
check("STRINGS.ptbr nao tem mais 'manager.impactPrepared' sem sufixo", !Object.prototype.hasOwnProperty.call(STRINGS.ptbr, 'manager.impactPrepared'));
check("STRINGS.ptbr nao tem mais 'manager.impactBookmarked' sem sufixo", !Object.prototype.hasOwnProperty.call(STRINGS.ptbr, 'manager.impactBookmarked'));
check("STRINGS.en nao tem mais 'manager.impactPrepared' sem sufixo", !Object.prototype.hasOwnProperty.call(STRINGS.en, 'manager.impactPrepared'));
check("STRINGS.en nao tem mais 'manager.impactBookmarked' sem sufixo", !Object.prototype.hasOwnProperty.call(STRINGS.en, 'manager.impactBookmarked'));

if (failures > 0) {
  console.error(failures + ' verificacao(oes) falharam.');
  process.exit(1);
}
console.log('Modelo puro do cartao (_packColorIndex/_safeImage/_cardMetaVars) e pluralizacao das contagens existentes ok.');
'@

$tmp = Join-Path ([System.IO.Path]::GetTempPath()) "check-pack-menu-$([guid]::NewGuid()).cjs"
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
    throw "Pack menu card-model proof failed: $nodeOut"
  }
  Write-Output $nodeOut
} finally {
  if (Test-Path -LiteralPath $tmp) { Remove-Item -LiteralPath $tmp -Force }
}
