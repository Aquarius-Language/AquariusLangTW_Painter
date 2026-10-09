param([string]$編譯器 = '')
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (!$編譯器) {
    $發佈 = Get-ChildItem -LiteralPath 'C:\OfficialProjects\AquariusLangTW\dist\releases' -Directory | Sort-Object Name -Descending | Select-Object -First 1
    $編譯器 = Join-Path $發佈.FullName 'aqua/aqua.exe'
}
if (!(Test-Path -LiteralPath $編譯器)) { throw '找不到星泉編譯器，請指定 -編譯器 路徑。' }
& $編譯器 build 星泉塗鴉室.aqua 函式庫/星泉介面.aqua 函式庫/作品引擎.aqua --root . -o 星泉塗鴉室.bottle
if ($LASTEXITCODE -ne 0) { throw '星泉原始碼編譯失敗。' }
& $編譯器 build 星泉塗鴉室.bottle --target web -o web
if ($LASTEXITCODE -ne 0) { throw '星泉網頁輸出失敗。' }
$執行環境 = Get-Command node -ErrorAction SilentlyContinue
if ($執行環境) { $節點 = $執行環境.Source } else {
    $套件 = Get-ChildItem -LiteralPath 'C:\Program Files\WindowsApps' -Directory -Filter 'OpenAI.CodexPrimaryRuntime*' | Sort-Object Name -Descending | Select-Object -First 1
    $節點 = Join-Path $套件.FullName 'dependencies/node/bin/node.exe'
}
& $節點 網頁封裝.mjs
if ($LASTEXITCODE -ne 0) { throw '網頁本地化及保護層封裝失敗。' }
Write-Output '星泉塗鴉室已編譯至 ./web。'
