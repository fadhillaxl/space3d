import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export type ProceduralModelOptions = {
  wireframe?: boolean;
  castShadow?: boolean;
  receiveShadow?: boolean;
  textureSize?: number;
  textureAnisotropy?: number;
  qualityPriority?: 'reference-fidelity' | 'balanced';
};

export type ProceduralModelRuntime = {
  nodes: Record<string, THREE.Object3D>;
  meshes: Record<string, THREE.Mesh>;
  sockets: Record<string, THREE.Object3D>;
  colliders: Record<string, unknown>;
  destructionGroups: Record<string, THREE.Object3D[]>;
};

type SculptMaterialSpec = Record<string, any>;

// bevelEnabled defaults to true on THREE.ExtrudeGeometry and rounds every
// corner — sharp/pointed profiles (blades, fork tines, spikes) need
// bevelEnabled: false plus lineTo()-only path segments near the tip, since a
// curve command cannot produce a true converging point.
function buildExtrudeShape(points: [number, number][], holes?: [number, number][][]): THREE.Shape {
  const shape = new THREE.Shape();
  if (points.length > 0) {
    shape.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i += 1) {
      shape.lineTo(points[i][0], points[i][1]);
    }
  }
  // Cutouts (e.g. an oval wire-cutter hole) as THREE.Path added to shape.holes —
  // dep-free boolean subtraction via the tessellator, no CSG library needed.
  for (const loop of holes ?? []) {
    if (loop.length < 3) continue;
    const path = new THREE.Path();
    path.moveTo(loop[0][0], loop[0][1]);
    for (let i = 1; i < loop.length; i += 1) path.lineTo(loop[i][0], loop[i][1]);
    path.closePath();
    shape.holes.push(path);
  }
  return shape;
}

// Build an N-gon oval loop (for hole authoring from a compact {cx,cy,rx,ry} descriptor).
function ovalLoop(cx: number, cy: number, rx: number, ry: number, seg = 24): [number, number][] {
  const loop: [number, number][] = [];
  for (let i = 0; i < seg; i += 1) {
    const a = (i / seg) * Math.PI * 2;
    loop.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return loop;
}

function buildExtrudeGeometry(profile: { points: [number, number][]; depth: number; holes?: [number, number][][]; ovalHoles?: { cx: number; cy: number; rx: number; ry: number }[] }): THREE.ExtrudeGeometry {
  const holes = [...(profile.holes ?? []), ...((profile.ovalHoles ?? []).map((o) => ovalLoop(o.cx, o.cy, o.rx, o.ry)))];
  const shape = buildExtrudeShape(profile.points, holes);
  return new THREE.ExtrudeGeometry(shape, {
    depth: profile.depth,
    bevelEnabled: false,
    steps: 1,
  });
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function readLayerNumber(value: unknown, keys: string[], fallback: number): number {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of keys) {
      if (typeof record[key] === 'number') return record[key] as number;
    }
  }
  return fallback;
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = /^#[0-9a-f]{3}$/i.test(hex)
    ? '#' + hex.slice(1).split('').map((part) => part + part).join('')
    : hex;
  const value = /^#[0-9a-f]{6}$/i.test(normalized) ? Number.parseInt(normalized.slice(1), 16) : 0x8a7a5f;
  return [clampAlbedoChannel((value >> 16) & 255), clampAlbedoChannel((value >> 8) & 255), clampAlbedoChannel(value & 255)];
}

function materialPalette(spec: SculptMaterialSpec): string[] {
  const palette = spec.colorVariation?.palette;
  if (Array.isArray(palette) && palette.length > 0) return palette.filter((value) => typeof value === 'string');
  const secondary = spec.albedo?.secondary;
  const colors = [spec.baseColor ?? spec.color ?? spec.albedo?.dominant, ...(Array.isArray(secondary) ? secondary : [])];
  return colors.filter((value): value is string => typeof value === 'string' && value.startsWith('#'));
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function clampAlbedoChannel(value: number): number {
  return Math.max(30, Math.min(240, Math.round(value)));
}

function clampPbrF0(value: number): number {
  return Math.max(0.02, Math.min(1, value));
}

function clampPbrIor(value: number): number {
  return Math.max(1, Math.min(2.5, value));
}

function clampPbrMetalness(value: number): number {
  return value >= 0.5 ? 1 : 0;
}

function clampedAlbedoColor(spec: SculptMaterialSpec): THREE.Color {
  const source = typeof spec.baseColor === 'string' ? spec.baseColor : '#8A7A5F';
  // setStyle with an explicit SRGBColorSpace, NOT the numeric constructor.
  //
  // `new THREE.Color(r, g, b)` treats its arguments as LINEAR working-space components,
  // while an authored `baseColor` hex is sRGB. Feeding one to the other skipped the
  // transfer function and lifted every dark albedo: #2e2a28, authored as a near-black
  // vinyl, rendered at roughly sRGB 0.46 — a mid grey. The error is largest exactly where
  // it matters most, because the transfer curve is steepest near black.
  return new THREE.Color().setStyle(source, THREE.SRGBColorSpace);
}

function smoothCurve(value: number): number {
  return value * value * (3 - 2 * value);
}

function periodicHash(x: number, y: number, seed: number, periodX: number, periodY: number): number {
  const wrappedX = ((x % periodX) + periodX) % periodX;
  const wrappedY = ((y % periodY) + periodY) % periodY;
  let value = Math.imul(wrappedX + seed * 17, 374761393) ^ Math.imul(wrappedY + seed * 31, 668265263);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function periodicValueNoise(u: number, v: number, seed: number, periodX: number, periodY: number): number {
  const x = u * periodX;
  const y = v * periodY;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = smoothCurve(x - x0);
  const ty = smoothCurve(y - y0);
  const a = periodicHash(x0, y0, seed, periodX, periodY);
  const b = periodicHash(x0 + 1, y0, seed, periodX, periodY);
  const c = periodicHash(x0, y0 + 1, seed, periodX, periodY);
  const d = periodicHash(x0 + 1, y0 + 1, seed, periodX, periodY);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(a, b, tx), THREE.MathUtils.lerp(c, d, tx), ty);
}

type SurfaceBand = {
  frequency: number;
  amplitude: number;
  stretchX: number;
  stretchY: number;
  ridge: boolean;
};

function surfaceBands(spec: SculptMaterialSpec): SurfaceBand[] {
  const source = Array.isArray(spec.surfaceFrequencyBands) ? spec.surfaceFrequencyBands : [];
  const parsed = source.flatMap((item: unknown) => {
    if (!item || typeof item !== 'object') return [];
    const band = item as Record<string, unknown>;
    const frequency = typeof band.frequency === 'number' ? band.frequency : 0;
    const amplitude = typeof band.amplitude === 'number' ? band.amplitude : 0;
    if (frequency <= 0 || amplitude <= 0) return [];
    const stretch = Array.isArray(band.stretch) ? band.stretch : [1, 1];
    const description = `${String(band.pattern ?? '')} ${String(band.role ?? '')}`.toLowerCase();
    return [{
      frequency,
      amplitude,
      stretchX: typeof stretch[0] === 'number' ? Math.max(0.1, stretch[0]) : 1,
      stretchY: typeof stretch[1] === 'number' ? Math.max(0.1, stretch[1]) : 1,
      ridge: /(ridge|groove|grain|fiber|striated|crack)/.test(description),
    }];
  });
  return parsed.length > 0 ? parsed : [
    { frequency: 2, amplitude: 0.42, stretchX: 1, stretchY: 1, ridge: false },
    { frequency: 12, amplitude: 0.22, stretchX: 1, stretchY: 1, ridge: false },
    { frequency: 56, amplitude: 0.08, stretchX: 1, stretchY: 1, ridge: false },
  ];
}

function sampleSurface(u: number, v: number, bands: SurfaceBand[], seed: number): number {
  let value = 0;
  let weight = 0;
  for (let index = 0; index < bands.length; index += 1) {
    const band = bands[index];
    const periodX = Math.max(1, Math.round(band.frequency * band.stretchX));
    const periodY = Math.max(1, Math.round(band.frequency * band.stretchY));
    let sample = periodicValueNoise(u, v, seed + index * 1013, periodX, periodY);
    if (band.ridge) sample = 1 - Math.abs(sample * 2 - 1);
    value += sample * band.amplitude;
    weight += band.amplitude;
  }
  return weight > 0 ? clamp01(value / weight) : 0.5;
}

function mixPalette(colors: [number, number, number][], value: number): [number, number, number] {
  if (colors.length === 1) return colors[0];
  const scaled = clamp01(value) * (colors.length - 1);
  const index = Math.min(colors.length - 2, Math.floor(scaled));
  const mix = scaled - index;
  const a = colors[index];
  const b = colors[index + 1];
  return [
    Math.round(THREE.MathUtils.lerp(a[0], b[0], mix)),
    Math.round(THREE.MathUtils.lerp(a[1], b[1], mix)),
    Math.round(THREE.MathUtils.lerp(a[2], b[2], mix)),
  ];
}

type ColorGradientStop = { offset: number; color: string };
type ColorGradientSpec = {
  type: 'linear' | 'radial';
  axis: [number, number];
  stops: ColorGradientStop[];
};

function parseRgba(value: string): [number, number, number] {
  const match = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(value);
  if (!match) return [138, 122, 95];
  return [clampAlbedoChannel(Number(match[1])), clampAlbedoChannel(Number(match[2])), clampAlbedoChannel(Number(match[3]))];
}

// Analytical per-pixel gradient sample. The extraction schema's colorGradient carries
// exact rgba(...) stop colors (see extract_part_color_recipe.py), so this samples the
// same trend directly in JS math rather than round-tripping through a Canvas 2D
// createLinearGradient/createRadialGradient object — same visual result, and it composes
// directly with the existing noise/height-correlated colorVariation blend below.
function sampleColorGradient(gradient: ColorGradientSpec, u: number, v: number): [number, number, number] {
  const stops = gradient.stops.length >= 2 ? gradient.stops : [{ offset: 0, color: 'rgba(138,122,95,1)' }, { offset: 1, color: 'rgba(138,122,95,1)' }];
  let t: number;
  if (gradient.type === 'radial') {
    const [cx, cy] = gradient.axis;
    const dx = u - cx;
    const dy = v - cy;
    const maxRadius = Math.max(0.001, Math.hypot(Math.max(cx, 1 - cx), Math.max(cy, 1 - cy)));
    t = clamp01(Math.hypot(dx, dy) / maxRadius);
  } else {
    const [ax, ay] = gradient.axis;
    const projection = (u - 0.5) * ax + (v - 0.5) * ay;
    const maxProjection = 0.5 * (Math.abs(ax) + Math.abs(ay)) || 0.5;
    t = clamp01(projection / maxProjection + 0.5);
  }
  const scaled = t * (stops.length - 1);
  const index = Math.min(stops.length - 2, Math.max(0, Math.floor(scaled)));
  const mix = scaled - index;
  const a = parseRgba(stops[index].color);
  const b = parseRgba(stops[index + 1].color);
  return [
    THREE.MathUtils.lerp(a[0], b[0], mix),
    THREE.MathUtils.lerp(a[1], b[1], mix),
    THREE.MathUtils.lerp(a[2], b[2], mix),
  ];
}

function writePixel(data: Uint8ClampedArray, offset: number, red: number, green: number, blue: number): void {
  data[offset] = Math.max(0, Math.min(255, Math.round(red)));
  data[offset + 1] = Math.max(0, Math.min(255, Math.round(green)));
  data[offset + 2] = Math.max(0, Math.min(255, Math.round(blue)));
  data[offset + 3] = 255;
}

function makeCanvas(size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

function createMapTexture(
  canvas: HTMLCanvasElement,
  colorSpace: THREE.ColorSpace,
  spec: SculptMaterialSpec,
  options: ProceduralModelOptions,
): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  const projection = spec.textureProjection && typeof spec.textureProjection === 'object' ? spec.textureProjection : {};
  const repeat = Array.isArray(projection.repeat) ? projection.repeat : [2, 2];
  texture.colorSpace = colorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(
    typeof repeat[0] === 'number' ? repeat[0] : 2,
    typeof repeat[1] === 'number' ? repeat[1] : 2,
  );
  texture.anisotropy = Math.max(1, Math.round(options.textureAnisotropy ?? projection.anisotropy ?? 8));
  texture.needsUpdate = true;
  return texture;
}

type ProceduralTextureSet = {
  albedo: THREE.Texture;
  roughness: THREE.Texture;
  height: THREE.Texture;
  normal: THREE.Texture;
  ao: THREE.Texture;
  source: 'reference-pixel-extraction' | 'procedural';
};

function referenceMapUrl(spec: SculptMaterialSpec, channel: string): string | null {
  const reference = spec.referencePbr;
  if (!reference || typeof reference !== 'object') return null;
  if (reference.usable === false) return null;
  const confidence = typeof reference.confidence === 'number'
    ? reference.confidence
    : (typeof reference.estimatedFidelity === 'number' ? reference.estimatedFidelity : 0);
  const threshold = typeof reference.targetThreshold === 'number' ? reference.targetThreshold : 0.7;
  if (confidence < threshold) return null;
  const maps = reference.maps;
  if (!maps || typeof maps !== 'object') return null;
  const map = (maps as Record<string, unknown>)[channel];
  if (!map || typeof map !== 'object') return null;
  const record = map as Record<string, unknown>;
  const url = typeof record.url === 'string' && record.url.trim() ? record.url : record.path;
  return typeof url === 'string' && url.trim() ? url : null;
}

function createLoadedMapTexture(
  url: string,
  colorSpace: THREE.ColorSpace,
  spec: SculptMaterialSpec,
  options: ProceduralModelOptions,
): THREE.Texture {
  const texture = new THREE.TextureLoader().load(url);
  const projection = spec.textureProjection && typeof spec.textureProjection === 'object' ? spec.textureProjection : {};
  const repeat = Array.isArray(projection.repeat) ? projection.repeat : [1, 1];
  texture.colorSpace = colorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(
    typeof repeat[0] === 'number' ? repeat[0] : 1,
    typeof repeat[1] === 'number' ? repeat[1] : 1,
  );
  texture.anisotropy = Math.max(1, Math.round(options.textureAnisotropy ?? projection.anisotropy ?? 8));
  texture.needsUpdate = true;
  return texture;
}

function makeReferenceTextureSet(spec: SculptMaterialSpec, options: ProceduralModelOptions): ProceduralTextureSet | null {
  const albedo = referenceMapUrl(spec, 'albedo');
  const roughness = referenceMapUrl(spec, 'roughness');
  const height = referenceMapUrl(spec, 'height');
  const normal = referenceMapUrl(spec, 'normal');
  const ao = referenceMapUrl(spec, 'ao');
  if (!albedo || !roughness || !height || !normal || !ao) return null;
  return {
    albedo: createLoadedMapTexture(albedo, THREE.SRGBColorSpace, spec, options),
    roughness: createLoadedMapTexture(roughness, THREE.NoColorSpace, spec, options),
    height: createLoadedMapTexture(height, THREE.NoColorSpace, spec, options),
    normal: createLoadedMapTexture(normal, THREE.NoColorSpace, spec, options),
    ao: createLoadedMapTexture(ao, THREE.NoColorSpace, spec, options),
    source: 'reference-pixel-extraction',
  };
}

function makeProceduralTextureSet(
  id: string,
  spec: SculptMaterialSpec,
  options: ProceduralModelOptions,
): ProceduralTextureSet | null {
  if (typeof document === 'undefined') return null;
  const qualityFirst = (options.qualityPriority ?? 'reference-fidelity') === 'reference-fidelity';
  const requested = options.textureSize ?? spec.textureResolution;
  const requestedSize = typeof requested === 'number' && Number.isFinite(requested)
    ? requested
    : (qualityFirst ? 1024 : 512);
  const size = Math.max(256, Math.min(2048, 2 ** Math.round(Math.log2(requestedSize))));
  const canvases = {
    albedo: makeCanvas(size),
    roughness: makeCanvas(size),
    height: makeCanvas(size),
    normal: makeCanvas(size),
    ao: makeCanvas(size),
  };
  const contexts = {
    albedo: canvases.albedo.getContext('2d'),
    roughness: canvases.roughness.getContext('2d'),
    height: canvases.height.getContext('2d'),
    normal: canvases.normal.getContext('2d'),
    ao: canvases.ao.getContext('2d'),
  };
  if (!contexts.albedo || !contexts.roughness || !contexts.height || !contexts.normal || !contexts.ao) return null;
  const images = {
    albedo: contexts.albedo.createImageData(size, size),
    roughness: contexts.roughness.createImageData(size, size),
    height: contexts.height.createImageData(size, size),
    normal: contexts.normal.createImageData(size, size),
    ao: contexts.ao.createImageData(size, size),
  };
  const seed = hashString(id);
  const bands = surfaceBands(spec);
  const heightField = new Float32Array(size * size);
  const roughnessField = new Float32Array(size * size);
  const palette = materialPalette(spec);
  const fallback = typeof spec.baseColor === 'string' ? spec.baseColor : '#8A7A5F';
  const colors = (palette.length >= 2 ? palette : [fallback, '#6E614B', '#A08F70']).map(hexToRgb);
  const baseRoughness = clamp01(readLayerNumber(spec.roughness, ['base'], 0.76));
  const roughnessVariation = clamp01(readLayerNumber(spec.roughness, ['variation'], 0.18));
  const colorAmplitude = clamp01(readLayerNumber(spec.colorVariation, ['amplitude', 'variation'], 0.18));
  const heightCorrelation = clamp01(readLayerNumber(spec.colorVariation, ['heightCorrelation'], 0.3));
  const colorGradient: ColorGradientSpec | undefined = spec.colorGradient;
  for (let y = 0; y < size; y += 1) {
    const v = y / size;
    for (let x = 0; x < size; x += 1) {
      const u = x / size;
      const index = y * size + x;
      const height = sampleSurface(u, v, bands, seed + 101);
      const roughNoise = sampleSurface(u, v, bands, seed + 7001);
      const colorNoise = sampleSurface(u, v, bands, seed + 15013);
      heightField[index] = height;
      roughnessField[index] = clamp01(baseRoughness + (roughNoise - 0.5) * roughnessVariation * 2);
      let color: [number, number, number];
      if (colorGradient) {
        // Evidence-derived spatial gradient (Plan 1.3 Workstream C) takes priority
        // over the noise-based palette blend below — it is a measured trend, not a guess.
        color = sampleColorGradient(colorGradient, u, v);
      } else {
        const paletteValue = clamp01(
          0.5 + (colorNoise - 0.5) * colorAmplitude * 2 + (height - 0.5) * heightCorrelation
        );
        color = mixPalette(colors, paletteValue);
      }
      writePixel(images.albedo.data, index * 4, color[0], color[1], color[2]);
    }
  }
  const normalStrength = Math.max(0.05, readLayerNumber(spec.normal, ['strength', 'amplitude'], 0.35));
  const aoStrength = clamp01(readLayerNumber(spec.ambientOcclusion, ['cavityStrength', 'strength'], 0.35));
  for (let y = 0; y < size; y += 1) {
    const up = ((y - 1 + size) % size) * size;
    const down = ((y + 1) % size) * size;
    for (let x = 0; x < size; x += 1) {
      const left = (x - 1 + size) % size;
      const right = (x + 1) % size;
      const index = y * size + x;
      const center = heightField[index];
      const dx = (heightField[y * size + right] - heightField[y * size + left]) * normalStrength * 6;
      const dy = (heightField[down + x] - heightField[up + x]) * normalStrength * 6;
      const inverseLength = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      const normalX = -dx * inverseLength;
      const normalY = -dy * inverseLength;
      const normalZ = inverseLength;
      const neighborAverage = (
        heightField[y * size + left] + heightField[y * size + right]
        + heightField[up + x] + heightField[down + x]
      ) * 0.25;
      const cavity = Math.max(0, neighborAverage - center);
      const ao = clamp01(1 - aoStrength * (cavity * 12 + (1 - center) * 0.16));
      const offset = index * 4;
      const heightByte = center * 255;
      const roughnessByte = roughnessField[index] * 255;
      writePixel(images.height.data, offset, heightByte, heightByte, heightByte);
      writePixel(images.roughness.data, offset, roughnessByte, roughnessByte, roughnessByte);
      writePixel(
        images.normal.data, offset,
        (normalX * 0.5 + 0.5) * 255,
        (normalY * 0.5 + 0.5) * 255,
        (normalZ * 0.5 + 0.5) * 255,
      );
      writePixel(images.ao.data, offset, ao * 255, ao * 255, ao * 255);
    }
  }
  contexts.albedo.putImageData(images.albedo, 0, 0);
  contexts.roughness.putImageData(images.roughness, 0, 0);
  contexts.height.putImageData(images.height, 0, 0);
  contexts.normal.putImageData(images.normal, 0, 0);
  contexts.ao.putImageData(images.ao, 0, 0);
  return {
    albedo: createMapTexture(canvases.albedo, THREE.SRGBColorSpace, spec, options),
    roughness: createMapTexture(canvases.roughness, THREE.NoColorSpace, spec, options),
    height: createMapTexture(canvases.height, THREE.NoColorSpace, spec, options),
    normal: createMapTexture(canvases.normal, THREE.NoColorSpace, spec, options),
    ao: createMapTexture(canvases.ao, THREE.NoColorSpace, spec, options),
    source: 'procedural',
  };
}

function createSculptMaterial(id: string, spec: SculptMaterialSpec, options: ProceduralModelOptions, denseComponent = false): THREE.MeshPhysicalMaterial {
  // A material that declares -- with evidence -- that its subject carries no texture
  // detail gets NO texture set. Synthesising one anyway is not a harmless default: the
  // branch below then forces color to white and roughness to 1 and reads both from the
  // generated maps, so the authored albedo and the reference-derived roughness are both
  // discarded, and the model gains mottling the reference does not have. Measured on the
  // tuxedo cat, whose black fur rendered as speckled grey-and-white from a palette that
  // only ever described two flat regions.
  const textureless = (spec.textureless as { declared?: boolean } | undefined)?.declared === true;
  const textures = textureless
    ? null
    : makeReferenceTextureSet(spec, options) ?? makeProceduralTextureSet(id, spec, options);
  const material = new THREE.MeshPhysicalMaterial({
    color: textures ? 0xffffff : clampedAlbedoColor(spec),
    roughness: textures ? 1 : clamp01(readLayerNumber(spec.roughness, ['base'], 0.76)),
    metalness: clampPbrMetalness(readLayerNumber(spec.metalness, ['base'], 0.0)),
    clearcoat: clamp01(readLayerNumber(spec.clearcoat, ['base', 'amount'], 0)),
    clearcoatRoughness: clamp01(readLayerNumber(spec.clearcoatRoughness, ['base'], 0.25)),
    transmission: clamp01(readLayerNumber(spec.transmission, ['base', 'amount'], 0)),
    ior: clampPbrIor(readLayerNumber(spec.ior, ['base', 'value'], 1.5)),
    thickness: Math.max(0, readLayerNumber(spec.thickness, ['base', 'amount'], 0)),
    attenuationDistance: Math.max(0.001, readLayerNumber(spec.attenuationDistance, ['base', 'value'], Infinity)),
    attenuationColor: new THREE.Color(typeof spec.attenuationColor === 'string' ? spec.attenuationColor : '#ffffff'),
    sheen: clamp01(readLayerNumber(spec.sheen, ['base', 'amount'], 0)),
    sheenColor: new THREE.Color(typeof spec.sheenColor === 'string' ? spec.sheenColor : '#ffffff'),
    sheenRoughness: clamp01(readLayerNumber(spec.sheenRoughness, ['base'], 1.0)),
    iridescence: clamp01(readLayerNumber(spec.iridescence, ['base', 'amount'], 0)),
    iridescenceIOR: clampPbrIor(readLayerNumber(spec.iridescenceIOR, ['base', 'value'], 1.3)),
    anisotropy: clamp01(readLayerNumber(spec.anisotropy, ['base', 'amount'], 0)),
    anisotropyRotation: readLayerNumber(spec.anisotropy, ['rotation'], 0),
    specularIntensity: clampPbrF0(readLayerNumber(spec.specularF0 ?? spec.f0 ?? spec.specularIntensity, ['base', 'value'], 1.0)),
    specularColor: new THREE.Color(typeof spec.specularColor === 'string' ? spec.specularColor : '#ffffff'),
    emissive: new THREE.Color(typeof spec.emissive === 'string' ? spec.emissive : '#000000'),
    emissiveIntensity: Math.max(0, readLayerNumber(spec.emissiveIntensity, ['base'], 1.0)),
    opacity: clamp01(readLayerNumber(spec.opacity, ['base'], 1)),
    transparent: readLayerNumber(spec.transmission, ['base', 'amount'], 0) > 0 || readLayerNumber(spec.opacity, ['base'], 1) < 1,
    alphaTest: Math.max(0, readLayerNumber(spec.alpha, ['cutoff', 'alphaTest'], 0)),
    wireframe: options.wireframe ?? false,
    side: spec.doubleSided === true ? THREE.DoubleSide : THREE.FrontSide,
    flatShading: spec.flatShading === true,
  });
  if (textures) {
    material.map = textures.albedo;
    material.roughnessMap = textures.roughness;
    material.normalMap = textures.normal;
    material.normalScale.setScalar(Math.max(0.05, readLayerNumber(spec.normal, ['strength', 'amplitude'], 0.35)));
    material.aoMap = textures.ao;
    material.aoMap.channel = 0;
    material.aoMapIntensity = readLayerNumber(spec.ambientOcclusion, ['cavityStrength', 'strength'], 0.35);
    const denseMesh = denseComponent || spec.denseMesh === true || spec.geometryDensity === 'dense' || spec.topologyClass === 'dense';
    const bumpScale = Math.max(0, readLayerNumber(spec.bump, ['amplitude', 'strength'], 0));
    const effectiveBumpScale = denseMesh ? Math.max(0.05, bumpScale) : bumpScale;
    if (effectiveBumpScale > 0) {
      material.bumpMap = textures.height;
      material.bumpScale = effectiveBumpScale;
    }
    const displacementScale = Math.max(0, readLayerNumber(spec.displacement, ['amplitude', 'strength'], 0));
    const effectiveDisplacementScale = denseMesh ? Math.max(0.005, displacementScale) : displacementScale;
    if (effectiveDisplacementScale > 0) {
      material.displacementMap = textures.height;
      material.displacementScale = effectiveDisplacementScale;
      material.displacementBias = -effectiveDisplacementScale * 0.5;
    }
  }
  material.envMapIntensity = readLayerNumber(spec, ['envMapIntensity'], 0.8);
  material.userData.sculptMaterial = spec;
  material.userData.proceduralMapsIndependent = true;
  material.userData.pbrConstraints = { albedoRange: [30, 240], binaryMetalness: true, f0Range: [0.02, 1], iorRange: [1, 2.5] };
  material.userData.pbrTextureSource = textures?.source ?? 'flat-fallback';
  material.userData.referencePbr = spec.referencePbr ?? null;
  material.userData.referenceMaterialId = spec.referenceMaterialId ?? spec.materialReference?.profileId ?? null;
  material.userData.materialEvidence = spec.materialEvidence ?? null;
  material.userData.validationViews = spec.materialReference?.validationViews ?? [];
  material.needsUpdate = true;
  return material;
}

type AttachmentEndpoint = {
  start: THREE.Vector3;
  midpoint: THREE.Vector3;
  quaternion: THREE.Quaternion;
  length: number;
  baseRadius: number;
  endRadius: number;
};

function readVector3(value: unknown, fallback: [number, number, number]): THREE.Vector3 {
  if (Array.isArray(value) && value.length === 3 && value.every((item) => typeof item === 'number')) {
    return new THREE.Vector3(value[0], value[1], value[2]);
  }
  return new THREE.Vector3(fallback[0], fallback[1], fallback[2]);
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function makeAttachmentEndpoint(attachment: unknown): AttachmentEndpoint | null {
  if (!attachment || typeof attachment !== 'object') return null;
  const record = attachment as Record<string, unknown>;
  const start = readVector3(record.localStart, [0, 0, 0]);
  const end = readVector3(record.localEnd, [0, 1, 0]);
  const delta = end.clone().sub(start);
  const length = delta.length();
  if (length <= 0.0001) return null;
  const direction = delta.clone().normalize();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
  const baseRadius = Math.max(0.005, readNumber(record.baseRadius, 0.06));
  const endRadius = Math.max(0.003, readNumber(record.endRadius, baseRadius * 0.55));
  return {
    start,
    midpoint: delta.multiplyScalar(0.5),
    quaternion,
    length,
    baseRadius,
    endRadius,
  };
}

// Generated from ObjectSculptSpec target: Space Shuttle Discovery launch stack (daylight pad)
// Sculpt build pass: blockout
// This factory is intentionally pass-gated. Finish browser screenshot review before unlocking deeper passes.
export function createSpaceShuttleDiscoveryLaunchStackDaylightPadModel(options: ProceduralModelOptions = {}): THREE.Group {
  const root = new THREE.Group();
  root.name = "Space Shuttle Discovery launch stack (daylight pad)";
  root.userData.reconstructionEvidence = {"itemFamily": null, "subtype": null, "componentAdapter": null, "route": null, "exactnessTier": null, "referenceCamera": {"solved": false, "fovDegrees": 40.0, "aspect": 1.0, "orientation": {"yaw": 0.0, "pitch": 0.0, "roll": 0.0}, "positionHint": [0.0, 0.0, 3.0], "note": "For likeness work, solve the reference camera (forge/stage1_intake/solve_camera_pose.py) so the review render aligns with the photo and the reference can be projected. Confirm by overlay review."}, "approximationNotes": []};
  root.userData.materialPipeline = {"schemaVersion": 1, "status": "proceed", "registry": "C:\\Users\\rakaa\\Downloads\\files\\.claude\\skills\\img2threejs\\docs\\materials\\material-reference.json", "analysisArtifact": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-analysis.json", "targetThreshold": 0.7, "unresolvedNotObservedMaterials": [], "regions": [{"componentId": "et-lox-barrel", "regionId": "foam", "specMaterialId": "foam-orange", "profileId": "plastic.matte", "status": "proceed"}, {"componentId": "srb-stbd-case", "regionId": "paint", "specMaterialId": "paint-white", "profileId": "coating.painted-metal", "status": "proceed"}, {"componentId": "orb-mid-fuselage", "regionId": "light-insulation", "specMaterialId": "tile-white", "profileId": "ceramic.glazed", "status": "proceed"}, {"componentId": "orb-fwd-fuselage", "regionId": "dark-insulation", "specMaterialId": "tile-black", "profileId": "ceramic.glazed", "status": "proceed"}, {"componentId": "srb-stbd-nozzle", "regionId": "nozzle-liner", "specMaterialId": "nozzle-liner", "profileId": "ceramic.glazed", "status": "proceed"}, {"componentId": "micro-orb-insignia", "regionId": "insignia", "specMaterialId": "marking-decal", "profileId": "coating.painted-metal", "status": "proceed"}, {"componentId": "srb-stbd-frustum", "regionId": "frustum-patch", "specMaterialId": "patch-orange", "profileId": "coating.painted-metal", "status": "proceed"}, {"componentId": "micro-orb-windows", "regionId": "glazing", "specMaterialId": "glass-window", "profileId": "glass.clear", "status": "proceed"}, {"componentId": "orb-engine-mount", "regionId": "engine-bay", "specMaterialId": "engine-metal", "profileId": "metal.steel-brushed", "status": "proceed"}], "controlledViewsRequired": ["albedo-unlit", "backlight-transmission", "environment-reflection", "grazing", "neutral-studio", "reference-beauty"]};
  root.userData.materialReferenceRegistry = "C:\\Users\\rakaa\\Downloads\\files\\.claude\\skills\\img2threejs\\docs\\materials\\material-reference.json";

  const materialMap: Record<string, THREE.Material> = {};
  materialMap["foam-orange"] = createSculptMaterial(
    "foam-orange",
    {"id": "foam-orange", "name": "Sprayed insulation foam", "type": "standard", "shaderModel": "MeshStandardMaterial / PBR approximation", "baseColor": "#C6884A", "color": "#C6884A", "albedo": {"base": "#C6884A", "source": "daylight sample, de-lit"}, "colorVariation": {"amount": 0.04, "kind": "per-face hue jitter"}, "textureResolution": 1024, "textureProjection": {"mode": "cylindrical-uv for bodies of revolution, planar-uv for wing and fin panels", "kind": "procedural-canvas", "texelDensity": "512 texels per metre of surface at the near LOD", "reason": "No image files are shipped; every map is drawn to a canvas at runtime so the page works offline."}, "surfaceFrequencyBands": [{"id": "macro", "feature": "panel and segment boundaries", "realization": "geometry", "frequency": 0.35, "amplitude": 0.08}, {"id": "meso", "feature": "linework, bands and decals", "realization": "canvas texture", "frequency": 4.0, "amplitude": 0.02}, {"id": "micro", "feature": "surface grain and soiling", "realization": "procedural noise", "frequency": 40.0, "amplitude": 0.004}], "roughness": {"base": 0.68, "variation": 0.08, "map": "foam-orange-roughness-canvas (independent channel: value noise plus seam darkening, authored on its own canvas and never derived from the colour channel)", "independentOfAlbedo": true, "source": "material class and observed finish"}, "metalness": {"base": 0.0, "variation": 0.0}, "normal": {"strength": 0.5, "kind": "procedural noise", "independentOfAlbedo": true}, "bump": {"strength": 0.2, "independentOfAlbedo": true}, "displacement": {"strength": 0.0, "note": "relief that affects silhouette is geometry"}, "ambientOcclusion": {"strength": 0.6, "kind": "cavity darkening at seams and sockets"}, "wear": {"edgeWear": 0.15, "kind": "edge lightening at panel boundaries"}, "dirt": {"amount": 0.18, "kind": "streaking and cavity dirt"}, "localOverrides": [{"id": "foam-spray-streak", "name": "Spray streaking", "roughness": 0.95, "albedo": "rgba(168, 108, 56, 1.0)", "coverage": 0.22, "note": "Longitudinal streaks where spray passes overlap."}, {"id": "foam-tip-shade", "name": "Ogive tip shading", "roughness": 0.9, "albedo": "rgba(150, 96, 48, 1.0)", "coverage": 0.06, "note": "Slight darkening near the nose. Inference."}], "shaderNotes": ["Matte dielectric. Daylight sample; lighter and less saturated than the night frame implied."], "notes": "Matte dielectric. Daylight sample; lighter and less saturated than the night frame implied. Extracted palette #D99C58 agrees with the independent sample (212,157,93). Authored albedo is held slightly darker than the extraction because the page relights the model and the extracted value already carries daylight.", "materialClass": "plastic", "referenceMaterialId": "plastic.matte", "materialFamily": "plastic", "materialSubtype": "generic-polymer", "materialFinish": "matte", "materialReference": {"registry": "C:\\Users\\rakaa\\Downloads\\files\\.claude\\skills\\img2threejs\\docs\\materials\\material-reference.json", "profileId": "plastic.matte", "method": "family-subtype-finish", "confidence": 0.779, "sourceRefs": ["three.mesh-standard", "adobe.pbr-guide-1", "google.filament-pbr", "mit.material-recognition"], "requiredMaps": ["map", "roughnessMap"], "optionalMaps": ["normalMap", "aoMap"], "validationViews": ["albedo-unlit", "neutral-studio", "grazing"]}, "ior": {"base": 1.5, "variation": 0.0}, "referencePbr": {"version": "1.0", "sourceImage": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\00-foam.png", "extractor": "stage1_intake/extract_pbr_evidence.py", "method": "single-image pixel evidence with de-lighting estimate; not photogrammetry", "usable": true, "verdict": "pass", "confidence": 0.779, "estimatedFidelity": 0.779, "targetThreshold": 0.7, "hardLimit": "A single image cannot uniquely recover true albedo/roughness/normal/AO; maps are reference-derived estimates.", "maps": {"albedo": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\pbr-00-foam\\foam-orange_albedo.png", "url": "foam-orange_albedo.png", "channel": "albedo", "source": "reference-pixel-extraction"}, "roughness": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\pbr-00-foam\\foam-orange_roughness.png", "url": "foam-orange_roughness.png", "channel": "roughness", "source": "reference-pixel-extraction"}, "height": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\pbr-00-foam\\foam-orange_height.png", "url": "foam-orange_height.png", "channel": "height", "source": "reference-pixel-extraction"}, "normal": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\pbr-00-foam\\foam-orange_normal.png", "url": "foam-orange_normal.png", "channel": "normal", "source": "reference-pixel-extraction"}, "ao": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\pbr-00-foam\\foam-orange_ao.png", "url": "foam-orange_ao.png", "channel": "ao", "source": "reference-pixel-extraction"}}, "diagnostics": {"sourceWidth": 45, "sourceHeight": 55, "mapSize": 512, "cropBBoxPixels": {"x": 0, "y": 0, "width": 45, "height": 55}, "mask": {"backgroundColor": "#C58D51", "backgroundNoise": 46.872, "transparentPixelFraction": 0.0, "foregroundCoverage": 1.0}, "mapStats": {"valueRange": 0.279, "heightP90Gradient": 0.06554, "roughnessBase": 0.713, "roughnessVariation": 0.106, "normalStrength": 0.233, "blurRadius": 10}, "palette": ["#D99C58", "#C4894D", "#E4AE69", "#F1DCB4", "#744924"]}, "warnings": ["image is not clearly isolated from background; using most pixels as material evidence", "object/background separation is weak", "single-image inverse rendering cannot prove true physical PBR; confidence is capped"]}, "textureAnalysis": {"finishClass": "painted-metal", "recipe": {"metalness": 0.0, "roughness": 0.5, "clearcoat": 1.0, "clearcoatRoughness": 0.05, "transmission": 0.0, "ior": 1.5, "envMapIntensity": 1.0, "anisotropy": 0.0, "procedural": "flat-clearcoat"}, "palette": ["#D59D5B", "#D19754", "#D69957", "#D29652", "#CF9351"], "paletteHueRisk": [], "gradientAxis": "vertical", "stats": {"meanLum": 166.5, "meanSaturation": 0.566, "gradientStrength": 0.208, "mottle": 0.015, "streakRatio": 0.81, "hueSpread": 0.001, "specularFraction": 0.01}}, "materialEvidence": {"componentId": "et-lox-barrel", "regionId": "foam", "crop": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\00-foam.png", "bbox": {"x": 300, "y": 150, "width": 45, "height": 55}, "sourceWidth": 605, "sourceHeight": 896, "loaderWarnings": [], "coverage": 0.0046}, "observations": ["chromatic base-colour response", "strong image-space gradient; verify it is material pattern, not lighting", "single-image PBR inference requires controlled render validation"], "hypothesis": {"componentId": "et-lox-barrel", "regionId": "foam", "materialId": null, "family": "plastic", "subtype": "generic-polymer", "finish": "matte", "aliases": [], "confidence": 0.779, "source": "vision"}, "alternatives": []}},
    options
  );
  materialMap["paint-white"] = createSculptMaterial(
    "paint-white",
    {"id": "paint-white", "name": "Painted metal skin", "type": "standard", "shaderModel": "MeshStandardMaterial / PBR approximation", "baseColor": "#E4E4E0", "color": "#E4E4E0", "albedo": {"base": "#E4E4E0", "source": "daylight sample, de-lit"}, "colorVariation": {"amount": 0.04, "kind": "per-face hue jitter"}, "textureResolution": 1024, "textureProjection": {"mode": "cylindrical-uv for bodies of revolution, planar-uv for wing and fin panels", "kind": "procedural-canvas", "texelDensity": "512 texels per metre of surface at the near LOD", "reason": "No image files are shipped; every map is drawn to a canvas at runtime so the page works offline."}, "surfaceFrequencyBands": [{"id": "macro", "feature": "panel and segment boundaries", "realization": "geometry", "frequency": 0.35, "amplitude": 0.08}, {"id": "meso", "feature": "linework, bands and decals", "realization": "canvas texture", "frequency": 4.0, "amplitude": 0.02}, {"id": "micro", "feature": "surface grain and soiling", "realization": "procedural noise", "frequency": 40.0, "amplitude": 0.004}], "roughness": {"base": 0.45, "variation": 0.08, "map": "paint-white-roughness-canvas (independent channel: value noise plus seam darkening, authored on its own canvas and never derived from the colour channel)", "independentOfAlbedo": true, "source": "material class and observed finish"}, "metalness": {"base": 0.0, "variation": 0.0}, "normal": {"strength": 0.5, "kind": "procedural noise", "independentOfAlbedo": true}, "bump": {"strength": 0.2, "independentOfAlbedo": true}, "displacement": {"strength": 0.0, "note": "relief that affects silhouette is geometry"}, "ambientOcclusion": {"strength": 0.6, "kind": "cavity darkening at seams and sockets"}, "wear": {"edgeWear": 0.15, "kind": "edge lightening at panel boundaries"}, "dirt": {"amount": 0.18, "kind": "streaking and cavity dirt"}, "localOverrides": [{"id": "paint-ring-band", "name": "Black ring band", "roughness": 0.66, "albedo": "rgba(32, 32, 34, 1.0)", "coverage": 0.06, "note": "Two bands per booster, observed directly."}, {"id": "paint-frustum-patch", "name": "Orange frustum patch", "roughness": 0.7, "albedo": "rgba(206, 132, 44, 1.0)", "coverage": 0.02, "note": "Square patch below the upper band."}], "shaderNotes": ["Matte-to-satin painted skin on the boosters and struts.", "Extracted palette leads with #8E8A85 and includes #0B0701, so the crop straddles a shaded face and a dark edge rather than sampling flat paint. Extracted albedo REJECTED; the authored near-white is kept."], "notes": "Matte-to-satin painted skin on the boosters and struts. Extracted palette leads with #8E8A85 and includes #0B0701, so the crop straddles a shaded face and a dark edge rather than sampling flat paint. Extracted albedo REJECTED; the authored near-white is kept.", "materialClass": "metal", "referenceMaterialId": "coating.painted-metal", "materialFamily": "coating", "materialSubtype": "paint-over-metal", "materialFinish": "gloss-or-satin", "materialReference": {"registry": "C:\\Users\\rakaa\\Downloads\\files\\.claude\\skills\\img2threejs\\docs\\materials\\material-reference.json", "profileId": "coating.painted-metal", "method": "family-subtype-finish", "confidence": 0.846, "sourceRefs": ["three.mesh-physical", "gltf.2", "khronos.gltf-pbr", "adobe.pbr-guide-1", "adobe.pbr-guide-2"], "requiredMaps": ["map", "roughnessMap"], "optionalMaps": ["normalMap", "clearcoatMap", "clearcoatRoughnessMap", "metalnessMap"], "validationViews": ["albedo-unlit", "neutral-studio", "grazing", "environment-reflection", "reference-beauty"]}, "clearcoat": {"base": 0.75, "variation": 0.0}, "clearcoatRoughness": {"base": 0.12, "variation": 0.0}, "ior": {"base": 1.5, "variation": 0.0}, "referencePbr": {"version": "1.0", "sourceImage": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\01-paint.png", "extractor": "stage1_intake/extract_pbr_evidence.py", "method": "single-image pixel evidence with de-lighting estimate; not photogrammetry", "usable": true, "verdict": "pass", "confidence": 0.846, "estimatedFidelity": 0.846, "targetThreshold": 0.7, "hardLimit": "A single image cannot uniquely recover true albedo/roughness/normal/AO; maps are reference-derived estimates.", "maps": {"albedo": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\pbr-01-paint\\paint-white_albedo.png", "url": "paint-white_albedo.png", "channel": "albedo", "source": "reference-pixel-extraction"}, "roughness": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\pbr-01-paint\\paint-white_roughness.png", "url": "paint-white_roughness.png", "channel": "roughness", "source": "reference-pixel-extraction"}, "height": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\pbr-01-paint\\paint-white_height.png", "url": "paint-white_height.png", "channel": "height", "source": "reference-pixel-extraction"}, "normal": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\pbr-01-paint\\paint-white_normal.png", "url": "paint-white_normal.png", "channel": "normal", "source": "reference-pixel-extraction"}, "ao": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\pbr-01-paint\\paint-white_ao.png", "url": "paint-white_ao.png", "channel": "ao", "source": "reference-pixel-extraction"}}, "diagnostics": {"sourceWidth": 20, "sourceHeight": 65, "mapSize": 512, "cropBBoxPixels": {"x": 0, "y": 53, "width": 20, "height": 7}, "mask": {"backgroundColor": "#E5E8E5", "backgroundNoise": 61.474, "transparentPixelFraction": 0.0, "foregroundCoverage": 0.0362}, "mapStats": {"valueRange": 0.5428, "heightP90Gradient": 0.03696, "roughnessBase": 0.68, "roughnessVariation": 0.054, "normalStrength": 0.2, "blurRadius": 10}, "palette": ["#8E8A85", "#0B0701", "#120D0C", "#605A4F", "#77746B"]}, "warnings": ["foreground mask is very small", "single-image inverse rendering cannot prove true physical PBR; confidence is capped"]}, "textureAnalysis": {"finishClass": "painted-metal", "recipe": {"metalness": 0.0, "roughness": 0.5, "clearcoat": 1.0, "clearcoatRoughness": 0.05, "transmission": 0.0, "ior": 1.5, "envMapIntensity": 1.0, "anisotropy": 0.0, "procedural": "flat-clearcoat"}, "palette": ["#7B7771", "#7B7771", "#0D0905", "#9F9B95", "#9F9B95"], "paletteHueRisk": [], "gradientAxis": "vertical", "stats": {"meanLum": 96.1, "meanSaturation": 0.272, "gradientStrength": 0.572, "mottle": 0.005, "streakRatio": 0.32, "hueSpread": 0.018, "specularFraction": 0.0}}, "materialEvidence": {"componentId": "srb-stbd-case", "regionId": "paint", "crop": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\01-paint.png", "bbox": {"x": 385, "y": 400, "width": 20, "height": 65}, "sourceWidth": 605, "sourceHeight": 896, "loaderWarnings": [], "coverage": 0.0024}, "observations": ["chromatic base-colour response", "directional surface frequency", "strong image-space gradient; verify it is material pattern, not lighting", "single-image PBR inference requires controlled render validation"], "hypothesis": {"componentId": "srb-stbd-case", "regionId": "paint", "materialId": null, "family": "coating", "subtype": "paint-over-metal", "finish": "gloss-or-satin", "aliases": [], "confidence": 0.846, "source": "vision"}, "alternatives": []}},
    options
  );
  materialMap["tile-white"] = createSculptMaterial(
    "tile-white",
    {"id": "tile-white", "name": "Light thermal insulation", "type": "standard", "shaderModel": "MeshStandardMaterial / PBR approximation", "baseColor": "#E2E0DA", "color": "#E2E0DA", "albedo": {"base": "#E2E0DA", "source": "daylight sample, de-lit"}, "colorVariation": {"amount": 0.04, "kind": "per-face hue jitter"}, "textureResolution": 1024, "textureProjection": {"mode": "cylindrical-uv for bodies of revolution, planar-uv for wing and fin panels", "kind": "procedural-canvas", "texelDensity": "512 texels per metre of surface at the near LOD", "reason": "No image files are shipped; every map is drawn to a canvas at runtime so the page works offline."}, "surfaceFrequencyBands": [{"id": "macro", "feature": "panel and segment boundaries", "realization": "geometry", "frequency": 0.35, "amplitude": 0.08}, {"id": "meso", "feature": "linework, bands and decals", "realization": "canvas texture", "frequency": 4.0, "amplitude": 0.02}, {"id": "micro", "feature": "surface grain and soiling", "realization": "procedural noise", "frequency": 40.0, "amplitude": 0.004}], "roughness": {"base": 0.26, "variation": 0.08, "map": "tile-white-roughness-canvas (independent channel: value noise plus seam darkening, authored on its own canvas and never derived from the colour channel)", "independentOfAlbedo": true, "source": "material class and observed finish"}, "metalness": {"base": 0.0, "variation": 0.0}, "normal": {"strength": 0.5, "kind": "procedural noise", "independentOfAlbedo": true}, "bump": {"strength": 0.2, "independentOfAlbedo": true}, "displacement": {"strength": 0.0, "note": "relief that affects silhouette is geometry"}, "ambientOcclusion": {"strength": 0.6, "kind": "cavity darkening at seams and sockets"}, "wear": {"edgeWear": 0.15, "kind": "edge lightening at panel boundaries"}, "dirt": {"amount": 0.18, "kind": "streaking and cavity dirt"}, "localOverrides": [{"id": "tile-grid-linework", "name": "Tile grid linework", "roughness": 0.8, "albedo": "rgba(186, 184, 178, 1.0)", "coverage": 0.15, "note": "Fine grid lines, partly resolved in daylight."}, {"id": "tile-soiling", "name": "Soiling and streaking", "roughness": 0.84, "albedo": "rgba(166, 164, 158, 1.0)", "coverage": 0.2, "note": "Grey streaks across the white. Observed, and the single strongest cue that this is a used vehicle rather than a clean model."}], "shaderNotes": ["Matte ceramic insulation on the orbiter upper surfaces, visibly soiled."], "notes": "Matte ceramic insulation on the orbiter upper surfaces, visibly soiled. Extracted #CFD1CB matches the sample (207,209,203) almost exactly. Corroborated.", "materialClass": "ceramic", "referenceMaterialId": "ceramic.glazed", "materialFamily": "ceramic", "materialSubtype": "glazed", "materialFinish": "glossy", "materialReference": {"registry": "C:\\Users\\rakaa\\Downloads\\files\\.claude\\skills\\img2threejs\\docs\\materials\\material-reference.json", "profileId": "ceramic.glazed", "method": "family-subtype-finish", "confidence": 0.728, "sourceRefs": ["three.mesh-physical", "adobe.pbr-guide-1", "google.filament-pbr"], "requiredMaps": ["map", "roughnessMap"], "optionalMaps": ["normalMap", "clearcoatMap", "clearcoatRoughnessMap"], "validationViews": ["neutral-studio", "grazing", "environment-reflection", "reference-beauty"]}, "clearcoat": {"base": 0.7, "variation": 0.0}, "clearcoatRoughness": {"base": 0.12, "variation": 0.0}, "ior": {"base": 1.5, "variation": 0.0}, "referencePbr": {"version": "1.0", "sourceImage": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\02-light-insulation.png", "extractor": "stage1_intake/extract_pbr_evidence.py", "method": "single-image pixel evidence with de-lighting estimate; not photogrammetry", "usable": true, "verdict": "pass", "confidence": 0.728, "estimatedFidelity": 0.728, "targetThreshold": 0.7, "hardLimit": "A single image cannot uniquely recover true albedo/roughness/normal/AO; maps are reference-derived estimates.", "maps": {"albedo": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\pbr-02-light-insulation\\tile-white_albedo.png", "url": "tile-white_albedo.png", "channel": "albedo", "source": "reference-pixel-extraction"}, "roughness": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\pbr-02-light-insulation\\tile-white_roughness.png", "url": "tile-white_roughness.png", "channel": "roughness", "source": "reference-pixel-extraction"}, "height": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\pbr-02-light-insulation\\tile-white_height.png", "url": "tile-white_height.png", "channel": "height", "source": "reference-pixel-extraction"}, "normal": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\pbr-02-light-insulation\\tile-white_normal.png", "url": "tile-white_normal.png", "channel": "normal", "source": "reference-pixel-extraction"}, "ao": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\pbr-02-light-insulation\\tile-white_ao.png", "url": "tile-white_ao.png", "channel": "ao", "source": "reference-pixel-extraction"}}, "diagnostics": {"sourceWidth": 40, "sourceHeight": 70, "mapSize": 512, "cropBBoxPixels": {"x": 0, "y": 0, "width": 40, "height": 70}, "mask": {"backgroundColor": "#E1E1DD", "backgroundNoise": 81.639, "transparentPixelFraction": 0.0, "foregroundCoverage": 1.0}, "mapStats": {"valueRange": 0.2154, "heightP90Gradient": 0.05519, "roughnessBase": 0.72, "roughnessVariation": 0.098, "normalStrength": 0.221, "blurRadius": 10}, "palette": ["#CFD1CB", "#BEC1BC", "#E6E7E2", "#DDDED8", "#AEB1AD"]}, "warnings": ["foreground mask is tiny; material extraction is likely unreliable", "image is not clearly isolated from background; using most pixels as material evidence", "object/background separation is weak", "single-image inverse rendering cannot prove true physical PBR; confidence is capped", "low value range weakens height/roughness inference"]}, "textureAnalysis": {"finishClass": "plastic", "recipe": {"metalness": 0.05, "roughness": 0.6, "clearcoat": 0.2, "clearcoatRoughness": 0.3, "transmission": 0.0, "ior": 1.5, "envMapIntensity": 0.7, "anisotropy": 0.0, "procedural": "flat-clearcoat"}, "palette": ["#A9ACA8", "#BDC0BB", "#CFD1CC", "#DEDFDA", "#E9EAE4"], "paletteHueRisk": [], "gradientAxis": "horizontal", "stats": {"meanLum": 206.9, "meanSaturation": 0.026, "gradientStrength": 0.244, "mottle": 0.011, "streakRatio": 0.74, "hueSpread": 0.0, "specularFraction": 0.016}}, "materialEvidence": {"componentId": "orb-mid-fuselage", "regionId": "light-insulation", "crop": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\02-light-insulation.png", "bbox": {"x": 300, "y": 450, "width": 40, "height": 70}, "sourceWidth": 605, "sourceHeight": 896, "loaderWarnings": [], "coverage": 0.0052}, "observations": ["near-neutral colour response", "strong image-space gradient; verify it is material pattern, not lighting", "single-image PBR inference requires controlled render validation"], "hypothesis": {"componentId": "orb-mid-fuselage", "regionId": "light-insulation", "materialId": null, "family": "ceramic", "subtype": "glazed", "finish": "glossy", "aliases": [], "confidence": 0.728, "source": "vision"}, "alternatives": []}},
    options
  );
  materialMap["tile-black"] = createSculptMaterial(
    "tile-black",
    {"id": "tile-black", "name": "Dark thermal protection", "type": "standard", "shaderModel": "MeshStandardMaterial / PBR approximation", "baseColor": "#202022", "color": "#202022", "albedo": {"base": "#202022", "source": "daylight sample, de-lit"}, "colorVariation": {"amount": 0.04, "kind": "per-face hue jitter"}, "textureResolution": 1024, "textureProjection": {"mode": "cylindrical-uv for bodies of revolution, planar-uv for wing and fin panels", "kind": "procedural-canvas", "texelDensity": "512 texels per metre of surface at the near LOD", "reason": "No image files are shipped; every map is drawn to a canvas at runtime so the page works offline."}, "surfaceFrequencyBands": [{"id": "macro", "feature": "panel and segment boundaries", "realization": "geometry", "frequency": 0.35, "amplitude": 0.08}, {"id": "meso", "feature": "linework, bands and decals", "realization": "canvas texture", "frequency": 4.0, "amplitude": 0.02}, {"id": "micro", "feature": "surface grain and soiling", "realization": "procedural noise", "frequency": 40.0, "amplitude": 0.004}], "roughness": {"base": 0.26, "variation": 0.08, "map": "tile-black-roughness-canvas (independent channel: value noise plus seam darkening, authored on its own canvas and never derived from the colour channel)", "independentOfAlbedo": true, "source": "material class and observed finish"}, "metalness": {"base": 0.0, "variation": 0.0}, "normal": {"strength": 0.5, "kind": "procedural noise", "independentOfAlbedo": true}, "bump": {"strength": 0.2, "independentOfAlbedo": true}, "displacement": {"strength": 0.0, "note": "relief that affects silhouette is geometry"}, "ambientOcclusion": {"strength": 0.6, "kind": "cavity darkening at seams and sockets"}, "wear": {"edgeWear": 0.15, "kind": "edge lightening at panel boundaries"}, "dirt": {"amount": 0.18, "kind": "streaking and cavity dirt"}, "localOverrides": [{"id": "tile-black-sheen", "name": "Leading-edge sheen", "roughness": 0.28, "albedo": "rgba(56, 56, 58, 1.0)", "coverage": 0.12, "note": "Low-roughness band along the leading edge; the only gloss response on the vehicle."}, {"id": "tile-black-grid", "name": "Dark tile linework", "roughness": 0.6, "albedo": "rgba(44, 44, 46, 1.0)", "coverage": 0.2, "note": "Grid lines on the dark region."}], "shaderNotes": ["Matte near-black on the nose cap, leading edges, base structure and booster bands."], "notes": "Matte near-black on the nose cap, leading edges, base structure and booster bands. Extracted #333031 agrees with the searched dark-pixel mean (42,37,36). Corroborated.", "materialClass": "ceramic", "referenceMaterialId": "ceramic.glazed", "materialFamily": "ceramic", "materialSubtype": "glazed", "materialFinish": "glossy", "materialReference": {"registry": "C:\\Users\\rakaa\\Downloads\\files\\.claude\\skills\\img2threejs\\docs\\materials\\material-reference.json", "profileId": "ceramic.glazed", "method": "family-subtype-finish", "confidence": 0.86, "sourceRefs": ["three.mesh-physical", "adobe.pbr-guide-1", "google.filament-pbr"], "requiredMaps": ["map", "roughnessMap"], "optionalMaps": ["normalMap", "clearcoatMap", "clearcoatRoughnessMap"], "validationViews": ["neutral-studio", "grazing", "environment-reflection", "reference-beauty"]}, "clearcoat": {"base": 0.7, "variation": 0.0}, "clearcoatRoughness": {"base": 0.12, "variation": 0.0}, "ior": {"base": 1.5, "variation": 0.0}, "referencePbr": {"version": "1.0", "sourceImage": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\03-dark-insulation.png", "extractor": "stage1_intake/extract_pbr_evidence.py", "method": "single-image pixel evidence with de-lighting estimate; not photogrammetry", "usable": true, "verdict": "pass", "confidence": 0.86, "estimatedFidelity": 0.86, "targetThreshold": 0.7, "hardLimit": "A single image cannot uniquely recover true albedo/roughness/normal/AO; maps are reference-derived estimates.", "maps": {"albedo": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\pbr-03-dark-insulation\\tile-black_albedo.png", "url": "tile-black_albedo.png", "channel": "albedo", "source": "reference-pixel-extraction"}, "roughness": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\pbr-03-dark-insulation\\tile-black_roughness.png", "url": "tile-black_roughness.png", "channel": "roughness", "source": "reference-pixel-extraction"}, "height": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\pbr-03-dark-insulation\\tile-black_height.png", "url": "tile-black_height.png", "channel": "height", "source": "reference-pixel-extraction"}, "normal": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\pbr-03-dark-insulation\\tile-black_normal.png", "url": "tile-black_normal.png", "channel": "normal", "source": "reference-pixel-extraction"}, "ao": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\pbr-03-dark-insulation\\tile-black_ao.png", "url": "tile-black_ao.png", "channel": "ao", "source": "reference-pixel-extraction"}}, "diagnostics": {"sourceWidth": 30, "sourceHeight": 22, "mapSize": 512, "cropBBoxPixels": {"x": 0, "y": 0, "width": 30, "height": 22}, "mask": {"backgroundColor": "#4B3E38", "backgroundNoise": 109.654, "transparentPixelFraction": 0.0, "foregroundCoverage": 0.4818}, "mapStats": {"valueRange": 0.8437, "heightP90Gradient": 0.05034, "roughnessBase": 0.695, "roughnessVariation": 0.084, "normalStrength": 0.215, "blurRadius": 10}, "palette": ["#333031", "#1D1C1C", "#A18467", "#544A43", "#EFEBED"]}, "warnings": ["single-image inverse rendering cannot prove true physical PBR; confidence is capped"]}, "textureAnalysis": {"finishClass": "worn-composite", "recipe": {"metalness": 0.0, "roughness": 0.9, "clearcoat": 0.0, "clearcoatRoughness": 0.0, "transmission": 0.0, "ior": 1.5, "envMapIntensity": 0.5, "anisotropy": 0.0, "procedural": "mottle"}, "palette": ["#5C4B3B", "#29292B", "#717177", "#534A48", "#54493C"], "paletteHueRisk": [], "gradientAxis": "horizontal", "stats": {"meanLum": 77.7, "meanSaturation": 0.172, "gradientStrength": 0.368, "mottle": 0.042, "streakRatio": 1.66, "hueSpread": 0.516, "specularFraction": 0.028}}, "materialEvidence": {"componentId": "orb-fwd-fuselage", "regionId": "dark-insulation", "crop": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\03-dark-insulation.png", "bbox": {"x": 312, "y": 292, "width": 30, "height": 22}, "sourceWidth": 605, "sourceHeight": 896, "loaderWarnings": [], "coverage": 0.0012}, "observations": ["near-neutral colour response", "visible meso/micro variation", "strong image-space gradient; verify it is material pattern, not lighting", "single-image PBR inference requires controlled render validation"], "hypothesis": {"componentId": "orb-fwd-fuselage", "regionId": "dark-insulation", "materialId": null, "family": "ceramic", "subtype": "glazed", "finish": "glossy", "aliases": [], "confidence": 0.86, "source": "vision"}, "alternatives": []}},
    options
  );
  materialMap["nozzle-liner"] = createSculptMaterial(
    "nozzle-liner",
    {"id": "nozzle-liner", "name": "Booster nozzle liner", "type": "standard", "shaderModel": "MeshStandardMaterial / PBR approximation", "baseColor": "#964A34", "color": "#964A34", "albedo": {"base": "#964A34", "source": "daylight sample, de-lit"}, "colorVariation": {"amount": 0.04, "kind": "per-face hue jitter"}, "textureResolution": 1024, "textureProjection": {"mode": "cylindrical-uv for bodies of revolution, planar-uv for wing and fin panels", "kind": "procedural-canvas", "texelDensity": "512 texels per metre of surface at the near LOD", "reason": "No image files are shipped; every map is drawn to a canvas at runtime so the page works offline."}, "surfaceFrequencyBands": [{"id": "macro", "feature": "panel and segment boundaries", "realization": "geometry", "frequency": 0.35, "amplitude": 0.08}, {"id": "meso", "feature": "linework, bands and decals", "realization": "canvas texture", "frequency": 4.0, "amplitude": 0.02}, {"id": "micro", "feature": "surface grain and soiling", "realization": "procedural noise", "frequency": 40.0, "amplitude": 0.004}], "roughness": {"base": 0.26, "variation": 0.08, "map": "nozzle-liner-roughness-canvas (independent channel: value noise plus seam darkening, authored on its own canvas and never derived from the colour channel)", "independentOfAlbedo": true, "source": "material class and observed finish"}, "metalness": {"base": 0.0, "variation": 0.0}, "normal": {"strength": 0.5, "kind": "procedural noise", "independentOfAlbedo": true}, "bump": {"strength": 0.2, "independentOfAlbedo": true}, "displacement": {"strength": 0.0, "note": "relief that affects silhouette is geometry"}, "ambientOcclusion": {"strength": 0.6, "kind": "cavity darkening at seams and sockets"}, "wear": {"edgeWear": 0.15, "kind": "edge lightening at panel boundaries"}, "dirt": {"amount": 0.18, "kind": "streaking and cavity dirt"}, "localOverrides": [{"id": "nozzle-throat-dark", "name": "Throat darkening", "roughness": 0.8, "albedo": "rgba(96, 44, 32, 1.0)", "coverage": 0.3, "note": "Darkening toward the throat."}, {"id": "nozzle-rim-light", "name": "Exit rim", "roughness": 0.6, "albedo": "rgba(178, 96, 68, 1.0)", "coverage": 0.12, "note": "Lighter rim at the bell exit."}], "shaderNotes": ["Red-brown nozzle interior, observed directly in daylight. Not metal."], "notes": "Red-brown nozzle interior, observed directly in daylight. Not metal. Extracted #330B0F and #5D1D21 confirm a red-brown liner. Authored value is held lighter because the extracted crop is inside the shadowed bell.", "materialClass": "ceramic", "referenceMaterialId": "ceramic.glazed", "materialFamily": "ceramic", "materialSubtype": "glazed", "materialFinish": "glossy", "materialReference": {"registry": "C:\\Users\\rakaa\\Downloads\\files\\.claude\\skills\\img2threejs\\docs\\materials\\material-reference.json", "profileId": "ceramic.glazed", "method": "family-subtype-finish", "confidence": 0.789, "sourceRefs": ["three.mesh-physical", "adobe.pbr-guide-1", "google.filament-pbr"], "requiredMaps": ["map", "roughnessMap"], "optionalMaps": ["normalMap", "clearcoatMap", "clearcoatRoughnessMap"], "validationViews": ["neutral-studio", "grazing", "environment-reflection", "reference-beauty"]}, "clearcoat": {"base": 0.7, "variation": 0.0}, "clearcoatRoughness": {"base": 0.12, "variation": 0.0}, "ior": {"base": 1.5, "variation": 0.0}, "referencePbr": {"version": "1.0", "sourceImage": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\04-nozzle-liner.png", "extractor": "stage1_intake/extract_pbr_evidence.py", "method": "single-image pixel evidence with de-lighting estimate; not photogrammetry", "usable": true, "verdict": "pass", "confidence": 0.789, "estimatedFidelity": 0.789, "targetThreshold": 0.7, "hardLimit": "A single image cannot uniquely recover true albedo/roughness/normal/AO; maps are reference-derived estimates.", "maps": {"albedo": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\pbr-04-nozzle-liner\\nozzle-liner_albedo.png", "url": "nozzle-liner_albedo.png", "channel": "albedo", "source": "reference-pixel-extraction"}, "roughness": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\pbr-04-nozzle-liner\\nozzle-liner_roughness.png", "url": "nozzle-liner_roughness.png", "channel": "roughness", "source": "reference-pixel-extraction"}, "height": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\pbr-04-nozzle-liner\\nozzle-liner_height.png", "url": "nozzle-liner_height.png", "channel": "height", "source": "reference-pixel-extraction"}, "normal": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\pbr-04-nozzle-liner\\nozzle-liner_normal.png", "url": "nozzle-liner_normal.png", "channel": "normal", "source": "reference-pixel-extraction"}, "ao": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\pbr-04-nozzle-liner\\nozzle-liner_ao.png", "url": "nozzle-liner_ao.png", "channel": "ao", "source": "reference-pixel-extraction"}}, "diagnostics": {"sourceWidth": 16, "sourceHeight": 18, "mapSize": 512, "cropBBoxPixels": {"x": 0, "y": 0, "width": 16, "height": 18}, "mask": {"backgroundColor": "#2C171B", "backgroundNoise": 95.441, "transparentPixelFraction": 0.0, "foregroundCoverage": 0.9062}, "mapStats": {"valueRange": 0.3202, "heightP90Gradient": 0.05483, "roughnessBase": 0.707, "roughnessVariation": 0.097, "normalStrength": 0.221, "blurRadius": 10}, "palette": ["#330B0F", "#110807", "#5D1D21", "#992E39", "#70675D"]}, "warnings": ["image is not clearly isolated from background; using most pixels as material evidence", "object/background separation is weak", "single-image inverse rendering cannot prove true physical PBR; confidence is capped"]}, "textureAnalysis": {"finishClass": "painted-metal", "recipe": {"metalness": 0.0, "roughness": 0.5, "clearcoat": 1.0, "clearcoatRoughness": 0.05, "transmission": 0.0, "ior": 1.5, "envMapIntensity": 1.0, "anisotropy": 0.0, "procedural": "flat-clearcoat"}, "palette": ["#250D10", "#4B1218", "#72272D", "#3C1A1A", "#292B27"], "paletteHueRisk": [], "gradientAxis": "horizontal", "stats": {"meanLum": 47.8, "meanSaturation": 0.611, "gradientStrength": 0.289, "mottle": 0.018, "streakRatio": 1.16, "hueSpread": 0.107, "specularFraction": 0.0}}, "materialEvidence": {"componentId": "srb-stbd-nozzle", "regionId": "nozzle-liner", "crop": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\04-nozzle-liner.png", "bbox": {"x": 348, "y": 673, "width": 16, "height": 18}, "sourceWidth": 605, "sourceHeight": 896, "loaderWarnings": [], "coverage": 0.0005}, "observations": ["chromatic base-colour response", "strong image-space gradient; verify it is material pattern, not lighting", "single-image PBR inference requires controlled render validation"], "hypothesis": {"componentId": "srb-stbd-nozzle", "regionId": "nozzle-liner", "materialId": null, "family": "ceramic", "subtype": "glazed", "finish": "glossy", "aliases": [], "confidence": 0.789, "source": "vision"}, "alternatives": []}},
    options
  );
  materialMap["engine-metal"] = createSculptMaterial(
    "engine-metal",
    {"id": "engine-metal", "name": "Orbiter engine metal", "type": "standard", "shaderModel": "MeshStandardMaterial / PBR approximation", "baseColor": "#78787E", "color": "#78787E", "albedo": {"base": "#78787E", "source": "daylight sample, de-lit"}, "colorVariation": {"amount": 0.04, "kind": "per-face hue jitter"}, "textureResolution": 1024, "textureProjection": {"mode": "cylindrical-uv for bodies of revolution, planar-uv for wing and fin panels", "kind": "procedural-canvas", "texelDensity": "512 texels per metre of surface at the near LOD", "reason": "No image files are shipped; every map is drawn to a canvas at runtime so the page works offline."}, "surfaceFrequencyBands": [{"id": "macro", "feature": "panel and segment boundaries", "realization": "geometry", "frequency": 0.35, "amplitude": 0.08}, {"id": "meso", "feature": "linework, bands and decals", "realization": "canvas texture", "frequency": 4.0, "amplitude": 0.02}, {"id": "micro", "feature": "surface grain and soiling", "realization": "procedural noise", "frequency": 40.0, "amplitude": 0.004}], "roughness": {"base": 0.35, "variation": 0.08, "map": "engine-metal-roughness-canvas (independent channel: value noise plus seam darkening, authored on its own canvas and never derived from the colour channel)", "independentOfAlbedo": true, "source": "material class and observed finish"}, "metalness": {"base": 1.0, "variation": 0.0}, "normal": {"strength": 0.5, "kind": "procedural noise", "independentOfAlbedo": true}, "bump": {"strength": 0.2, "independentOfAlbedo": true}, "displacement": {"strength": 0.0, "note": "relief that affects silhouette is geometry"}, "ambientOcclusion": {"strength": 0.6, "kind": "cavity darkening at seams and sockets"}, "wear": {"edgeWear": 0.15, "kind": "edge lightening at panel boundaries"}, "dirt": {"amount": 0.18, "kind": "streaking and cavity dirt"}, "localOverrides": [{"id": "engine-rim", "name": "Nozzle exit rim", "roughness": 0.3, "metalness": 1.0, "albedo": "rgba(150, 150, 156, 1.0)", "coverage": 0.15, "note": "Polished rim."}, {"id": "engine-soot", "name": "Throat darkening", "roughness": 0.7, "albedo": "rgba(52, 52, 56, 1.0)", "coverage": 0.25, "note": "Darkening toward the throat."}], "shaderNotes": ["Metallic response. Only partly visible past the platform; declared inference."], "notes": "Metallic response. Only partly visible past the platform; declared inference.", "materialClass": "metal", "referenceMaterialId": "metal.steel-brushed", "materialFamily": "metal", "materialSubtype": "steel", "materialFinish": "brushed", "materialReference": {"registry": "C:\\Users\\rakaa\\Downloads\\files\\.claude\\skills\\img2threejs\\docs\\materials\\material-reference.json", "profileId": "metal.steel-brushed", "method": "family-subtype-finish", "confidence": 0.831, "sourceRefs": ["three.mesh-physical", "three.pmrem", "gltf.2", "khronos.gltf-pbr", "adobe.pbr-guide-2", "google.filament-pbr"], "requiredMaps": ["map", "roughnessMap", "normalMap", "anisotropyMap"], "optionalMaps": ["metalnessMap"], "validationViews": ["neutral-studio", "grazing", "environment-reflection", "reference-beauty"]}, "anisotropy": {"base": 0.85, "variation": 0.0}, "referencePbr": {"version": "1.0", "sourceImage": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\08-engine-bay.png", "extractor": "stage1_intake/extract_pbr_evidence.py", "method": "single-image pixel evidence with de-lighting estimate; not photogrammetry", "usable": true, "verdict": "pass", "confidence": 0.831, "estimatedFidelity": 0.831, "targetThreshold": 0.7, "hardLimit": "A single image cannot uniquely recover true albedo/roughness/normal/AO; maps are reference-derived estimates.", "maps": {"albedo": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\pbr-08-engine-bay\\engine-metal_albedo.png", "url": "engine-metal_albedo.png", "channel": "albedo", "source": "reference-pixel-extraction"}, "roughness": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\pbr-08-engine-bay\\engine-metal_roughness.png", "url": "engine-metal_roughness.png", "channel": "roughness", "source": "reference-pixel-extraction"}, "height": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\pbr-08-engine-bay\\engine-metal_height.png", "url": "engine-metal_height.png", "channel": "height", "source": "reference-pixel-extraction"}, "normal": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\pbr-08-engine-bay\\engine-metal_normal.png", "url": "engine-metal_normal.png", "channel": "normal", "source": "reference-pixel-extraction"}, "ao": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\pbr-08-engine-bay\\engine-metal_ao.png", "url": "engine-metal_ao.png", "channel": "ao", "source": "reference-pixel-extraction"}}, "diagnostics": {"sourceWidth": 25, "sourceHeight": 30, "mapSize": 512, "cropBBoxPixels": {"x": 0, "y": 0, "width": 25, "height": 30}, "mask": {"backgroundColor": "#6B6D6C", "backgroundNoise": 170.561, "transparentPixelFraction": 0.0, "foregroundCoverage": 0.3347}, "mapStats": {"valueRange": 0.1363, "heightP90Gradient": 0.04861, "roughnessBase": 0.681, "roughnessVariation": 0.086, "normalStrength": 0.213, "blurRadius": 10}, "palette": ["#0B0B0E", "#130F12", "#060607", "#21161A", "#34262C"]}, "warnings": ["single-image inverse rendering cannot prove true physical PBR; confidence is capped", "low value range weakens height/roughness inference"]}, "textureAnalysis": {"finishClass": "worn-composite", "recipe": {"metalness": 0.0, "roughness": 0.9, "clearcoat": 0.0, "clearcoatRoughness": 0.0, "transmission": 0.0, "ior": 1.5, "envMapIntensity": 0.5, "anisotropy": 0.0, "procedural": "mottle"}, "palette": ["#323434", "#110F10", "#757B7C", "#4A4448", "#504F4F"], "paletteHueRisk": [], "gradientAxis": "horizontal", "stats": {"meanLum": 66.7, "meanSaturation": 0.148, "gradientStrength": 0.426, "mottle": 0.036, "streakRatio": 2.19, "hueSpread": 0.58, "specularFraction": 0.0}}, "materialEvidence": {"componentId": "orb-engine-mount", "regionId": "engine-bay", "crop": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\08-engine-bay.png", "bbox": {"x": 315, "y": 660, "width": 25, "height": 30}, "sourceWidth": 605, "sourceHeight": 896, "loaderWarnings": [], "coverage": 0.0014}, "observations": ["near-neutral colour response", "directional surface frequency", "strong image-space gradient; verify it is material pattern, not lighting", "single-image PBR inference requires controlled render validation"], "hypothesis": {"componentId": "orb-engine-mount", "regionId": "engine-bay", "materialId": null, "family": "metal", "subtype": "steel", "finish": "brushed", "aliases": [], "confidence": 0.831, "source": "vision"}, "alternatives": []}, "needsEnvironment": true},
    options
  );
  materialMap["glass-window"] = createSculptMaterial(
    "glass-window",
    {"id": "glass-window", "name": "Cabin glazing", "type": "standard", "shaderModel": "MeshStandardMaterial / PBR approximation", "baseColor": "#1E242E", "color": "#1E242E", "albedo": {"base": "#1E242E", "source": "daylight sample, de-lit"}, "colorVariation": {"amount": 0.04, "kind": "per-face hue jitter"}, "textureResolution": 1024, "textureProjection": {"mode": "cylindrical-uv for bodies of revolution, planar-uv for wing and fin panels", "kind": "procedural-canvas", "texelDensity": "512 texels per metre of surface at the near LOD", "reason": "No image files are shipped; every map is drawn to a canvas at runtime so the page works offline."}, "surfaceFrequencyBands": [{"id": "macro", "feature": "panel and segment boundaries", "realization": "geometry", "frequency": 0.35, "amplitude": 0.08}, {"id": "meso", "feature": "linework, bands and decals", "realization": "canvas texture", "frequency": 4.0, "amplitude": 0.02}, {"id": "micro", "feature": "surface grain and soiling", "realization": "procedural noise", "frequency": 40.0, "amplitude": 0.004}], "roughness": {"base": 0.05, "variation": 0.08, "map": "glass-window-roughness-canvas (independent channel: value noise plus seam darkening, authored on its own canvas and never derived from the colour channel)", "independentOfAlbedo": true, "source": "material class and observed finish"}, "metalness": {"base": 0.0, "variation": 0.0}, "normal": {"strength": 0.5, "kind": "procedural noise", "independentOfAlbedo": true}, "bump": {"strength": 0.2, "independentOfAlbedo": true}, "displacement": {"strength": 0.0, "note": "relief that affects silhouette is geometry"}, "ambientOcclusion": {"strength": 0.6, "kind": "cavity darkening at seams and sockets"}, "wear": {"edgeWear": 0.15, "kind": "edge lightening at panel boundaries"}, "dirt": {"amount": 0.18, "kind": "streaking and cavity dirt"}, "localOverrides": [{"id": "window-reflection", "name": "Glazing reflection", "roughness": 0.08, "albedo": "rgba(122, 142, 162, 1.0)", "coverage": 0.4, "note": "Specular sheen across the panes."}], "shaderNotes": ["Dark reflective glazing.", "Extracted palette leads with #E1DCDA, which is the white frame around the panes, not the glazing. The crop is about 240 px and cannot separate them. Extracted albedo REJECTED; the authored value is kept and declared inference."], "notes": "Dark reflective glazing. Extracted palette leads with #E1DCDA, which is the white frame around the panes, not the glazing. The crop is about 240 px and cannot separate them. Extracted albedo REJECTED; the authored value is kept and declared inference.", "materialClass": "glass", "referenceMaterialId": "glass.clear", "materialFamily": "glass", "materialSubtype": "clear", "materialFinish": "polished", "materialReference": {"registry": "C:\\Users\\rakaa\\Downloads\\files\\.claude\\skills\\img2threejs\\docs\\materials\\material-reference.json", "profileId": "glass.clear", "method": "family-subtype-finish", "confidence": 0.86, "sourceRefs": ["three.mesh-physical", "three.pmrem", "gltf.2", "khronos.transmission", "khronos.volume", "google.filament-pbr"], "requiredMaps": ["roughnessMap", "thicknessMap"], "optionalMaps": ["map", "normalMap", "transmissionMap"], "validationViews": ["neutral-studio", "environment-reflection", "backlight-transmission", "reference-beauty"]}, "transmission": {"base": 1.0, "variation": 0.0}, "ior": {"base": 1.5, "variation": 0.0}, "referencePbr": {"version": "1.0", "sourceImage": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\07-glazing.png", "extractor": "stage1_intake/extract_pbr_evidence.py", "method": "single-image pixel evidence with de-lighting estimate; not photogrammetry", "usable": true, "verdict": "pass", "confidence": 0.86, "estimatedFidelity": 0.86, "targetThreshold": 0.7, "hardLimit": "A single image cannot uniquely recover true albedo/roughness/normal/AO; maps are reference-derived estimates.", "maps": {"albedo": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\pbr-07-glazing\\glass-window_albedo.png", "url": "glass-window_albedo.png", "channel": "albedo", "source": "reference-pixel-extraction"}, "roughness": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\pbr-07-glazing\\glass-window_roughness.png", "url": "glass-window_roughness.png", "channel": "roughness", "source": "reference-pixel-extraction"}, "height": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\pbr-07-glazing\\glass-window_height.png", "url": "glass-window_height.png", "channel": "height", "source": "reference-pixel-extraction"}, "normal": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\pbr-07-glazing\\glass-window_normal.png", "url": "glass-window_normal.png", "channel": "normal", "source": "reference-pixel-extraction"}, "ao": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\pbr-07-glazing\\glass-window_ao.png", "url": "glass-window_ao.png", "channel": "ao", "source": "reference-pixel-extraction"}}, "diagnostics": {"sourceWidth": 22, "sourceHeight": 11, "mapSize": 512, "cropBBoxPixels": {"x": 0, "y": 0, "width": 22, "height": 11}, "mask": {"backgroundColor": "#3E332E", "backgroundNoise": 107.131, "transparentPixelFraction": 0.0, "foregroundCoverage": 0.3884}, "mapStats": {"valueRange": 0.8681, "heightP90Gradient": 0.04956, "roughnessBase": 0.681, "roughnessVariation": 0.08, "normalStrength": 0.214, "blurRadius": 10}, "palette": ["#E1DCDA", "#30261F", "#FAF6F8", "#655849", "#C5B59D"]}, "warnings": ["single-image inverse rendering cannot prove true physical PBR; confidence is capped"]}, "textureAnalysis": {"finishClass": "brushed-steel", "recipe": {"metalness": 1.0, "roughness": 0.35, "clearcoat": 0.0, "clearcoatRoughness": 0.0, "transmission": 0.0, "ior": 1.5, "envMapIntensity": 1.0, "anisotropy": 1.0, "procedural": "brushed"}, "palette": ["#9A9798", "#A09C9D", "#868384", "#4D4848", "#B8A58C"], "paletteHueRisk": [], "gradientAxis": "horizontal", "stats": {"meanLum": 106.4, "meanSaturation": 0.112, "gradientStrength": 0.449, "mottle": 0.047, "streakRatio": 2.66, "hueSpread": 0.033, "specularFraction": 0.066}}, "materialEvidence": {"componentId": "micro-orb-windows", "regionId": "glazing", "crop": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\07-glazing.png", "bbox": {"x": 322, "y": 303, "width": 22, "height": 11}, "sourceWidth": 605, "sourceHeight": 896, "loaderWarnings": [], "coverage": 0.0004}, "observations": ["near-neutral colour response", "directional surface frequency", "visible meso/micro variation", "strong image-space gradient; verify it is material pattern, not lighting", "single-image PBR inference requires controlled render validation"], "hypothesis": {"componentId": "micro-orb-windows", "regionId": "glazing", "materialId": null, "family": "glass", "subtype": "clear", "finish": "polished", "aliases": [], "confidence": 0.86, "source": "vision"}, "alternatives": []}, "needsEnvironment": true},
    options
  );
  materialMap["marking-decal"] = createSculptMaterial(
    "marking-decal",
    {"id": "marking-decal", "name": "Markings", "type": "standard", "shaderModel": "MeshStandardMaterial / PBR approximation", "baseColor": "#141418", "color": "#141418", "albedo": {"base": "#141418", "source": "daylight sample, de-lit"}, "colorVariation": {"amount": 0.04, "kind": "per-face hue jitter"}, "textureResolution": 1024, "textureProjection": {"mode": "cylindrical-uv for bodies of revolution, planar-uv for wing and fin panels", "kind": "procedural-canvas", "texelDensity": "512 texels per metre of surface at the near LOD", "reason": "No image files are shipped; every map is drawn to a canvas at runtime so the page works offline."}, "surfaceFrequencyBands": [{"id": "macro", "feature": "panel and segment boundaries", "realization": "geometry", "frequency": 0.35, "amplitude": 0.08}, {"id": "meso", "feature": "linework, bands and decals", "realization": "canvas texture", "frequency": 4.0, "amplitude": 0.02}, {"id": "micro", "feature": "surface grain and soiling", "realization": "procedural noise", "frequency": 40.0, "amplitude": 0.004}], "roughness": {"base": 0.45, "variation": 0.08, "map": "marking-decal-roughness-canvas (independent channel: value noise plus seam darkening, authored on its own canvas and never derived from the colour channel)", "independentOfAlbedo": true, "source": "material class and observed finish"}, "metalness": {"base": 0.0, "variation": 0.0}, "normal": {"strength": 0.5, "kind": "procedural noise", "independentOfAlbedo": true}, "bump": {"strength": 0.2, "independentOfAlbedo": true}, "displacement": {"strength": 0.0, "note": "relief that affects silhouette is geometry"}, "ambientOcclusion": {"strength": 0.6, "kind": "cavity darkening at seams and sockets"}, "wear": {"edgeWear": 0.15, "kind": "edge lightening at panel boundaries"}, "dirt": {"amount": 0.18, "kind": "streaking and cavity dirt"}, "localOverrides": [{"id": "marking-flag-red", "name": "Flag red", "roughness": 0.7, "albedo": "rgba(178, 32, 44, 1.0)", "coverage": 0.3, "note": "Red bands of the flag."}, {"id": "marking-nasa-blue", "name": "NASA insignia blue", "roughness": 0.7, "albedo": "rgba(28, 48, 120, 1.0)", "coverage": 0.25, "note": "The insignia disc. Observed directly at this resolution."}], "shaderNotes": ["Insignia ink. Layout observed: NASA to port, flag and name to starboard."], "notes": "Insignia ink. Layout observed: NASA to port, flag and name to starboard. Extracted #1E2447 is the insignia blue. Corroborated, and this glyph was unreadable in the night frame.", "materialClass": "plastic", "referenceMaterialId": "coating.painted-metal", "materialFamily": "coating", "materialSubtype": "paint-over-metal", "materialFinish": "gloss-or-satin", "materialReference": {"registry": "C:\\Users\\rakaa\\Downloads\\files\\.claude\\skills\\img2threejs\\docs\\materials\\material-reference.json", "profileId": "coating.painted-metal", "method": "family-subtype-finish", "confidence": 0.819, "sourceRefs": ["three.mesh-physical", "gltf.2", "khronos.gltf-pbr", "adobe.pbr-guide-1", "adobe.pbr-guide-2"], "requiredMaps": ["map", "roughnessMap"], "optionalMaps": ["normalMap", "clearcoatMap", "clearcoatRoughnessMap", "metalnessMap"], "validationViews": ["albedo-unlit", "neutral-studio", "grazing", "environment-reflection", "reference-beauty"]}, "clearcoat": {"base": 0.75, "variation": 0.0}, "clearcoatRoughness": {"base": 0.12, "variation": 0.0}, "ior": {"base": 1.5, "variation": 0.0}, "referencePbr": {"version": "1.0", "sourceImage": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\05-insignia.png", "extractor": "stage1_intake/extract_pbr_evidence.py", "method": "single-image pixel evidence with de-lighting estimate; not photogrammetry", "usable": true, "verdict": "pass", "confidence": 0.819, "estimatedFidelity": 0.819, "targetThreshold": 0.7, "hardLimit": "A single image cannot uniquely recover true albedo/roughness/normal/AO; maps are reference-derived estimates.", "maps": {"albedo": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\pbr-05-insignia\\marking-decal_albedo.png", "url": "marking-decal_albedo.png", "channel": "albedo", "source": "reference-pixel-extraction"}, "roughness": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\pbr-05-insignia\\marking-decal_roughness.png", "url": "marking-decal_roughness.png", "channel": "roughness", "source": "reference-pixel-extraction"}, "height": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\pbr-05-insignia\\marking-decal_height.png", "url": "marking-decal_height.png", "channel": "height", "source": "reference-pixel-extraction"}, "normal": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\pbr-05-insignia\\marking-decal_normal.png", "url": "marking-decal_normal.png", "channel": "normal", "source": "reference-pixel-extraction"}, "ao": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\pbr-05-insignia\\marking-decal_ao.png", "url": "marking-decal_ao.png", "channel": "ao", "source": "reference-pixel-extraction"}}, "diagnostics": {"sourceWidth": 19, "sourceHeight": 20, "mapSize": 512, "cropBBoxPixels": {"x": 0, "y": 0, "width": 19, "height": 20}, "mask": {"backgroundColor": "#1D2645", "backgroundNoise": 194.6, "transparentPixelFraction": 0.0, "foregroundCoverage": 0.9289}, "mapStats": {"valueRange": 0.4388, "heightP90Gradient": 0.08922, "roughnessBase": 0.727, "roughnessVariation": 0.151, "normalStrength": 0.261, "blurRadius": 10}, "palette": ["#1E2447", "#0D1334", "#484664", "#2A1830", "#8B8DAC"]}, "warnings": ["image is not clearly isolated from background; using most pixels as material evidence", "object/background separation is weak", "single-image inverse rendering cannot prove true physical PBR; confidence is capped"]}, "textureAnalysis": {"finishClass": "painted-metal", "recipe": {"metalness": 0.0, "roughness": 0.5, "clearcoat": 1.0, "clearcoatRoughness": 0.05, "transmission": 0.0, "ior": 1.5, "envMapIntensity": 1.0, "anisotropy": 0.0, "procedural": "flat-clearcoat"}, "palette": ["#3C4763", "#1D2648", "#695F78", "#171638", "#212A4A"], "paletteHueRisk": [{"stop": "#3C4763", "hueRisk": "blue-collapse", "suggestedRgb": [99, 71, 60]}, {"stop": "#1D2648", "hueRisk": "blue-collapse", "suggestedRgb": [72, 38, 29]}, {"stop": "#695F78", "hueRisk": "blue-collapse", "suggestedRgb": [120, 95, 105]}, {"stop": "#171638", "hueRisk": "blue-collapse", "suggestedRgb": [56, 22, 23]}, {"stop": "#212A4A", "hueRisk": "blue-collapse", "suggestedRgb": [74, 42, 33]}], "gradientAxis": "vertical", "stats": {"meanLum": 54.7, "meanSaturation": 0.55, "gradientStrength": 0.296, "mottle": 0.035, "streakRatio": 1.02, "hueSpread": 0.07, "specularFraction": 0.0}}, "materialEvidence": {"componentId": "micro-orb-insignia", "regionId": "insignia", "crop": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\05-insignia.png", "bbox": {"x": 243, "y": 592, "width": 19, "height": 20}, "sourceWidth": 605, "sourceHeight": 896, "loaderWarnings": [], "coverage": 0.0007}, "observations": ["chromatic base-colour response", "strong image-space gradient; verify it is material pattern, not lighting", "single-image PBR inference requires controlled render validation"], "hypothesis": {"componentId": "micro-orb-insignia", "regionId": "insignia", "materialId": null, "family": "coating", "subtype": "paint-over-metal", "finish": "gloss-or-satin", "aliases": [], "confidence": 0.819, "source": "vision"}, "alternatives": []}},
    options
  );
  materialMap["patch-orange"] = createSculptMaterial(
    "patch-orange",
    {"id": "patch-orange", "name": "Booster frustum patch", "type": "standard", "shaderModel": "MeshStandardMaterial / PBR approximation", "baseColor": "#CE842C", "color": "#CE842C", "albedo": {"base": "#CE842C", "source": "daylight sample, de-lit"}, "colorVariation": {"amount": 0.04, "kind": "per-face hue jitter"}, "textureResolution": 1024, "textureProjection": {"mode": "cylindrical-uv for bodies of revolution, planar-uv for wing and fin panels", "kind": "procedural-canvas", "texelDensity": "512 texels per metre of surface at the near LOD", "reason": "No image files are shipped; every map is drawn to a canvas at runtime so the page works offline."}, "surfaceFrequencyBands": [{"id": "macro", "feature": "panel and segment boundaries", "realization": "geometry", "frequency": 0.35, "amplitude": 0.08}, {"id": "meso", "feature": "linework, bands and decals", "realization": "canvas texture", "frequency": 4.0, "amplitude": 0.02}, {"id": "micro", "feature": "surface grain and soiling", "realization": "procedural noise", "frequency": 40.0, "amplitude": 0.004}], "roughness": {"base": 0.45, "variation": 0.08, "map": "patch-orange-roughness-canvas (independent channel: value noise plus seam darkening, authored on its own canvas and never derived from the colour channel)", "independentOfAlbedo": true, "source": "material class and observed finish"}, "metalness": {"base": 0.0, "variation": 0.0}, "normal": {"strength": 0.5, "kind": "procedural noise", "independentOfAlbedo": true}, "bump": {"strength": 0.2, "independentOfAlbedo": true}, "displacement": {"strength": 0.0, "note": "relief that affects silhouette is geometry"}, "ambientOcclusion": {"strength": 0.6, "kind": "cavity darkening at seams and sockets"}, "wear": {"edgeWear": 0.15, "kind": "edge lightening at panel boundaries"}, "dirt": {"amount": 0.18, "kind": "streaking and cavity dirt"}, "localOverrides": [{"id": "patch-edge", "name": "Patch edge", "roughness": 0.72, "albedo": "rgba(168, 104, 34, 1.0)", "coverage": 0.2, "note": "Darker edge of the patch."}], "shaderNotes": ["Orange square patch on each booster frustum."], "notes": "Orange square patch on each booster frustum. Extracted #E59A44 agrees with the authored patch colour.", "materialClass": "plastic", "referenceMaterialId": "coating.painted-metal", "materialFamily": "coating", "materialSubtype": "paint-over-metal", "materialFinish": "gloss-or-satin", "materialReference": {"registry": "C:\\Users\\rakaa\\Downloads\\files\\.claude\\skills\\img2threejs\\docs\\materials\\material-reference.json", "profileId": "coating.painted-metal", "method": "family-subtype-finish", "confidence": 0.86, "sourceRefs": ["three.mesh-physical", "gltf.2", "khronos.gltf-pbr", "adobe.pbr-guide-1", "adobe.pbr-guide-2"], "requiredMaps": ["map", "roughnessMap"], "optionalMaps": ["normalMap", "clearcoatMap", "clearcoatRoughnessMap", "metalnessMap"], "validationViews": ["albedo-unlit", "neutral-studio", "grazing", "environment-reflection", "reference-beauty"]}, "clearcoat": {"base": 0.75, "variation": 0.0}, "clearcoatRoughness": {"base": 0.12, "variation": 0.0}, "ior": {"base": 1.5, "variation": 0.0}, "referencePbr": {"version": "1.0", "sourceImage": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\06-frustum-patch.png", "extractor": "stage1_intake/extract_pbr_evidence.py", "method": "single-image pixel evidence with de-lighting estimate; not photogrammetry", "usable": true, "verdict": "pass", "confidence": 0.86, "estimatedFidelity": 0.86, "targetThreshold": 0.7, "hardLimit": "A single image cannot uniquely recover true albedo/roughness/normal/AO; maps are reference-derived estimates.", "maps": {"albedo": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\pbr-06-frustum-patch\\patch-orange_albedo.png", "url": "patch-orange_albedo.png", "channel": "albedo", "source": "reference-pixel-extraction"}, "roughness": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\pbr-06-frustum-patch\\patch-orange_roughness.png", "url": "patch-orange_roughness.png", "channel": "roughness", "source": "reference-pixel-extraction"}, "height": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\pbr-06-frustum-patch\\patch-orange_height.png", "url": "patch-orange_height.png", "channel": "height", "source": "reference-pixel-extraction"}, "normal": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\pbr-06-frustum-patch\\patch-orange_normal.png", "url": "patch-orange_normal.png", "channel": "normal", "source": "reference-pixel-extraction"}, "ao": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\pbr-06-frustum-patch\\patch-orange_ao.png", "url": "patch-orange_ao.png", "channel": "ao", "source": "reference-pixel-extraction"}}, "diagnostics": {"sourceWidth": 15, "sourceHeight": 13, "mapSize": 512, "cropBBoxPixels": {"x": 0, "y": 0, "width": 15, "height": 13}, "mask": {"backgroundColor": "#F4E8D5", "backgroundNoise": 32.634, "transparentPixelFraction": 0.0, "foregroundCoverage": 0.7795}, "mapStats": {"valueRange": 0.3872, "heightP90Gradient": 0.06865, "roughnessBase": 0.696, "roughnessVariation": 0.128, "normalStrength": 0.237, "blurRadius": 10}, "palette": ["#E59A44", "#FAE3C0", "#BF8B48", "#D5862D", "#C29C68"]}, "warnings": ["single-image inverse rendering cannot prove true physical PBR; confidence is capped"]}, "textureAnalysis": {"finishClass": "painted-metal", "recipe": {"metalness": 0.0, "roughness": 0.5, "clearcoat": 1.0, "clearcoatRoughness": 0.05, "transmission": 0.0, "ior": 1.5, "envMapIntensity": 1.0, "anisotropy": 0.0, "procedural": "flat-clearcoat"}, "palette": ["#F9E0C4", "#D49C57", "#E2A359", "#D69B4D", "#F8E6C1"], "paletteHueRisk": [], "gradientAxis": "horizontal", "stats": {"meanLum": 176.8, "meanSaturation": 0.532, "gradientStrength": 0.308, "mottle": 0.014, "streakRatio": 1.87, "hueSpread": 0.001, "specularFraction": 0.122}}, "materialEvidence": {"componentId": "srb-stbd-frustum", "regionId": "frustum-patch", "crop": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_orbiter\\material-evidence\\06-frustum-patch.png", "bbox": {"x": 396, "y": 286, "width": 15, "height": 13}, "sourceWidth": 605, "sourceHeight": 896, "loaderWarnings": [], "coverage": 0.0004}, "observations": ["chromatic base-colour response", "strong image-space gradient; verify it is material pattern, not lighting", "single-image PBR inference requires controlled render validation"], "hypothesis": {"componentId": "srb-stbd-frustum", "regionId": "frustum-patch", "materialId": null, "family": "coating", "subtype": "paint-over-metal", "finish": "gloss-or-satin", "aliases": [], "confidence": 0.86, "source": "vision"}, "alternatives": []}},
    options
  );

  const nodes: Record<string, THREE.Object3D> = { root };
  const meshes: Record<string, THREE.Mesh> = {};
  const sockets: Record<string, THREE.Object3D> = {};
  const colliders: Record<string, unknown> = {};
  const destructionGroups: Record<string, THREE.Object3D[]> = {};

  const endpoint_root_0 = makeAttachmentEndpoint(null);
  const node_root_0 = new THREE.Group();
  node_root_0.name = "Launch stack assembly__pivot";
  node_root_0.scale.set(1, 1, 1);
  if (endpoint_root_0) {
    node_root_0.position.copy(endpoint_root_0.start);
    node_root_0.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_root_0.position.set(0.0, 0.0, 0.0);
    node_root_0.rotation.set(0.0, 0.0, 0.0);
  }
  node_root_0.userData.sculptComponent = {"id": "root", "name": "Launch stack assembly", "level": "macro", "role": "body", "importance": 1.0, "confidence": 0.95, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Container node only; the four macro bodies below own all geometry.", "geometryDescriptor": {}, "parent": null, "attachment": null, "dimensions": {"lengthX": 61.239999999999995, "widthZ": 26.04, "heightY": 13.6}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"pivot": {"x": 0.0, "y": 0.0, "z": 0.0}, "animationRole": "static-part", "clickable": true, "explodable": true, "sockets": []}, "material": "paint-white", "materialLayers": ["paint-white"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {}, "evidenceRefs": ["full-object", "zone-r0c1", "zone-r1c1", "zone-r2c1"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(228, 228, 224, 1.0)", "secondaryAlbedo": "rgba(198, 198, 192, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.8, "evidenceRefs": ["delight-albedo.json"], "notes": "Painted booster skin. Daylight, near-neutral illuminant, so close to albedo."}};
  node_root_0.userData.actionProfile = {"pivot": {"x": 0.0, "y": 0.0, "z": 0.0}, "animationRole": "static-part", "clickable": true, "explodable": true, "sockets": []};
  (nodes["root"] ?? root).add(node_root_0);
  nodes["root"] = node_root_0;
  const mesh_root_0Geometry = endpoint_root_0
    ? new THREE.CylinderGeometry(endpoint_root_0.endRadius, endpoint_root_0.baseRadius, endpoint_root_0.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_root_0) {
    mesh_root_0Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_root_0 = new THREE.Mesh(
    mesh_root_0Geometry,
    materialMap["paint-white"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_root_0.name = "Launch stack assembly";
  if (endpoint_root_0) {
    mesh_root_0.position.copy(endpoint_root_0.midpoint);
    mesh_root_0.quaternion.copy(endpoint_root_0.quaternion);
  }
  mesh_root_0.castShadow = options.castShadow ?? true;
  mesh_root_0.receiveShadow = options.receiveShadow ?? true;
  mesh_root_0.userData.sculptComponent = {"id": "root", "name": "Launch stack assembly", "level": "macro", "role": "body", "importance": 1.0, "confidence": 0.95, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Container node only; the four macro bodies below own all geometry.", "geometryDescriptor": {}, "parent": null, "attachment": null, "dimensions": {"lengthX": 61.239999999999995, "widthZ": 26.04, "heightY": 13.6}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"pivot": {"x": 0.0, "y": 0.0, "z": 0.0}, "animationRole": "static-part", "clickable": true, "explodable": true, "sockets": []}, "material": "paint-white", "materialLayers": ["paint-white"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {}, "evidenceRefs": ["full-object", "zone-r0c1", "zone-r1c1", "zone-r2c1"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(228, 228, 224, 1.0)", "secondaryAlbedo": "rgba(198, 198, 192, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.8, "evidenceRefs": ["delight-albedo.json"], "notes": "Painted booster skin. Daylight, near-neutral illuminant, so close to albedo."}};
  node_root_0.add(mesh_root_0);
  meshes["root"] = mesh_root_0;
  colliders["root"] = {};

  const attachment_et_1 = {"parentId": "root", "parentSocket": "root::et-mount", "localStart": [30.5, 0, 0], "localEnd": [-20.85, 0, 0], "contactType": "butt", "contactNormal": [1, 0, 0], "embedDepth": 0.06, "overlap": 0.06, "gapTolerance": 0.02};
  const endpoint_et_1 = makeAttachmentEndpoint(attachment_et_1);
  const node_et_1 = new THREE.Group();
  node_et_1.name = "External tank__pivot";
  node_et_1.scale.set(1, 1, 1);
  if (endpoint_et_1) {
    node_et_1.position.copy(endpoint_et_1.start);
    node_et_1.rotation.set(0, 0, 0);
  } else {
    node_et_1.position.set(4.824999999999999, 0.0, 0.0);
    node_et_1.rotation.set(0, 0, 0);
  }
  node_et_1.userData.sculptComponent = {"id": "et", "name": "External tank", "level": "macro", "role": "body", "importance": 0.95, "confidence": 0.92, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "Rigid axisymmetric shell. A surface of revolution, not an organic form.", "geometryDescriptor": {}, "parent": "root", "attachment": {"parentId": "root", "parentSocket": "root::et-mount", "localStart": [30.5, 0, 0], "localEnd": [-20.85, 0, 0], "contactType": "butt", "contactNormal": [1, 0, 0], "embedDepth": 0.06, "overlap": 0.06, "gapTolerance": 0.02}, "dimensions": {"radius": 4.6, "length": 51.35}, "transform": {"position": [4.824999999999999, 0, 0]}, "actionProfile": {"pivot": {"x": 30.5, "y": 0.0, "z": 0.0}, "clickable": true, "explodable": true, "sockets": [{"id": "et-fwd-attach", "position": [6.5, 4.6, 0]}, {"id": "et-aft-attach", "position": [-14.0, 4.6, 0]}, {"id": "et-srb-fwd-port", "position": [9.5, 0, -4.6]}, {"id": "et-srb-fwd-stbd", "position": [9.5, 0, 4.6]}], "animationRole": "static-part"}, "material": "foam-orange", "materialLayers": ["foam-orange"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "et-cable-tray-ridge", "name": "Cable tray ridge", "kind": "ridge", "description": "Raised conduit running the tank length with a visible fastener line, resolved in daylight.", "confidence": 0.85, "realization": "geometry"}], "surfaceDetail": {}, "evidenceRefs": ["full-object", "zone-r0c1", "zone-r1c1", "zone-r2c1"], "details": [], "fidelityTier": "structure", "colorMaterialRecipe": {"dominantAlbedo": "rgba(198, 136, 74, 1.0)", "secondaryAlbedo": "rgba(168, 108, 56, 1.0)", "materialClass": "plastic", "materialClassConfidence": 0.8, "evidenceRefs": ["delight-albedo.json"], "notes": "Daylight sample of the tank barrel, de-lit. Lighter and less saturated than the night frame implied, where the floodlight had pushed it deep."}};
  node_et_1.userData.actionProfile = {"pivot": {"x": 30.5, "y": 0.0, "z": 0.0}, "clickable": true, "explodable": true, "sockets": [{"id": "et-fwd-attach", "position": [6.5, 4.6, 0]}, {"id": "et-aft-attach", "position": [-14.0, 4.6, 0]}, {"id": "et-srb-fwd-port", "position": [9.5, 0, -4.6]}, {"id": "et-srb-fwd-stbd", "position": [9.5, 0, 4.6]}], "animationRole": "static-part"};
  (nodes["root"] ?? root).add(node_et_1);
  nodes["et"] = node_et_1;
  const mesh_et_1Geometry = endpoint_et_1
    ? new THREE.CylinderGeometry(endpoint_et_1.endRadius, endpoint_et_1.baseRadius, endpoint_et_1.length, 32, 12)
    : new THREE.CylinderGeometry(0.5, 0.5, 1, 48, 16);
  if (!endpoint_et_1) {
    mesh_et_1Geometry.scale(9.2, 51.35, 9.2);
  }
  const mesh_et_1 = new THREE.Mesh(
    mesh_et_1Geometry,
    materialMap["foam-orange"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_et_1.name = "External tank";
  if (endpoint_et_1) {
    mesh_et_1.position.copy(endpoint_et_1.midpoint);
    mesh_et_1.quaternion.copy(endpoint_et_1.quaternion);
  }
  mesh_et_1.castShadow = options.castShadow ?? true;
  mesh_et_1.receiveShadow = options.receiveShadow ?? true;
  mesh_et_1.userData.sculptComponent = {"id": "et", "name": "External tank", "level": "macro", "role": "body", "importance": 0.95, "confidence": 0.92, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "Rigid axisymmetric shell. A surface of revolution, not an organic form.", "geometryDescriptor": {}, "parent": "root", "attachment": {"parentId": "root", "parentSocket": "root::et-mount", "localStart": [30.5, 0, 0], "localEnd": [-20.85, 0, 0], "contactType": "butt", "contactNormal": [1, 0, 0], "embedDepth": 0.06, "overlap": 0.06, "gapTolerance": 0.02}, "dimensions": {"radius": 4.6, "length": 51.35}, "transform": {"position": [4.824999999999999, 0, 0]}, "actionProfile": {"pivot": {"x": 30.5, "y": 0.0, "z": 0.0}, "clickable": true, "explodable": true, "sockets": [{"id": "et-fwd-attach", "position": [6.5, 4.6, 0]}, {"id": "et-aft-attach", "position": [-14.0, 4.6, 0]}, {"id": "et-srb-fwd-port", "position": [9.5, 0, -4.6]}, {"id": "et-srb-fwd-stbd", "position": [9.5, 0, 4.6]}], "animationRole": "static-part"}, "material": "foam-orange", "materialLayers": ["foam-orange"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "et-cable-tray-ridge", "name": "Cable tray ridge", "kind": "ridge", "description": "Raised conduit running the tank length with a visible fastener line, resolved in daylight.", "confidence": 0.85, "realization": "geometry"}], "surfaceDetail": {}, "evidenceRefs": ["full-object", "zone-r0c1", "zone-r1c1", "zone-r2c1"], "details": [], "fidelityTier": "structure", "colorMaterialRecipe": {"dominantAlbedo": "rgba(198, 136, 74, 1.0)", "secondaryAlbedo": "rgba(168, 108, 56, 1.0)", "materialClass": "plastic", "materialClassConfidence": 0.8, "evidenceRefs": ["delight-albedo.json"], "notes": "Daylight sample of the tank barrel, de-lit. Lighter and less saturated than the night frame implied, where the floodlight had pushed it deep."}};
  node_et_1.add(mesh_et_1);
  meshes["et"] = mesh_et_1;
  colliders["et"] = {};
  const socket_et_et_fwd_attach_0 = new THREE.Object3D();
  socket_et_et_fwd_attach_0.name = "et-fwd-attach";
  socket_et_et_fwd_attach_0.position.set(6.5, 4.6, 0.0);
  socket_et_et_fwd_attach_0.rotation.set(0, 0, 0);
  socket_et_et_fwd_attach_0.userData.socket = {"id": "et-fwd-attach", "position": [6.5, 4.6, 0]};
  node_et_1.add(socket_et_et_fwd_attach_0);
  sockets["et:et-fwd-attach"] = socket_et_et_fwd_attach_0;
  const socket_et_et_aft_attach_1 = new THREE.Object3D();
  socket_et_et_aft_attach_1.name = "et-aft-attach";
  socket_et_et_aft_attach_1.position.set(-14.0, 4.6, 0.0);
  socket_et_et_aft_attach_1.rotation.set(0, 0, 0);
  socket_et_et_aft_attach_1.userData.socket = {"id": "et-aft-attach", "position": [-14.0, 4.6, 0]};
  node_et_1.add(socket_et_et_aft_attach_1);
  sockets["et:et-aft-attach"] = socket_et_et_aft_attach_1;
  const socket_et_et_srb_fwd_port_2 = new THREE.Object3D();
  socket_et_et_srb_fwd_port_2.name = "et-srb-fwd-port";
  socket_et_et_srb_fwd_port_2.position.set(9.5, 0.0, -4.6);
  socket_et_et_srb_fwd_port_2.rotation.set(0, 0, 0);
  socket_et_et_srb_fwd_port_2.userData.socket = {"id": "et-srb-fwd-port", "position": [9.5, 0, -4.6]};
  node_et_1.add(socket_et_et_srb_fwd_port_2);
  sockets["et:et-srb-fwd-port"] = socket_et_et_srb_fwd_port_2;
  const socket_et_et_srb_fwd_stbd_3 = new THREE.Object3D();
  socket_et_et_srb_fwd_stbd_3.name = "et-srb-fwd-stbd";
  socket_et_et_srb_fwd_stbd_3.position.set(9.5, 0.0, 4.6);
  socket_et_et_srb_fwd_stbd_3.rotation.set(0, 0, 0);
  socket_et_et_srb_fwd_stbd_3.userData.socket = {"id": "et-srb-fwd-stbd", "position": [9.5, 0, 4.6]};
  node_et_1.add(socket_et_et_srb_fwd_stbd_3);
  sockets["et:et-srb-fwd-stbd"] = socket_et_et_srb_fwd_stbd_3;

  const attachment_srb_port_2 = {"parentId": "root", "parentSocket": "root::srb-port-mount", "localStart": [19.05, 0, -7.0], "localEnd": [-30.74, 0, -7.0], "contactType": "butt", "contactNormal": [1, 0, 0], "embedDepth": 0.06, "overlap": 0.06, "gapTolerance": 0.02};
  const endpoint_srb_port_2 = makeAttachmentEndpoint(attachment_srb_port_2);
  const node_srb_port_2 = new THREE.Group();
  node_srb_port_2.name = "Solid rocket booster (port)__pivot";
  node_srb_port_2.scale.set(1, 1, 1);
  if (endpoint_srb_port_2) {
    node_srb_port_2.position.copy(endpoint_srb_port_2.start);
    node_srb_port_2.rotation.set(0, 0, 0);
  } else {
    node_srb_port_2.position.set(-5.844999999999999, 0.0, -7.0);
    node_srb_port_2.rotation.set(0, 0, 0);
  }
  node_srb_port_2.userData.sculptComponent = {"id": "srb-port", "name": "Solid rocket booster (port)", "level": "macro", "role": "body", "importance": 0.9, "confidence": 0.9, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "Rigid axisymmetric case built from stacked constant-radius segments.", "geometryDescriptor": {}, "parent": "root", "attachment": {"parentId": "root", "parentSocket": "root::srb-port-mount", "localStart": [19.05, 0, -7.0], "localEnd": [-30.74, 0, -7.0], "contactType": "butt", "contactNormal": [1, 0, 0], "embedDepth": 0.06, "overlap": 0.06, "gapTolerance": 0.02}, "dimensions": {"radius": 2.032, "length": 49.79}, "transform": {"position": [-5.844999999999999, 0, -7.0]}, "actionProfile": {"pivot": {"x": 19.05, "y": 0.0, "z": -7.0}, "clickable": true, "explodable": true, "sockets": [{"id": "srb-port-fwd-attach", "position": [9.5, 0, -5.04]}], "animationRole": "static-part"}, "material": "paint-white", "materialLayers": ["paint-white"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "srb-port-ring-bands", "name": "Black ring bands", "kind": "linework", "description": "Two black bands around the booster, one below the frustum and one lower.", "confidence": 0.9, "realization": "material-override"}, {"id": "srb-port-frustum-patch", "name": "Frustum patch", "kind": "decal", "description": "Orange square patch below the upper black band.", "confidence": 0.8, "realization": "material-override"}], "surfaceDetail": {}, "evidenceRefs": ["full-object", "zone-r0c1", "zone-r1c1"], "details": [], "fidelityTier": "structure", "colorMaterialRecipe": {"dominantAlbedo": "rgba(228, 228, 224, 1.0)", "secondaryAlbedo": "rgba(198, 198, 192, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.8, "evidenceRefs": ["delight-albedo.json"], "notes": "Painted booster skin. Daylight, near-neutral illuminant, so close to albedo."}};
  node_srb_port_2.userData.actionProfile = {"pivot": {"x": 19.05, "y": 0.0, "z": -7.0}, "clickable": true, "explodable": true, "sockets": [{"id": "srb-port-fwd-attach", "position": [9.5, 0, -5.04]}], "animationRole": "static-part"};
  (nodes["root"] ?? root).add(node_srb_port_2);
  nodes["srb-port"] = node_srb_port_2;
  const mesh_srb_port_2Geometry = endpoint_srb_port_2
    ? new THREE.CylinderGeometry(endpoint_srb_port_2.endRadius, endpoint_srb_port_2.baseRadius, endpoint_srb_port_2.length, 32, 12)
    : new THREE.CylinderGeometry(0.5, 0.5, 1, 48, 16);
  if (!endpoint_srb_port_2) {
    mesh_srb_port_2Geometry.scale(4.064, 49.79, 4.064);
  }
  const mesh_srb_port_2 = new THREE.Mesh(
    mesh_srb_port_2Geometry,
    materialMap["paint-white"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_srb_port_2.name = "Solid rocket booster (port)";
  if (endpoint_srb_port_2) {
    mesh_srb_port_2.position.copy(endpoint_srb_port_2.midpoint);
    mesh_srb_port_2.quaternion.copy(endpoint_srb_port_2.quaternion);
  }
  mesh_srb_port_2.castShadow = options.castShadow ?? true;
  mesh_srb_port_2.receiveShadow = options.receiveShadow ?? true;
  mesh_srb_port_2.userData.sculptComponent = {"id": "srb-port", "name": "Solid rocket booster (port)", "level": "macro", "role": "body", "importance": 0.9, "confidence": 0.9, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "Rigid axisymmetric case built from stacked constant-radius segments.", "geometryDescriptor": {}, "parent": "root", "attachment": {"parentId": "root", "parentSocket": "root::srb-port-mount", "localStart": [19.05, 0, -7.0], "localEnd": [-30.74, 0, -7.0], "contactType": "butt", "contactNormal": [1, 0, 0], "embedDepth": 0.06, "overlap": 0.06, "gapTolerance": 0.02}, "dimensions": {"radius": 2.032, "length": 49.79}, "transform": {"position": [-5.844999999999999, 0, -7.0]}, "actionProfile": {"pivot": {"x": 19.05, "y": 0.0, "z": -7.0}, "clickable": true, "explodable": true, "sockets": [{"id": "srb-port-fwd-attach", "position": [9.5, 0, -5.04]}], "animationRole": "static-part"}, "material": "paint-white", "materialLayers": ["paint-white"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "srb-port-ring-bands", "name": "Black ring bands", "kind": "linework", "description": "Two black bands around the booster, one below the frustum and one lower.", "confidence": 0.9, "realization": "material-override"}, {"id": "srb-port-frustum-patch", "name": "Frustum patch", "kind": "decal", "description": "Orange square patch below the upper black band.", "confidence": 0.8, "realization": "material-override"}], "surfaceDetail": {}, "evidenceRefs": ["full-object", "zone-r0c1", "zone-r1c1"], "details": [], "fidelityTier": "structure", "colorMaterialRecipe": {"dominantAlbedo": "rgba(228, 228, 224, 1.0)", "secondaryAlbedo": "rgba(198, 198, 192, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.8, "evidenceRefs": ["delight-albedo.json"], "notes": "Painted booster skin. Daylight, near-neutral illuminant, so close to albedo."}};
  node_srb_port_2.add(mesh_srb_port_2);
  meshes["srb-port"] = mesh_srb_port_2;
  colliders["srb-port"] = {};
  const socket_srb_port_srb_port_fwd_attach_0 = new THREE.Object3D();
  socket_srb_port_srb_port_fwd_attach_0.name = "srb-port-fwd-attach";
  socket_srb_port_srb_port_fwd_attach_0.position.set(9.5, 0.0, -5.04);
  socket_srb_port_srb_port_fwd_attach_0.rotation.set(0, 0, 0);
  socket_srb_port_srb_port_fwd_attach_0.userData.socket = {"id": "srb-port-fwd-attach", "position": [9.5, 0, -5.04]};
  node_srb_port_2.add(socket_srb_port_srb_port_fwd_attach_0);
  sockets["srb-port:srb-port-fwd-attach"] = socket_srb_port_srb_port_fwd_attach_0;

  const attachment_srb_stbd_3 = {"parentId": "root", "parentSocket": "root::srb-stbd-mount", "localStart": [19.05, 0, 7.0], "localEnd": [-30.74, 0, 7.0], "contactType": "butt", "contactNormal": [1, 0, 0], "embedDepth": 0.06, "overlap": 0.06, "gapTolerance": 0.02};
  const endpoint_srb_stbd_3 = makeAttachmentEndpoint(attachment_srb_stbd_3);
  const node_srb_stbd_3 = new THREE.Group();
  node_srb_stbd_3.name = "Solid rocket booster (stbd)__pivot";
  node_srb_stbd_3.scale.set(1, 1, 1);
  if (endpoint_srb_stbd_3) {
    node_srb_stbd_3.position.copy(endpoint_srb_stbd_3.start);
    node_srb_stbd_3.rotation.set(0, 0, 0);
  } else {
    node_srb_stbd_3.position.set(-5.844999999999999, 0.0, 7.0);
    node_srb_stbd_3.rotation.set(0, 0, 0);
  }
  node_srb_stbd_3.userData.sculptComponent = {"id": "srb-stbd", "name": "Solid rocket booster (stbd)", "level": "macro", "role": "body", "importance": 0.9, "confidence": 0.9, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "Rigid axisymmetric case built from stacked constant-radius segments.", "geometryDescriptor": {}, "parent": "root", "attachment": {"parentId": "root", "parentSocket": "root::srb-stbd-mount", "localStart": [19.05, 0, 7.0], "localEnd": [-30.74, 0, 7.0], "contactType": "butt", "contactNormal": [1, 0, 0], "embedDepth": 0.06, "overlap": 0.06, "gapTolerance": 0.02}, "dimensions": {"radius": 2.032, "length": 49.79}, "transform": {"position": [-5.844999999999999, 0, 7.0]}, "actionProfile": {"pivot": {"x": 19.05, "y": 0.0, "z": 7.0}, "clickable": true, "explodable": true, "sockets": [{"id": "srb-stbd-fwd-attach", "position": [9.5, 0, 5.04]}], "animationRole": "static-part"}, "material": "paint-white", "materialLayers": ["paint-white"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "srb-stbd-ring-bands", "name": "Black ring bands", "kind": "linework", "description": "Two black bands around the booster, one below the frustum and one lower.", "confidence": 0.9, "realization": "material-override"}, {"id": "srb-stbd-frustum-patch", "name": "Frustum patch", "kind": "decal", "description": "Orange square patch below the upper black band.", "confidence": 0.8, "realization": "material-override"}], "surfaceDetail": {}, "evidenceRefs": ["full-object", "zone-r0c1", "zone-r1c1"], "details": [], "fidelityTier": "structure", "colorMaterialRecipe": {"dominantAlbedo": "rgba(228, 228, 224, 1.0)", "secondaryAlbedo": "rgba(198, 198, 192, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.8, "evidenceRefs": ["delight-albedo.json"], "notes": "Painted booster skin. Daylight, near-neutral illuminant, so close to albedo."}};
  node_srb_stbd_3.userData.actionProfile = {"pivot": {"x": 19.05, "y": 0.0, "z": 7.0}, "clickable": true, "explodable": true, "sockets": [{"id": "srb-stbd-fwd-attach", "position": [9.5, 0, 5.04]}], "animationRole": "static-part"};
  (nodes["root"] ?? root).add(node_srb_stbd_3);
  nodes["srb-stbd"] = node_srb_stbd_3;
  const mesh_srb_stbd_3Geometry = endpoint_srb_stbd_3
    ? new THREE.CylinderGeometry(endpoint_srb_stbd_3.endRadius, endpoint_srb_stbd_3.baseRadius, endpoint_srb_stbd_3.length, 32, 12)
    : new THREE.CylinderGeometry(0.5, 0.5, 1, 48, 16);
  if (!endpoint_srb_stbd_3) {
    mesh_srb_stbd_3Geometry.scale(4.064, 49.79, 4.064);
  }
  const mesh_srb_stbd_3 = new THREE.Mesh(
    mesh_srb_stbd_3Geometry,
    materialMap["paint-white"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_srb_stbd_3.name = "Solid rocket booster (stbd)";
  if (endpoint_srb_stbd_3) {
    mesh_srb_stbd_3.position.copy(endpoint_srb_stbd_3.midpoint);
    mesh_srb_stbd_3.quaternion.copy(endpoint_srb_stbd_3.quaternion);
  }
  mesh_srb_stbd_3.castShadow = options.castShadow ?? true;
  mesh_srb_stbd_3.receiveShadow = options.receiveShadow ?? true;
  mesh_srb_stbd_3.userData.sculptComponent = {"id": "srb-stbd", "name": "Solid rocket booster (stbd)", "level": "macro", "role": "body", "importance": 0.9, "confidence": 0.9, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "Rigid axisymmetric case built from stacked constant-radius segments.", "geometryDescriptor": {}, "parent": "root", "attachment": {"parentId": "root", "parentSocket": "root::srb-stbd-mount", "localStart": [19.05, 0, 7.0], "localEnd": [-30.74, 0, 7.0], "contactType": "butt", "contactNormal": [1, 0, 0], "embedDepth": 0.06, "overlap": 0.06, "gapTolerance": 0.02}, "dimensions": {"radius": 2.032, "length": 49.79}, "transform": {"position": [-5.844999999999999, 0, 7.0]}, "actionProfile": {"pivot": {"x": 19.05, "y": 0.0, "z": 7.0}, "clickable": true, "explodable": true, "sockets": [{"id": "srb-stbd-fwd-attach", "position": [9.5, 0, 5.04]}], "animationRole": "static-part"}, "material": "paint-white", "materialLayers": ["paint-white"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "srb-stbd-ring-bands", "name": "Black ring bands", "kind": "linework", "description": "Two black bands around the booster, one below the frustum and one lower.", "confidence": 0.9, "realization": "material-override"}, {"id": "srb-stbd-frustum-patch", "name": "Frustum patch", "kind": "decal", "description": "Orange square patch below the upper black band.", "confidence": 0.8, "realization": "material-override"}], "surfaceDetail": {}, "evidenceRefs": ["full-object", "zone-r0c1", "zone-r1c1"], "details": [], "fidelityTier": "structure", "colorMaterialRecipe": {"dominantAlbedo": "rgba(228, 228, 224, 1.0)", "secondaryAlbedo": "rgba(198, 198, 192, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.8, "evidenceRefs": ["delight-albedo.json"], "notes": "Painted booster skin. Daylight, near-neutral illuminant, so close to albedo."}};
  node_srb_stbd_3.add(mesh_srb_stbd_3);
  meshes["srb-stbd"] = mesh_srb_stbd_3;
  colliders["srb-stbd"] = {};
  const socket_srb_stbd_srb_stbd_fwd_attach_0 = new THREE.Object3D();
  socket_srb_stbd_srb_stbd_fwd_attach_0.name = "srb-stbd-fwd-attach";
  socket_srb_stbd_srb_stbd_fwd_attach_0.position.set(9.5, 0.0, 5.04);
  socket_srb_stbd_srb_stbd_fwd_attach_0.rotation.set(0, 0, 0);
  socket_srb_stbd_srb_stbd_fwd_attach_0.userData.socket = {"id": "srb-stbd-fwd-attach", "position": [9.5, 0, 5.04]};
  node_srb_stbd_3.add(socket_srb_stbd_srb_stbd_fwd_attach_0);
  sockets["srb-stbd:srb-stbd-fwd-attach"] = socket_srb_stbd_srb_stbd_fwd_attach_0;

  const endpoint_orb_4 = makeAttachmentEndpoint(null);
  const node_orb_4 = new THREE.Group();
  node_orb_4.name = "Orbiter__pivot";
  node_orb_4.scale.set(1, 1, 1);
  if (endpoint_orb_4) {
    node_orb_4.position.copy(endpoint_orb_4.start);
    node_orb_4.rotation.set(0, 0, 0);
  } else {
    node_orb_4.position.set(-8.015, 7.6, 0.0);
    node_orb_4.rotation.set(0, 0, 0);
  }
  node_orb_4.userData.sculptComponent = {"id": "orb", "name": "Orbiter", "level": "macro", "role": "body", "importance": 1.0, "confidence": 0.88, "primitive": "extrude", "topologyClass": "continuous-sculpt", "topologyRationale": "A lofted fuselage whose cross-section changes continuously from a slender nose to a flat-bottomed mid body.", "geometryDescriptor": {"loftStations": 12, "crossSection": "rounded-square-to-flat-bottom", "radialSegments": 28}, "parent": "root", "attachment": {"parentId": "root", "parentSocket": "root::orb-mount", "localStart": [12.379999999999999, 7.6, 0], "localEnd": [-28.41, 7.6, 0], "contactType": "butt", "contactNormal": [1, 0, 0], "embedDepth": 0.06, "overlap": 0.06, "gapTolerance": 0.02}, "dimensions": {"length": 40.79, "span": 26.04, "height": 4.6}, "transform": {"position": [-8.015, 7.6, 0]}, "actionProfile": {"pivot": {"x": 12.38, "y": 7.6, "z": 0.0}, "clickable": true, "explodable": true, "sockets": [{"id": "orb-fwd-attach", "position": [6.5, -2.0, 0]}, {"id": "orb-aft-attach", "position": [-14.0, -2.2, 0]}, {"id": "orb-wing-root-port", "position": [-12.0, -0.6, -1.9]}, {"id": "orb-wing-root-stbd", "position": [-12.0, -0.6, 1.9]}, {"id": "orb-fin-root", "position": [-19.0, 2.1, 0]}], "animationRole": "static-part"}, "material": "tile-white", "materialLayers": ["tile-white"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "orb-tile-boundary", "name": "Upper and lower insulation boundary", "kind": "linework", "description": "Hard boundary between the light upper surface and the dark lower surface, running the fuselage length and converging toward the nose. Visible as a dark line down each side.", "confidence": 0.85, "realization": "material-override"}, {"id": "orb-soiling", "name": "Surface soiling", "kind": "stain", "description": "Grey streaking and staining across the white. The surface is used, not clean.", "confidence": 0.75, "realization": "material-override"}], "surfaceDetail": {}, "evidenceRefs": ["full-object", "zone-r0c1", "zone-r1c1", "zone-r2c1"], "details": [], "fidelityTier": "structure", "colorMaterialRecipe": {"dominantAlbedo": "rgba(226, 224, 218, 1.0)", "secondaryAlbedo": "rgba(186, 184, 178, 1.0)", "materialClass": "ceramic", "materialClassConfidence": 0.8, "evidenceRefs": ["delight-albedo.json"], "notes": "Orbiter upper-surface insulation. Visibly soiled: grey streaking, not clean white."}};
  node_orb_4.userData.actionProfile = {"pivot": {"x": 12.38, "y": 7.6, "z": 0.0}, "clickable": true, "explodable": true, "sockets": [{"id": "orb-fwd-attach", "position": [6.5, -2.0, 0]}, {"id": "orb-aft-attach", "position": [-14.0, -2.2, 0]}, {"id": "orb-wing-root-port", "position": [-12.0, -0.6, -1.9]}, {"id": "orb-wing-root-stbd", "position": [-12.0, -0.6, 1.9]}, {"id": "orb-fin-root", "position": [-19.0, 2.1, 0]}], "animationRole": "static-part"};
  (nodes["root"] ?? root).add(node_orb_4);
  nodes["orb"] = node_orb_4;
  const mesh_orb_4Geometry = endpoint_orb_4
    ? new THREE.CylinderGeometry(endpoint_orb_4.endRadius, endpoint_orb_4.baseRadius, endpoint_orb_4.length, 32, 12)
    : buildExtrudeGeometry({"points": [[-0.3, -0.3], [0.3, -0.3], [0.3, 0.3], [-0.3, 0.3]], "depth": 0.1});
  if (!endpoint_orb_4) {
    mesh_orb_4Geometry.scale(1.0, 4.6, 1.0);
  }
  const mesh_orb_4 = new THREE.Mesh(
    mesh_orb_4Geometry,
    materialMap["tile-white"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_orb_4.name = "Orbiter";
  if (endpoint_orb_4) {
    mesh_orb_4.position.copy(endpoint_orb_4.midpoint);
    mesh_orb_4.quaternion.copy(endpoint_orb_4.quaternion);
  }
  mesh_orb_4.castShadow = options.castShadow ?? true;
  mesh_orb_4.receiveShadow = options.receiveShadow ?? true;
  mesh_orb_4.userData.sculptComponent = {"id": "orb", "name": "Orbiter", "level": "macro", "role": "body", "importance": 1.0, "confidence": 0.88, "primitive": "extrude", "topologyClass": "continuous-sculpt", "topologyRationale": "A lofted fuselage whose cross-section changes continuously from a slender nose to a flat-bottomed mid body.", "geometryDescriptor": {"loftStations": 12, "crossSection": "rounded-square-to-flat-bottom", "radialSegments": 28}, "parent": "root", "attachment": {"parentId": "root", "parentSocket": "root::orb-mount", "localStart": [12.379999999999999, 7.6, 0], "localEnd": [-28.41, 7.6, 0], "contactType": "butt", "contactNormal": [1, 0, 0], "embedDepth": 0.06, "overlap": 0.06, "gapTolerance": 0.02}, "dimensions": {"length": 40.79, "span": 26.04, "height": 4.6}, "transform": {"position": [-8.015, 7.6, 0]}, "actionProfile": {"pivot": {"x": 12.38, "y": 7.6, "z": 0.0}, "clickable": true, "explodable": true, "sockets": [{"id": "orb-fwd-attach", "position": [6.5, -2.0, 0]}, {"id": "orb-aft-attach", "position": [-14.0, -2.2, 0]}, {"id": "orb-wing-root-port", "position": [-12.0, -0.6, -1.9]}, {"id": "orb-wing-root-stbd", "position": [-12.0, -0.6, 1.9]}, {"id": "orb-fin-root", "position": [-19.0, 2.1, 0]}], "animationRole": "static-part"}, "material": "tile-white", "materialLayers": ["tile-white"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "orb-tile-boundary", "name": "Upper and lower insulation boundary", "kind": "linework", "description": "Hard boundary between the light upper surface and the dark lower surface, running the fuselage length and converging toward the nose. Visible as a dark line down each side.", "confidence": 0.85, "realization": "material-override"}, {"id": "orb-soiling", "name": "Surface soiling", "kind": "stain", "description": "Grey streaking and staining across the white. The surface is used, not clean.", "confidence": 0.75, "realization": "material-override"}], "surfaceDetail": {}, "evidenceRefs": ["full-object", "zone-r0c1", "zone-r1c1", "zone-r2c1"], "details": [], "fidelityTier": "structure", "colorMaterialRecipe": {"dominantAlbedo": "rgba(226, 224, 218, 1.0)", "secondaryAlbedo": "rgba(186, 184, 178, 1.0)", "materialClass": "ceramic", "materialClassConfidence": 0.8, "evidenceRefs": ["delight-albedo.json"], "notes": "Orbiter upper-surface insulation. Visibly soiled: grey streaking, not clean white."}};
  node_orb_4.add(mesh_orb_4);
  meshes["orb"] = mesh_orb_4;
  colliders["orb"] = {};
  const socket_orb_orb_fwd_attach_0 = new THREE.Object3D();
  socket_orb_orb_fwd_attach_0.name = "orb-fwd-attach";
  socket_orb_orb_fwd_attach_0.position.set(6.5, -2.0, 0.0);
  socket_orb_orb_fwd_attach_0.rotation.set(0, 0, 0);
  socket_orb_orb_fwd_attach_0.userData.socket = {"id": "orb-fwd-attach", "position": [6.5, -2.0, 0]};
  node_orb_4.add(socket_orb_orb_fwd_attach_0);
  sockets["orb:orb-fwd-attach"] = socket_orb_orb_fwd_attach_0;
  const socket_orb_orb_aft_attach_1 = new THREE.Object3D();
  socket_orb_orb_aft_attach_1.name = "orb-aft-attach";
  socket_orb_orb_aft_attach_1.position.set(-14.0, -2.2, 0.0);
  socket_orb_orb_aft_attach_1.rotation.set(0, 0, 0);
  socket_orb_orb_aft_attach_1.userData.socket = {"id": "orb-aft-attach", "position": [-14.0, -2.2, 0]};
  node_orb_4.add(socket_orb_orb_aft_attach_1);
  sockets["orb:orb-aft-attach"] = socket_orb_orb_aft_attach_1;
  const socket_orb_orb_wing_root_port_2 = new THREE.Object3D();
  socket_orb_orb_wing_root_port_2.name = "orb-wing-root-port";
  socket_orb_orb_wing_root_port_2.position.set(-12.0, -0.6, -1.9);
  socket_orb_orb_wing_root_port_2.rotation.set(0, 0, 0);
  socket_orb_orb_wing_root_port_2.userData.socket = {"id": "orb-wing-root-port", "position": [-12.0, -0.6, -1.9]};
  node_orb_4.add(socket_orb_orb_wing_root_port_2);
  sockets["orb:orb-wing-root-port"] = socket_orb_orb_wing_root_port_2;
  const socket_orb_orb_wing_root_stbd_3 = new THREE.Object3D();
  socket_orb_orb_wing_root_stbd_3.name = "orb-wing-root-stbd";
  socket_orb_orb_wing_root_stbd_3.position.set(-12.0, -0.6, 1.9);
  socket_orb_orb_wing_root_stbd_3.rotation.set(0, 0, 0);
  socket_orb_orb_wing_root_stbd_3.userData.socket = {"id": "orb-wing-root-stbd", "position": [-12.0, -0.6, 1.9]};
  node_orb_4.add(socket_orb_orb_wing_root_stbd_3);
  sockets["orb:orb-wing-root-stbd"] = socket_orb_orb_wing_root_stbd_3;
  const socket_orb_orb_fin_root_4 = new THREE.Object3D();
  socket_orb_orb_fin_root_4.name = "orb-fin-root";
  socket_orb_orb_fin_root_4.position.set(-19.0, 2.1, 0.0);
  socket_orb_orb_fin_root_4.rotation.set(0, 0, 0);
  socket_orb_orb_fin_root_4.userData.socket = {"id": "orb-fin-root", "position": [-19.0, 2.1, 0]};
  node_orb_4.add(socket_orb_orb_fin_root_4);
  sockets["orb:orb-fin-root"] = socket_orb_orb_fin_root_4;

  root.userData.sculptRuntime = { nodes, meshes, sockets, colliders, destructionGroups } satisfies ProceduralModelRuntime;
  root.userData.lookDevTargets = {"qualityPriority": "reference-fidelity", "materialPass": {"albedoPaletteRequired": true, "roughnessVariationRequired": true, "normalOrBumpRequired": true, "localOverridesRequired": true, "minimumTextureResolution": 1024, "preferredTextureResolution": 2048, "independentMapChannels": ["albedo", "roughness", "height", "normal", "ambient-occlusion"], "requiredSurfaceFrequencyBands": ["macro", "meso", "micro"], "geometryReliefRequiredWhenSilhouetteAffected": true, "referencePbrExtraction": {"requiredWhenSourceImagePresent": true, "targetThreshold": 0.7, "stopOnLowConfidence": true, "script": "forge/stage1_intake/extract_pbr_evidence.py", "acceptedLimitation": "single-image extraction is reference-derived inference, not exact photogrammetry"}, "mustAvoid": ["single flat albedo per material", "uniform roughness", "albedo texture reused as roughness/height/normal/AO", "single-frequency random noise", "plastic-looking smooth bark, stone, cloth, foliage, or aged material", "local color/detail described only in prose without material masks", "claiming exact PBR recovery when confidence is below the target threshold"]}, "lightingPass": {"requiredTerms": ["key light", "fill light", "rim or environment light", "exposure", "tone mapping", "background", "contact shadow"], "mustAvoid": ["ambient-only lighting", "flat value range", "missing contact shadow", "reference lighting copied without separating material readability"]}, "screenshotReview": ["Compare albedo palette and local color zones.", "Compare roughness/normal/bump response under light.", "Compare cavity dirt, edge wear, stains, moss, scratches, or other local masks.", "Compare key/fill/rim structure, exposure, tone mapping, background, and contact shadows.", "Capture a neutral-light render to verify material readability without reference lighting.", "Capture a grazing-light close-up to expose flat normals, uniform roughness, tiling, and plastic highlights.", "Capture a reference-matched render from the same camera framing as the source."]};
  root.userData.actionReadiness = {
    note: 'Use root.userData.sculptRuntime.nodes for transforms, sockets for attachments, colliders for physics proxies, and destructionGroups for breakable sets.',
  };
  return root;
}

export function createSpaceShuttleDiscoveryLaunchStackDaylightPadLookDevLights(
  mode: 'neutral' | 'grazing' | 'reference' = 'neutral',
): THREE.Group {
  const lights = new THREE.Group();
  lights.name = "Space Shuttle Discovery launch stack (daylight pad) look-dev lights";
  const hemi = new THREE.HemisphereLight(
    mode === 'reference' ? 0xfff0d6 : 0xf2f4ff,
    0x363b42,
    mode === 'grazing' ? 0.28 : mode === 'reference' ? 0.72 : 0.85,
  );
  lights.add(hemi);
  const key = new THREE.DirectionalLight(
    mode === 'reference' ? 0xffcf8a : 0xfff4e8,
    mode === 'grazing' ? 4.2 : mode === 'reference' ? 2.6 : 2.15,
  );
  if (mode === 'grazing') key.position.set(7.5, 1.1, 4.0);
  else if (mode === 'reference') key.position.set(-4.5, 7.5, 5.0);
  else key.position.set(-4.0, 6.0, 5.5);
  key.castShadow = true;
  key.shadow.mapSize.set(4096, 4096);
  key.shadow.bias = -0.00025;
  key.shadow.normalBias = 0.018;
  key.shadow.radius = 7;
  key.shadow.blurSamples = 24;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 30;
  key.shadow.camera.left = -2.6;
  key.shadow.camera.right = 2.6;
  key.shadow.camera.top = 2.6;
  key.shadow.camera.bottom = -2.6;
  key.shadow.camera.updateProjectionMatrix();
  lights.add(key);
  const fill = new THREE.DirectionalLight(0xa8c4ff, mode === 'grazing' ? 0.12 : 0.42);
  fill.position.set(4.0, 3.0, 3.5);
  lights.add(fill);
  const rim = new THREE.DirectionalLight(0xfff1c4, mode === 'grazing' ? 0.28 : 0.85);
  rim.position.set(0.5, 4.5, -6.0);
  lights.add(rim);
  lights.userData.reviewMode = mode;
  lights.userData.lightingFromPhoto = [{"id": "key", "kind": "directional", "intensity": 1.0, "colorTemperatureK": 5600, "directionHint": [-0.35, -0.55, 0.75], "evidence": "Overcast-bright daylight from high and slightly to one side; shadows are soft and the shaded sides still carry detail, unlike the night frame."}, {"id": "fill", "kind": "hemisphere", "intensity": 0.55, "colorTemperatureK": 7000, "evidence": "Strong sky fill. Measurable here, where the night frame had almost none."}, {"id": "rim", "kind": "directional", "intensity": 0.3, "colorTemperatureK": 6200, "directionHint": [0.6, 0.2, -0.75], "evidence": "Weak separation light off the sea haze."}, {"id": "exposure", "kind": "tone-mapping", "exposure": 1.0, "toneMapping": "ACESFilmic", "outputColorSpace": "sRGB", "evidence": "Daylight reference is not clipped, so exposure can be matched rather than invented."}, {"id": "contact-shadow", "kind": "shadow", "shadowType": "soft ground shadow", "groundContact": "The stack is shown free-standing on the page, so a soft elliptical ground shadow anchors it. In the reference the platform provides that contact.", "bias": -0.0005, "radius": 3.0}, {"id": "ambient", "kind": "ambient", "intensity": 0.22, "evidence": "Kept low; the hemisphere fill already carries the sky contribution."}];
  lights.userData.lookDevTargets = {"qualityPriority": "reference-fidelity", "materialPass": {"albedoPaletteRequired": true, "roughnessVariationRequired": true, "normalOrBumpRequired": true, "localOverridesRequired": true, "minimumTextureResolution": 1024, "preferredTextureResolution": 2048, "independentMapChannels": ["albedo", "roughness", "height", "normal", "ambient-occlusion"], "requiredSurfaceFrequencyBands": ["macro", "meso", "micro"], "geometryReliefRequiredWhenSilhouetteAffected": true, "referencePbrExtraction": {"requiredWhenSourceImagePresent": true, "targetThreshold": 0.7, "stopOnLowConfidence": true, "script": "forge/stage1_intake/extract_pbr_evidence.py", "acceptedLimitation": "single-image extraction is reference-derived inference, not exact photogrammetry"}, "mustAvoid": ["single flat albedo per material", "uniform roughness", "albedo texture reused as roughness/height/normal/AO", "single-frequency random noise", "plastic-looking smooth bark, stone, cloth, foliage, or aged material", "local color/detail described only in prose without material masks", "claiming exact PBR recovery when confidence is below the target threshold"]}, "lightingPass": {"requiredTerms": ["key light", "fill light", "rim or environment light", "exposure", "tone mapping", "background", "contact shadow"], "mustAvoid": ["ambient-only lighting", "flat value range", "missing contact shadow", "reference lighting copied without separating material readability"]}, "screenshotReview": ["Compare albedo palette and local color zones.", "Compare roughness/normal/bump response under light.", "Compare cavity dirt, edge wear, stains, moss, scratches, or other local masks.", "Compare key/fill/rim structure, exposure, tone mapping, background, and contact shadows.", "Capture a neutral-light render to verify material readability without reference lighting.", "Capture a grazing-light close-up to expose flat normals, uniform roughness, tiling, and plastic highlights.", "Capture a reference-matched render from the same camera framing as the source."]};
  return lights;
}

// PBR materials (clearcoat/iridescence/transmission/anisotropy) need an environment
// map to visually behave as intended — call this once per renderer and assign the
// result to scene.environment before rendering. No external HDR asset required.
export function createSpaceShuttleDiscoveryLaunchStackDaylightPadEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const texture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  return texture;
}

// Plan 1.3 §3.2 — auto-framing by bounding box. The Divine Eye can only compare a
// render to the reference if the object is FRAMED consistently (an object framed
// differently scores as wrong even when its shape is right). This positions the camera
// deterministically from the object's bounding box so it fills the frame at a stable
// margin, and sets near/far to the object scale. Call after adding the model to the
// scene, and again on resize (after updating camera.aspect).
export function frameSpaceShuttleDiscoveryLaunchStackDaylightPadCamera(
  camera: THREE.PerspectiveCamera,
  object: THREE.Object3D,
  options: { margin?: number; azimuthDeg?: number; elevationDeg?: number } = {},
): void {
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return;
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const margin = options.margin ?? 1.15;
  const maxDim = Math.max(size.x, size.y, size.z) * margin;
  const fov = (camera.fov * Math.PI) / 180;
  // distance so the largest object dimension fits vertically in the frame
  const distance = (maxDim / 2) / Math.tan(fov / 2);
  const az = ((options.azimuthDeg ?? 0) * Math.PI) / 180;
  const el = ((options.elevationDeg ?? 0) * Math.PI) / 180;
  const dir = new THREE.Vector3(
    Math.sin(az) * Math.cos(el),
    Math.sin(el),
    Math.cos(az) * Math.cos(el),
  );
  camera.position.copy(center).addScaledVector(dir, distance);
  camera.near = Math.max(0.01, distance - maxDim);
  camera.far = distance + maxDim * 2;
  camera.lookAt(center);
  camera.updateProjectionMatrix();
}

// Plan 1.3 §3.2c — PRESENTATION composer (DOF + bloom). CRITICAL (R-POSTFX): this is
// for the showcase/hero render ONLY. The Divine Eye's EVALUATION render MUST use a
// plain renderer with NO composer — bloom blows highlights and DOF blurs edges, which
// would corrupt the deterministic IoU/DCD/edge/blowout signals. Enable dof/bloom ONLY
// when the reference photo actually exhibits them (detect_reference_effects.py authorizes).
export function createSpaceShuttleDiscoveryLaunchStackDaylightPadPresentationComposer(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  options: { dof?: boolean; bloom?: boolean; bloomStrength?: number; dofFocus?: number; dofAperture?: number } = {},
): EffectComposer {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  if (options.dof) {
    composer.addPass(new BokehPass(scene, camera, {
      focus: options.dofFocus ?? 10.0,
      aperture: options.dofAperture ?? 0.0002,
      maxblur: 0.01,
    }));
  }
  if (options.bloom) {
    const size = new THREE.Vector2();
    renderer.getSize(size);
    composer.addPass(new UnrealBloomPass(size, options.bloomStrength ?? 0.4, 0.4, 0.85));
  }
  return composer;
}

export function configureSpaceShuttleDiscoveryLaunchStackDaylightPadRenderer(renderer: THREE.WebGLRenderer): void {
  // Load-bearing for view-dependent finishes (anodized / Doppler): without ACES + sRGB
  // the environment reflection reads flat/washed instead of a believable metal response.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
}

export function createSpaceShuttleDiscoveryLaunchStackDaylightPadInspectControls(
  camera: THREE.Camera,
  domElement: HTMLElement,
): OrbitControls {
  // View-dependent finishes only read correctly once the user orbits — their color
  // comes from the environment reflection, not albedo, so free rotation matters here.
  const controls = new OrbitControls(camera, domElement);
  controls.enableDamping = true;
  controls.minDistance = 1.0;
  controls.maxDistance = 8.0;
  controls.autoRotate = false;
  return controls;
}
