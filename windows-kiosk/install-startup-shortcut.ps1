# Installs a shortcut in the current user's Startup folder so the kiosk
# player launches automatically after every login/reboot - these screens run
# unattended, so nobody should have to manually start anything after a power
# cycle. Run this once per screen, under whichever Windows account
# auto-logs-in on that machine.

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$batPath = Join-Path $scriptDir "launch-kiosk.bat"
$startupDir = [Environment]::GetFolderPath("Startup")
$shortcutPath = Join-Path $startupDir "Xibo Kiosk Player.lnk"

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $batPath
$shortcut.WorkingDirectory = $scriptDir
$shortcut.Description = "Launches the Xibo kiosk player in fullscreen Edge"
$shortcut.Save()

Write-Output "Installed startup shortcut: $shortcutPath"
Write-Output "It will launch automatically on the next login. To test now, run launch-kiosk.bat directly."
