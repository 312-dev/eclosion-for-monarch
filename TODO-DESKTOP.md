# Desktop (Electron) Improvements

Identified gaps and improvements for the Electron desktop application across macOS, Windows, and Linux.

---

## Tier 1: Critical / Quick Wins

These should be tackled first — low effort, high impact on reliability.

- [x] **Log rotation** — Debug log (`~/eclosion-debug.log`) grows indefinitely with no rotation or size cap. Could consume significant disk space over time.
  - Files: `desktop/src/main/index.ts:14`
  - Fix: Implement rotation (keep last 5 files, max 10MB each) or use `electron-log`
  - **Done**: Created `desktop/src/main/logger.ts` with 10MB max size, 5 rotated files

- [x] **Move logs to data folder** — Logs are in `~/eclosion-debug.log` but data is in `~/Library/Application Support/Eclosion` (macOS). Users clicking "Reveal Data Folder" won't find logs.
  - Fix: Move to `{stateDir}/logs/debug.log`
  - **Done**: Logs now written to `{stateDir}/logs/debug.log`

- [x] **Expand backend port range** — Only tries ports 5001-5010 (10 ports). Could fail if other apps use these ports or user runs multiple instances.
  - Files: `desktop/src/main/backend.ts:72`
  - Fix: Expand to 5001-5100 or use `get-port` without restrictions
  - **Done**: Expanded to ports 5001-5100

- [x] **Fix macOS template icons** — Tray uses color icon instead of monochrome template image. Doesn't adapt to light/dark mode properly.
  - Files: `desktop/scripts/generate-icons.js:140-143`
  - Fix: Generate proper monochrome template icons for macOS menu bar
  - **Done**: Added `generateMacTemplateIcon()` that creates black+alpha template icons

---

## Tier 2: High Impact

Enable users to report issues and improve supportability.

- [x] **Export Diagnostics bundle** — No way for users to collect logs + system info for support requests.
  - Should include: debug log, backend logs, app version, OS version, architecture, last sync status, sanitized settings
  - Add button in Settings > Desktop or Help menu
  - **Done**: Created `desktop/src/main/diagnostics.ts` with `Export Diagnostics...` and `Copy Debug Info` in Help menu

- [x] **Crash reporting (Sentry)** — No visibility into production crashes. Crashes only logged locally.
  - Sentry has Electron-specific support with free tier
  - Docs: https://sentry.io/for/electron/
  - **Done**: Created `desktop/src/main/sentry.ts` with optional Sentry integration. Set `SENTRY_DSN` env var to enable. Includes privacy-preserving beforeSend hook, breadcrumbs for lifecycle events, and integration with uncaught exception handlers.

- [x] **Backend health indicator** — Health checks run silently every 30s. Users don't know if backend is healthy or crashed.
  - Files: `desktop/src/main/backend.ts:148-157`
  - Fix: Show status in tray tooltip (e.g., "Backend: Running • Last sync: 5 min ago")
  - **Done**: Added `updateHealthStatus()` in tray.ts; tooltip shows "Backend: Running/Stopped" and last sync time

- [x] **Separate backend log file** — Backend stdout/stderr goes to console but isn't persisted separately.
  - Fix: Write to `{stateDir}/logs/backend.log`
  - **Done**: Added `initBackendLog()`, `writeBackendLog()` in backend.ts; writes to `{stateDir}/logs/backend.log`

- [x] **Tighten CSP for images** — `img-src 'self' data: https:` allows any HTTPS image source.
  - Files: `desktop/src/main/window.ts:26`
  - Fix: Restrict to specific domains or remove blanket `https:` allowance
  - **Done**: Removed `https:` from img-src, now only allows `'self' data:`

---

## Tier 3: Platform Parity

Expand platform support and fix inconsistencies.

- [x] **macOS Universal Binary** — CI only builds ARM64 on macOS 15. Intel Mac users rely on Rosetta 2 translation.
  - Fix: Use `--universal` flag or build both `--x64 --arm64`
  - **Done**: Added x64 build matrix (macos-13) alongside ARM64 (macos-15). Separate downloads for each architecture since PyInstaller backend is architecture-specific.

- [x] **Linux ARM64 build** — Only builds x64. Raspberry Pi / ARM Linux users unsupported.
  - Requires ARM64 runner in CI (GitHub now offers these)
  - **Done**: Added ARM64 matrix (ubuntu-24.04-arm) for both backend and packaging. Updated electron-builder.yml with arm64 targets.

- [x] **Linux RPM package** — Only DEB + AppImage. Fedora/RHEL users must use AppImage.
  - Fix: Add `rpm` to targets in `electron-builder.yml`
  - **Done**: Added `rpm` target with Fedora/RHEL dependencies (GConf2, libnotify, libappindicator-gtk3, libXtst, nss)

- [x] **Consolidate duplicate health checks** — Main process checks every 30s AND frontend calls `/recurring/auto-sync/status`.
  - Files: `desktop/src/main/backend.ts:148-157`, `desktop/src/main/backend.ts:267`
  - Fix: Remove one of the duplicate checks
  - **Investigated**: Not actually duplicate. `/health` (every 30s) is for tray status. `/recurring/auto-sync/status` is only called once on wake-from-sleep (main) and once when Settings loads (frontend). Different purposes, no consolidation needed.

- [x] **"Show in Dock" consistency** — Only implemented for macOS. Windows/Linux have no equivalent toggle.
  - Files: `desktop/src/main/tray.ts:116-127`, `desktop/src/main/ipc.ts:221-230`
  - Fix: Either add equivalent for other platforms or document why macOS-only
  - **Done**: Documented in both tray.ts and ipc.ts why this is macOS-only (macOS has dock API, Windows has no equivalent, Linux varies by DE)

---

## Tier 4: UX Polish

Improve troubleshooting and feedback experience.

- [x] **In-app log viewer** — Users must find and open log files manually.
  - Add Settings > Advanced panel showing last N log lines with search
  - **Done**: Created `frontend/src/components/settings/LogViewerSection.tsx` with collapsible log viewer. Shows last 500 lines, file selector, search filter, auto-refresh. Added IPC handlers in `desktop/src/main/ipc.ts` with security check to only read from log directory.

- [x] **Offline mode indicator** — No indication when app is offline or backend unreachable.
  - Users might not realize sync isn't happening
  - **Done**: Created `frontend/src/components/OfflineIndicator.tsx` that shows a red banner when backend is unreachable. Added IPC event `backend-status-changed` and `getHealthStatus` API. Banner appears below update banners in AppShell.

- [x] **Wake-from-sleep feedback** — Sync after wake happens silently with no user feedback.
  - Files: `desktop/src/main/index.ts:158-172`
  - Fix: Show subtle notification or tray indicator when sync occurs
  - **Done**: Modified `checkSyncNeeded()` to return sync result. Power monitor now shows notification "Synced After Wake" when a sync is triggered after resume, and updates tray menu with last sync time.

- [x] **Update failure retry UI** — Update failures are logged but not surfaced to users.
  - Fix: Add retry button and manual download link on failure
  - **Done**: Created `frontend/src/components/update/UpdateErrorBanner.tsx` with error message display, retry button, and GitHub releases link. Added to AppShell.tsx banner section.

- [x] **"Copy Debug Info" button** — Quick way to copy version + OS + last errors for bug reports.
  - Add to Settings or Help menu
  - **Done**: Added to Help menu alongside Export Diagnostics

---

## Tier 5: Nice to Have

Advanced capabilities for power users.

- [x] **Backup/Restore** — No way to export all data and settings for backup or migration to another machine.
  - **Done**: Created `desktop/src/main/backup.ts` with JSON-based backup format. Includes all data files (credentials, session, state, security events) and desktop settings. Added menu items in File menu with security warnings. Backup files are portable and include version info for compatibility checking.

- [x] **Global hotkeys** — No keyboard shortcut to show/hide app or trigger sync.
  - Common in tray-based apps
  - **Done**: Created `desktop/src/main/hotkeys.ts` with global shortcut support. Default shortcuts: `CmdOrCtrl+Shift+E` (toggle window), `CmdOrCtrl+Shift+S` (trigger sync). Hotkeys are configurable and can be enabled/disabled. Added IPC handlers for frontend configuration access.

- [x] **Deep linking protocol** — No `eclosion://` protocol for opening specific views from external links or automations.
  - **Done**: Created `desktop/src/main/deeplinks.ts` with support for `eclosion://` URLs. Supported paths: `open`, `recurring`, `settings`, `settings/desktop`, `settings/advanced`, `sync`. Registered in electron-builder.yml for macOS Info.plist. Handles both fresh launches and second-instance (when app already running).

- [x] **First-run onboarding** — No dedicated introduction to desktop-specific features (tray behavior, auto-start, etc.).
  - **Done**: Created `desktop/src/main/onboarding.ts` with onboarding state management and content. Tracks onboarding completion with version support (can re-show for major updates). Provides 6 onboarding steps covering: tray, auto-start, hotkeys, deep links, and sync. Added IPC handlers for frontend to consume.

- [x] **Startup performance metrics** — No measurement of how long startup takes. Can't detect regressions.
  - **Done**: Created `desktop/src/main/startup-metrics.ts` with milestone-based timing. Records: app ready, backend start, window create, and total startup time. Stores history of last 50 startups, calculates averages, and warns when startup is 20%+ slower than average. Metrics logged to debug log and exposed via IPC.

- [x] **Document port-via-query pattern** — Backend port passed via URL query parameter is unconventional but works.
  - Add code comment explaining the design decision
  - **Done**: Added comprehensive JSDoc in `desktop/src/main/window.ts` explaining the dual-mechanism architecture (query param + IPC), why IPC is preferred, and how both complement each other.

- [x] **Uninstall cleanup** — macOS has no uninstaller. Windows NSIS preserves app data (`deleteAppDataOnUninstall: false`).
  - Consider: macOS uninstaller app, Windows cleanup option during uninstall
  - **Done**: Created `desktop/src/main/cleanup.ts` with factory reset functionality and platform-specific cleanup instructions. Added `desktop/installer/uninstaller.nsh` for Windows NSIS that prompts users to delete app data during uninstall. In-app "Factory Reset" available via IPC for all platforms.

- [x] **Document/unify tray click behavior** — Windows has single-click + double-click, macOS/Linux only single-click.
  - Files: `desktop/src/main/tray.ts:25-26, 63-67`
  - **Done**: Added JSDoc in `desktop/src/main/tray.ts` explaining platform-specific click behavior and why it intentionally differs. Decision: keep platform-specific behavior to match user expectations (macOS = single-click, Windows = single + double-click).

- [x] **Document title bar differences** — macOS uses `hiddenInset`, Windows/Linux use default.
  - Files: `desktop/src/main/window.ts:81`
  - Intentional platform polish, but undocumented
  - **Done**: Added JSDoc explaining macOS 'hiddenInset' for modern integrated look vs Windows/Linux 'default' for native appearance. Documents why each platform differs and cross-references AppShell.tsx for header padding.

---

## Summary

| Tier | Done | Total | Focus |
|------|------|-------|-------|
| 1 | 4 | 4 | Critical reliability fixes |
| 2 | 5 | 5 | Supportability & diagnostics |
| 3 | 5 | 5 | Platform parity |
| 4 | 5 | 5 | UX polish |
| 5 | 9 | 9 | Power user features |
| **Total** | **28** | **28** | |

---

## References

- Electron crashReporter: https://www.electronjs.org/docs/latest/api/crash-reporter
- Sentry for Electron: https://sentry.io/for/electron/
- electron-log package: https://www.npmjs.com/package/electron-log
