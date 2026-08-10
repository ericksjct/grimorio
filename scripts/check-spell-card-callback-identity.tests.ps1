$ErrorActionPreference = 'Stop'

# HifiSpellCard is React.memo'd with a comparator that ignores function props.
# That only stays correct while the callbacks have a stable identity and receive
# the spell as an argument. An inline arrow capturing the index into `filtered`
# gets frozen on a card that does not re-render, so after filtering the card
# opens whichever spell now sits at the stale index (searching "flame" and
# clicking the 1st card used to open the 4th).

$repoRoot = Split-Path -Parent $PSScriptRoot
$uiPath = Join-Path $repoRoot 'v10-hifi.jsx'
$ui = Get-Content -Raw -LiteralPath $uiPath

if ($ui -notmatch 'className="hifi-card-open"[\s\S]{0,120}?onClick=\{\(\)\s*=>\s*onClick\s*&&\s*onClick\(s\)\}') {
  throw 'Card open button must forward the spell: onClick={() => onClick && onClick(s)}.'
}

if ($ui -notmatch 'onTogglePrepared\s*&&\s*onTogglePrepared\(s\)') {
  throw 'Ribbon must forward the spell: onTogglePrepared(s).'
}

# No call site may hand HifiSpellCard an index-capturing arrow.
$cardUsages = [regex]::Matches($ui, '<HifiSpellCard[\s\S]{0,600}?/>')
if ($cardUsages.Count -lt 2) {
  throw "Expected at least 2 HifiSpellCard call sites, found $($cardUsages.Count)."
}
foreach ($m in $cardUsages) {
  if ($m.Value -match 'onClick=\{\s*\(\)\s*=>') {
    throw 'HifiSpellCard call site passes an inline arrow to onClick — the memo comparator ignores it, so it goes stale. Pass a stable callback that takes the spell.'
  }
  if ($m.Value -match 'onTogglePrepared=\{\s*\(\)\s*=>') {
    throw 'HifiSpellCard call site passes an inline arrow to onTogglePrepared — same staleness trap. Pass a stable callback that takes the spell.'
  }
}

Write-Output 'Spell card callbacks are stable and spell-argument based.'
