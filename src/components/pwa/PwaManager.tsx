'use client';

import { useEffect, useState } from 'react';
import { withBasePath, BASE_PATH } from '@/utils/basePath';

export default function PwaManager() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [isOffline, setIsOffline] = useState(() => (typeof navigator !== 'undefined' ? !navigator.onLine : false));
  const [showOnlineToast, setShowOnlineToast] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const handleOnline = () => {
      setIsOffline(false);
      setShowOnlineToast(true);
      const timer = setTimeout(() => setShowOnlineToast(false), 3000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowOnlineToast(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Register Service Worker
    const swPath = withBasePath('/sw.js');
    const swScope = BASE_PATH ? `${BASE_PATH}/` : '/';
    navigator.serviceWorker
      .register(swPath, { scope: swScope })
      .then((reg) => {
        if (reg.waiting) {
          setWaitingWorker(reg.waiting);
          setUpdateAvailable(true);
        }

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setWaitingWorker(newWorker);
              setUpdateAvailable(true);
            }
          });
        });

        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!refreshing) {
            refreshing = true;
            window.location.reload();
          }
        });
      })
      .catch((err) => {
        console.warn('[PWA] Service Worker registration failed:', err);
      });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  const handleDismiss = () => {
    setUpdateAvailable(false);
  };

  return (
    <>
      {/* PWA Floating Update Banner */}
      {updateAvailable && (
        <div id="pwa-update-banner" className="pwa-banner" role="alert">
          <div className="pwa-banner__content">
            <span className="pwa-banner__icon">🚀</span>
            <div className="pwa-banner__text">
              <strong>Pembaruan Tersedia</strong>
              <p>Versi terbaru materi Space Edu 3D telah siap.</p>
            </div>
          </div>
          <div className="pwa-banner__actions">
            <button
              id="pwa-update-btn"
              onClick={handleUpdate}
              className="pwa-btn pwa-btn--primary"
            >
              Perbarui Sekarang
            </button>
            <button
              id="pwa-dismiss-btn"
              onClick={handleDismiss}
              className="pwa-btn pwa-btn--text"
            >
              Nanti
            </button>
          </div>
        </div>
      )}

      {/* PWA Offline / Online Status Pill */}
      {isOffline && (
        <div className="pwa-status pwa-status--offline">
          <span className="pwa-status__dot"></span>
          <span>Mode Offline Aktif</span>
        </div>
      )}

      {showOnlineToast && !isOffline && (
        <div className="pwa-status pwa-status--online">
          <span className="pwa-status__dot"></span>
          <span>Kembali Online</span>
        </div>
      )}
    </>
  );
}
