/* =========================================================
 * 图片健康检查 · node scripts/check-images.js
 *
 * 校验三件事：
 *   1. 代码/数据里是否还残留外链图片（防盗链、海外 CDN 超时）
 *   2. 所有本地图片引用是否真实存在于磁盘
 *   3. img/covers 与 posts_crawl.json 的 cover 是否一一对应
 *
 * 有任一问题退出码为 1，可直接挂到 CI。
 * ========================================================= */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SCAN_EXT = new Set(['.html', '.js', '.css', '.json']);
/* 只扫前端目录，backend 里的 xiaohongshu referer 是反爬用的，与图片无关 */
const SKIP_DIRS = new Set(['node_modules', '.git', 'backend', 'scripts', 'site-deploy', 'runs', '.trae-html-share-packages']);
/* 图片类外链域名：这些出现在 <img>/background 里就是问题 */
const IMG_HOST = /(^|\.)(hdslb|bilivideo|douyinpic|douyinvod|ixigua|kuaishou|unsplash|pexels|picsum|byteimg|sns-img|\w*guru)\.[a-z.]+/i;

const extRe = /https?:\/\/[^\s"'`)\\]*/g;
const problems = [];

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name) || e.name.startsWith('.')) continue;
      walk(path.join(dir, e.name), out);
    } else if (SCAN_EXT.has(path.extname(e.name))) out.push(path.join(dir, e.name));
  }
  return out;
}

const files = walk(ROOT, []);
const rel = f => path.relative(ROOT, f).replace(/\\/g, '/');

/* ---- 1. 残留外链 ---- */
let extCount = 0;
for (const f of files) {
  const txt = fs.readFileSync(f, 'utf8');
  const hits = txt.match(extRe) || [];
  for (const u of hits) {
    let host = '';
    try { host = new URL(u).host; } catch (e) { continue; }
    if (IMG_HOST.test(host) && !/trae-api-cn/.test(host)) {
      /* js/data.js 里 IMGAPI 是「本地清单未命中」的运行时兜底，不算静态外链 */
      extCount++;
      problems.push(`外链图片: ${rel(f)} → ${u.slice(0, 110)}`);
    }
  }
}
/* trae-api 只允许出现在 data.js 的兜底常量里 */
for (const f of files) {
  const txt = fs.readFileSync(f, 'utf8');
  if (/trae-api-cn\.mchost\.guru/.test(txt) && rel(f) !== 'js/data.js') {
    problems.push(`文生图 API 出现在非兜底文件: ${rel(f)}`);
  }
}

/* ---- 2. 本地图片引用是否存在 ---- */
const refRe = /(?:src|data-full|:src|url\()\s*[=:(]?\s*["']?((?:\.\.\/)?(?:img|images|assets)\/[^"'\s)]+)["']?/g;
const localRefs = new Set();
for (const f of files) {
  if (rel(f).startsWith('js/covers') || rel(f) === 'scripts/check-images.js') continue;
  const txt = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = refRe.exec(txt))) localRefs.add(m[1].split('?')[0]);
  /* 字符串里直接写的本地图路径（JS 常量、内联拼接等），refRe 抓不到 */
  const m3 = txt.match(/(?:^|["'`(=:\s])(\.{0,2}\/?img\/[a-zA-Z0-9_\-/]+\.(?:webp|jpe?g|png|svg|gif))/g) || [];
  /* 注释里的示例路径（xxx.webp 这种占位符）不是真实引用 */
  m3.map(x => x.replace(/^["'`(=:\s]+/, '')).filter(x => !/\/xxx\./.test(x)).forEach(x => localRefs.add(x));
}
/* JSON 里的 img/covers/xxx.webp、img/spots/xxx.webp */
for (const f of files.filter(x => x.endsWith('.json'))) {
  const txt = fs.readFileSync(f, 'utf8');
  const m2 = txt.match(/img\/[a-zA-Z0-9_\-/]+\.(webp|jpe?g|png|svg|gif)/g) || [];
  m2.forEach(x => localRefs.add(x));
}
let missing = 0;
for (const r of localRefs) {
  const p = path.join(ROOT, r.replace(/^\.\//, ''));
  if (!fs.existsSync(p)) { missing++; problems.push(`本地图缺失: ${r}`); }
}

/* ---- 3. covers 与 posts_crawl.json 对照 ---- */
const coverDir = path.join(ROOT, 'img', 'covers');
const coverFiles = fs.existsSync(coverDir) ? fs.readdirSync(coverDir) : [];
const posts = JSON.parse(fs.readFileSync(path.join(ROOT, 'js', 'posts_crawl.json'), 'utf8')).posts || [];
const usedCovers = new Set(posts.map(p => p.cover).filter(c => /^img\/covers\//.test(c)).map(c => path.basename(c)));
const unused = coverFiles.filter(f => !f.endsWith('.full.webp') && !usedCovers.has(f));

console.log('==== 图片健康检查 ====');
console.log(`扫描文件      ${files.length}`);
console.log(`本地图引用    ${localRefs.size}（缺失 ${missing}）`);
console.log(`残留外链图片  ${extCount}`);
console.log(`img/covers    ${coverFiles.filter(f => !f.endsWith('.full.webp')).length} 张（未被引用 ${unused.length}）`);
console.log(`帖子封面      本地 ${posts.filter(p => /^img\//.test(p.cover)).length} / 共 ${posts.length}`);

if (unused.length) console.log('\n未被引用的封面（可删）:\n  ' + unused.join('\n  '));
if (problems.length) {
  console.log(`\n发现 ${problems.length} 个问题:`);
  problems.slice(0, 60).forEach(p => console.log('  ✗ ' + p));
  process.exit(1);
}
console.log('\n✓ 无残留外链，本地图片全部存在');
