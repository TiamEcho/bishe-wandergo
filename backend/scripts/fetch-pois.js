/* =========================================================
 * 冷门城市 POI 批量补充（P0-2）
 *
 * 用高德关键词检索给指定城市补「美食 / 购物 / 打卡点」三类 POI，
 * 写入 scenic_spot 的 poi_type / source 两列。
 *
 * 用法（在 backend 目录下）：
 *   AMAP_KEY=xxx node scripts/fetch-pois.js                 # 补默认冷门城市清单
 *   AMAP_KEY=xxx node scripts/fetch-pois.js --city=洛阳,大同
 *   AMAP_KEY=xxx node scripts/fetch-pois.js --dry           # 只打印不落库
 *   AMAP_KEY=xxx node scripts/fetch-pois.js --target=25     # 每城每类目标条数
 *   AMAP_KEY=xxx node scripts/fetch-pois.js --fresh         # 忽略进度，整批重跑
 *
 * 断点续跑：每完成一个城市就写入 scripts/completed_cities.json，
 * 再次执行时会自动跳过已完成城市；只有真正写入成功的城市才记为完成，
 * 无结果或报错的会留在待跑列表等下次重试。
 *
 * 依赖 DATABASE_URL（线上 PG）或本地 SQLite；不配则是本地库。
 * ========================================================= */
/* amap.js 在 require 时就读 process.env.AMAP_KEY，所以 .env 必须先加载。
 * 这里手写解析而不是 require('dotenv')：脚本要在干净的机器上直接能跑，
 * 不想为一个 KEY=value 的读取额外引入依赖。 */
const fs = require('fs');
const path = require('path');
(function loadEnv() {
  const p = path.join(__dirname, '..', '.env');
  let txt = '';
  try { txt = fs.readFileSync(p, 'utf8'); } catch (e) { return; }
  txt.split(/\r?\n/).forEach(line => {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) return;
    const v = m[2].replace(/^['"]|['"]$/g, '');
    if (!process.env[m[1]]) process.env[m[1]] = v;
  });
})();
const amap = require('../src/amap');
const dbx = require('../src/db');

/* ---- 断点续跑 ----
 * 一次跑 54 个城市 × 6 个关键词，高德个人 Key 很容易中途触发 QPS 限制或断网，
 * 以前只能从头再来。现在每跑完一个城市就把结果追加进 completed_cities.json，
 * 下次启动默认跳过已完成的；想整批重跑加 --fresh。
 * 只把「成功写入」记为完成：无结果 / 报错的留待下次重试。 */
const STATE_FILE = path.join(__dirname, 'completed_cities.json');

function loadDone() {
  try {
    const j = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    return j && typeof j === 'object' ? j : {};
  } catch (e) { return {}; }
}

function saveDone(obj) {
  try { fs.writeFileSync(STATE_FILE, JSON.stringify(obj, null, 2), 'utf8'); } catch (e) {
    console.warn('[fetch-pois] 进度文件写入失败：', e.message);
  }
}

/* 默认补的城市：线上库覆盖偏少、但用户确实会去的目的地。
 * 前 40 个是高频旅游城市（省会 / 热门目的地），后 14 个是常被搜到但库内几乎空白的中小城市。
 * 城市名必须是高德能识别的行政区名，写成「上饶」而不是「上饶市」。 */
const DEFAULT_CITIES = [
  /* ---- 高频旅游城市 ---- */
  '北京', '上海', '广州', '深圳', '成都', '杭州', '西安', '重庆',
  '南京', '苏州', '武汉', '长沙', '厦门', '青岛', '天津', '昆明',
  '大连', '哈尔滨', '沈阳', '郑州', '济南', '合肥', '福州', '南昌',
  '贵阳', '南宁', '太原', '石家庄', '兰州', '西宁', '银川', '乌鲁木齐',
  '呼和浩特', '拉萨', '海口', '三亚', '桂林', '丽江', '大理', '张家界',
  /* ---- 中小城市 / 冷门目的地 ---- */
  '洛阳', '大同', '泉州', '绍兴', '景德镇', '扬州', '开封', '潮州',
  '上饶', '九江', '赣州', '宜春', '漳州', '柳州'
];

/* 每类两个关键词，覆盖「本地小吃」与「必逛商圈」两种意图 */
const QUERIES = [
  { type: '美食', kw: ['特色小吃', '本地菜馆'] },
  { type: '购物', kw: ['商业步行街', '购物中心'] },
  { type: '打卡点', kw: ['网红打卡地', '城市地标'] }
];

const argOf = k => {
  const hit = process.argv.find(a => a.startsWith(`--${k}=`));
  return hit ? hit.slice(k.length + 3) : '';
};
const DRY = process.argv.includes('--dry');
const FRESH = process.argv.includes('--fresh');
const TARGET = Number(argOf('target')) || 20;
const CITIES = argOf('city') ? argOf('city').split(/[,，]/).map(s => s.trim()).filter(Boolean) : DEFAULT_CITIES;
const CONCURRENCY = 2;   /* 高德个人 Key 的 QPS 很低，串行偏慢、并发过高会 10004 */

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fillCity(city) {
  const added = [];
  const seen = new Set();
  for (const q of QUERIES) {
    let got = 0;
    for (const kw of q.kw) {
      if (got >= TARGET) break;
      const list = await amap.searchCity(city, kw, 25, 1);
      for (const p of list) {
        if (got >= TARGET) break;
        if (seen.has(p.name)) continue;
        seen.add(p.name);
        p.poi_type = q.type;
        p.spot_key = `amap|${city}|${p.name}`;
        p.city = city;
        added.push(p);
        got++;
      }
      await sleep(350);
    }
  }
  if (!DRY && added.length) await dbx.upsertPois(city, added, 'amap');
  const byType = added.reduce((a, p) => (a[p.poi_type] = (a[p.poi_type] || 0) + 1, a), {});
  return { city, n: added.length, byType };
}

async function main() {
  if (!amap.isOn()) {
    console.error('缺少 AMAP_KEY，无法检索。请在 backend/.env 或命令行里提供 Web 服务类型的 Key。');
    process.exit(1);
  }
  await dbx.seed();

  /* 断点续跑：已完成的城市直接跳过；--fresh 表示忽略进度整批重跑 */
  const done = DRY || FRESH ? {} : loadDone();
  const skip = CITIES.filter(c => done[c]);
  const todo = CITIES.filter(c => !done[c]);
  if (skip.length) console.log(`[fetch-pois] 跳过已完成 ${skip.length} 城：${skip.join('、')}`);
  console.log(`[fetch-pois] 数据库：${dbx.dialect} · 待跑 ${todo.length}/${CITIES.length} 城 · 每类目标 ${TARGET} 条${DRY ? ' · DRY 模式' : ''}`);

  const stat = { cities: 0, total: 0, empty: [] };
  for (let i = 0; i < todo.length; i += CONCURRENCY) {
    const batch = todo.slice(i, i + CONCURRENCY);
    const res = await Promise.all(batch.map(c => fillCity(c).catch(e => ({ city: c, n: 0, err: String(e.message || e) }))));
    res.forEach(r => {
      stat.cities++;
      stat.total += r.n;
      if (!r.n) { stat.empty.push(r.city); return; }
      /* 只有真正写进库的城市才记完成；DRY 模式不落进度 */
      if (!DRY) {
        done[r.city] = { n: r.n, byType: r.byType || {}, at: new Date().toISOString().slice(0, 19).replace('T', ' ') };
        saveDone(done);
      }
      console.log(`  ${r.city.padEnd(5, '　')} +${String(r.n).padStart(3)} ` +
        (r.err ? `错误：${r.err}` : Object.entries(r.byType || {}).map(([k, v]) => `${k}${v}`).join(' ')));
    });
    /* 无结果的城市也要打印出来，否则日志里看不到它们被跳过了 */
    res.filter(r => !r.n).forEach(r => {
      console.log(`  ${r.city.padEnd(5, '　')} +  0 ` + (r.err ? `错误：${r.err}` : '无结果，下次会重试'));
    });
    await sleep(600);
  }

  const err = amap.getLastError();
  console.log(`[fetch-pois] 完成：${stat.cities} 城 · 写入 ${stat.total} 条` +
    (stat.empty.length ? ` · 无结果城市：${stat.empty.join('、')}` : ''));
  if (err) console.warn('[fetch-pois] 高德最近一次报错：', err.infocode, err.info, err.hint);
  if (!DRY) {
    const idx = await dbx.spotTypesByCity();
    const sample = Object.entries(idx).slice(0, 6)
      .map(([c, v]) => `${c}(${v.景区 || 0}/${v.美食 || 0}/${v.打卡点 || 0}/${v.购物 || 0})`);
    console.log('[fetch-pois] 库内分类抽样（景区/美食/打卡点/购物）：', sample.join(' '));
  }
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
