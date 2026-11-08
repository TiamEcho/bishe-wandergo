/* =========================================================
 * 外链封面本地化脚本 · node scripts/localize-covers.js
 *
 * 背景：社区/搜索/帖子详情页的攻略封面大量来自 B站 CDN（i0/i1/i2.hdslb.com），
 *       B站按 Referer 做防盗链：从 GitHub Pages 打开时浏览器带 Pages 的 Referer，
 *       图片直接 403。Unsplash 是海外 CDN，国内也经常超时。
 *
 * 做法：把 posts_crawl.json 里所有 http(s) 开头的 cover 下载到 img/covers/，
 *       B站图用原哈希文件名，Unsplash 按 photo-id 命名，最后把 JSON 里的
 *       cover 改写成 img/covers/xxx.webp（缩略）+ coverFull（原尺寸）。
 *
 * 用法：
 *   node scripts/localize-covers.js              下载缺失的
 *   node scripts/localize-covers.js --force      全部重下
 *
 * 说明：B站请求不带 Referer（带了就 403），下载后统一压成 WebP。
 * ========================================================= */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const JSON_FILE = path.join(ROOT, 'js', 'posts_crawl.json');
const OUT_DIR = path.join(ROOT, 'img', 'covers');

const force = process.argv.includes('--force');

/* B站图：https://i0.hdslb.com/bfs/archive/<hash>.jpg → <hash>.webp
 * Unsplash：photo-1506905925346-21bda4d32df4?... → unsplash-1506905925346-21bda4d32df4.webp
 * 其他域名：host + 路径末尾，做个可读的名字 */
function localName(url) {
  const u = new URL(url);
  const base = path.basename(u.pathname).replace(/\.[a-zA-Z0-9]+$/, '');
  if (/(^|\.)hdslb\.com$|(^|\.)bilivideo\.com$/.test(u.host)) return base.toLowerCase() + '.webp';
  if (/(^|\.)unsplash\.com$/.test(u.host)) return 'unsplash-' + base.replace(/^photo-/, '') + '.webp';
  return (u.host.replace(/\./g, '-') + '-' + base).toLowerCase().replace(/[^a-z0-9\-_.]/g, '') + '.webp';
}

async function grab(url, file, attempt = 1) {
  try {
    /* 关键：不带任何 Referer，B站才会放行 */
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'image/avif,image/webp,image/*,*/*' },
      signal: AbortSignal.timeout(60000),
      redirect: 'follow'
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 2048) throw new Error('图片过小 ' + buf.length + 'B');
    let out = buf;
    let sharp = null;
    try { sharp = require('sharp'); } catch (e) { sharp = null; }
    if (sharp) {
      const full = path.join(OUT_DIR, path.basename(file).replace(/\.webp$/, '.full.webp'));
      out = await sharp(buf).resize({ width: 960, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
      fs.writeFileSync(file, out);
      /* 原图另存一份，点开大图时用；失败不影响缩略图 */
      try {
        const big = await sharp(buf).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 84 }).toBuffer();
        fs.writeFileSync(full, big);
      } catch (e) { }
    } else {
      /* 没有 sharp 就原样落盘（扩展名仍写 .webp 会误导浏览器，因此保留原扩展名） */
      const raw = path.join(OUT_DIR, path.basename(file).replace(/\.webp$/, '') + (path.extname(new URL(url).pathname) || '.jpg'));
      fs.writeFileSync(raw, buf);
      return raw;
    }
    return file;
  } catch (e) {
    if (attempt >= 3) throw e;
    await new Promise(r => setTimeout(r, 1500 * attempt));
    return grab(url, file, attempt + 1);
  }
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
  const arr = Array.isArray(data) ? data : (data.posts || data.list);
  const urls = [...new Set(arr.map(p => String(p.cover || '')).filter(c => /^https?:\/\//.test(c)))];
  console.log(`待本地化封面 ${urls.length} 张 → img/covers/`);

  const map = {};
  let ok = 0, fail = 0;
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const name = localName(url);
    const file = path.join(OUT_DIR, name);
    if (!force && fs.existsSync(file) && fs.statSync(file).size > 2048) {
      map[url] = name; ok++;
      console.log(`  [${i + 1}/${urls.length}] ${name} 已存在，跳过`);
      continue;
    }
    try {
      const saved = await grab(url, file);
      map[url] = path.basename(saved);
      ok++;
      console.log(`  [${i + 1}/${urls.length}] ${name} ✓ ${(fs.statSync(saved).size / 1024).toFixed(0)} KB`);
    } catch (e) {
      fail++;
      console.log(`  [${i + 1}/${urls.length}] ${name} ✗ ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 120));
  }

  /* 回写 JSON：cover 改成相对路径，coverFull 指向大图 */
  let changed = 0;
  arr.forEach(p => {
    const c = String(p.cover || '');
    if (!/^https?:\/\//.test(c)) return;
    const name = map[c];
    if (!name) return;
    const hasFull = fs.existsSync(path.join(OUT_DIR, name.replace(/\.webp$/, '.full.webp')));
    p.cover = 'img/covers/' + name;
    if (hasFull) p.coverFull = 'img/covers/' + name.replace(/\.webp$/, '.full.webp');
    changed++;
  });
  fs.writeFileSync(JSON_FILE, JSON.stringify(Array.isArray(data) ? arr : data, null, 1) + '\n');
  console.log(`\n完成：成功 ${ok} / 失败 ${fail}，回写 ${changed} 条封面路径`);
})();
