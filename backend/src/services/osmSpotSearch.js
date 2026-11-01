/* =========================================================
 * 海外城市「可玩点」检索：OpenStreetMap / Overpass API
 *
 * 为什么需要它：高德只覆盖中国大陆，东京 / 巴黎 / 纽约这类目的地
 * 检索结果几乎为空。Overpass 免费、无需 Key、无 IP 限制，
 * 且 Render 免费实例本身在海外机房，链路反而比回连国内更稳。
 *
 * 数据来源：OpenStreetMap contributors（ODbL 协议，论文可引用）
 * 接口：POST https://overpass-api.de/api/interpreter（QL 查询）
 * ========================================================= */

const fs = require('fs');
const path = require('path');

const ENDPOINT = process.env.OSM_ENDPOINT || 'https://overpass-api.de/api/interpreter';
/* 本地缓存：Overpass 公共实例排队严重（实测单次 45-57s），
 * 热门城市已由 scripts/prefetch_osm.js 预抓落盘，运行时直接读文件秒回。 */
const CACHE_FILE = path.join(__dirname, '..', '..', 'data', 'osm_cache.json');
/* Overpass 单次查询常需 30-60s（公共实例排队），超时给到 90s；
 * 运行时不实时调用（读预抓缓存），只有预抓脚本会走到这里 */
const TIMEOUT = Number(process.env.OSM_TIMEOUT || 90000);
const RADIUS = Number(process.env.OSM_RADIUS || 15000);   // 以城市中心为圆心的搜索半径（米）
const TARGET_TOTAL = 100;

/* OSM 标签 → 站内 6 类。命中顺序即优先级，一个元素命中多条时取第一条。
 * 与 scenicSpotSearch.js 的 GROUP_CATEGORY 保持一致 */
const CATEGORY_RULES = [
  ['景点', [
    'tourism=attraction', 'tourism=viewpoint', 'tourism=artwork', 'historic=monument',
    'historic=memorial', 'historic=castle', 'historic=ruins', 'historic=archaeological_site',
    'leisure=park', 'natural=peak', 'leisure=garden'
  ]],
  ['文化', [
    'tourism=museum', 'tourism=gallery', 'amenity=arts_centre', 'amenity=library',
    'amenity=theatre', 'tourism=zoo', 'religion=*'
  ]],
  ['购物', [
    'shop=mall', 'shop=department_store', 'shop=marketplace', 'amenity=marketplace',
    'shop=clothes', 'shop=gift', 'shop=souvenir'
  ]],
  ['美食', [
    'amenity=restaurant', 'amenity=cafe', 'amenity=bar', 'amenity=pub',
    'amenity=fast_food', 'amenity=ice_cream'
  ]],
  ['休闲', [
    'leisure=playground', 'leisure=sports_centre', 'leisure=marina',
    'amenity=spa', 'leisure=beach_resort', 'natural=beach'
  ]]
];

/* 查询分三种：
 *   wikidata  只取有 wikidata 条目的 POI（≈ 维基百科有词条），这是最干净的知名度筛选
 *   sight     强类型景点（博物馆 / 城堡 / 公园 / 商场…），作为 wikidata 不足时的补充
 *   food      餐厅咖啡馆，只用于「景点周边餐厅」兜底
 * 分开发是因为 Overpass 有单次返回条数上限，混在一起时
 * 大量小公园会把知名地标挤掉（实测东京 300 条里几乎没有浅草寺 / 晴空塔） */
function buildQL(lat, lon, kind) {
  if (kind === 'food') {
    return `[out:json][timeout:${Math.ceil(TIMEOUT / 1000)}];
(nwr["amenity"~"^(restaurant|cafe)$"](around:${RADIUS},${lat},${lon}););
out center tags 200;`;
  }
  if (kind === 'wikidata') {
    return `[out:json][timeout:${Math.ceil(TIMEOUT / 1000)}];
(nwr["wikidata"]["tourism"](around:${RADIUS},${lat},${lon});
 nwr["wikidata"]["historic"](around:${RADIUS},${lat},${lon});
 nwr["wikidata"]["leisure"](around:${RADIUS},${lat},${lon});
 nwr["wikidata"]["amenity"~"^(marketplace|theatre|place_of_worship|arts_centre|library)$"](around:${RADIUS},${lat},${lon});
 nwr["wikidata"]["shop"~"^(mall|department_store)$"](around:${RADIUS},${lat},${lon});
 nwr["wikidata"]["natural"~"^(beach|peak)$"](around:${RADIUS},${lat},${lon}););
out center tags 300;`;
  }
  const body = `
  nwr["tourism"~"^(attraction|museum|viewpoint|gallery|zoo|artwork|aquarium)$"](around:${RADIUS},${lat},${lon});
  nwr["historic"~"^(monument|memorial|castle|ruins|archaeological_site)$"](around:${RADIUS},${lat},${lon});
  nwr["leisure"~"^(park|garden|playground|marina)$"](around:${RADIUS},${lat},${lon});
  nwr["natural"~"^(beach|peak)$"](around:${RADIUS},${lat},${lon});
  nwr["amenity"~"^(arts_centre|theatre|library|marketplace|place_of_worship)$"](around:${RADIUS},${lat},${lon});
  nwr["shop"~"^(mall|department_store|marketplace)$"](around:${RADIUS},${lat},${lon});`;
  return `[out:json][timeout:${Math.ceil(TIMEOUT / 1000)}];(${body});out center tags 300;`;
}

/* 单个元素的标签集合 → 类别；命中不到返回 null（丢弃） */
function classifyTag(tags) {
  const pairs = [];
  Object.keys(tags || {}).forEach(k => {
    const v = String(tags[k] || '');
    pairs.push(`${k}=${v}`);
    /* religion=* 这类通配规则：只比较键名 */
    pairs.push(`${k}=*`);
  });
  for (const [category, rules] of CATEGORY_RULES) {
    for (const rule of rules) {
      if (pairs.includes(rule)) return category;
    }
  }
  return null;
}

/* 取本地化名称：优先中文，其次英文，最后 name 原值 */
function pickName(tags) {
  const cand = [tags['name:zh'], tags['name:zh-Hans'], tags.name, tags['name:en']];
  for (const n of cand) {
    const s = String(n || '').trim();
    if (s) return s;
  }
  return '';
}

/* 知名度打分：OSM 里「公园」「纪念碑」这类小点位占绝大多数，
 * 不加过滤会排出「高田馬場再開発記念碑」这种没人去的点。
 * 有 wikidata 条目 ≈ 维基百科有词条，是最可靠的知名度信号；
 * 其次看是否属于强类型（博物馆 / 城堡 / 海滨 / 市场 / 商场等） */
const STRONG_TYPES = [
  'tourism=attraction', 'tourism=museum', 'tourism=zoo', 'tourism=aquarium',
  'tourism=gallery', 'tourism=viewpoint',
  'historic=castle', 'historic=monument', 'historic=archaeological_site', 'historic=ruins',
  'leisure=park', 'leisure=marina',
  'natural=beach', 'natural=peak',
  'amenity=marketplace', 'amenity=theatre',
  'shop=mall', 'shop=department_store'
];

function fameScore(tags) {
  let s = 0;
  if (tags.wikidata) s += 3;
  if (tags.wikipedia) s += 2;
  const pairs = Object.keys(tags).map(k => `${k}=${tags[k]}`);
  if (pairs.some(p => STRONG_TYPES.includes(p))) s += 2;
  return s;
}

/* Overpass 元素 → 站内统一结构（与 scenicSpotSearch.toPlace 对齐） */
function toPlace(el, category) {
  if (!el) return null;
  const tags = el.tags || {};
  const name = pickName(tags);
  if (!name) return null;

  /* 节点自带 lat/lon；way / relation 用 center（QL 里已 out center） */
  const lat = Number(el.lat != null ? el.lat : (el.center && el.center.lat));
  const lng = Number(el.lon != null ? el.lon : (el.center && el.center.lon));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const addrParts = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean);
  const address = addrParts.join(' ') || tags['addr:full'] || tags['addr:city'] || '';

  return {
    id: 'osm_' + (el.type || 'n') + (el.id || name),
    name,
    address,
    city: tags['addr:city'] || '',
    location: `${lng},${lat}`,
    lng,
    lat,
    rating: 0,                       /* OSM 无评分，前端显示时留空即可 */
    price: '',
    hours: String(tags.opening_hours || ''),
    tel: String(tags.phone || tags['contact:phone'] || ''),
    type: Object.keys(tags).filter(k => /^(tourism|historic|leisure|amenity|shop|natural|religion)$/.test(k))
      .map(k => `${k}=${tags[k]}`).join(';'),
    category,
    fame: fameScore(tags),           /* 0-5，越高越知名，用于排序而非展示 */
    source: 'osm'
  };
}

/* 单次 POST 查询，失败返回 null（调用方降级） */
async function query(lat, lon, kind) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT);
  try {
    const body = buildQL(Number(lat).toFixed(6), Number(lon).toFixed(6), kind);
    const r = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'User-Agent': 'WanderGo/1.0 (graduation project)'
      },
      body: 'data=' + encodeURIComponent(body),
      signal: ctl.signal
    });
    if (!r.ok) {
      console.warn('[osm] HTTP', r.status, kind);
      return null;
    }
    return await r.json();
  } catch (e) {
    console.warn('[osm]', kind, e.name === 'AbortError' ? 'timeout' : String(e.message || e));
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 搜索海外城市的可玩点位
 * @param {{lng:number, lat:number}} center 城市中心坐标（WGS-84）
 * @param {object} opts { limit=200 }
 * @returns {Promise<{ok:boolean, total:number, byCategory:object, places:Array, source:string}>}
 */
async function searchOsmSpots(center, opts = {}) {
  const limit = Math.max(1, Number(opts.limit) || 200);
  if (!center || !Number.isFinite(center.lng) || !Number.isFinite(center.lat)) {
    return { ok: false, total: 0, byCategory: {}, places: [], source: 'osm', reason: 'no_center' };
  }

  /* 串行三连：wikidata 知名点 → 强类型景点补充 → 餐饮兜底。
   * 必须串行：Overpass 公共实例排队严重，并发请求会一起排队一起超时。 */
  const jWiki = await query(center.lat, center.lng, 'wikidata');
  const wikiEls = jWiki && Array.isArray(jWiki.elements) ? jWiki.elements : [];

  /* wikidata 命中够 60 条就不再查强类型：既省一次 60s 请求，
   * 也避免小公园挤占行程名额 */
  let sightEls = [];
  if (wikiEls.length < 60) {
    const jSight = await query(center.lat, center.lng, 'sight');
    sightEls = jSight && Array.isArray(jSight.elements) ? jSight.elements : [];
  }

  /* 餐饮只用于景点周边兜底，前面的查询全失败就没必要再等 */
  let foodEls = [];
  if (wikiEls.length || sightEls.length) {
    const jFood = await query(center.lat, center.lng, 'food');
    foodEls = jFood && Array.isArray(jFood.elements) ? jFood.elements : [];
  }

  /* 去重时排前面的优先保留：wikidata 命中的知名点放最前，
   * 同名时能压过强类型查询里的小公园 */
  const elements = wikiEls.concat(sightEls, foodEls);
  if (!elements.length) {
    return { ok: false, total: 0, byCategory: {}, places: [], source: 'osm', reason: 'osm_error' };
  }

  /* 按名称去重 + 分类，同名保留先出现的（通常是节点，坐标更准） */
  const map = new Map();
  elements.forEach(el => {
    const cat = classifyTag(el.tags);
    if (!cat) return;
    const place = toPlace(el, cat);
    if (!place || map.has(place.name)) return;
    map.set(place.name, place);
  });

  /* 每个类别内部先按知名度降序（wikidata / 强类型优先），
   * 再做类别均衡输出：避免结果全是餐厅或全是小公园 */
  const bucket = {};
  Array.from(map.values())
    .sort((a, b) => b.fame - a.fame)
    .forEach(p => (bucket[p.category] = bucket[p.category] || []).push(p));
  /* 美食只用于周边兜底，不占行程景点名额，放在最后 */
  const keys = ['景点', '文化', '购物', '休闲', '美食'].filter(k => bucket[k] && bucket[k].length);
  const out = [];
  while (out.length < limit) {
    let moved = false;
    keys.forEach(k => {
      const p = bucket[k].shift();
      if (p && out.length < limit) { out.push(p); moved = true; }
    });
    if (!moved) break;
  }

  const byCategory = {};
  out.forEach(p => { byCategory[p.category] = (byCategory[p.category] || 0) + 1; });

  return {
    ok: true,
    total: out.length,
    enough: out.length >= TARGET_TOTAL,
    byCategory,
    places: out,
    source: 'osm'
  };
}

/* ---------------- 本地缓存 ---------------- */
let cacheMemo = null;

/* 读取预抓缓存：{ '东京': [place...], ... }，文件缺失或损坏时返回空对象 */
function readCache() {
  if (cacheMemo) return cacheMemo;
  try {
    cacheMemo = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8')) || {};
  } catch {
    cacheMemo = {};
  }
  return cacheMemo;
}

/**
 * 海外城市检索入口：先查本地缓存（预抓落盘，秒回），未命中才走 Overpass。
 * @param {string} city 城市名（缓存键）
 * @param {{lng:number, lat:number}} center 城市中心
 * @param {object} opts { limit }
 */
async function searchOsmByCity(city, center, opts = {}) {
  const limit = Math.max(1, Number(opts.limit) || 200);
  const hit = readCache()[String(city || '').trim()];
  if (Array.isArray(hit) && hit.length) {
    const places = hit.slice(0, limit);
    const byCategory = {};
    places.forEach(p => { byCategory[p.category] = (byCategory[p.category] || 0) + 1; });
    return {
      ok: true, total: places.length, enough: places.length >= TARGET_TOTAL,
      byCategory, places, source: 'osm', cached: true
    };
  }
  /* 缓存未命中也不实时抓：Overpass 公共实例排队 45-130s，还会返回 429/502，
   * 让用户对着一个转圈的接口等两分钟毫无意义。
   * 海外景点已由「站内精编库 + 大模型」保证，未预抓的城市直接空返回。
   * 需要补城市请跑 `node scripts/prefetch_osm.js <城市>`。 */
  console.warn('[osm] 无缓存，跳过实时抓取：', city);
  return { ok: false, total: 0, enough: false, byCategory: {}, places: [], source: 'osm', reason: 'no_cache' };
}

module.exports = { searchOsmSpots, searchOsmByCity, classifyTag, toPlace, CATEGORY_RULES, CACHE_FILE, readCache };
