/* =========================================================
 * P2 地图层级下钻：省 / 市级边界批量预下载
 *
 * 数据源：阿里云 DataV GeoAtlas（与 scripts/fetch-geo.js 同源）
 *   {adcode}_full.json —— 该行政区下辖的下一级行政区（省→市，市→区县）
 *
 * 产出：
 *   geo/prov/{省adcode}.json   { name, adcode, cities:[{name,adcode}] }
 *                              —— 省级下钻时给 ECharts 注册的地图
 *   geo/prov/{市adcode}.json   精简后的单个城市轮廓（复用 fetch-geo 的精简规则）
 *                              —— 市级下钻时的底图
 *   geo/prov/{市adcode}.districts.json  该市下辖区/县边界（--districts 时生成）
 *                              —— 区县级下钻时的底图
 *   geo/prov/manifest.js       window.WGO_PROV = { 省adcode: {...} }
 *
 * 用法：
 *   node scripts/fetch-prov.js                  # 下载清单内全部省份（省→市）
 *   node scripts/fetch-prov.js 500000           # 只下指定省份
 *   node scripts/fetch-prov.js --districts      # 顺带下载每个市的区县边界（区县级下钻）
 * 只在开发期跑，成果随仓库发布，运行时不请求任何外部接口。
 * ========================================================= */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'geo', 'prov');
const BASE = 'https://geo.datav.aliyun.com/areas_v3/bound/';

/* 数据量大省份（如新疆、内蒙）用 EPS=0.02 更省体积；直辖市区县细碎，保持 0.01 */
const EPS = 0.02;
function simplify(ring, eps) {
  if (!Array.isArray(ring) || ring.length < 4) return ring;
  const out = [ring[0]];
  for (let i = 1; i < ring.length - 1; i++) {
    const p = out[out.length - 1], c = ring[i];
    if (Math.abs(c[0] - p[0]) + Math.abs(c[1] - p[1]) >= eps) out.push(c);
  }
  out.push(ring[ring.length - 1]);
  return out.length >= 4 ? out : ring;
}
const round = p => [+p[0].toFixed(3), +p[1].toFixed(3)];

/* 一个 feature 的几何精简（保留外环） */
function trimFeature(f, name, adcode) {
  const g = f.geometry;
  if (!g) return null;
  let co = g.coordinates;
  if (g.type === 'Polygon') {
    co = [simplify(co[0] || [], EPS).map(round)];
    if (co[0].length < 4) return null;
  } else if (g.type === 'MultiPolygon') {
    co = co.map(p => [simplify(p[0] || [], EPS).map(round)]).filter(p => p[0].length >= 4);
    if (!co.length) return null;
  } else return null;
  return { type: 'Feature', properties: { name, adcode }, geometry: { type: g.type, coordinates: co } };
}

function fetchJson(url, retry = 3) {
  return new Promise((resolve, reject) => {
    fetch(url, { headers: { 'User-Agent': 'wandergo-geo/1.0' } })
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(resolve)
      .catch(e => retry > 0 ? setTimeout(() => fetchJson(url, retry - 1).then(resolve, reject), 900) : reject(e));
  });
}

/* 省级名称本地表：DataV 的 properties 里没有 level_name，自己维护一份更稳 */
const PROV_NAME = {'110000':'北京市','120000':'天津市','130000':'河北省','140000':'山西省','150000':'内蒙古自治区',
  '210000':'辽宁省','220000':'吉林省','230000':'黑龙江省','310000':'上海市','320000':'江苏省','330000':'浙江省',
  '340000':'安徽省','350000':'福建省','360000':'江西省','370000':'山东省','410000':'河南省','420000':'湖北省',
  '430000':'湖南省','440000':'广东省','450000':'广西壮族自治区','460000':'海南省','500000':'重庆市','510000':'四川省',
  '520000':'贵州省','530000':'云南省','540000':'西藏自治区','610000':'陕西省','620000':'甘肃省','630000':'青海省',
  '640000':'宁夏回族自治区','650000':'新疆维吾尔自治区','710000':'台湾省','810000':'香港特别行政区','820000':'澳门特别行政区'};

async function oneProvince(adcode) {
  const raw = await fetchJson(BASE + adcode + '_full.json');
  const cities = [], feats = [];
  for (const f of raw.features || []) {
    const pr = f.properties || {};
    const code = String(pr.adcode || '');
    if (code.length !== 6 || !pr.name) continue;
    const tf = trimFeature(f, pr.name, code);
    if (!tf) continue;
    feats.push(tf);
    cities.push({ name: pr.name, adcode: code });
  }
  if (!feats.length) throw new Error('边界为空');
  const prov = { type: 'FeatureCollection', features: feats };
  fs.writeFileSync(path.join(OUT, adcode + '.json'), JSON.stringify(prov));
  const meta = { name: PROV_NAME[adcode] || adcode, adcode, cities };
  fs.writeFileSync(path.join(OUT, adcode + '.meta.json'), JSON.stringify(meta));
  return { bytes: Buffer.byteLength(JSON.stringify(prov)), cities: cities.length };
}

/* 单个城市轮廓（市级下钻底图）：{adcode}.json 是整城外轮廓 */
async function oneCity(adcode) {
  const f = path.join(OUT, adcode + '.json');
  if (fs.existsSync(f)) return { skip: true };
  const raw = await fetchJson(BASE + adcode + '.json');
  const tf = trimFeature({ geometry: raw.features[0].geometry }, raw.features[0].properties.name, adcode);
  if (!tf) throw new Error('边界为空');
  fs.writeFileSync(f, JSON.stringify({ type: 'FeatureCollection', features: [tf] }));
  return { bytes: fs.statSync(f).size };
}

/* 区县级下钻底图：{市adcode}_full.json 是该市下辖的区/县列表，
 * 存成 {市adcode}.districts.json（父市轮廓仍留在 {市adcode}.json 里，供上一级使用）。
 * 直辖市与海南那种「省直辖县级市」在省级层已经是区县，市名与区名一一对应，
 * 这里用区名匹配景点城市名（容错：去掉「区/县/市」后缀再比）。 */
async function oneDistricts(adcode) {
  const f = path.join(OUT, adcode + '.districts.json');
  if (fs.existsSync(f)) return { skip: true };
  const raw = await fetchJson(BASE + adcode + '_full.json');
  const feats = [];
  for (const x of raw.features || []) {
    const pr = x.properties || {};
    const code = String(pr.adcode || '');
    if (code.length !== 6 || !pr.name) continue;
    const tf = trimFeature(x, pr.name, code);
    if (tf) feats.push(tf);
  }
  if (!feats.length) throw new Error('区县为空');
  const fc = { type: 'FeatureCollection', features: feats };
  fs.writeFileSync(f, JSON.stringify(fc));
  return { bytes: Buffer.byteLength(JSON.stringify(fc)) };
}

const PROVINCES = ['110000','120000','130000','140000','150000','210000','220000','230000','310000','320000',
  '330000','340000','350000','360000','370000','410000','420000','430000','440000','450000','460000','500000',
  '510000','520000','530000','540000','610000','620000','630000','640000','650000','710000','810000','820000'];

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  if (!fs.existsSync(path.join(OUT, '100000.json'))) {
    console.warn('缺少 geo/prov/100000.json（全国省级边界），请先执行一次性生成脚本');
  }
  const want = process.argv.slice(2).filter(a => !a.startsWith('--'));
  /* --districts：顺带下载每个市的区县边界（区县级下钻底图），体积较大，按需开启 */
  const withDistricts = process.argv.includes('--districts');
  const list = want.length ? want : PROVINCES;
  const manifest = {};
  let totalKB = 0;
  for (const code of list) {
    try {
      const r = await oneProvince(code);
      totalKB += r.bytes / 1024;
      const meta = JSON.parse(fs.readFileSync(path.join(OUT, code + '.meta.json'), 'utf8'));
      manifest[code] = { name: meta.name, cities: meta.cities };
      console.log(`  ${code}  ${meta.cities.length} 市  ${(r.bytes / 1024).toFixed(0)} KB`);
      /* 顺带下载每个市的轮廓，供市级下钻 */
      for (const c of meta.cities) {
        try { await oneCity(c.adcode); } catch (e) { console.warn('    city fail', c.adcode, e.message); }
        if (withDistricts) {
          try { await oneDistricts(c.adcode); } catch (e) { }
        }
        await new Promise(r => setTimeout(r, 120));
      }
    } catch (e) {
      console.warn(`  ${code} 失败：${e.message}`);
    }
    await new Promise(r => setTimeout(r, 200));
  }
  /* 合并已有 meta，保证分批下载时清单不丢 */
  fs.readdirSync(OUT).filter(f => f.endsWith('.meta.json')).forEach(f => {
    const code = f.replace('.meta.json', '');
    const m = JSON.parse(fs.readFileSync(path.join(OUT, f), 'utf8'));
    manifest[code] = { name: m.name, cities: m.cities };
  });
  fs.writeFileSync(path.join(OUT, 'manifest.js'),
    '/* 自动生成：node scripts/fetch-prov.js —— 省/市级下钻清单 */\n' +
    'window.WGO_PROV=' + JSON.stringify(manifest) + ';\n');
  console.log(`\n[fetch-prov] 省级 ${Object.keys(manifest).length} 个 · 新增 ${totalKB.toFixed(0)} KB`);
}

main().catch(e => { console.error(e); process.exit(1); });
