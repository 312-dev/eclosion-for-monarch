/**
 * macOS Notarization Script
 *
 * This script is called by electron-builder after signing the app.
 * It re-signs Python.framework with --no-strict (to fix PyInstaller's
 * non-standard framework format), then submits the app to Apple's
 * notarization service.
 *
 * Required environment variables:
 * - APPLE_ID: Your Apple ID email
 * - APPLE_APP_SPECIFIC_PASSWORD: App-specific password from appleid.apple.com
 * - APPLE_TEAM_ID: Your Apple Developer Team ID
 */

const { notarize } = require('@electron/notarize');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Re-sign Python.framework with --no-strict flag
 * This is needed because electron-builder's signing may have overwritten
 * our afterPack signatures, and PyInstaller's framework format requires --no-strict
 */
function resignPythonFramework(appPath, identity) {
  const pythonFramework = path.join(
    appPath,
    'Contents',
    'Resources',
    'backend',
    '_internal',
    'Python.framework'
  );

  if (!fs.existsSync(pythonFramework)) {
    console.log('  No Python.framework found, skipping re-sign');
    return;
  }

  console.log('  Re-signing Python.framework with --no-strict...');

  try {
    // Sign the framework with --deep --no-strict --force
    execSync(
      `codesign --sign "${identity}" --force --timestamp --options runtime --deep --no-strict "${pythonFramework}"`,
      { stdio: 'inherit' }
    );
    console.log('  Python.framework re-signed successfully');
  } catch (error) {
    console.error('  Warning: Python.framework re-sign failed:', error.message);
  }
}

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;

  // Only notarize on macOS
  if (electronPlatformName !== 'darwin') {
    console.log('Skipping notarization (not macOS)');
    return;
  }

  // Check for required environment variables
  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;

  if (!appleId || !appleIdPassword || !teamId) {
    console.log('Skipping notarization (missing credentials)');
    console.log('  APPLE_ID:', appleId ? '✓' : '✗');
    console.log('  APPLE_APP_SPECIFIC_PASSWORD:', appleIdPassword ? '✓' : '✗');
    console.log('  APPLE_TEAM_ID:', teamId ? '✓' : '✗');
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = `${appOutDir}/${appName}.app`;

  console.log('Preparing macOS application for notarization...');
  console.log(`  App: ${appPath}`);
  console.log(`  Team ID: ${teamId}`);

  // Get signing identity
  let identity = process.env.CSC_NAME;
  if (!identity) {
    try {
      identity = execSync(
        'security find-identity -v -p codesigning | grep "Developer ID Application" | head -1 | sed \'s/.*"\\(.*\\)".*/\\1/\''
      ).toString().trim();
    } catch {
      console.log('  Warning: Could not find signing identity');
    }
  }

  // Re-sign Python.framework before notarization
  if (identity) {
    resignPythonFramework(appPath, identity);

    // Re-sign the entire app to ensure the signature is valid after framework re-signing
    console.log('  Re-signing entire app...');
    try {
      execSync(
        `codesign --sign "${identity}" --force --timestamp --options runtime --deep "${appPath}"`,
        { stdio: 'inherit' }
      );
      console.log('  App re-signed successfully');
    } catch (error) {
      console.error('  Warning: App re-sign failed:', error.message);
    }
  }

  console.log('Notarizing macOS application...');

  try {
    await notarize({
      appBundleId: 'com.eclosion.desktop',
      appPath,
      appleId,
      appleIdPassword,
      teamId,
    });

    console.log('Notarization complete!');
  } catch (error) {
    console.error('Notarization failed:', error.message);
    throw error; // Throw to fail the build - notarization is required for distribution
  }
};
