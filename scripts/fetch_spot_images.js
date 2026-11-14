/* 用维基共享资源（Wikimedia Commons）给景点配真实实拍图。
 * 检索顺序：
 *   1) 先用中文景点名走 Commons 的 zh 站点搜索（i18n 支持较好）；
 *   2) 再用「英文景点名 + 英文城市名」搜索，并按文件名/分类关键词打分；
 *   3) 只保留横图、过滤地图 / 标志 / 线路图之类的图；
 *   4) 仍无匹配就留空（img:''），前端不会放占位图。
 * 用法：
 *   node scripts/fetch_spot_images.js 首尔 釜山 济州岛 东京 曼谷
 *   node scripts/fetch_spot_images.js --all-ab        # 全部海外城市
 *   node scripts/fetch_spot_images.js --all           # 全部城市（含国内）
 *   node scripts/fetch_spot_images.js 首尔 --force    # 覆盖已有 img
 * 结果写回 js/spots_crawl.json 的 img 字段；已匹配过的会记录在 scripts/.img_cache.json。 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SPOT_PATH = path.join(ROOT, 'js', 'spots_crawl.json');
const CACHE_PATH = path.join(ROOT, 'scripts', '.img_cache.json');
const MAP_PATH = path.join(__dirname, 'spot_en_names.json');

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const ALL = args.includes('--all');
const ALL_AB = args.includes('--all-ab');
const cities = args.filter(a => !a.startsWith('--'));

const UA = 'WANDERGO-Bishe/1.0 (educational project)';
const EN_CITY = {
  首尔: 'Seoul', 釜山: 'Busan', 济州岛: 'Jeju', 东京: 'Tokyo', 京都: 'Kyoto', 大阪: 'Osaka',
  曼谷: 'Bangkok', 新加坡: 'Singapore', 吉隆坡: 'Kuala Lumpur', 巴厘岛: 'Bali',
  纽约: 'New York', 洛杉矶: 'Los Angeles', 伦敦: 'London', 巴黎: 'Paris', 罗马: 'Rome',
  悉尼: 'Sydney', 墨尔本: 'Melbourne', 河内: 'Hanoi', 岘港: 'Da Nang',
  迪拜: 'Dubai', 伊斯坦布尔: 'Istanbul', 莫斯科: 'Moscow', 布拉格: 'Prague',
  维也纳: 'Vienna', 阿姆斯特丹: 'Amsterdam', 清迈: 'Chiang Mai', 普吉岛: 'Phuket',
  札幌: 'Sapporo', 冲绳: 'Okinawa', 冰岛: 'Iceland', 马尔代夫: 'Maldives'
};
/* 中文景点名 → 英文检索词（Commons 对中文的支持不稳定，主力还是英文） */
const EN_SPOT = fs.existsSync(MAP_PATH) ? JSON.parse(fs.readFileSync(MAP_PATH, 'utf8')) : {};

const cache = fs.existsSync(CACHE_PATH) ? JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8')) : {};
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function api(params, host = 'commons.wikimedia.org') {
  const url = 'https://' + host + '/w/api.php?' + new URLSearchParams({ format: 'json', ...params });
  if (cache[url]) return cache[url];
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      cache[url] = j;
      return j;
    } catch { await sleep(700 * (i + 1)); }
  }
  return null;
}

/* 中文站搜索 → 拿到对应的 Commons 分类 / 标题，再取该标题下的图片 */
async function searchZh(query) {
  const j = await api({ action: 'query', list: 'search', srsearch: query, srlimit: '3' }, 'zh.wikipedia.org');
  return ((j && j.query && j.query.search) || []).map(x => x.title);
}

async function searchImages(query, limit = 15) {
  const j = await api({
    action: 'query', generator: 'search', gsrsearch: query, gsrnamespace: '6', gsrlimit: String(limit),
    prop: 'imageinfo', iiprop: 'url|size', iiurlwidth: '1280'
  });
  const pages = (j && j.query && j.query.pages) || {};
  return Object.values(pages).map(p => {
    const ii = (p.imageinfo || [])[0] || {};
    /* Commons 的缩略图域名是 upload.wikimedia.org，thumb.wikimedia.org 解析不了 */
    const url = String(ii.thumburl || ii.url || '')
      .replace('//thumb.wikimedia.org/', '//upload.wikimedia.org/')
      .replace(/[?&]utm_[^&]*/g, '').replace(/\?$/, '');
    return { title: p.title || '', url, width: ii.thumbwidth || 0, height: ii.thumbheight || 0 };
  }).filter(x => x.url && x.width >= 700 && x.width > x.height * 0.95);
}

const norm = s => String(s || '').toLowerCase().replace(/[\s\-_·()（）,.'’]/g, '');
const BAD = /map|logo|icon|flag|seal|diagram|plan of|route|line|station|platform|sign|chart|cover art|poster|stamp|banknote|aircraft|airline/i;

function score(c, keys) {
  const t = norm(c.title);
  let s = 0;
  keys.forEach((k, i) => { if (k && t.includes(norm(k))) s += (i === 0 ? 5 : 2); });
  if (BAD.test(c.title)) s -= 12;
  if (/\b(jpg|jpeg)\b/i.test(c.title)) s += 0.3;
  s += Math.min(c.width, 1600) / 3200;
  return s;
}

async function imageFor(spot, enCity) {
  const enSpot = EN_SPOT[spot.name] || '';
  const keys = [enSpot, spot.name, enCity].filter(Boolean);
  const queries = [];
  if (enSpot && enCity) queries.push(`${enSpot} ${enCity}`);
  if (enSpot) queries.push(enSpot);
  queries.push(`${spot.name} ${spot.city}`);
  if (enSpot && enCity) queries.push(`Category:${enSpot}`);

  let best = null;
  for (const q of queries) {
    const cands = await searchImages(q);
    /* 必须有城市命中（同名景点分布在多个城市，避免张冠李戴） */
    let strict = enCity ? cands.filter(c => norm(c.title).includes(norm(enCity))) : cands;
    /* 景点很出名时文件名里往往不带城市名，这时允许放宽，但要求景点词命中得更强 */
    if (!strict.length && enSpot) strict = cands.filter(c => norm(c.title).includes(norm(enSpot)));
    const pool = strict.length ? strict : (enSpot ? cands : []);
    pool.forEach(c => {
      const s = score(c, keys);
      if (!best || s > best.s) best = { s, c, q };
    });
    if (best && best.s > 4) break;
    await sleep(120);
  }
  if (best && best.s > 1.5) return best;
  return null;
}

(async () => {
  const spots = JSON.parse(fs.readFileSync(SPOT_PATH, 'utf8'));
  let targets;
  if (ALL) targets = spots;
  else if (ALL_AB) targets = spots.filter(s => s.region === 'ab');
  else if (cities.length) targets = spots.filter(s => cities.includes(s.city));
  else { console.log('请指定城市：node scripts/fetch_spot_images.js 首尔 釜山 济州岛 东京 曼谷'); process.exit(1); }
  targets = targets.filter(s => FORCE || !s.img);
  console.log(`待处理景点 ${targets.length} 个`);

  let ok = 0, miss = 0;
  for (const s of targets) {
    const r = await imageFor(s, EN_CITY[s.city] || '');
    if (r) { s.img = r.c.url; ok++; console.log(`✔ ${s.city} · ${s.name}  ←  ${r.c.title}   [${r.q}]`); }
    else { s.img = ''; miss++; console.log(`✘ ${s.city} · ${s.name}  （无匹配，留空）`); }
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache), 'utf8');
    await sleep(150);
  }
  fs.writeFileSync(SPOT_PATH, JSON.stringify(spots, null, 0), 'utf8');
  console.log(`\n完成：命中 ${ok}，留空 ${miss}`);
})();
