# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec file for Eclosion backend.
Bundles the Flask application and all dependencies into a single executable.
"""
import sys
from pathlib import Path
from PyInstaller.utils.hooks import collect_data_files, collect_submodules

# Project root (parent of desktop/)
project_root = Path(SPECPATH).parent.parent

# Collect all submodules for packages that PyInstaller might miss
hidden_imports_from_submodules = []
hidden_imports_from_submodules += collect_submodules('flask')
hidden_imports_from_submodules += collect_submodules('werkzeug')
hidden_imports_from_submodules += collect_submodules('sqlalchemy')
hidden_imports_from_submodules += collect_submodules('monarchmoney')

# Collect data files
datas = [
    # Include version file
    (str(project_root / 'version.txt'), '.'),
]

# Include SSL certificates for HTTPS connections (required for PyInstaller bundles)
# Uses PyInstaller's hook system to find certifi's CA bundle
datas += collect_data_files('certifi')

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
        'flask.app',
        'flask.blueprints',
        'flask.config',
        'flask.ctx',
        'flask.globals',
        'flask.helpers',
        'flask.json',
        'flask.logging',
        'flask.sessions',
        'flask.signals',
        'flask.templating',
        'flask.wrappers',
        'flask_cors',
        'flask_limiter',
        'flask_limiter.util',

        # Werkzeug (Flask's underlying WSGI toolkit)
        'werkzeug',
        'werkzeug.datastructures',
        'werkzeug.debug',
        'werkzeug.exceptions',
        'werkzeug.formparser',
        'werkzeug.http',
        'werkzeug.local',
        'werkzeug.routing',
        'werkzeug.security',
        'werkzeug.serving',
        'werkzeug.test',
        'werkzeug.urls',
        'werkzeug.utils',
        'werkzeug.wrappers',
        'werkzeug.wsgi',

        # SQLAlchemy (database ORM)
        'sqlalchemy',
        'sqlalchemy.orm',
        'sqlalchemy.ext.asyncio',
        'sqlalchemy.dialects.sqlite',
        'sqlalchemy.pool',
        'sqlalchemy.engine',

        # Monarch Money client
        'monarchmoney',
        'monarchmoney.monarchmoney',

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
        'dateutil',
        'dateutil.relativedelta',

        # Image processing for metadata service
        'PIL',
        'PIL.Image',

        # HTML parsing for metadata service
        'bs4',
        'lxml',

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
    ] + hidden_imports_from_submodules,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[str(Path(SPECPATH) / 'hook-ssl-certs.py')],
    excludes=[
        # Exclude unnecessary modules to reduce size
        'tkinter',
        'matplotlib',
        'numpy',
        'pandas',
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
