$ErrorActionPreference = 'Stop'

# Todo folded srd-pack-nomes-slug-e-markdown-cru: os pacotes SRD trazem
# `displayName` legível ("Acid Splash") que o adaptador ignorava no caminho EN
# (usava o slug `acid-splash`), e a descrição/upgrade em markdown cru
# (`**negrito**`) que stripHtml() não convertia. Depois de 06-05 o SRD é o
# ÚNICO conteúdo embutido - sem esta correção, todo mundo veria o slug e o
# markdown cru na tela.

$repoRoot = Split-Path -Parent $PSScriptRoot
$loaderPath = Join-Path $repoRoot 'spells-data-loader.jsx'
$loader = Get-Content -Raw -LiteralPath $loaderPath
$helpersPath = Join-Path $repoRoot 'grimorio-helpers.jsx'
$helpers = Get-Content -Raw -LiteralPath $helpersPath

# 1. mdToHtml existe.
if ($loader -notmatch 'function\s+mdToHtml\(') {
  throw 'Missing mdToHtml() in spells-data-loader.jsx.'
}

# 2. Isola o corpo de adaptSpell() pras assercoes de identidade/nome.
$adaptMatch = [regex]::Match($loader, 'function adaptSpell\([\s\S]{0,5000}?\n\}')
if (-not $adaptMatch.Success) {
  throw 'Could not locate adaptSpell() in spells-data-loader.jsx.'
}
$adaptBody = $adaptMatch.Value

# 3. Nome legível em EN é condicionado pela lang do PACOTE (versionLang),
#    nunca a da interface (D-01).
if ($adaptBody -notmatch "versionLang\s*===\s*'en'") {
  throw 'adaptSpell() must gate the readable EN name on versionLang (the PACK language), not the UI language.'
}

# 4. `en:` continua alimentado só pelo slug de identidade (s.name). É a chave
#    usada por hifiSpellKey, pelo índice `byName` de pack-manager.jsx e pelo
#    pareamento de edição de v10-hifi.jsx - mudar isso invalida em silêncio
#    toda preparada/favorita já salva de todo usuário.
if ($adaptBody -notmatch 'en:\s*enName') {
  throw "adaptSpell()'s en: field must still be fed by the identity slug (enName = s.name)."
}
if ($adaptBody -match '(?<!name_)en:\s*(s\.displayName|nameEn|ptName)') {
  throw 'adaptSpell()`s en: field must not be fed by the readable display name - only name_en may change, en stays the identity slug.'
}

# 5. name_en deixa de ser campo morto - passa a vir do nome legível calculado.
if ($adaptBody -notmatch 'name_en:\s*nameEn') {
  throw 'adaptSpell() must feed name_en from the new versionLang-gated readable name (nameEn).'
}

# 6. grimorio-helpers.spellName() prefere name_en antes de en (ramo não-PT).
$spellNameMatch = [regex]::Match($helpers, 'function spellName\([^)]*\)\s*\{[^}]*\}')
if (-not $spellNameMatch.Success) {
  throw 'Could not locate spellName() in grimorio-helpers.jsx.'
}
if ($spellNameMatch.Value -notmatch 's\.name_en') {
  throw 'spellName() must prefer s.name_en before s.en on the non-PT branch.'
}

# 7. descHtml/desc passam pelo mdToHtml (ordem: mdToHtml antes de stripHtml,
#    pra a marcação nova ser removida junto do achatamento em vez de sobrar
#    como <strong> cru no texto plano).
if ($loader -notmatch 'descHtml:\s*\{[\s\S]{0,200}?mdToHtml\(s\.description\)') {
  throw 'adaptSpell().descHtml must be mdToHtml(s.description).'
}
if ($loader -notmatch 'desc:\s*\{[\s\S]{0,200}?stripHtml\(mdToHtml\(s\.description\)\)') {
  throw 'adaptSpell().desc must be stripHtml(mdToHtml(s.description)).'
}

# 8. upgradeHtml passa por mdToHtml depois de stripUpgradeHeading (a ordem
#    importa: stripUpgradeHeading casa <strong><em> reais do HTML de origem
#    antes de qualquer conversão de markdown rodar).
if ($loader -notmatch 'upgradeHtml:\s*\{[\s\S]{0,200}?mdToHtml\(stripUpgradeHeading\(s\.upgradeDescription\)\)') {
  throw 'adaptSpell().upgradeHtml must be mdToHtml(stripUpgradeHeading(s.upgradeDescription)).'
}

# 9. O gate vizinho check-upgrade-heading-strip.tests.ps1 trava o literal
#    exato do campo `upgrade` plano - esta asserção garante que este gate novo
#    não colide com aquele (o literal precisa continuar presente ao pé da letra).
if ($loader -notmatch 'upgrade:\s*\{[\s\S]{0,200}?stripHtml\(stripUpgradeHeading\(s\.upgradeDescription\)\)') {
  throw 'adaptSpell().upgrade must remain stripHtml(stripUpgradeHeading(s.upgradeDescription)) verbatim - scripts/check-upgrade-heading-strip.tests.ps1 pins this exact literal and must not be edited.'
}

# ── Prova de execução real: extrai mdToHtml() de produção via regex e eval ──
$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
  $nodeScript = @'
const fs = require('fs');
const src = fs.readFileSync('spells-data-loader.jsx', 'utf8');

const m = src.match(/function mdToHtml\([\s\S]*?\n\}/);
if (!m) { console.error('nao achei mdToHtml()'); process.exit(1); }
eval(m[0]);

// Caso positivo: negrito dentro de texto real.
const bold = mdToHtml('<p>a **b** c</p>');
if (!bold.includes('<strong>b</strong>')) {
  console.error('FAIL: mdToHtml did not convert **b** to <strong>b</strong>. Got: ' + bold);
  process.exit(1);
}

// Caso positivo: italico.
const italic = mdToHtml('<p>a *b* c _d_</p>');
if (!italic.includes('<em>b</em>') || !italic.includes('<em>d</em>')) {
  console.error('FAIL: mdToHtml did not convert *b*/_d_ to <em>. Got: ' + italic);
  process.exit(1);
}

// Caso adversarial (T-06-01-01): ** dentro de um valor de atributo tem que
// sair BYTE A BYTE igual - se convertido, o navegador fecharia o atributo no
// primeiro `<` novo e o resto viraria atributo injetado.
const adversarial = '<img alt="a ** b ** c">';
const out = mdToHtml(adversarial);
if (out !== adversarial) {
  console.error('T-06-01-01 FAIL: mdToHtml altered markup inside a tag. Input: ' + adversarial + ' Output: ' + out);
  process.exit(1);
}
if (out.includes('<strong') || out.includes('<em')) {
  console.error('T-06-01-02 FAIL: mdToHtml introduced a new tag from inside an attribute value.');
  process.exit(1);
}

// Corpus real: as descricoes de srd-2024-en.json com ** nao podem sobreviver
// com ** depois da conversao.
const data = JSON.parse(fs.readFileSync('srd-2024-en.json', 'utf8'));
const spells = Array.isArray(data) ? data : (data.spells || []);
const withMd = spells.filter((sp) => (sp.description || '').includes('**'));
if (withMd.length < 1) {
  console.error('FAIL: expected at least one srd-2024-en.json description with ** markdown to exercise the conversion - fixture may have changed.');
  process.exit(1);
}
const survivors = withMd.filter((sp) => mdToHtml(sp.description).includes('**'));
if (survivors.length > 0) {
  console.error('FAIL: ' + survivors.length + ' of ' + withMd.length + ' markdown descriptions still contain ** after mdToHtml: ' + survivors.map((sp) => sp.name).join(', '));
  process.exit(1);
}

console.log('mdToHtml ok: converts real markdown, leaves tag-internal ** untouched (T-06-01-01/02), and clears ** from all ' + withMd.length + ' affected srd-2024-en.json descriptions.');
'@
  $tmp = Join-Path ([System.IO.Path]::GetTempPath()) "check-srd-name-and-markdown-$([guid]::NewGuid()).cjs"
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
      throw "mdToHtml runtime proof failed: $nodeOut"
    }
    Write-Output $nodeOut
  } finally {
    if (Test-Path -LiteralPath $tmp) { Remove-Item -LiteralPath $tmp -Force }
  }
} else {
  Write-Warning 'node nao encontrado - prova de execucao pulada (assercoes estruturais ja rodaram).'
}

Write-Output 'SRD readable name + markdown conversion checks passed.'
