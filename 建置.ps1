param([switch]$Android, [switch]$APK, [switch]$SkipAPK, [string]$Compiler = 'aqua')
$ErrorActionPreference = 'Stop'

if ($SkipAPK -and ($Android -or $APK)) {
    throw '-SkipAPK 不可與 -Android 或 -APK 同時使用。'
}

Push-Location $PSScriptRoot
try {
    New-Item -ItemType Directory -Path dist -Force | Out-Null
    & $Compiler build 星泉塗鴉室.aqua 星泉介面.aqua 作品引擎.aqua --root . -o dist/星泉塗鴉室.wasm
    if ($LASTEXITCODE -ne 0) { throw '星泉原始碼編譯失敗。' }
    & $Compiler build dist/星泉塗鴉室.wasm --target web -o web
    if ($LASTEXITCODE -ne 0) { throw '星泉網頁輸出失敗。' }
    & node 工具/網頁封裝.mjs
    if ($LASTEXITCODE -ne 0) { throw '網頁本地化失敗。' }
    & $Compiler build dist/星泉塗鴉室.wasm --target windows -o dist/星泉塗鴉室.exe
    if ($LASTEXITCODE -ne 0) { throw '桌面輸出失敗。' }
    $Outputs = @('./dist/星泉塗鴉室.wasm', './web', './dist/星泉塗鴉室.exe')

    if (-not $SkipAPK) {
        $AndroidOutput = if ($Android -and -not $APK) { ('dist/android-project-' + [Guid]::NewGuid().ToString('N').Substring(0,8)) } else { 'dist/android.apk' }
        & $Compiler build 'dist/星泉塗鴉室.wasm' --target android -o $AndroidOutput
        if ($LASTEXITCODE -ne 0) { throw 'Android 建置失敗。' }
        $Outputs += './' + $AndroidOutput
    }
    Write-Output ('完成：' + ($Outputs -join '、') + '。')
} finally { Pop-Location }
