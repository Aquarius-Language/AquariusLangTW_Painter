param([switch]$Android, [switch]$APK)
$ErrorActionPreference = 'Stop'

Push-Location $PSScriptRoot
try {
    New-Item -ItemType Directory -Path dist -Force | Out-Null
    & aqua build 星泉塗鴉室.aqua 星泉介面.aqua 作品引擎.aqua --root . -o dist/星泉塗鴉室.wasm
    if ($LASTEXITCODE -ne 0) { throw '星泉原始碼編譯失敗。' }
    & aqua build dist/星泉塗鴉室.wasm --target web -o web
    if ($LASTEXITCODE -ne 0) { throw '星泉網頁輸出失敗。' }
    & node 工具/網頁封裝.mjs
    if ($LASTEXITCODE -ne 0) { throw '網頁本地化失敗。' }
    & aqua build dist/星泉塗鴉室.wasm --target windows -o dist/星泉塗鴉室.exe
    if ($LASTEXITCODE -ne 0) { throw '桌面輸出失敗。' }
    Write-Output '完成：./dist/星泉塗鴉室.wasm、./web 與 ./dist/星泉塗鴉室.exe。'

    if ($Android -or $APK) {
        $AndroidOutput = if ($APK) { 'dist/android.apk' } else { ('dist/android-project-' + [Guid]::NewGuid().ToString('N').Substring(0,8)) }
        & aqua build 'dist/星泉塗鴉室.wasm' --target android -o $AndroidOutput
        if ($LASTEXITCODE -ne 0) { throw 'Android 建置失敗。' }
    }
} finally { Pop-Location }
