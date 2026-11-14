/* =========================================================
 * 城市边界 GeoJSON 预下载（P0-3）
 *
 * 数据源：阿里云 DataV GeoAtlas
 *   https://geo.datav.aliyun.com/areas_v3/bound/{adcode}_full.json
 *   市级 {adcode}_full.json 返回该市下辖区县，合并后即城市轮廓
 *
 * 产出：geo/{adcode}.json （已按 ~0.004° 精度精简，单城 5–20 KB）
 *       geo/manifest.js     （城市名 → adcode 映射，前端直接用 <script> 引入）
 *
 * 用法：
 *   node scripts/fetch-geo.js               # 下载清单内全部城市
 *   node scripts/fetch-geo.js 洛阳 大同      # 只下指定城市
 *   node scripts/fetch-geo.js --list        # 查看清单
 *
 * 只在开发期跑一次，成果随仓库发布，运行时不请求任何外部接口。
 * ========================================================= */
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'geo');
const BASE = 'https://geo.datav.aliyun.com/areas_v3/bound/';

/* 城市 → 行政区划代码。覆盖 data.js 里的目的地城市 + 常见的冷门补充城市 */
const CITIES = {
  北京: '110000', 天津: '120000', 上海: '310000', 重庆: '500000',
  广州: '440100', 深圳: '440300', 珠海: '440400', 佛山: '440600',
  杭州: '330100', 宁波: '330200', 绍兴: '330600', 湖州: '330500',
  嘉兴: '330400', 金华: '330700', 台州: '331000', 衢州: '330800',
  苏州: '320500', 南京: '320100', 无锡: '320200', 扬州: '321000',
  镇江: '321100', 淮安: '320800', 徐州: '320300', 常州: '320400',
  成都: '510100', 阿坝: '513200', 甘孜: '513300', 乐山: '511100',
  西安: '610100', 延安: '610600', 咸阳: '610400',
  昆明: '530100', 大理: '532900', 丽江: '530700', 香格里拉: '533400',
  西双版纳: '532800', 腾冲: '530500',
  贵阳: '520100', 遵义: '520300', 黔东南: '522600',
  长沙: '430100', 张家界: '430800', 岳阳: '430600', 凤凰: '433100',
  武汉: '420100', 宜昌: '420500', 襄阳: '420600', 荆州: '421000',
  厦门: '350200', 福州: '350100', 泉州: '350500', 漳州: '350600',
  南昌: '360100', 景德镇: '360200', 赣州: '360700', 宜春: '360900',
  九江: '360400', 上饶: '361100',
  合肥: '340100', 黄山: '341000', 芜湖: '340200',
  济南: '370100', 青岛: '370200', 淄博: '370300', 烟台: '370600',
  威海: '371000', 济宁: '370800', 泰安: '370900',
  郑州: '410100', 洛阳: '410300', 开封: '410200',
  石家庄: '130100', 唐山: '130200', 保定: '130600', 邯郸: '130400',
  承德: '130800', 秦皇岛: '130300',
  太原: '140100', 大同: '140200', 平遥: '140700', 五台山: '140900',
  呼和浩特: '150100', 呼伦贝尔: '150700',
  沈阳: '210100', 大连: '210200', 丹东: '210600',
  长春: '220100', 延边: '222400',
  哈尔滨: '230100', 漠河: '232700',
  兰州: '620100', 敦煌: '620900', 张掖: '620700', 嘉峪关: '620200',
  西宁: '630100', 海西: '632800',
  银川: '640100', 中卫: '640500',
  乌鲁木齐: '650100', 喀什: '653100', 伊犁: '654000', 吐鲁番: '650400',
  拉萨: '540100', 林芝: '540400',
  南宁: '450100', 桂林: '450300', 柳州: '450200', 北海: '450500',
  阳朔: '450300',
  海口: '460100', 三亚: '460200', 万宁: '469002',
  潮州: '445100', 汕头: '440500', 湛江: '440800',
  香港: '810000', 澳门: '820000',
  台北: '710000'
};

/* 精度精简：丢掉小于 0.01° 的细碎拐点（约 1 公里），
 * 行程地图放大到街区级之前都看不出差别，单城体积能压到 20–30 KB */
const EPS = 0.01;
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
function round(pt) { return [+pt[0].toFixed(3), +pt[1].toFixed(3)]; }

/* 只保留外环：_full 会把每个区县单独成 feature，合并时只要每个区县的轮廓，
 * 内环（飞地的洞）在这个尺度看不出来，去掉能显著减小体积 */
function trimGeo(geo) {
  const out = [];
  for (const f of geo.features || []) {
    const g = f.geometry;
    if (!g) continue;
    let coords = g.coordinates;
    if (g.type === 'Polygon') {
      coords = [simplify(coords[0] || [], EPS).map(round)];
      if (coords[0].length < 4) continue;
    } else if (g.type === 'MultiPolygon') {
      coords = coords.map(poly => [simplify(poly[0] || [], EPS).map(round)])
        .filter(poly => poly[0] && poly[0].length >= 4);
      if (!coords.length) continue;
    } else continue;  /* 点/线不要 */
    out.push({ type: 'Feature',
      properties: { name: (f.properties && f.properties.name) || '' },
      geometry: { type: g.type, coordinates: coords } });
  }
  return { type: 'FeatureCollection', features: out };
}

function fetchJson(url, retry = 3) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'wandergo-geo/1.0' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve(fetchJson(res.headers.location, retry));
      }
      if (res.statusCode !== 200) {
        res.resume();
        if (retry > 0) return setTimeout(() => resolve(fetchJson(url, retry - 1)), 800);
        return reject(new Error('HTTP ' + res.statusCode));
      }
      let buf = '';
      res.setEncoding('utf8');
      res.on('data', d => buf += d);
      res.on('end', () => { try { resolve(JSON.parse(buf)) } catch (e) { reject(e) } });
    }).on('error', e => {
      if (retry > 0) return setTimeout(() => resolve(fetchJson(url, retry - 1)), 1000);
      reject(e);
    });
  });
}

const size = o => Buffer.byteLength(JSON.stringify(o));

async function one(city) {
  const code = CITIES[city];
  if (!code) return { city, err: '无 adcode' };
  /* 直接用市级 {adcode}.json：它本身就是一个 MultiPolygon 外轮廓（约 38 KB），
   * {adcode}_full.json 会把每个区县拆成独立 feature（100+ 环，70 KB），
   * 我们要的是城市整体边界，用前者体积小一半还更完整 */
  const geo = await fetchJson(BASE + code + '.json');
  const tiny = trimGeo(geo);
  if (!tiny.features.length) return { city, err: '边界为空' };
  const file = path.join(OUT, code + '.json');
  fs.writeFileSync(file, JSON.stringify(tiny));
  return { city, code, bytes: size(tiny) };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--list')) {
    console.log(Object.keys(CITIES).join(' '));
    return;
  }
  fs.mkdirSync(OUT, { recursive: true });
  /* 已有文件默认跳过；--force 重下 */
  const force = args.includes('--force');
  const want = args.filter(a => !a.startsWith('--'));
  const list = want.length ? want.filter(c => CITIES[c]) : Object.keys(CITIES);
  const unknown = want.filter(c => !CITIES[c]);
  if (unknown.length) console.warn('未收录的城市（需先补 adcode）：', unknown.join('、'));

  let ok = 0, total = 0;
  const failed = [];
  for (let i = 0; i < list.length; i++) {
    const city = list[i];
    const f = path.join(OUT, CITIES[city] + '.json');
    if (!force && fs.existsSync(f)) { ok++; continue; }
    try {
      const r = await one(city);
      if (r.err) { failed.push(city + '(' + r.err + ')'); }
      else { ok++; total += r.bytes; console.log(`  ${city.padEnd(6, '　')} ${r.code}  ${(r.bytes / 1024).toFixed(1)} KB`); }
    } catch (e) {
      failed.push(city + '(' + (e.message || e) + ')');
    }
    await new Promise(r => setTimeout(r, 220));   /* 对公共接口友好一点 */
  }

  /* manifest：只收录真正下到边界的城市 */
  const have = {};
  Object.entries(CITIES).forEach(([c, code]) => {
    if (fs.existsSync(path.join(OUT, code + '.json'))) have[c] = code;
  });
  fs.writeFileSync(path.join(OUT, 'manifest.js'),
    '/* 自动生成：node scripts/fetch-geo.js —— 城市名 → adcode，GeoJSON 在 geo/{adcode}.json */\n' +
    'window.WGO_GEO=' + JSON.stringify(have) + ';\n');
  console.log(`\n[fetch-geo] 成功 ${ok} 城 · 新增 ${(total / 1024).toFixed(0)} KB · 清单 ${Object.keys(have).length} 条`);
  if (failed.length) console.warn('[fetch-geo] 失败：', failed.join('、'));
}

main().catch(e => { console.error(e); process.exit(1); });
