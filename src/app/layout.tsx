import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';
import PwaManager from '@/components/pwa/PwaManager';
import { withBasePath } from '@/utils/basePath';

export const metadata: Metadata = {
  title: 'Space Edu 3D — Materi Edukasi Wahana Antariksa',
  description: 'Materi edukasi interaktif 3D: Space Shuttle Discovery, Buran, Satelit GEO Satria-1, RASCube V2, dan Kratos Bus 1B. Akses offline dengan dukungan PWA.',
  manifest: withBasePath('/manifest.json'),
  icons: {
    icon: [
      { url: withBasePath('/favicon.svg'), type: 'image/svg+xml' },
      { url: withBasePath('/icon-192.png'), sizes: '192x192', type: 'image/png' },
      { url: withBasePath('/icon-512.png'), sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: withBasePath('/icon-192.png'), sizes: '192x192', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Space3D',
  },
};

export const viewport: Viewport = {
  themeColor: '#070B12',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        <link rel="icon" href={withBasePath('/favicon.svg')} type="image/svg+xml" />
        <link rel="apple-touch-icon" href={withBasePath('/icon-192.png')} />
        <script src={withBasePath('/vendor/three.min.js')} defer></script>
        <script src={withBasePath('/_shuttle/scan/scan-data.js')} defer></script>
        <script src={withBasePath('/_shuttle/scan/buran-data.js')} defer></script>
        <script src={withBasePath('/_shuttle/scan-orbiter.js')} defer></script>
        <script src={withBasePath('/_shuttle/model.js')} defer></script>
        <script src={withBasePath('/_shuttle/orbiter.js')} defer></script>
        <script src={withBasePath('/_shuttle/buran-model.js')} defer></script>
        <script src={withBasePath('/_shuttle/energia.js')} defer></script>
        <script src={withBasePath('/_satria/satria-data.js')} defer></script>
        <script src={withBasePath('/_satria/satria-model.js')} defer></script>
        <script src={withBasePath('/_shuttle/three-stack-viewer.js')} defer></script>
        <script src={withBasePath('/scripts/viewer3d.js')} defer></script>
        <script src={withBasePath('/_nano/rascube-model.js')} defer></script>
        <script src={withBasePath('/_nano/rascube-poin.js')} defer></script>
        <script src={withBasePath('/_nano/kratos-model.js')} defer></script>
        <script src={withBasePath('/_nano/kratos-poin.js')} defer></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  function registerNanoModels() {
    var TV = window.ThreeModelViewer, SV = window.SpaceViewer;
    if (!TV || !SV || !window.RASCUBE_POIN || !window.KRATOS_POIN) return false;
    function titik(daftar) {
      return (daftar || []).map(function(p) {
        return { n: p.n, label: p.label, note: p.teks, pos: p.pos, ikut: p.ikut };
      });
    }
    SV.HOTSPOTS.rascube = titik(window.RASCUBE_POIN);
    SV.HOTSPOTS.kratos = titik(window.KRATOS_POIN);
    TV.MODELS.rascube = {
      factory: 'createRasCubeModel', tegak: false, layers: [], jarak: 1,
      fit: 0.95, toleransi: 0.4, awal: { yaw: -0.62, pitch: 0.26 },
      views: { depan: { yaw: 0.0001, pitch: 0.10 }, samping: { yaw: -Math.PI / 2, pitch: 0.10 },
               atas: { yaw: 0.0001, pitch: 1.25 } }
    };
    TV.MODELS.kratos = {
      factory: 'createKratosModel', tegak: false, layers: [], jarak: 1,
      fit: 0.8, toleransi: 0.45, awal: { yaw: -0.72, pitch: 0.28 },
      views: { depan: { yaw: 0.0001, pitch: 0.12 }, samping: { yaw: -Math.PI / 2, pitch: 0.10 },
               atas: { yaw: 0.0001, pitch: 1.25 } }
    };
    return true;
  }
  if (!registerNanoModels()) {
    document.addEventListener('DOMContentLoaded', registerNanoModels);
    window.addEventListener('load', registerNanoModels);
  }
})();
`,
          }}
        />
      </head>
      <body>
        {children}
        <PwaManager />
      </body>
    </html>
  );
}
