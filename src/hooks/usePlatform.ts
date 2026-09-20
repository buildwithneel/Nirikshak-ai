import { useState, useEffect } from 'react';
import { detectPlatform, PlatformInfo } from '../utils/platformDetection';

/**
 * React hook that returns automatically detected platform and display mode.
 * Reactively responds to standalone display-mode media queries.
 */
export const usePlatform = (): PlatformInfo => {
  const [platformInfo, setPlatformInfo] = useState<PlatformInfo>(() => detectPlatform());

  useEffect(() => {
    const handleModeChange = () => {
      setPlatformInfo(detectPlatform());
    };

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleModeChange);
    } else if ((mediaQuery as any).addListener) {
      (mediaQuery as any).addListener(handleModeChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleModeChange);
      } else if ((mediaQuery as any).removeListener) {
        (mediaQuery as any).removeListener(handleModeChange);
      }
    };
  }, []);

  return platformInfo;
};

export default usePlatform;
