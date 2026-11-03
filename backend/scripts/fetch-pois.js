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
 *
 * 依赖 DATABASE_URL（线上 PG）或本地 SQLite；不配则是本地库。
 * ========================================================= */
const amap = require('../src/amap');
const dbx = require('../src/db');

/* 默认补的城市：线上库覆盖偏少、但用户确实会去的目的地 */
const DEFAULT_CITIES = [
  '洛阳', '大同', '泉州', '绍兴', '景德镇', '扬州', '开封', '潮州',
  '漳州', '柳州', '北海', '宜昌', '襄阳', '荆州', '岳阳', '赣州',
  '宜春', '衢州', '金华', '台州', '湖州', '嘉兴', '镇江', '淮安',
  '徐州', '济宁', '淄博', '烟台', '威海', '唐山', '保定', '邯郸'
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
  console.log(`[fetch-pois] 数据库：${dbx.dialect} · 城市 ${CITIES.length} 个 · 每类目标 ${TARGET} 条${DRY ? ' · DRY 模式' : ''}`);

  const stat = { cities: 0, total: 0, empty: [] };
  for (let i = 0; i < CITIES.length; i += CONCURRENCY) {
    const batch = CITIES.slice(i, i + CONCURRENCY);
    const res = await Promise.all(batch.map(c => fillCity(c).catch(e => ({ city: c, n: 0, err: String(e.message || e) }))));
    res.forEach(r => {
      stat.cities++;
      stat.total += r.n;
      if (!r.n) stat.empty.push(r.city);
      console.log(`  ${r.city.padEnd(5, '　')} +${String(r.n).padStart(3)} ` +
        (r.err ? `错误：${r.err}` : Object.entries(r.byType || {}).map(([k, v]) => `${k}${v}`).join(' ')));
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
