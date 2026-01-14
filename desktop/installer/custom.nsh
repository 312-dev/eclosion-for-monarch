; Eclosion Custom NSIS Script
; Combined installer and uninstaller customizations
;
; Fixes:
; 1. Post-install app launch improvements (handled in Electron main process)
; 2. Clean uninstall prompts for user data

; ============================================================================
; LOGGING CONFIGURATION (Beta only)
; ============================================================================

; Log file for debugging installer behavior
!define INSTALLER_LOG "$APPDATA\Eclosion Beta\logs\installer.log"

; Helper macro to write to log file (simple, no timestamp to avoid header deps)
!macro WriteInstallerLog message
  ; Ensure log directory exists
  CreateDirectory "$APPDATA\Eclosion Beta\logs"
  ; Append to log file
  FileOpen $9 "${INSTALLER_LOG}" a
  IfErrors +3
    FileWrite $9 "${message}$\r$\n"
    FileClose $9
!macroend

; ============================================================================
; INSTALLER CUSTOMIZATIONS
; ============================================================================

!macro customInstall
  ; Log installation start
  !insertmacro WriteInstallerLog "=== Installation starting ==="
  !insertmacro WriteInstallerLog "Install path: $INSTDIR"

  ; Nothing else needed during install
  ; Focus handling is done in the Electron main process (window.ts)
  ; with retry logic to ensure the window comes to foreground

  !insertmacro WriteInstallerLog "customInstall complete"
!macroend

; ============================================================================
; POST-FINISH APP LAUNCH CUSTOMIZATION
; This macro is called when "Run app after finish" is checked and user clicks Finish
; ============================================================================

!macro customFinishRun
  ; Log that we're about to launch the app
  !insertmacro WriteInstallerLog "=== customFinishRun called ==="
  !insertmacro WriteInstallerLog "About to launch: $INSTDIR\${APP_EXECUTABLE_FILENAME}"

  ; APPROACH 1: Use cmd.exe /c start for guaranteed non-blocking launch
  ; This spawns a new process and immediately returns, preventing installer hang
  !insertmacro WriteInstallerLog "Launching via cmd /c start (non-blocking)..."
  nsExec::Exec 'cmd.exe /c start "" "$INSTDIR\${APP_EXECUTABLE_FILENAME}"'
  Pop $0 ; Get return value (ignore it)
  !insertmacro WriteInstallerLog "nsExec returned: $0"

  !insertmacro WriteInstallerLog "customFinishRun completed, installer should close now"
!macroend

; ============================================================================
; UNINSTALLER CUSTOMIZATIONS
; ============================================================================

!macro customUnInstall
  ; Ask user if they want to delete app data
  MessageBox MB_YESNO|MB_ICONQUESTION "Do you want to delete all Eclosion app data?$\n$\nThis includes your saved credentials, settings, and logs.$\n$\nChoose 'No' to keep your data for future reinstallation." IDYES deleteData IDNO skipDelete

  deleteData:
    ; Delete app data directory
    RMDir /r "$APPDATA\Eclosion"

    ; Also delete from LocalAppData if present
    RMDir /r "$LOCALAPPDATA\Eclosion"

    ; Delete electron-store config file
    Delete "$APPDATA\eclosion-desktop\config.json"
    RMDir "$APPDATA\eclosion-desktop"

    Goto done

  skipDelete:
    ; User chose to keep data

  done:
!macroend
