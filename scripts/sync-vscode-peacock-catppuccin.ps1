param(
    [string]$WorkspacePath = (Get-Location).Path,
    [string]$UserSettingsPath = (Join-Path $env:APPDATA "Code\User\settings.json")
)

$ErrorActionPreference = "Stop"

function Get-JsonFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        return [pscustomobject]@{}
    }

    $content = Get-Content -Raw -LiteralPath $Path
    if ([string]::IsNullOrWhiteSpace($content)) {
        return [pscustomobject]@{}
    }

    return $content | ConvertFrom-Json
}

function Save-JsonFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,

        [Parameter(Mandatory = $true)]
        [object]$Value
    )

    $parent = Split-Path -Parent $Path
    if ($parent) {
        New-Item -ItemType Directory -Force -Path $parent | Out-Null
    }

    $Value | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $Path -Encoding utf8
}

function Set-JsonProperty {
    param(
        [Parameter(Mandatory = $true)]
        [object]$Object,

        [Parameter(Mandatory = $true)]
        [string]$Name,

        [Parameter(Mandatory = $true)]
        [object]$Value
    )

    if ($Object.PSObject.Properties.Name -contains $Name) {
        $Object.$Name = $Value
    }
    else {
        $Object | Add-Member -NotePropertyName $Name -NotePropertyValue $Value
    }
}

function Get-CatppuccinLatteAccentPalette {
    return [ordered]@{
        rosewater = "#dc8a78"
        flamingo  = "#dd7878"
        pink      = "#ea76cb"
        mauve     = "#8839ef"
        red       = "#d20f39"
        maroon    = "#e64553"
        peach     = "#fe640b"
        yellow    = "#df8e1d"
        green     = "#40a02b"
        teal      = "#179299"
        sky       = "#04a5e5"
        sapphire  = "#209fb5"
        blue      = "#1e66f5"
        lavender  = "#7287fd"
    }
}

function Get-PeacockColor {
    param(
        [Parameter(Mandatory = $true)]
        [string]$WorkspacePath,

        [Parameter(Mandatory = $true)]
        [string]$UserSettingsPath
    )

    $candidates = @()

    if ($WorkspacePath -like "*.code-workspace") {
        $candidates += $WorkspacePath
    }
    else {
        $workspaceFiles = Get-ChildItem -LiteralPath $WorkspacePath -Filter "*.code-workspace" -File -ErrorAction SilentlyContinue
        $candidates += $workspaceFiles.FullName
        $candidates += (Join-Path $WorkspacePath ".vscode\settings.json")
    }

    $candidates += $UserSettingsPath

    foreach ($candidate in $candidates) {
        if (-not $candidate -or -not (Test-Path -LiteralPath $candidate)) {
            continue
        }

        $json = Get-JsonFile -Path $candidate
        $settings = if ($candidate -like "*.code-workspace") { $json.settings } else { $json }
        if ($settings -and $settings.PSObject.Properties.Name -contains "peacock.color") {
            $color = $settings."peacock.color"
            if (-not [string]::IsNullOrWhiteSpace($color)) {
                return $color
            }
        }
    }

    throw "Could not find a non-empty 'peacock.color' in the workspace or user settings."
}

function Convert-PeacockColorToCatppuccinAccent {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Color
    )

    $normalizedColor = $Color.Trim().ToLowerInvariant()
    if ($normalizedColor -notmatch "^#[0-9a-f]{6}$") {
        throw "Only 6-digit hex Peacock colors are supported. Received '$Color'."
    }

    $palette = Get-CatppuccinLatteAccentPalette
    foreach ($name in $palette.Keys) {
        if ($palette[$name].ToLowerInvariant() -eq $normalizedColor) {
            return $name
        }
    }

    throw "Peacock color '$Color' is not a Catppuccin Latte color. Choose one from peacock.favoriteColors."
}

function Invoke-PeacockCatppuccinSync {
    param(
        [string]$WorkspacePath = (Get-Location).Path,
        [string]$UserSettingsPath = (Join-Path $env:APPDATA "Code\User\settings.json")
    )

    $peacockColor = Get-PeacockColor -WorkspacePath $WorkspacePath -UserSettingsPath $UserSettingsPath
    $accentColor = Convert-PeacockColorToCatppuccinAccent -Color $peacockColor
    $settings = Get-JsonFile -Path $UserSettingsPath

    Set-JsonProperty -Object $settings -Name "workbench.colorTheme" -Value "Catppuccin Mocha"
    Set-JsonProperty -Object $settings -Name "catppuccin.accentColor" -Value $accentColor

    Save-JsonFile -Path $UserSettingsPath -Value $settings

    return [pscustomobject]@{
        PeacockColor = $peacockColor
        AccentColor = $accentColor
        UserSettingsPath = $UserSettingsPath
    }
}

if ($MyInvocation.InvocationName -ne ".") {
    $result = Invoke-PeacockCatppuccinSync -WorkspacePath $WorkspacePath -UserSettingsPath $UserSettingsPath
    "Peacock color $($result.PeacockColor) mapped to Catppuccin accent '$($result.AccentColor)'."
    "Updated $($result.UserSettingsPath)."
}
