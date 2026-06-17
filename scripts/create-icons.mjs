/**
 * Genera assets/icon.png e assets/icon.ico
 * Icona: cerchio scuro (#1e1e1e) con fulmine dorato (#FFD700) al centro
 */
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Jimp from 'jimp';
import pngToIco from 'png-to-ico';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Point-in-polygon (ray casting) ───────────────────────────────────────────
function pointInPolygon(x, y, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect = (yi > y) !== (yj > y) &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

async function main() {
  const SIZE = 256;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const r = SIZE / 2 - 6; // raggio cerchio sfondo

  // Fulmine ⚡ (vertici calcolati su griglia 256x256)
  const bolt = [
    [155, 20],   // cima
    [78,  136],  // metà-sinistra esterno
    [124, 136],  // notch orizzontale → destra
    [98,  236],  // fondo
    [178, 120],  // metà-destra esterno
    [132, 120],  // notch orizzontale ← sinistra
  ];

  const img = new Jimp(SIZE, SIZE, 0x00000000); // trasparente

  img.scan(0, 0, SIZE, SIZE, function (x, y, idx) {
    const dx = x - cx;
    const dy = y - cy;
    const inCircle = dx * dx + dy * dy <= r * r;

    if (!inCircle) return; // fuori dal cerchio → rimane trasparente

    if (pointInPolygon(x, y, bolt)) {
      // Fulmine dorato
      this.bitmap.data[idx]     = 0xFF; // R
      this.bitmap.data[idx + 1] = 0xD7; // G
      this.bitmap.data[idx + 2] = 0x00; // B
      this.bitmap.data[idx + 3] = 0xFF; // A
    } else {
      // Sfondo scuro
      this.bitmap.data[idx]     = 0x1E; // R
      this.bitmap.data[idx + 1] = 0x1E; // G
      this.bitmap.data[idx + 2] = 0x1E; // B
      this.bitmap.data[idx + 3] = 0xFF; // A
    }
  });

  const assetsDir = path.join(__dirname, '..', 'assets');
  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

  const pngPath = path.join(assetsDir, 'icon.png');
  await img.writeAsync(pngPath);
  console.log('✓ assets/icon.png creato');

  const icoBuffer = await pngToIco(pngPath);
  fs.writeFileSync(path.join(assetsDir, 'icon.ico'), icoBuffer);
  console.log('✓ assets/icon.ico creato');
}

main().catch(e => { console.error(e); process.exit(1); });
