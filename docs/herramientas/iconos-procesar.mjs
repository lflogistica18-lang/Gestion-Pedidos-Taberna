// Quita el fondo blanco de un dibujo generado, lo recorta al contenido (margen 6%) y lo lleva a 256x256 PNG transparente.
// Uso:  node docs/herramientas/iconos-procesar.mjs <crudo.png> <salida.png>
// Necesita playwright-core y un Chromium instalado. En el Omni:
//   PLAYWRIGHT_CORE=/home/lucas/PROYECTOS/omni/sistema/skills/creativos/node_modules/playwright-core
//   CHROMIUM=~/.cache/ms-playwright/chromium_headless_shell-XXXX/chrome-headless-shell-linux64/chrome-headless-shell
// Relleno por inundación desde los cuatro bordes: los blancos de adentro (huevo, queso) no se tocan.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';

const [entrada, salida] = process.argv.slice(2);
if (!entrada || !salida) { console.error('Uso: node iconos-procesar.mjs <crudo.png> <salida.png>'); process.exit(1); }
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await browser.newPage();
const b64 = readFileSync(entrada).toString('base64');
const out = await page.evaluate(async (b64) => {
  const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
  const w = img.width, h = img.height;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
  const id = x.getImageData(0, 0, w, h), d = id.data;
  const claro = (i) => d[i] >= 238 && d[i + 1] >= 238 && d[i + 2] >= 238;
  const visto = new Uint8Array(w * h); const pila = [];
  const push = (px, py) => { if (px < 0 || py < 0 || px >= w || py >= h) return; const k = py * w + px; if (visto[k]) return; if (!claro(k * 4)) return; visto[k] = 1; pila.push(k); };
  for (let i = 0; i < w; i++) { push(i, 0); push(i, h - 1); }
  for (let j = 0; j < h; j++) { push(0, j); push(w - 1, j); }
  while (pila.length) { const k = pila.pop(); const px = k % w, py = (k / w) | 0; push(px + 1, py); push(px - 1, py); push(px, py + 1); push(px, py - 1); }
  for (let k = 0; k < w * h; k++) if (visto[k]) d[k * 4 + 3] = 0;
  // borde: pixeles pegados al fondo quitado y casi blancos -> transparentes / semitransparentes (quita el halo)
  const borde = new Uint8Array(w * h);
  for (let py = 1; py < h - 1; py++) for (let px = 1; px < w - 1; px++) {
    const k = py * w + px; if (visto[k]) continue;
    if (visto[k - 1] || visto[k + 1] || visto[k - w] || visto[k + w]) {
      const m = Math.min(d[k * 4], d[k * 4 + 1], d[k * 4 + 2]);
      borde[k] = m > 205 ? 2 : 1;
    }
  }
  for (let k = 0; k < w * h; k++) {
    if (borde[k] === 2) d[k * 4 + 3] = 0;
    else if (borde[k] === 1) {
      const m = Math.min(d[k * 4], d[k * 4 + 1], d[k * 4 + 2]);
      if (m > 170) d[k * 4 + 3] = Math.round(255 * (255 - m) / 85 * 0.5 + 64);
    }
  }
  x.putImageData(id, 0, 0);
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) if (d[(py * w + px) * 4 + 3] > 20) { if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py; }
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1, lado = Math.max(bw, bh), total = lado * 1.12;
  const o = document.createElement('canvas'); o.width = 256; o.height = 256;
  const ox = o.getContext('2d'); ox.imageSmoothingQuality = 'high';
  const esc = 256 / total;
  ox.drawImage(c, x0, y0, bw, bh, (total - bw) / 2 * esc, (total - bh) / 2 * esc, bw * esc, bh * esc);
  return o.toDataURL('image/png').split(',')[1];
}, b64);
writeFileSync(salida, Buffer.from(out, 'base64'));
await browser.close();
console.log('listo:', salida);
