; Eclosion Custom NSIS Script
; Uninstaller customization to prompt for user data deletion

!include "FileFunc.nsh"

; ============================================================================
; UNINSTALLER CUSTOMIZATIONS
; ============================================================================

!macro customUnInstall
  ; Skip prompt during silent uninstall
  IfSilent done

  ; Skip prompt during upgrade - electron-builder calls uninstaller with _?=$INSTDIR
  ; when upgrading, which tells it to run from install dir instead of temp
  ${GetParameters} $R0
  ${GetOptions} $R0 "_?=" $R1
  IfErrors 0 done  ; If _?= option exists (no error), it's an upgrade - skip prompt

  ; Manual uninstall - ask user if they want to delete app data
  ; Note: ${PRODUCT_NAME} is set by electron-builder (e.g., "Eclosion" or "Eclosion Beta")
  MessageBox MB_YESNO|MB_ICONQUESTION "Do you want to delete all ${PRODUCT_NAME} app data?$\n$\nThis includes your saved credentials, settings, and logs.$\n$\nChoose 'No' to keep your data for future reinstallation." IDYES deleteData IDNO done

  deleteData:
    ; Delete app data directory (uses product name for correct folder)
    RMDir /r "$APPDATA\${PRODUCT_NAME}"

    ; Also delete from LocalAppData if present
    RMDir /r "$LOCALAPPDATA\${PRODUCT_NAME}"

    ; Delete legacy electron-store config file (old versions used this path)
    Delete "$APPDATA\eclosion-desktop\config.json"
    RMDir "$APPDATA\eclosion-desktop"

  done:
!macroend
