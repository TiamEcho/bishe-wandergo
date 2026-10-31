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
const CONCURRENCY = 6;      // 同时进行的请求数，避免触发高德 QPS 限制
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
  const j = await amap.call('/place/text', {
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

  return {
    ok: true,
    city: cityArg,
    total: out.length,
    enough: out.length >= TARGET_TOTAL,
    byCategory,
    places: out
  };
}

module.exports = { searchCitySpots, SEARCH_KEYWORDS, GROUP_CATEGORY, classify };
