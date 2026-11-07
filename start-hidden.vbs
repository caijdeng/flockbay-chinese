Option Explicit
Dim shell, fs, folder, nodePath, command, result, message
Set shell = CreateObject("WScript.Shell")
Set fs = CreateObject("Scripting.FileSystemObject")
folder = fs.GetParentFolderName(WScript.ScriptFullName)
nodePath = shell.ExpandEnvironmentStrings("%ProgramFiles%") & "\nodejs\node.exe"
If Not fs.FileExists(nodePath) Then
  MsgBox "Node.js was not found. Please install Node.js 22 or newer.", 48, "Flockbay Chinese"
  WScript.Quit 1
End If
command = Chr(34) & nodePath & Chr(34) & " " & Chr(34) & folder & "\launcher.mjs" & Chr(34)
result = shell.Run(command, 0, True)
If result <> 0 Then
  message = "Could not start Flockbay Chinese. See last-error.txt in: " & folder
  If fs.FileExists(folder & "\last-error.txt") Then
    Dim stream
    Set stream = CreateObject("ADODB.Stream")
    stream.Type = 2
    stream.Charset = "utf-8"
    stream.Open
    stream.LoadFromFile folder & "\last-error.txt"
    message = stream.ReadText
    stream.Close
  End If
  MsgBox message, 48, "Flockbay Chinese"
End If
