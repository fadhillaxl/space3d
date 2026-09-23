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

// Generated from ObjectSculptSpec target: Space Shuttle launch stack (Discovery on pad)
// Sculpt build pass: blockout
// This factory is intentionally pass-gated. Finish browser screenshot review before unlocking deeper passes.
export function createSpaceShuttleLaunchStackDiscoveryOnPadModel(options: ProceduralModelOptions = {}): THREE.Group {
  const root = new THREE.Group();
  root.name = "Space Shuttle launch stack (Discovery on pad)";
  root.userData.reconstructionEvidence = {"itemFamily": null, "subtype": null, "componentAdapter": null, "route": null, "exactnessTier": null, "referenceCamera": {"solved": false, "fovDegrees": 40.0, "aspect": 1.0, "orientation": {"yaw": 0.0, "pitch": 0.0, "roll": 0.0}, "positionHint": [0.0, 0.0, 3.0], "note": "For likeness work, solve the reference camera (forge/stage1_intake/solve_camera_pose.py) so the review render aligns with the photo and the reference can be projected. Confirm by overlay review."}, "approximationNotes": []};
  root.userData.materialPipeline = {"schemaVersion": 1, "status": "proceed", "registry": "C:\\Users\\rakaa\\Downloads\\files\\.claude\\skills\\img2threejs\\docs\\materials\\material-reference.json", "analysisArtifact": "C:\\Users\\rakaa\\Downloads\\files\\_shuttle\\material-analysis.json", "targetThreshold": 0.7, "unresolvedNotObservedMaterials": [], "regions": [{"componentId": "et-lox-barrel", "regionId": "foam", "specMaterialId": "foam-orange", "profileId": "plastic.matte", "status": "proceed"}, {"componentId": "srb-port-case", "regionId": "paint", "specMaterialId": "paint-white", "profileId": "coating.painted-metal", "status": "proceed"}, {"componentId": "orb-mid-fuselage", "regionId": "light-insulation", "specMaterialId": "tile-white", "profileId": "ceramic.glazed", "status": "proceed"}, {"componentId": "orb-fwd-fuselage", "regionId": "dark-insulation", "specMaterialId": "tile-black", "profileId": "ceramic.glazed", "status": "proceed"}, {"componentId": "orb-engine-mount", "regionId": "nozzle-metal", "specMaterialId": "metal-nozzle", "profileId": "metal.steel-brushed", "status": "proceed"}, {"componentId": "micro-orb-windows", "regionId": "glazing", "specMaterialId": "glass-window", "profileId": "glass.clear", "status": "proceed"}, {"componentId": "micro-orb-markings", "regionId": "decal", "specMaterialId": "marking-decal", "profileId": "coating.painted-metal", "status": "proceed"}], "controlledViewsRequired": ["albedo-unlit", "backlight-transmission", "environment-reflection", "grazing", "neutral-studio", "reference-beauty"]};
  root.userData.materialReferenceRegistry = "C:\\Users\\rakaa\\Downloads\\files\\.claude\\skills\\img2threejs\\docs\\materials\\material-reference.json";

  const materialMap: Record<string, THREE.Material> = {};
  materialMap["foam-orange"] = createSculptMaterial(
    "foam-orange",
    {"id": "foam-orange", "name": "Sprayed insulation foam", "type": "standard", "shaderModel": "MeshStandardMaterial / PBR approximation", "baseColor": "#B25A30", "color": "#B25A30", "albedo": {"base": "#B25A30", "source": "white-patch de-lighting of the reference"}, "colorVariation": {"amount": 0.04, "kind": "per-face hue jitter"}, "textureResolution": 1024, "textureProjection": {"mode": "cylindrical-uv for bodies of revolution, planar-uv for wing and fin panels", "kind": "procedural-canvas", "texelDensity": "512 texels per metre of surface at the near LOD", "reason": "No image files are shipped; every map is drawn to a canvas at runtime so the page works offline."}, "surfaceFrequencyBands": [{"id": "macro", "feature": "panel and segment boundaries", "realization": "geometry", "frequency": 0.35, "amplitude": 0.08}, {"id": "meso", "feature": "linework and joint rings", "realization": "canvas texture", "frequency": 4.0, "amplitude": 0.02}, {"id": "micro", "feature": "surface grain", "realization": "procedural noise in the normal channel", "frequency": 40.0, "amplitude": 0.004}], "roughness": {"base": 0.68, "variation": 0.08, "map": "foam-orange-roughness-canvas (independent channel: value noise plus seam darkening, authored on its own canvas and never derived from the colour channel)", "independentOfAlbedo": true, "source": "material class and finish observation; absolute value not measurable at this resolution"}, "metalness": {"base": 0.0, "variation": 0.0}, "normal": {"strength": 0.5, "kind": "procedural noise", "independentOfAlbedo": true}, "bump": {"strength": 0.2, "independentOfAlbedo": true}, "displacement": {"strength": 0.0, "note": "not used; relief that affects silhouette is geometry"}, "ambientOcclusion": {"strength": 0.6, "kind": "cavity darkening at seams and sockets"}, "wear": {"edgeWear": 0.15, "kind": "edge lightening at panel boundaries"}, "dirt": {"amount": 0.1, "kind": "cavity dirt in seams"}, "localOverrides": [{"id": "foam-weld-streak", "name": "Weld and spray streaking", "roughness": 0.95, "albedo": "rgba(139, 66, 34, 1.0)", "coverage": 0.2, "note": "Longitudinal streaks where spray passes overlap."}, {"id": "foam-scorch", "name": "Ogive tip darkening", "roughness": 0.9, "albedo": "rgba(120, 58, 30, 1.0)", "coverage": 0.06, "note": "Slight darkening at the nose tip. Inference: not separable from shading in the reference."}], "shaderNotes": ["Matte dielectric. Hue from two agreeing de-lit samples; sprayed relief in the normal channel only."], "notes": "Matte dielectric. Hue from two agreeing de-lit samples; sprayed relief in the normal channel only.", "materialClass": "plastic", "referenceMaterialId": "plastic.matte", "materialFamily": "plastic", "materialSubtype": "generic-polymer", "materialFinish": "matte", "materialReference": {"registry": "C:\\Users\\rakaa\\Downloads\\files\\.claude\\skills\\img2threejs\\docs\\materials\\material-reference.json", "profileId": "plastic.matte", "method": "family-subtype-finish", "confidence": 0.829, "sourceRefs": ["three.mesh-standard", "adobe.pbr-guide-1", "google.filament-pbr", "mit.material-recognition"], "requiredMaps": ["map", "roughnessMap"], "optionalMaps": ["normalMap", "aoMap"], "validationViews": ["albedo-unlit", "neutral-studio", "grazing"]}, "ior": {"base": 1.5, "variation": 0.0}, "referencePbr": {"version": "1.0", "sourceImage": "C:\\Users\\rakaa\\Downloads\\files\\_shuttle\\material-evidence\\00-foam.png", "extractor": "stage1_intake/extract_pbr_evidence.py", "method": "single-image pixel evidence with de-lighting estimate; not photogrammetry", "usable": true, "verdict": "pass", "confidence": 0.829, "estimatedFidelity": 0.829, "targetThreshold": 0.7, "hardLimit": "A single image cannot uniquely recover true albedo/roughness/normal/AO; maps are reference-derived estimates.", "maps": {"albedo": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_shuttle\\material-evidence\\pbr-00-foam\\foam-orange_albedo.png", "url": "foam-orange_albedo.png", "channel": "albedo", "source": "reference-pixel-extraction"}, "roughness": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_shuttle\\material-evidence\\pbr-00-foam\\foam-orange_roughness.png", "url": "foam-orange_roughness.png", "channel": "roughness", "source": "reference-pixel-extraction"}, "height": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_shuttle\\material-evidence\\pbr-00-foam\\foam-orange_height.png", "url": "foam-orange_height.png", "channel": "height", "source": "reference-pixel-extraction"}, "normal": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_shuttle\\material-evidence\\pbr-00-foam\\foam-orange_normal.png", "url": "foam-orange_normal.png", "channel": "normal", "source": "reference-pixel-extraction"}, "ao": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_shuttle\\material-evidence\\pbr-00-foam\\foam-orange_ao.png", "url": "foam-orange_ao.png", "channel": "ao", "source": "reference-pixel-extraction"}}, "diagnostics": {"sourceWidth": 28, "sourceHeight": 50, "mapSize": 512, "cropBBoxPixels": {"x": 0, "y": 0, "width": 28, "height": 50}, "mask": {"backgroundColor": "#92441D", "backgroundNoise": 66.88, "transparentPixelFraction": 0.0, "foregroundCoverage": 0.9821}, "mapStats": {"valueRange": 0.803, "heightP90Gradient": 0.03542, "roughnessBase": 0.698, "roughnessVariation": 0.06, "normalStrength": 0.198, "blurRadius": 10}, "palette": ["#853A18", "#5B2215", "#B06525", "#230B0A", "#DFD7D5"]}, "warnings": ["image is not clearly isolated from background; using most pixels as material evidence", "object/background separation is weak", "single-image inverse rendering cannot prove true physical PBR; confidence is capped"], "albedoAccepted": true, "note": "Extracted palette agrees with the independent white-patch de-lighting, so the authored albedo is corroborated rather than replaced."}, "textureAnalysis": {"finishClass": "painted-metal", "recipe": {"metalness": 0.0, "roughness": 0.5, "clearcoat": 1.0, "clearcoatRoughness": 0.05, "transmission": 0.0, "ior": 1.5, "envMapIntensity": 1.0, "anisotropy": 0.0, "procedural": "flat-clearcoat"}, "palette": ["#8B3F18", "#93461B", "#5F2515", "#4B241A", "#AB8575"], "paletteHueRisk": [], "gradientAxis": "vertical", "stats": {"meanLum": 82.3, "meanSaturation": 0.714, "gradientStrength": 0.423, "mottle": 0.019, "streakRatio": 0.58, "hueSpread": 0.018, "specularFraction": 0.002}}, "materialEvidence": {"componentId": "et-lox-barrel", "regionId": "foam", "crop": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_shuttle\\material-evidence\\00-foam.png", "bbox": {"x": 220, "y": 170, "width": 28, "height": 50}, "sourceWidth": 400, "sourceHeight": 492, "loaderWarnings": [], "coverage": 0.0071}, "observations": ["chromatic base-colour response", "strong image-space gradient; verify it is material pattern, not lighting", "single-image PBR inference requires controlled render validation"], "hypothesis": {"componentId": "et-lox-barrel", "regionId": "foam", "materialId": null, "family": "plastic", "subtype": "generic-polymer", "finish": "matte", "aliases": [], "confidence": 0.829, "source": "vision"}, "alternatives": []}},
    options
  );
  materialMap["paint-white"] = createSculptMaterial(
    "paint-white",
    {"id": "paint-white", "name": "Painted metal skin", "type": "standard", "shaderModel": "MeshStandardMaterial / PBR approximation", "baseColor": "#E8E8E4", "color": "#E8E8E4", "albedo": {"base": "#E8E8E4", "source": "white-patch de-lighting of the reference"}, "colorVariation": {"amount": 0.04, "kind": "per-face hue jitter"}, "textureResolution": 1024, "textureProjection": {"mode": "cylindrical-uv for bodies of revolution, planar-uv for wing and fin panels", "kind": "procedural-canvas", "texelDensity": "512 texels per metre of surface at the near LOD", "reason": "No image files are shipped; every map is drawn to a canvas at runtime so the page works offline."}, "surfaceFrequencyBands": [{"id": "macro", "feature": "panel and segment boundaries", "realization": "geometry", "frequency": 0.35, "amplitude": 0.08}, {"id": "meso", "feature": "linework and joint rings", "realization": "canvas texture", "frequency": 4.0, "amplitude": 0.02}, {"id": "micro", "feature": "surface grain", "realization": "procedural noise in the normal channel", "frequency": 40.0, "amplitude": 0.004}], "roughness": {"base": 0.45, "variation": 0.08, "map": "paint-white-roughness-canvas (independent channel: value noise plus seam darkening, authored on its own canvas and never derived from the colour channel)", "independentOfAlbedo": true, "source": "material class and finish observation; absolute value not measurable at this resolution"}, "metalness": {"base": 0.0, "variation": 0.0}, "normal": {"strength": 0.5, "kind": "procedural noise", "independentOfAlbedo": true}, "bump": {"strength": 0.2, "independentOfAlbedo": true}, "displacement": {"strength": 0.0, "note": "not used; relief that affects silhouette is geometry"}, "ambientOcclusion": {"strength": 0.6, "kind": "cavity darkening at seams and sockets"}, "wear": {"edgeWear": 0.15, "kind": "edge lightening at panel boundaries"}, "dirt": {"amount": 0.1, "kind": "cavity dirt in seams"}, "localOverrides": [{"id": "paint-ring-shadow", "name": "Joint ring shading", "roughness": 0.7, "albedo": "rgba(206, 206, 201, 1.0)", "coverage": 0.1, "note": "Darkening in the joint-ring grooves."}, {"id": "paint-case-patch", "name": "Case surface patch", "roughness": 0.66, "albedo": "rgba(96, 96, 98, 1.0)", "coverage": 0.03, "note": "The dark rectangular patch observed on both booster cases."}], "shaderNotes": ["Matte-to-satin painted skin on the boosters and struts."], "notes": "Matte-to-satin painted skin on the boosters and struts.", "materialClass": "metal", "referenceMaterialId": "coating.painted-metal", "materialFamily": "coating", "materialSubtype": "paint-over-metal", "materialFinish": "gloss-or-satin", "materialReference": {"registry": "C:\\Users\\rakaa\\Downloads\\files\\.claude\\skills\\img2threejs\\docs\\materials\\material-reference.json", "profileId": "coating.painted-metal", "method": "family-subtype-finish", "confidence": 0.804, "sourceRefs": ["three.mesh-physical", "gltf.2", "khronos.gltf-pbr", "adobe.pbr-guide-1", "adobe.pbr-guide-2"], "requiredMaps": ["map", "roughnessMap"], "optionalMaps": ["normalMap", "clearcoatMap", "clearcoatRoughnessMap", "metalnessMap"], "validationViews": ["albedo-unlit", "neutral-studio", "grazing", "environment-reflection", "reference-beauty"]}, "clearcoat": {"base": 0.75, "variation": 0.0}, "clearcoatRoughness": {"base": 0.12, "variation": 0.0}, "ior": {"base": 1.5, "variation": 0.0}, "referencePbr": {"version": "1.0", "sourceImage": "C:\\Users\\rakaa\\Downloads\\files\\_shuttle\\material-evidence\\01-paint.png", "extractor": "stage1_intake/extract_pbr_evidence.py", "method": "single-image pixel evidence with de-lighting estimate; not photogrammetry", "usable": true, "verdict": "pass", "confidence": 0.804, "estimatedFidelity": 0.804, "targetThreshold": 0.7, "hardLimit": "A single image cannot uniquely recover true albedo/roughness/normal/AO; maps are reference-derived estimates.", "maps": {"albedo": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_shuttle\\material-evidence\\pbr-01-paint\\paint-white_albedo.png", "url": "paint-white_albedo.png", "channel": "albedo", "source": "reference-pixel-extraction"}, "roughness": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_shuttle\\material-evidence\\pbr-01-paint\\paint-white_roughness.png", "url": "paint-white_roughness.png", "channel": "roughness", "source": "reference-pixel-extraction"}, "height": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_shuttle\\material-evidence\\pbr-01-paint\\paint-white_height.png", "url": "paint-white_height.png", "channel": "height", "source": "reference-pixel-extraction"}, "normal": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_shuttle\\material-evidence\\pbr-01-paint\\paint-white_normal.png", "url": "paint-white_normal.png", "channel": "normal", "source": "reference-pixel-extraction"}, "ao": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_shuttle\\material-evidence\\pbr-01-paint\\paint-white_ao.png", "url": "paint-white_ao.png", "channel": "ao", "source": "reference-pixel-extraction"}}, "diagnostics": {"sourceWidth": 18, "sourceHeight": 38, "mapSize": 512, "cropBBoxPixels": {"x": 0, "y": 0, "width": 18, "height": 38}, "mask": {"backgroundColor": "#B4B5B3", "backgroundNoise": 24.617, "transparentPixelFraction": 0.0, "foregroundCoverage": 0.2018}, "mapStats": {"valueRange": 0.4765, "heightP90Gradient": 0.00481, "roughnessBase": 0.68, "roughnessVariation": 0.05, "normalStrength": 0.162, "blurRadius": 10}, "palette": ["#D8D9DB", "#DBDDDE", "#D6DBDC", "#E0E1E3", "#6B6769"]}, "warnings": ["single-image inverse rendering cannot prove true physical PBR; confidence is capped", "low high-frequency detail weakens normal/roughness inference"], "albedoAccepted": true, "note": "Extracted palette agrees with the independent white-patch de-lighting, so the authored albedo is corroborated rather than replaced."}, "textureAnalysis": {"finishClass": "brushed-steel", "recipe": {"metalness": 1.0, "roughness": 0.35, "clearcoat": 0.0, "clearcoatRoughness": 0.0, "transmission": 0.0, "ior": 1.5, "envMapIntensity": 1.0, "anisotropy": 1.0, "procedural": "brushed"}, "palette": ["#CBCDCE", "#9D9C9C", "#BFC1C0", "#BDC0BF", "#BCBCBA"], "paletteHueRisk": [], "gradientAxis": "vertical", "stats": {"meanLum": 191.2, "meanSaturation": 0.023, "gradientStrength": 0.265, "mottle": 0.007, "streakRatio": 0.45, "hueSpread": 0.0, "specularFraction": 0.0}}, "materialEvidence": {"componentId": "srb-port-case", "regionId": "paint", "crop": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_shuttle\\material-evidence\\01-paint.png", "bbox": {"x": 166, "y": 296, "width": 18, "height": 38}, "sourceWidth": 400, "sourceHeight": 492, "loaderWarnings": [], "coverage": 0.0035}, "observations": ["near-neutral colour response", "directional surface frequency", "strong image-space gradient; verify it is material pattern, not lighting", "single-image PBR inference requires controlled render validation"], "hypothesis": {"componentId": "srb-port-case", "regionId": "paint", "materialId": null, "family": "coating", "subtype": "paint-over-metal", "finish": "gloss-or-satin", "aliases": [], "confidence": 0.804, "source": "vision"}, "alternatives": []}},
    options
  );
  materialMap["tile-white"] = createSculptMaterial(
    "tile-white",
    {"id": "tile-white", "name": "Light thermal insulation", "type": "standard", "shaderModel": "MeshStandardMaterial / PBR approximation", "baseColor": "#E4E4E0", "color": "#E4E4E0", "albedo": {"base": "#E4E4E0", "source": "white-patch de-lighting of the reference"}, "colorVariation": {"amount": 0.04, "kind": "per-face hue jitter"}, "textureResolution": 1024, "textureProjection": {"mode": "cylindrical-uv for bodies of revolution, planar-uv for wing and fin panels", "kind": "procedural-canvas", "texelDensity": "512 texels per metre of surface at the near LOD", "reason": "No image files are shipped; every map is drawn to a canvas at runtime so the page works offline."}, "surfaceFrequencyBands": [{"id": "macro", "feature": "panel and segment boundaries", "realization": "geometry", "frequency": 0.35, "amplitude": 0.08}, {"id": "meso", "feature": "linework and joint rings", "realization": "canvas texture", "frequency": 4.0, "amplitude": 0.02}, {"id": "micro", "feature": "surface grain", "realization": "procedural noise in the normal channel", "frequency": 40.0, "amplitude": 0.004}], "roughness": {"base": 0.26, "variation": 0.08, "map": "tile-white-roughness-canvas (independent channel: value noise plus seam darkening, authored on its own canvas and never derived from the colour channel)", "independentOfAlbedo": true, "source": "material class and finish observation; absolute value not measurable at this resolution"}, "metalness": {"base": 0.0, "variation": 0.0}, "normal": {"strength": 0.5, "kind": "procedural noise", "independentOfAlbedo": true}, "bump": {"strength": 0.2, "independentOfAlbedo": true}, "displacement": {"strength": 0.0, "note": "not used; relief that affects silhouette is geometry"}, "ambientOcclusion": {"strength": 0.6, "kind": "cavity darkening at seams and sockets"}, "wear": {"edgeWear": 0.15, "kind": "edge lightening at panel boundaries"}, "dirt": {"amount": 0.1, "kind": "cavity dirt in seams"}, "localOverrides": [{"id": "tile-grid-linework", "name": "Tile grid linework", "roughness": 0.8, "albedo": "rgba(198, 198, 195, 1.0)", "coverage": 0.15, "note": "Fine grid lines. Below the reference resolution; taken from published tile layout."}, {"id": "tile-panel-gap", "name": "Panel gap shading", "roughness": 0.82, "albedo": "rgba(176, 176, 172, 1.0)", "coverage": 0.05, "note": "Darkening at door and access-panel boundaries."}], "shaderNotes": ["Matte ceramic insulation on the orbiter upper surfaces."], "notes": "Matte ceramic insulation on the orbiter upper surfaces.", "materialClass": "ceramic", "referenceMaterialId": "ceramic.glazed", "materialFamily": "ceramic", "materialSubtype": "glazed", "materialFinish": "glossy", "materialReference": {"registry": "C:\\Users\\rakaa\\Downloads\\files\\.claude\\skills\\img2threejs\\docs\\materials\\material-reference.json", "profileId": "ceramic.glazed", "method": "family-subtype-finish", "confidence": 0.768, "sourceRefs": ["three.mesh-physical", "adobe.pbr-guide-1", "google.filament-pbr"], "requiredMaps": ["map", "roughnessMap"], "optionalMaps": ["normalMap", "clearcoatMap", "clearcoatRoughnessMap"], "validationViews": ["neutral-studio", "grazing", "environment-reflection", "reference-beauty"]}, "clearcoat": {"base": 0.7, "variation": 0.0}, "clearcoatRoughness": {"base": 0.12, "variation": 0.0}, "ior": {"base": 1.5, "variation": 0.0}, "referencePbr": {"version": "1.0", "sourceImage": "C:\\Users\\rakaa\\Downloads\\files\\_shuttle\\material-evidence\\02-light-insulation.png", "extractor": "stage1_intake/extract_pbr_evidence.py", "method": "single-image pixel evidence with de-lighting estimate; not photogrammetry", "usable": true, "verdict": "pass", "confidence": 0.768, "estimatedFidelity": 0.768, "targetThreshold": 0.7, "hardLimit": "A single image cannot uniquely recover true albedo/roughness/normal/AO; maps are reference-derived estimates.", "maps": {"albedo": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_shuttle\\material-evidence\\pbr-02-light-insulation\\tile-white_albedo.png", "url": "tile-white_albedo.png", "channel": "albedo", "source": "reference-pixel-extraction"}, "roughness": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_shuttle\\material-evidence\\pbr-02-light-insulation\\tile-white_roughness.png", "url": "tile-white_roughness.png", "channel": "roughness", "source": "reference-pixel-extraction"}, "height": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_shuttle\\material-evidence\\pbr-02-light-insulation\\tile-white_height.png", "url": "tile-white_height.png", "channel": "height", "source": "reference-pixel-extraction"}, "normal": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_shuttle\\material-evidence\\pbr-02-light-insulation\\tile-white_normal.png", "url": "tile-white_normal.png", "channel": "normal", "source": "reference-pixel-extraction"}, "ao": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_shuttle\\material-evidence\\pbr-02-light-insulation\\tile-white_ao.png", "url": "tile-white_ao.png", "channel": "ao", "source": "reference-pixel-extraction"}}, "diagnostics": {"sourceWidth": 30, "sourceHeight": 30, "mapSize": 512, "cropBBoxPixels": {"x": 0, "y": 4, "width": 9, "height": 18}, "mask": {"backgroundColor": "#F8EEEE", "backgroundNoise": 13.153, "transparentPixelFraction": 0.0, "foregroundCoverage": 0.07}, "mapStats": {"valueRange": 0.1454, "heightP90Gradient": 0.04931, "roughnessBase": 0.68, "roughnessVariation": 0.096, "normalStrength": 0.214, "blurRadius": 10}, "palette": ["#CFCDCE", "#C6C5C5", "#D6D5D5", "#BAB9B9", "#DDDCDD"]}, "warnings": ["foreground mask is very small", "single-image inverse rendering cannot prove true physical PBR; confidence is capped", "low value range weakens height/roughness inference"], "albedoAccepted": true, "note": "Extracted palette agrees with the independent white-patch de-lighting, so the authored albedo is corroborated rather than replaced."}, "textureAnalysis": {"finishClass": "brushed-steel", "recipe": {"metalness": 1.0, "roughness": 0.35, "clearcoat": 0.0, "clearcoatRoughness": 0.0, "transmission": 0.0, "ior": 1.5, "envMapIntensity": 1.0, "anisotropy": 1.0, "procedural": "brushed"}, "palette": ["#E1DFE0", "#C8C6C7", "#DEDCDD", "#C0C0C0", "#E5E0DF"], "paletteHueRisk": [], "gradientAxis": "vertical", "stats": {"meanLum": 213.4, "meanSaturation": 0.014, "gradientStrength": 0.138, "mottle": 0.003, "streakRatio": 0.35, "hueSpread": 0.0, "specularFraction": 0.04}}, "materialEvidence": {"componentId": "orb-mid-fuselage", "regionId": "light-insulation", "crop": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_shuttle\\material-evidence\\02-light-insulation.png", "bbox": {"x": 200, "y": 330, "width": 30, "height": 30}, "sourceWidth": 400, "sourceHeight": 492, "loaderWarnings": [], "coverage": 0.0046}, "observations": ["near-neutral colour response", "directional surface frequency", "single-image PBR inference requires controlled render validation"], "hypothesis": {"componentId": "orb-mid-fuselage", "regionId": "light-insulation", "materialId": null, "family": "ceramic", "subtype": "glazed", "finish": "glossy", "aliases": [], "confidence": 0.768, "source": "vision"}, "alternatives": []}},
    options
  );
  materialMap["tile-black"] = createSculptMaterial(
    "tile-black",
    {"id": "tile-black", "name": "Dark thermal protection", "type": "standard", "shaderModel": "MeshStandardMaterial / PBR approximation", "baseColor": "#26262A", "color": "#26262A", "albedo": {"base": "#26262A", "source": "white-patch de-lighting of the reference"}, "colorVariation": {"amount": 0.04, "kind": "per-face hue jitter"}, "textureResolution": 1024, "textureProjection": {"mode": "cylindrical-uv for bodies of revolution, planar-uv for wing and fin panels", "kind": "procedural-canvas", "texelDensity": "512 texels per metre of surface at the near LOD", "reason": "No image files are shipped; every map is drawn to a canvas at runtime so the page works offline."}, "surfaceFrequencyBands": [{"id": "macro", "feature": "panel and segment boundaries", "realization": "geometry", "frequency": 0.35, "amplitude": 0.08}, {"id": "meso", "feature": "linework and joint rings", "realization": "canvas texture", "frequency": 4.0, "amplitude": 0.02}, {"id": "micro", "feature": "surface grain", "realization": "procedural noise in the normal channel", "frequency": 40.0, "amplitude": 0.004}], "roughness": {"base": 0.26, "variation": 0.08, "map": "tile-black-roughness-canvas (independent channel: value noise plus seam darkening, authored on its own canvas and never derived from the colour channel)", "independentOfAlbedo": true, "source": "material class and finish observation; absolute value not measurable at this resolution"}, "metalness": {"base": 0.0, "variation": 0.0}, "normal": {"strength": 0.5, "kind": "procedural noise", "independentOfAlbedo": true}, "bump": {"strength": 0.2, "independentOfAlbedo": true}, "displacement": {"strength": 0.0, "note": "not used; relief that affects silhouette is geometry"}, "ambientOcclusion": {"strength": 0.6, "kind": "cavity darkening at seams and sockets"}, "wear": {"edgeWear": 0.15, "kind": "edge lightening at panel boundaries"}, "dirt": {"amount": 0.1, "kind": "cavity dirt in seams"}, "localOverrides": [{"id": "tile-black-sheen", "name": "Leading-edge sheen", "roughness": 0.28, "albedo": "rgba(58, 58, 62, 1.0)", "coverage": 0.12, "note": "Low-roughness band along the leading edge; the only gloss response on the vehicle."}, {"id": "tile-black-grid", "name": "Dark tile linework", "roughness": 0.6, "albedo": "rgba(48, 48, 52, 1.0)", "coverage": 0.2, "note": "Grid lines on the dark region. Inference: not resolvable in the reference."}], "shaderNotes": ["Matte near-black ceramic on the nose cap, leading edges and base structure.", "Extractor verdict pass at confidence 0.824, but its palette leads with #61281A, a brown. The crop is about 120 px against an orange background, so JPEG chroma bleed dominates it. The extracted albedo is REJECTED for this material and the de-lit authored value is kept. The evidence is retained for provenance, not used as colour."], "notes": "Matte near-black ceramic on the nose cap, leading edges and base structure. Extractor verdict pass at confidence 0.824, but its palette leads with #61281A, a brown. The crop is about 120 px against an orange background, so JPEG chroma bleed dominates it. The extracted albedo is REJECTED for this material and the de-lit authored value is kept. The evidence is retained for provenance, not used as colour.", "materialClass": "ceramic", "referenceMaterialId": "ceramic.glazed", "materialFamily": "ceramic", "materialSubtype": "glazed", "materialFinish": "glossy", "materialReference": {"registry": "C:\\Users\\rakaa\\Downloads\\files\\.claude\\skills\\img2threejs\\docs\\materials\\material-reference.json", "profileId": "ceramic.glazed", "method": "family-subtype-finish", "confidence": 0.824, "sourceRefs": ["three.mesh-physical", "adobe.pbr-guide-1", "google.filament-pbr"], "requiredMaps": ["map", "roughnessMap"], "optionalMaps": ["normalMap", "clearcoatMap", "clearcoatRoughnessMap"], "validationViews": ["neutral-studio", "grazing", "environment-reflection", "reference-beauty"]}, "clearcoat": {"base": 0.7, "variation": 0.0}, "clearcoatRoughness": {"base": 0.12, "variation": 0.0}, "ior": {"base": 1.5, "variation": 0.0}, "referencePbr": {"version": "1.0", "sourceImage": "C:\\Users\\rakaa\\Downloads\\files\\_shuttle\\material-evidence\\03-dark-insulation.png", "extractor": "stage1_intake/extract_pbr_evidence.py", "method": "single-image pixel evidence with de-lighting estimate; not photogrammetry", "usable": true, "verdict": "pass", "confidence": 0.824, "estimatedFidelity": 0.824, "targetThreshold": 0.7, "hardLimit": "A single image cannot uniquely recover true albedo/roughness/normal/AO; maps are reference-derived estimates.", "maps": {"albedo": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_shuttle\\material-evidence\\pbr-03-dark-insulation\\tile-black_albedo.png", "url": "tile-black_albedo.png", "channel": "albedo", "source": "reference-pixel-extraction"}, "roughness": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_shuttle\\material-evidence\\pbr-03-dark-insulation\\tile-black_roughness.png", "url": "tile-black_roughness.png", "channel": "roughness", "source": "reference-pixel-extraction"}, "height": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_shuttle\\material-evidence\\pbr-03-dark-insulation\\tile-black_height.png", "url": "tile-black_height.png", "channel": "height", "source": "reference-pixel-extraction"}, "normal": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_shuttle\\material-evidence\\pbr-03-dark-insulation\\tile-black_normal.png", "url": "tile-black_normal.png", "channel": "normal", "source": "reference-pixel-extraction"}, "ao": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_shuttle\\material-evidence\\pbr-03-dark-insulation\\tile-black_ao.png", "url": "tile-black_ao.png", "channel": "ao", "source": "reference-pixel-extraction"}}, "diagnostics": {"sourceWidth": 12, "sourceHeight": 10, "mapSize": 512, "cropBBoxPixels": {"x": 0, "y": 0, "width": 12, "height": 10}, "mask": {"backgroundColor": "#5C221B", "backgroundNoise": 99.925, "transparentPixelFraction": 0.0, "foregroundCoverage": 0.8417}, "mapStats": {"valueRange": 0.2623, "heightP90Gradient": 0.05121, "roughnessBase": 0.692, "roughnessVariation": 0.083, "normalStrength": 0.216, "blurRadius": 10}, "palette": ["#61281A", "#080404", "#180908", "#291E1C", "#CEC8C4"]}, "warnings": ["single-image inverse rendering cannot prove true physical PBR; confidence is capped"], "albedoAccepted": false, "rejectionReason": "Extractor verdict pass at confidence 0.824, but its palette leads with #61281A, a brown. The crop is about 120 px against an orange background, so JPEG chroma bleed dominates it. The extracted albedo is REJECTED for this material and the de-lit authored value is kept. The evidence is retained for provenance, not used as colour."}, "textureAnalysis": {"finishClass": "painted-metal", "recipe": {"metalness": 0.0, "roughness": 0.5, "clearcoat": 1.0, "clearcoatRoughness": 0.05, "transmission": 0.0, "ior": 1.5, "envMapIntensity": 1.0, "anisotropy": 0.0, "procedural": "flat-clearcoat"}, "palette": ["#60352B", "#2A100B", "#28110A", "#392B27", "#756966"], "paletteHueRisk": [], "gradientAxis": "vertical", "stats": {"meanLum": 46.6, "meanSaturation": 0.58, "gradientStrength": 0.361, "mottle": 0.012, "streakRatio": 1.07, "hueSpread": 0.257, "specularFraction": 0.0}}, "materialEvidence": {"componentId": "orb-fwd-fuselage", "regionId": "dark-insulation", "crop": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_shuttle\\material-evidence\\03-dark-insulation.png", "bbox": {"x": 209, "y": 194, "width": 12, "height": 10}, "sourceWidth": 400, "sourceHeight": 492, "loaderWarnings": [], "coverage": 0.0006}, "observations": ["chromatic base-colour response", "strong image-space gradient; verify it is material pattern, not lighting", "single-image PBR inference requires controlled render validation"], "hypothesis": {"componentId": "orb-fwd-fuselage", "regionId": "dark-insulation", "materialId": null, "family": "ceramic", "subtype": "glazed", "finish": "glossy", "aliases": [], "confidence": 0.824, "source": "vision"}, "alternatives": []}},
    options
  );
  materialMap["metal-nozzle"] = createSculptMaterial(
    "metal-nozzle",
    {"id": "metal-nozzle", "name": "Nozzle metal", "type": "standard", "shaderModel": "MeshStandardMaterial / PBR approximation", "baseColor": "#7A7A80", "color": "#7A7A80", "albedo": {"base": "#7A7A80", "source": "white-patch de-lighting of the reference"}, "colorVariation": {"amount": 0.04, "kind": "per-face hue jitter"}, "textureResolution": 1024, "textureProjection": {"mode": "cylindrical-uv for bodies of revolution, planar-uv for wing and fin panels", "kind": "procedural-canvas", "texelDensity": "512 texels per metre of surface at the near LOD", "reason": "No image files are shipped; every map is drawn to a canvas at runtime so the page works offline."}, "surfaceFrequencyBands": [{"id": "macro", "feature": "panel and segment boundaries", "realization": "geometry", "frequency": 0.35, "amplitude": 0.08}, {"id": "meso", "feature": "linework and joint rings", "realization": "canvas texture", "frequency": 4.0, "amplitude": 0.02}, {"id": "micro", "feature": "surface grain", "realization": "procedural noise in the normal channel", "frequency": 40.0, "amplitude": 0.004}], "roughness": {"base": 0.35, "variation": 0.08, "map": "metal-nozzle-roughness-canvas (independent channel: value noise plus seam darkening, authored on its own canvas and never derived from the colour channel)", "independentOfAlbedo": true, "source": "material class and finish observation; absolute value not measurable at this resolution"}, "metalness": {"base": 1.0, "variation": 0.0}, "normal": {"strength": 0.5, "kind": "procedural noise", "independentOfAlbedo": true}, "bump": {"strength": 0.2, "independentOfAlbedo": true}, "displacement": {"strength": 0.0, "note": "not used; relief that affects silhouette is geometry"}, "ambientOcclusion": {"strength": 0.6, "kind": "cavity darkening at seams and sockets"}, "wear": {"edgeWear": 0.15, "kind": "edge lightening at panel boundaries"}, "dirt": {"amount": 0.1, "kind": "cavity dirt in seams"}, "localOverrides": [{"id": "nozzle-rim", "name": "Nozzle exit rim", "roughness": 0.3, "metalness": 1.0, "albedo": "rgba(150, 150, 156, 1.0)", "coverage": 0.15, "note": "Brighter polished rim at the bell exit."}, {"id": "nozzle-soot", "name": "Throat darkening", "roughness": 0.7, "albedo": "rgba(52, 52, 56, 1.0)", "coverage": 0.25, "note": "Darkening toward the throat."}], "shaderNotes": ["Metallic response with a brighter rim. Not sampled from the reference; declared inference.", "Extractor verdict pass at confidence 0.860, but its palette is #030302: the crop is in shadow, so it measures illumination, not albedo. Extracted albedo REJECTED; authored value kept and declared inference."], "notes": "Metallic response with a brighter rim. Not sampled from the reference; declared inference. Extractor verdict pass at confidence 0.860, but its palette is #030302: the crop is in shadow, so it measures illumination, not albedo. Extracted albedo REJECTED; authored value kept and declared inference.", "materialClass": "metal", "referenceMaterialId": "metal.steel-brushed", "materialFamily": "metal", "materialSubtype": "steel", "materialFinish": "brushed", "materialReference": {"registry": "C:\\Users\\rakaa\\Downloads\\files\\.claude\\skills\\img2threejs\\docs\\materials\\material-reference.json", "profileId": "metal.steel-brushed", "method": "family-subtype-finish", "confidence": 0.86, "sourceRefs": ["three.mesh-physical", "three.pmrem", "gltf.2", "khronos.gltf-pbr", "adobe.pbr-guide-2", "google.filament-pbr"], "requiredMaps": ["map", "roughnessMap", "normalMap", "anisotropyMap"], "optionalMaps": ["metalnessMap"], "validationViews": ["neutral-studio", "grazing", "environment-reflection", "reference-beauty"]}, "anisotropy": {"base": 0.85, "variation": 0.0}, "referencePbr": {"version": "1.0", "sourceImage": "C:\\Users\\rakaa\\Downloads\\files\\_shuttle\\material-evidence\\04-nozzle-metal.png", "extractor": "stage1_intake/extract_pbr_evidence.py", "method": "single-image pixel evidence with de-lighting estimate; not photogrammetry", "usable": true, "verdict": "pass", "confidence": 0.86, "estimatedFidelity": 0.86, "targetThreshold": 0.7, "hardLimit": "A single image cannot uniquely recover true albedo/roughness/normal/AO; maps are reference-derived estimates.", "maps": {"albedo": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_shuttle\\material-evidence\\pbr-04-nozzle-metal\\metal-nozzle_albedo.png", "url": "metal-nozzle_albedo.png", "channel": "albedo", "source": "reference-pixel-extraction"}, "roughness": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_shuttle\\material-evidence\\pbr-04-nozzle-metal\\metal-nozzle_roughness.png", "url": "metal-nozzle_roughness.png", "channel": "roughness", "source": "reference-pixel-extraction"}, "height": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_shuttle\\material-evidence\\pbr-04-nozzle-metal\\metal-nozzle_height.png", "url": "metal-nozzle_height.png", "channel": "height", "source": "reference-pixel-extraction"}, "normal": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_shuttle\\material-evidence\\pbr-04-nozzle-metal\\metal-nozzle_normal.png", "url": "metal-nozzle_normal.png", "channel": "normal", "source": "reference-pixel-extraction"}, "ao": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_shuttle\\material-evidence\\pbr-04-nozzle-metal\\metal-nozzle_ao.png", "url": "metal-nozzle_ao.png", "channel": "ao", "source": "reference-pixel-extraction"}}, "diagnostics": {"sourceWidth": 26, "sourceHeight": 22, "mapSize": 512, "cropBBoxPixels": {"x": 0, "y": 0, "width": 26, "height": 22}, "mask": {"backgroundColor": "#1C1516", "backgroundNoise": 90.835, "transparentPixelFraction": 0.0, "foregroundCoverage": 0.6031}, "mapStats": {"valueRange": 0.7964, "heightP90Gradient": 0.06737, "roughnessBase": 0.695, "roughnessVariation": 0.098, "normalStrength": 0.235, "blurRadius": 10}, "palette": ["#030302", "#120D0E", "#291F21", "#B6BBBE", "#524343"]}, "warnings": ["single-image inverse rendering cannot prove true physical PBR; confidence is capped"], "albedoAccepted": false, "rejectionReason": "Extractor verdict pass at confidence 0.860, but its palette is #030302: the crop is in shadow, so it measures illumination, not albedo. Extracted albedo REJECTED; authored value kept and declared inference."}, "textureAnalysis": {"finishClass": "painted-metal", "recipe": {"metalness": 0.0, "roughness": 0.5, "clearcoat": 1.0, "clearcoatRoughness": 0.05, "transmission": 0.0, "ior": 1.5, "envMapIntensity": 1.0, "anisotropy": 0.0, "procedural": "flat-clearcoat"}, "palette": ["#100D0D", "#040202", "#5C575A", "#181415", "#121010"], "paletteHueRisk": [], "gradientAxis": "horizontal", "stats": {"meanLum": 45.2, "meanSaturation": 0.285, "gradientStrength": 0.667, "mottle": 0.035, "streakRatio": 2.37, "hueSpread": 0.509, "specularFraction": 0.0}}, "materialEvidence": {"componentId": "orb-engine-mount", "regionId": "nozzle-metal", "crop": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_shuttle\\material-evidence\\04-nozzle-metal.png", "bbox": {"x": 206, "y": 426, "width": 26, "height": 22}, "sourceWidth": 400, "sourceHeight": 492, "loaderWarnings": [], "coverage": 0.0029}, "observations": ["chromatic base-colour response", "directional surface frequency", "strong image-space gradient; verify it is material pattern, not lighting", "single-image PBR inference requires controlled render validation"], "hypothesis": {"componentId": "orb-engine-mount", "regionId": "nozzle-metal", "materialId": null, "family": "metal", "subtype": "steel", "finish": "brushed", "aliases": [], "confidence": 0.86, "source": "vision"}, "alternatives": []}, "needsEnvironment": true},
    options
  );
  materialMap["glass-window"] = createSculptMaterial(
    "glass-window",
    {"id": "glass-window", "name": "Cabin glazing", "type": "standard", "shaderModel": "MeshStandardMaterial / PBR approximation", "baseColor": "#1C222C", "color": "#1C222C", "albedo": {"base": "#1C222C", "source": "white-patch de-lighting of the reference"}, "colorVariation": {"amount": 0.04, "kind": "per-face hue jitter"}, "textureResolution": 1024, "textureProjection": {"mode": "cylindrical-uv for bodies of revolution, planar-uv for wing and fin panels", "kind": "procedural-canvas", "texelDensity": "512 texels per metre of surface at the near LOD", "reason": "No image files are shipped; every map is drawn to a canvas at runtime so the page works offline."}, "surfaceFrequencyBands": [{"id": "macro", "feature": "panel and segment boundaries", "realization": "geometry", "frequency": 0.35, "amplitude": 0.08}, {"id": "meso", "feature": "linework and joint rings", "realization": "canvas texture", "frequency": 4.0, "amplitude": 0.02}, {"id": "micro", "feature": "surface grain", "realization": "procedural noise in the normal channel", "frequency": 40.0, "amplitude": 0.004}], "roughness": {"base": 0.05, "variation": 0.08, "map": "glass-window-roughness-canvas (independent channel: value noise plus seam darkening, authored on its own canvas and never derived from the colour channel)", "independentOfAlbedo": true, "source": "material class and finish observation; absolute value not measurable at this resolution"}, "metalness": {"base": 0.0, "variation": 0.0}, "normal": {"strength": 0.5, "kind": "procedural noise", "independentOfAlbedo": true}, "bump": {"strength": 0.2, "independentOfAlbedo": true}, "displacement": {"strength": 0.0, "note": "not used; relief that affects silhouette is geometry"}, "ambientOcclusion": {"strength": 0.6, "kind": "cavity darkening at seams and sockets"}, "wear": {"edgeWear": 0.15, "kind": "edge lightening at panel boundaries"}, "dirt": {"amount": 0.1, "kind": "cavity dirt in seams"}, "localOverrides": [{"id": "window-reflection", "name": "Glazing reflection", "roughness": 0.08, "albedo": "rgba(120, 140, 160, 1.0)", "coverage": 0.4, "note": "Specular sheen across the panes."}], "shaderNotes": ["Dark reflective glazing. Placement observed; appearance is inference.", "Extractor verdict pass at confidence 0.860 on a 144 px crop below the resolution floor. Extracted albedo REJECTED; authored value kept and declared inference."], "notes": "Dark reflective glazing. Placement observed; appearance is inference. Extractor verdict pass at confidence 0.860 on a 144 px crop below the resolution floor. Extracted albedo REJECTED; authored value kept and declared inference.", "materialClass": "glass", "referenceMaterialId": "glass.clear", "materialFamily": "glass", "materialSubtype": "clear", "materialFinish": "polished", "materialReference": {"registry": "C:\\Users\\rakaa\\Downloads\\files\\.claude\\skills\\img2threejs\\docs\\materials\\material-reference.json", "profileId": "glass.clear", "method": "family-subtype-finish", "confidence": 0.86, "sourceRefs": ["three.mesh-physical", "three.pmrem", "gltf.2", "khronos.transmission", "khronos.volume", "google.filament-pbr"], "requiredMaps": ["roughnessMap", "thicknessMap"], "optionalMaps": ["map", "normalMap", "transmissionMap"], "validationViews": ["neutral-studio", "environment-reflection", "backlight-transmission", "reference-beauty"]}, "transmission": {"base": 1.0, "variation": 0.0}, "ior": {"base": 1.5, "variation": 0.0}, "referencePbr": {"version": "1.0", "sourceImage": "C:\\Users\\rakaa\\Downloads\\files\\_shuttle\\material-evidence\\05-glazing.png", "extractor": "stage1_intake/extract_pbr_evidence.py", "method": "single-image pixel evidence with de-lighting estimate; not photogrammetry", "usable": true, "verdict": "pass", "confidence": 0.86, "estimatedFidelity": 0.86, "targetThreshold": 0.7, "hardLimit": "A single image cannot uniquely recover true albedo/roughness/normal/AO; maps are reference-derived estimates.", "maps": {"albedo": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_shuttle\\material-evidence\\pbr-05-glazing\\glass-window_albedo.png", "url": "glass-window_albedo.png", "channel": "albedo", "source": "reference-pixel-extraction"}, "roughness": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_shuttle\\material-evidence\\pbr-05-glazing\\glass-window_roughness.png", "url": "glass-window_roughness.png", "channel": "roughness", "source": "reference-pixel-extraction"}, "height": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_shuttle\\material-evidence\\pbr-05-glazing\\glass-window_height.png", "url": "glass-window_height.png", "channel": "height", "source": "reference-pixel-extraction"}, "normal": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_shuttle\\material-evidence\\pbr-05-glazing\\glass-window_normal.png", "url": "glass-window_normal.png", "channel": "normal", "source": "reference-pixel-extraction"}, "ao": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_shuttle\\material-evidence\\pbr-05-glazing\\glass-window_ao.png", "url": "glass-window_ao.png", "channel": "ao", "source": "reference-pixel-extraction"}}, "diagnostics": {"sourceWidth": 16, "sourceHeight": 9, "mapSize": 512, "cropBBoxPixels": {"x": 0, "y": 0, "width": 16, "height": 9}, "mask": {"backgroundColor": "#745C56", "backgroundNoise": 170.543, "transparentPixelFraction": 0.0, "foregroundCoverage": 0.4097}, "mapStats": {"valueRange": 0.4587, "heightP90Gradient": 0.03366, "roughnessBase": 0.68, "roughnessVariation": 0.064, "normalStrength": 0.196, "blurRadius": 10}, "palette": ["#493A3B", "#1A1011", "#090301", "#5A2519", "#907574"]}, "warnings": ["single-image inverse rendering cannot prove true physical PBR; confidence is capped"], "albedoAccepted": false, "rejectionReason": "Extractor verdict pass at confidence 0.860 on a 144 px crop below the resolution floor. Extracted albedo REJECTED; authored value kept and declared inference."}, "textureAnalysis": {"finishClass": "painted-metal", "recipe": {"metalness": 0.0, "roughness": 0.5, "clearcoat": 1.0, "clearcoatRoughness": 0.05, "transmission": 0.0, "ior": 1.5, "envMapIntensity": 1.0, "anisotropy": 0.0, "procedural": "flat-clearcoat"}, "palette": ["#6B5B58", "#180B09", "#D0C2C2", "#8F8180", "#AE9F9E"], "paletteHueRisk": [], "gradientAxis": "vertical", "stats": {"meanLum": 120.3, "meanSaturation": 0.251, "gradientStrength": 0.718, "mottle": 0.034, "streakRatio": 1.27, "hueSpread": 0.099, "specularFraction": 0.014}}, "materialEvidence": {"componentId": "micro-orb-windows", "regionId": "glazing", "crop": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_shuttle\\material-evidence\\05-glazing.png", "bbox": {"x": 207, "y": 204, "width": 16, "height": 9}, "sourceWidth": 400, "sourceHeight": 492, "loaderWarnings": [], "coverage": 0.0007}, "observations": ["chromatic base-colour response", "strong image-space gradient; verify it is material pattern, not lighting", "single-image PBR inference requires controlled render validation"], "hypothesis": {"componentId": "micro-orb-windows", "regionId": "glazing", "materialId": null, "family": "glass", "subtype": "clear", "finish": "polished", "aliases": [], "confidence": 0.86, "source": "vision"}, "alternatives": []}, "needsEnvironment": true},
    options
  );
  materialMap["marking-decal"] = createSculptMaterial(
    "marking-decal",
    {"id": "marking-decal", "name": "Markings", "type": "standard", "shaderModel": "MeshStandardMaterial / PBR approximation", "baseColor": "#141418", "color": "#141418", "albedo": {"base": "#141418", "source": "white-patch de-lighting of the reference"}, "colorVariation": {"amount": 0.04, "kind": "per-face hue jitter"}, "textureResolution": 1024, "textureProjection": {"mode": "cylindrical-uv for bodies of revolution, planar-uv for wing and fin panels", "kind": "procedural-canvas", "texelDensity": "512 texels per metre of surface at the near LOD", "reason": "No image files are shipped; every map is drawn to a canvas at runtime so the page works offline."}, "surfaceFrequencyBands": [{"id": "macro", "feature": "panel and segment boundaries", "realization": "geometry", "frequency": 0.35, "amplitude": 0.08}, {"id": "meso", "feature": "linework and joint rings", "realization": "canvas texture", "frequency": 4.0, "amplitude": 0.02}, {"id": "micro", "feature": "surface grain", "realization": "procedural noise in the normal channel", "frequency": 40.0, "amplitude": 0.004}], "roughness": {"base": 0.45, "variation": 0.08, "map": "marking-decal-roughness-canvas (independent channel: value noise plus seam darkening, authored on its own canvas and never derived from the colour channel)", "independentOfAlbedo": true, "source": "material class and finish observation; absolute value not measurable at this resolution"}, "metalness": {"base": 0.0, "variation": 0.0}, "normal": {"strength": 0.5, "kind": "procedural noise", "independentOfAlbedo": true}, "bump": {"strength": 0.2, "independentOfAlbedo": true}, "displacement": {"strength": 0.0, "note": "not used; relief that affects silhouette is geometry"}, "ambientOcclusion": {"strength": 0.6, "kind": "cavity darkening at seams and sockets"}, "wear": {"edgeWear": 0.15, "kind": "edge lightening at panel boundaries"}, "dirt": {"amount": 0.1, "kind": "cavity dirt in seams"}, "localOverrides": [{"id": "marking-flag-red", "name": "Flag red", "roughness": 0.7, "albedo": "rgba(178, 32, 44, 1.0)", "coverage": 0.3, "note": "Red bands of the flag."}, {"id": "marking-flag-blue", "name": "Flag blue", "roughness": 0.7, "albedo": "rgba(38, 56, 120, 1.0)", "coverage": 0.15, "note": "Canton of the flag."}], "shaderNotes": ["Decal ink on the wing upper surfaces. Placement observed, letterforms approximated.", "Extractor palette is dominated by the white wing around the lettering. Placement is observed; colour is authored."], "notes": "Decal ink on the wing upper surfaces. Placement observed, letterforms approximated. Extractor palette is dominated by the white wing around the lettering. Placement is observed; colour is authored.", "materialClass": "plastic", "referenceMaterialId": "coating.painted-metal", "materialFamily": "coating", "materialSubtype": "paint-over-metal", "materialFinish": "gloss-or-satin", "materialReference": {"registry": "C:\\Users\\rakaa\\Downloads\\files\\.claude\\skills\\img2threejs\\docs\\materials\\material-reference.json", "profileId": "coating.painted-metal", "method": "family-subtype-finish", "confidence": 0.86, "sourceRefs": ["three.mesh-physical", "gltf.2", "khronos.gltf-pbr", "adobe.pbr-guide-1", "adobe.pbr-guide-2"], "requiredMaps": ["map", "roughnessMap"], "optionalMaps": ["normalMap", "clearcoatMap", "clearcoatRoughnessMap", "metalnessMap"], "validationViews": ["albedo-unlit", "neutral-studio", "grazing", "environment-reflection", "reference-beauty"]}, "clearcoat": {"base": 0.75, "variation": 0.0}, "clearcoatRoughness": {"base": 0.12, "variation": 0.0}, "ior": {"base": 1.5, "variation": 0.0}, "referencePbr": {"version": "1.0", "sourceImage": "C:\\Users\\rakaa\\Downloads\\files\\_shuttle\\material-evidence\\06-decal.png", "extractor": "stage1_intake/extract_pbr_evidence.py", "method": "single-image pixel evidence with de-lighting estimate; not photogrammetry", "usable": true, "verdict": "pass", "confidence": 0.86, "estimatedFidelity": 0.86, "targetThreshold": 0.7, "hardLimit": "A single image cannot uniquely recover true albedo/roughness/normal/AO; maps are reference-derived estimates.", "maps": {"albedo": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_shuttle\\material-evidence\\pbr-06-decal\\marking-decal_albedo.png", "url": "marking-decal_albedo.png", "channel": "albedo", "source": "reference-pixel-extraction"}, "roughness": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_shuttle\\material-evidence\\pbr-06-decal\\marking-decal_roughness.png", "url": "marking-decal_roughness.png", "channel": "roughness", "source": "reference-pixel-extraction"}, "height": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_shuttle\\material-evidence\\pbr-06-decal\\marking-decal_height.png", "url": "marking-decal_height.png", "channel": "height", "source": "reference-pixel-extraction"}, "normal": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_shuttle\\material-evidence\\pbr-06-decal\\marking-decal_normal.png", "url": "marking-decal_normal.png", "channel": "normal", "source": "reference-pixel-extraction"}, "ao": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_shuttle\\material-evidence\\pbr-06-decal\\marking-decal_ao.png", "url": "marking-decal_ao.png", "channel": "ao", "source": "reference-pixel-extraction"}}, "diagnostics": {"sourceWidth": 22, "sourceHeight": 22, "mapSize": 512, "cropBBoxPixels": {"x": 0, "y": 4, "width": 20, "height": 18}, "mask": {"backgroundColor": "#E8E0E0", "backgroundNoise": 23.854, "transparentPixelFraction": 0.0, "foregroundCoverage": 0.3822}, "mapStats": {"valueRange": 0.3776, "heightP90Gradient": 0.06591, "roughnessBase": 0.694, "roughnessVariation": 0.129, "normalStrength": 0.233, "blurRadius": 10}, "palette": ["#D1A5A2", "#7A7C94", "#635757", "#C1ADB3", "#A29699"]}, "warnings": ["single-image inverse rendering cannot prove true physical PBR; confidence is capped"], "albedoAccepted": false, "rejectionReason": "Extractor palette is dominated by the white wing around the lettering. Placement is observed; colour is authored."}, "textureAnalysis": {"finishClass": "brushed-steel", "recipe": {"metalness": 1.0, "roughness": 0.35, "clearcoat": 0.0, "clearcoatRoughness": 0.0, "transmission": 0.0, "ior": 1.5, "envMapIntensity": 1.0, "anisotropy": 1.0, "procedural": "brushed"}, "palette": ["#CCC5CA", "#B8AEBB", "#BFA5A3", "#BEA1A3", "#F0E1E2"], "paletteHueRisk": [], "gradientAxis": "horizontal", "stats": {"meanLum": 177.7, "meanSaturation": 0.136, "gradientStrength": 0.349, "mottle": 0.031, "streakRatio": 1.15, "hueSpread": 0.415, "specularFraction": 0.116}}, "materialEvidence": {"componentId": "micro-orb-markings", "regionId": "decal", "crop": {"path": "C:\\Users\\rakaa\\Downloads\\files\\_shuttle\\material-evidence\\06-decal.png", "bbox": {"x": 170, "y": 368, "width": 22, "height": 22}, "sourceWidth": 400, "sourceHeight": 492, "loaderWarnings": [], "coverage": 0.0025}, "observations": ["near-neutral colour response", "strong image-space gradient; verify it is material pattern, not lighting", "single-image PBR inference requires controlled render validation"], "hypothesis": {"componentId": "micro-orb-markings", "regionId": "decal", "materialId": null, "family": "coating", "subtype": "paint-over-metal", "finish": "gloss-or-satin", "aliases": [], "confidence": 0.86, "source": "vision"}, "alternatives": []}},
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
  node_root_0.userData.sculptComponent = {"id": "root", "name": "Launch stack assembly", "level": "macro", "role": "body", "importance": 1.0, "confidence": 0.9, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Container node only. Carries no surface; the four macro bodies below own all geometry.", "geometryDescriptor": {}, "parent": null, "attachment": null, "dimensions": {"lengthX": 56.29, "widthZ": 26.04, "heightY": 13.6}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"pivot": {"x": 0.0, "y": 0.0, "z": 0.0}, "animationRole": "static-part", "clickable": true, "explodable": true, "sockets": []}, "material": "paint-white", "materialLayers": ["paint-white"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {}, "evidenceRefs": ["crop-A", "crop-B", "crop-C", "crop-D"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(232, 232, 228, 1.0)", "secondaryAlbedo": "rgba(206, 206, 201, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.7, "evidenceRefs": ["delight-albedo.json"], "notes": "De-lit booster case reads neutral, so the illuminant is near-neutral. Painted metal skin."}};
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
  mesh_root_0.userData.sculptComponent = {"id": "root", "name": "Launch stack assembly", "level": "macro", "role": "body", "importance": 1.0, "confidence": 0.9, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Container node only. Carries no surface; the four macro bodies below own all geometry.", "geometryDescriptor": {}, "parent": null, "attachment": null, "dimensions": {"lengthX": 56.29, "widthZ": 26.04, "heightY": 13.6}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"pivot": {"x": 0.0, "y": 0.0, "z": 0.0}, "animationRole": "static-part", "clickable": true, "explodable": true, "sockets": []}, "material": "paint-white", "materialLayers": ["paint-white"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {}, "evidenceRefs": ["crop-A", "crop-B", "crop-C", "crop-D"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(232, 232, 228, 1.0)", "secondaryAlbedo": "rgba(206, 206, 201, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.7, "evidenceRefs": ["delight-albedo.json"], "notes": "De-lit booster case reads neutral, so the illuminant is near-neutral. Painted metal skin."}};
  node_root_0.add(mesh_root_0);
  meshes["root"] = mesh_root_0;
  colliders["root"] = {};

  const attachment_et_1 = {"parentId": "root", "parentSocket": "root::et-mount", "localStart": [23.5, 0, 0], "localEnd": [-27.840000000000003, 0, 0], "contactType": "butt", "contactNormal": [1, 0, 0], "embedDepth": 0.06, "overlap": 0.06, "gapTolerance": 0.02};
  const endpoint_et_1 = makeAttachmentEndpoint(attachment_et_1);
  const node_et_1 = new THREE.Group();
  node_et_1.name = "External tank__pivot";
  node_et_1.scale.set(1, 1, 1);
  if (endpoint_et_1) {
    node_et_1.position.copy(endpoint_et_1.start);
    node_et_1.rotation.set(0, 0, 0);
  } else {
    node_et_1.position.set(-2.17, 0.0, 0.0);
    node_et_1.rotation.set(0, 0, 0);
  }
  node_et_1.userData.sculptComponent = {"id": "et", "name": "External tank", "level": "macro", "role": "body", "importance": 0.95, "confidence": 0.9, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "Rigid axisymmetric shell of simply-curved faces. A surface of revolution, not an organic form.", "geometryDescriptor": {}, "parent": "root", "attachment": {"parentId": "root", "parentSocket": "root::et-mount", "localStart": [23.5, 0, 0], "localEnd": [-27.840000000000003, 0, 0], "contactType": "butt", "contactNormal": [1, 0, 0], "embedDepth": 0.06, "overlap": 0.06, "gapTolerance": 0.02}, "dimensions": {"radius": 4.6, "length": 51.34}, "transform": {"position": [-2.17, 0, 0]}, "actionProfile": {"pivot": {"x": 23.5, "y": 0.0, "z": 0.0}, "clickable": true, "explodable": true, "sockets": [{"id": "et-fwd-attach", "position": [6.0, 4.6, 0]}, {"id": "et-aft-attach", "position": [-22.0, 4.6, 0]}, {"id": "et-srb-fwd-port", "position": [8.0, 0, -4.6]}, {"id": "et-srb-fwd-stbd", "position": [8.0, 0, 4.6]}], "animationRole": "static-part"}, "material": "foam-orange", "materialLayers": ["foam-orange"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "et-cable-tray-ridge", "name": "Cable tray ridge", "kind": "ridge", "description": "Raised conduit running the full tank length, offset about 35 degrees from the orbiter side. Built as geometry because it breaks the silhouette in profile.", "confidence": 0.75, "realization": "geometry"}], "surfaceDetail": {}, "evidenceRefs": ["crop-A", "crop-B", "crop-C", "crop-D"], "details": [], "fidelityTier": "structure", "colorMaterialRecipe": {"dominantAlbedo": "rgba(178, 90, 48, 1.0)", "secondaryAlbedo": "rgba(139, 66, 34, 1.0)", "materialClass": "plastic", "materialClassConfidence": 0.7, "evidenceRefs": ["delight-albedo.json"], "notes": "Hue from two agreeing de-lit samples of the tank barrel (127,67,39 and 133,63,37). Value lifted from the lit-face sample toward diffuse appearance; hue kept as measured."}};
  node_et_1.userData.actionProfile = {"pivot": {"x": 23.5, "y": 0.0, "z": 0.0}, "clickable": true, "explodable": true, "sockets": [{"id": "et-fwd-attach", "position": [6.0, 4.6, 0]}, {"id": "et-aft-attach", "position": [-22.0, 4.6, 0]}, {"id": "et-srb-fwd-port", "position": [8.0, 0, -4.6]}, {"id": "et-srb-fwd-stbd", "position": [8.0, 0, 4.6]}], "animationRole": "static-part"};
  (nodes["root"] ?? root).add(node_et_1);
  nodes["et"] = node_et_1;
  const mesh_et_1Geometry = endpoint_et_1
    ? new THREE.CylinderGeometry(endpoint_et_1.endRadius, endpoint_et_1.baseRadius, endpoint_et_1.length, 32, 12)
    : new THREE.CylinderGeometry(0.5, 0.5, 1, 48, 16);
  if (!endpoint_et_1) {
    mesh_et_1Geometry.scale(9.2, 51.34, 9.2);
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
  mesh_et_1.userData.sculptComponent = {"id": "et", "name": "External tank", "level": "macro", "role": "body", "importance": 0.95, "confidence": 0.9, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "Rigid axisymmetric shell of simply-curved faces. A surface of revolution, not an organic form.", "geometryDescriptor": {}, "parent": "root", "attachment": {"parentId": "root", "parentSocket": "root::et-mount", "localStart": [23.5, 0, 0], "localEnd": [-27.840000000000003, 0, 0], "contactType": "butt", "contactNormal": [1, 0, 0], "embedDepth": 0.06, "overlap": 0.06, "gapTolerance": 0.02}, "dimensions": {"radius": 4.6, "length": 51.34}, "transform": {"position": [-2.17, 0, 0]}, "actionProfile": {"pivot": {"x": 23.5, "y": 0.0, "z": 0.0}, "clickable": true, "explodable": true, "sockets": [{"id": "et-fwd-attach", "position": [6.0, 4.6, 0]}, {"id": "et-aft-attach", "position": [-22.0, 4.6, 0]}, {"id": "et-srb-fwd-port", "position": [8.0, 0, -4.6]}, {"id": "et-srb-fwd-stbd", "position": [8.0, 0, 4.6]}], "animationRole": "static-part"}, "material": "foam-orange", "materialLayers": ["foam-orange"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "et-cable-tray-ridge", "name": "Cable tray ridge", "kind": "ridge", "description": "Raised conduit running the full tank length, offset about 35 degrees from the orbiter side. Built as geometry because it breaks the silhouette in profile.", "confidence": 0.75, "realization": "geometry"}], "surfaceDetail": {}, "evidenceRefs": ["crop-A", "crop-B", "crop-C", "crop-D"], "details": [], "fidelityTier": "structure", "colorMaterialRecipe": {"dominantAlbedo": "rgba(178, 90, 48, 1.0)", "secondaryAlbedo": "rgba(139, 66, 34, 1.0)", "materialClass": "plastic", "materialClassConfidence": 0.7, "evidenceRefs": ["delight-albedo.json"], "notes": "Hue from two agreeing de-lit samples of the tank barrel (127,67,39 and 133,63,37). Value lifted from the lit-face sample toward diffuse appearance; hue kept as measured."}};
  node_et_1.add(mesh_et_1);
  meshes["et"] = mesh_et_1;
  colliders["et"] = {};
  const socket_et_et_fwd_attach_0 = new THREE.Object3D();
  socket_et_et_fwd_attach_0.name = "et-fwd-attach";
  socket_et_et_fwd_attach_0.position.set(6.0, 4.6, 0.0);
  socket_et_et_fwd_attach_0.rotation.set(0, 0, 0);
  socket_et_et_fwd_attach_0.userData.socket = {"id": "et-fwd-attach", "position": [6.0, 4.6, 0]};
  node_et_1.add(socket_et_et_fwd_attach_0);
  sockets["et:et-fwd-attach"] = socket_et_et_fwd_attach_0;
  const socket_et_et_aft_attach_1 = new THREE.Object3D();
  socket_et_et_aft_attach_1.name = "et-aft-attach";
  socket_et_et_aft_attach_1.position.set(-22.0, 4.6, 0.0);
  socket_et_et_aft_attach_1.rotation.set(0, 0, 0);
  socket_et_et_aft_attach_1.userData.socket = {"id": "et-aft-attach", "position": [-22.0, 4.6, 0]};
  node_et_1.add(socket_et_et_aft_attach_1);
  sockets["et:et-aft-attach"] = socket_et_et_aft_attach_1;
  const socket_et_et_srb_fwd_port_2 = new THREE.Object3D();
  socket_et_et_srb_fwd_port_2.name = "et-srb-fwd-port";
  socket_et_et_srb_fwd_port_2.position.set(8.0, 0.0, -4.6);
  socket_et_et_srb_fwd_port_2.rotation.set(0, 0, 0);
  socket_et_et_srb_fwd_port_2.userData.socket = {"id": "et-srb-fwd-port", "position": [8.0, 0, -4.6]};
  node_et_1.add(socket_et_et_srb_fwd_port_2);
  sockets["et:et-srb-fwd-port"] = socket_et_et_srb_fwd_port_2;
  const socket_et_et_srb_fwd_stbd_3 = new THREE.Object3D();
  socket_et_et_srb_fwd_stbd_3.name = "et-srb-fwd-stbd";
  socket_et_et_srb_fwd_stbd_3.position.set(8.0, 0.0, 4.6);
  socket_et_et_srb_fwd_stbd_3.rotation.set(0, 0, 0);
  socket_et_et_srb_fwd_stbd_3.userData.socket = {"id": "et-srb-fwd-stbd", "position": [8.0, 0, 4.6]};
  node_et_1.add(socket_et_et_srb_fwd_stbd_3);
  sockets["et:et-srb-fwd-stbd"] = socket_et_et_srb_fwd_stbd_3;

  const attachment_srb_port_2 = {"parentId": "root", "parentSocket": "root::srb-port-mount", "localStart": [17.0, 0, -7.0], "localEnd": [-32.79, 0, -7.0], "contactType": "butt", "contactNormal": [1, 0, 0], "embedDepth": 0.06, "overlap": 0.06, "gapTolerance": 0.02};
  const endpoint_srb_port_2 = makeAttachmentEndpoint(attachment_srb_port_2);
  const node_srb_port_2 = new THREE.Group();
  node_srb_port_2.name = "Solid rocket booster (port)__pivot";
  node_srb_port_2.scale.set(1, 1, 1);
  if (endpoint_srb_port_2) {
    node_srb_port_2.position.copy(endpoint_srb_port_2.start);
    node_srb_port_2.rotation.set(0, 0, 0);
  } else {
    node_srb_port_2.position.set(-7.895, 0.0, -7.0);
    node_srb_port_2.rotation.set(0, 0, 0);
  }
  node_srb_port_2.userData.sculptComponent = {"id": "srb-port", "name": "Solid rocket booster (port)", "level": "macro", "role": "body", "importance": 0.9, "confidence": 0.88, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "Rigid axisymmetric case. Surface of revolution built from stacked constant-radius segments.", "geometryDescriptor": {}, "parent": "root", "attachment": {"parentId": "root", "parentSocket": "root::srb-port-mount", "localStart": [17.0, 0, -7.0], "localEnd": [-32.79, 0, -7.0], "contactType": "butt", "contactNormal": [1, 0, 0], "embedDepth": 0.06, "overlap": 0.06, "gapTolerance": 0.02}, "dimensions": {"radius": 2.032, "length": 49.79}, "transform": {"position": [-7.895, 0, -7.0]}, "actionProfile": {"pivot": {"x": 17.0, "y": 0.0, "z": -7.0}, "clickable": true, "explodable": true, "sockets": [{"id": "srb-port-fwd-attach", "position": [8.0, 0, -4.968]}], "animationRole": "static-part"}, "material": "paint-white", "materialLayers": ["paint-white"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "srb-port-surface-patch", "name": "Case surface patch", "kind": "decal", "description": "Dark rectangular patch observed on the case partway up, present on both boosters.", "confidence": 0.6, "realization": "material-override"}], "surfaceDetail": {}, "evidenceRefs": ["crop-B", "zone-r1c2", "zone-r2c2"], "details": [], "fidelityTier": "structure", "colorMaterialRecipe": {"dominantAlbedo": "rgba(232, 232, 228, 1.0)", "secondaryAlbedo": "rgba(206, 206, 201, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.7, "evidenceRefs": ["delight-albedo.json"], "notes": "De-lit booster case reads neutral, so the illuminant is near-neutral. Painted metal skin."}};
  node_srb_port_2.userData.actionProfile = {"pivot": {"x": 17.0, "y": 0.0, "z": -7.0}, "clickable": true, "explodable": true, "sockets": [{"id": "srb-port-fwd-attach", "position": [8.0, 0, -4.968]}], "animationRole": "static-part"};
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
  mesh_srb_port_2.userData.sculptComponent = {"id": "srb-port", "name": "Solid rocket booster (port)", "level": "macro", "role": "body", "importance": 0.9, "confidence": 0.88, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "Rigid axisymmetric case. Surface of revolution built from stacked constant-radius segments.", "geometryDescriptor": {}, "parent": "root", "attachment": {"parentId": "root", "parentSocket": "root::srb-port-mount", "localStart": [17.0, 0, -7.0], "localEnd": [-32.79, 0, -7.0], "contactType": "butt", "contactNormal": [1, 0, 0], "embedDepth": 0.06, "overlap": 0.06, "gapTolerance": 0.02}, "dimensions": {"radius": 2.032, "length": 49.79}, "transform": {"position": [-7.895, 0, -7.0]}, "actionProfile": {"pivot": {"x": 17.0, "y": 0.0, "z": -7.0}, "clickable": true, "explodable": true, "sockets": [{"id": "srb-port-fwd-attach", "position": [8.0, 0, -4.968]}], "animationRole": "static-part"}, "material": "paint-white", "materialLayers": ["paint-white"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "srb-port-surface-patch", "name": "Case surface patch", "kind": "decal", "description": "Dark rectangular patch observed on the case partway up, present on both boosters.", "confidence": 0.6, "realization": "material-override"}], "surfaceDetail": {}, "evidenceRefs": ["crop-B", "zone-r1c2", "zone-r2c2"], "details": [], "fidelityTier": "structure", "colorMaterialRecipe": {"dominantAlbedo": "rgba(232, 232, 228, 1.0)", "secondaryAlbedo": "rgba(206, 206, 201, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.7, "evidenceRefs": ["delight-albedo.json"], "notes": "De-lit booster case reads neutral, so the illuminant is near-neutral. Painted metal skin."}};
  node_srb_port_2.add(mesh_srb_port_2);
  meshes["srb-port"] = mesh_srb_port_2;
  colliders["srb-port"] = {};
  const socket_srb_port_srb_port_fwd_attach_0 = new THREE.Object3D();
  socket_srb_port_srb_port_fwd_attach_0.name = "srb-port-fwd-attach";
  socket_srb_port_srb_port_fwd_attach_0.position.set(8.0, 0.0, -4.968);
  socket_srb_port_srb_port_fwd_attach_0.rotation.set(0, 0, 0);
  socket_srb_port_srb_port_fwd_attach_0.userData.socket = {"id": "srb-port-fwd-attach", "position": [8.0, 0, -4.968]};
  node_srb_port_2.add(socket_srb_port_srb_port_fwd_attach_0);
  sockets["srb-port:srb-port-fwd-attach"] = socket_srb_port_srb_port_fwd_attach_0;

  const attachment_srb_stbd_3 = {"parentId": "root", "parentSocket": "root::srb-stbd-mount", "localStart": [17.0, 0, 7.0], "localEnd": [-32.79, 0, 7.0], "contactType": "butt", "contactNormal": [1, 0, 0], "embedDepth": 0.06, "overlap": 0.06, "gapTolerance": 0.02};
  const endpoint_srb_stbd_3 = makeAttachmentEndpoint(attachment_srb_stbd_3);
  const node_srb_stbd_3 = new THREE.Group();
  node_srb_stbd_3.name = "Solid rocket booster (stbd)__pivot";
  node_srb_stbd_3.scale.set(1, 1, 1);
  if (endpoint_srb_stbd_3) {
    node_srb_stbd_3.position.copy(endpoint_srb_stbd_3.start);
    node_srb_stbd_3.rotation.set(0, 0, 0);
  } else {
    node_srb_stbd_3.position.set(-7.895, 0.0, 7.0);
    node_srb_stbd_3.rotation.set(0, 0, 0);
  }
  node_srb_stbd_3.userData.sculptComponent = {"id": "srb-stbd", "name": "Solid rocket booster (stbd)", "level": "macro", "role": "body", "importance": 0.9, "confidence": 0.88, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "Rigid axisymmetric case. Surface of revolution built from stacked constant-radius segments.", "geometryDescriptor": {}, "parent": "root", "attachment": {"parentId": "root", "parentSocket": "root::srb-stbd-mount", "localStart": [17.0, 0, 7.0], "localEnd": [-32.79, 0, 7.0], "contactType": "butt", "contactNormal": [1, 0, 0], "embedDepth": 0.06, "overlap": 0.06, "gapTolerance": 0.02}, "dimensions": {"radius": 2.032, "length": 49.79}, "transform": {"position": [-7.895, 0, 7.0]}, "actionProfile": {"pivot": {"x": 17.0, "y": 0.0, "z": 7.0}, "clickable": true, "explodable": true, "sockets": [{"id": "srb-stbd-fwd-attach", "position": [8.0, 0, 4.968]}], "animationRole": "static-part"}, "material": "paint-white", "materialLayers": ["paint-white"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "srb-stbd-surface-patch", "name": "Case surface patch", "kind": "decal", "description": "Dark rectangular patch observed on the case partway up, present on both boosters.", "confidence": 0.6, "realization": "material-override"}], "surfaceDetail": {}, "evidenceRefs": ["crop-B", "zone-r1c2", "zone-r2c2"], "details": [], "fidelityTier": "structure", "colorMaterialRecipe": {"dominantAlbedo": "rgba(232, 232, 228, 1.0)", "secondaryAlbedo": "rgba(206, 206, 201, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.7, "evidenceRefs": ["delight-albedo.json"], "notes": "De-lit booster case reads neutral, so the illuminant is near-neutral. Painted metal skin."}};
  node_srb_stbd_3.userData.actionProfile = {"pivot": {"x": 17.0, "y": 0.0, "z": 7.0}, "clickable": true, "explodable": true, "sockets": [{"id": "srb-stbd-fwd-attach", "position": [8.0, 0, 4.968]}], "animationRole": "static-part"};
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
  mesh_srb_stbd_3.userData.sculptComponent = {"id": "srb-stbd", "name": "Solid rocket booster (stbd)", "level": "macro", "role": "body", "importance": 0.9, "confidence": 0.88, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "Rigid axisymmetric case. Surface of revolution built from stacked constant-radius segments.", "geometryDescriptor": {}, "parent": "root", "attachment": {"parentId": "root", "parentSocket": "root::srb-stbd-mount", "localStart": [17.0, 0, 7.0], "localEnd": [-32.79, 0, 7.0], "contactType": "butt", "contactNormal": [1, 0, 0], "embedDepth": 0.06, "overlap": 0.06, "gapTolerance": 0.02}, "dimensions": {"radius": 2.032, "length": 49.79}, "transform": {"position": [-7.895, 0, 7.0]}, "actionProfile": {"pivot": {"x": 17.0, "y": 0.0, "z": 7.0}, "clickable": true, "explodable": true, "sockets": [{"id": "srb-stbd-fwd-attach", "position": [8.0, 0, 4.968]}], "animationRole": "static-part"}, "material": "paint-white", "materialLayers": ["paint-white"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "srb-stbd-surface-patch", "name": "Case surface patch", "kind": "decal", "description": "Dark rectangular patch observed on the case partway up, present on both boosters.", "confidence": 0.6, "realization": "material-override"}], "surfaceDetail": {}, "evidenceRefs": ["crop-B", "zone-r1c2", "zone-r2c2"], "details": [], "fidelityTier": "structure", "colorMaterialRecipe": {"dominantAlbedo": "rgba(232, 232, 228, 1.0)", "secondaryAlbedo": "rgba(206, 206, 201, 1.0)", "materialClass": "metal", "materialClassConfidence": 0.7, "evidenceRefs": ["delight-albedo.json"], "notes": "De-lit booster case reads neutral, so the illuminant is near-neutral. Painted metal skin."}};
  node_srb_stbd_3.add(mesh_srb_stbd_3);
  meshes["srb-stbd"] = mesh_srb_stbd_3;
  colliders["srb-stbd"] = {};
  const socket_srb_stbd_srb_stbd_fwd_attach_0 = new THREE.Object3D();
  socket_srb_stbd_srb_stbd_fwd_attach_0.name = "srb-stbd-fwd-attach";
  socket_srb_stbd_srb_stbd_fwd_attach_0.position.set(8.0, 0.0, 4.968);
  socket_srb_stbd_srb_stbd_fwd_attach_0.rotation.set(0, 0, 0);
  socket_srb_stbd_srb_stbd_fwd_attach_0.userData.socket = {"id": "srb-stbd-fwd-attach", "position": [8.0, 0, 4.968]};
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
    node_orb_4.position.set(-7.895, 7.6, 0.0);
    node_orb_4.rotation.set(0, 0, 0);
  }
  node_orb_4.userData.sculptComponent = {"id": "orb", "name": "Orbiter", "level": "macro", "role": "body", "importance": 1.0, "confidence": 0.85, "primitive": "extrude", "topologyClass": "continuous-sculpt", "topologyRationale": "A lofted fuselage whose cross-section changes continuously from a slender nose to a flat-bottomed mid body. Not a box and not a plain cylinder.", "geometryDescriptor": {"loftStations": 14, "crossSection": "rounded-square-to-flat-bottom", "radialSegments": 28}, "parent": "root", "attachment": {"parentId": "root", "parentSocket": "root::orb-mount", "localStart": [12.5, 7.6, 0], "localEnd": [-28.29, 7.6, 0], "contactType": "butt", "contactNormal": [1, 0, 0], "embedDepth": 0.06, "overlap": 0.06, "gapTolerance": 0.02}, "dimensions": {"length": 40.79, "span": 26.04, "height": 4.6}, "transform": {"position": [-7.895, 7.6, 0]}, "actionProfile": {"pivot": {"x": 12.5, "y": 7.6, "z": 0.0}, "clickable": true, "explodable": true, "sockets": [{"id": "orb-fwd-attach", "position": [6.0, -2.0, 0]}, {"id": "orb-aft-attach", "position": [-22.0, -2.2, 0]}, {"id": "orb-wing-root-port", "position": [-6.0, -0.6, -1.9]}, {"id": "orb-wing-root-stbd", "position": [-6.0, -0.6, 1.9]}, {"id": "orb-fin-root", "position": [-19.0, 2.1, 0]}], "animationRole": "static-part"}, "material": "tile-white", "materialLayers": ["tile-white"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "orb-tile-boundary", "name": "Upper/lower insulation boundary", "kind": "linework", "description": "Hard boundary between the light upper surface and the dark lower surface, running the fuselage length and converging toward the nose.", "confidence": 0.7, "realization": "material-override"}], "surfaceDetail": {}, "evidenceRefs": ["crop-C", "crop-F", "zone-r1c1", "zone-r2c1"], "details": [], "fidelityTier": "structure", "colorMaterialRecipe": {"dominantAlbedo": "rgba(228, 228, 224, 1.0)", "secondaryAlbedo": "rgba(198, 198, 195, 1.0)", "materialClass": "ceramic", "materialClassConfidence": 0.7, "evidenceRefs": ["delight-albedo.json"], "notes": "Orbiter upper-surface insulation. De-lit sample clipped at 255,250,249; held below clipping."}};
  node_orb_4.userData.actionProfile = {"pivot": {"x": 12.5, "y": 7.6, "z": 0.0}, "clickable": true, "explodable": true, "sockets": [{"id": "orb-fwd-attach", "position": [6.0, -2.0, 0]}, {"id": "orb-aft-attach", "position": [-22.0, -2.2, 0]}, {"id": "orb-wing-root-port", "position": [-6.0, -0.6, -1.9]}, {"id": "orb-wing-root-stbd", "position": [-6.0, -0.6, 1.9]}, {"id": "orb-fin-root", "position": [-19.0, 2.1, 0]}], "animationRole": "static-part"};
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
  mesh_orb_4.userData.sculptComponent = {"id": "orb", "name": "Orbiter", "level": "macro", "role": "body", "importance": 1.0, "confidence": 0.85, "primitive": "extrude", "topologyClass": "continuous-sculpt", "topologyRationale": "A lofted fuselage whose cross-section changes continuously from a slender nose to a flat-bottomed mid body. Not a box and not a plain cylinder.", "geometryDescriptor": {"loftStations": 14, "crossSection": "rounded-square-to-flat-bottom", "radialSegments": 28}, "parent": "root", "attachment": {"parentId": "root", "parentSocket": "root::orb-mount", "localStart": [12.5, 7.6, 0], "localEnd": [-28.29, 7.6, 0], "contactType": "butt", "contactNormal": [1, 0, 0], "embedDepth": 0.06, "overlap": 0.06, "gapTolerance": 0.02}, "dimensions": {"length": 40.79, "span": 26.04, "height": 4.6}, "transform": {"position": [-7.895, 7.6, 0]}, "actionProfile": {"pivot": {"x": 12.5, "y": 7.6, "z": 0.0}, "clickable": true, "explodable": true, "sockets": [{"id": "orb-fwd-attach", "position": [6.0, -2.0, 0]}, {"id": "orb-aft-attach", "position": [-22.0, -2.2, 0]}, {"id": "orb-wing-root-port", "position": [-6.0, -0.6, -1.9]}, {"id": "orb-wing-root-stbd", "position": [-6.0, -0.6, 1.9]}, {"id": "orb-fin-root", "position": [-19.0, 2.1, 0]}], "animationRole": "static-part"}, "material": "tile-white", "materialLayers": ["tile-white"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "orb-tile-boundary", "name": "Upper/lower insulation boundary", "kind": "linework", "description": "Hard boundary between the light upper surface and the dark lower surface, running the fuselage length and converging toward the nose.", "confidence": 0.7, "realization": "material-override"}], "surfaceDetail": {}, "evidenceRefs": ["crop-C", "crop-F", "zone-r1c1", "zone-r2c1"], "details": [], "fidelityTier": "structure", "colorMaterialRecipe": {"dominantAlbedo": "rgba(228, 228, 224, 1.0)", "secondaryAlbedo": "rgba(198, 198, 195, 1.0)", "materialClass": "ceramic", "materialClassConfidence": 0.7, "evidenceRefs": ["delight-albedo.json"], "notes": "Orbiter upper-surface insulation. De-lit sample clipped at 255,250,249; held below clipping."}};
  node_orb_4.add(mesh_orb_4);
  meshes["orb"] = mesh_orb_4;
  colliders["orb"] = {};
  const socket_orb_orb_fwd_attach_0 = new THREE.Object3D();
  socket_orb_orb_fwd_attach_0.name = "orb-fwd-attach";
  socket_orb_orb_fwd_attach_0.position.set(6.0, -2.0, 0.0);
  socket_orb_orb_fwd_attach_0.rotation.set(0, 0, 0);
  socket_orb_orb_fwd_attach_0.userData.socket = {"id": "orb-fwd-attach", "position": [6.0, -2.0, 0]};
  node_orb_4.add(socket_orb_orb_fwd_attach_0);
  sockets["orb:orb-fwd-attach"] = socket_orb_orb_fwd_attach_0;
  const socket_orb_orb_aft_attach_1 = new THREE.Object3D();
  socket_orb_orb_aft_attach_1.name = "orb-aft-attach";
  socket_orb_orb_aft_attach_1.position.set(-22.0, -2.2, 0.0);
  socket_orb_orb_aft_attach_1.rotation.set(0, 0, 0);
  socket_orb_orb_aft_attach_1.userData.socket = {"id": "orb-aft-attach", "position": [-22.0, -2.2, 0]};
  node_orb_4.add(socket_orb_orb_aft_attach_1);
  sockets["orb:orb-aft-attach"] = socket_orb_orb_aft_attach_1;
  const socket_orb_orb_wing_root_port_2 = new THREE.Object3D();
  socket_orb_orb_wing_root_port_2.name = "orb-wing-root-port";
  socket_orb_orb_wing_root_port_2.position.set(-6.0, -0.6, -1.9);
  socket_orb_orb_wing_root_port_2.rotation.set(0, 0, 0);
  socket_orb_orb_wing_root_port_2.userData.socket = {"id": "orb-wing-root-port", "position": [-6.0, -0.6, -1.9]};
  node_orb_4.add(socket_orb_orb_wing_root_port_2);
  sockets["orb:orb-wing-root-port"] = socket_orb_orb_wing_root_port_2;
  const socket_orb_orb_wing_root_stbd_3 = new THREE.Object3D();
  socket_orb_orb_wing_root_stbd_3.name = "orb-wing-root-stbd";
  socket_orb_orb_wing_root_stbd_3.position.set(-6.0, -0.6, 1.9);
  socket_orb_orb_wing_root_stbd_3.rotation.set(0, 0, 0);
  socket_orb_orb_wing_root_stbd_3.userData.socket = {"id": "orb-wing-root-stbd", "position": [-6.0, -0.6, 1.9]};
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

export function createSpaceShuttleLaunchStackDiscoveryOnPadLookDevLights(
  mode: 'neutral' | 'grazing' | 'reference' = 'neutral',
): THREE.Group {
  const lights = new THREE.Group();
  lights.name = "Space Shuttle launch stack (Discovery on pad) look-dev lights";
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
  lights.userData.lightingFromPhoto = [{"id": "key", "kind": "directional", "intensity": 1.15, "colorTemperatureK": 5200, "directionHint": [-0.45, -0.35, 0.82], "evidence": "Floodlit from below and to one side; the far side of every body falls to near-black."}, {"id": "fill", "kind": "hemisphere", "intensity": 0.32, "colorTemperatureK": 6000, "evidence": "Very low. The reference shows almost no bounce; the unlit sides carry no detail."}, {"id": "rim", "kind": "directional", "intensity": 0.45, "colorTemperatureK": 4200, "directionHint": [0.6, 0.2, -0.75], "evidence": "Secondary pad floodlight separating the boosters from the black sky."}, {"id": "exposure", "kind": "tone-mapping", "exposure": 1.0, "toneMapping": "ACESFilmic", "outputColorSpace": "sRGB", "evidence": "The reference clips its white surfaces, so exposure is set from the model rather than matched to the photo. Stated as a deliberate departure."}, {"id": "contact-shadow", "kind": "shadow", "shadowType": "soft ground shadow", "groundContact": "The stack is shown free-standing on the page, so a soft elliptical ground shadow anchors it. The reference has no visible ground shadow: the pad deck is unlit.", "bias": -0.0005, "radius": 3.0}, {"id": "ambient", "kind": "ambient", "intensity": 0.18, "evidence": "Night sky contributes almost nothing; kept only to stop the shadow side reading as a hole. The page renders on a light background, so the shipped lighting lifts fill above the reference value on purpose. Stated rather than silently changed."}];
  lights.userData.lookDevTargets = {"qualityPriority": "reference-fidelity", "materialPass": {"albedoPaletteRequired": true, "roughnessVariationRequired": true, "normalOrBumpRequired": true, "localOverridesRequired": true, "minimumTextureResolution": 1024, "preferredTextureResolution": 2048, "independentMapChannels": ["albedo", "roughness", "height", "normal", "ambient-occlusion"], "requiredSurfaceFrequencyBands": ["macro", "meso", "micro"], "geometryReliefRequiredWhenSilhouetteAffected": true, "referencePbrExtraction": {"requiredWhenSourceImagePresent": true, "targetThreshold": 0.7, "stopOnLowConfidence": true, "script": "forge/stage1_intake/extract_pbr_evidence.py", "acceptedLimitation": "single-image extraction is reference-derived inference, not exact photogrammetry"}, "mustAvoid": ["single flat albedo per material", "uniform roughness", "albedo texture reused as roughness/height/normal/AO", "single-frequency random noise", "plastic-looking smooth bark, stone, cloth, foliage, or aged material", "local color/detail described only in prose without material masks", "claiming exact PBR recovery when confidence is below the target threshold"]}, "lightingPass": {"requiredTerms": ["key light", "fill light", "rim or environment light", "exposure", "tone mapping", "background", "contact shadow"], "mustAvoid": ["ambient-only lighting", "flat value range", "missing contact shadow", "reference lighting copied without separating material readability"]}, "screenshotReview": ["Compare albedo palette and local color zones.", "Compare roughness/normal/bump response under light.", "Compare cavity dirt, edge wear, stains, moss, scratches, or other local masks.", "Compare key/fill/rim structure, exposure, tone mapping, background, and contact shadows.", "Capture a neutral-light render to verify material readability without reference lighting.", "Capture a grazing-light close-up to expose flat normals, uniform roughness, tiling, and plastic highlights.", "Capture a reference-matched render from the same camera framing as the source."]};
  return lights;
}

// PBR materials (clearcoat/iridescence/transmission/anisotropy) need an environment
// map to visually behave as intended — call this once per renderer and assign the
// result to scene.environment before rendering. No external HDR asset required.
export function createSpaceShuttleLaunchStackDiscoveryOnPadEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
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
export function frameSpaceShuttleLaunchStackDiscoveryOnPadCamera(
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
export function createSpaceShuttleLaunchStackDiscoveryOnPadPresentationComposer(
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

export function configureSpaceShuttleLaunchStackDiscoveryOnPadRenderer(renderer: THREE.WebGLRenderer): void {
  // Load-bearing for view-dependent finishes (anodized / Doppler): without ACES + sRGB
  // the environment reflection reads flat/washed instead of a believable metal response.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
}

export function createSpaceShuttleLaunchStackDiscoveryOnPadInspectControls(
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
