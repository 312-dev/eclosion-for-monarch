# Contributing to Eclosion Desktop

This guide covers building and developing the Eclosion desktop application.

## Prerequisites

- Node.js 20+
- Python 3.12+
- npm

### Platform-Specific Requirements

**macOS:**
- Xcode Command Line Tools (`xcode-select --install`)
- For signing: Apple Developer certificate

**Windows:**
- Visual Studio Build Tools (for native modules)

**Linux:**
- `rpm` and `dpkg` for packaging (optional)

## Project Structure

```
desktop/
├── src/
│   ├── main/           # Electron main process
│   │   ├── index.ts    # Main entry point
│   │   └── backend.ts  # Backend process manager
│   └── preload/        # Preload scripts
├── scripts/            # Build scripts
│   ├── build-main.js   # Bundles main/preload with esbuild
│   ├── build-backend.js # Compiles Python with PyInstaller
│   └── generate-icons.js
├── pyinstaller/        # PyInstaller config and output
└── electron-builder.yml # Packaging configuration
```

## Development Setup

1. **Install dependencies:**

```bash
# From repository root
cd frontend && npm ci
cd ../desktop && npm ci
pip install -r requirements.txt
pip install pyinstaller
```

2. **Build components:**

```bash
# Build frontend for desktop (IMPORTANT: requires VITE_DESKTOP_BUILD=true for file:// paths)
cd frontend && VITE_DESKTOP_BUILD=true npm run build

# Build Python backend
cd desktop/pyinstaller && python -m PyInstaller eclosion.spec --noconfirm

# Build Electron main process (with version/channel for proper display)
cd desktop && ECLOSION_VERSION="1.0.0" RELEASE_CHANNEL="stable" npm run build:main
```

> **Note**: `VITE_DESKTOP_BUILD=true` is required for the frontend build because Electron
> loads files via `file://` protocol, which requires relative paths (`./assets/...`) instead
> of absolute paths (`/assets/...`). CI sets this automatically.

3. **Run in development:**

```bash
cd desktop && npm run dev
```

## Build Commands

| Command | Description |
|---------|-------------|
| `npm run build:main` | Bundle Electron main/preload |
| `npm run build:frontend` | Build React frontend |
| `npm run build:backend` | Compile Python backend |
| `npm run build:all` | Build all components |
| `npm run dist:mac` | Package for macOS (universal) |
| `npm run dist:win` | Package for Windows |
| `npm run dist:linux` | Package for Linux |

## Testing Changes

Before submitting a PR with desktop changes:

1. **Run linting and type checks:**
   ```bash
   npm run lint
   npm run type-check
   ```

2. **Verify the full build works:**
   ```bash
   npm run build:all
   ```

3. **Test the packaged app (optional but recommended):**
   ```bash
   npm run dist:mac  # or dist:win / dist:linux
   ```

## Architecture

### Electron + Python Hybrid

The desktop app consists of:

1. **Electron shell** - Renders the React frontend
2. **Python backend** - Compiled with PyInstaller, handles Monarch API calls
3. **Frontend** - Same React app as the web version

### Backend Lifecycle

The `BackendManager` class in `src/main/backend.ts`:
- Spawns the Python backend as a child process
- Assigns an available port automatically
- Monitors the process and restarts on crashes
- Handles graceful shutdown

### Build Pipeline

1. **Frontend**: Vite bundles React app to `frontend/dist/`
2. **Backend**: PyInstaller compiles Python to standalone executable
3. **Electron**: esbuild bundles main/preload scripts
4. **Packaging**: electron-builder combines everything into installers

## CI/CD

Desktop builds are validated in CI:

- **PR checks**: Full build verification on macOS
- **Release builds**: Multi-platform (macOS universal, Windows x64, Linux x64)
- **Code signing**: macOS builds are notarized

### Binary Size Limits

CI warns if packaged artifacts exceed 300MB. If you see this warning:
- Check for unnecessary dependencies
- Review PyInstaller includes
- Ensure assets aren't duplicated

## Quick Local Build & Test

To build and test the desktop app locally without signing (run from repo root):

```bash
# 1. Build frontend with desktop flag
cd frontend && VITE_DESKTOP_BUILD=true npm run build && cd ..

# 2. Build Python backend
cd desktop/pyinstaller && python -m PyInstaller eclosion.spec --noconfirm && cd ..

# 3. Build Electron main process with version info (from desktop/)
cd desktop
ECLOSION_VERSION="1.0.0-local" RELEASE_CHANNEL="stable" npm run build:main

# 4. Package for your platform (still in desktop/)
npx electron-builder --mac --publish never  # or --win / --linux

# 5. Install (macOS) - local builds are unsigned, so remove quarantine
rm -rf /Applications/Eclosion.app
cp -R release/mac-arm64/Eclosion.app /Applications/
xattr -cr /Applications/Eclosion.app  # Only needed for local unsigned builds
```

## Troubleshooting

### White screen / Assets not loading
- **Cause**: Frontend was built without `VITE_DESKTOP_BUILD=true`
- **Fix**: Rebuild frontend with the flag: `VITE_DESKTOP_BUILD=true npm run build`
- **Why**: Electron uses `file://` protocol which requires relative paths (`./assets/...`).
  Without the flag, Vite generates absolute paths (`/assets/...`) which fail to load.

### Backend won't start
- Check Python dependencies are installed
- Verify PyInstaller output exists in `pyinstaller/dist/`
- Check console for port conflicts

### Build fails on macOS
- Ensure Xcode CLI tools are installed
- For ARM64 Macs, ensure Rosetta is installed for x64 compatibility

### Signing/notarization fails
- Verify Apple Developer credentials in environment
- Check certificate is valid and not expired

## Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [electron-builder Documentation](https://www.electron.build/)
- [PyInstaller Manual](https://pyinstaller.org/en/stable/)
