# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec file for Eclosion backend.
Bundles the Flask application and all dependencies into a single executable.
"""
import sys
from pathlib import Path
import certifi

# Project root (parent of desktop/)
project_root = Path(SPECPATH).parent.parent

# Collect data files
datas = [
    # Include version file
    (str(project_root / 'version.txt'), '.'),
    # Include SSL certificates for HTTPS connections (required for PyInstaller bundles)
    (certifi.where(), 'certifi'),
]

# Check for state migrations directory
migrations_dir = project_root / 'state' / 'migrations'
if migrations_dir.exists():
    datas.append((str(migrations_dir), 'state/migrations'))

a = Analysis(
    [str(project_root / 'app.py')],
    pathex=[str(project_root)],
    binaries=[],
    datas=datas,
    hiddenimports=[
        # Flask and extensions
        'flask',
        'flask_cors',
        'flask_limiter',
        'flask_limiter.util',

        # APScheduler
        'apscheduler',
        'apscheduler.schedulers.background',
        'apscheduler.triggers.interval',
        'apscheduler.jobstores.memory',
        'apscheduler.executors.pool',

        # Cryptography
        'cryptography',
        'cryptography.fernet',
        'cryptography.hazmat.backends',
        'cryptography.hazmat.primitives',
        'cryptography.hazmat.primitives.kdf.pbkdf2',

        # Other dependencies
        'dotenv',
        'pyotp',
        'cachetools',
        'certifi',

        # Monarch Money client dependencies
        'aiohttp',
        'gql',
        'gql.transport.aiohttp',
        'graphql',

        # Standard library modules that might be missed
        'sqlite3',
        'json',
        'asyncio',
        'typing',
        'dataclasses',
        'email.mime.text',
        'email.mime.multipart',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[str(Path(SPECPATH) / 'hook-ssl-certs.py')],
    excludes=[
        # Exclude unnecessary modules to reduce size
        'tkinter',
        'matplotlib',
        'numpy',
        'pandas',
        'PIL',
        'cv2',
        'scipy',
        'IPython',
        'jupyter',
        'notebook',
    ],
    noarchive=False,
    optimize=2,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='eclosion-backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,  # Keep console for logging
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,  # Use native architecture
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='eclosion-backend',
)
