param([int]$埠 = 8080)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$環境 = Get-Command node -ErrorAction SilentlyContinue
if ($環境) { $節點 = $環境.Source } else {
    $套件 = Get-ChildItem -LiteralPath 'C:\Program Files\WindowsApps' -Directory -Filter 'OpenAI.CodexPrimaryRuntime*' | Sort-Object Name -Descending | Select-Object -First 1
    $節點 = Join-Path $套件.FullName 'dependencies/node/bin/node.exe'
}
& $節點 預覽伺服器.mjs $埠
