/* =========================================================
 * AI 行程规划（/api/plan/route）
 * 流程：
 *   ① 收集景点：大模型生成（可选）→ 站内景点库补足 → 共 10-12 个，不分天
 *   ② deduplicateSpots 去重（同名景点只出现在最早一天）
 *   ③ fanCluster 扇形分区（按方位角均分 360°，同天内由近到远）
 *   ④ 高德周边检索：每个景点 1-2 家餐厅，当天最后一家附近 1 家住宿
 * 任何一步缺少外部条件（无 AMAP_KEY / 无 DOTS_API_KEY）都会降级，接口始终返回可用结构。
 * ========================================================= */
const dbx = require('./db');
const amap = require('./amap');
const { chatJson } = require('./dots');
const { localEats } = require('./eats');
const { searchCitySpots } = require('./services/scenicSpotSearch');
const { dist, bearing, deduplicateSpots, fanCluster } = require('./planner');

const PLAN_SYSTEM = `你是资深旅行规划师。请为用户的目的地推荐 10-12 个真实的景点 / 打卡点。
要求：
1) 只输出严格 JSON，不要解释、不要 markdown 代码块；
2) 景点必须真实存在，优先选当地人认可的代表性点位（含自然风景、人文古迹、街区夜市等不同类型）；
3) 不要输出餐厅、酒店、行政区名（如「朝阳区」）、省份名（如「西藏」）；
4) 格式：{"spots":[{"name":"景点名","city":"所在城市"}]}`;

/* ---- 站内景点库：城市匹配 ---- */
function poolOfCity(city, rg) {
  return dbx.SPOTS.filter(s => s.name && s.lng != null &&
    ((s.city && s.city === city) || (s.province && s.province === city) ||
      (s.city && s.city.includes(city)) || (city && city.includes(s.city || ''))) &&
    (!rg || !s.region || s.region === rg));
}

/* 站内库不足时，同省 / 同区域就近补（不跨大区，避免出现「拉萨」这种异地卡） */
function nearPool(center, exclude, limit = 14) {
  const has = new Set(exclude.map(s => s.name));
  return dbx.SPOTS
    .filter(s => s.name && s.lng != null && !has.has(s.name))
    .map(s => ({ s, d: dist(center, s) }))
    .filter(x => x.d < 160)
    .sort((a, b) => a.d - b.d)
    .slice(0, limit)
    .map(x => x.s);
}

function toSpot(s) {
  return {
    id: s.spot_id || s.id || s.name,
    name: s.name,
    city: s.city || '',
    address: s.address || '',
    lng: Number(s.lng),
    lat: Number(s.lat),
    rating: Number(s.rating) || 0,
    price: s.price || '',
    hours: s.hours || '',
    traffic: s.traffic || '',
    tags: s.tags || '',
    desc: s.desc || '',
    img: s.img || ''
  };
}

/* 高德关键词检索结果 → 站内结构（category 保留「购物 / 文创 / 美食 / 休闲 / 文化」标签） */
function fromAmap(p) {
  return {
    id: p.id, name: p.name, city: p.city || '', address: p.address || '',
    lng: p.lng, lat: p.lat, rating: p.rating || 0, price: p.price || '',
    hours: p.hours || '', traffic: '', tags: p.category || '', desc: '',
    img: '', category: p.category || '景点', type: p.type || ''
  };
}

/* ---- ① 收集景点：高德关键词检索（6 类）为主，AI 建议 + 站内库兜底 ---- */
async function collectSpots(city, want) {
  const libPool = poolOfCity(city).map(toSpot);
  const byName = new Map(libPool.map(s => [s.name, s]));

  /* 高德关键词检索：景点 / 购物 / 文创 / 美食 / 休闲 / 文化，去重后可达上百个 */
  const found = await searchCitySpots(city, { limit: 200 });
  const amapPool = (found.places || []).map(fromAmap);

  /* 大模型建议（有 Key 才走）：命中站内库 / 高德池则复用已有坐标，避免重复地理编码 */
  let aiNames = [];
  const j = await chatJson(PLAN_SYSTEM, `目的地：${city}\n请推荐 ${want} 个景点。`);
  if (j && Array.isArray(j.spots)) {
    aiNames = j.spots.map(x => String((x && x.name) || '').trim()).filter(Boolean);
  }

  /* 中心点：站内库均值 → 高德地理编码 → 默认北京 */
  let center = null;
  if (libPool.length) {
    center = {
      lng: libPool.reduce((a, s) => a + s.lng, 0) / libPool.length,
      lat: libPool.reduce((a, s) => a + s.lat, 0) / libPool.length
    };
  }
  const geo = await amap.geocodeCity(city);
  if (geo) center = { lng: geo.lng, lat: geo.lat };
  if (!center) center = { lng: 116.397, lat: 39.908 };

  const chosen = [];
  const push = s => {
    if (!s || chosen.length >= want) return;
    if (chosen.some(c => c.name === s.name)) return;
    chosen.push(s);
  };

  /* 1) AI 点名的景点优先：站内库 → 高德池 → 地理编码 */
  for (const name of aiNames) {
    if (chosen.length >= want) break;
    const hit = byName.get(name)
      || libPool.find(s => s.name.includes(name) || name.includes(s.name))
      || amapPool.find(s => s.name.includes(name) || name.includes(s.name));
    if (hit) { push(hit); continue; }
    const g = await amap.geocodeCity(city + name);
    if (!g) continue;
    push({
      id: 'am_' + name, name, city, address: city + name, lng: g.lng, lat: g.lat,
      rating: 0, price: '', hours: '', traffic: '', tags: '高德检索', desc: '', img: ''
    });
  }

  /* 2) 高德检索池：按「类别均衡 + 评分 + 距中心由近及远」排序后补入，
   *    保证购物 / 文创 / 美食 / 休闲 / 文化都有机会进入行程，而不是清一色风景名胜 */
  const cats = ['景点', '购物', '文创', '美食', '休闲', '文化'];
  const buckets = {};
  amapPool.forEach(s => (buckets[s.category || '景点'] = buckets[s.category || '景点'] || []).push(s));
  Object.keys(buckets).forEach(k => buckets[k].sort((a, b) =>
    (b.rating - a.rating) || (dist(center, a) - dist(center, b))));
  let guard = 0;
  while (chosen.length < want && guard++ < amapPool.length * 2) {
    cats.forEach(k => {
      const s = (buckets[k] || []).shift();
      if (s) push(s);
    });
  }

  /* 3) 站内库补足：同城优先，再 160km 内近邻 */
  const fillFrom = arr => {
    for (const s of arr) {
      if (chosen.length >= want) break;
      push(s);
    }
  };
  fillFrom(libPool.slice().sort((a, b) => (b.rating || 0) - (a.rating || 0)));
  if (chosen.length < want) fillFrom(nearPool(center, chosen, 30));

  return {
    chosen: chosen.slice(0, want),
    center,
    libraryHit: chosen.filter(c => !String(c.id).startsWith('am_')).length,
    amapHit: chosen.filter(c => String(c.id).startsWith('am_')).length,
    scanned: amapPool.length
  };
}

/* ---- ④ 周边餐饮 / 住宿 ---- */
async function attachPoi(day, idx, lastIdx, city) {
  /* 当天最后一家景点：搜住宿（1 家） */
  const spot = day[idx];
  const out = { restaurants: [], hotel: null };

  if (amap.isOn()) {
    const rs = await amap.restaurantAround(spot.lng, spot.lat, 500, 6);
    out.restaurants = rs.slice(0, 2).map(r => ({
      name: r.name, address: r.address, location: r.location,
      rating: r.rating, price: r.price, distance: Math.round(r.distance || 0)
    }));
    if (idx === lastIdx) {
      const hs = await amap.hotelAround(spot.lng, spot.lat, 1500, 4);
      if (hs.length) {
        const h = hs[0];
        out.hotel = {
          name: h.name, address: h.address, location: h.location,
          rating: h.rating, price: h.price, distance: Math.round(h.distance || 0)
        };
      }
    }
  }

  /* 无 Key / 检索为空：用站内本地美食库兜底，保证每天都有餐饮建议 */
  if (!out.restaurants.length) {
    const raw = localEats(city, spot.city || city) || [];
    out.restaurants = raw.slice(0, 2).map(e => ({
      name: e.name, address: (spot.city || city) + '本地推荐', location: '',
      rating: 0, price: e.price ? String(e.price) : '', distance: 0, local: true
    }));
  }
  if (idx === lastIdx && !out.hotel) {
    out.hotel = {
      name: `${spot.name}周边住宿`, address: (spot.city || city) + ' · 建议就近选择',
      location: '', rating: 0, price: '', distance: 0, local: true
    };
  }
  return out;
}

/**
 * 生成行程
 * @param {string} city 目的地
 * @param {number} days 天数
 * @param {number} want 景点总数（默认 10-12）
 */
async function planRoute(city, days, want) {
  const d = Math.max(1, Number(days) || 2);
  const wantSpots = Math.min(12, Math.max(10, Number(want) || d * 4));
  const { chosen, center, libraryHit, amapHit, scanned } = await collectSpots(city, wantSpots);

  /* ② 去重：先按「平均摊到每天」预分组，再逐日去重，被删的位置从剩菜池补 */
  const n = Math.min(d, Math.max(1, Math.ceil(chosen.length / 3)));
  const pre = Array.from({ length: n }, () => []);
  chosen.forEach((s, i) => pre[i % n].push(s));
  const spare = [];
  const { days: deduped, removed, filled } = deduplicateSpots(pre, spare);

  /* ③ 扇形分区：以城市中心为锚点，按方位角均分 */
  const flat = (deduped.length ? deduped.flat() : chosen);
  const fanDays = fanCluster(flat, center, n);

  /* ④ 每天按距中心由近到远 → 顺序推进；再加餐饮与住宿 */
  const out = [];
  for (let i = 0; i < fanDays.length; i++) {
    const list = fanDays[i];
    if (!list.length) { out.push({ day: i + 1, spots: [] }); continue; }
    const sorted = list.slice().sort((a, b) => dist(center, a) - dist(center, b));
    const items = [];
    let start = 9 * 60;
    for (let k = 0; k < sorted.length; k++) {
      const s = sorted[k];
      const poi = await attachPoi(sorted, k, sorted.length - 1, city);
      const dur = 150;
      items.push({
        type: 'spot', id: s.id, name: s.name, city: s.city, address: s.address,
        lng: s.lng, lat: s.lat, rating: s.rating, price: s.price, hours: s.hours,
        traffic: s.traffic, desc: s.desc, tags: s.tags, amapType: s.type,
        start, end: start + dur, dur,
        distanceFromCenter: Math.round(dist(center, s) * 10) / 10,
        restaurants: poi.restaurants, hotel: poi.hotel
      });
      start += dur + 20;
    }
    /* 当天路线总里程：相邻景点球面距离之和，用于前端展示「单向推进」 */
    let km = 0;
    for (let k = 1; k < sorted.length; k++) km += dist(sorted[k - 1], sorted[k]);
    out.push({
      day: i + 1,
      spots: items,
      hotel: items.length ? items[items.length - 1].hotel : null,
      routeKm: Math.round(km * 10) / 10,
      bearingRange: (() => {
        const angs = sorted.map(s => bearing(center, s));
        return [Math.round(Math.min(...angs)), Math.round(Math.max(...angs))];
      })()
    });
  }

  return {
    ok: true,
    city,
    days: out.length,
    center,
    engine: { amap: amap.isOn(), ai: !!process.env.DOTS_API_KEY, libraryHit, amapHit, scanned },
    dedup: { removed, filled },
    plan: out
  };
}

module.exports = { planRoute, collectSpots };
