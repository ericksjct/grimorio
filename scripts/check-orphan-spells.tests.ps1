$ErrorActionPreference = 'Stop'

# MIGR-01: uma chave preparada/favoritada que ja nao resolve contra nenhuma
# SPELL_VERSIONS ganha uma secao propria, ao final das abas prepared/bookmarked
# do editor de personagem — sinalizada, nunca descartada (D-09/D-10/D-11/D-12).
# Este gate trava a estrutura de render (sem sink de HTML, sem escrita direta
# de storage, sem acao em lote) e prova a execucao real de hifiOrphanFromKey.

$repoRoot = Split-Path -Parent $PSScriptRoot
$editorPath = Join-Path $repoRoot 'v11-character-editor.jsx'
$editor = Get-Content -Raw -LiteralPath $editorPath

# 1. hifiOrphanFromKey existe.
if ($editor -notmatch 'function hifiOrphanFromKey\(key\)') {
  throw 'Missing hifiOrphanFromKey() in v11-character-editor.jsx.'
}

# 2. A secao e condicionada a orphanSpells.length > 0.
if ($editor -notmatch 'orphanSpells\.length > 0') {
  throw 'Orphan section must be gated on orphanSpells.length > 0.'
}

# 3. Isola a regiao da secao de render (do marcador MIGR-01 ate o footer) pra
#    as assercoes de seguranca abaixo nao vazarem falso-positivo/negativo do
#    resto do arquivo.
$regionMatch = [regex]::Match($editor, 'MIGR-01: secao de orfas[\s\S]*?\{/\* Footer \*/\}')
if (-not $regionMatch.Success) {
  throw 'Could not isolate the orphan-section render region (MIGR-01 marker to Footer comment).'
}
$region = $regionMatch.Value

# 4. Sem sink de HTML na regiao (o title vem de localStorage do usuario, T-06-03-01).
if ($region -match 'dangerouslySetInnerHTML') {
  throw 'Orphan section must never use dangerouslySetInnerHTML (title is user-controlled localStorage data).'
}

# 5. Sem escrita direta de storage na regiao — so os toggles individuais ja
#    existentes (setPrepared / toggleBookmark) podem tocar no dado (D-09).
if ($region -match 'setItem|removeItem') {
  throw 'Orphan section render region must not write to storage directly (D-09) — only the existing per-key toggles may.'
}

# 6. Sem acao em lote (D-12) — nenhum rotulo de "limpar/remover todas".
foreach ($banned in @('limpar tudo', 'limpar todas', 'clear all', 'remover todas', 'remove all')) {
  if ($region -match [regex]::Escape($banned)) {
    throw "Orphan section must not offer a bulk action (D-12): found '$banned'."
  }
}

# ── Prova de execucao real: extrai hifiOrphanFromKey via regex e faz eval ──
$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
  $nodeScript = @'
const fs = require('fs');
const src = fs.readFileSync('v11-character-editor.jsx', 'utf8');

const m = src.match(/function hifiOrphanFromKey\(key\) \{[\s\S]*?\n\}/);
if (!m) { console.error('nao achei hifiOrphanFromKey'); process.exit(1); }

// mesmo array de producao (grimorio-helpers.jsx), que hifiOrphanFromKey consulta
// via closure de escopo compartilhado (classic script, nao modulo).
const SCHOOL_KEYS = ['abjur', 'conj', 'div', 'ench', 'evoc', 'ilus', 'necr', 'trans'];
eval(m[0]);

function assertDeep(actual, expected, label) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) { console.error('FAIL ' + label + ': got ' + a + ', expected ' + e); process.exit(1); }
}

assertDeep(
  hifiOrphanFromKey('4-0-acid-splash'),
  { key: '4-0-acid-splash', school: 4, lvl: 0, title: 'Acid Splash' },
  'chave resolve-shape (acid-splash)'
);

assertDeep(
  hifiOrphanFromKey('6-3-melf-s-acid-arrow'),
  { key: '6-3-melf-s-acid-arrow', school: 6, lvl: 3, title: 'Melf S Acid Arrow' },
  'slug com hifens internos preservados'
);

const nullSchool = hifiOrphanFromKey('null-3-foo');
if (nullSchool.school !== null || nullSchool.lvl !== 3) {
  console.error('FAIL escola nula (WR-05): got ' + JSON.stringify(nullSchool));
  process.exit(1);
}

const noHyphen = hifiOrphanFromKey('blorpfoo');
assertDeep(
  noHyphen,
  { key: 'blorpfoo', school: null, lvl: null, title: 'blorpfoo' },
  'chave sem hifen nenhum'
);

const longKey = 'x'.repeat(300);
const longResult = hifiOrphanFromKey(longKey);
if (longResult.title.length > 64) {
  console.error('FAIL recorte de 64: title length ' + longResult.title.length);
  process.exit(1);
}

// Nunca lanca e nunca devolve null (T-06-03-03).
if (hifiOrphanFromKey(null) === null || hifiOrphanFromKey(undefined) === null || hifiOrphanFromKey('') === null) {
  console.error('FAIL: hifiOrphanFromKey nao pode devolver null');
  process.exit(1);
}

console.log('hifiOrphanFromKey ok: resolve, slug com hifens internos, escola nula (WR-05), sem hifen, recorte de 64 e nunca-null cobertos.');
'@
  $tmp = Join-Path ([System.IO.Path]::GetTempPath()) "check-orphan-spells-$([guid]::NewGuid()).cjs"
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
      throw "hifiOrphanFromKey runtime proof failed: $nodeOut"
    }
    Write-Output $nodeOut
  } finally {
    if (Test-Path -LiteralPath $tmp) { Remove-Item -LiteralPath $tmp -Force }
  }
} else {
  Write-Warning 'node nao encontrado - prova de execucao de hifiOrphanFromKey pulada (assercoes estruturais ja rodaram).'
}

Write-Output 'Orphan spells section: structure gated, no HTML sink, no direct storage write, no bulk action.'
