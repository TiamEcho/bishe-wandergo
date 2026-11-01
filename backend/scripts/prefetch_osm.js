/* =========================================================
 * 预抓热门海外城市的 OSM POI，落盘到 backend/data/osm_cache.json
 *
 * 为什么要预抓：Overpass 公共实例排队严重，实测单次 45-57 秒，
 * 运行时实时请求会让用户等一分钟以上。预抓后运行时只读本地文件。
 *
 * 用法：
 *   node scripts/prefetch_osm.js              抓默认热门城市
 *   node scripts/prefetch_osm.js 东京 巴黎     只抓指定城市
 *   node scripts/prefetch_osm.js --force      忽略已有缓存，全部重抓
 *
 * 抓完需重新部署后端（或把 data/osm_cache.json 一起提交），线上才生效。
 * ========================================================= */
const fs = require('fs');
const path = require('path');
const { searchOsmSpots, CACHE_FILE } = require('../src/services/osmSpotSearch');
const { OVERSEAS_CENTER } = require('../src/services/places');

/* 默认抓取名单：热门目的地优先，覆盖主流出境游方向 */
const DEFAULT_CITIES = [
  '东京', '京都', '大阪', '北海道', '冲绳',
  '首尔', '曼谷', '新加坡', '吉隆坡', '巴厘岛',
  '巴黎', '伦敦', '罗马', '巴塞罗那', '阿姆斯特丹',
  '维也纳', '苏黎世', '伊斯坦布尔', '雅典', '圣托里尼',
  '纽约', '洛杉矶', '旧金山', '多伦多', '悉尼',
  '墨尔本', '迪拜', '开罗', '雷克雅未克'
];

function readCache() {
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8')) || {};
  } catch {
    return {};
  }
}

function writeCache(obj) {
  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(obj), 'utf-8');
}

async function main() {
  const argv = process.argv.slice(2);
  const force = argv.includes('--force');
  const named = argv.filter(a => !a.startsWith('--'));
  const cities = named.length ? named : DEFAULT_CITIES;

  const cache = readCache();
  let ok = 0;
  let skip = 0;
  let fail = 0;

  for (const city of cities) {
    const center = OVERSEAS_CENTER[city];
    if (!center) {
      console.warn(`[skip] ${city}：places.js 的 OVERSEAS_CENTER 里没有坐标`);
      fail++;
      continue;
    }
    if (!force && Array.isArray(cache[city]) && cache[city].length) {
      console.log(`[skip] ${city}：已有 ${cache[city].length} 条缓存`);
      skip++;
      continue;
    }

    const t0 = Date.now();
    const r = await searchOsmSpots(center, { limit: 200 });
    const sec = ((Date.now() - t0) / 1000).toFixed(1);

    if (r.ok && r.total) {
      cache[city] = r.places;
      writeCache(cache);   // 每抓完一个就落盘，中断不丢进度
      console.log(`[ok]   ${city}：${r.total} 条，${sec}s  ${JSON.stringify(r.byCategory)}`);
      ok++;
    } else {
      console.warn(`[fail] ${city}：${r.reason || 'empty'}，${sec}s`);
      fail++;
    }
  }

  console.log(`\n完成：成功 ${ok} / 跳过 ${skip} / 失败 ${fail}`);
  console.log(`缓存文件：${CACHE_FILE}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
