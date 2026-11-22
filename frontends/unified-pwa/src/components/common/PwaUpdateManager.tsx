import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { RefreshCw, Sparkles, X, Loader2 } from 'lucide-react';
import { checkIsUserBusy } from '../../hooks/useUserActivityGuard';
import { APP_VERSION } from '../../version';

export const PwaUpdateManager: React.FC = () => {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [availableVersion, setAvailableVersion] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const location = useLocation();
  const initialPathRef = useRef(location.pathname);

  // In development mode on localhost, unregister any stale workbox service workers
  useEffect(() => {
    if (import.meta.env.DEV && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((reg) => {
          if (!reg.active?.scriptURL.includes('firebase-messaging-sw.js')) {
            reg.unregister().catch(() => {});
          }
        });
      });
    }
  }, []);

  // Canonical Vite chunk-load auto-recovery: when old chunks are deleted after new deployment
  useEffect(() => {
    const handlePreloadError = () => {
      console.warn('⚡ [VitePreload] New deployment detected via chunk mismatch. Silently reloading to fresh bundle...');
      window.location.reload();
    };

    window.addEventListener('vite:preloadError', handlePreloadError);
    return () => window.removeEventListener('vite:preloadError', handlePreloadError);
  }, []);

  // Perform clean, cache-busting instant reload
  const executeReload = useCallback(async () => {
    setIsUpdating(true);

    if (availableVersion) {
      localStorage.setItem(`trusthyre_dismissed_version_${availableVersion}`, 'true');
    }

    try {
      // 1. Clear browser CacheStorage so new bundle is pulled directly
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((name) => caches.delete(name)));
      }

      // 2. Instruct active service workers to skip waiting
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map(async (reg) => {
            if (reg.waiting) {
              reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
            if (!reg.active?.scriptURL.includes('firebase-messaging-sw.js')) {
              return reg.unregister();
            }
          })
        );
      }
    } catch (err) {
      console.warn('Cache clearing during instant reload:', err);
    }

    // 3. Cache-busting complete reload
    const url = new URL(window.location.href);
    url.searchParams.set('_v', Date.now().toString());
    window.location.replace(url.toString());
  }, [availableVersion]);

  // Check version.json on server and compare strictly with APP_VERSION
  const checkVersionJson = useCallback(async () => {
    if (import.meta.env.DEV) return;
    try {
      const res = await fetch(`/version.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });

      if (!res.ok) return;

      const data = await res.json();
      const remoteVersion = data?.version;

      if (remoteVersion && typeof APP_VERSION === 'string' && remoteVersion !== APP_VERSION) {
        const isDismissed = localStorage.getItem(`trusthyre_dismissed_version_${remoteVersion}`) === 'true';
        if (!isDismissed) {
          setAvailableVersion(remoteVersion);
          setHasUpdate(true);
        } else {
          setHasUpdate(false);
        }
      } else {
        setHasUpdate(false);
      }
    } catch {
      // Offline or network error -> fail silently
    }
  }, []);

  // Silent automatic update on next user navigation (when user is not in an active form)
  useEffect(() => {
    if (hasUpdate && location.pathname !== initialPathRef.current) {
      const isBusy = checkIsUserBusy();
      if (!isBusy) {
        executeReload();
      }
    }
  }, [hasUpdate, location.pathname, executeReload]);

  // Periodic check (every 3 minutes) & tab visibility change
  useEffect(() => {
    const initialTimer = setTimeout(() => {
      checkVersionJson();
    }, 2000);

    const intervalId = setInterval(() => {
      checkVersionJson();
    }, 3 * 60 * 1000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVersionJson();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkVersionJson]);

  const handleDismiss = () => {
    if (availableVersion) {
      localStorage.setItem(`trusthyre_dismissed_version_${availableVersion}`, 'true');
    }
    setHasUpdate(false);
  };

  if (!hasUpdate || !availableVersion) {
    return null;
  }

  return (
    <aside
      aria-label="Application update available"
      className="fixed bottom-5 right-5 z-[9999] font-['Onest',system-ui,sans-serif] animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      <div className="flex items-center gap-2.5 px-3.5 py-2 bg-[#0f2f63] text-white rounded-full shadow-xl border border-white/10 text-xs">
        <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0 animate-pulse" />
        <span className="font-medium text-white/90">
          Update ready <span className="text-white/60">(v{availableVersion})</span>
        </span>
        <button
          type="button"
          onClick={() => executeReload()}
          disabled={isUpdating}
          className="ml-1 inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-[#0f2f63] font-bold rounded-full text-[11px] transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-75"
        >
          {isUpdating ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3" />
          )}
          <span>{isUpdating ? 'Updating...' : 'Refresh'}</span>
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-white/50 hover:text-white p-0.5 rounded-full transition-colors cursor-pointer"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
};
