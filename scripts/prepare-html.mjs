import fs from 'fs';
import path from 'path';

const publicDir = path.resolve('public');
const files = [
  'index.html',
  'discovery.html',
  'buran.html',
  'satria-1.html',
  'cubesat.html'
];

const pwaHeadSnippet = `
<base href="/">
<link rel="manifest" href="/manifest.json">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/icon-192.png">
<meta name="theme-color" content="#070B12">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Space3D">
`;

const pwaStyleSnippet = `
/* =====================================================================
   PWA UI & Mobile Responsive Polish
   ===================================================================== */
.pwa-banner {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: 9999;
  background: rgba(16, 24, 35, 0.96);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(79, 168, 224, 0.4);
  border-radius: 12px;
  padding: 1.1rem 1.3rem;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.6), 0 0 20px rgba(79, 168, 224, 0.2);
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  max-width: 22rem;
  animation: pwaSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  font-family: var(--display, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
}
@keyframes pwaSlideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
.pwa-banner__content {
  display: flex;
  align-items: flex-start;
  gap: 0.8rem;
}
.pwa-banner__icon {
  font-size: 1.5rem;
  line-height: 1;
}
.pwa-banner__text strong {
  display: block;
  font-size: 0.95rem;
  color: #EDF2F7;
  margin-bottom: 0.2rem;
}
.pwa-banner__text p {
  margin: 0;
  font-size: 0.82rem;
  color: #B7C4D2;
  line-height: 1.4;
}
.pwa-banner__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
}
.pwa-btn {
  font-family: var(--mono, monospace);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0.45rem 0.9rem;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}
.pwa-btn--primary {
  background: #4FA8E0;
  color: #070B12;
  font-weight: 700;
}
.pwa-btn--primary:hover {
  background: #73bded;
  box-shadow: 0 0 12px rgba(79, 168, 224, 0.5);
}
.pwa-btn--text {
  background: transparent;
  color: #7A8B9F;
}
.pwa-btn--text:hover {
  color: #EDF2F7;
}
.pwa-status {
  position: fixed;
  bottom: 1.2rem;
  left: 1.2rem;
  z-index: 9999;
  background: rgba(16, 24, 35, 0.88);
  backdrop-filter: blur(10px);
  border: 1px solid #21303F;
  border-radius: 20px;
  padding: 0.35rem 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--mono, monospace);
  font-size: 0.72rem;
  color: #EDF2F7;
}
.pwa-status__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}
.pwa-status--offline {
  border-color: #E1483C;
}
.pwa-status--offline .pwa-status__dot {
  background: #E1483C;
  box-shadow: 0 0 8px #E1483C;
}
.pwa-status--online {
  border-color: #7EC88C;
}
.pwa-status--online .pwa-status__dot {
  background: #7EC88C;
  box-shadow: 0 0 8px #7EC88C;
}
@media (max-width: 640px) {
  .pwa-banner {
    left: 1rem;
    right: 1rem;
    bottom: 2rem;
    max-width: none;
  }
  .pwa-status {
    left: 50%;
    transform: translateX(-50%);
    bottom: 2rem;
    white-space: nowrap;
  }
}
`;

const pwaBodySnippet = `
<!-- PWA Elements -->
<div id="pwa-update-banner" class="pwa-banner" style="display: none;">
  <div class="pwa-banner__content">
    <span class="pwa-banner__icon">🚀</span>
    <div class="pwa-banner__text">
      <strong>Pembaruan Tersedia</strong>
      <p>Versi terbaru materi Space Edu 3D telah siap.</p>
    </div>
  </div>
  <div class="pwa-banner__actions">
    <button id="pwa-update-btn" class="pwa-btn pwa-btn--primary">Perbarui Sekarang</button>
    <button id="pwa-dismiss-btn" class="pwa-btn pwa-btn--text">Nanti</button>
  </div>
</div>

<div id="pwa-status-pill" class="pwa-status" style="display: none;">
  <span class="pwa-status__dot"></span>
  <span id="pwa-status-text">Mode Offline Aktif</span>
</div>

<script>
/* Space Edu 3D - PWA & Offline Service Worker Registration */
(function() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('/sw.js').then(function(reg) {
        function promptUpdate(worker) {
          var banner = document.getElementById('pwa-update-banner');
          var updateBtn = document.getElementById('pwa-update-btn');
          var dismissBtn = document.getElementById('pwa-dismiss-btn');
          if (!banner || !updateBtn) return;
          banner.style.display = 'flex';
          updateBtn.onclick = function() {
            worker.postMessage({ type: 'SKIP_WAITING' });
          };
          if (dismissBtn) {
            dismissBtn.onclick = function() {
              banner.style.display = 'none';
            };
          }
        }

        if (reg.waiting) {
          promptUpdate(reg.waiting);
        }

        reg.addEventListener('updatefound', function() {
          var newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', function() {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              promptUpdate(newWorker);
            }
          });
        });

        var refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', function() {
          if (!refreshing) {
            refreshing = true;
            window.location.reload();
          }
        });
      }).catch(function(err) {
        console.warn('SW registration failed:', err);
      });

      var pill = document.getElementById('pwa-status-pill');
      var pillText = document.getElementById('pwa-status-text');
      function updateOnlineStatus() {
        if (!pill || !pillText) return;
        if (!navigator.onLine) {
          pill.style.display = 'flex';
          pill.className = 'pwa-status pwa-status--offline';
          pillText.textContent = 'Mode Offline Aktif';
        } else {
          pill.className = 'pwa-status pwa-status--online';
          pillText.textContent = 'Kembali Online';
          setTimeout(function() { pill.style.display = 'none'; }, 3000);
        }
      }
      window.addEventListener('online', updateOnlineStatus);
      window.addEventListener('offline', updateOnlineStatus);
      if (!navigator.onLine) updateOnlineStatus();
    });
  }
})();
</script>
`;

for (const file of files) {
  const filePath = path.join(publicDir, file);
  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    continue;
  }
  let content = fs.readFileSync(filePath, 'utf-8');

  // Insert base and PWA head elements if not already present
  if (!content.includes('<base href="/">')) {
    content = content.replace(/<meta name="viewport"[^>]*>/i, (m) => `${m}\n${pwaHeadSnippet}`);
  }

  // Insert PWA styles if not present
  if (!content.includes('.pwa-banner')) {
    content = content.replace('</style>', `${pwaStyleSnippet}\n</style>`);
  }

  // Insert PWA elements and script before </body>
  if (!content.includes('id="pwa-update-banner"')) {
    content = content.replace('</body>', `${pwaBodySnippet}\n</body>`);
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Processed ${file} successfully.`);
}
