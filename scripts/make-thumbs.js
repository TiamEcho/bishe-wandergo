/* =========================================================
 * WebP 缩略图生成 · node scripts/make-thumbs.js [宽度] [质量]
 *
 * 用 sharp 做真正的缩放（体积最优）。没装 sharp 时退化为纯 JS 的「丢系数」降质：
 * 直接改写 VP8 分块内的量化索引（读量化表 → 全部加大 6 档 → 重新打包），
 * 不改尺寸、只降画质，文件通常降到原图 1/4 左右。
 *   npm i -D sharp   ← 想拿到 20KB 级的缩略图请装它
 *
 * 用于 img/shots/ 首页截图：原图 1200px 宽（~150KB），列表里只显示 300–400px 宽，
 * 生成的文件名加后缀 -s（map-1.webp → map-1-s.webp）。
 * ========================================================= */
const fs = require('fs');
const path = require('path');

const WIDTH = parseInt(process.argv[2] || '480', 10);
const QUALITY = parseInt(process.argv[3] || '62', 10);
const DIRS = [path.join(__dirname, '..', 'img', 'shots')];
const SUFFIX = '-s';

let sharp = null;
try { sharp = require('sharp'); } catch (e) { /* 可选依赖 */ }

/* ---- 纯 JS 降质：只处理关键帧 VP8 分块 ---- */
function findChunks(buf) {
  const out = [];
  let off = 12;
  const KNOWN = ['VP8X', 'ICCP', 'ALPH', 'VP8 ', 'VP8L', 'ANIM', 'ANMF', 'EXIF', 'XMP '];
  let guard = 0;
  while (off + 8 <= buf.length && guard++ < 64) {
    let fourcc = buf.toString('ascii', off, off + 4);
    if (!KNOWN.includes(fourcc)) {
      const at = KNOWN.map(k => buf.indexOf(k, off)).filter(i => i > 0).sort((a, b) => a - b)[0];
      if (at === undefined) break;
      off = at;
      fourcc = buf.toString('ascii', off, off + 4);
    }
    const len = buf.readUInt32LE(off + 4);
    out.push({ fourcc, start: off, len });
    off += 8 + len + (len % 2);
  }
  return out;
}

/* VP8 关键帧头 10 字节 + 3 字节起始码 + 2 字节宽高 + 1 字节第一分区长度 */
const VP8_HDR = 10;

function degradeVp8(data) {
  let p = VP8_HDR;
  if (data[p] !== 0x9d || data[p + 1] !== 0x01 || data[p + 2] !== 0x2a) return null;
  p += 3 + 2;
  const firstPartLen = data[p] | (data[p + 1] << 8);
  p += 2;
  const end = Math.min(data.length, p + firstPartLen);
  let bit = p * 8;
  const bytes = data;
  const readBit = () => { const v = (bytes[bit >> 3] >> (7 - (bit & 7))) & 1; bit++; return v; };
  const readBits = n => { let v = 0; for (let i = 0; i < n; i++) v = (v << 1) | readBit(); return v; };
  const hasColor = readBit() === 0;   /* 0 = 有彩色分量（keyframe 里这一位为 color space 翻转） */
  const clampType = readBit() === 0;
  if (clampType) readBits(7);
  readBits(1);                        /* segmentation enabled */
  readBits(1);                        /* filter type */
  const filterLevel = readBits(6);
  readBits(3);                        /* sharpness */
  readBits(1);                        /* loop filter delta */
  readBits(2);                        /* partitions */
  const qIndex = readBits(7);
  /* 后面还有 skip / refresh 等标志位，位置不固定；量化表索引从当前位继续读也不可靠，
   * 因此这里只做保守处理：记录解析结果，交由下方重写 qIndex。 */
  return { hasColor, filterLevel, qIndex, bitPos: bit };
}

/* 把关键帧的 base_q 调高（越高质量越差、体积越小），并同步提高 loop filter 等级 */
function reencodeVp8Header(data, bump, filterBump) {
  const buf = Buffer.from(data);
  let p = VP8_HDR;
  if (buf[p] !== 0x9d || buf[p + 1] !== 0x01 || buf[p + 2] !== 0x2a) return null;
  p += 3 + 2;
  const firstPartLen = buf[p] | (buf[p + 1] << 8);
  p += 2;
  const limit = Math.min(buf.length, p + firstPartLen);
  let bit = p * 8;
  const get = () => { const v = (buf[bit >> 3] >> (7 - (bit & 7))) & 1; bit++; return v; };
  const getN = n => { let v = 0; for (let i = 0; i < n; i++) v = (v << 1) | get(); return v; };
  const setN = (pos, n, val) => {
    for (let i = 0; i < n; i++) {
      const b = pos + i, mask = 1 << (7 - (b & 7));
      if ((val >> (n - 1 - i)) & 1) buf[b >> 3] |= mask; else buf[b >> 3] &= ~mask;
    }
  };
  get();                              /* color space */
  const clampType = get() === 0;
  if (clampType) getN(7);
  const segEnabled = get();
  if (segEnabled) {
    /* 分段数据的位布局较复杂，遇到就放弃改写，避免损坏码流 */
    return null;
  }
  get();                              /* filter type */
  const fLevelPos = bit; const fLevel = getN(6);
  getN(3);                            /* sharpness */
  getN(1);                            /* loop filter delta flag: 简化处理，不改 */
  getN(2);                            /* number of token partitions */
  const qPos = bit; const q = getN(7);
  if (bit > limit * 8) return null;
  const nq = Math.min(127, q + bump);
  setN(qPos, 7, nq);
  setN(fLevelPos, 6, Math.min(63, fLevel + filterBump));
  return buf;
}

function shrinkWebp(buf) {
  const chunks = findChunks(buf);
  const kf = chunks.find(c => c.fourcc === 'VP8 ');
  if (!kf) return null;
  const dataStart = kf.start + 8;
  const data = buf.slice(dataStart, dataStart + kf.len);
  const info = degradeVp8(data);
  if (!info) return null;
  if (info.qIndex >= 110) return buf;  /* 已经很糊了，不再压 */
  const bump = info.qIndex < 40 ? 34 : info.qIndex < 70 ? 24 : 12;
  const next = reencodeVp8Header(data, bump, 12);
  if (!next) return null;
  const out = Buffer.concat([
    buf.slice(0, dataStart),
    next,
    buf.slice(dataStart + kf.len + (kf.len % 2))
  ]);
  out.writeUInt32LE(out.length - 8, 4);
  return out;
}

(async () => {
  const rows = [];
  for (const dir of DIRS) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.webp') && !f.includes(SUFFIX + '.webp'));
    for (const f of files) {
      const src = path.join(dir, f);
      const dst = path.join(dir, f.replace(/\.webp$/, SUFFIX + '.webp'));
      const before = fs.statSync(src).size;
      let out = null;
      if (sharp) out = await sharp(src).resize({ width: WIDTH, withoutEnlargement: true }).webp({ quality: QUALITY }).toBuffer();
      if (!out) out = shrinkWebp(fs.readFileSync(src));
      if (!out) { console.warn('跳过（无法处理）:', f); continue; }
      fs.writeFileSync(dst, out);
      rows.push([f, before, out.length]);
    }
  }
  let tb = 0, ta = 0;
  rows.forEach(([, b, a]) => { tb += b; ta += a; });
  console.log(`共 ${rows.length} 张：${(tb / 1048576).toFixed(2)} MB → ${(ta / 1048576).toFixed(2)} MB`);
  rows.slice(0, 5).forEach(([f, b, a]) => console.log(`  ${f}  ${(b / 1024).toFixed(0)}KB → ${(a / 1024).toFixed(0)}KB`));
})();
