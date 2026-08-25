import { createCanvas, loadImage } from '@napi-rs/canvas';
import { writeFileSync } from 'node:fs';

const SRC = 'public/assets/Sharpner/sharpner.png';
const OUT = 'public/assets/Sharpner/sharpener-cut.png';
const TARGET_H = 420;

const img = await loadImage(SRC);
const w = img.width;
const h = img.height;

const src = createCanvas(w, h);
const sctx = src.getContext('2d');
sctx.drawImage(img, 0, 0);
const image = sctx.getImageData(0, 0, w, h);
const p = image.data;

const colCount = new Int32Array(w);
const rowCount = new Int32Array(h);

for (let i = 0; i < p.length; i += 4) {
  const lum = 0.2126 * p[i] + 0.7152 * p[i + 1] + 0.0722 * p[i + 2];
  let a = ((lum - 32) / 40) * 255;
  if (a < 24) a = 0;
  else if (a > 255) a = 255;
  p[i + 3] = a;

  if (a > 110) {
    const px = (i >> 2) % w;
    const py = Math.floor(i / 4 / w);
    colCount[px]++;
    rowCount[py]++;
  }
}

function longestRun(counts, len, minCount, maxGap) {
  let bestStart = 0;
  let bestEnd = -1;
  let curStart = -1;
  let lastGood = -1e9;
  for (let i = 0; i < len; i++) {
    if (counts[i] >= minCount) {
      if (curStart < 0) curStart = i;
      if (i - lastGood <= maxGap) {
        lastGood = i;
      } else {
        if (lastGood - curStart > bestEnd - bestStart) {
          bestStart = curStart;
          bestEnd = lastGood;
        }
        curStart = i;
        lastGood = i;
      }
    }
  }
  if (curStart >= 0 && lastGood - curStart > bestEnd - bestStart) {
    bestStart = curStart;
    bestEnd = lastGood;
  }
  return [bestStart, bestEnd];
}

const [x0, x1] = longestRun(colCount, w, 10, 8);
const [y0, y1] = longestRun(rowCount, h, 10, 8);

const pad = 4;
const minX = Math.max(0, x0 - pad);
const minY = Math.max(0, y0 - pad);
const maxX = Math.min(w - 1, x1 + pad);
const maxY = Math.min(h - 1, y1 + pad);
const cw = maxX - minX + 1;
const ch = maxY - minY + 1;

const cut = createCanvas(cw, ch);
const cctx = cut.getContext('2d');
cctx.putImageData(image, -minX, -minY);

const outH = TARGET_H;
const outW = Math.round((TARGET_H * cw) / ch);
const finalC = createCanvas(outW, outH);
const fctx = finalC.getContext('2d');
fctx.imageSmoothingEnabled = true;
fctx.imageSmoothingQuality = 'high';
fctx.drawImage(cut, 0, 0, outW, outH);

writeFileSync(OUT, finalC.toBuffer('image/png'));
console.log(`bbox ${cw}x${ch} at (${minX},${minY}) -> saved ${outW}x${outH}`);
