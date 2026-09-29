import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import piexif from 'piexifjs';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SAMPLES_DIR = __dirname;
if (!fs.existsSync(SAMPLES_DIR)) {
  fs.mkdirSync(SAMPLES_DIR, { recursive: true });
}

// Convert decimal degrees to GPS rational format
function degToDms(deg) {
  const absolute = Math.abs(deg);
  const degrees = Math.floor(absolute);
  const minutesNotTruncated = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesNotTruncated);
  const seconds = Math.floor((minutesNotTruncated - minutes) * 60 * 100);
  return [[degrees, 1], [minutes, 1], [seconds, 100]];
}

// 8 Drone survey flight waypoints around 27.1767 N, 78.0081 E
const flightWaypoints = [
  { id: 1, lat: 27.1752, lon: 78.0068, alt: 42.5, name: 'DJI_0101.JPG', label: 'Waypoint 1 - Southwest Grid Entry' },
  { id: 2, lat: 27.1758, lon: 78.0069, alt: 43.1, name: 'DJI_0102.JPG', label: 'Waypoint 2 - Western Strip Alpha' },
  { id: 3, lat: 27.1764, lon: 78.0070, alt: 43.0, name: 'DJI_0103.JPG', label: 'Waypoint 3 - Northwest Turn' },
  { id: 4, lat: 27.1766, lon: 78.0079, alt: 43.8, name: 'DJI_0104.JPG', label: 'Waypoint 4 - Central Corridor East' },
  { id: 5, lat: 27.1760, lon: 78.0080, alt: 44.2, name: 'DJI_0105.JPG', label: 'Waypoint 5 - Agricultural Plot Core' },
  { id: 6, lat: 27.1754, lon: 78.0081, alt: 43.9, name: 'DJI_0106.JPG', label: 'Waypoint 6 - Southern Return Strip' },
  { id: 7, lat: 27.1756, lon: 78.0090, alt: 44.5, name: 'DJI_0107.JPG', label: 'Waypoint 7 - Eastern Perimeter' },
  { id: 8, lat: 27.1763, lon: 78.0091, alt: 44.1, name: 'DJI_0108.JPG', label: 'Waypoint 8 - Northeast Sector Grid' }
];

export async function generateSampleData() {
  console.log('[SampleGen] Generating 8 realistic drone survey images with GPS EXIF...');

  for (const wp of flightWaypoints) {
    const targetFile = path.join(SAMPLES_DIR, wp.name);
    
    // Draw aerial-like survey tile with terrain features, grid, and telemetry overlay
    const svgOverlay = `
      <svg width="800" height="600" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#2d5a27" />
            <stop offset="50%" stop-color="#3e7b32" />
            <stop offset="100%" stop-color="#4c6e3b" />
          </linearGradient>
          <pattern id="cropRows" width="30" height="30" patternUnits="userSpaceOnUse" patternTransform="rotate(25)">
            <line x1="0" y1="0" x2="0" y2="30" stroke="#1f441b" stroke-width="3" />
            <line x1="15" y1="0" x2="15" y2="30" stroke="#488b3b" stroke-width="4" />
          </pattern>
        </defs>

        <rect width="800" height="600" fill="url(#bgGrad)" />
        <rect width="800" height="600" fill="url(#cropRows)" opacity="0.65" />

        <!-- Roads and boundaries -->
        <path d="M 0,220 Q 350,260 800,200" stroke="#c2b280" stroke-width="28" fill="none" opacity="0.9" />
        <path d="M 0,220 Q 350,260 800,200" stroke="#e5dcc3" stroke-width="4" stroke-dasharray="10,10" fill="none" opacity="0.7" />
        <path d="M 450,0 L 480,600" stroke="#a09070" stroke-width="16" fill="none" opacity="0.8" />

        <!-- Roof / Building structures -->
        <polygon points="180,120 260,100 290,170 210,190" fill="#a8432a" stroke="#722c1b" stroke-width="2" />
        <polygon points="210,190 290,170 290,190 210,210" fill="#803320" />
        <polygon points="580,340 680,330 700,430 600,440" fill="#3a5a78" stroke="#233a50" stroke-width="2" />

        <!-- Drone Crosshair and HUD -->
        <circle cx="400" cy="300" r="45" stroke="#00ffcc" stroke-width="2" fill="none" opacity="0.8" />
        <line x1="400" y1="240" x2="400" y2="280" stroke="#00ffcc" stroke-width="2" />
        <line x1="400" y1="320" x2="400" y2="360" stroke="#00ffcc" stroke-width="2" />
        <line x1="340" y1="300" x2="380" y2="300" stroke="#00ffcc" stroke-width="2" />
        <line x1="420" y1="300" x2="460" y2="300" stroke="#00ffcc" stroke-width="2" />

        <!-- HUD telemetry box -->
        <rect x="25" y="25" width="320" height="95" rx="8" fill="rgba(10, 15, 25, 0.75)" stroke="#00ffcc" stroke-width="1.5" />
        <text x="40" y="52" font-family="monospace" font-size="16" font-weight="bold" fill="#00ffcc">SIH UAV SURVEY // ${wp.name}</text>
        <text x="40" y="75" font-family="monospace" font-size="13" fill="#ffffff">GPS: ${wp.lat.toFixed(5)}°N, ${wp.lon.toFixed(5)}°E</text>
        <text x="40" y="96" font-family="monospace" font-size="13" fill="#ffffff">ALT: ${wp.alt}m | GSD: 2.1cm/px | CAM: FC330</text>

        <!-- Status badge -->
        <rect x="25" y="535" width="260" height="40" rx="6" fill="rgba(0, 0, 0, 0.7)" />
        <circle cx="45" cy="555" r="6" fill="#00ff66" />
        <text x="62" y="560" font-family="sans-serif" font-size="13" fill="#ffffff">${wp.label}</text>
      </svg>
    `;

    const rawJpeg = await sharp(Buffer.from(svgOverlay))
      .jpeg({ quality: 92 })
      .toBuffer();

    // Inject genuine EXIF tags using piexifjs
    const zeroth = {};
    const exif = {};
    const gps = {};

    zeroth[piexif.ImageIFD.Make] = 'DJI';
    zeroth[piexif.ImageIFD.Model] = 'FC330 (Phantom 4 Pro)';
    zeroth[piexif.ImageIFD.Software] = 'SIH-Drone-Flight-v1.0';
    zeroth[piexif.ImageIFD.DateTime] = '2026:09:06 14:32:00';

    exif[piexif.ExifIFD.DateTimeOriginal] = '2026:09:06 14:32:00';
    exif[piexif.ExifIFD.FocalLength] = [361, 100]; // 3.61mm

    gps[piexif.GPSIFD.GPSLatitudeRef] = wp.lat >= 0 ? 'N' : 'S';
    gps[piexif.GPSIFD.GPSLatitude] = degToDms(wp.lat);
    gps[piexif.GPSIFD.GPSLongitudeRef] = wp.lon >= 0 ? 'E' : 'W';
    gps[piexif.GPSIFD.GPSLongitude] = degToDms(wp.lon);
    gps[piexif.GPSIFD.GPSAltitudeRef] = 0;
    gps[piexif.GPSIFD.GPSAltitude] = [Math.round(wp.alt * 10), 10];

    const exifObj = { '0th': zeroth, 'Exif': exif, 'GPS': gps };
    const exifBytes = piexif.dump(exifObj);
    const rawDataUri = 'data:image/jpeg;base64,' + rawJpeg.toString('base64');
    const insertedDataUri = piexif.insert(exifBytes, rawDataUri);
    const finalBuffer = Buffer.from(insertedDataUri.split(',')[1], 'base64');

    fs.writeFileSync(targetFile, finalBuffer);
  }

  // Generate high-resolution sample orthomosaic image
  const orthoFile = path.join(SAMPLES_DIR, 'sample_orthophoto.png');
  const orthoVisual = `
    <svg width="1200" height="900" viewBox="0 0 1200 900" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="mosaicBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#2a5223" />
          <stop offset="35%" stop-color="#3c732f" />
          <stop offset="70%" stop-color="#468038" />
          <stop offset="100%" stop-color="#2d5725" />
        </linearGradient>
        <pattern id="surveyGrid" width="40" height="40" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="40" y2="0" stroke="rgba(255,255,255,0.08)" stroke-width="1" />
          <line x1="0" y1="0" x2="0" y2="40" stroke="rgba(255,255,255,0.08)" stroke-width="1" />
        </pattern>
        <pattern id="crops" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(15)">
          <rect width="18" height="9" fill="#305e26" />
          <rect y="9" width="18" height="9" fill="#427a36" />
        </pattern>
      </defs>

      <!-- Base terrain -->
      <rect width="1200" height="900" fill="url(#mosaicBg)" />
      <rect width="1200" height="900" fill="url(#crops)" opacity="0.7" />
      <rect width="1200" height="900" fill="url(#surveyGrid)" />

      <!-- Field Parcels / Boundaries -->
      <polygon points="60,80 520,60 480,420 80,380" fill="#35682d" stroke="#e0f0c0" stroke-width="3" stroke-dasharray="6,4" opacity="0.85" />
      <polygon points="560,70 1120,90 1080,440 530,410" fill="#4d7c39" stroke="#e0f0c0" stroke-width="3" stroke-dasharray="6,4" opacity="0.85" />
      <polygon points="90,440 500,460 460,820 120,800" fill="#3b6329" stroke="#e0f0c0" stroke-width="3" stroke-dasharray="6,4" opacity="0.85" />
      <polygon points="540,450 1100,480 1050,840 510,810" fill="#2d5221" stroke="#e0f0c0" stroke-width="3" stroke-dasharray="6,4" opacity="0.85" />

      <!-- Connecting Road Network -->
      <path d="M 0,420 Q 550,440 1200,430" stroke="#d5c8a5" stroke-width="34" fill="none" opacity="0.95" />
      <path d="M 0,420 Q 550,440 1200,430" stroke="#ffffff" stroke-width="4" stroke-dasharray="14,14" fill="none" opacity="0.8" />
      <path d="M 510,0 L 520,900" stroke="#baa982" stroke-width="26" fill="none" opacity="0.9" />

      <!-- High resolution buildings / farm assets -->
      <polygon points="260,180 390,160 410,260 280,280" fill="#b84d33" stroke="#521f13" stroke-width="3" />
      <polygon points="390,160 430,190 440,280 410,260" fill="#883520" />
      <polygon points="820,560 970,540 990,660 840,680" fill="#436b94" stroke="#1f3854" stroke-width="3" />
      <polygon points="970,540 1010,570 1020,680 990,660" fill="#284869" />

      <!-- Water pond / reservoir -->
      <ellipse cx="880" cy="240" rx="140" ry="90" fill="#1b4d6b" stroke="#3683a6" stroke-width="4" opacity="0.9" />
      <ellipse cx="860" cy="230" rx="90" ry="50" fill="#25658d" opacity="0.6" />

      <!-- Orthomosaic Watermark & Technical Badge -->
      <rect x="40" y="810" width="460" height="60" rx="8" fill="rgba(8, 14, 26, 0.85)" stroke="#00e5ff" stroke-width="2" />
      <text x="60" y="836" font-family="monospace" font-size="16" font-weight="bold" fill="#00e5ff">WEBODM ORTHOMOSAIC // GSD 2.1 CM</text>
      <text x="60" y="856" font-family="monospace" font-size="12" fill="#e0e8f0">CRS: WGS 84 / UTM Zone 44N | Seam-blended &amp; Georeferenced</text>
    </svg>
  `;

  await sharp(Buffer.from(orthoVisual))
    .png()
    .toFile(orthoFile);

  console.log('[SampleGen] Sample drone dataset & stitched orthophoto generated successfully!');
}

generateSampleData().catch(console.error);
