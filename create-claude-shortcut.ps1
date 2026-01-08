# Create a Windows shortcut for Claude Code in love-ledger

$WshShell = New-Object -ComObject WScript.Shell
$ShortcutPath = [Environment]::GetFolderPath('Desktop') + "\Claude Code - Love Ledger.lnk"

$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "C:\Program Files\Git\git-bash.exe"
$Shortcut.Arguments = '-c "cd /c/Users/snpsa/love-ledger && claude --dangerously-skip-permissions; exec bash"'
$Shortcut.WorkingDirectory = "C:\Users\snpsa\love-ledger"
$Shortcut.Description = "Claude Code in Love Ledger"
$Shortcut.Save()

Write-Host "Shortcut created at: $ShortcutPath"
Write-Host ""
Write-Host "To pin to taskbar:"
Write-Host "1. Right-click the shortcut on your Desktop"
Write-Host "2. Select 'Show more options' (Windows 11) if needed"
Write-Host "3. Click 'Pin to taskbar'"
