; Eclosion Custom NSIS Script
; Combined installer and uninstaller customizations
;
; Fixes:
; 1. Post-install app launch - uses non-blocking launch to prevent installer hang
; 2. Clean uninstall prompts for user data

; ============================================================================
; LOGGING CONFIGURATION (Beta only)
; ============================================================================

; Log file for debugging installer behavior
!define INSTALLER_LOG "$APPDATA\Eclosion Beta\logs\installer.log"

; Helper macro to write to log file
!macro WriteInstallerLog message
  CreateDirectory "$APPDATA\Eclosion Beta\logs"
  FileOpen $9 "${INSTALLER_LOG}" a
  IfErrors +3
    FileWrite $9 "${message}$\r$\n"
    FileClose $9
!macroend

; ============================================================================
; CUSTOM HEADER - Runs before electron-builder sets up pages
; This is where we override the finish page launch behavior
; ============================================================================

!macro customHeader
  ; Override the finish page run function BEFORE electron-builder sets it up
  ; This prevents the default blocking launch behavior
  ; Only applies to installer, not uninstaller
  !ifndef BUILD_UNINSTALLER
    ; Undefine any existing values first (in case electron-builder set them)
    !ifdef MUI_FINISHPAGE_RUN
      !undef MUI_FINISHPAGE_RUN
    !endif
    !ifdef MUI_FINISHPAGE_RUN_FUNCTION
      !undef MUI_FINISHPAGE_RUN_FUNCTION
    !endif
    !define MUI_FINISHPAGE_RUN
    !define MUI_FINISHPAGE_RUN_FUNCTION "LaunchAppNonBlocking"
  !endif
!macroend

; ============================================================================
; NON-BLOCKING APP LAUNCH FUNCTION
; Called when user clicks Finish with "Run Eclosion" checked
; Uses cmd.exe /c start to launch without blocking the installer
; Only included in installer build, not uninstaller
; ============================================================================

!ifndef BUILD_UNINSTALLER
Function LaunchAppNonBlocking
  !insertmacro WriteInstallerLog "=== LaunchAppNonBlocking called ==="
  !insertmacro WriteInstallerLog "INSTDIR: $INSTDIR"

  ; Build executable filename from APP_FILENAME (defined by electron-builder)
  ; APP_FILENAME = "Eclosion" or "Eclosion Beta", so exe = "Eclosion.exe" or "Eclosion Beta.exe"
  !insertmacro WriteInstallerLog "Launching: $INSTDIR\${APP_FILENAME}.exe"

  ; Use cmd.exe /c start for guaranteed non-blocking launch
  ; The empty quotes after 'start' are required for the window title
  ; This spawns a new process and immediately returns
  !insertmacro WriteInstallerLog "Executing: cmd.exe /c start Eclosion $INSTDIR\${APP_FILENAME}.exe"

  nsExec::Exec 'cmd.exe /c start "Eclosion" "$INSTDIR\${APP_FILENAME}.exe"'
  Pop $0
  !insertmacro WriteInstallerLog "nsExec returned: $0"

  !insertmacro WriteInstallerLog "LaunchAppNonBlocking complete - installer should close immediately"
FunctionEnd
!endif

; ============================================================================
; INSTALLER CUSTOMIZATIONS
; ============================================================================

!macro customInstall
  !insertmacro WriteInstallerLog "=== customInstall ==="
  !insertmacro WriteInstallerLog "Install path: $INSTDIR"
  !insertmacro WriteInstallerLog "customInstall complete"
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
