# CR-01 — o filtro de classe casa por valor CANONICO (ingles), nao pelo valor do
# pack ativo.
#
# Modo de falha que este script tranca: `s.classes` muda de idioma junto com o
# pack (spells-data-loader.jsx: `classes: versionLang === 'ptbr' ? classesPt :
# classesEn`). Enquanto o filtro casava por `s.classes`, selecionar "Mago" num
# pack PT gravava Set{'mago'}; trocar pro SRD 5.2 (EN) intersectava esse Set com
# ['wizard', ...] e devolvia ZERO magias — grimorio vazio, chip ainda contando 1,
# nenhuma pill marcada como ativa. Reproduzido em navegador antes da correcao:
# 242 resultados no pack PT -> 0 resultados no pack EN.
#
# A correcao tem tres pontos de entrada, e os tres precisam ficar canonicos:
#   1. o getter do filtro (casa por `classesEn`)
#   2. o auto-filtro do personagem (as classes do personagem ja sao canonicas)
#   3. links compartilhados antigos (`?f.class=mago` normaliza pt -> en na entrada)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$hifi = Get-Content (Join-Path $root 'v10-hifi.jsx') -Raw

$failures = @()

# 1. O getter do filtro de classe usa classesEn, nao s.classes cru.
if ($hifi -notmatch "class:\s*\{\s*label: tt\(lang, 'spell\.class'\),\s*base: true,\s*get: s => \(s\.classesEn \|\| s\.classes \|\| \[\]\)") {
  $failures += "O getter do filtro 'class' em hifiFilterConfig nao casa por 's.classesEn'. Casar por 's.classes' faz o filtro morrer na troca de idioma do pack (CR-01)."
}

# 2. O auto-filtro do personagem nao traduz as classes pro idioma do pack.
if ($hifi -match "classSet = new Set\(cls\.map\(c => \(versionLang === 'ptbr'") {
  $failures += "O auto-filtro do personagem ainda traduz a classe pro idioma do pack. Isso volta a gravar um valor que morre na troca de pack (CR-01)."
}
if ($hifi -notmatch "classSet = new Set\(cls\.map\(c => c\.class\)\)") {
  $failures += "O auto-filtro do personagem deveria gravar a classe canonica ('new Set(cls.map(c => c.class))')."
}

# 3. Link compartilhado antigo com classe em portugues e normalizado na entrada.
if ($hifi -notmatch "if \(k === 'class'\)") {
  $failures += "A restauracao de '?f.class=' nao normaliza a classe pt -> en. Links antigos carregam o valor no idioma do pack de quem compartilhou (CR-01)."
}
if ($hifi -notmatch "ptToEn\[String\(v\)\.toLowerCase\(\)\] \|\| v") {
  $failures += "A normalizacao de '?f.class=' deveria usar window.CLASS_EN (pt -> en) com fallback pro proprio valor."
}

# 4. O rotulo continua traduzindo pro idioma da INTERFACE (D-04 nao regride).
if ($hifi -notmatch "formatValue: v => hifiClassFilterLabel\(v, uiLang\)") {
  $failures += "O chip de classe deveria formatar o valor com 'hifiClassFilterLabel(v, uiLang)' — valor canonico dentro, idioma da interface na tela."
}

if ($failures.Count -gt 0) {
  foreach ($f in $failures) { Write-Host "FAIL: $f" -ForegroundColor Red }
  exit 1
}

Write-Host "Class filter matches on the canonical English value across pack-language switches."
exit 0
