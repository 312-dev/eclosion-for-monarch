/**
 * macOS Notarization Script
 *
 * This script is called by electron-builder after signing the app.
 * It submits the app to Apple's notarization service.
 *
 * Required environment variables:
 * - APPLE_ID: Your Apple ID email
 * - APPLE_APP_SPECIFIC_PASSWORD: App-specific password from appleid.apple.com
 * - APPLE_TEAM_ID: Your Apple Developer Team ID
 */

const { notarize } = require('@electron/notarize');

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

  console.log('Notarizing macOS application...');
  console.log(`  App: ${appPath}`);
  console.log(`  Team ID: ${teamId}`);

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
    // Don't throw - allow build to continue without notarization
    // This allows local development builds without Apple credentials
  }
};
