/* =========================================================
 * POI 检索路由层：按目的地自动选择数据源
 *
 *   国内城市  → 高德（中文 POI 最全，店铺 / 评分 / 人均都有）
 *   海外城市  → OpenStreetMap / Overpass（免费、无需 Key、全球覆盖）
 *   任一源失败 → 返回空结果，由 plan.js 降级到站内景点库
 *
 * 判定依据是城市中心的经纬度是否落在大中华区包围盒内。
 * 为什么要加这一层：高德对海外城市的覆盖接近于零，
 * 而 OSM 在国内的店铺更新时间滞后、名称多为英文，
 * 单一数据源无法同时满足国内和海外的行程质量。
 * ========================================================= */
const { searchCitySpots } = require('./scenicSpotSearch');
const { searchOsmByCity } = require('./osmSpotSearch');

/* 大中华区包围盒（含港澳台），略放宽以覆盖边境城市 */
const CN_BOX = { lngMin: 73.0, lngMax: 135.5, latMin: 17.0, latMax: 53.8 };

/* 常见海外城市中心点兜底：高德地理编码查不到时用它定位 OSM 查询圆心 */
const OVERSEAS_CENTER = {
  '东京': { lng: 139.6917, lat: 35.6895 },
  '京都': { lng: 135.7681, lat: 35.0116 },
  '大阪': { lng: 135.5023, lat: 34.6937 },
  '北海道': { lng: 141.3544, lat: 43.0621 },
  '札幌': { lng: 141.3544, lat: 43.0621 },
  '冲绳': { lng: 127.6809, lat: 26.2124 },
  '富士山': { lng: 138.7274, lat: 35.3606 },
  '首尔': { lng: 126.9780, lat: 37.5665 },
  '釜山': { lng: 129.0756, lat: 35.1796 },
  '曼谷': { lng: 100.5018, lat: 13.7563 },
  '清迈': { lng: 98.9853, lat: 18.7877 },
  '新加坡': { lng: 103.8198, lat: 1.3521 },
  '吉隆坡': { lng: 101.6869, lat: 3.1390 },
  '巴厘岛': { lng: 115.1889, lat: -8.4095 },
  '河内': { lng: 105.8342, lat: 21.0278 },
  '胡志明市': { lng: 106.6297, lat: 10.8231 },
  '巴黎': { lng: 2.3522, lat: 48.8566 },
  '伦敦': { lng: -0.1276, lat: 51.5072 },
  '罗马': { lng: 12.4964, lat: 41.9028 },
  '米兰': { lng: 9.1900, lat: 45.4642 },
  '威尼斯': { lng: 12.3155, lat: 45.4408 },
  '巴塞罗那': { lng: 2.1734, lat: 41.3851 },
  '马德里': { lng: -3.7038, lat: 40.4168 },
  '阿姆斯特丹': { lng: 4.9041, lat: 52.3676 },
  '柏林': { lng: 13.4050, lat: 52.5200 },
  '慕尼黑': { lng: 11.5820, lat: 48.1351 },
  '维也纳': { lng: 16.3738, lat: 48.2082 },
  '苏黎世': { lng: 8.5417, lat: 47.3769 },
  '因特拉肯': { lng: 7.8632, lat: 46.6863 },
  '雅典': { lng: 23.7275, lat: 37.9838 },
  '圣托里尼': { lng: 25.4615, lat: 36.3932 },
  '伊斯坦布尔': { lng: 28.9784, lat: 41.0082 },
  '莫斯科': { lng: 37.6173, lat: 55.7558 },
  '纽约': { lng: -74.0060, lat: 40.7128 },
  '洛杉矶': { lng: -118.2437, lat: 34.0522 },
  '旧金山': { lng: -122.4194, lat: 37.7749 },
  '西雅图': { lng: -122.3321, lat: 47.6062 },
  '拉斯维加斯': { lng: -115.1398, lat: 36.1699 },
  '华盛顿': { lng: -77.0369, lat: 38.9072 },
  '波士顿': { lng: -71.0589, lat: 42.3601 },
  '芝加哥': { lng: -87.6298, lat: 41.8781 },
  '多伦多': { lng: -79.3832, lat: 43.6532 },
  '温哥华': { lng: -123.1207, lat: 49.2827 },
  '墨西哥城': { lng: -99.1332, lat: 19.4326 },
  '里约热内卢': { lng: -43.1729, lat: -22.9068 },
  '布宜诺斯艾利斯': { lng: -58.3816, lat: -34.6037 },
  '悉尼': { lng: 151.2093, lat: -33.8688 },
  '墨尔本': { lng: 144.9631, lat: -37.8136 },
  '奥克兰': { lng: 174.7633, lat: -36.8485 },
  '开罗': { lng: 31.2357, lat: 30.0444 },
  '开普敦': { lng: 18.4241, lat: -33.9249 },
  '迪拜': { lng: 55.2708, lat: 25.2048 },
  '雷克雅未克': { lng: -21.8277, lat: 64.1265 }
};

/**
 * 判断坐标是否在中国境内
 * @param {{lng:number, lat:number}} c
 */
function isInChina(c) {
  if (!c || !Number.isFinite(c.lng) || !Number.isFinite(c.lat)) return null;   // 未知
  const { lngMin, lngMax, latMin, latMax } = CN_BOX;
  return c.lng >= lngMin && c.lng <= lngMax && c.lat >= latMin && c.lat <= latMax;
}

/**
 * 解析目的地的查询中心点
 * 顺序：已知海外城市表 → 调用方传入的 center（高德地理编码结果）→ null
 */
function resolveCenter(city, fallbackCenter) {
  const known = OVERSEAS_CENTER[String(city || '').trim()];
  if (known) return known;
  return fallbackCenter || null;
}

/**
 * 统一检索入口：按目的地自动选择数据源
 * @param {string} city 城市名
 * @param {object} opts { center, limit }
 *   center 由 plan.js 传入（站内库均值或高德地理编码结果），
 *   用于判定国内/海外以及 OSM 的查询圆心
 * @returns {Promise<{ok, city, total, byCategory, places, source, ...}>}
 */
async function searchPlaces(city, opts = {}) {
  const cityArg = String(city || '').trim();
  if (!cityArg) {
    return { ok: false, city: '', total: 0, byCategory: {}, places: [], source: 'none', reason: 'no_city' };
  }

  const knownOverseas = !!OVERSEAS_CENTER[cityArg];
  const center = resolveCenter(cityArg, opts.center);
  const inChina = knownOverseas ? false : isInChina(center);

  /* 海外：走 OSM（先查预抓缓存，未命中才实时请求）
   * opts.skipOsm 用于「本地美食库已命中」时直接跳过，省掉 60-120s 的 Overpass 等待 */
  if (inChina === false) {
    if (opts.skipOsm) {
      return { ok: true, total: 0, byCategory: {}, places: [], source: 'skip', city: cityArg, provider: 'osm' };
    }
    const r = await searchOsmByCity(cityArg, center, { limit: opts.limit || 200 });
    return { ...r, city: cityArg, provider: 'osm' };
  }

  /* 国内（或无法判定但能拿到坐标）：走高德 */
  if (inChina === true) {
    const r = await searchCitySpots(cityArg, { limit: opts.limit || 200 });
    return { ...r, provider: 'amap' };
  }

  /* 坐标未知：先按高德试一次，拿到结果就说明是国内城市；
   * 拿不到再看是否是海外城市（此时 center 可能来自已知表） */
  const r = await searchCitySpots(cityArg, { limit: opts.limit || 200 });
  if (r.ok && r.total > 0) return { ...r, provider: 'amap' };

  if (center) {
    const o = await searchOsmByCity(cityArg, center, { limit: opts.limit || 200 });
    if (o.ok) return { ...o, city: cityArg, provider: 'osm' };
  }
  return { ...r, city: cityArg, provider: 'amap' };
}

/**
 * 目的地是否属于海外（以高德覆盖范围外为准）
 * 用于 plan.js 决定景点首选来源：国内靠检索，海外靠站内精编库 + 大模型
 * @param {string} city 城市名
 * @param {{lng:number, lat:number}} center 城市中心
 */
function isOverseas(city, center) {
  if (OVERSEAS_CENTER[String(city || '').trim()]) return true;
  return isInChina(center) === false;
}

/* 5s 足够：Nominatim 正常响应在 1s 内，
 * 超时说明网络不通，继续等只会拖慢整个行程接口（12 个景点 / 4 并发 = 3 轮） */
const TIMEOUT = Number(process.env.NOMINATIM_TIMEOUT || 5000);

/**
 * 海外景点地理编码：用 OpenStreetMap 的 Nominatim 把景点名换成坐标
 *
 * 为什么不用高德：高德对境外景点名（浅草寺 / 埃菲尔铁塔）几乎查不到坐标。
 * Nominatim 免费、无需 Key，Render 在海外机房，链路反而比回连国内更稳。
 * 单个景点一次请求，调用方已做并发限制；返回 null 时由调用方跳过。
 *
 * @param {string} name 景点名
 * @param {string} city 所在城市（用于限定检索范围）
 */
async function geocodeOverseas(name, city) {
  const q = [String(name || '').trim(), String(city || '').trim()].filter(Boolean).join(', ');
  if (!q) return null;

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT);
  try {
    const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(q);
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'WanderGo/1.0 (graduation project)',
        'Accept': 'application/json'
      },
      signal: ctl.signal
    });
    if (!r.ok) return null;
    const arr = await r.json();
    const hit = Array.isArray(arr) ? arr[0] : null;
    if (!hit) return null;
    const lng = Number(hit.lon);
    const lat = Number(hit.lat);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
    return { lng, lat, display: String(hit.display_name || '') };
  } catch (e) {
    console.warn('[nominatim]', name, e.name === 'AbortError' ? 'timeout' : String(e.message || e));
    return null;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  searchPlaces, isInChina, isOverseas, resolveCenter, geocodeOverseas,
  CN_BOX, OVERSEAS_CENTER
};
