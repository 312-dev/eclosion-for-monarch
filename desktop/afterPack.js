/**
 * afterPack Hook
 *
 * Fixes Python.framework signing issues before electron-builder signs the app.
 * PyInstaller creates a Python.framework that has an ambiguous bundle format,
 * causing codesign to fail with "bundle format is ambiguous (could be app or framework)".
 *
 * Solution: Pre-sign the problematic Python binary with --no-strict flag.
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

  const pythonBinary = path.join(pythonFramework, 'Python');

  if (!fs.existsSync(pythonBinary)) {
    console.log('No Python binary in framework, skipping pre-sign');
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
  console.log(`  Path: ${pythonBinary}`);

  try {
    // Sign the Python binary with --no-strict to handle ambiguous bundle format
    // Use --force to replace any existing signature
    // Use --deep to sign nested content
    execSync(
      `codesign --sign "${identity}" --force --timestamp --options runtime --no-strict "${pythonBinary}"`,
      { stdio: 'inherit' }
    );

    // Also sign the entire framework
    execSync(
      `codesign --sign "${identity}" --force --timestamp --options runtime --deep --no-strict "${pythonFramework}"`,
      { stdio: 'inherit' }
    );

    console.log('Pre-signing complete');
  } catch (error) {
    console.error('Pre-signing failed:', error.message);
    // Don't throw - let electron-builder continue and potentially succeed
  }
};
