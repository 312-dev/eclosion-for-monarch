# Desktop App

Run Eclosion as a native desktop application on macOS, Windows, or Linux. No server required — everything runs locally on your computer.

## Download

**[Download the latest release](https://github.com/312-dev/eclosion/releases/latest)**

Available for:
- **macOS** — Universal binary (Intel and Apple Silicon)
- **Windows** — Installer (.exe)
- **Linux** — AppImage and .deb packages

## Features

- **System tray icon** — Quick access menu without opening the full app
- **Auto-start on login** — Optional, configure in Settings
- **Automatic updates** — Downloads and installs updates from GitHub Releases
- **Local-only** — Runs entirely on localhost, no instance secret needed

## Important Notes

Unlike the server deployment, syncing only runs while the app is open. The app will sync immediately on launch if it's been closed for a while.

## Building from Source

### Prerequisites

- Node.js 20+
- Python 3.11+
- Platform-specific build tools (Xcode for macOS, etc.)

### Build Steps

```bash
# Clone the repository
git clone https://github.com/312-dev/eclosion.git
cd eclosion/desktop
npm install

# Install frontend dependencies
cd ../frontend && npm install && cd ../desktop

# Install backend dependencies
pip install -r ../requirements.txt
pip install pyinstaller

# Build for your platform
npm run dist:mac     # macOS
npm run dist:win     # Windows
npm run dist:linux   # Linux
```

The built application will be in `desktop/release/`.

### Platform-Specific Notes

**macOS:**
- Builds are signed and notarized for Gatekeeper
- Universal binary supports both Intel and Apple Silicon

**Windows:**
- You may see SmartScreen warnings on first run
- Click "More info" → "Run anyway" to proceed

**Linux:**
- AppImage: Run `chmod +x Eclosion-*.AppImage` to make executable
- .deb: Install with `sudo dpkg -i eclosion_*.deb`

## Next Steps

- [[Updating & Rollback|Updating]] — Keep your app up to date
- [[Security]] — How your credentials are protected
