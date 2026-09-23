import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', 'public');

function createPng(width, height, drawPixel) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(6, 9); // RGBA color type
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);

  const ihdrChunk = makeChunk('IHDR', ihdr);

  const rawData = Buffer.alloc((width * 4 + 1) * height);
  let offset = 0;

  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawPixel(x, y, width, height);
      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData), 0);
  return Buffer.concat([length, typeBuf, data, crc]);
}

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function spaceIconPixel(x, y, w, h, isMaskable = false) {
  const cx = w / 2;
  const cy = h / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const rMax = w / 2;

  if (!isMaskable && dist > rMax - 4) {
    return [0, 0, 0, 0];
  }

  const bgGradient = Math.min(1, dist / (rMax * 1.2));
  let r = Math.round(7 + 10 * bgGradient);
  let g = Math.round(11 + 15 * bgGradient);
  let b = Math.round(18 + 25 * bgGradient);
  let a = 255;

  const angle = -0.45;
  const rx = (dx * Math.cos(angle) + dy * Math.sin(angle));
  const ry = (-dx * Math.sin(angle) + dy * Math.cos(angle));
  const ellipseDist = Math.abs(Math.sqrt((rx / (w * 0.38)) ** 2 + (ry / (h * 0.16)) ** 2) - 1);

  if (ellipseDist < 0.08) {
    const intensity = 1 - ellipseDist / 0.08;
    r = Math.min(255, r + Math.round(79 * intensity));
    g = Math.min(255, g + Math.round(168 * intensity));
    b = Math.min(255, b + Math.round(224 * intensity));
  }

  const sy = (y - cy) / (h * 0.35);
  const sx = Math.abs(x - cx) / (w * 0.35);

  if (sy >= -0.85 && sy <= 0.75) {
    const wingWidth = sy < -0.3 ? (sy + 0.85) * 0.45 : (0.25 + (sy + 0.3) * 0.6);
    if (sx <= wingWidth) {
      const isFuselage = sx < 0.18;
      if (isFuselage) {
        return [235, 240, 248, 255];
      } else {
        return [180, 195, 215, 255];
      }
    }
  }

  if (sy > 0.75 && sy < 1.05 && sx < 0.12) {
    const flameIntensity = 1 - (sy - 0.75) / 0.3;
    r = 245;
    g = Math.round(140 * flameIntensity);
    b = 40;
  }

  const starHash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  if (starHash - Math.floor(starHash) > 0.992 && dist > w * 0.28) {
    r = 220; g = 235; b = 255;
  }

  return [r, g, b, a];
}

const sizes = [
  { file: 'icon-192.png', size: 192, maskable: false },
  { file: 'icon-512.png', size: 512, maskable: false },
  { file: 'icon-maskable-192.png', size: 192, maskable: true },
  { file: 'icon-maskable-512.png', size: 512, maskable: true },
];

for (const { file, size, maskable } of sizes) {
  const buf = createPng(size, size, (x, y, w, h) => spaceIconPixel(x, y, w, h, maskable));
  fs.writeFileSync(path.join(publicDir, file), buf);
  console.log(`Generated public/${file} (${buf.length} bytes)`);
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <radialGradient id="spaceGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#16202D"/>
      <stop offset="100%" stop-color="#070B12"/>
    </radialGradient>
    <linearGradient id="shuttleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#9FBAD5"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="22" fill="url(#spaceGlow)"/>
  <ellipse cx="50" cy="50" rx="38" ry="16" transform="rotate(-25 50 50)" fill="none" stroke="#4FA8E0" stroke-width="2.5" opacity="0.8"/>
  <path d="M 50 18 L 56 38 L 74 68 L 58 64 L 54 75 L 50 72 L 46 75 L 42 64 L 26 68 L 44 38 Z" fill="url(#shuttleGrad)"/>
  <circle cx="50" cy="77" r="3.5" fill="#F0A93B"/>
</svg>`;
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svg);
console.log('Generated public/favicon.svg');
