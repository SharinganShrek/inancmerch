import sharp from "sharp";
import path from "path";

const dir = path.resolve("public/products");
const jobs = [
  { src: "hoodie.jpg", out: "hoodie.png" },
  { src: "tee.jpg", out: "tee.png" },
  { src: "pants.jpg", out: "pants.png" },
];

const BG = [19, 18, 14];

function distBg(r, g, b) {
  const dr = r - BG[0];
  const dg = g - BG[1];
  const db = b - BG[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function isBg(r, g, b) {
  return distBg(r, g, b) <= 16;
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

function stripFringe(data, alpha, w, h) {
  const out = Buffer.from(alpha);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (!alpha[i]) continue;
      const near =
        !alpha[i - 1] ||
        !alpha[i + 1] ||
        !alpha[i - w] ||
        !alpha[i + w];
      if (!near) continue;
      const o = i * 4;
      const r = data[o];
      const g = data[o + 1];
      const b = data[o + 2];
      const sat = Math.max(r, g, b) - Math.min(r, g, b);
      if (distBg(r, g, b) <= 30 && sat <= 12) out[i] = 0;
    }
  }
  return out;
}

for (const job of jobs) {
  const { data, info } = await sharp(path.join(dir, job.src))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const alpha = Buffer.alloc(w * h, 255);
  const edge = [];
  for (let x = 0; x < w; x++) edge.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) edge.push(y * w, y * w + w - 1);
  flood(data, w, h, alpha, edge);

  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  for (let i = 0; i < w * h; i++) {
    if (!alpha[i]) continue;
    const x = i % w;
    const y = (i / w) | 0;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  const seeds = [];
  const cx = minX + Math.round((maxX - minX) / 2);
  for (const frac of [0.08, 0.12, 0.16, 0.2]) {
    const y = minY + Math.round((maxY - minY) * frac);
    seeds.push(y * w + cx);
  }
  flood(data, w, h, alpha, seeds);
  const keyed = stripFringe(data, alpha, w, h);

  const rgba = Buffer.alloc(w * h * 4);
  let cleared = 0;
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    rgba[o] = data[o];
    rgba[o + 1] = data[o + 1];
    rgba[o + 2] = data[o + 2];
    rgba[o + 3] = keyed[i] ? 255 : 0;
    if (!keyed[i]) cleared++;
  }

  const out = path.join(dir, job.out);
  await sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(out);
  console.log(job.out, "cleared", (cleared / (w * h)).toFixed(3));
}
