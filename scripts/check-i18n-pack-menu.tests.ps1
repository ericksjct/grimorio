$ErrorActionPreference = 'Stop'

# Fase 8 (08-02): as 28 chaves novas do menu de pacotes, do prompt de renomear e do aviso de renomeacao no import (08-11)
# existem em ptbr/en com paridade total, os placeholders certos, plural correto
# em n = 1 (rename.impactWarning.one/.other, D-04/A-05) e nenhum "(ns)"/"(s)"/"(es)"
# de contorno (todo dobrado i18n-toast-versao-e-pluralizacao, item 2).
# Fase 8 (08-06): as 6 chaves do antigo seletor de versão única (version.label/
# .labelMobile/.switch/.manage, toast.versionShort/.versionSwitchedAway)
# perderam o último uso com a remoção do VersionSelector e saem do dicionário -
# sem a mesma mensagem sob duas chaves.

$repoRoot = Split-Path -Parent $PSScriptRoot
$i18nPath = Join-Path $repoRoot 'i18n.jsx'
$i18n = Get-Content -Raw -LiteralPath $i18nPath

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  Write-Warning 'node nao encontrado - prova de execucao das chaves novas pulada.'
  Write-Output 'check-i18n-pack-menu structural skip: node not found.'
  return
}

$nodeScript = @'
const fs = require('fs');
const vm = require('vm');
const src = fs.readFileSync('i18n.jsx', 'utf8');

// Executa o arquivo de PRODUCAO de verdade e captura STRINGS + a funcao real
// i18nParityCheck() - mesmo padrao de check-transition-banner.tests.ps1.
const sandbox = { console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(src + '\nthis.__STRINGS = STRINGS;\nthis.__i18nParityCheck = i18nParityCheck;\n', sandbox);
const STRINGS = sandbox.__STRINGS;
if (!STRINGS || !STRINGS.ptbr || !STRINGS.en) {
  console.error('nao consegui capturar STRINGS.ptbr/STRINGS.en de i18n.jsx');
  process.exit(1);
}

const NEW_KEYS = [
  'menu.sectionReserved', 'menu.reservedHint', 'menu.reservedSubitem', 'menu.cardMeta',
  'menu.authorUnknown', 'menu.toastFallbackToDefault',
  'rename.title', 'rename.intro', 'rename.rowIncoming', 'rename.rowExisting',
  'rename.suggestion', 'rename.applyAllSuffix', 'rename.impactWarning.one',
  'rename.impactWarning.other', 'rename.cancel', 'rename.submit', 'rename.submitting',
  'rename.submitDisabledHint', 'rename.errorFormat', 'rename.errorReserved',
  'rename.errorDuplicate', 'packErr.imageTooLarge', 'packErr.imageInvalid',
  'noun.character.one', 'noun.character.other',
  'import.renamed.one', 'import.renamed.other', 'import.renamedMore',
];

const OLD_KEYS = [
  'manager.duplicates',
];

// Fase 8 plano 06 (D-01/D-16): o seletor de versão única saiu do app, e essas
// 6 chaves perderam o último uso com ele - devem ter saído do dicionário
// (todo dobrado: nenhuma mensagem sob duas chaves).
const DEAD_KEYS = [
  'version.label', 'version.labelMobile', 'version.switch', 'version.manage',
  'toast.versionShort', 'toast.versionSwitchedAway',
];

const PLACEHOLDERS = {
  'menu.reservedSubitem': ['pack', 'name'],
  'menu.cardMeta': ['author', 'version', 'lang', 'edition', 'n', 'nounSpell'],
  'rename.rowIncoming': ['name', 'slug'],
  'rename.rowExisting': ['pack', 'name'],
  'rename.suggestion': ['slug'],
  'rename.impactWarning.one': ['n'],
  'rename.impactWarning.other': ['n'],
  'packErr.imageTooLarge': ['kb'],
  'packErr.imageInvalid': ['kb'],
  'import.renamed.one': ['n', 'list'],
  'import.renamed.other': ['n', 'list'],
  'import.renamedMore': ['n'],
};

let failures = 0;
function check(label, cond) {
  if (!cond) { console.error('FAIL: ' + label); failures++; }
}

if (NEW_KEYS.length !== 28) {
  console.error('FAIL: NEW_KEYS deveria ter 28 entradas, tem ' + NEW_KEYS.length);
  failures++;
}

['ptbr', 'en'].forEach((lang) => {
  NEW_KEYS.forEach((key) => {
    check(`STRINGS.${lang}['${key}'] existe e nao e vazia`, typeof STRINGS[lang][key] === 'string' && STRINGS[lang][key].length > 0);
  });
  OLD_KEYS.forEach((key) => {
    check(`chave antiga STRINGS.${lang}['${key}'] continua presente`, typeof STRINGS[lang][key] === 'string' && STRINGS[lang][key].length > 0);
  });
  DEAD_KEYS.forEach((key) => {
    check(`chave morta STRINGS.${lang}['${key}'] nao existe mais (seletor de versao unica removido, 08-06)`, !Object.prototype.hasOwnProperty.call(STRINGS[lang], key));
  });
});

// As chaves mortas tambem nao podem sobreviver em nenhum outro arquivo do app
// (nenhum leitor esquecido) - i18n.jsx e este proprio gate ficam de fora.
const appFiles = fs.readdirSync('.').filter((f) => f.endsWith('.jsx') || f === 'index.html');
DEAD_KEYS.forEach((key) => {
  appFiles.forEach((f) => {
    if (f === 'i18n.jsx') return;
    const body = fs.readFileSync(f, 'utf8');
    check(`'${key}' nao aparece em ${f}`, !body.includes(`'${key}'`));
  });
});

// Chama a funcao REAL de producao, nao uma reimplementacao do parity check.
const parity = sandbox.__i18nParityCheck();
check('i18nParityCheck() devolve {} (sem buracos entre ptbr/en)', Object.keys(parity).length === 0);
if (Object.keys(parity).length) console.error('gaps: ' + JSON.stringify(parity));

Object.entries(PLACEHOLDERS).forEach(([key, vars]) => {
  ['ptbr', 'en'].forEach((lang) => {
    vars.forEach((v) => {
      check(`STRINGS.${lang}['${key}'] contem {${v}}`, STRINGS[lang][key].includes('{' + v + '}'));
    });
  });
});

// Nenhuma chave nova usa "(ns)"/"(s)"/"(es)" de contorno de plural.
['ptbr', 'en'].forEach((lang) => {
  NEW_KEYS.forEach((key) => {
    const val = STRINGS[lang][key];
    check(`STRINGS.${lang}['${key}'] nao contem "(ns)"`, !val.includes('(ns)'));
    check(`STRINGS.${lang}['${key}'] nao contem "(s)"`, !val.includes('(s)'));
    check(`STRINGS.${lang}['${key}'] nao contem "(es)"`, !val.includes('(es)'));
  });
});

// rename.impactWarning.* nunca usa tom de perda.
const lossWords = /perder|perdida|perdidas|lose|lost/i;
['ptbr', 'en'].forEach((lang) => {
  ['rename.impactWarning.one', 'rename.impactWarning.other'].forEach((key) => {
    check(`STRINGS.${lang}['${key}'] nao usa tom de perda (perder/perdida/lose/lost)`, !lossWords.test(STRINGS[lang][key]));
  });
});

// GAP-4/E-05: mensagens de imagem em linguagem simples — dizem o que e aceito
// (link https:// ou imagem PNG) e nunca o jargao "data: URI".
['ptbr', 'en'].forEach((lang) => {
  ['packErr.imageInvalid', 'packErr.imageTooLarge'].forEach((key) => {
    const val = STRINGS[lang][key];
    check(`STRINGS.${lang}['${key}'] cita https://`, val.includes('https://'));
    check(`STRINGS.${lang}['${key}'] nao usa o jargao "data: URI"`, !val.includes('data: URI'));
  });
  check(`STRINGS.${lang}['packErr.imageInvalid'] cita PNG`, STRINGS[lang]['packErr.imageInvalid'].includes('PNG'));
});

if (failures > 0) {
  console.error(failures + ' verificacao(oes) falharam.');
  process.exit(1);
}
console.log('28 chaves novas da Fase 8 presentes em ptbr/en, paridade total, placeholders corretos, plurais sem "(ns)/(s)/(es)", sem tom de perda, chaves antigas intactas.');
'@

$tmp = Join-Path ([System.IO.Path]::GetTempPath()) "check-i18n-pack-menu-$([guid]::NewGuid()).cjs"
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
    throw "Fase 8 i18n keys proof failed: $nodeOut"
  }
  Write-Output $nodeOut
} finally {
  if (Test-Path -LiteralPath $tmp) { Remove-Item -LiteralPath $tmp -Force }
}
