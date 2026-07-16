$ErrorActionPreference = "Stop"

$scriptPath = Join-Path $PSScriptRoot "sync-vscode-peacock-catppuccin.ps1"
. $scriptPath

function Assert-Equal {
    param(
        [Parameter(Mandatory = $true)]
        [object]$Actual,

        [Parameter(Mandatory = $true)]
        [object]$Expected,

        [Parameter(Mandatory = $true)]
        [string]$Message
    )

    if ($Actual -ne $Expected) {
        throw "$Message Expected '$Expected', got '$Actual'."
    }
}

try {
    Convert-PeacockColorToCatppuccinAccent "#CBA6F7" | Out-Null
    throw "Expected dark Catppuccin Peacock color to fail."
}
catch {
    if ($_.Exception.Message -notlike "*not a Catppuccin Latte color*") {
        throw
    }
}

Assert-Equal (Convert-PeacockColorToCatppuccinAccent "#8839EF") "mauve" "Catppuccin Latte mauve should map to dark-theme mauve accent."
Assert-Equal (Convert-PeacockColorToCatppuccinAccent "#1E66F5") "blue" "Catppuccin Latte blue should map to dark-theme blue accent."
Assert-Equal (Convert-PeacockColorToCatppuccinAccent "#40A02B") "green" "Catppuccin Latte green should map to dark-theme green accent."

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("peacock-catppuccin-test-" + [guid]::NewGuid().ToString("N"))
$workspaceRoot = Join-Path $tempRoot "workspace"
$vscodeRoot = Join-Path $workspaceRoot ".vscode"
$userRoot = Join-Path $tempRoot "user"
New-Item -ItemType Directory -Force $vscodeRoot, $userRoot | Out-Null

$workspaceSettingsPath = Join-Path $vscodeRoot "settings.json"
$userSettingsPath = Join-Path $userRoot "settings.json"

@"
{
  "peacock.color": "#8839EF"
}
"@ | Set-Content -Path $workspaceSettingsPath -Encoding utf8

@"
{
  "workbench.colorTheme": "Ayu Mirage Bordered",
  "catppuccin.accentColor": "rosewater"
}
"@ | Set-Content -Path $userSettingsPath -Encoding utf8

try {
    $result = Invoke-PeacockCatppuccinSync -WorkspacePath $workspaceRoot -UserSettingsPath $userSettingsPath
    $updatedSettings = Get-Content -Raw $userSettingsPath | ConvertFrom-Json

    Assert-Equal $result.PeacockColor "#8839EF" "Sync result should expose the Peacock color."
    Assert-Equal $result.AccentColor "mauve" "Sync result should expose the mapped accent."
    Assert-Equal $updatedSettings."workbench.colorTheme" "Catppuccin Mocha" "Global theme should be Catppuccin Mocha."
    Assert-Equal $updatedSettings."catppuccin.accentColor" "mauve" "Global Catppuccin accent should follow Peacock."
}
finally {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force
}

"All sync-vscode-peacock-catppuccin tests passed."
