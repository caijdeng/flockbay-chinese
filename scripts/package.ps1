$ErrorActionPreference = 'Stop'
$releaseRoot = Split-Path -Parent $PSScriptRoot
$releaseMeta = Get-Content -Raw -LiteralPath (Join-Path $releaseRoot 'package.json') | ConvertFrom-Json
$releaseDir = Join-Path $releaseRoot 'dist'
New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null
$releaseFiles = @(
    'launcher.mjs', 'app-process.mjs', 'cdp.mjs', 'translator.js', 'dictionary.json',
    'start-hidden.vbs', 'install.vbs', 'install.ps1', 'README.md', 'LICENSE', 'NOTICE.md', 'CHANGELOG.md',
    'CONTRIBUTING.md', 'SECURITY.md', 'PUBLISHING.md'
) | ForEach-Object { Join-Path $releaseRoot $_ }
$releaseZip = Join-Path $releaseDir ('flockbay-chinese-' + $releaseMeta.version + '.zip')
Compress-Archive -LiteralPath $releaseFiles -DestinationPath $releaseZip -Force
$releaseHash = (Get-FileHash -LiteralPath $releaseZip -Algorithm SHA256).Hash.ToLowerInvariant()
$releaseHashLine = $releaseHash + '  ' + (Split-Path -Leaf $releaseZip)
[IO.File]::WriteAllText((Join-Path $releaseDir 'SHA256SUMS.txt'), $releaseHashLine + "`n", [Text.UTF8Encoding]::new($false))
Write-Output $releaseZip
Write-Output $releaseHashLine
