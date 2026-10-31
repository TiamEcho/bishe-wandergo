/* =========================================================
 * 高德 Web 服务 API 封装
 * 需要的环境变量：AMAP_KEY（Web 服务 Key，不是 JS API Key）
 * 未配置 Key 时，所有函数返回 null / []，调用方自动降级为本地数据。
 * 文档：
 *   地理编码 /geocode/geo      地址 → 经纬度
 *   周边检索 /place/around    经纬度 → POI（含 rating / 人均 / 地址）
 * ========================================================= */
const KEY = process.env.AMAP_KEY || '';
const HOST = 'https://restapi.amap.com';
const TIMEOUT = Number(process.env.AMAP_TIMEOUT || 6000);

const isOn = () => !!KEY;

/* 常见错误码 → 人话，方便在日志和接口返回里直接定位问题 */
const ERR_HINT = {
  10001: 'Key 无效：服务平台类型可能选成了「Web端(JS API)」，后端调用必须用「Web服务」类型的 Key',
  10002: 'Key 被禁用或服务未开通',
  10003: '当日调用量超过配额',
  10004: '单位时间调用过于频繁（QPS 超限）',
  10005: 'IP 白名单校验未通过',
  10006: 'Key 的域名白名单校验未通过',
  10009: 'Key 与绑定的平台不匹配',
  10044: '账号当日调用量已达上限'
};

/* 记录最近一次失败，供接口返回 reason 用 */
let lastError = null;
let loggedCode = '';   /* 同一错误码只打印一次，避免 18 个并发请求刷屏 */
const getLastError = () => lastError;
const clearLastError = () => { lastError = null; loggedCode = ''; };

function report(path, info, code) {
  lastError = { path, info, infocode: code, hint: ERR_HINT[code] || '' };
  if (loggedCode === code + info) return;
  loggedCode = code + info;
  console.warn('[amap]', path, info, code, lastError.hint);
}

async function call(path, params) {
  if (!KEY) return null;
  const qs = new URLSearchParams(Object.assign({ key: KEY, output: 'JSON' }, params));
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT);
  try {
    const r = await fetch(`${HOST}${path}?${qs}`, { signal: ctl.signal });
    const j = await r.json();
    if (String(j.status) !== '1') {
      report(path, String(j.info || ''), String(j.infocode || ''));
      return null;
    }
    return j;
  } catch (e) {
    const msg = e.name === 'AbortError' ? 'timeout' : String(e.message || e);
    report(path, msg, '');
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/* "116.397,39.908" → {lng:116.397, lat:39.908} */
function parseLocation(loc) {
  const [lng, lat] = String(loc || '').split(',').map(Number);
  return Number.isFinite(lng) && Number.isFinite(lat) ? { lng, lat } : null;
}

/* 城市 / 地址 → 中心点坐标（GCJ-02） */
async function geocodeCity(city) {
  const j = await call('/geocode/geo', { address: city });
  const g = j && j.geocodes && j.geocodes[0];
  if (!g) return null;
  const p = parseLocation(g.location);
  return p ? { lng: p.lng, lat: p.lat, city: (Array.isArray(g.city) ? '' : g.city) || city } : null;
}

/* 周边检索：types 见高德 POI 分类编码（餐饮服务 / 住宿服务） */
async function searchAround(lng, lat, types, keyword, radius = 500, limit = 8) {
  const params = {
    location: `${Number(lng).toFixed(6)},${Number(lat).toFixed(6)}`,
    types,
    radius: String(radius),
    sortrule: 'distance',
    offset: String(Math.min(limit, 25)),
    page: '1',
    extensions: 'all'
  };
  if (keyword) params.keywords = keyword;
  const j = await call('/place/around', params);
  const pois = (j && j.pois) || [];
  return pois.map(p => {
    const loc = parseLocation(p.location);
    /* biz_ext.rating / cost 可能是 [] 或字符串 */
    const biz = p.biz_ext || {};
    const rating = Number(Array.isArray(biz.rating) ? 0 : biz.rating) || 0;
    const cost = Number(Array.isArray(biz.cost) ? 0 : biz.cost) || 0;
    return {
      name: Array.isArray(p.name) ? '' : String(p.name || ''),
      address: Array.isArray(p.address) ? '' : String(p.address || ''),
      location: p.location || '',
      lng: loc ? loc.lng : null,
      lat: loc ? loc.lat : null,
      rating,
      price: cost ? `¥${cost}` : '',
      distance: Number(p.distance) || 0,
      type: Array.isArray(p.type) ? '' : String(p.type || '')
    };
  }).filter(x => x.name);
}

/* 餐厅：餐饮服务；住宿：住宿服务 */
const restaurantAround = (lng, lat, radius = 500, limit = 8) =>
  searchAround(lng, lat, '050000', '', radius, limit);
const hotelAround = (lng, lat, radius = 1500, limit = 5) =>
  searchAround(lng, lat, '100000', '', radius, limit);

module.exports = { isOn, call, geocodeCity, searchAround, restaurantAround, hotelAround, parseLocation, getLastError, clearLastError, ERR_HINT, KEY };
