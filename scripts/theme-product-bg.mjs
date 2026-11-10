import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "public", "products");
const assets =
  "C:\\Users\\cgnzl\\.cursor\\projects\\c-Users-cgnzl-Desktop-lawina\\assets";

const CARD = { r: 20, g: 18, b: 15 };

const jobs = [
  {
    src: path.join(
      assets,
      "c__Users_cgnzl_AppData_Roaming_Cursor_User_workspaceStorage_ade61bfa7910a510dbf32132dd9bff75_images_Gemini_Generated_Image_kb0r9pkb0r9pkb0r-78e527b9-f4f2-482d-9abc-dd076d2e296d.jpg",
    ),
    out: "hoodie.jpg",
    minL: 232,
    maxSat: 22,
    choke: 1,
  },
  {
    src: path.join(
      assets,
      "c__Users_cgnzl_AppData_Roaming_Cursor_User_workspaceStorage_ade61bfa7910a510dbf32132dd9bff75_images_g_rsel_2025-12-21_234834157-2effdfb6-8948-4492-8c76-d017345f99f9.png",
    ),
    out: "tee.jpg",
    minL: 248,
    maxSat: 16,
    choke: 4,
  },
  {
    src: path.join(
      assets,
      "c__Users_cgnzl_AppData_Roaming_Cursor_User_workspaceStorage_ade61bfa7910a510dbf32132dd9bff75_images_Gemini_Generated_Image_47sr7y47sr7y47sr-7685fa7d-078c-44dc-bb0e-772f51aa3ef8.png",
    ),
    out: "pants.jpg",
    minL: 236,
    maxSat: 22,
    choke: 1,
  },
];

function isBg(r, g, b, minL, maxSat) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = 0.299 * r + 0.587 * g + 0.114 * b;
  return l >= minL && max - min <= maxSat;
}

function keyWhite(data, w, h, minL, maxSat) {
  const n = w * h;
  const seen = new Uint8Array(n);
  const q = new Int32Array(n);
  let head = 0;
  let tail = 0;
  const push = (i) => {
    if (seen[i]) return;
    const o = i * 4;
    if (!isBg(data[o], data[o + 1], data[o + 2], minL, maxSat)) return;
    seen[i] = 1;
    q[tail++] = i;
  };
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
  return alpha;
}

function stripHalo(data, alpha, w, h) {
  const out = Buffer.from(alpha);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (!alpha[i]) continue;
      const nearBg =
        !alpha[i - 1] ||
        !alpha[i + 1] ||
        !alpha[i - w] ||
        !alpha[i + w] ||
        !alpha[i - w - 1] ||
        !alpha[i - w + 1] ||
        !alpha[i + w - 1] ||
        !alpha[i + w + 1];
      if (!nearBg) continue;
      const o = i * 4;
      const l = 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2];
      if (l > 130) out[i] = 0;
    }
  }
  return out;
}

function choke(alpha, w, h, times) {
  let cur = alpha;
  for (let t = 0; t < times; t++) {
    const next = Buffer.from(cur);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (!cur[i]) continue;
        if (!cur[i - 1] || !cur[i + 1] || !cur[i - w] || !cur[i + w]) next[i] = 0;
      }
    }
    cur = next;
  }
  return cur;
}

function bbox(alpha, w, h) {
  let minX = w,
    minY = h,
    maxX = 0,
    maxY = 0;
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
  return { minX, minY, maxX, maxY };
}

async function run() {
  for (const job of jobs) {
    const { data, info } = await sharp(job.src)
      .rotate()
      .ensureAlpha()
      .resize({ width: 1400, withoutEnlargement: true })
      .raw()
      .toBuffer({ resolveWithObject: true });
    const { width: w, height: h } = info;
    const alpha = stripHalo(
      data,
      choke(keyWhite(data, w, h, job.minL, job.maxSat), w, h, job.choke ?? 1),
      w,
      h,
    );

    const rgba = Buffer.alloc(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      const o = i * 4;
      const a = alpha[i];
      rgba[o] = a ? data[o] : CARD.r;
      rgba[o + 1] = a ? data[o + 1] : CARD.g;
      rgba[o + 2] = a ? data[o + 2] : CARD.b;
      rgba[o + 3] = 255;
    }

    const box = bbox(alpha, w, h);
    const pad = Math.round(
      Math.max(box.maxX - box.minX, box.maxY - box.minY) * 0.08,
    );
    const left = Math.max(0, box.minX - pad);
    const top = Math.max(0, box.minY - pad);
    const crop = {
      left,
      top,
      width: Math.min(w, box.maxX + 1 + pad) - left,
      height: Math.min(h, box.maxY + 1 + pad) - top,
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
      .toFile(path.join(dir, job.out));

    console.log("ok", job.out, crop);
  }
}

await run();
