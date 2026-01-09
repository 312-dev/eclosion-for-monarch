/**
 * afterPack Hook
 *
 * Fixes Python.framework signing issues before electron-builder signs the app.
 * PyInstaller creates a Python.framework that has an ambiguous bundle format,
 * causing codesign to fail with "bundle format is ambiguous (could be app or framework)".
 *
 * Solution: Pre-sign all Python binaries with --no-strict flag, from deepest to shallowest.
 * This ensures proper signatures with timestamps that pass Apple notarization.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

exports.default = async function (context) {
  const { electronPlatformName, appOutDir } = context;

  // Only needed for macOS
  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const pythonFramework = path.join(
    appOutDir,
    `${appName}.app`,
    'Contents',
    'Resources',
    'backend',
    '_internal',
    'Python.framework'
  );

  // Check if Python.framework exists (PyInstaller output)
  if (!fs.existsSync(pythonFramework)) {
    console.log('No Python.framework found, skipping pre-sign');
    return;
  }

  // Get the signing identity from environment or find it
  let identity = process.env.CSC_NAME;

  if (!identity) {
    // Try to find Developer ID Application certificate
    try {
      const result = execSync(
        'security find-identity -v -p codesigning | grep "Developer ID Application" | head -1 | sed \'s/.*"\\(.*\\)".*/\\1/\''
      ).toString().trim();
      if (result) {
        identity = result;
      }
    } catch {
      console.log('Could not find signing identity, skipping pre-sign');
      return;
    }
  }

  if (!identity) {
    console.log('No signing identity available, skipping pre-sign');
    return;
  }

  console.log('Pre-signing Python.framework with --no-strict...');
  console.log(`  Identity: ${identity}`);
  console.log(`  Framework: ${pythonFramework}`);

  try {
    // Find the versioned Python binary (the actual binary, not the symlink)
    // Structure: Python.framework/Versions/3.12/Python
    const versionsDir = path.join(pythonFramework, 'Versions');
    if (fs.existsSync(versionsDir)) {
      const versions = fs.readdirSync(versionsDir).filter(v => v !== 'Current');
      for (const version of versions) {
        const versionedBinary = path.join(versionsDir, version, 'Python');
        if (fs.existsSync(versionedBinary) && !fs.lstatSync(versionedBinary).isSymbolicLink()) {
          console.log(`  Signing versioned binary: Versions/${version}/Python`);
          execSync(
            `codesign --sign "${identity}" --force --timestamp --options runtime --no-strict "${versionedBinary}"`,
            { stdio: 'inherit' }
          );
        }

        // Sign the version directory as a bundle
        const versionDir = path.join(versionsDir, version);
        console.log(`  Signing version directory: Versions/${version}`);
        execSync(
          `codesign --sign "${identity}" --force --timestamp --options runtime --no-strict "${versionDir}"`,
          { stdio: 'inherit' }
        );
      }
    }

    // Sign the top-level Python (which may be a symlink, but codesign follows it)
    const pythonBinary = path.join(pythonFramework, 'Python');
    if (fs.existsSync(pythonBinary)) {
      console.log('  Signing top-level Python binary');
      execSync(
        `codesign --sign "${identity}" --force --timestamp --options runtime --no-strict "${pythonBinary}"`,
        { stdio: 'inherit' }
      );
    }

    // Finally sign the entire framework
    console.log('  Signing entire framework');
    execSync(
      `codesign --sign "${identity}" --force --timestamp --options runtime --no-strict "${pythonFramework}"`,
      { stdio: 'inherit' }
    );

    // Verify the signature
    console.log('  Verifying signature...');
    execSync(`codesign --verify --deep --strict "${pythonFramework}"`, { stdio: 'inherit' });

    console.log('Pre-signing complete');
  } catch (error) {
    console.error('Pre-signing failed:', error.message);
    // Don't throw - let electron-builder continue and potentially succeed
  }
};
