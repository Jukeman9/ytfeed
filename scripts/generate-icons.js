import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { deflateSync } from 'zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = resolve(__dirname, '..', 'assets', 'icons');

// CRC32 implementation
function makeCRCTable() {
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
}

const crcTable = makeCRCTable();

function crc32(data) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ data[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function createChunk(type, data) {
  const length = data.length;
  const chunk = [
    (length >> 24) & 0xFF, (length >> 16) & 0xFF, (length >> 8) & 0xFF, length & 0xFF,
    type.charCodeAt(0), type.charCodeAt(1), type.charCodeAt(2), type.charCodeAt(3),
    ...data
  ];

  const crcData = [type.charCodeAt(0), type.charCodeAt(1), type.charCodeAt(2), type.charCodeAt(3), ...data];
  const crc = crc32(crcData);
  chunk.push((crc >> 24) & 0xFF, (crc >> 16) & 0xFF, (crc >> 8) & 0xFF, crc & 0xFF);

  return chunk;
}

function createAperturePNG(size) {
  const png = [];

  // PNG Signature
  png.push(0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A);

  // IHDR chunk
  const ihdrData = [
    (size >> 24) & 0xFF, (size >> 16) & 0xFF, (size >> 8) & 0xFF, size & 0xFF,
    (size >> 24) & 0xFF, (size >> 16) & 0xFF, (size >> 8) & 0xFF, size & 0xFF,
    8,  // bit depth
    6,  // color type (RGBA)
    0,  // compression
    0,  // filter
    0   // interlace
  ];
  png.push(...createChunk('IHDR', ihdrData));

  // Generate image data - Aperture pattern
  const rawData = [];
  const center = size / 2;
  const outerRadius = size * 0.45;
  const innerRadius = size * 0.12;
  const strokeWidth = Math.max(1, size * 0.08);

  for (let y = 0; y < size; y++) {
    rawData.push(0); // filter byte (none)
    for (let x = 0; x < size; x++) {
      const dx = x - center + 0.5;
      const dy = y - center + 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // YouTube red color
      let red = 255, green = 0, blue = 0;
      let alpha = 0;

      // Outer circle stroke
      if (Math.abs(dist - outerRadius) <= strokeWidth / 2) {
        alpha = 255;
      }
      // Inner area - aperture blades
      else if (dist < outerRadius - strokeWidth / 2 && dist > innerRadius) {
        const angle = Math.atan2(dy, dx);
        const numBlades = 6;

        // Each blade is a line from inner to outer
        for (let i = 0; i < numBlades; i++) {
          const bladeAngle = (i / numBlades) * Math.PI * 2 - Math.PI / 2;

          // Calculate perpendicular distance to blade line
          // Blade goes from center outward at bladeAngle
          const bladeEndX = Math.cos(bladeAngle) * outerRadius;
          const bladeEndY = Math.sin(bladeAngle) * outerRadius;

          // Offset the blade start based on spiral effect
          const spiralOffset = 0.3;
          const startAngle = bladeAngle + spiralOffset;
          const bladeStartX = Math.cos(startAngle) * innerRadius;
          const bladeStartY = Math.sin(startAngle) * innerRadius;

          // Distance from point to line segment
          const lineDist = pointToLineDistance(
            dx, dy,
            bladeStartX, bladeStartY,
            bladeEndX, bladeEndY
          );

          if (lineDist <= strokeWidth / 2) {
            alpha = 255;
            break;
          }
        }
      }
      // Inner circle stroke
      else if (Math.abs(dist - innerRadius) <= strokeWidth / 2) {
        alpha = 255;
      }

      rawData.push(red, green, blue, alpha);
    }
  }

  // Compress with zlib
  const compressed = deflateSync(Buffer.from(rawData));
  png.push(...createChunk('IDAT', [...compressed]));

  // IEND chunk
  png.push(...createChunk('IEND', []));

  return Buffer.from(png);
}

// Calculate distance from point to line segment
function pointToLineDistance(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  }

  let t = ((px - x1) * dx + (py - y1) * dy) / lengthSquared;
  t = Math.max(0, Math.min(1, t));

  const nearestX = x1 + t * dx;
  const nearestY = y1 + t * dy;

  return Math.sqrt((px - nearestX) ** 2 + (py - nearestY) ** 2);
}

// Generate SVG for reference
function generateApertureSVG(size, color = '#FF0000') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="10"/>
  <path d="m14.31 8 5.74 9.94"/>
  <path d="M9.69 8h11.48"/>
  <path d="m7.38 12 5.74-9.94"/>
  <path d="m9.69 16-5.74-9.94"/>
  <path d="M14.31 16H2.83"/>
  <path d="m16.62 12-5.74 9.94"/>
</svg>`;
}

// Main
function generateIcons() {
  if (!existsSync(iconsDir)) {
    mkdirSync(iconsDir, { recursive: true });
  }

  const sizes = [16, 48, 128];

  for (const size of sizes) {
    const png = createAperturePNG(size);
    writeFileSync(resolve(iconsDir, `icon${size}.png`), png);
    console.log(`Created icon${size}.png (${png.length} bytes)`);
  }

  // Also create SVG for reference
  const svg = generateApertureSVG(128, '#FF0000');
  writeFileSync(resolve(iconsDir, 'icon.svg'), svg);
  console.log('Created icon.svg');
}

generateIcons();
