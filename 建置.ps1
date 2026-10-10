$ErrorActionPreference = 'Stop'

Push-Location $PSScriptRoot
try {
    & aqua build 星泉塗鴉室.aqua 函式庫/星泉介面.aqua 函式庫/作品引擎.aqua --root . -o 星泉塗鴉室.wasm
    if ($LASTEXITCODE -ne 0) { throw '星泉原始碼編譯失敗。' }
    & aqua build 星泉塗鴉室.wasm --target web -o web
    if ($LASTEXITCODE -ne 0) { throw '星泉網頁輸出失敗。' }
    & node 網頁封裝.mjs
    if ($LASTEXITCODE -ne 0) { throw '網頁本地化失敗。' }
    & aqua build 星泉塗鴉室.wasm --target windows -o dist/星泉塗鴉室.exe
    if ($LASTEXITCODE -ne 0) { throw '桌面輸出失敗。' }
    Write-Output '完成：星泉塗鴉室.wasm、./web 與 ./dist/星泉塗鴉室.exe。'
} finally { Pop-Location }
