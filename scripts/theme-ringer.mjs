import sharp from "sharp";
import path from "path";

const CARD = { r: 20, g: 18, b: 15 };
const src =
  "C:\\Users\\cgnzl\\.cursor\\projects\\c-Users-cgnzl-Desktop-lawina\\assets\\c__Users_cgnzl_AppData_Roaming_Cursor_User_workspaceStorage_ade61bfa7910a510dbf32132dd9bff75_images_ringer__n-62247a52-6fc1-4425-b834-66b78f914d98.png";
const out = path.join(
  "c:\\Users\\cgnzl\\Desktop\\lawina\\public\\products",
  "ringer.jpg",
);

const { data, info } = await sharp(src)
  .rotate()
  .ensureAlpha()
  .resize({ width: 1800, withoutEnlargement: true })
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width: w, height: h } = info;
const n = w * h;
const seen = new Uint8Array(n);
const q = new Int32Array(n);
let head = 0;
let tail = 0;

function isBlack(i) {
  const o = i * 4;
  return 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2] < 14;
}
function push(i) {
  if (seen[i] || !isBlack(i)) return;
  seen[i] = 1;
  q[tail++] = i;
}
for (let x = 0; x < w; x++) {
  push(x);
  push((h - 1) * w + x);
}
for (let y = 0; y < h; y++) {
  push(y * w);
  push(y * w + (w - 1));
}
while (head < tail) {
  const i = q[head++];
  const x = i % w;
  const y = (i / w) | 0;
  if (x + 1 < w) push(i + 1);
  if (x > 0) push(i - 1);
  if (y + 1 < h) push(i + w);
  if (y > 0) push(i - w);
}

const alpha = Buffer.alloc(n);
for (let i = 0; i < n; i++) alpha[i] = seen[i] ? 0 : 255;
const choked = Buffer.from(alpha);
for (let y = 1; y < h - 1; y++) {
  for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    if (!alpha[i]) continue;
    if (!alpha[i - 1] || !alpha[i + 1] || !alpha[i - w] || !alpha[i + w])
      choked[i] = 0;
  }
}

let minX = w,
  minY = h,
  maxX = 0,
  maxY = 0;
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    if (choked[y * w + x]) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
}

const rgba = Buffer.alloc(n * 4);
for (let i = 0; i < n; i++) {
  const o = i * 4;
  const a = choked[i];
  rgba[o] = a ? data[o] : CARD.r;
  rgba[o + 1] = a ? data[o + 1] : CARD.g;
  rgba[o + 2] = a ? data[o + 2] : CARD.b;
  rgba[o + 3] = 255;
}

const pad = Math.round(Math.max(maxX - minX, maxY - minY) * 0.1);
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
  .resize({
    width: 1080,
    height: 1350,
    fit: "contain",
    background: CARD,
  })
  .flatten({ background: CARD })
  .jpeg({ quality: 92, mozjpeg: true })
  .toFile(out);

console.log("ringer", crop);
