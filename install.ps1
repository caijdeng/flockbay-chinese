$ErrorActionPreference = 'Stop'
$pluginSource = $PSScriptRoot
$pluginTarget = Join-Path $env:LOCALAPPDATA 'FlockbayChinese'
New-Item -ItemType Directory -Path $pluginTarget -Force | Out-Null
foreach ($pluginFile in @('launcher.mjs', 'app-process.mjs', 'cdp.mjs', 'translator.js', 'dictionary.json', 'start-hidden.vbs', 'README.md', 'LICENSE', 'NOTICE.md')) {
    Copy-Item -LiteralPath (Join-Path $pluginSource $pluginFile) -Destination (Join-Path $pluginTarget $pluginFile) -Force
}
$pluginShell = New-Object -ComObject WScript.Shell
$pluginDesktop = [Environment]::GetFolderPath('Desktop')
$pluginShortcut = $pluginShell.CreateShortcut((Join-Path $pluginDesktop 'Flockbay 中文版.lnk'))
$pluginShortcut.TargetPath = Join-Path $env:SystemRoot 'System32\wscript.exe'
$pluginShortcut.Arguments = '"' + (Join-Path $pluginTarget 'start-hidden.vbs') + '"'
$pluginShortcut.WorkingDirectory = $pluginTarget
$pluginShortcut.IconLocation = (Join-Path $env:LOCALAPPDATA 'Flockbay\flockbay-desktop.exe') + ',0'
$pluginShortcut.Description = '启动 Flockbay 并加载简体中文界面；保留原版入口。'
$pluginShortcut.Save()
Write-Output "Installed: $pluginTarget"
Write-Output "Shortcut: $(Join-Path $pluginDesktop 'Flockbay 中文版.lnk')"
