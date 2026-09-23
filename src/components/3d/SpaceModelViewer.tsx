'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { build3DModel } from './modelBuilder';
import { Hotspot, LayerDef, TourStep } from '@/data/spaceData';
import styles from './SpaceModelViewer.module.css';

interface Props {
  variant: string;
  hotspots?: Hotspot[];
  layers?: LayerDef[];
  tour?: TourStep[];
  missionName: string;
}

export default function SpaceModelViewer({
  variant,
  hotspots = [],
  layers = [],
  tour = [],
  missionName,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Viewer state
  const [activeHotspot, setActiveHotspot] = useState<Hotspot | null>(null);
  const [doorsOpen, setDoorsOpen] = useState(false);
  const [wireframe, setWireframe] = useState(false);
  const [autoSpin, setAutoSpin] = useState(true);
  const [tourIndex, setTourIndex] = useState<number | null>(null);
  const [hiddenLayers, setHiddenLayers] = useState<Record<string, boolean>>({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isWebGlSupported, setIsWebGlSupported] = useState(true);
  const [hotspotScreenPositions, setHotspotScreenPositions] = useState<{ id: number; x: number; y: number; visible: boolean }[]>([]);

  // Three.js internal references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const animFrameId = useRef<number | null>(null);

  // Interaction angles
  const rotRef = useRef({ yaw: -0.75, pitch: 0.35, dist: 55, targetYaw: -0.75, targetPitch: 0.35, targetDist: 55 });
  const isDragging = useRef(false);
  const prevMouse = useRef({ x: 0, y: 0 });
  const touchStartDist = useRef(0);

  // Initial distances per variant
  const getBaseDist = useCallback((v: string) => {
    switch (v) {
      case 'stack':
      case 'buranStack':
        return 88;
      case 'satria':
        return 65;
      case 'cubesat':
        return 32;
      case 'flatsat':
        return 48;
      default:
        return 52;
    }
  }, []);

  // Update Model in Scene
  const updateModelInScene = useCallback(() => {
    if (!sceneRef.current) return;

    if (modelGroupRef.current) {
      sceneRef.current.remove(modelGroupRef.current);
    }

    try {
      const model = build3DModel(variant, { doorsOpen });
      modelGroupRef.current = model;

      // Apply layer visibility
      model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          const grp = m.userData?.group;
          if (grp && hiddenLayers[grp]) {
            m.visible = false;
          } else {
            m.visible = true;
          }
          if (m.material) {
            const mats = Array.isArray(m.material) ? m.material : [m.material];
            mats.forEach((mat) => {
              (mat as THREE.MeshStandardMaterial).wireframe = wireframe;
            });
          }
        }
      });

      sceneRef.current.add(model);
    } catch (err) {
      console.warn('Three.js model load error:', err);
    }
  }, [variant, doorsOpen, hiddenLayers, wireframe]);

  // Initialize Three.js WebGL Scene
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Check WebGL support
    try {
      const testGl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!testGl) throw new Error('WebGL not supported');
    } catch (e) {
      console.warn('Falling back to 2D Canvas:', e);
      setIsWebGlSupported(false);
      return;
    }

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    rendererRef.current = renderer;

    // Distances
    const initialDist = getBaseDist(variant);
    rotRef.current.dist = initialDist;
    rotRef.current.targetDist = initialDist;

    // Ambient light (deep space subtle blue)
    const ambient = new THREE.AmbientLight(0x1a2638, 1.2);
    scene.add(ambient);

    // Primary Sun Key Light
    const sunLight = new THREE.DirectionalLight(0xfff8ee, 2.4);
    sunLight.position.set(40, 60, 50);
    scene.add(sunLight);

    // Earth Albedo Secondary Fill Light (subtle cyan)
    const earthLight = new THREE.DirectionalLight(0x38bdf8, 0.9);
    earthLight.position.set(-30, -40, -30);
    scene.add(earthLight);

    // Distant Star Field Particle System
    const starCount = 600;
    const starGeom = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 600;
      starPositions[i + 1] = (Math.random() - 0.5) * 600;
      starPositions[i + 2] = (Math.random() - 0.5) * 600;
    }
    starGeom.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0x94a3b8, size: 1.5, sizeAttenuation: false });
    const stars = new THREE.Points(starGeom, starMat);
    scene.add(stars);

    // Initial build
    updateModelInScene();

    // Animation Render Loop
    let running = true;
    const renderLoop = () => {
      if (!running) return;

      const r = rotRef.current;
      // Auto-spin if active and not dragging
      if (autoSpin && !isDragging.current && tourIndex === null) {
        r.targetYaw += 0.003;
      }

      // Smooth camera interpolation
      r.yaw += (r.targetYaw - r.yaw) * 0.08;
      r.pitch += (r.targetPitch - r.pitch) * 0.08;
      r.dist += (r.targetDist - r.dist) * 0.08;

      // Restrict pitch
      r.pitch = Math.max(-1.4, Math.min(1.4, r.pitch));

      // Calculate camera position from spherical coordinates
      const cx = r.dist * Math.cos(r.pitch) * Math.sin(r.yaw);
      const cy = r.dist * Math.sin(r.pitch);
      const cz = r.dist * Math.cos(r.pitch) * Math.cos(r.yaw);

      camera.position.set(cx, cy, cz);
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);

      // Project 3D Hotspots to 2D screen coordinates
      if (hotspots.length > 0 && containerRef.current) {
        const cw = containerRef.current.clientWidth;
        const ch = containerRef.current.clientHeight;

        const projected = hotspots.map((h) => {
          const vec = new THREE.Vector3(h.pos[0], h.pos[1], h.pos[2]);
          vec.project(camera);

          // Check if point is behind camera
          const visible = vec.z < 1;
          const x = (vec.x * 0.5 + 0.5) * cw;
          const y = (-(vec.y * 0.5) + 0.5) * ch;

          return { id: h.n, x, y, visible };
        });
        setHotspotScreenPositions(projected);
      }

      animFrameId.current = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    // Handle Resize
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      running = false;
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [variant, autoSpin, tourIndex, getBaseDist, updateModelInScene, hotspots]);

  // Update model when layer, wireframe, or doors state changes
  useEffect(() => {
    updateModelInScene();
  }, [updateModelInScene]);

  // Touch & Pointer Controls
  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    prevMouse.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - prevMouse.current.x;
    const dy = e.clientY - prevMouse.current.y;
    prevMouse.current = { x: e.clientX, y: e.clientY };

    rotRef.current.targetYaw -= dx * 0.007;
    rotRef.current.targetPitch += dy * 0.007;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignored if pointer was lost
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    rotRef.current.targetDist = Math.max(10, Math.min(180, rotRef.current.targetDist + e.deltaY * 0.05));
  };

  // Touch Pinch Zoom Handler
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartDist.current = Math.sqrt(dx * dx + dy * dy);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const diff = touchStartDist.current - dist;
      touchStartDist.current = dist;
      rotRef.current.targetDist = Math.max(10, Math.min(180, rotRef.current.targetDist + diff * 0.1));
    }
  };

  // Camera Presets
  const setCameraPreset = (preset: 'depan' | 'samping' | 'atas' | 'iso' | 'reset') => {
    const r = rotRef.current;
    setAutoSpin(false);
    setTourIndex(null);

    switch (preset) {
      case 'depan':
        r.targetYaw = variant.includes('stack') ? -Math.PI / 2 : Math.PI / 2;
        r.targetPitch = 0.05;
        break;
      case 'samping':
        r.targetYaw = 0;
        r.targetPitch = 0.08;
        break;
      case 'atas':
        r.targetYaw = 0;
        r.targetPitch = 1.35;
        break;
      case 'iso':
        r.targetYaw = -0.75;
        r.targetPitch = 0.45;
        break;
      case 'reset':
        r.targetYaw = -0.75;
        r.targetPitch = 0.35;
        r.targetDist = getBaseDist(variant);
        setAutoSpin(true);
        break;
    }
  };

  // Guided Tour Step Control
  const startTour = () => {
    if (!tour || tour.length === 0) return;
    setTourIndex(0);
    applyTourStep(0);
  };

  const applyTourStep = (index: number) => {
    const step = tour[index];
    if (!step) return;
    setAutoSpin(false);
    rotRef.current.targetYaw = step.yaw;
    rotRef.current.targetPitch = step.pitch;
    rotRef.current.targetDist = step.dist;
    if (step.doors !== undefined) setDoorsOpen(step.doors);
  };

  const nextTourStep = () => {
    if (tourIndex === null) return;
    const nextIdx = (tourIndex + 1) % tour.length;
    setTourIndex(nextIdx);
    applyTourStep(nextIdx);
  };

  const prevTourStep = () => {
    if (tourIndex === null) return;
    const prevIdx = (tourIndex - 1 + tour.length) % tour.length;
    setTourIndex(prevIdx);
    applyTourStep(prevIdx);
  };

  const exitTour = () => {
    setTourIndex(null);
    setCameraPreset('reset');
  };

  const toggleLayer = (layerId: string) => {
    setHiddenLayers((prev) => ({
      ...prev,
      [layerId]: !prev[layerId],
    }));
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`${styles.viewerContainer} ${isFullscreen ? styles.viewerFullscreen : ''}`}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      {/* 3D WebGL Canvas */}
      {isWebGlSupported ? (
        <canvas
          ref={canvasRef}
          className={styles.webglCanvas}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      ) : (
        <div className={styles.fallbackNotice}>
          <p>⚠️ WebGL tidak tersedia. Mode tampilan akselerasi perangkat nonaktif.</p>
        </div>
      )}

      {/* Floating 3D Hotspot DOM Badges */}
      {hotspotScreenPositions.map((h) => {
        const spotData = hotspots.find((item) => item.n === h.id);
        if (!h.visible || !spotData) return null;
        const isSelected = activeHotspot?.n === h.id;

        return (
          <button
            key={h.id}
            type="button"
            className={`${styles.hotspotPin} ${isSelected ? styles.hotspotPinActive : ''}`}
            style={{ left: `${h.x}px`, top: `${h.y}px` }}
            onClick={() => setActiveHotspot(spotData)}
            title={spotData.label}
          >
            <span className={styles.pinPulse} />
            <span className={styles.pinNumber}>{h.id}</span>
          </button>
        );
      })}

      {/* Top HUD Bar */}
      <div className={styles.topHud}>
        <div className={styles.craftBadge}>
          <span className={styles.statusDot} />
          <span className={styles.craftTitle}>{missionName}</span>
          <span className={styles.variantPill}>{variant}</span>
        </div>

        {/* View Presets */}
        <div className={styles.presetGroup}>
          <button type="button" onClick={() => setCameraPreset('depan')} className={styles.hudBtn}>Depan</button>
          <button type="button" onClick={() => setCameraPreset('samping')} className={styles.hudBtn}>Samping</button>
          <button type="button" onClick={() => setCameraPreset('atas')} className={styles.hudBtn}>Atas</button>
          <button type="button" onClick={() => setCameraPreset('iso')} className={styles.hudBtn}>Iso</button>
          <button type="button" onClick={() => setCameraPreset('reset')} className={styles.hudBtn}>Atur Ulang</button>
        </div>

        {/* Functional HUD Actions */}
        <div className={styles.toolActions}>
          <button
            type="button"
            className={`${styles.iconBtn} ${autoSpin ? styles.iconBtnActive : ''}`}
            onClick={() => setAutoSpin(!autoSpin)}
            title="Putar Otomatis"
          >
            🔄
          </button>
          <button
            type="button"
            className={`${styles.iconBtn} ${wireframe ? styles.iconBtnActive : ''}`}
            onClick={() => setWireframe(!wireframe)}
            title="Mode Garis / Wireframe"
          >
            🌐
          </button>
          {variant.includes('discovery') || variant.includes('buran') ? (
            <button
              type="button"
              className={`${styles.iconBtn} ${doorsOpen ? styles.iconBtnActive : ''}`}
              onClick={() => setDoorsOpen(!doorsOpen)}
              title="Buka / Tutup Pintu Ruang Kargo"
            >
              🚪
            </button>
          ) : null}
          {tour.length > 0 && (
            <button
              type="button"
              className={`${styles.hudBtn} ${tourIndex !== null ? styles.hudBtnPrimary : ''}`}
              onClick={tourIndex === null ? startTour : exitTour}
            >
              {tourIndex === null ? '▶ Mulai Tur' : '✕ Tutup Tur'}
            </button>
          )}
          <button
            type="button"
            className={styles.iconBtn}
            onClick={toggleFullscreen}
            title="Layar Penuh"
          >
            ⛶
          </button>
        </div>
      </div>

      {/* Guided Tour Banner */}
      {tourIndex !== null && tour[tourIndex] && (
        <div className={styles.tourCard} role="region" aria-label="Tur Berpandu">
          <div className={styles.tourHeader}>
            <span className={styles.tourStepNum}>Langkah {tourIndex + 1} dari {tour.length}</span>
            <button type="button" className={styles.tourCloseBtn} onClick={exitTour}>✕</button>
          </div>
          <h4 className={styles.tourTitle}>{tour[tourIndex].title}</h4>
          <p className={styles.tourDesc}>{tour[tourIndex].text}</p>
          <div className={styles.tourNav}>
            <button type="button" onClick={prevTourStep} className={styles.tourNavBtn}>← Sebelumnya</button>
            <button type="button" onClick={nextTourStep} className={`${styles.tourNavBtn} ${styles.tourNavBtnPrimary}`}>
              Selanjutnya →
            </button>
          </div>
        </div>
      )}

      {/* Hotspot Inspect Card (Modal / Drawer) */}
      {activeHotspot && (
        <div className={styles.hotspotCard} role="dialog" aria-label="Detail Komponen">
          <div className={styles.hotspotCardHeader}>
            <span className={styles.hotspotCategory}>{activeHotspot.kat}</span>
            <button type="button" className={styles.cardCloseBtn} onClick={() => setActiveHotspot(null)}>✕</button>
          </div>
          <h3 className={styles.hotspotLabel}>
            #{activeHotspot.n} · {activeHotspot.label}
          </h3>
          <p className={styles.hotspotNote}>{activeHotspot.note}</p>
          <div className={styles.cardFooter}>
            <span className={styles.layerTag}>Lapisan: {activeHotspot.layer}</span>
          </div>
        </div>
      )}

      {/* Bottom Floating Layer Switcher Pills */}
      {layers.length > 0 && tourIndex === null && (
        <div className={styles.layersBar}>
          <span className={styles.layersTitle}>Lapisan:</span>
          {layers.map((l) => {
            const isHidden = hiddenLayers[l.id];
            return (
              <button
                key={l.id}
                type="button"
                className={`${styles.layerPill} ${!isHidden ? styles.layerPillActive : ''}`}
                onClick={() => toggleLayer(l.id)}
                title={l.note}
              >
                {l.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
