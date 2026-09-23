'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

export interface NanoPoint {
  n: number;
  label: string;
  teks: string;
  rinci?: string[];
  pos?: [number, number, number];
  pandang?: { yaw: number; pitch: number };
  ikut?: string;
  lapisan?: string;
}

export interface NanoTourStep {
  n?: number;
  judul?: string;
  teks: string;
  pandang?: { yaw: number; pitch: number };
  deploy?: number;
}

interface NanoViewerStageProps {
  modelType: 'rascube' | 'kratos';
  cornerText: string;
  points: NanoPoint[];
  layers: Record<string, string>;
  views: Record<string, { yaw: number; pitch: number }>;
  initialView: { yaw: number; pitch: number };
  tourSteps: NanoTourStep[];
  hasDeploySlider?: boolean;
}

export default function NanoViewerStage({
  modelType,
  cornerText,
  points,
  layers,
  views,
  initialView,
  tourSteps,
  hasDeploySlider = false,
}: NanoViewerStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // States
  const [activePointIndex, setActivePointIndex] = useState<number>(-1);
  const [tourIndex, setTourIndex] = useState<number>(-1);
  const [isSpinning, setIsSpinning] = useState<boolean>(true);
  const [showNumbers, setShowNumbers] = useState<boolean>(true);
  const [deployValue, setDeployValue] = useState<number>(100);
  const [activeLayers, setActiveLayers] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    Object.keys(layers).forEach((k) => (init[k] = true));
    return init;
  });

  // Hotspots screen coordinates state
  const [spotPositions, setSpotPositions] = useState<
    Array<{
      x: number;
      y: number;
      visible: boolean;
      behind: boolean;
    }>
  >([]);

  // Internal 3D engine refs
  const stateRef = useRef<{
    yaw: number;
    pitch: number;
    tYaw: number;
    tPitch: number;
    jarak: number;
    tJarak: number;
    zoom: number;
    deploy: number;
    tDeploy: number;
    isSpinning: boolean;
    showNumbers: boolean;
    activePointIndex: number;
    tourIndex: number;
    model: any;
    scene: any;
    camera: any;
    renderer: any;
    reqId: number | null;
    spots: Array<{
      el: any;
      point: NanoPoint;
      obj: any;
      worldPos: any;
    }>;
    raycaster: any;
    layerGroups: Record<string, any[]>;
    distLipat: number;
    distBentang: number;
    targetCenter: any;
  }>({
    yaw: initialView.yaw,
    pitch: initialView.pitch,
    tYaw: initialView.yaw,
    tPitch: initialView.pitch,
    jarak: 100,
    tJarak: 100,
    zoom: 1,
    deploy: 1,
    tDeploy: 1,
    isSpinning: true,
    showNumbers: true,
    activePointIndex: -1,
    tourIndex: -1,
    model: null,
    scene: null,
    camera: null,
    renderer: null,
    reqId: null,
    spots: [],
    raycaster: null,
    layerGroups: {},
    distLipat: 70,
    distBentang: 95,
    targetCenter: null,
  });

  // Sync state refs
  useEffect(() => {
    stateRef.current.isSpinning = isSpinning;
  }, [isSpinning]);

  useEffect(() => {
    stateRef.current.showNumbers = showNumbers;
  }, [showNumbers]);

  useEffect(() => {
    stateRef.current.activePointIndex = activePointIndex;
  }, [activePointIndex]);

  useEffect(() => {
    stateRef.current.tourIndex = tourIndex;
  }, [tourIndex]);

  // Set deploy function
  const applyDeploy = useCallback((val: number) => {
    const s = stateRef.current;
    s.deploy = val;
    s.tDeploy = val;
    if (s.model && typeof s.model.userData.setDeploy === 'function') {
      s.model.userData.setDeploy(val);
    }
    s.tJarak = (s.distLipat + (s.distBentang - s.distLipat) * val) * s.zoom;
    setDeployValue(Math.round(val * 100));
  }, []);

  // Initialize Three.js scene
  useEffect(() => {
    let isCancelled = false;

    function initScene() {
      const win = window as any;
      const THREE = win.THREE;
      if (!THREE || !canvasRef.current || !stageRef.current) return false;

      const stage = stageRef.current;
      const canvas = canvasRef.current;

      let createFn: any = null;
      if (modelType === 'rascube') createFn = win.createRasCubeModel;
      if (modelType === 'kratos') createFn = win.createKratosModel;

      if (typeof createFn !== 'function') return false;

      const s = stateRef.current;

      // 1. Scene & Renderer
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, 16 / 10, 0.1, 2000);
      const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

      // 2. Model
      const model = createFn();
      scene.add(model);

      // 3. Studio 3-point lighting
      scene.add(new THREE.HemisphereLight('#e8f0fa', '#1b2430', 0.95));
      const keyLight = new THREE.DirectionalLight('#fff6e6', 1.15);
      keyLight.position.set(-9, 12, 14);
      scene.add(keyLight);
      const fillLight = new THREE.DirectionalLight('#bcd4ec', 0.55);
      fillLight.position.set(11, 2, -9);
      scene.add(fillLight);
      const backLight = new THREE.DirectionalLight('#ffffff', 0.35);
      backLight.position.set(2, -6, -12);
      scene.add(backLight);

      // 4. Calculate framing
      const FOV = 32;
      const canDeploy = typeof model.userData.setDeploy === 'function';

      function calcFit() {
        model.updateMatrixWorld(true);
        const b = new THREE.Box3().setFromObject(model);
        const sz = b.getSize(new THREE.Vector3());
        const aspect = (stage.clientWidth || 16) / (stage.clientHeight || 10);
        const tanHalf = Math.tan(THREE.MathUtils.degToRad(FOV) / 2);
        const needV = (sz.y / 2) / tanHalf;
        const needH = (Math.max(sz.x, sz.z) / 2) / (tanHalf * aspect);
        return {
          dist: Math.max(needV, needH) * 1.06,
          center: b.getCenter(new THREE.Vector3()),
        };
      }

      if (canDeploy) model.userData.setDeploy(0);
      const fitLipat = calcFit();
      if (canDeploy) model.userData.setDeploy(1);
      const fitBentang = calcFit();

      s.distLipat = fitLipat.dist;
      s.distBentang = fitBentang.dist;
      s.targetCenter = fitBentang.center.clone();
      s.jarak = fitBentang.dist;
      s.tJarak = fitBentang.dist;
      s.deploy = 1;
      s.tDeploy = 1;

      // 5. Gather layer groups
      const layerGroups: Record<string, any[]> = {};
      model.traverse((o: any) => {
        if (o.isMesh) {
          const g = o.userData.group || 'lain';
          if (!layerGroups[g]) layerGroups[g] = [];
          layerGroups[g].push(o);
        }
      });

      // 6. Setup point tracking objects
      const spots = points.map((p) => {
        const obj = p.ikut ? model.getObjectByName(p.ikut) : null;
        return {
          el: null,
          point: p,
          obj: obj,
          worldPos: new THREE.Vector3(),
        };
      });

      s.scene = scene;
      s.camera = camera;
      s.renderer = renderer;
      s.model = model;
      s.raycaster = new THREE.Raycaster();
      s.layerGroups = layerGroups;
      s.spots = spots;

      // Camera positioner
      function positionCamera() {
        camera.position.set(
          s.targetCenter.x + s.jarak * Math.cos(s.pitch) * Math.sin(s.yaw),
          s.targetCenter.y + s.jarak * Math.sin(s.pitch),
          s.targetCenter.z + s.jarak * Math.cos(s.pitch) * Math.cos(s.yaw)
        );
        camera.lookAt(s.targetCenter);
      }

      function handleResize() {
        if (!stage || !canvas) return;
        const w = stage.clientWidth;
        const h = stage.clientHeight;
        if (w === 0 || h === 0) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();

        const curD = s.deploy;
        if (canDeploy) model.userData.setDeploy(0);
        s.distLipat = calcFit().dist;
        if (canDeploy) model.userData.setDeploy(1);
        s.distBentang = calcFit().dist;
        if (canDeploy) model.userData.setDeploy(curD);
        s.tJarak = (s.distLipat + (s.distBentang - s.distLipat) * curD) * s.zoom;
      }

      handleResize();
      positionCamera();

      // Drag and scroll events
      let dragging = false;
      let prevX = 0;
      let prevY = 0;

      function onPointerDown(e: PointerEvent) {
        dragging = true;
        prevX = e.clientX;
        prevY = e.clientY;
        setIsSpinning(false);
        if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
      }

      function onPointerMove(e: PointerEvent) {
        if (!dragging) return;
        s.tYaw = s.yaw = s.yaw - (e.clientX - prevX) * 0.008;
        s.tPitch = s.pitch = Math.max(-1.35, Math.min(1.35, s.pitch + (e.clientY - prevY) * 0.006));
        prevX = e.clientX;
        prevY = e.clientY;
      }

      function onPointerUp() {
        dragging = false;
      }

      function onWheel(e: WheelEvent) {
        e.preventDefault();
        s.zoom = Math.max(0.42, Math.min(2.6, s.zoom * (1 + Math.sign(e.deltaY) * 0.12)));
        s.tJarak = (s.distLipat + (s.distBentang - s.distLipat) * s.deploy) * s.zoom;
      }

      canvas.addEventListener('pointerdown', onPointerDown);
      canvas.addEventListener('pointermove', onPointerMove);
      canvas.addEventListener('pointerup', onPointerUp);
      canvas.addEventListener('pointercancel', onPointerUp);
      canvas.addEventListener('pointerleave', onPointerUp);
      canvas.addEventListener('wheel', onWheel, { passive: false });
      window.addEventListener('resize', handleResize);

      // Render Loop
      let tick = 0;
      const behindMap: Record<number, boolean> = {};

      function animate() {
        s.reqId = requestAnimationFrame(animate);

        if (s.isSpinning && !dragging) {
          s.tYaw += 0.0026;
        }

        if (canDeploy && Math.abs(s.tDeploy - s.deploy) > 0.002) {
          s.deploy += (s.tDeploy - s.deploy) * 0.06;
          model.userData.setDeploy(s.deploy);
          s.tJarak = (s.distLipat + (s.distBentang - s.distLipat) * s.deploy) * s.zoom;
          setDeployValue(Math.round(s.deploy * 100));
        }

        s.yaw += (s.tYaw - s.yaw) * 0.12;
        s.pitch += (s.tPitch - s.pitch) * 0.12;
        s.jarak += (s.tJarak - s.jarak) * 0.1;

        positionCamera();

        // Project spots
        tick++;
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        const newCoords = spots.map((sp, idx) => {
          if (sp.obj) {
            sp.obj.getWorldPosition(sp.worldPos);
          } else if (sp.point.pos) {
            sp.worldPos
              .set(sp.point.pos[0], sp.point.pos[1], sp.point.pos[2])
              .applyMatrix4(model.matrixWorld);
          }

          const p = sp.worldPos.clone().project(camera);
          const inFront = p.z < 1;
          const isShown = s.showNumbers || (s.tourIndex >= 0 && idx === s.activePointIndex);

          if (tick % 8 === 0) {
            const dir = sp.worldPos.clone().sub(camera.position);
            const dist = dir.length();
            s.raycaster.set(camera.position, dir.normalize());
            const hits = s.raycaster.intersectObject(model, true);
            behindMap[idx] = !!(hits[0] && hits[0].distance < dist - 0.45);
          }

          return {
            x: (p.x * 0.5 + 0.5) * w,
            y: (-p.y * 0.5 + 0.5) * h,
            visible: isShown && inFront,
            behind: !!behindMap[idx],
          };
        });

        setSpotPositions(newCoords);
        renderer.render(scene, camera);
      }

      animate();

      return () => {
        if (s.reqId) cancelAnimationFrame(s.reqId);
        canvas.removeEventListener('pointerdown', onPointerDown);
        canvas.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('pointerup', onPointerUp);
        canvas.removeEventListener('pointercancel', onPointerUp);
        canvas.removeEventListener('pointerleave', onPointerUp);
        canvas.removeEventListener('wheel', onWheel);
        window.removeEventListener('resize', handleResize);
        renderer.dispose();
      };
    }

    let cleanupFn: (() => void) | undefined;

    const timer = setInterval(() => {
      if (isCancelled) {
        clearInterval(timer);
        return;
      }
      const win = window as any;
      if (win.THREE && ((modelType === 'rascube' && win.createRasCubeModel) || (modelType === 'kratos' && win.createKratosModel))) {
        clearInterval(timer);
        cleanupFn = initScene() || undefined;
      }
    }, 50);

    return () => {
      isCancelled = true;
      clearInterval(timer);
      if (cleanupFn) cleanupFn();
    };
  }, [modelType, points, initialView]);

  // Actions
  const handleSelectPoint = (index: number, moveCamera: boolean = true) => {
    setActivePointIndex(index);
    const p = points[index];
    if (!p) return;

    if (moveCamera && p.pandang) {
      stateRef.current.tYaw = p.pandang.yaw;
      stateRef.current.tPitch = p.pandang.pitch;
      setIsSpinning(false);
    }
  };

  const handleCloseCard = () => {
    setActivePointIndex(-1);
    setTourIndex(-1);
  };

  const handleToggleSpin = () => {
    setIsSpinning((prev) => !prev);
  };

  const handleToggleNumbers = () => {
    setShowNumbers((prev) => !prev);
  };

  const handleSetView = (viewKey: string) => {
    const v = views[viewKey];
    if (v) {
      stateRef.current.tYaw = v.yaw;
      stateRef.current.tPitch = v.pitch;
      setIsSpinning(false);
    }
  };

  const handleReset = () => {
    stateRef.current.tYaw = initialView.yaw;
    stateRef.current.tPitch = initialView.pitch;
    stateRef.current.zoom = 1;
    setIsSpinning(true);
    setShowNumbers(true);
    setActivePointIndex(-1);
    setTourIndex(-1);
    applyDeploy(1);

    // Reset all layers to visible
    const allOn: Record<string, boolean> = {};
    Object.keys(layers).forEach((k) => {
      allOn[k] = true;
      const grp = stateRef.current.layerGroups[k];
      if (grp) grp.forEach((m) => (m.visible = true));
    });
    setActiveLayers(allOn);
  };

  const handleToggleLayer = (layerId: string) => {
    const nextVal = !activeLayers[layerId];
    setActiveLayers((prev) => ({ ...prev, [layerId]: nextVal }));
    const grp = stateRef.current.layerGroups[layerId];
    if (grp) {
      grp.forEach((m) => (m.visible = nextVal));
    }
  };

  // Guided Tour
  const handleStartTour = () => {
    if (!tourSteps.length) return;
    setTourIndex(0);
    applyTourStep(0);
  };

  const handleTourStep = (stepIdx: number) => {
    if (stepIdx >= 0 && stepIdx < tourSteps.length) {
      setTourIndex(stepIdx);
      applyTourStep(stepIdx);
    } else {
      handleCloseCard();
    }
  };

  const applyTourStep = (stepIdx: number) => {
    const step = tourSteps[stepIdx];
    if (!step) return;

    if (typeof step.deploy === 'number') {
      stateRef.current.tDeploy = step.deploy;
    }

    let foundIdx = -1;
    if (step.n) {
      foundIdx = points.findIndex((p) => p.n === step.n);
    }

    if (foundIdx >= 0) {
      handleSelectPoint(foundIdx, true);
    } else {
      setActivePointIndex(-1);
      const v = step.pandang || initialView;
      stateRef.current.tYaw = v.yaw;
      stateRef.current.tPitch = v.pitch;
      setIsSpinning(false);
    }
  };

  const activePoint = activePointIndex >= 0 ? points[activePointIndex] : null;
  const currentTour = tourIndex >= 0 ? tourSteps[tourIndex] : null;

  return (
    <div className="stage-wrap">
      <div className="wrap">
        <div className="panggung-grid">
          {/* 3D Stage */}
          <div id="stage" ref={stageRef} className="stage">
            <span className="stage__corner">{cornerText}</span>
            <canvas
              ref={canvasRef}
              tabIndex={0}
              aria-label="Model tiga dimensi wahana antariksa. Seret untuk memutar."
            />

            {/* Interactive Hotspot Dots */}
            <div className="spots" aria-hidden="true">
              {spotPositions.map((sp, idx) => {
                const pt = points[idx];
                if (!sp.visible) return null;
                const isSelected = idx === activePointIndex;
                return (
                  <button
                    key={pt.n}
                    type="button"
                    className={`spot ${isSelected ? 'is-on' : ''} ${sp.behind ? 'is-behind' : ''}`}
                    style={{
                      transform: `translate(${sp.x.toFixed(1)}px, ${sp.y.toFixed(1)}px)`,
                    }}
                    onClick={() => {
                      setTourIndex(-1);
                      handleSelectPoint(idx, true);
                    }}
                    aria-label={`${pt.n} — ${pt.label}`}
                  >
                    {pt.n}
                  </button>
                );
              })}
            </div>

            <span className="stage__hint">seret untuk memutar · gulir untuk memperbesar</span>
            <div className="stage__fail">Perender WebGL gagal dimuat.</div>
          </div>

          {/* Side Card */}
          <div className="card3d card3d--aside">
            {activePoint || currentTour ? (
              <div className="card3d__isi">
                <button
                  type="button"
                  className="card3d__x"
                  aria-label="Tutup keterangan"
                  onClick={handleCloseCard}
                >
                  ×
                </button>

                {currentTour && (
                  <div style={{ marginBottom: '0.6rem' }}>
                    <span
                      className="card3d__n"
                      style={{ color: 'var(--accent)', fontWeight: 600 }}
                    >
                      Langkah {tourIndex + 1} dari {tourSteps.length}
                    </span>
                  </div>
                )}

                {activePoint && !currentTour && (
                  <span className="card3d__n">
                    Poin {activePoint.n < 10 ? `0${activePoint.n}` : activePoint.n}
                  </span>
                )}

                <h4>{currentTour?.judul || activePoint?.label}</h4>
                <p>{currentTour?.teks || activePoint?.teks}</p>

                {activePoint?.rinci && activePoint.rinci.length > 0 && !currentTour && (
                  <ul>
                    {activePoint.rinci.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                )}

                {currentTour && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginTop: '1.2rem',
                      gap: '0.5rem',
                    }}
                  >
                    <button
                      type="button"
                      className="btn"
                      disabled={tourIndex === 0}
                      onClick={() => handleTourStep(tourIndex - 1)}
                    >
                      Sebelumnya
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => handleTourStep(tourIndex + 1)}
                    >
                      {tourIndex === tourSteps.length - 1 ? 'Selesai' : 'Berikutnya'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="card3d__kosong">
                Klik salah satu titik bernomor pada model 3D atau daftar di bawah untuk melihat rincian komponen.
              </div>
            )}
          </div>
        </div>

        {/* Control Bar */}
        <div className="bar" role="group" aria-label="Kendali model">
          {tourSteps.length > 0 && (
            <button
              type="button"
              className="btn"
              aria-pressed={tourIndex >= 0}
              onClick={tourIndex >= 0 ? handleCloseCard : handleStartTour}
            >
              Tur
            </button>
          )}

          <button
            type="button"
            className="btn"
            aria-pressed={showNumbers}
            onClick={handleToggleNumbers}
          >
            Titik
          </button>

          <button
            type="button"
            className="btn"
            aria-pressed={isSpinning}
            onClick={handleToggleSpin}
          >
            Putar
          </button>

          {Object.keys(views).map((vKey) => (
            <button
              key={vKey}
              type="button"
              className="btn"
              onClick={() => handleSetView(vKey)}
            >
              {vKey.charAt(0).toUpperCase() + vKey.slice(1)}
            </button>
          ))}

          <button type="button" className="btn" onClick={handleReset}>
            Atur ulang
          </button>

          {hasDeploySlider && (
            <div className="slider">
              <span>Lipat</span>
              <input
                type="range"
                min="0"
                max="100"
                value={deployValue}
                onChange={(e) => applyDeploy(Number(e.target.value) / 100)}
                aria-label="Penggeser lipat-bentang sayap surya"
              />
              <span>Bentang</span>
            </div>
          )}
        </div>

        {/* Layers Chips */}
        {Object.keys(layers).length > 0 && (
          <div className="layers" role="group" aria-label="Lapisan komponen">
            {Object.entries(layers).map(([id, label]) => {
              const isOn = activeLayers[id] ?? true;
              return (
                <button
                  key={id}
                  type="button"
                  className={`layer ${!isOn ? 'is-off' : ''}`}
                  aria-pressed={isOn}
                  onClick={() => handleToggleLayer(id)}
                >
                  <span className="layer__dot"></span>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Point Buttons List Below Stage */}
      <div className="wrap">
        <div className="poin">
          {points.map((p, idx) => (
            <button
              key={p.n}
              type="button"
              onClick={() => {
                setTourIndex(-1);
                handleSelectPoint(idx, true);
                if (stageRef.current) {
                  stageRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }}
              style={{
                background: idx === activePointIndex ? 'var(--panel-2)' : undefined,
              }}
            >
              <span className="n">{p.n < 10 ? `0${p.n}` : p.n}</span>
              <span>
                <span className="t">{p.label}</span>
                <span className="d">{p.teks}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
