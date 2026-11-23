'use client';

import { useEffect, useState } from 'react';

interface AngleSpec {
  yaw: number;
  pitch: number;
  alt: string;
  caption: string;
}

const ANGLES: AngleSpec[] = [
  {
    yaw: -0.75,
    pitch: 0.30,
    alt: 'Satria-1 tampak tiga perempat',
    caption: 'Tampak tiga perempat — bus, dua sayap surya yang dibentangkan, dan ketiga reflektor antena.',
  },
  {
    yaw: 0.0001,
    pitch: 0.05,
    alt: 'Satria-1 tampak samping',
    caption: 'Tampak samping — dilihat sejajar bentang sayap, sehingga kedua sayap bertumpuk jadi satu dan profil bus terbaca utuh.',
  },
  {
    yaw: 0.0001,
    pitch: 1.25,
    alt: 'Satria-1 tampak atas',
    caption: 'Tampak atas — badan satelit dari atas; sayap suryanya menghadap ke samping, jadi dari sini hanya terlihat tepinya yang tipis.',
  },
  {
    yaw: Math.PI / 2,
    pitch: 0.06,
    alt: 'Satria-1 tampak depan',
    caption: 'Tampak depan — sisi yang menghadap Bumi, tempat ketiga reflektor antena dipasang. Dari arah inilah bentang sayap suryanya terlihat penuh.',
  },
];

interface ThreeLikeObject {
  isMesh?: boolean;
  geometry?: { dispose: () => void };
  material?: ThreeLikeMaterial | ThreeLikeMaterial[];
  updateMatrixWorld: (force?: boolean) => void;
  traverse: (cb: (obj: ThreeLikeObject) => void) => void;
}

interface ThreeLikeMaterial {
  map?: { image?: HTMLImageElement; dispose: () => void };
  dispose: () => void;
}

interface ThreeLikeBox3 {
  setFromObject: (obj: ThreeLikeObject) => ThreeLikeBox3;
  getBoundingSphere: (target: ThreeLikeSphere) => ThreeLikeSphere;
}

interface ThreeLikeSphere {
  center: { x: number; y: number; z: number };
  radius: number;
}

interface ThreeGlobal {
  WebGLRenderer: new (opts: { antialias: boolean; preserveDrawingBuffer: boolean }) => {
    domElement: HTMLCanvasElement;
    setPixelRatio: (r: number) => void;
    setSize: (w: number, h: number, updateStyle: boolean) => void;
    render: (scene: unknown, cam: unknown) => void;
    forceContextLoss: () => void;
    dispose: () => void;
  };
  Scene: new () => {
    background: unknown;
    add: (obj: unknown) => void;
  };
  Color: new (hex: string) => unknown;
  HemisphereLight: new (sky: string, ground: string, intensity: number) => unknown;
  DirectionalLight: new (color: string, intensity: number) => {
    position: { set: (x: number, y: number, z: number) => void };
  };
  Box3: new () => ThreeLikeBox3;
  Sphere: new () => ThreeLikeSphere;
  PerspectiveCamera: new (fov: number, aspect: number, near: number, far: number) => {
    position: { set: (x: number, y: number, z: number) => void };
    lookAt: (target: { x: number; y: number; z: number }) => void;
  };
  MathUtils: {
    degToRad: (deg: number) => number;
  };
}

interface SatriaWindow extends Window {
  THREE?: ThreeGlobal;
  createSatriaModel?: () => ThreeLikeObject;
}

export default function SatriaModelGallery() {
  const [renders, setRenders] = useState<string[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let texTimer: ReturnType<typeof setTimeout> | null = null;
    const startTime = Date.now();

    function renderSnapshot() {
      const win = window as SatriaWindow;
      const THREE = win.THREE;
      if (!THREE || typeof win.createSatriaModel !== 'function') {
        if (!cancelled) setFailed(true);
        return;
      }

      const width = 760;
      const height = 520;
      const fov = 34;

      let model: ThreeLikeObject;
      const textures: Array<{ image?: HTMLImageElement; dispose: () => void }> = [];

      try {
        model = win.createSatriaModel();
        model.updateMatrixWorld(true);
        model.traverse((obj) => {
          if (!obj.isMesh || !obj.material) return;
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => {
            if (m.map && !textures.includes(m.map)) {
              textures.push(m.map);
            }
          });
        });
      } catch {
        if (!cancelled) setFailed(true);
        return;
      }

      function texturesReady() {
        return textures.every((tex) => {
          const im = tex.image;
          return Boolean(im && im.complete && im.naturalWidth);
        });
      }

      let remaining = 60;

      function drawAll() {
        if (cancelled || !THREE) return;
        let renderer: InstanceType<ThreeGlobal['WebGLRenderer']> | null = null;

        try {
          renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
          renderer.setPixelRatio(1);
          renderer.setSize(width, height, false);

          const scene = new THREE.Scene();
          scene.background = new THREE.Color('#0d1118');
          scene.add(new THREE.HemisphereLight('#eef4fb', '#243040', 1.0));
          const key = new THREE.DirectionalLight('#ffffff', 1.05);
          key.position.set(-5, 8, 10);
          scene.add(key);
          const fill = new THREE.DirectionalLight('#cfe0f2', 0.45);
          fill.position.set(8, 1, -6);
          scene.add(fill);
          scene.add(model);

          const sphere = new THREE.Box3().setFromObject(model).getBoundingSphere(new THREE.Sphere());
          const cam = new THREE.PerspectiveCamera(fov, width / height, 0.5, 4000);
          const dist = (sphere.radius / Math.sin(THREE.MathUtils.degToRad(fov) / 2)) * 0.72;

          const urls = ANGLES.map((angle) => {
            cam.position.set(
              sphere.center.x + dist * Math.cos(angle.pitch) * Math.sin(angle.yaw),
              sphere.center.y + dist * Math.sin(angle.pitch),
              sphere.center.z + dist * Math.cos(angle.pitch) * Math.cos(angle.yaw)
            );
            cam.lookAt(sphere.center);
            renderer!.render(scene, cam);
            return renderer!.domElement.toDataURL('image/jpeg', 0.86);
          });

          if (!cancelled) setRenders(urls);
        } catch {
          if (!cancelled) setFailed(true);
        } finally {
          model.traverse((obj) => {
            if (!obj.isMesh) return;
            obj.geometry?.dispose();
            const mats = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : [];
            mats.forEach((m) => {
              m.map?.dispose();
              m.dispose();
            });
          });
          if (renderer) {
            renderer.forceContextLoss();
            renderer.dispose();
          }
        }
      }

      function waitTextures() {
        if (cancelled) return;
        if (texturesReady() || --remaining <= 0) {
          drawAll();
          return;
        }
        texTimer = setTimeout(waitTextures, 100);
      }

      waitTextures();
    }

    function tryStart() {
      const win = window as SatriaWindow;
      if (win.THREE && typeof win.createSatriaModel === 'function') {
        if (pollTimer) clearInterval(pollTimer);
        renderSnapshot();
        return true;
      }
      if (Date.now() - startTime > 8000) {
        if (pollTimer) clearInterval(pollTimer);
        if (!cancelled) setFailed(true);
        return true;
      }
      return false;
    }

    if (!tryStart()) {
      pollTimer = setInterval(tryStart, 50);
    }

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
      if (texTimer) clearTimeout(texTimer);
    };
  }, []);

  return (
    <div className="gallery">
      {ANGLES.map((angle, idx) => (
        <figure key={angle.alt}>
          {failed ? (
            <div className="galeri-kosong">Render tidak tersedia di peramban ini.</div>
          ) : renders?.[idx] ? (
            <img src={renders[idx]} alt={angle.alt} />
          ) : (
            <div className="galeri-kosong">Merender model 3D…</div>
          )}
          <figcaption>{angle.caption}</figcaption>
        </figure>
      ))}
    </div>
  );
}
