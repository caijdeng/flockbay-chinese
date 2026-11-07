Option Explicit
Dim shell, fs, source, target, item, shortcut, name
Set shell = CreateObject("WScript.Shell")
Set fs = CreateObject("Scripting.FileSystemObject")
source = fs.GetParentFolderName(WScript.ScriptFullName)
target = shell.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\FlockbayChinese"
If Not fs.FolderExists(target) Then fs.CreateFolder target
For Each item In Array("launcher.mjs", "app-process.mjs", "cdp.mjs", "translator.js", "dictionary.json", "start-hidden.vbs", "README.md", "LICENSE", "NOTICE.md")
  fs.CopyFile source & "\" & item, target & "\" & item, True
Next
name = "Flockbay " & ChrW(20013) & ChrW(25991) & ChrW(29256)
Set shortcut = shell.CreateShortcut(shell.SpecialFolders("Desktop") & "\" & name & ".lnk")
shortcut.TargetPath = shell.ExpandEnvironmentStrings("%SystemRoot%") & "\System32\wscript.exe"
shortcut.Arguments = Chr(34) & target & "\start-hidden.vbs" & Chr(34)
shortcut.WorkingDirectory = target
shortcut.IconLocation = shell.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\Flockbay\flockbay-desktop.exe,0"
shortcut.Description = "Flockbay Chinese UI launcher"
shortcut.Save
WScript.Echo "Installed: " & target & vbCrLf & "Desktop: " & name
