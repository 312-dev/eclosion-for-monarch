/**
 * Type definitions for screenshot generator
 */

export interface ScreenshotConfig {
  /** Display name for logging */
  name: string;
  /** URL path to capture (e.g., '/demo/dashboard') */
  url: string;
  /** Output filename */
  filename: string;
  /** Selector to wait for before capturing */
  waitForSelector?: string;
  /** Additional delay after page load (ms) */
  delay?: number;
}

export interface ViewportConfig {
  width: number;
  height: number;
  deviceScaleFactor: number;
}

export interface FrameConfig {
  /** Height of the title bar */
  titleBarHeight: number;
  /** Border radius for window corners */
  borderRadius: number;
  /** Background color of the title bar */
  titleBarColor: string;
  /** Traffic light button configuration */
  trafficLights: {
    y: number;
    startX: number;
    spacing: number;
    radius: number;
    colors: {
      close: string;
      minimize: string;
      maximize: string;
    };
  };
}

export interface GenerateOptions {
  /** Base URL for the app (e.g., 'http://localhost:4173') */
  baseUrl: string;
  /** Output directory for screenshots */
  outputDir: string;
  /** Whether to start a local server */
  local?: boolean;
}
