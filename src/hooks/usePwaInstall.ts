import { useState, useEffect, useCallback } from 'react';

export interface PwaInstallState {
  isInstalled: boolean;
  isDownloaded: boolean;
  isDownloading: boolean;
  canInstall: boolean;
  installedAt: string | null;
  devicePlatform: 'ios' | 'android' | 'desktop';
}

const STORAGE_KEY_DOWNLOADED = 'nirikshak_pwa_downloaded';
const STORAGE_KEY_INSTALLED_AT = 'nirikshak_pwa_installed_at';

// Global deferred prompt holder so it persists across page navigations
let globalDeferredPrompt: any = null;
let hasInitializedListeners = false;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((cb) => cb());
}

if (typeof window !== 'undefined' && !hasInitializedListeners) {
  hasInitializedListeners = true;

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    globalDeferredPrompt = e;
    notifyListeners();
  });

  window.addEventListener('appinstalled', () => {
    try {
      localStorage.setItem(STORAGE_KEY_DOWNLOADED, 'true');
      localStorage.setItem(STORAGE_KEY_INSTALLED_AT, new Date().toISOString());
    } catch (_) {}
    globalDeferredPrompt = null;
    notifyListeners();
  });
}

export function usePwaInstall() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [showAlreadyInstalledDialog, setShowAlreadyInstalledDialog] = useState(false);
  const [showIosInstallGuide, setShowIosInstallGuide] = useState(false);

  const getSystemState = useCallback((): PwaInstallState => {
    if (typeof window === 'undefined') {
      return {
        isInstalled: false,
        isDownloaded: false,
        isDownloading: false,
        canInstall: false,
        installedAt: null,
        devicePlatform: 'desktop',
      };
    }

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    const storedDownloaded = localStorage.getItem(STORAGE_KEY_DOWNLOADED) === 'true';
    const installedAt = localStorage.getItem(STORAGE_KEY_INSTALLED_AT);

    const ua = navigator.userAgent;
    const isIOS =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/i.test(ua);
    const devicePlatform = isIOS ? 'ios' : isAndroid ? 'android' : 'desktop';

    // If running in standalone, it is definitely downloaded and installed
    const isDownloaded = isStandalone || storedDownloaded;

    return {
      isInstalled: isStandalone,
      isDownloaded,
      isDownloading,
      canInstall: !!globalDeferredPrompt || isIOS,
      installedAt,
      devicePlatform,
    };
  }, [isDownloading]);

  const [state, setState] = useState<PwaInstallState>(getSystemState);

  useEffect(() => {
    const update = () => setState(getSystemState());
    listeners.add(update);
    update();

    return () => {
      listeners.delete(update);
    };
  }, [getSystemState]);

  // Main install / download handler with single-download protection
  const triggerDownloadOrInstall = async (): Promise<'installed' | 'already_installed' | 'dismissed' | 'ios_guide'> => {
    const currentState = getSystemState();

    // 1. Check if already running or downloaded on this device
    if (currentState.isInstalled || currentState.isDownloaded) {
      setShowAlreadyInstalledDialog(true);
      return 'already_installed';
    }

    // 2. Prevent concurrent downloads
    if (isDownloading) {
      return 'already_installed';
    }

    // 3. Handle iOS Safari flow
    if (currentState.devicePlatform === 'ios') {
      setShowIosInstallGuide(true);
      return 'ios_guide';
    }

    // 4. Handle Android / Chromium native install prompt
    if (globalDeferredPrompt) {
      setIsDownloading(true);
      try {
        globalDeferredPrompt.prompt();
        const { outcome } = await globalDeferredPrompt.userChoice;
        if (outcome === 'accepted') {
          try {
            localStorage.setItem(STORAGE_KEY_DOWNLOADED, 'true');
            localStorage.setItem(STORAGE_KEY_INSTALLED_AT, new Date().toISOString());
          } catch (_) {}
          globalDeferredPrompt = null;
          setState(getSystemState());
          return 'installed';
        } else {
          return 'dismissed';
        }
      } catch (err) {
        console.warn('PWA install prompt error:', err);
        return 'dismissed';
      } finally {
        setIsDownloading(false);
      }
    }

    // Fallback: If no prompt is available yet, open guide or mark downloaded
    setShowAlreadyInstalledDialog(true);
    return 'already_installed';
  };

  const markAsUninstalledForTesting = () => {
    try {
      localStorage.removeItem(STORAGE_KEY_DOWNLOADED);
      localStorage.removeItem(STORAGE_KEY_INSTALLED_AT);
    } catch (_) {}
    setState(getSystemState());
  };

  return {
    ...state,
    triggerDownloadOrInstall,
    showAlreadyInstalledDialog,
    setShowAlreadyInstalledDialog,
    showIosInstallGuide,
    setShowIosInstallGuide,
    markAsUninstalledForTesting,
  };
}
