/** Gambar tanda tangan sintetis (PNG bening) khusus untuk uji dan PDF contoh. Bukan tanda tangan siapa pun. */
import { PNG } from "pngjs";

export function ttdContohDataUrl(): string {
  const w = 600, h = 200;
  const png = new PNG({ width: w, height: h });
  const titik = (x: number, y: number) => {
    for (let dx = -3; dx <= 3; dx++) {
      for (let dy = -3; dy <= 3; dy++) {
        if (dx * dx + dy * dy > 9) continue;
        const px = Math.round(x + dx), py = Math.round(y + dy);
        if (px < 0 || py < 0 || px >= w || py >= h) continue;
        const i = (py * w + px) * 4;
        png.data[i] = 20; png.data[i + 1] = 30; png.data[i + 2] = 90; png.data[i + 3] = 255;
      }
    }
  };
  for (let t = 0; t <= 1; t += 0.0004) {
    const x = 40 + t * 500;
    const y = 100 + Math.sin(t * 22) * 45 * (1 - t * 0.6) + Math.cos(t * 7) * 15;
    titik(x, y);
  }
  for (let t = 0; t <= 1; t += 0.001) titik(120 + t * 380, 160 - t * 20);
  return `data:image/png;base64,${PNG.sync.write(png).toString("base64")}`;
}
