/**
 * NIRIKSHAK AI — Platform & Environment Detection Utility
 * Automatically identifies user environment (Operating System, Device, Browser, Standalone/PWA Mode)
 * without requiring manual user selection.
 */

export type PlatformType = 'windows' | 'macos' | 'linux' | 'android' | 'ios' | 'unknown';
export type AppMode = 'web' | 'pwa';

export interface PlatformInfo {
  platform: PlatformType;
  appMode: AppMode;
  isStandalone: boolean;
  isPWA: boolean;
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isDesktop: boolean;
}

/**
 * Robustly inspects the browser environment and returns normalized platform information.
 */
export function detectPlatform(): PlatformInfo {
  if (typeof window === 'undefined') {
    return {
      platform: 'unknown',
      appMode: 'web',
      isStandalone: false,
      isPWA: false,
      isMobile: false,
      isIOS: false,
      isAndroid: false,
      isDesktop: false,
    };
  }

  // 1. Detect Standalone / Installed PWA Display Mode
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    (window.navigator as any).standalone === true ||
    (typeof document !== 'undefined' && document.referrer.includes('android-app://'));

  const appMode: AppMode = isStandalone ? 'pwa' : 'web';

  // 2. Inspect User Agent and Navigator Platform
  const ua = navigator.userAgent || '';
  const platformDataStr = (navigator as any).userAgentData?.platform || '';
  const navPlatform = navigator.platform || '';

  let platform: PlatformType = 'unknown';

  // iOS detection: iPhones, iPods, and modern iPads (iPadOS reports MacIntel with touch support)
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navPlatform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);

  // Android detection
  const isAndroid =
    /Android/i.test(ua) ||
    /android/i.test(platformDataStr) ||
    /android/i.test(navPlatform);

  if (isIOS) {
    platform = 'ios';
  } else if (isAndroid) {
    platform = 'android';
  } else if (
    /Win/i.test(platformDataStr) ||
    /Windows/i.test(ua) ||
    /Win32|Win64|Windows/i.test(navPlatform)
  ) {
    platform = 'windows';
  } else if (
    /Mac/i.test(platformDataStr) ||
    /Macintosh|Mac OS X/i.test(ua) ||
    /MacPPC|MacIntel/i.test(navPlatform)
  ) {
    platform = 'macos';
  } else if (
    /Linux/i.test(platformDataStr) ||
    /Linux/i.test(ua) ||
    /Linux/i.test(navPlatform)
  ) {
    platform = 'linux';
  } else {
    platform = 'unknown';
  }

  const isMobile = platform === 'ios' || platform === 'android';
  const isDesktop = platform === 'windows' || platform === 'macos' || platform === 'linux';

  return {
    platform,
    appMode,
    isStandalone,
    isPWA: isStandalone,
    isMobile,
    isIOS,
    isAndroid,
    isDesktop,
  };
}
