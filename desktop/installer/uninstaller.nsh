; Eclosion Uninstaller Script
; Custom NSIS code for cleanup during uninstall

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
