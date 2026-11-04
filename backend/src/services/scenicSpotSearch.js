/* =========================================================
 * 城市「可玩点」检索：景点 / 购物 / 文创 / 美食 / 休闲 / 文化
 * 只用类型编码（110000 风景名胜）会漏掉步行街、文创园、夜市、美术馆等，
 * 所以这里用 6 组中文关键词分别走高德 /v5/place/text，每组翻 3 页（25/页），
 * 合并后按名称去重，再按返回的 type 字符串标注类别。
 *
 * 依赖环境变量：AMAP_KEY（Web 服务 Key）
 * 未配置 Key 时 searchCitySpots 返回空数组，调用方自行降级。
 * ========================================================= */
const amap = require('../amap');

/* 6 组关键词：高德支持 "|" 连接多个词，一次请求会同时匹配 */
const SEARCH_KEYWORDS = [
  '5A景区|4A景区|3A景区|风景名胜区|古迹|古建筑',
  '步行街|商业街|购物中心|商场|奥特莱斯',
  '文创园|艺术区|创意园|文艺街区',
  '美食街|小吃街|夜市|风情街',
  '公园|广场|湖边|绿地',
  '博物馆|美术馆|展览馆|纪念馆'
];

/* 关键词组 → 统一类别 */
const GROUP_CATEGORY = ['景点', '购物', '文创', '美食', '休闲', '文化'];

const PAGE_SIZE = 25;
const MAX_PAGE = 3;
const EXTRA_PAGE = 6;       // 首轮不足 100 时，最多再翻到第 6 页
const CONCURRENCY = 6;      // 同时进行的请求数
const TARGET_TOTAL = 100;   // 期望拿到的去重后 POI 数量

/* ---- 高德返回值清洗：空字段可能是 [] ---- */
const str = v => (Array.isArray(v) ? '' : String(v == null ? '' : v));
const num = v => (Array.isArray(v) ? 0 : Number(v) || 0);

/* "116.397,39.908" → {lng,lat} */
const loc = v => {
  const p = String(str(v)).split(',').map(Number);
  return p.length === 2 && Number.isFinite(p[0]) && Number.isFinite(p[1])
    ? { lng: p[0], lat: p[1] } : null;
};

/* 按 type 字符串判断类别；命中不到时用关键词组兜底 */
function classify(typeStr, fallback) {
  const t = String(typeStr || '');
  if (/餐饮|美食|小吃|夜市|茶艺|咖啡|甜品|酒吧/.test(t)) return '美食';
  if (/购物|商场|超市|商业街|步行街|专卖|市场|奥特莱斯/.test(t)) return '购物';
  if (/博物馆|美术馆|展览|纪念馆|文化|科教|图书馆|艺术|影剧院/.test(t)) return '文化';
  if (/公园|广场|绿地|游乐园|体育|休闲/.test(t)) return '休闲';
  if (/风景|名胜|寺|庙|教堂|古迹|遗址|古镇|景区/.test(t)) return '景点';
  return fallback || '景点';
}

/* 单页请求：返回 {pois, count}，失败返回 {pois:[], count:0}（不影响其他组） */
async function fetchPage(keywords, city, page) {
  const j = await amap.call('/v3/place/text', {
    keywords,
    city,
    citylimit: 'true',
    offset: String(PAGE_SIZE),
    page: String(page),
    extensions: 'all'
  });
  if (!j) return { pois: [], count: 0 };
  const list = Array.isArray(j.pois) ? j.pois : [];
  return { pois: list, count: Number(j.count) || list.length };
}

/* 并发池：限流执行，单组失败不阻断整体 */
async function runPool(tasks, limit) {
  const out = new Array(tasks.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    while (cursor < tasks.length) {
      const i = cursor++;
      try { out[i] = await tasks[i](); } catch (e) { out[i] = null; }
    }
  });
  await Promise.all(workers);
  return out;
}

/* 把一条高德 POI 转成统一的「可玩点」结构 */
function toPlace(poi, category) {
  const p = loc(poi.location);
  if (!p) return null;
  const name = str(poi.name).trim();
  if (!name) return null;
  const biz = poi.biz_ext || {};
  const typeStr = str(poi.type);
  return {
    id: 'am_' + (str(poi.id) || name),
    name,
    address: str(poi.address),
    city: str(poi.cityname),
    location: `${p.lng},${p.lat}`,
    lng: p.lng,
    lat: p.lat,
    rating: num(biz.rating),
    price: num(biz.cost) ? `¥${num(biz.cost)}` : '',
    hours: str(biz.opentime || biz.open_time),
    tel: str(poi.tel),
    type: typeStr,
    category: classify(typeStr, category),
    source: 'amap'
  };
}

/**
 * 搜索一个城市的全部可玩点位
 * @param {string} city 城市名或 adcode（adcode 精确度最高，建议传 adcode）
 * @param {object} opts { limit=100 }
 * @returns {Promise<{ok:boolean, city:string, total:number, byCategory:object, places:Array}>}
 */
async function searchCitySpots(city, opts = {}) {
  const cityArg = String(city || '').trim();
  const limit = Math.max(1, Number(opts.limit) || 500);
  if (!cityArg || !amap.isOn()) {
    return { ok: false, city: cityArg, total: 0, byCategory: {}, places: [], reason: 'no_key_or_city' };
  }

  /* 1) 6 组关键词 × 3 页 = 18 个请求，并发限流 */
  amap.clearLastError();
  const tasks = [];
  const metas = [];
  SEARCH_KEYWORDS.forEach((kw, gi) => {
    for (let page = 1; page <= MAX_PAGE; page++) {
      tasks.push(() => fetchPage(kw, cityArg, page));
      metas.push(gi);
    }
  });
  const results = await runPool(tasks, CONCURRENCY);

  /* 2) 合并 + 按名称去重（同名保留评分高的那条） */
  const map = new Map();
  const absorb = (list, gi) => {
    (list || []).forEach(poi => {
      const place = toPlace(poi, GROUP_CATEGORY[gi]);
      if (!place) return;
      const prev = map.get(place.name);
      if (!prev || place.rating > prev.rating) map.set(place.name, place);
    });
  };
  results.forEach((r, i) => { if (r && r.pois) absorb(r.pois, metas[i]); });

  /* 2b) 首轮去重后不足 100：再翻 4-6 页补一次（单组失败不影响其他组） */
  if (map.size < TARGET_TOTAL) {
    const more = [];
    const moreMeta = [];
    SEARCH_KEYWORDS.forEach((kw, gi) => {
      for (let page = MAX_PAGE + 1; page <= EXTRA_PAGE; page++) {
        more.push(() => fetchPage(kw, cityArg, page));
        moreMeta.push(gi);
      }
    });
    const extra = await runPool(more, CONCURRENCY);
    extra.forEach((r, i) => { if (r && r.pois) absorb(r.pois, moreMeta[i]); });
  }

  /* 3) 类别多样：先按评分降序，再保持类别均衡（避免结果全是商场） */
  const all = Array.from(map.values()).sort((a, b) => b.rating - a.rating);
  const max = Math.min(limit, all.length);
  const out = [];
  const bucket = {};
  all.forEach(p => (bucket[p.category] = bucket[p.category] || []).push(p));
  const keys = Object.keys(bucket);
  while (out.length < max) {
    let moved = false;
    keys.forEach(k => {
      const p = bucket[k].shift();
      if (p && out.length < max) { out.push(p); moved = true; }
    });
    if (!moved) break;
  }

  /* 4) 统计各类别数量 */
  const byCategory = {};
  out.forEach(p => { byCategory[p.category] = (byCategory[p.category] || 0) + 1; });

  /* 5) 一条都没拿到时，把高德返回的错误码带出去，避免「静默空结果」无从排查。
        有结果但不满 100 时也附一句 note，方便判断是高德配额还是关键词覆盖不够 */
  const err = amap.getLastError();
  const failed = out.length === 0 && err
    ? { reason: 'amap_error', info: err.info, infocode: err.infocode, hint: err.hint }
    : (out.length < TARGET_TOTAL
      ? { note: `仅取到 ${out.length} 个点位${err ? `（高德：${err.info}）` : ''}` }
      : {});

  return {
    ok: true,
    city: cityArg,
    total: out.length,
    enough: out.length >= TARGET_TOTAL,
    byCategory,
    places: out,
    ...failed
  };
}

/* =========================================================
 * 按需补拉：城市在库里没有点位时，实时打高德并把结果写回 scenic_spot。
 *
 * 为什么需要：scripts/fetch-pois.js 是离线批量补数，只能覆盖清单里的城市，
 * 用户搜「上饶」「九江」这种清单外的城市时，库里一片空白，前端只能显示空列表。
 * 这里在城市检索的路由里先查库，库空才实时拉一次并落库，
 * 同一个城市第二次搜索就直接命中数据库，不会重复消耗高德配额。
 *
 * 三条原则：
 *   ① 不造假数据：高德拉不到就返回 ok:false + 友好文案，绝不塞模拟点位；
 *   ② 失败也缓存：把失败原因记在内存里 5 分钟，避免用户连续搜索时把配额打空；
 *   ③ 并发合并：同一城市同时进来多个请求只打一次高德（inFlight 去重）。
 * ========================================================= */
const FAIL_TTL = 5 * 60 * 1000;
const failCache = new Map();   // city → {at, message, reason}
const inFlight = new Map();    // city → Promise

function friendlyFail(reason, info) {
  if (reason === 'no_key') return '该城市暂无数据（服务端未配置地图检索服务）';
  if (reason === 'amap_error') return `该城市暂无数据${info ? '（地图服务返回：' + info + '）' : ''}`;
  return '该城市暂无数据';
}

/**
 * 取某城市的点位：先查库，库空则实时补拉。
 * @param {string} city
 * @param {{limit?:number, force?:boolean}} opts force=true 时跳过「库里有就用」直接补拉
 * @returns {Promise<{ok:boolean, city:string, source:'db'|'amap', total:number, places:Array, message?:string}>}
 */
async function ensureCitySpots(city, opts = {}) {
  const cityArg = String(city || '').trim();
  const limit = Math.max(1, Number(opts.limit) || 200);
  if (!cityArg) return { ok: false, city: '', source: 'db', total: 0, places: [], message: '请先输入城市名' };

  /* db 在这里按需 require：本模块被 scripts/*.js 直接引用时不必拉起数据库连接 */
  const dbx = require('../db');

  /* ① 先查库 */
  if (!opts.force) {
    const rows = await dbx.listSpotsByType(cityArg, null, limit).catch(() => []);
    if (rows && rows.length) {
      return { ok: true, city: cityArg, source: 'db', total: rows.length, places: rows.map(rowToPlace) };
    }
  }

  /* ② 库空 → 实时补拉（同一城市并发合并） */
  if (!amap.isOn()) {
    return { ok: false, city: cityArg, source: 'db', total: 0, places: [], message: friendlyFail('no_key') };
  }
  const cached = failCache.get(cityArg);
  if (cached && Date.now() - cached.at < FAIL_TTL) {
    return { ok: false, city: cityArg, source: 'db', total: 0, places: [], message: cached.message, reason: cached.reason };
  }
  if (inFlight.has(cityArg)) return inFlight.get(cityArg);

  const task = (async () => {
    const r = await searchCitySpots(cityArg, { limit });
    if (!r.ok || !r.places || !r.places.length) {
      const reason = r.reason || (amap.isOn() ? 'empty' : 'no_key');
      const msg = friendlyFail(reason, r.info || (r.reason === 'amap_error' ? '' : ''));
      failCache.set(cityArg, { at: Date.now(), message: msg, reason });
      return { ok: false, city: cityArg, source: 'db', total: 0, places: [], message: msg, reason };
    }
    /* ③ 落库：source='amap_live' 便于和离线批量补的数据区分 */
    let saved = 0;
    try {
      saved = await dbx.upsertPois(cityArg, r.places.map(p => ({
        name: p.name, lng: p.lng, lat: p.lat, rating: p.rating,
        price: p.price, tags: p.category, intro: p.address || '',
        poi_type: p.category, amap_type: p.type, province: ''
      })), 'amap_live');
    } catch (e) {
      console.warn('[ensureCitySpots] 落库失败', cityArg, e.message);
    }
    failCache.delete(cityArg);
    return { ok: true, city: cityArg, source: 'amap', saved, total: r.places.length, places: r.places };
  })().finally(() => inFlight.delete(cityArg));

  inFlight.set(cityArg, task);
  return task;
}

/* 库里的一行 → 与 searchCitySpots 相同形状 */
function rowToPlace(row) {
  return {
    name: row.name,
    lng: Number(row.lng) || 0,
    lat: Number(row.lat) || 0,
    category: row.poi_type || '景点',
    rating: Number(row.rating) || 0,
    heat: Number(row.heat) || 0,
    price: row.price == null ? '' : row.price,
    address: row.intro || '',
    intro: row.intro || ''
  };
}

module.exports = { searchCitySpots, SEARCH_KEYWORDS, GROUP_CATEGORY, classify, ensureCitySpots };
