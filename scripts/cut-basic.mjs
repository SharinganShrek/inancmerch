import sharp from "sharp";
import path from "path";

const src =
  "C:\\Users\\emrea\\.cursor\\projects\\c-Users-emrea-Documents-GitHub-lawina\\assets\\image-3e2008e5-576c-4759-aee1-94976356e921.png";
const out = path.resolve("public/products/basic.png");

function isBg(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = 0.299 * r + 0.587 * g + 0.114 * b;
  return l >= 188 && max - min <= 32;
}

function flood(data, w, h, alpha, seeds) {
  const n = w * h;
  const q = new Int32Array(n);
  let head = 0;
  let tail = 0;
  const push = (i) => {
    if (!alpha[i]) return;
    const o = i * 4;
    if (!isBg(data[o], data[o + 1], data[o + 2])) return;
    alpha[i] = 0;
    q[tail++] = i;
  };
  for (const i of seeds) push(i);
  while (head < tail) {
    const i = q[head++];
    const x = i % w;
    const y = (i / w) | 0;
    if (x + 1 < w) push(i + 1);
    if (x > 0) push(i - 1);
    if (y + 1 < h) push(i + w);
    if (y > 0) push(i - w);
  }
}

function stripHalo(data, alpha, w, h) {
  const outA = Buffer.from(alpha);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (!alpha[i]) continue;
      const near =
        !alpha[i - 1] ||
        !alpha[i + 1] ||
        !alpha[i - w] ||
        !alpha[i + w] ||
        !alpha[i - w - 1] ||
        !alpha[i - w + 1] ||
        !alpha[i + w - 1] ||
        !alpha[i + w + 1];
      if (!near) continue;
      const o = i * 4;
      const l = 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2];
      if (l > 150) outA[i] = 0;
    }
  }
  return outA;
}

const { data, info } = await sharp(src)
  .rotate()
  .ensureAlpha()
  .resize({ width: 1400, withoutEnlargement: true })
  .raw()
  .toBuffer({ resolveWithObject: true });

const w = info.width;
const h = info.height;
const alpha = Buffer.alloc(w * h, 255);
const edge = [];
for (let x = 0; x < w; x++) {
  edge.push(x, (h - 1) * w + x);
}
for (let y = 0; y < h; y++) {
  edge.push(y * w, y * w + (w - 1));
}
flood(data, w, h, alpha, edge);

let minX = w;
let minY = h;
let maxX = 0;
let maxY = 0;
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    if (alpha[y * w + x]) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
}
const bw = maxX - minX;
const bh = maxY - minY;
const seeds = [];
const cx = minX + Math.round(bw / 2);
for (const frac of [0.06, 0.1, 0.14, 0.18, 0.22]) {
  const y = minY + Math.round(bh * frac);
  seeds.push(y * w + cx);
}
flood(data, w, h, alpha, seeds);

const keyed = stripHalo(data, alpha, w, h);
let cleared = 0;
const rgba = Buffer.alloc(w * h * 4);
for (let i = 0; i < w * h; i++) {
  const o = i * 4;
  rgba[o] = data[o];
  rgba[o + 1] = data[o + 1];
  rgba[o + 2] = data[o + 2];
  rgba[o + 3] = keyed[i] ? 255 : 0;
  if (!keyed[i]) cleared++;
}

minX = w;
minY = h;
maxX = 0;
maxY = 0;
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    if (rgba[(y * w + x) * 4 + 3]) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
}
const pad = Math.round(Math.max(maxX - minX, maxY - minY) * 0.06);
const left = Math.max(0, minX - pad);
const top = Math.max(0, minY - pad);
const crop = {
  left,
  top,
  width: Math.min(w, maxX + 1 + pad) - left,
  height: Math.min(h, maxY + 1 + pad) - top,
};

await sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
  .extract(crop)
  .resize({ width: 1080, height: 1350, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ compressionLevel: 9 })
  .toFile(out);

console.log(
  JSON.stringify({
    out,
    cleared,
    total: w * h,
    crop,
    ratio: Number((cleared / (w * h)).toFixed(3)),
  }),
);
