import { useState, useEffect, useCallback } from 'react';
import { useIsMarketingSite } from './useIsMarketingSite';
import { useDemo } from '../context/DemoContext';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export interface PwaInstallState {
  canInstall: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  promptInstall: () => Promise<boolean>;
}

export function usePwaInstall(): PwaInstallState {
  const isMarketingSite = useIsMarketingSite();
  const isDemo = useDemo();

  // PWA install should only be available on self-hosted production deployments,
  // not on marketing/docs sites or demo mode
  const shouldSuppressInstall = isMarketingSite || isDemo;

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  // Use lazy initialization for values that can be computed synchronously
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof globalThis.window === 'undefined') return false;
    return (
      globalThis.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone: boolean }).standalone === true
    );
  });

  const [isIOS] = useState(() => {
    if (typeof globalThis.window === 'undefined') return false;
    return (
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(globalThis as unknown as { MSStream: unknown }).MSStream
    );
  });

  useEffect(() => {
    // Listen for the install prompt event
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    globalThis.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for successful install
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    globalThis.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      globalThis.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      globalThis.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return outcome === 'accepted';
    } catch {
      return false;
    }
  }, [deferredPrompt]);

  return {
    // Suppress install capability on marketing/docs sites and demo mode
    canInstall: !shouldSuppressInstall && !!deferredPrompt,
    isInstalled,
    // Don't show iOS install instructions on marketing/demo sites either
    isIOS: !shouldSuppressInstall && isIOS,
    promptInstall,
  };
}
