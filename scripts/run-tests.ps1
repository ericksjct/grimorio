# Runs every scripts/*.tests.ps1 as its own process.
# Exits non-zero if any script fails, so `npm test` works as a CI/gate command.
$ErrorActionPreference = 'Continue'
$failed = @()
Get-ChildItem -Path (Join-Path $PSScriptRoot '*.tests.ps1') | Sort-Object Name | ForEach-Object {
  & pwsh -NoProfile -File $_.FullName
  if ($LASTEXITCODE -ne 0) { $failed += $_.Name }
}
Write-Output ''
if ($failed.Count -gt 0) {
  Write-Output "FAILED ($($failed.Count)):"
  $failed | ForEach-Object { Write-Output "  - $_" }
  exit 1
}
Write-Output 'All test scripts passed.'
