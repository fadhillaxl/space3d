'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export interface VariantOption {
  id: string;
  label: string;
  mission?: 'discovery' | 'buran' | 'rascube' | 'kratos' | 'satria' | 'cubesat';
}

interface HotspotSpot {
  n: number;
  label: string;
  note: string;
  kat?: string;
  link?: string;
}

interface TourStep {
  title: string;
  text: string;
}

interface SpaceViewerStageProps {
  initialVariant: string;
  availableVariants?: VariantOption[];
  accentColor?: string;
  isHome?: boolean;
  cornerText?: string;
  onVariantChange?: (variant: string) => void;
}

export default function SpaceViewerStage({
  initialVariant,
  availableVariants,
  accentColor = '#4FA8E0',
  isHome = false,
  cornerText,
  onVariantChange,
}: SpaceViewerStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const apiRef = useRef<any>(null);

  const [currentVariant, setCurrentVariant] = useState(initialVariant);
  const [layers, setLayers] = useState<{ id: string; label: string; note?: string; on: boolean }[]>([]);
  const [activeSpot, setActiveSpot] = useState<HotspotSpot | null>(null);
  const [activeCategory, setActiveCategory] = useState<{ label: string; warna: string } | null>(null);
  const [tourSteps, setTourSteps] = useState<TourStep[]>([]);
  const [tourIndex, setTourIndex] = useState<number>(-1);

  const homeReadoutMap: Record<string, { title: string; text: string }> = {
    discovery: {
      title: 'Space Shuttle Discovery (OV-103)',
      text: 'Orbiter ketiga NASA yang mencatat 39 penerbangan ke orbit rendah Bumi antara 1984 dan 2011.',
    },
    buran: {
      title: 'Buran 1.01 (OK-1K1)',
      text: 'Pesawat ulang-alik Soviet yang menyelesaikan satu misi orbital penuh secara otonom pada 15 November 1988.',
    },
    rascube: {
      title: 'RASCube V2 · kit satelit pendidikan',
      text: 'Kit satelit pendidikan dari Australia Selatan yang dirakit sendiri oleh siswa, dari rangka aluminium sampai antena — dengan enam titik komponen.',
    },
    kratos: {
      title: 'EXA Kratos Bus 1B · CubeSat 1U',
      text: 'Bus satelit 1U seberat 500 gram dengan perisai emas SEAM/NEMEA dan enam panel surya yang membentang sendiri — dengan dua belas titik komponen.',
    },
    satria: {
      title: 'Satelit geostasioner — model umum',
      text: 'Representasi satelit komunikasi dengan bus heksagonal, dua sayap surya bentang lebar, dan piringan antena parabola.',
    },
    cubesat: {
      title: 'CubeSat 1U — model umum',
      text: 'Format satelit miniatur 10 cm³ dengan panel surya terpasang di dinding badan dan antena pita monolitik.',
    },
  };

  const [readout, setReadout] = useState<{ title: string; text: string }>(
    isHome
      ? {
          title: 'Komponen',
          text: 'Klik titik bernomor pada model untuk membaca keterangan komponen.',
        }
      : {
          title: 'Komponen',
          text: 'Klik titik bernomor pada model untuk membaca keterangan komponen. Matikan lapisan untuk melihat bagian di baliknya.',
        }
  );

  const [modeLabel, setModeLabel] = useState('Padat');
  const [isSpinning, setIsSpinning] = useState(true);
  const [doorsOpen, setDoorsOpen] = useState(false);
  const [sectionOpen, setSectionOpen] = useState(false);
  const [labelsOn, setLabelsOn] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scriptsReady, setScriptsReady] = useState(false);

  // Poll for scripts loaded via layout.tsx
  useEffect(() => {
    let cancelled = false;

    function checkReady() {
      const win = window as any;
      if (win.SpaceViewer || (win.ThreeModelViewer && win.THREE)) {
        if (!cancelled) setScriptsReady(true);
        return true;
      }
      return false;
    }

    if (checkReady()) return;

    const interval = setInterval(() => {
      if (checkReady()) clearInterval(interval);
    }, 50);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Mounting the 3D viewer
  const mountCurrentModel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const win = window as any;
    if (!win.SpaceViewer && !win.ThreeModelViewer) return;

    // Cleanup previous API instance
    if (apiRef.current) {
      try {
        apiRef.current.destroy();
      } catch (e) {
        // ignore
      }
      apiRef.current = null;
    }

    const distMap: Record<string, number> = {
      satria: 92,
      stack: 96,
      buranStack: 96,
      cubesat: 36,
      flatsat: 58,
    };
    const dist = distMap[currentVariant] || 64;

    const opts: any = {
      variant: currentVariant,
      accent: accentColor,
      dist: dist,
      onSelect: (spot: any) => {
        setActiveSpot(spot);
        if (spot && apiRef.current && apiRef.current.kategori && spot.kat) {
          setActiveCategory(apiRef.current.kategori[spot.kat] || null);
        } else {
          setActiveCategory(null);
        }
        if (spot) {
          setReadout({
            title: `${spot.n} — ${spot.label}`,
            text: spot.note || '',
          });
        }
      },
      onSpinChange: (on: boolean) => {
        setIsSpinning(on);
      },
      onLayerHover: (id: string | null) => {
        if (typeof document !== 'undefined') {
          document.querySelectorAll('[data-layer]').forEach((el) => {
            el.classList.toggle('is-lit', !!id && el.getAttribute('data-layer') === id);
          });
        }
      },
    };

    let api: any = null;
    const TV = win.ThreeModelViewer;
    const SV = win.SpaceViewer;

    // Try ThreeModelViewer first if model is registered
    if (TV && TV.MODELS && TV.MODELS[currentVariant] && typeof win.THREE !== 'undefined') {
      try {
        api = TV.mount(canvas, opts);
      } catch (err) {
        console.warn('[SpaceViewerStage] ThreeModelViewer fallback:', err);
      }
    }

    // Fallback to Canvas 2D SpaceViewer
    if (!api && SV && typeof SV.mount === 'function') {
      try {
        api = SV.mount(canvas, opts);
      } catch (err) {
        console.warn('[SpaceViewerStage] SpaceViewer mount error:', err);
      }
    }

    if (api) {
      apiRef.current = api;
      win.__homeViewer = api;

      // Extract layers
      if (api.layers && Array.isArray(api.layers)) {
        setLayers(api.layers.map((l: any) => ({ ...l, on: true })));
      } else {
        setLayers([]);
      }

      // Extract tour steps
      const allTours = (SV && SV.TOURS) || {};
      const steps = allTours[currentVariant] || [];
      setTourSteps(steps);
      setTourIndex(-1);
    }
  }, [currentVariant, accentColor]);

  // Mount/remount on scripts ready or variant change
  useEffect(() => {
    if (!scriptsReady) return;
    mountCurrentModel();

    return () => {
      if (apiRef.current) {
        try {
          apiRef.current.destroy();
        } catch (e) {}
        apiRef.current = null;
      }
    };
  }, [scriptsReady, mountCurrentModel]);

  // Actions
  const handleSwitchVariant = (v: string) => {
    if (v === currentVariant) return;
    setCurrentVariant(v);
    setActiveSpot(null);
    setTourIndex(-1);
    setModeLabel('Padat');
    setDoorsOpen(false);
    setSectionOpen(false);

    if (isHome) {
      setReadout(homeReadoutMap[v] || homeReadoutMap.discovery);
    } else {
      setReadout({
        title: 'Komponen',
        text: 'Klik titik bernomor pada model untuk membaca keterangan komponen. Matikan lapisan untuk melihat bagian di baliknya.',
      });
    }

    if (onVariantChange) onVariantChange(v);
  };

  const handleToggleSpin = () => {
    if (apiRef.current?.toggleSpin) {
      const on = apiRef.current.toggleSpin();
      setIsSpinning(!!on);
    }
  };

  const handleToggleDoors = () => {
    if (apiRef.current?.toggleDoors) {
      const on = apiRef.current.toggleDoors();
      setDoorsOpen(!!on);
    }
  };

  const handleSetView = (view: string) => {
    if (apiRef.current?.setView) apiRef.current.setView(view);
  };

  const handleToggleSection = () => {
    if (apiRef.current?.toggleSection) {
      const on = apiRef.current.toggleSection();
      setSectionOpen(!!on);
    }
  };

  const handleZoom = (delta: number) => {
    if (apiRef.current?.zoom) apiRef.current.zoom(delta);
  };

  const handleReset = () => {
    if (apiRef.current?.reset) {
      apiRef.current.reset();
      setTourIndex(-1);
      setActiveSpot(null);
      setModeLabel('Padat');
      setIsSpinning(true);
      setDoorsOpen(false);
      setSectionOpen(false);
      setLabelsOn(false);
      setLayers((prev) => prev.map((l) => ({ ...l, on: true })));
      if (isHome) {
        setReadout(homeReadoutMap[currentVariant] || homeReadoutMap.discovery);
      } else {
        setReadout({
          title: 'Komponen',
          text: 'Klik titik bernomor pada model untuk membaca keterangan komponen. Matikan lapisan untuk melihat bagian di baliknya.',
        });
      }
    }
  };

  const MODES = [
    ['solid', 'Padat'],
    ['wire', 'Rangka'],
    ['layer', 'Warna'],
  ];

  const handleCycleMode = () => {
    if (!apiRef.current) return;
    const currentMode = apiRef.current.getMode ? apiRef.current.getMode() : 'solid';
    let idx = 0;
    for (let k = 0; k < MODES.length; k++) {
      if (MODES[k][0] === currentMode) idx = k;
    }
    const nextMode = MODES[(idx + 1) % MODES.length];
    if (apiRef.current.setMode) apiRef.current.setMode(nextMode[0]);
    setModeLabel(nextMode[1]);
  };

  const handleToggleLabels = () => {
    if (apiRef.current?.toggleLabel) {
      const on = apiRef.current.toggleLabel();
      setLabelsOn(!!on);
    }
  };

  const handleToggleFullscreen = () => {
    if (!stageRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    } else {
      stageRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    }
  };

  const handleToggleLayer = (id: string, currentOn: boolean) => {
    if (!apiRef.current?.setLayer) return;
    const nextOn = !currentOn;
    apiRef.current.setLayer(id, nextOn);
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, on: nextOn } : l)));
  };

  const handleLayerHover = (id: string | null) => {
    if (apiRef.current?.highlight) apiRef.current.highlight(id);
  };

  const handleStartTour = () => {
    if (!tourSteps.length) return;
    setActiveSpot(null);
    setTourIndex(0);
    if (apiRef.current?.applyStep) {
      apiRef.current.applyStep(tourSteps[0]);
    }
  };

  const handleStopTour = () => {
    setTourIndex(-1);
    if (apiRef.current?.highlight) {
      apiRef.current.highlight(null);
    }
  };

  const handleTourStep = (newIndex: number) => {
    if (newIndex >= 0 && newIndex < tourSteps.length) {
      setTourIndex(newIndex);
      if (apiRef.current?.applyStep) {
        apiRef.current.applyStep(tourSteps[newIndex]);
      }
    } else {
      handleStopTour();
    }
  };

  const hasDoors =
    currentVariant === 'discovery' ||
    currentVariant === 'buran';

  const doorsLabel =
    currentVariant === 'satria'
      ? doorsOpen
        ? 'Tutup panel surya'
        : 'Buka panel surya'
      : currentVariant === 'buran'
      ? doorsOpen
        ? 'Tutup ruang muatan'
        : 'Buka ruang muatan'
      : doorsOpen
      ? 'Tutup payload bay'
      : 'Buka payload bay';

  const hasSection =
    currentVariant === 'cubesat' ||
    currentVariant === 'flatsat' ||
    currentVariant === 'satria' ||
    currentVariant === 'discovery' ||
    currentVariant === 'buran';

  const displayCorner =
    cornerText ||
    (isHome
      ? 'Model 3D · interaktif'
      : currentVariant === 'discovery'
      ? 'OV-103 · model 3D'
      : currentVariant === 'stack'
      ? 'STS Stack · model 3D'
      : currentVariant === 'buran'
      ? 'OK-1K1 · model 3D'
      : currentVariant === 'buranStack'
      ? 'Energia Stack · model 3D'
      : currentVariant === 'satria'
      ? 'Satelit GEO · model umum'
      : currentVariant === 'cubesat'
      ? 'CubeSat 1U · model umum'
      : currentVariant === 'flatsat'
      ? 'FlatSat · Meja Uji'
      : 'Model 3D');

  return (
    <div className="viewer">
      {/* 3D Stage Canvas */}
      <div
        ref={stageRef}
        className={`viewer__stage ${isFullscreen ? 'is-full' : ''}`}
        data-viewer={currentVariant}
      >
        <span className="viewer__corner">{displayCorner}</span>

        {/* Fresh canvas with key={currentVariant} ensures zero WebGL/2D context collisions */}
        <canvas
          key={currentVariant}
          ref={canvasRef}
          tabIndex={0}
          aria-label="Model tiga dimensi wahana antariksa. Seret untuk memutar."
        />

        {/* Floating Tools on Canvas (Detail pages only) */}
        {!isHome && (
          <div className="tools" role="group" aria-label="Alat penampil">
            {tourSteps.length > 0 && (
              <button
                type="button"
                className="tool"
                data-act="tour"
                aria-pressed={tourIndex >= 0}
                onClick={tourIndex >= 0 ? handleStopTour : handleStartTour}
              >
                <span className="tool__i" aria-hidden="true">▶</span>
                Tur berpandu
              </button>
            )}

            <button
              type="button"
              className="tool"
              data-act="labels"
              aria-pressed={labelsOn}
              onClick={handleToggleLabels}
            >
              <span className="tool__i" aria-hidden="true">◎</span>
              Semua label
            </button>

            <button
              type="button"
              className="tool"
              data-act="mode"
              onClick={handleCycleMode}
            >
              <span className="tool__i" aria-hidden="true">◧</span>
              <span data-mode-label>{modeLabel}</span>
            </button>

            <button
              type="button"
              className="tool"
              data-act="full"
              aria-pressed={isFullscreen}
              onClick={handleToggleFullscreen}
            >
              <span className="tool__i" aria-hidden="true">⛶</span>
              Layar penuh
            </button>
          </div>
        )}

        {/* Guided Tour Dialog */}
        {!isHome && tourIndex >= 0 && tourSteps[tourIndex] && (
          <div className="tour" data-tour>
            <div className="tour__head">
              <span className="tour__step" data-tour-step>
                Langkah {tourIndex + 1} dari {tourSteps.length}
              </span>
              <button
                type="button"
                className="tour__x"
                data-act="tour-close"
                aria-label="Tutup tur"
                onClick={handleStopTour}
              >
                ×
              </button>
            </div>
            <h4 data-tour-title>{tourSteps[tourIndex].title}</h4>
            <p data-tour-text>{tourSteps[tourIndex].text}</p>
            <div className="tour__nav">
              <button
                type="button"
                className="btn btn--ghost"
                data-act="tour-prev"
                disabled={tourIndex === 0}
                onClick={() => handleTourStep(tourIndex - 1)}
              >
                Sebelumnya
              </button>
              <button
                type="button"
                className="btn"
                data-act="tour-next"
                onClick={() => handleTourStep(tourIndex + 1)}
              >
                {tourIndex === tourSteps.length - 1 ? 'Selesai' : 'Berikutnya'}
              </button>
            </div>
          </div>
        )}

        {/* Hotspot Annotation Card */}
        {!isHome && activeSpot && (
          <div
            className="card3d"
            data-card
            style={{ borderLeftColor: activeCategory ? activeCategory.warna : accentColor }}
          >
            <button
              type="button"
              className="card3d__x"
              data-act="card-close"
              aria-label="Tutup keterangan"
              onClick={() => setActiveSpot(null)}
            >
              ×
            </button>
            <span
              className="card3d__n"
              data-card-n
              style={{ color: activeCategory ? activeCategory.warna : accentColor }}
            >
              Komponen {activeSpot.n}
            </span>
            {activeCategory && (
              <span
                className="card3d__kat"
                data-card-kat
                style={{ color: activeCategory.warna, borderColor: activeCategory.warna }}
              >
                {activeCategory.label}
              </span>
            )}
            <h4 data-card-title>{activeSpot.label}</h4>
            <p data-card-text>{activeSpot.note}</p>
            {activeSpot.link && (
              <a className="card3d__more" data-card-more href={activeSpot.link}>
                Baca selengkapnya
              </a>
            )}
          </div>
        )}

        <span className="viewer__hint">
          {isHome
            ? 'seret untuk memutar'
            : 'seret memutar · Shift+seret menggeser · gulir memperbesar'}
        </span>
      </div>

      {/* Layer Toggle Chips (Detail pages only) */}
      {!isHome && layers.length > 0 && (
        <div className="layers" role="group" aria-label="Lapisan komponen">
          <span className="layers__label">Lapisan komponen</span>
          <div className="layers__list" data-layers>
            {layers.map((l) => (
              <button
                key={l.id}
                type="button"
                className={`layer ${!l.on ? 'is-off' : ''}`}
                data-layer={l.id}
                aria-pressed={l.on}
                title={l.note}
                onClick={() => handleToggleLayer(l.id, l.on)}
                onMouseEnter={() => handleLayerHover(l.id)}
                onMouseLeave={() => handleLayerHover(null)}
                onFocus={() => handleLayerHover(l.id)}
                onBlur={() => handleLayerHover(null)}
              >
                <span className="layer__dot"></span>
                <span>{l.label}</span>
              </button>
            ))}
          </div>
          <p className="layers__hint">Arahkan kursor ke model untuk menyorot komponennya.</p>
        </div>
      )}

      {/* Bottom Control Bar */}
      <div
        className="viewer__bar"
        role="group"
        aria-label={isHome ? 'Pilih wahana' : 'Kendali model'}
      >
        {availableVariants?.map((v) => (
          <button
            key={v.id}
            type="button"
            className="btn"
            data-model={v.id}
            aria-pressed={currentVariant === v.id}
            onClick={() => handleSwitchVariant(v.id)}
          >
            {v.label}
          </button>
        ))}

        {isHome && (
          <button
            type="button"
            className="btn"
            data-act="labels"
            aria-pressed={labelsOn}
            style={{ marginLeft: 'auto' }}
            onClick={handleToggleLabels}
          >
            Nama titik
          </button>
        )}

        {!isHome && (
          <>
            <button
              type="button"
              className="btn"
              data-act="spin"
              aria-pressed={isSpinning}
              onClick={handleToggleSpin}
            >
              Putar
            </button>

            {hasDoors && (
              <button
                type="button"
                className="btn"
                data-act="doors"
                aria-pressed={doorsOpen}
                onClick={handleToggleDoors}
              >
                {doorsLabel}
              </button>
            )}

            <button
              type="button"
              className="btn"
              data-act="view:samping"
              onClick={() => handleSetView('samping')}
            >
              Samping
            </button>

            <button
              type="button"
              className="btn"
              data-act="view:atas"
              onClick={() => handleSetView('atas')}
            >
              Atas
            </button>

            <button
              type="button"
              className="btn"
              data-act="view:depan"
              onClick={() => handleSetView('depan')}
            >
              Depan
            </button>

            {hasSection && (
              <button
                type="button"
                className="btn"
                data-act="section"
                aria-pressed={sectionOpen}
                onClick={handleToggleSection}
              >
                Potongan
              </button>
            )}

            <button
              type="button"
              className="btn btn--ghost"
              data-act="zoom:in"
              aria-label="Perbesar"
              onClick={() => handleZoom(-1)}
            >
              +
            </button>

            <button
              type="button"
              className="btn btn--ghost"
              data-act="zoom:out"
              aria-label="Perkecil"
              onClick={() => handleZoom(1)}
            >
              −
            </button>

            <button
              type="button"
              className="btn btn--ghost"
              data-act="reset"
              onClick={handleReset}
            >
              Atur ulang
            </button>
          </>
        )}
      </div>

      {/* Readout Telemetry Box */}
      <div id="viewer-readout" className="viewer__readout" aria-live="polite">
        <span className="k">{readout.title}</span>
        <p>{readout.text}</p>
      </div>
    </div>
  );
}
