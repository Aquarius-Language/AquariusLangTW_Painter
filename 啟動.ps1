param([int]$埠 = 8080)
$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    & node 工具/預覽伺服器.mjs $埠
} finally { Pop-Location }
