/**
 * macOS window frame overlay using Sharp
 *
 * Adds a native-looking macOS title bar with traffic light buttons
 * to screenshots for a polished marketing appearance.
 */

import sharp from 'sharp';
import { FRAME, VIEWPORT } from './config.js';

/**
 * Add macOS window frame to a screenshot
 * @param screenshot Raw screenshot buffer
 * @returns Screenshot with macOS frame applied
 */
export async function addMacOSFrame(screenshot: Buffer): Promise<Buffer> {
  const image = sharp(screenshot);
  const metadata = await image.metadata();

  const width = metadata.width ?? VIEWPORT.width * VIEWPORT.deviceScaleFactor;
  const height = metadata.height ?? VIEWPORT.height * VIEWPORT.deviceScaleFactor;

  // Total height including title bar
  const frameHeight = height + FRAME.titleBarHeight;

  // Padding for shadow effect
  const padding = 60;
  const canvasWidth = width + padding * 2;
  const canvasHeight = frameHeight + padding * 2;

  // Create the title bar SVG with traffic lights
  const titleBarSvg = createTitleBarSvg(width);

  // Create rounded corner mask for the entire window
  const windowMask = createWindowMask(width, frameHeight);

  // Create shadow layer
  const shadowSvg = createShadowSvg(width, frameHeight, padding);

  // Compose the final image
  const result = await sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }, // Transparent background
    },
  })
    .composite([
      // Shadow layer (behind everything)
      {
        input: Buffer.from(shadowSvg),
        top: 0,
        left: 0,
      },
      // Window background (will be masked to rounded corners)
      {
        input: await createWindowBackground(width, frameHeight),
        top: padding,
        left: padding,
      },
      // Title bar
      {
        input: Buffer.from(titleBarSvg),
        top: padding,
        left: padding,
      },
      // Screenshot content (below title bar)
      {
        input: screenshot,
        top: padding + FRAME.titleBarHeight,
        left: padding,
      },
      // Apply rounded corner mask
      {
        input: Buffer.from(windowMask),
        top: padding,
        left: padding,
        blend: 'dest-in',
      },
    ])
    .png()
    .toBuffer();

  return result;
}

/**
 * Create SVG for the title bar with traffic lights
 */
function createTitleBarSvg(width: number): string {
  const { titleBarHeight, titleBarColor, trafficLights: tl } = FRAME;

  return `
    <svg width="${width}" height="${titleBarHeight}" xmlns="http://www.w3.org/2000/svg">
      <!-- Title bar background -->
      <rect x="0" y="0" width="${width}" height="${titleBarHeight}" fill="${titleBarColor}"/>

      <!-- Traffic lights -->
      <circle cx="${tl.startX}" cy="${tl.y}" r="${tl.radius}" fill="${tl.colors.close}"/>
      <circle cx="${tl.startX + tl.spacing}" cy="${tl.y}" r="${tl.radius}" fill="${tl.colors.minimize}"/>
      <circle cx="${tl.startX + tl.spacing * 2}" cy="${tl.y}" r="${tl.radius}" fill="${tl.colors.maximize}"/>
    </svg>
  `;
}

/**
 * Create window background buffer
 */
async function createWindowBackground(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 45, g: 45, b: 68, alpha: 255 }, // Match title bar color
    },
  })
    .png()
    .toBuffer();
}

/**
 * Create rounded corner mask for the window
 */
function createWindowMask(width: number, height: number): string {
  const { borderRadius } = FRAME;

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${width}" height="${height}"
            rx="${borderRadius}" ry="${borderRadius}" fill="white"/>
    </svg>
  `;
}

/**
 * Create shadow SVG
 */
function createShadowSvg(width: number, height: number, padding: number): string {
  const { borderRadius } = FRAME;
  const shadowBlur = 40;
  const shadowOffsetY = 15;

  return `
    <svg width="${width + padding * 2}" height="${height + padding * 2}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="${shadowOffsetY}" stdDeviation="${shadowBlur}" flood-opacity="0.4"/>
        </filter>
      </defs>
      <rect x="${padding}" y="${padding}" width="${width}" height="${height}"
            rx="${borderRadius}" ry="${borderRadius}"
            fill="#1a1a2e" filter="url(#shadow)"/>
    </svg>
  `;
}
