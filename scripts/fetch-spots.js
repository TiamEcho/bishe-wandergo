/* =========================================================
 * 景点图片本地化脚本 · node scripts/fetch-spots.js
 *
 * 目的：把 data.js 里精编景点的图提前批量出好，转成 WebP 存到 img/spots/，
 *       前端 IMG() 命中清单就直接加载本地文件，不再实时打文生图接口。
 *
 * 依赖：Node 18+（内置 fetch）+ 环境变量 IMG_API_KEY（文生图接口的 Key）。
 *       WebP 压缩靠 sharp：npm i -D --include=optional sharp
 *
 * 用法：
 *   set IMG_API_KEY=xxx
 *   node scripts/fetch-spots.js                全部景点
 *   node scripts/fetch-spots.js --only=erhai,map-1
 *   node scripts/fetch-spots.js --force        覆盖已有文件
 *   node scripts/fetch-spots.js --size=portrait_4_3
 * ========================================================= */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'img', 'spots');
const API = 'https://trae-api-cn.mchost.guru/api/ide/v1/tool_text_to_image?prompt=';
const KEY = process.env.IMG_API_KEY || '';

const args = process.argv.slice(2);
const only = (args.find(a => a.startsWith('--only=')) || '').replace('--only=', '').split(',').filter(Boolean);
const force = args.includes('--force');
const size = (args.find(a => a.startsWith('--size=')) || '').replace('--size=', '') || 'landscape_4_3';

/* ---- 从 data.js 里取出 P 提示词表（不执行整个文件，避免依赖浏览器 API） ---- */
function loadPrompts() {
  const src = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');
  const start = src.indexOf('const P={');
  const end = src.indexOf('\n};', start);
  const body = src.slice(start + 'const P='.length, end + 2);
  const P = {};
  const re = /(\w+)\s*:\s*'((?:[^'\\]|\\.)*)'/g;
  let m;
  while ((m = re.exec(body))) P[m[1]] = m[2].replace(/\\'/g, "'");
  return P;
}

async function toWebp(buf) {
  const sharp = require('sharp');   // 没有 sharp 就别硬存：原图 jpg 太大，不如继续用线上接口
  return await sharp(buf).resize({ width: 960, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
}

async function fetchOne(id, prompt, idx, total) {
  const file = path.join(OUT_DIR, id + '.webp');
  if (!force && fs.existsSync(file) && fs.statSync(file).size > 4096) {
    console.log(`  [${idx}/${total}] ${id} 已存在，跳过`);
    return true;
  }
  const url = API + encodeURIComponent(prompt) + '&image_size=' + size;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const headers = KEY ? { Authorization: 'Bearer ' + KEY } : {};
      const r = await fetch(url, { headers, signal: AbortSignal.timeout(120000) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const ct = r.headers.get('content-type') || '';
      const buf = Buffer.from(await r.arrayBuffer());
      /* 接口失败时会返回 JSON 文本或「生成中」占位图，必须挡掉，否则会把废图存进仓库 */
      if (/json|text/i.test(ct) || buf[0] === 0x7b) {
        throw new Error('接口返回文本：' + buf.toString('utf8').slice(0, 120));
      }
      if (buf.length < 8192) throw new Error('图片过小（' + buf.length + 'B），疑似占位图');
      const webp = await toWebp(buf);
      fs.writeFileSync(file, webp);
      console.log(`  [${idx}/${total}] ${id} ✓ ${(webp.length / 1024).toFixed(0)} KB`);
      return true;
    } catch (e) {
      console.warn(`  [${idx}/${total}] ${id} 第 ${attempt} 次失败：${e.message}`);
      if (attempt === 3) return false;
      await new Promise(r => setTimeout(r, 2000 * attempt));
    }
  }
}

/* 清单只登记真实存在的文件，避免前端 404 后再回退 */
function writeManifest(allIds) {
  const map = {};
  allIds.forEach(id => {
    if (fs.existsSync(path.join(OUT_DIR, id + '.webp'))) map[id] = id;
  });
  const js = '/* 自动生成：scripts/fetch-spots.js。key 为 P 的键，值为 img/spots 下的文件名 */\n'
    + 'window.SPOT_IMG=' + JSON.stringify(map) + ';\n';
  fs.writeFileSync(path.join(OUT_DIR, 'manifest.js'), js);
  console.log(`\n清单已写入 img/spots/manifest.js（${Object.keys(map).length} 条）`);
}

(async () => {
  const P = loadPrompts();
  const all = Object.keys(P);
  let targets = all.filter(id => !/^hero|^qroad|^pool/.test(id));
  if (only.length) targets = targets.filter(id => only.includes(id));
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log(`共 ${targets.length} 个景点，输出到 img/spots/`);
  let ok = 0;
  for (let i = 0; i < targets.length; i++) {
    if (await fetchOne(targets[i], P[targets[i]], i + 1, targets.length)) ok++;
    await new Promise(r => setTimeout(r, 600));   // 接口有并发限制，串行慢慢取
  }
  writeManifest(all);
  console.log(`完成：成功 ${ok} / 目标 ${targets.length}`);
})();
